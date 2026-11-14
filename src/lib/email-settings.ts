import fs from "fs"
import path from "path"
import { createAdminClient, createClient } from "@/lib/supabase"
import {
  DEFAULT_TEMPLATES_I18N,
  EmailLanguage,
  EmailTemplateKey,
  EmailTemplateLangCopy,
  resolveLang,
} from "./email-templates"

export interface SingleTemplateConfig {
  key: EmailTemplateKey
  enabled: boolean
   sendWhatsAppAlso?: boolean
  translations: Record<EmailLanguage, EmailTemplateLangCopy>
}

export interface EmailAutomationSettings {
  updatedAt: string
  templates: Record<EmailTemplateKey, SingleTemplateConfig>
}

const SETTINGS_ENTITY_TYPE = "email_settings"
const SETTINGS_ENTITY_ID = "global_email_config"
const getLocalFallbackFile = () => path.join(/*turbopackIgnore: true*/ process.cwd(), ".email-automation-settings.json")

let cachedSettings: { data: EmailAutomationSettings; ts: number } | null = null

export function getDefaultEmailAutomationSettings(): EmailAutomationSettings {
  return {
    updatedAt: new Date().toISOString(),
    templates: {
      welcome: {
        key: "welcome",
        enabled: true,
        sendWhatsAppAlso: true,
        translations: JSON.parse(JSON.stringify(DEFAULT_TEMPLATES_I18N.welcome)),
      },
      photos_ready: {
        key: "photos_ready",
        enabled: true,
        sendWhatsAppAlso: true,
        translations: JSON.parse(JSON.stringify(DEFAULT_TEMPLATES_I18N.photos_ready)),
      },
      selection_confirmed: {
        key: "selection_confirmed",
        enabled: true,
        sendWhatsAppAlso: true,
        translations: JSON.parse(JSON.stringify(DEFAULT_TEMPLATES_I18N.selection_confirmed)),
      },
      ready_delivery: {
        key: "ready_delivery",
        enabled: true,
        sendWhatsAppAlso: true,
        translations: JSON.parse(JSON.stringify(DEFAULT_TEMPLATES_I18N.ready_delivery)),
      },
    },
  }
}

function mergeWithDefaults(partial?: any): EmailAutomationSettings {
  const base = getDefaultEmailAutomationSettings()
  if (!partial || typeof partial !== "object") return base

  if (partial.updatedAt) base.updatedAt = String(partial.updatedAt)
  const keys: EmailTemplateKey[] = ["welcome", "photos_ready", "selection_confirmed", "ready_delivery"]
  const langs: EmailLanguage[] = ["fr", "ar", "es", "en"]

  for (const k of keys) {
    const incoming = partial.templates?.[k]
    if (!incoming) continue
    if (typeof incoming.enabled === "boolean") {
      base.templates[k].enabled = incoming.enabled
    }
    if (typeof incoming.sendWhatsAppAlso === "boolean") {
      base.templates[k].sendWhatsAppAlso = incoming.sendWhatsAppAlso
    }
    if (incoming.translations && typeof incoming.translations === "object") {
      for (const l of langs) {
        const incLang = incoming.translations[l]
        if (incLang && typeof incLang === "object") {
          base.templates[k].translations[l] = {
            ...base.templates[k].translations[l],
            ...incLang,
          }
        }
      }
    }
  }
  return base
}

