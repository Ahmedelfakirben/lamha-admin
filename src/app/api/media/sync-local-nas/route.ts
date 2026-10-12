import { NextRequest } from "next/server"
import fs from "fs"
import path from "path"
import { getStorageConfig, NAS_FTP_CONFIG } from "@/lib/storage-config"
import ftp from "basic-ftp"

export const maxDuration = 300
export const dynamic = "force-dynamic"

function getSyncNasStrings(lang: string = "es") {
  const l = (lang === "fr" || lang === "en" || lang === "ar") ? lang : "es"
  const dict = {
    es: {
      startingSync: (host: string) => `Iniciando sincronización local -> NAS FTP (${host})...`,
      folderNotFound: (dir: string) => `Carpeta local no encontrada: ${dir}`,
      folderEmpty: (dir: string) => `La carpeta local ${dir} no contiene archivos para sincronizar.`,
      foundFilesConnecting: (count: number) => `Encontrados ${count} archivos en local. Conectando al NAS ZTE...`,
      connectionEstablished: (dir: string) => `Conexión al NAS establecida. Directorio asegurado: ${dir}`,
      fileSkipped: (name: string) => `[Omitido] ${name} ya existe en el NAS.`,
      copyingFile: (cur: number, tot: number, name: string, mb: string) => `[Copiando ${cur}/${tot}] ${name} (${mb} MB) -> NAS...`,
      fileSuccess: (name: string) => `[OK] ${name} subido al NAS con éxito.`,
      syncCompleted: (copied: number, mb: string, skipped: number) => `🎉 Sincronización completada: ${copied} archivos copiados (${mb} MB), ${skipped} omitidos.`,
      criticalSyncError: (err: string) => `Error crítico en la sincronización: ${err}`,
      defaultNasError: "Error al sincronizar con el NAS",
    },
    fr: {
      startingSync: (host: string) => `Démarrage de la synchronisation local -> NAS FTP (${host})...`,
      folderNotFound: (dir: string) => `Dossier local introuvable : ${dir}`,
      folderEmpty: (dir: string) => `Le dossier local ${dir} ne contient aucun fichier à synchroniser.`,
      foundFilesConnecting: (count: number) => `${count} fichiers trouvés en local. Connexion au NAS ZTE...`,
      connectionEstablished: (dir: string) => `Connexion au NAS établie. Répertoire sécurisé : ${dir}`,
      fileSkipped: (name: string) => `[Ignoré] ${name} existe déjà sur le NAS.`,
      copyingFile: (cur: number, tot: number, name: string, mb: string) => `[Copie ${cur}/${tot}] ${name} (${mb} Mo) -> NAS...`,
      fileSuccess: (name: string) => `[OK] ${name} téléversé sur le NAS avec succès.`,
      syncCompleted: (copied: number, mb: string, skipped: number) => `🎉 Synchronisation terminée : ${copied} fichiers copiés (${mb} Mo), ${skipped} ignorés.`,
      criticalSyncError: (err: string) => `Erreur critique lors de la synchronisation : ${err}`,
      defaultNasError: "Erreur lors de la synchronisation avec le NAS",
    },
    en: {
      startingSync: (host: string) => `Starting sync local -> NAS FTP (${host})...`,
      folderNotFound: (dir: string) => `Local folder not found: ${dir}`,
      folderEmpty: (dir: string) => `Local folder ${dir} contains no files to sync.`,
      foundFilesConnecting: (count: number) => `Found ${count} local files. Connecting to ZTE NAS...`,
      connectionEstablished: (dir: string) => `Connection to NAS established. Directory secured: ${dir}`,
      fileSkipped: (name: string) => `[Skipped] ${name} already exists on NAS.`,
      copyingFile: (cur: number, tot: number, name: string, mb: string) => `[Copying ${cur}/${tot}] ${name} (${mb} MB) -> NAS...`,
      fileSuccess: (name: string) => `[OK] ${name} uploaded to NAS successfully.`,
      syncCompleted: (copied: number, mb: string, skipped: number) => `🎉 Sync completed: ${copied} files copied (${mb} MB), ${skipped} skipped.`,
      criticalSyncError: (err: string) => `Critical sync error: ${err}`,
      defaultNasError: "Error syncing with NAS",
    },
    ar: {
      startingSync: (host: string) => `بدء المزامنة من المحلي إلى NAS FTP (${host})...`,
      folderNotFound: (dir: string) => `المجلد المحلي غير موجود: ${dir}`,
      folderEmpty: (dir: string) => `المجلد المحلي ${dir} لا يحتوي على ملفات للمزامنة.`,
      foundFilesConnecting: (count: number) => `تم العثور على ${count} ملفات محلية. جارٍ الاتصال بوحدة ZTE NAS...`,
      connectionEstablished: (dir: string) => `تم تأسيس الاتصال بوحدة NAS. الدليل مؤمن: ${dir}`,
      fileSkipped: (name: string) => `[تم التخطي] ${name} موجود بالفعل على NAS.`,
      copyingFile: (cur: number, tot: number, name: string, mb: string) => `[جارٍ النسخ ${cur}/${tot}] ${name} (${mb} ميغابايت) -> NAS...`,
      fileSuccess: (name: string) => `[تم] ${name} تم الرفع إلى NAS بنجاح.`,
      syncCompleted: (copied: number, mb: string, skipped: number) => `🎉 اكتملت المزامنة بنجاح: تم نسخ ${copied} ملفات (${mb} ميغابايت)، وتم تخطي ${skipped}.`,
      criticalSyncError: (err: string) => `خطأ فادح في المزامنة: ${err}`,
      defaultNasError: "خطأ في المزامنة مع NAS",
    }
  }
  return dict[l]
}

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder()
  const { sessionId, folderName, targetSubfolder = "03_Edicion_Master", lang = "es" } = await req.json()
  const tLogs = getSyncNasStrings(lang)

  if (!sessionId || !folderName) {
    return new Response(JSON.stringify({ error: "Faltan parámetros sessionId o folderName." }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    })
  }

  const storage = getStorageConfig()
  const localCandidates = [
    path.join(storage.localBasePath, folderName, targetSubfolder),
    path.join(storage.localBasePath, folderName, targetSubfolder.replace("c", "ç")),
    path.join(storage.localBasePath, folderName, targetSubfolder.replace("E", "É")),
  ]

  let localDir: string | null = null
  for (const c of localCandidates) {
    if (fs.existsSync(c)) {
      localDir = c
      break
    }
  }

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: any) {
        controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"))
      }

      const log = (level: "info" | "success" | "warn" | "error", msg: string) => {
        const time = new Date().toLocaleTimeString()
        send({ type: "log", time, level, msg })
      }

      try {
        log("info", tLogs.startingSync(NAS_FTP_CONFIG.host))

        if (!localDir || !fs.existsSync(localDir)) {
          log("error", tLogs.folderNotFound(String(localDir)))
          send({ type: "error", error: "Carpeta local no encontrada" })
          controller.close()
          return
        }

        const files = fs.readdirSync(localDir)
          .filter(f => !f.startsWith(".") && fs.statSync(path.join(localDir!, f)).isFile())

        if (files.length === 0) {
          log("warn", tLogs.folderEmpty(localDir))
          send({ type: "completed", totalFiles: 0, copiedFiles: 0 })
          controller.close()
          return
        }

        log("info", tLogs.foundFilesConnecting(files.length))

        const conn: { current: ftp.Client | null } = { current: null }

        async function getConnectedClient(): Promise<ftp.Client> {
          if (conn.current && !conn.current.closed) {
            return conn.current
          }
          if (conn.current) {
            try { conn.current.close() } catch {}
            conn.current = null
          }
          const newClient = new ftp.Client(90000)
          newClient.ftp.verbose = false
          await newClient.access({
            host: NAS_FTP_CONFIG.host,
            user: NAS_FTP_CONFIG.user,
            password: NAS_FTP_CONFIG.password,
            port: 21,
          })
          conn.current = newClient
          return newClient
        }

        const initialClient = await getConnectedClient()
        const nasTargetDir = `${NAS_FTP_CONFIG.baseDir}/${folderName}/${targetSubfolder}`
        await initialClient.ensureDir(nasTargetDir)
        log("success", tLogs.connectionEstablished(nasTargetDir))

        // Obtener lista remota para evitar resubir archivos idénticos
        const remoteList = await initialClient.list(nasTargetDir)
        const remoteFileNames = new Set(remoteList.map(r => r.name))

        let totalBytes = 0
        let copiedCount = 0
        let skippedCount = 0

        for (let i = 0; i < files.length; i++) {
          const fileName = files[i]
          const filePath = path.join(localDir, fileName)
          const stat = fs.statSync(filePath)
          const sizeMb = (stat.size / (1024 * 1024)).toFixed(1)

          send({
            type: "progress",
            currentIndex: i + 1,
            totalFiles: files.length,
            fileName,
            sizeMb: Number(sizeMb),
          })

          if (remoteFileNames.has(fileName)) {
            log("info", tLogs.fileSkipped(fileName))
            skippedCount++
            continue
          }

          log("info", tLogs.copyingFile(i + 1, files.length, fileName, sizeMb))
          
          let uploaded = false
          for (let attempt = 1; attempt <= 2; attempt++) {
            try {
              const activeClient = await getConnectedClient()
              await activeClient.uploadFrom(filePath, `${nasTargetDir}/${fileName}`)
              uploaded = true
              break
            } catch (err: any) {
              if (conn.current) {
                try { conn.current.close() } catch {}
                conn.current = null
              }
              if (attempt < 2) {
                await new Promise(r => setTimeout(r, 1500))
              } else {
                throw err
              }
            }
          }

          if (uploaded) {
            copiedCount++
            totalBytes += stat.size
            log("success", tLogs.fileSuccess(fileName))
          }
        }

        if (conn.current) {
          try { conn.current.close() } catch {}
          conn.current = null
        }

        const totalMb = (totalBytes / (1024 * 1024)).toFixed(1)
        log("success", tLogs.syncCompleted(copiedCount, totalMb, skippedCount))

        send({
          type: "completed",
          totalFiles: files.length,
          copiedCount,
          skippedCount,
          totalMb: Number(totalMb),
        })

        controller.close()
      } catch (err: any) {
        log("error", tLogs.criticalSyncError(err.message || err))
        send({ type: "error", error: err.message || tLogs.defaultNasError })
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    }
  })
}
