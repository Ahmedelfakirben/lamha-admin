import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import sharp from "sharp"
import { createClient } from "@supabase/supabase-js"
import { getStorageConfig, PHOTO_EXTENSIONS, VIDEO_EXTENSIONS, NAS_FTP_CONFIG } from "@/lib/storage-config"
import ftp from "basic-ftp"

export const maxDuration = 180
export const dynamic = "force-dynamic"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )
}

function resolveTargetDir(basePath: string, folderName: string, subfolder: string): string {
  const dir = path.join(basePath, folderName, subfolder)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

function getMasterUploadStrings(lang: string = "es") {
  const l = (lang === "fr" || lang === "en" || lang === "ar") ? lang : "es"
  const dict = {
    es: {
      localSaved: (p: string, mb: number) => `[LOCAL] Guardado en ${p} (${mb} MB)`,
      nasReplicated: (host: string, dir: string, name: string) => `[NAS] Replicado en router ZTE (${host}:${dir}/${name})`,
      nasReplicaFailed: (err: string) => `[NAS] No se pudo replicar al NAS (${err}). Guardado en local con éxito.`,
      nasDisabled: "[NAS] Réplica desactivada o diferida.",
      previewWebpSuccess: "[PREVIEW] Miniatura WebP generada y subida a Supabase Storage",
      previewWebpFallback: (err: string) => `[PREVIEW] No se pudo generar WebP (${err}). Usando fallback local.`,
      videoLinked: "[VIDEO] Vista previa vinculada al archivo de video",
      dbUpdated: "[DB] Actualizado registro existente en Supabase",
      dbInserted: "[DB] Registrado nuevo activo en Supabase",
    },
    fr: {
      localSaved: (p: string, mb: number) => `[LOCAL] Enregistré dans ${p} (${mb} Mo)`,
      nasReplicated: (host: string, dir: string, name: string) => `[NAS] Répliqué sur le routeur ZTE (${host}:${dir}/${name})`,
      nasReplicaFailed: (err: string) => `[NAS] Échec de la réplication NAS (${err}). Enregistré en local avec succès.`,
      nasDisabled: "[NAS] Réplication désactivée ou différée.",
      previewWebpSuccess: "[PREVIEW] Miniature WebP générée et téléversée sur Supabase Storage",
      previewWebpFallback: (err: string) => `[PREVIEW] Impossible de générer le WebP (${err}). Utilisation du fallback local.`,
      videoLinked: "[VIDEO] Aperçu lié au fichier vidéo",
      dbUpdated: "[DB] Enregistrement existant mis à jour dans Supabase",
      dbInserted: "[DB] Nouvel actif multimédia enregistré dans Supabase",
    },
    en: {
      localSaved: (p: string, mb: number) => `[LOCAL] Saved to ${p} (${mb} MB)`,
      nasReplicated: (host: string, dir: string, name: string) => `[NAS] Replicated to ZTE router (${host}:${dir}/${name})`,
      nasReplicaFailed: (err: string) => `[NAS] Could not replicate to NAS (${err}). Saved locally successfully.`,
      nasDisabled: "[NAS] Replica disabled or deferred.",
      previewWebpSuccess: "[PREVIEW] WebP thumbnail generated and uploaded to Supabase Storage",
      previewWebpFallback: (err: string) => `[PREVIEW] Could not generate WebP (${err}). Using local fallback.`,
      videoLinked: "[VIDEO] Preview linked to video file",
      dbUpdated: "[DB] Updated existing record in Supabase",
      dbInserted: "[DB] New media asset recorded in Supabase",
    },
    ar: {
      localSaved: (p: string, mb: number) => `[محلي] تم الحفظ في ${p} (${mb} ميغابايت)`,
      nasReplicated: (host: string, dir: string, name: string) => `[NAS] تم النسخ المتطابق على ZTE (${host}:${dir}/${name})`,
      nasReplicaFailed: (err: string) => `[NAS] تعذر النسخ المتطابق إلى NAS (${err}). تم الحفظ محلياً بنجاح.`,
      nasDisabled: "[NAS] تم تعطيل النسخ المتطابق أو تأجيله.",
      previewWebpSuccess: "[معاينة] تم إنشاء صورة WebP مصغرة ورفعها إلى Supabase Storage",
      previewWebpFallback: (err: string) => `[معاينة] تعذر إنشاء WebP (${err}). استخدام المعاينة المحلية.`,
      videoLinked: "[فيديو] تم ربط المعاينة بملف الفيديو",
      dbUpdated: "[قاعدة البيانات] تم تحديث السجل الحالي في Supabase",
      dbInserted: "[قاعدة البيانات] تم تسجيل أصل وسائط جديد في Supabase",
    }
  }
  return dict[l]
}

export async function POST(req: NextRequest) {
  const logs: Array<{ time: string; level: "info" | "success" | "warn" | "error"; msg: string }> = []
  const addLog = (level: "info" | "success" | "warn" | "error", msg: string) => {
    const time = new Date().toLocaleTimeString()
    logs.push({ time, level, msg })
  }

  try {
    const formData = await req.formData()
    const sessionId = formData.get("sessionId") as string
    const folderName = formData.get("folderName") as string
    const targetSubfolder = (formData.get("targetSubfolder") as string) || "03_Edicion_Master"
    const replicateNas = formData.get("replicateNas") === "true"
    const file = formData.get("file") as File | null
    const lang = (formData.get("lang") as string) || "es"
    const tLogs = getMasterUploadStrings(lang)

    if (!sessionId || !folderName || folderName === "undefined" || !file) {
      return NextResponse.json({ error: "Faltan parámetros sessionId, folderName válido o archivo." }, { status: 400 })
    }

    const storage = getStorageConfig()
    const localDir = resolveTargetDir(storage.localBasePath, folderName, targetSubfolder)
    const localFilePath = path.join(localDir, file.name)

    const buffer = Buffer.from(await file.arrayBuffer())
    const sizeMb = Number((buffer.length / (1024 * 1024)).toFixed(2))

    // 1. Guardar físicamente en SSD / Disco Local
    fs.writeFileSync(localFilePath, buffer)
    addLog("success", tLogs.localSaved(localFilePath, sizeMb))

    let nasReplicated = false
    let nasError: string | null = null

    // 2. Replicar al NAS FTP en caliente si está habilitado
    if (replicateNas) {
      const client = new ftp.Client(90000)
      client.ftp.verbose = false
      try {
        await client.access({
          host: NAS_FTP_CONFIG.host,
          user: NAS_FTP_CONFIG.user,
          password: NAS_FTP_CONFIG.password,
          port: 21,
        })
        const nasTargetDir = `${NAS_FTP_CONFIG.baseDir}/${folderName}/${targetSubfolder}`
        await client.ensureDir(nasTargetDir)
        await client.uploadFrom(localFilePath, `${nasTargetDir}/${file.name}`)
        client.close()
        nasReplicated = true
        addLog("success", tLogs.nasReplicated(NAS_FTP_CONFIG.host, nasTargetDir, file.name))
      } catch (err: any) {
        try { client.close() } catch {}
        nasError = err.message || "Error al conectar al NAS"
        addLog("warn", tLogs.nasReplicaFailed(nasError || ""))
      }
    } else {
      addLog("info", tLogs.nasDisabled)
    }

    // 3. Generar vista previa WebP para la galería del estudio si es imagen
    const ext = path.extname(file.name).toLowerCase()
    const isPhoto = PHOTO_EXTENSIONS.has(ext)
    const isVideo = VIDEO_EXTENSIONS.has(ext)
    const cleanBaseName = path.parse(file.name).name.replace(/[^a-zA-Z0-9_-]/g, "_")
    let previewUrl: string | null = null

    const supabase = getSupabase()

    if (isPhoto) {
      try {
        const webpBuffer = await sharp(buffer, { failOn: "none" })
          .rotate()
          .resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true })
          .webp({ quality: 82, effort: 3 })
          .toBuffer()

        const storagePath = `${sessionId}/${targetSubfolder}_${cleanBaseName}_${Date.now()}.webp`
        const { error: uploadErr } = await supabase.storage
          .from("session-previews")
          .upload(storagePath, webpBuffer, {
            contentType: "image/webp",
            cacheControl: "31536000",
            upsert: true
          })

        if (!uploadErr) {
          const { data } = supabase.storage.from("session-previews").getPublicUrl(storagePath)
          previewUrl = data.publicUrl
          addLog("success", tLogs.previewWebpSuccess)
        }
      } catch (e: any) {
        addLog("warn", tLogs.previewWebpFallback(e.message))
        previewUrl = `/api/media/preview?file=${encodeURIComponent(localFilePath)}`
      }
    } else if (isVideo) {
      previewUrl = `/api/media/preview?file=${encodeURIComponent(localFilePath)}`
      addLog("info", tLogs.videoLinked)
    }

    // 4. Registrar en base de datos Supabase media_assets
    const relativeNasPath = `${folderName}/${targetSubfolder}/${file.name}`
    const assetType = isVideo ? "video_final" : "jpg"

    const { data: existingAsset } = await supabase
      .from("media_assets")
      .select("id")
      .eq("session_id", sessionId)
      .eq("filename", file.name)
      .maybeSingle()

    let assetId: string | null = null

    if (existingAsset) {
      const { data: updated } = await supabase
        .from("media_assets")
        .update({
          nas_path: relativeNasPath,
          preview_url: previewUrl,
          size_mb: sizeMb,
          notes: targetSubfolder,
          asset_type: assetType,
        })
        .eq("id", existingAsset.id)
        .select("id")
        .single()
      assetId = updated?.id || existingAsset.id
      addLog("info", tLogs.dbUpdated)
    } else {
      const { data: inserted } = await supabase
        .from("media_assets")
        .insert({
          session_id: sessionId,
          filename: file.name,
          nas_path: relativeNasPath,
          asset_type: assetType,
          size_mb: sizeMb,
          preview_url: previewUrl,
          notes: targetSubfolder,
          is_shared: false,
          is_archived: false,
        })
        .select("id")
        .single()
      assetId = inserted?.id || null
      addLog("info", tLogs.dbInserted)
    }

    return NextResponse.json({
      success: true,
      fileName: file.name,
      sizeMb,
      localFilePath,
      nasReplicated,
      nasError,
      previewUrl,
      assetId,
      logs,
    })
  } catch (error: any) {
    addLog("error", `[ERROR] ${error.message || "Fallo inesperado al procesar el archivo"}`)
    return NextResponse.json({
      success: false,
      error: error.message || "Error al procesar el archivo",
      logs,
    }, { status: 500 })
  }
}
