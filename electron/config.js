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
    openAtLogin: user.openAtLogin !== undefined ? Boolean(user.openAtLogin) : true,
    smtpHost: user.smtpHost || env.SMTP_HOST || "smtp.office365.com",
    smtpPort: Number(user.smtpPort || env.SMTP_PORT || 587),
    smtpSecure: (user.smtpSecure || env.SMTP_SECURE) === "true",
    smtpUser: user.smtpUser || env.SMTP_USER || "",
    smtpPass: user.smtpPass || env.SMTP_PASS || "",
    smtpFromName: user.smtpFromName || env.SMTP_FROM_NAME || "Lam7a Studios",
    smtpFromEmail: user.smtpFromEmail || env.SMTP_FROM_EMAIL || env.SMTP_USER || "contact@lam7a.ma",
    evolutionUrl: (user.evolutionUrl || env.EVOLUTION_API_URL || "https://wa-api.elfakir.com").replace(/\/+$/, ""),
    evolutionKey: user.evolutionKey || env.EVOLUTION_API_KEY || "",
    evolutionInstance: user.evolutionInstance || env.EVOLUTION_INSTANCE_NAME || "lam7astudio",
    // Ciclo de vida QNAP (todas las cantidades son editables desde Ingest Companion)
    retentionEnabled: user.retentionEnabled !== undefined ? Boolean(user.retentionEnabled) : false,
    retentionAutoNotice: user.retentionAutoNotice !== undefined ? Boolean(user.retentionAutoNotice) : true,
    retentionAutoPurge: user.retentionAutoPurge !== undefined ? Boolean(user.retentionAutoPurge) : true,
    retentionCapacityTb: positiveNumber(user.retentionCapacityTb, 3.6),
    retentionTriggerTb: positiveNumber(user.retentionTriggerTb, 2.6),
    retentionReleaseTb: positiveNumber(user.retentionReleaseTb, 1.0),
    retentionGraceDays: Math.max(1, Math.round(positiveNumber(user.retentionGraceDays, 7))),
    retentionMode: user.retentionMode === "delete_all" ? "delete_all" : "keep_finals",
    retentionNoticeLang: ["fr", "ar", "es", "en"].includes(user.retentionNoticeLang) ? user.retentionNoticeLang : "fr",
  }
}

function positiveNumber(v, fallback) {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : fallback
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
    openAtLogin: c.openAtLogin,
    retentionEnabled: c.retentionEnabled,
    retentionAutoNotice: c.retentionAutoNotice,
    retentionAutoPurge: c.retentionAutoPurge,
    retentionCapacityTb: c.retentionCapacityTb,
    retentionTriggerTb: c.retentionTriggerTb,
    retentionReleaseTb: c.retentionReleaseTb,
    retentionGraceDays: c.retentionGraceDays,
    retentionMode: c.retentionMode,
    retentionNoticeLang: c.retentionNoticeLang,
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
    "openAtLogin",
    "retentionEnabled",
    "retentionAutoNotice",
    "retentionAutoPurge",
    "retentionCapacityTb",
    "retentionTriggerTb",
    "retentionReleaseTb",
    "retentionGraceDays",
    "retentionMode",
    "retentionNoticeLang",
  ]
  for (const k of allowed) {
    if (patch[k] !== undefined && patch[k] !== "") current[k] = patch[k]
  }
  return saveUserSettings(current)
}

module.exports = { getConfig, getPublicSettings, updateSettings }
