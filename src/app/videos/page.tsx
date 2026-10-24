"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { createClient } from "@/lib/supabase"
import { SessionSummary } from "@/types/database"
import { Film, Search, ArrowRight, Key, ExternalLink, Copy, Check, Video, RotateCcw, Pencil, Building2, PartyPopper } from "lucide-react"
import { format } from "date-fns"
import { SessionDialog } from "@/components/session-dialog"
import { Pagination } from "@/components/pagination"
import { useLanguage } from "@/context/language-context"
import { SHOOTING_TYPE_I18N, getSessionShootingType } from "@/lib/shooting-type"
import Link from "next/link"

const ITEMS_PER_PAGE = 20

export default function VideosPage() {
  const { t, language } = useLanguage()
  const shootingTexts = SHOOTING_TYPE_I18N[language as keyof typeof SHOOTING_TYPE_I18N] || SHOOTING_TYPE_I18N.fr
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [dbCategories, setDbCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filter States
  const [search, setSearch] = useState("")
  const [shootingTypeFilter, setShootingTypeFilter] = useState<"all" | "shooting" | "party">("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [subcategoryFilter, setSubcategoryFilter] = useState("all")
  const [deliveryFilter, setDeliveryFilter] = useState("all")
  const [sortOrder, setSortOrder] = useState<"recent" | "oldest" | "name_asc">("recent")
  const [currentPage, setCurrentPage] = useState(1)
  
  const [copiedPin, setCopiedPin] = useState<string | null>(null)

  const loadSessions = useCallback(async () => {
    const supabase = createClient()
    try {
      const [catsRes, sessionsRes] = await Promise.all([
        supabase
          .from("categories")
          .select("*, subcategories(*)")
          .eq("is_active", true)
          .order("display_order", { ascending: true }),
        supabase
          .from("sessions")
          .select("*, media_deliveries(*)")
          .eq("session_type", "video")
          .order("session_date", { ascending: false })
      ])

      if (catsRes.data) setDbCategories(catsRes.data)
      if (sessionsRes.data) setSessions(sessionsRes.data)
    } catch (err) {
      console.error("Error cargando sesiones de video:", err)
      setSessions([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  const getCategoryLabel = useCallback((catSlug: string) => {
    if (!catSlug) return ""
    const found = dbCategories.find(c => c.slug === catSlug || c.name.toLowerCase() === catSlug.toLowerCase())
    if (found) {
      if (language === 'fr' && found.name_fr) return found.name_fr
      if (language === 'en' && found.name_en) return found.name_en
      if (language === 'ar' && found.name_ar) return found.name_ar
      return found.name
    }
    return t[catSlug as keyof typeof t] || catSlug
  }, [dbCategories, language, t])

  const getSubcategoryLabel = useCallback((catSlug: string, subSlug: string) => {
    if (!subSlug) return ""
    for (const c of dbCategories) {
      if (c.subcategories) {
        const found = c.subcategories.find((s: any) => s.slug === subSlug || s.name.toLowerCase() === subSlug.toLowerCase())
        if (found) {
          if (language === 'fr' && found.name_fr) return found.name_fr
          if (language === 'en' && found.name_en) return found.name_en
          if (language === 'ar' && found.name_ar) return found.name_ar
          return found.name
        }
      }
    }
    return subSlug.replace(/_/g, " ")
  }, [dbCategories, language])

  // Dynamic category options (combining DB categories with any existing session categories)
  const categoryOptions = useMemo(() => {
    const map = new Map<string, string>()
    dbCategories.forEach(c => {
      map.set(c.slug, getCategoryLabel(c.slug))
    })
    sessions.forEach((s: any) => {
      if (s.category && !map.has(s.category)) {
        map.set(s.category, getCategoryLabel(s.category))
      }
    })
    return Array.from(map.entries()).map(([slug, label]) => ({ slug, label }))
  }, [dbCategories, sessions, getCategoryLabel])

  // Available subcategories based on current categoryFilter
  const availableSubcategories = useMemo(() => {
    if (categoryFilter === "all") {
      const list: { slug: string; label: string }[] = []
      dbCategories.forEach(c => {
        if (c.subcategories) {
          c.subcategories.forEach((s: any) => {
            if (s.is_active !== false && !list.some(x => x.slug === s.slug)) {
              list.push({
                slug: s.slug,
                label: language === 'fr' && s.name_fr ? s.name_fr : language === 'en' && s.name_en ? s.name_en : language === 'ar' && s.name_ar ? s.name_ar : s.name
              })
            }
          })
        }
      })
      return list
    }
    const matched = dbCategories.find(c => c.slug === categoryFilter)
    if (!matched?.subcategories) return []
    return matched.subcategories
      .filter((s: any) => s.is_active !== false)
      .map((s: any) => ({
        slug: s.slug,
        label: language === 'fr' && s.name_fr ? s.name_fr : language === 'en' && s.name_en ? s.name_en : language === 'ar' && s.name_ar ? s.name_ar : s.name
      }))
  }, [dbCategories, categoryFilter, language])

  // Filter & Sort Logic
  const filteredSessions = useMemo(() => {
    let result = sessions.filter((s: any) => {
      const finalLink =
        s.media_deliveries?.find((d: any) => d.delivery_type === "final_link")?.url || s.final_link

      const matchSearch =
        s.client_name.toLowerCase().includes(search.toLowerCase()) ||
        (s.category && s.category.toLowerCase().includes(search.toLowerCase())) ||
        (s.subcategory && s.subcategory.toLowerCase().includes(search.toLowerCase())) ||
        (s.client_phone && s.client_phone.includes(search)) ||
        (s.portal_pin && s.portal_pin.includes(search))

      const matchShootingType = shootingTypeFilter === "all" || getSessionShootingType(s) === shootingTypeFilter
      const matchStatus = statusFilter === "all" || s.status === statusFilter
      const matchCategory = categoryFilter === "all" || s.category === categoryFilter
      const matchSubcategory = subcategoryFilter === "all" || s.subcategory === subcategoryFilter

      const matchDelivery =
        deliveryFilter === "all" ||
        (deliveryFilter === "has_video" && !!finalLink) ||
        (deliveryFilter === "pending_video" && !finalLink)

      return matchSearch && matchShootingType && matchStatus && matchCategory && matchSubcategory && matchDelivery
    })

    result.sort((a: any, b: any) => {
      if (sortOrder === "recent") {
        return new Date(b.session_date).getTime() - new Date(a.session_date).getTime()
      }
      if (sortOrder === "oldest") {
        return new Date(a.session_date).getTime() - new Date(b.session_date).getTime()
      }
      if (sortOrder === "name_asc") {
        return a.client_name.localeCompare(b.client_name)
      }
      return 0
    })

    return result
  }, [sessions, search, shootingTypeFilter, statusFilter, categoryFilter, subcategoryFilter, deliveryFilter, sortOrder])

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1)
  }, [search, shootingTypeFilter, statusFilter, categoryFilter, subcategoryFilter, deliveryFilter, sortOrder])

  // Pagination Slice (20 items max)
  const totalPages = Math.ceil(filteredSessions.length / ITEMS_PER_PAGE)
  const paginatedSessions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredSessions.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredSessions, currentPage])

  const copyToClipboard = (pin: string) => {
    navigator.clipboard.writeText(pin)
    setCopiedPin(pin)
    setTimeout(() => setCopiedPin(null), 2000)
  }

  const resetFilters = () => {
    setSearch("")
    setShootingTypeFilter("all")
    setStatusFilter("all")
    setCategoryFilter("all")
    setSubcategoryFilter("all")
    setDeliveryFilter("all")
    setSortOrder("recent")
    setCurrentPage(1)
  }

  const activeFilterCount =
    (search ? 1 : 0) +
    (shootingTypeFilter !== "all" ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0) +
    (categoryFilter !== "all" ? 1 : 0) +
    (subcategoryFilter !== "all" ? 1 : 0) +
    (deliveryFilter !== "all" ? 1 : 0) +
    (sortOrder !== "recent" ? 1 : 0)

  // Summary counts
  const total = sessions.length
  const editing = sessions.filter((s) => s.status === "editing").length
  const delivered = sessions.filter((s) => s.status === "delivered").length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold tracking-wider uppercase mb-2">
            <Film className="w-3.5 h-3.5" />
            <span>{t.videoProductionTag}</span>
          </div>
          <h1 className="text-3xl font-serif tracking-wide text-[#f5f2eb]">
            {t.videosTitle}
          </h1>
          <p className="text-xs text-[#8c7a6b]">
            {t.videosSubtitle}
          </p>
        </div>

        <SessionDialog triggerType="add" defaultType="video" />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="p-5 rounded-2xl border border-[#26211c] bg-[#141210] shadow-lg">
          <span className="text-[11px] uppercase tracking-wider text-[#8c7a6b] block">{t.totalProjects}</span>
          <span className="text-2xl font-bold font-serif text-[#f5f2eb] mt-1 block">{total}</span>
        </div>
        <div className="p-5 rounded-2xl border border-[#26211c] bg-[#141210] shadow-lg">
          <span className="text-[11px] uppercase tracking-wider text-[#8c7a6b] block">{t.inEditingRoom}</span>
          <span className="text-2xl font-bold font-serif text-indigo-400 mt-1 block">{editing}</span>
        </div>
        <div className="p-5 rounded-2xl border border-[#26211c] bg-[#141210] shadow-lg">
          <span className="text-[11px] uppercase tracking-wider text-[#8c7a6b] block">{t.videosDelivered}</span>
          <span className="text-2xl font-bold font-serif text-emerald-400 mt-1 block">{delivered}</span>
        </div>
      </div>

      {/* Advanced Filter & Search Bar */}
      <div className="p-4 rounded-2xl border border-[#26211c] bg-[#141210] space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
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

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-2.5 w-full md:w-auto">
            <select
              value={shootingTypeFilter}
              onChange={(e) => setShootingTypeFilter(e.target.value as any)}
              className="w-full sm:w-auto bg-[#181613] border border-[#29241f] rounded-xl px-3 py-2 text-xs text-[#a89f91] focus:outline-none focus:border-[#c69f68]"
            >
              <option value="all">{shootingTexts.filterAll}</option>
              <option value="shooting">{shootingTexts.filterShooting}</option>
              <option value="party">{shootingTexts.filterParty}</option>
            </select>

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

            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value)
                setSubcategoryFilter("all")
              }}
              className="w-full sm:w-auto bg-[#181613] border border-[#29241f] rounded-xl px-3 py-2 text-xs text-[#a89f91] focus:outline-none focus:border-[#c69f68]"
            >
              <option value="all">{t.allCategories}</option>
              {categoryOptions.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.label}
                </option>
              ))}
            </select>

            {availableSubcategories.length > 0 && (
              <select
                value={subcategoryFilter}
                onChange={(e) => setSubcategoryFilter(e.target.value)}
                className="w-full sm:w-auto bg-[#181613] border border-[#29241f] rounded-xl px-3 py-2 text-xs text-[#a89f91] focus:outline-none focus:border-[#c69f68] animate-in fade-in duration-200"
              >
                <option value="all">{t.allSubcategories}</option>
                {availableSubcategories.map((s: any) => (
                  <option key={s.slug} value={s.slug}>
                    {s.label}
                  </option>
                ))}
              </select>
            )}

            <select
              value={deliveryFilter}
              onChange={(e) => setDeliveryFilter(e.target.value)}
              className="w-full sm:w-auto bg-[#181613] border border-[#29241f] rounded-xl px-3 py-2 text-xs text-[#a89f91] focus:outline-none focus:border-[#c69f68]"
            >
              <option value="all">{t.finalDelivery}: {t.allWord}</option>
              <option value="has_video">{t.withFinalVideo}</option>
              <option value="pending_video">{t.pendingVideo}</option>
            </select>

            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="w-full sm:w-auto bg-[#181613] border border-[#29241f] rounded-xl px-3 py-2 text-xs text-[#a89f91] focus:outline-none focus:border-[#c69f68]"
            >
              <option value="recent">{t.sortRecent}</option>
              <option value="oldest">{t.sortOldest}</option>
              <option value="name_asc">{t.sortNameAsc}</option>
            </select>

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

      {/* Table & Content */}
      {loading ? (
        <div className="rounded-2xl border border-[#26211c] bg-[#141210] p-12 text-center text-xs text-[#8c7a6b] animate-pulse">
          Cargando catálogo de proyectos audiovisuales...
        </div>
      ) : (
        <div className="rounded-2xl border border-[#26211c] bg-[#141210] shadow-xl overflow-hidden p-1 space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="bg-[#181613] text-[#70665a] uppercase tracking-wider border-b border-[#26211c] text-[10px]">
                <tr>
                  <th className="px-6 py-4">{t.client}</th>
                  <th className="px-6 py-4">{t.date}</th>
                  <th className="px-6 py-4">{t.videoType}</th>
                  <th className="px-6 py-4">{t.pin}</th>
                  <th className="px-6 py-4">{t.status}</th>
                  <th className="px-6 py-4">{t.finalDelivery}</th>
                  <th className="px-6 py-4 text-right">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#26211c]/60">
                {paginatedSessions.map((session: any) => {
                  const finalLink =
                    session.media_deliveries?.find((d: any) => d.delivery_type === "final_link")?.url ||
                    session.final_link

                  return (
                    <tr key={session.id} className="hover:bg-[#181512]/60 transition-colors">
                      <td className="px-6 py-4">
                        <Link
                          href={`/clients/${encodeURIComponent(session.client_name)}`}
                          className="font-medium text-[#f5f2eb] hover:text-[#c69f68] transition-colors inline-flex items-center gap-2"
                          title="Voir la fiche client"
                        >
                          <Video className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{session.client_name}</span>
                        </Link>
                        {session.client_phone && (
                          <div className="text-[11px] text-[#70665a] mt-0.5">{session.client_phone}</div>
                        )}
                      </td>

                      <td className="px-6 py-4 text-[#a89f91]">
                        {format(new Date(session.session_date), "dd MMM yyyy")}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 items-start">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="capitalize px-2.5 py-1 rounded-md bg-[#1d1a16] text-[#c69f68] border border-[#c69f68]/20 font-medium text-[11px]">
                              {getCategoryLabel(session.category)}
                            </span>
                            {getSessionShootingType(session) === 'party' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 font-semibold text-[9px] uppercase tracking-wider">
                                <PartyPopper className="w-2.5 h-2.5" />
                                <span>{shootingTexts.partyBadge}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#221c17] border border-[#3d3329] text-[#b3a89a] font-medium text-[9px] uppercase tracking-wider">
                                <Building2 className="w-2.5 h-2.5 text-[#c69f68]" />
                                <span>{shootingTexts.shootingBadge}</span>
                              </span>
                            )}
                          </div>
                          {session.subcategory && (
                            <span className="capitalize px-1.5 py-0.5 rounded bg-[#25201b] text-[#dfba85] border border-[#c69f68]/30 font-medium text-[10px]">
                              {getSubcategoryLabel(session.category, session.subcategory)}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {session.portal_pin ? (
                          <button
                            onClick={() => copyToClipboard(session.portal_pin)}
                            title={t.copyPinTooltip}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#201c17] hover:bg-[#28231d] text-[#e5c38e] border border-[#c69f68]/30 font-mono text-xs transition-colors"
                          >
                            <Key className="w-3 h-3 text-[#c69f68]" />
                            <span>{session.portal_pin}</span>
                            {copiedPin === session.portal_pin ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3 text-[#70665a]" />
                            )}
                          </button>
                        ) : (
                          <span className="text-[#554c42] italic">{t.noPin}</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                            session.status === "delivered"
                              ? "bg-emerald-950/40 text-emerald-300 border-emerald-800/40"
                              : session.status === "editing"
                              ? "bg-indigo-950/40 text-indigo-300 border-indigo-800/40"
                              : "bg-stone-900 text-stone-400 border-stone-800"
                          }`}
                        >
                          {t[session.status as keyof typeof t] || session.status}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        {finalLink ? (
                          <a
                            href={finalLink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-indigo-400 hover:underline inline-flex items-center gap-1"
                          >
                            <span>{t.viewVideo}</span>
                            <ExternalLink className="w-3 h-3 opacity-60" />
                          </a>
                        ) : (
                          <span className="text-[#554c42] italic">{t.pending}</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <SessionDialog
                            session={session}
                            triggerType="edit"
                            onSuccess={loadSessions}
                          />
                          <Link
                            href={`/sessions/${session.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#c69f68] hover:bg-[#dfba85] text-[#0b0a09] font-bold text-xs transition-all shadow-md"
                          >
                            <span>{t.manage}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}

                {filteredSessions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-[#8c7a6b]">
                      {t.noVideoProductionsFound}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls (20 per page) */}
          <div className="px-4 pb-2">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredSessions.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={(p) => setCurrentPage(p)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
