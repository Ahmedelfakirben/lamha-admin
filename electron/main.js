const { app, BrowserWindow, ipcMain, shell, dialog, screen, Notification } = require("electron")
const path = require("path")
const fs = require("fs")

function logToFile(...args) {
  try {
    const line = `[${new Date().toISOString()}] ${args.map((a) => (typeof a === "object" ? JSON.stringify(a) : a)).join(" ")}\n`
    const logPath = path.join(app.getPath("userData"), "app.log")
    fs.appendFileSync(logPath, line, "utf-8")
  } catch {}
  console.log(...args)
}

process.on("uncaughtException", (err) => logToFile("UNCAUGHT_EXCEPTION:", err && err.stack ? err.stack : err))
process.on("unhandledRejection", (err) => logToFile("UNHANDLED_REJECTION:", err && err.stack ? err.stack : err))

const { LamhaSystemTray } = require("./tray")
const { WindowsDriveWatcher } = require("./watcher")
const { getConfig, getPublicSettings, updateSettings } = require("./config")
const engine = require("./ingest-engine")

let mainWindow = null
let miniWindow = null
let miniCloseTimer = null
let systemTray = null
let driveWatcher = null
let currentLanguage = "fr"
let hasShownMinimizeBalloon = false
let lastIngestState = null // último evento relevante, para pintar la mini ventana al abrirse

logToFile("--- INICIANDO PROCESO ELECTRON (PID:", process.pid, ") ---")

// Asigna AppUserModelId para que Windows use el icono oficial en la barra de tareas
app.setAppUserModelId("com.lamhastudios.atelier")

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  logToFile("NO SE OBTUVO EL LOCK (YA HAY OTRA INSTANCIA EJECUTANDOSE). SALIENDO...")
  app.quit()
} else {
  logToFile("LOCK OBTENIDO CON EXITO.")
}

app.on("second-instance", () => {
  logToFile("SEGUNDA INSTANCIA DETECTADA -> MOSTRANDO VENTANA PRINCIPAL.")
  showMain()
})

function showMain() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow()
    return
  }
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.setAlwaysOnTop(true)
  mainWindow.focus()
  mainWindow.setAlwaysOnTop(false)
}

// ---------------------------------------------------------------------------
// Ventana principal
// ---------------------------------------------------------------------------
function createWindow() {
  const cfg = getConfig()
  const isLight = cfg.theme === "light"
  const appIcon = path.join(__dirname, "assets", "icon.ico")
  mainWindow = new BrowserWindow({
    width: 1140,
    height: 800,
    minWidth: 980,
    minHeight: 680,
    title: "Lamha Studios Atelier - Ingest Companion",
    backgroundColor: isLight ? "#faf8f5" : "#12100e",
    icon: appIcon,
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: isLight ? "#f4ede4" : "#171411",
      symbolColor: isLight ? "#8c6428" : "#c69f68",
      height: 48,
    },
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    autoHideMenuBar: true,
    show: true,
  })
  mainWindow.setIcon(appIcon)

  mainWindow.webContents.on("console-message", (_event, _level, message, line, sourceId) => {
    logToFile(`[RENDERER] ${message} (${sourceId}:${line})`)
  })
  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    logToFile(`[DID_FAIL_LOAD] ${errorCode}: ${errorDescription} (${validatedURL})`)
  })

  mainWindow.once("ready-to-show", () => {
    logToFile("EVENTO ready-to-show RECIBIDO -> Mostrando ventana principal.")
    mainWindow.show()
    mainWindow.focus()
  })

  logToFile("CARGANDO ui/index.html...")
  mainWindow.loadFile(path.join(__dirname, "ui", "index.html"))

  mainWindow.on("close", (event) => {
    if (!app.isQuitting) {
      event.preventDefault()
      mainWindow.hide()
      if (!hasShownMinimizeBalloon && systemTray) {
        systemTray.notifyMinimized()
        hasShownMinimizeBalloon = true
      }
    }
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: "deny" }
  })
}

