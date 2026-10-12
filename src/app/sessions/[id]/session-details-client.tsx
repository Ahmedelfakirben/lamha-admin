"use client"

import Link from "next/link"
import { ArrowLeft, Calendar } from "lucide-react"
import { SessionStatusSwitcher } from "@/components/session-status-switcher"
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
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="capitalize text-[10px] sm:text-[11px] px-2 sm:px-2.5 py-0.5 rounded-md bg-[#1d1a16] text-[#c69f68] border border-[#c69f68]/20 font-medium">
                {t[session.category as keyof typeof t] || session.category}
              </span>
              <span className="text-[11px] sm:text-xs text-[#70665a] flex items-center gap-1">
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
