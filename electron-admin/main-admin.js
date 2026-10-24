const { app, BrowserWindow, shell, ipcMain, dialog } = require("electron")
const path = require("path")
const fs = require("fs")
const http = require("http")
const net = require("net")
const { spawn, exec } = require("child_process")

let mainWindow = null
let connectInterval = null
let engineChild = null
const LOCAL_PANEL_URL = "http://127.0.0.1:3000"

app.setAppUserModelId("com.lamhastudios.erp")

function checkLocalServer(timeoutMs = 1200) {
  return new Promise((resolve) => {
    const req = http.get("http://127.0.0.1:3000/login", { timeout: timeoutMs }, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 500)
    })
    req.on("error", () => resolve(false))
    req.on("timeout", () => {
      req.destroy()
      resolve(false)
    })
  })
}

function startLocalEngineSilently() {
  if (engineChild) return
  const adminDir = path.resolve(__dirname, "..")
  const standaloneServer = path.join(adminDir, ".next", "standalone", "server.js")

  try {
    if (fs.existsSync(standaloneServer)) {
      engineChild = spawn("node", [standaloneServer], {
        cwd: adminDir,
        detached: true,
        windowsHide: true,
        stdio: "ignore",
        env: {
          ...process.env,
          PORT: "3000",
          NODE_ENV: "production",
          NEXT_TELEMETRY_DISABLED: "1",
        },
      })
    } else {
      const isWin = process.platform === "win32"
      const npmCmd = isWin ? "npm.cmd" : "npm"
      engineChild = spawn(npmCmd, ["run", "dev"], {
        cwd: adminDir,
        detached: true,
        windowsHide: true,
        stdio: "ignore",
        env: {
          ...process.env,
          PORT: "3000",
          NEXT_TELEMETRY_DISABLED: "1",
        },
      })
    }

    if (engineChild) {
      engineChild.on("exit", () => {
        engineChild = null
      })
      engineChild.unref()
    }
  } catch (err) {
    engineChild = null
    console.error("No se pudo iniciar el motor local:", err)
  }
}

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
    title: "Lamha Studios • Studio Atelier",
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

  async function loadPanel() {
    const isOnline = await checkLocalServer(1000)
    if (isOnline) {
      if (connectInterval) {
        clearInterval(connectInterval)
        connectInterval = null
      }
      mainWindow.loadURL(LOCAL_PANEL_URL).catch(() => {
        mainWindow.loadFile(path.join(__dirname, "offline.html"))
      })
    } else {
      mainWindow.loadFile(path.join(__dirname, "offline.html"))
      startLocalEngineSilently()
      if (!connectInterval) {
        connectInterval = setInterval(async () => {
          const ready = await checkLocalServer(800)
          if (ready && mainWindow) {
            clearInterval(connectInterval)
            connectInterval = null
            mainWindow.loadURL(LOCAL_PANEL_URL)
          }
        }, 1000)
      }
    }
  }

  loadPanel()

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Abrir links externos en el navegador nativo de Windows
    if (url.startsWith("http:") || url.startsWith("https:")) {
      shell.openExternal(url)
      return { action: "deny" }
    }
    return { action: "allow" }
  })

  mainWindow.on("closed", () => {
    if (connectInterval) {
      clearInterval(connectInterval)
      connectInterval = null
    }
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

ipcMain.on("retry-connect", async () => {
  if (mainWindow) {
    startLocalEngineSilently()
    const isOnline = await checkLocalServer(1200)
    if (isOnline) {
      mainWindow.loadURL(LOCAL_PANEL_URL)
    }
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
