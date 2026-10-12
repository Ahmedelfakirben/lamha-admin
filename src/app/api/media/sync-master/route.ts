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

function findMasterDirectory(basePath: string, folderName: string): string | null {
  const candidates = [
    path.join(basePath, folderName, "03_Edicion_Master"),
    path.join(basePath, folderName, "03_Édition_Master"),
    path.join(basePath, folderName, "03_Edition_Master"),
    path.join(basePath, folderName, "03_Master"),
  ]

  for (const c of candidates) {
    if (fs.existsSync(c)) return c
  }

  // Si no existe, crear la carpeta estándar
  const standard = path.join(basePath, folderName, "03_Edicion_Master")
  try {
    fs.mkdirSync(standard, { recursive: true })
    return standard
  } catch {
    return null
  }
}

/**
 * GET /api/media/sync-master?sessionId=...&folderName=...
 * Obtiene el resumen de archivos en 03_Edicion_Master
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const sessionId = searchParams.get("sessionId")
    const folderName = searchParams.get("folderName")

    if (!sessionId || !folderName) {
      return NextResponse.json({ error: "Faltan parámetros 'sessionId' y 'folderName'" }, { status: 400 })
    }

    const storage = getStorageConfig()
    const masterDir = findMasterDirectory(storage.localBasePath, folderName)

    if (!masterDir || !fs.existsSync(masterDir)) {
      return NextResponse.json({
        exists: false,
        totalDiskFiles: 0,
        photosCount: 0,
        videosCount: 0,
        syncedCount: 0,
      })
    }

    const dirents = fs.readdirSync(masterDir, { withFileTypes: true })
    const files = dirents.filter(d => d.isFile() && !d.name.startsWith("."))
    
    let photosCount = 0
    let videosCount = 0

    for (const f of files) {
      const ext = path.extname(f.name).toLowerCase()
      if (PHOTO_EXTENSIONS.has(ext)) photosCount++
      else if (VIDEO_EXTENSIONS.has(ext)) videosCount++
    }

    const supabase = getSupabase()
    const { data: dbAssets } = await supabase
      .from("media_assets")
      .select("id, filename, nas_path, preview_url, asset_type")
      .eq("session_id", sessionId)
      .or("nas_path.ilike.%03_Edicion_Master%,nas_path.ilike.%03_Édition_Master%,notes.ilike.%03_Édition_Master%")

    return NextResponse.json({
      exists: true,
      masterDir,
      totalDiskFiles: files.length,
      photosCount,
      videosCount,
      syncedCount: dbAssets?.length || 0,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/media/sync-master
 * Escanea 03_Edicion_Master, convierte fotos a WebP, sube a Supabase Storage y registra en media_assets
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sessionId, folderName } = body

    if (!sessionId || !folderName) {
      return NextResponse.json({ error: "Faltan parámetros 'sessionId' y 'folderName'" }, { status: 400 })
    }

    const storage = getStorageConfig()
    const masterDir = findMasterDirectory(storage.localBasePath, folderName)

    if (!masterDir || !fs.existsSync(masterDir)) {
      return NextResponse.json({ error: "La carpeta 03_Edicion_Master no existe en el disco." }, { status: 404 })
    }

    const dirents = fs.readdirSync(masterDir, { withFileTypes: true })
    const files = dirents.filter(d => d.isFile() && !d.name.startsWith("."))

    if (files.length === 0) {
      return NextResponse.json({
        success: true,
        message: "La carpeta 03_Edicion_Master está vacía.",
        processedCount: 0,
        assets: []
      })
    }

    const supabase = getSupabase()

    // Obtener los que ya están registrados
    const { data: existingAssets } = await supabase
      .from("media_assets")
      .select("id, filename, nas_path, preview_url")
      .eq("session_id", sessionId)

    const newInserted: any[] = []
    let processedPhotos = 0
    let processedVideos = 0

    for (const f of files) {
      const filePath = path.join(masterDir, f.name)
      const ext = path.extname(f.name).toLowerCase()
      const isPhoto = PHOTO_EXTENSIONS.has(ext)
      const isVideo = VIDEO_EXTENSIONS.has(ext)

      if (!isPhoto && !isVideo) continue

      let stat: fs.Stats
      try {
        stat = fs.statSync(filePath)
      } catch {
        continue
      }

      const sizeMb = Number((stat.size / (1024 * 1024)).toFixed(2))
      const cleanBaseName = path.parse(f.name).name.replace(/[^a-zA-Z0-9_-]/g, "_")
      let previewUrl: string | null = null

      // Si ya existía y tenía preview_url, la reutilizamos
      const existing = (existingAssets || []).find(a => a.filename === f.name)
      if (existing?.preview_url) {
        previewUrl = existing.preview_url
      }

      // Si es foto y no tiene preview WebP en Supabase
      if (isPhoto && !previewUrl) {
        try {
          const webpBuffer = await sharp(filePath, { failOn: "none" })
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
          console.warn(`[Sync Master WebP Error] No se pudo convertir ${f.name}:`, e.message)
          // Fallback a ruta de streaming local si falla sharp
          previewUrl = `/api/media/preview?file=${encodeURIComponent(filePath)}`
        }
      }

      // Si es video, preview con streaming local
      if (isVideo && !previewUrl) {
        previewUrl = `/api/media/preview?file=${encodeURIComponent(filePath)}`
      }

      const relativeNasPath = `${folderName}/03_Edicion_Master/${f.name}`
      const assetType = isVideo ? "video_final" : "jpg"

      if (existing) {
        // Actualizar registro existente
        const { data: updated } = await supabase
          .from("media_assets")
          .update({
            nas_path: relativeNasPath,
            preview_url: previewUrl,
            size_mb: sizeMb,
            notes: "03_Édition_Master",
            asset_type: assetType
          })
          .eq("id", existing.id)
          .select()
          .single()

        if (updated) newInserted.push(updated)
      } else {
        // Insertar nuevo registro en Supabase
        const { data: inserted, error: insertError } = await supabase
          .from("media_assets")
          .insert({
            session_id: sessionId,
            filename: f.name,
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

        if (!insertError && inserted) {
          newInserted.push(inserted)
        }
      }

      if (isPhoto) processedPhotos++
      if (isVideo) processedVideos++
    }

    return NextResponse.json({
      success: true,
      message: `Sincronizados ${newInserted.length} archivos de Édition Master (${processedPhotos} fotos, ${processedVideos} videos).`,
      processedPhotos,
      processedVideos,
      totalDiskFiles: files.length,
      assets: newInserted
    })

  } catch (error: any) {
    console.error("[POST /api/media/sync-master Error]:", error)
    return NextResponse.json({ error: error.message || "Error al sincronizar Édition Master" }, { status: 500 })
  }
}
