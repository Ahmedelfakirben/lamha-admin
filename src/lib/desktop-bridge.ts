"use client"

/**
 * Puente Unificado de Hardware y Escritorio para Lamha Studios
 * Compatible tanto dentro del Ejecutable Nativo Electron (desktopAdminAPI)
 * como desde navegador web mediante el Ingest Companion (:41890)
 */

export interface LocalProjectStorageResult {
  exists: boolean
  path?: string
  filesCount: number
  totalSizeBytes: number
  sizeMB: number
  sizeGB: number
  subfolders: Array<{
    name: string
    localCount: number
    localSizeMB: number
    nasCount: number
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
  createProjectFolders?: (folderName: string) => Promise<{ success: boolean; path?: string; error?: string }>
  checkNasConnection: (host?: string, port?: number) => Promise<{ reachable: boolean; host: string; port: number; error?: string }>
  launchIngestCompanion: (params?: { sessionId?: string; clientName?: string }) => Promise<{ success: boolean; error?: string }>
  retry?: () => void
}

declare global {
  interface Window {
    desktopAdminAPI?: DesktopAdminAPI
  }
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

  // 2. Puente HTTP local del Ingest Companion (:41890) si el usuario tiene el Companion abierto
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 1200)
    const res = await fetch("http://127.0.0.1:41890/open", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: targetPath, mode }),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (res.ok) {
      const data = await res.json()
      if (data.ok) {
        return { success: true, message: data.message || "Abierto en el Explorador de Windows" }
      }
    }
  } catch {}

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
 * Comprueba la conexión local con el servidor NAS (192.168.11.1)
 */
export async function checkStudioNas(host: string = "192.168.11.1", port: number = 21): Promise<{ reachable: boolean; host: string; port: number; error?: string }> {
  // 1. Si estamos dentro de la app de escritorio Panel Administrador
  if (typeof window !== "undefined" && window.desktopAdminAPI?.checkNasConnection) {
    try {
      const res = await window.desktopAdminAPI.checkNasConnection(host, port)
      if (res.reachable) return res
    } catch {}
  }

  // 2. Si estamos en un navegador web y el Ingest Companion está corriendo en el PC
  try {
    const res = await fetch(`http://127.0.0.1:41890/check-nas?host=${encodeURIComponent(host)}&port=${port}`, {
      signal: AbortSignal.timeout(1500),
    })
    if (res.ok) {
      const data = await res.json()
      if (data.reachable) {
        return { reachable: true, host, port }
      }
    }
  } catch {}

  return { reachable: false, host, port, error: "Desktop bridge no disponible" }
}

