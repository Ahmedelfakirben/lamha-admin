"use client"

import { useState } from "react"
import { 
  Mail, 
  Send, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Globe,
  X
} from "lucide-react"
import { sendPhotosReadyEmailAction } from "@/app/actions"
import { useLanguage } from "@/context/language-context"
import { useTheme } from "@/context/theme-context"
import { cn } from "@/lib/utils"

export type EmailLanguage = "fr" | "es" | "en" | "ar"

interface NotifyClientEmailDialogProps {
  sessionId: string
  clientName: string
  clientEmail?: string | null
  portalPin?: string | null
  photosCount?: number
  hasDriveFolder?: boolean
  onSuccess?: () => void
}

const NOTIFY_I18N = {
  fr: {
    triggerBtn: "Notifier Photos par Email",
    triggerTooltip: "Envoyer un email au client avec son code PIN d'accès et instructions",
    dialogTitle: "Notifier la Livraison & Code PIN au Client",
    dialogSubtitle: "Envoi automatique depuis Microsoft Exchange (Office 365)",
    langSelectLabel: "Langue de l'email :",
    introText: (name: string) => `Un email de prestige de Lamha Studios sera envoyé à ${name} pour l'informer que ses photos sont prêtes à être sélectionnées et téléchargées.`,
    recipientLabel: "Destinataire :",
    noEmail: "Aucun email enregistré",
    pinLabel: "Code PIN d'Accès :",
    noPin: "Sans code PIN à 4 chiffres",
    photosLabel: "Photographies traitées :",
    photosCount: (count: number) => count > 0 ? `${count} photos disponibles` : "En attente de liaison",
    gdriveLabel: "Dossier Google Drive :",
    gdriveStatus: (has: boolean) => has ? "Inclus dans l'email" : "Non assigné",
    cannotSendTitle: "Impossible d'envoyer l'email :",
    missingEmail: "L'adresse email du client est requise.",
    missingPin: "Un code PIN à 4 chiffres doit être configuré pour ce projet.",
    sendErrorTitle: "Erreur lors de l'envoi :",
    cancelBtn: "Annuler",
    sendBtn: "Confirmer et Envoyer l'Email",
    sendingBtn: "Envoi via Exchange en cours...",
    successTitle: "Email envoyé avec succès !",
    successDesc: (name: string, email: string) => `${name} a reçu ses identifiants, le lien vers son Espace Privé et son code PIN à l'adresse ${email}.`,
  },
  es: {
    triggerBtn: "Notificar Fotos por Email",
    triggerTooltip: "Enviar correo al cliente con su PIN de acceso e instrucciones",
    dialogTitle: "Notificar Entrega & PIN al Cliente",
    dialogSubtitle: "Envío automático desde Microsoft Exchange (Office 365)",
    langSelectLabel: "Idioma del correo:",
    introText: (name: string) => `Se enviará una plantilla de alta gama de Lamha Studios informando a ${name} que sus fotos están listas para ser seleccionadas y descargadas.`,
    recipientLabel: "Destinatario:",
    noEmail: "Sin correo registrado",
    pinLabel: "Código PIN de Acceso:",
    noPin: "Sin PIN de 4 dígitos",
    photosLabel: "Fotografías procesadas:",
    photosCount: (count: number) => count > 0 ? `${count} fotos disponibles` : "Pendiente de vincular",
    gdriveLabel: "Enlace a Google Drive:",
    gdriveStatus: (has: boolean) => has ? "Incluido en el correo" : "No asignado",
    cannotSendTitle: "No se puede enviar el correo:",
    missingEmail: "Falta registrar el correo del cliente.",
    missingPin: "Falta generar o guardar un código PIN de 4 dígitos para este proyecto.",
    sendErrorTitle: "Error al enviar:",
    cancelBtn: "Cancelar",
    sendBtn: "Confirmar y Enviar Email",
    sendingBtn: "Enviando por Exchange...",
    successTitle: "¡Correo Enviado Exitosamente!",
    successDesc: (name: string, email: string) => `${name} ha recibido las credenciales, el enlace a su Espace Privé y su código PIN en ${email}.`,
  },
  en: {
    triggerBtn: "Notify Photos via Email",
    triggerTooltip: "Send email to client with portal access PIN and instructions",
    dialogTitle: "Notify Client: Delivery & Access PIN",
    dialogSubtitle: "Automated delivery via Microsoft Exchange (Office 365)",
    langSelectLabel: "Email language:",
    introText: (name: string) => `A premium template from Lamha Studios will be sent informing ${name} that photos are ready for selection and download.`,
    recipientLabel: "Recipient:",
    noEmail: "No email registered",
    pinLabel: "Security PIN Code:",
    noPin: "No 4-digit PIN",
    photosLabel: "Processed photographs:",
    photosCount: (count: number) => count > 0 ? `${count} photos available` : "Pending link",
    gdriveLabel: "Google Drive Folder:",
    gdriveStatus: (has: boolean) => has ? "Included in email" : "Not assigned",
    cannotSendTitle: "Cannot send email:",
    missingEmail: "Client email address is missing.",
    missingPin: "A 4-digit PIN code must be set for this project.",
    sendErrorTitle: "Delivery error:",
    cancelBtn: "Cancel",
    sendBtn: "Confirm & Send Email",
    sendingBtn: "Sending via Exchange...",
    successTitle: "Email Sent Successfully!",
    successDesc: (name: string, email: string) => `${name} has received login credentials, Private Space link, and security PIN at ${email}.`,
  },
  ar: {
    triggerBtn: "إشعار العميل بالصور عبر البريد",
    triggerTooltip: "إرسال بريد إلكتروني للعميل برمز PIN وتعليمات الدخول",
    dialogTitle: "إشعار العميل باستلام الصور ورمز PIN",
    dialogSubtitle: "إرسال تلقائي عبر مايكروسوفت إكستشينج (Office 365)",
    langSelectLabel: "لغة رسالة البريد:",
    introText: (name: string) => `سيتم إرسال رسالة فاخرة من استوديو لمحة لإعلام ${name} بأن الصور جاهزة للمعاينة والاختيار والتحميل.`,
    recipientLabel: "البريد الإلكتروني للعميل:",
    noEmail: "لا يوجد بريد مسجل",
    pinLabel: "رمز الأمان السري (PIN):",
    noPin: "بدون رمز PIN مكون من 4 أرقام",
    photosLabel: "الصور المعالجة:",
    photosCount: (count: number) => count > 0 ? `${count} صورة متوفرة` : "قيد الربط",
    gdriveLabel: "مجلد Google Drive:",
    gdriveStatus: (has: boolean) => has ? "مدرج في الرسالة" : "غير مدرج",
    cannotSendTitle: "تعذر إرسال البريد الإلكتروني:",
    missingEmail: "يرجى تسجيل بريد العميل أولاً.",
    missingPin: "يرجى تعيين رمز PIN من 4 أرقام لهذا المشروع.",
    sendErrorTitle: "خطأ أثناء الإرسال:",
    cancelBtn: "إلغاء",
    sendBtn: "تأكيد وإرسال البريد",
    sendingBtn: "جارٍ الإرسال عبر Exchange...",
    successTitle: "تم إرسال البريد بنجاح!",
    successDesc: (name: string, email: string) => `تلقى ${name} بيانات الدخول، ورابط المساحة الخاصة، ورمز PIN على البريد ${email}.`,
  },
} as const