export async function getEmailAutomationSettings(forceRefresh = false): Promise<EmailAutomationSettings> {
  if (!forceRefresh && cachedSettings && Date.now() - cachedSettings.ts < 15000) {
    return cachedSettings.data
  }

  // 1. Intentar leer desde Supabase mediante RPC SECURITY DEFINER (funciona con anon y service_role) o consulta directa
  try {
    const supabase = createAdminClient()
    const { data: rpcDetails, error: rpcErr } = await supabase.rpc("get_automation_settings", {
      p_entity_type: SETTINGS_ENTITY_TYPE,
      p_entity_id: SETTINGS_ENTITY_ID,
    })

    if (!rpcErr && rpcDetails && typeof rpcDetails === "object") {
      const merged = mergeWithDefaults(rpcDetails)
      cachedSettings = { data: merged, ts: Date.now() }
      return merged
    }

    const { data, error } = await supabase
      .from("audit_logs")
      .select("details, created_at")
      .eq("entity_type", SETTINGS_ENTITY_TYPE)
      .eq("entity_id", SETTINGS_ENTITY_ID)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!error && data?.details && typeof data.details === "object") {
      const merged = mergeWithDefaults(data.details)
      cachedSettings = { data: merged, ts: Date.now() }
      return merged
    }
  } catch (err) {
    // Continuar al fallback local si hubiera algún problema de red
  }

  // 2. Fallback archivo local en servidor
  try {
    const fallbackFile = getLocalFallbackFile()
    if (fs.existsSync(/*turbopackIgnore: true*/ fallbackFile)) {
      const raw = JSON.parse(fs.readFileSync(/*turbopackIgnore: true*/ fallbackFile, "utf-8"))
      const merged = mergeWithDefaults(raw)
      cachedSettings = { data: merged, ts: Date.now() }
      return merged
    }
  } catch {}

  const defaults = getDefaultEmailAutomationSettings()
  cachedSettings = { data: defaults, ts: Date.now() }
  return defaults
}

export async function saveEmailAutomationSettings(
  nextSettings: EmailAutomationSettings,
  userContext?: { userId?: string; userName?: string; userEmail?: string; userRole?: string }
): Promise<{ success: boolean; settings: EmailAutomationSettings; error?: string }> {
  const merged = mergeWithDefaults({
    ...nextSettings,
    updatedAt: new Date().toISOString(),
  })

  cachedSettings = { data: merged, ts: Date.now() }

  // Guardar copia local inmediata
  try {
    fs.writeFileSync(/*turbopackIgnore: true*/ getLocalFallbackFile(), JSON.stringify(merged, null, 2), "utf-8")
  } catch {}

  // Guardar en Supabase (audit_logs) para sincronización global entre todas las instancias y PCs
  try {
    const admin = createAdminClient()
    const { error: rpcErr } = await admin.rpc("save_automation_settings", {
      p_action: "EMAIL_SETTINGS_UPDATED",
      p_entity_type: SETTINGS_ENTITY_TYPE,
      p_entity_id: SETTINGS_ENTITY_ID,
      p_entity_title: "Configuración de Correos Automáticos y Plantillas",
      p_details: merged,
      p_user_name: userContext?.userName || "Admin Studio",
      p_user_email: userContext?.userEmail || "admin@lam7a.ma",
      p_user_role: userContext?.userRole || "super_admin",
    })

    if (!rpcErr) {
      return { success: true, settings: merged }
    }

    const payload = {
      user_id: userContext?.userId || null,
      user_name: userContext?.userName || "Admin Studio",
      user_email: userContext?.userEmail || "admin@lam7a.ma",
      user_role: userContext?.userRole || "super_admin",
      action: "EMAIL_SETTINGS_UPDATED",
      entity_type: SETTINGS_ENTITY_TYPE,
      entity_id: SETTINGS_ENTITY_ID,
      entity_title: "Configuración de Correos Automáticos y Plantillas",
      details: merged,
    }

    const { error } = await admin.from("audit_logs").insert(payload)
    if (error) {
      return { success: false, settings: merged, error: error.message }
    }
    return { success: true, settings: merged }
  } catch (err: any) {
    return { success: false, settings: merged, error: err?.message || "Error al guardar en Supabase" }
  }
}

export async function getTemplateConfigForSend(
  key: EmailTemplateKey,
  language?: string | null
): Promise<{ enabled: boolean; sendWhatsAppAlso: boolean; copy: EmailTemplateLangCopy }> {
  const settings = await getEmailAutomationSettings()
  const tpl = settings.templates[key] || getDefaultEmailAutomationSettings().templates[key]
  const lang = resolveLang(language)
  return {
    enabled: tpl.enabled !== false,
    sendWhatsAppAlso: tpl.sendWhatsAppAlso !== false,
    copy: tpl.translations[lang] || tpl.translations.fr,
  }
}

