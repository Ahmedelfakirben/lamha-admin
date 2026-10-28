"use client"

import { useState, useTransition, useMemo, useEffect, useRef } from "react"
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
  Cloud,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  LayoutGrid,
  Grid3X3,
  Scan,
  PanelBottomClose,
  PanelBottomOpen,
  Server,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X
} from "lucide-react"
import { MasterDeliveryUploadModal } from "@/components/master-delivery-upload-modal"
import { MontageDriveSyncModal } from "@/components/montage-drive-sync-modal"
import { ProjectStorageHub } from "@/components/project-storage-hub"
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toggleAssetSharedAction, bulkSetAssetsSharedAction, deleteAssetAction } from "@/app/actions"
import { useLanguage } from "@/context/language-context"
import { createClient } from "@/lib/supabase"
import { SessionDeliveryHub } from "./session-delivery-hub"
import { openLocalFolderOrFile } from "@/lib/desktop-bridge"

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
  const { t, language } = useLanguage()
  const [showStorageHub, setShowStorageHub] = useState(false)
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

  // Estado de diseño de cuadrícula (Grid) y galería Lightbox Pro
  const [gridDensity, setGridDensity] = useState<"compact" | "normal" | "large">("normal")
  const [fitMode, setFitMode] = useState<"cover" | "contain">("cover")
  const [rotation, setRotation] = useState<number>(0)
  const [zoom, setZoom] = useState<number>(1)
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [hideLightboxUI, setHideLightboxUI] = useState(false)
  const [showFilmstrip, setShowFilmstrip] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isNoteExpanded, setIsNoteExpanded] = useState(true)
  const [openMenuAssetId, setOpenMenuAssetId] = useState<string | null>(null)
  const [isLightboxFolderMenuOpen, setIsLightboxFolderMenuOpen] = useState(false)
  const filmstripRef = useRef<HTMLDivElement | null>(null)
  const lightboxContainerRef = useRef<HTMLDivElement | null>(null)

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await (lightboxContainerRef.current || document.documentElement).requestFullscreen()
        setIsFullscreen(true)
      } else {
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    } catch {}
  }

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener("fullscreenchange", onFsChange)
    return () => document.removeEventListener("fullscreenchange", onFsChange)
  }, [])

  // Reset rotation, zoom y pan al cambiar de foto + precarga de foto anterior/siguiente
  useEffect(() => {
    setRotation(0)
    setZoom(1)
    setPanOffset({ x: 0, y: 0 })
    setIsDragging(false)
    setIsNoteExpanded(true)

    if (lightboxIndex !== null) {
      const preloadIndexes = [lightboxIndex - 1, lightboxIndex + 1]
      preloadIndexes.forEach((idx) => {
        const item = currentList[idx]
        if (item?.preview_url) {
          const img = new Image()
          img.src = item.preview_url
        }
      })
    }
  }, [lightboxIndex, currentList])

  // Centrar miniatura activa en el carrusel inferior
  useEffect(() => {
    if (lightboxIndex !== null && filmstripRef.current) {
      const activeThumb = filmstripRef.current.children[lightboxIndex] as HTMLElement
      if (activeThumb) {
        activeThumb.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })
      }
    }
  }, [lightboxIndex, showFilmstrip])

  // Navegación con teclado en Lightbox (flechas izq/der, escape, rotación 'r', zoom, compartir 'p', fullscreen 'f', modo inmersivo 'Tab')
  useEffect(() => {
    if (lightboxIndex === null) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {})
        }
        setLightboxIndex(null)
      } else if (e.key === "ArrowLeft") {
        setLightboxIndex(prev => prev !== null && prev > 0 ? prev - 1 : prev)
      } else if (e.key === "ArrowRight") {
        setLightboxIndex(prev => prev !== null && prev < currentList.length - 1 ? prev + 1 : prev)
      } else if (e.key === "r" || e.key === "R") {
        setRotation(prev => (prev + 90) % 360)
      } else if (e.key === "+" || e.key === "=") {
        setZoom(prev => Math.min(prev + 0.35, 4))
      } else if (e.key === "-") {
        setZoom(prev => {
          const next = Math.max(prev - 0.35, 1)
          if (next <= 1) setPanOffset({ x: 0, y: 0 })
          return next
        })
      } else if (e.key === "0") {
        setZoom(1)
        setRotation(0)
        setPanOffset({ x: 0, y: 0 })
      } else if (e.key === "p" || e.key === "P") {
        const cur = currentList[lightboxIndex]
        if (cur) handleToggleShared(cur)
      } else if (e.key === "f" || e.key === "F") {
        toggleFullscreen()
      } else if (e.key === "Tab") {
        e.preventDefault()
        setHideLightboxUI(prev => !prev)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [lightboxIndex, currentList])

  // Abrir archivo en Local (SSD) o NAS directamente en el Explorador de Windows
  const handleOpenFile = async (nasPath: string, mode: "open_with" | "reveal" | "open", target: "local" | "nas" = "local") => {
    try {
      setOpenMenuAssetId(null)
      setIsLightboxFolderMenuOpen(false)

      const targetLabel = target === "nas" ? "NAS" : "Carpeta Local (SSD)"
      showNotification(`Abriendo en el Explorador de Windows (${targetLabel})...`)

      const res = await openLocalFolderOrFile(nasPath, mode === "open" ? "open" : "reveal", target)
      if (res.success) {
        showNotification(res.message || `Abierto en el Explorador (${targetLabel})`)
        return
      }

      showNotification(`Aviso: ${res.message || "No se pudo abrir el explorador de archivos"}`)
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

      {/* Filter, View Controls and Bulk Actions Bar */}
      {activeTab !== "delivery" && (
        <>
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-3 rounded-xl bg-[#141210] border border-[#26211c]">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#70665a]" />
            <input
              type="text"
              placeholder={t.searchMediaPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-[#0b0a09] border border-[#26211c] text-[#f5f2eb] focus:border-[#c69f68] outline-none"
            />
          </div>

          {/* Controles de Proporción (Cover vs Contain) y Densidad de Columnas */}
          <div className="flex items-center gap-1.5 bg-[#0b0a09] border border-[#26211c] rounded-lg p-1">
            <button
              type="button"
              onClick={() => setFitMode(fitMode === "cover" ? "contain" : "cover")}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                fitMode === "contain"
                  ? "bg-[#c69f68] text-[#0b0a09] font-bold shadow-sm"
                  : "text-[#8c7a6b] hover:text-[#f5f2eb]"
              }`}
              title={
                language === "fr"
                  ? "Basculer entre recadrage uniforme (Cover) et photo entière non coupée (Contain)"
                  : language === "ar"
                  ? "تبديل عرض الصورة كاملة أو مقصوصة"
                  : language === "en"
                  ? "Toggle between uniform crop (Cover) and full uncropped photo (Contain)"
                  : "Alternar entre recorte uniforme (Cover) y foto completa sin recortar (Contain)"
              }
            >
              <Scan className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {fitMode === "contain"
                  ? language === "fr" ? "Entière" : language === "ar" ? "كاملة" : language === "en" ? "Full Fit" : "Completa"
                  : language === "fr" ? "Recadrée" : language === "ar" ? "مربعة" : language === "en" ? "Crop" : "Uniforme"}
              </span>
            </button>

            <div className="w-px h-4 bg-[#26211c]" />

            <button
              type="button"
              onClick={() => setGridDensity("compact")}
              className={`p-1 rounded-md transition-colors cursor-pointer ${
                gridDensity === "compact" ? "bg-[#c69f68]/20 text-[#c69f68]" : "text-[#70665a] hover:text-[#f5f2eb]"
              }`}
              title={language === "fr" ? "Grille compacte (6 col)" : language === "ar" ? "شبكة مدمجة" : language === "en" ? "Compact grid" : "Vista compacta (6 col)"}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setGridDensity("normal")}
              className={`p-1 rounded-md transition-colors cursor-pointer ${
                gridDensity === "normal" ? "bg-[#c69f68]/20 text-[#c69f68]" : "text-[#70665a] hover:text-[#f5f2eb]"
              }`}
              title={language === "fr" ? "Grille standard (4 col)" : language === "ar" ? "شبكة قياسية" : language === "en" ? "Standard grid" : "Vista estándar (4 col)"}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setGridDensity("large")}
              className={`p-1 rounded-md transition-colors cursor-pointer ${
                gridDensity === "large" ? "bg-[#c69f68]/20 text-[#c69f68]" : "text-[#70665a] hover:text-[#f5f2eb]"
              }`}
              title={language === "fr" ? "Grands aperçus (3 col)" : language === "ar" ? "صور كبيرة" : language === "en" ? "Large cards" : "Vista grande (3 col)"}
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Botón Auditer & Sincronizar Almacenamiento Global */}
          <button
            type="button"
            onClick={() => setShowStorageHub(true)}
            className="px-3 py-1.5 rounded-lg border border-[#c69f68]/40 hover:bg-[#c69f68]/15 bg-[#c69f68]/10 text-[#f5f2eb] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            title={language === "fr" ? "Auditer et synchroniser le stockage (SSD / NAS / Supabase)" : language === "ar" ? "تدقيق ومزامنة التخزين" : language === "en" ? "Audit & sync storage" : "Auditar y sincronizar almacenamiento"}
          >
            <Server className="w-3.5 h-3.5 text-[#c69f68]" />
            <span className="hidden sm:inline">
              {language === "fr" ? "Auditer Stockage" : language === "ar" ? "تدقيق التخزين" : language === "en" ? "Audit Storage" : "Auditar Stockage"}
            </span>
          </button>

          <Dialog open={showStorageHub} onOpenChange={setShowStorageHub}>
            <DialogContent 
              showCloseButton={false}
              className="w-[95vw] sm:max-w-4xl lg:max-w-5xl max-h-[92vh] overflow-y-auto bg-[#0f0e0c] border border-[#2d251e] shadow-2xl p-0 text-[#f5f2eb] rounded-2xl"
            >
              <DialogTitle className="sr-only">Stockage du Projet</DialogTitle>
              <ProjectStorageHub 
                projectFolder={fName} 
                sessionId={session.id} 
                clientName={session.client_name} 
                onClose={() => setShowStorageHub(false)}
              />
            </DialogContent>
          </Dialog>

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
        <div
          className={`grid gap-3 sm:gap-4 ${
            gridDensity === "compact"
              ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
              : gridDensity === "large"
              ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3"
              : "grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          }`}
        >
          {currentList.map((asset, index) => {
            const isClientSelected = isAssetSelected(asset)
            const isVideo = asset.asset_type.includes("video")
            const isMaster = masterAssets.some(m => m.id === asset.id)
            const hasClientNote = Boolean(asset.client_notes && asset.client_notes.trim().length > 0)
            const folderShort = (asset.nas_path || "").includes("03_Edicion_Master") || (asset.nas_path || "").includes("03_Édition_Master")
              ? "03_Edicion_Master"
              : (asset.nas_path || "").includes("02_Seleccion")
              ? "02_Seleccion"
              : (asset.nas_path || "").includes("04_Entregas")
              ? "04_Entregas"
              : "01_RAW"

            return (
              <div
                key={asset.id}
                className={`group rounded-2xl bg-[#141210] border transition-all duration-300 flex flex-col justify-between hover:-translate-y-0.5 ${
                  openMenuAssetId === asset.id ? "z-30 relative" : "relative"
                } ${
                  hasClientNote
                    ? "border-amber-500 shadow-lg shadow-amber-950/40 ring-1 ring-amber-500/80"
                    : isClientSelected 
                    ? "border-[#c69f68] shadow-lg shadow-[#c69f68]/15 ring-1 ring-[#c69f68]/50" 
                    : isMaster
                    ? "border-purple-600/40 hover:border-purple-500 shadow-md shadow-purple-950/20"
                    : asset.is_shared 
                    ? "border-emerald-500/40 hover:border-emerald-500" 
                    : "border-[#26211c] hover:border-[#c69f68]/50"
                }`}
              >
                {/* Media Image / Preview */}
                <div 
                  className={`${
                    fitMode === "contain" ? "aspect-[4/3] p-1.5" : "aspect-[4/3]"
                  } bg-[#090807] relative overflow-hidden rounded-t-2xl flex items-center justify-center cursor-pointer group/img`}
                  onClick={() => setLightboxIndex(index)}
                >
                  {isVideo ? (
                    <div className="w-full h-full relative group-hover/img:scale-105 transition-transform duration-500 flex items-center justify-center bg-[#090807]">
                      {asset.preview_url ? (
                        <SafeImage
                          src={asset.preview_url}
                          alt={asset.filename || "Preview"}
                          className={`w-full h-full ${fitMode === "contain" ? "object-contain" : "object-cover"} opacity-90 group-hover/img:opacity-100 transition-opacity`}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-[#554c42] p-4 text-center">
                          <Film className="w-8 h-8 mb-1 text-[#c69f68]/70" />
                          <span className="text-[10px] uppercase font-mono text-[#c69f68]">
                            {asset.filename ? asset.filename.split(".").pop()?.toUpperCase() : "VIDEO"}
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/25 group-hover/img:bg-black/10 transition-colors">
                        <div className="w-11 h-11 rounded-full bg-[#c69f68] text-[#0b0a09] flex items-center justify-center shadow-xl group-hover/img:scale-110 transition-transform">
                          <Play className="w-4 h-4 ml-0.5 fill-current" />
                        </div>
                      </div>
                    </div>
                  ) : asset.preview_url ? (
                    <>
                      {/* Halo sutil de fondo cuando está en modo foto entera (Contain) */}
                      {fitMode === "contain" && (
                        <img
                          src={asset.preview_url}
                          alt=""
                          aria-hidden="true"
                          className="absolute inset-0 w-full h-full object-cover blur-xl opacity-25 scale-110 pointer-events-none"
                        />
                      )}
                      <SafeImage
                        src={asset.preview_url}
                        alt={asset.filename || "Preview"}
                        className={`relative z-[1] w-full h-full ${
                          fitMode === "contain" ? "object-contain rounded-lg" : "object-cover"
                        } group-hover/img:scale-105 transition-transform duration-500`}
                      />
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-[#554c42] p-4 text-center">
                      <Camera className="w-8 h-8 mb-1" />
                      <span className="text-[10px] uppercase font-mono">{t.networkOriginal}</span>
                    </div>
                  )}

                  {/* Hover Overlay Sutil con botón de Ampliar */}
                  {!isVideo && (
                    <div className="absolute inset-0 z-[5] bg-gradient-to-t from-black/70 via-transparent to-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity duration-200 flex items-end justify-between p-2.5 pointer-events-none">
                      <span className="px-2 py-1 rounded-lg bg-black/75 backdrop-blur-md border border-white/15 text-[#f5f2eb] text-[10px] font-medium flex items-center gap-1.5 shadow-lg">
                        <ZoomIn className="w-3 h-3 text-[#c69f68]" />
                        <span>{language === "fr" ? "Agrandir" : language === "ar" ? "تكبير" : language === "en" ? "Inspect" : "Ampliar"}</span>
                      </span>
                      {asset.size_mb && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-black/75 text-[#d6cec2] font-mono">
                          {asset.size_mb} MB
                        </span>
                      )}
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
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#0b0a09]/85 backdrop-blur-md border border-white/10 text-[#c69f68] font-mono font-semibold uppercase">
                      {asset.asset_type.replace("_", " ")}
                    </span>
                    {isMaster && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-950/90 border border-purple-700/60 text-purple-300 font-mono font-bold uppercase flex items-center gap-1">
                        <Clapperboard className="w-2.5 h-2.5" />
                        <span>{t.masterTag}</span>
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
                <div className="p-3 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-serif font-bold text-[#f5f2eb] truncate flex-1" title={asset.filename || ""}>
                      {asset.filename || t.unnamedFile}
                    </h4>
                    <span
                      className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#1c1916] border border-[#2a241f] text-[#8c7a6b] shrink-0"
                      title={asset.nas_path}
                    >
                      {folderShort}
                    </span>
                  </div>

                  {/* Client Note if present */}
                  {hasClientNote && (
                    <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/50 text-[#f5f2eb] text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-amber-400 font-bold">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{t.clientNoteLabel}</span>
                      </div>
                      <p className="italic text-amber-200/90 leading-relaxed font-sans font-medium pl-1 line-clamp-2" title={asset.client_notes || ""}>
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

                    {/* Open With / Play Video (Local or NAS) */}
                    <div className="flex items-center gap-1 relative">
                      <button
                        type="button"
                        onClick={() => handleOpenFile(asset.nas_path, isVideo ? "open" : "open_with", "local")}
                        className="p-1.5 rounded-lg bg-[#181613] hover:bg-[#201c18] border border-[#26211c] text-[#a89f91] hover:text-[#c69f68] transition-colors cursor-pointer"
                        title={isVideo ? t.playNativeVideo : t.openWithApp}
                      >
                        {isVideo ? <Play className="w-3.5 h-3.5 fill-current text-[#c69f68]" /> : <PenTool className="w-3.5 h-3.5" />}
                      </button>

                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setOpenMenuAssetId(openMenuAssetId === asset.id ? null : asset.id)
                          }}
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-0.5 ${
                            openMenuAssetId === asset.id
                              ? "bg-[#c69f68]/20 border-[#c69f68] text-[#f5f2eb]"
                              : "bg-[#181613] hover:bg-[#201c18] border-[#26211c] text-[#a89f91] hover:text-[#f5f2eb]"
                          }`}
                          title={t.revealInFolder}
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                          <ChevronDown className="w-2.5 h-2.5 opacity-70" />
                        </button>

                        {/* Dropdown de opciones: Local SSD o NAS */}
                        {openMenuAssetId === asset.id && (
                          <>
                            <div 
                              className="fixed inset-0 z-40 cursor-default" 
                              onClick={(e) => {
                                e.stopPropagation()
                                setOpenMenuAssetId(null)
                              }}
                            />
                            <div 
                              className="absolute right-0 bottom-full mb-2 w-56 rounded-xl bg-[#171411] border border-[#383129] shadow-2xl z-50 py-1.5 text-xs animate-in fade-in zoom-in-95 backdrop-blur-xl"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="px-3 py-1 text-[10px] uppercase font-bold tracking-wider text-[#8c7a6b] border-b border-[#26211c]">
                                {t.revealInFolder}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleOpenFile(asset.nas_path, "reveal", "local")}
                                className="w-full px-3 py-2 text-left flex items-center gap-2.5 hover:bg-[#26211c] text-[#f5f2eb] transition-colors cursor-pointer"
                              >
                                <HardDrive className="w-3.5 h-3.5 text-[#c69f68]" />
                                <div>
                                  <div className="font-medium">{t.openInLocalFolder}</div>
                                  <div className="text-[10px] text-[#8c7a6b]">C:\Lamha-Storage\...</div>
                                </div>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenFile(asset.nas_path, "reveal", "nas")}
                                className="w-full px-3 py-2 text-left flex items-center gap-2.5 hover:bg-[#26211c] text-[#f5f2eb] transition-colors cursor-pointer border-t border-[#26211c]/60"
                              >
                                <Server className="w-3.5 h-3.5 text-sky-400" />
                                <div>
                                  <div className="font-medium">{t.openInNasFolder}</div>
                                  <div className="text-[10px] text-[#8c7a6b]">Explorador de Windows (NAS)</div>
                                </div>
                              </button>
                            </div>
                          </>
                        )}
                      </div>

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

      {/* Lightbox Modal — Estudio / Visor Pro Inmersivo */}
      {lightboxIndex !== null && currentList[lightboxIndex] && (() => {
        const currentAsset = currentList[lightboxIndex]
        const isCurrentVideo = currentAsset.asset_type.includes("video")
        const isCurrentSelected = isAssetSelected(currentAsset)
        const hasCurrentNote = Boolean(currentAsset.client_notes && currentAsset.client_notes.trim().length > 0)

        return (
          <div 
            ref={lightboxContainerRef}
            className="fixed inset-0 z-[100] flex flex-col bg-[#070605]/98 backdrop-blur-2xl animate-in fade-in select-none overflow-hidden"
            onClick={() => {
              if (openMenuAssetId) setOpenMenuAssetId(null)
              if (isLightboxFolderMenuOpen) setIsLightboxFolderMenuOpen(false)
            }}
          >
            {/* Fondo Ambiente Dinámico (Cinema Ambient Glow) */}
            {currentAsset.preview_url && (
              <img
                src={currentAsset.preview_url}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-20 scale-125 pointer-events-none transition-all duration-700"
              />
            )}

            {/* Header Superior Flotante del Visor */}
            {!hideLightboxUI && (
              <div className="h-14 px-4 sm:px-6 flex items-center justify-between border-b border-white/10 bg-black/55 backdrop-blur-xl z-50 shrink-0">
                {/* Izquierda: Contador, Nombre y Badges de Estado */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="px-2.5 py-1 rounded-lg bg-[#c69f68]/20 border border-[#c69f68]/40 text-[#e8c89b] font-mono text-xs font-bold tracking-wider shrink-0">
                    {lightboxIndex + 1} / {currentList.length}
                  </span>
                  <div className="truncate flex items-center gap-2">
                    <p className="text-white font-serif font-bold text-sm truncate max-w-[160px] sm:max-w-xs md:max-w-md" title={currentAsset.filename || ""}>
                      {currentAsset.filename || t.unnamedFile}
                    </p>
                    {isCurrentSelected && (
                      <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#c69f68] text-[#0b0a09] text-[10px] font-bold shadow-sm shrink-0">
                        <Sparkles className="w-3 h-3" />
                        <span>{t.inBookBadge}</span>
                      </span>
                    )}
                    {currentAsset.size_mb && (
                      <span className="hidden lg:inline-block text-[11px] font-mono text-white/50 shrink-0">
                        ({currentAsset.size_mb} MB)
                      </span>
                    )}
                  </div>
                </div>

                {/* Derecha: Acciones de Estudio + Controles de Imagen */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {/* Acción Rápida: Compartir / Ocultar al Cliente (Tecla P) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleToggleShared(currentAsset)
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                      currentAsset.is_shared
                        ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/30"
                        : "bg-white/10 border-white/15 text-white/75 hover:text-white hover:bg-white/15"
                    }`}
                    title={`${currentAsset.is_shared ? t.sharedStatus : t.hiddenStatus} (P)`}
                  >
                    {currentAsset.is_shared ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span className="hidden md:inline">{currentAsset.is_shared ? t.sharedStatus : t.hiddenStatus}</span>
                  </button>

                  {/* Acción Rápida: Editar en Photoshop / App externa */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleOpenFile(currentAsset.nas_path, isCurrentVideo ? "open" : "open_with", "local")
                    }}
                    className="p-2 sm:px-2.5 sm:py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer border border-white/10"
                    title={isCurrentVideo ? t.playNativeVideo : t.openWithApp}
                  >
                    {isCurrentVideo ? <Play className="w-3.5 h-3.5 text-[#c69f68] fill-current" /> : <PenTool className="w-3.5 h-3.5 text-[#c69f68]" />}
                    <span className="hidden lg:inline">{isCurrentVideo ? t.playNativeVideo : "Photoshop / App"}</span>
                  </button>

                  <div className="hidden sm:block w-px h-5 bg-white/15 mx-0.5" />

                  {/* Controles de Zoom (- / % / +) */}
                  <div className="hidden sm:flex items-center bg-white/10 border border-white/10 rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setZoom(prev => {
                          const next = Math.max(prev - 0.35, 1)
                          if (next <= 1) setPanOffset({ x: 0, y: 0 })
                          return next
                        })
                      }}
                      className="p-1.5 rounded-md hover:bg-white/15 text-white transition-colors cursor-pointer"
                      title={`${t.zoomOut} (-)`}
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setZoom(1)
                        setRotation(0)
                        setPanOffset({ x: 0, y: 0 })
                      }}
                      className="px-2 text-[11px] font-mono font-bold text-[#c69f68] hover:text-white transition-colors cursor-pointer"
                      title={`${t.resetView} (0 / Doble clic)`}
                    >
                      {Math.round(zoom * 100)}%
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setZoom(prev => Math.min(prev + 0.35, 4))
                      }}
                      className="p-1.5 rounded-md hover:bg-white/15 text-white transition-colors cursor-pointer"
                      title={`${t.zoomIn} (+)`}
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Botón Rotar */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setRotation(prev => (prev + 90) % 360)
                    }}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center gap-1 text-xs font-medium transition-colors cursor-pointer border border-white/10"
                    title={`${t.rotatePhoto} (R)`}
                  >
                    <RotateCw className="w-3.5 h-3.5 text-[#c69f68]" />
                    {rotation !== 0 && (
                      <span className="text-[10px] px-1 rounded bg-[#c69f68]/30 text-[#c69f68] font-mono">{rotation}°</span>
                    )}
                  </button>

                  {/* Botón Mostrar/Ocultar Filmstrip */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowFilmstrip(prev => !prev)
                    }}
                    className={`p-2 rounded-lg border transition-colors cursor-pointer hidden sm:flex items-center justify-center ${
                      showFilmstrip
                        ? "bg-white/10 border-white/10 text-white hover:bg-white/20"
                        : "bg-[#c69f68]/20 border-[#c69f68]/40 text-[#c69f68]"
                    }`}
                    title={language === "fr" ? "Afficher/Masquer les miniatures" : language === "ar" ? "إظهار/إخفاء المصغرات" : language === "en" ? "Toggle filmstrip" : "Mostrar/Ocultar tira de miniaturas"}
                  >
                    {showFilmstrip ? <PanelBottomClose className="w-3.5 h-3.5" /> : <PanelBottomOpen className="w-3.5 h-3.5" />}
                  </button>

                  {/* Botón Pantalla Completa (Tecla F) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleFullscreen()
                    }}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer border border-white/10 hidden sm:flex items-center justify-center"
                    title="Pantalla completa (F)"
                  >
                    {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 text-[#c69f68]" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  </button>

                  {/* Botón Abrir Carpeta (Local vs NAS) */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setIsLightboxFolderMenuOpen(!isLightboxFolderMenuOpen)
                      }}
                      className="p-2 sm:px-2.5 sm:py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center gap-1 text-xs font-medium transition-colors cursor-pointer border border-white/10"
                      title={t.revealInFolder}
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
                      <ChevronDown className="w-3 h-3 opacity-70" />
                    </button>

                    {isLightboxFolderMenuOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-40 cursor-default" 
                          onClick={(e) => {
                            e.stopPropagation()
                            setIsLightboxFolderMenuOpen(false)
                          }}
                        />
                        <div 
                          className="absolute right-0 top-full mt-2 w-60 rounded-xl bg-[#171411] border border-[#383129] shadow-2xl z-50 py-1.5 text-xs animate-in fade-in zoom-in-95 backdrop-blur-2xl"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => handleOpenFile(currentAsset.nas_path, "reveal", "local")}
                            className="w-full px-3 py-2.5 text-left flex items-center gap-2.5 hover:bg-[#26211c] text-[#f5f2eb] transition-colors cursor-pointer"
                          >
                            <HardDrive className="w-4 h-4 text-[#c69f68]" />
                            <div>
                              <div className="font-semibold">{t.openInLocalFolder}</div>
                              <div className="text-[10px] text-[#8c7a6b]">C:\Lamha-Storage\...</div>
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenFile(currentAsset.nas_path, "reveal", "nas")}
                            className="w-full px-3 py-2.5 text-left flex items-center gap-2.5 hover:bg-[#26211c] text-[#f5f2eb] transition-colors cursor-pointer border-t border-[#26211c]"
                          >
                            <Server className="w-4 h-4 text-sky-400" />
                            <div>
                              <div className="font-semibold">{t.openInNasFolder}</div>
                              <div className="text-[10px] text-[#8c7a6b]">Explorador de Windows (NAS)</div>
                            </div>
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Cerrar modal */}
                  <button 
                    type="button"
                    className="p-2 rounded-full bg-white/10 hover:bg-rose-500/25 hover:text-rose-400 text-white transition-colors cursor-pointer border border-white/10 ml-1"
                    onClick={() => {
                      if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
                      setLightboxIndex(null)
                    }}
                    title="Cerrar (Esc)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Área Central: Lienzo de Inspección con Rueda de Zoom, Doble Clic y Arrastrar (Pan) */}
            <div 
              className={`flex-1 relative flex items-center justify-center overflow-hidden px-2 sm:px-8 py-2 ${
                !isCurrentVideo && zoom > 1 ? (isDragging ? "cursor-grabbing" : "cursor-grab") : "cursor-default"
              }`}
              onWheel={(e) => {
                if (isCurrentVideo) return
                e.preventDefault()
                const delta = e.deltaY < 0 ? 0.25 : -0.25
                setZoom((prev) => {
                  const next = Math.min(Math.max(Number((prev + delta).toFixed(2)), 1), 4)
                  if (next <= 1) setPanOffset({ x: 0, y: 0 })
                  return next
                })
              }}
              onMouseDown={(e) => {
                if (isCurrentVideo || zoom <= 1) return
                e.preventDefault()
                setIsDragging(true)
                setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y })
              }}
              onMouseMove={(e) => {
                if (!isDragging || zoom <= 1) return
                setPanOffset({
                  x: e.clientX - dragStart.x,
                  y: e.clientY - dragStart.y,
                })
              }}
              onMouseUp={() => setIsDragging(false)}
              onMouseLeave={() => setIsDragging(false)}
              onDoubleClick={(e) => {
                if (isCurrentVideo) return
                e.stopPropagation()
                if (zoom > 1) {
                  setZoom(1)
                  setPanOffset({ x: 0, y: 0 })
                } else {
                  setZoom(2.4)
                }
              }}
            >
              {/* Flecha Anterior */}
              {!hideLightboxUI && (
                <button 
                  type="button"
                  className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 p-3 sm:p-3.5 rounded-full bg-black/60 hover:bg-[#c69f68] text-white hover:text-[#0b0a09] border border-white/15 transition-all z-40 disabled:opacity-15 disabled:pointer-events-none cursor-pointer shadow-2xl hover:scale-105 active:scale-95"
                  onClick={(e) => {
                    e.stopPropagation()
                    setLightboxIndex(prev => prev !== null && prev > 0 ? prev - 1 : prev)
                  }}
                  disabled={lightboxIndex === 0}
                  title="Anterior (←)"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}

              {/* Contenedor de la Imagen / Video Central */}
              <div 
                className={`w-full h-full flex items-center justify-center ${
                  isDragging ? "" : "transition-transform duration-200 ease-out"
                }`}
                style={{
                  transform: `translate3d(${panOffset.x}px, ${panOffset.y}px, 0) rotate(${rotation}deg) scale(${zoom})`,
                }}
              >
                {isCurrentVideo ? (
                  <div className="flex flex-col items-center justify-center max-w-full max-h-[82vh] gap-4">
                    <div className="relative flex items-center justify-center max-w-full max-h-[70vh] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/15 bg-black/60">
                      {currentAsset.preview_url ? (
                        <img
                          src={currentAsset.preview_url || ""}
                          alt={currentAsset.filename || "Video poster"}
                          className="max-w-full max-h-[68vh] object-contain rounded-xl"
                        />
                      ) : (
                        <div className="w-[460px] h-[280px] max-w-[85vw] flex flex-col items-center justify-center text-[#70665a] p-6 text-center">
                          <Film className="w-16 h-16 mb-2 text-[#c69f68]/80 animate-pulse" />
                          <span className="text-xs uppercase font-mono text-[#c69f68] font-bold">
                            {currentAsset.filename || "RAW VIDEO"}
                          </span>
                          <span className="text-[10px] text-[#8c7a6b] mt-1">{t.playNativeVideoHint}</span>
                        </div>
                      )}

                      {/* Central Play Badge */}
                      <button
                        type="button"
                        onClick={() => handleOpenFile(currentAsset.nas_path, "open", "local")}
                        className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/10 transition-colors cursor-pointer group"
                        title={t.playNativeVideo}
                      >
                        <div className="w-16 h-16 rounded-full bg-[#c69f68] hover:bg-[#dfba85] text-[#0b0a09] flex items-center justify-center shadow-2xl transition-transform hover:scale-110 active:scale-95">
                          <Play className="w-7 h-7 ml-1 fill-current" />
                        </div>
                      </button>
                    </div>

                    {/* Primary Native Play Action Bar */}
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleOpenFile(currentAsset.nas_path, "open", "local")}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#c69f68] via-[#dfba85] to-[#c69f68] text-[#0b0a09] font-bold text-xs flex items-center gap-2 shadow-lg shadow-[#c69f68]/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                        title={t.playNativeVideoHint}
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>{t.playNativeVideo}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenFile(currentAsset.nas_path, "reveal", "local")}
                        className="px-3 py-2 rounded-xl bg-[#1c1814] hover:bg-[#28221c] border border-[#383129] text-[#f5f2eb] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{t.revealInFolder}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <img 
                    src={currentAsset.preview_url || ""} 
                    alt={currentAsset.filename || "Preview"} 
                    className={`max-w-[94vw] ${
                      hideLightboxUI || !showFilmstrip ? "max-h-[90vh]" : "max-h-[78vh]"
                    } object-contain rounded-lg shadow-[0_20px_70px_rgba(0,0,0,0.85)] ring-1 ring-white/10 transition-all`}
                    draggable={false}
                  />
                )}
              </div>

              {/* Tarjeta Flotante Plegable con la Nota de Retoque del Cliente */}
              {hasCurrentNote && !hideLightboxUI && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-4 left-4 sm:left-6 z-40 max-w-md rounded-2xl bg-[#17130e]/95 border border-amber-500/60 shadow-2xl backdrop-blur-xl p-3.5 text-xs text-[#f5f2eb] animate-in fade-in slide-in-from-bottom-2"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-amber-400 font-bold">
                      <MessageSquare className="w-3.5 h-3.5 fill-current" />
                      <span>{t.clientNoteLabel}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsNoteExpanded(prev => !prev)}
                      className="text-[10px] text-amber-300/80 hover:text-amber-200 underline cursor-pointer"
                    >
                      {isNoteExpanded ? "Minimizar" : "Ver nota"}
                    </button>
                  </div>
                  {isNoteExpanded && (
                    <p className="mt-1.5 italic text-amber-100 leading-relaxed font-sans text-xs">
                      &quot;{currentAsset.client_notes}&quot;
                    </p>
                  )}
                </div>
              )}

              {/* Indicador de Atajos / Zoom en la esquina inferior derecha del lienzo */}
              {!hideLightboxUI && !isCurrentVideo && (
                <div className="hidden lg:flex items-center gap-2 absolute bottom-3 right-5 z-30 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-[10px] text-white/55 pointer-events-none">
                  <span>Rueda / Doble clic: Zoom</span>
                  <span>•</span>
                  <span>P: Compartir</span>
                  <span>•</span>
                  <span>F: Pantalla completa</span>
                  <span>•</span>
                  <span>Tab: Modo limpio</span>
                </div>
              )}

              {/* Flecha Siguiente */}
              {!hideLightboxUI && (
                <button 
                  type="button"
                  className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 p-3 sm:p-3.5 rounded-full bg-black/60 hover:bg-[#c69f68] text-white hover:text-[#0b0a09] border border-white/15 transition-all z-40 disabled:opacity-15 disabled:pointer-events-none cursor-pointer shadow-2xl hover:scale-105 active:scale-95"
                  onClick={(e) => {
                    e.stopPropagation()
                    setLightboxIndex(prev => prev !== null && prev < currentList.length - 1 ? prev + 1 : prev)
                  }}
                  disabled={lightboxIndex === currentList.length - 1}
                  title="Siguiente (→)"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}
            </div>

            {/* Carrusel Inferior de Miniaturas (Filmstrip Pro con indicadores de estado) */}
            {!hideLightboxUI && showFilmstrip && (
              <div className="h-20 px-4 py-2 border-t border-white/10 bg-black/75 backdrop-blur-xl z-40 flex items-center justify-center shrink-0">
                <div 
                  ref={filmstripRef}
                  className="flex items-center gap-2 overflow-x-auto max-w-6xl w-full h-full px-2 no-scrollbar scroll-smooth"
                >
                  {currentList.map((thumbAsset, idx) => {
                    const isActive = idx === lightboxIndex
                    const thumbSelected = isAssetSelected(thumbAsset)
                    const thumbHasNote = Boolean(thumbAsset.client_notes && thumbAsset.client_notes.trim().length > 0)
                    return (
                      <button
                        key={thumbAsset.id || idx}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setLightboxIndex(idx)
                        }}
                        className={`relative shrink-0 h-14 w-14 sm:w-18 rounded-lg overflow-hidden transition-all duration-200 cursor-pointer ${
                          isActive 
                            ? "ring-2 ring-[#c69f68] scale-105 opacity-100 shadow-lg shadow-[#c69f68]/30" 
                            : thumbSelected
                            ? "ring-1 ring-[#c69f68]/60 opacity-75 hover:opacity-100"
                            : "opacity-45 hover:opacity-85"
                        }`}
                      >
                        <img 
                          src={thumbAsset.preview_url || ""} 
                          alt={thumbAsset.filename || ""} 
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        {/* Indicadores rápidos en cada miniatura */}
                        <div className="absolute top-1 right-1 flex items-center gap-0.5">
                          {thumbHasNote && (
                            <span className="w-2 h-2 rounded-full bg-amber-400 ring-1 ring-black" title={t.withNoteBadge} />
                          )}
                          {thumbSelected && (
                            <span className="w-2 h-2 rounded-full bg-[#c69f68] ring-1 ring-black" title={t.inBookBadge} />
                          )}
                          {thumbAsset.is_shared && (
                            <span className="w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-black" title={t.sharedStatus} />
                          )}
                        </div>
                        {thumbAsset.asset_type.includes("video") && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <Play className="w-3.5 h-3.5 text-white drop-shadow" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}
