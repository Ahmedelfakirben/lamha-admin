/**
 * Lam7a Studios — Gestor de Sincronización Unidireccional Automática (Local SSD -> NAS Híbrido LAN / Tailscale)
 *
 * - Escanea de forma 100% ASÍNCRONA y NO BLOQUEANTE todas las carpetas en C:\Lamha-Storage.
 * - Estrictamente UNIDIRECCIONAL (Local -> NAS): nunca borra en el NAS ni altera archivos locales.
 * - Soporta Activar / Desactivar y Pausar por 2h, 4h, 8h o 24h con reanudación automática.
 * - Utiliza la ruta híbrida activa (Red Local LAN o Tailscale VPN) con sondeo TCP previo de 350ms.
 */
const fs = require("fs")
const path = require("path")
const EventEmitter = require("events")
const { app, shell } = require("electron")
const {
  getConfig,
  updateSettings,
  resolveActiveNasRoute,
  findAvailableSmbShareAsync,
} = require("./config")

function isIngestActive() {
  try {
    const e = require("./ingest-engine")
    return Boolean(e && e.isIngesting && e.isIngesting())
  } catch {
    return false
  }
}

async function registerSyncedFileInSupabase(it) {
  try {
    const engine = require("./ingest-engine")
    const supabase = engine.getClient()
    if (!supabase) return

    const relNormalized = (it.relPath || "").replace(/\\/g, "/")
    const parts = relNormalized.split("/")
    const projectFolder = parts[0]
    const fileName = it.fileName || path.basename(it.fullPath)
    const isMaster =
      relNormalized.toLowerCase().includes("03_edicion_master") ||
      relNormalized.toLowerCase().includes("03_édition_master")
    const ext = path.extname(fileName).toLowerCase()
    const isVideo = [".mp4", ".mov", ".mkv", ".mxf", ".braw", ".prores", ".avi"].includes(ext)
    const isPhoto = [
      ".cr2", ".cr3", ".nef", ".arw", ".dng", ".raf", ".orf", ".rw2",
      ".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff",
    ].includes(ext)

    if (!isVideo && !isPhoto) return

    const { sessionId } = await engine.resolveSessionForFolder(supabase, projectFolder)

    const { data: existing } = await supabase
      .from("media_assets")
      .select("id, preview_url")
      .eq("filename", fileName)
      .eq("nas_path", relNormalized)
      .limit(1)

    if (existing && existing.length > 0 && existing[0].preview_url) {
      return
    }

    let previewUrl = existing?.[0]?.preview_url || null
    let sharp = null
    try {
      sharp = require("sharp")
    } catch {}

    if (!previewUrl && sharp) {
      try {
        let webpBuf = null
        if (isPhoto) {
          webpBuf = await sharp(it.fullPath, { failOn: "none" })
            .rotate()
            .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
            .webp({ quality: 80, effort: 2 })
            .toBuffer()
        } else if (isVideo && typeof engine.extractVideoWebpBuffer === "function") {
          webpBuf = await engine.extractVideoWebpBuffer(it.fullPath, sharp)
        }

        if (webpBuf) {
          const cleanBase = path.parse(fileName).name
          const storagePath = `${isMaster ? "master" : "session-previews"}/${sessionId || "unassigned"}/${cleanBase}_preview.webp`
          const { error: upErr } = await supabase.storage.from("session-previews").upload(storagePath, webpBuf, {
            contentType: "image/webp",
            cacheControl: "31536000",
            upsert: true,
          })
          if (!upErr) {
            const { data: pub } = supabase.storage.from("session-previews").getPublicUrl(storagePath)
            previewUrl = pub?.publicUrl || null
          }
        }
      } catch (err) {
        console.warn("[AutoSync Supabase] Error generando preview WebP:", err.message)
      }
    }

    const sizeMb = Number((it.size / 1024 ** 2).toFixed(2))
    const assetType = isVideo ? "raw_video" : isMaster ? "jpg" : "raw_photo"

    if (existing && existing.length > 0) {
      await supabase
        .from("media_assets")
        .update({
          session_id: sessionId || null,
          asset_type: assetType,
          size_mb: sizeMb,
          preview_url: previewUrl,
          notes: `${isMaster ? "Master" : "AutoSync"}: ${it.fullPath}`,
          is_archived: false,
        })
        .eq("id", existing[0].id)
    } else {
      await supabase.from("media_assets").insert([
        {
          session_id: sessionId || null,
          asset_type: assetType,
          filename: fileName,
          nas_path: relNormalized,
          size_mb: sizeMb,
          preview_url: previewUrl,
          notes: `${isMaster ? "Master" : "AutoSync"}: ${it.fullPath}`,
          is_archived: false,
        },
      ])
    }
  } catch (err) {
    console.warn("[AutoSync Supabase] Error registrando en base de datos:", err.message)
  }
}

function normalizeFolderToken(val) {
  return String(val || "")
    .trim()
    .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]/g, "_")
    .toLowerCase()
}

