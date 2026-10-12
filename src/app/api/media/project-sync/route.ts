import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import * as ftp from "basic-ftp"
import { getStorageConfig, NAS_FTP_CONFIG, classifyMediaFile, resolveProjectLocalPath } from "@/lib/storage-config"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )
}

interface FolderStats {
  name: string
  localCount: number
  localSizeMB: number
  nasCount: number
  isSynced: boolean
}

interface ProjectSyncJob {
  folderName: string
  isSyncing: boolean
  status: "idle" | "syncing" | "completed" | "error"
  totalFiles: number
  completedFiles: number
  currentFile: string
  percent: number
  speedMBps?: number
  message: string
  logs: string[]
  error?: string
  startedAt?: string
  updatedAt: string
}

// In-memory sync state per project folder
const syncJobs = new Map<string, ProjectSyncJob>()

function getJobState(folderName: string): ProjectSyncJob {
  return syncJobs.get(folderName) || {
    folderName,
    isSyncing: false,
    status: "idle",
    totalFiles: 0,
    completedFiles: 0,
    currentFile: "",
    percent: 0,
    message: "",
    logs: [],
    updatedAt: new Date().toISOString()
  }
}

/**
 * Escanea recursivamente archivos en una ruta local
 */
function scanLocalDirectory(dirPath: string): { filesCount: number; totalSizeBytes: number; files: Array<{ name: string; relPath: string; size: number }> } {
  if (!fs.existsSync(dirPath)) {
    return { filesCount: 0, totalSizeBytes: 0, files: [] }
  }

  let filesCount = 0
  let totalSizeBytes = 0
  const files: Array<{ name: string; relPath: string; size: number }> = []

  function walk(current: string, sub: string) {
    const entries = fs.readdirSync(current, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue
      const full = path.join(current, entry.name)
      const rel = sub ? `${sub}/${entry.name}` : entry.name

      if (entry.isDirectory()) {
        walk(full, rel)
      } else if (entry.isFile()) {
        try {
          const st = fs.statSync(full)
          filesCount++
          totalSizeBytes += st.size
          files.push({ name: entry.name, relPath: rel, size: st.size })
        } catch {}
      }
    }
  }

  walk(dirPath, "")
  return { filesCount, totalSizeBytes, files }
}

