"use client"

import { useState, useEffect } from "react"
import { 
  History, 
  ChevronDown, 
  User, 
  Upload, 
  Trash2, 
  RefreshCw, 
  KanbanSquare, 
  CheckCircle2, 
  Share2, 
  FileEdit,
  Clock,
  ShieldCheck,
  AlertCircle
} from "lucide-react"
import { getAuditLogs, AuditLogEntry } from "@/lib/audit"
import { format } from "date-fns"
import { fr, es, enUS, ar } from "date-fns/locale"
import { useLanguage } from "@/context/language-context"

interface SessionAuditTimelineProps {
  sessionId: string
  clientName: string
}

type TimelineLang = "es" | "fr" | "en" | "ar"

const TIMELINE_I18N: Record<
  TimelineLang,
  {
    title: string
    badge: string
    subtitle: string
    events: string
    viewHistory: string
    timelineOf: (clientName: string) => string
    refresh: string
    loading: string
    empty: string
    element: string
    actions: {
      upload: string
      delete: string
      planner: string
      status: string
      shared: string
      created: string
      modify: string
    }
  }
> = {
  es: {
    title: "Trazabilidad & Registro de Auditoría",
    badge: "Audit Trail ERP",
    subtitle: "Historial cronológico de quién subió fotos, modificó etapas o eliminó archivos en este proyecto.",
    events: "eventos",
    viewHistory: "Ver historial",
    timelineOf: (clientName) => `Línea de tiempo de acciones en ${clientName}`,
    refresh: "Actualizar",
    loading: "Cargando auditoría del proyecto...",
    empty: "Aún no hay registros de auditoría para este proyecto o las acciones se registraron antes de activar el módulo.",
    element: "Elemento:",
    actions: {
      upload: "Subida de Fotos",
      delete: "Foto / Elemento Eliminado",
      planner: "Cambio en Planner",
      status: "Cambio de Estado",
      shared: "Compartido con Cliente",
      created: "Creación de Proyecto",
      modify: "Modificación",
    },
  },
  fr: {
    title: "Traçabilité & Journal d'Audit",
    badge: "Audit Trail ERP",
    subtitle: "Historique chronologique des téléversements de photos, modifications d'étapes et suppressions de fichiers dans ce projet.",
    events: "événements",
    viewHistory: "Voir l'historique",
    timelineOf: (clientName) => `Chronologie des actions sur ${clientName}`,
    refresh: "Actualiser",
    loading: "Chargement de l'audit du projet...",
    empty: "Aucun enregistrement d'audit pour ce projet ou les actions ont été enregistrées avant l'activation du module.",
    element: "Élément :",
    actions: {
      upload: "Téléversement de photos",
      delete: "Photo / Élément supprimé",
      planner: "Changement de Planner",
      status: "Changement de statut",
      shared: "Partagé avec le client",
      created: "Création du projet",
      modify: "Modification",
    },
  },
  en: {
    title: "Traceability & Audit Trail",
    badge: "Audit Trail ERP",
    subtitle: "Chronological history of who uploaded photos, modified stages, or deleted files in this project.",
    events: "events",
    viewHistory: "View history",
    timelineOf: (clientName) => `Timeline of actions in ${clientName}`,
    refresh: "Refresh",
    loading: "Loading project audit trail...",
    empty: "No audit records for this project yet, or actions were recorded before activating the module.",
    element: "Item:",
    actions: {
      upload: "Photos Upload",
      delete: "Photo / Item Deleted",
      planner: "Planner Change",
      status: "Status Change",
      shared: "Shared with Client",
      created: "Project Created",
      modify: "Modification",
    },
  },
  ar: {
    title: "التتبع وسجل التدقيق",
    badge: "مسار تدقيق ERP",
    subtitle: "سجل زمني يوضح من قام برفع الصور، تعديل المراحل أو حذف الملفات في هذا المشروع.",
    events: "أحداث",
    viewHistory: "عرض السجل",
    timelineOf: (clientName) => `الجدول الزمني للإجراءات في ${clientName}`,
    refresh: "تحديث",
    loading: "جاري تحميل سجل تدقيق المشروع...",
    empty: "لا توجد سجلات تدقيق لهذا المشروع بعد أو أن الإجراءات تم تسجيلها قبل تفعيل الوحدة.",
    element: "العنصر:",
    actions: {
      upload: "رفع الصور",
      delete: "صورة / عنصر محذوف",
      planner: "تعديل في المخطط",
      status: "تغيير الحالة",
      shared: "مشاركة مع العميل",
      created: "إنشاء المشروع",
      modify: "تعديل",
    },
  },
}

