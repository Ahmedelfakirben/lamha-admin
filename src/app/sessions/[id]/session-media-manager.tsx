"use client"

import { useState, useTransition, useMemo, useEffect } from "react"
import { 
  Camera, 
  Film, 
  Sparkles, 
  Eye, 
  EyeOff, 
  FolderOpen, 
  ExternalLink, 
  Trash2, 
  Check, 
  Search, 
  Play, 
  FileCode, 
  Share2, 
  HardDrive,
  Copy,
  PenTool,
  Clapperboard,
  RefreshCw,
  UploadCloud,
  MessageSquare,
  Cloud
} from "lucide-react"
import { MasterDeliveryUploadModal } from "@/components/master-delivery-upload-modal"
import { MontageDriveSyncModal } from "@/components/montage-drive-sync-modal"
import { toggleAssetSharedAction, bulkSetAssetsSharedAction, deleteAssetAction } from "@/app/actions"
import { useLanguage } from "@/context/language-context"
import { createClient } from "@/lib/supabase"
import { SessionDeliveryHub } from "./session-delivery-hub"

interface MediaAsset {
  id: string
  session_id: string | null
  asset_type: string
  filename: string | null
  nas_path: string
  size_mb: number | null
  preview_url: string | null
  is_shared?: boolean
  client_selected?: boolean
  client_notes?: string | null
  notes?: string | null
}

interface SessionMediaManagerProps {
  session: any
  initialAssets?: MediaAsset[]
  projectFolder?: string
}

function SafeImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [hasError, setHasError] = useState(false)
  
  if (hasError || !src || src.toLowerCase().endsWith(".nef") || src.toLowerCase().endsWith(".cr2")) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center text-[#554c42] bg-[#090807] w-full h-full">
        <Camera className="w-10 h-10 mb-2 opacity-30" />
        <span className="text-[9px] uppercase font-mono tracking-widest opacity-50 text-[#8c7a6b]">RAW No Preview</span>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={className}
      onError={() => setHasError(true)}
    />
  )
}

