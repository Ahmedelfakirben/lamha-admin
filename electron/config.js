const fs = require("fs")
const path = require("path")
const net = require("net")
const { app } = require("electron")

/** Lee variables desde lamha-admin/.env.local (solo claves de Supabase / SMTP). */
function readEnvFile() {
  const out = {}
  const appPath = app && typeof app.getAppPath === "function" ? app.getAppPath() : ""
  const userDataPath = app && typeof app.getPath === "function" ? app.getPath("userData") : ""
  const candidates = [
    path.join(__dirname, "..", ".env.local"),
    path.join(__dirname, "..", "..", ".env.local"),
    path.join(__dirname, "..", "..", "..", ".env.local"),
    path.join(__dirname, "..", "..", "..", "..", ".env.local"),
    path.join(process.cwd(), ".env.local"),
    appPath ? path.join(appPath, ".env.local") : "",
    userDataPath ? path.join(userDataPath, ".env.local") : "",
  ].filter(Boolean)
  for (const file of candidates) {
    try {
      if (!fs.existsSync(file)) continue
      for (const raw of fs.readFileSync(file, "utf-8").split(/\r?\n/)) {
        const line = raw.trim()
        if (!line || line.startsWith("#")) continue
        const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/)
        if (!m) continue
        let v = m[2].trim()
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1)
        }
        if (!(m[1] in out)) out[m[1]] = v
      }
    } catch {}
  }
  return out
}

const settingsFile = () => {
  const base =
    app && typeof app.getPath === "function"
      ? app.getPath("userData")
      : process.env.APPDATA
      ? path.join(process.env.APPDATA, "lamha-admin")
      : process.cwd()
  return path.join(base, "lamha-settings.json")
}

function loadUserSettings() {
  try {
    if (fs.existsSync(settingsFile())) {
      return JSON.parse(fs.readFileSync(settingsFile(), "utf-8"))
    }
  } catch {}
  return {}
}

function saveUserSettings(data) {
  try {
    const dir = path.dirname(settingsFile())
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(settingsFile(), JSON.stringify(data, null, 2), "utf-8")
    return true
  } catch {
    return false
  }
}

