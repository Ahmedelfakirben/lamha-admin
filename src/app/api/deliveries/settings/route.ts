import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { testGoogleDriveConnection } from "@/lib/gdrive"
import {
  checkTcpProbe,
  resolveActiveNasRoute,
  saveNasCentralConfig,
  invalidateStorageConfigCache,
  extractShareName,
  normalizeNetworkMode,
} from "@/lib/storage-config"
import * as ftp from "basic-ftp"

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  return createClient(url, key, { auth: { persistSession: false } })
}

/**
 * GET /api/deliveries/settings
 * Retorna la configuración centralizada de almacenamiento híbrido (Red Local LAN + Tailscale VPN) y Google Drive
 */
export async function GET(req: NextRequest) {
  try {
    const force = req.nextUrl.searchParams.get("force") === "true"
    const supabase = getSupabaseAdmin()

    let settings = {
      storage_mode: "auto" as "auto" | "lan" | "tailscale",
      default_retention_days: 30,
      gdrive_parent_folder_id: "",
      has_gdrive_credentials: false,
      gdrive_client_email: "",
      isOAuthConnected: false,
      oauthEmail: null as string | null,
      authType: "oauth" as "oauth" | "service_account",
      smb_network_path: "",
      smb_probe_host: "",
      ftp_remote_host: "",
      ftp_remote_port: 21,
      ftp_remote_user: "",
      ftp_remote_base_dir: "/",
      share_name: "Lamha-Storage",
      has_nas_password: false,
    }

    try {
      const { data } = await supabase
        .from("studio_delivery_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle()

      if (data) {
        settings.storage_mode = normalizeNetworkMode(data.storage_mode)
        settings.default_retention_days = data.default_retention_days || settings.default_retention_days
        if (data.gdrive_parent_folder_id) settings.gdrive_parent_folder_id = data.gdrive_parent_folder_id

        if (data.gdrive_private_key?.startsWith("oauth_refresh:")) {
          settings.isOAuthConnected = true
          settings.oauthEmail = data.gdrive_client_email
          settings.gdrive_client_email = data.gdrive_client_email || ""
          settings.has_gdrive_credentials = true
          settings.authType = "oauth"
        }

        settings.smb_probe_host = (data.smb_probe_host || "").trim()
        settings.ftp_remote_host = (data.ftp_remote_host || "").trim()
        settings.share_name = extractShareName(data.smb_network_path)
        settings.smb_network_path =
          data.smb_network_path ||
          (settings.smb_probe_host ? `\\\\${settings.smb_probe_host}\\${settings.share_name}` : "")
        settings.ftp_remote_port = Number(data.ftp_remote_port) || 21
        settings.ftp_remote_user = (data.ftp_remote_user || "").trim()
        settings.ftp_remote_base_dir = (data.ftp_remote_base_dir || "/").trim() || "/"
        settings.has_nas_password = Boolean(data.ftp_remote_password && String(data.ftp_remote_password).length > 0)
      }
    } catch (err) {
      console.warn("Tabla studio_delivery_settings no accesible:", err)
    }

    const route = await resolveActiveNasRoute({ forceRefresh: force })

    const connectionMode: "smb_local" | "tailscale_ftp" | "offline" =
      route.activeRoute === "lan"
        ? "smb_local"
        : route.activeRoute === "tailscale"
        ? "tailscale_ftp"
        : "offline"

    return NextResponse.json({
      success: true,
      settings,
      route,
      isSmbOnline: route.lanOnline,
      isNasOnline: route.tailscaleOnline || route.lanOnline,
      lanOnline: route.lanOnline,
      lanLatencyMs: route.lanLatencyMs,
      tailscaleOnline: route.tailscaleOnline,
      tailscaleLatencyMs: route.tailscaleLatencyMs,
      activeRoute: route.activeRoute,
      activeHost: route.activeHost,
      activeSmbPath: route.activeSmbPath,
      connectionMode,
      effectiveMode: route.activeRoute === "lan" ? "smb" : route.activeRoute === "tailscale" ? "ftp" : "cloud",
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/deliveries/settings
 * Guarda o prueba de forma centralizada las rutas LAN + Tailscale, credenciales del NAS y ajustes de Google Drive
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      storage_mode,
      network_mode,
      default_retention_days,
      gdrive_parent_folder_id,
      gdrive_client_email,
      gdrive_private_key,
      test_gdrive = false,
      test_smb = false,
      test_ftp = false,
      smb_network_path,
      smb_probe_host,
      ftp_remote_host,
      ftp_remote_port,
      ftp_remote_user,
      ftp_remote_password,
      ftp_remote_base_dir,
      share_name,
    } = body

    // 1. Prueba rápida de SMB / TCP 445 (< 450ms)
    if (test_smb) {
      const host = (smb_probe_host || "").trim()
      if (!host) {
        return NextResponse.json({ success: false, reachable: false, message: "Introduce una IP válida." })
      }
      const [smbProbe, ftpProbe] = await Promise.all([
        checkTcpProbe(host, 445, 450, true),
        checkTcpProbe(host, Number(ftp_remote_port) || 21, 450, true),
      ])
      const reachable = smbProbe.reachable || ftpProbe.reachable
      const latencyMs = smbProbe.reachable ? smbProbe.latencyMs : ftpProbe.latencyMs
      return NextResponse.json({
        success: reachable,
        host,
        port: smbProbe.reachable ? 445 : Number(ftp_remote_port) || 21,
        reachable,
        smbReachable: smbProbe.reachable,
        ftpReachable: ftpProbe.reachable,
        latencyMs,
        message: reachable
          ? `Conexión verificada a ${host} (${latencyMs}ms · SMB:${smbProbe.reachable ? "OK" : "-"} / FTP:${ftpProbe.reachable ? "OK" : "-"})`
          : `Sin respuesta desde ${host} (Timeout 450ms).`,
      })
    }

    // 2. Prueba completa con autenticación FTP (LAN o Tailscale)
    if (test_ftp) {
      const route = await resolveActiveNasRoute({ forceRefresh: true })
      const host = (ftp_remote_host || smb_probe_host || route.activeHost || "").trim()
      const port = Number(ftp_remote_port || route.ftpPort) || 21
      const user = (ftp_remote_user || route.user || "").trim()
      const password = ftp_remote_password !== undefined && ftp_remote_password !== "" ? ftp_remote_password : route.password
      const baseDir = (ftp_remote_base_dir || route.baseDir || "/").trim() || "/"

      if (!host) {
        return NextResponse.json({ success: false, online: false, message: "Introduce una IP de NAS para probar." })
      }

      const t0 = Date.now()
      const client = new ftp.Client(5000)
      client.ftp.verbose = false
      try {
        await client.access({ host, port, user, password })
        const list = await client.list(baseDir)
        const latencyMs = Math.max(1, Date.now() - t0)
        client.close()
        return NextResponse.json({
          success: true,
          online: true,
          reachable: true,
          latencyMs,
          foldersCount: list.filter((x) => !x.name.startsWith(".")).length,
          message: `Autenticación exitosa en ${host}:${port} (${latencyMs}ms · ${list.filter((x) => !x.name.startsWith(".")).length} carpetas)`,
        })
      } catch (err: any) {
        try {
          client.close()
        } catch {}
        return NextResponse.json({
          success: false,
          online: false,
          reachable: false,
          message: err.message || "Error de autenticación FTP",
        })
      }
    }

    // 3. Prueba de Google Drive
    if (test_gdrive) {
      const testResult = await testGoogleDriveConnection({
        clientEmail: gdrive_client_email,
        privateKey: gdrive_private_key,
        parentFolderId: gdrive_parent_folder_id,
      })
      return NextResponse.json(testResult)
    }

    // 4. Guardado centralizado en Supabase studio_delivery_settings
    const supabase = getSupabaseAdmin()
    const currentRes = await supabase.from("studio_delivery_settings").select("*").eq("id", 1).maybeSingle()
    const current = currentRes.data || {}

    const lanHost = smb_probe_host !== undefined ? String(smb_probe_host).trim() : (current.smb_probe_host || "").trim()
    const tailscaleHost = ftp_remote_host !== undefined ? String(ftp_remote_host).trim() : (current.ftp_remote_host || "").trim()
    const resolvedShare =
      share_name !== undefined && String(share_name).trim() !== ""
        ? String(share_name).trim().replace(/^[\\/]+|[\\/]+$/g, "")
        : extractShareName(smb_network_path || current.smb_network_path)

    const resolvedSmbPath =
      smb_network_path !== undefined && String(smb_network_path).trim() !== ""
        ? String(smb_network_path).trim()
        : lanHost
        ? `\\\\${lanHost}\\${resolvedShare}`
        : current.smb_network_path || ""

    const updatePayload: any = {
      id: 1,
      updated_at: new Date().toISOString(),
      smb_probe_host: lanHost,
      ftp_remote_host: tailscaleHost,
      smb_network_path: resolvedSmbPath,
    }

    const modeToSave = network_mode || storage_mode
    if (modeToSave) updatePayload.storage_mode = normalizeNetworkMode(modeToSave)
    if (default_retention_days) updatePayload.default_retention_days = Number(default_retention_days)
    if (gdrive_parent_folder_id !== undefined) updatePayload.gdrive_parent_folder_id = gdrive_parent_folder_id
    if (gdrive_client_email !== undefined) updatePayload.gdrive_client_email = gdrive_client_email
    if (gdrive_private_key !== undefined && gdrive_private_key !== "") {
      updatePayload.gdrive_private_key = gdrive_private_key
    }

    if (ftp_remote_port !== undefined) updatePayload.ftp_remote_port = Number(ftp_remote_port) || 21
    if (ftp_remote_user !== undefined) updatePayload.ftp_remote_user = String(ftp_remote_user).trim()
    if (ftp_remote_password !== undefined && ftp_remote_password !== "") {
      updatePayload.ftp_remote_password = ftp_remote_password
    }
    if (ftp_remote_base_dir !== undefined && String(ftp_remote_base_dir).trim() !== "") {
      updatePayload.ftp_remote_base_dir = String(ftp_remote_base_dir).trim()
    }

    const { error } = await supabase.from("studio_delivery_settings").upsert(updatePayload)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    invalidateStorageConfigCache()
    const route = await resolveActiveNasRoute({ forceRefresh: true })

    return NextResponse.json({
      success: true,
      route,
      message: "Configuración centralizada (Red Local + Tailscale) guardada en Supabase.",
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
