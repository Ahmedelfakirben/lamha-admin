import path from "path"
import os from "os"
import fs from "fs"

export interface StoragePaths {
  platform: "win32" | "darwin" | "linux"
  networkBasePath: string
  localBasePath: string
  activeBasePath: string
  isNetworkReachable: boolean
  storageType?: "nas_ftp" | "network_share" | "local"
}

export interface NasFtpConfig {
  host: string
  user: string
  password?: string
  baseDir: string
}

function getStoredNasConfigFile(): string {
  return path.join(process.cwd(), "src", "config", "nas-config.json")
}

export function getNasFtpConfig(): NasFtpConfig {
  let fileConfig: Partial<NasFtpConfig> = {}
  try {
    const fPath = getStoredNasConfigFile()
    if (fs.existsSync(fPath)) {
      fileConfig = JSON.parse(fs.readFileSync(fPath, "utf-8"))
    }
  } catch {}

  return {
    host: fileConfig.host || process.env.LAMHA_FTP_HOST || "192.168.11.1",
    user: fileConfig.user || process.env.LAMHA_FTP_USER || "admin",
    password: fileConfig.password || process.env.LAMHA_FTP_PASSWORD || "Satec2016C@U",
    baseDir: fileConfig.baseDir || process.env.LAMHA_FTP_BASE_DIR || "/usb1_1/Lamha-Storage",
  }
}

export function saveNasFtpConfig(patch: Partial<NasFtpConfig>): boolean {
  try {
    const current = getNasFtpConfig()
    const updated: NasFtpConfig = {
      host: patch.host !== undefined && patch.host.trim() !== "" ? patch.host.trim() : current.host,
      user: patch.user !== undefined && patch.user.trim() !== "" ? patch.user.trim() : current.user,
      password: patch.password !== undefined ? patch.password : current.password,
      baseDir: patch.baseDir !== undefined && patch.baseDir.trim() !== "" ? patch.baseDir.trim() : current.baseDir,
    }
    const fPath = getStoredNasConfigFile()
    const dir = path.dirname(fPath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(fPath, JSON.stringify(updated, null, 2), "utf-8")
    return true
  } catch (err) {
    console.error("[StorageConfig] Failed to save nas-config.json:", err)
    return false
  }
}

export const NAS_FTP_CONFIG = new Proxy({} as NasFtpConfig, {
  get: (_target, prop: keyof NasFtpConfig) => {
    return getNasFtpConfig()[prop]
  }
})

// Extensiones de archivo clasificadas para estudios de fotografía y cine
export const PHOTO_EXTENSIONS = new Set([
  ".arw", ".cr2", ".cr3", ".nef", ".nrw", ".dng", ".raf", ".orf", 
  ".rw2", ".pef", ".jpg", ".jpeg", ".tif", ".tiff", ".png", ".heic"
])

export const VIDEO_EXTENSIONS = new Set([
  ".mp4", ".mov", ".mxf", ".braw", ".avi", ".mkv", ".prores", 
  ".r3d", ".crm", ".mts", ".m4v"
])

/**
 * Obtiene la configuración de almacenamiento para el entorno actual (Windows o Mac)
 */
export function getStorageConfig(): StoragePaths {
  const platform = process.platform as "win32" | "darwin" | "linux"
  
  // Rutas en Windows: recurso de red UNC o carpeta local
  // En macOS: volumen montado en /Volumes o carpeta local
  let networkBasePath = ""
  let localBasePath = ""

  if (platform === "win32") {
    // Ruta en el router/NAS por red local
    networkBasePath = process.env.LAMHA_NETWORK_STORAGE || `\\\\192.168.11.1\\usb1_1\\Lamha-Storage`
    localBasePath = process.env.LAMHA_LOCAL_STORAGE || `C:\\Lamha-Storage`
  } else if (platform === "darwin") {
    networkBasePath = process.env.LAMHA_NETWORK_STORAGE || `/Volumes/usb1_1/Lamha-Storage`
    localBasePath = process.env.LAMHA_LOCAL_STORAGE || path.join(os.homedir(), "Lamha-Storage")
  } else {
    networkBasePath = process.env.LAMHA_NETWORK_STORAGE || `/mnt/usb1_1/Lamha-Storage`
    localBasePath = process.env.LAMHA_LOCAL_STORAGE || path.join(os.homedir(), "Lamha-Storage")
  }

  // Verificar si la ruta de red es accesible
  let isNetworkReachable = false
  let activeBasePath = localBasePath

  try {
    if (fs.existsSync(/*turbopackIgnore: true*/ networkBasePath)) {
      isNetworkReachable = true
      activeBasePath = networkBasePath
    } else {
      // Si la red no está montada, asegurar la carpeta local de respaldo
      if (!fs.existsSync(/*turbopackIgnore: true*/ localBasePath)) {
        fs.mkdirSync(localBasePath, { recursive: true })
      }
      activeBasePath = localBasePath
    }
  } catch {
    activeBasePath = localBasePath
    if (!fs.existsSync(/*turbopackIgnore: true*/ localBasePath)) {
      try {
        fs.mkdirSync(localBasePath, { recursive: true })
      } catch {
        // Fallback al directorio temporal del usuario si no hay permisos
        activeBasePath = path.join(os.tmpdir(), "Lamha-Storage")
        fs.mkdirSync(activeBasePath, { recursive: true })
      }
    }
  }

  return {
    platform,
    networkBasePath,
    localBasePath,
    activeBasePath,
    isNetworkReachable
  }
}

/**
 * Genera el nombre estandarizado de la carpeta de proyecto
 * Formato: YYYY-MM-DD_[Cliente]_[Proyecto]
 */
export function generateProjectFolderName(
  sessionDate: string,
  clientName: string,
  projectName?: string
): string {
  const cleanDate = (sessionDate || new Date().toISOString().split("T")[0]).replace(/[^0-9-]/g, "")
  const cleanClient = (clientName || "Cliente").trim().replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]/g, "_")
  const cleanProject = (projectName || "Sesion").trim().replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]/g, "_")
  
  return `${cleanDate}_${cleanClient}_${cleanProject}`
}

