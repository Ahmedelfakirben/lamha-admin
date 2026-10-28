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
const { WindowsDriveWatcher, MasterFolderWatcher } = require("./watcher")
const { getConfig, getPublicSettings, updateSettings } = require("./config")
const { LamhaBridgeServer } = require("./bridge-server")
const { NasSyncManager } = require("./nas-sync-manager")
const engine = require("./ingest-engine")

let mainWindow = null
let miniWindow = null
let miniCloseTimer = null
let systemTray = null
let driveWatcher = null
let masterWatcher = null
let nasSyncManager = null
let bridgeServer = null
let currentLanguage = "fr"
let hasShownMinimizeBalloon = false
let lastIngestState = null // último evento relevante, para pintar la mini ventana al abrirse

logToFile("--- INICIANDO PROCESO ELECTRON (PID:", process.pid, ") ---")

// Asigna AppUserModelId único para que Windows registre el icono oficial en la barra de tareas
app.setAppUserModelId("ma.lam7a.studios.ingest")

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

const SD_READY_TEXT = {
  fr: (n) => ["Carte SD prête à être retirée", `Copie SSD terminée (${n} fichiers). Synchronisation Cloud & NAS en arrière-plan...`],
  es: (n) => ["Tarjeta SD lista para retirar", `Copia en SSD completada (${n} archivos). Sincronizando Nube y NAS en segundo plano...`],
  en: (n) => ["SD Card Safe to Remove", `SSD copy finished (${n} files). Syncing Cloud & NAS in background...`],
  ar: (n) => ["يمكنك إزالة بطاقة SD الآن", `اكتمل النسخ إلى SSD (${n} ملفًا). جارٍ مزامنة السحابة و NAS في الخلفية...`],
}

const MASTER_NOTIFY_TEXT = {
  fr: (f, p) => ["Synchronisation Édition Master terminée", `${f} synchronisé avec Supabase et le NAS (${p}).`],
  es: (f, p) => ["Sincronización Edición Master completada", `${f} sincronizado con Supabase y el NAS (${p}).`],
  en: (f, p) => ["Master Edition Sync Complete", `${f} synced to Supabase and NAS (${p}).`],
  ar: (f, p) => ["اكتملت مزامنة نسخة ماستر", `تمت مزامنة ${f} مع Supabase و NAS (${p}).`],
}

const NAS_PENDING_NOTIFY = {
  fr: (n, gb) => ["Fichiers non synchronisés détectés", `${n} fichiers (${gb} Go) en attente de synchronisation vers le NAS. Cliquez pour confirmer.`],
  es: (n, gb) => ["Archivos pendientes de sincronizar", `Se detectaron ${n} archivos (${gb} GB) sin sincronizar en el NAS. Haz clic para confirmar.`],
  en: (n, gb) => ["Unsynced Files Detected", `${n} files (${gb} GB) are waiting to be synced to the NAS. Click to confirm.`],
  ar: (n, gb) => ["تم اكتشاف ملفات غير متزامنة", `يوجد ${n} ملفًا (${gb} غيغابايت) بانتظار المزامنة مع NAS. اضغط للتأكيد.`],
}

const NAS_SYNC_DONE_NOTIFY = {
  fr: (n, mb) => ["Synchronisation NAS terminée", `${n} fichiers (${mb} Mo) ont été copiés vers le NAS de l'Atelier.`],
  es: (n, mb) => ["Sincronización con NAS completada", `${n} archivos (${mb} MB) se han copiado al NAS del Estudio.`],
  en: (n, mb) => ["NAS Synchronization Complete", `${n} files (${mb} MB) have been copied to the Studio NAS.`],
  ar: (n, mb) => ["اكتملت مزامنة NAS", `تم نسخ ${n} ملفًا (${mb} ميغابايت) إلى خادم NAS.`],
}

