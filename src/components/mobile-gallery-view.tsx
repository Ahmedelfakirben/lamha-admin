"use client"

import React, { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import { ArrowLeft, ChevronRight, X, Image as ImageIcon } from "lucide-react"

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
}

export function MobileGalleryView() {
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null)
  
  // Media Assets of selected project
  const [photos, setPhotos] = useState<MediaItem[]>([])
  const [loadingPhotos, setLoadingPhotos] = useState(false)
  
  // Lightbox
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  // Cargar lista de proyectos
  useEffect(() => {
    async function fetchProjects() {
      const supabase = createClient()
      try {
        const { data, error } = await supabase
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
      const { data, error } = await supabase
        .from("media_assets")
        .select("id, filename, preview_url, client_selected")
        .eq("session_id", proj.id)
        .order("created_at", { ascending: true })

      if (data) setPhotos(data)
    } catch (err) {
      console.error("Error cargando fotos de la sesión:", err)
    } finally {
      setLoadingPhotos(false)
    }
  }

  // Vista 2: Galería de Fotos del Proyecto Seleccionado
  if (selectedProject) {
    return (
      <div className="md:hidden flex flex-col space-y-4 pb-24">
        {/* Barra Superior con botón Volver */}
        <div className="flex items-center gap-3 bg-[#141210] p-3 rounded-2xl border border-[#26211c]">
          <button
            type="button"
            onClick={() => {
              setSelectedProject(null)
              setPhotos([])
            }}
            className="p-2 rounded-xl bg-[#201c18] text-[#c69f68] hover:text-[#f5f2eb] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold font-serif text-[#f5f2eb] truncate">
              {selectedProject.client_name}
            </h3>
            <span className="text-[10px] text-[#c69f68] uppercase font-mono font-semibold">
              {selectedProject.category || "Galería"} • {photos.length} fotos
            </span>
          </div>
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
              return (
                <div
                  key={photo.id}
                  onClick={() => setLightboxIndex(idx)}
                  className="aspect-square rounded-xl overflow-hidden bg-[#181512] border border-[#26211c] relative cursor-pointer active:scale-95 transition-all shadow-sm"
                >
                  <img
                    src={url}
                    alt={photo.filename || "Foto"}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {photo.client_selected && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-[#0b0a09]" />
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Lightbox / Visor de Pantalla Completa */}
        {lightboxIndex !== null && photos[lightboxIndex] && (
          <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-4 backdrop-blur-md">
            {/* Header del Lightbox */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-mono text-[#a89f91]">
                {lightboxIndex + 1} / {photos.length}
              </span>
              <button
                type="button"
                onClick={() => setLightboxIndex(null)}
                className="p-2 rounded-full bg-[#1c1815] text-[#f5f2eb] hover:bg-[#2c2620]"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Imagen Principal */}
            <div className="flex-1 flex items-center justify-center p-2">
              <img
                src={photos[lightboxIndex].preview_url || `/api/media/preview?id=${photos[lightboxIndex].id}`}
                alt={photos[lightboxIndex].filename}
                className="max-h-[75vh] max-w-full object-contain rounded-xl shadow-2xl"
              />
            </div>

            {/* Navegación Inferior */}
            <div className="flex items-center justify-between pb-6 px-4">
              <button
                type="button"
                disabled={lightboxIndex === 0}
                onClick={() => setLightboxIndex(prev => (prev !== null && prev > 0 ? prev - 1 : prev))}
                className="px-4 py-2 rounded-xl bg-[#1c1815] text-xs font-bold text-[#c69f68] disabled:opacity-30"
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={lightboxIndex === photos.length - 1}
                onClick={() => setLightboxIndex(prev => (prev !== null && prev < photos.length - 1 ? prev + 1 : prev))}
                className="px-4 py-2 rounded-xl bg-[#1c1815] text-xs font-bold text-[#c69f68] disabled:opacity-30"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Vista 1: Lista Simple de Nombres de Proyectos
  return (
    <div className="md:hidden flex flex-col space-y-3 pb-24">
      <div className="px-1">
        <h3 className="text-base font-bold font-serif text-[#f5f2eb]">Galería de Proyectos</h3>
        <p className="text-xs text-[#8c7a6b]">Selecciona un proyecto para ver sus fotos</p>
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
