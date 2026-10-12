"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase"
import { Users, Phone, Mail, Camera, Film, ArrowRight, Search, RotateCcw } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { Pagination } from "@/components/pagination"
import { useLanguage } from "@/context/language-context"

const ITEMS_PER_PAGE = 20

interface ClientGroup {
  name: string
  phone: string | null
  email: string | null
  sessions: any[]
  latestDate: string
  hasPhoto: boolean
  hasVideo: boolean
  statuses: string[]
}

export default function ClientsPage() {
  const { t } = useLanguage()
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filter States
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<"all" | "photo" | "video">("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortOrder, setSortOrder] = useState<"recent" | "oldest" | "name_asc" | "name_desc" | "sessions_desc">("recent")
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    async function loadSessions() {
      const supabase = createClient()
      try {
        const { data, error } = await supabase
          .from("sessions")
          .select("*, media_deliveries(*)")
          .order("session_date", { ascending: false })

        if (error) throw error
        setSessions(data || [])
      } catch (err) {
        console.error("Error cargando clientes:", err)
        setSessions([])
      } finally {
        setLoading(false)
      }
    }
    loadSessions()
  }, [])

  // Group sessions into client entities
  const allClients = useMemo(() => {
    const clientMap = new Map<string, ClientGroup>()

    sessions.forEach((s) => {
      const key = s.client_name.trim().toLowerCase()
      if (!clientMap.has(key)) {
        clientMap.set(key, {
          name: s.client_name,
          phone: s.client_phone || null,
          email: s.client_email || null,
          sessions: [s],
          latestDate: s.session_date,
          hasPhoto: s.session_type === "photo",
          hasVideo: s.session_type === "video",
          statuses: [s.status],
        })
      } else {
        const existing = clientMap.get(key)!
        existing.sessions.push(s)
        if (s.session_type === "photo") existing.hasPhoto = true
        if (s.session_type === "video") existing.hasVideo = true
        if (!existing.statuses.includes(s.status)) existing.statuses.push(s.status)
        if (new Date(s.session_date) > new Date(existing.latestDate)) {
          existing.latestDate = s.session_date
        }
      }
    })

    return Array.from(clientMap.values())
  }, [sessions])

  // Filter & Sort Logic
  const filteredClients = useMemo(() => {
    let result = allClients.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.phone && c.phone.includes(search)) ||
        (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
        c.sessions.some(
          (s) =>
            s.category?.toLowerCase().includes(search.toLowerCase()) ||
            s.portal_pin?.includes(search)
        )

      const matchType =
        typeFilter === "all" ||
        (typeFilter === "photo" && c.hasPhoto) ||
        (typeFilter === "video" && c.hasVideo)

      const matchStatus =
        statusFilter === "all" || c.statuses.includes(statusFilter)

      return matchSearch && matchType && matchStatus
    })

    // Sorting
    result.sort((a, b) => {
      if (sortOrder === "recent") {
        return new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime()
      }
      if (sortOrder === "oldest") {
        return new Date(a.latestDate).getTime() - new Date(b.latestDate).getTime()
      }
      if (sortOrder === "name_asc") {
        return a.name.localeCompare(b.name)
      }
      if (sortOrder === "name_desc") {
        return b.name.localeCompare(a.name)
      }
      if (sortOrder === "sessions_desc") {
        return b.sessions.length - a.sessions.length
      }
      return 0
    })

    return result
  }, [allClients, search, typeFilter, statusFilter, sortOrder])

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1)
  }, [search, typeFilter, statusFilter, sortOrder])

  // Pagination Slice (20 items max)
  const totalPages = Math.ceil(filteredClients.length / ITEMS_PER_PAGE)
  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredClients.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredClients, currentPage])

  const resetFilters = () => {
    setSearch("")
    setTypeFilter("all")
    setStatusFilter("all")
    setSortOrder("recent")
    setCurrentPage(1)
  }

  const activeFilterCount =
    (search ? 1 : 0) +
    (typeFilter !== "all" ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0) +
    (sortOrder !== "recent" ? 1 : 0)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c69f68]/10 border border-[#c69f68]/30 text-[#c69f68] text-xs font-semibold tracking-wider uppercase mb-2">
            <Users className="w-3.5 h-3.5" />
            <span>{t.clientDirectoryTag}</span>
          </div>
          <h1 className="text-3xl font-serif tracking-wide text-[#f5f2eb]">
            {t.clientsTitle}
          </h1>
          <p className="text-xs text-[#8c7a6b]">
            {t.clientsSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-[#141210] border border-[#26211c] text-xs text-[#a89f91]">
            {t.totalClients}:{" "}
            <span className="text-[#c69f68] font-bold text-sm ml-1">
              {filteredClients.length}
            </span>{" "}
            <span className="text-[#70665a]">({allClients.length} {t.totalSuffix})</span>
          </div>
        </div>
      </div>

      {/* Advanced Filter & Search Bar */}
      <div className="p-4 rounded-2xl border border-[#26211c] bg-[#141210] space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Main Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#70665a] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#181613] border border-[#29241f] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#f5f2eb] placeholder-[#70665a] focus:outline-none focus:border-[#c69f68] transition-colors"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-2.5 w-full md:w-auto">
            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full sm:w-auto bg-[#181613] border border-[#29241f] rounded-xl px-3 py-2 text-xs text-[#a89f91] focus:outline-none focus:border-[#c69f68]"
            >
              <option value="all">{t.allSpecialties}</option>
              <option value="photo">{t.photoOnly}</option>
              <option value="video">{t.videoOnly}</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto bg-[#181613] border border-[#29241f] rounded-xl px-3 py-2 text-xs text-[#a89f91] focus:outline-none focus:border-[#c69f68]"
            >
              <option value="all">{t.allStatuses}</option>
              <option value="pending">{t.pending}</option>
              <option value="shooting">{t.shooting}</option>
              <option value="editing">{t.inEditing}</option>
              <option value="delivered">{t.delivered}</option>
            </select>

            {/* Sort Order */}
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="w-full sm:w-auto col-span-2 sm:col-span-1 bg-[#181613] border border-[#29241f] rounded-xl px-3 py-2 text-xs text-[#a89f91] focus:outline-none focus:border-[#c69f68]"
            >
              <option value="recent">{t.sortRecent}</option>
              <option value="oldest">{t.sortOldest}</option>
              <option value="name_asc">{t.sortNameAsc}</option>
              <option value="name_desc">{t.sortNameDesc}</option>
              <option value="sessions_desc">{t.sortSessionsDesc}</option>
            </select>

            {/* Reset Button */}
            {activeFilterCount > 0 && (
              <button
                onClick={resetFilters}
                className="col-span-2 sm:col-span-1 justify-center px-3 py-2 rounded-xl bg-[#1f1a15] hover:bg-[#28211b] border border-[#c69f68]/30 text-xs text-[#c69f68] flex items-center gap-1.5 transition-colors cursor-pointer"
                title={t.clearFilters}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t.clearFilters} ({activeFilterCount})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Loading Skeleton / Content */}
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 rounded-2xl bg-[#141210] border border-[#26211c] animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Clients Grid */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {paginatedClients.map((client) => {
              return (
                <div
                  key={client.name}
                  className="rounded-2xl border border-[#26211c] bg-[#141210] p-6 shadow-xl relative overflow-hidden group hover:border-[#c69f68]/40 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <Link
                        href={`/clients/${encodeURIComponent(client.name)}`}
                        className="w-12 h-12 rounded-2xl bg-[#1c1815] border border-[#c69f68]/20 hover:border-[#c69f68]/60 flex items-center justify-center text-[#c69f68] font-serif text-lg font-bold shadow-inner transition-all hover:scale-105"
                      >
                        {client.name.charAt(0).toUpperCase()}
                      </Link>
                      <div className="flex items-center gap-1.5">
                        {client.hasPhoto && (
                          <span className="p-1.5 rounded-lg bg-[#c69f68]/10 text-[#c69f68] border border-[#c69f68]/20" title={t.photoOnly}>
                            <Camera className="w-3 h-3" />
                          </span>
                        )}
                        {client.hasVideo && (
                          <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" title={t.videoOnly}>
                            <Film className="w-3 h-3" />
                          </span>
                        )}
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-[#1d1a16] text-[#c69f68] border border-[#c69f68]/20">
                          {client.sessions.length} {client.sessions.length === 1 ? t.sessionSingle : t.sessionsPlural}
                        </span>
                      </div>
                    </div>

                    <div>
                      <Link
                        href={`/clients/${encodeURIComponent(client.name)}`}
                        className="group/title inline-block"
                      >
                        <h3 className="text-lg font-serif font-semibold text-[#f5f2eb] group-hover/title:text-[#c69f68] transition-colors">
                          {client.name}
                        </h3>
                      </Link>

                      <div className="mt-2 space-y-1">
                        {client.phone && (
                          <p className="text-xs text-[#8c7a6b] flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-[#c69f68]" />
                            <a href={`tel:${client.phone}`} className="hover:underline">
                              {client.phone}
                            </a>
                          </p>
                        )}
                        {client.email && (
                          <p className="text-xs text-[#8c7a6b] flex items-center gap-1.5">
                            <Mail className="w-3 h-3 text-[#c69f68]" />
                            <a
                              href={`mailto:${client.email}`}
                              className="hover:underline truncate max-w-[200px]"
                              title={client.email}
                            >
                              {client.email}
                            </a>
                          </p>
                        )}
                        {!client.phone && !client.email && (
                          <p className="text-xs text-[#554c42] italic">{t.contactNone}</p>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#26211c] space-y-2">
                      <span className="text-[10px] uppercase tracking-wider text-[#70665a] font-semibold block">
                        {t.linkedSessions}
                      </span>
                      <div className="space-y-1.5">
                        {client.sessions.map((sess) => (
                          <Link
                            key={sess.id}
                            href={`/sessions/${sess.id}`}
                            className="flex items-center justify-between p-2 rounded-lg bg-[#181613] hover:bg-[#201c18] border border-[#26211c] text-xs transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              {sess.session_type === "photo" ? (
                                <Camera className="w-3 h-3 text-[#c69f68]" />
                              ) : (
                                <Film className="w-3 h-3 text-indigo-400" />
                              )}
                              <span className="text-[#e4decb] truncate max-w-[140px] text-[11px]">
                                {t[sess.category as keyof typeof t] || sess.category || sess.session_type}
                              </span>
                            </div>
                            <span className="text-[10px] text-[#70665a]">
                              {format(new Date(sess.session_date), "dd/MM/yy")}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[#26211c]/60 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-[#70665a]">
                      {t.lastActivity}: {format(new Date(client.latestDate), "dd MMM yyyy")}
                    </span>
                    <Link
                      href={`/clients/${encodeURIComponent(client.name)}`}
                      className="text-[#c69f68] hover:text-[#e5c38e] flex items-center gap-1 text-[11px] font-semibold"
                    >
                      <span>{t.viewCard}</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              )
            })}

            {filteredClients.length === 0 && (
              <div className="col-span-full py-16 text-center border-2 border-dashed border-[#26211c] rounded-3xl bg-[#141210]/50 space-y-3">
                <Users className="w-12 h-12 text-[#554c42] mx-auto" />
                <p className="text-sm text-[#8c7a6b]">No se encontraron clientes con los filtros aplicados.</p>
                {activeFilterCount > 0 && (
                  <button
                    onClick={resetFilters}
                    className="px-4 py-2 rounded-xl bg-[#1f1a15] text-xs text-[#c69f68] border border-[#c69f68]/30 hover:bg-[#28211b] inline-flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t.clearFilters}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Pagination Controls (20 per page) */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredClients.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={(p) => setCurrentPage(p)}
          />
        </>
      )}
    </div>
  )
}
