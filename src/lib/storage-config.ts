import path from "path"
import os from "os"
import fs from "fs"
import net from "net"
import { createClient } from "@supabase/supabase-js"

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  return createClient(url, key, { auth: { persistSession: false } })
}

export type NetworkRouteMode = "auto" | "lan" | "tailscale"

export interface StoragePaths {
  platform: "win32" | "darwin" | "linux"
  networkBasePath: string
  localBasePath: string
  activeBasePath: string
  isNetworkReachable: boolean
  storageType?: "nas_ftp" | "network_share" | "local"
  connectionMode?: "smb_local" | "tailscale_ftp" | "local_disk"
  activeRoute?: "lan" | "tailscale" | "offline"
  activeHost?: string
  lanHost?: string
  tailscaleHost?: string
  shareName?: string
  networkMode?: NetworkRouteMode
}

export interface NasFtpConfig {
  host: string
  port: number
  user: string
  password?: string
  baseDir: string
  lanHost: string
  tailscaleHost: string
  shareName: string
  smbPath: string
  networkMode: NetworkRouteMode
  activeRoute: "lan" | "tailscale" | "offline"
}

export interface DualAccessSettings {
  smbNetworkPath: string
  smbProbeHost: string
  ftpRemoteHost: string
  ftpRemotePort: number
  ftpRemoteUser: string
  ftpRemotePassword?: string
  ftpRemoteBaseDir: string
  networkMode: NetworkRouteMode
  shareName: string
}

let cachedDbSettings: { data: any; timestamp: number } | null = null
let lastResolvedRoute: {
  activeRoute: "lan" | "tailscale" | "offline"
  activeHost: string
  lanOnline: boolean
  lanLatencyMs: number
  tailscaleOnline: boolean
  tailscaleLatencyMs: number
  timestamp: number
} | null = null

export function invalidateStorageConfigCache() {
  cachedDbSettings = null
  lastResolvedRoute = null
  probeCacheMap.clear()
}

export function extractShareName(smbPath?: string | null): string {
  if (!smbPath) return "Lamha-Storage"
  const cleaned = smbPath.trim().replace(/^[\\/]+/, "")
  const parts = cleaned.split(/[\\/]+/).filter(Boolean)
  if (parts.length >= 2) {
    return parts.slice(1).join("\\")
  }
  return "Lamha-Storage"
}

export function normalizeNetworkMode(raw?: string | null): NetworkRouteMode {
  if (raw === "lan" || raw === "tailscale" || raw === "auto") return raw
  return "auto"
}

/**
 * Consulta la configuración centralizada guardada en Supabase (studio_delivery_settings)
 */
