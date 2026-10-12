import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { execSync } from "child_process"

export interface ConnectedDrive {
  id: string              // e.g. "C:", "E:", "/Volumes/SSD"
  mountPath: string       // e.g. "C:\\", "E:\\", "/Volumes/SSD"
  label: string           // e.g. "ELFAKIR", "Disco Local (C:)", "EOS_DIGITAL"
  totalGB: number
  freeGB: number
  usedGB: number
  percentFree: number
  isRemovable: boolean
  hasDcim: boolean
  dcimPath?: string
  isSystemDrive: boolean
}

function getVolumeLabelWin(driveLetter: string): string {
  try {
    const out = execSync(`cmd /c "vol ${driveLetter}:"`, { encoding: "utf-8", timeout: 1500 })
    const match = out.match(/(?:es|is)\s+([^\r\n]+)/i)
    if (match && match[1] && !match[1].toLowerCase().includes("no tiene etiqueta") && !match[1].toLowerCase().includes("has no label")) {
      return match[1].trim()
    }
  } catch {}
  return driveLetter === "C" ? "Disco del Sistema" : `Unidad (${driveLetter}:)`
}

/**
 * GET /api/media/drives
 * Inspecciona las unidades físicas y extraíbles conectadas en tiempo real.
 */
export async function GET() {
  try {
    const drives: ConnectedDrive[] = []

    if (process.platform === "win32") {
      // Escaneo de letras de unidad C..Z en Windows
      const letters = "CDEFGHIJKLMNOPQRSTUVWXYZ".split("")

      for (const letter of letters) {
        const mountPath = `${letter}:\\`
        try {
          const stat = fs.statfsSync(mountPath)
          const totalBytes = stat.bsize * stat.blocks
          const freeBytes = stat.bsize * stat.bavail
          
          if (totalBytes <= 0) continue

          const totalGB = Number((totalBytes / (1024 ** 3)).toFixed(1))
          const freeGB = Number((freeBytes / (1024 ** 3)).toFixed(1))
          const usedGB = Number((totalGB - freeGB).toFixed(1))
          const percentFree = totalGB > 0 ? Math.round((freeGB / totalGB) * 100) : 0

          const dcimCandidate = `${letter}:\\DCIM`
          const hasDcim = fs.existsSync(dcimCandidate)
          const isSystemDrive = letter.toUpperCase() === "C"

          const label = getVolumeLabelWin(letter)

          drives.push({
            id: `${letter}:`,
            mountPath,
            label,
            totalGB,
            freeGB,
            usedGB,
            percentFree,
            isRemovable: letter !== "C",
            hasDcim,
            dcimPath: hasDcim ? dcimCandidate : undefined,
            isSystemDrive
          })
        } catch {
          // Unidad no montada o inaccesible
        }
      }
    } else if (process.platform === "darwin") {
      // macOS: Explorar /Volumes
      const volumesDir = "/Volumes"
      if (fs.existsSync(volumesDir)) {
        try {
          const vols = fs.readdirSync(volumesDir)
          for (const vol of vols) {
            const volPath = path.join(volumesDir, vol)
            try {
              const stat = fs.statfsSync(volPath)
              const totalBytes = stat.bsize * stat.blocks
              const freeBytes = stat.bsize * stat.bavail
              
              if (totalBytes <= 0) continue

              const totalGB = Number((totalBytes / (1024 ** 3)).toFixed(1))
              const freeGB = Number((freeBytes / (1024 ** 3)).toFixed(1))
              const usedGB = Number((totalGB - freeGB).toFixed(1))
              const percentFree = totalGB > 0 ? Math.round((freeGB / totalGB) * 100) : 0

              const dcimCandidate = path.join(volPath, "DCIM")
              const hasDcim = fs.existsSync(dcimCandidate)
              const isSystemDrive = vol === "Macintosh HD"

              drives.push({
                id: volPath,
                mountPath: volPath,
                label: vol,
                totalGB,
                freeGB,
                usedGB,
                percentFree,
                isRemovable: !isSystemDrive,
                hasDcim,
                dcimPath: hasDcim ? dcimCandidate : undefined,
                isSystemDrive
              })
            } catch {}
          }
        } catch {}
      }
    }

    return NextResponse.json({
      success: true,
      platform: process.platform,
      drives,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