/**
 * GET /api/media/project-sync?folder=<folderName>&sessionId=<sessionId>
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const folderName = searchParams.get("folder")
    const sessionId = searchParams.get("sessionId")

    if (!folderName) {
      return NextResponse.json({ error: "Parámetro 'folder' requerido" }, { status: 400 })
    }

    const localProjectPath = resolveProjectLocalPath(folderName)
    const localExists = fs.existsSync(localProjectPath)

    // ── 1. Estado LOCAL (SSD) ──
    const standardSubfolders = [
      "01_RAW/Fotos",
      "01_RAW/Videos",
      "02_Seleccion_Cliente",
      "03_Edicion_Master",
      "04_Entregas_Finales"
    ]

    const subfolderStats: FolderStats[] = []
    let totalLocalFiles = 0
    let totalLocalSizeBytes = 0

    if (localExists) {
      for (const sub of standardSubfolders) {
        const subPath = path.join(localProjectPath, ...sub.split("/"))
        const scan = scanLocalDirectory(subPath)
        totalLocalFiles += scan.filesCount
        totalLocalSizeBytes += scan.totalSizeBytes

        subfolderStats.push({
          name: sub,
          localCount: scan.filesCount,
          localSizeMB: Number((scan.totalSizeBytes / (1024 * 1024)).toFixed(1)),
          nasCount: 0,
          isSynced: false
        })
      }
    }

    // ── 2. Estado SUPABASE CLOUD ──
    let supabaseAssetsCount = 0
    let supabasePreviewsCount = 0
    let supabasePhotosCount = 0
    let supabaseVideosCount = 0

    try {
      const supabase = getSupabase()
      let query = supabase.from("media_assets").select("id, asset_type, preview_url, filename, nas_path")
      if (sessionId) {
        query = query.eq("session_id", sessionId)
      } else {
        query = query.ilike("nas_path", `%${folderName}%`)
      }
      const { data: assets } = await query

      if (assets) {
        supabaseAssetsCount = assets.length
        supabasePreviewsCount = assets.filter(a => a.preview_url && a.preview_url.length > 5).length
        supabasePhotosCount = assets.filter(a => !a.asset_type?.includes("video")).length
        supabaseVideosCount = assets.filter(a => a.asset_type?.includes("video") || a.asset_type === "reel").length
      }
    } catch (err) {
      console.error("Error consultando Supabase:", err)
    }

    // ── 3. Estado RED (NAS / FTP) ──
    let nasReachable = false
    let nasFolderExists = false
    let totalNasFiles = 0
    let totalNasSizeBytes = 0

    try {
      const client = new ftp.Client(10000)
      client.ftp.verbose = false
      await client.access({
        host: NAS_FTP_CONFIG.host,
        user: NAS_FTP_CONFIG.user,
        password: NAS_FTP_CONFIG.password,
        port: 21,
      })

      nasReachable = true
      const remoteProjectDir = `${NAS_FTP_CONFIG.baseDir}/${folderName}`

      try {
        const rootList = await client.list(NAS_FTP_CONFIG.baseDir)
        nasFolderExists = rootList.some(item => item.name === folderName && item.isDirectory)

        if (nasFolderExists) {
          for (const subStat of subfolderStats) {
            try {
              const remoteSubDir = `${remoteProjectDir}/${subStat.name}`
              const list = await client.list(remoteSubDir)
              const filesOnly = list.filter(item => !item.isDirectory && !item.name.startsWith("."))
              subStat.nasCount = filesOnly.length
              totalNasFiles += filesOnly.length
              
              const subBytes = filesOnly.reduce((acc, f) => acc + (f.size || 0), 0)
              totalNasSizeBytes += subBytes

              // Considerado sincronizado si tiene la misma cantidad de archivos
              subStat.isSynced = subStat.localCount === 0 
                ? filesOnly.length === 0 
                : filesOnly.length >= subStat.localCount
            } catch {
              subStat.nasCount = 0
              subStat.isSynced = subStat.localCount === 0
            }
          }
        }
      } catch {}

      client.close()
    } catch (e: any) {
      nasReachable = false
    }

    // ── Resumen de Sincronización en 3 Fases ──
    const step1Local = {
      status: !localExists ? "missing" : totalLocalFiles === 0 ? "empty" : "ready",
      exists: localExists,
      path: localProjectPath,
      filesCount: totalLocalFiles,
      sizeMB: Number((totalLocalSizeBytes / (1024 * 1024)).toFixed(1)),
      sizeGB: Number((totalLocalSizeBytes / (1024 * 1024 * 1024)).toFixed(2))
    }

    const step2Supabase = {
      status: supabaseAssetsCount === 0 ? "pending" : supabasePreviewsCount >= supabasePhotosCount ? "synced" : "partial",
      registeredAssets: supabaseAssetsCount,
      previewsCount: supabasePreviewsCount,
      photosCount: supabasePhotosCount,
      videosCount: supabaseVideosCount,
      isSynced: supabaseAssetsCount > 0 && supabasePreviewsCount >= supabasePhotosCount
    }

    const step3Nas = {
      status: !nasReachable ? "unreachable" : !nasFolderExists ? "missing_folder" : (totalLocalFiles > 0 && totalNasFiles >= totalLocalFiles) ? "synced" : "pending_sync",
      isReachable: nasReachable,
      exists: nasFolderExists,
      path: `ftp://${NAS_FTP_CONFIG.host}${NAS_FTP_CONFIG.baseDir}/${folderName}`,
      filesCount: totalNasFiles,
      sizeMB: Number((totalNasSizeBytes / (1024 * 1024)).toFixed(1)),
      sizeGB: Number((totalNasSizeBytes / (1024 * 1024 * 1024)).toFixed(2)),
      pendingFiles: Math.max(0, totalLocalFiles - totalNasFiles),
      isSynced: totalLocalFiles === 0 ? totalNasFiles === 0 : totalNasFiles >= totalLocalFiles
    }

    const currentJob = getJobState(folderName)

    return NextResponse.json({
      folderName,
      step1Local,
      step2Supabase,
      step3Nas,
      subfolderStats,
      isFullySynced: step1Local.status === "ready" && step2Supabase.isSynced && step3Nas.isSynced,
      syncJob: currentJob
    })

  } catch (error: any) {
    console.error("Error en project-sync:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function getProjectSyncStrings(lang: string = "es") {
  const l = (lang === "fr" || lang === "en" || lang === "ar") ? lang : "es"
  const dict = {
    es: {
      startingCopy: (count: number) => `Iniciando copia de ${count} archivos a la Red (NAS)...`,
      startingSync: (name: string) => `Iniciando sincronización de "${name}" al NAS...`,
      bgStarted: "Sincronización a Red (NAS) iniciada en segundo plano",
      criticalError: (err: string) => `❌ Error crítico: ${err}`,
      copiedToNet: (cur: number, tot: number, name: string) => `[${cur}/${tot}] 📁 Copiado a Red: ${name}`,
      fileError: (name: string, err: string) => `⚠️ Error con ${name}: ${err}`,
      successMessage: (cur: number, tot: number) => `¡Proyecto sincronizado con éxito en el NAS (${cur}/${tot} archivos)!`,
      successLog: "✅ Sincronización completada exitosamente.",
      failureMessage: (err: string) => `Fallo de conexión o copia: ${err}`,
      failureLog: (err: string) => `❌ Fallo: ${err}`,
    },
    fr: {
      startingCopy: (count: number) => `Démarrage de la copie de ${count} fichiers vers le réseau (NAS)...`,
      startingSync: (name: string) => `Démarrage de la synchronisation de "${name}" vers le NAS...`,
      bgStarted: "Synchronisation vers le réseau (NAS) démarrée en arrière-plan",
      criticalError: (err: string) => `❌ Erreur critique : ${err}`,
      copiedToNet: (cur: number, tot: number, name: string) => `[${cur}/${tot}] 📁 Copié sur le réseau : ${name}`,
      fileError: (name: string, err: string) => `⚠️ Erreur avec ${name} : ${err}`,
      successMessage: (cur: number, tot: number) => `Projet synchronisé avec succès sur le NAS (${cur}/${tot} fichiers) !`,
      successLog: "✅ Synchronisation terminée avec succès.",
      failureMessage: (err: string) => `Échec de connexion ou de copie : ${err}`,
      failureLog: (err: string) => `❌ Échec : ${err}`,
    },
    en: {
      startingCopy: (count: number) => `Starting copy of ${count} files to Network (NAS)...`,
      startingSync: (name: string) => `Starting sync of "${name}" to NAS...`,
      bgStarted: "Network (NAS) sync started in background",
      criticalError: (err: string) => `❌ Critical error: ${err}`,
      copiedToNet: (cur: number, tot: number, name: string) => `[${cur}/${tot}] 📁 Copied to Network: ${name}`,
      fileError: (name: string, err: string) => `⚠️ Error with ${name}: ${err}`,
      successMessage: (cur: number, tot: number) => `Project synced successfully to NAS (${cur}/${tot} files)!`,
      successLog: "✅ Sync completed successfully.",
      failureMessage: (err: string) => `Connection or copy failure: ${err}`,
      failureLog: (err: string) => `❌ Failure: ${err}`,
    },
    ar: {
      startingCopy: (count: number) => `بدء نسخ ${count} ملفات إلى شبكة التخزين (NAS)...`,
      startingSync: (name: string) => `بدء مزامنة "${name}" إلى NAS...`,
      bgStarted: "بدأت المزامنة إلى شبكة (NAS) في الخلفية",
      criticalError: (err: string) => `❌ خطأ فادح: ${err}`,
      copiedToNet: (cur: number, tot: number, name: string) => `[${cur}/${tot}] 📁 تم النسخ إلى الشبكة: ${name}`,
      fileError: (name: string, err: string) => `⚠️ خطأ في ${name}: ${err}`,
      successMessage: (cur: number, tot: number) => `تمت مزامنة المشروع بنجاح على NAS (${cur}/${tot} ملفات)!`,
      successLog: "✅ اكتملت المزامنة بنجاح.",
      failureMessage: (err: string) => `فشل في الاتصال أو النسخ: ${err}`,
      failureLog: (err: string) => `❌ فشل: ${err}`,
    },
  }
  return dict[l]
}

/**
 * POST /api/media/project-sync
 * Inicia la copia/sincronización de este proyecto local al NAS (vía FTP con basic-ftp)
 */
