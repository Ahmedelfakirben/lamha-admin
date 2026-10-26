"use client"

import { useEffect } from "react"
import { Session, SessionStatus, STATUS_COLORS, STATUS_LABELS, CATEGORY_LABELS } from "@/types/database"
import { DashboardCharts } from "@/components/dashboard-charts"
import { SessionDialog } from "@/components/session-dialog"
import Link from "next/link"
import { 
  Camera, 
  Film, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Calendar,
  Key,
} from "lucide-react"
import { format } from "date-fns"
import { useLanguage } from "@/context/language-context"

interface DashboardHomeClientProps {
  sessions: Session[]
  categoryData: { name: string; value: number }[]
  statusData: { status: string; count: number }[]
}

export function DashboardHomeClient({ sessions, categoryData, statusData }: DashboardHomeClientProps) {
  const { t, language } = useLanguage()

  // En dispositivos móviles (teléfonos), redirigir directamente a la vista limpia del Calendario
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      window.location.replace("/calendar")
    }
  }, [])

  // Calculate Metrics
  const total = sessions.length
  const photos = sessions.filter(s => s.session_type === "photo").length
  const videos = sessions.filter(s => s.session_type === "video").length
  const selectionsReady = sessions.filter(s => s.selected_assets && s.selected_assets.length > 0).length
  const inProgress = sessions.filter(s => s.status === "editing" || s.status === "shooting").length

  const recentSessions = sessions.slice(0, 8)

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Hero Welcome Banner */}
      <div className="relative rounded-2xl sm:rounded-3xl border border-[#26211c] bg-gradient-to-r from-[#141210] via-[#1a1714] to-[#12100e] p-5 sm:p-8 overflow-hidden shadow-2xl">
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-[#c69f68]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6">
          <div className="space-y-1.5 sm:space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c69f68]/10 border border-[#c69f68]/30 text-[#c69f68] text-[10px] sm:text-xs font-semibold tracking-wider uppercase">
              <Sparkles className="w-3 h-3" />
              <span>{t.atelierTag}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif tracking-wide text-[#f5f2eb]">
              Lam7a Studios <span className="text-[#c69f68] italic">{t.overviewTitle}</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#8c7a6b] max-w-xl">
              {t.overviewDesc}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <SessionDialog triggerType="add" />
            <Link
              href="/photos"
              className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-[#29241f] hover:border-[#c69f68]/50 bg-[#161412] hover:bg-[#1f1b16] text-xs font-medium text-[#f5f2eb] transition-all flex items-center gap-2"
            >
              <span>{t.viewPhotoSessionsBtn}</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#c69f68]" />
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-3 sm:gap-5 grid-cols-2 lg:grid-cols-4">
        {/* Total Sessions */}
        <div className="rounded-2xl border border-[#26211c] bg-[#141210] p-3.5 sm:p-6 shadow-lg relative overflow-hidden group hover:border-[#c69f68]/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs uppercase tracking-wider text-[#8c7a6b] font-medium truncate">{t.totalSessionsKpi}</span>
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-[#c69f68]/10 flex items-center justify-center text-[#c69f68] shrink-0">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2.5 sm:mt-4">
            <div className="text-2xl sm:text-3xl font-bold text-[#f5f2eb] font-serif">{total}</div>
            <p className="text-[11px] sm:text-xs text-[#8c7a6b] mt-1 flex items-center gap-1">
              <span className="text-emerald-400 font-medium">{inProgress}</span> {t.inActiveProduction}
            </p>
          </div>
        </div>

        {/* Photo Sessions */}
        <Link href="/photos" className="rounded-2xl border border-[#26211c] bg-[#141210] p-3.5 sm:p-6 shadow-lg relative overflow-hidden group hover:border-[#c69f68]/40 transition-all block">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs uppercase tracking-wider text-[#8c7a6b] font-medium truncate">{t.photoCollectionsKpi}</span>
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 shrink-0">
              <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2.5 sm:mt-4">
            <div className="text-2xl sm:text-3xl font-bold text-[#f5f2eb] font-serif">{photos}</div>
            <p className="text-[11px] sm:text-xs text-[#c69f68] mt-1 flex items-center gap-1 group-hover:underline">
              <span>{t.manageGallery}</span>
              <ArrowRight className="w-3 h-3" />
            </p>
          </div>
        </Link>

        {/* Video Sessions */}
        <Link href="/videos" className="rounded-2xl border border-[#26211c] bg-[#141210] p-3.5 sm:p-6 shadow-lg relative overflow-hidden group hover:border-[#c69f68]/40 transition-all block">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs uppercase tracking-wider text-[#8c7a6b] font-medium truncate">{t.videoProductionKpi}</span>
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
              <Film className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2.5 sm:mt-4">
            <div className="text-2xl sm:text-3xl font-bold text-[#f5f2eb] font-serif">{videos}</div>
            <p className="text-[11px] sm:text-xs text-indigo-400 mt-1 flex items-center gap-1 group-hover:underline">
              <span>{t.projectsAndReels}</span>
              <ArrowRight className="w-3 h-3" />
            </p>
          </div>
        </Link>

        {/* Client Selections Ready */}
        <div className="rounded-2xl border border-[#26211c] bg-[#141210] p-3.5 sm:p-6 shadow-lg relative overflow-hidden group hover:border-[#c69f68]/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs uppercase tracking-wider text-[#8c7a6b] font-medium truncate">{t.clientSelectionsKpi}</span>
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2.5 sm:mt-4">
            <div className="text-2xl sm:text-3xl font-bold text-[#c69f68] font-serif">{selectionsReady}</div>
            <p className="text-[11px] sm:text-xs text-[#8c7a6b] mt-1 truncate">
              {selectionsReady > 0 ? t.selectionReadyDesc : t.waitingSelectionsDesc}
            </p>
          </div>
        </div>
      </div>

      {/* Analytics Charts */}
      <DashboardCharts categoryData={categoryData} statusData={statusData} />

      {/* Recent Sessions Table */}
      <div className="rounded-2xl border border-[#26211c] bg-[#141210] shadow-xl overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-[#26211c] flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h2 className="text-base font-semibold text-[#f5f2eb] font-serif tracking-wide">
              {t.recentSessionsTitle}
            </h2>
            <p className="text-xs text-[#8c7a6b]">
              {t.recentSessionsSubtitle}
            </p>
          </div>
          <Link
            href="/photos"
            className="text-xs text-[#c69f68] hover:text-[#e5c38e] flex items-center gap-1.5 font-medium transition-colors"
          >
            <span>{t.viewAllSessionsLink}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-xs">
            <thead className="bg-[#181613] text-[#70665a] uppercase tracking-wider border-b border-[#26211c] text-[10px]">
              <tr>
                <th className="px-6 py-3.5">{t.client}</th>
                <th className="px-6 py-3.5">{t.date}</th>
                <th className="px-6 py-3.5">{t.category}</th>
                <th className="px-6 py-3.5">{t.pin}</th>
                <th className="px-6 py-3.5">{t.clientSelection}</th>
                <th className="px-6 py-3.5">{t.workflowStatus}</th>
                <th className="px-6 py-3.5 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#26211c]/60">
              {recentSessions.map((session) => {
                const selectedCount = session.selected_assets?.length || 0
                return (
                  <tr 
                    key={session.id} 
                    className="hover:bg-[#181512]/60 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-[#f5f2eb] flex items-center gap-2">
                        {session.session_type === 'photo' ? (
                          <Camera className="w-3.5 h-3.5 text-[#c69f68]" />
                        ) : (
                          <Film className="w-3.5 h-3.5 text-indigo-400" />
                        )}
                        <span>{session.client_name}</span>
                      </div>
                      {session.client_phone && (
                        <span className="text-[11px] text-[#70665a]">{session.client_phone}</span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-[#a89f91]">
                      {format(new Date(session.session_date), 'dd MMM yyyy')}
                    </td>

                    <td className="px-6 py-4">
                      <span className="capitalize px-2.5 py-1 rounded-md bg-[#1d1a16] text-[#c69f68] border border-[#c69f68]/20 font-medium text-[11px]">
                        {t[session.category as keyof typeof t] || session.category}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      {session.portal_pin ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#201c17] text-[#e5c38e] border border-[#c69f68]/30 font-mono text-xs">
                          <Key className="w-3 h-3 text-[#c69f68]" />
                          <span>{session.portal_pin}</span>
                        </div>
                      ) : (
                        <span className="text-[#554c42] italic">
                          {language === 'fr' ? 'Sans PIN' : language === 'ar' ? 'بدون PIN' : language === 'en' ? 'No PIN' : 'Sin PIN'}
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      {selectedCount > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/40 text-emerald-300 border border-emerald-800/40 font-semibold text-[11px]">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          {selectedCount} {language === 'fr' ? 'choisies' : language === 'ar' ? 'مختارة' : language === 'en' ? 'selected' : 'elegidas'}
                        </span>
                      ) : (
                        <span className="text-[#70665a] text-[11px]">
                          {language === 'fr' ? 'En attente' : language === 'ar' ? 'في الانتظار' : language === 'en' ? 'Awaiting' : 'En espera'}
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                        session.status === 'delivered' ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40' :
                        session.status === 'editing' ? 'bg-amber-950/40 text-amber-300 border-amber-800/40' :
                        session.status === 'shooting' ? 'bg-blue-950/40 text-blue-300 border-blue-800/40' :
                        'bg-stone-900 text-stone-400 border-stone-800'
                      }`}>
                        {t[session.status as keyof typeof t] || session.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/sessions/${session.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1c1815] hover:bg-[#25201b] text-[#c69f68] hover:text-[#f5f2eb] border border-[#c69f68]/20 transition-all font-medium text-xs"
                      >
                        <span>{t.manage}</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                )
              })}

              {recentSessions.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-[#70665a]">
                    {t.noSessionsFound}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