export async function getDbStorageSettings(forceRefresh = false): Promise<any> {
  if (!forceRefresh && cachedDbSettings && Date.now() - cachedDbSettings.timestamp < 15000) {
    return cachedDbSettings.data
  }

  try {
    const supabase = getSupabaseAdmin()
    const { data } = await supabase
      .from("studio_delivery_settings")
      .select("storage_mode, smb_network_path, smb_probe_host, ftp_remote_host, ftp_remote_port, ftp_remote_user, ftp_remote_password, ftp_remote_base_dir")
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

const probeCacheMap = new Map<string, { reachable: boolean; latencyMs: number; timestamp: number }>()

/**
 * Sondeo TCP rápido sin bloqueo para cualquier puerto (445 SMB o 21 FTP).
 * Evita el bloqueo de 20-30s del kernel de Windows cuando una ruta UNC no está disponible.
 */
export async function checkTcpProbe(
  hostOrPath: string,
  port: number = 445,
  timeoutMs: number = 400,
  bypassCache: boolean = false
): Promise<{ reachable: boolean; latencyMs: number }> {
  if (!hostOrPath || hostOrPath.trim() === "") return { reachable: false, latencyMs: -1 }

  let cleanHost = hostOrPath.trim()
  if (cleanHost.startsWith("\\\\") || cleanHost.startsWith("//")) {
    cleanHost = cleanHost.replace(/^[\\/]+/, "").split(/[\\/]/)[0]
  }

  if (/^[a-zA-Z]:/.test(cleanHost)) {
    return { reachable: false, latencyMs: -1 }
  }

  const key = `${cleanHost}:${port}`
  const cached = probeCacheMap.get(key)
  if (!bypassCache && cached && Date.now() - cached.timestamp < 10000) {
    return { reachable: cached.reachable, latencyMs: cached.latencyMs }
  }

  return new Promise((resolve) => {
    let finished = false
    const t0 = Date.now()
    const socket = new net.Socket()

    const finish = (reachable: boolean) => {
      if (!finished) {
        finished = true
        const latencyMs = reachable ? Math.max(1, Date.now() - t0) : -1
        try {
          socket.destroy()
        } catch {}
        probeCacheMap.set(key, { reachable, latencyMs, timestamp: Date.now() })
        resolve({ reachable, latencyMs })
      }
    }

    socket.setTimeout(timeoutMs)
    socket.once("connect", () => finish(true))
    socket.once("timeout", () => finish(false))
    socket.once("error", () => finish(false))

    try {
      socket.connect(port, cleanHost)
    } catch {
      finish(false)
    }
  })
}

export async function checkSmbProbe(hostOrPath: string, timeoutMs: number = 400): Promise<boolean> {
  const res = await checkTcpProbe(hostOrPath, 445, timeoutMs)
  return res.reachable
}

/**
 * Resuelve de forma inteligente qué ruta del NAS usar (Red Local LAN vs Red Tailscale VPN)
 * según la preferencia centralizada (`auto`, `lan`, `tailscale`) y el estado en vivo de los puertos.
 */
export async function resolveActiveNasRoute(options?: { forceRefresh?: boolean; overrideMode?: NetworkRouteMode }) {
  const db = await getDbStorageSettings(options?.forceRefresh)
  const lanHost = (db?.smb_probe_host || "").trim()
  const tailscaleHost = (db?.ftp_remote_host || "").trim()
  const ftpPort = Number(db?.ftp_remote_port) || 21
  const shareName = extractShareName(db?.smb_network_path)
  const networkMode = options?.overrideMode || normalizeNetworkMode(db?.storage_mode)

  // Sondear en paralelo LAN y Tailscale (tanto SMB 445 como FTP 21)
  const [lanSmb, lanFtp, tsSmb, tsFtp] = await Promise.all([
    lanHost ? checkTcpProbe(lanHost, 445, 380, options?.forceRefresh) : Promise.resolve({ reachable: false, latencyMs: -1 }),
    lanHost ? checkTcpProbe(lanHost, ftpPort, 380, options?.forceRefresh) : Promise.resolve({ reachable: false, latencyMs: -1 }),
    tailscaleHost ? checkTcpProbe(tailscaleHost, 445, 550, options?.forceRefresh) : Promise.resolve({ reachable: false, latencyMs: -1 }),
    tailscaleHost ? checkTcpProbe(tailscaleHost, ftpPort, 550, options?.forceRefresh) : Promise.resolve({ reachable: false, latencyMs: -1 }),
  ])

  const lanOnline = lanSmb.reachable || lanFtp.reachable
  const lanLatencyMs = lanSmb.reachable ? lanSmb.latencyMs : lanFtp.latencyMs
  const tailscaleOnline = tsSmb.reachable || tsFtp.reachable
  const tailscaleLatencyMs = tsSmb.reachable ? tsSmb.latencyMs : tsFtp.latencyMs

  let activeRoute: "lan" | "tailscale" | "offline" = "offline"
  let activeHost = ""
  let activeSmbReachable = false

  if (networkMode === "lan") {
    activeHost = lanHost
    if (lanOnline) {
      activeRoute = "lan"
      activeSmbReachable = lanSmb.reachable
    }
  } else if (networkMode === "tailscale") {
    activeHost = tailscaleHost || lanHost
    if (tailscaleOnline) {
      activeRoute = "tailscale"
      activeSmbReachable = tsSmb.reachable
    }
  } else {
    // Modo AUTO: Prioridad 1 Red Local (LAN) -> Prioridad 2 Tailscale VPN
    if (lanOnline && lanHost) {
      activeRoute = "lan"
      activeHost = lanHost
      activeSmbReachable = lanSmb.reachable
    } else if (tailscaleOnline && tailscaleHost) {
      activeRoute = "tailscale"
      activeHost = tailscaleHost
      activeSmbReachable = tsSmb.reachable
    } else {
      activeRoute = "offline"
      activeHost = lanHost || tailscaleHost || ""
      activeSmbReachable = false
    }
  }

  const activeSmbPath = activeHost ? `\\\\${activeHost}\\${shareName}` : ""

  lastResolvedRoute = {
    activeRoute,
    activeHost,
    lanOnline,
    lanLatencyMs,
    tailscaleOnline,
    tailscaleLatencyMs,
    timestamp: Date.now(),
  }

  return {
    networkMode,
    activeRoute,
    activeHost,
    activeSmbPath,
    activeSmbReachable,
    lanHost,
    lanSmbPath: lanHost ? `\\\\${lanHost}\\${shareName}` : "",
    lanOnline,
    lanSmbOnline: lanSmb.reachable,
    lanFtpOnline: lanFtp.reachable,
    lanLatencyMs,
    tailscaleHost,
    tailscaleSmbPath: tailscaleHost ? `\\\\${tailscaleHost}\\${shareName}` : "",
    tailscaleOnline,
    tailscaleSmbOnline: tsSmb.reachable,
    tailscaleFtpOnline: tsFtp.reachable,
    tailscaleLatencyMs,
    shareName,
    ftpPort,
    user: (db?.ftp_remote_user || "").trim(),
    password: db?.ftp_remote_password || "",
    baseDir: (db?.ftp_remote_base_dir || "/").trim() || "/",
    hasPassword: Boolean(db?.ftp_remote_password && String(db.ftp_remote_password).length > 0),
  }
}

export function getNasFtpConfig(): NasFtpConfig {
  const db = cachedDbSettings?.data
  const lanHost = (db?.smb_probe_host || "").trim()
  const tailscaleHost = (db?.ftp_remote_host || "").trim()
  const shareName = extractShareName(db?.smb_network_path)
  const networkMode = normalizeNetworkMode(db?.storage_mode)
  const port = Number(db?.ftp_remote_port) || 21

  let effectiveHost = lanHost || tailscaleHost || ""
  let activeRoute: "lan" | "tailscale" | "offline" = "offline"

  if (networkMode === "lan") {
    effectiveHost = lanHost
    activeRoute = lastResolvedRoute?.lanOnline ? "lan" : "offline"
  } else if (networkMode === "tailscale") {
    effectiveHost = tailscaleHost || lanHost
    activeRoute = lastResolvedRoute?.tailscaleOnline ? "tailscale" : "offline"
  } else if (lastResolvedRoute) {
    effectiveHost = lastResolvedRoute.activeHost || lanHost || tailscaleHost
    activeRoute = lastResolvedRoute.activeRoute
  }

  return {
    host: effectiveHost,
    port,
    user: (db?.ftp_remote_user || "").trim(),
    password: db?.ftp_remote_password || "",
    baseDir: (db?.ftp_remote_base_dir || "/").trim() || "/",
    lanHost,
    tailscaleHost,
    shareName,
    smbPath: effectiveHost ? `\\\\${effectiveHost}\\${shareName}` : "",
    networkMode,
    activeRoute,
  }
}

export async function saveNasCentralConfig(patch: {
  lanHost?: string
  tailscaleHost?: string
  shareName?: string
  smbNetworkPath?: string
  port?: number
  user?: string
  password?: string
  baseDir?: string
  networkMode?: NetworkRouteMode
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = getSupabaseAdmin()
    const current = (await getDbStorageSettings(true)) || {}

    const lanHost = patch.lanHost !== undefined ? patch.lanHost.trim() : (current.smb_probe_host || "").trim()
    const tailscaleHost = patch.tailscaleHost !== undefined ? patch.tailscaleHost.trim() : (current.ftp_remote_host || "").trim()
    const shareName = patch.shareName !== undefined
      ? patch.shareName.trim().replace(/^[\\/]+|[\\/]+$/g, "") || "Lamha-Storage"
      : extractShareName(patch.smbNetworkPath || current.smb_network_path)

    const smbNetworkPath = patch.smbNetworkPath !== undefined && patch.smbNetworkPath.trim() !== ""
      ? patch.smbNetworkPath.trim()
      : lanHost
      ? `\\\\${lanHost}\\${shareName}`
      : current.smb_network_path || ""

    const updatePayload: Record<string, any> = {
      id: 1,
      updated_at: new Date().toISOString(),
      smb_probe_host: lanHost,
      ftp_remote_host: tailscaleHost,
      smb_network_path: smbNetworkPath,
    }

    if (patch.networkMode !== undefined) {
      updatePayload.storage_mode = normalizeNetworkMode(patch.networkMode)
    }
    if (patch.port !== undefined) {
      updatePayload.ftp_remote_port = Number(patch.port) || 21
    }
    if (patch.user !== undefined) {
      updatePayload.ftp_remote_user = patch.user.trim()
    }
    if (patch.password !== undefined && patch.password !== "") {
      updatePayload.ftp_remote_password = patch.password
    }
    if (patch.baseDir !== undefined && patch.baseDir.trim() !== "") {
      updatePayload.ftp_remote_base_dir = patch.baseDir.trim()
    }

    const { error } = await supabase.from("studio_delivery_settings").upsert(updatePayload)
    if (error) {
      return { ok: false, error: error.message }
    }

    invalidateStorageConfigCache()
    await getDbStorageSettings(true)
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err.message || String(err) }
  }
}

export function saveNasFtpConfig(patch: Partial<NasFtpConfig>): boolean {
  // Mantiene compatibilidad sincrónica disparando guardado centralizado en Supabase
  saveNasCentralConfig({
    lanHost: patch.lanHost || patch.host,
    tailscaleHost: patch.tailscaleHost,
    shareName: patch.shareName,
    user: patch.user,
    password: patch.password,
    baseDir: patch.baseDir,
    networkMode: patch.networkMode,
  }).catch(() => {})
  return true
}

export const NAS_FTP_CONFIG = new Proxy({} as NasFtpConfig, {
  get: (_target, prop: keyof NasFtpConfig) => {
    return getNasFtpConfig()[prop]
  },
})

// Extensiones de archivo clasificadas para estudios de fotografía y cine
export const PHOTO_EXTENSIONS = new Set([
  ".arw", ".cr2", ".cr3", ".nef", ".nrw", ".dng", ".raf", ".orf",
  ".rw2", ".pef", ".jpg", ".jpeg", ".tif", ".tiff", ".png", ".heic",
])

export const VIDEO_EXTENSIONS = new Set([
  ".mp4", ".mov", ".mxf", ".braw", ".avi", ".mkv", ".prores",
  ".r3d", ".crm", ".mts", ".m4v",
])

/**
 * Obtiene la configuración de almacenamiento para el entorno actual (Windows, Mac o Linux)
 * Protección Anti-Freeze: NUNCA ejecuta fs.existsSync sobre una ruta de red UNC (\\) a menos que
 * el sondeo previo por socket TCP 445 haya confirmado en <400ms que el host responde.
 */
export function getStorageConfig(): StoragePaths {
  const platform = process.platform as "win32" | "darwin" | "linux"
  const nasCfg = getNasFtpConfig()

  let localBasePath = ""
  if (platform === "win32") {
    localBasePath = process.env.LAMHA_LOCAL_STORAGE || `C:\\Lamha-Storage`
  } else {
    localBasePath = process.env.LAMHA_LOCAL_STORAGE || path.join(os.homedir(), "Lamha-Storage")
  }

  const networkBasePath = nasCfg.smbPath || localBasePath
  let isNetworkReachable = false
  let activeBasePath = localBasePath

  if (nasCfg.host) {
    const smbProbe = probeCacheMap.get(`${nasCfg.host}:445`)
    const ftpProbe = probeCacheMap.get(`${nasCfg.host}:${nasCfg.port || 21}`)
    if (smbProbe?.reachable) {
      isNetworkReachable = true
      activeBasePath = platform === "win32" ? nasCfg.smbPath : `ftp://${nasCfg.host}${nasCfg.baseDir}`
    } else if (ftpProbe?.reachable) {
      isNetworkReachable = true
      activeBasePath = `ftp://${nasCfg.host}${nasCfg.baseDir}`
    }
  }

  return {
    platform,
    networkBasePath,
    localBasePath,
    activeBasePath,
    isNetworkReachable,
    activeRoute: nasCfg.activeRoute,
    activeHost: nasCfg.host,
    lanHost: nasCfg.lanHost,
    tailscaleHost: nasCfg.tailscaleHost,
    shareName: nasCfg.shareName,
    networkMode: nasCfg.networkMode,
    connectionMode:
      nasCfg.activeRoute === "lan"
        ? "smb_local"
        : nasCfg.activeRoute === "tailscale"
        ? "tailscale_ftp"
        : "local_disk",
  }
}

/**
 * Conexión Inteligente Asíncrona: verifica LAN (<380ms) y Tailscale (<550ms)
 * y conmuta automáticamente entre Red Local (LAN) y Red Tailscale (VPN).
 */
export async function getStorageConfigAsync(): Promise<
  StoragePaths & { connectionMode: "smb_local" | "tailscale_ftp" | "local_disk" }
> {
  const route = await resolveActiveNasRoute()
  const config = getStorageConfig()

  if (route.activeRoute === "lan") {
    return {
      ...config,
      isNetworkReachable: true,
      networkBasePath: route.activeSmbPath,
      activeBasePath: config.platform === "win32" && route.activeSmbReachable
        ? route.activeSmbPath
        : `ftp://${route.activeHost}${route.baseDir}`,
      activeRoute: "lan",
      activeHost: route.activeHost,
      connectionMode: "smb_local",
      storageType: route.activeSmbReachable ? "network_share" : "nas_ftp",
    }
  }

  if (route.activeRoute === "tailscale") {
    return {
      ...config,
      isNetworkReachable: true,
      networkBasePath: route.activeSmbPath,
      activeBasePath: config.platform === "win32" && route.activeSmbReachable
        ? route.activeSmbPath
        : `ftp://${route.activeHost}${route.baseDir}`,
      activeRoute: "tailscale",
      activeHost: route.activeHost,
      connectionMode: "tailscale_ftp",
      storageType: "nas_ftp",
    }
  }

  return {
    ...config,
    isNetworkReachable: false,
    activeRoute: "offline",
    connectionMode: "local_disk",
    storageType: "local",
  }
}

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

export function classifyMediaFile(filename: string): "photo" | "video" | "other" {
  const ext = path.extname(filename).toLowerCase()
  if (PHOTO_EXTENSIONS.has(ext)) return "photo"
  if (VIDEO_EXTENSIONS.has(ext)) return "video"
  return "other"
}

export async function createProjectFoldersOnStorage(folderName: string) {
  const cleanFolder = (folderName || "Nuevo_Proyecto").replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]/g, "_").trim()
  let createdOnNas = false
  let createdLocally = false

  // 1. Crear en NAS mediante la ruta activa (LAN o Tailscale)
  try {
    const route = await resolveActiveNasRoute()
    if (route.activeRoute !== "offline" && route.activeHost && route.password) {
      const ftp = await import("basic-ftp")
      const client = new ftp.Client(10000)
      client.ftp.verbose = false

      await client.access({
        host: route.activeHost,
        user: route.user,
        password: route.password,
        port: route.ftpPort || 21,
      })

      const projectRoot = `${route.baseDir === "/" ? "" : route.baseDir}/${cleanFolder}`
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
    }
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

export function resolveProjectLocalPath(folderName: string, customBasePath?: string): string {
  if (customBasePath) {
    const custom = path.join(customBasePath, folderName)
    if (fs.existsSync(/*turbopackIgnore: true*/ custom)) return custom
  }

  const storage = getStorageConfig()
  const configured = path.join(storage.localBasePath, folderName)
  if (fs.existsSync(/*turbopackIgnore: true*/ configured)) return configured

  if (process.platform === "win32") {
    const letters = ["C", "D", "E", "F", "G"]
    for (const letter of letters) {
      const candidate1 = path.join(`${letter}:\\Lamha-Storage`, folderName)
      if (fs.existsSync(/*turbopackIgnore: true*/ candidate1)) return candidate1
    }
  }

  return configured
}
