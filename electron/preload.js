const { contextBridge, ipcRenderer } = require("electron")

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

  // Idioma / sistema / tema
  notifyLanguageChange: (lang) => ipcRenderer.send("language-changed", lang),
  notifyThemeChange: (theme) => ipcRenderer.send("theme-changed", theme),
  openPath: (p) => ipcRenderer.send("open-path", p),
  openExternal: (url) => ipcRenderer.send("open-external", url),
  selectFolder: () => ipcRenderer.invoke("select-folder"),
  scanSource: (p) => ipcRenderer.invoke("scan-source", p),
  getDrives: () => ipcRenderer.invoke("get-drives"),

  // Ajustes
  getSettings: () => ipcRenderer.invoke("get-settings"),
  saveSettings: (settings) => ipcRenderer.invoke("save-settings", settings),

  // Autenticación y proyectos reales de Supabase
  authStatus: () => ipcRenderer.invoke("auth-status"),
  login: (email, password) => ipcRenderer.invoke("auth-login", email, password),
  logout: () => ipcRenderer.invoke("auth-logout"),
  getSessions: () => ipcRenderer.invoke("get-sessions"),

  // Ingesta
  startIngest: (params) => ipcRenderer.invoke("start-ingest", params),
  cancelIngest: () => ipcRenderer.invoke("cancel-ingest"),

  // Mini ventana
  miniExpand: () => ipcRenderer.send("mini-expand"),
  miniClose: () => ipcRenderer.send("mini-close"),
  miniGetState: () => ipcRenderer.invoke("mini-get-state"),
})
