"use client"

import { useState } from "react"
import { Key, Copy, Check, RefreshCw, ExternalLink, MessageSquare, Sparkles, Mail, SlidersHorizontal, Send, Smartphone, Loader2, AlertCircle } from "lucide-react"
import { updateSessionPin, updateSessionQuota } from "@/app/actions"
import { useLanguage } from "@/context/language-context"
import { NotifyClientEmailDialog } from "@/components/notify-client-email-dialog"

interface SessionPinCardProps {
  sessionId: string
  currentPin: string | null
  clientName: string
  clientEmail?: string | null
  clientPhone?: string | null
  clientId?: string | null
  selectedCount: number
  quota?: number
  onQuotaChange?: (newQuota: number) => void
  photosCount?: number
  hasDriveFolder?: boolean
}

export function isValidPhoneNumber(phone?: string | null): boolean {
  if (!phone) return false
  const clean = phone.replace(/\D/g, "")
  if (clean.length < 8) return false
  if (/^0+$/.test(clean)) return false // Rejette 0000000000
  return true
}

const ACCESS_WHATSAPP_I18N = {
  es: {
    sendBtn: "Enviar Accesos por WhatsApp",
    enterPhonePrompt: "Indicar teléfono",
    sending: "Enviando por WhatsApp...",
    sentSuccess: "¡Accesos enviados por WhatsApp con éxito!",
    noPhoneWarning: "Este cliente no tiene un teléfono válido registrado. Introduce su número de WhatsApp:",
    phonePlaceholder: "Ej: 0612345678 o 212612345678",
    confirmSend: "Enviar ahora",
    cancel: "Cancelar",
    recipientPhone: "Destinatario WhatsApp:",
  },
  fr: {
    sendBtn: "Envoyer les Accès par WhatsApp",
    enterPhonePrompt: "Indiquer numéro",
    sending: "Envoi WhatsApp en cours...",
    sentSuccess: "Accès envoyés par WhatsApp avec succès !",
    noPhoneWarning: "Ce client n'a pas de numéro valide enregistré. Indiquez son numéro WhatsApp :",
    phonePlaceholder: "Ex : 0612345678 ou 212612345678",
    confirmSend: "Envoyer maintenant",
    cancel: "Annuler",
    recipientPhone: "Destinataire WhatsApp :",
  },
  en: {
    sendBtn: "Send Access via WhatsApp",
    enterPhonePrompt: "Enter phone",
    sending: "Sending via WhatsApp...",
    sentSuccess: "Access successfully sent via WhatsApp!",
    noPhoneWarning: "No valid phone number saved for this client. Enter WhatsApp number:",
    phonePlaceholder: "e.g., 0612345678 or 212612345678",
    confirmSend: "Send now",
    cancel: "Cancel",
    recipientPhone: "WhatsApp recipient:",
  },
  ar: {
    sendBtn: "إرسال بيانات الدخول عبر واتساب",
    enterPhonePrompt: "إدخال الرقم",
    sending: "جاري الإرسال عبر واتساب...",
    sentSuccess: "تم إرسال بيانات الدخول عبر واتساب بنجاح!",
    noPhoneWarning: "لا يوجد رقم هاتف صالح مسجل لهذا العميل. اكتب رقم الواتساب:",
    phonePlaceholder: "مثال: 0612345678 أو 212612345678",
    confirmSend: "إرسال الآن",
    cancel: "إلغاء",
    recipientPhone: "المستلم عبر واتساب:",
  },
}