export function SessionAuditTimeline({ sessionId, clientName }: SessionAuditTimelineProps) {
  const { language } = useLanguage()
  const activeLang = (["es", "fr", "en", "ar"].includes(language) ? language : "fr") as TimelineLang
  const t = TIMELINE_I18N[activeLang]
  const isRTL = activeLang === "ar"

  const [isOpen, setIsOpen] = useState(false)
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(false)

  const dateLocale = activeLang === "es" ? es : activeLang === "en" ? enUS : activeLang === "ar" ? ar : fr

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const res = await getAuditLogs({
        entityId: sessionId,
        limit: 30,
      })
      setLogs(res.logs)
    } catch (err) {
      console.error("Error fetching project audit logs:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [sessionId])

  const getActionBadge = (action: string) => {
    if (action.includes("UPLOAD")) {
      return {
        icon: Upload,
        label: t.actions.upload,
        color: "text-emerald-400 [html.light_&]:text-emerald-700 bg-emerald-500/15 [html.light_&]:bg-emerald-50 border-emerald-500/30 [html.light_&]:border-emerald-200",
      }
    }
    if (action.includes("DELETED")) {
      return {
        icon: Trash2,
        label: t.actions.delete,
        color: "text-rose-400 [html.light_&]:text-rose-700 bg-rose-500/15 [html.light_&]:bg-rose-50 border-rose-500/30 [html.light_&]:border-rose-200",
      }
    }
    if (action.includes("PLANNER")) {
      return {
        icon: KanbanSquare,
        label: t.actions.planner,
        color: "text-amber-400 [html.light_&]:text-amber-700 bg-amber-500/15 [html.light_&]:bg-amber-50 border-amber-500/30 [html.light_&]:border-amber-200",
      }
    }
    if (action.includes("STATUS")) {
      return {
        icon: RefreshCw,
        label: t.actions.status,
        color: "text-sky-400 [html.light_&]:text-sky-700 bg-sky-500/15 [html.light_&]:bg-sky-50 border-sky-500/30 [html.light_&]:border-sky-200",
      }
    }
    if (action.includes("SHARED")) {
      return {
        icon: Share2,
        label: t.actions.shared,
        color: "text-purple-400 [html.light_&]:text-purple-700 bg-purple-500/15 [html.light_&]:bg-purple-50 border-purple-500/30 [html.light_&]:border-purple-200",
      }
    }
    if (action.includes("CREATED")) {
      return {
        icon: CheckCircle2,
        label: t.actions.created,
        color: "text-[#c69f68] [html.light_&]:text-[#9b7538] bg-[#c69f68]/15 [html.light_&]:bg-[#f4efe4] border-[#c69f68]/30 [html.light_&]:border-[#c69f68]/40",
      }
    }
    return {
      icon: FileEdit,
      label: t.actions.modify,
      color: "text-[#a89f91] [html.light_&]:text-[#6b5f54] bg-[#1a1714] [html.light_&]:bg-[#f4efe4] border-[#26211c] [html.light_&]:border-[#e6dfcf]",
    }
  }

  return (
    <div 
      dir={isRTL ? "rtl" : "ltr"}
      className="rounded-2xl bg-[#141210] [html.light_&]:bg-[#ffffff] border border-[#26211c] [html.light_&]:border-[#e6dfcf] overflow-hidden transition-all shadow-md [html.light_&]:shadow-sm"
    >
      {/* Header bar / Accordion trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between text-left rtl:text-right hover:bg-[#181613] [html.light_&]:hover:bg-[#faf7f0] transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#c69f68]/20 to-[#181613] [html.light_&]:to-[#f4efe4] border border-[#c69f68]/35 flex items-center justify-center text-[#c69f68] [html.light_&]:text-[#9b7538] shrink-0">
            <History className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-serif font-bold text-[#f5f2eb] [html.light_&]:text-[#1c1917] tracking-wide">
                {t.title}
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1e1a16] [html.light_&]:bg-[#f4efe4] border border-[#c69f68]/25 text-[#c69f68] [html.light_&]:text-[#9b7538] font-mono">
                {t.badge}
              </span>
            </div>
            <p className="text-[11px] text-[#8c7a6b] [html.light_&]:text-[#786b5e] mt-0.5 truncate">
              {t.subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-[#a89f91] [html.light_&]:text-[#786b5e] font-mono hidden sm:inline">
            {logs.length > 0 ? `${logs.length} ${t.events}` : t.viewHistory}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-[#c69f68] [html.light_&]:text-[#9b7538] transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {/* Accordion Content */}
      {isOpen && (
        <div className="p-4 border-t border-[#26211c] [html.light_&]:border-[#e6dfcf] bg-[#0d0c0b]/60 [html.light_&]:bg-[#faf7f0] space-y-3">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[10px] uppercase tracking-wider text-[#70665a] [html.light_&]:text-[#786b5e] font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#c69f68] [html.light_&]:text-[#9b7538]" />
              {t.timelineOf(clientName)}
            </span>
            <button
              type="button"
              onClick={fetchLogs}
              disabled={loading}
              className="text-[11px] text-[#c69f68] [html.light_&]:text-[#9b7538] hover:text-[#dfba85] [html.light_&]:hover:text-[#b88c44] flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
              <span>{t.refresh}</span>
            </button>
          </div>

          {loading ? (
            <div className="py-8 text-center text-[#8c7a6b] [html.light_&]:text-[#786b5e] text-xs flex flex-col items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-[#c69f68] [html.light_&]:text-[#9b7538]" />
              <span>{t.loading}</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-6 text-center text-[#70665a] [html.light_&]:text-[#786b5e] text-xs bg-[#110f0d] [html.light_&]:bg-[#ffffff] rounded-xl border border-[#26211c]/60 [html.light_&]:border-[#e6dfcf] [html.light_&]:shadow-xs p-4">
              <AlertCircle className="w-4 h-4 mx-auto mb-1 text-[#c69f68]/60 [html.light_&]:text-[#9b7538]/70" />
              <span>{t.empty}</span>
            </div>
          ) : (
            <div className={`space-y-2 relative before:absolute before:inset-0 ${isRTL ? "before:right-3.5 before:left-auto" : "before:left-3.5 before:right-auto"} before:w-0.5 before:bg-[#26211c] [html.light_&]:before:bg-[#e6dfcf] before:content-['']`}>
              {logs.map((log) => {
                const badge = getActionBadge(log.action)
                const IconComponent = badge.icon
                const formattedDate = format(new Date(log.created_at), "dd MMM yyyy • HH:mm", {
                  locale: dateLocale,
                })

                return (
                  <div key={log.id} className={`relative flex items-start gap-3 ${isRTL ? "pr-8 pl-0" : "pl-8 pr-0"} py-1.5 group`}>
                    {/* Timeline Node dot */}
                    <div className={`absolute ${isRTL ? "right-2 left-auto" : "left-2 right-auto"} top-3 w-3.5 h-3.5 rounded-full bg-[#181512] [html.light_&]:bg-[#ffffff] border-2 border-[#c69f68] [html.light_&]:border-[#9b7538] group-hover:scale-110 transition-transform`} />

                    <div className="flex-1 p-3 rounded-xl bg-[#141210] [html.light_&]:bg-[#ffffff] border border-[#26211c] [html.light_&]:border-[#e6dfcf] [html.light_&]:shadow-xs hover:border-[#c69f68]/40 [html.light_&]:hover:border-[#9b7538]/50 transition-colors space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        {/* Action badge */}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${badge.color}`}>
                          <IconComponent className="w-3 h-3" />
                          <span>{badge.label}</span>
                        </span>

                        {/* Timestamp */}
                        <span className="text-[10px] font-mono text-[#70665a] [html.light_&]:text-[#786b5e] flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {formattedDate}
                        </span>
                      </div>

                      {/* User Attribution */}
                      <div className="flex items-center gap-2 text-xs text-[#f5f2eb] [html.light_&]:text-[#1c1917]">
                        <div className="w-5 h-5 rounded-full bg-[#1e1b18] [html.light_&]:bg-[#f4efe4] border border-[#c69f68]/40 [html.light_&]:border-[#9b7538]/40 flex items-center justify-center text-[#c69f68] [html.light_&]:text-[#9b7538] text-[10px] font-bold">
                          <User className="w-2.5 h-2.5" />
                        </div>
                        <span className="font-semibold text-[#f5f2eb] [html.light_&]:text-[#1c1917]">{log.user_name}</span>
                        <span className="text-[10px] text-[#8c7a6b] [html.light_&]:text-[#786b5e] font-mono">({log.user_email})</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#1e1b18] [html.light_&]:bg-[#f4efe4] text-[#c69f68] [html.light_&]:text-[#9b7538] uppercase font-mono font-bold">
                          {log.user_role}
                        </span>
                      </div>

                      {/* Details summary */}
                      {log.entity_title && (
                        <p className="text-xs text-[#d4cbbf] [html.light_&]:text-[#544c43]">
                          {t.element} <span className="font-semibold text-[#f5f2eb] [html.light_&]:text-[#1c1917]">{log.entity_title}</span>
                        </p>
                      )}

                      {/* Details diff payload if available */}
                      {log.details && Object.keys(log.details).length > 0 && (
                        <div className="text-[10px] font-mono text-[#8c7a6b] [html.light_&]:text-[#6b5f54] bg-[#0c0b0a] [html.light_&]:bg-[#f5efe3] p-2 rounded-lg border border-[#26211c]/80 [html.light_&]:border-[#e6dfcf] overflow-x-auto">
                          {Object.entries(log.details).map(([key, val]) => (
                            <div key={key} className="flex gap-1.5">
                              <span className="text-[#c69f68] [html.light_&]:text-[#9b7538]">{key}:</span>
                              <span className="text-[#d4cbbf] [html.light_&]:text-[#2c2621]">{typeof val === "object" ? JSON.stringify(val) : String(val)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
