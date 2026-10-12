import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import os from "os"
import { classifyMediaFile, PHOTO_EXTENSIONS, VIDEO_EXTENSIONS } from "@/lib/storage-config"

export interface ExplorerEntry {
  name: string
  path: string
  isDirectory: boolean
  size: number | null
  modified: string | null
  mediaType: "photo" | "video" | "directory" | "other"
  extension?: string
  hasDcim?: boolean
  childCount?: number
  photoCount?: number
  videoCount?: number
}

export interface ExplorerShortcut {
  id: string
  label: string
  path: string
  icon: "drive" | "sd" | "user" | "desktop" | "camera" | "mac"
  isRemovable?: boolean
}

export interface ExplorerResult {
  success: boolean
  currentPath: string
  parentPath: string | null
  platform: "win32" | "darwin" | "linux"
  isRoot: boolean
  shortcuts: ExplorerShortcut[]
  entries: ExplorerEntry[]
  stats: {
    folderCount: number
    fileCount: number
    photoCount: number
    videoCount: number
    totalSizeBytes: number
  }
  error?: string
}

function getVolumeLabelWin(driveLetter: string): string {
  if (driveLetter.toUpperCase() === "C") return "Disco del Sistema (C:)"
  const dcimPath = `${driveLetter}:\\DCIM`
  if (fs.existsSync(dcimPath)) return `Tarjeta SD (${driveLetter}:)`
  return `Unidad (${driveLetter}:)`
}

