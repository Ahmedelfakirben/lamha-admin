"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase"
import { 
  updateSessionPlannerStage, 
  addSessionComment, 
  updateSessionNotes 
} from "@/app/actions"
import { 
  parseNotesIntoEntries, 
  NoteEntry 
} from "@/components/project-notes-history"
import { 
  KanbanSquare, 
  Camera, 
  Film, 
  Search, 
  Plus, 
  Sparkles, 
  Globe, 
  CheckCircle2, 
  Clock, 
  CheckCheck, 
  MessageSquare, 
  MessageSquarePlus, 
  ChevronRight, 
  X, 
  ExternalLink, 
  Copy, 
  Check, 
  ArrowRightLeft, 
  User, 
  Phone, 
  Mail, 
  Calendar as CalendarIcon, 
  Tag,
  RefreshCw,
  Send
} from "lucide-react"
import { format } from "date-fns"
import { fr, es, enUS } from "date-fns/locale"
import { SessionDialog } from "@/components/session-dialog"
import { useLanguage } from "@/context/language-context"
import Link from "next/link"

export type PlannerStage = 
  | "shooting" 
  | "editing" 
  | "shared" 
  | "client_selected" 
  | "ready_delivery" 
  | "delivered"

interface StageColumnDef {
  id: PlannerStage
  label: string
  subLabel: string
  badgeColor: string
  borderColor: string
  headerBg: string
  dotColor: string
  cardAccentBorder: string
  icon: any
}

const STAGE_COLUMNS: StageColumnDef[] = [
  {
    id: "shooting",
    label: "Shooting",
    subLabel: "Prise de vue & Tournage",
    badgeColor: "text-purple-400 bg-purple-500/10 border-purple-500/30",
    borderColor: "border-purple-500/30",
    headerBg: "bg-gradient-to-r from-purple-950/40 to-transparent",
    dotColor: "bg-purple-400",
    cardAccentBorder: "border-l-purple-500",
    icon: Camera,
  },
  {
    id: "editing",
    label: "Editing",
    subLabel: "Retouche & Montage",
    badgeColor: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    borderColor: "border-amber-500/30",
    headerBg: "bg-gradient-to-r from-amber-950/40 to-transparent",
    dotColor: "bg-amber-400",
    cardAccentBorder: "border-l-amber-500",
    icon: Sparkles,
  },
  {
    id: "shared",
    label: "Shared",
    subLabel: "Galerie Espace Privé",
    badgeColor: "text-sky-400 bg-sky-500/10 border-sky-500/30",
    borderColor: "border-sky-500/30",
    headerBg: "bg-gradient-to-r from-sky-950/40 to-transparent",
    dotColor: "bg-sky-400",
    cardAccentBorder: "border-l-sky-500",
    icon: Globe,
  },
  {
    id: "client_selected",
    label: "Sélection client",
    subLabel: "Choix validé",
    badgeColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    borderColor: "border-emerald-500/30",
    headerBg: "bg-gradient-to-r from-emerald-950/40 to-transparent",
    dotColor: "bg-emerald-400",
    cardAccentBorder: "border-l-emerald-500",
    icon: CheckCircle2,
  },
  {
    id: "ready_delivery",
    label: "Pendientes de entrega",
    subLabel: "Prêt pour livraison",
    badgeColor: "text-rose-400 bg-rose-500/10 border-rose-500/30",
    borderColor: "border-rose-500/30",
    headerBg: "bg-gradient-to-r from-rose-950/40 to-transparent",
    dotColor: "bg-rose-400",
    cardAccentBorder: "border-l-rose-500",
    icon: Clock,
  },
  {
    id: "delivered",
    label: "Entregados",
    subLabel: "Livrés & Clôturés",
    badgeColor: "text-[#c69f68] bg-[#c69f68]/10 border-[#c69f68]/30",
    borderColor: "border-[#c69f68]/30",
    headerBg: "bg-gradient-to-r from-[#c69f68]/20 to-transparent",
    dotColor: "bg-[#c69f68]",
    cardAccentBorder: "border-l-[#c69f68]",
    icon: CheckCheck,
  },
]