/**
 * Crea la estructura estándar de carpetas dentro del proyecto en almacenamiento
 */
export function ensureProjectFolderStructure(projectFolderPath: string) {
  const folders = [
    path.join(projectFolderPath, "01_RAW", "Fotos"),
    path.join(projectFolderPath, "01_RAW", "Videos"),
    path.join(projectFolderPath, "02_Seleccion_Cliente"),
    path.join(projectFolderPath, "03_Edicion_Master"),
    path.join(projectFolderPath, "04_Entregas_Finales"),
  ]

  for (const folder of folders) {
    if (!fs.existsSync(/*turbopackIgnore: true*/ folder)) {
      fs.mkdirSync(folder, { recursive: true })
    }
  }

  return {
    rawPhotosDir: folders[0],
    rawVideosDir: folders[1],
    selectionDir: folders[2],
    masterEditDir: folders[3],
    finalDeliveriesDir: folders[4],
  }
}

/**
 * Detecta si un archivo es foto, video u otro según su extensión
 */
export function classifyMediaFile(filename: string): "photo" | "video" | "other" {
  const ext = path.extname(filename).toLowerCase()
  if (PHOTO_EXTENSIONS.has(ext)) return "photo"
  if (VIDEO_EXTENSIONS.has(ext)) return "video"
  return "other"
}

/**
 * Crea la estructura completa de carpetas (01_RAW/Fotos, 01_RAW/Videos, 02_Seleccion_Cliente, 
 * 03_Edicion_Master, 04_Entregas_Finales) tanto en el NAS (FTP) como en el disco local de respaldo.
 */