function isDeliveredStatus(status) {
  const s = String(status || "").trim().toLowerCase()
  return (
    s === "delivered" ||
    s === "completed" ||
    s === "entregado" ||
    s === "livré" ||
    s === "livre" ||
    s === "archived"
  )
}

const IGNORED_NAMES = new Set(["thumbs.db", ".ds_store", "desktop.ini"])

function shouldIgnoreFile(name) {
  const lower = name.toLowerCase()
  if (IGNORED_NAMES.has(lower)) return true
  if (name.startsWith(".") || name.startsWith("~$")) return true
  if (
    lower.endsWith(".tmp") ||
    lower.endsWith(".crswap") ||
    lower.endsWith(".part") ||
    lower.endsWith(".download")
  )
    return true
  return false
}

class NasSyncManager extends EventEmitter {
  constructor() {
    super()
    this.cacheFile = path.join(app.getPath("userData"), "nas-sync-cache.json")
    this.cache = this.loadCache()
    this.pendingItems = []
    this.PendingSummary = null
    this.isScanning = false
    this.isRunning = false
    this.isTicking = false
    this.cancelled = false
    this.activeFtpClients = new Set()
    this.stabilizing = new Map() // fullPath -> { size, mtimeMs }
    this.knownRealtime = new Map() // fullPath -> { size, mtimeMs }
    this.pauseTimer = null
    this.watchTimer = null
  }

  loadCache() {
    try {
      if (fs.existsSync(this.cacheFile)) {
        return JSON.parse(fs.readFileSync(this.cacheFile, "utf-8"))
      }
    } catch {}
    return {}
  }

  saveCache() {
    try {
      fs.promises.writeFile(this.cacheFile, JSON.stringify(this.cache), "utf-8").catch(() => {})
    } catch {}
  }

  start() {
    this.checkPauseExpiration()
    this.pauseTimer = setInterval(() => this.checkPauseExpiration(), 20000)

    // Indexar archivos actuales en segundo plano sin bloquear el arranque
    setTimeout(async () => {
      await this.indexRealtimeBaseline()
      // Vigilancia asíncrona no bloqueante cada 25 segundos
      if (!this.watchTimer) {
        this.watchTimer = setInterval(() => this.realtimeTick(), 25000)
      }
      if (this.isActive()) {
        this.scanForPending({ triggerPrompt: true }).catch(() => {})
      }
    }, 2000)
  }

  stop() {
    if (this.pauseTimer) {
      clearInterval(this.pauseTimer)
      this.pauseTimer = null
    }
    if (this.watchTimer) {
      clearInterval(this.watchTimer)
      this.watchTimer = null
    }
    this.cancelled = true
  }

  isPaused() {
    const cfg = getConfig()
    if (!cfg.nasSyncPausedUntil) return false
    return Date.now() < cfg.nasSyncPausedUntil
  }

  isActive() {
    const cfg = getConfig()
    if (!cfg.nasAutoSyncEnabled) return false
    if (this.isPaused()) return false
    return true
  }

  checkPauseExpiration() {
    const cfg = getConfig()
    if (cfg.nasSyncPausedUntil && Date.now() >= cfg.nasSyncPausedUntil) {
      updateSettings({ nasSyncPausedUntil: null })
      this.emit("state-changed", this.getState())
      if (cfg.nasAutoSyncEnabled) {
        this.scanForPending({ triggerPrompt: true }).catch(() => {})
      }
    }
  }

  getState() {
    const cfg = getConfig()
    const isPaused = Boolean(cfg.nasSyncPausedUntil && Date.now() < cfg.nasSyncPausedUntil)
    return {
      enabled: Boolean(cfg.nasAutoSyncEnabled),
      pausedUntil: isPaused ? cfg.nasSyncPausedUntil : null,
      isPaused,
      isActive: Boolean(cfg.nasAutoSyncEnabled && !isPaused),
      isScanning: this.isScanning,
      isRunning: this.isRunning,
      pendingCount: this.pendingItems.length,
      pendingSummary: this.PendingSummary,
    }
  }

  setEnabled(enabled) {
    const next = Boolean(enabled)
    updateSettings({
      nasAutoSyncEnabled: next,
      nasSyncPausedUntil: next ? null : getConfig().nasSyncPausedUntil,
    })
    if (!next) {
      this.cancelled = true
    }
    const st = this.getState()
    this.emit("state-changed", st)
    if (next) {
      this.scanForPending({ triggerPrompt: true }).catch(() => {})
    }
    return st
  }

  pauseForHours(hours) {
    const h = Number(hours) || 2
    const until = Date.now() + h * 3600 * 1000
    this.cancelled = true
    updateSettings({ nasSyncPausedUntil: until })
    const st = this.getState()
    this.emit("state-changed", st)
    return st
  }

  resume() {
    updateSettings({ nasAutoSyncEnabled: true, nasSyncPausedUntil: null })
    const st = this.getState()
    this.emit("state-changed", st)
    this.scanForPending({ triggerPrompt: true }).catch(() => {})
    return st
  }

