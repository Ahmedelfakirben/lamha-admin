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

// 3. Abrir carpetas o archivos en el Explorador de Windows (con resolución inteligente de NAS y SSD)
ipcMain.handle("open-local-path", async (_event, targetPath, target = "local") => {
  if (!targetPath || typeof targetPath !== "string") {
    return { success: false, error: "Ruta no especificada" }
  }

  try {
    // A) MODO NAS: Abrir recurso compartido SMB o FTP en el Explorador de Windows
    if (target === "nas" || targetPath.startsWith("ftp://") || targetPath.startsWith("\\\\")) {
      const cleanRel = targetPath
        .replace(/^ftp:\/\/[^/]+/, "")
        .replace(/^\/?usb1_1\/Lamha-Storage\/?/i, "")
        .replace(/^usb1_1[\\\/]Lamha-Storage[\\\/]?/i, "")
        .replace(/^[\\\/]+/, "")
        .replace(/\//g, "\\")

      // 1. Probar ruta UNC SMB directa
      const smbCandidate = path.join("\\\\192.168.11.1\\usb1_1\\Lamha-Storage", cleanRel)
      if (fs.existsSync(smbCandidate)) {
        if (fs.statSync(smbCandidate).isDirectory()) {
          await shell.openPath(smbCandidate)
        } else {
          shell.showItemInFolder(smbCandidate)
        }
        return { success: true }
      }

      // 2. Probar URL FTP directa en explorer.exe
      let cleanUrlPart = cleanRel.replace(/\\/g, "/")
      if (/\.[a-zA-Z0-9]{2,5}$/.test(cleanUrlPart)) {
        cleanUrlPart = cleanUrlPart.substring(0, cleanUrlPart.lastIndexOf("/"))
      }
      const ftpUrl = `ftp://192.168.11.1/usb1_1/Lamha-Storage/${cleanUrlPart}`
      spawn("explorer.exe", [ftpUrl], { detached: true, stdio: "ignore" }).unref()
      return { success: true }
    }

    // B) MODO LOCAL (SSD): Resolver en disco C:\Lamha-Storage y unidades secundarias
    // 1. Si la ruta ya es absoluta y existe
    if (path.isAbsolute(targetPath) && fs.existsSync(targetPath)) {
      const stat = fs.statSync(targetPath)
      if (stat.isDirectory()) {
        await shell.openPath(targetPath)
      } else {
        shell.showItemInFolder(targetPath)
      }
      return { success: true }
    }

    // 2. Limpiar ruta quitando prefijos de NAS o URLs relativas
    const cleanRel = targetPath
      .replace(/^ftp:\/\/[^/]+/, "")
      .replace(/^\/?usb1_1\/Lamha-Storage\/?/i, "")
      .replace(/^usb1_1[\\\/]Lamha-Storage[\\\/]?/i, "")
      .replace(/^[\\\/]+/, "")
      .replace(/\//g, "\\")

    // 3. Probar en C:\Lamha-Storage y unidades D:, E:, F:, G:
    const drives = ["C", "D", "E", "F", "G"]
    for (const drive of drives) {
      const candidate = path.join(`${drive}:\\Lamha-Storage`, cleanRel)
      if (fs.existsSync(candidate)) {
        const stat = fs.statSync(candidate)
        if (stat.isDirectory()) {
          await shell.openPath(candidate)
        } else {
          shell.showItemInFolder(candidate)
        }
        return { success: true, resolvedPath: candidate }
      }

      // Probar si existe la carpeta contenedora
      const candidateDir = path.dirname(candidate)
      if (fs.existsSync(candidateDir)) {
        await shell.openPath(candidateDir)
        return { success: true, resolvedPath: candidateDir }
      }
    }

    // 4. Probar abriendo la carpeta raíz del proyecto
    const projectFolder = cleanRel.split("\\")[0]
    if (projectFolder) {
      for (const drive of drives) {
        const candidateProj = path.join(`${drive}:\\Lamha-Storage`, projectFolder)
        if (fs.existsSync(candidateProj)) {
          await shell.openPath(candidateProj)
          return { success: true, resolvedPath: candidateProj }
        }
      }
    }

    // 5. Fallback general: Abrir C:\Lamha-Storage
    const defaultRoot = "C:\\Lamha-Storage"
    if (fs.existsSync(defaultRoot)) {
      await shell.openPath(defaultRoot)
      return { success: true, message: "Abierta raíz C:\\Lamha-Storage" }
    }

    return { success: false, error: `No se encontró la ruta: ${targetPath}` }
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

// Función auxiliar para localizar la carpeta del proyecto en Windows
function resolveLocalProjectFolder(folderName) {
  if (!folderName) return null
  const letters = ["C", "D", "E", "F", "G", "H", "I", "J", "K"]
  for (const letter of letters) {
    const candidate1 = path.join(`${letter}:\\Lamha-Storage`, folderName)
    if (fs.existsSync(candidate1)) return candidate1
    const candidate2 = path.join(`${letter}:\\`, folderName)
    if (fs.existsSync(candidate2)) return candidate2
  }
  return path.join("C:\\Lamha-Storage", folderName)
}

// 7. Escanear estado y archivos de un proyecto local (C:\Lamha-Storage\<folder>)
ipcMain.handle("scan-project-storage", async (_event, folderName) => {
  if (!folderName) return { exists: false, error: "Nombre de carpeta no especificado" }
  try {
    const dirPath = resolveLocalProjectFolder(folderName)
    if (!fs.existsSync(dirPath)) {
      return {
        exists: false,
        path: dirPath,
        filesCount: 0,
        totalSizeBytes: 0,
        sizeMB: 0,
        sizeGB: 0,
        subfolders: []
      }
    }

    let filesCount = 0
    let totalSizeBytes = 0
    const subfoldersMap = {}

    function walk(current, relSub) {
      let entries = []
      try {
        entries = fs.readdirSync(current, { withFileTypes: true })
      } catch { return }

      for (const entry of entries) {
        if (entry.name.startsWith(".")) continue
        const full = path.join(current, entry.name)
        const rel = relSub ? `${relSub}/${entry.name}` : entry.name

        if (entry.isDirectory()) {
          walk(full, rel)
        } else if (entry.isFile()) {
          try {
            const st = fs.statSync(full)
            filesCount++
            totalSizeBytes += st.size
            const topFolder = relSub ? relSub.split("/")[0] : "Raíz"
            if (!subfoldersMap[topFolder]) {
              subfoldersMap[topFolder] = { name: topFolder, localCount: 0, localSizeBytes: 0 }
            }
            subfoldersMap[topFolder].localCount++
            subfoldersMap[topFolder].localSizeBytes += st.size
          } catch {}
        }
      }
    }

    walk(dirPath, "")

    const subfolders = Object.values(subfoldersMap).map(s => ({
      name: s.name,
      localCount: s.localCount,
      localSizeMB: Number((s.localSizeBytes / (1024 * 1024)).toFixed(1)),
      nasCount: 0,
      isSynced: false,
    }))

    const sizeMB = Number((totalSizeBytes / (1024 * 1024)).toFixed(1))
    const sizeGB = Number((totalSizeBytes / (1024 * 1024 * 1024)).toFixed(2))

    return {
      exists: true,
      path: dirPath,
      filesCount,
      totalSizeBytes,
      sizeMB,
      sizeGB,
      subfolders,
    }
  } catch (err) {
    return { exists: false, error: err.message }
  }
})

// 8. Listar archivos de una subcarpeta local de un proyecto
ipcMain.handle("list-project-subfolder", async (_event, folderName, subfolderName = "") => {
  if (!folderName) return []
  try {
    const root = resolveLocalProjectFolder(folderName)
    const targetDir = subfolderName ? path.join(root, subfolderName.replace(/\//g, "\\")) : root
    if (!fs.existsSync(targetDir)) return []

    const entries = fs.readdirSync(targetDir, { withFileTypes: true })
    const photoExts = new Set([".cr2", ".cr3", ".nef", ".arw", ".dng", ".raf", ".orf", ".rw2", ".jpg", ".jpeg", ".png", ".webp"])
    const videoExts = new Set([".mp4", ".mov", ".mkv", ".braw", ".prores", ".avi"])

    return entries
      .filter(e => !e.name.startsWith("."))
      .map(entry => {
        const full = path.join(targetDir, entry.name)
        let size = null
        let modified = null
        try {
          const st = fs.statSync(full)
          size = st.size
          modified = st.mtime.toISOString()
        } catch {}

        const ext = path.extname(entry.name).toLowerCase()
        let mediaType = "other"
        if (entry.isDirectory()) mediaType = "directory"
        else if (photoExts.has(ext)) mediaType = "photo"
        else if (videoExts.has(ext)) mediaType = "video"

        return {
          name: entry.name,
          isDirectory: entry.isDirectory(),
          size,
          modified,
          mediaType,
        }
      })
  } catch {
    return []
  }
})

// 9. Crear carpetas estructuradas de proyecto en C:\Lamha-Storage\<folder>
ipcMain.handle("create-project-folders", async (_event, folderName) => {
  if (!folderName) return { success: false, error: "Nombre vacío" }
  const root = path.join("C:\\Lamha-Storage", folderName)
  const subdirs = [
    "01_RAW\\Fotos",
    "01_RAW\\Videos",
    "02_Seleccion_Cliente",
    "03_Edicion_Master",
    "04_Entregas_Finales"
  ]
  try {
    if (!fs.existsSync(root)) fs.mkdirSync(root, { recursive: true })
    for (const sub of subdirs) {
      const full = path.join(root, sub)
      if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true })
    }
    return { success: true, path: root }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// 10. Comprobar conectividad local con NAS (IP/puerto)
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

// 11. Iniciar o comunicar con Ingest Companion
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
