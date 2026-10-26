/**
 * Lamha Ingest Engine (proceso principal de Electron)
 *
 * Pipeline:  Tarjeta SD/USB  ->  SSD local  ->  Supabase (registro + previews WebP)  ->  NAS (FTP)
 * Misma estructura y convenciones que /api/ingest del dashboard, para que ambos
 * compartan carpetas, nombres semánticos y registros en media_assets.
 */
const fs = require("fs")
const path = require("path")
const { app, safeStorage } = require("electron")
const { createClient } = require("@supabase/supabase-js")
const { getConfig } = require("./config")

const PHOTO_EXT = new Set([".arw", ".cr2", ".cr3", ".nef", ".nrw", ".dng", ".raf", ".orf", ".rw2", ".pef", ".jpg", ".jpeg", ".tif", ".tiff", ".png", ".heic"])
const VIDEO_EXT = new Set([".mp4", ".mov", ".mxf", ".braw", ".avi", ".mkv", ".prores", ".r3d", ".crm", ".mts", ".m4v"])

const classify = (name) => {
  const ext = path.extname(name).toLowerCase()
  if (PHOTO_EXT.has(ext)) return "photo"
  if (VIDEO_EXT.has(ext)) return "video"
  return "other"
}

// ---------------------------------------------------------------------------
// i18n de los mensajes del motor (FR / ES / EN / AR)
// ---------------------------------------------------------------------------
const T = {
  fr: {
    scanning: "Analyse de la carte mémoire...",
    found: (n, gb) => `${n} fichiers détectés (${gb} Go)`,
    noMedia: "Aucun fichier photo ou vidéo trouvé dans la source.",
    copyStart: (d) => `Copie vers le SSD local : ${d}`,
    copyDone: (n, mb, s, v) => `Copie locale terminée : ${n} fichiers, ${mb} Mo en ${s}s (${v} Mo/s)`,
    skipped: (n) => `${n} fichiers déjà présents sur le SSD (ignorés)`,
    cloudStart: "Enregistrement dans Supabase et envoi des aperçus...",
    cloudDone: (ok, ko) => `Cloud Supabase : ${ok} aperçus envoyés${ko ? `, ${ko} en erreur` : ""}`,
    dbError: (m) => `Erreur Supabase : ${m}`,
    nasStart: (h) => `Synchronisation vers le NAS (${h})...`,
    nasDone: (ok, ko) => `NAS : ${ok} fichiers synchronisés${ko ? `, ${ko} en erreur` : ""}`,
    nasUnavailable: (m) => `NAS indisponible (${m}). Les fichiers restent sur le SSD.`,
    nasNoPass: "NAS non configuré (mot de passe manquant dans les paramètres).",
    cancelled: "Ingestion annulée par l'utilisateur.",
    copyFail: (f, m) => `Échec de copie ${f} : ${m}`,
  },
  es: {
    scanning: "Analizando la tarjeta de memoria...",
    found: (n, gb) => `${n} archivos detectados (${gb} GB)`,
    noMedia: "No se encontraron fotos ni vídeos en el origen.",
    copyStart: (d) => `Copiando al SSD local: ${d}`,
    copyDone: (n, mb, s, v) => `Copia local completada: ${n} archivos, ${mb} MB en ${s}s (${v} MB/s)`,
    skipped: (n) => `${n} archivos ya existían en el SSD (omitidos)`,
    cloudStart: "Registrando en Supabase y subiendo previsualizaciones...",
    cloudDone: (ok, ko) => `Nube Supabase: ${ok} previsualizaciones subidas${ko ? `, ${ko} con error` : ""}`,
    dbError: (m) => `Error de Supabase: ${m}`,
    nasStart: (h) => `Sincronizando con el NAS (${h})...`,
    nasDone: (ok, ko) => `NAS: ${ok} archivos sincronizados${ko ? `, ${ko} con error` : ""}`,
    nasUnavailable: (m) => `NAS no disponible (${m}). Los archivos permanecen en el SSD.`,
    nasNoPass: "NAS sin configurar (falta la contraseña en ajustes).",
    cancelled: "Ingesta cancelada por el usuario.",
    copyFail: (f, m) => `Fallo al copiar ${f}: ${m}`,
  },
  en: {
    scanning: "Scanning memory card...",
    found: (n, gb) => `${n} files detected (${gb} GB)`,
    noMedia: "No photo or video files found in the source.",
    copyStart: (d) => `Copying to local SSD: ${d}`,
    copyDone: (n, mb, s, v) => `Local copy finished: ${n} files, ${mb} MB in ${s}s (${v} MB/s)`,
    skipped: (n) => `${n} files already on the SSD (skipped)`,
    cloudStart: "Registering in Supabase and uploading previews...",
    cloudDone: (ok, ko) => `Supabase cloud: ${ok} previews uploaded${ko ? `, ${ko} failed` : ""}`,
    dbError: (m) => `Supabase error: ${m}`,
    nasStart: (h) => `Syncing to NAS (${h})...`,
    nasDone: (ok, ko) => `NAS: ${ok} files synced${ko ? `, ${ko} failed` : ""}`,
    nasUnavailable: (m) => `NAS unavailable (${m}). Files remain on the SSD.`,
    nasNoPass: "NAS not configured (password missing in settings).",
    cancelled: "Ingestion cancelled by the user.",
    copyFail: (f, m) => `Copy failed ${f}: ${m}`,
  },
  ar: {
    scanning: "جارٍ فحص بطاقة الذاكرة...",
    found: (n, gb) => `تم العثور على ${n} ملفًا (${gb} غيغابايت)`,
    noMedia: "لم يتم العثور على صور أو فيديوهات في المصدر.",
    copyStart: (d) => `نسخ إلى قرص SSD المحلي: ${d}`,
    copyDone: (n, mb, s, v) => `اكتمل النسخ المحلي: ${n} ملفًا، ${mb} ميغابايت في ${s} ثانية (${v} ميغابايت/ث)`,
    skipped: (n) => `${n} ملفًا موجود مسبقًا على SSD (تم تخطيه)`,
    cloudStart: "التسجيل في Supabase ورفع المعاينات...",
    cloudDone: (ok, ko) => `سحابة Supabase: تم رفع ${ok} معاينة${ko ? `، فشل ${ko}` : ""}`,
    dbError: (m) => `خطأ Supabase: ${m}`,
    nasStart: (h) => `المزامنة مع NAS (${h})...`,
    nasDone: (ok, ko) => `NAS: تمت مزامنة ${ok} ملفًا${ko ? `، فشل ${ko}` : ""}`,
    nasUnavailable: (m) => `NAS غير متاح (${m}). تبقى الملفات على SSD.`,
    nasNoPass: "لم يتم إعداد NAS (كلمة المرور مفقودة في الإعدادات).",
    cancelled: "تم إلغاء التفريغ من قبل المستخدم.",
    copyFail: (f, m) => `فشل نسخ ${f}: ${m}`,
  },
}

