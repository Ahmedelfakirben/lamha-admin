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
  Server,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X
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

  // Estado de la galería Lightbox avanzada
  const [rotation, setRotation] = useState<number>(0)
  const [zoom, setZoom] = useState<number>(1)
  const [openMenuAssetId, setOpenMenuAssetId] = useState<string | null>(null)
  const [isLightboxFolderMenuOpen, setIsLightboxFolderMenuOpen] = useState(false)
  const filmstripRef = useRef<HTMLDivElement | null>(null)

  // Reset rotation y zoom al cambiar de foto
  useEffect(() => {
    setRotation(0)
    setZoom(1)
  }, [lightboxIndex])

  // Centrar miniatura activa en el carrusel inferior
  useEffect(() => {
    if (lightboxIndex !== null && filmstripRef.current) {
      const activeThumb = filmstripRef.current.children[lightboxIndex] as HTMLElement
      if (activeThumb) {
        activeThumb.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })
      }
    }
  }, [lightboxIndex])

  // Navegación con teclado en Lightbox (flechas izq/der, escape, rotación 'r')
  useEffect(() => {
    if (lightboxIndex === null) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightboxIndex(null)
      } else if (e.key === "ArrowLeft") {
        setLightboxIndex(prev => prev !== null && prev > 0 ? prev - 1 : prev)
      } else if (e.key === "ArrowRight") {
        setLightboxIndex(prev => prev !== null && prev < currentList.length - 1 ? prev + 1 : prev)
      } else if (e.key === "r" || e.key === "R") {
        setRotation(prev => (prev + 90) % 360)
      } else if (e.key === "+" || e.key === "=") {
        setZoom(prev => Math.min(prev + 0.25, 3))
      } else if (e.key === "-") {
        setZoom(prev => Math.max(prev - 0.25, 0.5))
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [lightboxIndex, currentList.length])

  // Abrir archivo en Local (SSD) o NAS (FTP) comunicando con la app de escritorio o el servidor
  const handleOpenFile = async (nasPath: string, mode: "open_with" | "reveal" | "open", target: "local" | "nas" = "local") => {
    try {
      setOpenMenuAssetId(null)
      setIsLightboxFolderMenuOpen(false)

      const targetLabel = target === "nas" ? "NAS (Red ZTE)" : "Carpeta Local (SSD)"
      showNotification(`Abriendo en ${targetLabel}...`)

      // 0. Prioridad inmediata: Si estamos dentro de la App de Escritorio Electron
      if (typeof window !== "undefined" && window.desktopAdminAPI?.openLocalPath) {
        try {
          const res = await window.desktopAdminAPI.openLocalPath(nasPath)
          if (res.success) {
            showNotification(`Abierto en ${targetLabel}`)
            return
          }
        } catch {}
      }

      // 1. Intentar contactar al puente local HTTP del Companion (:41890)
      let desktopHandled = false
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 1200)

        const bridgeRes = await fetch("http://127.0.0.1:41890/open", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: nasPath, target, mode }),
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        if (bridgeRes.ok) {
          const bridgeData = await bridgeRes.json()
          if (bridgeData.ok) {
            showNotification(bridgeData.message || `Abierto en ${targetLabel}`)
            desktopHandled = true
          }
        }
      } catch (bridgeErr) {
        // App de escritorio no activa o bloqueada por timeout, continuar con fallback
      }

      if (desktopHandled) return

      // 2. Si es NAS y no hay app de escritorio, o si se desea abrir directamente desde el navegador:
      if (target === "nas") {
        let nasUrl = nasPath.startsWith("ftp://") 
          ? nasPath 
          : `ftp://192.168.11.1/usb1_1/Lamha-Storage/${nasPath.replace(/^[\\\/]/, "")}`
        if (/\.[a-zA-Z0-9]{2,5}$/.test(nasUrl)) {
          nasUrl = nasUrl.substring(0, nasUrl.lastIndexOf("/"))
        }
        window.open(nasUrl, "_blank")
        showNotification("Enlace FTP del NAS abierto en nueva pestaña")
        return
      }

      // 3. Fallback al servidor web Next.js API (/api/media/open-file)
      const res = await fetch("/api/media/open-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath: nasPath, mode })
      })
      const data = await res.json()
      if (data.success) {
        showNotification(data.message)
      } else {
        showNotification(`Aviso: ${data.error || "Asegúrate de que la App de Escritorio Lamha esté abierta"}`)
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

                    {/* Open With / Reveal in Folder (Local or NAS) */}
                    <div className="flex items-center gap-1 relative">
                      <button
                        type="button"
                        onClick={() => handleOpenFile(asset.nas_path, "open_with", "local")}
                        className="p-1.5 rounded-lg bg-[#181613] hover:bg-[#201c18] border border-[#26211c] text-[#a89f91] hover:text-[#c69f68] transition-colors cursor-pointer"
                        title={t.openWithApp}
                      >
                        <PenTool className="w-3.5 h-3.5" />
                      </button>

                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setOpenMenuAssetId(openMenuAssetId === asset.id ? null : asset.id)}
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

                        {/* Dropdown de opciones: Local SSD o NAS FTP */}
                        {openMenuAssetId === asset.id && (
                          <div 
                            className="absolute right-0 top-full mt-1.5 w-56 rounded-xl bg-[#171411] border border-[#383129] shadow-2xl z-40 py-1.5 text-xs animate-in fade-in zoom-in-95 backdrop-blur-xl"
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
                                <div className="text-[10px] text-[#8c7a6b]">Router ZTE (192.168.11.1)</div>
                              </div>
                            </button>
                          </div>
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

      {/* Lightbox Modal — Teléfono / Visor Pro Avanzado */}
      {lightboxIndex !== null && currentList[lightboxIndex] && (
        <div 
          className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-xl animate-in fade-in select-none"
          onClick={() => {
            if (openMenuAssetId) setOpenMenuAssetId(null)
            if (isLightboxFolderMenuOpen) setIsLightboxFolderMenuOpen(false)
          }}
        >
          {/* Header Superior del Visor */}
          <div className="h-16 px-4 sm:px-6 flex items-center justify-between border-b border-white/10 bg-black/40 backdrop-blur-md z-50">
            {/* Información del archivo */}
            <div className="flex items-center gap-3 min-w-0">
              <span className="px-2.5 py-1 rounded-md bg-white/10 text-white font-mono text-xs font-semibold tracking-wider">
                {lightboxIndex + 1} / {currentList.length}
              </span>
              <div className="truncate">
                <p className="text-white font-medium text-sm truncate max-w-[200px] sm:max-w-md">
                  {currentList[lightboxIndex].filename || t.unnamedFile}
                </p>
                {currentList[lightboxIndex].client_notes && (
                  <p className="text-amber-400 text-xs truncate max-w-[200px] sm:max-w-md flex items-center gap-1">
                    <MessageSquare className="w-3 h-3 shrink-0" />
                    <span>&quot;{currentList[lightboxIndex].client_notes}&quot;</span>
                  </p>
                )}
              </div>
            </div>

            {/* Barra de herramientas / Controles de imagen */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Botón Rotar */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setRotation(prev => (prev + 90) % 360)
                }}
                className="p-2 sm:px-3 sm:py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer border border-white/10"
                title={`${t.rotatePhoto} (R)`}
              >
                <RotateCw className="w-4 h-4 text-[#c69f68]" />
                <span className="hidden sm:inline">{t.rotatePhoto}</span>
                {rotation !== 0 && (
                  <span className="text-[10px] px-1 rounded bg-[#c69f68]/30 text-[#c69f68]">{rotation}°</span>
                )}
              </button>

              {/* Botón Zoom In */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setZoom(prev => Math.min(prev + 0.25, 3))
                }}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer border border-white/10 hidden sm:flex items-center justify-center"
                title={t.zoomIn}
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              {/* Botón Zoom Out */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setZoom(prev => Math.max(prev - 0.25, 0.5))
                }}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer border border-white/10 hidden sm:flex items-center justify-center"
                title={t.zoomOut}
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              {/* Reset Zoom / Rotación */}
              {(zoom !== 1 || rotation !== 0) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setZoom(1)
                    setRotation(0)
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-[#c69f68]/20 hover:bg-[#c69f68]/30 border border-[#c69f68]/40 text-[#c69f68] text-xs font-medium transition-colors cursor-pointer"
                  title={t.resetView}
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Botón Abrir Carpeta (Local vs NAS) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsLightboxFolderMenuOpen(!isLightboxFolderMenuOpen)
                  }}
                  className="p-2 sm:px-3 sm:py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer border border-white/10"
                  title={t.revealInFolder}
                >
                  <FolderOpen className="w-4 h-4 text-emerald-400" />
                  <span className="hidden md:inline">{t.revealInFolder}</span>
                  <ChevronDown className="w-3 h-3 opacity-70" />
                </button>

                {isLightboxFolderMenuOpen && (
                  <div 
                    className="absolute right-0 top-full mt-2 w-60 rounded-xl bg-[#171411] border border-[#383129] shadow-2xl z-50 py-1.5 text-xs animate-in fade-in zoom-in-95 backdrop-blur-2xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => handleOpenFile(currentList[lightboxIndex].nas_path, "reveal", "local")}
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
                      onClick={() => handleOpenFile(currentList[lightboxIndex].nas_path, "reveal", "nas")}
                      className="w-full px-3 py-2.5 text-left flex items-center gap-2.5 hover:bg-[#26211c] text-[#f5f2eb] transition-colors cursor-pointer border-t border-[#26211c]"
                    >
                      <Server className="w-4 h-4 text-sky-400" />
                      <div>
                        <div className="font-semibold">{t.openInNasFolder}</div>
                        <div className="text-[10px] text-[#8c7a6b]">Router ZTE FTP (192.168.11.1)</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Cerrar modal */}
              <button 
                type="button"
                className="p-2 sm:p-2.5 rounded-full bg-white/10 hover:bg-rose-500/20 hover:text-rose-400 text-white transition-colors cursor-pointer border border-white/10 ml-2"
                onClick={() => setLightboxIndex(null)}
                title="Cerrar (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Área Central: Visualizador Principal con Controles Laterales */}
          <div className="flex-1 relative flex items-center justify-center overflow-hidden p-4 sm:p-8">
            {/* Flecha Anterior */}
            <button 
              type="button"
              className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 p-3 sm:p-4 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/15 transition-all z-40 disabled:opacity-20 disabled:pointer-events-none cursor-pointer shadow-2xl hover:scale-105 active:scale-95"
              onClick={(e) => {
                e.stopPropagation()
                setLightboxIndex(prev => prev !== null && prev > 0 ? prev - 1 : prev)
              }}
              disabled={lightboxIndex === 0}
              title="Anterior (Flecha Izquierda)"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            {/* Contenedor de la Imagen / Video Central con Transformación CSS */}
            <div 
              className="w-full h-full flex items-center justify-center transition-transform duration-300 ease-out"
              style={{
                transform: `rotate(${rotation}deg) scale(${zoom})`,
              }}
            >
              {currentList[lightboxIndex].asset_type.includes("video") ? (
                <video 
                  src={currentList[lightboxIndex].preview_url || ""} 
                  controls 
                  autoPlay 
                  className="max-w-full max-h-[68vh] rounded-xl shadow-2xl ring-1 ring-white/15 object-contain"
                />
              ) : (
                <img 
                  src={currentList[lightboxIndex].preview_url || ""} 
                  alt={currentList[lightboxIndex].filename || "Preview"} 
                  className="max-w-full max-h-[68vh] object-contain rounded-xl shadow-2xl ring-1 ring-white/15"
                  draggable={false}
                />
              )}
            </div>

            {/* Flecha Siguiente */}
            <button 
              type="button"
              className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 p-3 sm:p-4 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/15 transition-all z-40 disabled:opacity-20 disabled:pointer-events-none cursor-pointer shadow-2xl hover:scale-105 active:scale-95"
              onClick={(e) => {
                e.stopPropagation()
                setLightboxIndex(prev => prev !== null && prev < currentList.length - 1 ? prev + 1 : prev)
              }}
              disabled={lightboxIndex === currentList.length - 1}
              title="Siguiente (Flecha Derecha)"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Carrusel Inferior de Fotos Pequeñas (Estilo Galería de Teléfono) */}
          <div className="h-24 px-4 py-2 border-t border-white/10 bg-black/70 backdrop-blur-md z-40 flex items-center justify-center">
            <div 
              ref={filmstripRef}
              className="flex items-center gap-2 overflow-x-auto max-w-5xl w-full h-full px-2 no-scrollbar scroll-smooth"
            >
              {currentList.map((thumbAsset, idx) => {
                const isActive = idx === lightboxIndex
                return (
                  <button
                    key={thumbAsset.id || idx}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setLightboxIndex(idx)
                    }}
                    className={`relative shrink-0 h-16 w-16 sm:w-20 rounded-lg overflow-hidden transition-all duration-200 cursor-pointer ${
                      isActive 
                        ? "ring-2 ring-[#c69f68] scale-105 opacity-100 shadow-lg shadow-[#c69f68]/20" 
                        : "opacity-40 hover:opacity-80 hover:scale-100"
                    }`}
                  >
                    <img 
                      src={thumbAsset.preview_url || ""} 
                      alt={thumbAsset.filename || ""} 
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {thumbAsset.client_notes && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400 ring-1 ring-black" />
                    )}
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
        </div>
      )}
    </div>
  )
}
