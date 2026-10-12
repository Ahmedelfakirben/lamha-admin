import { NextResponse } from "next/server"
import * as ftp from "basic-ftp"
import fs from "fs"
import path from "path"
import { getStorageConfig, NAS_FTP_CONFIG, classifyMediaFile } from "@/lib/storage-config"
import { createClient } from "@/lib/supabase"

export interface ScannedProject {
  folderName: string
  clientName: string
  sessionDate: string
  sessionId?: string
  portalPin?: string
  status?: string
  filesCount: number
  totalSizeMB: number
  subfolders: {
    name: string
    files: Array<{
      name: string
      size: number
      modified: string | null
      type: "photo" | "video" | "other"
      fullPath: string
    }>
  }[]
}

/**
 * GET /api/media/scan-all
 * Escanea recursivamente los proyectos en el NAS o local y los empareja con las sesiones de Supabase.
 */
export async function GET() {
  try {
    const supabase = createClient()
    const { data: allSessions, count: exactSessionCount } = await supabase
      .from("sessions")
      .select("id, client_name, session_date, category, status, portal_pin, tags", { count: "exact" })

    const sessionList = allSessions || []

    const scannedProjects: ScannedProject[] = []
    let storageType = "local"
    let isOnline = false

    // 1. Intentar escanear NAS por FTP
    try {
      const client = new ftp.Client(3000)
      client.ftp.verbose = false
      await client.access({
        host: NAS_FTP_CONFIG.host,
        user: NAS_FTP_CONFIG.user,
        password: NAS_FTP_CONFIG.password,
        port: 21,
      })

      const projectFolders = await client.list(NAS_FTP_CONFIG.baseDir)
      storageType = "nas_ftp"
      isOnline = true

      for (const item of projectFolders) {
        if (!item.isDirectory || item.name.startsWith(".") || item.name === "System Volume Information") continue

        const folderName = item.name
        // Intentar parsear fecha y cliente del nombre YYYY-MM-DD_Cliente_Proyecto
        const parts = folderName.split("_")
        const maybeDate = parts[0]
        const maybeClient = parts.slice(1, -1).join(" ") || parts[1] || folderName

        // Buscar coincidencia en Supabase
        const matched = sessionList.find(s => {
          const sDate = s.session_date?.replace(/[^0-9-]/g, "")
          const sName = s.client_name?.toLowerCase().replace(/[^a-z0-9]/g, "")
          const fNameClean = folderName.toLowerCase().replace(/[^a-z0-9]/g, "")
          return (sDate && maybeDate.includes(sDate) && fNameClean.includes(sName)) ||
                 (sName && fNameClean.includes(sName))
        })

        // Escanear subcarpetas estándar (01_RAW/Fotos, 01_RAW/Videos, 02_Seleccion_Cliente, etc.)
        let totalFiles = 0
        let totalBytes = 0
        const subfolders: ScannedProject["subfolders"] = []

        const candidateSubdirs = [
          "01_RAW/Fotos",
          "01_RAW/Videos",
          "02_Seleccion_Cliente",
          "03_Edicion_Master",
          "04_Entregas_Finales",
        ]

        for (const sub of candidateSubdirs) {
          try {
            const list = await client.list(`${NAS_FTP_CONFIG.baseDir}/${folderName}/${sub}`)
            const files = list
              .filter(f => !f.isDirectory && !f.name.startsWith("."))
              .map(f => {
                totalFiles++
                totalBytes += f.size || 0
                return {
                  name: f.name,
                  size: f.size || 0,
                  modified: typeof f.date === "string" ? f.date : f.rawModifiedAt || null,
                  type: classifyMediaFile(f.name),
                  fullPath: `ftp://${NAS_FTP_CONFIG.host}${NAS_FTP_CONFIG.baseDir}/${folderName}/${sub}/${f.name}`
                }
              })

            if (files.length > 0 || true) {
              subfolders.push({
                name: sub,
                files
              })
            }
          } catch {
            // Subcarpeta no existe todavía
          }
        }

        scannedProjects.push({
          folderName,
          clientName: matched?.client_name || maybeClient,
          sessionDate: matched?.session_date || maybeDate,
          sessionId: matched?.id,
          portalPin: matched?.portal_pin,
          status: matched?.status || "pending",
          filesCount: totalFiles,
          totalSizeMB: Number((totalBytes / (1024 * 1024)).toFixed(2)),
          subfolders,
        })
      }

      client.close()
    } catch {
      // 2. Fallback a escanear disco local C:\Lamha-Storage
      storageType = "local"
      const storage = getStorageConfig()
      if (fs.existsSync(storage.localBasePath)) {
        const localFolders = fs.readdirSync(storage.localBasePath, { withFileTypes: true })
        for (const item of localFolders) {
          if (!item.isDirectory() || item.name.startsWith(".")) continue

          const folderName = item.name
          const parts = folderName.split("_")
          const maybeDate = parts[0]
          const maybeClient = parts.slice(1, -1).join(" ") || parts[1] || folderName

          const matched = sessionList.find(s => {
            const sDate = s.session_date?.replace(/[^0-9-]/g, "")
            const sName = s.client_name?.toLowerCase().replace(/[^a-z0-9]/g, "")
            const fNameClean = folderName.toLowerCase().replace(/[^a-z0-9]/g, "")
            return (sDate && maybeDate.includes(sDate) && fNameClean.includes(sName)) ||
                   (sName && fNameClean.includes(sName))
          })

          let totalFiles = 0
          let totalBytes = 0
          const subfolders: ScannedProject["subfolders"] = []

          const candidateSubdirs = [
            "01_RAW/Fotos",
            "01_RAW/Videos",
            "02_Seleccion_Cliente",
            "03_Edicion_Master",
            "04_Entregas_Finales",
          ]

          for (const sub of candidateSubdirs) {
            const subPath = path.join(storage.localBasePath, folderName, sub)
            if (fs.existsSync(subPath)) {
              try {
                const dirents = fs.readdirSync(subPath, { withFileTypes: true })
                const files = dirents
                  .filter(d => d.isFile() && !d.name.startsWith("."))
                  .map(d => {
                    totalFiles++
                    const fPath = path.join(subPath, d.name)
                    let size = 0
                    let mtime = null
                    try {
                      const stat = fs.statSync(fPath)
                      size = stat.size
                      mtime = stat.mtime.toISOString()
                    } catch {}
                    totalBytes += size
                    return {
                      name: d.name,
                      size,
                      modified: mtime,
                      type: classifyMediaFile(d.name),
                      fullPath: fPath
                    }
                  })

                subfolders.push({ name: sub, files })
              } catch {}
            }
          }

          scannedProjects.push({
            folderName,
            clientName: matched?.client_name || maybeClient,
            sessionDate: matched?.session_date || maybeDate,
            sessionId: matched?.id,
            portalPin: matched?.portal_pin,
            status: matched?.status || "pending",
            filesCount: totalFiles,
            totalSizeMB: Number((totalBytes / (1024 * 1024)).toFixed(2)),
            subfolders,
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      storageType,
      isOnline,
      totalProjects: scannedProjects.length,
      projects: scannedProjects,
      totalSessionsInDb: exactSessionCount ?? sessionList.length,
    })

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