  cancelCurrentSync() {
    this.cancelled = true
    for (const c of this.activeFtpClients) {
      try {
        c.close()
      } catch {}
    }
    this.activeFtpClients.clear()
    this.emit("sync-progress", { type: "cancelled", isNasMirror: true })
    return this.getState()
  }

  dismissPendingPrompt() {
    this.pendingItems = []
    this.PendingSummary = null
    this.emit("state-changed", this.getState())
    return { ok: true }
  }

  /**
   * Escanea recursivamente C:\Lamha-Storage de forma 100% ASÍNCRONA cediendo el event-loop
   * cada 60 archivos para que la interfaz de Electron jamás se congele.
   */
  async scanLocalTreeAsync(baseRoot) {
    const results = []
    if (!baseRoot) return results
    try {
      await fs.promises.access(baseRoot)
    } catch {
      return results
    }

    let ops = 0
    const walk = async (currentDir, relPrefix, projectFolder, depth) => {
      if (depth > 8) return
      let entries = []
      try {
        entries = await fs.promises.readdir(currentDir, { withFileTypes: true })
      } catch {
        return
      }
      for (const entry of entries) {
        if (shouldIgnoreFile(entry.name)) continue
        const fullPath = path.join(currentDir, entry.name)
        const relPath = relPrefix ? `${relPrefix}/${entry.name}` : entry.name
        const proj = projectFolder || entry.name

        if (entry.isDirectory()) {
          if (/^(System Volume Information|\$RECYCLE\.BIN)$/i.test(entry.name)) continue
          await walk(fullPath, relPath, proj, depth + 1)
        } else if (entry.isFile()) {
          try {
            const st = await fs.promises.stat(fullPath)
            if (st.size > 0) {
              results.push({
                fullPath,
                relPath,
                projectFolder: proj,
                fileName: entry.name,
                size: st.size,
                mtimeMs: Math.floor(st.mtimeMs),
              })
            }
          } catch {}
          ops++
          if (ops % 60 === 0) {
            await new Promise((r) => setImmediate(r))
          }
        }
      }
    }

    await walk(baseRoot, "", "", 0)
    return results
  }

  async indexRealtimeBaseline() {
    try {
      const cfg = getConfig()
      const files = await this.scanLocalTreeAsync(cfg.ssdPath)
      for (const f of files) {
        this.knownRealtime.set(f.fullPath, { size: f.size, mtimeMs: f.mtimeMs })
      }
    } catch {}
  }

  // Vigilancia asíncrona en segundo plano para nuevos archivos creados o pegados
  async realtimeTick() {
    if (this.isTicking || !this.isActive() || this.isScanning || this.isRunning || isIngestActive()) return
    this.isTicking = true
    try {
      const cfg = getConfig()
      const files = await this.scanLocalTreeAsync(cfg.ssdPath)
      const readyNewFiles = []

      for (const f of files) {
        const known = this.knownRealtime.get(f.fullPath)
        if (known && known.size === f.size && known.mtimeMs === f.mtimeMs) {
          continue
        }
        const isMasterMedia =
          /03[_-\s]?(?:Edicion|Edition|Édition)[_-\s]?Master/i.test(f.relPath) &&
          /\.(jpg|jpeg|png|webp|tif|tiff|mp4|mov|mkv|mxf|braw|prores|avi)$/i.test(f.fileName)

        const stab = this.stabilizing.get(f.fullPath)
        if (!stab) {
          this.stabilizing.set(f.fullPath, { size: f.size, mtimeMs: f.mtimeMs })
          continue
        }
        if (stab.size === f.size && f.size > 0) {
          this.stabilizing.delete(f.fullPath)
          this.knownRealtime.set(f.fullPath, { size: f.size, mtimeMs: f.mtimeMs })
          if (!isMasterMedia) {
            readyNewFiles.push(f)
          }
        } else {
          this.stabilizing.set(f.fullPath, { size: f.size, mtimeMs: f.mtimeMs })
        }
      }

      if (readyNewFiles.length > 0 && this.isActive()) {
        await this.syncFilesList(readyNewFiles)
      }
    } catch {} finally {
      this.isTicking = false
    }
  }

  // Construye un mapa de los archivos existentes en el NAS mediante FTP list()
  async fetchRemoteTreeMap(ftpClient, nasBaseDir, localProjectNames) {
    const remoteMap = new Map() // relPath -> size
    const baseDir = nasBaseDir || "/"
    let rootList = []
    try {
      if (baseDir !== "/" && baseDir !== "") {
        await ftpClient.ensureDir(baseDir)
      }
      rootList = await ftpClient.list(baseDir)
    } catch {
      return null
    }

    const remoteProjects = new Set(rootList.filter((i) => i.isDirectory).map((i) => i.name))

    const walkRemote = async (relDir, depth) => {
      if (depth > 6) return
      const fullRemoteDir = path.posix.join(baseDir, relDir)
      let items = []
      try {
        items = await ftpClient.list(fullRemoteDir)
      } catch {
        return
      }
      for (const it of items) {
        if (it.name === "." || it.name === "..") continue
        const childRel = `${relDir}/${it.name}`
        if (it.isDirectory) {
          await walkRemote(childRel, depth + 1)
        } else if (it.isFile) {
          remoteMap.set(childRel, it.size)
        }
      }
    }

    for (const proj of localProjectNames) {
      if (remoteProjects.has(proj)) {
        await walkRemote(proj, 1)
      }
    }
    return remoteMap
  }

