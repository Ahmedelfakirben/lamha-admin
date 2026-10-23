"use client"

import React, { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase"
import { 
  ArrowLeft, 
  ChevronRight, 
  X, 
  Image as ImageIcon, 
  Eye, 
  EyeOff, 
  Share2, 
  Check, 
  RotateCw, 
  Play, 
  CheckCircle2,
  Sparkles,
  Layers
} from "lucide-react"
import { toggleAssetSharedAction, bulkSetAssetsSharedAction } from "@/app/actions"

interface ProjectItem {
  id: string
  client_name: string
  category: string
  session_date: string
}

interface MediaItem {
  id: string
  filename: string
  preview_url: string | null
  client_selected?: boolean
  is_shared?: boolean
  asset_type?: string
}

export function MobileGalleryView() {
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null)
  
  // Media Assets of selected project
  const [photos, setPhotos] = useState<MediaItem[]>([])
  const [loadingPhotos, setLoadingPhotos] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  
  // Lightbox & Viewer
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [rotation, setRotation] = useState<number>(0)
  const filmstripRef = useRef<HTMLDivElement | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  // Cargar lista de proyectos
  useEffect(() => {
    async function fetchProjects() {
      const supabase = createClient()
      try {
        const { data } = await supabase
          .from("sessions")
          .select("id, client_name, category, session_date")
          .order("session_date", { ascending: false })

        if (data) setProjects(data)
      } catch (err) {
        console.error("Error cargando proyectos para galería:", err)
      } finally {
        setLoadingProjects(false)
      }
    }
    fetchProjects()
  }, [])

  // Cargar fotos cuando se selecciona un proyecto
  const handleSelectProject = async (proj: ProjectItem) => {
    setSelectedProject(proj)
    setLoadingPhotos(true)
    setPhotos([])

    const supabase = createClient()
    try {
      const { data } = await supabase
        .from("media_assets")
        .select("id, filename, preview_url, client_selected, is_shared, asset_type")
        .eq("session_id", proj.id)
        .order("created_at", { ascending: true })

      if (data) setPhotos(data)
    } catch (err) {
      console.error("Error cargando fotos de la sesión:", err)
    } finally {
      setLoadingPhotos(false)
    }
  }

  // Toggle compartir foto individual para que aparezca en el portal del cliente
  const handleToggleShare = async (photo: MediaItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (!selectedProject) return

    const nextState = !photo.is_shared
    // Optimistic UI update
    setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, is_shared: nextState } : p))

    try {
      const res = await toggleAssetSharedAction(photo.id, nextState, selectedProject.id)
      if (res.success) {
        showToast(nextState ? "Foto visible en el portal cliente" : "Foto oculta al cliente")
      } else {
        // Rollback
        setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, is_shared: !nextState } : p))
        showToast("Error al cambiar visibilidad")
      }
    } catch {
      setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, is_shared: !nextState } : p))
    }
  }

  // Compartir o Descompartir todas las fotos del proyecto
  const handleBulkShare = async (shouldShare: boolean) => {
    if (!selectedProject || photos.length === 0) return
    const ids = photos.map(p => p.id)

    setPhotos(prev => prev.map(p => ({ ...p, is_shared: shouldShare })))
    showToast(shouldShare ? "Compartiendo todas con cliente..." : "Ocultando fotos...")

    try {
      const res = await bulkSetAssetsSharedAction(ids, shouldShare, selectedProject.id)
      if (res.success) {
        showToast(shouldShare ? `¡${photos.length} fotos compartidas con el cliente!` : "Fotos ocultas del portal")
      }
    } catch {
      showToast("Error en lote")
    }
  }

  // Reset rotation al cambiar de foto
  useEffect(() => {
    setRotation(0)
  }, [lightboxIndex])

  // Centrar miniatura activa en el filmstrip inferior
  useEffect(() => {
    if (lightboxIndex !== null && filmstripRef.current) {
      const activeThumb = filmstripRef.current.children[lightboxIndex] as HTMLElement
      if (activeThumb) {
        activeThumb.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })
      }
    }
  }, [lightboxIndex])

  const sharedCount = photos.filter(p => p.is_shared).length

  // =========================================================================
  // VISTA 2: Galería de Fotos del Proyecto Seleccionado
  // =========================================================================
  if (selectedProject) {
    return (
      <div className="md:hidden flex flex-col space-y-3 pb-24">
        {/* Toast Notificación flotante */}
        {toastMessage && (
          <div className="fixed top-4 left-4 right-4 z-[120] p-3 rounded-xl bg-[#c69f68] text-[#0b0a09] font-bold text-xs shadow-2xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
            <span>{toastMessage}</span>
            <button onClick={() => setToastMessage(null)} className="text-black/60">✕</button>
          </div>
        )}

        {/* Barra Superior con botón Volver y Acciones de Compartir */}
        <div className="flex items-center gap-2.5 bg-[#141210] p-3 rounded-2xl border border-[#26211c]">
          <button
            type="button"
            onClick={() => {
              setSelectedProject(null)
              setPhotos([])
            }}
            className="p-2 rounded-xl bg-[#201c18] text-[#c69f68] hover:text-[#f5f2eb] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold font-serif text-[#f5f2eb] truncate">
              {selectedProject.client_name}
            </h3>
            <div className="flex items-center gap-1.5 text-[10px] text-[#8c7a6b]">
              <span>{photos.length} fotos</span>
              <span>•</span>
              <span className="text-emerald-400 font-semibold">{sharedCount} compartidas</span>
            </div>
          </div>

          {/* Botones de acción rápida: Compartir Todas */}
          {photos.length > 0 && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => handleBulkShare(sharedCount !== photos.length)}
                className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  sharedCount === photos.length
                    ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                    : "bg-[#c69f68]/15 border border-[#c69f68]/40 text-[#c69f68]"
                }`}
                title="Compartir o des-compartir todas con cliente"
              >
                <Share2 className="w-3 h-3" />
                <span>{sharedCount === photos.length ? "Ocultar" : "Compartir Todo"}</span>
              </button>
            </div>
          )}
        </div>

        {/* Guía explicativa para el teléfono */}
        <div className="px-3 py-2 rounded-xl bg-[#0b0a09] border border-[#221e1a] text-[11px] text-[#8c7a6b] flex items-center justify-between">
          <span>Toca el ojo <Eye className="w-3 h-3 inline text-emerald-400 mx-0.5" /> para mostrar u ocultar cada foto en el portal cliente.</span>
        </div>

        {/* Cuadrícula de Fotos (3 Columnas) */}
        {loadingPhotos ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-2 border-[#c69f68] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span className="text-xs text-[#8c7a6b]">Cargando galería...</span>
          </div>
        ) : photos.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#141210]/60 border border-[#26211c] text-center space-y-2">
            <ImageIcon className="w-8 h-8 text-[#70665a] mx-auto opacity-50" />
            <p className="text-xs text-[#70665a]">Este proyecto aún no tiene fotos cargadas.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo, idx) => {
              const url = photo.preview_url || `/api/media/preview?id=${photo.id}`
              const isShared = photo.is_shared

              return (
                <div
                  key={photo.id}
                  onClick={() => setLightboxIndex(idx)}
                  className={`aspect-square rounded-xl overflow-hidden bg-[#181512] border relative cursor-pointer active:scale-95 transition-all shadow-sm ${
                    isShared ? "border-emerald-500/40" : "border-[#26211c]"
                  }`}
                >
                  <img
                    src={url}
                    alt={photo.filename || "Foto"}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />

                  {/* Botón de Visibilidad / Compartir en el Portal Cliente */}
                  <button
                    type="button"
                    onClick={(e) => handleToggleShare(photo, e)}
                    className={`absolute top-1.5 right-1.5 p-1 rounded-full shadow-lg backdrop-blur-md transition-all cursor-pointer ${
                      isShared
                        ? "bg-emerald-500 text-black ring-2 ring-emerald-300"
                        : "bg-black/70 text-white/60 hover:text-white"
                    }`}
                    title={isShared ? "Compartida con cliente" : "Oculta al cliente"}
                  >
                    {isShared ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>

                  {/* Indicador de selección por el cliente */}
                  {photo.client_selected && (
                    <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-amber-500 text-black text-[9px] font-bold font-mono">
                      SELECCIÓN
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Lightbox / Visor de Pantalla Completa Mejorado (Estilo Teléfono) */}
        {lightboxIndex !== null && photos[lightboxIndex] && (
          <div className="fixed inset-0 z-[110] bg-black/95 flex flex-col justify-between backdrop-blur-xl animate-in fade-in select-none">
            {/* Header del Lightbox */}
            <div className="h-14 px-4 flex items-center justify-between border-b border-white/10 bg-black/40">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-mono font-bold text-white/80">
                  {lightboxIndex + 1} / {photos.length}
                </span>
                <span className="text-xs text-white/60 truncate max-w-[140px]">
                  {photos[lightboxIndex].filename}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Botón Rotar */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setRotation(prev => (prev + 90) % 360)
                  }}
                  className="p-2 rounded-xl bg-white/10 text-[#c69f68] hover:bg-white/20 transition-colors"
                  title="Rotar Foto"
                >
                  <RotateCw className="w-4 h-4" />
                </button>

                {/* Botón Toggle Compartir en el propio Lightbox */}
                <button
                  type="button"
                  onClick={(e) => handleToggleShare(photos[lightboxIndex], e)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    photos[lightboxIndex].is_shared
                      ? "bg-emerald-500 text-black"
                      : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  {photos[lightboxIndex].is_shared ? (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>Compartida</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Compartir</span>
                    </>
                  )}
                </button>

                {/* Cerrar Visor */}
                <button
                  type="button"
                  onClick={() => setLightboxIndex(null)}
                  className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Imagen Principal con Rotación */}
            <div className="flex-1 flex items-center justify-center p-3 relative overflow-hidden">
              <div 
                className="w-full h-full flex items-center justify-center transition-transform duration-300 ease-out"
                style={{ transform: `rotate(${rotation}deg)` }}
              >
                <img
                  src={photos[lightboxIndex].preview_url || `/api/media/preview?id=${photos[lightboxIndex].id}`}
                  alt={photos[lightboxIndex].filename}
                  className="max-h-[66vh] max-w-full object-contain rounded-xl shadow-2xl"
                  draggable={false}
                />
              </div>
            </div>

            {/* Carrusel Inferior de Fotos Pequeñas (Galería de Teléfono) */}
            <div className="h-20 px-3 py-2 border-t border-white/10 bg-black/60 flex items-center justify-center">
              <div 
                ref={filmstripRef}
                className="flex items-center gap-2 overflow-x-auto w-full h-full no-scrollbar scroll-smooth"
              >
                {photos.map((thumb, idx) => {
                  const isActive = idx === lightboxIndex
                  return (
                    <button
                      key={thumb.id || idx}
                      type="button"
                      onClick={() => setLightboxIndex(idx)}
                      className={`relative shrink-0 h-14 w-14 rounded-lg overflow-hidden transition-all cursor-pointer ${
                        isActive 
                          ? "ring-2 ring-[#c69f68] scale-105 opacity-100 shadow-lg shadow-[#c69f68]/30" 
                          : "opacity-40 hover:opacity-80"
                      }`}
                    >
                      <img 
                        src={thumb.preview_url || `/api/media/preview?id=${thumb.id}`} 
                        alt="" 
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {thumb.is_shared && (
                        <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-black" />
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

  // =========================================================================
  // VISTA 1: Lista Simple de Nombres de Proyectos
  // =========================================================================
  return (
    <div className="md:hidden flex flex-col space-y-3 pb-24">
      <div className="px-1 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold font-serif text-[#f5f2eb]">Galería de Proyectos</h3>
          <p className="text-xs text-[#8c7a6b]">Selecciona un proyecto para gestionar sus fotos</p>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-[#1c1815] border border-[#2e261f] text-[11px] font-mono text-[#c69f68] font-bold">
          {projects.length} proyectos
        </span>
      </div>

      {loadingProjects ? (
        <div className="p-12 text-center">
          <div className="w-8 h-8 border-2 border-[#c69f68] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <span className="text-xs text-[#8c7a6b]">Cargando proyectos...</span>
        </div>
      ) : projects.length === 0 ? (
        <div className="p-6 rounded-2xl bg-[#141210]/60 border border-[#26211c] text-center">
          <p className="text-xs text-[#70665a]">No hay proyectos disponibles.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {projects.map((proj) => (
            <div
              key={proj.id}
              onClick={() => handleSelectProject(proj)}
              className="p-3.5 rounded-2xl bg-[#141210] border border-[#26211c] flex items-center justify-between gap-3 active:scale-[0.98] transition-all cursor-pointer shadow-md"
            >
              <div className="min-w-0">
                <h4 className="text-sm font-bold font-serif text-[#f5f2eb] truncate">
                  {proj.client_name}
                </h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] uppercase tracking-wider text-[#c69f68] font-mono font-semibold">
                    {proj.category || "Sesión"}
                  </span>
                  {proj.session_date && (
                    <span className="text-[10px] text-[#70665a] font-mono">
                      • {proj.session_date.split("T")[0]}
                    </span>
                  )}
                </div>
              </div>

              <div className="w-8 h-8 rounded-xl bg-[#1c1815] border border-[#26211c] flex items-center justify-center text-[#c69f68] shrink-0">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
