"use client"

import React, { useState, useEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  Camera,
  Calendar,
  KanbanSquare,
  Layers,
  Film,
  Users,
  MessageSquare,
  FolderTree,
  HardDrive,
  Settings,
  ArrowRight,
  Sparkles,
  X,
} from "lucide-react"
import { createClient } from "@/lib/supabase"
import { useLanguage } from "@/context/language-context"

interface QuickSessionItem {
  id: string
  client_name: string
  client_phone?: string | null
  category?: string | null
  session_date?: string | null
  status?: string | null
  portal_pin?: string | null
}

let cachedSessions: QuickSessionItem[] | null = null

export function HeaderSearchTrigger() {
  const [shortcutLabel] = useState("Ctrl+K")

  const openPalette = () => {
    window.dispatchEvent(new CustomEvent("lamha:open-command-palette"))
  }

  return (
    <button
      type="button"
      onClick={openPalette}
      style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      className="h-6 px-2.5 rounded-md bg-[#161310] hover:bg-[#c69f68]/15 border border-[#2c251f] hover:border-[#c69f68]/50 text-[#9c8e7f] hover:text-[#f5f2eb] text-[10.5px] font-medium flex items-center gap-2 transition-all cursor-pointer shadow-sm"
      title="Buscador rápido de proyectos y clientes (Ctrl+K)"
    >
      <Search className="w-3 h-3 text-[#c69f68]" />
      <span className="hidden md:inline">Buscar proyecto / cliente...</span>
      <kbd className="hidden sm:inline-block px-1 py-0.2 rounded bg-[#0b0a09] border border-[#2c251f] text-[9px] font-mono text-[#c69f68]">
        {shortcutLabel}
      </kbd>
    </button>
  )
}