const LANG_OPTIONS: { code: EmailLanguage; label: string; flag: string }[] = [
  { code: "fr", label: "Français", flag: "FR" },
  { code: "es", label: "Español", flag: "ES" },
  { code: "en", label: "English", flag: "EN" },
  { code: "ar", label: "العربية", flag: "AR" },
]

export function NotifyClientEmailDialog({
  sessionId,
  clientName,
  clientEmail,
  portalPin,
  photosCount = 0,
  hasDriveFolder = false,
  onSuccess,
}: NotifyClientEmailDialogProps) {
  const { language } = useLanguage()
  const activeSystemLang = (language === "ar" || language === "en" || language === "es" || language === "fr")
    ? (language as EmailLanguage)
    : "fr"

  const [isOpen, setIsOpen] = useState(false)
  const [emailLang, setEmailLang] = useState<EmailLanguage>(activeSystemLang)
  const [isSending, setIsSending] = useState(false)
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Texts are localized according to active UI language
  const { theme } = useTheme()
  const isLight = theme === "light"

  const t = NOTIFY_I18N[activeSystemLang]
  const isRtl = activeSystemLang === "ar"

  const hasValidEmail = Boolean(clientEmail && clientEmail.includes("@"))
  const hasValidPin = Boolean(portalPin && portalPin.trim().length >= 4)
  const canSend = hasValidEmail && hasValidPin

  const handleSend = async () => {
    if (!canSend) return
    setIsSending(true)
    setStatus("idle")
    setErrorMsg(null)

    try {
      const res = await sendPhotosReadyEmailAction(sessionId, undefined, emailLang)
      if (res.success) {
        setStatus("success")
        if (onSuccess) onSuccess()
        setTimeout(() => {
          setIsOpen(false)
          setStatus("idle")
        }, 2600)
      } else {
        setStatus("error")
        setErrorMsg(res.error || "Error al enviar el correo.")
      }
    } catch (err: any) {
      setStatus("error")
      setErrorMsg(err?.message || "Error al conectar con el servidor.")
    } finally {
      setIsSending(false)
    }
  }

  return (
    <>
      {/* Botón Disparador */}
      <button
        type="button"
        onClick={() => {
          setEmailLang(activeSystemLang)
          setIsOpen(true)
          setStatus("idle")
          setErrorMsg(null)
        }}
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium bg-gradient-to-r from-[#c69f68] to-[#ab834b] text-[#0d0c0b] hover:brightness-110 active:scale-95 transition-all shadow-md shadow-[#c69f68]/15 cursor-pointer font-sans"
        title={t.triggerTooltip}
      >
        <Mail className="w-3.5 h-3.5" />
        <span>{t.triggerBtn}</span>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div 
            dir={isRtl ? "rtl" : "ltr"}
            className={cn(
              "w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden transition-colors",
              isLight
                ? "bg-[#faf8f5] border-[#e8dfd5] text-[#2c221a]"
                : "bg-[#141210] border-[#2b251f] text-[#f5f2eb]"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={cn(
              "p-5 border-b flex items-center justify-between",
              isLight
                ? "border-[#e8dfd5] bg-gradient-to-r from-[#f4ede4] to-[#faf8f5]"
                : "border-[#231e19] bg-gradient-to-r from-[#1a1714] to-[#141210]"
            )}>
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border",
                  isLight
                    ? "bg-[#c69f68]/15 border-[#c69f68]/40 text-[#996d2e]"
                    : "bg-[#c69f68]/15 border-[#c69f68]/30 text-[#c69f68]"
                )}>
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={cn(
                    "text-sm font-serif font-bold",
                    isLight ? "text-[#2c221a]" : "text-[#f5f2eb]"
                  )}>
                    {t.dialogTitle}
                  </h3>
                  <p className={cn(
                    "text-[11px]",
                    isLight ? "text-[#7d6c5d]" : "text-[#9c8e7f]"
                  )}>
                    {t.dialogSubtitle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className={cn(
                  "p-1.5 rounded-lg transition-colors cursor-pointer",
                  isLight
                    ? "text-[#7d6c5d] hover:text-[#2c221a] hover:bg-[#ede3d8]"
                    : "text-[#8c7a6b] hover:text-[#f5f2eb] hover:bg-[#231e19]"
                )}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 text-xs">
              {status === "success" ? (
                <div className="py-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-500 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className={cn(
                    "text-sm font-serif font-bold",
                    isLight ? "text-[#2c221a]" : "text-[#f5f2eb]"
                  )}>
                    {t.successTitle}
                  </h4>
                  <p className={cn(
                    "text-xs max-w-sm mx-auto leading-relaxed",
                    isLight ? "text-[#5c4f43]" : "text-[#a89f92]"
                  )}>
                    {t.successDesc(clientName, clientEmail || "")}
                  </p>
                </div>
              ) : (
                <>
                  <p className={cn(
                    "leading-relaxed",
                    isLight ? "text-[#5c4f43]" : "text-[#a89f92]"
                  )}>
                    {t.introText(clientName)}
                  </p>

                  {/* Selector de Lengua del Correo (4 Lenguas) */}
                  <div className={cn(
                    "p-3 rounded-xl border space-y-2",
                    isLight
                      ? "bg-[#f4ede4] border-[#e8dfd5]"
                      : "bg-[#1a1714] border-[#2b251f]"
                  )}>
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        "flex items-center gap-1.5 font-medium",
                        isLight ? "text-[#5c4f43]" : "text-[#8c7a6b]"
                      )}>
                        <Globe className="w-3.5 h-3.5 text-[#c69f68]" />
                        {t.langSelectLabel}
                      </span>
                      <span className={cn(
                        "text-[10px] font-mono uppercase tracking-wider font-semibold",
                        isLight ? "text-[#996d2e]" : "text-[#c69f68]"
                      )}>
                        Lamha i18n
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 pt-1">
                      {LANG_OPTIONS.map((opt) => {
                        const isSelected = emailLang === opt.code
                        return (
                          <button
                            key={opt.code}
                            type="button"
                            onClick={() => setEmailLang(opt.code)}
                            className={cn(
                              "py-1.5 px-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer border",
                              isSelected
                                ? (isLight
                                    ? "bg-[#c69f68] text-white font-bold border-[#c69f68] shadow-sm"
                                    : "bg-[#c69f68] text-[#0d0c0b] font-bold border-[#c69f68] shadow-sm")
                                : (isLight
                                    ? "bg-white text-[#5c4f43] hover:text-[#2c221a] border-[#ded3c5] hover:border-[#c69f68]"
                                    : "bg-[#141210] text-[#9c8e7f] hover:text-[#f5f2eb] border-[#26211c] hover:border-[#382f25]")
                            )}
                          >
                            <span className="text-[10px] opacity-80">{opt.flag}</span>
                            <span>{opt.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Summary Box */}
                  <div className={cn(
                    "rounded-xl border p-4 space-y-2.5",
                    isLight
                      ? "bg-[#f4ede4] border-[#e8dfd5]"
                      : "bg-[#1a1714] border-[#2b251f]"
                  )}>
                    <div className={cn(
                      "flex items-center justify-between py-1 border-b",
                      isLight ? "border-[#e8dfd5]" : "border-[#241f1a]"
                    )}>
                      <span className={isLight ? "text-[#7d6c5d]" : "text-[#8c7a6b]"}>
                        {t.recipientLabel}
                      </span>
                      <span className={hasValidEmail ? (isLight ? "text-[#2c221a] font-mono font-medium" : "text-[#f5f2eb] font-mono") : "text-rose-500 font-semibold"}>
                        {clientEmail || t.noEmail}
                      </span>
                    </div>

                    <div className={cn(
                      "flex items-center justify-between py-1 border-b",
                      isLight ? "border-[#e8dfd5]" : "border-[#241f1a]"
                    )}>
                      <span className={isLight ? "text-[#7d6c5d]" : "text-[#8c7a6b]"}>
                        {t.pinLabel}
                      </span>
                      {hasValidPin ? (
                        <span className={cn(
                          "font-mono text-sm font-bold px-2.5 py-0.5 rounded border tracking-widest",
                          isLight
                            ? "bg-white text-[#996d2e] border-[#e8dfd5]"
                            : "bg-[#0d0c0b] text-[#c69f68] border-[#3d3328]"
                        )}>
                          {portalPin}
                        </span>
                      ) : (
                        <span className="text-rose-500 font-semibold">{t.noPin}</span>
                      )}
                    </div>

                    <div className={cn(
                      "flex items-center justify-between py-1 border-b",
                      isLight ? "border-[#e8dfd5]" : "border-[#241f1a]"
                    )}>
                      <span className={isLight ? "text-[#7d6c5d]" : "text-[#8c7a6b]"}>
                        {t.photosLabel}
                      </span>
                      <span className={isLight ? "text-[#2c221a] font-medium" : "text-[#f5f2eb]"}>
                        {t.photosCount(photosCount)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1">
                      <span className={isLight ? "text-[#7d6c5d]" : "text-[#8c7a6b]"}>
                        {t.gdriveLabel}
                      </span>
                      <span className={hasDriveFolder ? (isLight ? "text-emerald-700 font-semibold" : "text-emerald-400 font-medium") : (isLight ? "text-[#7d6c5d]" : "text-[#8c7a6b]")}>
                        {t.gdriveStatus(hasDriveFolder)}
                      </span>
                    </div>
                  </div>

                  {/* Advertencias si falta algún dato */}
                  {!canSend && (
                    <div className={cn(
                      "p-3 rounded-xl border text-[11px] flex items-start gap-2.5",
                      isLight
                        ? "bg-rose-50 border-rose-200 text-rose-800"
                        : "bg-rose-500/10 border-rose-500/25 text-rose-300"
                    )}>
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                      <div>
                        <strong>{t.cannotSendTitle}</strong>
                        <ul className="list-disc list-inside mt-1 space-y-0.5 text-rose-600">
                          {!hasValidEmail && <li>{t.missingEmail}</li>}
                          {!hasValidPin && <li>{t.missingPin}</li>}
                        </ul>
                      </div>
                    </div>
                  )}

                  {errorMsg && (
                    <div className={cn(
                      "p-3 rounded-xl border text-[11px] flex items-start gap-2.5",
                      isLight
                        ? "bg-rose-50 border-rose-200 text-rose-800"
                        : "bg-rose-500/15 border-rose-500/30 text-rose-300"
                    )}>
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                      <div>
                        <strong>{t.sendErrorTitle}</strong>
                        <p className="mt-0.5 text-rose-600">{errorMsg}</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer Buttons */}
            {status !== "success" && (
              <div className={cn(
                "p-4 border-t flex items-center justify-end gap-2.5",
                isLight
                  ? "bg-[#f0e8de] border-[#e8dfd5]"
                  : "bg-[#0f0e0d] border-[#231e19]"
              )}>
                <button
                  type="button"
                  disabled={isSending}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer",
                    isLight
                      ? "text-[#7d6c5d] hover:text-[#2c221a] hover:bg-[#e4d8ca]"
                      : "text-[#a89f92] hover:text-[#f5f2eb] hover:bg-[#1a1714]"
                  )}
                >
                  {t.cancelBtn}
                </button>

                <button
                  type="button"
                  disabled={!canSend || isSending}
                  onClick={handleSend}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-[#c69f68] to-[#ab834b] text-[#0d0c0b] hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-[#c69f68]/20 cursor-pointer"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{t.sendingBtn}</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>{t.sendBtn}</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