  // Escanea diferencias entre Local SSD y NAS (Unidireccional: lo que falta en el NAS)
  async scanForPending({ triggerPrompt = true } = {}) {
    if (this.isScanning || this.isRunning || isIngestActive()) return this.PendingSummary
    this.isScanning = true
    this.emit("state-changed", this.getState())

    try {
      const cfg = getConfig()
      const localFiles = await this.scanLocalTreeAsync(cfg.ssdPath)
      if (localFiles.length === 0) {
        this.pendingItems = []
        this.PendingSummary = { totalFiles: 0, totalBytes: 0, totalMb: 0, totalGb: 0, projects: [] }
        return this.PendingSummary
      }

      const localProjectNames = [...new Set(localFiles.map((f) => f.projectFolder))]
      let remoteMap = null
      const route = await resolveActiveNasRoute()
      const nasOnline = route.activeRoute !== "offline" && Boolean(route.activeHost)

      if (nasOnline && cfg.nasPassword && route.activeHost && route.activeFtpOnline) {
        const ftp = require("basic-ftp")
        const client = new ftp.Client(10000)
        this.activeFtpClients.add(client)
        try {
          await client.access({
            host: route.activeHost,
            user: cfg.nasUser,
            password: cfg.nasPassword,
            port: Number(cfg.nasPort) || 21,
          })
          remoteMap = await this.fetchRemoteTreeMap(client, cfg.nasBaseDir, localProjectNames)
        } catch {
          remoteMap = null
        } finally {
          this.activeFtpClients.delete(client)
          try {
            client.close()
          } catch {}
        }
      }

      const pending = []
      for (const f of localFiles) {
        if (remoteMap !== null) {
          const rSize = remoteMap.get(f.relPath)
          if (rSize !== undefined && rSize === f.size) {
            this.cache[f.relPath] = { size: f.size, mtimeMs: f.mtimeMs }
          } else {
            pending.push(f)
          }
        } else {
          const c = this.cache[f.relPath]
          if (!c || c.size !== f.size || c.mtimeMs !== f.mtimeMs) {
            pending.push(f)
          }
        }
      }
      this.saveCache()

      const byProject = new Map()
      let totalBytes = 0
      for (const item of pending) {
        totalBytes += item.size
        const prev = byProject.get(item.projectFolder) || { name: item.projectFolder, count: 0, bytes: 0 }
        prev.count++
        prev.bytes += item.size
        byProject.set(item.projectFolder, prev)
      }

      const projects = Array.from(byProject.values()).map((p) => ({
        name: p.name,
        count: p.count,
        mb: Number((p.bytes / (1024 * 1024)).toFixed(1)),
      }))

      this.pendingItems = pending
      this.PendingSummary = {
        nasOnline,
        activeRoute: route.activeRoute,
        activeHost: route.activeHost,
        totalFiles: pending.length,
        totalBytes,
        totalMb: Number((totalBytes / (1024 * 1024)).toFixed(1)),
        totalGb: Number((totalBytes / 1024 ** 3).toFixed(2)),
        projects,
      }

      if (pending.length > 0 && triggerPrompt && nasOnline) {
        this.emit("pending-detected", this.PendingSummary)
      }
      return this.PendingSummary
    } finally {
      this.isScanning = false
      this.emit("state-changed", this.getState())
    }
  }

  async acceptPendingSync() {
    if (!this.pendingItems || this.pendingItems.length === 0) {
      return { ok: true, synced: 0 }
    }
    const route = await resolveActiveNasRoute({ force: true })
    if (route.activeRoute === "offline" || !route.activeHost) {
      return { ok: false, error: "NAS_UNREACHABLE", host: route.activeHost }
    }
    const itemsToSync = [...this.pendingItems]
    this.pendingItems = []
    this.PendingSummary = null
    return this.syncFilesList(itemsToSync, { force: true })
  }

