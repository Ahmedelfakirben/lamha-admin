import { NextResponse } from "next/server"
import { NAS_FTP_CONFIG, resolveActiveNasRoute } from "@/lib/storage-config"
import ftp from "basic-ftp"

export const dynamic = "force-dynamic"

export async function GET() {
  const route = await resolveActiveNasRoute()
  const start = Date.now()
  const client = new ftp.Client(2000)
  client.ftp.verbose = false

  try {
    if (route.activeRoute === "offline" || !route.activeHost) {
      throw new Error("NAS offline")
    }
    await client.access({
      host: route.activeHost,
      user: route.user,
      password: route.password,
      port: route.ftpPort || 21,
    })
    const latencyMs = Date.now() - start
    client.close()

    return NextResponse.json({
      online: true,
      host: NAS_FTP_CONFIG.host,
      latencyMs,
      baseDir: NAS_FTP_CONFIG.baseDir,
    })
  } catch (error: any) {
    try {
      client.close()
    } catch {}
    return NextResponse.json({
      online: false,
      host: NAS_FTP_CONFIG.host,
      latencyMs: -1,
      error: error.message || "No se pudo conectar al NAS FTP",
      baseDir: NAS_FTP_CONFIG.baseDir,
    })
  }
}