function positiveNumber(v, fallback) {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

// Caché en memoria de la ruta activa resuelta (LAN vs Tailscale)
let lastRouteResolution = null
let lastRouteResolvedAt = 0

function extractShareName(uncPath) {
  if (!uncPath) return "Lamha-Storage"
  const cleaned = String(uncPath).replace(/^[\\/]+/, "")
  const parts = cleaned.split(/[\\/]+/).filter(Boolean)
  if (parts.length >= 2) return parts[1]
  return "Lamha-Storage"
}

/**
 * Configuración efectiva centralizada:
 * Las rutas (LAN + Tailscale) y credenciales NAS se sincronizan con Supabase `studio_delivery_settings` (id = 1)
 * y se guardan en caché local en `lamha-settings.json` sin valores hardcodeados en el código.
 */
function getConfig() {
  const env = readEnvFile()
  const user = loadUserSettings()

  const networkMode = ["auto", "lan", "tailscale"].includes(user.networkMode) ? user.networkMode : "auto"
  const nasLanHost = (user.nasLanHost !== undefined ? user.nasLanHost : user.nasHost) || ""
  const nasTailscaleHost = user.nasTailscaleHost || ""
  const nasShareName = user.nasShareName || "Lamha-Storage"

  // Determinar el host activo según el modo de red y la última resolución TCP
  let activeHost = ""
  if (networkMode === "lan") {
    activeHost = nasLanHost
  } else if (networkMode === "tailscale") {
    activeHost = nasTailscaleHost || nasLanHost
  } else {
    if (lastRouteResolution && lastRouteResolution.activeHost) {
      activeHost = lastRouteResolution.activeHost
    } else {
      activeHost = user.activeNasHost || nasLanHost || nasTailscaleHost || ""
    }
  }

  return {
    supabaseUrl: user.supabaseUrl || env.NEXT_PUBLIC_SUPABASE_URL || "https://lam7a.elfakir.com",
    supabaseAnonKey:
      user.supabaseAnonKey ||
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4OTkxODUwMCwiZXhwIjo0OTQ1NTkyMTAwLCJyb2xlIjoiYW5vbiJ9.BO0AL139qok5hXKYeU5c7tmD2J0QroXeFuqndyhln0Y",
    supabaseServiceKey:
      user.supabaseServiceKey ||
      env.SUPABASE_SERVICE_ROLE_KEY ||
      "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4OTkxODUwMCwiZXhwIjo0OTQ1NTkyMTAwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.vShCmR_4b4WTXwDdnc4yIIZI0iD3pssYZZ-YlEObzoE",
    dashboardUrl: user.dashboardUrl || "https://admin.lam7a.ma",
    ssdPath: user.ssdPath || env.LAMHA_LOCAL_STORAGE || "C:\\Lamha-Storage",
    networkMode,
    nasLanHost,
    nasTailscaleHost,
    nasShareName,
    nasHost: activeHost,
    nasPort: Number(user.nasPort) || 21,
    nasUser: user.nasUser || "",
    nasPassword: user.nasPassword || "",
    nasBaseDir: user.nasBaseDir !== undefined ? user.nasBaseDir : "/",
    language: user.language || "fr",
    theme: user.theme || "dark",
    nasAutoSyncEnabled: user.nasAutoSyncEnabled !== undefined ? Boolean(user.nasAutoSyncEnabled) : true,
    nasSyncPausedUntil: user.nasSyncPausedUntil || null,
    openAtLogin: user.openAtLogin !== undefined ? Boolean(user.openAtLogin) : true,
    smtpHost: user.smtpHost || env.SMTP_HOST || "smtp.office365.com",
    smtpPort: Number(user.smtpPort || env.SMTP_PORT || 587),
    smtpSecure: (user.smtpSecure || env.SMTP_SECURE) === "true",
    smtpUser: user.smtpUser || env.SMTP_USER || "contact@lam7a.ma",
    smtpPass: user.smtpPass || env.SMTP_PASS || "rlzxmzlfjcrmjxsq",
    smtpFromName: user.smtpFromName || env.SMTP_FROM_NAME || "Lam7a Studios",
    smtpFromEmail: user.smtpFromEmail || env.SMTP_FROM_EMAIL || env.SMTP_USER || "contact@lam7a.ma",
    evolutionUrl: (user.evolutionUrl || env.EVOLUTION_API_URL || "https://wa-api.elfakir.com").replace(/\/+$/, ""),
    evolutionKey: user.evolutionKey || env.EVOLUTION_API_KEY || "",
    evolutionInstance: user.evolutionInstance || env.EVOLUTION_INSTANCE_NAME || "lam7astudio",
    // Ciclo de vida QNAP / Almacenamiento de red
    retentionEnabled: user.retentionEnabled !== undefined ? Boolean(user.retentionEnabled) : false,
    retentionAutoNotice: user.retentionAutoNotice !== undefined ? Boolean(user.retentionAutoNotice) : true,
    retentionAutoPurge: user.retentionAutoPurge !== undefined ? Boolean(user.retentionAutoPurge) : true,
    retentionUnit: user.retentionUnit === "GB" ? "GB" : "TB",
    retentionCapacityValue: positiveNumber(user.retentionCapacityValue !== undefined ? user.retentionCapacityValue : user.retentionCapacityTb, 3.6),
    retentionTriggerValue: positiveNumber(user.retentionTriggerValue !== undefined ? user.retentionTriggerValue : user.retentionTriggerTb, 2.6),
    retentionReleaseValue: positiveNumber(user.retentionReleaseValue !== undefined ? user.retentionReleaseValue : user.retentionReleaseTb, 1.0),
    retentionCapacityTb: positiveNumber(user.retentionCapacityTb, 3.6),
    retentionTriggerTb: positiveNumber(user.retentionTriggerTb, 2.6),
    retentionReleaseTb: positiveNumber(user.retentionReleaseTb, 1.0),
    retentionGraceDays: Math.max(1, Math.round(positiveNumber(user.retentionGraceDays, 7))),
    retentionMode: user.retentionMode === "delete_all" ? "delete_all" : "keep_finals",
    retentionNoticeLang: ["fr", "ar", "es", "en"].includes(user.retentionNoticeLang) ? user.retentionNoticeLang : "fr",
  }
}

/**
 * Sondeo TCP no bloqueante (por defecto 350ms) para verificar puertos 445 (SMB) o 21 (FTP)
 * antes de tocar el sistema de archivos de red de Windows.
 */
function probeTcpPort(host, port = 445, timeoutMs = 350) {
  return new Promise((resolve) => {
    if (!host || typeof host !== "string" || !host.trim()) {
      return resolve({ reachable: false, latencyMs: 0 })
    }
    const start = Date.now()
    const sock = new net.Socket()
    let settled = false
    const done = (reachable) => {
      if (settled) return
      settled = true
      try {
        sock.destroy()
      } catch {}
      resolve({ reachable, latencyMs: Date.now() - start })
    }
    sock.setTimeout(timeoutMs)
    sock.once("connect", () => done(true))
    sock.once("timeout", () => done(false))
    sock.once("error", () => done(false))
    try {
      sock.connect(port, host.trim())
    } catch {
      done(false)
    }
  })
}

/**
 * Resuelve automáticamente qué ruta está activa (Red Local LAN vs Tailscale VPN)
 * según `networkMode` ("auto" | "lan" | "tailscale") y disponibilidad TCP real.
 */
async function resolveActiveNasRoute(opts = {}) {
  const force = Boolean(opts && opts.force)
  if (!force && lastRouteResolution && Date.now() - lastRouteResolvedAt < 8000) {
    return lastRouteResolution
  }

  const cfg = getConfig()
  const lanHost = (cfg.nasLanHost || "").trim()
  const tsHost = (cfg.nasTailscaleHost || "").trim()
  const ftpPort = Number(cfg.nasPort) || 21
  const shareName = cfg.nasShareName || "Lamha-Storage"

  const [lanSmb, lanFtp, tsSmb, tsFtp] = await Promise.all([
    lanHost ? probeTcpPort(lanHost, 445, 350) : Promise.resolve({ reachable: false, latencyMs: 0 }),
    lanHost ? probeTcpPort(lanHost, ftpPort, 350) : Promise.resolve({ reachable: false, latencyMs: 0 }),
    tsHost ? probeTcpPort(tsHost, 445, 450) : Promise.resolve({ reachable: false, latencyMs: 0 }),
    tsHost ? probeTcpPort(tsHost, ftpPort, 450) : Promise.resolve({ reachable: false, latencyMs: 0 }),
  ])

  const lanOnline = lanSmb.reachable || lanFtp.reachable
  const tailscaleOnline = tsSmb.reachable || tsFtp.reachable
  const lanLatencyMs = lanSmb.reachable ? lanSmb.latencyMs : lanFtp.latencyMs
  const tailscaleLatencyMs = tsSmb.reachable ? tsSmb.latencyMs : tsFtp.latencyMs

  let activeRoute = "offline"
  let activeHost = ""
  let activeSmbOnline = false
  let activeFtpOnline = false
  let latencyMs = 0

  if (cfg.networkMode === "lan") {
    activeHost = lanHost
    if (lanOnline) {
      activeRoute = "lan"
      activeSmbOnline = lanSmb.reachable
      activeFtpOnline = lanFtp.reachable
      latencyMs = lanLatencyMs
    }
  } else if (cfg.networkMode === "tailscale") {
    activeHost = tsHost
    if (tailscaleOnline) {
      activeRoute = "tailscale"
      activeSmbOnline = tsSmb.reachable
      activeFtpOnline = tsFtp.reachable
      latencyMs = tailscaleLatencyMs
    }
  } else {
    // Modo AUTO: Prioridad 1 Red Local LAN -> Fallback automático a Tailscale VPN
    if (lanOnline) {
      activeRoute = "lan"
      activeHost = lanHost
      activeSmbOnline = lanSmb.reachable
      activeFtpOnline = lanFtp.reachable
      latencyMs = lanLatencyMs
    } else if (tailscaleOnline) {
      activeRoute = "tailscale"
      activeHost = tsHost
      activeSmbOnline = tsSmb.reachable
      activeFtpOnline = tsFtp.reachable
      latencyMs = tailscaleLatencyMs
    } else {
      activeRoute = "offline"
      activeHost = lanHost || tsHost
    }
  }

  const smbUncPath = activeHost ? `\\\\${activeHost}\\${shareName}` : ""

  lastRouteResolution = {
    networkMode: cfg.networkMode,
    activeRoute,
    activeHost,
    activeSmbOnline,
    activeFtpOnline,
    latencyMs,
    smbUncPath,
    shareName,
    lan: {
      host: lanHost,
      online: lanOnline,
      smbOnline: lanSmb.reachable,
      ftpOnline: lanFtp.reachable,
      latencyMs: lanLatencyMs,
    },
    tailscale: {
      host: tsHost,
      online: tailscaleOnline,
      smbOnline: tsSmb.reachable,
      ftpOnline: tsFtp.reachable,
      latencyMs: tailscaleLatencyMs,
    },
  }
  lastRouteResolvedAt = Date.now()

  // Actualizar activeNasHost en memoria/config si cambió
  if (activeHost) {
    const u = loadUserSettings()
    if (u.activeNasHost !== activeHost) {
      u.activeNasHost = activeHost
      saveUserSettings(u)
    }
  }

  return lastRouteResolution
}

/**
 * Localiza un recurso SMB disponible de forma 100% ASÍNCRONA y SEGURA:
 * NUNCA toca `Z:\` ni `\\IP\Share` si el puerto TCP 445 no respondió antes en <= 350ms,
 * evitando por completo los bloqueos de 20-30s del explorador SMB de Windows.
 */
async function findAvailableSmbShareAsync(customCfg = null) {
  const cfg = customCfg || getConfig()
  const route = await resolveActiveNasRoute()
  if (!route.activeSmbOnline || !route.activeHost) {
    return null
  }

  const shareName = cfg.nasShareName || "Lamha-Storage"
  const candidates = []
  // Si estamos en LAN local, podemos probar Z:\ primero, luego la ruta UNC de la IP activa
  if (route.activeRoute === "lan") {
    candidates.push(`\\\\${route.activeHost}\\${shareName}`, "Z:\\")
  } else {
    // En Tailscale VPN usamos directamente \\100.x.y.z\Lamha-Storage para no tocar una Z:\ desconectada de LAN
    candidates.push(`\\\\${route.activeHost}\\${shareName}`)
  }

  for (const candidate of candidates) {
    try {
      await fs.promises.access(candidate, fs.constants.R_OK | fs.constants.W_OK)
      return candidate
    } catch {}
  }
  return null
}

/** Versión segura para enviar al renderer. */
function getPublicSettings() {
  const c = getConfig()
  return {
    supabaseUrl: c.supabaseUrl,
    dashboardUrl: c.dashboardUrl,
    ssdPath: c.ssdPath,
    networkMode: c.networkMode,
    nasLanHost: c.nasLanHost,
    nasTailscaleHost: c.nasTailscaleHost,
    nasShareName: c.nasShareName,
    nasHost: c.nasHost,
    nasPort: c.nasPort,
    nasUser: c.nasUser,
    nasBaseDir: c.nasBaseDir,
    language: c.language,
    theme: c.theme,
    hasNasPassword: !!c.nasPassword,
    hasSupabaseKey: !!c.supabaseAnonKey,
    nasAutoSyncEnabled: c.nasAutoSyncEnabled,
    nasSyncPausedUntil: c.nasSyncPausedUntil,
    openAtLogin: c.openAtLogin,
    retentionEnabled: c.retentionEnabled,
    retentionAutoNotice: c.retentionAutoNotice,
    retentionAutoPurge: c.retentionAutoPurge,
    retentionUnit: c.retentionUnit,
    retentionCapacityValue: c.retentionCapacityValue,
    retentionTriggerValue: c.retentionTriggerValue,
    retentionReleaseValue: c.retentionReleaseValue,
    retentionCapacityTb: c.retentionCapacityTb,
    retentionTriggerTb: c.retentionTriggerTb,
    retentionReleaseTb: c.retentionReleaseTb,
    retentionGraceDays: c.retentionGraceDays,
    retentionMode: c.retentionMode,
    retentionNoticeLang: c.retentionNoticeLang,
    routeStatus: lastRouteResolution || null,
  }
}

function updateSettings(patch) {
  const current = loadUserSettings()
  const allowed = [
    "supabaseUrl",
    "dashboardUrl",
    "ssdPath",
    "networkMode",
    "nasLanHost",
    "nasTailscaleHost",
    "nasShareName",
    "nasHost",
    "nasPort",
    "nasUser",
    "nasPassword",
    "nasBaseDir",
    "language",
    "theme",
    "nasAutoSyncEnabled",
    "nasSyncPausedUntil",
    "openAtLogin",
    "retentionEnabled",
    "retentionAutoNotice",
    "retentionAutoPurge",
    "retentionUnit",
    "retentionCapacityValue",
    "retentionTriggerValue",
    "retentionReleaseValue",
    "retentionCapacityTb",
    "retentionTriggerTb",
    "retentionReleaseTb",
    "retentionGraceDays",
    "retentionMode",
    "retentionNoticeLang",
  ]
  for (const k of allowed) {
    if (patch[k] !== undefined && (k !== "nasPassword" || patch[k] !== "")) {
      current[k] = patch[k]
    }
  }
  lastRouteResolvedAt = 0
  return saveUserSettings(current)
}

/**
 * Sincroniza la configuración centralizada de NAS (Rutas LAN + Tailscale + Credenciales)
 * desde Supabase `studio_delivery_settings` (id = 1) hacia `lamha-settings.json`.
 */
async function syncConfigFromSupabase() {
  try {
    const cfg = getConfig()
    const { createClient } = require("@supabase/supabase-js")
    const key = cfg.supabaseServiceKey || cfg.supabaseAnonKey
    if (!cfg.supabaseUrl || !key) return null

    const sb = createClient(cfg.supabaseUrl, key, { auth: { persistSession: false } })
    const { data, error } = await sb
      .from("studio_delivery_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle()

    if (error || !data) return null

    const current = loadUserSettings()
    if (data.storage_mode && ["auto", "lan", "tailscale"].includes(data.storage_mode)) {
      current.networkMode = data.storage_mode
    }
    if (data.smb_probe_host) {
      current.nasLanHost = String(data.smb_probe_host).trim()
    }
    if (data.ftp_remote_host) {
      current.nasTailscaleHost = String(data.ftp_remote_host).trim()
    }
    if (data.smb_network_path) {
      current.nasShareName = extractShareName(data.smb_network_path)
    }
    if (data.ftp_remote_port) {
      current.nasPort = Number(data.ftp_remote_port) || 21
    }
    if (data.ftp_remote_user) {
      current.nasUser = String(data.ftp_remote_user).trim()
    }
    if (data.ftp_remote_password) {
      current.nasPassword = String(data.ftp_remote_password)
    }
    if (data.ftp_remote_base_dir) {
      current.nasBaseDir = String(data.ftp_remote_base_dir).trim() || "/"
    }
    if (data.local_storage_path && !current.ssdPath) {
      current.ssdPath = String(data.local_storage_path).trim()
    }

    saveUserSettings(current)
    await resolveActiveNasRoute({ force: true })
    return getConfig()
  } catch (err) {
    console.warn("[Config] No se pudo sincronizar configuración desde Supabase:", err.message)
    return null
  }
}

/**
 * Guarda cambios de configuración tanto en `lamha-settings.json` como en Supabase `studio_delivery_settings` (id = 1)
 * para mantener Panel Admin e Ingest Companion 100% sincronizados.
 */
async function saveConfigToSupabase(patch = {}) {
  updateSettings(patch)
  const cfg = getConfig()

  try {
    const { createClient } = require("@supabase/supabase-js")
    const key = cfg.supabaseServiceKey || cfg.supabaseAnonKey
    if (cfg.supabaseUrl && key) {
      const sb = createClient(cfg.supabaseUrl, key, { auth: { persistSession: false } })
      const dbPayload = {
        id: 1,
        storage_mode: cfg.networkMode,
        smb_probe_host: cfg.nasLanHost,
        ftp_remote_host: cfg.nasTailscaleHost,
        smb_network_path: cfg.nasLanHost ? `\\\\${cfg.nasLanHost}\\${cfg.nasShareName || "Lamha-Storage"}` : "",
        ftp_remote_port: Number(cfg.nasPort) || 21,
        ftp_remote_user: cfg.nasUser,
        ftp_remote_password: cfg.nasPassword,
        ftp_remote_base_dir: cfg.nasBaseDir || "/",
        local_storage_path: cfg.ssdPath || "C:\\Lamha-Storage",
        updated_at: new Date().toISOString(),
      }
      await sb.from("studio_delivery_settings").upsert(dbPayload, { onConflict: "id" })
    }
  } catch (err) {
    console.warn("[Config] Error guardando en Supabase studio_delivery_settings:", err.message)
  }

  const route = await resolveActiveNasRoute({ force: true })
  return { ok: true, settings: getPublicSettings(), route }
}

module.exports = {
  getConfig,
  getPublicSettings,
  updateSettings,
  probeTcpPort,
  resolveActiveNasRoute,
  findAvailableSmbShareAsync,
  syncConfigFromSupabase,
  saveConfigToSupabase,
}
