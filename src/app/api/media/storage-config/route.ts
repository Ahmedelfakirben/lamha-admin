import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import * as ftp from "basic-ftp"
import { getStorageConfig, NAS_FTP_CONFIG } from "@/lib/storage-config"

/**
 * GET /api/media/storage-config
 * Devuelve la configuración actual de almacenamiento y el estado de la conexión en vivo.
 */
export async function GET() {
  try {
    const storage = getStorageConfig()
    
    // Probar conexión en vivo al NAS FTP
    let ftpOnline = false
    let ftpLatencyMs = 0
    let ftpFilesCount = 0
    const t0 = Date.now()

    try {
      const client = new ftp.Client(2000)
      client.ftp.verbose = false
      await client.access({
        host: NAS_FTP_CONFIG.host,
        user: NAS_FTP_CONFIG.user,
        password: NAS_FTP_CONFIG.password,
        port: 21,
      })
      ftpLatencyMs = Date.now() - t0
      const list = await client.list(NAS_FTP_CONFIG.baseDir)
      ftpFilesCount = list.filter(item => !item.name.startsWith(".")).length
      ftpOnline = true
      client.close()
    } catch {
      ftpOnline = false
    }

    return NextResponse.json({
      success: true,
      activeType: ftpOnline ? "nas_ftp" : "local",
      isNetworkReachable: ftpOnline,
      activeBasePath: ftpOnline 
        ? `ftp://${NAS_FTP_CONFIG.host}${NAS_FTP_CONFIG.baseDir}`
        : storage.localBasePath,
      ftp: {
        host: NAS_FTP_CONFIG.host,
        user: NAS_FTP_CONFIG.user,
        baseDir: NAS_FTP_CONFIG.baseDir,
        isOnline: ftpOnline,
        latencyMs: ftpLatencyMs,
        projectFoldersCount: ftpFilesCount,
      },
      local: {
        basePath: storage.localBasePath,
        exists: fs.existsSync(storage.localBasePath),
      },
      networkShare: {
        uncPath: storage.networkBasePath,
      }
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/media/storage-config
 * Permite modificar y guardar la ruta raíz del almacenamiento o las credenciales del NAS.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { 
      host, 
      user, 
      password, 
      baseDir, 
      localBasePath, 
      testOnly = false 
    } = body

    const targetHost = host || NAS_FTP_CONFIG.host
    const targetUser = user || NAS_FTP_CONFIG.user
    const targetPass = password !== undefined && password !== "" ? password : NAS_FTP_CONFIG.password
    const targetBaseDir = baseDir || NAS_FTP_CONFIG.baseDir

    // Probar conexión con los nuevos parámetros
    let testSuccess = false
    let testError = ""
    let projectsFound: string[] = []

    try {
      const client = new ftp.Client(3000)
      client.ftp.verbose = false
      await client.access({
        host: targetHost,
        user: targetUser,
        password: targetPass,
        port: 21,
      })
      const list = await client.list(targetBaseDir)
      projectsFound = list.filter(f => !f.name.startsWith(".")).map(f => f.name)
      testSuccess = true
      client.close()
    } catch (e: any) {
      testSuccess = false
      testError = e.message || "No se pudo conectar al servidor FTP del NAS."
    }

    if (testOnly) {
      return NextResponse.json({
        success: testSuccess,
        isOnline: testSuccess,
        error: testError,
        projectsFound,
        message: testSuccess 
          ? `Conexión exitosa. Se encontraron ${projectsFound.length} elementos en ${targetBaseDir}`
          : `Fallo de conexión: ${testError}`
      })
    }

    // Si no es solo test, actualizar el archivo .env.local
    const envPath = path.resolve(process.cwd(), ".env.local")
    let envContent = ""
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, "utf-8")
    }

    const updates: Record<string, string> = {
      LAMHA_FTP_HOST: targetHost,
      LAMHA_FTP_USER: targetUser,
      LAMHA_FTP_PASSWORD: targetPass,
      LAMHA_FTP_BASE_DIR: targetBaseDir,
    }
    if (localBasePath) {
      updates.LAMHA_LOCAL_STORAGE = localBasePath
    }

    for (const [key, value] of Object.entries(updates)) {
      const regex = new RegExp(`^${key}=.*$`, "m")
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}=${value}`)
      } else {
        envContent += `\n${key}=${value}`
      }
    }

    fs.writeFileSync(envPath, envContent.trim() + "\n", "utf-8")

    return NextResponse.json({
      success: true,
      saved: true,
      isOnline: testSuccess,
      message: "Configuración de almacenamiento actualizada y guardada correctamente.",
      activeBasePath: `ftp://${targetHost}${targetBaseDir}`,
      projectsFound
    })

  } catch (error: any) {
    console.error("[Storage Config Update Error]:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
