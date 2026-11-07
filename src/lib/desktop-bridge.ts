"use client"

/**
 * Puente Unificado de Hardware y Escritorio para Lamha Studios
 * Compatible tanto dentro del Ejecutable Nativo Electron (desktopAdminAPI)
 * como desde navegador web mediante el Ingest Companion (:41890)
 */

export interface LocalProjectStorageResult {
  exists: boolean
  path?: string
  localPath?: string
  nasPath?: string
  localExists?: boolean
  nasExists?: boolean
  filesCount: number
  totalSizeBytes: number
  sizeMB: number
  sizeGB: number
  nasFilesCount?: number
  nasTotalSizeBytes?: number
  nasSizeMB?: number
  nasSizeGB?: number
  status?: string
  subfolders: Array<{
    name: string
    localCount: number
    localSizeMB: number
    nasCount: number
    nasSizeMB?: number
    isSynced: boolean
  }>
  error?: string
}

export interface LocalBrowseEntry {
  name: string
  isDirectory: boolean
  size: number | null
  modified: string | null
  mediaType: "photo" | "video" | "other" | "directory"
}

export interface DesktopAdminAPI {
  isElectron: boolean
  isDesktopAdmin: boolean
  selectFolder: (options?: { title?: string; defaultPath?: string }) => Promise<string | null>
  selectFile: (options?: { title?: string; defaultPath?: string; multiple?: boolean; filters?: Array<{ name: string; extensions: string[] }> }) => Promise<string | string[] | null>
  openLocalPath: (targetPath: string, target?: "local" | "nas") => Promise<{ success: boolean; error?: string; resolvedPath?: string }>
  revealItemInFolder: (targetPath: string) => Promise<{ success: boolean; error?: string }>
  getActiveCards: () => Promise<Array<{ letter: string; drive: string; path: string; count: number; detectedAt: number }>>
  checkLocalPath: (targetPath: string) => Promise<{ exists: boolean; isDirectory?: boolean; sizeBytes?: number }>
  scanProjectStorage?: (folderName: string) => Promise<LocalProjectStorageResult>
  listProjectSubfolder?: (folderName: string, subfolderName?: string) => Promise<LocalBrowseEntry[]>
  readProjectFile?: (folderName: string, subfolderName: string, fileName: string) => Promise<Uint8Array | ArrayBuffer | null>
  createProjectFolders?: (folderName: string) => Promise<{ success: boolean; path?: string; error?: string }>
  checkNasConnection: (host?: string, port?: number) => Promise<{ reachable: boolean; host: string; port: number; error?: string }>
  launchIngestCompanion: (params?: { sessionId?: string; clientName?: string; folderName?: string; folder?: string }) => Promise<{ success: boolean; error?: string; method?: string }>
  copyClientSelection?: (params: { folderName: string; filenames: string[] }) => Promise<{ success: boolean; copiedCount?: number; destDir?: string; error?: string }>
  retry?: () => void
}

declare global {
  interface Window {
    desktopAdminAPI?: DesktopAdminAPI
  }
}

/**
 * Abre la herramienta Ingest Companion nativa en el PC con el proyecto seleccionado
 */