  async syncFilesList(items, options = {}) {
    const force = Boolean(options.force)
    if (!force && isIngestActive()) return { ok: false, busy: true, ingesting: true }
    if (this.isRunning || !items || items.length === 0) return { ok: false, busy: true }

    const cfg = getConfig()
    const route = await resolveActiveNasRoute({ force: true })
    const targetHost = route.activeHost || cfg.nasHost
    if (!targetHost || route.activeRoute === "offline") {
      const msg = `NAS injoignable (${targetHost || "non configuré"})`
      this.emit("sync-progress", { type: "error", isNasMirror: true, message: msg })
      return { ok: false, error: "NAS_UNREACHABLE", message: msg }
    }

    this.isRunning = true
    this.cancelled = false
    this.emit("state-changed", this.getState())

    const startTime = Date.now()
    const totalBytes = items.reduce((a, b) => a + b.size, 0) || 1
    let uploadedBytes = 0
    let processedCount = 0
    let okCount = 0
    let failCount = 0

    const emitProgress = (currentFile, forcePct = null) => {
      const pct =
        forcePct !== null
          ? forcePct
          : Math.min(99, Math.round((uploadedBytes / totalBytes) * 100))
      const elapsedSec = Math.max(0.5, (Date.now() - startTime) / 1000)
      const speed = Number((uploadedBytes / (1024 * 1024) / elapsedSec).toFixed(1))
      const eta = pct > 2 ? Math.max(0, Math.round((elapsedSec * (100 - pct)) / pct)) : null
      this.emit("sync-progress", {
        type: "progress",
        isMasterSync: false,
        isNasMirror: true,
        phase: "nas",
        currentFile,
        percent: pct,
        processed: processedCount,
        total: items.length,
        speed,
        eta,
        stages: {
          copy: { state: "done", percent: 100 },
          cloud: { state: "done", percent: 100 },
          nas: { state: "active", percent: pct },
        },
      })
    }

    const routeBadge = route.activeRoute === "tailscale" ? "Tailscale VPN" : "LAN Local"
    emitProgress(`Connexion au NAS ${routeBadge} (${targetHost})...`, 1)

    // Prioridad 1: SMB directo ASÍNCRONO (Windows Red Local o Tailscale VPN verificada por TCP 445)
    const smbShare = await findAvailableSmbShareAsync(cfg)
    if (smbShare) {
      emitProgress(`Copia directa SMB ${routeBadge} (${smbShare})...`, 2)
      try {
        for (let i = 0; i < items.length; i++) {
          if (this.cancelled || (!force && (!this.isActive() || isIngestActive()))) break
          const it = items[i]
          const targetPath = path.join(smbShare, it.relPath)
          const targetDir = path.dirname(targetPath)
          await fs.promises.mkdir(targetDir, { recursive: true }).catch(() => {})

          let sent = false
          for (let attempt = 0; attempt < 2 && !sent; attempt++) {
            try {
              let existingSize = -1
              try {
                const st = await fs.promises.stat(targetPath)
                existingSize = st.size
              } catch {}
              if (existingSize === it.size) {
                uploadedBytes += it.size
              } else {
                await fs.promises.copyFile(it.fullPath, targetPath)
                uploadedBytes += it.size
              }
              sent = true
              okCount++
              this.cache[it.relPath] = { size: it.size, mtimeMs: it.mtimeMs }
              this.knownRealtime.set(it.fullPath, { size: it.size, mtimeMs: it.mtimeMs })
              registerSyncedFileInSupabase(it).catch(() => {})
            } catch (copyErr) {
              if (attempt === 1) failCount++
            }
          }
          processedCount++
          emitProgress(it.fileName)
        }

        this.saveCache()
        if (okCount > 0 || items.length === 0) {
          const summary = {
            files: okCount,
            failed: failCount,
            mb: Number((uploadedBytes / (1024 * 1024)).toFixed(1)),
            elapsedSec: Math.max(1, Math.round((Date.now() - startTime) / 1000)),
            smb: true,
            route: route.activeRoute,
          }
          this.emit("sync-progress", {
            type: "done",
            isNasMirror: true,
            summary,
            stages: {
              copy: { state: "done", percent: 100 },
              cloud: { state: "done", percent: 100 },
              nas: { state: "done", percent: 100 },
            },
          })
          this.emit("sync-completed", summary)
          this.isRunning = false
          this.emit("state-changed", this.getState())
          return { ok: true, synced: okCount, smb: true }
        }
      } catch (smbErr) {
        console.warn("[SMB Sync] Fallback a FTP tras error SMB:", smbErr.message)
      }
    }

    if (!cfg.nasPassword) {
      this.isRunning = false
      this.emit("state-changed", this.getState())
      return { ok: false, error: "NAS_NOT_CONFIGURED" }
    }

    const ftp = require("basic-ftp")
    const ftpPort = Number(cfg.nasPort) || 21

    try {
      const initClient = new ftp.Client(15000)
      this.activeFtpClients.add(initClient)
      try {
        await initClient.access({
          host: targetHost,
          user: cfg.nasUser,
          password: cfg.nasPassword,
          port: ftpPort,
        })
        const remoteDirs = Array.from(
          new Set(
            items.map((it) => {
              const subDir = path.posix.dirname(it.relPath)
              return subDir && subDir !== "." ? path.posix.join(cfg.nasBaseDir || "/", subDir) : (cfg.nasBaseDir || "/")
            })
          )
        )
        for (let i = 0; i < remoteDirs.length; i++) {
          if (this.cancelled || (!force && (!this.isActive() || isIngestActive()))) break
          emitProgress(`Préparation NAS ${routeBadge} (${i + 1}/${remoteDirs.length})...`, 2)
          await initClient.ensureDir(remoteDirs[i])
        }
      } finally {
        this.activeFtpClients.delete(initClient)
        try {
          initClient.close()
        } catch {}
      }

      if (this.cancelled || (!force && (!this.isActive() || isIngestActive()))) {
        this.emit("sync-progress", { type: "cancelled", isNasMirror: true })
        return { ok: false, cancelled: true }
      }

      let nextIdx = 0
      const poolSize = Math.min(2, items.length)

      const worker = async () => {
        let client = new ftp.Client(30000)
        this.activeFtpClients.add(client)
        const connect = async () => {
          this.activeFtpClients.delete(client)
          try {
            client.close()
          } catch {}
          client = new ftp.Client(30000)
          this.activeFtpClients.add(client)
          await client.access({
            host: targetHost,
            user: cfg.nasUser,
            password: cfg.nasPassword,
            port: ftpPort,
          })
        }

        try {
          await connect()
          while (!this.cancelled && (force || this.isActive()) && (force || !isIngestActive())) {
            const idx = nextIdx++
            if (idx >= items.length) return
            const it = items[idx]
            const remotePath = path.posix.join(cfg.nasBaseDir || "/", it.relPath)
            let sent = false

            emitProgress(it.fileName)

            for (let attempt = 0; attempt < 2 && !sent && !this.cancelled; attempt++) {
              let last = 0
              try {
                client.trackProgress((info) => {
                  const delta = Math.max(0, info.bytes - last)
                  last = info.bytes
                  uploadedBytes += delta
                  emitProgress(it.fileName)
                })
                await client.uploadFrom(it.fullPath, remotePath)
                client.trackProgress()
                sent = true
              } catch {
                uploadedBytes = Math.max(0, uploadedBytes - last)
                client.trackProgress()
                if (attempt === 0 && !this.cancelled) {
                  try {
                    await connect()
                  } catch {}
                }
              }
            }

            if (sent) {
              okCount++
              this.cache[it.relPath] = { size: it.size, mtimeMs: it.mtimeMs }
              this.knownRealtime.set(it.fullPath, { size: it.size, mtimeMs: it.mtimeMs })
              registerSyncedFileInSupabase(it).catch(() => {})
            } else {
              failCount++
            }
            processedCount++
            emitProgress(it.fileName)
          }
        } finally {
          this.activeFtpClients.delete(client)
          try {
            client.close()
          } catch {}
        }
      }

      await Promise.all(Array.from({ length: poolSize }, worker))
      this.saveCache()

      if (this.cancelled || (!force && (!this.isActive() || isIngestActive()))) {
        this.emit("sync-progress", { type: "cancelled", isNasMirror: true })
        return { ok: false, cancelled: true }
      }

      if (okCount === 0 && failCount > 0) {
        const errMsg = `Échec du transfert FTP vers le NAS (${failCount} fichiers)`
        this.emit("sync-progress", { type: "error", isNasMirror: true, message: errMsg })
        return { ok: false, error: "NAS_TRANSFER_FAILED", message: errMsg }
      }

      const summary = {
        files: okCount,
        failed: failCount,
        mb: Number((uploadedBytes / (1024 * 1024)).toFixed(1)),
        client: "NAS Mirror",
        route: route.activeRoute,
      }

      this.emit("sync-progress", {
        type: "done",
        isNasMirror: true,
        fileName: `${okCount} archivos sincronizados en NAS`,
        summary,
      })
      this.emit("sync-completed", summary)
      return { ok: true, summary }
    } catch (err) {
      this.emit("sync-progress", {
        type: "error",
        isNasMirror: true,
        message: err.message || String(err),
      })
      return { ok: false, error: err.message || String(err) }
    } finally {
      this.isRunning = false
      this.emit("state-changed", this.getState())
    }
  }