export function SessionMediaManager({ session, initialAssets = [], projectFolder }: SessionMediaManagerProps) {
  const { t } = useLanguage()
  const [assets, setAssets] = useState<MediaAsset[]>(initialAssets || [])
  const [activeTab, setActiveTab] = useState<"photos" | "videos" | "master" | "selected" | "shared" | "delivery">("photos")
  const [masterSubFilter, setMasterSubFilter] = useState<"all" | "photos" | "videos">("all")
  const [isSyncingMaster, setIsSyncingMaster] = useState(false)
  const [isUploadingMaster, setIsUploadingMaster] = useState(false)
  const [search, setSearch] = useState("")
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()

  // IDs o nombres de archivos seleccionados por el cliente en el portal
  const [selectedAssetKeys, setSelectedAssetKeys] = useState<string[]>(session.selected_assets || [])
  const fName = projectFolder || session.tags?.[0] || session.client_name

  // Sincronización reactiva con Supabase
  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const supabase = createClient()
        const { data: sData } = await supabase
          .from("sessions")
          .select("selected_assets")
          .eq("id", session.id)
          .single()
        if (sData?.selected_assets && Array.isArray(sData.selected_assets)) {
          setSelectedAssetKeys(sData.selected_assets)
        }

        const { data: aData } = await supabase
          .from("media_assets")
          .select("id, client_selected, client_notes")
          .eq("session_id", session.id)
        if (aData && aData.length > 0) {
          setAssets(prev => prev.map(a => {
            const found = aData.find(d => d.id === a.id)
            if (found) {
              return { ...a, client_selected: found.client_selected, client_notes: found.client_notes }
            }
            return a
          }))
        }
      } catch (err) {}
    }

    fetchLatest()
    const interval = setInterval(fetchLatest, 4000)
    return () => clearInterval(interval)
  }, [session.id, activeTab])

  const isAssetSelected = (a: MediaAsset) => {
    if (a.client_selected) return true
    if (selectedAssetKeys.includes(a.id)) return true
    if (a.filename && selectedAssetKeys.includes(a.filename)) return true
    return false
  }

  const safeAssets = useMemo(() => Array.isArray(assets) ? assets : [], [assets])

  // 1. Archivos en 03_Édition_Master (Fotos y Videos después del montaje)
  const masterAssets = useMemo(() => {
    return safeAssets.filter(a => {
      const p = (a.nas_path || "").toLowerCase()
      const n = (a.notes || "").toLowerCase()
      return (
        p.includes("03_edicion_master") ||
        p.includes("03_édition_master") ||
        p.includes("03_edition_master") ||
        p.includes("03_master") ||
        n.includes("03_édition_master") ||
        n.includes("03_edicion_master") ||
        a.asset_type === "video_final"
      )
    })
  }, [safeAssets])

  const masterPhotos = useMemo(() => {
    return masterAssets.filter(a => a.asset_type === "jpg" || a.asset_type === "raw_photo" || !a.asset_type.includes("video"))
  }, [masterAssets])

  const masterVideos = useMemo(() => {
    return masterAssets.filter(a => a.asset_type.includes("video"))
  }, [masterAssets])

  // 2. Fotos RAW / JPG originales de cámara (excluyendo las de montaje)
  const photos = useMemo(() => {
    return safeAssets.filter(a => {
      const isMaster = masterAssets.some(m => m.id === a.id)
      if (isMaster) return false
      return a.asset_type === "jpg" || a.asset_type === "raw_photo" || !a.asset_type.includes("video")
    })
  }, [safeAssets, masterAssets])

  // 3. Videos bruts originales de cámara (excluyendo los de montaje)
  const videos = useMemo(() => {
    return safeAssets.filter(a => {
      const isMaster = masterAssets.some(m => m.id === a.id)
      if (isMaster) return false
      return a.asset_type === "raw_video" || a.asset_type === "reel" || a.asset_type.includes("video")
    })
  }, [safeAssets, masterAssets])

  // 4. Selección del cliente
  const selectedByClient = useMemo(() => {
    return safeAssets.filter(isAssetSelected)
  }, [safeAssets, selectedAssetKeys])

  const selectedWithNotes = useMemo(() => {
    return selectedByClient.filter(a => a.client_notes && a.client_notes.trim().length > 0)
  }, [selectedByClient])

  // 5. Compartidos con el cliente
  const sharedWithClient = useMemo(() => {
    return safeAssets.filter(a => a.is_shared)
  }, [safeAssets])

  const currentList = useMemo(() => {
    let list: MediaAsset[] = []
    if (activeTab === "photos") list = photos
    else if (activeTab === "videos") list = videos
    else if (activeTab === "master") {
      if (masterSubFilter === "photos") list = masterPhotos
      else if (masterSubFilter === "videos") list = masterVideos
      else list = masterAssets
    }
    else if (activeTab === "selected") list = selectedByClient
    else list = sharedWithClient

    if (search.trim()) {
      const q = search.toLowerCase()
      return list.filter(a => (a.filename && a.filename.toLowerCase().includes(q)) || (a.client_notes && a.client_notes.toLowerCase().includes(q)))
    }
    return list
  }, [activeTab, photos, videos, masterAssets, masterPhotos, masterVideos, masterSubFilter, selectedByClient, sharedWithClient, search])

  const showNotification = (msg: string) => {
    setActionMessage(msg)
    setTimeout(() => setActionMessage(null), 4000)
  }

  // Sincronizar carpeta física 03_Edicion_Master
  const handleSyncMaster = async () => {
    const fName = projectFolder || session.tags?.[0] || session.client_name
    setIsSyncingMaster(true)
    try {
      showNotification("Sincronizando carpeta 03_Édition_Master y subiendo WebP a Supabase...")
      const res = await fetch("/api/media/sync-master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          folderName: fName,
        })
      })
      const data = await res.json()
      if (data.success) {
        showNotification(data.message)
        if (data.assets && data.assets.length > 0) {
          setAssets(prev => {
            const map = new Map(prev.map(a => [a.id, a]))
            for (const item of data.assets) {
              map.set(item.id, item)
            }
            return Array.from(map.values())
          })
        }
      } else {
        showNotification(`Aviso: ${data.error || "No se pudo sincronizar"}`)
      }
    } catch (e: any) {
      showNotification(`Error: ${e.message}`)
    } finally {
      setIsSyncingMaster(false)
    }
  }

  // Subir archivos directamente a 03_Edicion_Master
  const handleUploadMaster = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const fName = projectFolder || session.tags?.[0] || session.client_name

    setIsUploadingMaster(true)
    const totalFiles = files.length
    const BATCH_SIZE = 10
    let allNewAssets: any[] = []

    try {
      showNotification(`Iniciando subida de ${totalFiles} archivos a 03_Édition_Master...`)

      for (let i = 0; i < totalFiles; i += BATCH_SIZE) {
        const chunk = Array.from(files).slice(i, i + BATCH_SIZE)
        const currentBatchEnd = Math.min(i + BATCH_SIZE, totalFiles)
        showNotification(`Subiendo a 03_Édition_Master (${currentBatchEnd} / ${totalFiles})...`)

        const formData = new FormData()
        formData.append("sessionId", session.id)
        formData.append("folderName", fName)
        for (const f of chunk) {
          formData.append("files", f)
        }

        const res = await fetch("/api/media/upload-master", {
          method: "POST",
          body: formData,
        })
        const data = await res.json()

        if (data.success) {
          if (data.assets && data.assets.length > 0) {
            allNewAssets = [...allNewAssets, ...data.assets]
            setAssets(prev => [...prev, ...data.assets])
          }
        } else {
          throw new Error(data.error || "Error al subir lote")
        }
      }

      showNotification(`¡Éxito! Se han subido y procesado ${totalFiles} archivos en 03_Édition_Master.`)
    } catch (err: any) {
      showNotification(`Error: ${err.message}`)
    } finally {
      setIsUploadingMaster(false)
      e.target.value = ""
    }
  }

  // Toggle compartir individual
  const handleToggleShared = (asset: MediaAsset) => {
    const nextState = !asset.is_shared
    // Optimistic UI update
    setAssets(prev => prev.map(a => a.id === asset.id ? { ...a, is_shared: nextState } : a))

    startTransition(async () => {
      const res = await toggleAssetSharedAction(asset.id, nextState, session.id)
      if (res.success) {
        showNotification(nextState ? `"${asset.filename}" -> ${t.sharedStatus}` : `"${asset.filename}" -> ${t.hiddenStatus}`)
      } else {
        // Rollback
        setAssets(prev => prev.map(a => a.id === asset.id ? { ...a, is_shared: !nextState } : a))
      }
    })
  }

  // Compartir / Dejar de compartir todo el lote actual
  const handleBulkShare = (shouldShare: boolean) => {
    const targetIds = currentList.map(a => a.id)
    if (targetIds.length === 0) return

    setAssets(prev => prev.map(a => targetIds.includes(a.id) ? { ...a, is_shared: shouldShare } : a))

    startTransition(async () => {
      const res = await bulkSetAssetsSharedAction(targetIds, shouldShare, session.id)
      if (res.success) {
        showNotification(shouldShare ? `${targetIds.length} -> ${t.sharedStatus}` : `${targetIds.length} -> ${t.hiddenStatus}`)
      }
    })
  }

  // Abrir archivo con Windows 'Abrir con...' o Mac
  const handleOpenFile = async (nasPath: string, mode: "open_with" | "reveal") => {
    try {
      showNotification(mode === "open_with" ? t.openWithApp : t.revealInFolder)
      const res = await fetch("/api/media/open-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath: nasPath, mode })
      })
      const data = await res.json()
      if (data.success) {
        showNotification(data.message)
      } else {
        showNotification(`Aviso: ${data.error || "No se pudo abrir el archivo"}`)
      }
    } catch (e: any) {
      showNotification(`Error: ${e.message}`)
    }
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification Bar */}
      {actionMessage && (
        <div className="p-3 rounded-xl bg-[#c69f68]/15 border border-[#c69f68]/40 text-[#f5f2eb] text-xs font-medium flex items-center justify-between shadow-lg animate-in fade-in">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-[#8c7a6b] hover:text-[#f5f2eb]">✕</button>
        </div>
      )}

      {/* Main Header & Tab Navigation */}
      <div className="p-2 sm:p-3.5 rounded-2xl bg-[#141210] border border-[#26211c]">
        {/* Reorganized Tab Buttons with Responsive Scrollable Ribbon on Mobile */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 no-scrollbar sm:flex-wrap">
          {/* 1. Photos */}
          <button
            onClick={() => setActiveTab("photos")}
            className={`shrink-0 whitespace-nowrap px-3 sm:px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "photos"
                ? "bg-gradient-to-r from-[#c69f68] via-[#dfba85] to-[#c69f68] text-[#0b0a09] shadow-md shadow-[#c69f68]/15 border border-[#c69f68] font-bold"
                : "bg-[#161412] text-[#a89f91] hover:text-[#f5f2eb] border border-[#2a2622] hover:border-[#c69f68]/40 hover:bg-[#1f1b17]"
            }`}
          >
            <Camera className="w-3.5 h-3.5 shrink-0" />
            <span>{t.photosTab} ({photos.length})</span>
          </button>

          {/* 2. Vidéos */}
          <button
            onClick={() => setActiveTab("videos")}
            className={`shrink-0 whitespace-nowrap px-3 sm:px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "videos"
                ? "bg-gradient-to-r from-[#c69f68] via-[#dfba85] to-[#c69f68] text-[#0b0a09] shadow-md shadow-[#c69f68]/15 border border-[#c69f68] font-bold"
                : "bg-[#161412] text-[#a89f91] hover:text-[#f5f2eb] border border-[#2a2622] hover:border-[#c69f68]/40 hover:bg-[#1f1b17]"
            }`}
          >
            <Film className="w-3.5 h-3.5 shrink-0" />
            <span>{t.videosTab} ({videos.length})</span>
          </button>

          {/* 3. Montage */}
          <button
            onClick={() => setActiveTab("master")}
            className={`shrink-0 whitespace-nowrap px-3 sm:px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "master"
                ? "bg-gradient-to-r from-[#c69f68] via-[#dfba85] to-[#c69f68] text-[#0b0a09] shadow-md shadow-[#c69f68]/15 border border-[#c69f68] font-bold"
                : "bg-[#161412] text-[#a89f91] hover:text-[#f5f2eb] border border-[#2a2622] hover:border-[#c69f68]/40 hover:bg-[#1f1b17]"
            }`}
          >
            <Clapperboard className="w-3.5 h-3.5 shrink-0" />
            <span>{t.editionMasterTab} ({masterAssets.length})</span>
          </button>

          {/* 4. Partagées */}
          <button
            onClick={() => setActiveTab("shared")}
            className={`shrink-0 whitespace-nowrap px-3 sm:px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "shared"
                ? "bg-gradient-to-r from-[#c69f68] via-[#dfba85] to-[#c69f68] text-[#0b0a09] shadow-md shadow-[#c69f68]/15 border border-[#c69f68] font-bold"
                : "bg-[#161412] text-[#a89f91] hover:text-[#f5f2eb] border border-[#2a2622] hover:border-[#c69f68]/40 hover:bg-[#1f1b17]"
            }`}
          >
            <Share2 className="w-3.5 h-3.5 shrink-0" />
            <span>{t.sharedWithClientTab} ({sharedWithClient.length})</span>
          </button>

          {/* 5. Choix du Client */}
          <button
            onClick={() => setActiveTab("selected")}
            className={`shrink-0 whitespace-nowrap px-3 sm:px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "selected"
                ? "bg-gradient-to-r from-[#c69f68] via-[#dfba85] to-[#c69f68] text-[#0b0a09] shadow-md shadow-[#c69f68]/15 border border-[#c69f68] font-bold"
                : "bg-[#161412] text-[#a89f91] hover:text-[#f5f2eb] border border-[#2a2622] hover:border-[#c69f68]/40 hover:bg-[#1f1b17]"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>{t.clientSelectionTab} ({selectedByClient.length})</span>
            {selectedWithNotes.length > 0 && (
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold shadow-sm ${
                activeTab === "selected" 
                  ? "bg-black/20 text-black border border-black/20" 
                  : "bg-[#c69f68]/20 text-[#c69f68] border border-[#c69f68]/30"
              }`} title={`${selectedWithNotes.length} notes`}>
                <MessageSquare className="w-2.5 h-2.5 fill-current" />
                <span>{selectedWithNotes.length}</span>
              </span>
            )}
          </button>

          {/* 6. Drive */}
          <button
            onClick={() => setActiveTab("delivery")}
            className={`shrink-0 whitespace-nowrap px-3 sm:px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "delivery"
                ? "bg-gradient-to-r from-[#c69f68] via-[#dfba85] to-[#c69f68] text-[#0b0a09] shadow-md shadow-[#c69f68]/15 border border-[#c69f68] font-bold"
                : "bg-[#161412] text-[#a89f91] hover:text-[#f5f2eb] border border-[#2a2622] hover:border-[#c69f68]/40 hover:bg-[#1f1b17]"
            }`}
          >
            <Cloud className="w-3.5 h-3.5 shrink-0" />
            <span>{t.driveTab}</span>
          </button>
        </div>
      </div>

      {/* Édition Master Specific Toolbar */}
      {activeTab === "master" && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-[#171310] via-[#141210] to-[#171310] border border-purple-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-purple-950/70 border border-purple-700/50 text-purple-300 text-[10px] font-mono uppercase tracking-wider font-bold">
                03_Édition_Master
              </span>
              <span className="text-[11px] text-[#8c7a6b] font-mono">
                {masterPhotos.length} {t.filterPhotos.toLowerCase()} · {masterVideos.length} {t.filterVideos.toLowerCase()}
              </span>
            </div>
            <p className="text-xs text-[#a89f91]">
              {t.masterFolderDescription}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Sub-filtros Todo / Fotos / Videos */}
            <div className="flex items-center rounded-xl bg-[#0b0a09] border border-[#26211c] p-1 text-xs">
              <button
                onClick={() => setMasterSubFilter("all")}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  masterSubFilter === "all" ? "bg-[#c69f68] text-[#0b0a09] font-bold" : "text-[#8c7a6b] hover:text-[#f5f2eb]"
                }`}
              >
                {t.filterAll} ({masterAssets.length})
              </button>
              <button
                onClick={() => setMasterSubFilter("photos")}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  masterSubFilter === "photos" ? "bg-[#c69f68] text-[#0b0a09] font-bold" : "text-[#8c7a6b] hover:text-[#f5f2eb]"
                }`}
              >
                {t.filterPhotos} ({masterPhotos.length})
              </button>
              <button
                onClick={() => setMasterSubFilter("videos")}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  masterSubFilter === "videos" ? "bg-[#c69f68] text-[#0b0a09] font-bold" : "text-[#8c7a6b] hover:text-[#f5f2eb]"
                }`}
              >
                {t.filterVideos} ({masterVideos.length})
              </button>
            </div>

            {/* Gestor Dual Estilo Ingesta: Subida y Sincronización NAS */}
            <MasterDeliveryUploadModal
              sessionId={session.id}
              folderName={fName}
              clientName={session.client_name}
              defaultTargetFolder="03_Edicion_Master"
              onSuccess={() => window.location.reload()}
              triggerButton={
                <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#c69f68] to-[#dfba85] hover:opacity-95 text-[#0b0a09] text-xs font-serif font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md">
                  <UploadCloud className="w-4 h-4 text-black" />
                  <span>{t.uploadMasterDualNas}</span>
                </button>
              }
            />

            {/* Exportación y Sincronización a Google Drive desde Montaje */}
            <MontageDriveSyncModal
              sessionId={session.id}
              clientName={session.client_name}
              clientEmail={session.client_email}
              portalPin={session.portal_pin}
              folderName={fName}
              existingDriveUrl={session.gdrive_folder_id ? `https://drive.google.com/drive/folders/${session.gdrive_folder_id}` : null}
              selectedCount={selectedAssetKeys.length}
              onSuccess={() => window.location.reload()}
            />
          </div>
        </div>
      )}

      {/* 7. Vista de Entrega Final a Cliente (Google Drive / NAS) */}
      {activeTab === "delivery" && (
        <SessionDeliveryHub
          session={session}
          projectFolder={projectFolder}
          onDeliveryUpdated={() => window.location.reload()}
        />
      )}

      {/* Filter and Bulk Actions Bar */}
      {activeTab !== "delivery" && (
        <>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#141210] border border-[#26211c]">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#70665a]" />
          <input
            type="text"
            placeholder={t.searchMediaPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-[#0b0a09] border border-[#26211c] text-[#f5f2eb] focus:border-[#c69f68] outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleBulkShare(true)}
            disabled={currentList.length === 0}
            className="px-3 py-1.5 rounded-lg border border-[#c69f68]/40 hover:bg-[#c69f68]/10 text-[#c69f68] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{t.shareBatchBtn}</span>
          </button>

          <button
            onClick={() => handleBulkShare(false)}
            disabled={currentList.length === 0}
            className="px-3 py-1.5 rounded-lg border border-[#26211c] hover:bg-[#201c18] text-[#8c7a6b] hover:text-[#f5f2eb] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <EyeOff className="w-3.5 h-3.5" />
            <span>{t.hideBatchBtn}</span>
          </button>
        </div>
      </div>

      {/* Media Grid */}
      {activeTab === "selected" && selectedByClient.length > 0 && (
        <div className="p-3.5 rounded-xl bg-[#171411] border border-[#2d261e] flex flex-wrap items-center justify-between gap-3 text-xs mb-4">
          <div className="flex items-center gap-2 text-[#e5c38e]">
            <Sparkles className="w-4 h-4 text-[#c69f68]" />
            <span>
              <strong>{selectedByClient.length}</strong> {t.selectedPhotosForBook}
            </span>
            {selectedWithNotes.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-semibold text-[11px] ml-2">
                <MessageSquare className="w-3 h-3 text-amber-400" />
                {selectedWithNotes.length} {t.photosWithRetouchNotes}
              </span>
            )}
          </div>
          <span className="text-[11px] text-[#70665a] italic">
            {t.commentedPhotosHint}
          </span>
        </div>
      )}

      {currentList.length === 0 ? (
        <div className="text-center py-16 text-[#70665a] border-2 border-dashed border-[#26211c] rounded-2xl bg-[#100f0d] p-6">
          <HardDrive className="mx-auto h-12 w-12 text-[#554c42] mb-3" />
          <p className="text-sm font-medium text-[#a89f91]">
            {activeTab === "master" ? t.noMasterFiles : t.noMediaInTab}
          </p>
          <p className="text-xs text-[#70665a] mt-1 max-w-md mx-auto">
            {activeTab === "master"
              ? t.masterInstructions
              : t.useIngestInstruction}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-4">
          {currentList.map((asset, index) => {
            const isClientSelected = isAssetSelected(asset)
            const isVideo = asset.asset_type.includes("video")
            const isMaster = masterAssets.some(m => m.id === asset.id)
            const hasClientNote = Boolean(asset.client_notes && asset.client_notes.trim().length > 0)

            return (
              <div
                key={asset.id}
                className={`group rounded-xl overflow-hidden bg-[#141210] border transition-all duration-300 flex flex-col justify-between ${
                  hasClientNote
                    ? "border-amber-500 shadow-lg shadow-amber-950/40 ring-1 ring-amber-500/80"
                    : isClientSelected 
                    ? "border-[#c69f68] shadow-lg shadow-[#c69f68]/15 ring-1 ring-[#c69f68]/50" 
                    : isMaster
                    ? "border-purple-600/40 hover:border-purple-500 shadow-md shadow-purple-950/20"
                    : asset.is_shared 
                    ? "border-emerald-500/40 hover:border-emerald-500" 
                    : "border-[#26211c] hover:border-[#70665a]"
                }`}
              >
                {/* Media Image / Preview */}
                <div 
                  className="aspect-[4/3] bg-[#0b0a09] relative overflow-hidden flex items-center justify-center cursor-pointer group"
                  onClick={() => setLightboxIndex(index)}
                >
                  {asset.preview_url ? (
                    isVideo ? (
                      <div className="w-full h-full relative group-hover:scale-105 transition-transform duration-500 flex items-center justify-center bg-[#090807]">
                        <video 
                          src={`${asset.preview_url}#t=0.1`} 
                          preload="metadata"
                          className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-transparent transition-colors">
                          <div className="w-10 h-10 rounded-full bg-[#c69f68] text-[#0b0a09] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <Play className="w-4 h-4 ml-0.5" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <SafeImage
                        src={asset.preview_url}
                        alt={asset.filename || "Preview"}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    )
                  ) : (
                    <div className="flex flex-col items-center justify-center text-[#554c42] p-4 text-center">
                      {isVideo ? <Film className="w-8 h-8 mb-1" /> : <Camera className="w-8 h-8 mb-1" />}
                      <span className="text-[10px] uppercase font-mono">{t.networkOriginal}</span>
                    </div>
                  )}

                  {/* Top Badges */}
                  <div className="absolute top-2 left-2 flex items-center gap-1.5 flex-wrap z-10">
                    {hasClientNote && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500 text-[#0b0a09] font-sans font-bold flex items-center gap-1 shadow-md">
                        <MessageSquare className="w-3 h-3 fill-current" />
                        <span>{t.withNoteBadge}</span>
                      </span>
                    )}
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#0b0a09]/90 border border-[#26211c] text-[#c69f68] font-mono font-semibold uppercase">
                      {asset.asset_type.replace("_", " ")}
                    </span>
                    {isMaster && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-950/90 border border-purple-700/60 text-purple-300 font-mono font-bold uppercase flex items-center gap-1">
                        <Clapperboard className="w-2.5 h-2.5" />
                        <span>{t.masterTag}</span>
                      </span>
                    )}
                    {asset.size_mb && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#0b0a09]/80 text-[#8c7a6b] font-mono">
                        {asset.size_mb} MB
                      </span>
                    )}
                  </div>

                  {/* Client Selection Star Badge */}
                  {isClientSelected && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-[#c69f68] text-[#0b0a09] text-[10px] font-bold flex items-center gap-1 shadow-md z-10">
                      <Sparkles className="w-3 h-3" />
                      <span>{t.inBookBadge}</span>
                    </div>
                  )}
                </div>

                {/* Info and Actions */}
                <div className="p-3.5 space-y-2.5">
                  <div className="truncate">
                    <h4 className="text-xs font-serif font-bold text-[#f5f2eb] truncate" title={asset.filename || ""}>
                      {asset.filename || t.unnamedFile}
                    </h4>
                    <p className="text-[10px] font-mono text-[#70665a] truncate mt-0.5" title={asset.nas_path}>
                      {asset.nas_path}
                    </p>
                  </div>

                  {/* Client Note if present */}
                  {hasClientNote && (
                    <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/50 text-[#f5f2eb] text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-amber-400 font-bold">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{t.clientNoteLabel}</span>
                      </div>
                      <p className="italic text-amber-200/90 leading-relaxed font-sans font-medium pl-1">
                        &quot;{asset.client_notes}&quot;
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-1.5 border-t border-[#26211c] flex items-center justify-between gap-1">
                    {/* Toggle Share Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleShared(asset)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                        asset.is_shared 
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" 
                          : "bg-[#181613] text-[#8c7a6b] hover:text-[#f5f2eb] border border-[#26211c]"
                      }`}
                      title={asset.is_shared ? t.sharedStatus : t.hiddenStatus}
                    >
                      {asset.is_shared ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      <span className="text-[10px]">{asset.is_shared ? t.sharedStatus : t.hiddenStatus}</span>
                    </button>

                    {/* Open With / Reveal in Folder */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenFile(asset.nas_path, "open_with")}
                        className="p-1.5 rounded-lg bg-[#181613] hover:bg-[#201c18] border border-[#26211c] text-[#a89f91] hover:text-[#c69f68] transition-colors cursor-pointer"
                        title={t.openWithApp}
                      >
                        <PenTool className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenFile(asset.nas_path, "reveal")}
                        className="p-1.5 rounded-lg bg-[#181613] hover:bg-[#201c18] border border-[#26211c] text-[#a89f91] hover:text-[#f5f2eb] transition-colors cursor-pointer"
                        title={t.revealInFolder}
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                      </button>

                      <form action={deleteAssetAction} className="inline">
                        <input type="hidden" name="id" value={asset.id} />
                        <input type="hidden" name="sessionId" value={session.id} />
                        <button
                          type="submit"
                          className="p-1.5 rounded-lg bg-[#181613] hover:bg-rose-950/30 border border-[#26211c] hover:border-rose-800/40 text-[#70665a] hover:text-rose-400 transition-colors cursor-pointer"
                          title={t.deleteFromSession}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      </>
    )}

      {/* Lightbox Modal */}
      {lightboxIndex !== null && currentList[lightboxIndex] && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md animate-in fade-in">
          <button 
            className="absolute top-4 right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-50 cursor-pointer"
            onClick={() => setLightboxIndex(null)}
          >
            ✕
          </button>
          
          <button 
            className="absolute left-4 top-1/2 -translate-y-1/2 p-4 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-50 disabled:opacity-30 cursor-pointer"
            onClick={() => setLightboxIndex(prev => prev !== null && prev > 0 ? prev - 1 : prev)}
            disabled={lightboxIndex === 0}
          >
            ◀
          </button>
          
          <div className="max-w-6xl max-h-[90vh] flex items-center justify-center w-full px-20 relative">
            {currentList[lightboxIndex].asset_type.includes("video") ? (
              <video 
                src={currentList[lightboxIndex].preview_url || ""} 
                controls 
                autoPlay 
                className="max-w-full max-h-[85vh] rounded-lg shadow-2xl ring-1 ring-white/10"
              />
            ) : (
              <img 
                src={currentList[lightboxIndex].preview_url || ""} 
                alt={currentList[lightboxIndex].filename || "Preview"} 
                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl ring-1 ring-white/10"
              />
            )}
            
            <div className="absolute bottom-[-55px] left-0 right-0 text-center flex flex-col items-center gap-1.5">
              <div className="text-white/80 text-xs font-mono font-bold tracking-wider">
                {currentList[lightboxIndex].filename} &nbsp; ({lightboxIndex + 1} / {currentList.length})
              </div>
              {currentList[lightboxIndex].client_notes && (
                <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-amber-950/90 border border-amber-500/60 text-amber-200 text-xs shadow-xl backdrop-blur-md">
                  <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                  <span><strong>{t.clientRetouchInstruction}</strong> &quot;{currentList[lightboxIndex].client_notes}&quot;</span>
                </div>
              )}
            </div>
          </div>
          
          <button 
            className="absolute right-4 top-1/2 -translate-y-1/2 p-4 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-50 disabled:opacity-30 cursor-pointer"
            onClick={() => setLightboxIndex(prev => prev !== null && prev < currentList.length - 1 ? prev + 1 : prev)}
            disabled={lightboxIndex === currentList.length - 1}
          >
            ▶
          </button>
        </div>
      )}
    </div>
  )
}
