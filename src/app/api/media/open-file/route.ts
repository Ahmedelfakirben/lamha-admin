import { NextRequest, NextResponse } from "next/server"
import { exec, spawn } from "child_process"
import fs from "fs"
import path from "path"

export async function POST(req: NextRequest) {
  try {
    const { filePath, mode = "open_with", appName } = await req.json()

    if (!filePath || typeof filePath !== "string") {
      return NextResponse.json(
        { error: "La ruta del archivo es requerida." },
        { status: 400 }
      )
    }

    // Si es una ruta de red FTP (Router / NAS)
    if (filePath.startsWith("ftp://")) {
      const platform = process.platform
      if (platform === "win32") {
        const child = spawn("explorer.exe", [filePath], {
          detached: true,
          stdio: "ignore",
          shell: false,
        })
        child.unref()
        return NextResponse.json({
          success: true,
          message: "Ubicación de red FTP abierta en el Explorador de Windows.",
          resolvedPath: filePath,
        })
      } else if (platform === "darwin") {
        spawn("open", [filePath], { detached: true, stdio: "ignore" }).unref()
        return NextResponse.json({
          success: true,
          message: "Ubicación FTP abierta en Finder.",
          resolvedPath: filePath,
        })
      }
    }

    // Normalizar ruta local
    let normalizedPath = path.normalize(filePath)
    const platform = process.platform

    // Si la ruta no es absoluta, buscar en C:\Lamha-Storage y en otras unidades
    if (!path.isAbsolute(normalizedPath)) {
      const defaultRoot = "C:\\Lamha-Storage"
      const candidate = path.join(defaultRoot, normalizedPath)
      if (fs.existsSync(candidate)) {
        normalizedPath = candidate
      } else {
        let found = false
        for (const drive of ["D", "E", "F", "G", "C"]) {
          const testP = path.join(`${drive}:\\Lamha-Storage`, normalizedPath)
          if (fs.existsSync(testP)) {
            normalizedPath = testP
            found = true
            break
          }
        }
        if (!found) {
          normalizedPath = candidate
        }
      }
    }

    // Verificar si el archivo/carpeta existe
    const exists = fs.existsSync(normalizedPath)
    if (!exists) {
      // Si el archivo específico no existe, probar con la carpeta contenedora
      const parentDir = path.dirname(normalizedPath)
      if (fs.existsSync(parentDir)) {
        normalizedPath = parentDir
      } else {
        return NextResponse.json(
          { 
            error: `El archivo o carpeta no fue encontrado en la ruta: ${normalizedPath}`,
            resolvedPath: normalizedPath,
            exists: false 
          },
          { status: 404 }
        )
      }
    }

    const isDirectory = fs.statSync(normalizedPath).isDirectory()
    let message = ""

    if (platform === "win32") {
      // Entorno Windows — usar spawn con detached para lanzar procesos GUI correctamente
      if (mode === "open_with" && !isDirectory) {
        // Abre el diálogo nativo de Windows 'Abrir con...'
        const child = spawn("rundll32.exe", ["shell32.dll,OpenAs_RunDLL", normalizedPath], {
          detached: true,
          stdio: "ignore",
          shell: false,
        })
        child.unref()
        message = "Menú 'Abrir con...' de Windows lanzado."
      } else if (mode === "reveal" || isDirectory) {
        if (isDirectory) {
          // Abrir la carpeta directamente en el Explorador
          const child = spawn("explorer.exe", [normalizedPath], {
            detached: true,
            stdio: "ignore",
            shell: false,
          })
          child.unref()
          message = "Carpeta abierta en el Explorador de Windows."
        } else {
          // Abrir Explorador y seleccionar/resaltar el archivo
          // explorer.exe /select, requiere la coma pegada a /select
          const child = spawn("explorer.exe", [`/select,${normalizedPath}`], {
            detached: true,
            stdio: "ignore",
            shell: false,
          })
          child.unref()
          message = "Explorador de archivos de Windows abierto."
        }
      } else {
        // Abre con la aplicación predeterminada del sistema
        const child = spawn("cmd.exe", ["/c", "start", "", normalizedPath], {
          detached: true,
          stdio: "ignore",
          shell: false,
        })
        child.unref()
        message = "Archivo abierto con la aplicación predeterminada."
      }
    } else if (platform === "darwin") {
      // Entorno macOS (MacBook)
      let command = ""
      if (appName) {
        command = `open -a "${appName}" "${normalizedPath}"`
      } else if (mode === "reveal" || mode === "open_with") {
        command = `open -R "${normalizedPath}"`
      } else {
        command = `open "${normalizedPath}"`
      }
      exec(command, (error) => {
        if (error) {
          console.warn(`[Media OpenFile] Aviso al ejecutar comando: ${error.message}`)
        }
      })
      message = mode === "reveal" ? "Archivo revelado en Finder de macOS." : "Aplicación iniciada en macOS."
    } else {
      // Linux
      exec(`xdg-open "${normalizedPath}"`, (error) => {
        if (error) {
          console.warn(`[Media OpenFile] Aviso al ejecutar comando: ${error.message}`)
        }
      })
      message = "Archivo abierto."
    }

    return NextResponse.json({
      success: true,
      platform,
      mode,
      message
    })
  } catch (error: any) {
    console.error("[Media OpenFile Error]:", error)
    return NextResponse.json(
      { error: error.message || "Error al invocar la acción del sistema operativo" },
      { status: 500 }
    )
  }
}