// ---------------------------------------------------------------------------
// Mini ventana de progreso (esquina inferior derecha, siempre visible)
// ---------------------------------------------------------------------------
function showMini() {
  if (miniCloseTimer) {
    clearTimeout(miniCloseTimer)
    miniCloseTimer = null
  }
  if (miniWindow && !miniWindow.isDestroyed()) {
    miniWindow.showInactive()
    return
  }
  const { workArea } = screen.getPrimaryDisplay()
  const w = 372
  const h = 188
  const cfg = getConfig()
  const appIcon = path.join(__dirname, "assets", "icon.ico")
  miniWindow = new BrowserWindow({
    width: w,
    height: h,
    x: workArea.x + workArea.width - w - 16,
    y: workArea.y + workArea.height - h - 16,
    frame: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    icon: appIcon,
    backgroundColor: cfg.theme === "light" ? "#faf8f5" : "#12100e",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  miniWindow.setAlwaysOnTop(true, "screen-saver")
  miniWindow.loadFile(path.join(__dirname, "ui", "mini.html"))
  miniWindow.once("ready-to-show", () => miniWindow && !miniWindow.isDestroyed() && miniWindow.showInactive())
  miniWindow.on("closed", () => {
    miniWindow = null
  })
}

function closeMini() {
  if (miniCloseTimer) {
    clearTimeout(miniCloseTimer)
    miniCloseTimer = null
  }
  if (miniWindow && !miniWindow.isDestroyed()) miniWindow.close()
}

function broadcastIngest(ev) {
  if (ev.type !== "log") lastIngestState = ev
  for (const win of [mainWindow, miniWindow]) {
    if (win && !win.isDestroyed()) win.webContents.send("ingest-event", ev)
  }
}

function notify(title, body) {
  try {
    if (Notification.isSupported()) {
      new Notification({ title, body, icon: path.join(__dirname, "assets", "icon.ico") }).show()
    }
  } catch {}
}

const DONE_TEXT = {
  fr: (c) => ["Ingestion terminée", `Les photos de ${c} sont prêtes.`],
  es: (c) => ["Ingesta completada", `Las fotos de ${c} están listas.`],
  en: (c) => ["Ingestion complete", `${c}'s photos are ready.`],
  ar: (c) => ["اكتمل التفريغ", `صور ${c} جاهزة.`],
}

// ---------------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------------
app.whenReady().then(() => {
  currentLanguage = getConfig().language || "fr"
  createWindow()

  systemTray = new LamhaSystemTray({
    currentLanguage,
    onOpenDashboard: () => showMain(),
    onStartIngest: (cardInfo) => {
      showMain()
      if (mainWindow) mainWindow.webContents.send("card-detected", cardInfo)
    },
    onLanguageChange: (lang) => {
      currentLanguage = lang
      updateSettings({ language: lang })
      for (const win of [mainWindow, miniWindow]) {
        if (win && !win.isDestroyed()) win.webContents.send("language-changed", lang)
      }
    },
  })
  systemTray.init()

  driveWatcher = new WindowsDriveWatcher(2500)
  driveWatcher.on("card-inserted", (cardInfo) => {
    console.log(`[SD_WATCHER] Tarjeta detectada: ${cardInfo.drive} (${cardInfo.count} archivos)`)
    systemTray.setActiveCards(driveWatcher.getActiveCards())
    systemTray.notifyCardInserted(cardInfo)
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send("card-detected", cardInfo)
  })
  driveWatcher.on("card-removed", (cardInfo) => {
    console.log(`[SD_WATCHER] Tarjeta extraída: ${cardInfo.drive}`)
    systemTray.setActiveCards(driveWatcher.getActiveCards())
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send("card-removed", cardInfo)
  })
  driveWatcher.start()

  // --- IPC: sistema ---------------------------------------------------------
  ipcMain.on("language-changed", (_e, lang) => {
    currentLanguage = lang
    updateSettings({ language: lang })
    systemTray.setLanguage(lang)
    if (miniWindow && !miniWindow.isDestroyed()) miniWindow.webContents.send("language-changed", lang)
  })
  ipcMain.on("theme-changed", (_e, theme) => {
    updateSettings({ theme })
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.setTitleBarOverlay) {
      const isLight = theme === "light"
      try {
        mainWindow.setTitleBarOverlay({
          color: isLight ? "#f4ede4" : "#171411",
          symbolColor: isLight ? "#8c6428" : "#c69f68",
        })
      } catch {}
    }
    if (miniWindow && !miniWindow.isDestroyed()) miniWindow.webContents.send("theme-changed", theme)
  })
  ipcMain.on("open-path", (_e, p) => shell.openPath(p))
  ipcMain.on("open-external", (_e, url) => {
    if (typeof url === "string" && /^https?:\/\//i.test(url)) shell.openExternal(url)
  })
  ipcMain.handle("get-drives", () => (driveWatcher ? driveWatcher.getActiveCards() : []))
  ipcMain.handle("select-folder", async () => {
    const res = await dialog.showOpenDialog(mainWindow, { properties: ["openDirectory"] })
    return !res.canceled && res.filePaths.length ? res.filePaths[0] : null
  })
  ipcMain.handle("scan-source", async (_e, p) => {
    try {
      const files = engine.scanSource(p)
      let bytes = 0
      for (const f of files) {
        try {
          bytes += fs.statSync(f).size
        } catch {}
      }
      return { count: files.length, gb: Number((bytes / 1024 ** 3).toFixed(2)) }
    } catch {
      return { count: 0, gb: 0 }
    }
  })

  // --- IPC: ajustes ---------------------------------------------------------
  ipcMain.handle("get-settings", () => getPublicSettings())
  ipcMain.handle("save-settings", (_e, data) => updateSettings(data || {}))

  // --- IPC: autenticación y proyectos reales --------------------------------
  ipcMain.handle("auth-status", () => engine.getAuthStatus())
  ipcMain.handle("auth-login", (_e, email, password) => engine.login(email, password))
  ipcMain.handle("auth-logout", () => engine.logout())
  ipcMain.handle("get-sessions", () => engine.listSessions())

  // --- IPC: ingesta ---------------------------------------------------------
  ipcMain.handle("start-ingest", async (_e, params) => {
    lastIngestState = null
    // La app se minimiza y aparece la mini ventana con el progreso
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize()
    showMini()

    const result = await engine.runIngest({ ...params, lang: currentLanguage }, (ev) => {
      broadcastIngest(ev)
      if (ev.type === "done" && !ev.empty) {
        const [title, body] = (DONE_TEXT[currentLanguage] || DONE_TEXT.fr)(ev.summary?.client || "")
        notify(title, body)
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.flashFrame(true)
        miniCloseTimer = setTimeout(closeMini, 20000)
      } else if (ev.type === "error" || ev.type === "cancelled" || (ev.type === "done" && ev.empty)) {
        miniCloseTimer = setTimeout(closeMini, 8000)
        showMain()
      }
    })
    return result
  })
  ipcMain.handle("cancel-ingest", () => engine.cancelIngest())

  // --- IPC: mini ventana ----------------------------------------------------
  ipcMain.handle("mini-get-state", () => ({ lang: currentLanguage, theme: getConfig().theme, last: lastIngestState }))
  ipcMain.on("mini-expand", () => {
    showMain()
    if (mainWindow) mainWindow.flashFrame(false)
  })
  ipcMain.on("mini-close", () => closeMini())
})

app.on("before-quit", () => {
  app.isQuitting = true
  if (driveWatcher) driveWatcher.stop()
  if (systemTray) systemTray.destroy()
})

app.on("window-all-closed", () => {
  // Se mantiene vivo en la bandeja del sistema de Windows
})
