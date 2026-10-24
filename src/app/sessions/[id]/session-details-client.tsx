"use client"

import Link from "next/link"
import { ArrowLeft, Calendar, Pencil, Camera, Film, MessageSquare, ExternalLink } from "lucide-react"
import { SessionStatusSwitcher } from "@/components/session-status-switcher"
import { SessionDialog } from "@/components/session-dialog"
import { IngestDialog } from "@/components/ingest-dialog"
import { SessionMediaManager } from "./session-media-manager"
import { SessionHubAccordion } from "@/components/session-hub-accordion"
import { ProjectNotesHistory } from "@/components/project-notes-history"
import { SessionAuditTimeline } from "@/components/session-audit-timeline"
import { format } from "date-fns"
import { fr, es, enUS, ar } from "date-fns/locale"
import { useLanguage } from "@/context/language-context"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"

interface SessionDetailsClientProps {
  session: any
  folderLink?: string
  finalLink?: string
  selectedAssets: string[]
  projectFolder: string
}

export function SessionDetailsClient({
  session,
  folderLink,
  finalLink,
  selectedAssets,
  projectFolder,
}: SessionDetailsClientProps) {
  const { t, language } = useLanguage()
  const dateLocale = language === "es" ? es : language === "en" ? enUS : language === "ar" ? ar : fr
  const [liveCount, setLiveCount] = useState(selectedAssets.length)
  const [dbCategories, setDbCategories] = useState<any[]>([])

  useEffect(() => {
    const fetchLiveCount = async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from("sessions")
          .select("selected_assets")
          .eq("id", session.id)
          .single()
        if (data?.selected_assets && Array.isArray(data.selected_assets)) {
          setLiveCount(data.selected_assets.length)
        }
      } catch {}
    }
    fetchLiveCount()
    const timer = setInterval(fetchLiveCount, 4000)
    return () => clearInterval(timer)
  }, [session.id])

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from("categories")
          .select("*, subcategories(*)")
          .eq("is_active", true)
        if (data) setDbCategories(data)
      } catch {}
    }
    loadCategories()
  }, [])

  const getCategoryLabel = (catSlug: string) => {
    if (!catSlug) return ""
    const found = dbCategories.find(c => c.slug === catSlug || c.name.toLowerCase() === catSlug.toLowerCase())
    if (found) {
      if (language === 'fr' && found.name_fr) return found.name_fr
      if (language === 'en' && found.name_en) return found.name_en
      if (language === 'ar' && found.name_ar) return found.name_ar
      return found.name
    }
    return t[catSlug as keyof typeof t] || catSlug
  }

  const getSubcategoryLabel = (catSlug: string, subSlug: string) => {
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
  }

  const isVideo = session.session_type === 'video'

  return (
    <div className="space-y-6">
      {/* ── Top Header Bar ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 pb-4 sm:pb-5 border-b border-[#26211c]">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <Link 
            href={session.session_type === 'photo' ? '/photos' : '/videos'} 
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#181613] hover:bg-[#201c18] border border-[#26211c] hover:border-[#c69f68]/40 text-[#a89f91] hover:text-[#f5f2eb] flex items-center justify-center transition-colors shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="capitalize text-[10px] sm:text-[11px] px-2.5 py-0.5 rounded-md bg-[#1d1a16] text-[#c69f68] border border-[#c69f68]/20 font-medium">
                {getCategoryLabel(session.category)}
              </span>
              {session.subcategory && (
                <span className="capitalize text-[10px] sm:text-[11px] px-2.5 py-0.5 rounded-md bg-[#25201b] text-[#dfba85] border border-[#c69f68]/30 font-medium">
                  {getSubcategoryLabel(session.category, session.subcategory)}
                </span>
              )}
              <span className={`inline-flex items-center gap-1 text-[10px] sm:text-[11px] px-2.5 py-0.5 rounded-md font-medium border ${
                isVideo
                  ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                  : "bg-[#c69f68]/15 text-[#c69f68] border-[#c69f68]/30"
              }`}>
                {isVideo ? <Film className="w-3 h-3" /> : <Camera className="w-3 h-3" />}
                <span>{isVideo ? t.videoProduction : t.photoSessions}</span>
              </span>
              <span className="text-[11px] sm:text-xs text-[#70665a] flex items-center gap-1 ml-1">
                <Calendar className="w-3 h-3 text-[#c69f68]" />
                {format(new Date(session.session_date), 'dd MMMM yyyy', { locale: dateLocale })}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold font-serif text-[#f5f2eb] tracking-wide truncate">
              {session.client_name}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
          {/* Edit Project Button */}
          <SessionDialog
            session={session}
            triggerType="edit"
            onSuccess={() => window.location.reload()}
            customTrigger={
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#1d1a16] hover:bg-[#26211c] border border-[#382f25] hover:border-[#c69f68]/50 text-[#e4decb] hover:text-[#f5f2eb] transition-all cursor-pointer shadow-sm"
              >
                <Pencil className="w-3.5 h-3.5 text-[#c69f68]" />
                <span>{t.editProject || t.editSessionTitle || "Modifier le projet"}</span>
              </button>
            }
          />
          <IngestDialog
            defaultSessionId={session.id}
            defaultClientName={session.client_name}
            defaultProjectName={session.tags?.[0] || session.category}
            onComplete={() => window.location.reload()}
            triggerVariant="primary"
            triggerLabel={t.ingestShortBtn}
          />
          <SessionStatusSwitcher sessionId={session.id} currentStatus={session.status} />
        </div>
      </div>

      {/* ── Collapsible Info Hub: Code PIN & Stockage Studio / NAS ── */}
      <SessionHubAccordion
        session={session}
        projectFolder={projectFolder}
        selectedCount={liveCount}
        folderLink={folderLink}
        finalLink={finalLink}
      />

      {/* ── Acceso directo al Centro de Chat WhatsApp ── */}
      {session.client_phone && (
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#141210] border border-[#26211c]">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-[#25D366]/15 border border-[#25D366]/30 text-[#25D366]">
              <MessageSquare className="w-4 h-4" />
            </span>
            <div>
              <span className="text-xs font-semibold text-[#ded8d0] block">
                {language === "ar" ? "محادثة واتساب مع العميل" : language === "es" ? "Conversación de WhatsApp con el Cliente" : language === "en" ? "Client WhatsApp Conversation" : "Discussion WhatsApp Client"}
              </span>
              <span className="text-[11px] text-[#70665a] font-mono">
                {session.client_phone}
              </span>
            </div>
          </div>
          <Link
            href={`/chat?phone=${encodeURIComponent(session.client_phone)}`}
            className="px-3 py-1.5 rounded-xl bg-[#201c18] hover:bg-[#28231e] border border-[#382d20] hover:border-[#c69f68]/40 text-xs font-medium text-[#c69f68] flex items-center gap-1.5 transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#25D366]" />
            <span>{language === "ar" ? "فتح في مركز المحادثات" : language === "es" ? "Abrir en Centro de Chat" : language === "en" ? "Open in Chat Hub" : "Ouvrir dans la Messagerie"}</span>
            <ExternalLink className="w-3 h-3 text-[#70665a]" />
          </Link>
        </div>
      )}

      {/* ── Cahier de Notes & Historique de Production ── */}
      <ProjectNotesHistory
        sessionId={session.id}
        initialNotes={session.comments}
        clientName={session.client_name}
      />

      {/* ── Registro de Auditoría & Trazabilidad Estricta (Audit Trail) ── */}
      <SessionAuditTimeline
        sessionId={session.id}
        clientName={session.client_name}
      />

      {/* ── Media Manager (Photos & Videos Grid / Upload) ── */}
      <SessionMediaManager
        session={session}
        initialAssets={session.media_assets || []}
        projectFolder={projectFolder}
      />
    </div>
  )
}
