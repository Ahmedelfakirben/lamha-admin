// Delegar al Panel Administrador si se ejecuta desde el ejecutable del panel o con la variable de entorno
if (process.env.LAMHA_APP === "admin" || (process.execPath && process.execPath.toLowerCase().includes("panel administrador"))) {
  require("../electron-admin/main-admin.js")
  return
}

const { app, BrowserWindow, ipcMain, shell, dialog, screen, Notification, nativeImage } = require("electron")
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
const { LamhaBridgeServer } = require("./bridge-server")
const engine = require("./ingest-engine")

let mainWindow = null
let miniWindow = null
let miniCloseTimer = null
let systemTray = null
let driveWatcher = null
let bridgeServer = null
let currentLanguage = "fr"
let hasShownMinimizeBalloon = false
let lastIngestState = null // último evento relevante, para pintar la mini ventana al abrirse

logToFile("--- INICIANDO PROCESO ELECTRON (PID:", process.pid, ") ---")

// Asigna AppUserModelId para que Windows use el icono oficial en la barra de tareas
app.setAppUserModelId("com.lamhastudios.atelier")

// Registrar protocolo lamha:// para permitir lanzamientos directos desde la web
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient("lamha", process.execPath, [path.resolve(process.argv[1])])
  }
} else {
  app.setAsDefaultProtocolClient("lamha")
}

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  logToFile("NO SE OBTUVO EL LOCK (YA HAY OTRA INSTANCIA EJECUTANDOSE). DESPERTANDO INSTANCIA EXISTENTE...")
  try {
    const http = require("http")
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: 41890,
        path: "/show",
        method: "POST",
        timeout: 1500,
      },
      () => {
        app.exit(0)
      }
    )
    req.on("error", () => {
      app.exit(0)
    })
    req.end()
  } catch {
    app.exit(0)
  }
  return
} else {
  logToFile("LOCK OBTENIDO CON EXITO.")
}

app.on("second-instance", (_event, commandLine) => {
  logToFile("SEGUNDA INSTANCIA DETECTADA ->", JSON.stringify(commandLine))
  const protocolUrl = commandLine ? commandLine.find((arg) => typeof arg === "string" && arg.startsWith("lamha://")) : null
  if (protocolUrl) {
    handleProtocolUrl(protocolUrl)
  } else {
    showMain()
  }
})

function handleProtocolUrl(rawUrl) {
  logToFile("MANEJANDO URL DE PROTOCOLO:", rawUrl)
  try {
    const parsed = new URL(rawUrl)
    const sessionId = parsed.searchParams.get("session_id") || parsed.searchParams.get("sessionId")
    const clientName = parsed.searchParams.get("client_name") || parsed.searchParams.get("clientName")
    const sourcePath = parsed.searchParams.get("source_path") || parsed.searchParams.get("sourcePath")
    const auto = parsed.searchParams.get("auto") === "true"

    if (sessionId && auto) {
      triggerIngestWorkflow({ sessionId, clientName, sourcePath })
    } else {
      showMain()
      if (mainWindow && !mainWindow.isDestroyed() && sessionId) {
        mainWindow.webContents.send("prefill-session", { sessionId, clientName, sourcePath })
      }
    }
  } catch (e) {
    logToFile("ERROR PARSEANDO PROTOCOLO:", e.message)
    showMain()
  }
}

function showMain() {
  logToFile("showMain() invocado -> Mostrando y enfocando ventana principal.")
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow()
    return
  }
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.restore()
  mainWindow.setAlwaysOnTop(true)
  mainWindow.focus()
  mainWindow.moveTop()
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setAlwaysOnTop(false)
      mainWindow.focus()
    }
  }, 150)
}

// ---------------------------------------------------------------------------
// Ventana principal
// ---------------------------------------------------------------------------
function createWindow() {
  const cfg = getConfig()
  const isLight = cfg.theme === "light"
  let iconPath = path.join(__dirname, "assets", "icon.ico")
  if (!fs.existsSync(iconPath)) {
    iconPath = path.join(__dirname, "assets", "icon.png")
  }
  const appIcon = nativeImage.createFromPath(iconPath)

  mainWindow = new BrowserWindow({
    width: 1140,
    height: 800,
    minWidth: 980,
    minHeight: 680,
    title: "Lam7a Studios Atelier - Ingest Companion",
    backgroundColor: isLight ? "#faf8f5" : "#12100e",
    icon: !appIcon.isEmpty() ? appIcon : iconPath,
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
  if (!appIcon.isEmpty()) {
    mainWindow.setIcon(appIcon)
  }

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
  let iconPath = path.join(__dirname, "assets", "icon.ico")
  if (!fs.existsSync(iconPath)) {
    iconPath = path.join(__dirname, "assets", "icon.png")
  }
  const appIcon = nativeImage.createFromPath(iconPath)
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
    icon: !appIcon.isEmpty() ? appIcon : iconPath,
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

  // --- Iniciar Servidor de Enlace Local (Web ↔ Desktop) ---------------------
  bridgeServer = new LamhaBridgeServer({
    onStartIngest: (params) => triggerIngestWorkflow(params),
    onShowMain: () => showMain(),
    getStatus: () => ({
      isIngesting: Boolean(lastIngestState && lastIngestState.type !== "done" && lastIngestState.type !== "error"),
      lastProgress: lastIngestState,
      language: currentLanguage,
    }),
    getCards: () => (driveWatcher ? driveWatcher.getActiveCards() : []),
  })
  bridgeServer.start()

  // Comprobar si se arrancó directamente con URL de protocolo lamha://
  const coldProtocolUrl = process.argv.find((arg) => typeof arg === "string" && arg.startsWith("lamha://"))
  if (coldProtocolUrl) {
    setTimeout(() => handleProtocolUrl(coldProtocolUrl), 600)
  }

  // --- IPC: ingesta ---------------------------------------------------------
  ipcMain.handle("start-ingest", async (_e, params) => {
    return triggerIngestWorkflow(params)
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

async function triggerIngestWorkflow(params) {
  lastIngestState = null
  // La app se minimiza y aparece la mini ventana con el progreso en la esquina derecha
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize()
  showMini()

  // Si no se proporcionó tarjeta fuente, intentar seleccionar la activa detectada
  if (!params.sourcePath && driveWatcher) {
    const cards = driveWatcher.getActiveCards()
    if (cards && cards.length > 0) {
      params.sourcePath = cards[0].dcimPath || cards[0].drive
    }
  }

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
}

app.on("before-quit", () => {
  app.isQuitting = true
  if (bridgeServer) bridgeServer.stop()
  if (driveWatcher) driveWatcher.stop()
  if (systemTray) systemTray.destroy()
})

app.on("window-all-closed", () => {
  // Se mantiene vivo en la bandeja del sistema de Windows
})

