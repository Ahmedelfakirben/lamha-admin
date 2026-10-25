import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { spawn } from "child_process"
import { pipeline } from "stream/promises"
import { 
  getStorageConfig, 
  generateProjectFolderName, 
  ensureProjectFolderStructure, 
  createProjectFoldersOnStorage,
  classifyMediaFile,
  PHOTO_EXTENSIONS,
  VIDEO_EXTENSIONS,
  NAS_FTP_CONFIG
} from "@/lib/storage-config"
import { createClient } from "@supabase/supabase-js"
import {
  isIngestRunning,
  startIngestJob,
  ingestLog,
  ingestSetMeta,
  ingestBeginCopy,
  ingestSetCurrentFile,
  ingestAddBytes,
  ingestFileDone,
  ingestSetPhase,
  ingestComplete,
  ingestFail
} from "@/lib/ingest-job"

// Tamaño de bloque de copia. Bloques grandes = lectura secuencial eficiente en la SD
// y menos llamadas al sistema. Además permite medir el avance DENTRO de cada archivo.
const COPY_CHUNK_BYTES = 4 * 1024 * 1024

// Inicializar cliente Supabase con la anon key (la service role tiene el reloj adelantado y falla)
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )
}

/**
 * GET: Escanear unidades de origen (SD card DCIM, etc.) o verificar ruta
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const checkPath = searchParams.get("path")
    const storageConfig = getStorageConfig()

    // 1. Si se solicita verificar una ruta concreta
    if (checkPath) {
      const normalized = path.normalize(checkPath)
      if (!fs.existsSync(normalized)) {
        return NextResponse.json({
          exists: false,
          path: normalized,
          error: "La ruta especificada no existe."
        })
      }

      const files = fs.readdirSync(normalized, { withFileTypes: true })
      let photoCount = 0
      let videoCount = 0
      let otherCount = 0
      let totalBytes = 0

      for (const file of files) {
        if (file.isFile()) {
          const ext = path.extname(file.name).toLowerCase()
          if (PHOTO_EXTENSIONS.has(ext)) photoCount++
          else if (VIDEO_EXTENSIONS.has(ext)) videoCount++
          else otherCount++

          try {
            const stat = fs.statSync(path.join(normalized, file.name))
            totalBytes += stat.size
          } catch {}
        }
      }

      return NextResponse.json({
        exists: true,
        path: normalized,
        photoCount,
        videoCount,
        otherCount,
        totalFiles: photoCount + videoCount + otherCount,
        totalSizeMB: Number((totalBytes / (1024 * 1024)).toFixed(1)),
        totalSizeBytes: totalBytes,
        storageConfig
      })
    }

    // 2. Escaneo automático de unidades comunes (Windows: D:\, E:\, F:\, G:\, Mac: /Volumes)
    const detectedSources: Array<{ path: string; label: string; fileCount: number }> = []

    if (process.platform === "win32") {
      const driveLetters = ["D", "E", "F", "G", "H", "I"]
      for (const letter of driveLetters) {
        const dcimPath = `${letter}:\\DCIM`
        const rootPath = `${letter}:\\`
        
        if (fs.existsSync(dcimPath)) {
          try {
            const files = fs.readdirSync(dcimPath)
            detectedSources.push({
              path: dcimPath,
              label: `Tarjeta SD (Unidad ${letter}:\\DCIM)`,
              fileCount: files.length
            })
          } catch {}
        } else if (fs.existsSync(rootPath)) {
          try {
            const files = fs.readdirSync(rootPath)
            detectedSources.push({
              path: rootPath,
              label: `Unidad Extraíble (${letter}:\\)`,
              fileCount: files.length
            })
          } catch {}
        }
      }
    } else if (process.platform === "darwin") {
      const volumesDir = "/Volumes"
      if (fs.existsSync(volumesDir)) {
        try {
          const volumes = fs.readdirSync(volumesDir)
          for (const vol of volumes) {
            if (vol !== "Macintosh HD") {
              const volPath = path.join(volumesDir, vol)
              const dcim = path.join(volPath, "DCIM")
              const target = fs.existsSync(dcim) ? dcim : volPath
              detectedSources.push({
                path: target,
                label: `Volumen Mac: ${vol}`,
                fileCount: 0
              })
            }
          }
        } catch {}
      }
    }

    return NextResponse.json({
      detectedSources,
      storageConfig
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST: Lanza el proceso de ingesta asistida EN SEGUNDO PLANO.
 *
 * Responde al instante ({ started: true }); la copia sigue ejecutándose desacoplada
 * de la petición HTTP (sin riesgo de timeouts con 10+ GB). El frontend consulta
 * el avance en GET /api/ingest/progress.
 */
