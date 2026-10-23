"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase"
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths, 
  isToday,
  parseISO 
} from "date-fns"
import { fr, es, enUS } from "date-fns/locale"
import { 
  Calendar as CalendarIcon, 
  CalendarDays,
  ChevronLeft, 
  ChevronRight, 
  Camera, 
  Film, 
  NotebookPen, 
  Search, 
  Plus, 
  Check, 
  Clock, 
  Phone, 
  ExternalLink, 
  Save, 
  MessageSquare, 
  X, 
  List, 
  Grid 
} from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/context/language-context"
import { SessionDialog } from "@/components/session-dialog"
import { updateSessionNotes, updateSessionStatus } from "@/app/actions"

interface SessionItem {
  id: string
  session_date: string
  client_name: string
  client_phone: string | null
  client_email: string | null
  session_type: "photo" | "video"
  category: string
  status: string
  comments: string | null
  internal_notes: string | null
  tags: string[]
  portal_pin: string | null
}

const CATEGORY_ICONS: Record<string, string> = {
  wedding: "💍",
  portrait: "👤",
  birthday: "🎂",
  graduation: "🎓",
  event: "🎪",
  newborn: "👶",
  maternity: "🤰",
  product: "📦",
  other: "📷",
}

const FR_CATEGORY_LABELS: Record<string, string> = {
  wedding: "Mariage",
  newborn: "Nouveau-né",
  birthday: "Anniversaire",
  graduation: "Remise de Diplôme",
  event: "Événement",
  portrait: "Portrait d'Auteur",
  product: "Packshot / Produit",
  maternity: "Maternité",
  other: "Séance d'Auteur",
}

const FR_STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  shooting: "En séance",
  editing: "En cours d'édition",
  edited: "Édité",
  delivered: "Livré",
  archived: "Archivé",
}

const STATUS_BADGE_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  pending: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/30",
    dot: "bg-amber-400",
  },
  shooting: {
    bg: "bg-sky-500/10",
    text: "text-sky-400",
    border: "border-sky-500/30",
    dot: "bg-sky-400",
  },
  editing: {
    bg: "bg-indigo-500/10",
    text: "text-indigo-400",
    border: "border-indigo-500/30",
    dot: "bg-indigo-400",
  },
  edited: {
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    border: "border-purple-500/30",
    dot: "bg-purple-400",
  },
  delivered: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    dot: "bg-emerald-400",
  },
  archived: {
    bg: "bg-stone-500/10",
    text: "text-stone-400",
    border: "border-stone-500/30",
    dot: "bg-stone-400",
  },
}

