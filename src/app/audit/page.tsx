"use client"

import { useState, useEffect } from "react"
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  RefreshCw, 
  Download, 
  User, 
  Calendar, 
  Upload, 
  Trash2, 
  KanbanSquare, 
  CheckCircle2, 
  Share2, 
  FileEdit, 
  Layers, 
  Camera, 
  Users, 
  ChevronRight,
  Eye,
  Activity,
  Sparkles,
  ArrowUpDown
} from "lucide-react"
import { getAuditLogs, getAuditStats, AuditLogEntry } from "@/lib/audit"
import { format } from "date-fns"
import { fr, es, enUS, ar } from "date-fns/locale"
import { useLanguage } from "@/context/language-context"
import { useTheme } from "@/context/theme-context"

export default function AuditTrailPage() {
  const { language, t } = useLanguage()
  const { theme } = useTheme()
  const isLight = theme === "light"

  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [stats, setStats] = useState({ totalToday: 0, uploadsToday: 0, projectChangesToday: 0, activeUsersToday: 0 })
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState("")
  const [entityFilter, setEntityFilter] = useState("all")
  const [actionFilter, setActionFilter] = useState("all")
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null)

  const dateLocale = language === "es" ? es : language === "en" ? enUS : language === "ar" ? ar : fr

  const loadData = async () => {
    setLoading(true)
    try {
      const [logsRes, statsRes] = await Promise.all([
        getAuditLogs({
          search,
          entityType: entityFilter,
          action: actionFilter,
          limit: 100,
        }),
        getAuditStats(),
      ])

      setLogs(logsRes.logs)
      setTotalCount(logsRes.total)
      setStats(statsRes)
    } catch (err) {
      console.error("Error cargando auditoría:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [entityFilter, actionFilter])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loadData()
  }

  const handleExportCSV = () => {
    if (logs.length === 0) return
    const headers = ["Fecha", "Usuario", "Email", "Rol", "Accion", "Modulo", "Elemento", "Detalles"]
    const rows = logs.map(l => [
      format(new Date(l.created_at), "yyyy-MM-dd HH:mm:ss"),
      `"${l.user_name}"`,
      `"${l.user_email}"`,
      l.user_role,
      l.action,
      l.entity_type,
      `"${l.entity_title || l.entity_id}"`,
      `"${JSON.stringify(l.details).replace(/"/g, '""')}"`
    ])
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `lamha_erp_audit_${format(new Date(), "yyyyMMdd_HHmm")}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getActionBadge = (action: string) => {
    if (action.includes("UPLOAD")) {
      return {
        icon: Upload,
        label: t.badgeUpload,
        color: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30",
      }
    }
    if (action.includes("DELETED")) {
      return {
        icon: Trash2,
        label: t.badgeDeleted,
        color: "text-rose-400 bg-rose-500/15 border-rose-500/30",
      }
    }
    if (action.includes("PLANNER")) {
      return {
        icon: KanbanSquare,
        label: t.badgePlanner,
        color: "text-amber-400 bg-amber-500/15 border-amber-500/30",
      }
    }
    if (action.includes("STATUS")) {
      return {
        icon: Activity,
        label: t.badgeStatus,
        color: "text-sky-400 bg-sky-500/15 border-sky-500/30",
      }
    }
    if (action.includes("SHARED")) {
      return {
        icon: Share2,
        label: t.badgeShared,
        color: "text-purple-400 bg-purple-500/15 border-purple-500/30",
      }
    }
    if (action.includes("CREATED")) {
      return {
        icon: CheckCircle2,
        label: t.badgeCreated,
        color: "text-[#c69f68] bg-[#c69f68]/15 border-[#c69f68]/30",
      }
    }
    return {
      icon: FileEdit,
      label: t.badgeModified,
      color: "text-[#a89f91] bg-[#1a1714] border-[#26211c]",
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#26211c]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#c69f68]/15 text-[#c69f68] border border-[#c69f68]/30 font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              {t.auditGovernanceTag}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#f5f2eb] tracking-wide">
            {t.auditTitle}
          </h1>
          <p className="text-xs text-[#8c7a6b] mt-1">
            {t.auditSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="h-9 px-3.5 rounded-xl bg-[#141210] hover:bg-[#1a1714] border border-[#26211c] hover:border-[#c69f68]/40 text-[#c69f68] text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>{t.refreshBtn}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="h-9 px-4 rounded-xl bg-gradient-to-r from-[#c69f68] to-[#dfba85] text-[#0b0a09] text-xs font-bold flex items-center gap-2 shadow-md hover:brightness-105 active:scale-95 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#0b0a09]" />
            <span>{t.exportCsvBtn}</span>
          </button>
        </div>
      </div>

      {/* ── Metrics Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-[#141210] border border-[#26211c] relative overflow-hidden">
          <div className="flex items-center justify-between text-[#8c7a6b] mb-2">
            <span className="text-xs uppercase tracking-wider font-semibold">{t.eventsToday}</span>
            <Activity className="w-4 h-4 text-[#c69f68]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-serif text-[#f5f2eb]">
            {stats.totalToday}
          </div>
          <p className="text-[11px] text-[#70665a] mt-1">{t.eventsTodayDesc}</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#141210] border border-[#26211c] relative overflow-hidden">
          <div className="flex items-center justify-between text-[#8c7a6b] mb-2">
            <span className="text-xs uppercase tracking-wider font-semibold">{t.photoUploads}</span>
            <Upload className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-serif text-emerald-400">
            {stats.uploadsToday}
          </div>
          <p className="text-[11px] text-[#70665a] mt-1">{t.photoUploadsDesc}</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#141210] border border-[#26211c] relative overflow-hidden">
          <div className="flex items-center justify-between text-[#8c7a6b] mb-2">
            <span className="text-xs uppercase tracking-wider font-semibold">{t.projectChanges}</span>
            <Layers className="w-4 h-4 text-[#c69f68]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-serif text-[#c69f68]">
            {stats.projectChangesToday}
          </div>
          <p className="text-[11px] text-[#70665a] mt-1">{t.projectChangesDesc}</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#141210] border border-[#26211c] relative overflow-hidden">
          <div className="flex items-center justify-between text-[#8c7a6b] mb-2">
            <span className="text-xs uppercase tracking-wider font-semibold">{t.activeUsers}</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-serif text-purple-300">
            {stats.activeUsersToday}
          </div>
          <p className="text-[11px] text-[#70665a] mt-1">{t.activeUsersDesc}</p>
        </div>
      </div>

      {/* ── Search & Filter Ribbon ── */}
      <div className="p-4 rounded-2xl bg-[#141210] border border-[#26211c] space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row items-center gap-3">
          {/* Search box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-[#70665a] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.auditSearchPlaceholder}
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-[#0b0a09] border border-[#26211c] text-[#f5f2eb] placeholder-[#70665a] text-xs focus:outline-none focus:border-[#c69f68]/60 transition-colors"
            />
          </div>

          {/* Module/Entity selector */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="h-10 px-3 rounded-xl bg-[#0b0a09] border border-[#26211c] text-[#d4cbbf] text-xs focus:outline-none focus:border-[#c69f68]/60 cursor-pointer"
            >
              <option value="all">{t.allModules}</option>
              <option value="session">{t.moduleSessions}</option>
              <option value="media_asset">{t.moduleMedia}</option>
              <option value="planner">{t.modulePlanner}</option>
              <option value="client">{t.moduleClients}</option>
              <option value="delivery">{t.moduleDeliveries}</option>
            </select>

            {/* Action selector */}
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="h-10 px-3 rounded-xl bg-[#0b0a09] border border-[#26211c] text-[#d4cbbf] text-xs focus:outline-none focus:border-[#c69f68]/60 cursor-pointer"
            >
              <option value="all">{t.allActions}</option>
              <option value="SESSION_CREATED">{t.actionSessionCreated}</option>
              <option value="MEDIA_BATCH_UPLOADED">{t.actionMediaUploaded}</option>
              <option value="MEDIA_DELETED">{t.actionMediaDeleted}</option>
              <option value="PLANNER_STAGE_CHANGED">{t.actionPlannerChanged}</option>
              <option value="SESSION_STATUS_CHANGED">{t.actionStatusChanged}</option>
              <option value="CLIENT_CREATED">{t.actionClientCreated}</option>
            </select>

            <button
              type="submit"
              className="h-10 px-4 rounded-xl bg-[#1e1b18] hover:bg-[#25211c] border border-[#c69f68]/30 text-[#c69f68] text-xs font-semibold cursor-pointer shrink-0 transition-colors"
            >
              {t.filterBtn}
            </button>
          </div>
        </form>
      </div>

      {/* ── Table of Audit Logs ── */}
      <div className="rounded-2xl bg-[#141210] border border-[#26211c] overflow-hidden shadow-xl">
        <div className="p-4 border-b border-[#26211c] flex items-center justify-between">
          <span className="text-xs font-bold text-[#f5f2eb]">
            {t.recordsFound} ({totalCount})
          </span>
          <span className="text-[11px] text-[#70665a] font-mono">
            {t.currentPageLast100}
          </span>
        </div>

        {loading ? (
          <div className="py-20 text-center text-[#8c7a6b] text-xs flex flex-col items-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-[#c69f68]" />
            <span>{t.queryingAuditLogs}</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-[#70665a] text-xs">
            {t.noAuditLogsFound}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0b0a09] text-[#70665a] uppercase font-mono text-[10px] border-b border-[#26211c]">
                <tr>
                  <th className="py-3 px-4">{t.colDateTime}</th>
                  <th className="py-3 px-4">{t.colUser}</th>
                  <th className="py-3 px-4">{t.colAction}</th>
                  <th className="py-3 px-4">{t.colModule}</th>
                  <th className="py-3 px-4">{t.colAffectedItem}</th>
                  <th className="py-3 px-4 text-right">{t.colDetails}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#26211c]/60">
                {logs.map((log) => {
                  const badge = getActionBadge(log.action)
                  const IconComp = badge.icon
                  const formattedDate = format(new Date(log.created_at), "dd MMM yyyy • HH:mm:ss", {
                    locale: dateLocale,
                  })

                  return (
                    <tr 
                      key={log.id} 
                      className="hover:bg-[#181613] transition-colors cursor-pointer"
                      onClick={() => setSelectedLog(log)}
                    >
                      {/* Fecha */}
                      <td className="py-3.5 px-4 font-mono text-[#8c7a6b] whitespace-nowrap">
                        {formattedDate}
                      </td>

                      {/* Usuario */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#1c1815] border border-[#c69f68]/40 flex items-center justify-center text-[#c69f68] text-[10px] font-bold">
                            {log.user_name ? log.user_name.charAt(0).toUpperCase() : <User className="w-3 h-3" />}
                          </div>
                          <div>
                            <span className="font-semibold text-[#f5f2eb] block">{log.user_name}</span>
                            <span className="text-[10px] text-[#70665a] font-mono block">{log.user_email}</span>
                          </div>
                        </div>
                      </td>

                      {/* Acción */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border inline-flex items-center gap-1.5 ${badge.color}`}>
                          <IconComp className="w-3 h-3" />
                          <span>{badge.label}</span>
                        </span>
                      </td>

                      {/* Módulo */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#1c1916] text-[#c69f68] border border-[#c69f68]/20">
                          {log.entity_type}
                        </span>
                      </td>

                      {/* Elemento Afectado */}
                      <td className="py-3.5 px-4 text-[#d4cbbf] max-w-xs truncate">
                        <span className="font-medium text-[#f5f2eb]">{log.entity_title || log.entity_id}</span>
                      </td>

                      {/* Botón Ver */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedLog(log)
                          }}
                          className="p-1.5 rounded-lg bg-[#1c1916] hover:bg-[#25201b] border border-[#26211c] text-[#c69f68] transition-colors"
                          title={t.inspectDetails}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Detail Inspection Modal ── */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl bg-[#0f0e0d] border border-[#26211c] rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#26211c] pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#c69f68]" />
                <h3 className="text-base font-serif font-bold text-[#f5f2eb]">
                  {t.auditModalTitle}
                </h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-[#8c7a6b] hover:text-[#f5f2eb] text-sm p-1 rounded-lg hover:bg-[#1a1714]"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#141210] border border-[#26211c]">
                <span className="text-[10px] uppercase font-mono text-[#70665a] block mb-1">{t.userLabel}</span>
                <span className="font-bold text-[#f5f2eb] block">{selectedLog.user_name}</span>
                <span className="font-mono text-[#8c7a6b] text-[11px] block">{selectedLog.user_email}</span>
                <span className="text-[10px] text-[#c69f68] uppercase font-mono font-bold mt-1 block">
                  Rol: {selectedLog.user_role}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#141210] border border-[#26211c]">
                <span className="text-[10px] uppercase font-mono text-[#70665a] block mb-1">{t.dateAndAction}</span>
                <span className="font-bold text-[#f5f2eb] block">{selectedLog.action}</span>
                <span className="font-mono text-[#8c7a6b] text-[11px] block">
                  {format(new Date(selectedLog.created_at), "dd MMMM yyyy • HH:mm:ss", { locale: dateLocale })}
                </span>
                <span className="text-[10px] text-[#c69f68] uppercase font-mono block mt-1">
                  {t.colModule}: {selectedLog.entity_type}
                </span>
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-mono text-[#70665a] block mb-1">{t.affectedElementLabel}</span>
              <div className="p-3 rounded-xl bg-[#141210] border border-[#26211c] text-xs font-semibold text-[#f5f2eb]">
                {selectedLog.entity_title || selectedLog.entity_id}
                <span className="block text-[10px] font-mono text-[#70665a] mt-0.5 font-normal">
                  ID: {selectedLog.entity_id}
                </span>
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-mono text-[#70665a] block mb-1">
                {t.payloadDiffLabel}
              </span>
              <pre className="p-4 rounded-xl bg-[#080706] border border-[#26211c] text-[#c69f68] font-mono text-[11px] overflow-x-auto max-h-60">
                {JSON.stringify(selectedLog.details, null, 2)}
              </pre>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-[#1a1714] border border-[#26211c] text-[#f5f2eb] text-xs font-semibold hover:bg-[#25201b] transition-colors"
              >
                {t.closeDetailBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