export async function POST(req: NextRequest) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: "Cuerpo de la petición inválido" }, { status: 400 })
  }

  const { sourcePath } = body
  if (!sourcePath || !fs.existsSync(sourcePath)) {
    return NextResponse.json({ success: false, error: "Ruta de origen inválida" }, { status: 400 })
  }

  if (isIngestRunning()) {
    return NextResponse.json(
      { success: false, alreadyRunning: true, error: "Ya hay una ingesta en curso." },
      { status: 409 }
    )
  }

  startIngestJob()
  runIngestJob(body).catch(async (err) => {
    console.error("[Ingest] Error crítico:", err)
    await ingestFail(`Error general en el proceso de ingesta: ${err?.message || err}`)
  })

  return NextResponse.json({ success: true, started: true })
}

// ============================================================================
// JOB DE INGESTA (SD -> SSD local)
// ============================================================================

interface FileToCopy {
  sourceFile: string
  name: string
  type: "photo" | "video" | "other"
  size: number
  mtime: Date
  atime: Date
}

/** Copia un archivo en bloques grandes informando de los bytes en tiempo real. */
async function copyFileWithProgress(src: string, dst: string): Promise<number> {
  let counted = 0
  const readStream = fs.createReadStream(src, { highWaterMark: COPY_CHUNK_BYTES })
  readStream.on("data", (chunk: string | Buffer) => {
    counted += chunk.length
    ingestAddBytes(chunk.length)
  })
  await pipeline(readStream, fs.createWriteStream(dst, { highWaterMark: COPY_CHUNK_BYTES }))
  return counted
}