export default function CalendarPage() {
  const { t, language } = useLanguage()

  // Locale for date-fns (Français par défaut)
  const dateLocale = useMemo(() => {
    if (language === "es") return es
    if (language === "en") return enUS
    return fr
  }, [language])

  const [currentMonth, setCurrentMonth] = useState<Date>(new Date())
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [loading, setLoading] = useState(true)

  // Filters & View State
  const [viewMode, setViewMode] = useState<"grid" | "agenda">("grid")
  const [typeFilter, setTypeFilter] = useState<"all" | "photo" | "video">("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [hasNotesFilter, setHasNotesFilter] = useState<"all" | "with_notes">("all")
  const [search, setSearch] = useState("")

  // Selected Day & Active Session for Right Drawer
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [isInspectorOpen, setIsInspectorOpen] = useState(false)

  // Quick note editing state
  const [noteDraft, setNoteDraft] = useState("")
  const [isSavingNotes, setIsSavingNotes] = useState(false)
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false)

  // Fetch all sessions from Supabase
  const fetchSessions = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      const { data, error } = await supabase
        .from("sessions")
        .select("id, session_date, client_name, client_phone, client_email, session_type, category, status, comments, internal_notes, tags, portal_pin")
        .order("session_date", { ascending: true })

      if (error) throw error
      setSessions((data as SessionItem[]) || [])
    } catch (err) {
      console.error("Erreur chargement séances calendrier:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [])

  // Filtered Sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      // Type filter
      if (typeFilter !== "all" && s.session_type !== typeFilter) return false

      // Status filter
      if (statusFilter !== "all" && s.status !== statusFilter) return false

      // Category filter
      if (categoryFilter !== "all" && s.category !== categoryFilter) return false

      // Notes filter
      if (hasNotesFilter === "with_notes") {
        const hasNotes = Boolean((s.comments && s.comments.trim().length > 0) || (s.internal_notes && s.internal_notes.trim().length > 0))
        if (!hasNotes) return false
      }

      // Search Query
      if (search.trim()) {
        const q = search.toLowerCase()
        const clientMatch = s.client_name?.toLowerCase().includes(q)
        const notesMatch = s.comments?.toLowerCase().includes(q) || s.internal_notes?.toLowerCase().includes(q)
        const phoneMatch = s.client_phone?.toLowerCase().includes(q)
        if (!clientMatch && !notesMatch && !phoneMatch) return false
      }

      return true
    })
  }, [sessions, typeFilter, statusFilter, categoryFilter, hasNotesFilter, search])

  // Group filtered sessions by date (YYYY-MM-DD)
  const sessionsByDate = useMemo(() => {
    const map: Record<string, SessionItem[]> = {}
    filteredSessions.forEach((s) => {
      if (!s.session_date) return
      const dateKey = s.session_date.slice(0, 10)
      if (!map[dateKey]) map[dateKey] = []
      map[dateKey].push(s)
    })
    return map
  }, [filteredSessions])

  // Month Calendar Days Grid Calculation (Monday to Sunday)
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(monthStart)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const calendarDays = useMemo(() => {
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }, [calendarStart, calendarEnd])

  // Monthly Quick Stats
  const monthStats = useMemo(() => {
    const currentMonthKey = format(currentMonth, "yyyy-MM")
    const inCurrentMonth = sessions.filter(s => s.session_date && s.session_date.startsWith(currentMonthKey))
    const photos = inCurrentMonth.filter(s => s.session_type === "photo").length
    const videos = inCurrentMonth.filter(s => s.session_type === "video").length
    const pending = inCurrentMonth.filter(s => s.status === "pending" || s.status === "shooting").length
    const withNotes = inCurrentMonth.filter(s => Boolean(s.comments && s.comments.trim().length > 0)).length

    return {
      total: inCurrentMonth.length,
      photos,
      videos,
      pending,
      withNotes
    }
  }, [sessions, currentMonth])

  // Currently Selected Day Sessions
  const selectedDateKey = selectedDate ? format(selectedDate, "yyyy-MM-dd") : ""
  const selectedDaySessions = useMemo(() => {
    if (!selectedDateKey) return []
    return sessionsByDate[selectedDateKey] || []
  }, [selectedDateKey, sessionsByDate])

  // Active Selected Session
  const activeSession = useMemo(() => {
    if (selectedSessionId) {
      const found = sessions.find((s) => s.id === selectedSessionId)
      if (found) return found
    }
    return selectedDaySessions[0] || null
  }, [selectedSessionId, selectedDaySessions, sessions])

  // Sync active session's notes to draft textarea
  useEffect(() => {
    if (activeSession) {
      setNoteDraft(activeSession.comments || activeSession.internal_notes || "")
    } else {
      setNoteDraft("")
    }
    setSaveSuccessNotice(false)
  }, [activeSession?.id, activeSession?.comments, activeSession?.internal_notes])

  // Handle Saving Notes
  const handleSaveNotes = async () => {
    if (!activeSession) return
    setIsSavingNotes(true)
    try {
      const res = await updateSessionNotes(activeSession.id, noteDraft)
      if (res.success) {
        setSessions(prev => prev.map(s => s.id === activeSession.id ? { ...s, comments: noteDraft } : s))
        setSaveSuccessNotice(true)
        setTimeout(() => setSaveSuccessNotice(false), 3000)
      } else {
        alert("Erreur lors de l'enregistrement des notes : " + res.error)
      }
    } catch (e: any) {
      alert("Erreur lors de l'enregistrement des notes : " + e.message)
    } finally {
      setIsSavingNotes(false)
    }
  }

  // Handle Quick Status Change
  const handleQuickStatusChange = async (sessionId: string, newStatus: string) => {
    try {
      const res = await updateSessionStatus(sessionId, newStatus)
      if (res.success) {
        setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status: newStatus } : s))
      }
    } catch (e) {
      console.error("Erreur lors du changement de statut:", e)
    }
  }

  // Week day names (LUN. à DIM.)
  const weekDayHeaders = ["LUN.", "MAR.", "MER.", "JEU.", "VEN.", "SAM.", "DIM."]

  return (
    <div className="space-y-6">
      {/* Top Header & Monthly Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#26211c] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#c69f68]/20 to-[#dfba85]/10 border border-[#c69f68]/30 flex items-center justify-center text-[#c69f68] shadow-lg shadow-[#c69f68]/5">
              <CalendarDays className="w-5 h-5 text-[#c69f68]" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold text-[#f5f2eb] tracking-wide">
                {t.calendar || "Calendrier"}
              </h1>
              <p className="text-xs text-[#8c7a6b] mt-0.5">
                {t.calendarSubtitle || "Organisation des rendez-vous, tournages de prestige et carnet de notes de production."}
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & Navigation */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Toggle */}
          <div className="flex items-center bg-[#141210] border border-[#26211c] rounded-xl p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === "grid" 
                  ? "bg-[#c69f68] text-[#0b0a09] font-bold shadow-md" 
                  : "text-[#a89f91] hover:text-[#f5f2eb]"
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Mois</span>
            </button>
            <button
              onClick={() => setViewMode("agenda")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === "agenda" 
                  ? "bg-[#c69f68] text-[#0b0a09] font-bold shadow-md" 
                  : "text-[#a89f91] hover:text-[#f5f2eb]"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Agenda</span>
            </button>
          </div>

          {/* Month Stepper */}
          <div className="flex items-center bg-[#141210] border border-[#26211c] rounded-xl p-1 gap-1">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-1.5 rounded-lg hover:bg-[#201c18] text-[#a89f91] hover:text-[#f5f2eb] transition-colors"
              title="Mois précédent"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 text-xs font-serif font-bold text-[#f5f2eb] capitalize min-w-[130px] text-center">
              {format(currentMonth, "MMMM yyyy", { locale: dateLocale })}
            </span>

            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-1.5 rounded-lg hover:bg-[#201c18] text-[#a89f91] hover:text-[#f5f2eb] transition-colors"
              title="Mois suivant"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                const today = new Date()
                setCurrentMonth(today)
                setSelectedDate(today)
              }}
              className="px-2.5 py-1 text-[11px] rounded-lg bg-[#201c18] hover:bg-[#2c2620] text-[#c69f68] font-semibold transition-colors border border-[#c69f68]/20"
            >
              Aujourd&apos;hui
            </button>
          </div>
        </div>
      </div>

      {/* Monthly Statistics Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl bg-[#141210] border border-[#26211c] flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#70665a] block font-semibold">
              Séances du Mois
            </span>
            <span className="text-xl font-bold font-serif text-[#f5f2eb] mt-0.5 block">
              {monthStats.total}
            </span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-[#c69f68]/10 border border-[#c69f68]/20 flex items-center justify-center text-[#c69f68]">
            <CalendarIcon className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#141210] border border-[#26211c] flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#70665a] block font-semibold">
              Photographie
            </span>
            <span className="text-xl font-bold font-serif text-[#c69f68] mt-0.5 block">
              {monthStats.photos}
            </span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-[#c69f68]/10 border border-[#c69f68]/20 flex items-center justify-center text-[#c69f68]">
            <Camera className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#141210] border border-[#26211c] flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#70665a] block font-semibold">
              Vidéo & Tournage
            </span>
            <span className="text-xl font-bold font-serif text-amber-400 mt-0.5 block">
              {monthStats.videos}
            </span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Film className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#141210] border border-[#26211c] flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#70665a] block font-semibold">
              À Réaliser
            </span>
            <span className="text-xl font-bold font-serif text-sky-400 mt-0.5 block">
              {monthStats.pending}
            </span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#141210] border border-[#26211c] flex items-center justify-between col-span-2 sm:col-span-1">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#70665a] block font-semibold">
              Avec Notes
            </span>
            <span className="text-xl font-bold font-serif text-emerald-400 mt-0.5 block">
              {monthStats.withNotes}
            </span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <NotebookPen className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3.5 rounded-2xl bg-[#141210] border border-[#26211c] flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#70665a]" />
          <input
            type="text"
            placeholder="Rechercher par client ou notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-[#0b0a09] border border-[#26211c] text-[#f5f2eb] placeholder-[#70665a] focus:border-[#c69f68] outline-none transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-2.5 text-[#70665a] hover:text-[#f5f2eb]"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Quick Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Type Filter */}
          <div className="flex items-center bg-[#0b0a09] border border-[#26211c] rounded-xl p-0.5">
            <button
              onClick={() => setTypeFilter("all")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                typeFilter === "all" ? "bg-[#221e1a] text-[#c69f68] font-bold" : "text-[#70665a] hover:text-[#f5f2eb]"
              }`}
            >
              Tout
            </button>
            <button
              onClick={() => setTypeFilter("photo")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-all ${
                typeFilter === "photo" ? "bg-[#221e1a] text-[#c69f68] font-bold" : "text-[#70665a] hover:text-[#f5f2eb]"
              }`}
            >
              <Camera className="w-3 h-3" /> Photo
            </button>
            <button
              onClick={() => setTypeFilter("video")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-all ${
                typeFilter === "video" ? "bg-[#221e1a] text-[#c69f68] font-bold" : "text-[#70665a] hover:text-[#f5f2eb]"
              }`}
            >
              <Film className="w-3 h-3" /> Vidéo
            </button>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-xl bg-[#0b0a09] border border-[#26211c] text-[#a89f91] outline-none"
          >
            <option value="all">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="shooting">En séance</option>
            <option value="editing">En cours d&apos;édition</option>
            <option value="edited">Édité</option>
            <option value="delivered">Livré</option>
            <option value="archived">Archivé</option>
          </select>

          {/* Notes Filter */}
          <button
            onClick={() => setHasNotesFilter(prev => prev === "with_notes" ? "all" : "with_notes")}
            className={`px-2.5 py-1.5 rounded-xl border text-xs flex items-center gap-1.5 transition-all ${
              hasNotesFilter === "with_notes"
                ? "bg-amber-500/15 border-amber-500/40 text-amber-400 font-semibold"
                : "bg-[#0b0a09] border-[#26211c] text-[#8c7a6b] hover:text-[#f5f2eb]"
            }`}
          >
            <NotebookPen className="w-3.5 h-3.5" />
            <span>Avec notes uniquement</span>
          </button>
        </div>
      </div>

      {/* Main Calendar Content Area (Grid + Inspector Drawer) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Calendar Grid or Agenda View (8 cols on lg when panel open, 12 cols when closed) */}
        <div className={`${isInspectorOpen ? "lg:col-span-8" : "lg:col-span-12"} space-y-4 transition-all duration-300`}>
          {viewMode === "grid" ? (
            <div className="p-3 sm:p-6 rounded-2xl bg-[#141210] border border-[#26211c] shadow-2xl overflow-x-auto">
              <div className="min-w-[620px]">
                {/* Day Headers (LUN., MAR., MER...) */}
                <div className="grid grid-cols-7 gap-2 mb-3">
                  {weekDayHeaders.map((dayName, idx) => (
                    <div
                      key={idx}
                      className="text-center text-[11px] font-mono font-semibold tracking-wider text-[#70665a] py-1"
                    >
                      {dayName}
                    </div>
                  ))}
                </div>

              {/* Day Cells Grid */}
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((day, idx) => {
                  const dateKey = format(day, "yyyy-MM-dd")
                  const isCurrentMonthDay = isSameMonth(day, currentMonth)
                  const isTodayDay = isToday(day)
                  const isSelectedDay = selectedDate ? isSameDay(day, selectedDate) : false
                  const daySessions = sessionsByDate[dateKey] || []
                  const hasAnyNotes = daySessions.some(s => Boolean(s.comments && s.comments.trim().length > 0))

                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        setSelectedDate(day)
                        if (daySessions.length > 0) {
                          setSelectedSessionId(daySessions[0].id)
                        } else {
                          setSelectedSessionId(null)
                        }
                        setIsInspectorOpen(true)
                      }}
                      className={`min-h-[105px] p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group relative ${
                        !isCurrentMonthDay
                          ? "bg-[#0c0b0a]/40 border-[#1c1916]/50 text-[#443d36] opacity-40 hover:opacity-80"
                          : isSelectedDay
                          ? "bg-[#1c1815] border-[#c69f68] ring-1 ring-[#c69f68]/40 shadow-lg shadow-[#c69f68]/10"
                          : isTodayDay
                          ? "bg-[#181512] border-[#c69f68]/50 hover:border-[#c69f68]"
                          : "bg-[#0e0d0b] border-[#221e1a] hover:border-[#38312a] hover:bg-[#151311]"
                      }`}
                    >
                      {/* Cell Header: Date Number & Badges */}
                      <div className="flex items-center justify-between">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold ${
                            isTodayDay
                              ? "bg-[#c69f68] text-[#0b0a09] shadow-md shadow-[#c69f68]/30"
                              : isSelectedDay
                              ? "text-[#c69f68] font-bold"
                              : isCurrentMonthDay
                              ? "text-[#d6cebf]"
                              : "text-[#554c42]"
                          }`}
                        >
                          {format(day, "d")}
                        </span>

                        <div className="flex items-center gap-1">
                          {hasAnyNotes && (
                            <span 
                              className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px]" 
                              title="Contient des notes"
                            >
                              📝
                            </span>
                          )}

                          {daySessions.length > 0 && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-[#241f1a] text-[#c69f68] font-bold border border-[#c69f68]/20">
                              {daySessions.length}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Sessions Chips Container */}
                      <div className="space-y-1 my-1 overflow-hidden">
                        {daySessions.slice(0, 3).map((session) => {
                          const icon = CATEGORY_ICONS[session.category] || "📷"
                          const statusStyle = STATUS_BADGE_STYLES[session.status] || STATUS_BADGE_STYLES.pending

                          return (
                            <div
                              key={session.id}
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedDate(day)
                                setSelectedSessionId(session.id)
                                setIsInspectorOpen(true)
                              }}
                              className={`px-1.5 py-0.5 rounded-md text-[10px] truncate flex items-center gap-1 border transition-all ${
                                selectedSessionId === session.id
                                  ? "bg-[#c69f68]/20 border-[#c69f68] text-[#f5f2eb]"
                                  : "bg-[#181512] border-[#29231c] text-[#a89f91] hover:text-[#f5f2eb] hover:border-[#70665a]"
                              }`}
                            >
                              <span className="text-[9px] shrink-0">{icon}</span>
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusStyle.dot}`} />
                              <span className="truncate font-medium">{session.client_name}</span>
                              {session.comments && (
                                <span className="text-[8px] text-[#c69f68] shrink-0 ml-auto">✎</span>
                              )}
                            </div>
                          )
                        })}

                        {daySessions.length > 3 && (
                          <div className="text-[9px] text-[#8c7a6b] font-mono px-1">
                            +{daySessions.length - 3} de plus...
                          </div>
                        )}
                      </div>

                      {/* Cell Footer Quick Add Button on Hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end">
                        <SessionDialog
                          defaultDate={dateKey}
                          onSuccess={fetchSessions}
                          customTrigger={
                            <button
                              type="button"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[9px] text-[#c69f68] hover:text-[#dfba85] flex items-center gap-0.5 font-medium px-1 py-0.5 rounded hover:bg-[#201c18]"
                              title={`Ajouter une séance le ${dateKey}`}
                            >
                              <Plus className="w-2.5 h-2.5" />
                              <span>Ajouter</span>
                            </button>
                          }
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
              </div>
            </div>
          ) : (
            /* Agenda Timeline View */
            <div className="space-y-4">
              {Object.keys(sessionsByDate).length === 0 ? (
                <div className="p-12 rounded-2xl bg-[#141210] border border-[#26211c] text-center text-[#70665a]">
                  <CalendarDays className="w-10 h-10 mx-auto text-[#443d36] mb-3" />
                  <p className="text-sm font-medium">Aucune séance programmée trouvée avec les filtres actuels.</p>
                </div>
              ) : (
                Object.entries(sessionsByDate).sort(([a], [b]) => a.localeCompare(b)).map(([dateStr, items]) => {
                  const dateObj = parseISO(dateStr)
                  const isCurrentDay = isToday(dateObj)

                  return (
                    <div 
                      key={dateStr}
                      className="p-5 rounded-2xl bg-[#141210] border border-[#26211c] space-y-3"
                    >
                      {/* Date Heading */}
                      <div className="flex items-center justify-between border-b border-[#26211c] pb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-serif font-bold capitalize ${isCurrentDay ? "text-[#c69f68]" : "text-[#f5f2eb]"}`}>
                            {format(dateObj, "EEEE d MMMM yyyy", { locale: dateLocale })}
                          </span>
                          {isCurrentDay && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#c69f68]/20 border border-[#c69f68]/40 text-[#c69f68]">
                              AUJOURD&apos;HUI
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-mono text-[#8c7a6b]">
                          {items.length} {items.length === 1 ? "séance" : "séances"}
                        </span>
                      </div>

                      {/* Sessions List */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {items.map((session) => {
                          const icon = CATEGORY_ICONS[session.category] || "✨"
                          const statusStyle = STATUS_BADGE_STYLES[session.status] || STATUS_BADGE_STYLES.pending

                          return (
                            <div
                              key={session.id}
                              onClick={() => {
                                setSelectedDate(dateObj)
                                setSelectedSessionId(session.id)
                                setIsInspectorOpen(true)
                              }}
                              className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 ${
                                selectedSessionId === session.id
                                  ? "bg-[#1c1815] border-[#c69f68] ring-1 ring-[#c69f68]/30"
                                  : "bg-[#0b0a09] border-[#221e1a] hover:border-[#70665a]"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-base">{icon}</span>
                                  <div>
                                    <h4 className="text-xs font-bold text-[#f5f2eb]">{session.client_name}</h4>
                                    <span className="text-[10px] text-[#8c7a6b] capitalize">
                                      {session.session_type === "photo" ? "📸 Photo" : "🎬 Vidéo"} • {FR_CATEGORY_LABELS[session.category] || session.category}
                                    </span>
                                  </div>
                                </div>

                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusStyle.bg} ${statusStyle.border} ${statusStyle.text}`}>
                                  {FR_STATUS_LABELS[session.status] || session.status}
                                </span>
                              </div>

                              {/* Note Preview if available */}
                              {session.comments && (
                                <div className="p-2 rounded-lg bg-[#141210] border border-[#26211c] text-[11px] text-[#c69f68] font-mono line-clamp-2">
                                  ✎ {session.comments}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>

        {/* Right Column: Interactive Session & Notes Inspector (4 cols on lg) */}
        {isInspectorOpen && (
          <div className="lg:col-span-4 sticky top-6 space-y-4 animate-in fade-in slide-in-from-right duration-250">
            <div className="p-5 rounded-2xl bg-[#141210] border border-[#26211c] shadow-2xl space-y-5">
              {/* Inspector Header */}
              <div className="flex items-center justify-between border-b border-[#26211c] pb-3">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-[#70665a] font-semibold block">
                    Date Sélectionnée
                  </span>
                  <h3 className="text-sm font-serif font-bold text-[#f5f2eb] capitalize mt-0.5">
                    {selectedDate ? format(selectedDate, "EEEE d MMMM yyyy", { locale: dateLocale }) : "Aucune"}
                  </h3>
                </div>

                <div className="flex items-center gap-1.5">
                  {selectedDate && (
                    <SessionDialog
                      defaultDate={format(selectedDate, "yyyy-MM-dd")}
                      onSuccess={fetchSessions}
                      customTrigger={
                        <button className="p-1.5 rounded-lg bg-[#201c18] hover:bg-[#2c2620] text-[#c69f68] border border-[#c69f68]/20 transition-all cursor-pointer" title="Ajouter une séance ce jour">
                          <Plus className="w-4 h-4" />
                        </button>
                      }
                    />
                  )}
                  <button
                    onClick={() => {
                      setIsInspectorOpen(false)
                      setSelectedDate(null)
                      setSelectedSessionId(null)
                    }}
                    className="p-1.5 rounded-lg text-[#70665a] hover:text-[#f5f2eb] hover:bg-[#201c18] transition-colors cursor-pointer"
                    title="Fermer le panneau / Cerrar panel de notas"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

            {/* List of sessions on this day to select between */}
            {selectedDaySessions.length > 0 ? (
              <div className="space-y-3">
                {selectedDaySessions.length > 1 && (
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {selectedDaySessions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setSelectedSessionId(s.id)}
                        className={`px-2.5 py-1 text-xs rounded-lg whitespace-nowrap border transition-all ${
                          selectedSessionId === s.id
                            ? "bg-[#c69f68] text-[#0b0a09] font-bold border-[#c69f68]"
                            : "bg-[#0b0a09] text-[#a89f91] border-[#26211c] hover:border-[#70665a]"
                        }`}
                      >
                        {s.client_name}
                      </button>
                    ))}
                  </div>
                )}

                {activeSession && (
                  <div className="space-y-4">
                    {/* Active Session Client Summary Card */}
                    <div className="p-4 rounded-xl bg-[#0b0a09] border border-[#26211c] space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-[#c69f68] font-bold block">
                            {(FR_CATEGORY_LABELS[activeSession.category] || activeSession.category).toUpperCase()} • {activeSession.session_type === "photo" ? "📸 Photo" : "🎬 Vidéo"}
                          </span>
                          <h4 className="text-base font-serif font-bold text-[#f5f2eb] mt-0.5">
                            {activeSession.client_name}
                          </h4>
                        </div>

                        {/* Status Switcher Button */}
                        <select
                          value={activeSession.status}
                          onChange={(e) => handleQuickStatusChange(activeSession.id, e.target.value)}
                          className="text-xs px-2 py-1 rounded-lg bg-[#181613] border border-[#26211c] text-[#f5f2eb] font-semibold outline-none cursor-pointer"
                        >
                          <option value="pending">En attente</option>
                          <option value="shooting">En séance</option>
                          <option value="editing">En cours d&apos;édition</option>
                          <option value="edited">Édité</option>
                          <option value="delivered">Livré</option>
                          <option value="archived">Archivé</option>
                        </select>
                      </div>

                      {/* Phone & WhatsApp Actions */}
                      <div className="flex items-center gap-2 pt-1 border-t border-[#1c1915]">
                        {activeSession.client_phone ? (
                          <>
                            <a
                              href={`https://wa.me/${activeSession.client_phone.replace(/[^0-9]/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold hover:bg-emerald-500/20 transition-all"
                            >
                              <MessageSquare className="w-3 h-3" />
                              <span>WhatsApp</span>
                            </a>
                            <a
                              href={`tel:${activeSession.client_phone}`}
                              className="flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-lg bg-[#181613] border border-[#26211c] text-[#a89f91] hover:text-[#f5f2eb] transition-all"
                            >
                              <Phone className="w-3 h-3 text-[#70665a]" />
                              <span>{activeSession.client_phone}</span>
                            </a>
                          </>
                        ) : (
                          <span className="text-[11px] text-[#70665a] italic">Aucun numéro enregistré</span>
                        )}

                        <Link
                          href={`/sessions/${activeSession.id}`}
                          className="ml-auto text-[11px] text-[#c69f68] hover:underline flex items-center gap-1 font-semibold"
                        >
                          <span>Fiche Projet</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>

                    {/* INTERACTIVE NOTES NOTEBOOK SECTION (Clean Luxury Notebook without tags/logos) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#f5f2eb]">
                          <NotebookPen className="w-4 h-4 text-[#c69f68]" />
                          <span>Cahier de Notes de la Séance</span>
                        </div>
                        {saveSuccessNotice && (
                          <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 animate-pulse">
                            <Check className="w-3 h-3" /> Enregistré ✓
                          </span>
                        )}
                      </div>

                      {/* Textarea */}
                      <div className="relative">
                        <textarea
                          rows={6}
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                              e.preventDefault()
                              handleSaveNotes()
                            }
                          }}
                          placeholder="Notes de production : souhaits du client, horaires, lieu de tournage, tenues, matériel, rappels..."
                          className="w-full p-3 rounded-xl bg-[#0b0a09] border border-[#26211c] text-xs text-[#f5f2eb] placeholder-[#554c42] focus:border-[#c69f68] focus:ring-1 focus:ring-[#c69f68]/30 outline-none font-mono leading-relaxed transition-all resize-y"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-[#554c42] font-mono">
                          {noteDraft.length} caractères • Ctrl+Entrée pour enregistrer
                        </span>

                        <button
                          type="button"
                          onClick={handleSaveNotes}
                          disabled={isSavingNotes}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#c69f68] to-[#dfba85] text-[#0b0a09] font-bold text-xs shadow-md hover:shadow-[#c69f68]/20 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{isSavingNotes ? "Enregistrement..." : "Enregistrer"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* No sessions on this day */
              <div className="p-8 rounded-xl bg-[#0b0a09] border border-[#1f1b17] text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#181512] border border-[#26211c] flex items-center justify-center text-[#70665a] mx-auto">
                  <CalendarIcon className="w-5 h-5 text-[#554c42]" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-[#f5f2eb]">Aucune séance ce jour</h4>
                  <p className="text-[11px] text-[#70665a] mt-0.5">
                    Aucun tournage ni séance de prise de vue programmée pour cette date.
                  </p>
                </div>
                {selectedDate && (
                  <SessionDialog
                    defaultDate={format(selectedDate, "yyyy-MM-dd")}
                    onSuccess={fetchSessions}
                    customTrigger={
                      <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1c1815] border border-[#c69f68]/30 text-[#c69f68] text-xs font-semibold hover:bg-[#c69f68]/10 transition-colors cursor-pointer">
                        <Plus className="w-3.5 h-3.5" />
                        <span>Planifier une Séance</span>
                      </button>
                    }
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