// ---------------------------------------------------------------------------
// Supabase + autenticación persistente (token cifrado con DPAPI de Windows)
// ---------------------------------------------------------------------------
let sb = null
let sbSignature = ""

function authStorage() {
  const file = path.join(app.getPath("userData"), "auth-session.bin")
  const read = () => {
    try {
      if (!fs.existsSync(file)) return {}
      const buf = fs.readFileSync(file)
      const txt = safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(buf) : buf.toString("utf-8")
      return JSON.parse(txt)
    } catch {
      return {}
    }
  }
  const write = (obj) => {
    const txt = JSON.stringify(obj)
    fs.writeFileSync(file, safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(txt) : Buffer.from(txt, "utf-8"))
  }
  return {
    getItem: (k) => {
      const o = read()
      return o[k] ?? null
    },
    setItem: (k, v) => {
      const o = read()
      o[k] = v
      write(o)
    },
    removeItem: (k) => {
      const o = read()
      delete o[k]
      write(o)
    },
  }
}

function getClient() {
  const cfg = getConfig()
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
    const err = new Error("CONFIG_MISSING")
    err.code = "CONFIG_MISSING"
    throw err
  }
  const signature = `${cfg.supabaseUrl}|${cfg.supabaseAnonKey}`
  if (!sb || sbSignature !== signature) {
    sb = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: {
        storage: authStorage(),
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
    sbSignature = signature
  }
  return sb
}

async function getAuthStatus() {
  try {
    const { data } = await getClient().auth.getSession()
    const user = data?.session?.user
    return user ? { loggedIn: true, email: user.email } : { loggedIn: false }
  } catch (e) {
    return { loggedIn: false, error: e.code === "CONFIG_MISSING" ? "CONFIG_MISSING" : e.message }
  }
}

async function login(email, password) {
  try {
    const { data, error } = await getClient().auth.signInWithPassword({ email: String(email || "").trim(), password })
    if (error) return { ok: false, error: error.message }
    return { ok: true, email: data.user.email }
  } catch (e) {
    return { ok: false, error: e.code === "CONFIG_MISSING" ? "CONFIG_MISSING" : e.message }
  }
}

async function logout() {
  try {
    await getClient().auth.signOut()
  } catch {}
  return { ok: true }
}

async function listSessions() {
  try {
    const { data, error } = await getClient()
      .from("sessions")
      .select("id, client_name, session_date, category, session_type, tags, status")
      .order("session_date", { ascending: false })
      .limit(300)
    if (error) return { ok: false, error: error.message }
    return { ok: true, sessions: data || [] }
  } catch (e) {
    return { ok: false, error: e.code === "CONFIG_MISSING" ? "CONFIG_MISSING" : e.message }
  }
}

