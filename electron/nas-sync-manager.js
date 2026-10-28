/**
 * Lam7a Studios — Gestor de Sincronización Unidireccional Automática (Local SSD -> NAS)
 *
 * - Escanea recursivamente todas las carpetas y documentos en C:\Lamha-Storage.
 * - Estrictamente UNIDIRECCIONAL (Local -> NAS): nunca borra en el NAS ni altera archivos locales.
 * - Soporta Activar / Desactivar y Pausar por 2h, 4h, 8h o 24h con reanudación automática.
 * - Al iniciar o activar, detecta todo lo no sincronizado y solicita confirmación antes de subir.
 */
const fs = require("fs")
const path = require("path")
const EventEmitter = require("events")
const { app, shell } = require("electron")
const { getConfig, updateSettings } = require("./config")

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
  if (lower.endsWith(".tmp") || lower.endsWith(".crswap") || lower.endsWith(".part") || lower.endsWith(".download")) return true
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
    this.cancelled = false
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
      fs.writeFileSync(this.cacheFile, JSON.stringify(this.cache), "utf-8")
    } catch {}
  }

  start() {
    // Verificar expiración de pausa cada 20 segundos
    this.checkPauseExpiration()
    this.pauseTimer = setInterval(() => this.checkPauseExpiration(), 20000)

    // Indexar archivos actuales para el vigilante en tiempo real
    this.indexRealtimeBaseline()
    this.watchTimer = setInterval(() => this.realtimeTick(), 4000)

    // Si está activo y no pausado al arrancar la herramienta, buscar pendientes y avisar
    if (this.isActive()) {
      setTimeout(() => {
        this.scanForPending({ triggerPrompt: true }).catch(() => {})
      }, 2500)
    }
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
    return this.getState()
  }

  dismissPendingPrompt() {
    this.pendingItems = []
    this.PendingSummary = null
    this.emit("state-changed", this.getState())
    return { ok: true }
  }

  // Escanea recursivamente C:\Lamha-Storage y devuelve todos los archivos válidos
  scanLocalTree(baseRoot) {
    const results = []
    if (!baseRoot || !fs.existsSync(baseRoot)) return results

    const walk = (currentDir, relPrefix, projectFolder, depth) => {
      if (depth > 8) return
      let entries = []
      try {
        entries = fs.readdirSync(currentDir, { withFileTypes: true })
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
          walk(fullPath, relPath, proj, depth + 1)
        } else if (entry.isFile()) {
          try {
            const st = fs.statSync(fullPath)
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
        }
      }
    }

    walk(baseRoot, "", "", 0)
    return results
  }

  indexRealtimeBaseline() {
    const cfg = getConfig()
    const files = this.scanLocalTree(cfg.ssdPath)
    for (const f of files) {
      this.knownRealtime.set(f.fullPath, { size: f.size, mtimeMs: f.mtimeMs })
    }
  }

  // Vigilancia continua en tiempo real para nuevos archivos creados o pegados en cualquier carpeta
  async realtimeTick() {
    if (!this.isActive() || this.isScanning || this.isRunning) return
    const cfg = getConfig()
    const files = this.scanLocalTree(cfg.ssdPath)
    const readyNewFiles = []

    for (const f of files) {
      const known = this.knownRealtime.get(f.fullPath)
      if (known && known.size === f.size && known.mtimeMs === f.mtimeMs) {
        continue
      }
      // Si es una carpeta 03_Edicion_Master de foto/vídeo, MasterFolderWatcher ya la gestiona (si está activo)
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
  }

  // Construye un mapa de los archivos existentes en el NAS mediante FTP list()
  async fetchRemoteTreeMap(ftpClient, nasBaseDir, localProjectNames) {
    const remoteMap = new Map() // relPath -> size
    let rootList = []
    try {
      await ftpClient.ensureDir(nasBaseDir)
      rootList = await ftpClient.list(nasBaseDir)
    } catch {
      return null
    }

    const remoteProjects = new Set(rootList.filter((i) => i.isDirectory).map((i) => i.name))

    const walkRemote = async (relDir, depth) => {
      if (depth > 6) return
      const fullRemoteDir = `${nasBaseDir}/${relDir}`
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
    if (this.isScanning || this.isRunning) return this.PendingSummary
    this.isScanning = true
    this.emit("state-changed", this.getState())

    try {
      const cfg = getConfig()
      const localFiles = this.scanLocalTree(cfg.ssdPath)
      if (localFiles.length === 0) {
        this.pendingItems = []
        this.PendingSummary = { totalFiles: 0, totalBytes: 0, totalMb: 0, totalGb: 0, projects: [] }
        return this.PendingSummary
      }

      const localProjectNames = [...new Set(localFiles.map((f) => f.projectFolder))]
      let remoteMap = null

      if (cfg.nasPassword && cfg.nasHost) {
        const ftp = require("basic-ftp")
        const client = new ftp.Client(12000)
        try {
          await client.access({
            host: cfg.nasHost,
            user: cfg.nasUser,
            password: cfg.nasPassword,
            port: 21,
          })
          remoteMap = await this.fetchRemoteTreeMap(client, cfg.nasBaseDir, localProjectNames)
        } catch {
          remoteMap = null
        } finally {
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
          // Si el NAS no respondió al listado completo, consultar caché local
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
        totalFiles: pending.length,
        totalBytes,
        totalMb: Number((totalBytes / (1024 * 1024)).toFixed(1)),
        totalGb: Number((totalBytes / 1024 ** 3).toFixed(2)),
        projects,
      }

      if (pending.length > 0 && triggerPrompt) {
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
    const itemsToSync = [...this.pendingItems]
    this.pendingItems = []
    this.PendingSummary = null
    return this.syncFilesList(itemsToSync, { force: true })
  }

  async syncFilesList(items, options = {}) {
    const force = Boolean(options.force)
    if (this.isRunning || !items || items.length === 0) return { ok: false, busy: true }
    const cfg = getConfig()
    if (!cfg.nasPassword || !cfg.nasHost) {
      return { ok: false, error: "NAS_NOT_CONFIGURED" }
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

    const emitProgress = (currentFile) => {
      const pct = Math.min(99, Math.round((uploadedBytes / totalBytes) * 100))
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

    const ftp = require("basic-ftp")

    try {
      // 1. Asegurar todas las carpetas remotas primero con 1 cliente
      const initClient = new ftp.Client(120000)
      try {
        await initClient.access({
          host: cfg.nasHost,
          user: cfg.nasUser,
          password: cfg.nasPassword,
          port: 21,
        })
        const remoteDirs = new Set(
          items.map((it) => {
            const subDir = path.posix.dirname(it.relPath)
            return subDir && subDir !== "." ? `${cfg.nasBaseDir}/${subDir}` : cfg.nasBaseDir
          })
        )
        for (const d of remoteDirs) {
          if (this.cancelled || (!force && !this.isActive())) break
          await initClient.ensureDir(d)
        }
      } finally {
        try {
          initClient.close()
        } catch {}
      }

      // 2. Subir archivos con pool de 2 conexiones FTP concurrentes
      let nextIdx = 0
      const poolSize = Math.min(2, items.length)

      const worker = async () => {
        let client = new ftp.Client(120000)
        const connect = async () => {
          try {
            client.close()
          } catch {}
          client = new ftp.Client(120000)
          await client.access({
            host: cfg.nasHost,
            user: cfg.nasUser,
            password: cfg.nasPassword,
            port: 21,
          })
        }

        try {
          await connect()
          while (!this.cancelled && (force || this.isActive())) {
            const idx = nextIdx++
            if (idx >= items.length) return
            const it = items[idx]
            const remotePath = `${cfg.nasBaseDir}/${it.relPath}`
            let sent = false

            for (let attempt = 0; attempt < 2 && !sent; attempt++) {
              try {
                let last = 0
                client.trackProgress((info) => {
                  const delta = info.bytes - last
                  last = info.bytes
                  uploadedBytes += delta
                  emitProgress(it.fileName)
                })
                await client.uploadFrom(it.fullPath, remotePath)
                client.trackProgress()
                sent = true
              } catch {
                client.trackProgress()
                if (attempt === 0) {
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
            } else {
              failCount++
            }
            processedCount++
            emitProgress(it.fileName)
          }
        } finally {
          try {
            client.close()
          } catch {}
        }
      }

      await Promise.all(Array.from({ length: poolSize }, worker))
      this.saveCache()

      if (this.cancelled || (!force && !this.isActive())) {
        this.emit("sync-progress", { type: "cancelled", isNasMirror: true })
        return { ok: false, cancelled: true }
      }

      const summary = {
        files: okCount,
        failed: failCount,
        mb: Number((uploadedBytes / (1024 * 1024)).toFixed(1)),
        client: "NAS Mirror",
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
      this.emit("sync-progress", { type: "error", message: err.message || String(err) })
      return { ok: false, error: err.message || String(err) }
    } finally {
      this.isRunning = false
      this.emit("state-changed", this.getState())
    }
  }

  /**
   * Escanea todas las carpetas de proyectos en C:\Lamha-Storage, las cruza con las sesiones
   * de Supabase (para conocer su estado: Entregado vs En curso) y verifica su estado en el NAS.
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
      entries = fs.readdirSync(baseRoot, { withFileTypes: true })
    } catch {
      return { ok: true, nasReachable: false, totalBytes: 0, totalGb: 0, deliveredBytes: 0, deliveredGb: 0, projects: [] }
    }

    const folderDirs = entries
      .filter((e) => e.isDirectory() && !e.name.startsWith(".") && !/^(System Volume Information|\$RECYCLE\.BIN)$/i.test(e.name))
      .map((e) => e.name)

    const allLocalFiles = this.scanLocalTree(baseRoot)
    const filesByProject = new Map()
    for (const f of allLocalFiles) {
      if (!filesByProject.has(f.projectFolder)) filesByProject.set(f.projectFolder, [])
      filesByProject.get(f.projectFolder).push(f)
    }

    let remoteMap = null
    let nasReachable = false
    if (checkRemoteLive && cfg.nasPassword && cfg.nasHost && folderDirs.length > 0) {
      const ftp = require("basic-ftp")
      const client = new ftp.Client(10000)
      try {
        await client.access({
          host: cfg.nasHost,
          user: cfg.nasUser,
          password: cfg.nasPassword,
          port: 21,
        })
        nasReachable = true
        remoteMap = await this.fetchRemoteTreeMap(client, cfg.nasBaseDir, folderDirs)
      } catch {
        remoteMap = null
      } finally {
        try {
          client.close()
        } catch {}
      }
    }

    const matchSession = (folderName) => {
      if (!Array.isArray(sessionsList) || sessionsList.length === 0) return null
      const lowerFolder = folderName.toLowerCase()
      const parts = folderName.split("_")
      const dateInFolder = parts.find((p) => /^\d{4}-\d{2}-\d{2}$/.test(p)) || null

      // 1. Coincidencia exacta con patrón generado
      for (const s of sessionsList) {
        const cleanDate = String(s.session_date || "").replace(/[^0-9-]/g, "")
        const cleanClient = normalizeFolderToken(s.client_name || "Cliente")
        const nonPlaceTag = Array.isArray(s.tags) ? s.tags.find((tg) => tg && !String(tg).toLowerCase().startsWith("place:")) : null
        const cleanProj = normalizeFolderToken(nonPlaceTag || s.subcategory || s.category || "Sesion")
        const expected = `${cleanDate}_${cleanClient}_${cleanProj}`
        if (lowerFolder === expected) return s
      }

      // 2. Coincidencia por fecha + nombre del cliente
      if (dateInFolder) {
        const byDateAndClient = sessionsList.find((s) => {
          if (s.session_date !== dateInFolder) return false
          const token = normalizeFolderToken(s.client_name)
          return token && lowerFolder.includes(token)
        })
        if (byDateAndClient) return byDateAndClient
      }

      // 3. Coincidencia por nombre de cliente
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

    // Ordenar: primero los entregados más pesados, luego el resto por peso
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

  /**
   * Reciclaje Seguro con Verificación NAS obligatoria:
   * 1. Conecta al NAS en vivo y verifica que cada foto/vídeo/documento de la carpeta exista con idéntico peso.
   * 2. Si faltan archivos en el NAS, los sube primero automáticamente al NAS con barra de progreso.
   * 3. Si falla la conexión al NAS o falla aunque sea 1 archivo, ABORTA el reciclaje sin borrar nada en local.
   * 4. Una vez 100% respaldado en el NAS, mueve la carpeta local a la Papelera de Reciclaje de Windows.
   */
  async verifyAndRecycleProjects(projectFolders = []) {
    const folders = Array.isArray(projectFolders) ? projectFolders.filter(Boolean) : [projectFolders].filter(Boolean)
    if (folders.length === 0) return { ok: false, error: "NO_PROJECTS_SELECTED" }
    if (this.isRunning || this.isScanning) return { ok: false, error: "BUSY" }

    const cfg = getConfig()
    if (!cfg.nasPassword || !cfg.nasHost) {
      return { ok: false, error: "NAS_NOT_CONFIGURED" }
    }

    const baseRoot = cfg.ssdPath
    if (!baseRoot || !fs.existsSync(baseRoot)) {
      return { ok: false, error: "SSD_PATH_NOT_FOUND" }
    }

    // 1. Recolectar todos los archivos locales de las carpetas seleccionadas
    const allLocal = this.scanLocalTree(baseRoot)
    const targetSet = new Set(folders)
    const targetFiles = allLocal.filter((f) => targetSet.has(f.projectFolder))

    // 2. Conectar al NAS por FTP para auditoría real en vivo (Fail-Safe estricto)
    const ftp = require("basic-ftp")
    let remoteMap = null
    const auditClient = new ftp.Client(15000)
    try {
      await auditClient.access({
        host: cfg.nasHost,
        user: cfg.nasUser,
        password: cfg.nasPassword,
        port: 21,
      })
      remoteMap = await this.fetchRemoteTreeMap(auditClient, cfg.nasBaseDir, folders)
    } catch (err) {
      return {
        ok: false,
        error: "NAS_UNREACHABLE",
        message: err.message || String(err),
      }
    } finally {
      try {
        auditClient.close()
      } catch {}
    }

    if (remoteMap === null) {
      return { ok: false, error: "NAS_UNREACHABLE" }
    }

    // 3. Detectar cualquier archivo que aún no esté sincronizado en el NAS
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

    // 4. Si hay archivos sin sincronizar en el NAS, sincronizarlos automáticamente antes de reciclar
    let syncedBeforeRecycle = 0
    if (missingFiles.length > 0) {
      const syncResult = await this.syncFilesList(missingFiles, { force: true })
      if (!syncResult || !syncResult.ok || (syncResult.summary && syncResult.summary.failed > 0)) {
        return {
          ok: false,
          error: "NAS_SYNC_INCOMPLETE",
          failedCount: syncResult?.summary?.failed || missingFiles.length,
        }
      }
      syncedBeforeRecycle = syncResult.summary?.files || missingFiles.length
    }

    // 5. Enviar las carpetas locales verificadas a la Papelera de Reciclaje de Windows
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
        // Limpiar del mapa en tiempo real
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