export async function createProjectFoldersOnStorage(folderName: string) {
  const cleanFolder = (folderName || "Nuevo_Proyecto").replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]/g, "_").trim()
  let createdOnNas = false
  let createdLocally = false

  // 1. Crear en NAS mediante FTP si está disponible
  try {
    const ftp = await import("basic-ftp")
    const client = new ftp.Client(12000)
    client.ftp.verbose = false

    await client.access({
      host: NAS_FTP_CONFIG.host,
      user: NAS_FTP_CONFIG.user,
      password: NAS_FTP_CONFIG.password,
      port: 21,
    })

    const projectRoot = `${NAS_FTP_CONFIG.baseDir}/${cleanFolder}`
    await client.ensureDir(projectRoot)
    await client.ensureDir(`${projectRoot}/01_RAW/Fotos`)
    await client.ensureDir(`${projectRoot}/01_RAW/Videos`)
    await client.ensureDir(`${projectRoot}/02_Seleccion_Cliente`)
    await client.ensureDir(`${projectRoot}/03_Edicion_Master`)
    await client.ensureDir(`${projectRoot}/04_Entregas_Finales`)

    try {
      client.close()
    } catch {}

    createdOnNas = true
  } catch (err: any) {
    console.warn("[NAS Folder Creation Warning]: No se pudo conectar al NAS FTP (usando local):", err.message || err)
  }

  // 2. Crear también en almacenamiento local
  try {
    const storage = getStorageConfig()
    const localProjectRoot = path.join(storage.localBasePath, cleanFolder)
    ensureProjectFolderStructure(localProjectRoot)
    createdLocally = true
  } catch (err) {
    console.warn("[Local Folder Creation Warning]:", err)
  }

  return {
    success: createdOnNas || createdLocally,
    createdOnNas,
    createdLocally,
    folderName: cleanFolder,
  }
}

/**
 * Localiza la carpeta física de un proyecto comprobando primero la ruta configurada
 * y luego escaneando todas las unidades conectadas (SSD externo, discos USB, C:, etc.)
 */
export function resolveProjectLocalPath(folderName: string, customBasePath?: string): string {
  // 1. Si se especificó una ruta base concreta
  if (customBasePath) {
    const custom = path.join(customBasePath, folderName)
    if (fs.existsSync(/*turbopackIgnore: true*/ custom)) return custom
  }

  const storage = getStorageConfig()
  
  // 2. Probar la ruta local configurada
  const configured = path.join(storage.localBasePath, folderName)
  if (fs.existsSync(/*turbopackIgnore: true*/ configured)) return configured

  // 3. Probar en todas las unidades conectadas en Windows
  if (process.platform === "win32") {
    const letters = "CDEFGHIJKLMNOPQRSTUVWXYZ".split("")
    for (const letter of letters) {
      // Probar en Unidad:\Lamha-Storage\<folderName>
      const candidate1 = path.join(`${letter}:\\Lamha-Storage`, folderName)
      if (fs.existsSync(/*turbopackIgnore: true*/ candidate1)) return candidate1

      // Probar directamente en Unidad:\<folderName>
      const candidate2 = path.join(`${letter}:\\`, folderName)
      if (fs.existsSync(/*turbopackIgnore: true*/ candidate2)) return candidate2
    }
  } else if (process.platform === "darwin") {
    // macOS: Probar en /Volumes/*
    const volumesDir = "/Volumes"
    if (fs.existsSync(/*turbopackIgnore: true*/ volumesDir)) {
      try {
        const vols = fs.readdirSync(volumesDir)
        for (const vol of vols) {
          const candidate1 = path.join(volumesDir, vol, "Lamha-Storage", folderName)
          if (fs.existsSync(/*turbopackIgnore: true*/ candidate1)) return candidate1

          const candidate2 = path.join(volumesDir, vol, folderName)
          if (fs.existsSync(/*turbopackIgnore: true*/ candidate2)) return candidate2
        }
      } catch {}
    }
  }

  // Fallback a la ruta configurada aunque aún no exista físicamente
  return configured
}