// ---------------------------------------------------------------------------
// Utilidades de ingesta
// ---------------------------------------------------------------------------
function generateProjectFolderName(sessionDate, clientName, projectName) {
  const cleanDate = String(sessionDate || new Date().toISOString().split("T")[0]).replace(/[^0-9-]/g, "")
  const cleanClient = String(clientName || "Cliente").trim().replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]/g, "_")
  const cleanProject = String(projectName || "Sesion").trim().replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]/g, "_")
  return `${cleanDate}_${cleanClient}_${cleanProject}`
}

function scanSource(root, depth = 0, out = []) {
  if (depth > 4) return out
  let entries = []
  try {
    entries = fs.readdirSync(root, { withFileTypes: true })
  } catch {
    return out
  }
  for (const e of entries) {
    if (e.name.startsWith(".")) continue
    const full = path.join(root, e.name)
    if (e.isDirectory()) {
      if (/^(System Volume Information|\$RECYCLE\.BIN)$/i.test(e.name)) continue
      scanSource(full, depth + 1, out)
    } else if (e.isFile() && classify(e.name) !== "other") {
      out.push(full)
    }
  }
  return out
}

function copyWithProgress(src, dest, onBytes, isCancelled) {
  return new Promise((resolve, reject) => {
    const rs = fs.createReadStream(src, { highWaterMark: 4 * 1024 * 1024 })
    const ws = fs.createWriteStream(dest)
    rs.on("data", (chunk) => {
      onBytes(chunk.length)
      if (isCancelled()) rs.destroy(new Error("CANCELLED"))
    })
    rs.on("error", (e) => {
      ws.destroy()
      reject(e)
    })
    ws.on("error", reject)
    ws.on("finish", resolve)
    rs.pipe(ws)
  })
}

function createTracker(emit, enabled) {
  const weights = { copy: enabled.copy ? 35 : 0, cloud: enabled.cloud ? 40 : 0, nas: enabled.nas ? 25 : 0 }
  const stages = {
    copy: { state: enabled.copy ? "active" : "off", percent: enabled.copy ? 0 : 100 },
    cloud: { state: enabled.cloud ? "pending" : "off", percent: 0 },
    nas: { state: enabled.nas ? "pending" : "off", percent: 0 },
  }
  const startedAt = Date.now()
  const samples = []
  let bytes = 0
  let lastEmit = 0
  const state = { phase: enabled.copy ? "copy" : (enabled.cloud ? "cloud" : "nas"), currentFile: "", processed: 0, total: 0 }

  const overall = () => {
    let sum = 0
    let wsum = 0
    for (const k of Object.keys(weights)) {
      if (stages[k].state === "off") continue
      sum += weights[k] * stages[k].percent
      wsum += weights[k]
    }
    return wsum ? sum / wsum : 0
  }

  const speed = () => {
    const now = Date.now()
    samples.push([now, bytes])
    while (samples.length > 2 && now - samples[0][0] > 3000) samples.shift()
    const [t0, b0] = samples[0]
    const dt = (now - t0) / 1000
    return dt > 0.2 ? (bytes - b0) / (1024 * 1024) / dt : 0
  }

  const push = (force = false) => {
    const now = Date.now()
    if (!force && now - lastEmit < 120) return
    lastEmit = now
    const pct = overall()
    const elapsed = (now - startedAt) / 1000
    const eta = pct > 2 ? Math.max(0, Math.round((elapsed * (100 - pct)) / pct)) : null
    emit({
      type: "progress",
      phase: state.phase,
      stages: JSON.parse(JSON.stringify(stages)),
      percent: Math.min(100, Math.round(pct * 10) / 10),
      currentFile: state.currentFile,
      processed: state.processed,
      total: state.total,
      speed: Number(speed().toFixed(1)),
      eta,
      elapsed: Math.round(elapsed),
    })
  }

  return {
    stages,
    state,
    addBytes: (n) => {
      bytes += n
    },
    setStage: (key, patch, force = false) => {
      Object.assign(stages[key], patch)
      push(force)
    },
    setFile: (name, processed, total) => {
      state.currentFile = name
      state.processed = processed
      state.total = total
      push()
    },
    setPhase: (p) => {
      state.phase = p
    },
    push,
    log: (level, msg) => emit({ type: "log", level, msg, time: new Date().toLocaleTimeString() }),
    startedAt: () => startedAt,
  }
}

// ---------------------------------------------------------------------------
// Ingesta completa
// ---------------------------------------------------------------------------
let currentJob = null

function cancelIngest() {
  if (currentJob) currentJob.cancelled = true
  return { ok: true }
}