export function getSessionPlannerStage(session: any): PlannerStage {
  if (session.pipeline_stage && ["shooting", "editing", "shared", "client_selected", "ready_delivery", "delivered"].includes(session.pipeline_stage)) {
    return session.pipeline_stage as PlannerStage
  }
  if (session.tags && Array.isArray(session.tags)) {
    const stageTag = session.tags.find((t: string) => t.startsWith("stage:"))
    if (stageTag) {
      const parsed = stageTag.replace("stage:", "") as PlannerStage
      if (["shooting", "editing", "shared", "client_selected", "ready_delivery", "delivered"].includes(parsed)) {
        return parsed
      }
    }
  }
  if (session.status === "delivered") return "delivered"
  if (session.status === "edited") return "ready_delivery"
  if (session.selected_assets && session.selected_assets.length > 0) return "client_selected"
  if (session.media_assets && session.media_assets.some((a: any) => a.is_shared)) return "shared"
  if (session.status === "editing") return "editing"
  return "shooting"
}

export default function PlannerPage() {
  const { t, language } = useLanguage()
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<"all" | "photo" | "video">("all")

  // Drag and drop state
  const [draggedSessionId, setDraggedSessionId] = useState<string | null>(null)
  const [dragOverStage, setDragOverStage] = useState<PlannerStage | null>(null)

  // Drawer / Modal for ticket details & comments
  const [activeTicket, setActiveTicket] = useState<any | null>(null)
  const [newCommentText, setNewCommentText] = useState("")
  const [submittingComment, setSubmittingComment] = useState(false)
  const [copiedPin, setCopiedPin] = useState(false)

  const dateLocale = language === "es" ? es : language === "fr" ? fr : enUS

  const loadSessions = async () => {
    const supabase = createClient()
    try {
      const { data, error } = await supabase
        .from("sessions")
        .select("*, media_assets(*), media_deliveries(*)")
        .order("session_date", { ascending: false })

      if (error) throw error
      setSessions(data || [])
    } catch (err) {
      console.error("Erreur chargement sessions planner:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSessions()
  }, [])

  // Synchronize activeTicket if session list updates
  useEffect(() => {
    if (activeTicket) {
      const updated = sessions.find((s) => s.id === activeTicket.id)
      if (updated) {
        setActiveTicket(updated)
      }
    }
  }, [sessions])

  // Move ticket stage handler
  const handleMoveStage = async (sessionId: string, newStage: PlannerStage) => {
    // 1. Optimistic UI update
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== sessionId) return s
        const currentTags = Array.isArray(s.tags) ? s.tags : []
        const filteredTags = currentTags.filter((t: string) => !t.startsWith("stage:"))
        return {
          ...s,
          tags: [...filteredTags, `stage:${newStage}`],
          pipeline_stage: newStage,
        }
      })
    )

    if (activeTicket && activeTicket.id === sessionId) {
      setActiveTicket((prev: any) => ({
        ...prev,
        pipeline_stage: newStage,
      }))
    }

    // 2. Persist to server
    try {
      await updateSessionPlannerStage(sessionId, newStage)
    } catch (err) {
      console.error("Erreur déplacement étape planner:", err)
      loadSessions() // Revert on failure
    }
  }

  // Handle Drag & Drop
  const handleDragStart = (e: React.DragEvent, sessionId: string) => {
    setDraggedSessionId(sessionId)
    e.dataTransfer.setData("text/plain", sessionId)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent, stage: PlannerStage) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    if (dragOverStage !== stage) {
      setDragOverStage(stage)
    }
  }

  const handleDragLeave = (e: React.DragEvent, stage: PlannerStage) => {
    if (dragOverStage === stage) {
      setDragOverStage(null)
    }
  }

  const handleDrop = (e: React.DragEvent, stage: PlannerStage) => {
    e.preventDefault()
    setDragOverStage(null)
    const sessionId = e.dataTransfer.getData("text/plain") || draggedSessionId
    if (sessionId) {
      handleMoveStage(sessionId, stage)
    }
    setDraggedSessionId(null)
  }

  // Handle Add Comment
  const handleAddComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!newCommentText.trim() || !activeTicket) return

    setSubmittingComment(true)
    const textToSubmit = newCommentText.trim()

    const now = new Date()
    const pad = (n: number) => n.toString().padStart(2, "0")
    const timestampStr = `[${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}]`
    const formattedEntry = `${timestampStr} ${textToSubmit}`

    const existing = activeTicket.comments ? activeTicket.comments.trim() : ""
    const updatedComments = existing ? `${formattedEntry}\n\n${existing}` : formattedEntry

    // Optimistic update
    setSessions((prev) =>
      prev.map((s) => (s.id === activeTicket.id ? { ...s, comments: updatedComments } : s))
    )
    setActiveTicket((prev: any) => ({ ...prev, comments: updatedComments }))
    setNewCommentText("")

    try {
      const res = await addSessionComment(activeTicket.id, textToSubmit)
      if (!res.success) {
        console.error("Erreur enregistrement commentaire:", res.error)
      }
    } catch (err) {
      console.error("Erreur submission commentaire:", err)
    } finally {
      setSubmittingComment(false)
    }
  }

  // Filtered Sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const matchSearch =
        search === "" ||
        s.client_name?.toLowerCase().includes(search.toLowerCase()) ||
        s.category?.toLowerCase().includes(search.toLowerCase()) ||
        s.portal_pin?.includes(search) ||
        (s.comments && s.comments.toLowerCase().includes(search.toLowerCase())) ||
        (s.tags && s.tags.some((t: string) => t.toLowerCase().includes(search.toLowerCase())))

      const matchType = typeFilter === "all" || s.session_type === typeFilter

      return matchSearch && matchType
    })
  }, [sessions, search, typeFilter])

  // Group into columns
  const columnSessions = useMemo(() => {
    const map: Record<PlannerStage, any[]> = {
      shooting: [],
      editing: [],
      shared: [],
      client_selected: [],
      ready_delivery: [],
      delivered: [],
    }

    filteredSessions.forEach((s) => {
      const stage = getSessionPlannerStage(s)
      if (map[stage]) {
        map[stage].push(s)
      } else {
        map.shooting.push(s)
      }
    })

    return map
  }, [filteredSessions])

  const copyPinToClipboard = (pin: string) => {
    navigator.clipboard.writeText(pin)
    setCopiedPin(true)
    setTimeout(() => setCopiedPin(false), 2000)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] select-none">
      {/* Top Header Bar */}
      <div className="shrink-0 pb-4 mb-4 border-b border-[#26211c] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-xl bg-[#c69f68]/10 text-[#c69f68] border border-[#c69f68]/20 shadow-sm">
              <KanbanSquare className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#f5f2eb] tracking-tight">
                {t.plannerTitle || "Tickets Planner de Projets"}
              </h1>
              <p className="text-xs text-[#a89f91]">
                {t.plannerSubtitle || "Tableau visuel de production, étapes de livraison et suivi des notes par projet."}
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Bar */}
          <div className="relative min-w-[200px] md:min-w-[240px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#70665a]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher client, note, PIN..."
              className="w-full bg-[#141210] border border-[#26211c] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#f5f2eb] placeholder-[#70665a] focus:outline-none focus:border-[#c69f68] transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#70665a] hover:text-[#f5f2eb]"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Type Filter Pills */}
          <div className="flex items-center rounded-xl bg-[#141210] border border-[#26211c] p-1 text-xs">
            <button
              onClick={() => setTypeFilter("all")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                typeFilter === "all"
                  ? "bg-[#c69f68] text-[#0b0a09] font-bold shadow-sm"
                  : "text-[#a89f91] hover:text-[#f5f2eb]"
              }`}
            >
              Tous ({sessions.length})
            </button>
            <button
              onClick={() => setTypeFilter("photo")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
                typeFilter === "photo"
                  ? "bg-[#c69f68] text-[#0b0a09] font-bold shadow-sm"
                  : "text-[#a89f91] hover:text-[#f5f2eb]"
              }`}
            >
              <Camera className="w-3 h-3" />
              Photos
            </button>
            <button
              onClick={() => setTypeFilter("video")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
                typeFilter === "video"
                  ? "bg-[#c69f68] text-[#0b0a09] font-bold shadow-sm"
                  : "text-[#a89f91] hover:text-[#f5f2eb]"
              }`}
            >
              <Film className="w-3 h-3" />
              Vidéos
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => {
              setLoading(true)
              loadSessions()
            }}
            title="Rafraîchir"
            className="p-2 rounded-xl bg-[#141210] border border-[#26211c] text-[#a89f91] hover:text-[#c69f68] hover:border-[#c69f68]/30 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#c69f68]" : ""}`} />
          </button>
        </div>
      </div>

      {/* 6 Vertical Microsoft Planner Columns */}
      <div className="flex-1 overflow-x-auto pb-4 custom-scrollbar">
        <div className="flex gap-4 h-full items-stretch min-w-max pr-6">
          {STAGE_COLUMNS.map((col) => {
            const items = columnSessions[col.id] || []
            const isTarget = dragOverStage === col.id
            const Icon = col.icon

            return (
              <div
                key={col.id}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={(e) => handleDragLeave(e, col.id)}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`w-[295px] shrink-0 flex flex-col rounded-2xl border transition-all duration-200 ${
                  isTarget
                    ? `${col.borderColor} bg-[#1f1b17] shadow-2xl ring-2 ring-[#c69f68]/40 scale-[1.01]`
                    : "border-[#26211c] bg-[#12100e]/85 hover:border-[#383129]"
                }`}
              >
                {/* Column Header */}
                <div className={`p-3.5 rounded-t-2xl border-b border-[#26211c] ${col.headerBg} flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${col.dotColor}`} />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[#f5f2eb] tracking-wide">
                          {col.label}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#1e1a16] border border-[#332b23] text-[#c69f68] font-bold">
                          {items.length}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#70665a] block truncate">
                        {col.subLabel}
                      </span>
                    </div>
                  </div>
                  <Icon className="w-4 h-4 text-[#70665a]" />
                </div>

                {/* Tickets List Area */}
                <div className="flex-1 p-2.5 space-y-2.5 overflow-y-auto custom-scrollbar">
                  {items.length === 0 ? (
                    <div
                      className={`h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-3 text-center transition-colors ${
                        isTarget
                          ? "border-[#c69f68] bg-[#c69f68]/5 text-[#c69f68]"
                          : "border-[#26211c]/60 text-[#5a5247]"
                      }`}
                    >
                      <span className="text-[11px] font-medium">Glisser un ticket ici</span>
                    </div>
                  ) : (
                    items.map((session) => {
                      const isDragging = draggedSessionId === session.id
                      const noteEntries = parseNotesIntoEntries(session.comments || "")
                      const commentCount = noteEntries.length
                      const latestNote = noteEntries[0]
                      const sharedCount = session.media_assets?.filter((a: any) => a.is_shared).length || 0
                      const selectedCount = session.selected_assets?.length || 0

                      return (
                        <div
                          key={session.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, session.id)}
                          onClick={() => setActiveTicket(session)}
                          className={`group relative p-3.5 rounded-xl border border-l-4 ${col.cardAccentBorder} transition-all duration-200 cursor-pointer ${
                            isDragging
                              ? "opacity-30 border-[#c69f68] bg-[#2a241f]"
                              : "border-t-[#28231e] border-r-[#28231e] border-b-[#28231e] bg-[#181512] hover:bg-[#201c18] hover:border-r-[#c69f68]/50 hover:border-t-[#c69f68]/50 hover:shadow-xl"
                          }`}
                        >
                          {/* Top Row: Type/Category + PIN + Sleek Stage Switcher */}
                          <div className="flex items-center justify-between gap-1 mb-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#221e1a] text-[#c69f68] border border-[#332c25] shrink-0">
                                {session.session_type === "photo" ? (
                                  <Camera className="w-2.5 h-2.5 text-[#c69f68]" />
                                ) : (
                                  <Film className="w-2.5 h-2.5 text-blue-400" />
                                )}
                                <span className="capitalize">{session.category || "Studio"}</span>
                              </span>

                              {session.portal_pin && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#1d1915] text-[#a89f91] font-mono border border-[#332b24] shrink-0">
                                  PIN {session.portal_pin}
                                </span>
                              )}
                            </div>

                            {/* Sleek Stage Mover Button */}
                            <div onClick={(e) => e.stopPropagation()} className="relative flex items-center shrink-0">
                              <select
                                value={col.id}
                                onChange={(e) => handleMoveStage(session.id, e.target.value as PlannerStage)}
                                className="opacity-0 absolute inset-0 cursor-pointer w-full h-full z-10"
                                title="Déplacer vers une autre étape"
                              >
                                {STAGE_COLUMNS.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    → {c.label}
                                  </option>
                                ))}
                              </select>
                              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#221e1a] group-hover:bg-[#2a241f] border border-[#332c25] text-[#8c7e70] group-hover:text-[#c69f68] text-[10px] font-medium transition-colors">
                                <ArrowRightLeft className="w-2.5 h-2.5" />
                                <span>Étape</span>
                              </div>
                            </div>
                          </div>

                          {/* Client Name */}
                          <h4 className="text-sm font-bold text-[#f5f2eb] group-hover:text-[#c69f68] transition-colors truncate mb-1">
                            {session.client_name}
                          </h4>

                          {/* Session Date */}
                          <div className="flex items-center gap-1.5 text-[11px] text-[#70665a] mb-2.5">
                            <CalendarIcon className="w-3 h-3 text-[#5a5247]" />
                            <span>
                              {format(new Date(session.session_date), "dd MMMM yyyy", { locale: dateLocale })}
                            </span>
                          </div>

                          {/* Badges Row: Media + Selection + Comments */}
                          <div className="flex items-center gap-2 pt-2 border-t border-[#241f1a] text-[10px] text-[#8c7e70]">
                            {sharedCount > 0 && (
                              <span className="inline-flex items-center gap-1 text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20" title="Partagées sur Espace Privé">
                                <Globe className="w-2.5 h-2.5" />
                                <span>{sharedCount}</span>
                              </span>
                            )}
                            {selectedCount > 0 && (
                              <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20" title="Sélections client">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                <span>{selectedCount} sél.</span>
                              </span>
                            )}
                            {session.media_assets?.length > 0 && sharedCount === 0 && (
                              <span>{session.media_assets.length} médias</span>
                            )}

                            {/* Comments Pill */}
                            <div className="ml-auto inline-flex items-center gap-1 text-[#c69f68] bg-[#c69f68]/10 px-1.5 py-0.5 rounded border border-[#c69f68]/20" title={`${commentCount} note(s)`}>
                              <MessageSquare className="w-2.5 h-2.5" />
                              <span className="font-bold text-[10px]">{commentCount}</span>
                            </div>
                          </div>

                          {/* Last Note / Comment Preview */}
                          {latestNote && (
                            <div className="mt-2.5 p-2 rounded-lg bg-[#12100e] border border-[#241f1a] text-[11px] text-[#a89f91] italic line-clamp-2">
                              "{latestNote.text}"
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Ticket Detail & Comment Drawer (Slide-Over Panel) */}
      {activeTicket && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-[#14110e] text-[#f5f2eb] h-full shadow-2xl border-l border-[#2c2620] flex flex-col overflow-hidden animate-in slide-in-from-right duration-250"
          >
            {/* Drawer Header */}
            <div className="p-4 border-b border-[#26211c] bg-[#1a1714] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#c69f68]/10 text-[#c69f68] border border-[#c69f68]/20">
                  {activeTicket.session_type === "photo" ? (
                    <Camera className="w-5 h-5" />
                  ) : (
                    <Film className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#f5f2eb] leading-tight">
                    {activeTicket.client_name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-[#a89f91]">
                    <span className="capitalize">{activeTicket.category || "Projet"}</span>
                    <span>•</span>
                    <span>
                      {format(new Date(activeTicket.session_date), "dd MMMM yyyy", { locale: dateLocale })}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setActiveTicket(null)}
                className="p-1.5 rounded-lg text-[#70665a] hover:text-[#f5f2eb] hover:bg-[#26211c] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
              {/* Stage Changer Segmented Control */}
              <div>
                <label className="text-[11px] uppercase font-bold text-[#70665a] tracking-wider mb-2 block">
                  Étape du Workflow
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#0c0b0a] border border-[#26211c]">
                  {STAGE_COLUMNS.map((col) => {
                    const currentStage = getSessionPlannerStage(activeTicket)
                    const isCurrent = currentStage === col.id
                    return (
                      <button
                        key={col.id}
                        onClick={() => handleMoveStage(activeTicket.id, col.id)}
                        className={`py-2 px-2 rounded-lg text-[11px] font-semibold transition-all flex flex-col items-center justify-center gap-1 ${
                          isCurrent
                            ? "bg-[#c69f68] text-[#0b0a09] shadow-md font-bold"
                            : "text-[#a89f91] hover:text-[#f5f2eb] hover:bg-[#1a1714]"
                        }`}
                      >
                        <span>{col.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Quick Info & Portal PIN Card */}
              <div className="p-3.5 rounded-xl bg-[#1c1815] border border-[#2a241f] space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#70665a] flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> Contact
                  </span>
                  <span className="text-[#f5f2eb] font-medium">
                    {activeTicket.client_phone || activeTicket.client_email || "Aucun contact renseigné"}
                  </span>
                </div>

                {activeTicket.portal_pin && (
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-[#26211c]">
                    <span className="text-[#70665a] flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" /> Code PIN Client
                    </span>
                    <button
                      onClick={() => copyPinToClipboard(activeTicket.portal_pin)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#241f1a] text-[#c69f68] font-mono text-xs font-bold border border-[#c69f68]/30 hover:border-[#c69f68] transition-all cursor-pointer"
                    >
                      {copiedPin ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{activeTicket.portal_pin}</span>
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs pt-2 border-t border-[#26211c]">
                  <span className="text-[#70665a]">Sélections Client</span>
                  <span className="text-emerald-400 font-semibold">
                    {activeTicket.selected_assets?.length || 0} photos choisies
                  </span>
                </div>

                <div className="pt-2">
                  <Link
                    href={`/sessions/${activeTicket.id}`}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#26211c] hover:bg-[#332b24] text-[#c69f68] font-semibold text-xs transition-colors"
                  >
                    <span>Ouvrir la fiche complète de la session</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Project Comments & Production Notes Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#c69f68]" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#f5f2eb]">
                      Commentaires & Notes du Projet
                    </h4>
                  </div>
                  <span className="text-[10px] text-[#70665a]">
                    Synchronisé avec la fiche & calendrier
                  </span>
                </div>

                {/* Add Comment Input Form */}
                <form onSubmit={handleAddComment} className="space-y-2">
                  <div className="relative">
                    <textarea
                      rows={3}
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      placeholder="Écrire un commentaire pour ce projet... (Ex: Confirmation du client pour les 15 tirages)"
                      className="w-full bg-[#0c0b0a] border border-[#2c2620] rounded-xl p-3 text-xs text-[#f5f2eb] placeholder-[#5a5247] focus:outline-none focus:border-[#c69f68] transition-colors resize-none"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingComment || !newCommentText.trim()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#c69f68] hover:bg-[#dfba85] text-[#0b0a09] font-bold text-xs disabled:opacity-50 transition-all cursor-pointer shadow-md"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{submittingComment ? "Envoi..." : "Comentar"}</span>
                    </button>
                  </div>
                </form>

                {/* Timeline of Comments */}
                <div className="space-y-2.5 pt-2">
                  {(() => {
                    const entries = parseNotesIntoEntries(activeTicket.comments || "")
                    if (entries.length === 0) {
                      return (
                        <div className="p-4 rounded-xl border border-dashed border-[#26211c] text-center text-[#5a5247] text-xs">
                          Aucun commentaire ou note pour le moment.
                        </div>
                      )
                    }

                    return entries.map((entry, idx) => (
                      <div
                        key={entry.id || idx}
                        className="p-3 rounded-xl bg-[#181512] border border-[#26211c] space-y-1 hover:border-[#383129] transition-colors"
                      >
                        {entry.timestamp && (
                          <div className="flex items-center gap-1.5 text-[10px] text-[#c69f68] font-semibold">
                            <Clock className="w-2.5 h-2.5" />
                            <span>{entry.timestamp}</span>
                          </div>
                        )}
                        <p className="text-xs text-[#ded8ce] leading-relaxed whitespace-pre-wrap">
                          {entry.text}
                        </p>
                      </div>
                    ))
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
