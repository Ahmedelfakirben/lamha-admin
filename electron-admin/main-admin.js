const { app, BrowserWindow, shell, ipcMain, dialog } = require("electron")
const path = require("path")
const fs = require("fs")
const http = require("http")
const net = require("net")
const { spawn, exec } = require("child_process")

let mainWindow = null
const STUDIO_PANEL_URL = process.env.LAMHA_PANEL_URL || "https://admin.lam7a.ma"

app.setAppUserModelId("com.lamhastudios.erp")

// Detección nativa de tarjetas SD y unidades de cámara en Windows
function scanConnectedCards() {
  const cards = []
  const driveLetters = ["D", "E", "F", "G", "H", "I", "J", "K"]
  const extensions = new Set([
    ".cr2", ".cr3", ".nef", ".arw", ".dng", ".raf", ".orf", ".rw2",
    ".jpg", ".jpeg", ".mp4", ".mov", ".mkv", ".braw", ".prores"
  ])

  for (const letter of driveLetters) {
    const driveRoot = `${letter}:\\`
    try {
      if (!fs.existsSync(driveRoot)) continue

      const dcimPath = path.join(driveRoot, "DCIM")
      let targetPath = null
      let count = 0

      if (fs.existsSync(dcimPath)) {
        targetPath = dcimPath
        count = countMediaFiles(dcimPath, extensions, 2)
      } else {
        const rootCount = countMediaFiles(driveRoot, extensions, 1)
        if (rootCount >= 5) {
          targetPath = driveRoot
          count = rootCount
        }
      }

      if (targetPath && count > 0) {
        cards.push({
          letter,
          drive: driveRoot,
          path: targetPath,
          count,
          detectedAt: Date.now()
        })
      }
    } catch {}
  }
  return cards
}

function countMediaFiles(dirPath, extensions, maxDepth = 2, currentDepth = 0) {
  if (currentDepth > maxDepth) return 0
  let count = 0
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase()
        if (extensions.has(ext)) count++
      } else if (entry.isDirectory() && !entry.name.startsWith(".")) {
        count += countMediaFiles(path.join(dirPath, entry.name), extensions, maxDepth, currentDepth + 1)
      }
    }
  } catch {}
  return count
}

function createWindow() {
  let iconPath = path.join(__dirname, "assets", "icon.ico")
  if (!fs.existsSync(iconPath)) {
    iconPath = path.join(__dirname, "..", "electron", "assets", "icon.ico")
  }

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1080,
    minHeight: 720,
    title: "Lam7a Studios • Studio Atelier",
    backgroundColor: "#0b0a09",
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#0b0a09",
      symbolColor: "#c69f68",
      height: 36,
    },
    webPreferences: {
      preload: path.join(__dirname, "preload-admin.js"),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: false,
    },
    autoHideMenuBar: true,
    show: true,
  })

  mainWindow.once("ready-to-show", () => {
    mainWindow.show()
    mainWindow.focus()
  })

  function loadPanel() {
    mainWindow.loadURL(STUDIO_PANEL_URL).catch((err) => {
      console.warn("Error cargando panel remoto, mostrando pantalla offline:", err)
      mainWindow.loadFile(path.join(__dirname, "offline.html"))
    })
  }

  loadPanel()

  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
    if (errorCode !== -3) {
      console.warn("Fallo de red al conectar con el servidor:", errorCode, errorDescription)
      mainWindow.loadFile(path.join(__dirname, "offline.html"))
    }
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Si es una ruta interna de Lamha Studios, mantener dentro de la app
    if (url.startsWith("https://admin.lam7a.ma") || url.startsWith("https://lam7a.ma")) {
      return { action: "allow" }
    }
    // Abrir links externos en el navegador nativo de Windows
    if (url.startsWith("http:") || url.startsWith("https:")) {
      shell.openExternal(url)
      return { action: "deny" }
    }
    return { action: "allow" }
  })

  mainWindow.on("closed", () => {
    mainWindow = null
  })
}

// ─────────────────────────────────────────────────────────────
// PUENTE DE HARDWARE Y ACCESO NATIVO DE WINDOWS
// ─────────────────────────────────────────────────────────────

