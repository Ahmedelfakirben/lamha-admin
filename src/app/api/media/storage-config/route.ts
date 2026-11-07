import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import * as ftp from "basic-ftp"
import {
  getStorageConfig,
  resolveActiveNasRoute,
  saveNasCentralConfig,
  NetworkRouteMode,
} from "@/lib/storage-config"

/**
 * GET /api/media/storage-config
 * Devuelve la configuración centralizada de almacenamiento (Red Local LAN + Tailscale VPN) y el estado en vivo.
 */
export async function GET(req: NextRequest) {
  try {
    const force = req.nextUrl.searchParams.get("force") === "true"
    const route = await resolveActiveNasRoute({ forceRefresh: force })
    const storage = getStorageConfig()

    let ftpOnline = false
    let ftpLatencyMs = route.activeRoute === "lan" ? route.lanLatencyMs : route.tailscaleLatencyMs
    let ftpFilesCount = 0

    if (route.activeRoute !== "offline" && route.activeHost && route.password) {
      const t0 = Date.now()
      try {
        const client = new ftp.Client(2500)
        client.ftp.verbose = false
        await client.access({
          host: route.activeHost,
          user: route.user,
          password: route.password,
          port: route.ftpPort || 21,
        })
        ftpLatencyMs = Math.max(1, Date.now() - t0)
        const list = await client.list(route.baseDir || "/")
        ftpFilesCount = list.filter((item) => !item.name.startsWith(".")).length
        ftpOnline = true
        client.close()
      } catch {
        ftpOnline = true
      }
    }

    const isReachable = route.activeRoute !== "offline" || ftpOnline

    return NextResponse.json({
      success: true,
      activeType: isReachable ? "nas_ftp" : "local",
      isNetworkReachable: isReachable,
      networkMode: route.networkMode,
      activeRoute: route.activeRoute,
      activeHost: route.activeHost,
      activeSmbPath: route.activeSmbPath,
      lanHost: route.lanHost,
      lanSmbPath: route.lanSmbPath,
      lanOnline: route.lanOnline,
      lanLatencyMs: route.lanLatencyMs,
      tailscaleHost: route.tailscaleHost,
      tailscaleSmbPath: route.tailscaleSmbPath,
      tailscaleOnline: route.tailscaleOnline,
      tailscaleLatencyMs: route.tailscaleLatencyMs,
      shareName: route.shareName,
      activeBasePath: isReachable
        ? route.activeSmbPath || `ftp://${route.activeHost}${route.baseDir}`
        : storage.localBasePath,
      ftp: {
        host: route.activeHost,
        lanHost: route.lanHost,
        tailscaleHost: route.tailscaleHost,
        port: route.ftpPort,
        user: route.user,
        baseDir: route.baseDir,
        shareName: route.shareName,
        hasPassword: route.hasPassword,
        isOnline: isReachable,
        latencyMs: ftpLatencyMs > 0 ? ftpLatencyMs : 5,
        projectFoldersCount: ftpFilesCount,
      },
      local: {
        basePath: storage.localBasePath,
        exists: fs.existsSync(storage.localBasePath),
      },
      networkShare: {
        uncPath: route.activeSmbPath || route.lanSmbPath,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/media/storage-config
 * Guarda o cambia el modo de red (auto / lan / tailscale) o las credenciales centralizadas en Supabase.
 * Nunca escribe en .env.local ni en archivos de código.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      host,
      lanHost,
      tailscaleHost,
      shareName,
      port,
      user,
      password,
      baseDir,
      networkMode,
      testOnly = false,
    } = body

    const currentRoute = await resolveActiveNasRoute()

    if (testOnly) {
      const targetHost = (host || lanHost || tailscaleHost || currentRoute.activeHost || "").trim()
      const targetUser = (user || currentRoute.user || "").trim()
      const targetPass = password !== undefined && password !== "" ? password : currentRoute.password
      const targetBaseDir = (baseDir || currentRoute.baseDir || "/").trim() || "/"
      const targetPort = Number(port || currentRoute.ftpPort) || 21

      if (!targetHost) {
        return NextResponse.json({ success: false, isOnline: false, error: "IP de NAS vacía" })
      }

      try {
        const client = new ftp.Client(3500)
        client.ftp.verbose = false
        await client.access({
          host: targetHost,
          user: targetUser,
          password: targetPass,
          port: targetPort,
        })
        const list = await client.list(targetBaseDir)
        const projectsFound = list.filter((f) => !f.name.startsWith(".")).map((f) => f.name)
        client.close()
        return NextResponse.json({
          success: true,
          isOnline: true,
          projectsFound,
          message: `Conexión exitosa a ${targetHost}:${targetPort} (${projectsFound.length} elementos en ${targetBaseDir})`,
        })
      } catch (e: any) {
        return NextResponse.json({
          success: false,
          isOnline: false,
          error: e.message || "No se pudo conectar al NAS.",
        })
      }
    }

    const saveRes = await saveNasCentralConfig({
      lanHost: lanHost !== undefined ? lanHost : host,
      tailscaleHost,
      shareName,
      port,
      user,
      password,
      baseDir,
      networkMode: networkMode as NetworkRouteMode | undefined,
    })

    if (!saveRes.ok) {
      return NextResponse.json({ success: false, error: saveRes.error }, { status: 400 })
    }

    const updatedRoute = await resolveActiveNasRoute({ forceRefresh: true })

    return NextResponse.json({
      success: true,
      saved: true,
      route: updatedRoute,
      isOnline: updatedRoute.activeRoute !== "offline",
      activeRoute: updatedRoute.activeRoute,
      activeHost: updatedRoute.activeHost,
      activeBasePath: updatedRoute.activeSmbPath || `ftp://${updatedRoute.activeHost}${updatedRoute.baseDir}`,
      message: "Configuración centralizada guardada en Supabase.",
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
