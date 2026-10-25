import path from "path"
import os from "os"
import fs from "fs"
import net from "net"
import { createClient } from "@supabase/supabase-js"

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  return createClient(url, key, { auth: { persistSession: false } })
}

export interface StoragePaths {
  platform: "win32" | "darwin" | "linux"
  networkBasePath: string
  localBasePath: string
  activeBasePath: string
  isNetworkReachable: boolean
  storageType?: "nas_ftp" | "network_share" | "local"
  connectionMode?: "smb_local" | "tailscale_ftp" | "local_disk"
}

export interface NasFtpConfig {
  host: string
  user: string
  password?: string
  baseDir: string
}

export interface DualAccessSettings {
  smbNetworkPath: string
  smbProbeHost: string
  ftpRemoteHost: string
  ftpRemotePort: number
  ftpRemoteUser: string
  ftpRemotePassword?: string
  ftpRemoteBaseDir: string
}

let cachedDbSettings: { data: any; timestamp: number } | null = null

/**
 * Consulta la configuración de almacenamiento dual guardada en Supabase (studio_delivery_settings) con caché de 30s
 */
export async function getDbStorageSettings(): Promise<any> {
  if (cachedDbSettings && Date.now() - cachedDbSettings.timestamp < 30000) {
    return cachedDbSettings.data
  }

  try {
    const supabase = getSupabaseAdmin()
    const { data } = await supabase
      .from("studio_delivery_settings")
      .select("smb_network_path, smb_probe_host, ftp_remote_host, ftp_remote_port, ftp_remote_user, ftp_remote_password, ftp_remote_base_dir")
      .eq("id", 1)
      .maybeSingle()

    if (data) {
      cachedDbSettings = { data, timestamp: Date.now() }
      return data
    }
  } catch (err) {
    console.warn("[StorageConfig] No se pudo leer studio_delivery_settings de Supabase:", err)
  }

  return cachedDbSettings?.data || null
}

let probeCache: {
  host: string
  reachable: boolean
  timestamp: number
} | null = null

/**
 * Verificación rápida de red por Socket TCP al puerto 445 con timeout estricto (500ms).
 * Evita el congelamiento del kernel de Windows de 15-30 segundos al estar fuera de la oficina.
 */