async function runIngest(params, emit) {
  if (currentJob) return { ok: false, error: "BUSY" }
  const job = { cancelled: false }
  currentJob = job
  const isCancelled = () => job.cancelled

  const cfg = getConfig()
  const lang = T[params.lang] ? params.lang : "fr"
  const t = T[lang]
  const useLocal = params.copyLocal !== false
  const useCloud = params.uploadSupabase !== false
  const useNas = params.syncNas !== false
  const tracker = createTracker(emit, { copy: useLocal, cloud: useCloud, nas: useNas })

  try {
    const supabase = getClient()
    const { data: sess, error: sessErr } = await supabase
      .from("sessions")
      .select("id, client_name, session_date, category, tags")
      .eq("id", params.sessionId)
      .single()
    if (sessErr || !sess) throw new Error(sessErr?.message || "SESSION_NOT_FOUND")

    const projectName = (sess.tags && sess.tags[0]) || sess.category || "Sesion"
    const folderName = generateProjectFolderName(sess.session_date, sess.client_name, projectName)
    const base = params.targetBasePath || cfg.ssdPath
    const rootDir = path.join(base, folderName)
    const rawPhotos = path.join(rootDir, "01_RAW", "Fotos")
    const rawVideos = path.join(rootDir, "01_RAW", "Videos")
    for (const d of [rawPhotos, rawVideos, path.join(rootDir, "02_Seleccion_Cliente"), path.join(rootDir, "03_Edicion_Master"), path.join(rootDir, "04_Entregas_Finales")]) {
      fs.mkdirSync(d, { recursive: true })
    }

    // --- Escaneo y nombres semánticos (misma lógica que el dashboard) -------
    tracker.log("info", t.scanning)
    const sources = scanSource(params.sourcePath).sort((a, b) => path.basename(a).localeCompare(path.basename(b)))
    if (sources.length === 0) {
      tracker.log("warn", t.noMedia)
      emit({ type: "done", empty: true, summary: { files: 0 } })
      return { ok: true, empty: true }
    }

    const safeProject = String(projectName).replace(/[^a-zA-Z0-9]/g, "")
    const safeClient = String(sess.client_name || "Cliente").replace(/[^a-zA-Z0-9]/g, "")
    const dateStr = String(sess.session_date).replace(/-/g, "")
    let seq = 0
    let lastBase = ""
    const items = []
    let totalBytes = 0
    for (const src of sources) {
      const ext = path.extname(src)
      const baseName = path.parse(src).name
      if (baseName !== lastBase) {
        seq++
        lastBase = baseName
      }
      const name = `${String(seq).padStart(3, "0")}-${safeProject}-${dateStr}-${safeClient}${ext}`
      const st = fs.statSync(src)
      const type = classify(src)
      const dir = type === "photo" ? rawPhotos : rawVideos
      const lowerExt = ext.toLowerCase()
      items.push({
        src,
        name,
        type,
        size: st.size,
        mtime: st.mtime,
        atime: st.atime,
        dest: path.join(dir, name),
        sub: type === "photo" ? "Fotos" : "Videos",
        assetType: type === "photo" ? (lowerExt === ".jpg" || lowerExt === ".jpeg" ? "jpg" : "raw_photo") : "raw_video",
        isJpg: lowerExt === ".jpg" || lowerExt === ".jpeg",
      })
      totalBytes += st.size
    }
    tracker.log("info", t.found(items.length, (totalBytes / 1024 ** 3).toFixed(2)))

    // --- FASE 1: SD -> SSD local (si está activado) -------------------------
    let okItems = items
    let totalMb = Number((totalBytes / 1024 ** 2).toFixed(1))
    let photos = 0
    let videos = 0

    if (useLocal) {
      tracker.log("info", t.copyStart(rootDir))
      tracker.setPhase("copy")
      tracker.state.total = items.length
      const copyStart = Date.now()
      let copiedBytes = 0
      let skipped = 0
      let done = 0
      for (const it of items) {
        if (isCancelled()) throw new Error("CANCELLED")
        tracker.setFile(it.name, done, items.length)
        let already = false
        try {
          already = fs.existsSync(it.dest) && fs.statSync(it.dest).size === it.size
        } catch {}
        if (already) {
          skipped++
          tracker.addBytes(it.size)
          copiedBytes += it.size
        } else {
          try {
            await copyWithProgress(
              it.src,
              it.dest,
              (n) => {
                copiedBytes += n
                tracker.addBytes(n)
                tracker.stages.copy.percent = Math.min(100, (copiedBytes / totalBytes) * 100)
                tracker.push()
              },
              isCancelled
            )
            if (fs.statSync(it.dest).size !== it.size) throw new Error("SIZE_MISMATCH")
            fs.utimesSync(it.dest, it.atime, it.mtime)
          } catch (e) {
            if (e.message === "CANCELLED") throw e
            tracker.log("warn", t.copyFail(it.name, e.message))
            try {
              fs.unlinkSync(it.dest)
            } catch {}
            it.failed = true
          }
        }
        if (!it.failed) it.type === "photo" ? photos++ : videos++
        done++
        tracker.stages.copy.percent = (done / items.length) * 100
        tracker.setFile(it.name, done, items.length)
      }
      okItems = items.filter((i) => !i.failed)
      const copySec = Math.max(0.001, (Date.now() - copyStart) / 1000)
      totalMb = Number((copiedBytes / 1024 ** 2).toFixed(1))
      if (skipped) tracker.log("info", t.skipped(skipped))
      tracker.log("success", t.copyDone(okItems.length, totalMb, copySec.toFixed(0), (totalMb / copySec).toFixed(1)))
      tracker.setStage("copy", { state: "done", percent: 100 }, true)
    } else {
      for (const it of items) {
        it.localDest = it.dest
        it.dest = it.src
        if (it.type === "photo") photos++
        else videos++
      }
      okItems = items
      tracker.setStage("copy", { state: "off", percent: 100 }, true)
    }

    // --- FASE 2: Supabase (registro + previews WebP) ------------------------
    let cloudOk = 0
    let cloudFail = 0
    if (useCloud) {
      if (isCancelled()) throw new Error("CANCELLED")
      tracker.setPhase("cloud")
      tracker.setStage("cloud", { state: "active", percent: 0 }, true)
      tracker.log("info", t.cloudStart)
      tracker.state.total = okItems.length
      tracker.state.processed = 0

      // 2.1 Registro en media_assets (sin duplicar si ya existen)
      const idByName = new Map()
      for (let i = 0; i < okItems.length; i += 100) {
        const chunk = okItems.slice(i, i + 100)
        const names = chunk.map((c) => c.name)
        const { data: existing } = await supabase.from("media_assets").select("id, filename").eq("session_id", sess.id).in("filename", names)
        for (const e of existing || []) idByName.set(e.filename, e.id)
        const fresh = chunk.filter((c) => !idByName.has(c.name))
        if (fresh.length) {
          const rows = fresh.map((c) => ({
            session_id: sess.id,
            asset_type: c.assetType,
            filename: c.name,
            nas_path: `${folderName}/01_RAW/${c.sub}/${c.name}`,
            size_mb: Number((c.size / 1024 ** 2).toFixed(2)),
            preview_url: `/api/media/preview?file=${encodeURIComponent(c.dest)}`,
            is_archived: false,
            notes: `SSD: ${c.dest}`,
          }))
          const { data: inserted, error } = await supabase.from("media_assets").insert(rows).select("id, filename")
          if (error) {
            tracker.log("error", t.dbError(error.message))
          } else {
            for (const r of inserted || []) idByName.set(r.filename, r.id)
          }
        }
      }

      // 2.2 Previews WebP (1600px) -> bucket session-previews
      let sharp = null
      let et = null
      try {
        sharp = require("sharp")
        sharp.concurrency(2)
        sharp.cache(false)
      } catch (e) {
        tracker.log("warn", t.dbError(`sharp: ${e.message}`))
      }
      try {
        const { ExifTool } = require("exiftool-vendored")
        et = new ExifTool({ maxProcs: 2, taskTimeoutMillis: 30000 })
      } catch {}

      const photoItems = okItems.filter((i) => i.type === "photo")
      const videoCount = okItems.length - photoItems.length
      let processed = videoCount // los vídeos no generan preview: cuentan como hechos
      let next = 0
      const bump = () => {
        processed++
        tracker.stages.cloud.percent = okItems.length ? (processed / okItems.length) * 100 : 100
        tracker.setFile("", processed, okItems.length)
      }
      tracker.stages.cloud.percent = okItems.length ? (processed / okItems.length) * 100 : 100

      const worker = async () => {
        while (!isCancelled()) {
          const i = next++
          if (i >= photoItems.length) return
          const it = photoItems[i]
          tracker.state.currentFile = it.name
          try {
            if (!sharp) throw new Error("NO_SHARP")
            let input = it.dest
            if (!it.isJpg && et) {
              for (const tag of ["PreviewImage", "JpgFromRaw"]) {
                try {
                  const buf = await et.extractBinaryTagToBuffer(tag, it.dest)
                  if (buf && buf.length > 2000) {
                    input = buf
                    break
                  }
                } catch {}
              }
            }
            const webp = await sharp(input, { failOn: "none" })
              .rotate()
              .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
              .webp({ quality: 80, effort: 2 })
              .toBuffer()
            const storagePath = `${sess.id}/${path.parse(it.name).name}_preview.webp`
            let upErr = null
            for (let attempt = 0; attempt < 3; attempt++) {
              const { error } = await supabase.storage.from("session-previews").upload(storagePath, webp, {
                contentType: "image/webp",
                cacheControl: "31536000",
                upsert: true,
              })
              upErr = error
              if (!error) break
              await new Promise((r) => setTimeout(r, 400 * (attempt + 1)))
            }
            if (upErr) throw upErr
            tracker.addBytes(webp.length)
            const { data: pub } = supabase.storage.from("session-previews").getPublicUrl(storagePath)
            const id = idByName.get(it.name)
            if (id) {
              const { error: updErr } = await supabase.from("media_assets").update({ preview_url: pub.publicUrl }).eq("id", id)
              if (updErr) throw updErr
            }
            cloudOk++
          } catch (e) {
            cloudFail++
            tracker.log("warn", `${it.name}: ${e.message || e}`)
          }
          bump()
        }
      }
      await Promise.all(Array.from({ length: 4 }, worker))
      try {
        if (et) await et.end()
      } catch {}
      if (isCancelled()) throw new Error("CANCELLED")
      tracker.log(cloudFail ? "warn" : "success", t.cloudDone(cloudOk, cloudFail))
      tracker.setStage("cloud", { state: cloudFail && !cloudOk ? "error" : "done", percent: 100 }, true)
    }

    // --- FASE 3: NAS por FTP ------------------------------------------------
    let nasOk = 0
    let nasFail = 0
    let nasState = "off"
    if (useNas) {
      if (isCancelled()) throw new Error("CANCELLED")
      tracker.setPhase("nas")
      if (!cfg.nasPassword) {
        tracker.log("warn", t.nasNoPass)
        nasState = "skipped"
        tracker.setStage("nas", { state: "error", percent: 100 }, true)
      } else {
        tracker.setStage("nas", { state: "active", percent: 0 }, true)
        tracker.log("info", t.nasStart(cfg.nasHost))
        const ftp = require("basic-ftp")
        let client = new ftp.Client(120000)
        const connect = async () => {
          try {
            client.close()
          } catch {}
          client = new ftp.Client(120000)
          await client.access({ host: cfg.nasHost, user: cfg.nasUser, password: cfg.nasPassword, port: 21 })
        }
        try {
          await connect()
          const ensured = new Set()
          const nasTotal = okItems.reduce((a, b) => a + b.size, 0) || 1
          let nasBytes = 0
          let consecutiveFails = 0
          let n = 0
          for (const it of okItems) {
            if (isCancelled()) throw new Error("CANCELLED")
            tracker.setFile(it.name, n, okItems.length)
            const dir = `${cfg.nasBaseDir}/${folderName}/01_RAW/${it.sub}`
            const remote = `${dir}/${it.name}`
            let sent = false
            for (let attempt = 0; attempt < 2 && !sent; attempt++) {
              try {
                if (!ensured.has(dir)) {
                  await client.ensureDir(dir)
                  ensured.add(dir)
                }
                let remoteSize = -1
                try {
                  remoteSize = await client.size(remote)
                } catch {}
                if (remoteSize === it.size) {
                  nasBytes += it.size
                  tracker.addBytes(it.size)
                } else {
                  let last = 0
                  client.trackProgress((info) => {
                    const delta = info.bytes - last
                    last = info.bytes
                    nasBytes += delta
                    tracker.addBytes(delta)
                    tracker.stages.nas.percent = Math.min(100, (nasBytes / nasTotal) * 100)
                    tracker.push()
                  })
                  await client.uploadFrom(it.dest, remote)
                  client.trackProgress()
                }
                sent = true
              } catch (e) {
                client.trackProgress()
                if (attempt === 0) {
                  try {
                    ensured.clear()
                    await connect()
                  } catch {}
                }
              }
            }
            if (sent) {
              nasOk++
              consecutiveFails = 0
            } else {
              nasFail++
              consecutiveFails++
              if (consecutiveFails >= 5) throw new Error("NAS_UNSTABLE")
            }
            n++
            tracker.stages.nas.percent = Math.min(100, (nasBytes / nasTotal) * 100)
            tracker.setFile(it.name, n, okItems.length)
          }
          tracker.log(nasFail ? "warn" : "success", t.nasDone(nasOk, nasFail))
          nasState = nasFail ? "partial" : "done"
          tracker.setStage("nas", { state: nasFail && !nasOk ? "error" : "done", percent: 100 }, true)
        } catch (e) {
          if (e.message === "CANCELLED") throw e
          tracker.log("warn", t.nasUnavailable(e.message))
          nasState = "failed"
          tracker.setStage("nas", { state: "error", percent: 100 }, true)
        } finally {
          try {
            client.close()
          } catch {}
        }
      }
    }

    const summary = {
      files: okItems.length,
      failedFiles: items.length - okItems.length,
      photos,
      videos,
      mb: totalMb,
      elapsed: Math.round((Date.now() - tracker.startedAt()) / 1000),
      cloud: useCloud ? { ok: cloudOk, failed: cloudFail } : null,
      nas: useNas ? { ok: nasOk, failed: nasFail, state: nasState } : null,
      rootDir,
      folderName,
      client: sess.client_name,
    }
    tracker.setPhase("done")
    tracker.push(true)
    emit({ type: "done", summary })
    return { ok: true, summary }
  } catch (e) {
    if (e.message === "CANCELLED") {
      tracker.log("warn", t.cancelled)
      emit({ type: "cancelled" })
      return { ok: false, cancelled: true }
    }
    emit({ type: "error", message: e.message || String(e) })
    return { ok: false, error: e.message || String(e) }
  } finally {
    currentJob = null
  }
}