export function GlobalCommandPalette() {
  const router = useRouter()
  const { language, t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [sessions, setSessions] = useState<QuickSessionItem[]>(cachedSessions || [])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const fetchSessions = async () => {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from("sessions")
        .select("id, client_name, client_phone, category, session_date, status, portal_pin")
        .order("session_date", { ascending: false })
        .limit(120)
      if (data) {
        cachedSessions = data as QuickSessionItem[]
        setSessions(cachedSessions)
      }
    } catch {}
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((prev) => !prev)
      } else if (e.key === "Escape" && open) {
        setOpen(false)
      }
    }
    const onCustomOpen = () => setOpen(true)

    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("lamha:open-command-palette", onCustomOpen)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("lamha:open-command-palette", onCustomOpen)
    }
  }, [open])

  useEffect(() => {
    if (open) {
      setQuery("")
      setSelectedIndex(0)
      fetchSessions()
      setTimeout(() => inputRef.current?.focus(), 40)
    }
  }, [open])

  const navActions = useMemo(
    () => [
      { id: "nav-projects", label: t.unifiedView || "Proyectos", href: "/projects", icon: Layers },
      { id: "nav-calendar", label: t.calendar || "Calendario", href: "/calendar", icon: Calendar },
      { id: "nav-planner", label: t.planner || "Planificador", href: "/planner", icon: KanbanSquare },
      { id: "nav-photos", label: t.photoSessions || "Sesiones de Fotos", href: "/photos", icon: Camera },
      { id: "nav-videos", label: t.videoProduction || "Producción de Vídeo", href: "/videos", icon: Film },
      { id: "nav-clients", label: t.clientDirectory || "Directorio de Clientes", href: "/clients", icon: Users },
      { id: "nav-chat", label: "WhatsApp Studio Chat", href: "/chat", icon: MessageSquare },
      { id: "nav-nas", label: t.nasStorage || "Almacenamiento NAS", href: "/nas", icon: HardDrive },
      { id: "nav-categories", label: t.categoriesMenu || "Categorías Web", href: "/categories", icon: FolderTree },
      { id: "nav-settings", label: t.settings || "Ajustes", href: "/settings", icon: Settings },
    ],
    [t]
  )

  const filteredSessions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sessions.slice(0, 8)
    return sessions
      .filter(
        (s) =>
          (s.client_name && s.client_name.toLowerCase().includes(q)) ||
          (s.client_phone && s.client_phone.toLowerCase().includes(q)) ||
          (s.category && s.category.toLowerCase().includes(q)) ||
          (s.session_date && s.session_date.toLowerCase().includes(q)) ||
          (s.portal_pin && s.portal_pin.toLowerCase().includes(q))
      )
      .slice(0, 10)
  }, [sessions, query])

  const filteredNav = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return navActions.slice(0, 5)
    return navActions.filter((n) => n.label.toLowerCase().includes(q))
  }, [navActions, query])

  const totalItems = filteredSessions.length + filteredNav.length

  const navigateTo = (href: string) => {
    setOpen(false)
    window.dispatchEvent(new CustomEvent("lamha:page-refresh-start"))
    router.push(href)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[9995] bg-black/75 backdrop-blur-md flex items-start justify-center pt-[12vh] px-4 animate-in fade-in duration-150 select-none"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-[#141210] border border-[#c69f68]/40 shadow-[0_25px_80px_rgba(0,0,0,0.9)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra de Búsqueda */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#26211c] bg-[#0e0c0a]">
          <Search className="w-4 h-4 text-[#c69f68] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault()
                setSelectedIndex((prev) => (totalItems > 0 ? (prev + 1) % totalItems : 0))
              } else if (e.key === "ArrowUp") {
                e.preventDefault()
                setSelectedIndex((prev) => (totalItems > 0 ? (prev - 1 + totalItems) % totalItems : 0))
              } else if (e.key === "Enter" && totalItems > 0) {
                e.preventDefault()
                if (selectedIndex < filteredSessions.length) {
                  const target = filteredSessions[selectedIndex]
                  if (target) navigateTo(`/sessions/${target.id}`)
                } else {
                  const navTarget = filteredNav[selectedIndex - filteredSessions.length]
                  if (navTarget) navigateTo(navTarget.href)
                }
              }
            }}
            placeholder={
              language === "fr"
                ? "Rechercher un client, projet, téléphone, date ou section..."
                : language === "ar"
                ? "ابحث عن عميل، مشروع، رقم هاتف أو قسم..."
                : language === "en"
                ? "Search client, project, phone, date or section..."
                : "Buscar cliente, proyecto, teléfono, fecha o sección..."
            }
            className="flex-1 bg-transparent text-sm text-[#f5f2eb] placeholder-[#70665a] outline-none"
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="p-1 rounded-lg hover:bg-white/10 text-[#8c7a6b] hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Resultados */}
        <div className="max-h-[60vh] overflow-y-auto p-2.5 space-y-3">
          {/* Proyectos / Clientes */}
          {filteredSessions.length > 0 && (
            <div>
              <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-[#c69f68] font-bold">
                {language === "fr" ? "Projets & Séances" : language === "ar" ? "المشاريع والجلسات" : "Proyectos y Sesiones"}
              </div>
              <div className="space-y-1 mt-1">
                {filteredSessions.map((s, idx) => {
                  const isFocused = idx === selectedIndex
                  return (
                    <div
                      key={s.id}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      onClick={() => navigateTo(`/sessions/${s.id}`)}
                      className={`px-3 py-2.5 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                        isFocused
                          ? "bg-[#c69f68]/20 border border-[#c69f68]/50 text-[#f5f2eb]"
                          : "hover:bg-[#1c1916] border border-transparent text-[#d6cec2]"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-[#0b0a09] border border-[#2c251f] flex items-center justify-center text-[#c69f68] shrink-0">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <div className="text-xs font-serif font-bold text-[#f5f2eb] truncate">
                            {s.client_name}
                          </div>
                          <div className="text-[10.5px] text-[#8c7a6b] flex items-center gap-2">
                            <span>{s.category || "Estudio"}</span>
                            {s.session_date && <span>• {s.session_date}</span>}
                            {s.client_phone && <span>• {s.client_phone}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#0b0a09] border border-[#2c251f] text-[#c69f68] font-mono">
                          Abrir Galería
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-[#c69f68]" />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Secciones Rápidas */}
          {filteredNav.length > 0 && (
            <div>
              <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-[#8c7a6b] font-bold">
                {language === "fr" ? "Navigation Rapide" : language === "ar" ? "التنقل السريع" : "Secciones del Estudio"}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-1">
                {filteredNav.map((nav, i) => {
                  const globalIdx = filteredSessions.length + i
                  const isFocused = globalIdx === selectedIndex
                  const Icon = nav.icon
                  return (
                    <button
                      key={nav.id}
                      type="button"
                      onMouseEnter={() => setSelectedIndex(globalIdx)}
                      onClick={() => navigateTo(nav.href)}
                      className={`px-3 py-2 rounded-xl flex items-center justify-between gap-2 text-left text-xs cursor-pointer transition-colors ${
                        isFocused
                          ? "bg-[#c69f68]/20 border border-[#c69f68]/50 text-[#f5f2eb]"
                          : "hover:bg-[#1c1916] border border-transparent text-[#a89f91]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Icon className="w-3.5 h-3.5 text-[#c69f68] shrink-0" />
                        <span className="truncate font-medium">{nav.label}</span>
                      </div>
                      <ArrowRight className="w-3 h-3 opacity-60 shrink-0" />
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer de ayuda */}
        <div className="px-4 py-2 border-t border-[#26211c] bg-[#0b0a09] flex items-center justify-between text-[10px] text-[#70665a]">
          <span>↑↓ para moverte • Enter para abrir • Esc para cerrar</span>
          <span className="text-[#c69f68]">Lam7a Spotlight</span>
        </div>
      </div>
    </div>
  )
}