export async function triggerIngestCompanion(params: {
  sessionId?: string
  clientName?: string
  folderName?: string
}): Promise<{ success: boolean; error?: string }> {
  if (typeof window !== "undefined" && window.desktopAdminAPI?.launchIngestCompanion) {
    try {
      const res = await window.desktopAdminAPI.launchIngestCompanion(params)
      if (res.success) return res
    } catch (e: any) {
      console.warn("Fallo lanzando Ingest Companion desde desktopAdminAPI:", e)
    }
  }

  // Fallback para navegador web mediante protocolo lamha://
  if (typeof window !== "undefined") {
    try {
      const url = `lamha://ingest?session_id=${encodeURIComponent(params.sessionId || "")}&client_name=${encodeURIComponent(params.clientName || "")}&folder=${encodeURIComponent(params.folderName || "")}&auto=false`
      window.location.href = url
      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  }

  return { success: false, error: "Entorno no compatible" }
}

/**
 * Indica si la aplicación está ejecutándose dentro del .exe del Panel Administrador
 */
export function isDesktopApp(): boolean {
  return typeof window !== "undefined" && Boolean(window.desktopAdminAPI?.isDesktopAdmin)
}

/**
 * Abre una carpeta o archivo directamente en el Explorador de Windows del PC local o en el NAS
 */
export async function openLocalFolderOrFile(
  targetPath: string,
  mode: "reveal" | "open" = "reveal",
  target: "local" | "nas" = "local"
): Promise<{ success: boolean; message?: string; resolvedPath?: string }> {
  if (!targetPath) return { success: false, message: "Ruta vacía" }

  // 1. Prioridad: Puente nativo directo de la App de Escritorio Electron
  if (typeof window !== "undefined" && window.desktopAdminAPI?.openLocalPath) {
    try {
      const res = await window.desktopAdminAPI.openLocalPath(targetPath, target)
      if (res.success) {
        return { 
          success: true, 
          message: target === "nas" ? "Abierto en NAS (Explorador)" : "Abierto en el Explorador de Windows",
          resolvedPath: res.resolvedPath 
        }
      }
    } catch (e) {
      console.warn("Fallo en desktopAdminAPI.openLocalPath:", e)
    }
  }

  // 2. Puente HTTP local del Ingest Companion (:41890) o Admin Bridge (:41891)
  for (const port of [41890, 41891]) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 1200)
      const res = await fetch(`http://127.0.0.1:${port}/open`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: targetPath, mode, target }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      if (res.ok) {
        const data = await res.json()
        if (data.ok) {
          return { success: true, message: data.message || "Abierto en el Explorador de Windows", resolvedPath: data.path }
        }
      }
    } catch {}
  }

  // 3. Fallback: Servidor local (si está en desarrollo en localhost)
  try {
    const res = await fetch("/api/media/open-file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filePath: targetPath, mode }),
    })
    const data = await res.json()
    if (res.ok && data.success) {
      return { success: true, message: data.message || "Ubicación abierta" }
    }
  } catch {}

  return { success: false, message: "No se pudo abrir la ruta local" }
}

/**
 * Muestra el cuadro de diálogo nativo de Windows para seleccionar una carpeta
 */
export async function selectNativeFolder(title?: string): Promise<string | null> {
  if (typeof window !== "undefined" && window.desktopAdminAPI?.selectFolder) {
    try {
      const folderPath = await window.desktopAdminAPI.selectFolder({ title })
      return folderPath || null
    } catch (e) {
      console.warn("Fallo en desktopAdminAPI.selectFolder:", e)
    }
  }
  return null
}

/**
 * Obtiene las tarjetas SD o cámaras conectadas físicamente al PC
 */
export async function getConnectedCards(): Promise<Array<{ letter: string; drive: string; path: string; count: number }>> {
  // 1. Desde la App de Escritorio
  if (typeof window !== "undefined" && window.desktopAdminAPI?.getActiveCards) {
    try {
      return await window.desktopAdminAPI.getActiveCards()
    } catch {}
  }

  // 2. Desde el Ingest Companion
  try {
    const res = await fetch("http://127.0.0.1:41890/status", { cache: "no-store", signal: AbortSignal.timeout(1200) })
    if (res.ok) {
      const data = await res.json()
      if (data.activeCards) return data.activeCards
    }
  } catch {}

  return []
}

/**
 * Escanea de forma nativa la carpeta del proyecto en C:\Lamha-Storage\<folder>
 */
export async function scanLocalProjectStorage(folderName: string): Promise<LocalProjectStorageResult | null> {
  if (typeof window !== "undefined" && window.desktopAdminAPI?.scanProjectStorage) {
    try {
      return await window.desktopAdminAPI.scanProjectStorage(folderName)
    } catch (e) {
      console.warn("Fallo en desktopAdminAPI.scanProjectStorage:", e)
    }
  }
  return null
}

/**
 * Lista los archivos de una subcarpeta de proyecto local de forma nativa
 */
export async function listLocalProjectFiles(folderName: string, subfolderName: string = ""): Promise<LocalBrowseEntry[] | null> {
  if (typeof window !== "undefined" && window.desktopAdminAPI?.listProjectSubfolder) {
    try {
      return await window.desktopAdminAPI.listProjectSubfolder(folderName, subfolderName)
    } catch (e) {
      console.warn("Fallo en desktopAdminAPI.listProjectSubfolder:", e)
    }
  }
  return null
}