export function SessionPinCard({
  sessionId,
  currentPin,
  clientName,
  clientEmail,
  clientPhone,
  clientId,
  selectedCount,
  quota = 20,
  onQuotaChange,
  photosCount = 0,
  hasDriveFolder = false,
}: SessionPinCardProps) {
  const { t, language } = useLanguage()
  const strings = ACCESS_WHATSAPP_I18N[language as keyof typeof ACCESS_WHATSAPP_I18N] || ACCESS_WHATSAPP_I18N.fr
  const [pin, setPin] = useState(currentPin || "")
  const [currentQuota, setCurrentQuota] = useState(quota)
  const [isCopied, setIsCopied] = useState(false)
  const [isCopiedMsg, setIsCopiedMsg] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isSavingQuota, setIsSavingQuota] = useState(false)
  const [quotaSaved, setQuotaSaved] = useState(false)

  // Estados de WhatsApp
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false)
  const [whatsAppSent, setWhatsAppSent] = useState(false)
  const [whatsAppError, setWhatsAppError] = useState<string | null>(null)
  const [showPhonePrompt, setShowPhonePrompt] = useState(false)
  const [customPhone, setCustomPhone] = useState(clientPhone || "")

  const copyPin = () => {
    if (!pin) return
    navigator.clipboard.writeText(pin)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  const handleUpdateQuota = async (newVal: number) => {
    if (newVal <= 0 || newVal === currentQuota) return
    setCurrentQuota(newVal)
    setIsSavingQuota(true)
    const res = await updateSessionQuota(sessionId, newVal)
    setIsSavingQuota(false)
    if (res.success) {
      onQuotaChange?.(newVal)
      setQuotaSaved(true)
      setTimeout(() => setQuotaSaved(false), 2000)
    } else {
      alert("Error guardando cupo: " + res.error)
    }
  }

  const buildAccessMessage = () => {
    const basePortalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || (typeof window !== "undefined" && window.location.hostname.includes("lam7a.ma") ? "https://lam7a.ma/portal" : "http://localhost:3001/portal")
    const emailParam = clientEmail ? `&email=${encodeURIComponent(clientEmail)}` : ""
    const portalUrl = pin
      ? `${basePortalUrl}?pin=${pin}${emailParam}`
      : basePortalUrl

    if (language === "es") {
      return `✨ *Lamha Studios • Espace Privé*\n\nHola ${clientName},\n\nTu suite privada en Lamha Studios está lista para la selección de tus fotografías de autor.\n\n🔗 *Accede a tu Espace Privé:* ${portalUrl}\n` +
        (clientEmail ? `📧 *Identificador (Email):* ${clientEmail}\n` : "") +
        `🔑 *Código PIN de seguridad:* *${pin || "----"}*\n` +
        `📸 *Cantidad de fotos a seleccionar:* ${currentQuota} fotos\n\n` +
        `Afaf Elaribi • Lamha Studios`
    } else if (language === "ar") {
      return `✨ *استوديوهات لمحة • Espace Privé*\n\nمرحباً ${clientName}،\n\nجناحكم الخاص في استوديو لمحة جاهز لاختيار صوركم الفنية.\n\n🔗 *رابط الدخول إلى البوابة الخاصة:* ${portalUrl}\n` +
        (clientEmail ? `📧 *المعرّف (البريد الإلكتروني):* ${clientEmail}\n` : "") +
        `🔑 *رمز PIN للأمان:* *${pin || "----"}*\n` +
        `📸 *عدد الصور المطلوب اختيارها:* ${currentQuota} صورة\n\n` +
        `عفاف العريبي • استوديوهات لمحة`
    } else if (language === "en") {
      return `✨ *Lamha Studios • Private Suite*\n\nHello ${clientName},\n\nYour private suite at Lamha Studios is ready for selecting your fine art photographs.\n\n🔗 *Access your Espace Privé:* ${portalUrl}\n` +
        (clientEmail ? `📧 *Identifier (Email):* ${clientEmail}\n` : "") +
        `🔑 *Security PIN Code:* *${pin || "----"}*\n` +
        `📸 *Photos to select:* ${currentQuota} photos\n\n` +
        `Afaf Elaribi • Lamha Studios`
    } else {
      // fr (défaut)
      return `✨ *Lamha Studios • Espace Privé*\n\nBonjour ${clientName},\n\nVotre suite privée chez Lamha Studios est prête pour la sélection de vos photographies d'art.\n\n🔗 *Accédez à votre Espace Privé :* ${portalUrl}\n` +
        (clientEmail ? `📧 *Identifiant (Email) :* ${clientEmail}\n` : "") +
        `🔑 *Code PIN de sécurité :* *${pin || "----"}*\n` +
        `📸 *Nombre de photos à sélectionner :* ${currentQuota} photos\n\n` +
        `Afaf Elaribi • Lamha Studios`
    }
  }

  const copyWhatsAppMessage = () => {
    const message = buildAccessMessage()
    navigator.clipboard.writeText(message)
    setIsCopiedMsg(true)
    setTimeout(() => setIsCopiedMsg(false), 2500)
  }

  const handleSendWhatsAppAccess = async (targetPhone?: string) => {
    const rawCandidate = (targetPhone || customPhone || clientPhone || "").trim()

    if (!isValidPhoneNumber(rawCandidate)) {
      setShowPhonePrompt(true)
      return
    }

    const phoneToSend = rawCandidate

    setIsSendingWhatsApp(true)
    setWhatsAppSent(false)
    setWhatsAppError(null)

    try {
      const message = buildAccessMessage()
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phoneToSend,
          text: message,
          clientId: clientId || null,
          sessionId: sessionId || null,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setWhatsAppSent(true)
        setShowPhonePrompt(false)
        setTimeout(() => setWhatsAppSent(false), 4500)
      } else {
        setWhatsAppError(data.error || "Erreur lors de l'envoi WhatsApp")
      }
    } catch (err: any) {
      setWhatsAppError(err.message || "Erreur de connexion")
    } finally {
      setIsSendingWhatsApp(false)
    }
  }

  const generateNewPin = async () => {
    const newRandomPin = Math.floor(1000 + Math.random() * 9000).toString()
    setIsUpdating(true)
    const res = await updateSessionPin(sessionId, newRandomPin)
    setIsUpdating(false)
    if (res.success) {
      setPin(newRandomPin)
    } else {
      alert("Error: " + res.error)
    }
  }

  const basePortalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || (typeof window !== "undefined" && window.location.hostname.includes("lam7a.ma") ? "https://lam7a.ma/portal" : "http://localhost:3001/portal")
  const portalHref = pin
    ? `${basePortalUrl}?pin=${pin}${clientEmail ? `&email=${encodeURIComponent(clientEmail)}` : ""}`
    : basePortalUrl

  const progressPercent = Math.min(100, Math.round((selectedCount / (currentQuota || 1)) * 100))

  return (
    <div className="rounded-2xl border border-[#26211c] bg-[#141210] p-6 shadow-xl space-y-5 relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#26211c]">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[#c69f68] font-semibold">
          <Key className="w-4 h-4" />
          <span>{t.espacePriveAccess}</span>
        </div>
        <button
          onClick={generateNewPin}
          disabled={isUpdating}
          className="text-[11px] text-[#8c7a6b] hover:text-[#c69f68] flex items-center gap-1 transition-colors"
          title={t.newPin}
        >
          <RefreshCw className={`w-3 h-3 ${isUpdating ? "animate-spin" : ""}`} />
          <span>{t.newPin}</span>
        </button>
      </div>

      {/* Identifiant Email du Client */}
      <div className="p-3.5 rounded-xl bg-[#181512] border border-[#26211c] flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-[#8c7a6b]">
          <Mail className="w-3.5 h-3.5 text-[#c69f68]" />
          <span>{t.clientEmailIdentifier}</span>
        </div>
        <div>
          {clientEmail ? (
            <span className="font-mono font-medium text-[#e5c38e] bg-[#221c16] px-2.5 py-1 rounded-lg border border-[#382d20]">
              {clientEmail}
            </span>
          ) : (
            <span className="text-[11px] text-amber-500/90 italic bg-amber-950/20 px-2 py-0.5 rounded border border-amber-900/40">
              {t.noEmailWarning}
            </span>
          )}
        </div>
      </div>

      {/* Big PIN Display */}
      <div className="p-4 rounded-xl bg-[#181512] border border-[#26211c] text-center space-y-2">
        <span className="text-[10px] text-[#70665a] uppercase tracking-widest font-semibold block">
          {t.clientPinCode}
        </span>
        <div className="text-3xl font-mono font-bold tracking-[0.3em] text-[#e5c38e]">
          {pin || "----"}
        </div>
        <div className="flex items-center justify-center gap-2 pt-1">
          <button
            onClick={copyPin}
            className="px-3 py-1 rounded-lg bg-[#201c18] hover:bg-[#28231e] text-[#c69f68] border border-[#c69f68]/30 text-xs inline-flex items-center gap-1.5 transition-colors"
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">OK!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>{t.copyPin}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Configuration du Quota (Variable par client) */}
      <div className="p-4 rounded-xl bg-[#181512] border border-[#26211c] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[#c69f68] font-medium">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{t.requestedQuota}</span>
          </div>
          {quotaSaved && (
            <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono animate-in fade-in">
              <Check className="w-3 h-3" /> {t.savedIndicator}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            {[10, 15, 20, 25, 30, 40, 50].map((preset) => (
              <button
                key={preset}
                disabled={isSavingQuota}
                onClick={() => handleUpdateQuota(preset)}
                className={`px-2.5 py-1 text-xs rounded-lg font-mono transition-all ${
                  currentQuota === preset
                    ? "bg-[#c69f68] text-[#12100e] font-bold shadow-md shadow-[#c69f68]/20 scale-105"
                    : "bg-[#201c18] hover:bg-[#2a241f] text-[#8c7a6b] hover:text-[#e4decb] border border-[#2d261e]"
                }`}
              >
                {preset}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#70665a]">{t.customQuotaLabel}</span>
            <input
              type="number"
              min={1}
              max={500}
              value={currentQuota}
              disabled={isSavingQuota}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10)
                if (!isNaN(val) && val > 0) {
                  setCurrentQuota(val)
                }
              }}
              onBlur={() => handleUpdateQuota(currentQuota)}
              className="w-16 px-2 py-1 text-center font-mono text-xs font-bold text-[#e5c38e] bg-[#12100e] border border-[#382d20] rounded-lg focus:border-[#c69f68] focus:outline-none"
            />
          </div>
        </div>
        <p className="text-[10px] text-[#70665a] italic">
          {t.quotaHelp}: {t.quotaStrictLimit}
        </p>
      </div>

      {/* Metrics of Selection */}
      <div className="p-3.5 rounded-xl bg-[#181613] border border-[#26211c] space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#8c7a6b]">{t.photosChosenByClient}:</span>
          <span
            className={`font-semibold px-2 py-0.5 rounded-full text-xs font-mono ${
              selectedCount > 0
                ? "bg-emerald-950/40 text-emerald-300 border border-emerald-800/40"
                : "bg-[#201c18] text-[#70665a]"
            }`}
          >
            {selectedCount} / {currentQuota}
          </span>
        </div>
        <div className="w-full h-1.5 bg-[#201c18] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#c69f68] to-emerald-400 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Sharing Actions */}
      <div className="space-y-2.5 pt-2">
        {/* Modal / Prompt si no hay teléfono guardado */}
        {showPhonePrompt && (
          <div className="p-3.5 rounded-xl bg-[#1c1814] border border-[#c69f68]/40 space-y-2.5 animate-in fade-in">
            <div className="flex items-center gap-2 text-xs text-[#e6ca9e]">
              <Smartphone className="w-4 h-4 text-[#c69f68]" />
              <span>{strings.noPhoneWarning}</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder={strings.phonePlaceholder}
                value={customPhone}
                onChange={(e) => setCustomPhone(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg bg-[#12100e] border border-[#382d20] text-xs font-mono text-[#e5c38e] placeholder:text-[#605549] focus:border-[#c69f68] focus:outline-none"
              />
              <button
                disabled={isSendingWhatsApp || !customPhone.trim()}
                onClick={() => handleSendWhatsAppAccess(customPhone)}
                className="px-3 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#20ba59] disabled:opacity-50 text-[#0b0a09] text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                {isSendingWhatsApp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>{strings.confirmSend}</span>
              </button>
              <button
                onClick={() => setShowPhonePrompt(false)}
                className="px-2.5 py-1.5 rounded-lg bg-[#201c18] hover:bg-[#28231e] text-xs text-[#8c7a6b] transition-colors"
              >
                {strings.cancel}
              </button>
            </div>
          </div>
        )}

        {/* Error Feedback */}
        {whatsAppError && (
          <div className="p-2.5 rounded-xl bg-red-950/30 border border-red-800/40 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{whatsAppError}</span>
          </div>
        )}

        {/* Fila 1: Botones Principales de Notificación Directa (WhatsApp + Email) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Botón WhatsApp */}
          <button
            type="button"
            onClick={() => handleSendWhatsAppAccess()}
            disabled={isSendingWhatsApp}
            className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md ${
              whatsAppSent
                ? "bg-emerald-950/50 border-emerald-500/60 text-emerald-300 shadow-emerald-900/20"
                : "bg-gradient-to-r from-[#20ba59]/20 via-[#25D366]/25 to-[#c69f68]/20 hover:from-[#20ba59]/30 hover:to-[#c69f68]/30 border-[#25D366]/40 text-[#55ef88] hover:text-white"
            }`}
          >
            {isSendingWhatsApp ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#25D366]" />
                <span>{strings.sending}</span>
              </>
            ) : whatsAppSent ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>{strings.sentSuccess}</span>
              </>
            ) : (
              <>
                <MessageSquare className="w-4 h-4 text-[#25D366]" />
                <span className="truncate">{strings.sendBtn}</span>
                {isValidPhoneNumber(clientPhone || customPhone) ? (
                  <span className="font-mono text-[10px] text-[#25D366]/80 shrink-0">
                    ({clientPhone || customPhone})
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-400/90 font-mono shrink-0 italic">
                    ({strings.enterPhonePrompt})
                  </span>
                )}
              </>
            )}
          </button>

          {/* Botón Notifier Photos par Email (Integrado en ACCÈS ESPACE PRIVÉ) */}
          <div className="flex items-stretch">
            <NotifyClientEmailDialog
              sessionId={sessionId}
              clientName={clientName}
              clientEmail={clientEmail}
              portalPin={pin}
              photosCount={photosCount}
              hasDriveFolder={hasDriveFolder}
            />
          </div>
        </div>

        {/* Fila 2: Copiar Mensaje + Probar Portal */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Botón secundario: Copiar mensaje al portapapeles */}
          <button
            type="button"
            onClick={copyWhatsAppMessage}
            className="py-2 px-3 rounded-xl bg-[#1d1915] hover:bg-[#25201b] border border-[#29241f] hover:border-[#c69f68]/40 text-xs text-[#ded8d0] font-medium flex items-center justify-center gap-2 transition-colors"
          >
            {isCopiedMsg ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">OK!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#8c7a6b]" />
                <span className="truncate">{t.copyWhatsappInvite}</span>
              </>
            )}
          </button>

          {/* Test portal link */}
          <a
            href={portalHref}
            target="_blank"
            rel="noreferrer"
            className="py-2 px-3 rounded-xl bg-[#c69f68]/10 hover:bg-[#c69f68]/20 border border-[#c69f68]/30 text-xs text-[#c69f68] font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="truncate">{t.testPortalWithPin}</span>
            <ExternalLink className="w-3 h-3 ml-0.5 shrink-0" />
          </a>
        </div>
      </div>
    </div>
  )
}