export async function POST(req: NextRequest) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 })
  }

  const { folderName, lang = "es" } = body
  if (!folderName) {
    return NextResponse.json({ error: "Falta 'folderName'" }, { status: 400 })
  }

  const t = getProjectSyncStrings(lang)

  const existingJob = syncJobs.get(folderName)
  if (existingJob && existingJob.isSyncing) {
    return NextResponse.json({ error: "Ya hay una sincronización activa para este proyecto", job: existingJob }, { status: 409 })
  }

  const localProjectPath = resolveProjectLocalPath(folderName, body.targetBasePath)

  if (!fs.existsSync(localProjectPath)) {
    return NextResponse.json({ error: `La carpeta local no existe: ${localProjectPath}` }, { status: 400 })
  }

  // Escanear todos los archivos locales del proyecto
  const scan = scanLocalDirectory(localProjectPath)
  if (scan.files.length === 0) {
    return NextResponse.json({ error: "No hay archivos locales para sincronizar al NAS" }, { status: 400 })
  }

  const job: ProjectSyncJob = {
    folderName,
    isSyncing: true,
    status: "syncing",
    totalFiles: scan.files.length,
    completedFiles: 0,
    currentFile: "",
    percent: 0,
    message: t.startingCopy(scan.files.length),
    logs: [`[${new Date().toLocaleTimeString()}] ${t.startingSync(folderName)}`],
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  syncJobs.set(folderName, job)

  // Ejecutar transferencia en background con reconexión automática y timeouts elevados
  runProjectNasSync(folderName, localProjectPath, scan.files, lang).catch((err) => {
    console.error(`[Project NAS Sync Error - ${folderName}]:`, err)
    const j = syncJobs.get(folderName)
    if (j) {
      j.isSyncing = false
      j.status = "error"
      j.error = err.message
      j.logs.push(`[${new Date().toLocaleTimeString()}] ${t.criticalError(err.message)}`)
      j.updatedAt = new Date().toISOString()
    }
  })

  return NextResponse.json({
    success: true,
    message: t.bgStarted,
    job
  })
}

