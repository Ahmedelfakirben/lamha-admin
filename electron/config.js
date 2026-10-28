const fs = require("fs")
const path = require("path")
const { app } = require("electron")

/** Lee variables desde lamha-admin/.env.local (solo existe en desarrollo / instalación del estudio). */
function readEnvFile() {
  const out = {}
  const candidates = [
    path.join(__dirname, "..", ".env.local"),
    path.join(__dirname, "..", "..", ".env.local"),
    path.join(process.cwd(), ".env.local"),
    path.join(app.getAppPath ? app.getAppPath() : "", ".env.local"),
    path.join(app.getPath ? app.getPath("userData") : "", ".env.local"),
  ]
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

const settingsFile = () => path.join(app.getPath("userData"), "lamha-settings.json")

function loadUserSettings() {
  try {
    if (fs.existsSync(settingsFile())) return JSON.parse(fs.readFileSync(settingsFile(), "utf-8"))
  } catch {}
  return {}
}

function saveUserSettings(data) {
  try {
    fs.writeFileSync(settingsFile(), JSON.stringify(data, null, 2), "utf-8")
    return true
  } catch {
    return false
  }
}

/** Configuración efectiva: ajustes del usuario > .env.local > valores por defecto. */
function getConfig() {
  const env = readEnvFile()
  const user = loadUserSettings()
  return {
    supabaseUrl: user.supabaseUrl || env.NEXT_PUBLIC_SUPABASE_URL || "https://lam7a.elfakir.com",
    supabaseAnonKey: user.supabaseAnonKey || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4OTkxODUwMCwiZXhwIjo0OTQ1NTkyMTAwLCJyb2xlIjoiYW5vbiJ9.BO0AL139qok5hXKYeU5c7tmD2J0QroXeFuqndyhln0Y",
    dashboardUrl: user.dashboardUrl || "https://admin.lam7a.ma",
    ssdPath: user.ssdPath || env.LAMHA_LOCAL_STORAGE || "C:\\Lamha-Storage",
    nasHost: user.nasHost || env.LAMHA_FTP_HOST || "192.168.11.1",
    nasUser: user.nasUser || env.LAMHA_FTP_USER || "admin",
    nasPassword: user.nasPassword || env.LAMHA_FTP_PASSWORD || "Satec2016C@U",
    nasBaseDir: user.nasBaseDir || env.LAMHA_FTP_BASE_DIR || "/usb1_1/Lamha-Storage",
    language: user.language || "fr",
    theme: user.theme || "dark",
    nasAutoSyncEnabled: user.nasAutoSyncEnabled !== undefined ? Boolean(user.nasAutoSyncEnabled) : true,
    nasSyncPausedUntil: user.nasSyncPausedUntil || null,
  }
}

/** Versión segura para enviar al renderer (sin contraseñas ni claves). */
function getPublicSettings() {
  const c = getConfig()
  return {
    supabaseUrl: c.supabaseUrl,
    dashboardUrl: c.dashboardUrl,
    ssdPath: c.ssdPath,
    nasHost: c.nasHost,
    nasUser: c.nasUser,
    nasBaseDir: c.nasBaseDir,
    language: c.language,
    theme: c.theme,
    hasNasPassword: !!c.nasPassword,
    hasSupabaseKey: !!c.supabaseAnonKey,
    nasAutoSyncEnabled: c.nasAutoSyncEnabled,
    nasSyncPausedUntil: c.nasSyncPausedUntil,
  }
}

function updateSettings(patch) {
  const current = loadUserSettings()
  const allowed = [
    "supabaseUrl",
    "dashboardUrl",
    "ssdPath",
    "nasHost",
    "nasUser",
    "nasPassword",
    "nasBaseDir",
    "language",
    "theme",
    "nasAutoSyncEnabled",
    "nasSyncPausedUntil",
  ]
  for (const k of allowed) {
    if (patch[k] !== undefined && patch[k] !== "") current[k] = patch[k]
  }
  return saveUserSettings(current)
}

module.exports = { getConfig, getPublicSettings, updateSettings }
