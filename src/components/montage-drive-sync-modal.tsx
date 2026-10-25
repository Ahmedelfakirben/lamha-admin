"use client"

import { useState, useRef } from "react"
import { 
  Cloud, 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ExternalLink, 
  FolderSync, 
  Terminal, 
  Layers, 
  Sparkles, 
  Mail,
  X,
  Clock,
  Minus,
  Maximize2
} from "lucide-react"
import { useLanguage } from "@/context/language-context"
import { useTheme } from "@/context/theme-context"
import { NotifyClientEmailDialog } from "./notify-client-email-dialog"
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
    triggerTooltip: "Transférer les fichiers montés vers le dossier Google Drive du client",
    modalTitle: "Exportation Google Drive — Section Montage",
    modalSubtitle: "Transfert sécurisé vers le cloud pour la livraison au client",
    sourceLabel: "Fichiers à exporter vers Drive :",
    sourceMaster: "03_Édition_Master",
    sourceMasterDesc: "Photos & Vidéos montées (Format HD Master)",
    sourceSelection: "Sélection Client",
    sourceSelectionDesc: "Favoris avec Cœur",
    sourceDelivery: "04_Livraisons_Finales",
    sourceDeliveryDesc: "Exportations HD",
    retentionLabel: "Durée de validité du lien :",
    days30: "30 jours",
    days60: "60 jours",
    permanent: "Permanent (Illimité)",
    startBtn: "Démarrer la Synchronisation Drive",
    syncingBtn: "Synchronisation vers Drive en cours...",
    successTitle: "Synchronisation Drive Terminée !",
    successDesc: "Les fichiers ont été téléversés et le dossier Google Drive est désormais actif et lié au projet.",
    driveFolderLabel: "Lien Google Drive :",
    openDriveBtn: "Ouvrir Google Drive",
    notifyBtn: "Notifier le Client par Email",
    cancelBtn: "Fermer",
    consoleLogsTitle: "Journal de Transfert en Direct",
  },
  es: {
    triggerBtn: "Exportar a Google Drive",
    triggerTooltip: "Transferir archivos montados a la carpeta de Google Drive del cliente",
    modalTitle: "Exportación a Google Drive — Sección Montaje",
    modalSubtitle: "Transferencia segura a la nube para la entrega al cliente",
    sourceLabel: "Archivos a exportar a Drive:",
    sourceMaster: "03_Edición_Master",
    sourceMasterDesc: "Fotos y Videos montados (Lote Master HD)",
    sourceSelection: "Selección del Cliente",
    sourceSelectionDesc: "Favoritos con Corazón",
    sourceDelivery: "04_Entregas_Finales",
    sourceDeliveryDesc: "Lote HD Final",
    retentionLabel: "Periodo de validez del enlace:",
    days30: "30 días",
    days60: "60 días",
    permanent: "Permanente (Ilimitado)",
    startBtn: "Iniciar Sincronización Drive",
    syncingBtn: "Sincronizando con Google Drive...",
    successTitle: "¡Sincronización en Drive Completada!",
    successDesc: "Los archivos se han subido con éxito y la carpeta de Google Drive está vinculada al proyecto.",
    driveFolderLabel: "Enlace de Google Drive:",
    openDriveBtn: "Abrir Google Drive",
    notifyBtn: "Notificar al Cliente por Email",
    cancelBtn: "Cerrar",
    consoleLogsTitle: "Registro de Transferencia en Vivo",
  },
  en: {
    triggerBtn: "Export to Google Drive",
    triggerTooltip: "Transfer edited files to the client's Google Drive folder",
    modalTitle: "Google Drive Export — Editing & Montage",
    modalSubtitle: "Secure cloud transfer for client delivery",
    sourceLabel: "Files to export to Drive:",
    sourceMaster: "03_Edition_Master",
    sourceMasterDesc: "Edited Photos & Videos (HD Master)",
    sourceSelection: "Client Favorites",
    sourceSelectionDesc: "Heart Favorites",
    sourceDelivery: "04_Final_Deliveries",
    sourceDeliveryDesc: "HD Final Pack",
    retentionLabel: "Link retention period:",
    days30: "30 days",
    days60: "60 days",
    permanent: "Permanent (Unlimited)",
    startBtn: "Start Drive Sync",
    syncingBtn: "Syncing with Google Drive...",
    successTitle: "Drive Sync Completed!",
    successDesc: "Files have been uploaded and the Google Drive folder is now linked to this session.",
    driveFolderLabel: "Google Drive Link:",
    openDriveBtn: "Open Google Drive",
    notifyBtn: "Notify Client via Email",
    cancelBtn: "Close",
    consoleLogsTitle: "Live Transfer Log",
  },
  ar: {
    triggerBtn: "تصدير إلى Google Drive",
    triggerTooltip: "نقل الملفات المجهزة بعد المونتاج إلى مجلد Google Drive الخاص بالعميل",
    modalTitle: "تصدير إلى Google Drive — قسم المونتاج",
    modalSubtitle: "نقل سحابي آمن وسريع لتسليم العمل للعميل",
    sourceLabel: "الملفات المراد تصديرها إلى Drive:",
    sourceMaster: "03_Édition_Master",
    sourceMasterDesc: "الصور والفيديوهات بعد المونتاج (نسخة الماستر الأصلية)",
    sourceSelection: "الصور المختارة",
    sourceSelectionDesc: "الصور بعلامة القلب",
    sourceDelivery: "04_Entregas_Finales",
    sourceDeliveryDesc: "الحزمة النهائية فائقة الدقة",
    retentionLabel: "مدة صلاحية الرابط:",
    days30: "30 يوماً",
    days60: "60 يوماً",
    permanent: "دائم (بدون انتهاء)",
    startBtn: "بدء المزامنة إلى Drive",
    syncingBtn: "جارٍ المزامنة إلى Google Drive...",
    successTitle: "اكتملت المزامنة بنجاح!",
    successDesc: "تم رفع الملفات بنجاح ومجلد Google Drive أصبح مرتبطاً بالمشروع وجاهزاً للتسليم.",
    driveFolderLabel: "رابط Google Drive:",
    openDriveBtn: "فتح مجلد Google Drive",
    notifyBtn: "إشعار العميل بالبريد الإلكتروني",
    cancelBtn: "إغلاق",
    consoleLogsTitle: "سجل النقل المباشر",
  },
} as const