async function runProjectNasSync(
  folderName: string,
  localProjectPath: string,
  filesToSync: Array<{ name: string; relPath: string; size: number }>,
  lang: string = "es"
) {
  const job = syncJobs.get(folderName)
  if (!job) return

  const t = getProjectSyncStrings(lang)
  const conn: { current: ftp.Client | null } = { current: null }

  async function getConnectedClient(): Promise<ftp.Client> {
    if (conn.current && !conn.current.closed) {
      return conn.current
    }
    if (conn.current) {
      try { conn.current.close() } catch {}
      conn.current = null
    }

    // Timeout de 90 segundos para tolerar archivos fotográficos pesados tipo RAW (.NEF / .ARW / .CR3)
    const newClient = new ftp.Client(90000)
    newClient.ftp.verbose = false
    await newClient.access({
      host: NAS_FTP_CONFIG.host,
      user: NAS_FTP_CONFIG.user,
      password: NAS_FTP_CONFIG.password,
      port: 21,
    })
    conn.current = newClient
    return newClient
  }

  try {
    const initialClient = await getConnectedClient()
    const remoteBase = `${NAS_FTP_CONFIG.baseDir}/${folderName}`
    await initialClient.ensureDir(remoteBase)

    let completed = 0

    for (const file of filesToSync) {
      if (!job.isSyncing) break // Permite cancelación

      job.currentFile = file.name
      job.percent = Math.round((completed / filesToSync.length) * 100)
      job.updatedAt = new Date().toISOString()

      const localFilePath = path.join(localProjectPath, file.relPath)
      const remoteDirForFile = path.dirname(`${remoteBase}/${file.relPath}`)
      const remoteFileName = path.basename(file.relPath)

      let uploadedOrSkipped = false
      let lastErr: any = null

      // Intentar hasta 2 veces con reconexión automática si el socket se cierra
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const activeClient = await getConnectedClient()
          await activeClient.ensureDir(remoteDirForFile)
          
          // Smart sync: verificar si el archivo ya existe en el NAS con el mismo tamaño exacto
          let existsWithSameSize = false
          try {
            const remoteList = await activeClient.list(remoteDirForFile)
            const existing = remoteList.find(item => item.name === remoteFileName && !item.isDirectory)
            if (existing && existing.size === file.size) {
              existsWithSameSize = true
            }
          } catch {}

          if (existsWithSameSize) {
            uploadedOrSkipped = true
            break
          }

          // Subir archivo mediante stream
          await activeClient.uploadFrom(localFilePath, `${remoteDirForFile}/${remoteFileName}`)
          uploadedOrSkipped = true
          break
        } catch (err: any) {
          lastErr = err
          // Si el socket falló (Timeout control socket, etc.), cerrar y limpiar para forzar nueva conexión
          if (conn.current) {
            try { conn.current.close() } catch {}
            conn.current = null
          }
          if (attempt < 2) {
            // Breve espera antes del reintento
            await new Promise(r => setTimeout(r, 1500))
          }
        }
      }

      completed++
      job.completedFiles = completed

      if (!uploadedOrSkipped) {
        job.logs.push(`[${new Date().toLocaleTimeString()}] ${t.fileError(file.name, lastErr?.message || "Timeout / Error")}`)
        if (job.logs.length > 100) job.logs.shift()
      } else {
        if (completed % 10 === 0 || completed === filesToSync.length) {
          job.logs.push(`[${new Date().toLocaleTimeString()}] ${t.copiedToNet(completed, filesToSync.length, file.name)}`)
          if (job.logs.length > 100) job.logs.shift()
        }
      }
    }

    job.isSyncing = false
    job.status = "completed"
    job.percent = 100
    job.currentFile = ""
    job.message = t.successMessage(completed, filesToSync.length)
    job.logs.push(`[${new Date().toLocaleTimeString()}] ${t.successLog}`)
    job.updatedAt = new Date().toISOString()

  } catch (err: any) {
    job.isSyncing = false
    job.status = "error"
    job.error = err.message
    job.message = t.failureMessage(err.message)
    job.logs.push(`[${new Date().toLocaleTimeString()}] ${t.failureLog(err.message)}`)
    job.updatedAt = new Date().toISOString()
  } finally {
    if (conn.current) {
      try { conn.current.close() } catch {}
      conn.current = null
    }
  }
}
