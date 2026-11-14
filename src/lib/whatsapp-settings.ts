import fs from "fs"
import path from "path"
import { createAdminClient } from "@/lib/supabase"
import {
  WhatsAppLanguage,
  WhatsAppTemplateKey,
  SingleWhatsAppTemplateConfig,
  WhatsAppAutomationSettings,
  DEFAULT_WHATSAPP_TEMPLATES_I18N,
  getDefaultWhatsAppAutomationSettings,
  renderWhatsAppMessageTemplate,
} from "./whatsapp-templates-config"

export type {
  WhatsAppLanguage,
  WhatsAppTemplateKey,
  SingleWhatsAppTemplateConfig,
  WhatsAppAutomationSettings,
}
export {
  DEFAULT_WHATSAPP_TEMPLATES_I18N,
  getDefaultWhatsAppAutomationSettings,
  renderWhatsAppMessageTemplate,
}

const SETTINGS_ENTITY_TYPE = "whatsapp_settings"
const SETTINGS_ENTITY_ID = "global_whatsapp_config"
const getLocalFallbackFile = () => path.join(/*turbopackIgnore: true*/ process.cwd(), ".whatsapp-automation-settings.json")

let cachedSettings: { data: WhatsAppAutomationSettings; ts: number } | null = null

function mergeWithDefaults(partial?: any): WhatsAppAutomationSettings {
  const base = getDefaultWhatsAppAutomationSettings()
  if (!partial || typeof partial !== "object") return base

  if (partial.updatedAt) base.updatedAt = String(partial.updatedAt)
  const keys: WhatsAppTemplateKey[] = ["welcome", "photos_ready", "selection_confirmed", "ready_delivery"]
  const langs: WhatsAppLanguage[] = ["fr", "ar", "es", "en"]

  for (const k of keys) {
    const incoming = partial.templates?.[k]
    if (!incoming) continue
    if (typeof incoming.enabled === "boolean") {
      base.templates[k].enabled = incoming.enabled
    }
    if (incoming.translations && typeof incoming.translations === "object") {
      for (const l of langs) {
        if (typeof incoming.translations[l] === "string") {
          base.templates[k].translations[l] = incoming.translations[l]
        }
      }
    }
  }
  return base
}

export async function getWhatsAppAutomationSettings(forceRefresh = false): Promise<WhatsAppAutomationSettings> {
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
  } catch (err) {}

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

  const defaults = getDefaultWhatsAppAutomationSettings()
  cachedSettings = { data: defaults, ts: Date.now() }
  return defaults
}

export async function saveWhatsAppAutomationSettings(
  nextSettings: WhatsAppAutomationSettings,
  userContext?: { userId?: string; userName?: string; userEmail?: string; userRole?: string }
): Promise<{ success: boolean; settings: WhatsAppAutomationSettings; error?: string }> {
  const merged = mergeWithDefaults({
    ...nextSettings,
    updatedAt: new Date().toISOString(),
  })

  cachedSettings = { data: merged, ts: Date.now() }

  // Guardar copia local inmediata
  try {
    fs.writeFileSync(/*turbopackIgnore: true*/ getLocalFallbackFile(), JSON.stringify(merged, null, 2), "utf-8")
  } catch {}

  // Persistir en Supabase
  try {
    const supabase = createAdminClient()
    const { error: rpcErr } = await supabase.rpc("save_automation_settings", {
      p_action: "WHATSAPP_SETTINGS_UPDATED",
      p_entity_type: SETTINGS_ENTITY_TYPE,
      p_entity_id: SETTINGS_ENTITY_ID,
      p_entity_title: "Configuration Globale des Modèles WhatsApp",
      p_details: merged,
      p_user_name: userContext?.userName || "Admin Studio",
      p_user_email: userContext?.userEmail || "admin@lam7a.ma",
      p_user_role: userContext?.userRole || "super_admin",
    })

    if (!rpcErr) {
      return { success: true, settings: merged }
    }

    const { error } = await supabase.from("audit_logs").insert({
      action: "WHATSAPP_SETTINGS_UPDATED",
      entity_type: SETTINGS_ENTITY_TYPE,
      entity_id: SETTINGS_ENTITY_ID,
      entity_title: "Configuration Globale des Modèles WhatsApp",
      user_id: userContext?.userId || null,
      user_name: userContext?.userName || "Admin Studio",
      user_email: userContext?.userEmail || "admin@lam7a.ma",
      user_role: userContext?.userRole || "super_admin",
      details: merged,
    })

    if (error) {
      return { success: false, settings: merged, error: error.message }
    }
    return { success: true, settings: merged }
  } catch (err: any) {
    console.error("saveWhatsAppAutomationSettings error:", err)
    return { success: false, settings: merged, error: err?.message || "Error al guardar en Supabase" }
  }
}