function getIngestStrings(lang: string = "es") {
  const l = (lang === "fr" || lang === "en" || lang === "ar") ? lang : "es"
  const dict = {
    es: {
      startEngine: "Iniciando motor de ingesta de Lamha Studios...",
      sourceVerified: "Ruta de origen verificada:",
      creatingProject: "Creando nuevo proyecto:",
      forClient: "para el cliente",
      projectRegistered: "Proyecto registrado con ID:",
      assocSession: "Asociando ingesta a la sesión existente de",
      workingStorage: "Almacenamiento de trabajo (SSD destino):",
      foldersReady: "Carpetas listas en SSD: 01_RAW, 02_Seleccion_Cliente, 03_Edicion_Master, 04_Entregas_Finales",
      nasCreated: "Estructura creada en el NAS (FTP):",
      nasUnavailable: "NAS (FTP) no disponible: se continúa solo con el almacenamiento local.",
      nasError: "No se pudo crear la estructura en el NAS:",
      detectedMedia: (count: number, gb: string) => `Detectados ${count} archivos multimedia (${gb} GB) para transferir.`,
      noMedia: "No se encontraron fotos ni videos en la carpeta seleccionada.",
      prepComplete: (sec: string, count: number) => `🚀 Preparación completada en ${sec}s. Iniciando transferencia a SSD Local: ${count} archivos...`,
      copyProgress: (done: number, total: number, name: string, avg: string) => `[${done}/${total}] 📁 ${name} · media ${avg} MB/s`,
      copyCompleted: (p: number, v: number, mb: number, sec: string, avg: string) => `🎉 Copia completada: ${p} fotos, ${v} videos (${mb} MB) en ${sec}s · ${avg} MB/s de media.`,
      syncingCloud: (count: number, batches: number) => `⚡ Sincronizando ${count} registros en Supabase Cloud (${batches} lotes)...`,
      batchError: (num: number, total: number, err: string) => `❌ Error en lote Supabase ${num}/${total}: ${err}`,
      batchSuccess: (num: number, total: number, count: number) => `✅ Supabase Cloud: Lote ${num}/${total} (${count} archivos) registrado con éxito.`,
      workerLaunched: (count: number) => `🧠 Worker en segundo plano lanzado: ${count} vistas previas WebP.`,
      preparingPreviews: (count: number) => `Preparando ${count} vistas previas WebP...`
    },
    fr: {
      startEngine: "Démarrage du moteur d'ingestion de Lamha Studios...",
      sourceVerified: "Chemin source vérifié :",
      creatingProject: "Création d'un nouveau projet :",
      forClient: "pour le client",
      projectRegistered: "Projet enregistré avec l'ID :",
      assocSession: "Association de l'ingestion à la session existante de",
      workingStorage: "Stockage de travail (SSD destination) :",
      foldersReady: "Dossiers prêts sur SSD : 01_RAW, 02_Selection_Client, 03_Edition_Master, 04_Livraisons_Finales",
      nasCreated: "Structure créée sur le NAS (FTP) :",
      nasUnavailable: "NAS (FTP) indisponible : poursuite sur le stockage local uniquement.",
      nasError: "Impossible de créer la structure sur le NAS :",
      detectedMedia: (count: number, gb: string) => `Détection de ${count} fichiers multimédias (${gb} Go) à transférer.`,
      noMedia: "Aucune photo ni vidéo trouvée dans le dossier sélectionné.",
      prepComplete: (sec: string, count: number) => `🚀 Préparation terminée en ${sec}s. Début du transfert vers SSD local : ${count} fichiers...`,
      copyProgress: (done: number, total: number, name: string, avg: string) => `[${done}/${total}] 📁 ${name} · moyenne ${avg} Mo/s`,
      copyCompleted: (p: number, v: number, mb: number, sec: string, avg: string) => `🎉 Copie terminée : ${p} photos, ${v} vidéos (${mb} Mo) en ${sec}s · moyenne de ${avg} Mo/s.`,
      syncingCloud: (count: number, batches: number) => `⚡ Synchronisation de ${count} enregistrements dans Supabase Cloud (${batches} lots)...`,
      batchError: (num: number, total: number, err: string) => `❌ Erreur lot Supabase ${num}/${total} : ${err}`,
      batchSuccess: (num: number, total: number, count: number) => `✅ Supabase Cloud : Lot ${num}/${total} (${count} fichiers) enregistré avec succès.`,
      workerLaunched: (count: number) => `🧠 Worker d'arrière-plan lancé : ${count} aperçus WebP.`,
      preparingPreviews: (count: number) => `Préparation de ${count} aperçus WebP...`
    },
    en: {
      startEngine: "Starting Lamha Studios ingest engine...",
      sourceVerified: "Source path verified:",
      creatingProject: "Creating new project:",
      forClient: "for client",
      projectRegistered: "Project registered with ID:",
      assocSession: "Associating ingest with existing session of",
      workingStorage: "Working storage (Destination SSD):",
      foldersReady: "Folders ready on SSD: 01_RAW, 02_Client_Selection, 03_Master_Edits, 04_Final_Deliveries",
      nasCreated: "Structure created on NAS (FTP):",
      nasUnavailable: "NAS (FTP) unavailable: continuing with local storage only.",
      nasError: "Failed to create structure on NAS:",
      detectedMedia: (count: number, gb: string) => `Detected ${count} media files (${gb} GB) to transfer.`,
      noMedia: "No photos or videos found in selected folder.",
      prepComplete: (sec: string, count: number) => `🚀 Preparation completed in ${sec}s. Starting local SSD transfer: ${count} files...`,
      copyProgress: (done: number, total: number, name: string, avg: string) => `[${done}/${total}] 📁 ${name} · avg ${avg} MB/s`,
      copyCompleted: (p: number, v: number, mb: number, sec: string, avg: string) => `🎉 Copy completed: ${p} photos, ${v} videos (${mb} MB) in ${sec}s · avg ${avg} MB/s.`,
      syncingCloud: (count: number, batches: number) => `⚡ Syncing ${count} records to Supabase Cloud (${batches} batches)...`,
      batchError: (num: number, total: number, err: string) => `❌ Error in Supabase batch ${num}/${total}: ${err}`,
      batchSuccess: (num: number, total: number, count: number) => `✅ Supabase Cloud: Batch ${num}/${total} (${count} files) successfully registered.`,
      workerLaunched: (count: number) => `🧠 Background worker launched: ${count} WebP previews.`,
      preparingPreviews: (count: number) => `Preparing ${count} WebP previews...`
    },
    ar: {
      startEngine: "بدء تشغيل محرك الاستيراد الخاص بـ Lamha Studios...",
      sourceVerified: "تم التحقق من مسار المصدر:",
      creatingProject: "إنشاء مشروع جديد:",
      forClient: "للعميل",
      projectRegistered: "تم تسجيل المشروع بالمعرف:",
      assocSession: "ربط عملية الاستيراد بالجلسة الحالية لـ",
      workingStorage: "مساحة التخزين المستهدفة (SSD الوجهة):",
      foldersReady: "المجلدات جاهزة على SSD: 01_RAW، 02_اختيارات_العميل، 03_المونتاج، 04_التسليم_النهائي",
      nasCreated: "تم إنشاء الهيكل على NAS (FTP):",
      nasUnavailable: "وحدة NAS (FTP) غير متاحة: الاستمرار على التخزين المحلي فقط.",
      nasError: "فشل إنشاء الهيكل على وحدة NAS:",
      detectedMedia: (count: number, gb: string) => `تم العثور على ${count} ملف وسائط (${gb} جيجابايت) للنقل.`,
      noMedia: "لم يتم العثور على صور أو مقاطع فيديو في المجلد المحدد.",
      prepComplete: (sec: string, count: number) => `🚀 اكتمل الإعداد في ${sec} ثانية. بدء النقل إلى قرص SSD المحلي: ${count} ملف...`,
      copyProgress: (done: number, total: number, name: string, avg: string) => `[${done}/${total}] 📁 ${name} · متوسط السرعة ${avg} ميجابايت/ث`,
      copyCompleted: (p: number, v: number, mb: number, sec: string, avg: string) => `🎉 اكتمل النسخ بنجاح: ${p} صور، ${v} فيديو (${mb} ميجابايت) في ${sec} ثانية · متوسط السرعة ${avg} ميجابايت/ث.`,
      syncingCloud: (count: number, batches: number) => `⚡ جاري مزامنة ${count} سجلاً في سحابة Supabase (${batches} دفعة)...`,
      batchError: (num: number, total: number, err: string) => `❌ خطأ في دفعة Supabase ${num}/${total}: ${err}`,
      batchSuccess: (num: number, total: number, count: number) => `✅ سحابة Supabase: تم تسجيل الدفعة ${num}/${total} (${count} ملف) بنجاح.`,
      workerLaunched: (count: number) => `🧠 تم إطلاق المعالج في الخلفية: ${count} صورة مصغرة WebP.`,
      preparingPreviews: (count: number) => `جاري تجهيز ${count} صورة مصغرة WebP...`
    }
  }
  return dict[l]
}

