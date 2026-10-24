"use client"

import { useState, useEffect } from "react"
import {
  ChevronDown,
  ChevronUp,
  Key,
  HardDrive,
  Copy,
  Check,
  ExternalLink,
  Link2,
  NotebookPen,
} from "lucide-react"
import { SessionPinCard } from "@/components/session-pin-card"
import { ProjectStorageHub } from "@/components/project-storage-hub"
import { useLanguage } from "@/context/language-context"

interface SessionHubAccordionProps {
  session: any
  projectFolder: string
  selectedCount: number
  folderLink?: string
  finalLink?: string
}

type ViewMode = "pin" | "storage"

function parseQuota(tags?: string[] | null): number {
  if (Array.isArray(tags)) {
    const qTag = tags.find((t: string) => t.startsWith("quota:"))
    if (qTag) {
      const parsed = parseInt(qTag.replace("quota:", ""), 10)
      if (!isNaN(parsed) && parsed > 0) return parsed
    }
  }
  return 20
}

export function SessionHubAccordion({
  session,
  projectFolder,
  selectedCount,
  folderLink,
  finalLink,
}: SessionHubAccordionProps) {
  const { t } = useLanguage()

  const [isExpanded, setIsExpanded] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>("pin")
  const [isCopiedPin, setIsCopiedPin] = useState(false)
  const [quota, setQuota] = useState<number>(() => parseQuota(session?.tags))

  // Persistir preferencia de colapso en sessionStorage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("lamha_session_hub_expanded")
      if (saved !== null) {
        setIsExpanded(saved === "true")
      }
    } catch {}
  }, [])

  const toggleExpand = () => {
    const next = !isExpanded
    setIsExpanded(next)
    try {
      sessionStorage.setItem("lamha_session_hub_expanded", String(next))
    } catch {}
  }

  const copyQuickPin = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!session?.portal_pin) return
    navigator.clipboard.writeText(session.portal_pin)
    setIsCopiedPin(true)
    setTimeout(() => setIsCopiedPin(false), 2000)
  }

  return (
    <div className="space-y-4">
      {/* ── BARRA MAESTRA DESPLEGABLE / EN-TÊTE ACCORDÉON ── */}
      <div className="rounded-2xl border border-[#2a241d] bg-[#12100e]/95 backdrop-blur-md shadow-xl overflow-hidden transition-all duration-300">
        <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Lado izquierdo: Botón desplegar + Resumen rápido */}
          <div className="flex items-center gap-3 flex-wrap min-w-0">
            {/* Botón principal de repliegue / despliegue */}
            <button
              onClick={toggleExpand}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#1a1714] hover:bg-[#24201b] border border-[#332b22] hover:border-[#c69f68]/50 text-xs font-semibold text-[#f5f2eb] transition-all shadow-sm group"
              title={isExpanded ? t.collapsePanels : t.expandPanels}
            >
              <span className="w-5 h-5 rounded-lg bg-[#c69f68]/15 text-[#c69f68] flex items-center justify-center transition-transform group-hover:scale-110">
                {isExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </span>
              <span>
                {isExpanded ? t.collapsePanels : t.expandPanels}
              </span>
            </button>

            {/* Píldoras de estado rápido */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* PIN Pill con botón de copiar rápido */}
              <button
                onClick={copyQuickPin}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#171411] border border-[#2d261e] hover:border-[#c69f68]/40 text-xs transition-colors"
                title={t.copyPinTooltip}
              >
                <Key className="w-3.5 h-3.5 text-[#c69f68]" />
                <span className="text-[11px] text-[#70665a] uppercase font-mono">PIN:</span>
                <span className="font-mono font-bold text-[#e5c38e] tracking-wider">
                  {session?.portal_pin || "----"}
                </span>
                {isCopiedPin ? (
                  <Check className="w-3 h-3 text-emerald-400 ml-0.5" />
                ) : (
                  <Copy className="w-3 h-3 text-[#70665a] hover:text-[#c69f68] ml-0.5" />
                )}
              </button>

              {/* Selección de fotos */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#171411] border border-[#2d261e] text-xs">
                <span className="text-[11px] text-[#70665a]">
                  {t.clientSelectionLabel}
                </span>
                <span
                  className={`font-semibold font-mono text-[11px] px-1.5 py-0.2 rounded ${
                    selectedCount > 0
                      ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800/40"
                      : "text-[#70665a]"
                  }`}
                >
                  {selectedCount} / {quota}
                </span>
              </div>

              {/* Carpeta del Proyecto */}
              <div className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#171411] border border-[#2d261e] text-xs font-mono text-[#a89f91]">
                <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                <span className="truncate max-w-[200px]">{projectFolder}</span>
              </div>

              {/* Notes du Projet */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#171411] border border-[#2d261e] text-xs">
                <NotebookPen className="w-3.5 h-3.5 text-[#c69f68]" />
                <span className="text-[11px] text-[#70665a]">
                  {t.notesLabel}
                </span>
                <span
                  className={`font-semibold font-mono text-[11px] px-1.5 py-0.2 rounded ${
                    session?.comments && session.comments.trim().length > 0
                      ? "bg-amber-950/60 text-amber-300 border border-amber-800/40"
                      : "text-[#70665a]"
                  }`}
                >
                  {session?.comments && session.comments.trim().length > 0
                    ? t.activeLog
                    : t.zeroNotes}
                </span>
              </div>
            </div>
          </div>

          {/* Centro: Selector de vista en pestañas (solo visible si está expandido) */}
          {isExpanded && (
            <div className="hidden lg:flex items-center rounded-xl bg-[#181512] p-1 border border-[#2d261e]">
              <button
                onClick={() => setViewMode("pin")}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  viewMode === "pin"
                    ? "bg-[#25201a] text-[#f5f2eb] shadow-sm font-semibold border border-[#3d3429]"
                    : "text-[#70665a] hover:text-[#c69f68]"
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                <span>{t.pinTabLabel}</span>
              </button>

              <button
                onClick={() => setViewMode("storage")}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  viewMode === "storage"
                    ? "bg-[#25201a] text-[#f5f2eb] shadow-sm font-semibold border border-[#3d3429]"
                    : "text-[#70665a] hover:text-[#c69f68]"
                }`}
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span>{t.storageTabLabel}</span>
              </button>
            </div>
          )}

          {/* Lado derecho: Acciones rápidas (WhatsApp, Portal, Links externos) */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Enlaces externos (Google Drive / Final) */}
            {folderLink && (
              <a
                href={folderLink}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#171411] border border-[#2d261e] hover:border-[#c69f68]/40 text-[11px] text-[#c69f68] font-medium transition-colors"
                title="Google Drive RAW"
              >
                <Link2 className="w-3 h-3" />
                <span>Drive</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}

            {finalLink && (
              <a
                href={finalLink}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#171411] border border-emerald-900/40 hover:border-emerald-500/50 text-[11px] text-emerald-400 font-medium transition-colors"
                title={t.finalDelivery}
              >
                <Link2 className="w-3 h-3" />
                <span>{t.deliveryLink}</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── CUERPO EXPANDIDO (DESPLEGABLE) ── */}
      {isExpanded && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
          {viewMode === "pin" && (
            <div className="max-w-2xl mx-auto animate-in fade-in duration-200">
              <SessionPinCard
                sessionId={session.id}
                currentPin={session.portal_pin}
                clientName={session.client_name}
                clientEmail={session.client_email}
                clientPhone={session.client_phone}
                clientId={session.client_id}
                selectedCount={selectedCount}
                quota={quota}
                onQuotaChange={setQuota}
              />
            </div>
          )}

          {viewMode === "storage" && (
            <div className="animate-in fade-in duration-200">
              <ProjectStorageHub
                projectFolder={projectFolder}
                sessionId={session.id}
                clientName={session.client_name}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
