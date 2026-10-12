import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { testGoogleDriveConnection } from "@/lib/gdrive"
import { getStorageConfig, NAS_FTP_CONFIG } from "@/lib/storage-config"
import * as ftp from "basic-ftp"

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  return createClient(url, key, { auth: { persistSession: false } })
}

/**
 * GET /api/deliveries/settings
 * Retorna la configuración activa de almacenamiento y entregas
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    
    // 1. Obtener ajustes desde Supabase
    let settings = {
      storage_mode: "auto", // 'cloud', 'nas', 'auto'
      default_retention_days: 30,
      gdrive_parent_folder_id: process.env.GDRIVE_PARENT_FOLDER_ID || "",
      has_gdrive_credentials: Boolean(process.env.GDRIVE_CLIENT_EMAIL && process.env.GDRIVE_PRIVATE_KEY),
      gdrive_client_email: process.env.GDRIVE_CLIENT_EMAIL || "",
      isOAuthConnected: false,
      oauthEmail: null as string | null,
      authType: "service_account" as "oauth" | "service_account",
    }

    try {
      const { data } = await supabase
        .from("studio_delivery_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle()

      if (data) {
        settings.storage_mode = data.storage_mode || settings.storage_mode
        settings.default_retention_days = data.default_retention_days || settings.default_retention_days
        if (data.gdrive_parent_folder_id) settings.gdrive_parent_folder_id = data.gdrive_parent_folder_id
        
        if (data.gdrive_private_key?.startsWith("oauth_refresh:")) {
          settings.isOAuthConnected = true
          settings.oauthEmail = data.gdrive_client_email
          settings.has_gdrive_credentials = true
          settings.authType = "oauth"
        } else if (data.gdrive_client_email) {
          settings.gdrive_client_email = data.gdrive_client_email
          settings.has_gdrive_credentials = Boolean(data.gdrive_client_email && data.gdrive_private_key)
        }
      }
    } catch (err) {
      console.warn("Tabla studio_delivery_settings no accesible, usando defaults:", err)
    }

    // 2. Verificar estado de NAS
    let isNasOnline = false
    try {
      const client = new ftp.Client(1500)
      client.ftp.verbose = false
      await client.access({
        host: NAS_FTP_CONFIG.host,
        user: NAS_FTP_CONFIG.user,
        password: NAS_FTP_CONFIG.password,
        port: 21,
      })
      isNasOnline = true
      client.close()
    } catch {
      isNasOnline = false
    }

    // Determinar modo efectivo
    let effectiveMode = settings.storage_mode
    if (settings.storage_mode === "auto") {
      effectiveMode = isNasOnline ? "nas" : "cloud"
    }

    return NextResponse.json({
      success: true,
      settings,
      isNasOnline,
      effectiveMode,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/deliveries/settings
 * Guarda los ajustes de modo de almacenamiento, retención y prueba de Google Drive
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      storage_mode,
      default_retention_days,
      gdrive_parent_folder_id,
      gdrive_client_email,
      gdrive_private_key,
      test_gdrive = false,
    } = body

    // Si es solo prueba de Google Drive
    if (test_gdrive) {
      const testResult = await testGoogleDriveConnection({
        clientEmail: gdrive_client_email,
        privateKey: gdrive_private_key,
        parentFolderId: gdrive_parent_folder_id,
      })
      return NextResponse.json(testResult)
    }

    const supabase = getSupabaseAdmin()

    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    }

    if (storage_mode) updatePayload.storage_mode = storage_mode
    if (default_retention_days) updatePayload.default_retention_days = Number(default_retention_days)
    if (gdrive_parent_folder_id !== undefined) updatePayload.gdrive_parent_folder_id = gdrive_parent_folder_id
    if (gdrive_client_email !== undefined) updatePayload.gdrive_client_email = gdrive_client_email
    if (gdrive_private_key !== undefined && gdrive_private_key !== "") {
      updatePayload.gdrive_private_key = gdrive_private_key
    }

    const { error } = await supabase
      .from("studio_delivery_settings")
      .upsert({ id: 1, ...updatePayload })

    if (error) {
      console.warn("No se pudo actualizar studio_delivery_settings:", error.message)
    }

    return NextResponse.json({
      success: true,
      message: "Configuración de entregas y almacenamiento guardada correctamente.",
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
