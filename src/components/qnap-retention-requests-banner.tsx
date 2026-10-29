"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import { resolveClientRetentionRequestAction } from "@/app/actions"
import { useLanguage } from "@/context/language-context"
import Link from "next/link"
import {
  HardDrive,
  ShieldAlert,
  Clock,
  CheckCircle2,
  Lock,
  MessageSquare,
  Mail,
  ExternalLink,
  RefreshCw,
  ChevronDown,
} from "lucide-react"

const RETENTION_I18N = {
  fr: {
    dir: "ltr",
    title: "Cycle de Vie QNAP RAID 1 — Demandes Clients & Préavis (7 jours)",
    subtitle: "Suivi des clients ayant demandé une copie de leurs photos avant le recyclage automatique sur le QNAP.",
    requestedTab: (n: number) => `🔒 Copies Demandées (${n})`,
    waitingTab: (n: number) => `⏳ En préavis de 7 jours (${n})`,
    noRequests: "Aucun client n'a demandé de copie urgente pour le moment.",
    noWaiting: "Aucun projet n'est actuellement en période de préavis de 7 jours.",
    requestedBadge: "🔒 Suppression QNAP Bloquée — Copie demandée par le client",
    waitingBadge: (daysLeft: number) =>
      daysLeft > 0 ? `⏳ Suppression QNAP dans ${daysLeft} jour(s)` : "⚠️ Délai de 7j expiré — Prêt pour recyclage QNAP",
    btnWhatsapp: "WhatsApp",
    btnOpenProject: "Ouvrir Fiche",
    btnMarkResent: "✓ Photos renvoyées (Autoriser recyclage)",
    btnLockManual: "🔒 Bloquer (Demande client)",
    btnVipForever: "🛡️ Protéger VIP",
    refresh: "Actualiser",
  },
  es: {
    dir: "ltr",
    title: "Ciclo de Vida QNAP RAID 1 — Solicitudes de Clientes y Preavisos (7 días)",
    subtitle: "Clientes que han solicitado copia de sus fotos originales antes del reciclaje automático en el QNAP.",
    requestedTab: (n: number) => `🔒 Copias Solicitadas (${n})`,
    waitingTab: (n: number) => `⏳ En preaviso de 7 días (${n})`,
    noRequests: "Ningún cliente ha solicitado copia de rescate por el momento.",
    noWaiting: "No hay proyectos en cuenta atrás de 7 días actualmente.",
    requestedBadge: "🔒 Borrado QNAP Bloqueado — El cliente solicitó sus fotos",
    waitingBadge: (daysLeft: number) =>
      daysLeft > 0 ? `⏳ Reciclaje QNAP en ${daysLeft} día(s)` : "⚠️ Plazo de 7 días cumplido — Listo para reciclar en QNAP",
    btnWhatsapp: "WhatsApp",
    btnOpenProject: "Ver Proyecto",
    btnMarkResent: "✓ Fotos reenviadas (Permitir reciclaje)",
    btnLockManual: "🔒 Bloquear borrado (Solicitado)",
    btnVipForever: "🛡️ Blindar VIP",
    refresh: "Actualizar",
  },
  en: {
    dir: "ltr",
    title: "QNAP RAID 1 Lifecycle — Client Copy Requests & 7-Day Notices",
    subtitle: "Clients who requested a copy of their original photos before automatic QNAP storage recycling.",
    requestedTab: (n: number) => `🔒 Copy Requested (${n})`,
    waitingTab: (n: number) => `⏳ In 7-Day Grace Period (${n})`,
    noRequests: "No clients have requested backup copies at this time.",
    noWaiting: "No projects are currently in the 7-day notice countdown.",
    requestedBadge: "🔒 QNAP Deletion Blocked — Client requested photos",
    waitingBadge: (daysLeft: number) =>
      daysLeft > 0 ? `⏳ QNAP recycle in ${daysLeft} day(s)` : "⚠️ 7-day grace expired — Ready for QNAP recycle",
    btnWhatsapp: "WhatsApp",
    btnOpenProject: "Open Project",
    btnMarkResent: "✓ Photos resent (Allow recycle)",
    btnLockManual: "🔒 Block deletion (Client request)",
    btnVipForever: "🛡️ VIP Lock",
    refresh: "Refresh",
  },
  ar: {
    dir: "rtl",
    title: "دورة حياة QNAP RAID 1 — طلبات نسخ العملاء وإشعارات الـ 7 أيام",
    subtitle: "العملاء الذين طلبوا نسخة من صورهم الأصلية قبل إعادة التدوير التلقائي في خادم QNAP.",
    requestedTab: (n: number) => `🔒 طلبات النسخ (${n})`,
    waitingTab: (n: number) => `⏳ في مهلة 7 أيام (${n})`,
    noRequests: "لا توجد طلبات نسخ من العملاء في الوقت الحالي.",
    noWaiting: "لا توجد مشاريع في فترة الإشعار المسبق (7 أيام) حالياً.",
    requestedBadge: "🔒 تم إيقاف حذف QNAP — العميل طلب صوره",
    waitingBadge: (daysLeft: number) =>
      daysLeft > 0 ? `⏳ الحذف من QNAP خلال ${daysLeft} يوم` : "⚠️ انتهت مهلة 7 أيام — جاهز لإعادة التدوير",
    btnWhatsapp: "واتساب",
    btnOpenProject: "فتح المشروع",
    btnMarkResent: "✓ تم إرسال الصور (السماح بالتدوير)",
    btnLockManual: "🔒 إيقاف الحذف (بطلب العميل)",
    btnVipForever: "🛡️ حماية VIP دائمة",
    refresh: "تحديث",
  },
}

