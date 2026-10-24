"use client"

/**
 * Puente Unificado de Hardware y Escritorio para Lamha Studios
 * Compatible tanto dentro del Ejecutable Nativo Electron (desktopAdminAPI)
 * como desde navegador web mediante el Ingest Companion (:41890)
 */

export interface DesktopAdminAPI {
  isElectron: boolean
  isDesktopAdmin: boolean
  selectFolder: (options?: { title?: string; defaultPath?: string }) => Promise<string | null>
  selectFile: (options?: { title?: string; defaultPath?: string; multiple?: boolean; filters?: Array<{ name: string; extensions: string[] }> }) => Promise<string | string[] | null>
  openLocalPath: (targetPath: string) => Promise<{ success: boolean; error?: string }>
  revealItemInFolder: (targetPath: string) => Promise<{ success: boolean; error?: string }>
  getActiveCards: () => Promise<Array<{ letter: string; drive: string; path: string; count: number; detectedAt: number }>>
  checkLocalPath: (targetPath: string) => Promise<{ exists: boolean; isDirectory?: boolean; sizeBytes?: number }>
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
 * Abre una carpeta o archivo directamente en el Explorador de Windows del PC local
 */
export async function openLocalFolderOrFile(
  targetPath: string,
  mode: "reveal" | "open" = "reveal"
): Promise<{ success: boolean; message?: string }> {
  if (!targetPath) return { success: false, message: "Ruta vacía" }

  // 1. Prioridad: Puente nativo directo de la App de Escritorio Electron
  if (typeof window !== "undefined" && window.desktopAdminAPI?.openLocalPath) {
    try {
      const res = await window.desktopAdminAPI.openLocalPath(targetPath)
      if (res.success) {
        return { success: true, message: "Abierto en el Explorador de Windows" }
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