// ---------------------------------------------------------------------------
// Sincronización Automática de 03_Edicion_Master
// ---------------------------------------------------------------------------
function getFfmpegPath() {
  const { execSync } = require("child_process")
  try {
    const out = execSync("where ffmpeg", { stdio: ["pipe", "pipe", "ignore"], encoding: "utf-8" }).trim()
    const firstLine = out.split(/\r?\n/)[0].trim()
    if (firstLine && fs.existsSync(firstLine)) return firstLine
  } catch {}

  const localApp = process.env.LOCALAPPDATA || ""
  if (localApp) {
    const wingetDir = path.join(localApp, "Microsoft", "WinGet", "Packages")
    if (fs.existsSync(wingetDir)) {
      try {
        const pkgs = fs.readdirSync(wingetDir)
        for (const pkg of pkgs) {
          if (pkg.toLowerCase().includes("ffmpeg")) {
            const candidateDir = path.join(wingetDir, pkg)
            const sub = fs.readdirSync(candidateDir)
            for (const s of sub) {
              const binP = path.join(candidateDir, s, "bin", "ffmpeg.exe")
              if (fs.existsSync(binP)) return binP
              const rootP = path.join(candidateDir, s, "ffmpeg.exe")
              if (fs.existsSync(rootP)) return rootP
            }
          }
        }
      } catch {}
    }
  }

  return "ffmpeg"
}