/**
 * Crea las 5 carpetas estructuradas de un proyecto en C:\Lamha-Storage\<folder>
 */
export async function createLocalProjectStructure(folderName: string): Promise<{ success: boolean; path?: string; error?: string }> {
  if (typeof window !== "undefined" && window.desktopAdminAPI?.createProjectFolders) {
    try {
      return await window.desktopAdminAPI.createProjectFolders(folderName)
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  }
  return { success: false, error: "Puente nativo de escritorio no disponible" }
}

/**
 * Comprueba la conexión con el servidor NAS QNAP desde el PC físico (LAN o Tailscale)
 */
export async function checkStudioNas(host: string = "", port: number = 21): Promise<{ reachable: boolean; host: string; port: number; error?: string }> {
  // 1. Si estamos dentro de la app de escritorio Panel Administrador y se especificó un host
  if (host && typeof window !== "undefined" && window.desktopAdminAPI?.checkNasConnection) {
    try {
      const res = await window.desktopAdminAPI.checkNasConnection(host, port)
      if (res.reachable) return res
    } catch {}
  }

  // 2. Si estamos en un navegador web o sin host explícito, consultar al Ingest Companion local (:41890)
  for (const bridgePort of [41890, 41891]) {
    try {
      const query = host ? `?host=${encodeURIComponent(host)}&port=${port}` : `?port=${port}`
      const res = await fetch(`http://127.0.0.1:${bridgePort}/check-nas${query}`, {
        signal: AbortSignal.timeout(1200),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.reachable) {
          return { reachable: true, host: data.host || host, port: data.port || port }
        }
      }
    } catch {}
  }

  return { reachable: false, host, port, error: "Desktop bridge no disponible" }
}

/**
 * Notifica a la herramienta Ingest Companion local (:41890) para que recargue al instante
 * la configuración centralizada de red (LAN + Tailscale) desde Supabase
 */
export async function notifyCompanionConfigReload(): Promise<boolean> {
  for (const port of [41890, 41891]) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/reload-config`, {
        method: "POST",
        signal: AbortSignal.timeout(1500),
      })
      if (res.ok) return true
    } catch {}
  }
  return false
}

/**
 * Consulta de forma nativa o mediante el Ingest Companion el estado de un proyecto en el NAS
 */
export async function scanNasProjectStorage(folderName: string): Promise<{
  ok: boolean
  exists: boolean
  filesCount: number
  bytes: number
  sizeMB: number
  sizeGB: number
  path?: string
  source?: string
} | null> {
  if (!folderName) return null

  try {
    const res = await fetch(`http://127.0.0.1:41890/project-nas?folder=${encodeURIComponent(folderName)}`, {
      signal: AbortSignal.timeout(2000),
    })
    if (res.ok) {
      const data = await res.json()
      if (data.ok) return data
    }
  } catch {}

  return null
}

/**
 * Copia automáticamente los archivos originales (RAW + JPG) seleccionados por el cliente
 * hacia la carpeta local C:\Lamha-Storage\<folderName>\02_Seleccion_Cliente y la abre en Windows Explorer
 */
export async function copySelectedToClientFolder(
  folderName: string,
  filenames: string[]
): Promise<{ success: boolean; copiedCount?: number; destDir?: string; error?: string }> {
  if (!folderName || !filenames.length) {
    return { success: false, error: "Sin archivos seleccionados para copiar" }
  }

  // 1. Prioridad: Puente nativo directo del Panel Admin Electron
  if (typeof window !== "undefined" && window.desktopAdminAPI?.copyClientSelection) {
    try {
      const res = await window.desktopAdminAPI.copyClientSelection({ folderName, filenames })
      if (res.success) return res
    } catch (e: any) {
      console.warn("Fallo en desktopAdminAPI.copyClientSelection:", e)
    }
  }

  // 2. Fallback API local
  try {
    const res = await fetch("/api/media/copy-client-selection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderName, filenames }),
    })
    const data = await res.json()
    if (res.ok && data.success) {
      return data
    }
    return { success: false, error: data.error || "No se pudo copiar localmente" }
  } catch (e: any) {
    return { success: false, error: e.message || "Error al copiar archivos a 02_Seleccion_Cliente" }
  }
}

