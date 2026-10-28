import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { exec } from "child_process"

function resolveLocalProjectFolder(folderName: string): string | null {
  if (!folderName) return null
  const letters = ["C", "D", "E", "F", "G"]
  for (const letter of letters) {
    const candidate = path.join(`${letter}:\\Lamha-Storage`, folderName)
    if (fs.existsSync(candidate)) return candidate
  }
  return path.join("C:\\Lamha-Storage", folderName)
}

export async function POST(req: Request) {
  try {
    const { folderName, filenames = [] } = await req.json()
    if (!folderName || !Array.isArray(filenames) || filenames.length === 0) {
      return NextResponse.json({ success: false, error: "Carpeta o lista de archivos vacía" }, { status: 400 })
    }

    const projectRoot = resolveLocalProjectFolder(folderName)
    if (!projectRoot || !fs.existsSync(projectRoot)) {
      return NextResponse.json(
        { success: false, error: `No se encontró la carpeta local ${projectRoot || folderName} en este PC.` },
        { status: 404 }
      )
    }

    const destDir = path.join(projectRoot, "02_Seleccion_Cliente")
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true })
    }

    const targetStems = new Set<string>()
    const targetExact = new Set<string>()
    for (const rawName of filenames) {
      if (!rawName || typeof rawName !== "string") continue
      const base = path.basename(rawName).toLowerCase()
      const stem = path.basename(base, path.extname(base)).toLowerCase()
      targetExact.add(base)
      if (stem) targetStems.add(stem)
    }

    const matchedFiles: string[] = []
    function findMatches(dir: string) {
      let entries: fs.Dirent[] = []
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true })
      } catch {
        return
      }
      for (const entry of entries) {
        if (entry.name.startsWith(".")) continue
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          if (entry.name.toLowerCase() === "02_seleccion_cliente") continue
          findMatches(full)
        } else if (entry.isFile()) {
          const lowerName = entry.name.toLowerCase()
          const stem = path.basename(lowerName, path.extname(lowerName))
          if (targetExact.has(lowerName) || targetStems.has(stem)) {
            matchedFiles.push(full)
          }
        }
      }
    }

    findMatches(projectRoot)

    let copiedCount = 0
    for (const srcFile of matchedFiles) {
      try {
        const destFile = path.join(destDir, path.basename(srcFile))
        if (!fs.existsSync(destFile)) {
          fs.copyFileSync(srcFile, destFile)
        }
        copiedCount++
      } catch {}
    }

    if (process.platform === "win32") {
      exec(`explorer.exe "${destDir}"`)
    }

    return NextResponse.json({
      success: true,
      copiedCount,
      destDir,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