// 1. Selector nativo de carpetas de Windows
ipcMain.handle("select-folder", async (_event, options = {}) => {
  if (!mainWindow) return null
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory", "createDirectory"],
    title: options.title || "Seleccionar Carpeta en este Equipo",
    defaultPath: options.defaultPath || undefined,
  })
  if (result.canceled || !result.filePaths.length) return null
  return result.filePaths[0]
})

// 2. Selector nativo de archivos (imágenes, vídeos, proyectos)
ipcMain.handle("select-file", async (_event, options = {}) => {
  if (!mainWindow) return null
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile", options.multiple ? "multiSelections" : "openFile"].filter(Boolean),
    title: options.title || "Seleccionar Archivo",
    defaultPath: options.defaultPath || undefined,
    filters: options.filters || [
      { name: "Todos los archivos", extensions: ["*"] }
    ]
  })
  if (result.canceled || !result.filePaths.length) return null
  return options.multiple ? result.filePaths : result.filePaths[0]
})

// 3. Abrir carpetas o archivos en el Explorador de Windows
ipcMain.handle("open-local-path", async (_event, targetPath) => {
  if (!targetPath || typeof targetPath !== "string") {
    return { success: false, error: "Ruta no especificada" }
  }

  try {
    if (fs.existsSync(targetPath)) {
      const stat = fs.statSync(targetPath)
      if (stat.isDirectory()) {
        const error = await shell.openPath(targetPath)
        return { success: !error, error }
      } else {
        shell.showItemInFolder(targetPath)
        return { success: true }
      }
    } else {
      const parentDir = path.dirname(targetPath)
      if (fs.existsSync(parentDir)) {
        const error = await shell.openPath(parentDir)
        return { success: !error, error }
      }
      return { success: false, error: `La ruta no existe: ${targetPath}` }
    }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// 4. Resaltar archivo específico dentro de la carpeta en Windows
ipcMain.handle("reveal-item", async (_event, targetPath) => {
  if (targetPath && typeof targetPath === "string") {
    try {
      shell.showItemInFolder(targetPath)
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }
  return { success: false, error: "Ruta inválida" }
})

// 5. Detección en tiempo real de tarjetas SD insertadas en el PC
ipcMain.handle("get-active-cards", async () => {
  try {
    return scanConnectedCards()
  } catch {
    return []
  }
})

// 6. Comprobar existencia y detalles de ruta local
ipcMain.handle("check-local-path", async (_event, targetPath) => {
  if (!targetPath || typeof targetPath !== "string") return { exists: false }
  try {
    const exists = fs.existsSync(targetPath)
    if (!exists) return { exists: false }
    const stat = fs.statSync(targetPath)
    return {
      exists: true,
      isDirectory: stat.isDirectory(),
      sizeBytes: stat.size,
    }
  } catch {
    return { exists: false }
  }
})

// 7. Comprobar conectividad local con NAS (IP/puerto)
ipcMain.handle("check-nas-connection", async (_event, host = "192.168.11.1", port = 21, timeoutMs = 1500) => {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    socket.setTimeout(timeoutMs)

    socket.on("connect", () => {
      socket.destroy()
      resolve({ reachable: true, host, port })
    })

    socket.on("timeout", () => {
      socket.destroy()
      resolve({ reachable: false, host, port, error: "Timeout" })
    })

    socket.on("error", (err) => {
      socket.destroy()
      resolve({ reachable: false, host, port, error: err.message })
    })

    socket.connect(port, host)
  })
})

// 8. Iniciar o comunicar con Ingest Companion
ipcMain.handle("launch-ingest-companion", async (_event, params = {}) => {
  const protocolUrl = `lamha://ingest?session_id=${encodeURIComponent(params.sessionId || "")}&client_name=${encodeURIComponent(params.clientName || "")}&auto=true`
  try {
    await shell.openExternal(protocolUrl)
    return { success: true, method: "protocol" }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.on("retry-connect", () => {
  if (mainWindow) {
    mainWindow.loadURL(STUDIO_PANEL_URL).catch(() => {
      mainWindow.loadFile(path.join(__dirname, "offline.html"))
    })
  }
})

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(createWindow)
}

app.on("before-quit", () => {
  if (engineChild && engineChild.pid) {
    try {
      if (process.platform === "win32") {
        exec(`taskkill /pid ${engineChild.pid} /T /F`)
      } else {
        engineChild.kill()
      }
    } catch {}
    engineChild = null
  }
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
