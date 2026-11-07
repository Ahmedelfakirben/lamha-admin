"use client"

import { useState, useRef, useEffect } from "react"
import {
  Cloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  FolderOpen,
  Layers,
  X,
  Minus,
  Maximize2,
  Copy,
  Check,
  HardDrive,
  RefreshCw,
} from "lucide-react"
import { useLanguage } from "@/context/language-context"
import { useTheme } from "@/context/theme-context"
import { NotifyClientEmailDialog } from "./notify-client-email-dialog"
import {
  openProjectMasterFolder,
  getMasterFolderFiles,
  readMasterFileBlob,
} from "@/lib/desktop-bridge"
import { cn } from "@/lib/utils"

interface MontageDriveSyncModalProps {
  sessionId: string
  clientName: string
  clientEmail?: string | null
  portalPin?: string | null
  folderName: string
  existingDriveUrl?: string | null
  selectedCount?: number
  onSuccess?: () => void
  triggerButton?: React.ReactNode
}

interface LogEntry {
  time: string
  level: "info" | "success" | "warn" | "error"
  msg: string
}

const I18N = {
  fr: {
    triggerBtn: "Exporter vers Google Drive",
    triggerTooltip: "Transférer les fichiers de 03_Edicion_Master vers Google Drive",
    modalTitle: "Exportation Google Drive — Édition & Montage",
    modalSubtitle: "Transfert direct depuis le dossier local C: vers Google Drive",
    sourceLabel: "DOSSIER LOCAL À EXPORTER VERS DRIVE :",
    sourceMaster: "03_Edicion_Master",
    sourceMasterDesc: "Photos & Vidéos montées (Format HD Master)",
    openLocalFolderBtn: "Ouvrir dossier C:",
    selectLocalFolderBtn: "Charger dossier C:",
    filesDetected: (count: number, mb: string) => `${count} fichiers prêts (${mb} Mo)`,
    noFilesYet: "Copiez vos photos dans 03_Edicion_Master sur C: puis cliquez sur Démarrer",
    pathCopied: "Chemin C: copié ! Collez-le dans l'Explorateur Windows",
    startBtn: "Exporter vers Google Drive",
    syncingBtn: "Exportation vers Drive en cours...",
    successTitle: "Exportation Google Drive Terminée !",
    successDesc: "Les fichiers ont été téléversés à 100% et le dossier Google Drive est actif pour le client.",
    driveFolderLabel: "Lien Google Drive :",
    openDriveBtn: "Ouvrir Google Drive",
    cancelBtn: "Fermer",
    consoleLogsTitle: "JOURNAL DE TRANSFERT EN DIRECT",
    preparingText: "Préparation du téléversement...",
  },
  es: {
    triggerBtn: "Exportar a Google Drive",
    triggerTooltip: "Subir los archivos de 03_Edicion_Master a Google Drive",
    modalTitle: "Exportar a Google Drive — Edición & Montaje",
    modalSubtitle: "Subida directa desde la carpeta local C: hacia Google Drive",
    sourceLabel: "CARPETA LOCAL A EXPORTAR A DRIVE:",
    sourceMaster: "03_Edicion_Master",
    sourceMasterDesc: "Fotos y Videos editados (Master HD)",
    openLocalFolderBtn: "Abrir carpeta C:",
    selectLocalFolderBtn: "Cargar carpeta C:",
    filesDetected: (count: number, mb: string) => `${count} archivos listos (${mb} MB)`,
    noFilesYet: "Copia tus fotos en 03_Edicion_Master en C: y pulsa Exportar a Google Drive",
    pathCopied: "¡Ruta C: copiada! Pégala en el Explorador de Windows",
    startBtn: "Exportar a Google Drive",
    syncingBtn: "Subiendo a Google Drive...",
    successTitle: "¡Exportación a Google Drive Completada!",
    successDesc: "Los archivos se han subido al 100% y la carpeta de Google Drive ya está vinculada al cliente.",
    driveFolderLabel: "Enlace de Google Drive:",
    openDriveBtn: "Abrir Google Drive",
    cancelBtn: "Cerrar",
    consoleLogsTitle: "REGISTRO DE TRANSFERENCIA EN VIVO",
    preparingText: "Preparando subida a Google Drive...",
  },
  en: {
    triggerBtn: "Export to Google Drive",
    triggerTooltip: "Upload files from 03_Edicion_Master to Google Drive",
    modalTitle: "Google Drive Export — Editing & Montage",
    modalSubtitle: "Direct upload from local C: folder to Google Drive",
    sourceLabel: "LOCAL FOLDER TO EXPORT TO DRIVE:",
    sourceMaster: "03_Edicion_Master",
    sourceMasterDesc: "Edited Photos & Videos (HD Master)",
    openLocalFolderBtn: "Open C: Folder",
    selectLocalFolderBtn: "Load C: Folder",
    filesDetected: (count: number, mb: string) => `${count} files ready (${mb} MB)`,
    noFilesYet: "Copy your photos into 03_Edicion_Master on C: then click Start Drive Sync",
    pathCopied: "C: path copied! Paste it in Windows Explorer",
    startBtn: "Start Drive Sync",
    syncingBtn: "Uploading to Google Drive...",
    successTitle: "Google Drive Export Completed!",
    successDesc: "Files have been uploaded 100% and the Google Drive folder is now active for the client.",
    driveFolderLabel: "Google Drive Link:",
    openDriveBtn: "Open Google Drive",
    cancelBtn: "Close",
    consoleLogsTitle: "LIVE TRANSFER LOG",
    preparingText: "Preparing upload...",
  },
  ar: {
    triggerBtn: "تصدير إلى Google Drive",
    triggerTooltip: "رفع ملفات 03_Edicion_Master إلى Google Drive",
    modalTitle: "تصدير إلى Google Drive — قسم المونتاج",
    modalSubtitle: "رفع مباشر من مجلد C: المحلي إلى Google Drive",
    sourceLabel: "المجلد المحلي المراد تصديره إلى DRIVE:",
    sourceMaster: "03_Edicion_Master",
    sourceMasterDesc: "الصور والفيديوهات بعد المونتاج (Master HD)",
    openLocalFolderBtn: "فتح مجلد C:",
    selectLocalFolderBtn: "تحميل مجلد C:",
    filesDetected: (count: number, mb: string) => `${count} ملفات جاهزة (${mb} ميغابايت)`,
    noFilesYet: "انسخ صورك إلى 03_Edicion_Master في القرص C: ثم اضغط بدء المزامنة",
    pathCopied: "تم نسخ المسار C:!",
    startBtn: "بدء التصدير إلى Drive",
    syncingBtn: "جارٍ الرفع إلى Google Drive...",
    successTitle: "اكتمل التصدير إلى Google Drive بنجاح!",
    successDesc: "تم رفع الملفات بنسبة 100% ومجلد Google Drive أصبح جاهزاً للعميل.",
    driveFolderLabel: "رابط Google Drive:",
    openDriveBtn: "فتح Google Drive",
    cancelBtn: "إغلاق",
    consoleLogsTitle: "سجل النقل المباشر",
    preparingText: "جارٍ تحضير الرفع...",
  },
} as const

