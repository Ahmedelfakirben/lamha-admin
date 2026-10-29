const { contextBridge, ipcRenderer, webUtils } = require("electron")

const on = (channel) => (callback) => {
  const handler = (_event, value) => callback(value)
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,

  // Eventos
  onCardDetected: on("card-detected"),
  onCardRemoved: on("card-removed"),
  onLanguageChanged: on("language-changed"),
  onIngestEvent: on("ingest-event"),
  onPrefillSession: on("prefill-session"),
  onNasSyncState: on("nas-sync-state"),
  onNasPendingPrompt: on("nas-pending-prompt"),

  // Idioma / sistema / tema
  notifyLanguageChange: (lang) => ipcRenderer.send("language-changed", lang),
  notifyThemeChange: (theme) => ipcRenderer.send("theme-changed", theme),
  openPath: (p) => ipcRenderer.send("open-path", p),
  openExternal: (url) => ipcRenderer.send("open-external", url),
  selectFolder: () => ipcRenderer.invoke("select-folder"),
  scanSource: (p) => ipcRenderer.invoke("scan-source", p),
  getDrives: () => ipcRenderer.invoke("get-drives"),
  ejectDrive: (drivePath) => ipcRenderer.invoke("eject-drive", drivePath),
  getSystemHealth: () => ipcRenderer.invoke("get-system-health"),
  getPathForFile: (file) => {
    try {
      if (webUtils && typeof webUtils.getPathForFile === "function") {
        return webUtils.getPathForFile(file)
      }
    } catch {}
    return file && file.path ? file.path : ""
  },

  // Ajustes
  getSettings: () => ipcRenderer.invoke("get-settings"),
  saveSettings: (settings) => ipcRenderer.invoke("save-settings", settings),

  // Autenticación y proyectos reales de Supabase
  authStatus: () => ipcRenderer.invoke("auth-status"),
  login: (email, password) => ipcRenderer.invoke("auth-login", email, password),
  logout: () => ipcRenderer.invoke("auth-logout"),
  getSessions: () => ipcRenderer.invoke("get-sessions"),
  createSession: (payload) => ipcRenderer.invoke("create-session", payload),

  // Ingesta, Historial y Cola de Reintentos
  startIngest: (params) => ipcRenderer.invoke("start-ingest", params),
  cancelIngest: () => ipcRenderer.invoke("cancel-ingest"),
  getIngestHistory: () => ipcRenderer.invoke("get-ingest-history"),
  getRetryQueue: () => ipcRenderer.invoke("get-retry-queue"),
  runRetryQueue: () => ipcRenderer.invoke("run-retry-queue"),

  // Sincronización Unidireccional Automática Local -> NAS
  getNasSyncState: () => ipcRenderer.invoke("nas-sync-get-state"),
  setNasSyncEnabled: (enabled) => ipcRenderer.invoke("nas-sync-set-enabled", enabled),
  pauseNasSync: (hours) => ipcRenderer.invoke("nas-sync-pause", hours),
  resumeNasSync: () => ipcRenderer.invoke("nas-sync-resume"),
  scanNasPending: () => ipcRenderer.invoke("nas-sync-scan"),
  acceptNasPending: () => ipcRenderer.invoke("nas-sync-accept"),
  dismissNasPending: () => ipcRenderer.invoke("nas-sync-dismiss"),

  // Reciclaje Inteligente de Carpetas Locales (Verificado por NAS)
  scanRecycleProjects: (checkLive = false) => ipcRenderer.invoke("recycle-scan-projects", checkLive),
  recycleProjects: (folders, forceLocalTrash = false) =>
    ipcRenderer.invoke("recycle-projects", folders, Boolean(forceLocalTrash)),

  // Ciclo de vida QNAP
  getRetentionStatus: (force = false) => ipcRenderer.invoke("retention-get-status", Boolean(force)),
  runRetention: (action) => ipcRenderer.invoke("retention-run", action),

  // Mini ventana
  miniExpand: () => ipcRenderer.send("mini-expand"),
  miniClose: () => ipcRenderer.send("mini-close"),
  miniGetState: () => ipcRenderer.invoke("mini-get-state"),
})