  /**
   * Escanea todas las carpetas de proyectos en C:\Lamha-Storage de forma asíncrona,
   * las cruza con las sesiones de Supabase y verifica su estado en el NAS.
   */
  async scanLocalProjectsForRecycle(sessionsList = [], checkRemoteLive = false) {
    const cfg = getConfig()
    const baseRoot = cfg.ssdPath
    if (!baseRoot || !fs.existsSync(baseRoot)) {
      return {
        ok: true,
        nasReachable: false,
        totalBytes: 0,
        totalGb: 0,
        deliveredBytes: 0,
        deliveredGb: 0,
        projects: [],
      }
    }

    let entries = []
    try {
      entries = await fs.promises.readdir(baseRoot, { withFileTypes: true })
    } catch {
      return { ok: true, nasReachable: false, totalBytes: 0, totalGb: 0, deliveredBytes: 0, deliveredGb: 0, projects: [] }
    }

    const folderDirs = entries
      .filter((e) => e.isDirectory() && !e.name.startsWith(".") && !/^(System Volume Information|\$RECYCLE\.BIN)$/i.test(e.name))
      .map((e) => e.name)

    const allLocalFiles = await this.scanLocalTreeAsync(baseRoot)
    const filesByProject = new Map()
    for (const f of allLocalFiles) {
      if (!filesByProject.has(f.projectFolder)) filesByProject.set(f.projectFolder, [])
      filesByProject.get(f.projectFolder).push(f)
    }

    let remoteMap = null
    let nasReachable = false
    if (checkRemoteLive && cfg.nasPassword && folderDirs.length > 0) {
      const route = await resolveActiveNasRoute()
      if (route.activeFtpOnline && route.activeHost) {
        const ftp = require("basic-ftp")
        const client = new ftp.Client(8000)
        this.activeFtpClients.add(client)
        try {
          await client.access({
            host: route.activeHost,
            user: cfg.nasUser,
            password: cfg.nasPassword,
            port: Number(cfg.nasPort) || 21,
          })
          nasReachable = true
          remoteMap = await this.fetchRemoteTreeMap(client, cfg.nasBaseDir, folderDirs)
        } catch {
          remoteMap = null
        } finally {
          this.activeFtpClients.delete(client)
          try {
            client.close()
          } catch {}
        }
      }
    }

    const matchSession = (folderName) => {
      if (!Array.isArray(sessionsList) || sessionsList.length === 0) return null
      const lowerFolder = folderName.toLowerCase()
      const parts = folderName.split("_")
      const dateInFolder = parts.find((p) => /^\d{4}-\d{2}-\d{2}$/.test(p)) || null

      for (const s of sessionsList) {
        const cleanDate = String(s.session_date || "").replace(/[^0-9-]/g, "")
        const cleanClient = normalizeFolderToken(s.client_name || "Cliente")
        const nonPlaceTag = Array.isArray(s.tags)
          ? s.tags.find((tg) => tg && !String(tg).toLowerCase().startsWith("place:") && !/^(stage|retention):/i.test(String(tg)))
          : null
        const cleanProj = normalizeFolderToken(nonPlaceTag || s.subcategory || s.category || "Sesion")
        const expected = `${cleanDate}_${cleanClient}_${cleanProj}`
        if (lowerFolder === expected) return s
      }

      if (dateInFolder) {
        const byDateAndClient = sessionsList.find((s) => {
          if (s.session_date !== dateInFolder) return false
          const token = normalizeFolderToken(s.client_name)
          return token && lowerFolder.includes(token)
        })
        if (byDateAndClient) return byDateAndClient
      }

      return (
        sessionsList.find((s) => {
          const token = normalizeFolderToken(s.client_name)
          return token && token.length >= 3 && lowerFolder.includes(token)
        }) || null
      )
    }

    let totalBytes = 0
    let deliveredBytes = 0
    const projects = []

    for (const folderName of folderDirs) {
      const files = filesByProject.get(folderName) || []
      const bytes = files.reduce((acc, it) => acc + it.size, 0)
      let syncedCount = 0
      let unsyncedCount = 0
      let unsyncedBytes = 0

      for (const f of files) {
        let synced = false
        if (remoteMap !== null) {
          const rSize = remoteMap.get(f.relPath)
          if (rSize !== undefined && rSize === f.size) {
            synced = true
            this.cache[f.relPath] = { size: f.size, mtimeMs: f.mtimeMs }
          }
        } else {
          const c = this.cache[f.relPath]
          if (c && c.size === f.size && c.mtimeMs === f.mtimeMs) {
            synced = true
          }
        }
        if (synced) syncedCount++
        else {
          unsyncedCount++
          unsyncedBytes += f.size
        }
      }

      const matched = matchSession(folderName)
      const status = matched ? matched.status || "planned" : "unlinked"
      const isDelivered = matched ? isDeliveredStatus(status) : false
      const parts = folderName.split("_")
      const fallbackDate = parts.find((p) => /^\d{4}-\d{2}-\d{2}$/.test(p)) || ""

      totalBytes += bytes
      if (isDelivered) deliveredBytes += bytes

      projects.push({
        folderName,
        fullPath: path.join(baseRoot, folderName),
        sessionId: matched ? matched.id : null,
        clientName: matched ? matched.client_name : parts.slice(1).join(" ") || folderName,
        sessionDate: matched ? matched.session_date || fallbackDate : fallbackDate,
        category: matched ? matched.category || "" : "",
        status,
        isDelivered,
        totalFiles: files.length,
        syncedFiles: syncedCount,
        unsyncedFiles: unsyncedCount,
        unsyncedMb: Number((unsyncedBytes / (1024 * 1024)).toFixed(1)),
        isFullySynced: files.length > 0 ? unsyncedCount === 0 : true,
        bytes,
        mb: Number((bytes / (1024 * 1024)).toFixed(1)),
        gb: Number((bytes / 1024 ** 3).toFixed(2)),
      })
    }

    if (remoteMap !== null) this.saveCache()

    projects.sort((a, b) => {
      if (a.isDelivered !== b.isDelivered) return a.isDelivered ? -1 : 1
      return b.bytes - a.bytes
    })

    return {
      ok: true,
      nasReachable,
      totalBytes,
      totalMb: Number((totalBytes / (1024 * 1024)).toFixed(1)),
      totalGb: Number((totalBytes / 1024 ** 3).toFixed(2)),
      deliveredBytes,
      deliveredMb: Number((deliveredBytes / (1024 * 1024)).toFixed(1)),
      deliveredGb: Number((deliveredBytes / 1024 ** 3).toFixed(2)),
      projects,
    }
  }

