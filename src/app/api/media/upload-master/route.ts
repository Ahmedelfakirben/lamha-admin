import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import sharp from "sharp"
import { createClient } from "@supabase/supabase-js"
import { getStorageConfig, PHOTO_EXTENSIONS, VIDEO_EXTENSIONS } from "@/lib/storage-config"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )
}

function findOrCreateMasterDirectory(basePath: string, folderName: string): string {
  const candidates = [
    path.join(basePath, folderName, "03_Edicion_Master"),
    path.join(basePath, folderName, "03_Édition_Master"),
  ]

  for (const c of candidates) {
    if (fs.existsSync(c)) return c
  }

  const standard = path.join(basePath, folderName, "03_Edicion_Master")
  fs.mkdirSync(standard, { recursive: true })
  return standard
}

export const maxDuration = 180
export const dynamic = "force-dynamic"

/**
 * POST /api/media/upload-master
 * Sube archivos directamente a 03_Edicion_Master, genera WebP y los registra en Supabase
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const sessionId = formData.get("sessionId") as string
    const folderName = formData.get("folderName") as string
    const files = formData.getAll("files") as File[]

    if (!sessionId || !folderName || !files || files.length === 0) {
      return NextResponse.json({ error: "Faltan parámetros obligatorios o no se enviaron archivos." }, { status: 400 })
    }

    const storage = getStorageConfig()
    const masterDir = findOrCreateMasterDirectory(storage.localBasePath, folderName)

    const supabase = getSupabase()
    const uploadedAssets: any[] = []

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const targetFilePath = path.join(masterDir, file.name)
      
      // 1. Guardar físicamente en 03_Edicion_Master
      fs.writeFileSync(targetFilePath, buffer)

      const ext = path.extname(file.name).toLowerCase()
      const isPhoto = PHOTO_EXTENSIONS.has(ext)
      const isVideo = VIDEO_EXTENSIONS.has(ext)
      const cleanBaseName = path.parse(file.name).name.replace(/[^a-zA-Z0-9_-]/g, "_")
      const sizeMb = Number((buffer.length / (1024 * 1024)).toFixed(2))

      let previewUrl: string | null = null

      // 2. Si es foto, generar WebP y subir a Supabase Storage
      if (isPhoto) {
        try {
          const webpBuffer = await sharp(buffer, { failOn: "none" })
            .rotate()
            .resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true })
            .webp({ quality: 82, effort: 3 })
            .toBuffer()

          const storagePath = `${sessionId}/master_${cleanBaseName}_${Date.now()}.webp`
          const { error: uploadError } = await supabase.storage
            .from("session-previews")
            .upload(storagePath, webpBuffer, {
              contentType: "image/webp",
              cacheControl: "31536000",
              upsert: true
            })

          if (!uploadError) {
            const { data } = supabase.storage.from("session-previews").getPublicUrl(storagePath)
            previewUrl = data.publicUrl
          }
        } catch (e: any) {
          console.warn(`[Upload Master WebP Error]:`, e.message)
          previewUrl = `/api/media/preview?file=${encodeURIComponent(targetFilePath)}`
        }
      } else if (isVideo) {
        previewUrl = `/api/media/preview?file=${encodeURIComponent(targetFilePath)}`
      }

      const relativeNasPath = `${folderName}/03_Edicion_Master/${file.name}`
      const assetType = isVideo ? "video_final" : "jpg"

      // 3. Registrar en Supabase media_assets
      const { data: asset, error: insertError } = await supabase
        .from("media_assets")
        .insert({
          session_id: sessionId,
          filename: file.name,
          nas_path: relativeNasPath,
          asset_type: assetType,
          size_mb: sizeMb,
          preview_url: previewUrl,
          notes: "03_Édition_Master",
          is_shared: false,
          is_archived: false
        })
        .select()
        .single()

      if (!insertError && asset) {
        uploadedAssets.push(asset)
      }
    }

    return NextResponse.json({
      success: true,
      message: `${uploadedAssets.length} archivos subidos y guardados en 03_Edicion_Master.`,
      assets: uploadedAssets
    })

  } catch (error: any) {
    console.error("[Upload Master Error]:", error)
    return NextResponse.json({ error: error.message || "Error al subir archivos a Édition Master" }, { status: 500 })
  }
}