export function MontageDriveSyncModal({
  sessionId,
  clientName,
  clientEmail,
  portalPin,
  folderName,
  existingDriveUrl,
  selectedCount = 0,
  onSuccess,
  triggerButton,
}: MontageDriveSyncModalProps) {
  const { language } = useLanguage()
  const { theme } = useTheme()
  const isLight = theme === "light"

  const activeLang = (language === "ar" || language === "en" || language === "es" || language === "fr")
    ? language
    : "fr"
  const t = I18N[activeLang]
  const isRtl = activeLang === "ar"

  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [sourceMode] = useState<"master">("master")
  const [retentionDays] = useState<number>(30)

  const [isSyncing, setIsSyncing] = useState(false)
  const [status, setStatus] = useState<"idle" | "running" | "completed" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [progressPercent, setProgressPercent] = useState(0)
  const [currentFileText, setCurrentFileText] = useState("")
  const [generatedDriveUrl, setGeneratedDriveUrl] = useState<string | null>(existingDriveUrl || null)
  const [logs, setLogs] = useState<LogEntry[]>([])

  const terminalEndRef = useRef<HTMLDivElement>(null)

  const addLog = (level: LogEntry["level"], msg: string) => {
    const time = new Date().toLocaleTimeString()
    setLogs((prev) => [...prev, { time, level, msg }])
    setTimeout(() => {
      terminalEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, 50)
  }

  const handleStartSync = async () => {
    setIsSyncing(true)
    setStatus("running")
    setErrorMessage(null)
    setProgressPercent(5)
    setLogs([])

    addLog("info", `[Lamha Studio] Début de l'exportation vers Google Drive pour "${clientName}"...`)

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

      if (!res.body) {
        throw new Error("Impossible de lire le flux de synchronisation.")
      }

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
          try {
            const data = JSON.parse(line)
            if (data.type === "log") {
              addLog(data.level || "info", data.msg)
              if (data.percent !== undefined) {
                setProgressPercent(data.percent)
              }
              if (data.currentFile || data.fileName) {
                setCurrentFileText(data.currentFile || data.fileName)
              }
            } else if (data.type === "progress") {
              const calcPercent = data.percent !== undefined
                ? data.percent
                : data.totalBytes > 0
                  ? Math.round((data.bytesTransferred / data.totalBytes) * 100)
                  : Math.round(((data.current || 0) / (data.total || 1)) * 100)

              setProgressPercent(Math.min(99, Math.max(0, calcPercent)))
              if (data.fileName || data.currentFile) {
                setCurrentFileText(`[${data.current || 1}/${data.total || 1}] ${data.fileName || data.currentFile} (${data.sizeMb || ""} MB)`)
              }
            } else if (data.type === "done" || data.type === "completed") {
              setProgressPercent(100)
              setStatus("completed")
              const driveUrl = data.url || data.folderUrl
              if (driveUrl) setGeneratedDriveUrl(driveUrl)
              addLog("success", `✦ Terminé avec succès. Lien Drive: ${driveUrl || ""}`)
              if (onSuccess) onSuccess()
            } else if (data.type === "error") {
              throw new Error(data.error || "Erreur lors de la synchronisation.")
            }
          } catch (e: any) {
            console.warn("Ligne non JSON reçue:", line)
          }
        }
      }
    } catch (err: any) {
      console.error("Erreur de synchronisation Drive:", err)
      setStatus("error")
      setErrorMessage(err?.message || "Erreur de connexion au serveur.")
      addLog("error", `Erreur critique: ${err?.message}`)
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <>
      {/* Botón Disparador */}
      {triggerButton ? (
        <div onClick={() => setIsOpen(true)}>{triggerButton}</div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
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
            <div className={cn(
              "p-5 border-b flex items-center justify-between transition-colors",
              isLight
                ? "bg-gradient-to-r from-[#f5ede2] via-[#fbf7f0] to-[#f5ede2] border-[#e5ddd0]"
                : "bg-gradient-to-r from-[#1c1814] via-[#161310] to-[#13110f] border-[#231e19]"
            )}>
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl border flex items-center justify-center shrink-0",
                  isLight
                    ? "bg-sky-500/10 border-sky-500/30 text-sky-600"
                    : "bg-sky-500/15 border-sky-500/30 text-sky-400"
                )}>
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={cn(
                    "text-sm font-serif font-bold",
                    isLight ? "text-[#1f1710]" : "text-[#f5f2eb]"
                  )}>
                    {t.modalTitle}
                  </h3>
                  <p className={cn(
                    "text-[11px]",
                    isLight ? "text-[#7d6c5c]" : "text-[#9c8e7f]"
                  )}>
                    {t.modalSubtitle} • <strong className={isLight ? "text-[#9e753b]" : "text-[#c69f68]"}>{clientName}</strong>
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
                  title={activeLang === "ar" ? "تصغير" : activeLang === "fr" ? "Réduire" : activeLang === "en" ? "Minimize" : "Minimizar"}
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
                /* Estado Exitoso */
                <div className="py-6 text-center space-y-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-500 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className={cn(
                      "text-base font-serif font-bold",
                      isLight ? "text-[#1f1710]" : "text-[#f5f2eb]"
                    )}>
                      {t.successTitle}
                    </h4>
                    <p className={cn(
                      "text-xs max-w-md mx-auto mt-1 leading-relaxed",
                      isLight ? "text-[#7d6c5c]" : "text-[#a89f92]"
                    )}>
                      {t.successDesc}
                    </p>
                  </div>

                  {generatedDriveUrl && (
                    <div className={cn(
                      "p-3.5 rounded-xl border flex items-center justify-between gap-3 text-start",
                      isLight
                        ? "bg-[#ffffff] border-[#ded5c7]"
                        : "bg-[#1a1714] border-[#2b251f]"
                    )}>
                      <div className="min-w-0">
                        <span className={cn(
                          "text-[10px] block uppercase tracking-wider font-mono",
                          isLight ? "text-[#8c7a6b]" : "text-[#8c7a6b]"
                        )}>
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
                /* Estado de Configuración o Progreso */
                <>
                  {/* Fuente Seleccionada: 03_Edición_Master */}
                  <div className="space-y-1.5">
                    <label className={cn(
                      "text-[11px] font-semibold uppercase tracking-wider block",
                      isLight ? "text-[#9e753b]" : "text-[#c69f68]"
                    )}>
                      {t.sourceLabel}
                    </label>
                    <div className={cn(
                      "p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-colors",
                      isLight
                        ? "bg-[#f5eefc] border-purple-300 text-purple-950 ring-2 ring-purple-500/20 shadow-sm"
                        : "bg-purple-950/30 border-purple-500/40 text-[#f5f2eb] ring-1 ring-purple-500/30"
                    )}>
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-9 h-9 rounded-lg border flex items-center justify-center shrink-0",
                          isLight
                            ? "bg-purple-100 border-purple-200 text-purple-700"
                            : "bg-purple-900/50 border-purple-500/40 text-purple-300"
                        )}>
                          <Layers className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-xs block text-purple-900 dark:text-purple-200">
                            {t.sourceMaster}
                          </span>
                          <span className="text-[11px] opacity-80 block text-purple-700 dark:text-purple-300">
                            {t.sourceMasterDesc}
                          </span>
                        </div>
                      </div>
                      <span className={cn(
                        "text-[10px] uppercase font-mono px-2.5 py-1 rounded-md font-bold tracking-wider",
                        isLight ? "bg-purple-200/80 text-purple-900" : "bg-purple-800/40 text-purple-300"
                      )}>
                        RAW / Master HD
                      </span>
                    </div>
                  </div>

                  {/* Barra de Progreso en Vivo */}
                  {status === "running" && (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className={cn(
                          "font-mono truncate max-w-xs",
                          isLight ? "text-[#9e753b]" : "text-[#c69f68]"
                        )}>
                          {currentFileText || "Préparation du téléversement..."}
                        </span>
                        <span className={cn(
                          "font-mono font-bold",
                          isLight ? "text-[#1f1710]" : "text-[#f5f2eb]"
                        )}>
                          {progressPercent}%
                        </span>
                      </div>
                      <div className={cn(
                        "w-full h-2.5 rounded-full overflow-hidden border",
                        isLight ? "bg-[#ede4d6] border-[#ded3c2]" : "bg-[#1e1b17] border-[#2b251f]"
                      )}>
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
                      <span className={cn(
                        "text-[10px] uppercase font-mono block font-semibold",
                        isLight ? "text-[#7d6c5c]" : "text-[#8c7a6b]"
                      )}>
                        {t.consoleLogsTitle}
                      </span>
                      <div className="h-36 rounded-xl bg-[#0c0a09] border border-[#231e19] p-2.5 font-mono text-[10px] overflow-y-auto space-y-1 text-[#d1c7b8]">
                        {logs.map((log, idx) => (
                          <div key={idx} className="leading-tight flex items-start gap-1.5">
                            <span className="text-[#695d4f] shrink-0">[{log.time}]</span>
                            <span className={
                              log.level === "error" 
                                ? "text-rose-400 font-bold" 
                                : log.level === "success" 
                                ? "text-emerald-400 font-bold" 
                                : log.level === "warn" 
                                ? "text-amber-400" 
                                : "text-[#d1c7b8]"
                            }>
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
                        <strong>Erreur :</strong>
                        <p className="mt-0.5 text-rose-400">{errorMessage}</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            {status !== "completed" && (
              <div className={cn(
                "p-4 border-t flex items-center justify-end gap-2.5 transition-colors",
                isLight
                  ? "bg-[#f5ede2] border-[#e5ddd0]"
                  : "bg-[#0e0c0b] border-[#231e19]"
              )}>
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
                      <span>{t.startBtn}</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Widget flotante en la esquina inferior cuando está minimizado o en progreso */}
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
              <div className={cn(
                "w-8 h-8 rounded-xl border flex items-center justify-center shrink-0",
                status === "completed"
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-500"
                  : status === "error"
                  ? "bg-rose-500/15 border-rose-500/30 text-rose-400"
                  : isSyncing
                  ? "bg-sky-500/15 border-sky-500/30 text-sky-400"
                  : "bg-[#c69f68]/15 border-[#c69f68]/30 text-[#c69f68]"
              )}>
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
                <p className="text-xs font-bold truncate">
                  {clientName} • Google Drive
                </p>
                <p className={cn(
                  "text-[10px] truncate font-mono",
                  isLight ? "text-[#7d6c5c]" : "text-[#8c7a6b]"
                )}>
                  {status === "completed" 
                    ? (activeLang === "es" ? "¡Sincronización completada!" : "Transfert terminé") 
                    : status === "error"
                    ? (errorMessage || "Erreur de transfert")
                    : (currentFileText || (isSyncing ? "En cours de transfert..." : "En attente"))}
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
                title={activeLang === "es" ? "Restaurar ventana" : "Agrandir"}
                className={cn(
                  "p-1.5 rounded-lg transition-colors cursor-pointer",
                  isLight ? "hover:bg-[#f2ebe0] text-[#7d6c5c]" : "hover:bg-[#201c18] text-[#a89f92]"
                )}
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsMinimized(false)}
                title={activeLang === "es" ? "Cerrar widget" : "Fermer"}
                className={cn(
                  "p-1.5 rounded-lg transition-colors cursor-pointer",
                  isLight ? "hover:bg-[#f2ebe0] text-[#7d6c5c]" : "hover:bg-[#201c18] text-[#a89f92]"
                )}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Barra de progreso interactiva */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className={cn(
                "font-bold",
                status === "completed" 
                  ? "text-emerald-500" 
                  : isLight ? "text-[#9e753b]" : "text-[#c69f68]"
              )}>
                {status === "completed" ? "100%" : `${progressPercent}%`}
              </span>
              <span className={cn(
                "text-[10px]",
                isLight ? "text-[#8c7a6b]" : "text-[#a89f92]"
              )}>
                {status === "completed" 
                  ? "✓ Carpeta vinculada" 
                  : isSyncing 
                  ? `${progressPercent}% sincronizado` 
                  : "Listo para iniciar"}
              </span>
            </div>
            <div className={cn(
              "w-full h-1.5 rounded-full overflow-hidden border",
              isLight ? "bg-[#ede4d6] border-[#ded3c2]" : "bg-[#1e1b17] border-[#2b251f]"
            )}>
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