async function syncMasterFile(item, lang = "fr", onProgress = () => {}) {
  const startTime = Date.now()
  onProgress({
    type: "progress",
    isMasterSync: true,
    currentFile: item.fileName,
    percent: 15,
    speed: 0,
    processed: 1,
    total: 1,
    stages: {
      copy: { state: "done", percent: 100 },
      cloud: { state: "active", percent: 15 },
      nas: { state: "pending", percent: 0 },
    },
  })

  let sessionId = null
  let clientName = ""
  const supabase = getClient()

  // 1. Resolver Sesión en Supabase
  try {
    const { data: matchedAsset } = await supabase
      .from("media_assets")
      .select("session_id")
      .ilike("nas_path", `${item.projectFolder}/%`)
      .not("session_id", "is", null)
      .limit(1)

    if (matchedAsset && matchedAsset.length > 0 && matchedAsset[0].session_id) {
      sessionId = matchedAsset[0].session_id
    } else {
      const parts = item.projectFolder.split("_")
      const dateCandidate = parts.find((p) => /^\d{4}-\d{2}-\d{2}$/.test(p))
      let query = supabase.from("sessions").select("id, client_name")
      if (dateCandidate) query = query.eq("session_date", dateCandidate)
      const { data: sessList } = await query.limit(20)
      if (sessList && sessList.length > 0) {
        const found = sessList.find((s) => s.client_name && item.projectFolder.toLowerCase().includes(s.client_name.toLowerCase()))
        sessionId = found ? found.id : sessList[0].id
        clientName = found ? found.client_name : sessList[0].client_name
      }
    }

    if (sessionId && !clientName) {
      const { data: s } = await supabase.from("sessions").select("client_name").eq("id", sessionId).single()
      if (s) clientName = s.client_name
    }
  } catch (e) {
    console.warn("Error resolviendo sesión para master file:", e.message)
  }

  // 2. Generar Previsualización WebP (Fotos y Vídeos)
  let previewWebpBuffer = null
  let sharp = null
  try {
    sharp = require("sharp")
    sharp.concurrency(2)
    sharp.cache(false)
  } catch {}

  if (!item.isVideo && sharp) {
    try {
      previewWebpBuffer = await sharp(item.filePath, { failOn: "none" })
        .rotate()
        .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80, effort: 2 })
        .toBuffer()
    } catch (err) {
      console.warn("Error Sharp en imagen master:", err.message)
    }
  } else if (item.isVideo) {
    const ffmpegBin = getFfmpegPath()
    const tempThumb = path.join(app.getPath("temp"), `lamha_thumb_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`)
    try {
      const { execFile } = require("child_process")
      await new Promise((resolve) => {
        execFile(ffmpegBin, ["-ss", "00:00:01", "-i", item.filePath, "-vframes", "1", "-q:v", "2", tempThumb, "-y"], (err) => {
          if (err) {
            execFile(ffmpegBin, ["-ss", "00:00:00.1", "-i", item.filePath, "-vframes", "1", "-q:v", "2", tempThumb, "-y"], () => resolve())
          } else {
            resolve()
          }
        })
      })

      if (fs.existsSync(tempThumb) && sharp) {
        previewWebpBuffer = await sharp(tempThumb, { failOn: "none" })
          .resize({ width: 1280, height: 720, fit: "inside", withoutEnlargement: true })
          .webp({ quality: 80, effort: 2 })
          .toBuffer()
      }
    } catch (err) {
      console.warn("Error extrayendo fotograma de vídeo:", err.message)
    } finally {
      try {
        if (fs.existsSync(tempThumb)) fs.unlinkSync(tempThumb)
      } catch {}
    }
  }

  // 3. Subir WebP a Supabase Storage (bucket session-previews)
  let previewUrl = null
  if (previewWebpBuffer) {
    const cleanBase = path.parse(item.fileName).name
    const storagePath = `master/${sessionId || "unassigned"}/${cleanBase}_preview.webp`
    try {
      const { error: upErr } = await supabase.storage.from("session-previews").upload(storagePath, previewWebpBuffer, {
        contentType: "image/webp",
        cacheControl: "31536000",
        upsert: true,
      })
      if (!upErr) {
        const { data: pub } = supabase.storage.from("session-previews").getPublicUrl(storagePath)
        previewUrl = pub?.publicUrl || null
      }
    } catch (err) {
      console.warn("Error subiendo preview a Supabase Storage:", err.message)
    }
  }

  // 4. Registrar o Actualizar en media_assets
  const nasRelativePath = `${item.projectFolder}/${item.masterSubfolder}/${item.fileName}`
  const sizeMb = Number((item.size / 1024 ** 2).toFixed(2))
  const assetType = item.isVideo ? "raw_video" : "jpg"

  try {
    const { data: existing } = await supabase
      .from("media_assets")
      .select("id")
      .eq("filename", item.fileName)
      .eq("nas_path", nasRelativePath)
      .limit(1)

    if (existing && existing.length > 0) {
      await supabase
        .from("media_assets")
        .update({
          session_id: sessionId || null,
          asset_type: assetType,
          size_mb: sizeMb,
          preview_url: previewUrl,
          notes: `Master: ${item.filePath}`,
          is_archived: false,
        })
        .eq("id", existing[0].id)
    } else {
      await supabase.from("media_assets").insert([
        {
          session_id: sessionId || null,
          asset_type: assetType,
          filename: item.fileName,
          nas_path: nasRelativePath,
          size_mb: sizeMb,
          preview_url: previewUrl,
          notes: `Master: ${item.filePath}`,
          is_archived: false,
        },
      ])
    }
  } catch (dbErr) {
    console.warn("Error registrando archivo master en base de datos:", dbErr.message)
  }

  onProgress({
    type: "progress",
    isMasterSync: true,
    currentFile: item.fileName,
    percent: 60,
    speed: 0,
    stages: {
      copy: { state: "done", percent: 100 },
      cloud: { state: "done", percent: 100 },
      nas: { state: "active", percent: 10 },
    },
  })

  // 5. Transferencia a NAS por FTP
  const cfg = getConfig()
  if (cfg.nasPassword && cfg.nasHost) {
    const ftp = require("basic-ftp")
    const client = new ftp.Client(120000)
    try {
      await client.access({
        host: cfg.nasHost,
        user: cfg.nasUser,
        password: cfg.nasPassword,
        port: 21,
      })
      const remoteDir = `${cfg.nasBaseDir}/${item.projectFolder}/${item.masterSubfolder}`
      await client.ensureDir(remoteDir)

      let lastBytes = 0
      client.trackProgress((info) => {
        const delta = info.bytes - lastBytes
        lastBytes = info.bytes
        const pct = Math.min(100, Math.round((info.bytes / item.size) * 100))
        const elapsedSec = Math.max(1, (Date.now() - startTime) / 1000)
        onProgress({
          type: "progress",
          isMasterSync: true,
          currentFile: item.fileName,
          percent: 60 + Math.round(pct * 0.4),
          speed: Number((info.bytes / (1024 * 1024) / elapsedSec).toFixed(1)),
          stages: {
            copy: { state: "done", percent: 100 },
            cloud: { state: "done", percent: 100 },
            nas: { state: "active", percent: pct },
          },
        })
      })

      await client.uploadFrom(item.filePath, `${remoteDir}/${item.fileName}`)
      client.trackProgress()
    } catch (ftpErr) {
      console.warn("Error enviando master a NAS FTP:", ftpErr.message)
    } finally {
      try {
        client.close()
      } catch {}
    }
  }

  // 6. Completado
  onProgress({
    type: "done",
    isMasterSync: true,
    fileName: item.fileName,
    summary: {
      client: clientName || item.projectFolder,
      files: 1,
    },
  })

  return {
    ok: true,
    fileName: item.fileName,
    client: clientName || item.projectFolder,
  }
}

module.exports = { 
  getAuthStatus, 
  login, 
  logout, 
  listSessions, 
  runIngest, 
  cancelIngest, 
  scanSource, 
  classify,
  syncMasterFile,
  isIngesting: () => Boolean(currentJob),
}
