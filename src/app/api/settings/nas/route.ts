import { NextRequest, NextResponse } from "next/server"
import { getNasFtpConfig, saveNasFtpConfig } from "@/lib/storage-config"
import ftp from "basic-ftp"

export const dynamic = "force-dynamic"

export async function GET() {
  const cfg = getNasFtpConfig()
  let online = false
  let latencyMs = -1
  let errorMsg = ""

  const t0 = Date.now()
  const client = new ftp.Client(8000)
  client.ftp.verbose = false
  try {
    await client.access({
      host: cfg.host,
      user: cfg.user,
      password: cfg.password || "",
      port: 21,
    })
    latencyMs = Date.now() - t0
    online = true
    client.close()
  } catch (err: any) {
    try { client.close() } catch {}
    errorMsg = err.message || "Impossible de joindre le NAS"
  }

  return NextResponse.json({
    host: cfg.host,
    user: cfg.user,
    baseDir: cfg.baseDir,
    hasPassword: Boolean(cfg.password && cfg.password.length > 0),
    online,
    latencyMs,
    error: errorMsg,
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { host, user, password, baseDir, testOnly } = body

    if (testOnly) {
      const t0 = Date.now()
      const client = new ftp.Client(8000)
      client.ftp.verbose = false
      try {
        await client.access({
          host: host || "192.168.11.1",
          user: user || "admin",
          password: password || getNasFtpConfig().password || "",
          port: 21,
        })
        const latencyMs = Date.now() - t0
        client.close()
        return NextResponse.json({ success: true, online: true, latencyMs })
      } catch (err: any) {
        try { client.close() } catch {}
        return NextResponse.json({ success: false, online: false, error: err.message })
      }
    }

    const patch: any = {}
    if (host !== undefined) patch.host = host
    if (user !== undefined) patch.user = user
    if (password !== undefined && password !== "") patch.password = password
    if (baseDir !== undefined) patch.baseDir = baseDir

    const ok = saveNasFtpConfig(patch)
    if (!ok) {
      return NextResponse.json({ success: false, error: "Échec de l'enregistrement du fichier de configuration" }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Configuration enregistrée avec succès" })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
