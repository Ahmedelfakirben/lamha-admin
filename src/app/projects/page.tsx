"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { createClient } from "@/lib/supabase"
import { STATUS_COLORS } from "@/types/database"
import { 
  Layers, 
  Camera, 
  Film, 
  Search, 
  Sparkles, 
  Copy, 
  Check, 
  ArrowRight,
  RotateCcw,
  Pencil
} from "lucide-react"
import { format } from "date-fns"
import { SessionDialog } from "@/components/session-dialog"
import { Pagination } from "@/components/pagination"
import { useLanguage } from "@/context/language-context"
import Link from "next/link"

const ITEMS_PER_PAGE = 20

export default function ProjectsPage() {
  const { t, language } = useLanguage()
  const [sessions, setSessions] = useState<any[]>([])
  const [dbCategories, setDbCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filter States
  const [typeFilter, setTypeFilter] = useState<"all" | "photo" | "video">("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [subcategoryFilter, setSubcategoryFilter] = useState("all")
  const [selectionFilter, setSelectionFilter] = useState("all")
  const [sortOrder, setSortOrder] = useState<"recent" | "oldest" | "name_asc">("recent")
  const [search, setSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  
  const [copiedPin, setCopiedPin] = useState<string | null>(null)

  const loadAllSessions = useCallback(async () => {
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
          .select("*, media_assets(*), media_deliveries(*)")
          .order("session_date", { ascending: false })
      ])

      if (catsRes.data) setDbCategories(catsRes.data)
      if (sessionsRes.data) setSessions(sessionsRes.data)
    } catch (err) {
      console.error("Error cargando proyectos:", err)
      setSessions([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAllSessions()
  }, [loadAllSessions])

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
    sessions.forEach(s => {
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
    let result = sessions.filter((s) => {
      const matchSearch = 
        s.client_name.toLowerCase().includes(search.toLowerCase()) ||
        (s.tags && s.tags.some((t: string) => t.toLowerCase().includes(search.toLowerCase()))) ||
        (s.category && s.category.toLowerCase().includes(search.toLowerCase())) ||
        (s.subcategory && s.subcategory.toLowerCase().includes(search.toLowerCase())) ||
        (s.portal_pin && s.portal_pin.includes(search))
      
      const matchType = typeFilter === "all" || s.session_type === typeFilter
      const matchStatus = statusFilter === "all" || s.status === statusFilter
      const matchCategory = categoryFilter === "all" || s.category === categoryFilter
      const matchSubcategory = subcategoryFilter === "all" || s.subcategory === subcategoryFilter

      const hasSelection = s.selected_assets && s.selected_assets.length > 0
      const matchSelection =
        selectionFilter === "all" ||
        (selectionFilter === "has_selection" && hasSelection) ||
        (selectionFilter === "no_selection" && !hasSelection)

      return matchSearch && matchType && matchStatus && matchCategory && matchSubcategory && matchSelection
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
  }, [sessions, search, typeFilter, statusFilter, categoryFilter, subcategoryFilter, selectionFilter, sortOrder])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [search, typeFilter, statusFilter, categoryFilter, subcategoryFilter, selectionFilter, sortOrder])

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
    setTypeFilter("all")
    setStatusFilter("all")
    setCategoryFilter("all")
    setSubcategoryFilter("all")
    setSelectionFilter("all")
    setSortOrder("recent")
    setCurrentPage(1)
  }

  const activeFilterCount =
    (search ? 1 : 0) +
    (typeFilter !== "all" ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0) +
    (categoryFilter !== "all" ? 1 : 0) +
    (subcategoryFilter !== "all" ? 1 : 0) +
    (selectionFilter !== "all" ? 1 : 0) +
    (sortOrder !== "recent" ? 1 : 0)

  // Métricas conjuntas
  const total = sessions.length
  const totalPhotos = sessions.filter(s => s.session_type === "photo").length
  const totalVideos = sessions.filter(s => s.session_type === "video").length
  const selectionsReady = sessions.filter(s => s.selected_assets && s.selected_assets.length > 0).length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c69f68]/10 border border-[#c69f68]/30 text-[#c69f68] text-xs font-semibold tracking-wider uppercase mb-2">
            <Layers className="w-3.5 h-3.5" />
            <span>{t.atelierUnifiedTag}</span>
          </div>
          <h1 className="text-3xl font-serif tracking-wide text-[#f5f2eb]">
            {t.projectsTitle}
          </h1>
          <p className="text-xs text-[#8c7a6b]">
            {t.projectsSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <SessionDialog triggerType="add" />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="p-5 rounded-2xl border border-[#26211c] bg-[#141210] shadow-lg">
          <span className="text-[11px] uppercase tracking-wider text-[#8c7a6b] block">{t.totalProjects}</span>
          <span className="text-2xl font-bold font-serif text-[#f5f2eb] mt-1 block">{total}</span>
          <span className="text-[10px] text-[#70665a] mt-1 block">{t.photosAndVideosCataloged}</span>
        </div>

        <div className="p-5 rounded-2xl border border-[#26211c] bg-[#141210] shadow-lg">
          <span className="text-[11px] uppercase tracking-wider text-[#8c7a6b] block">{t.photoSessions}</span>
          <span className="text-2xl font-bold font-serif text-[#c69f68] mt-1 block">{totalPhotos}</span>
          <span className="text-[10px] text-[#70665a] mt-1 block">{t.editorialAndWeddings}</span>
        </div>

        <div className="p-5 rounded-2xl border border-[#26211c] bg-[#141210] shadow-lg">
          <span className="text-[11px] uppercase tracking-wider text-[#8c7a6b] block">{t.videoProduction}</span>
          <span className="text-2xl font-bold font-serif text-indigo-400 mt-1 block">{totalVideos}</span>
          <span className="text-[10px] text-[#70665a] mt-1 block">{t.teasersClipsMaster}</span>
        </div>

        <div className="p-5 rounded-2xl border border-[#26211c] bg-[#141210] shadow-lg">
          <span className="text-[11px] uppercase tracking-wider text-[#8c7a6b] block">{t.selectionReady}</span>
          <span className="text-2xl font-bold font-serif text-emerald-400 mt-1 block">{selectionsReady}</span>
          <span className="text-[10px] text-[#70665a] mt-1 block">{t.readyForAlbum}</span>
        </div>
      </div>

      {/* Tabs Selector: Conjunta vs Foto vs Video */}
      <div className="flex rounded-xl p-1 bg-[#141210] border border-[#26211c] max-w-md">
        <button
          onClick={() => setTypeFilter("all")}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            typeFilter === "all"
              ? "bg-[#c69f68] text-[#0b0a09] shadow-md"
              : "text-[#8c7a6b] hover:text-[#f5f2eb]"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>{t.total} ({total})</span>
        </button>

        <button
          onClick={() => setTypeFilter("photo")}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            typeFilter === "photo"
              ? "bg-[#c69f68] text-[#0b0a09] shadow-md"
              : "text-[#8c7a6b] hover:text-[#f5f2eb]"
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>{t.photoSessionsTab} ({totalPhotos})</span>
        </button>

        <button
          onClick={() => setTypeFilter("video")}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            typeFilter === "video"
              ? "bg-[#c69f68] text-[#0b0a09] shadow-md"
              : "text-[#8c7a6b] hover:text-[#f5f2eb]"
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          <span>{t.videoProductionsTab} ({totalVideos})</span>
        </button>
      </div>

      {/* Advanced Filter & Search Bar */}
      <div className="p-4 rounded-2xl border border-[#26211c] bg-[#141210] space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#70665a]" />
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-[#181613] border border-[#29241f] text-[#f5f2eb] placeholder-[#70665a] focus:border-[#c69f68] outline-none transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl bg-[#181613] border border-[#29241f] text-[#a89f91] focus:border-[#c69f68] outline-none"
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
              className="px-3 py-2 text-xs rounded-xl bg-[#181613] border border-[#29241f] text-[#a89f91] focus:border-[#c69f68] outline-none"
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
                className="px-3 py-2 text-xs rounded-xl bg-[#181613] border border-[#29241f] text-[#a89f91] focus:border-[#c69f68] outline-none animate-in fade-in duration-200"
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
              value={selectionFilter}
              onChange={(e) => setSelectionFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl bg-[#181613] border border-[#29241f] text-[#a89f91] focus:border-[#c69f68] outline-none"
            >
              <option value="all">{t.clientSelection}: {t.allWord}</option>
              <option value="has_selection">{t.withSelectionMade}</option>
              <option value="no_selection">{t.awaitingSelection}</option>
            </select>

            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="px-3 py-2 text-xs rounded-xl bg-[#181613] border border-[#29241f] text-[#a89f91] focus:border-[#c69f68] outline-none"
            >
              <option value="recent">{t.sortRecent}</option>
              <option value="oldest">{t.sortOldest}</option>
              <option value="name_asc">{t.sortNameAsc}</option>
            </select>

            {activeFilterCount > 0 && (
              <button
                onClick={resetFilters}
                className="px-3 py-2 rounded-xl bg-[#1f1a15] hover:bg-[#28211b] border border-[#c69f68]/30 text-xs text-[#c69f68] flex items-center gap-1.5 transition-colors"
                title={t.clearFilters}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t.clearFilters} ({activeFilterCount})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Unified Sessions Table */}
      <div className="rounded-2xl border border-[#26211c] bg-[#141210] shadow-xl overflow-hidden p-1 space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#181613] text-[#70665a] uppercase tracking-wider border-b border-[#26211c] text-[10px]">
              <tr>
                <th className="px-6 py-4">{t.client}</th>
                <th className="px-6 py-4">{t.typeLabel}</th>
                <th className="px-6 py-4">{t.date}</th>
                <th className="px-6 py-4">{t.category}</th>
                <th className="px-6 py-4">{t.pin}</th>
                <th className="px-6 py-4">{t.clientSelection}</th>
                <th className="px-6 py-4">{t.status}</th>
                <th className="px-6 py-4 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#26211c]/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-[#70665a]">
                    {language === 'fr' ? 'Chargement des projets...' : language === 'ar' ? 'جاري تحميل المشاريع...' : language === 'en' ? 'Loading unified projects...' : 'Cargando proyectos unificados...'}
                  </td>
                </tr>
              ) : filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-[#70665a]">
                    {language === 'fr' ? 'Aucun projet trouvé.' : language === 'ar' ? 'لم يتم العثور على مشاريع.' : language === 'en' ? 'No projects found.' : 'No se encontraron proyectos con los filtros actuales.'}
                  </td>
                </tr>
              ) : (
                paginatedSessions.map((session) => {
                  const selectedCount = session.selected_assets?.length || 0
                  const isVideo = session.session_type === "video"
                  const photoAssets = session.media_assets?.filter((a: any) => !a.asset_type.includes("video"))?.length || 0
                  const videoAssets = session.media_assets?.filter((a: any) => a.asset_type.includes("video"))?.length || 0

                  return (
                    <tr key={session.id} className="hover:bg-[#181512]/60 transition-colors">
                      <td className="px-6 py-4">
                        <Link
                          href={`/clients/${encodeURIComponent(session.client_name)}`}
                          className="font-serif font-bold text-sm text-[#f5f2eb] hover:text-[#c69f68] transition-colors inline-block"
                          title="Voir la fiche client"
                        >
                          {session.client_name}
                        </Link>
                        <div className="text-[11px] text-[#70665a] flex items-center gap-1.5 mt-0.5">
                          {session.tags?.[0] && (
                            <span className="text-[#c69f68] font-medium">#{session.tags[0]}</span>
                          )}
                          <span>•</span>
                          <span>{photoAssets} {language === 'fr' ? 'photos' : language === 'ar' ? 'صور' : 'photos'}</span>
                          <span>•</span>
                          <span>{videoAssets} {language === 'fr' ? 'vidéos' : language === 'ar' ? 'فيديو' : 'videos'}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {isVideo ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-semibold text-[10px] uppercase">
                            <Film className="w-3 h-3" />
                            <span>{t.videoProductionsTab}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#c69f68]/15 border border-[#c69f68]/30 text-[#c69f68] font-semibold text-[10px] uppercase">
                            <Camera className="w-3 h-3" />
                            <span>{t.photoSessionsTab}</span>
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-[#8c7a6b] font-mono text-[11px]">
                        {format(new Date(session.session_date), "dd MMM yyyy")}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="capitalize px-2 py-0.5 rounded-md bg-[#1d1a16] text-[#c69f68] border border-[#c69f68]/20 font-medium text-[11px]">
                            {getCategoryLabel(session.category)}
                          </span>
                          {session.subcategory && (
                            <span className="capitalize px-1.5 py-0.5 rounded bg-[#25201b] text-[#dfba85] border border-[#c69f68]/30 font-medium text-[10px]">
                              {getSubcategoryLabel(session.category, session.subcategory)}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 font-mono">
                        {session.portal_pin ? (
                          <button
                            onClick={() => copyToClipboard(session.portal_pin!)}
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#181613] hover:bg-[#201c18] border border-[#26211c] hover:border-[#c69f68]/40 text-[#c69f68] text-xs transition-colors cursor-pointer"
                            title={t.copyPinTooltip}
                          >
                            <span>{session.portal_pin}</span>
                            {copiedPin === session.portal_pin ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3 text-[#70665a]" />
                            )}
                          </button>
                        ) : (
                          <span className="text-[#554c42] italic">
                            {t.noPin}
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        {selectedCount > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#c69f68]/15 text-[#c69f68] font-semibold text-[11px]">
                            <Sparkles className="w-3 h-3 text-[#c69f68]" />
                            <span>{selectedCount} {language === 'fr' ? 'choisies' : language === 'ar' ? 'مختارة' : language === 'en' ? 'selected' : 'elegidas'}</span>
                          </span>
                        ) : (
                          <span className="text-[#554c42] text-[11px]">
                            {language === 'fr' ? 'En attente' : language === 'ar' ? 'في الانتظار' : language === 'en' ? 'Awaiting' : 'En espera'}
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase border ${
                          STATUS_COLORS[session.status as keyof typeof STATUS_COLORS] || "bg-zinc-800 text-zinc-300"
                        }`}>
                          {t[session.status as keyof typeof t] || session.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <SessionDialog
                            session={session}
                            triggerType="edit"
                            onSuccess={loadAllSessions}
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
                })
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
    </div>
  )
}