function getMimeTypeForFilename(name: string, fallbackType?: string): string {
  if (fallbackType && fallbackType.trim() !== "") return fallbackType
  const ext = name.slice(name.lastIndexOf(".")).toLowerCase()
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg"
  if (ext === ".png") return "image/png"
  if (ext === ".webp") return "image/webp"
  if (ext === ".mp4") return "video/mp4"
  if (ext === ".mov") return "video/quicktime"
  if (ext === ".nef") return "image/x-nikon-nef"
  if (ext === ".cr2") return "image/x-canon-cr2"
  if (ext === ".cr3") return "image/x-canon-cr3"
  if (ext === ".arw") return "image/x-sony-arw"
  if (ext === ".dng") return "image/x-adobe-dng"
  return "application/octet-stream"
}

export function MontageDriveSyncModal({
  sessionId,
  clientName,
  clientEmail,
  portalPin,
  folderName,
  existingDriveUrl,
  onSuccess,
  triggerButton,
}: MontageDriveSyncModalProps) {
  const { language } = useLanguage()
  const { theme } = useTheme()
  const isLight = theme === "light"

  const activeLang =
    language === "ar" || language === "en" || language === "es" || language === "fr"
      ? language
      : "fr"
  const t = I18N[activeLang]
  const isRtl = activeLang === "ar"

  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [retentionDays] = useState<number>(30)

  // Archivos detectados automáticamente en C:\Lamha-Storage\<folderName>\03_Edicion_Master
  const [bridgeFiles, setBridgeFiles] = useState<Array<{ name: string; size: number }>>([])
  const [bridgePort, setBridgePort] = useState<number | undefined>(undefined)
  const [hasNativeBinaryReader, setHasNativeBinaryReader] = useState(false)

  // Archivos cargados directamente desde el selector de carpeta C: del navegador
  const [browserFiles, setBrowserFiles] = useState<File[]>([])
  const [copiedPathNotice, setCopiedPathNotice] = useState(false)
  const [isScanningFolder, setIsScanningFolder] = useState(false)

  const [isSyncing, setIsSyncing] = useState(false)
  const [status, setStatus] = useState<"idle" | "running" | "completed" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [progressPercent, setProgressPercent] = useState(0)
  const [currentFileText, setCurrentFileText] = useState("")
  const [generatedDriveUrl, setGeneratedDriveUrl] = useState<string | null>(existingDriveUrl || null)
  const [logs, setLogs] = useState<LogEntry[]>([])

  const terminalEndRef = useRef<HTMLDivElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const pendingAutoStartRef = useRef<boolean>(false)

  const localWinPath = `C:\\Lamha-Storage\\${folderName}\\03_Edicion_Master`

  const addLog = (level: LogEntry["level"], msg: string) => {
    const time = new Date().toLocaleTimeString()
    setLogs((prev) => [...prev, { time, level, msg }])
    setTimeout(() => {
      terminalEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, 50)
  }

  // Escanear automáticamente C:\Lamha-Storage\<folderName>\03_Edicion_Master al abrir el modal
  const refreshLocalFolderScan = async () => {
    setIsScanningFolder(true)
    try {
      const scan = await getMasterFolderFiles(folderName)
      setBridgeFiles(scan.files)
      setBridgePort(scan.bridgePort)
      setHasNativeBinaryReader(scan.hasNativeBinaryReader)
    } catch {
    } finally {
      setIsScanningFolder(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      refreshLocalFolderScan()
    }
  }, [isOpen, folderName])

  // Abrir la carpeta C:\Lamha-Storage\<folderName>\03_Edicion_Master en Windows Explorer
  const handleOpenLocalFolder = async () => {
    const res = await openProjectMasterFolder(folderName)
    if (!res.success) {
      try {
        await navigator.clipboard.writeText(localWinPath)
        setCopiedPathNotice(true)
        setTimeout(() => setCopiedPathNotice(false), 3500)
      } catch {}
    }
  }

  // Cuando el usuario selecciona la carpeta C:\Lamha-Storage\<folderName>\03_Edicion_Master desde el diálogo nativo
  const handleBrowserFolderChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      pendingAutoStartRef.current = false
      return
    }
    const validFiles = Array.from(e.target.files).filter(
      (f) => !f.name.startsWith(".") && f.size > 0
    )
    setBrowserFiles(validFiles)
    setErrorMessage(null)

    if (pendingAutoStartRef.current && validFiles.length > 0) {
      pendingAutoStartRef.current = false
      await executeDirectUploadWithFiles(
        validFiles.map((f) => ({ name: f.name, size: f.size, fileObj: f }))
      )
    }
    e.target.value = ""
  }

  // Subida directa de archivos desde C:\ hacia Google Drive API con progreso byte a byte (0% -> 100%)
  const executeDirectUploadWithFiles = async (
    items: Array<{ name: string; size: number; fileObj?: File }>
  ) => {
    if (items.length === 0) return

    setIsSyncing(true)
    setStatus("running")
    setErrorMessage(null)
    setProgressPercent(5)
    setLogs([])
    setCurrentFileText(t.preparingText)

    const totalFiles = items.length
    const totalBytes = items.reduce((acc, item) => acc + item.size, 0)
    const totalMb = Number((totalBytes / (1024 * 1024)).toFixed(1))

    addLog(
      "info",
      `[Lamha Studio] Exportando ${totalFiles} archivos (${totalMb} MB) desde 03_Edicion_Master ➔ Google Drive ("${clientName}")...`
    )

    try {
      // 1. Crear carpeta en Google Drive y obtener token de acceso directo
      const initRes = await fetch("/api/deliveries/gdrive-direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "init",
          sessionId,
          clientName,
          folderName,
        }),
      })

      const initData = await initRes.json()
      if (!initRes.ok || !initData.success || !initData.accessToken || !initData.folderId) {
        throw new Error(initData.error || "No se pudo inicializar la carpeta en Google Drive.")
      }

      const { folderId, folderUrl, gdriveFolderName, accessToken } = initData
      addLog("success", `✓ Carpeta creada en Google Drive: "${gdriveFolderName}"`)
      setProgressPercent(10)

      // 2. Subir cada archivo directamente desde el PC del usuario a Google Drive API
      let bytesTransferred = 0
      let uploadedCount = 0

      for (let i = 0; i < totalFiles; i++) {
        const item = items[i]
        const itemMb = (item.size / (1024 * 1024)).toFixed(1)

        setCurrentFileText(`[${i + 1}/${totalFiles}] ${item.name} (${itemMb} MB)...`)
        addLog("info", `[${i + 1}/${totalFiles}] Subiendo ${item.name} (${itemMb} MB)...`)

        // Obtener el Blob del archivo (ya sea del navegador o del puente local C:\)
        let blob: Blob | null = item.fileObj || null
        if (!blob) {
          blob = await readMasterFileBlob(folderName, item.name, bridgePort)
        }

        if (!blob) {
          throw new Error(
            `No se pudo leer el archivo local "${item.name}". Pulsa "${t.selectLocalFolderBtn}" para autorizar la lectura de la carpeta.`
          )
        }

        const mimeType = getMimeTypeForFilename(item.name, item.fileObj?.type)

        // 2.1 Crear metadatos del archivo dentro de la carpeta de Google Drive
        const metaRes = await fetch(
          "https://www.googleapis.com/drive/v3/files?supportsAllDrives=true",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: item.name,
              parents: [folderId],
            }),
          }
        )

        if (!metaRes.ok) {
          const errTxt = await metaRes.text()
          throw new Error(`Error creando archivo en Drive (${metaRes.status}): ${errTxt}`)
        }

        const metaJson = await metaRes.json()
        const driveFileId = metaJson.id
        if (!driveFileId) {
          throw new Error(`Google Drive no devolvió ID para ${item.name}`)
        }

        // 2.2 Transmitir el binario con XMLHttpRequest para progreso real en vivo
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhr.open(
            "PATCH",
            `https://www.googleapis.com/upload/drive/v3/files/${driveFileId}?uploadType=media&supportsAllDrives=true`
          )
          xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`)
          xhr.setRequestHeader("Content-Type", mimeType)

          xhr.upload.onprogress = (ev) => {
            if (ev.lengthComputable && totalBytes > 0) {
              const currentTotal = bytesTransferred + ev.loaded
              const pct = 10 + Math.round((currentTotal / totalBytes) * 85)
              setProgressPercent(Math.min(95, Math.max(10, pct)))
              const doneMb = (currentTotal / (1024 * 1024)).toFixed(1)
              setCurrentFileText(
                `[${i + 1}/${totalFiles}] ${item.name} (${doneMb} / ${totalMb} MB)`
              )
            }
          }

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve()
            } else {
              reject(new Error(`Fallo al subir ${item.name} (${xhr.status})`))
            }
          }

          xhr.onerror = () => reject(new Error(`Error de red al subir ${item.name} a Google Drive`))
          xhr.send(blob)
        })

        bytesTransferred += item.size
        uploadedCount++
        const afterFilePct = 10 + Math.round((bytesTransferred / Math.max(1, totalBytes)) * 85)
        setProgressPercent(Math.min(95, afterFilePct))
        addLog("success", `✓ [OK ${uploadedCount}/${totalFiles}] ${item.name} (${itemMb} MB)`)
      }

      // 3. Registrar entrega en Supabase y disparar notificaciones al cliente
      setCurrentFileText("Registrando entrega en el Portal del Cliente...")
      setProgressPercent(97)

      const completeRes = await fetch("/api/deliveries/gdrive-direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete",
          sessionId,
          folderId,
          folderUrl,
          totalFiles: uploadedCount,
          totalSizeMb: totalMb,
          retentionDays,
          language: activeLang,
        }),
      })

      const completeData = await completeRes.json()
      if (completeData.logs && Array.isArray(completeData.logs)) {
        completeData.logs.forEach((l: any) => addLog(l.level || "info", l.msg))
      }

      setProgressPercent(100)
      setStatus("completed")
      setGeneratedDriveUrl(folderUrl)
      addLog("success", `🎉 Exportación completada: ${uploadedCount} archivos (${totalMb} MB) en Google Drive.`)
      if (onSuccess) onSuccess()
    } catch (err: any) {
      console.error("Error en subida directa a Google Drive:", err)
      setStatus("error")
      setErrorMessage(err?.message || "Error al subir a Google Drive.")
      addLog("error", `Error: ${err?.message || "Fallo inesperado"}`)
    } finally {
      setIsSyncing(false)
    }
  }

  // Botón principal: "Exportar a Google Drive"
  const handleStartSync = async () => {
    setErrorMessage(null)

    // 1. Si el usuario ya cargó archivos de la carpeta en el navegador, subirlos directamente
    if (browserFiles.length > 0) {
      await executeDirectUploadWithFiles(
        browserFiles.map((f) => ({ name: f.name, size: f.size, fileObj: f }))
      )
      return
    }

    // 2. Volver a escanear por si acaba de pegar fotos en C:\Lamha-Storage\<folderName>\03_Edicion_Master
    const freshScan = await getMasterFolderFiles(folderName)
    setBridgeFiles(freshScan.files)
    setBridgePort(freshScan.bridgePort)
    setHasNativeBinaryReader(freshScan.hasNativeBinaryReader)

    if (freshScan.files.length > 0 && freshScan.hasNativeBinaryReader) {
      await executeDirectUploadWithFiles(freshScan.files)
      return
    }

    // 3. Si estamos en localhost puro, intentar el endpoint local del servidor
    if (
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ) {
      setIsSyncing(true)
      setStatus("running")
      setProgressPercent(5)
      setLogs([])
      addLog("info", `[Lamha Studio] Iniciando exportación local hacia Google Drive...`)

      try {
        const res = await fetch("/api/deliveries/sync-nas-gdrive", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            folderName,
            clientName,
            retentionDays,
            preferredSource: "master",
            language: activeLang,
          }),
        })

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.error || `Error del servidor (${res.status})`)
        }

        if (!res.body) throw new Error("No se pudo leer el flujo de respuesta.")
        const reader = res.body.getReader()
        const decoder = new TextDecoder("utf-8")
        let buffer = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() || ""

          for (const line of lines) {
            if (!line.trim()) continue
            const data = JSON.parse(line)
            if (data.type === "log") {
              addLog(data.level || "info", data.msg)
            } else if (data.type === "progress") {
              const calcPercent =
                data.percent !== undefined
                  ? data.percent
                  : data.totalBytes > 0
                  ? Math.round((data.bytesTransferred / data.totalBytes) * 100)
                  : Math.round(((data.current || 0) / (data.total || 1)) * 100)
              setProgressPercent(Math.min(99, Math.max(5, calcPercent)))
              if (data.fileName || data.currentFile) {
                setCurrentFileText(
                  `[${data.current || 1}/${data.total || 1}] ${data.fileName || data.currentFile} (${data.sizeMb || ""} MB)`
                )
              }
            } else if (data.type === "done" || data.type === "completed") {
              setProgressPercent(100)
              setStatus("completed")
              const driveUrl = data.url || data.folderUrl
              if (driveUrl) setGeneratedDriveUrl(driveUrl)
              if (onSuccess) onSuccess()
            } else if (data.type === "error") {
              throw new Error(data.error || "Error durante la sincronización.")
            }
          }
        }
        setIsSyncing(false)
        return
      } catch (err: any) {
        setIsSyncing(false)
        setStatus("idle")
      }
    }

    // 4. Si estamos en el dominio remoto (admin.lam7a.com) o sin puente binario directo:
    // Copiamos la ruta exacta de C:\ al portapapeles y abrimos el selector de carpeta de Windows para subir directo en 1 clic
    try {
      await navigator.clipboard.writeText(localWinPath)
      setCopiedPathNotice(true)
      setTimeout(() => setCopiedPathNotice(false), 4000)
    } catch {}

    pendingAutoStartRef.current = true
    folderInputRef.current?.click()
  }

  const activeFilesCount = browserFiles.length > 0 ? browserFiles.length : bridgeFiles.length
  const activeTotalBytes =
    browserFiles.length > 0
      ? browserFiles.reduce((a, b) => a + b.size, 0)
      : bridgeFiles.reduce((a, b) => a + b.size, 0)
  const activeTotalMb = (activeTotalBytes / (1024 * 1024)).toFixed(1)

  return (
    <>
      {/* Input oculto para seleccionar la carpeta 03_Edicion_Master de C: cuando se usa desde navegador web */}
      <input
        ref={folderInputRef}
        type="file"
        // @ts-ignore
        webkitdirectory=""
        directory=""
        multiple
        onChange={handleBrowserFolderChosen}
        className="hidden"
      />

      {/* Botón Disparador */}
      {triggerButton ? (
        <div
          onClick={() => {
            setIsOpen(true)
            if (status === "error") {
              setStatus("idle")
              setErrorMessage(null)
            }
          }}
        >
          {triggerButton}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setIsOpen(true)
            setStatus("idle")
            setErrorMessage(null)
          }}
          className={cn(
            "inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-sm",
            isLight
              ? "bg-[#ffffff] hover:bg-[#faf6f0] border border-[#ded5c7] hover:border-[#c69f68] text-[#3d3328] hover:text-[#1a1510]"
              : "bg-[#181613] hover:bg-[#201c18] border border-[#2b251f] hover:border-[#c69f68]/50 text-[#e4decb] hover:text-[#f5f2eb]"
          )}
          title={t.triggerTooltip}
        >
          <Cloud className="w-3.5 h-3.5 text-sky-500" />
          <span>{t.triggerBtn}</span>
        </button>
      )}

      {/* Modal Principal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div
            dir={isRtl ? "rtl" : "ltr"}
            className={cn(
              "w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors",
              isLight
                ? "bg-[#fcfaf7] border-[#e2d8ca] text-[#2c2219]"
                : "bg-[#13110f] border-[#2c2620] text-[#f5f2eb]"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className={cn(
                "p-5 border-b flex items-center justify-between transition-colors",
                isLight
                  ? "bg-gradient-to-r from-[#f5ede2] via-[#fbf7f0] to-[#f5ede2] border-[#e5ddd0]"
                  : "bg-gradient-to-r from-[#1c1814] via-[#161310] to-[#13110f] border-[#231e19]"
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl border flex items-center justify-center shrink-0",
                    isLight
                      ? "bg-sky-500/10 border-sky-500/30 text-sky-600"
                      : "bg-sky-500/15 border-sky-500/30 text-sky-400"
                  )}
                >
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h3
                    className={cn(
                      "text-sm font-serif font-bold",
                      isLight ? "text-[#1f1710]" : "text-[#f5f2eb]"
                    )}
                  >
                    {t.modalTitle}
                  </h3>
                  <p
                    className={cn(
                      "text-[11px]",
                      isLight ? "text-[#7d6c5c]" : "text-[#9c8e7f]"
                    )}
                  >
                    {t.modalSubtitle} •{" "}
                    <strong className={isLight ? "text-[#9e753b]" : "text-[#c69f68]"}>
                      {clientName}
                    </strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsMinimized(true)
                    setIsOpen(false)
                  }}
                  className={cn(
                    "p-1.5 rounded-lg transition-colors cursor-pointer",
                    isLight
                      ? "text-[#8c7a6b] hover:text-[#1f1710] hover:bg-[#ede3d4]"
                      : "text-[#8c7a6b] hover:text-[#f5f2eb] hover:bg-[#231e19]"
                  )}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false)
                    if (isSyncing) setIsMinimized(true)
                  }}
                  className={cn(
                    "p-1.5 rounded-lg transition-colors cursor-pointer",
                    isLight
                      ? "text-[#8c7a6b] hover:text-[#1f1710] hover:bg-[#ede3d4]"
                      : "text-[#8c7a6b] hover:text-[#f5f2eb] hover:bg-[#231e19]"
                  )}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              {status === "completed" ? (
                <div className="py-6 text-center space-y-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-500 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <h4
                      className={cn(
                        "text-base font-serif font-bold",
                        isLight ? "text-[#1f1710]" : "text-[#f5f2eb]"
                      )}
                    >
                      {t.successTitle}
                    </h4>
                    <p
                      className={cn(
                        "text-xs max-w-md mx-auto mt-1 leading-relaxed",
                        isLight ? "text-[#7d6c5c]" : "text-[#a89f92]"
                      )}
                    >
                      {t.successDesc}
                    </p>
                  </div>

                  {generatedDriveUrl && (
                    <div
                      className={cn(
                        "p-3.5 rounded-xl border flex items-center justify-between gap-3 text-start",
                        isLight
                          ? "bg-[#ffffff] border-[#ded5c7]"
                          : "bg-[#1a1714] border-[#2b251f]"
                      )}
                    >
                      <div className="min-w-0">
                        <span className="text-[10px] block uppercase tracking-wider font-mono text-[#8c7a6b]">
                          {t.driveFolderLabel}
                        </span>
                        <span className="text-xs text-sky-600 dark:text-sky-400 font-mono truncate block font-medium">
                          {generatedDriveUrl}
                        </span>
                      </div>
                      <a
                        href={generatedDriveUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-500/20 hover:bg-sky-500/30 text-sky-600 dark:text-sky-300 border border-sky-500/40 transition-colors shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>{t.openDriveBtn}</span>
                      </a>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-center gap-3">
                    <NotifyClientEmailDialog
                      sessionId={sessionId}
                      clientName={clientName}
                      clientEmail={clientEmail}
                      portalPin={portalPin}
                      hasDriveFolder={Boolean(generatedDriveUrl)}
                      onSuccess={() => setIsOpen(false)}
                    />
                  </div>
                </div>
              ) : (
                <>
                  {/* Tarjeta de Carpeta Local C:\Lamha-Storage\...\03_Edicion_Master */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label
                        className={cn(
                          "text-[11px] font-semibold uppercase tracking-wider block",
                          isLight ? "text-[#9e753b]" : "text-[#c69f68]"
                        )}
                      >
                        {t.sourceLabel}
                      </label>
                      <button
                        type="button"
                        onClick={refreshLocalFolderScan}
                        className="text-[11px] text-[#8c7a6b] hover:text-[#c69f68] inline-flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className={cn("w-3 h-3", isScanningFolder && "animate-spin")} />
                      </button>
                    </div>

                    <div
                      className={cn(
                        "p-4 rounded-xl border space-y-3 transition-colors",
                        isLight
                          ? "bg-[#f5eefc] border-purple-300 text-purple-950"
                          : "bg-purple-950/25 border-purple-500/40 text-[#f5f2eb]"
                      )}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "w-10 h-10 rounded-xl border flex items-center justify-center shrink-0",
                              isLight
                                ? "bg-purple-100 border-purple-200 text-purple-700"
                                : "bg-purple-900/50 border-purple-500/40 text-purple-300"
                            )}
                          >
                            <Layers className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-purple-900 dark:text-purple-200 font-mono">
                                {t.sourceMaster}
                              </span>
                              <span
                                className={cn(
                                  "text-[10px] uppercase font-mono px-2 py-0.5 rounded font-bold",
                                  activeFilesCount > 0
                                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                    : "bg-purple-800/40 text-purple-300"
                                )}
                              >
                                {activeFilesCount > 0
                                  ? t.filesDetected(activeFilesCount, activeTotalMb)
                                  : "RAW / Master HD"}
                              </span>
                            </div>
                            <span className="text-[11px] opacity-80 block text-purple-700 dark:text-purple-300 font-mono mt-0.5 break-all">
                              {localWinPath}
                            </span>
                          </div>
                        </div>

                        {/* Acciones directas de Carpeta C: */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            disabled={isSyncing}
                            onClick={handleOpenLocalFolder}
                            className="px-3 py-1.5 rounded-lg bg-[#1a1714] hover:bg-[#25201b] border border-[#c69f68]/40 text-[#f5f2eb] text-[11px] font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <FolderOpen className="w-3.5 h-3.5 text-[#c69f68]" />
                            <span>{t.openLocalFolderBtn}</span>
                          </button>

                          <button
                            type="button"
                            disabled={isSyncing}
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(localWinPath)
                                setCopiedPathNotice(true)
                                setTimeout(() => setCopiedPathNotice(false), 3500)
                              } catch {}
                              pendingAutoStartRef.current = false
                              folderInputRef.current?.click()
                            }}
                            className="px-3 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/40 text-purple-200 text-[11px] font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <HardDrive className="w-3.5 h-3.5 text-purple-300" />
                            <span>{t.selectLocalFolderBtn}</span>
                          </button>
                        </div>
                      </div>

                      {copiedPathNotice && (
                        <div className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 shrink-0" />
                          <span>{t.pathCopied}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Barra de Progreso en Vivo */}
                  {status === "running" && (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span
                          className={cn(
                            "font-mono truncate max-w-md",
                            isLight ? "text-[#9e753b]" : "text-[#c69f68]"
                          )}
                        >
                          {currentFileText || t.preparingText}
                        </span>
                        <span
                          className={cn(
                            "font-mono font-bold",
                            isLight ? "text-[#1f1710]" : "text-[#f5f2eb]"
                          )}
                        >
                          {progressPercent}%
                        </span>
                      </div>
                      <div
                        className={cn(
                          "w-full h-2.5 rounded-full overflow-hidden border",
                          isLight
                            ? "bg-[#ede4d6] border-[#ded3c2]"
                            : "bg-[#1e1b17] border-[#2b251f]"
                        )}
                      >
                        <div
                          className="h-full bg-gradient-to-r from-[#c69f68] via-sky-500 to-emerald-500 transition-all duration-300 rounded-full"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Consola de Logs */}
                  {logs.length > 0 && (
                    <div className="space-y-1.5">
                      <span
                        className={cn(
                          "text-[10px] uppercase font-mono block font-semibold",
                          isLight ? "text-[#7d6c5c]" : "text-[#8c7a6b]"
                        )}
                      >
                        {t.consoleLogsTitle}
                      </span>
                      <div className="h-36 rounded-xl bg-[#0c0a09] border border-[#231e19] p-2.5 font-mono text-[10px] overflow-y-auto space-y-1 text-[#d1c7b8]">
                        {logs.map((log, idx) => (
                          <div key={idx} className="leading-tight flex items-start gap-1.5">
                            <span className="text-[#695d4f] shrink-0">[{log.time}]</span>
                            <span
                              className={
                                log.level === "error"
                                  ? "text-rose-400 font-bold"
                                  : log.level === "success"
                                  ? "text-emerald-400 font-bold"
                                  : log.level === "warn"
                                  ? "text-amber-400"
                                  : "text-[#d1c7b8]"
                              }
                            >
                              {log.msg}
                            </span>
                          </div>
                        ))}
                        <div ref={terminalEndRef} />
                      </div>
                    </div>
                  )}

                  {/* Error Message */}
                  {errorMessage && (
                    <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                      <div>
                        <strong>Error:</strong>
                        <p className="mt-0.5 text-rose-400">{errorMessage}</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            {status !== "completed" && (
              <div
                className={cn(
                  "p-4 border-t flex items-center justify-end gap-2.5 transition-colors",
                  isLight
                    ? "bg-[#f5ede2] border-[#e5ddd0]"
                    : "bg-[#0e0c0b] border-[#231e19]"
                )}
              >
                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer",
                    isLight
                      ? "text-[#6e5d4e] hover:text-[#1f1710] hover:bg-[#ede3d4]"
                      : "text-[#a89f92] hover:text-[#f5f2eb] hover:bg-[#1a1714]"
                  )}
                >
                  {t.cancelBtn}
                </button>

                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={handleStartSync}
                  className={cn(
                    "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
                    isLight
                      ? "bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-500 hover:to-sky-600 text-white shadow-sky-600/25 active:scale-95"
                      : "bg-gradient-to-r from-sky-500 via-sky-600 to-[#c69f68] text-[#0d0c0b] hover:brightness-110 shadow-sky-500/20 active:scale-95"
                  )}
                >
                  {isSyncing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{t.syncingBtn}</span>
                    </>
                  ) : (
                    <>
                      <Cloud className="w-3.5 h-3.5" />
                      <span>
                        {t.startBtn}
                        {activeFilesCount > 0 ? ` (${activeFilesCount})` : ""}
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Widget flotante cuando está minimizado */}
      {isMinimized && (
        <aside
          aria-label="Google Drive Export Progress"
          className={cn(
            "fixed bottom-5 right-5 z-50 w-80 sm:w-96 rounded-2xl border shadow-2xl p-3.5 backdrop-blur-md animate-in slide-in-from-bottom-5 duration-200 transition-all",
            isLight
              ? "bg-[#ffffff]/95 border-[#ded5c7] text-[#2c2219] shadow-xl shadow-black/10"
              : "bg-[#13110f]/95 border-[#2c2620] text-[#f5f2eb] shadow-2xl shadow-black/60"
          )}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={cn(
                  "w-8 h-8 rounded-xl border flex items-center justify-center shrink-0",
                  status === "completed"
                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-500"
                    : status === "error"
                    ? "bg-rose-500/15 border-rose-500/30 text-rose-400"
                    : isSyncing
                    ? "bg-sky-500/15 border-sky-500/30 text-sky-400"
                    : "bg-[#c69f68]/15 border-[#c69f68]/30 text-[#c69f68]"
                )}
              >
                {status === "completed" ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : status === "error" ? (
                  <AlertCircle className="w-4 h-4" />
                ) : isSyncing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Cloud className="w-4 h-4" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold truncate">{clientName} • Google Drive</p>
                <p
                  className={cn(
                    "text-[10px] truncate font-mono",
                    isLight ? "text-[#7d6c5c]" : "text-[#8c7a6b]"
                  )}
                >
                  {status === "completed"
                    ? t.successTitle
                    : status === "error"
                    ? errorMessage || "Error"
                    : currentFileText || t.preparingText}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsMinimized(false)
                  setIsOpen(true)
                }}
                className={cn(
                  "p-1.5 rounded-lg transition-colors cursor-pointer",
                  isLight
                    ? "hover:bg-[#f2ebe0] text-[#7d6c5c]"
                    : "hover:bg-[#201c18] text-[#a89f92]"
                )}
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsMinimized(false)}
                className={cn(
                  "p-1.5 rounded-lg transition-colors cursor-pointer",
                  isLight
                    ? "hover:bg-[#f2ebe0] text-[#7d6c5c]"
                    : "hover:bg-[#201c18] text-[#a89f92]"
                )}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span
                className={cn(
                  "font-bold",
                  status === "completed"
                    ? "text-emerald-500"
                    : isLight
                    ? "text-[#9e753b]"
                    : "text-[#c69f68]"
                )}
              >
                {status === "completed" ? "100%" : `${progressPercent}%`}
              </span>
            </div>
            <div
              className={cn(
                "w-full h-1.5 rounded-full overflow-hidden border",
                isLight ? "bg-[#ede4d6] border-[#ded3c2]" : "bg-[#1e1b17] border-[#2b251f]"
              )}
            >
              <div
                className={cn(
                  "h-full transition-all duration-300 rounded-full",
                  status === "completed"
                    ? "bg-emerald-500"
                    : "bg-gradient-to-r from-[#c69f68] via-sky-500 to-emerald-500"
                )}
                style={{ width: `${status === "completed" ? 100 : progressPercent}%` }}
              />
            </div>
          </div>
        </aside>
      )}
    </>
  )
}
