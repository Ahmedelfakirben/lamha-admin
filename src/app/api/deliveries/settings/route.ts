import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { testGoogleDriveConnection } from "@/lib/gdrive"
import { checkSmbProbe, getStorageConfig, NAS_FTP_CONFIG } from "@/lib/storage-config"
import * as ftp from "basic-ftp"

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  return createClient(url, key, { auth: { persistSession: false } })
}

/**
 * GET /api/deliveries/settings
 * Retorna la configuración activa de almacenamiento dual (SMB + Tailscale FTP) y Google Drive
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
      // Ajustes Dual-Access NAS
      smb_network_path: "\\\\192.168.1.220\\Proyectos",
      smb_probe_host: "192.168.1.220",
      ftp_remote_host: "",
      ftp_remote_port: 21,
      ftp_remote_user: "admin",
      ftp_remote_base_dir: "/usb1_1/Lamha-Storage",
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

        if (data.smb_network_path) settings.smb_network_path = data.smb_network_path
        if (data.smb_probe_host) settings.smb_probe_host = data.smb_probe_host
        if (data.ftp_remote_host !== undefined) settings.ftp_remote_host = data.ftp_remote_host
        if (data.ftp_remote_port) settings.ftp_remote_port = data.ftp_remote_port
        if (data.ftp_remote_user) settings.ftp_remote_user = data.ftp_remote_user
        if (data.ftp_remote_base_dir) settings.ftp_remote_base_dir = data.ftp_remote_base_dir
      }
    } catch (err) {
      console.warn("Tabla studio_delivery_settings no accesible, usando defaults:", err)
    }

    // 2. Verificación rápida de red local SMB mediante Socket TCP al puerto 445 (< 500ms)
    const isSmbOnline = await checkSmbProbe(settings.smb_probe_host, 500)

    // 3. Verificar estado de FTP (prioriza Tailscale si está fuera de LAN y configurado)
    let isNasOnline = false
    const effectiveFtpHost = (!isSmbOnline && settings.ftp_remote_host) 
      ? settings.ftp_remote_host 
      : NAS_FTP_CONFIG.host

    try {
      const client = new ftp.Client(1200)
      client.ftp.verbose = false
      await client.access({
        host: effectiveFtpHost,
        user: settings.ftp_remote_user || NAS_FTP_CONFIG.user,
        password: NAS_FTP_CONFIG.password,
        port: settings.ftp_remote_port || 21,
      })
      isNasOnline = true
      client.close()
    } catch {
      isNasOnline = false
    }

    // Determinar modo de conexión activo
    let connectionMode: "smb_local" | "tailscale_ftp" | "offline" = "offline"
    if (isSmbOnline) {
      connectionMode = "smb_local"
    } else if (isNasOnline) {
      connectionMode = "tailscale_ftp"
    }

    return NextResponse.json({
      success: true,
      settings,
      isSmbOnline,
      isNasOnline,
      connectionMode,
      effectiveMode: isSmbOnline ? "smb" : isNasOnline ? "ftp" : "cloud",
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/deliveries/settings
 * Guarda los ajustes de modo de almacenamiento, retención, dual NAS (SMB + Tailscale) y Google Drive
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
      test_smb = false,
      smb_network_path,
      smb_probe_host,
      ftp_remote_host,
      ftp_remote_port,
      ftp_remote_user,
      ftp_remote_password,
      ftp_remote_base_dir,
    } = body

    // Si es solo prueba rápida de SMB local puerto 445 (< 500ms)
    if (test_smb) {
      const host = smb_probe_host || "192.168.1.220"
      const startTime = Date.now()
      const reachable = await checkSmbProbe(host, 500)
      const latencyMs = Date.now() - startTime
      return NextResponse.json({
        success: reachable,
        host,
        port: 445,
        reachable,
        latencyMs,
        message: reachable
          ? `Conexión SMB local exitosa a ${host}:445 en ${latencyMs}ms.`
          : `Timeout (500ms). El host local ${host}:445 no responde.`,
      })
    }

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

    // Ajustes Dual Access NAS
    if (smb_network_path !== undefined) updatePayload.smb_network_path = smb_network_path
    if (smb_probe_host !== undefined) updatePayload.smb_probe_host = smb_probe_host
    if (ftp_remote_host !== undefined) updatePayload.ftp_remote_host = ftp_remote_host
    if (ftp_remote_port !== undefined) updatePayload.ftp_remote_port = Number(ftp_remote_port)
    if (ftp_remote_user !== undefined) updatePayload.ftp_remote_user = ftp_remote_user
    if (ftp_remote_password !== undefined && ftp_remote_password !== "") {
      updatePayload.ftp_remote_password = ftp_remote_password
    }
    if (ftp_remote_base_dir !== undefined) updatePayload.ftp_remote_base_dir = ftp_remote_base_dir

    const { error } = await supabase
      .from("studio_delivery_settings")
      .upsert({ id: 1, ...updatePayload })

    if (error) {
      console.warn("No se pudo actualizar studio_delivery_settings:", error.message)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: "Configuración de entregas y almacenamiento dual guardada correctamente.",
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
