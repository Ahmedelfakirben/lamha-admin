"use client"

import { useState, useEffect } from "react"
import {
  NotebookPen,
  Plus,
  Clock,
  Trash2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react"
import { updateSessionNotes } from "@/app/actions"
import { format } from "date-fns"
import { useLanguage } from "@/context/language-context"

interface ProjectNotesHistoryProps {
  sessionId: string
  initialNotes?: string | null
  clientName: string
}

export interface NoteEntry {
  id: string
  timestamp: string | null
  text: string
  isInitial?: boolean
}

/**
 * Décompose le texte brut des commentaires en entrées horodatées
 */
export function parseNotesIntoEntries(rawNotes: string): NoteEntry[] {
  if (!rawNotes || !rawNotes.trim()) return []

  const clean = rawNotes.trim()
  // Détecte les blocs [DD/MM/YYYY HH:mm] ou similaires
  const entryRegex = /\[(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}(?:\s+(?:à\s+)?\d{1,2}:\d{2}(?::\d{2})?)?)\]\s*:?\s*([\s\S]*?)(?=(?:\n\s*\[\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|$))/gi

  const entries: NoteEntry[] = []
  const firstBracket = clean.indexOf("[")

  // Texte précédant le premier horodatage (note initiale ou consignes)
  if (firstBracket > 0) {
    const initialText = clean.substring(0, firstBracket).trim()
    if (initialText) {
      entries.push({
        id: "initial-note",
        timestamp: null,
        text: initialText,
        isInitial: true,
      })
    }
  } else if (firstBracket === -1) {
    // Aucune date dans la note, c'est une note simple
    entries.push({
      id: "raw-single-note",
      timestamp: null,
      text: clean,
      isInitial: true,
    })
    return entries
  }

  let match: RegExpExecArray | null
  while ((match = entryRegex.exec(clean)) !== null) {
    const ts = match[1]?.trim() || null
    const txt = match[2]?.trim() || ""
    if (txt) {
      entries.push({
        id: `entry-${entries.length}-${ts || "no-ts"}`,
        timestamp: ts,
        text: txt,
        isInitial: false,
      })
    }
  }

  // Si l'expression régulière n'a rien capturé mais qu'il y a du texte
  if (entries.length === 0 && clean) {
    entries.push({
      id: "raw-fallback",
      timestamp: null,
      text: clean,
      isInitial: true,
    })
  }

  return entries
}

/**
 * Reconstitue la chaîne globale pour Supabase
 */
export function serializeEntriesToText(entries: NoteEntry[]): string {
  return entries
    .map((e) => {
      if (e.timestamp) {
        return `[${e.timestamp}] ${e.text.trim()}`
      }
      return e.text.trim()
    })
    .join("\n\n")
}

export function ProjectNotesHistory({
  sessionId,
  initialNotes = "",
  clientName,
}: ProjectNotesHistoryProps) {
  const { t } = useLanguage()
  const [rawNotes, setRawNotes] = useState(initialNotes || "")
  const [entries, setEntries] = useState<NoteEntry[]>(() =>
    parseNotesIntoEntries(initialNotes || "")
  )
  const [isExpanded, setIsExpanded] = useState(true)
  const [isAddFormOpen, setIsAddFormOpen] = useState(false)
  const [newNoteInput, setNewNoteInput] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [successNotice, setSuccessNotice] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Synchroniser si initialNotes change depuis le serveur
  useEffect(() => {
    setRawNotes(initialNotes || "")
    setEntries(parseNotesIntoEntries(initialNotes || ""))
  }, [initialNotes])

  // Ajouter une nouvelle note horodatée au journal
  const handleAddEntry = async () => {
    if (!newNoteInput.trim()) return

    const now = new Date()
    const timestampStr = format(now, "dd/MM/yyyy HH:mm")

    const newEntry: NoteEntry = {
      id: `entry-${Date.now()}`,
      timestamp: timestampStr,
      text: newNoteInput.trim(),
      isInitial: false,
    }

    // Ajout en tête de liste (plus récent en haut)
    const updatedEntries = [newEntry, ...entries]
    const updatedRaw = serializeEntriesToText(updatedEntries)

    setEntries(updatedEntries)
    setRawNotes(updatedRaw)
    setNewNoteInput("")
    setIsAddFormOpen(false)
    setIsSaving(true)

    try {
      const res = await updateSessionNotes(sessionId, updatedRaw)
      if (res.success) {
        setSuccessNotice(true)
        setTimeout(() => setSuccessNotice(false), 2500)
      }
    } catch (err) {
      console.error("Erreur enregistrement note:", err)
    } finally {
      setIsSaving(false)
    }
  }

  // Supprimer une entrée de la chronologie
  const handleDeleteEntry = async (id: string) => {
    const updatedEntries = entries.filter((e) => e.id !== id)
    const updatedRaw = serializeEntriesToText(updatedEntries)

    setEntries(updatedEntries)
    setRawNotes(updatedRaw)
    setIsSaving(true)

    try {
      const res = await updateSessionNotes(sessionId, updatedRaw)
      if (res.success) {
        setSuccessNotice(true)
        setTimeout(() => setSuccessNotice(false), 2500)
      }
    } catch (err) {
      console.error("Erreur suppression note:", err)
    } finally {
      setIsSaving(false)
    }
  }

  const copyNoteText = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="rounded-2xl border border-[#2a241d] bg-[#12100e]/95 backdrop-blur-md shadow-xl overflow-hidden transition-all duration-300">
      {/* ── EN-TÊTE DU CAHIER DE NOTES ── */}
      <div className="px-5 py-3.5 border-b border-[#241f1a] flex flex-wrap items-center justify-between gap-3 bg-[#161310]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-8 h-8 rounded-xl bg-[#1e1a16] border border-[#332b22] hover:border-[#c69f68]/50 text-[#c69f68] flex items-center justify-center transition-all cursor-pointer shadow-sm group"
            title={isExpanded ? "Réduire le cahier de notes" : "Développer le cahier de notes"}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 group-hover:scale-110 transition-transform" />
            ) : (
              <ChevronDown className="w-4 h-4 group-hover:scale-110 transition-transform" />
            )}
          </button>

          <div>
            <div className="flex items-center gap-2">
              <NotebookPen className="w-4 h-4 text-[#c69f68]" />
              <h3 className="text-sm font-serif font-bold text-[#f5f2eb] tracking-wide">
                Cahier de Notes & Historique de Production
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#1e1a16] border border-[#382f25] text-[#c69f68] font-semibold">
                {entries.length} {entries.length === 1 ? "entrée" : "entrées"}
              </span>
            </div>
            <p className="text-[11px] text-[#70665a] mt-0.5">
              Journal chronologique pour {clientName}
            </p>
          </div>
        </div>

        {/* Contrôles de droite : SEULEMENT LE BOUTON D'AJOUT DE NOTE */}
        <div className="flex items-center gap-2 flex-wrap">
          {successNotice && (
            <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-800/40 animate-in fade-in duration-200">
              <Check className="w-3.5 h-3.5" /> Enregistré ✓
            </span>
          )}

          {/* Bouton pour déployer le champ d'ajout de note */}
          <button
            type="button"
            onClick={() => setIsAddFormOpen(!isAddFormOpen)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-sm ${
              isAddFormOpen
                ? "bg-[#c69f68] text-[#0b0a09] border-[#c69f68]"
                : "bg-[#1e1a16] hover:bg-[#25201a] border-[#382f25] hover:border-[#c69f68]/50 text-[#c69f68]"
            }`}
            title={isAddFormOpen ? "Fermer le formulaire de note" : "Ajouter une note"}
          >
            <Plus className={`w-3.5 h-3.5 transition-transform duration-200 ${isAddFormOpen ? "rotate-45" : ""}`} />
            <span>{isAddFormOpen ? "Fermer" : "Ajouter Note"}</span>
          </button>
        </div>
      </div>

      {/* ── CONTENU DÉPLOYÉ : CHRONOLOGIE DIRECTE ── */}
      {isExpanded && (
        <div className="p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          {/* FORMULAIRE DÉPLOYABLE D'AJOUT RAPIDE HORODATÉ */}
          {isAddFormOpen && (
            <div className="p-4 rounded-xl bg-[#0e0c0a] border border-[#c69f68]/30 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200 shadow-lg">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#f5f2eb] flex items-center gap-2">
                  <Plus className="w-3.5 h-3.5 text-[#c69f68]" />
                  <span>Nouvelle consigne ou mise à jour au journal</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#70665a] font-mono">
                    Horodatage automatique
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAddFormOpen(false)}
                    className="text-[#70665a] hover:text-[#f5f2eb] text-xs px-1 rounded cursor-pointer"
                    title="Fermer"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <textarea
                  rows={2}
                  autoFocus
                  value={newNoteInput}
                  onChange={(e) => setNewNoteInput(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                      e.preventDefault()
                      handleAddEntry()
                    }
                  }}
                  placeholder="Ex : Le client préfère les tirages en noir et blanc • Changement de tenue prévu à 16h30 • Acompte validé..."
                  className="flex-1 p-3 rounded-xl bg-[#141210] border border-[#2d261e] text-xs text-[#f5f2eb] placeholder-[#554c42] focus:border-[#c69f68] focus:ring-1 focus:ring-[#c69f68]/30 outline-none leading-relaxed transition-all resize-y"
                />

                <div className="flex sm:flex-col gap-1.5 shrink-0 self-end sm:self-stretch justify-end">
                  <button
                    type="button"
                    onClick={handleAddEntry}
                    disabled={isSaving || !newNoteInput.trim()}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#c69f68] to-[#dfba85] text-[#0b0a09] font-bold text-xs shadow-md hover:shadow-[#c69f68]/20 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isSaving ? "Ajout..." : "Enregistrer"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddFormOpen(false)
                      setNewNoteInput("")
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#141210] border border-[#26211c] text-[#70665a] hover:text-[#f5f2eb] text-xs transition-colors cursor-pointer"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* HISTORIQUE CHRONOLOGIQUE PERMANENT (TIMELINE) */}
          <div className="space-y-3">
            {entries.length === 0 ? (
              <div className="p-8 rounded-xl bg-[#0b0a09] border border-[#1f1b17] text-center space-y-3">
                <NotebookPen className="w-6 h-6 text-[#554c42] mx-auto" />
                <p className="text-xs text-[#70665a]">
                  Aucune note enregistrée pour ce projet.
                </p>
                <button
                  type="button"
                  onClick={() => setIsAddFormOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1c1815] border border-[#c69f68]/30 text-[#c69f68] text-xs font-semibold hover:bg-[#c69f68]/10 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter une première note</span>
                </button>
              </div>
            ) : (
              <div className="relative pl-6 space-y-3 before:content-[''] before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-[#c69f68]/40 before:via-[#332b22] before:to-transparent">
                {entries.map((entry, idx) => (
                  <div
                    key={entry.id || idx}
                    className="relative rounded-xl border border-[#241f1a] bg-[#0e0c0a] p-3.5 hover:border-[#382f25] transition-all group shadow-sm"
                  >
                    {/* Puce d'horodatage sur la ligne */}
                    <span className="absolute -left-[21px] top-4 w-2.5 h-2.5 rounded-full bg-[#c69f68] ring-4 ring-[#141210] shadow-sm shadow-[#c69f68]/50" />

                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        {entry.timestamp ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#181512] border border-[#332b22] text-[10px] font-mono font-semibold text-[#c69f68]">
                            <Clock className="w-3 h-3" />
                            {entry.timestamp}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#181512] border border-[#332b22] text-[10px] font-mono text-[#a89f91]">
                            <Sparkles className="w-3.5 h-3.5 text-[#c69f68]" />
                            Note initiale de la séance
                          </span>
                        )}

                        {idx === 0 && entry.timestamp && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 font-mono">
                            Dernière mise à jour
                          </span>
                        )}
                      </div>

                      {/* Actions : Copier & Supprimer l'entrée */}
                      <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => copyNoteText(entry.id, entry.text)}
                          className="p-1 rounded-lg text-[#70665a] hover:text-[#c69f68] hover:bg-[#1a1714] transition-colors cursor-pointer"
                          title="Copier le texte"
                        >
                          {copiedId === entry.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="p-1 rounded-lg text-[#70665a] hover:text-red-400 hover:bg-[#1a1714] transition-colors cursor-pointer"
                          title="Supprimer cette note"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="text-xs text-[#d6cebf] leading-relaxed whitespace-pre-wrap font-sans">
                      {entry.text}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