  async verifyAndRecycleProjects(projectFolders = [], options = {}) {
    const forceLocalTrash = Boolean(options && options.forceLocalTrash)
    const folders = Array.isArray(projectFolders) ? projectFolders.filter(Boolean) : [projectFolders].filter(Boolean)
    if (folders.length === 0) return { ok: false, error: "NO_PROJECTS_SELECTED" }
    if (this.isRunning) return { ok: false, error: "BUSY" }

    const cfg = getConfig()
    const baseRoot = cfg.ssdPath
    if (!baseRoot || !fs.existsSync(baseRoot)) {
      return { ok: false, error: "SSD_PATH_NOT_FOUND" }
    }

    const allLocal = await this.scanLocalTreeAsync(baseRoot)
    const targetSet = new Set(folders)
    const targetFiles = allLocal.filter((f) => targetSet.has(f.projectFolder))

    let syncedBeforeRecycle = 0

    if (targetFiles.length > 0 && !forceLocalTrash) {
      const route = await resolveActiveNasRoute({ force: true })
      if (!cfg.nasPassword || !route.activeHost) {
        return { ok: false, error: "NAS_NOT_CONFIGURED" }
      }

      if (!route.activeFtpOnline) {
        return {
          ok: false,
          error: "NAS_UNREACHABLE",
          host: route.activeHost,
          message: `NAS (${route.activeHost}:21) non connecté ou hors ligne`,
        }
      }

      const ftp = require("basic-ftp")
      let remoteMap = null
      const auditClient = new ftp.Client(10000)
      this.activeFtpClients.add(auditClient)
      try {
        await auditClient.access({
          host: route.activeHost,
          user: cfg.nasUser,
          password: cfg.nasPassword,
          port: Number(cfg.nasPort) || 21,
        })
        remoteMap = await this.fetchRemoteTreeMap(auditClient, cfg.nasBaseDir, folders)
      } catch (err) {
        return {
          ok: false,
          error: "NAS_UNREACHABLE",
          host: route.activeHost,
          message: err.message || String(err),
        }
      } finally {
        this.activeFtpClients.delete(auditClient)
        try {
          auditClient.close()
        } catch {}
      }

      if (remoteMap === null) {
        return { ok: false, error: "NAS_UNREACHABLE", host: route.activeHost }
      }

      const missingFiles = []
      for (const f of targetFiles) {
        const rSize = remoteMap.get(f.relPath)
        if (rSize === undefined || rSize !== f.size) {
          missingFiles.push(f)
        } else {
          this.cache[f.relPath] = { size: f.size, mtimeMs: f.mtimeMs }
        }
      }
      this.saveCache()

      if (missingFiles.length > 0) {
        const syncResult = await this.syncFilesList(missingFiles, { force: true })
        if (!syncResult || !syncResult.ok || (syncResult.summary && syncResult.summary.failed > 0)) {
          return {
            ok: false,
            error: syncResult?.cancelled ? "CANCELLED" : "NAS_SYNC_INCOMPLETE",
            failedCount: syncResult?.summary?.failed || missingFiles.length,
          }
        }
        syncedBeforeRecycle = syncResult.summary?.files || missingFiles.length
      }
    }

    let freedBytes = 0
    const recycledProjects = []
    const failedRecycle = []

    for (const folderName of folders) {
      const fullProjectPath = path.join(baseRoot, folderName)
      if (!fs.existsSync(fullProjectPath)) continue
      const projBytes = targetFiles
        .filter((f) => f.projectFolder === folderName)
        .reduce((acc, f) => acc + f.size, 0)

      try {
        await shell.trashItem(fullProjectPath)
        freedBytes += projBytes
        recycledProjects.push(folderName)
        for (const f of targetFiles) {
          if (f.projectFolder === folderName) {
            this.knownRealtime.delete(f.fullPath)
            this.stabilizing.delete(f.fullPath)
          }
        }
      } catch (trashErr) {
        failedRecycle.push({ folderName, error: trashErr.message || String(trashErr) })
      }
    }

    return {
      ok: failedRecycle.length === 0,
      recycledProjects,
      recycledCount: recycledProjects.length,
      syncedBeforeRecycle,
      freedBytes,
      freedMb: Number((freedBytes / (1024 * 1024)).toFixed(1)),
      freedGb: Number((freedBytes / 1024 ** 3).toFixed(2)),
      failedRecycle,
    }
  }
}

module.exports = { NasSyncManager }
