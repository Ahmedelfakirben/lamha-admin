import { NextResponse } from "next/server"
import { NAS_FTP_CONFIG } from "@/lib/storage-config"
import ftp from "basic-ftp"

export const dynamic = "force-dynamic"

export async function GET() {
  const start = Date.now()
  const client = new ftp.Client(2000)
  client.ftp.verbose = false

  try {
    await client.access({
      host: NAS_FTP_CONFIG.host,
      user: NAS_FTP_CONFIG.user,
      password: NAS_FTP_CONFIG.password,
      port: 21,
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