function parseTagTimestamp(tags: string[], prefix: string): number | null {
  const found = tags.find((tg) => String(tg).startsWith(prefix))
  if (!found) return null
  const parts = String(found).split(":")
  const ts = Number(parts[2])
  return Number.isFinite(ts) && ts > 0 ? ts : Date.now()
}

export function QnapRetentionRequestsBanner() {
  const { language } = useLanguage()
  const lang = (["fr", "es", "en", "ar"].includes(language) ? language : "fr") as keyof typeof RETENTION_I18N
  const t = RETENTION_I18N[lang]

  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"requested" | "waiting">("requested")
  const [isOpen, setIsOpen] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const fetchRetentionSessions = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from("sessions")
        .select("id, client_name, client_email, client_phone, session_date, category, portal_pin, tags, status")
        .order("session_date", { ascending: true })

      const all = Array.isArray(data) ? data : []
      const relevant = all.filter((s) => {
        const tags: string[] = Array.isArray(s.tags) ? s.tags : []
        return tags.some(
          (tg) => String(tg).startsWith("retention:requested") || String(tg).startsWith("retention:notified")
        )
      })
      setSessions(relevant)
    } catch (e) {
      console.error("Error loading QNAP retention sessions:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRetentionSessions()
  }, [])

  const requestedList = sessions.filter((s) => {
    const tags: string[] = Array.isArray(s.tags) ? s.tags : []
    return tags.some((tg) => String(tg).startsWith("retention:requested"))
  })

  const waitingList = sessions.filter((s) => {
    const tags: string[] = Array.isArray(s.tags) ? s.tags : []
    const isRequested = tags.some((tg) => String(tg).startsWith("retention:requested"))
    const isPurged = tags.some((tg) => String(tg).startsWith("retention:purged"))
    const isNotified = tags.some((tg) => String(tg).startsWith("retention:notified"))
    return isNotified && !isRequested && !isPurged
  })

  const handleAction = async (
    sessionId: string,
    resolution: "resent_allow_purge" | "hold_request" | "vip_lock"
  ) => {
    setBusyId(sessionId)
    try {
      await resolveClientRetentionRequestAction(sessionId, resolution)
      await fetchRetentionSessions()
    } finally {
      setBusyId(null)
    }
  }

  if (!loading && requestedList.length === 0 && waitingList.length === 0) {
    return null
  }

  const activeItems = activeTab === "requested" ? requestedList : waitingList

  return (
    <div
      dir={t.dir}
      className="mb-6 rounded-2xl bg-[#141210] [html.light_&]:bg-[#ffffff] border border-[#c69f68]/40 overflow-hidden shadow-lg"
    >
      {/* Header */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="p-4 bg-gradient-to-r from-[#c69f68]/15 via-[#181512] to-[#141210] [html.light_&]:from-[#f4efe4] [html.light_&]:to-[#ffffff] flex items-center justify-between cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#c69f68]/20 border border-[#c69f68]/40 flex items-center justify-center text-[#c69f68]">
            {requestedList.length > 0 ? <ShieldAlert className="w-5 h-5 text-amber-400" /> : <HardDrive className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#f5f2eb] [html.light_&]:text-[#1c1917] flex items-center gap-2">
              <span>{t.title}</span>
              {requestedList.length > 0 && (
                <span className="px-2 py-0.5 text-[10px] rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                  {requestedList.length} URGENT
                </span>
              )}
            </h3>
            <p className="text-xs text-[#a89f91] [html.light_&]:text-[#6b5f54]">{t.subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              fetchRetentionSessions()
            }}
            className="p-2 rounded-lg bg-[#1e1a16] text-[#c69f68] hover:bg-[#28231d] text-xs flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{t.refresh}</span>
          </button>
          <ChevronDown className={`w-4 h-4 text-[#c69f68] transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </div>

      {isOpen && (
        <div className="p-4 border-t border-[#26211c] space-y-3">
          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("requested")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "requested"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "bg-[#1a1714] text-[#a89f91] border border-[#26211c]"
              }`}
            >
              {t.requestedTab(requestedList.length)}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("waiting")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "waiting"
                  ? "bg-[#c69f68]/20 text-[#c69f68] border border-[#c69f68]/40"
                  : "bg-[#1a1714] text-[#a89f91] border border-[#26211c]"
              }`}
            >
              {t.waitingTab(waitingList.length)}
            </button>
          </div>

          {/* Items */}
          {activeItems.length === 0 ? (
            <div className="p-4 rounded-xl bg-[#0e0d0b] border border-[#26211c] text-xs text-[#8c7a6b] text-center">
              {activeTab === "requested" ? t.noRequests : t.noWaiting}
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {activeItems.map((s) => {
                const tags: string[] = Array.isArray(s.tags) ? s.tags : []
                const notifiedTs = parseTagTimestamp(tags, "retention:notified:")
                const daysElapsed = notifiedTs ? Math.floor((Date.now() - notifiedTs) / (1000 * 60 * 60 * 24)) : 0
                const daysLeft = Math.max(0, 7 - daysElapsed)
                const cleanPhone = String(s.client_phone || "").replace(/[^0-9]/g, "")

                return (
                  <div
                    key={s.id}
                    className="p-3 rounded-xl bg-[#0e0d0b] [html.light_&]:bg-[#faf7f0] border border-[#26211c] [html.light_&]:border-[#e6dfcf] flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-[#f5f2eb] [html.light_&]:text-[#1c1917]">
                          {s.client_name}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded bg-[#1e1a16] text-[#c69f68] font-mono">
                          {s.session_date}
                        </span>
                        {activeTab === "requested" ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
                            {t.requestedBadge}
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-300 border border-sky-500/30 font-semibold">
                            {t.waitingBadge(daysLeft)}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#8c7a6b] flex flex-wrap items-center gap-3">
                        {s.client_phone && <span>📞 {s.client_phone}</span>}
                        {s.client_email && <span>✉️ {s.client_email}</span>}
                        {s.portal_pin && <span>🔑 PIN: {s.portal_pin}</span>}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {cleanPhone && (
                        <a
                          href={`https://wa.me/${cleanPhone}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>{t.btnWhatsapp}</span>
                        </a>
                      )}
                      <Link
                        href={`/sessions/${s.id}`}
                        className="px-2.5 py-1.5 rounded-lg bg-[#1e1a16] hover:bg-[#2a241e] text-[#d4cbbf] border border-[#332b22] text-xs font-semibold flex items-center gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>{t.btnOpenProject}</span>
                      </Link>

                      {activeTab === "requested" ? (
                        <button
                          type="button"
                          disabled={busyId === s.id}
                          onClick={() => handleAction(s.id, "resent_allow_purge")}
                          className="px-3 py-1.5 rounded-lg bg-[#c69f68] hover:bg-[#d8b47e] text-[#0b0a09] text-xs font-bold cursor-pointer disabled:opacity-50"
                        >
                          {t.btnMarkResent}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busyId === s.id}
                          onClick={() => handleAction(s.id, "hold_request")}
                          className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold cursor-pointer disabled:opacity-50"
                        >
                          {t.btnLockManual}
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={busyId === s.id}
                        onClick={() => handleAction(s.id, "vip_lock")}
                        className="px-2.5 py-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-semibold cursor-pointer disabled:opacity-50"
                      >
                        {t.btnVipForever}
                      </button>
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