async function runIngestJob(body: any) {
  const jobStart = Date.now()
  const { 
    sourcePath, 
    targetBasePath,
    mode = "existing", // "existing" | "new"
    sessionId,
    projectName,
    clientName,
    clientPhone,
    sessionType = "photo",
    category = "wedding",
    sessionDate,
    selectedFiles,
    lang = "es"
  } = body

  const i18n = getIngestStrings(lang)

  ingestLog("info", i18n.startEngine)
  ingestLog("info", `${i18n.sourceVerified} ${sourcePath}`)

  // 1. Resolver o Crear la Sesión en Supabase
  const supabase = getSupabase()
  let activeSessionId = sessionId
  let finalClientName = clientName || "Cliente"
  let finalProjectName = projectName || "Sesion"
  let finalSessionDate = sessionDate || new Date().toISOString().split("T")[0]

  if (mode === "new" || !activeSessionId) {
    ingestLog("info", `${i18n.creatingProject} "${finalProjectName}" ${i18n.forClient} "${finalClientName}"...`)

    // Generar PIN aleatorio de 4 dígitos para el cliente
    const portalPin = Math.floor(1000 + Math.random() * 9000).toString()

    const { data: newSession, error: createError } = await supabase
      .from("sessions")
      .insert({
        client_name: finalClientName,
        client_phone: clientPhone || null,
        session_type: sessionType,
        category: category,
        session_date: finalSessionDate,
        status: "pending",
        portal_pin: portalPin,
        tags: [finalProjectName],
        comments: `Proyecto: ${finalProjectName}. Ingesta automática.`
      })
      .select()
      .single()

    if (createError || !newSession) {
      await ingestFail(`Error al registrar la sesión en Supabase: ${createError?.message}`)
      return
    }

    activeSessionId = newSession.id
    ingestLog("success", `Proyecto registrado con ID: ${activeSessionId} (PIN asignado: ${portalPin})`)
  } else {
    // Obtener datos de la sesión existente
    const { data: existingSession, error: getError } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", activeSessionId)
      .single()

    if (getError || !existingSession) {
      await ingestFail(`No se encontró la sesión existente: ${getError?.message}`)
      return
    }

    finalClientName = existingSession.client_name
    finalSessionDate = existingSession.session_date
    finalProjectName = (existingSession.tags && existingSession.tags[0]) || existingSession.category || "Sesion"
    ingestLog("info", `${i18n.assocSession} "${finalClientName}"`)
  }

  // 2. Estructura de carpetas: SSD local/externo de trabajo, NAS (FTP) en paralelo
  const storage = getStorageConfig()
  const effectiveBasePath = targetBasePath && typeof targetBasePath === "string" && targetBasePath.trim()
    ? targetBasePath.trim()
    : storage.localBasePath

  if (!fs.existsSync(effectiveBasePath)) {
    try {
      fs.mkdirSync(effectiveBasePath, { recursive: true })
    } catch (e: any) {
      ingestLog("warn", `Fallback: ${storage.localBasePath}`)
    }
  }

  ingestLog("info", `${i18n.workingStorage} ${effectiveBasePath}`)

  const folderName = generateProjectFolderName(finalSessionDate, finalClientName, finalProjectName)
  const projectRootPath = path.join(effectiveBasePath, folderName)

  const { rawPhotosDir, rawVideosDir } = ensureProjectFolderStructure(projectRootPath)
  ingestLog("success", i18n.foldersReady)
  ingestSetMeta({ sessionId: activeSessionId, projectRootPath, folderName })

  // El FTP al NAS (conexión + 6 ensureDir) puede tardar muchos segundos si el NAS responde lento.
  // No es necesario para copiar al SSD, así que va en paralelo y solo informamos de su resultado.
  const nasFoldersPromise = createProjectFoldersOnStorage(folderName)
    .then((res) => {
      if (res.createdOnNas) {
        ingestLog("success", `${i18n.nasCreated} /usb1_1/Lamha-Storage/${folderName}`)
      } else {
        ingestLog("warn", i18n.nasUnavailable)
      }
    })
    .catch((err) => ingestLog("warn", `${i18n.nasError} ${err?.message || err}`))

  // 3. Leer archivos, ordenar y renombrar (Semántico + Gemelos)
  const sourceEntries = fs.readdirSync(sourcePath, { withFileTypes: true })

  // Filtrar válidos y ordenar alfabéticamente (orden cronológico de cámara)
  const validEntries = sourceEntries
    .filter(e => e.isFile() && !e.name.startsWith("."))
    .filter(e => {
      if (Array.isArray(selectedFiles) && selectedFiles.length > 0) {
        return selectedFiles.includes(e.name)
      }
      return true
    })
    .filter(e => {
      const type = classifyMediaFile(e.name)
      return type === "photo" || type === "video"
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  const filesToCopy: FileToCopy[] = []
  
  let sequenceCounter = 0
  let lastBaseName = ""
  let bytesTotal = 0

  // Limpiar nombres para que sean seguros en URLs y rutas
  const safeProject = (finalProjectName || "Proyecto").replace(/[^a-zA-Z0-9]/g, "")
  const safeClient = (finalClientName || "Cliente").replace(/[^a-zA-Z0-9]/g, "")
  const dateStr = finalSessionDate.replace(/-/g, "") // ej: 20261004

  for (const entry of validEntries) {
    const ext = path.extname(entry.name)
    const baseName = path.parse(entry.name).name
    
    // Detección de Gemelos: Si el nombre base cambia, es una foto nueva = incrementamos secuencia.
    // Si es el mismo baseName (ej. DSC_001.NEF y DSC_001.JPG), sequenceCounter NO se incrementa.
    if (baseName !== lastBaseName) {
      sequenceCounter++
      lastBaseName = baseName
    }

    const seqStr = String(sequenceCounter).padStart(3, '0')
    const semanticName = `${seqStr}-${safeProject}-${dateStr}-${safeClient}${ext}`
    const sourceFile = path.join(sourcePath, entry.name)

    try {
      const st = await fs.promises.stat(sourceFile)
      filesToCopy.push({
        sourceFile,
        name: semanticName,
        type: classifyMediaFile(entry.name),
        size: st.size,
        mtime: st.mtime,
        atime: st.atime
      })
      bytesTotal += st.size
    } catch (e: any) {
      ingestLog("warn", `${entry.name}: ${e.message}`)
    }
  }

  ingestLog("info", i18n.detectedMedia(filesToCopy.length, (bytesTotal / (1024 * 1024 * 1024)).toFixed(2)))

  if (filesToCopy.length === 0) {
    ingestLog("warn", i18n.noMedia)
    await ingestComplete(
      { totalFiles: 0, copiedPhotos: 0, copiedVideos: 0, totalMB: 0, elapsedSec: 0, avgMBps: 0 },
      0
    )
    return
  }

  // 4. Copiado SD -> SSD local
  let copiedPhotos = 0
  let copiedVideos = 0
  let totalBytesCopied = 0
  const assetsToInsert: any[] = []

  ingestBeginCopy(filesToCopy.length, bytesTotal)
  const prepSec = ((Date.now() - jobStart) / 1000).toFixed(1)
  ingestLog("info", i18n.prepComplete(prepSec, filesToCopy.length))

  const copyStart = Date.now()
  let completedFiles = 0

  // La lectura desde la SD es SECUENCIAL (1 archivo a la vez): leer varios RAW a la vez
  // satura el controlador de la tarjeta (random read) y la velocidad cae en picado.
  for (const item of filesToCopy) {
    const isPhoto = item.type === "photo"
    const targetDir = isPhoto ? rawPhotosDir : rawVideosDir
    const destinationFilePath = path.join(targetDir, item.name)

    ingestSetCurrentFile(item.name)
    let counted = 0

    try {
      counted = await copyFileWithProgress(item.sourceFile, destinationFilePath)
      // Conservar la fecha original de captura/modificación
      await fs.promises.utimes(destinationFilePath, item.atime, item.mtime).catch(() => {})

      totalBytesCopied += item.size
      const sizeMB = Number((item.size / (1024 * 1024)).toFixed(2))

      if (isPhoto) copiedPhotos++
      else copiedVideos++

      const ext = path.extname(item.name).toLowerCase()
      const assetType = isPhoto ? (ext === ".jpg" || ext === ".jpeg" ? "jpg" : "raw_photo") : "raw_video"
      const relativeNasPath = `${folderName}/01_RAW/${isPhoto ? "Fotos" : "Videos"}/${item.name}`

      assetsToInsert.push({
        session_id: activeSessionId,
        asset_type: assetType,
        filename: item.name,
        nas_path: relativeNasPath,
        size_mb: sizeMB,
        preview_url: `/api/media/preview?file=${encodeURIComponent(destinationFilePath)}`,
        is_archived: false,
        notes: `SSD: ${destinationFilePath}`,
        _physicalPath: destinationFilePath
      })
    } catch (copyErr: any) {
      // Descontar lo que faltaba de este archivo para que el % total siga siendo coherente
      ingestAddBytes(Math.max(0, item.size - counted))
      await fs.promises.unlink(destinationFilePath).catch(() => {})
      ingestLog("warn", `⚠️ ${item.name}: ${copyErr.message}`)
    }

    completedFiles++
    ingestFileDone()

    // Un log cada 10 archivos para no saturar la consola de la UI
    if (completedFiles % 10 === 0 || completedFiles === filesToCopy.length) {
      const elapsed = Math.max(0.001, (Date.now() - copyStart) / 1000)
      const avg = totalBytesCopied / (1024 * 1024) / elapsed
      ingestLog("success", i18n.copyProgress(completedFiles, filesToCopy.length, item.name, avg.toFixed(1)))
    }
  }

  const copySec = Math.max(0.001, (Date.now() - copyStart) / 1000)
  const totalMB = Number((totalBytesCopied / (1024 * 1024)).toFixed(1))
  const avgMBps = Number((totalBytesCopied / (1024 * 1024) / copySec).toFixed(1))
  ingestLog("success", i18n.copyCompleted(copiedPhotos, copiedVideos, totalMB, copySec.toFixed(0), avgMBps.toFixed(1)))

  // 5. Registrar en Supabase en lote (Batch Insert)
  ingestSetPhase("syncing")
  const allInsertedAssets: Array<{ id: string; filename: string }> = []
  if (assetsToInsert.length > 0) {
    const batchSize = 100
    const totalBatches = Math.ceil(assetsToInsert.length / batchSize)
    ingestLog("info", i18n.syncingCloud(assetsToInsert.length, totalBatches))

    for (let i = 0; i < assetsToInsert.length; i += batchSize) {
      const batchNum = Math.floor(i / batchSize) + 1
      const chunk = assetsToInsert.slice(i, i + batchSize)
      const cleanChunk = chunk.map(({ _physicalPath, ...dbRecord }: any) => dbRecord)
      
      const { data: insertedChunk, error: batchError } = await supabase
        .from("media_assets")
        .insert(cleanChunk)
        .select("id, filename")

      if (batchError) {
        ingestLog("error", i18n.batchError(batchNum, totalBatches, batchError.message))
      } else if (insertedChunk) {
        ingestLog("success", i18n.batchSuccess(batchNum, totalBatches, chunk.length))
        allInsertedAssets.push(...insertedChunk)
      }
    }
  }

  // 6. Lanzar el worker de previsualizaciones (proceso independiente, no bloqueante)
  const localPathByName = new Map<string, { localPath: string; isJpg: boolean; isPhoto: boolean }>()
  for (const a of assetsToInsert) {
    localPathByName.set(a.filename, {
      localPath: (a as any)._physicalPath || a.nas_path,
      isJpg: a.asset_type === "jpg",
      isPhoto: a.asset_type !== "raw_video"
    })
  }

  const workerAssets = allInsertedAssets
    .map(a => ({ id: a.id, filename: a.filename, ...localPathByName.get(a.filename) }))
    .filter(a => a.isPhoto && a.localPath)
    .map(a => ({ id: a.id, filename: a.filename, localPath: a.localPath!, isJpg: !!a.isJpg }))

  if (workerAssets.length > 0) {
    try {
      launchPreviewWorker(activeSessionId, workerAssets)
      ingestLog("info", i18n.workerLaunched(workerAssets.length))
    } catch (e: any) {
      ingestLog("warn", `${e.message}`)
    }
  }

  // 7. FASE 4: Copia de seguridad idéntica al NAS (FTP)
  try {
    await nasFoldersPromise
  } catch {}

  const nasLangDict: Record<string, { start: string; progress: (done: number, total: number, name: string) => string; done: (total: number) => string; fail: (err: string) => string }> = {
    es: {
      start: `📡 Iniciando copia de seguridad idéntica al NAS (FTP: ${NAS_FTP_CONFIG.host})...`,
      progress: (done, total, name) => `[NAS ${done}/${total}] 📤 ${name}`,
      done: (total) => `✅ Respaldo NAS completado con éxito: ${total} archivos sincronizados.`,
      fail: (err) => `⚠️ NAS no disponible (${err}). Los archivos quedan asegurados en el SSD local.`
    },
    fr: {
      start: `📡 Démarrage de la sauvegarde identique sur le NAS (FTP: ${NAS_FTP_CONFIG.host})...`,
      progress: (done, total, name) => `[NAS ${done}/${total}] 📤 ${name}`,
      done: (total) => `✅ Sauvegarde NAS terminée avec succès : ${total} fichiers synchronisés.`,
      fail: (err) => `⚠️ NAS indisponible (${err}). Les fichiers restent sécurisés sur le SSD local.`
    },
    en: {
      start: `📡 Starting identical backup copy to NAS (FTP: ${NAS_FTP_CONFIG.host})...`,
      progress: (done, total, name) => `[NAS ${done}/${total}] 📤 ${name}`,
      done: (total) => `✅ NAS backup successfully completed: ${total} files synced.`,
      fail: (err) => `⚠️ NAS unavailable (${err}). Files remain safely stored on local SSD.`
    },
    ar: {
      start: `📡 بدء النسخ الاحتياطي المتطابق إلى وحدة NAS (FTP: ${NAS_FTP_CONFIG.host})...`,
      progress: (done, total, name) => `[NAS ${done}/${total}] 📤 ${name}`,
      done: (total) => `✅ اكتمل النسخ الاحتياطي على NAS بنجاح: تمت مزامنة ${total} ملفًا.`,
      fail: (err) => `⚠️ وحدة NAS غير متاحة (${err}). الملفات مؤمنة على قرص SSD المحلي.`
    }
  }
  const nMsg = nasLangDict[lang] || nasLangDict["es"]

  if (filesToCopy.length > 0 && NAS_FTP_CONFIG.password) {
    ingestSetPhase("nas_sync")
    ingestLog("info", nMsg.start)
    try {
      const ftp = await import("basic-ftp")
      const client = new ftp.Client(90000)
      client.ftp.verbose = false
      await client.access({
        host: NAS_FTP_CONFIG.host,
        user: NAS_FTP_CONFIG.user,
        password: NAS_FTP_CONFIG.password,
        port: 21,
      })

      const ensuredDirs = new Set<string>()
      let nasDone = 0

      for (const item of filesToCopy) {
        const isPhoto = item.type === "photo"
        const sub = isPhoto ? "Fotos" : "Videos"
        const targetDir = isPhoto ? rawPhotosDir : rawVideosDir
        const localFilePath = path.join(targetDir, item.name)
        const remoteDir = `${NAS_FTP_CONFIG.baseDir}/${folderName}/01_RAW/${sub}`
        const remoteFilePath = `${remoteDir}/${item.name}`

        try {
          if (!ensuredDirs.has(remoteDir)) {
            await client.ensureDir(remoteDir)
            ensuredDirs.add(remoteDir)
          }

          let sameSize = false
          try {
            const rSize = await client.size(remoteFilePath)
            if (rSize === item.size) sameSize = true
          } catch {}

          if (!sameSize && fs.existsSync(localFilePath)) {
            await client.uploadFrom(localFilePath, remoteFilePath)
          }
          nasDone++
          if (nasDone % 10 === 0 || nasDone === filesToCopy.length) {
            ingestLog("info", nMsg.progress(nasDone, filesToCopy.length, item.name))
          }
        } catch {
          // Si un archivo falla o socket cae, intentar reconectar
          try {
            await client.access({
              host: NAS_FTP_CONFIG.host,
              user: NAS_FTP_CONFIG.user,
              password: NAS_FTP_CONFIG.password,
              port: 21,
            })
          } catch {}
        }
      }
      ingestLog("success", nMsg.done(nasDone))
      try { client.close() } catch {}
    } catch (nasErr: any) {
      ingestLog("warn", nMsg.fail(nasErr.message || String(nasErr)))
    }
  }

  await ingestComplete(
    {
      totalFiles: filesToCopy.length,
      copiedPhotos,
      copiedVideos,
      totalMB,
      elapsedSec: Math.round((Date.now() - jobStart) / 1000),
      avgMBps
    },
    assetsToInsert.length
  )
}

// ============================================================================
// LANZADOR DEL WORKER (proceso Node independiente y desacoplado)
// ============================================================================
function launchPreviewWorker(
  sessionId: string,
  assets: Array<{ id: string; filename: string; localPath: string; isJpg: boolean }>
) {
  const cwd = /*turbopackIgnore: true*/ process.cwd()
  const progressFile = path.join(cwd, ".worker-progress.json")
  const jobFile = path.join(cwd, `.worker-job-${Date.now()}.json`)
  const script = path.join(cwd, "scripts", "preview-worker.mjs")

  if (!fs.existsSync(script)) {
    throw new Error(`No existe ${script}`)
  }

  fs.writeFileSync(jobFile, JSON.stringify({ sessionId, assets, progressFile }))

  // El widget ve la cola al instante, sin esperar al arranque de Node
  fs.writeFileSync(progressFile, JSON.stringify({
    status: "running",
    total: assets.length,
    completed: 0,
    percent: 0,
    message: `Preparando ${assets.length} vistas previas WebP...`,
    lastUpdated: new Date().toISOString()
  }))

  const child = spawn(process.execPath, [script, jobFile], {
    cwd,
    detached: true,
    stdio: "ignore",
    windowsHide: true,
    env: process.env
  })
  child.on("error", (err) => ingestLog("warn", `Error del worker: ${err.message}`))
  child.unref()
}
