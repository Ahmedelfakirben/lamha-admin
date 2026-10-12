import { google, drive_v3 } from "googleapis"
import { Readable, PassThrough } from "stream"
import { createClient } from "@supabase/supabase-js"

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  return createClient(url, key, { auth: { persistSession: false } })
}

export interface GDriveCredentials {
  clientEmail?: string
  privateKey?: string
  parentFolderId?: string
  oauthRefreshToken?: string
  oauthEmail?: string
  authType?: "oauth" | "service_account"
}

/**
 * Obtiene las credenciales de Google Drive priorizando:
 * 1. Cuenta OAuth conectada por el usuario en studio_delivery_settings
 * 2. Variables de entorno (.env.local) para Service Account
 */
export async function resolveGDriveCredentials(custom?: GDriveCredentials): Promise<GDriveCredentials> {
  if (custom?.oauthRefreshToken || (custom?.clientEmail && custom?.privateKey)) {
    return custom
  }

  // 1. Priorizar OAuth 2.0 (cuenta personal del fotógrafo con cuota propia)
  try {
    const supabase = getSupabaseAdmin()
    const { data } = await supabase
      .from("studio_delivery_settings")
      .select("gdrive_client_email, gdrive_private_key, gdrive_parent_folder_id")
      .eq("id", 1)
      .maybeSingle()

    if (data?.gdrive_private_key?.startsWith("oauth_refresh:")) {
      const refreshToken = data.gdrive_private_key.replace("oauth_refresh:", "")
      const envParent = (process.env.GDRIVE_PARENT_FOLDER_ID || "").replace(/"/g, "").trim()
      return {
        authType: "oauth",
        oauthRefreshToken: refreshToken,
        oauthEmail: data.gdrive_client_email || undefined,
        parentFolderId: data.gdrive_parent_folder_id || envParent || undefined,
      }
    }
  } catch (err) {
    console.warn("[GDrive] Error consultando credenciales de Supabase:", err)
  }

  // 2. Fallback a Service Account en .env.local
  const envEmail = (process.env.GDRIVE_CLIENT_EMAIL || "").replace(/"/g, "").trim()
  const envKey = (process.env.GDRIVE_PRIVATE_KEY || "").replace(/"/g, "").trim()
  const envParent = (process.env.GDRIVE_PARENT_FOLDER_ID || "").replace(/"/g, "").trim()

  if (envEmail && envKey) {
    return {
      authType: "service_account",
      clientEmail: envEmail,
      privateKey: envKey.replace(/\\n/g, "\n"),
      parentFolderId: envParent || undefined
    }
  }

  return {}
}

let cachedClient: {
  drive: drive_v3.Drive
  parentFolderId?: string
  authType: "oauth" | "service_account"
  timestamp: number
} | null = null

/**
 * Inicializa el cliente autenticado de Google Drive (vía OAuth 2.0 o Service Account) con caché en memoria
 */
export async function getDriveClient(custom?: GDriveCredentials): Promise<{ drive: drive_v3.Drive; parentFolderId?: string; authType: "oauth" | "service_account" }> {
  if (!custom && cachedClient && Date.now() - cachedClient.timestamp < 1000 * 60 * 15) {
    return cachedClient
  }

  const creds = await resolveGDriveCredentials(custom)

  // A. Conexión OAuth 2.0 (Cuenta del usuario con cuota completa)
  if (creds.authType === "oauth" && creds.oauthRefreshToken) {
    const clientId = (process.env.GOOGLE_CLIENT_ID || "").replace(/"/g, "").trim()
    const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || "").replace(/"/g, "").trim()

    if (!clientId || !clientSecret) {
      throw new Error("Credenciales GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET no configuradas.")
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret)
    oauth2Client.setCredentials({ refresh_token: creds.oauthRefreshToken })

    const drive = google.drive({ version: "v3", auth: oauth2Client })
    const result = { drive, parentFolderId: creds.parentFolderId, authType: "oauth" as const, timestamp: Date.now() }
    if (!custom) cachedClient = result
    return result
  }

  // B. Conexión Service Account (Bot)
  if (creds.clientEmail && creds.privateKey) {
    const auth = new google.auth.JWT({
      email: creds.clientEmail,
      key: creds.privateKey,
      scopes: ["https://www.googleapis.com/auth/drive"],
    })

    const drive = google.drive({ version: "v3", auth })
    const result = { drive, parentFolderId: creds.parentFolderId, authType: "service_account" as const, timestamp: Date.now() }
    if (!custom) cachedClient = result
    return result
  }

  throw new Error("No hay ninguna cuenta de Google Drive configurada. Conecta tu cuenta con OAuth o añade credenciales.")
}

/**
 * Invalida la caché del cliente de Google Drive
 */
export function invalidateDriveClientCache() {
  cachedClient = null
}

/**
 * Prueba la conexión con Google Drive
 */
export async function testGoogleDriveConnection(custom?: GDriveCredentials): Promise<{
  success: boolean
  message: string
  email?: string
  about?: any
}> {
  try {
    const { drive } = await getDriveClient(custom)
    const res = await drive.about.get({
      fields: "user, storageQuota"
    })
    return {
      success: true,
      message: "Conexión a Google Drive exitosa",
      email: res.data.user?.emailAddress || custom?.clientEmail,
      about: res.data
    }
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || "Error al conectar con la API de Google Drive"
    }
  }
}

/**
 * Crea una carpeta para la entrega del cliente en Google Drive
 */
export async function createDeliveryDriveFolder(
  folderName: string,
  parentFolderId?: string
): Promise<{ folderId: string; folderUrl: string }> {
  const { drive, parentFolderId: defaultParent } = await getDriveClient()
  const targetParent = parentFolderId || defaultParent

  const fileMetadata: drive_v3.Schema$File = {
    name: folderName,
    mimeType: "application/vnd.google-apps.folder",
    parents: targetParent ? [targetParent] : undefined,
  }

  const folder = await drive.files.create({
    requestBody: fileMetadata,
    fields: "id, name, webViewLink",
    supportsAllDrives: true,
  })

  const folderId = folder.data.id
  if (!folderId) throw new Error("No se pudo obtener el ID de la carpeta creada en Google Drive")

  // Hacer la carpeta pública de solo lectura con enlace
  await drive.permissions.create({
    fileId: folderId,
    requestBody: {
      role: "reader",
      type: "anyone",
      allowFileDiscovery: false,
    },
    supportsAllDrives: true,
  })

  const folderUrl = `https://drive.google.com/drive/folders/${folderId}?usp=sharing`

  return {
    folderId,
    folderUrl
  }
}

/**
 * Sube un archivo a una carpeta de Google Drive con reporte de chunks de streaming en tiempo real
 */
export async function uploadFileToDrive(
  folderId: string,
  fileName: string,
  mimeType: string,
  data: Buffer | Readable,
  onProgress?: (chunkBytes: number) => void
): Promise<{ fileId: string; fileName: string; sizeBytes: number; webViewLink?: string | null }> {
  const { drive } = await getDriveClient()

  let readableStream: Readable
  let sizeBytes = 0

  if (Buffer.isBuffer(data)) {
    readableStream = Readable.from(data)
    sizeBytes = data.length
  } else {
    readableStream = data
  }

  let uploadStream: Readable = readableStream
  if (onProgress) {
    const monitor = new PassThrough()
    monitor.on("data", (chunk) => {
      onProgress(chunk.length)
    })
    readableStream.pipe(monitor)
    uploadStream = monitor
  }

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType: mimeType || "application/octet-stream",
      body: uploadStream,
    },
    fields: "id, name, size, webViewLink",
    supportsAllDrives: true,
  })

  return {
    fileId: response.data.id || "",
    fileName: response.data.name || fileName,
    sizeBytes: sizeBytes || Number(response.data.size) || 0,
    webViewLink: response.data.webViewLink,
  }
}

/**
 * Mueve una carpeta o archivo a la papelera (Reciclaje)
 */
export async function trashDriveFile(fileOrFolderId: string): Promise<boolean> {
  const { drive } = await getDriveClient()
  try {
    await drive.files.update({
      fileId: fileOrFolderId,
      requestBody: {
        trashed: true,
      },
      supportsAllDrives: true,
    })
    return true
  } catch (error: any) {
    console.error(`[GDrive] Error enviando a la papelera el archivo/carpeta ${fileOrFolderId}:`, error)
    return false
  }
}
