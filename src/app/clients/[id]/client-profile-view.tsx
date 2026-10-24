"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { 
  Users, 
  Phone, 
  Mail, 
  Camera, 
  Film, 
  ArrowLeft, 
  ArrowRight, 
  Calendar as CalendarIcon, 
  Key, 
  Copy, 
  Check, 
  Folder, 
  ExternalLink, 
  Plus, 
  Edit3, 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  Share2
} from "lucide-react"
import { format } from "date-fns"
import { fr, es, enUS } from "date-fns/locale"
import { SessionDialog } from "@/components/session-dialog"
import { updateClientContactInfo } from "@/app/actions"
import { useLanguage } from "@/context/language-context"
import { WhatsAppChatPanel } from "@/components/whatsapp-chat-panel"

interface ClientProfileViewProps {
  clientName: string
  clientPhone: string | null
  clientEmail: string | null
  clientNotes: string | null
  sessions: any[]
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  pending: { label: "En attente", bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
  shooting: { label: "En séance / Tournage", bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30" },
  editing: { label: "En cours d'édition", bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
  edited: { label: "Prêt pour livraison", bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/30" },
  delivered: { label: "Livré & Archivé", bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
  archived: { label: "Archivé", bg: "bg-stone-500/10", text: "text-stone-400", border: "border-stone-500/30" },
}

export function ClientProfileView({
  clientName,
  clientPhone,
  clientEmail,
  clientNotes,
  sessions
}: ClientProfileViewProps) {
  const router = useRouter()
  const { t, language } = useLanguage()
  const dateLocale = language === "es" ? es : language === "fr" ? fr : enUS

  const [copiedPin, setCopiedPin] = useState<string | null>(null)
  
  // Edit contact info modal state
  const [isEditingContact, setIsEditingContact] = useState(false)
  const [editName, setEditName] = useState(clientName)
  const [editPhone, setEditPhone] = useState(clientPhone || "")
  const [editEmail, setEditEmail] = useState(clientEmail || "")
  const [editNotes, setEditNotes] = useState(clientNotes || "")
  const [savingContact, setSavingContact] = useState(false)

  // Calculations
  const totalSessions = sessions.length
  const totalPhotos = sessions.filter(s => s.session_type === "photo").length
  const totalVideos = sessions.filter(s => s.session_type === "video").length
  
  const totalMediaAssets = sessions.reduce((acc, s) => acc + (s.media_assets?.length || 0), 0)
  const totalSelectedAssets = sessions.reduce((acc, s) => acc + (s.selected_assets?.length || 0), 0)

  const copyPin = (pin: string) => {
    navigator.clipboard.writeText(pin)
    setCopiedPin(pin)
    setTimeout(() => setCopiedPin(null), 2000)
  }

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingContact(true)
    try {
      const res = await updateClientContactInfo(clientName, {
        name: editName,
        phone: editPhone || undefined,
        email: editEmail || undefined,
        notes: editNotes || undefined
      })
      if (res.success) {
        setIsEditingContact(false)
        if (res.updatedName && res.updatedName !== clientName) {
          router.push(`/clients/${encodeURIComponent(res.updatedName)}`)
        } else {
          router.refresh()
        }
      }
    } catch (err) {
      console.error("Erreur enregistrement contact client:", err)
    } finally {
      setSavingContact(false)
    }
  }

  const cleanPhoneForWhatsapp = (phone: string | null) => {
    if (!phone) return ""
    return phone.replace(/[^0-9]/g, "")
  }

  return (
    <div className="space-y-8 select-none">
      {/* Navigation Breadcrumb */}
      <div>
        <Link 
          href="/clients" 
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#8c7a6b] hover:text-[#c69f68] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Retour au Répertoire Clients</span>
        </Link>
      </div>

      {/* Luxury Client Profile Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-b from-[#181512] via-[#14120f] to-[#0e0c0a] border border-[#2a241f] shadow-2xl relative overflow-hidden">
        {/* Decorative Gold Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#c69f68]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Avatar and Name */}
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-[#c69f68]/30 via-[#1c1815] to-[#0c0b0a] border border-[#c69f68]/40 flex items-center justify-center text-[#c69f68] font-serif text-2xl md:text-3xl font-bold shadow-xl shadow-[#c69f68]/10 shrink-0">
              {clientName.charAt(0).toUpperCase()}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] px-2.5 py-0.5 rounded-full bg-[#201c18] text-[#c69f68] font-semibold border border-[#c69f68]/30">
                  Dossier Client
                </span>
                <span className="text-xs text-[#70665a] font-medium">
                  {totalSessions} {totalSessions === 1 ? "projet associé" : "projets associés"}
                </span>
              </div>

              <h1 className="text-2xl md:text-3xl font-serif font-bold text-[#f5f2eb] tracking-tight">
                {clientName}
              </h1>

              {/* Badges Overview */}
              <div className="flex items-center gap-3 text-xs text-[#a89f91] pt-1">
                {totalPhotos > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-[#c69f68]">
                    <Camera className="w-3.5 h-3.5" />
                    <span>{totalPhotos} Photo{totalPhotos > 1 ? "s" : ""}</span>
                  </span>
                )}
                {totalVideos > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-indigo-400">
                    <Film className="w-3.5 h-3.5" />
                    <span>{totalVideos} Vidéo{totalVideos > 1 ? "s" : ""}</span>
                  </span>
                )}
                {totalSelectedAssets > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{totalSelectedAssets} sélections client</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Top Actions: Edit Contact & Add New Project */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setEditName(clientName)
                setEditPhone(clientPhone || "")
                setEditEmail(clientEmail || "")
                setEditNotes(clientNotes || "")
                setIsEditingContact(true)
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1c1815] hover:bg-[#25201b] border border-[#332b23] hover:border-[#c69f68]/40 text-xs font-semibold text-[#f5f2eb] transition-all cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#c69f68]" />
              <span>Modifier Coordonnées</span>
            </button>

            {/* Add New Session for this Client */}
            <SessionDialog
              triggerType="add"
              session={{
                client_name: clientName,
                client_phone: clientPhone,
                client_email: clientEmail
              }}
              onSuccess={() => router.refresh()}
              customTrigger={
                <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#c69f68] to-[#dfba85] text-[#0b0a09] font-bold text-xs shadow-lg hover:shadow-[#c69f68]/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer">
                  <Plus className="w-4 h-4 text-[#0b0a09]" />
                  <span>Nouveau Projet</span>
                </button>
              }
            />
          </div>
        </div>

        {/* Contact Coordinates Detail Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-[#26211c]">
          {/* Phone */}
          <div className="p-3.5 rounded-xl bg-[#100e0c] border border-[#221e1a] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#1c1815] text-[#c69f68]">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#70665a] tracking-wider block">
                  Téléphone
                </span>
                {clientPhone ? (
                  <a href={`tel:${clientPhone}`} className="text-xs text-[#f5f2eb] font-semibold hover:text-[#c69f68] transition-colors">
                    {clientPhone}
                  </a>
                ) : (
                  <span className="text-xs text-[#554c42] italic">Non renseigné</span>
                )}
              </div>
            </div>

            {clientPhone && (
              <a
                href={`https://wa.me/${cleanPhoneForWhatsapp(clientPhone)}`}
                target="_blank"
                rel="noreferrer"
                title="Contacter sur WhatsApp"
                className="px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold hover:bg-emerald-500/20 transition-colors"
              >
                WhatsApp
              </a>
            )}
          </div>

          {/* Email */}
          <div className="p-3.5 rounded-xl bg-[#100e0c] border border-[#221e1a] flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#1c1815] text-[#c69f68]">
              <Mail className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-[#70665a] tracking-wider block">
                Adresse Email
              </span>
              {clientEmail ? (
                <a 
                  href={`mailto:${clientEmail}`} 
                  title={clientEmail}
                  className="text-xs text-[#f5f2eb] font-semibold hover:text-[#c69f68] transition-colors truncate block"
                >
                  {clientEmail}
                </a>
              ) : (
                <span className="text-xs text-[#554c42] italic">Non renseignée</span>
              )}
            </div>
          </div>

          {/* Client Notes / Preferences */}
          <div className="p-3.5 rounded-xl bg-[#100e0c] border border-[#221e1a] flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#1c1815] text-[#c69f68]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-[#70665a] tracking-wider block">
                Consignes Client
              </span>
              <p className="text-xs text-[#a89f91] truncate" title={clientNotes || "Aucune consigne particulière"}>
                {clientNotes || "Aucune consigne particulière enregistrée."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Associated Projects Section (Core Request) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-serif font-bold text-[#f5f2eb]">
              Projets & Séances de ce Client ({sessions.length})
            </h2>
            <p className="text-xs text-[#8c7a6b]">
              Sélectionnez un projet pour accéder à sa gestion, galerie média et livraison.
            </p>
          </div>
        </div>

        {/* Projects Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sessions.map((sess) => {
            const statusConfig = STATUS_CONFIG[sess.status] || STATUS_CONFIG.pending
            const sharedCount = sess.media_assets?.filter((a: any) => a.is_shared).length || 0
            const selectedCount = sess.selected_assets?.length || 0
            const folderLink = sess.media_deliveries?.find((d: any) => d.delivery_type === "folder_link")?.url

            return (
              <div
                key={sess.id}
                className="group relative p-5 rounded-2xl bg-[#141210] border border-[#26211c] hover:border-[#c69f68]/50 shadow-xl transition-all duration-200 flex flex-col justify-between"
              >
                <div className="space-y-3.5">
                  {/* Category Pill & Status Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#1e1a16] text-[#c69f68] border border-[#332b23]">
                      {sess.session_type === "photo" ? (
                        <Camera className="w-3 h-3 text-[#c69f68]" />
                      ) : (
                        <Film className="w-3 h-3 text-indigo-400" />
                      )}
                      <span className="capitalize">{sess.category || "Projet"}</span>
                    </span>

                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
                      {statusConfig.label}
                    </span>
                  </div>

                  {/* Project Title / Date */}
                  <div>
                    <h3 className="text-sm font-bold text-[#f5f2eb] group-hover:text-[#c69f68] transition-colors">
                      {sess.subcategory || sess.category ? `${sess.category.toUpperCase()} — ${sess.client_name}` : sess.client_name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-[#70665a] mt-1">
                      <CalendarIcon className="w-3 h-3" />
                      <span>{format(new Date(sess.session_date), "dd MMMM yyyy", { locale: dateLocale })}</span>
                    </div>
                  </div>

                  {/* Badges / Metrics Row */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#26211c] text-xs">
                    {/* PIN */}
                    <div className="p-2 rounded-lg bg-[#0e0d0b] border border-[#221e1a] flex items-center justify-between">
                      <span className="text-[10px] text-[#70665a] uppercase font-bold">PIN</span>
                      {sess.portal_pin ? (
                        <button
                          onClick={() => copyPin(sess.portal_pin)}
                          className="font-mono text-xs font-bold text-[#c69f68] flex items-center gap-1 hover:underline cursor-pointer"
                          title="Copier le PIN"
                        >
                          {copiedPin === sess.portal_pin ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{sess.portal_pin}</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-[#554c42] italic">Aucun</span>
                      )}
                    </div>

                    {/* Media Assets Count */}
                    <div className="p-2 rounded-lg bg-[#0e0d0b] border border-[#221e1a] flex items-center justify-between">
                      <span className="text-[10px] text-[#70665a] uppercase font-bold">Médias</span>
                      <span className="text-xs font-semibold text-[#ded8ce]">
                        {sess.media_assets?.length || 0}
                      </span>
                    </div>
                  </div>

                  {/* Extended stats: Shared & Selected */}
                  {(sharedCount > 0 || selectedCount > 0 || folderLink) && (
                    <div className="flex items-center gap-2 text-[11px] text-[#8c7a6b] flex-wrap pt-1">
                      {sharedCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                          <Share2 className="w-3 h-3" />
                          <span>{sharedCount} partagées</span>
                        </span>
                      )}
                      {selectedCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-semibold">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{selectedCount} sél.</span>
                        </span>
                      )}
                      {folderLink && (
                        <a
                          href={folderLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[#c69f68] hover:underline"
                        >
                          <Folder className="w-3 h-3" />
                          <span>Drive RAW</span>
                        </a>
                      )}
                    </div>
                  )}

                  {/* Notes Snippet if present */}
                  {sess.comments && (
                    <div className="p-2 rounded-lg bg-[#0b0a09] border border-[#221e1a] text-[11px] text-[#a89f91] italic line-clamp-2">
                      "{sess.comments.split("\n")[0]}"
                    </div>
                  )}
                </div>

                {/* Direct CTA Button to Enter the Project */}
                <div className="mt-5 pt-4 border-t border-[#26211c]">
                  <Link
                    href={`/sessions/${sess.id}`}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#201c18] hover:bg-[#c69f68] text-[#c69f68] hover:text-[#0b0a09] font-bold text-xs border border-[#c69f68]/30 hover:border-[#c69f68] transition-all duration-200 cursor-pointer shadow-md"
                  >
                    <span>Accéder au Projet</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* WhatsApp Chat en Vivo */}
      <WhatsAppChatPanel
        clientId={sessions[0]?.client_id || null}
        clientPhone={clientPhone}
        clientName={clientName}
        title={`WhatsApp • ${clientName}`}
      />

      {/* Edit Contact Coordinates Dialog Modal */}
      {isEditingContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-[#141210] border border-[#2c2620] shadow-2xl p-6 space-y-5"
          >
            <div className="flex items-center justify-between border-b border-[#26211c] pb-3">
              <h3 className="text-base font-serif font-bold text-[#f5f2eb]">
                Modifier les Coordonnées Client
              </h3>
              <button
                onClick={() => setIsEditingContact(false)}
                className="text-[#70665a] hover:text-[#f5f2eb] text-xs font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveContact} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#a89f91] block mb-1">
                  Nom du Client
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full bg-[#0c0b0a] border border-[#2c2620] rounded-xl px-3 py-2 text-xs text-[#f5f2eb] focus:border-[#c69f68] outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#a89f91] block mb-1">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+33 6 12 34 56 78"
                  className="w-full bg-[#0c0b0a] border border-[#2c2620] rounded-xl px-3 py-2 text-xs text-[#f5f2eb] focus:border-[#c69f68] outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#a89f91] block mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="client@domaine.com"
                  className="w-full bg-[#0c0b0a] border border-[#2c2620] rounded-xl px-3 py-2 text-xs text-[#f5f2eb] focus:border-[#c69f68] outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#a89f91] block mb-1">
                  Consignes / Notes Générales
                </label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Notes sur le client, préférences artistiques..."
                  className="w-full bg-[#0c0b0a] border border-[#2c2620] rounded-xl p-3 text-xs text-[#f5f2eb] focus:border-[#c69f68] outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#26211c]">
                <button
                  type="button"
                  onClick={() => setIsEditingContact(false)}
                  className="px-3 py-2 rounded-xl text-xs text-[#a89f91] hover:text-[#f5f2eb]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={savingContact || !editName.trim()}
                  className="px-4 py-2 rounded-xl bg-[#c69f68] hover:bg-[#dfba85] text-[#0b0a09] font-bold text-xs disabled:opacity-50 transition-all cursor-pointer shadow-md"
                >
                  {savingContact ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
