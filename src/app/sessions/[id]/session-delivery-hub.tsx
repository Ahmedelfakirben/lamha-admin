"use client"

import { useState, useEffect } from "react"
import { 
  Cloud, 
  HardDrive, 
  UploadCloud, 
  ExternalLink, 
  Copy, 
  Check, 
  Trash2, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  FolderOpen,
  ArrowRight,
  ShieldCheck
} from "lucide-react"
import { createClient } from "@/lib/supabase"
import { MasterDeliveryUploadModal } from "@/components/master-delivery-upload-modal"
import { useUpload } from "@/context/upload-context"
import { useLanguage } from "@/context/language-context"

interface SessionDeliveryHubProps {
  session: any
  projectFolder?: string
  onDeliveryUpdated?: () => void
}

export function SessionDeliveryHub({ session, projectFolder, onDeliveryUpdated }: SessionDeliveryHubProps) {
  const [loading, setLoading] = useState(true)
  const [deliveries, setDeliveries] = useState<any[]>([])
  const [storageMode, setStorageMode] = useState<"cloud" | "nas" | "auto">("auto")
  const [effectiveMode, setEffectiveMode] = useState<"cloud" | "nas">("cloud")
  const [isNasOnline, setIsNasOnline] = useState(false)
  const [hasGDrive, setHasGDrive] = useState(false)
  const [retentionDays, setRetentionDays] = useState(30)
  

  
  // Status message
  const [copiedLink, setCopiedLink] = useState(false)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  const { uploadState, startSyncNasToGdrive } = useUpload()
  const { t } = useLanguage()

  const fName = projectFolder || session.tags?.[0] || session.client_name

  const loadData = async () => {
    try {
      const supabase = createClient()
      
      // 1. Cargar entregas de esta sesión
      const { data: dData } = await supabase
        .from("media_deliveries")
        .select("*")
        .eq("session_id", session.id)
        .order("created_at", { ascending: false })
      
      setDeliveries(dData || [])

      // 2. Cargar ajustes de entregas y estado de NAS
      const res = await fetch("/api/deliveries/settings")
      const sData = await res.json()
      if (sData.success) {
        setStorageMode(sData.settings.storage_mode || "auto")
        setEffectiveMode(sData.effectiveMode || "cloud")
        setIsNasOnline(sData.isNasOnline)
        setHasGDrive(sData.settings.has_gdrive_credentials)
        setRetentionDays(sData.settings.default_retention_days || 30)
      }
    } catch (err) {
      console.error("Error cargando entregas:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [session.id])

  const showMsg = (msg: string) => {
    setActionMessage(msg)
    setTimeout(() => setActionMessage(null), 5000)
  }

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }



  const handleSyncNas = async () => {
    await startSyncNasToGdrive({
      sessionId: session.id,
      folderName: fName,
      clientName: session.client_name,
      retentionDays
    }, async () => {
      showMsg(t.driveSyncSuccessMsg)
      await loadData()
      if (onDeliveryUpdated) onDeliveryUpdated()
    })
  }

  const activeFinalDelivery = deliveries.find(d => d.delivery_type === "final_link" && d.is_active)

  return (
    <div className="space-y-6">
      {actionMessage && (
        <div className="p-3.5 rounded-xl bg-[#c69f68]/15 border border-[#c69f68]/40 text-[#f5f2eb] text-xs font-medium flex items-center justify-between shadow-lg">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-[#8c7a6b] hover:text-[#f5f2eb]">✕</button>
        </div>
      )}

      {/* Entrega Activa Actual */}
      {activeFinalDelivery ? (
        <div className="rounded-2xl border border-[#c69f68]/40 bg-gradient-to-br from-[#181511] via-[#141210] to-[#1a1713] p-6 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#26211c]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-[#f5f2eb] font-serif">
                    {t.finalDeliveryPublished}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold font-mono">
                    {t.deliveryActiveBadge}
                  </span>
                </div>
                <p className="text-xs text-[#8c7a6b]">
                  {activeFinalDelivery.label || t.driveHighResAlbum}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => copyToClipboard(activeFinalDelivery.url)}
                className="px-3 py-1.5 rounded-lg border border-[#3a332a] bg-[#181613] hover:bg-[#221e19] text-xs font-medium text-[#f5f2eb] flex items-center gap-1.5 transition-colors"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#c69f68]" />}
                <span>{copiedLink ? t.copied : t.copyLink}</span>
              </button>

              <a
                href={activeFinalDelivery.url}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-1.5 rounded-lg bg-[#c69f68] hover:bg-[#b58f58] text-[#12100d] text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{t.openInDrive}</span>
              </a>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-4 text-xs">
            <div className="p-3 rounded-xl bg-[#12100e] border border-[#26211c] space-y-1">
              <span className="text-[#70665a] uppercase tracking-wider text-[10px] block font-semibold">{t.deliveryModeLabel}</span>
              <span className="text-[#f5f2eb] font-medium flex items-center gap-1.5">
                {activeFinalDelivery.delivery_mode === "nas_sync" ? (
                  <>
                    <HardDrive className="w-3.5 h-3.5 text-purple-400" />
                    {t.syncedFromNas}
                  </>
                ) : (
                  <>
                    <Cloud className="w-3.5 h-3.5 text-sky-400" />
                    {t.directCloudWeb}
                  </>
                )}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#12100e] border border-[#26211c] space-y-1">
              <span className="text-[#70665a] uppercase tracking-wider text-[10px] block font-semibold">{t.filesAndWeight}</span>
              <span className="text-[#f5f2eb] font-medium font-mono">
                {activeFinalDelivery.total_files || "?"} {t.filesCountStr} · {activeFinalDelivery.total_size_mb || "?"} MB
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#12100e] border border-[#26211c] space-y-1">
              <span className="text-[#70665a] uppercase tracking-wider text-[10px] block font-semibold">{t.deliveryDateLabel}</span>
              <span className="text-[#f5f2eb] font-medium">
                {activeFinalDelivery.delivered_at ? new Date(activeFinalDelivery.delivered_at).toLocaleDateString() : t.todayWord}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#12100e] border border-[#26211c] space-y-1">
              <span className="text-[#70665a] uppercase tracking-wider text-[10px] block font-semibold">{t.cloudExpirationLabel}</span>
              <span className="text-amber-400 font-medium flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400" />
                {activeFinalDelivery.expires_at ? new Date(activeFinalDelivery.expires_at).toLocaleDateString() : t.noDateWord}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-950/10 text-amber-300 text-xs flex items-center gap-3">
          <Clock className="w-4 h-4 shrink-0 text-amber-400" />
          <span>{t.noDriveDeliveryYet}</span>
        </div>
      )}

      {/* Panel Lanzador de Nueva Entrega (SIMPLIFICADO) */}
      <div className="rounded-2xl border border-[#26211c] bg-[#141210] p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-[#f5f2eb] font-serif uppercase tracking-wider flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-[#c69f68]" />
            {t.syncAlbumToDrive}
          </h3>
          <p className="text-xs text-[#8c7a6b] mt-1.5">
            {t.transferPhotosFrom} <span className="text-[#c69f68] font-mono bg-[#1a1714] px-1.5 py-0.5 rounded">{fName}/03_Edicion_Master</span>
          </p>
        </div>

        <button
          type="button"
          onClick={handleSyncNas}
          disabled={uploadState.isRunning}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#c69f68] via-[#dfba85] to-[#c69f68] hover:opacity-95 text-[#0b0a09] font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-40 cursor-pointer shadow-lg shadow-[#c69f68]/20 whitespace-nowrap"
        >
          <HardDrive className="w-4 h-4" />
          <span>{uploadState.isRunning ? t.syncInProgress : t.syncToDriveBtn}</span>
        </button>
      </div>
    </div>
  )
}
