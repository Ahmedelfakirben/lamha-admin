import { NextRequest } from "next/server"
import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"
import { getStorageConfig } from "@/lib/storage-config"
import { createDeliveryDriveFolder, uploadFileToDrive } from "@/lib/gdrive"
import { sendPhotosReadyNotification } from "@/lib/email"
import { sendWhatsAppMessage } from "@/lib/whatsapp"
import { getPhotosReadyWhatsApp } from "@/lib/whatsapp-templates"

export const maxDuration = 300
export const dynamic = "force-dynamic"

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  return createClient(url, key, { auth: { persistSession: false } })
}

function findDeliveriesDirectory(basePath: string, folderName: string, preferredSource?: string): string | null {
  const masterCandidates = [
    path.join(basePath, folderName, "03_Edicion_Master"),
    path.join(basePath, folderName, "03_Édition_Master"),
    path.join(basePath, folderName, "03_Edition_Master"),
  ]

  const finalCandidates = [
    path.join(basePath, folderName, "04_Entregas_Finales"),
    path.join(basePath, folderName, "04_Entregas"),
    path.join(basePath, folderName, "04_Livraisons_Finales"),
  ]

  const candidates = preferredSource === "master"
    ? [...masterCandidates, ...finalCandidates]
    : [...finalCandidates, ...masterCandidates]

  let firstExisting: string | null = null

  // 1. Priorizar la carpeta que contenga archivos reales
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      if (!firstExisting) firstExisting = c
      try {
        const files = fs.readdirSync(c).filter(f => !f.startsWith(".") && fs.statSync(path.join(c, f)).isFile())
        if (files.length > 0) {
          return c
        }
      } catch {}
    }
  }

  // 2. Si ninguna tiene archivos, devolver la primera que exista físicamente
  return firstExisting
}

function getSyncDriveStrings(lang: string = "es") {
  const l = (lang === "fr" || lang === "en" || lang === "ar") ? lang : "es"
  const dict = {
    es: {
      startingDriveTransfer: (from: string) => `Iniciando transferencia acelerada a Google Drive desde ${from}...`,
      creatingProtectedFolder: (name: string) => `Creando carpeta protegida en Google Drive: "${name}"...`,
      folderCreatedSuccess: (id: string) => `Carpeta creada en Google Drive con éxito. ID: ${id}`,
      uploadingFile: (current: number, total: number, name: string, mb: string) => `[${current}/${total}] Subiendo ${name} (${mb} MB)...`,
      fileSyncedOk: (current: number, total: number, name: string, mb: string) => `[OK ${current}/${total}] ${name} sincronizado (${mb} MB)`,
      errorUploadingFile: (name: string, err: string) => `Error subiendo ${name}: ${err}`,
      registeringInDb: "Registrando entrega final en base de datos Supabase...",
      driveDeliveryLabel: (count: number) => `Google Drive Sincronizado (${count} archivos)`,
      finalDeliveryDone: (count: number, mb: number, days: number) => `🎉 ¡Entrega final completada! ${count} archivos sincronizados (${mb} MB). Caduca en ${days} días.`,
      criticalDriveError: (err: string) => `Error en la subida a Drive: ${err}`,
      defaultDriveError: "Error al sincronizar con Google Drive",
    },
    fr: {
      startingDriveTransfer: (from: string) => `Démarrage du transfert accéléré vers Google Drive depuis ${from}...`,
      creatingProtectedFolder: (name: string) => `Création du dossier sécurisé sur Google Drive : "${name}"...`,
      folderCreatedSuccess: (id: string) => `Dossier créé sur Google Drive avec succès. ID: ${id}`,
      uploadingFile: (current: number, total: number, name: string, mb: string) => `[${current}/${total}] Téléversement de ${name} (${mb} Mo)...`,
      fileSyncedOk: (current: number, total: number, name: string, mb: string) => `[OK ${current}/${total}] ${name} synchronisé (${mb} Mo)`,
      errorUploadingFile: (name: string, err: string) => `Erreur lors de l'envoi de ${name} : ${err}`,
      registeringInDb: "Enregistrement de la livraison finale dans la base Supabase...",
      driveDeliveryLabel: (count: number) => `Google Drive Synchronisé (${count} fichiers)`,
      finalDeliveryDone: (count: number, mb: number, days: number) => `🎉 Livraison finale terminée ! ${count} fichiers synchronisés (${mb} Mo). Expire dans ${days} jours.`,
      criticalDriveError: (err: string) => `Erreur lors du téléversement sur Drive : ${err}`,
      defaultDriveError: "Erreur lors de la synchronisation avec Google Drive",
    },
    en: {
      startingDriveTransfer: (from: string) => `Starting accelerated transfer to Google Drive from ${from}...`,
      creatingProtectedFolder: (name: string) => `Creating protected folder on Google Drive: "${name}"...`,
      folderCreatedSuccess: (id: string) => `Google Drive folder created successfully. ID: ${id}`,
      uploadingFile: (current: number, total: number, name: string, mb: string) => `[${current}/${total}] Uploading ${name} (${mb} MB)...`,
      fileSyncedOk: (current: number, total: number, name: string, mb: string) => `[OK ${current}/${total}] ${name} synced (${mb} MB)`,
      errorUploadingFile: (name: string, err: string) => `Error uploading ${name}: ${err}`,
      registeringInDb: "Recording final delivery in Supabase database...",
      driveDeliveryLabel: (count: number) => `Google Drive Synced (${count} files)`,
      finalDeliveryDone: (count: number, mb: number, days: number) => `🎉 Final delivery completed! ${count} files synced (${mb} MB). Expires in ${days} days.`,
      criticalDriveError: (err: string) => `Error during Drive upload: ${err}`,
      defaultDriveError: "Error syncing with Google Drive",
    },
    ar: {
      startingDriveTransfer: (from: string) => `بدء النقل السريع إلى Google Drive من ${from}...`,
      creatingProtectedFolder: (name: string) => `إنشاء مجلد آمن على Google Drive: "${name}"...`,
      folderCreatedSuccess: (id: string) => `تم إنشاء المجلد على Google Drive بنجاح. المعرّف: ${id}`,
      uploadingFile: (current: number, total: number, name: string, mb: string) => `[${current}/${total}] جارٍ رفع ${name} (${mb} ميغابايت)...`,
      fileSyncedOk: (current: number, total: number, name: string, mb: string) => `[تم ${current}/${total}] ${name} تمت المزامنة (${mb} ميغابايت)`,
      errorUploadingFile: (name: string, err: string) => `خطأ في رفع ${name}: ${err}`,
      registeringInDb: "تسجيل التسليم النهائي في قاعدة بيانات Supabase...",
      driveDeliveryLabel: (count: number) => `مزامنة Google Drive (${count} ملفات)`,
      finalDeliveryDone: (count: number, mb: number, days: number) => `🎉 اكتمل التسليم النهائي بنجاح! ${count} ملفات تمت مزامنتها (${mb} ميغابايت). ينتهي خلال ${days} يوماً.`,
      criticalDriveError: (err: string) => `خطأ أثناء الرفع إلى Google Drive: ${err}`,
      defaultDriveError: "خطأ في المزامنة مع Google Drive",
    }
  }
  return dict[l]
}

