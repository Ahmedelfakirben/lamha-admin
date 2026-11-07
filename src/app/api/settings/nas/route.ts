import { NextRequest, NextResponse } from "next/server"
import { resolveActiveNasRoute, saveNasCentralConfig, NetworkRouteMode } from "@/lib/storage-config"
import ftp from "basic-ftp"

export const dynamic = "force-dynamic"

export async function GET() {
  const route = await resolveActiveNasRoute()
  return NextResponse.json({
    host: route.activeHost,
    lanHost: route.lanHost,
    tailscaleHost: route.tailscaleHost,
    shareName: route.shareName,
    networkMode: route.networkMode,
    activeRoute: route.activeRoute,
    user: route.user,
    baseDir: route.baseDir,
    hasPassword: route.hasPassword,
    online: route.activeRoute !== "offline",
    lanOnline: route.lanOnline,
    tailscaleOnline: route.tailscaleOnline,
    latencyMs: route.activeRoute === "lan" ? route.lanLatencyMs : route.tailscaleLatencyMs,
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { host, lanHost, tailscaleHost, shareName, user, password, baseDir, networkMode, testOnly } = body
    const current = await resolveActiveNasRoute()

    if (testOnly) {
      const targetHost = (host || lanHost || tailscaleHost || current.activeHost || "").trim()
      if (!targetHost) {
        return NextResponse.json({ success: false, online: false, error: "IP no especificada" })
      }
      const t0 = Date.now()
      const client = new ftp.Client(5000)
      client.ftp.verbose = false
      try {
        await client.access({
          host: targetHost,
          user: (user || current.user || "").trim(),
          password: password || current.password || "",
          port: current.ftpPort || 21,
        })
        const latencyMs = Date.now() - t0
        client.close()
        return NextResponse.json({ success: true, online: true, latencyMs })
      } catch (err: any) {
        try {
          client.close()
        } catch {}
        return NextResponse.json({ success: false, online: false, error: err.message })
      }
    }

    const res = await saveNasCentralConfig({
      lanHost: lanHost !== undefined ? lanHost : host,
      tailscaleHost,
      shareName,
      user,
      password,
      baseDir,
      networkMode: networkMode as NetworkRouteMode | undefined,
    })

    if (!res.ok) {
      return NextResponse.json({ success: false, error: res.error }, { status: 500 })
    }

    const updated = await resolveActiveNasRoute({ forceRefresh: true })
    return NextResponse.json({
      success: true,
      route: updated,
      message: "Configuración centralizada guardada correctamente",
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
