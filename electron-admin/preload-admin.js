const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("desktopAdminAPI", {
  isElectron: true,
  isDesktopAdmin: true,
  selectFolder: (options) => ipcRenderer.invoke("select-folder", options),
  selectFile: (options) => ipcRenderer.invoke("select-file", options),
  openLocalPath: (targetPath) => ipcRenderer.invoke("open-local-path", targetPath),
  revealItemInFolder: (targetPath) => ipcRenderer.invoke("reveal-item", targetPath),
  getActiveCards: () => ipcRenderer.invoke("get-active-cards"),
  checkLocalPath: (targetPath) => ipcRenderer.invoke("check-local-path", targetPath),
  checkNasConnection: (host) => ipcRenderer.invoke("check-nas-connection", host),
  launchIngestCompanion: (params) => ipcRenderer.invoke("launch-ingest-companion", params),
  retry: () => ipcRenderer.send("retry-connect"),
  connectTo: (targetUrl) => ipcRenderer.send("connect-to-url", targetUrl),
  getServerStatus: () => ipcRenderer.invoke("get-server-status"),
})