/**
 * POST /api/deliveries/sync-nas-gdrive
 * Sincroniza archivos locales hacia Google Drive en Streaming NDJSON para telemetría en vivo
 */
export async function POST(req: NextRequest) {
  const encoder = new TextEncoder()
  const body = await req.json()
  const { sessionId, folderName, clientName = "Cliente", retentionDays = 30, source, lang = "es" } = body
  const tLogs = getSyncDriveStrings(lang)

  if (!sessionId || !folderName || folderName === "undefined") {
    return new Response(JSON.stringify({ error: "Faltan parámetros sessionId o folderName válido." }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    })
  }

  const storage = getStorageConfig()
  const finalDir = findDeliveriesDirectory(storage.localBasePath, folderName, source || "master")

  if (!finalDir || !fs.existsSync(finalDir)) {
    return new Response(JSON.stringify({ error: `No se encontró la carpeta en ${path.join(storage.localBasePath, folderName)}` }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    })
  }

  const fileNames = fs.readdirSync(finalDir).filter(f => !f.startsWith(".") && fs.statSync(path.join(finalDir, f)).isFile())

  if (fileNames.length === 0) {
    return new Response(JSON.stringify({ error: `La carpeta ${finalDir} está vacía.` }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    })
  }

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: any) {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"))
        } catch {}
      }

      const log = (level: "info" | "success" | "warn" | "error", msg: string) => {
        const time = new Date().toLocaleTimeString()
        send({ type: "log", time, level, msg })
      }

      // Heartbeat cada 2.5s para evitar que Chrome o el proxy congelen el búfer
      const heartbeatInterval = setInterval(() => {
        send({ type: "heartbeat", time: new Date().toLocaleTimeString() })
      }, 2500)

      try {
        log("info", tLogs.startingDriveTransfer(path.basename(finalDir)))

        const cleanClient = clientName.trim().replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]/g, "_")
        const datePrefix = new Date().toISOString().split("T")[0]
        const gdriveFolderName = `${datePrefix}_${cleanClient}_Entrega_Final`

        log("info", tLogs.creatingProtectedFolder(gdriveFolderName))
        const { folderId, folderUrl } = await createDeliveryDriveFolder(gdriveFolderName)
        log("success", tLogs.folderCreatedSuccess(folderId))

        let totalBytes = 0
        const filesWithStats = fileNames.map(name => {
          const filePath = path.join(finalDir, name)
          const stat = fs.statSync(filePath)
          totalBytes += stat.size
          return { name, filePath, size: stat.size }
        })

        const totalMb = Number((totalBytes / (1024 * 1024)).toFixed(1))
        send({
          type: "start",
          totalFiles: filesWithStats.length,
          totalBytes,
          totalMb,
          folderUrl,
          folderId,
        })

        // Subida secuencial con telemetría en tiempo real de porcentaje exacto
        const CONCURRENCY = 1
        let completedCount = 0
        let bytesTransferred = 0
        let activeIndex = 0

        async function uploadWorker() {
          while (activeIndex < filesWithStats.length) {
            const idx = activeIndex++
            const { name, filePath, size } = filesWithStats[idx]
            const sizeMb = (size / (1024 * 1024)).toFixed(1)

            log("info", tLogs.uploadingFile(idx + 1, filesWithStats.length, name, sizeMb))
            
            const initialPercent = totalBytes > 0 
              ? Math.min(99, Math.round((bytesTransferred / totalBytes) * 100))
              : Math.round(((completedCount) / filesWithStats.length) * 100)

            // Emitir evento inicial del archivo
            send({
              type: "progress",
              percent: initialPercent,
              current: completedCount + 1,
              total: filesWithStats.length,
              fileName: name,
              currentFile: name,
              sizeMb: Number(sizeMb),
              bytesTransferred,
              totalBytes,
            })

            const ext = path.extname(name).toLowerCase()
            let mimeType = "application/octet-stream"
            if (ext === ".jpg" || ext === ".jpeg") mimeType = "image/jpeg"
            else if (ext === ".png") mimeType = "image/png"
            else if (ext === ".webp") mimeType = "image/webp"
            else if (ext === ".mp4") mimeType = "video/mp4"
            else if (ext === ".nef") mimeType = "image/x-nikon-nef"
            else if (ext === ".cr2") mimeType = "image/x-canon-cr2"
            else if (ext === ".cr3") mimeType = "image/x-canon-cr3"
            else if (ext === ".arw") mimeType = "image/x-sony-arw"
            else if (ext === ".dng") mimeType = "image/x-adobe-dng"

            // Streaming con buffer de 2MB y telemetría en tiempo real
            const fileStream = fs.createReadStream(filePath, { highWaterMark: 1024 * 1024 * 2 })
            let fileBytesSent = 0
            let lastThrottledSend = Date.now()

            const onChunkProgress = (chunkBytes: number) => {
              fileBytesSent += chunkBytes
              const now = Date.now()
              if (now - lastThrottledSend >= 500) {
                lastThrottledSend = now
                const currentTransferred = Math.min(totalBytes, bytesTransferred + fileBytesSent)
                const currentPercent = totalBytes > 0 
                  ? Math.min(99, Math.round((currentTransferred / totalBytes) * 100))
                  : Math.round(((completedCount) / filesWithStats.length) * 100)

                send({
                  type: "progress",
                  percent: currentPercent,
                  current: completedCount + 1,
                  total: filesWithStats.length,
                  fileName: name,
                  currentFile: name,
                  sizeMb: Number(sizeMb),
                  bytesTransferred: currentTransferred,
                  totalBytes,
                })
              }
            }

            try {
              await uploadFileToDrive(folderId, name, mimeType, fileStream, onChunkProgress)
              completedCount++
              bytesTransferred += size
              log("success", tLogs.fileSyncedOk(completedCount, filesWithStats.length, name, sizeMb))
            } catch (fileErr: any) {
              log("error", tLogs.errorUploadingFile(name, fileErr.message || fileErr))
            }

            const finishPercent = totalBytes > 0 
              ? Math.min(99, Math.round((bytesTransferred / totalBytes) * 100))
              : Math.round((completedCount / filesWithStats.length) * 100)

            send({
              type: "progress",
              percent: finishPercent,
              current: completedCount,
              total: filesWithStats.length,
              fileName: name,
              currentFile: name,
              sizeMb: Number(sizeMb),
              bytesTransferred,
              totalBytes,
            })
          }
        }

        const workers = Array.from(
          { length: Math.min(CONCURRENCY, filesWithStats.length) },
          () => uploadWorker()
        )
        await Promise.all(workers)

        const now = new Date()
        const expiresAt = new Date(now.getTime() + retentionDays * 24 * 60 * 60 * 1000)
        const supabase = getSupabaseAdmin()

        log("info", tLogs.registeringInDb)
        await supabase
          .from("media_deliveries")
          .insert({
            session_id: sessionId,
            delivery_type: "final_link",
            url: folderUrl,
            label: tLogs.driveDeliveryLabel(completedCount),
            delivered_at: now.toISOString(),
            expires_at: expiresAt.toISOString(),
            gdrive_folder_id: folderId,
            delivery_mode: "nas_sync",
            total_files: completedCount,
            total_size_mb: totalMb,
            is_active: true,
          })

        // 1. Actualizar sesión en Supabase con fase 'stage:shared' en tags
        const { data: sessionData } = await supabase
          .from("sessions")
          .select("id, client_name, client_email, client_phone, portal_pin, tags")
          .eq("id", sessionId)
          .single()

        const currentTags = Array.isArray(sessionData?.tags) ? sessionData.tags : []
        const filteredTags = currentTags.filter((t: string) => !t.startsWith("stage:"))
        const updatedTags = [...filteredTags, "stage:shared"]

        await supabase
          .from("sessions")
          .update({
            tags: updatedTags,
            updated_at: now.toISOString(),
          })
          .eq("id", sessionId)

        // Resolver teléfono si no está configurado directamente en la sesión
        let clientPhone = sessionData?.client_phone
        if (!clientPhone && sessionData?.client_email) {
          const { data: siblingSession } = await supabase
            .from("sessions")
            .select("client_phone")
            .eq("client_email", sessionData.client_email)
            .not("client_phone", "is", null)
            .limit(1)
            .maybeSingle()
          if (siblingSession?.client_phone) {
            clientPhone = siblingSession.client_phone
            await supabase.from("sessions").update({ client_phone: clientPhone }).eq("id", sessionId)
          }
        }

        // 2. Enviar automáticamente Correo y WhatsApp al cliente con acceso al portal, PIN y carpeta Drive
        if (sessionData?.client_email && sessionData?.portal_pin) {
          try {
            await sendPhotosReadyNotification({
              clientName: sessionData.client_name,
              clientEmail: sessionData.client_email,
              portalPin: sessionData.portal_pin,
              driveFolderUrl: folderUrl,
              photosCount: completedCount,
              language: lang || "fr",
            })
            log("success", `✦ Email de prestige envoyé à ${sessionData.client_email} avec le code PIN et le lien Google Drive.`)
          } catch (eEmail: any) {
            log("warn", `Notice: Erreur lors de l'envoi auto de l'email : ${eEmail?.message || eEmail}`)
          }
        }

        if (clientPhone && sessionData?.portal_pin) {
          try {
            const waText = getPhotosReadyWhatsApp({
              clientName: sessionData.client_name,
              portalPin: sessionData.portal_pin,
              clientEmail: sessionData.client_email || "",
              driveUrl: folderUrl,
              photosCount: completedCount,
              language: lang || "fr",
            })

            await sendWhatsAppMessage({
              phone: clientPhone,
              text: waText,
              sessionId,
            })
            log("success", `✦ Message WhatsApp envoyé à ${clientPhone} avec le code PIN et le lien Google Drive.`)
          } catch (eWa: any) {
            log("warn", `Notice: Erreur lors de l'envoi auto de WhatsApp : ${eWa?.message || eWa}`)
          }
        }

        log("success", tLogs.finalDeliveryDone(completedCount, totalMb, retentionDays))

        send({
          type: "done",
          success: true,
          url: folderUrl,
          folderUrl,
          folderId,
          totalFiles: completedCount,
          totalSizeMb: totalMb,
          expiresAt: expiresAt.toISOString(),
        })
        send({
          type: "completed",
          success: true,
          url: folderUrl,
          folderUrl,
          folderId,
          totalFiles: completedCount,
          totalSizeMb: totalMb,
          expiresAt: expiresAt.toISOString(),
        })
      } catch (err: any) {
        log("error", tLogs.criticalDriveError(err.message || err))
        send({ type: "error", error: err.message || tLogs.defaultDriveError })
      } finally {
        clearInterval(heartbeatInterval)
        try {
          controller.close()
        } catch {}
      }
    }
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    }
  })
}
