"use client"

import { useState, useEffect, useRef } from "react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog"
import { 
  HardDrive, 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  Terminal, 
  FolderSync, 
  Sparkles, 
  RefreshCw, 
  FolderOpen,
  ArrowRight,
  Wifi,
  WifiOff,
  FileCheck,
  Film,
  Camera,
  X,
  Play,
  Check,
  Layers,
  FileCode
} from "lucide-react"
import { useLanguage } from "@/context/language-context"
import { cn } from "@/lib/utils"

interface MasterDeliveryUploadModalProps {
  sessionId: string
  folderName: string
  clientName?: string
  defaultTargetFolder?: "03_Edicion_Master"
  triggerButton?: React.ReactNode
  onSuccess?: () => void
}

interface LogEntry {
  time: string
  level: "info" | "success" | "warn" | "error"
  msg: string
}

export function MasterDeliveryUploadModal({
  sessionId,
  folderName,
  clientName,
  defaultTargetFolder = "03_Edicion_Master",
  triggerButton,
  onSuccess,
}: MasterDeliveryUploadModalProps) {
  const { t, dir, language } = useLanguage()
  const isRtl = dir === "rtl"
  const [open, setOpen] = useState(false)

  // Modo: "upload" (subir nuevos) o "sync_nas" (sincronizar los que ya están en disco)
  const [activeTab, setActiveTab] = useState<"upload" | "sync_nas">("upload")
  const [targetFolder, setTargetFolder] = useState<"03_Edicion_Master">("03_Edicion_Master")
  const [replicateNas, setReplicateNas] = useState(true)

  // Estado del NAS
  const [nasStatus, setNasStatus] = useState<{ online: boolean; latencyMs: number; host: string } | null>(null)
  const [isCheckingNas, setIsCheckingNas] = useState(false)

  // Archivos seleccionados para subir y drag state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  // Estados de ejecución
  const [status, setStatus] = useState<"idle" | "running" | "completed" | "error">("idle")
  const [currentFileText, setCurrentFileText] = useState("")
  const [progressPercent, setProgressPercent] = useState(0)
  const [speedText, setSpeedText] = useState("")
  const [logs, setLogs] = useState<LogEntry[]>([])
  const terminalEndRef = useRef<HTMLDivElement>(null)

  // Resumen final
  const [stats, setStats] = useState<{ total: number; local: number; nas: number; sizeMb: number }>({
    total: 0,
    local: 0,
    nas: 0,
    sizeMb: 0,
  })

  // Comprobar NAS al abrir
  const checkNas = async () => {
    setIsCheckingNas(true)
    try {
      const res = await fetch("/api/media/nas-status")
      const data = await res.json()
      setNasStatus(data)
      if (!data.online) setReplicateNas(false)
      else setReplicateNas(true)
    } catch {
      setNasStatus({ online: false, latencyMs: -1, host: "192.168.11.1" })
      setReplicateNas(false)
    } finally {
      setIsCheckingNas(false)
    }
  }

  useEffect(() => {
    if (open) {
      checkNas()
    } else {
      if (status === "completed") {
        setStatus("idle")
        setSelectedFiles([])
        setProgressPercent(0)
        setLogs([])
      }
    }
  }, [open])

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [logs])

  const addLog = (level: LogEntry["level"], msg: string) => {
    const time = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, { time, level, msg }])
  }

  const handleFilesChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const arr = Array.from(e.target.files)
      setSelectedFiles(prev => [...prev, ...arr])
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (status === "running") return
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const arr = Array.from(e.dataTransfer.files)
      setSelectedFiles(prev => [...prev, ...arr])
    }
  }

  const removeFile = (idx: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== idx))
  }

  const formatEta = (seconds: number) => {
    if (seconds <= 0 || !isFinite(seconds)) return "0s"
    if (seconds < 60) return `${Math.round(seconds)}s`
    const m = Math.floor(seconds / 60)
    const s = Math.round(seconds % 60)
    return `${m}m ${s}s`
  }

  // =========================================================================
  // EJECUCIÓN: SUBIR NUEVOS ARCHIVOS (Local + NAS dual)
  // =========================================================================
  const startUpload = async () => {
    if (selectedFiles.length === 0) return

    setStatus("running")
    setProgressPercent(0)
    setLogs([])

    const totalFiles = selectedFiles.length
    const totalBytes = selectedFiles.reduce((acc, f) => acc + f.size, 0)
    const totalMb = Number((totalBytes / (1024 * 1024)).toFixed(1))

    addLog("info", `🚀 ${t.tabUploadNewFiles}: ${totalFiles} ${t.filesCountStr} (${totalMb} MB) ➔ ${targetFolder}`)
    if (replicateNas) {
      addLog("info", `📡 ${t.replicaNasActivated}: ${nasStatus?.host || "192.168.11.1"}`)
    } else {
      addLog("warn", `⚠️ ${t.localOnly}`)
    }

    let bytesTransferred = 0
    let localSuccess = 0
    let nasSuccess = 0
    const startTime = Date.now()

    for (let i = 0; i < totalFiles; i++) {
      const file = selectedFiles[i]
      const fileMb = (file.size / (1024 * 1024)).toFixed(1)

      setCurrentFileText(`[${i + 1}/${totalFiles}] ${file.name} (${fileMb} MB)...`)
      addLog("info", `[${i + 1}/${totalFiles}] ${file.name}...`)

      const formData = new FormData()
      formData.append("sessionId", sessionId)
      formData.append("folderName", folderName)
      formData.append("targetSubfolder", targetFolder)
      formData.append("replicateNas", String(replicateNas))
      formData.append("file", file)
      formData.append("lang", language)

      try {
        const data = await new Promise<any>((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhr.open("POST", "/api/media/upload-master-file")
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const currentTotal = bytesTransferred + e.loaded
              const pct = Math.min(99, Math.round((currentTotal / totalBytes) * 100))
              setProgressPercent(pct)

              const elapsedSec = (Date.now() - startTime) / 1000
              if (elapsedSec > 0.3) {
                const speedMBps = (currentTotal / (1024 * 1024)) / elapsedSec
                const remainingBytes = Math.max(0, totalBytes - currentTotal)
                const etaSec = remainingBytes / (speedMBps * 1024 * 1024)
                const doneMB = (currentTotal / (1024 * 1024)).toFixed(1)
                setSpeedText(`${doneMB} / ${totalMb} MB · ${speedMBps.toFixed(1)} MB/s · ${formatEta(etaSec)}`)
              }
            }
          }
          xhr.onload = () => {
            try {
              resolve(JSON.parse(xhr.responseText))
            } catch {
              reject(new Error("Respuesta inválida del servidor"))
            }
          }
          xhr.onerror = () => reject(new Error("Error de conexión al subir"))
          xhr.send(formData)
        })

        if (data.logs && Array.isArray(data.logs)) {
          data.logs.forEach((l: any) => addLog(l.level, l.msg))
        }

        if (data.success) {
          localSuccess++
          if (data.nasReplicated) nasSuccess++
        } else {
          addLog("error", `Error: ${file.name} - ${data.error}`)
        }
      } catch (err: any) {
        addLog("error", `Network Error: ${file.name} - ${err.message}`)
      }

      bytesTransferred += file.size
      const percent = Math.round((bytesTransferred / totalBytes) * 100)
      setProgressPercent(percent)
    }

    setStats({
      total: totalFiles,
      local: localSuccess,
      nas: nasSuccess,
      sizeMb: totalMb,
    })

    addLog("success", `🏁 ${t.transferSuccessTitle}: ${localSuccess} Local SSD, ${nasSuccess} NAS FTP.`)
    setStatus("completed")
    setCurrentFileText(t.transferSuccessTitle)
    setSpeedText("")
    if (onSuccess) onSuccess()
  }

  // =========================================================================
  // EJECUCIÓN: SINCRONIZAR CARPETA LOCAL YA EXISTENTE CON EL NAS
  // =========================================================================
  const startNasSync = async () => {
    setStatus("running")
    setProgressPercent(0)
    setLogs([])
    setCurrentFileText(`${t.verifyingNas} (Router ZTE)...`)
    setSpeedText("")

    addLog("info", `📡 ${t.tabSyncLocalToNas}: ${targetFolder} ➔ NAS FTP...`)

    try {
      const res = await fetch("/api/media/sync-local-nas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          folderName,
          targetSubfolder: targetFolder,
          lang: language,
        }),
      })

      if (!res.body) throw new Error("No readable stream received")
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const data = JSON.parse(line)
            if (data.type === "log") {
              addLog(data.level, data.msg)
            } else if (data.type === "progress") {
              setCurrentFileText(`[${data.currentIndex}/${data.totalFiles}] ${data.fileName}...`)
              const pct = Math.round((data.currentIndex / data.totalFiles) * 100)
              setProgressPercent(pct)
            } else if (data.type === "completed") {
              setProgressPercent(100)
              setStatus("completed")
              setCurrentFileText(t.transferSuccessTitle)
              setStats({
                total: data.totalFiles,
                local: data.totalFiles,
                nas: data.copiedCount,
                sizeMb: data.totalMb || 0,
              })
              if (onSuccess) onSuccess()
            } else if (data.type === "error") {
              setStatus("error")
              addLog("error", data.error)
            }
          } catch {}
        }
      }
    } catch (e: any) {
      setStatus("error")
      addLog("error", `Error: ${e.message}`)
    }
  }

  return (
    <>
      {triggerButton ? (
        <span onClick={() => setOpen(true)} className="cursor-pointer inline-flex">
          {triggerButton}
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#c69f68] to-[#b38952] text-black font-semibold text-xs shadow-lg hover:brightness-110 active:scale-95 transition-all"
        >
          <FolderSync className="w-4 h-4" />
          <span>{t.uploadMasterDualNas}</span>
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent 
          className={cn(
            "sm:max-w-2xl md:max-w-3xl lg:max-w-4xl w-[95vw] bg-[#0c0b09] border border-[#c69f68]/30 text-[#f5f2eb] p-0 overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] rounded-3xl backdrop-blur-xl ring-1 ring-[#c69f68]/15",
            isRtl && "text-right"
          )}
        >
          {/* Cabecera Luxury */}
          <div className="p-6 bg-gradient-to-b from-[#1c1813] via-[#14120e] to-[#0c0b09] border-b border-[#c69f68]/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#c69f68]/25 to-[#c69f68]/5 border border-[#c69f68]/40 flex items-center justify-center text-[#c69f68] shadow-inner shrink-0">
                <Sparkles className="w-5 h-5 text-[#c69f68]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <DialogTitle className="text-base font-bold text-[#f5f2eb]">
                    {t.masterDeliveryManagerTitle}
                  </DialogTitle>
                  <span className="text-[10px] font-mono tracking-wide px-2.5 py-0.5 rounded-full bg-[#c69f68]/20 text-[#c69f68] border border-[#c69f68]/35 font-semibold shrink-0">
                    {t.ingestStyleBadge}
                  </span>
                </div>
                <p className="text-xs text-[#a89f91] mt-1 leading-relaxed">
                  {t.masterDeliveryManagerSubtitle}
                </p>
              </div>
            </div>

            {/* Badge Estado NAS */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[#14120e] border border-[#2a2620] text-xs font-mono shrink-0">
              {isCheckingNas ? (
                <span className="text-[#a89f91] flex items-center gap-1.5 text-[11px]">
                  <RefreshCw className="w-3 h-3 animate-spin text-[#c69f68]" /> {t.verifyingNas}
                </span>
              ) : nasStatus?.online ? (
                <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 border-emerald-500/30 px-2.5 py-1 rounded-xl border text-[11px] font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <Wifi className="w-3.5 h-3.5" />
                  <span>{t.nasOnline} ({nasStatus.latencyMs}ms)</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-400 bg-amber-500/10 border-amber-500/30 px-2.5 py-1 rounded-xl border text-[11px]">
                  <WifiOff className="w-3.5 h-3.5" />
                  <span>{t.nasOfflineLocalOnly}</span>
                </div>
              )}
              <button 
                onClick={checkNas} 
                title={t.recheckNasTooltip}
                className="p-1 hover:text-[#c69f68] text-[#70665a] transition-colors rounded-lg hover:bg-[#1f1c18]"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Segmented Tabs Elegantes */}
          <div className="px-6 pt-3.5 pb-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1 rounded-2xl bg-[#14120e] border border-[#262420]">
              <button
                disabled={status === "running"}
                onClick={() => setActiveTab("upload")}
                className={cn(
                  "flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-medium transition-all cursor-pointer",
                  activeTab === "upload" 
                    ? "bg-gradient-to-r from-[#c69f68]/20 to-[#c69f68]/10 text-[#f5f2eb] border border-[#c69f68]/40 shadow-sm font-semibold" 
                    : "text-[#8c7a6b] hover:text-[#f5f2eb] hover:bg-[#1a1814]"
                )}
              >
                <UploadCloud className="w-4 h-4 text-[#c69f68] shrink-0" />
                <span className="truncate">{t.tabUploadNewFiles}</span>
              </button>
              <button
                disabled={status === "running"}
                onClick={() => setActiveTab("sync_nas")}
                className={cn(
                  "flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-medium transition-all cursor-pointer",
                  activeTab === "sync_nas" 
                    ? "bg-gradient-to-r from-[#c69f68]/20 to-[#c69f68]/10 text-[#f5f2eb] border border-[#c69f68]/40 shadow-sm font-semibold" 
                    : "text-[#8c7a6b] hover:text-[#f5f2eb] hover:bg-[#1a1814]"
                )}
              >
                <FolderSync className="w-4 h-4 text-[#c69f68] shrink-0" />
                <span className="truncate">{t.tabSyncLocalToNas}</span>
              </button>
            </div>
          </div>

          {/* Contenido Principal */}
          <div className="p-6 pt-3 space-y-4 max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-[#262420] scrollbar-track-transparent">
            {/* Destino Fijo: 03_Édition_Master */}
            <div className="p-3.5 rounded-2xl border border-[#c69f68]/40 bg-[#c69f68]/10 flex items-center justify-between gap-3 shadow-[0_0_20px_rgba(198,159,104,0.08)]">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-xl bg-[#c69f68]/20 border border-[#c69f68]/40 flex items-center justify-center text-[#c69f68] shrink-0">
                  <Camera className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-[#f5f2eb] font-mono">03_Édition_Master</p>
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#c69f68]/25 text-[#f5f2eb] border border-[#c69f68]/30 font-semibold">
                      Master Archive
                    </span>
                  </div>
                  <p className="text-[11px] text-[#d1c7b7] mt-0.5 leading-snug">
                    {t.folderMasterDesc}
                  </p>
                </div>
              </div>
              <div className="w-5 h-5 rounded-full border border-[#c69f68] bg-[#c69f68] text-black shrink-0 flex items-center justify-center">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            </div>

            {/* TAB 1: SUBIR NUEVOS ARCHIVOS */}
            {activeTab === "upload" && status !== "running" && status !== "completed" && (
              <div className="space-y-4">
                {/* Opciones de réplica Dual */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#14120e] border border-[#262420]">
                  <div className="flex items-center gap-2.5 text-xs text-[#d1c7b7]">
                    <div className="w-7 h-7 rounded-lg bg-[#c69f68]/10 flex items-center justify-center text-[#c69f68] shrink-0">
                      <HardDrive className="w-3.5 h-3.5" />
                    </div>
                    <span>{t.dualCopyLabel}</span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium self-end sm:self-auto">
                    <input
                      type="checkbox"
                      checked={replicateNas}
                      disabled={!nasStatus?.online}
                      onChange={(e) => setReplicateNas(e.target.checked)}
                      className="accent-[#c69f68] w-4 h-4 rounded cursor-pointer"
                    />
                    <span className={replicateNas ? "text-[#c69f68] font-semibold" : "text-[#8c7a6b]"}>
                      {replicateNas ? t.replicaNasActivated : t.localOnly}
                    </span>
                  </label>
                </div>

                {/* Dropzone Interactiva con Drag and Drop */}
                <div 
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={cn(
                    "border-2 border-dashed rounded-3xl p-7 text-center transition-all flex flex-col items-center justify-center gap-3.5 relative",
                    isDragging 
                      ? "border-[#c69f68] bg-[#c69f68]/15 scale-[1.01]" 
                      : "border-[#c69f68]/30 hover:border-[#c69f68]/60 bg-[#14120e]/60"
                  )}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*,.nef,.cr2,.cr3,.arw,.dng"
                    onChange={handleFilesChosen}
                    className="hidden"
                  />
                  <input
                    ref={folderInputRef}
                    type="file"
                    // @ts-ignore
                    webkitdirectory=""
                    directory=""
                    onChange={handleFilesChosen}
                    className="hidden"
                  />

                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#c69f68]/20 to-[#c69f68]/5 border border-[#c69f68]/30 flex items-center justify-center text-[#c69f68] shadow-inner">
                    <UploadCloud className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#f5f2eb]">
                      {t.selectEditedMediaTitle}
                    </p>
                    <p className="text-xs text-[#a89f91] mt-1 max-w-md mx-auto">
                      {t.supportedFormatsDesc}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 mt-1 flex-wrap justify-center">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#c69f68]/30 to-[#c69f68]/15 border border-[#c69f68]/50 text-[#f5f2eb] hover:brightness-110 text-xs font-semibold transition-all cursor-pointer shadow-sm"
                    >
                      {t.selectFilesBtn}
                    </button>
                    <button
                      type="button"
                      onClick={() => folderInputRef.current?.click()}
                      className="px-4 py-2 rounded-xl bg-[#201d18] border border-[#3b3730] text-[#a89f91] hover:text-[#f5f2eb] hover:bg-[#2b2721] text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-[#c69f68]" />
                      <span>{t.selectFolderBtn}</span>
                    </button>
                  </div>
                </div>

                {/* Lista de archivos seleccionados */}
                {selectedFiles.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs text-[#a89f91] px-1">
                      <span className="font-medium text-[#f5f2eb]">
                        {selectedFiles.length} {t.selectedFilesCount} · {(selectedFiles.reduce((a,b)=>a+b.size,0)/(1024*1024)).toFixed(1)} MB
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedFiles([])}
                        className="text-red-400 hover:text-red-300 hover:underline text-[11px] cursor-pointer"
                      >
                        {t.clearList}
                      </button>
                    </div>

                    <div className="max-h-44 overflow-y-auto space-y-1.5 p-2.5 rounded-2xl bg-[#14120e] border border-[#262420] scrollbar-thin scrollbar-thumb-[#262420]">
                      {selectedFiles.map((f, idx) => {
                        const isVideo = f.type.startsWith("video/") || f.name.match(/\.(mp4|mov|avi|mkv)$/i)
                        return (
                          <div key={idx} className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-[#1b1916] text-xs border border-[#262420]/50 hover:border-[#c69f68]/20 transition-colors">
                            <div className="flex items-center gap-2 truncate max-w-[440px]">
                              {isVideo ? (
                                <Film className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                              ) : (
                                <Camera className="w-3.5 h-3.5 text-[#c69f68] shrink-0" />
                              )}
                              <span className="truncate text-[#f5f2eb] font-mono text-[11px]">{f.name}</span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-[11px] text-[#a89f91] font-mono">
                                {(f.size / (1024 * 1024)).toFixed(1)} MB
                              </span>
                              <button 
                                type="button"
                                onClick={() => removeFile(idx)} 
                                className="text-[#70665a] hover:text-red-400 p-0.5 rounded transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Botón Lanzar Subida Dual */}
                    <button
                      type="button"
                      onClick={startUpload}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#c69f68] via-[#dfba85] to-[#b38952] text-black font-bold text-xs shadow-lg shadow-[#c69f68]/10 hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer font-serif tracking-wide"
                    >
                      <Play className="w-4 h-4 fill-black" />
                      <span>{t.startDualUploadBtn} ({selectedFiles.length} {t.filesCountStr} · {(selectedFiles.reduce((a,b)=>a+b.size,0)/(1024*1024)).toFixed(0)} MB)</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: SINCRONIZAR CARPETA LOCAL EXISTENTE CON EL NAS */}
            {activeTab === "sync_nas" && status !== "running" && status !== "completed" && (
              <div className="space-y-4 p-5 rounded-2xl bg-[#14120e] border border-[#262420]">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#c69f68]/15 border border-[#c69f68]/30 flex items-center justify-center text-[#c69f68] shrink-0 mt-0.5">
                    <FolderSync className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[#f5f2eb]">
                      {t.syncLocalEditedTitle}
                    </h4>
                    <p className="text-xs text-[#a89f91] mt-1 leading-relaxed">
                      {t.syncLocalEditedDesc}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#1a1815] border border-[#262420] text-xs space-y-2 font-mono">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]">
                    <span className="text-[#a89f91] font-sans font-medium">{t.localSourceLabel}</span>
                    <span className="text-[#f5f2eb] bg-[#0f0e0c] px-2 py-0.5 rounded border border-[#262420] break-all">
                      C:\Lamha-Storage\{folderName}\{targetFolder}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]">
                    <span className="text-[#a89f91] font-sans font-medium">{t.nasDestLabel}</span>
                    <span className="text-[#c69f68] bg-[#0f0e0c] px-2 py-0.5 rounded border border-[#262420] break-all">
                      {nasStatus?.host || "192.168.11.1"}:/usb1_1/Lamha-Storage/{folderName}/{targetFolder}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!nasStatus?.online}
                  onClick={startNasSync}
                  className={cn(
                    "w-full py-3.5 rounded-2xl font-bold text-xs shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer font-serif tracking-wide",
                    nasStatus?.online
                      ? "bg-gradient-to-r from-[#c69f68] via-[#dfba85] to-[#b38952] text-black hover:brightness-110 active:scale-[0.99]"
                      : "bg-[#262420] text-[#a89f91] cursor-not-allowed"
                  )}
                >
                  <FolderSync className="w-4 h-4" />
                  <span>
                    {nasStatus?.online 
                      ? `${t.scanAndReplicateBtn}: ${targetFolder}` 
                      : t.nasNotAccessible}
                  </span>
                </button>
              </div>
            )}

            {/* TELEMETRÍA Y BARRA DE PROGRESO */}
            {(status === "running" || status === "completed") && (
              <div className="space-y-4">
                {/* Barra de progreso */}
                <div className="space-y-2 p-4 rounded-2xl bg-[#14120e] border border-[#262420]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#f5f2eb] truncate max-w-[480px]">
                      {currentFileText}
                    </span>
                    <span className="font-mono text-[#c69f68] font-bold text-sm">{progressPercent}%</span>
                  </div>
                  <div className="h-2.5 w-full bg-[#0a0908] rounded-full overflow-hidden border border-[#262420]">
                    <div
                      className="h-full bg-gradient-to-r from-[#b38952] to-[#c69f68] transition-all duration-300 rounded-full"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  {speedText && (
                    <p className="text-[11px] font-mono text-[#a89f91] text-right">{speedText}</p>
                  )}
                </div>

                {/* TERMINAL DE LOGS EN VIVO */}
                <div className="rounded-2xl bg-[#080706] border border-[#262420] overflow-hidden shadow-inner font-mono text-xs">
                  <div className="px-4 py-2.5 bg-[#12110f] border-b border-[#262420] flex items-center justify-between text-[11px] text-[#a89f91]">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-3.5 h-3.5 text-[#c69f68]" />
                      <span className="font-sans font-semibold text-[#f5f2eb]">{t.liveConsoleLogs}</span>
                    </div>
                    <span>{logs.length} {t.eventsCount}</span>
                  </div>
                  <div className="p-3.5 max-h-52 overflow-y-auto space-y-1.5 text-[11px] scrollbar-thin scrollbar-thumb-[#262420]">
                    {logs.map((log, i) => (
                      <div key={i} className="flex items-start gap-2 leading-relaxed">
                        <span className="text-[#5a544b] shrink-0">[{log.time}]</span>
                        <span
                          className={cn(
                            log.level === "success" && "text-emerald-400 font-medium",
                            log.level === "info" && "text-[#d1c7b7]",
                            log.level === "warn" && "text-amber-400",
                            log.level === "error" && "text-red-400 font-semibold"
                          )}
                        >
                          {log.msg}
                        </span>
                      </div>
                    ))}
                    <div ref={terminalEndRef} />
                  </div>
                </div>

                {/* ESTADO FINAL COMPLETADO */}
                {status === "completed" && (
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-[#f5f2eb]">{t.transferSuccessTitle}</p>
                        <p className="text-[11px] text-[#a89f91] mt-0.5">
                          {stats.total} {t.transferSuccessDesc}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#c69f68] to-[#b38952] text-black text-xs font-bold hover:brightness-110 transition-all cursor-pointer font-serif shrink-0"
                    >
                      {t.acceptAndClose}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