function getSystemShortcuts(platform: string): ExplorerShortcut[] {
  const shortcuts: ExplorerShortcut[] = []

  if (platform === "win32") {
    // 1. Unidades de Windows
    const letters = "CDEFGHIJKLMNOPQRSTUVWXYZ".split("")
    let foundDcim = false
    for (const l of letters) {
      const rootPath = `${l}:\\`
      try {
        if (fs.existsSync(rootPath)) {
          const dcimCandidate = `${l}:\\DCIM`
          const hasDcim = fs.existsSync(dcimCandidate)
          if (hasDcim && !foundDcim) {
            shortcuts.push({
              id: `sd-${l}`,
              label: `SD Card (${l}:\\DCIM)`,
              path: dcimCandidate,
              icon: "camera",
              isRemovable: true
            })
            foundDcim = true
          }
          shortcuts.push({
            id: `drive-${l}`,
            label: l === "C" ? "Sistema (C:)" : `Disco (${l}:)`,
            path: rootPath,
            icon: hasDcim ? "sd" : "drive",
            isRemovable: l !== "C"
          })
        }
      } catch {}
    }

    // 2. Carpetas de usuario de Windows
    const userProfile = process.env.USERPROFILE || ""
    if (userProfile && fs.existsSync(userProfile)) {
      const desktop = path.join(userProfile, "Desktop")
      const downloads = path.join(userProfile, "Downloads")
      const pictures = path.join(userProfile, "Pictures")
      if (fs.existsSync(desktop)) {
        shortcuts.push({ id: "desktop", label: "Escritorio", path: desktop, icon: "desktop" })
      }
      if (fs.existsSync(pictures)) {
        shortcuts.push({ id: "pictures", label: "Imágenes", path: pictures, icon: "user" })
      }
      if (fs.existsSync(downloads)) {
        shortcuts.push({ id: "downloads", label: "Descargas", path: downloads, icon: "user" })
      }
    }
  } else if (platform === "darwin") {
    // macOS: /Volumes es el punto de montaje esencial para tarjetas SD y discos SSD externos
    const volumesDir = "/Volumes"
    if (fs.existsSync(volumesDir)) {
      shortcuts.push({
        id: "volumes-root",
        label: "Volumes (Discos & SD)",
        path: volumesDir,
        icon: "mac",
        isRemovable: false
      })

      try {
        const vols = fs.readdirSync(volumesDir)
        for (const vol of vols) {
          if (vol.startsWith(".")) continue
          const volPath = path.join(volumesDir, vol)
          const dcimCandidate = path.join(volPath, "DCIM")
          const hasDcim = fs.existsSync(dcimCandidate)
          if (hasDcim) {
            shortcuts.push({
              id: `mac-sd-${vol}`,
              label: `SD: ${vol} (DCIM)`,
              path: dcimCandidate,
              icon: "camera",
              isRemovable: true
            })
          }
          shortcuts.push({
            id: `mac-vol-${vol}`,
            label: vol,
            path: volPath,
            icon: hasDcim ? "sd" : "drive",
            isRemovable: true
          })
        }
      } catch {}
    }

    // macOS User Home
    const home = process.env.HOME || ""
    if (home && fs.existsSync(home)) {
      shortcuts.push({ id: "home", label: "Inicio (~)", path: home, icon: "user" })
      const desktop = path.join(home, "Desktop")
      const pictures = path.join(home, "Pictures")
      const downloads = path.join(home, "Downloads")
      if (fs.existsSync(desktop)) {
        shortcuts.push({ id: "desktop", label: "Escritorio", path: desktop, icon: "desktop" })
      }
      if (fs.existsSync(pictures)) {
        shortcuts.push({ id: "pictures", label: "Imágenes", path: pictures, icon: "user" })
      }
      if (fs.existsSync(downloads)) {
        shortcuts.push({ id: "downloads", label: "Descargas", path: downloads, icon: "user" })
      }
    }
  } else {
    // Linux fallback
    shortcuts.push({ id: "root", label: "/", path: "/", icon: "drive" })
    const home = process.env.HOME || ""
    if (home) shortcuts.push({ id: "home", label: "Home", path: home, icon: "user" })
  }

  return shortcuts
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const requestedPath = searchParams.get("path")?.trim() || ""
    const showFiles = searchParams.get("showFiles") !== "false"
    const platform = process.platform as "win32" | "darwin" | "linux"

    const shortcuts = getSystemShortcuts(platform)

    // Si no se proporcionó ruta o se pide "root"
    if (!requestedPath || requestedPath === "PC" || requestedPath === "root") {
      if (platform === "win32") {
        // En Windows sin ruta: Mostrar lista de unidades disponibles
        const driveEntries: ExplorerEntry[] = []
        const letters = "CDEFGHIJKLMNOPQRSTUVWXYZ".split("")
        for (const l of letters) {
          const rootPath = `${l}:\\`
          try {
            if (fs.existsSync(rootPath)) {
              const hasDcim = fs.existsSync(`${l}:\\DCIM`)
              let childCount = 0
              try {
                childCount = fs.readdirSync(rootPath).filter(n => !n.startsWith(".")).length
              } catch {}

              driveEntries.push({
                name: getVolumeLabelWin(l),
                path: rootPath,
                isDirectory: true,
                size: null,
                modified: null,
                mediaType: "directory",
                hasDcim,
                childCount
              })
            }
          } catch {}
        }

        return NextResponse.json({
          success: true,
          currentPath: "Este Equipo",
          parentPath: null,
          platform,
          isRoot: true,
          shortcuts,
          entries: driveEntries,
          stats: {
            folderCount: driveEntries.length,
            fileCount: 0,
            photoCount: 0,
            videoCount: 0,
            totalSizeBytes: 0
          }
        } satisfies ExplorerResult)
      } else if (platform === "darwin") {
        // En macOS sin ruta: abrir /Volumes
        const volumesDir = "/Volumes"
        return readDirectoryContents(volumesDir, platform, shortcuts, showFiles)
      } else {
        return readDirectoryContents("/", platform, shortcuts, showFiles)
      }
    }

    // Ruta especificada
    return readDirectoryContents(requestedPath, platform, shortcuts, showFiles)
  } catch (err: any) {
    console.error("[Explorer API Error]:", err)
    return NextResponse.json({
      success: false,
      currentPath: "",
      parentPath: null,
      platform: process.platform as any,
      isRoot: false,
      shortcuts: [],
      entries: [],
      stats: { folderCount: 0, fileCount: 0, photoCount: 0, videoCount: 0, totalSizeBytes: 0 },
      error: err.message || "Error al explorar la ruta solicitada."
    } satisfies ExplorerResult, { status: 500 })
  }
}