export async function checkSmbProbe(hostOrPath: string, timeoutMs: number = 500): Promise<boolean> {
  if (!hostOrPath || hostOrPath.trim() === "") return false

  let cleanHost = hostOrPath.trim()
  if (cleanHost.startsWith("\\\\") || cleanHost.startsWith("//")) {
    cleanHost = cleanHost.replace(/^[\\/]+/, "").split(/[\\/]/)[0]
  }

  // Si es una letra de unidad como "Z:" o "Z:\", no es un host directo
  if (/^[a-zA-Z]:/.test(cleanHost)) {
    return false
  }

  // Caché de 15 segundos para no saturar con sockets continuos
  if (probeCache && probeCache.host === cleanHost && Date.now() - probeCache.timestamp < 15000) {
    return probeCache.reachable
  }

  return new Promise((resolve) => {
    let finished = false
    const socket = new net.Socket()

    const finish = (result: boolean) => {
      if (!finished) {
        finished = true
        socket.destroy()
        probeCache = { host: cleanHost, reachable: result, timestamp: Date.now() }
        resolve(result)
      }
    }

    socket.setTimeout(timeoutMs)
    socket.once("connect", () => finish(true))
    socket.once("timeout", () => finish(false))
    socket.once("error", () => finish(false))

    try {
      socket.connect(445, cleanHost)
    } catch {
      finish(false)
    }
  })
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

  // Si tenemos ajustes en DB y estamos fuera de LAN (probe en false), priorizar host de Tailscale
  const db = cachedDbSettings?.data
  let effectiveHost = fileConfig.host || process.env.LAMHA_FTP_HOST || "192.168.11.1"

  if (db?.ftp_remote_host && db.ftp_remote_host.trim() !== "") {
    // Si la LAN no está disponible, usar el host remoto de Tailscale
    if (probeCache && !probeCache.reachable) {
      effectiveHost = db.ftp_remote_host.trim()
    }
  }

  return {
    host: effectiveHost,
    user: db?.ftp_remote_user || fileConfig.user || process.env.LAMHA_FTP_USER || "admin",
    password: db?.ftp_remote_password || fileConfig.password || process.env.LAMHA_FTP_PASSWORD || "Satec2016C@U",
    baseDir: db?.ftp_remote_base_dir || fileConfig.baseDir || process.env.LAMHA_FTP_BASE_DIR || "/usb1_1/Lamha-Storage",
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
 * Protección Anti-Freeze: En Windows, si la ruta es un recurso de red (\\ o //) y el sondeo
 * previo dio inalcanzable, NUNCA ejecuta fs.existsSync de forma síncrona.
 */
export function getStorageConfig(): StoragePaths {
  const platform = process.platform as "win32" | "darwin" | "linux"
  const db = cachedDbSettings?.data
  
  let networkBasePath = ""
  let localBasePath = ""

  if (platform === "win32") {
    networkBasePath = db?.smb_network_path || process.env.LAMHA_NETWORK_STORAGE || `\\\\192.168.1.220\\Proyectos`
    localBasePath = process.env.LAMHA_LOCAL_STORAGE || `C:\\Lamha-Storage`
  } else if (platform === "darwin") {
    networkBasePath = db?.smb_network_path || process.env.LAMHA_NETWORK_STORAGE || `/Volumes/Proyectos`
    localBasePath = process.env.LAMHA_LOCAL_STORAGE || path.join(os.homedir(), "Lamha-Storage")
  } else {
    networkBasePath = db?.smb_network_path || process.env.LAMHA_NETWORK_STORAGE || `/mnt/Proyectos`
    localBasePath = process.env.LAMHA_LOCAL_STORAGE || path.join(os.homedir(), "Lamha-Storage")
  }

  let isNetworkReachable = false
  let activeBasePath = localBasePath

  const isUnc = networkBasePath.startsWith("\\\\") || networkBasePath.startsWith("//")

  if (isUnc) {
    // Si el probe rápido está en caché y fue positivo, podemos comprobar la ruta sin congelar
    if (probeCache && probeCache.reachable) {
      try {
        if (fs.existsSync(/*turbopackIgnore: true*/ networkBasePath)) {
          isNetworkReachable = true
          activeBasePath = networkBasePath
        }
      } catch {
        isNetworkReachable = false
      }
    } else {
      // Fuera de la LAN o sin verificación previa: saltar de inmediato para evitar el timeout de 30s de Windows
      isNetworkReachable = false
      activeBasePath = localBasePath
    }
  } else {
    // Es una ruta local o unidad
    try {
      if (fs.existsSync(/*turbopackIgnore: true*/ networkBasePath)) {
        isNetworkReachable = true
        activeBasePath = networkBasePath
      }
    } catch {}
  }

  return {
    platform,
    networkBasePath,
    localBasePath,
    activeBasePath,
    isNetworkReachable,
    connectionMode: isNetworkReachable ? "smb_local" : "tailscale_ftp"
  }
}

/**
 * Conexión Inteligente Asíncrona: ejecuta el chequeo del puerto 445 en < 500ms
 * y conmuta automáticamente entre Modo Estudio (SMB) y Modo Remoto (Tailscale FTP).
 */
export async function getStorageConfigAsync(): Promise<StoragePaths & { connectionMode: "smb_local" | "tailscale_ftp" | "local_disk" }> {
  const db = await getDbStorageSettings()
  const smbHost = db?.smb_probe_host || "192.168.1.220"
  const isSmbOnline = await checkSmbProbe(smbHost, 500)

  const config = getStorageConfig()

  if (isSmbOnline) {
    config.isNetworkReachable = true
    if (db?.smb_network_path) config.networkBasePath = db.smb_network_path
    config.activeBasePath = config.networkBasePath
    return {
      ...config,
      connectionMode: "smb_local",
      storageType: "network_share"
    }
  }

  // Fallback Remoto por Tailscale FTP
  if (db?.ftp_remote_host && db.ftp_remote_host.trim() !== "") {
    return {
      ...config,
      isNetworkReachable: false,
      connectionMode: "tailscale_ftp",
      storageType: "nas_ftp"
    }
  }

  return {
    ...config,
    isNetworkReachable: false,
    connectionMode: "local_disk",
    storageType: "local"
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