/**
 * Abre directamente la carpeta C:\Lamha-Storage\<folderName>\03_Edicion_Master en el Explorador de Windows,
 * creándola automáticamente si aún no existiera.
 */
export async function openProjectMasterFolder(
  folderName: string
): Promise<{ success: boolean; path: string; message?: string }> {
  const defaultWinPath = `C:\\Lamha-Storage\\${folderName}\\03_Edicion_Master`
  if (typeof window !== "undefined" && window.desktopAdminAPI?.createProjectFolders) {
    try {
      await window.desktopAdminAPI.createProjectFolders(folderName)
    } catch {}
  }

  const res = await openLocalFolderOrFile(`${folderName}\\03_Edicion_Master`, "open", "local")
  return {
    success: res.success,
    path: res.resolvedPath || defaultWinPath,
    message: res.message,
  }
}

/**
 * Obtiene la lista de archivos en C:\Lamha-Storage\<folderName>\03_Edicion_Master
 * mediante el puente HTTP local (:41890 / :41891) o mediante desktopAdminAPI.
 */
export async function getMasterFolderFiles(folderName: string): Promise<{
  files: Array<{ name: string; size: number }>
  path: string
  bridgePort?: number
  hasNativeBinaryReader: boolean
}> {
  const defaultPath = `C:\\Lamha-Storage\\${folderName}\\03_Edicion_Master`
  if (!folderName) return { files: [], path: defaultPath, hasNativeBinaryReader: false }

  // 1. Probar puentes HTTP locales (:41890 Ingest Companion / :41891 Admin Bridge) que permiten leer el binario directo
  for (const port of [41890, 41891]) {
    try {
      const res = await fetch(
        `http://127.0.0.1:${port}/master-files?folder=${encodeURIComponent(folderName)}&sub=03_Edicion_Master`,
        { signal: AbortSignal.timeout(1200), cache: "no-store" }
      )
      if (res.ok) {
        const data = await res.json()
        if (data.ok && Array.isArray(data.files)) {
          return {
            files: data.files.map((f: any) => ({ name: f.name, size: Number(f.size) || 0 })),
            path: data.path || defaultPath,
            bridgePort: port,
            hasNativeBinaryReader: true,
          }
        }
      }
    } catch {}
  }

  // 2. Probar desktopAdminAPI (Electron IPC)
  if (typeof window !== "undefined" && window.desktopAdminAPI?.listProjectSubfolder) {
    try {
      const entries = await window.desktopAdminAPI.listProjectSubfolder(folderName, "03_Edicion_Master")
      if (Array.isArray(entries)) {
        const files = entries
          .filter((e) => !e.isDirectory && !e.name.startsWith("."))
          .map((e) => ({ name: e.name, size: Number(e.size) || 0 }))
        return {
          files,
          path: defaultPath,
          hasNativeBinaryReader: Boolean(window.desktopAdminAPI.readProjectFile),
        }
      }
    } catch {}
  }

  return { files: [], path: defaultPath, hasNativeBinaryReader: false }
}

/**
 * Lee el contenido binario (Blob) de un archivo dentro de C:\Lamha-Storage\<folderName>\03_Edicion_Master
 */
export async function readMasterFileBlob(
  folderName: string,
  fileName: string,
  bridgePort?: number
): Promise<Blob | null> {
  // 1. Si tenemos puerto HTTP de bridge local activo
  const ports = bridgePort ? [bridgePort, 41890, 41891] : [41890, 41891]
  for (const port of Array.from(new Set(ports))) {
    try {
      const res = await fetch(
        `http://127.0.0.1:${port}/master-file-content?folder=${encodeURIComponent(folderName)}&sub=03_Edicion_Master&file=${encodeURIComponent(fileName)}`
      )
      if (res.ok) {
        return await res.blob()
      }
    } catch {}
  }

  // 2. Si estamos en Electron con readProjectFile IPC
  if (typeof window !== "undefined" && window.desktopAdminAPI?.readProjectFile) {
    try {
      const buf = await window.desktopAdminAPI.readProjectFile(folderName, "03_Edicion_Master", fileName)
      if (buf) {
        return new Blob([buf as any])
      }
    } catch {}
  }

  return null
}



