import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import * as ftp from "basic-ftp"
import { getStorageConfig, NAS_FTP_CONFIG, classifyMediaFile } from "@/lib/storage-config"

export interface BrowseEntry {
  name: string
  isDirectory: boolean
  size: number | null
  modified: string | null
  mediaType: "photo" | "video" | "other" | "directory"
  childCount?: number
}

export interface BrowseResult {
  success: boolean
  currentPath: string
  relativePath: string
  basePath: string
  isNetworkReachable: boolean
  entries: BrowseEntry[]
  error?: string
}

/**
 * Intenta explorar el NAS del router Orange ZTE mediante FTP
 */
async function browseFtp(relativePath: string): Promise<BrowseResult | null> {
  const client = new ftp.Client(2500)
  client.ftp.verbose = false
  try {
    await client.access({
      host: NAS_FTP_CONFIG.host,
      user: NAS_FTP_CONFIG.user,
      password: NAS_FTP_CONFIG.password,
      port: 21,
    })

    const cleanRel = relativePath.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "")
    const targetDir = cleanRel 
      ? `${NAS_FTP_CONFIG.baseDir}/${cleanRel}`
      : NAS_FTP_CONFIG.baseDir

    const list = await client.list(targetDir)
    
    const entries: BrowseEntry[] = list
      .filter((item) => !item.name.startsWith(".") && item.name !== "System Volume Information")
      .map((item) => {
        let modified: string | null = null
        if (typeof item.date === "string") {
          modified = item.date
        } else if (item.rawModifiedAt) {
          modified = String(item.rawModifiedAt)
        }

        return {
          name: item.name,
          isDirectory: item.isDirectory,
          size: item.isDirectory ? null : item.size,
          modified,
          mediaType: item.isDirectory ? ("directory" as const) : classifyMediaFile(item.name),
        }
      })

    entries.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1
      if (!a.isDirectory && b.isDirectory) return 1
      return a.name.localeCompare(b.name)
    })

    const currentFtpUrl = `ftp://${NAS_FTP_CONFIG.host}${targetDir}`

    return {
      success: true,
      currentPath: currentFtpUrl,
      relativePath: cleanRel,
      basePath: `ftp://${NAS_FTP_CONFIG.host}${NAS_FTP_CONFIG.baseDir}`,
      isNetworkReachable: true,
      entries,
    }
  } catch (err) {
    console.error("[browseFtp Error]:", err)
    return null
  } finally {
    try {
      client.close()
    } catch {
      // Ignorar error al cerrar
    }
  }
}

/**
 * GET /api/media/browse?path=<relative_path>
 * 
 * Browse the NAS/local storage directory structure.
 * Prioriza el NAS (FTP) y si no responde, conmuta automáticamente a almacenamiento local.
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const relativePath = searchParams.get("path") || ""
    const source = searchParams.get("source") || "auto" // "auto" | "local" | "nas"

    if (source !== "local") {
      // 1. Intentar explorar el NAS por FTP en vivo si no se pidió explícitamente local
      const ftpResult = await browseFtp(relativePath)
      if (ftpResult) {
        // Si se pidió específicamente NAS, o si tiene archivos, o si local no existe, retornar resultado FTP
        const storage = getStorageConfig()
        const localCheckPath = path.resolve(storage.localBasePath, relativePath)
        const localHasFiles = fs.existsSync(localCheckPath) && fs.readdirSync(localCheckPath).length > 0

        if (source === "nas" || !localHasFiles || ftpResult.entries.length > 0) {
          return NextResponse.json(ftpResult)
        }
      }
    }

    // 2. Fallback a almacenamiento local si el NAS no está accesible o si se solicitó local
    const storage = getStorageConfig()
    const fullPath = path.resolve(storage.activeBasePath, relativePath)

    // Security: prevent directory traversal outside the storage root
    const normalizedBase = path.normalize(storage.activeBasePath)
    const normalizedFull = path.normalize(fullPath)
    if (!normalizedFull.startsWith(normalizedBase)) {
      return NextResponse.json({
        success: false,
        currentPath: normalizedFull,
        relativePath,
        basePath: normalizedBase,
        isNetworkReachable: storage.isNetworkReachable,
        entries: [],
        error: "Acceso denegado: la ruta está fuera del almacenamiento permitido."
      } satisfies BrowseResult, { status: 403 })
    }

    // Check if path exists
    if (!fs.existsSync(normalizedFull)) {
      return NextResponse.json({
        success: false,
        currentPath: normalizedFull,
        relativePath,
        basePath: normalizedBase,
        isNetworkReachable: storage.isNetworkReachable,
        entries: [],
        error: "La ruta no existe en el almacenamiento."
      } satisfies BrowseResult, { status: 404 })
    }

    // Read directory contents
    const dirEntries = fs.readdirSync(normalizedFull, { withFileTypes: true })
    
    const entries: BrowseEntry[] = []

    for (const entry of dirEntries) {
      // Skip hidden files/dirs (starting with .)
      if (entry.name.startsWith(".")) continue

      const entryFullPath = path.join(normalizedFull, entry.name)
      
      try {
        const stats = fs.statSync(entryFullPath)
        
        if (entry.isDirectory()) {
          // Count children (shallow)
          let childCount = 0
          try {
            childCount = fs.readdirSync(entryFullPath).filter(n => !n.startsWith(".")).length
          } catch {
            // Permission denied or other error
          }

          entries.push({
            name: entry.name,
            isDirectory: true,
            size: null,
            modified: stats.mtime.toISOString(),
            mediaType: "directory",
            childCount,
          })
        } else {
          const mediaType = classifyMediaFile(entry.name)
          entries.push({
            name: entry.name,
            isDirectory: false,
            size: stats.size,
            modified: stats.mtime.toISOString(),
            mediaType,
          })
        }
      } catch {
        // Skip files we can't stat
        continue
      }
    }

    // Sort: directories first (alphabetical), then files (alphabetical)
    entries.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1
      if (!a.isDirectory && b.isDirectory) return 1
      return a.name.localeCompare(b.name)
    })

    return NextResponse.json({
      success: true,
      currentPath: normalizedFull,
      relativePath,
      basePath: normalizedBase,
      isNetworkReachable: storage.isNetworkReachable,
      entries
    } satisfies BrowseResult)

  } catch (error: any) {
    console.error("[Browse API Error]:", error)
    return NextResponse.json({
      success: false,
      currentPath: "",
      relativePath: "",
      basePath: "",
      isNetworkReachable: false,
      entries: [],
      error: error.message || "Error al explorar el directorio."
    } satisfies BrowseResult, { status: 500 })
  }
}