// ---------------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------------
app.whenReady().then(() => {
  const initialCfg = getConfig()
  // Respetar preferencia de inicio automático con Windows en entorno empaquetado de producción
  if (!process.defaultApp) {
    try {
      app.setLoginItemSettings({ openAtLogin: initialCfg.openAtLogin !== false })
    } catch {}
  }

  currentLanguage = initialCfg.language || "fr"
  createWindow()

  nasSyncManager = new NasSyncManager()

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
    onNasSyncAction: (act) => {
      if (!nasSyncManager || !act) return
      if (act.action === "enable") nasSyncManager.setEnabled(true)
      else if (act.action === "disable") nasSyncManager.setEnabled(false)
      else if (act.action === "pause") nasSyncManager.pauseForHours(act.hours || 2)
      else if (act.action === "resume") nasSyncManager.resume()
      else if (act.action === "scan") {
        showMain()
        nasSyncManager.scanForPending({ triggerPrompt: true }).catch(() => {})
      }
    },
  })
  systemTray.init()
  systemTray.setNasSyncState(nasSyncManager.getState())

  nasSyncManager.on("state-changed", (st) => {
    if (systemTray) systemTray.setNasSyncState(st)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("nas-sync-state", st)
    }
  })

  nasSyncManager.on("pending-detected", (summary) => {
    logToFile("[NAS_SYNC] Archivos pendientes detectados:", summary.totalFiles, "peso GB:", summary.totalGb)
    showMain()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("nas-pending-prompt", summary)
    }
    const lang = getConfig().language || currentLanguage || "fr"
    const fn = NAS_PENDING_NOTIFY[lang] || NAS_PENDING_NOTIFY.fr
    const [title, body] = fn(summary.totalFiles, summary.totalGb)
    notify(title, body)
  })

  nasSyncManager.on("sync-progress", (ev) => {
    showMini()
    broadcastIngest(ev)
  })

  nasSyncManager.on("sync-completed", (summary) => {
    const lang = getConfig().language || currentLanguage || "fr"
    const fn = NAS_SYNC_DONE_NOTIFY[lang] || NAS_SYNC_DONE_NOTIFY.fr
    const [title, body] = fn(summary.files || 0, summary.mb || 0)
    notify(title, body)
    miniCloseTimer = setTimeout(closeMini, 15000)
  })

  nasSyncManager.start()

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

  // Observador de archivos en 03_Edicion_Master con cola inteligente por lotes
  masterWatcher = new MasterFolderWatcher()
  masterWatcher.on("master-file-added", (item) => {
    // Si la sincronización automática está desactivada o en pausa, posponer hasta reanudación
    if (nasSyncManager && !nasSyncManager.isActive()) {
      logToFile("[MASTER_WATCHER] Sincronización en pausa/desactivada, omitiendo auto-sync inmediato:", item.filePath)
      return
    }
    logToFile("[MASTER_WATCHER] Archivo detectado en 03_Edicion_Master:", item.filePath)
    showMini()
    engine.enqueueMasterFile(
      item,
      (ev) => {
        broadcastIngest(ev)
      },
      (summary) => {
        const cfg = getConfig()
        const lang = cfg.language || currentLanguage || "fr"
        const notifyFn = MASTER_NOTIFY_TEXT[lang] || MASTER_NOTIFY_TEXT.fr
        const label =
          summary.count > 1
            ? lang === "fr"
              ? `${summary.count} fichiers Master`
              : lang === "en"
              ? `${summary.count} Master files`
              : lang === "ar"
              ? `${summary.count} ملفات ماستر`
              : `${summary.count} archivos Master`
            : summary.fileName
        const [title, body] = notifyFn(label, summary.client || item.projectFolder)
        notify(title, body)
        miniCloseTimer = setTimeout(closeMini, 15000)
      }
    )
  })
  masterWatcher.start()

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

  // --- IPC: ajustes y salud del sistema ------------------------------------
  ipcMain.handle("get-settings", () => getPublicSettings())
  ipcMain.handle("save-settings", (_e, data) => {
    const res = updateSettings(data || {})
    if (data && data.openAtLogin !== undefined && !process.defaultApp) {
      try {
        app.setLoginItemSettings({ openAtLogin: Boolean(data.openAtLogin) })
      } catch {}
    }
    return res
  })

  ipcMain.handle("get-system-health", async () => {
    const cfg = getConfig()
    let ssdFreeGb = null
    let ssdTotalGb = null
    let ssdUsedPct = null
    try {
      const targetRoot = path.parse(cfg.ssdPath || "C:\\").root || "C:\\"
      if (typeof fs.statfsSync === "function") {
        const st = fs.statfsSync(targetRoot)
        const freeBytes = st.bavail * st.bsize
        const totalBytes = st.blocks * st.bsize
        ssdFreeGb = Number((freeBytes / 1024 ** 3).toFixed(1))
        ssdTotalGb = Number((totalBytes / 1024 ** 3).toFixed(1))
        ssdUsedPct = totalBytes > 0 ? Math.round(((totalBytes - freeBytes) / totalBytes) * 100) : 0
      }
    } catch {}

    let nasOnline = false
    if (cfg.nasHost) {
      nasOnline = await new Promise((resolve) => {
        const net = require("net")
        const sock = new net.Socket()
        let settled = false
        const done = (val) => {
          if (settled) return
          settled = true
          try {
            sock.destroy()
          } catch {}
          resolve(val)
        }
        sock.setTimeout(1800)
        sock.once("connect", () => done(true))
        sock.once("timeout", () => done(false))
        sock.once("error", () => done(false))
        try {
          sock.connect(21, cfg.nasHost)
        } catch {
          done(false)
        }
      })
    }

    const retryItems = engine.getRetryQueue ? engine.getRetryQueue() : []
    return {
      ssdPath: cfg.ssdPath || "C:\\Lamha-Storage",
      ssdFreeGb,
      ssdTotalGb,
      ssdUsedPct,
      nasHost: cfg.nasHost || "192.168.11.1",
      nasOnline,
      retryCount: retryItems.length,
    }
  })

  ipcMain.handle("eject-drive", async (_e, drivePath) => {
    try {
      const root = path.parse(String(drivePath || "D:\\")).root.replace(/\\+$/, "")
      if (!root || root.toUpperCase() === "C:") {
        return { ok: false, error: "SYSTEM_DRIVE" }
      }
      const { execFile } = require("child_process")
      await new Promise((resolve) => {
        execFile(
          "powershell.exe",
          [
            "-NoProfile",
            "-Command",
            `$Eject = New-Object -ComObject Shell.Application; $Vol = $Eject.NameSpace(17).ParseName('${root}'); if ($Vol) { $Vol.InvokeVerb('Eject') }`,
          ],
          { timeout: 5000 },
          () => resolve()
        )
      })
      return { ok: true, drive: root }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  })

  // --- IPC: autenticación y proyectos reales --------------------------------
  ipcMain.handle("auth-status", () => engine.getAuthStatus())
  ipcMain.handle("auth-login", (_e, email, password) => engine.login(email, password))
  ipcMain.handle("auth-logout", () => engine.logout())
  ipcMain.handle("get-sessions", () => engine.listSessions())
  ipcMain.handle("create-session", (_e, payload) => engine.createQuickSession(payload || {}))
  ipcMain.handle("get-ingest-history", () => engine.getIngestHistory())
  ipcMain.handle("get-retry-queue", () => engine.getRetryQueue())
  ipcMain.handle("run-retry-queue", async () => {
    if (!nasSyncManager) return { ok: false }
    const queue = engine.getRetryQueue().filter((it) => it && it.fullPath && fs.existsSync(it.fullPath))
    if (queue.length === 0) {
      engine.clearRetryQueue()
      return { ok: true, synced: 0 }
    }
    showMini()
    const res = await nasSyncManager.syncFilesList(queue, { force: true })
    if (res && res.ok && (!res.summary || res.summary.failed === 0)) {
      engine.clearRetryQueue()
    }
    return res
  })

  // --- IPC: reciclaje inteligente de carpetas locales (verificado por NAS) --
  ipcMain.handle("recycle-scan-projects", async (_e, checkLive = false) => {
    if (!nasSyncManager) return { ok: false, projects: [] }
    let sessions = []
    try {
      const sessRes = await engine.listSessions()
      if (sessRes && sessRes.ok && Array.isArray(sessRes.sessions)) {
        sessions = sessRes.sessions
      }
    } catch {}
    return nasSyncManager.scanLocalProjectsForRecycle(sessions, Boolean(checkLive))
  })

  ipcMain.handle("recycle-projects", async (_e, folders) => {
    if (!nasSyncManager) return { ok: false, error: "NO_SYNC_MANAGER" }
    const res = await nasSyncManager.verifyAndRecycleProjects(folders)
    if (res && res.ok && res.recycledCount > 0) {
      engine.addHistoryEntry({
        type: "recycle",
        client: res.recycledProjects.join(", "),
        folderName: `${res.recycledCount} proyecto(s) reciclados`,
        files: res.syncedBeforeRecycle || 0,
        mb: res.freedMb || 0,
        freedGb: res.freedGb || 0,
      })
    }
    return res
  })

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
  ipcMain.handle("cancel-ingest", () => {
    if (nasSyncManager) nasSyncManager.cancelCurrentSync()
    return engine.cancelIngest()
  })

  // --- IPC: sincronización automática unidireccional Local -> NAS -----------
  ipcMain.handle("nas-sync-get-state", () => (nasSyncManager ? nasSyncManager.getState() : {}))
  ipcMain.handle("nas-sync-set-enabled", (_e, enabled) => (nasSyncManager ? nasSyncManager.setEnabled(enabled) : {}))
  ipcMain.handle("nas-sync-pause", (_e, hours) => (nasSyncManager ? nasSyncManager.pauseForHours(hours) : {}))
  ipcMain.handle("nas-sync-resume", () => (nasSyncManager ? nasSyncManager.resume() : {}))
  ipcMain.handle("nas-sync-scan", async () => (nasSyncManager ? nasSyncManager.scanForPending({ triggerPrompt: true }) : null))
  ipcMain.handle("nas-sync-accept", async () => {
    if (!nasSyncManager) return { ok: false }
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize()
    showMini()
    return nasSyncManager.acceptPendingSync()
  })
  ipcMain.handle("nas-sync-dismiss", () => (nasSyncManager ? nasSyncManager.dismissPendingPrompt() : { ok: true }))

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
    if (ev.type === "sd-ready") {
      const [title, body] = (SD_READY_TEXT[currentLanguage] || SD_READY_TEXT.fr)(ev.files || 0)
      notify(title, body)
    } else if (ev.type === "done" && !ev.empty) {
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
  if (masterWatcher) masterWatcher.stop()
  if (nasSyncManager) nasSyncManager.stop()
  if (systemTray) systemTray.destroy()
})

app.on("window-all-closed", () => {
  // Se mantiene vivo en la bandeja del sistema de Windows
})