function readDirectoryContents(
  targetPath: string,
  platform: "win32" | "darwin" | "linux",
  shortcuts: ExplorerShortcut[],
  showFiles: boolean
): NextResponse {
  // Normalizar ruta
  let normalized = path.normalize(targetPath)
  if (platform === "win32" && /^[A-Z]:$/i.test(normalized)) {
    normalized = `${normalized}\\`
  }

  if (!fs.existsSync(normalized)) {
    return NextResponse.json({
      success: false,
      currentPath: normalized,
      parentPath: null,
      platform,
      isRoot: false,
      shortcuts,
      entries: [],
      stats: { folderCount: 0, fileCount: 0, photoCount: 0, videoCount: 0, totalSizeBytes: 0 },
      error: `La carpeta no existe: "${normalized}"`
    } satisfies ExplorerResult, { status: 404 })
  }

  const stat = fs.statSync(normalized)
  if (!stat.isDirectory()) {
    return NextResponse.json({
      success: false,
      currentPath: normalized,
      parentPath: path.dirname(normalized),
      platform,
      isRoot: false,
      shortcuts,
      entries: [],
      stats: { folderCount: 0, fileCount: 0, photoCount: 0, videoCount: 0, totalSizeBytes: 0 },
      error: "La ruta especificada no es un directorio."
    } satisfies ExplorerResult, { status: 400 })
  }

  // Calcular parentPath
  let parentPath: string | null = null
  let isRoot = false

  if (platform === "win32") {
    // Si es raíz de unidad, ej: C:\
    if (/^[A-Z]:\\?$/i.test(normalized)) {
      parentPath = "Este Equipo"
      isRoot = false
    } else {
      parentPath = path.dirname(normalized)
    }
  } else {
    // Unix / macOS
    if (normalized === "/" || normalized === "/Volumes") {
      isRoot = true
      parentPath = normalized === "/Volumes" ? "/" : null
    } else {
      parentPath = path.dirname(normalized)
    }
  }

  // Leer contenido
  const dirents = fs.readdirSync(normalized, { withFileTypes: true })
  const entries: ExplorerEntry[] = []

  let folderCount = 0
  let fileCount = 0
  let photoCount = 0
  let videoCount = 0
  let totalSizeBytes = 0

  for (const item of dirents) {
    if (item.name.startsWith(".") || item.name === "System Volume Information" || item.name === "$RECYCLE.BIN") {
      continue
    }

    const itemFullPath = path.join(normalized, item.name)

    try {
      if (item.isDirectory()) {
        folderCount++
        let hasDcim = false
        let childCount = 0
        let dirPhotos = 0
        let dirVideos = 0

        try {
          const children = fs.readdirSync(itemFullPath)
          childCount = children.filter(c => !c.startsWith(".")).length
          hasDcim = children.some(c => c.toUpperCase() === "DCIM")
          for (const c of children) {
            const ext = path.extname(c).toLowerCase()
            if (PHOTO_EXTENSIONS.has(ext)) dirPhotos++
            else if (VIDEO_EXTENSIONS.has(ext)) dirVideos++
          }
        } catch {}

        entries.push({
          name: item.name,
          path: itemFullPath,
          isDirectory: true,
          size: null,
          modified: null,
          mediaType: "directory",
          hasDcim,
          childCount,
          photoCount: dirPhotos,
          videoCount: dirVideos
        })
      } else if (item.isFile() && showFiles) {
        fileCount++
        const ext = path.extname(item.name).toLowerCase()
        const mediaType = classifyMediaFile(item.name)
        if (mediaType === "photo") photoCount++
        else if (mediaType === "video") videoCount++

        let size: number | null = null
        let modified: string | null = null

        try {
          const fileStat = fs.statSync(itemFullPath)
          size = fileStat.size
          totalSizeBytes += fileStat.size
          modified = fileStat.mtime.toISOString()
        } catch {}

        entries.push({
          name: item.name,
          path: itemFullPath,
          isDirectory: false,
          size,
          modified,
          mediaType,
          extension: ext.replace(/^\./, "").toUpperCase()
        })
      }
    } catch {}
  }

  // Ordenar: primero directorios (alfabéticamente), luego archivos (alfabéticamente)
  entries.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1
    if (!a.isDirectory && b.isDirectory) return 1
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
  })

  return NextResponse.json({
    success: true,
    currentPath: normalized,
    parentPath,
    platform,
    isRoot,
    shortcuts,
    entries,
    stats: {
      folderCount,
      fileCount,
      photoCount,
      videoCount,
      totalSizeBytes
    }
  } satisfies ExplorerResult)
}

/**
 * POST /api/fs/explore
 * Acciones de archivo: Crear nueva carpeta (mkdir)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, parentPath, folderName } = body

    if (action === "mkdir") {
      if (!parentPath || !folderName) {
        return NextResponse.json({ success: false, error: "Faltan parámetros de ruta o nombre." }, { status: 400 })
      }

      const cleanName = folderName.replace(/[<>:"/\\|?*]/g, "_").trim()
      if (!cleanName) {
        return NextResponse.json({ success: false, error: "Nombre de carpeta inválido." }, { status: 400 })
      }

      const targetNewDir = path.join(parentPath, cleanName)
      if (fs.existsSync(targetNewDir)) {
        return NextResponse.json({ success: false, error: "La carpeta ya existe.", createdPath: targetNewDir })
      }

      fs.mkdirSync(targetNewDir, { recursive: true })
      return NextResponse.json({ success: true, createdPath: targetNewDir, folderName: cleanName })
    }

    return NextResponse.json({ success: false, error: "Acción no reconocida." }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Error al realizar acción." }, { status: 500 })
  }
}
