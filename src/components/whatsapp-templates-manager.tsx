"use client"

import React, { useState, useMemo } from "react"
import {
  MessageSquare,
  Send,
  Save,
  RotateCcw,
  Check,
  CheckCheck,
  AlertCircle,
  Loader2,
  Power,
  Smartphone,
  Copy,
  Languages,
  Phone,
  Sparkles,
  Info,
} from "lucide-react"
import {
  WhatsAppAutomationSettings,
  WhatsAppLanguage,
  WhatsAppTemplateKey,
  DEFAULT_WHATSAPP_TEMPLATES_I18N,
  renderWhatsAppMessageTemplate,
} from "@/lib/whatsapp-templates-config"
import {
  saveWhatsAppAutomationSettingsAction,
  sendTestWhatsAppAction,
} from "@/app/actions"
import { useLanguage } from "@/context/language-context"

interface WhatsAppTemplatesManagerProps {
  initialSettings: WhatsAppAutomationSettings
}

const TEMPLATE_META: {
  key: WhatsAppTemplateKey
  badge: { fr: string; es: string; en: string; ar: string }
  title: { fr: string; es: string; en: string; ar: string }
  desc: { fr: string; es: string; en: string; ar: string }
}[] = [
  {
    key: "welcome",
    badge: {
      fr: "Création de séance (Admin & Ingestion)",
      es: "Al crear sesión (Admin e Ingesta)",
      en: "On session creation (Admin & Ingest)",
      ar: "عند تسجيل الجلسة (الإدارة والاستيراد)",
    },
    title: {
      fr: "1. Bienvenue & Confirmation de Réservation",
      es: "1. Bienvenida y Confirmación de Reserva",
      en: "1. Welcome & Booking Confirmation",
      ar: "1. الترحيب وتأكيد حجز المشروع",
    },
    desc: {
      fr: "Envoyé automatiquement par WhatsApp dès l'enregistrement d'une séance avec numéro de téléphone.",
      es: "Se envía automáticamente por WhatsApp al registrar una sesión con teléfono del cliente.",
      en: "Automatically sent via WhatsApp when a new session is scheduled with a phone number.",
      ar: "يُرسل تلقائياً عبر واتساب عند تسجيل جلسة جديدة تحتوي على رقم هاتف العميل.",
    },
  },
  {
    key: "photos_ready",
    badge: {
      fr: "Planner : Étape 'Partagé / Sélection'",
      es: "Planner: Fase 'Compartido / Selección'",
      en: "Planner: 'Shared / Selection' Stage",
      ar: "المخطط: مرحلة 'المشاركة والاختيار'",
    },
    title: {
      fr: "2. Photos Prêtes sur l'Espace Privé",
      es: "2. Fotos Listas en Suite Privada",
      en: "2. Photos Ready in Private Suite",
      ar: "2. الصور جاهزة في البوابة الخاصة",
    },
    desc: {
      fr: "Envoyé lors du passage en étape Partagé avec lien direct, Code PIN et accès Google Drive.",
      es: "Enviado al pasar a fase Compartido con enlace directo, Código PIN y acceso Google Drive.",
      en: "Sent when moving to Shared stage with direct portal link, PIN code, and Google Drive access.",
      ar: "يُرسل عند الانتقال لمرحلة المشاركة مع الرابط المباشر، رمز PIN ورابط Google Drive.",
    },
  },
  {
    key: "selection_confirmed",
    badge: {
      fr: "Validation de sélection par le client",
      es: "Validación de selección por el cliente",
      en: "Client selection submission",
      ar: "اعتماد اختيار الصور من العميل",
    },
    title: {
      fr: "3. Sélection Client Reçue & Validée",
      es: "3. Selección del Cliente Confirmada",
      en: "3. Client Selection Confirmed",
      ar: "3. تم استلام اعتماد صور العميل",
    },
    desc: {
      fr: "Envoyé instantanément au client dès qu'il valide ses favoris depuis son Espace Privé.",
      es: "Enviado al cliente en cuanto confirma sus fotos favoritas desde el Portal.",
      en: "Sent instantly to the client as soon as they submit their final photo selection.",
      ar: "يُرسل فورياً للعميل عند تأكيد اختياراته واعتماد الصور من بوابته الخاصة.",
    },
  },
  {
    key: "ready_delivery",
    badge: {
      fr: "Planner : Étape 'Prêt pour livraison'",
      es: "Planner: Fase 'Listo para entrega'",
      en: "Planner: 'Ready for Delivery' Stage",
      ar: "المخطط: مرحلة 'جاهز للتسليم'",
    },
    title: {
      fr: "4. Commande Prête pour Retrait en Atelier",
      es: "4. Pedido Listo para Recogida en Estudio",
      en: "4. Order Ready for Atelier Collection",
      ar: "4. الطلب جاهز للاستلام من الاستوديو",
    },
    desc: {
      fr: "Avertit le client que son album physique, tirages et fichiers finaux sont prêts au studio.",
      es: "Avisa al cliente de que su álbum físico, impresiones y archivos finales están listos.",
      en: "Notifies client that fine art prints, album, and final master files are ready for collection.",
      ar: "إشعار العميل بأن الألبوم المطبوع، اللوحات الفنية والملفات النهائية جاهزة للاستلام.",
    },
  },
]

const VARIABLE_PILLS: { token: string; label: string; desc: string }[] = [
  { token: "{{client_name}}", label: "Nom Client", desc: "Ex: Sarah Benali" },
  { token: "{{session_date}}", label: "Date Séance", desc: "Ex: 24/11/2026" },
  { token: "{{session_time}}", label: "Heure", desc: "Ex: 15:30" },
  { token: "{{category}}", label: "Catégorie", desc: "Ex: Portrait & Studio" },
  { token: "{{portal_url}}", label: "Lien Espace Privé", desc: "Lien sécurisé https://lam7a.ma/portal" },
  { token: "{{portal_pin}}", label: "Code PIN", desc: "Ex: 4829" },
  { token: "{{drive_url}}", label: "Lien Google Drive", desc: "URL du dossier Drive RAW/HD" },
  { token: "{{photos_count}}", label: "Nombre de photos", desc: "Ex: 145 photos" },
]

export function WhatsAppTemplatesManager({ initialSettings }: WhatsAppTemplatesManagerProps) {
  const { language: uiLang } = useLanguage()
  const activeUiLang = (uiLang === "ar" || uiLang === "en" || uiLang === "es" || uiLang === "fr" ? uiLang : "fr") as WhatsAppLanguage

  const [settings, setSettings] = useState<WhatsAppAutomationSettings>(initialSettings)
  const [selectedKey, setSelectedKey] = useState<WhatsAppTemplateKey>("welcome")
  const [selectedLang, setSelectedLang] = useState<WhatsAppLanguage>(activeUiLang)
  const [isSaving, setIsSaving] = useState(false)
  const [saveFeedback, setSaveFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null)

  // Estado para envío de prueba
  const [testPhone, setTestPhone] = useState("")
  const [isSendingTest, setIsSendingTest] = useState(false)
  const [testFeedback, setTestFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null)

  const currentTemplate = settings.templates[selectedKey] || {
    key: selectedKey,
    enabled: true,
    translations: { ...DEFAULT_WHATSAPP_TEMPLATES_I18N[selectedKey] },
  }

  const currentText = currentTemplate.translations[selectedLang] || DEFAULT_WHATSAPP_TEMPLATES_I18N[selectedKey][selectedLang] || ""

  // Toggle Enabled
  const handleToggleEnabled = () => {
    setSettings((prev) => ({
      ...prev,
      templates: {
        ...prev.templates,
        [selectedKey]: {
          ...currentTemplate,
          enabled: !currentTemplate.enabled,
        },
      },
    }))
  }

  // Update text
  const handleTextChange = (text: string) => {
    setSettings((prev) => ({
      ...prev,
      templates: {
        ...prev.templates,
        [selectedKey]: {
          ...currentTemplate,
          translations: {
            ...currentTemplate.translations,
            [selectedLang]: text,
          },
        },
      },
    }))
  }

  // Insert variable at cursor / end
  const handleInsertVariable = (token: string) => {
    const textarea = document.getElementById("wa-template-textarea") as HTMLTextAreaElement | null
    if (!textarea) {
      handleTextChange(currentText + " " + token)
      return
    }

    const start = textarea.selectionStart || currentText.length
    const end = textarea.selectionEnd || currentText.length
    const before = currentText.substring(0, start)
    const after = currentText.substring(end)
    const newText = before + token + after
    handleTextChange(newText)

    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + token.length, start + token.length)
    }, 50)
  }

  // Reset to default
  const handleResetToDefault = () => {
    const defaultText = DEFAULT_WHATSAPP_TEMPLATES_I18N[selectedKey][selectedLang]
    handleTextChange(defaultText)
  }

  // Save Settings
  const handleSave = async () => {
    setIsSaving(true)
    setSaveFeedback(null)
    try {
      const res = await saveWhatsAppAutomationSettingsAction(settings)
      if (res.success) {
        setSaveFeedback({ type: "ok", msg: "Modèles WhatsApp enregistrés avec succès." })
        setTimeout(() => setSaveFeedback(null), 4000)
      } else {
        setSaveFeedback({ type: "err", msg: res.error || "Erreur lors de l'enregistrement." })
      }
    } catch (err: any) {
      setSaveFeedback({ type: "err", msg: err?.message || "Erreur réseau." })
    } finally {
      setIsSaving(false)
    }
  }

  // Send Test Message
  const handleSendTest = async () => {
    if (!testPhone.trim()) {
      setTestFeedback({ type: "err", msg: "Veuillez saisir un numéro de téléphone WhatsApp valide (+212...)." })
      return
    }

    setIsSendingTest(true)
    setTestFeedback(null)
    try {
      const res = await sendTestWhatsAppAction({
        phone: testPhone.trim(),
        templateKey: selectedKey,
        language: selectedLang,
        customText: currentText,
      })

      if (res.success) {
        setTestFeedback({ type: "ok", msg: `Message test envoyé avec succès au ${testPhone} !` })
        setTimeout(() => setTestFeedback(null), 5000)
      } else {
        setTestFeedback({ type: "err", msg: res.error || "Erreur lors de l'envoi WhatsApp." })
      }
    } catch (err: any) {
      setTestFeedback({ type: "err", msg: err?.message || "Erreur d'envoi WhatsApp." })
    } finally {
      setIsSendingTest(false)
    }
  }

  // Render preview with sample data
  const renderedPreview = useMemo(() => {
    return renderWhatsAppMessageTemplate({
      templateText: currentText,
      language: selectedLang,
      data: {
        clientName: "Sarah Benali",
        sessionDate: "24/11/2026",
        sessionTime: "15:30",
        category: "Portrait & Studio Editorial",
        portalPin: "4829",
        clientEmail: "sarah.benali@example.com",
        driveUrl: "https://drive.google.com/drive/folders/sample-hd",
        photosCount: 145,
      },
    })
  }, [currentText, selectedLang])

  const isRtl = selectedLang === "ar"
  const activeMeta = TEMPLATE_META.find((m) => m.key === selectedKey) || TEMPLATE_META[0]

  return (
    <div className="space-y-6">
      {/* Selector de Evento / Plantilla */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {TEMPLATE_META.map((meta) => {
          const isSelected = selectedKey === meta.key
          const isTplEnabled = settings.templates[meta.key]?.enabled !== false
          return (
            <button
              key={meta.key}
              type="button"
              onClick={() => setSelectedKey(meta.key)}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                isSelected
                  ? "bg-[#1f1a14] border-[#c69f68] ring-1 ring-[#c69f68]/40 shadow-lg shadow-[#c69f68]/5"
                  : "bg-[#141210] border-[#26211c] hover:border-[#38312a] hover:bg-[#181512]"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                    isTplEnabled
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold"
                      : "bg-rose-500/10 border-rose-500/30 text-rose-400 font-semibold"
                  }`}>
                    {isTplEnabled ? "● ACTIF" : "○ DÉSACTIVÉ"}
                  </span>
                  <span className="text-[10px] text-[#70665a] uppercase font-mono">
                    {meta.key}
                  </span>
                </div>
                <h3 className="text-xs font-bold text-[#f5f2eb] line-clamp-1">
                  {meta.title[activeUiLang] || meta.title.fr}
                </h3>
                <p className="text-[11px] text-[#8c7e70] line-clamp-2 mt-1 leading-snug">
                  {meta.desc[activeUiLang] || meta.desc.fr}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Panel Principal: Editor (Izquierda) + Previsualizador WhatsApp Live (Derecha) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Columna Izquierda: Editor y Configuración */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-2xl bg-[#141210] border border-[#26211c] space-y-4 shadow-xl">
            {/* Header del Template: Título + Interruptor ON/OFF */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#26211c]">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-[#c69f68] font-bold block">
                  {activeMeta.badge[activeUiLang] || activeMeta.badge.fr}
                </span>
                <h2 className="text-base font-serif font-bold text-[#f5f2eb] mt-0.5">
                  {activeMeta.title[activeUiLang] || activeMeta.title.fr}
                </h2>
              </div>

              {/* Interruptor ON/OFF */}
              <button
                type="button"
                onClick={handleToggleEnabled}
                className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  currentTemplate.enabled
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25"
                    : "bg-stone-900 border-[#38312a] text-[#8c7e70] hover:text-[#f5f2eb]"
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                <span>{currentTemplate.enabled ? "WhatsApp Activé" : "WhatsApp Désactivé"}</span>
              </button>
            </div>

            {/* Selector de Idioma de Edición */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <label className="text-xs font-semibold text-[#a89f91] flex items-center gap-1.5">
                <Languages className="w-3.5 h-3.5 text-[#c69f68]" />
                <span>Langue du message :</span>
              </label>

              <div className="flex bg-[#0b0a09] border border-[#26211c] p-0.5 rounded-xl text-xs">
                {(["fr", "ar", "es", "en"] as WhatsAppLanguage[]).map((lang) => {
                  const labels = {
                    fr: "🇫🇷 Français",
                    ar: "🇲🇦 العربية",
                    es: "🇪🇸 Español",
                    en: "🇬🇧 English",
                  }
                  const isCurLang = selectedLang === lang
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setSelectedLang(lang)}
                      className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all cursor-pointer ${
                        isCurLang
                          ? "bg-[#c69f68] text-[#0b0a09] shadow-sm font-bold"
                          : "text-[#8c7e70] hover:text-[#f5f2eb]"
                      }`}
                    >
                      {labels[lang]}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Inserción rápida de Variables */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-[#70665a] block font-medium">
                Variables dynamiques (cliquer pour insérer dans le message) :
              </span>
              <div className="flex flex-wrap gap-1.5">
                {VARIABLE_PILLS.map((v) => (
                  <button
                    key={v.token}
                    type="button"
                    onClick={() => handleInsertVariable(v.token)}
                    title={v.desc}
                    className="px-2 py-1 rounded-lg bg-[#1c1815] hover:bg-[#25201b] border border-[#2e261f] hover:border-[#c69f68]/40 text-[#c69f68] text-[10px] font-mono transition-colors cursor-pointer"
                  >
                    + {v.token}
                  </button>
                ))}
              </div>
            </div>

            {/* Textarea del mensaje */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-[#70665a]">
                <span>Texte du message WhatsApp (*gras*, _italique_, emojis autorisés)</span>
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  className="text-[#c69f68] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restaurer par défaut</span>
                </button>
              </div>

              <textarea
                id="wa-template-textarea"
                dir={isRtl ? "rtl" : "ltr"}
                value={currentText}
                onChange={(e) => handleTextChange(e.target.value)}
                rows={12}
                className={`w-full p-3.5 rounded-xl bg-[#0b0a09] border border-[#26211c] text-[#f5f2eb] text-xs focus:border-[#c69f68] outline-none font-mono leading-relaxed transition-colors ${
                  isRtl ? "text-right" : "text-left"
                }`}
                placeholder="Écrivez le message WhatsApp..."
              />
            </div>

            {/* Barra de Acciones y Guardado */}
            <div className="flex items-center justify-between pt-2 border-t border-[#26211c]">
              <div>
                {saveFeedback && (
                  <span className={`text-xs font-semibold flex items-center gap-1.5 ${
                    saveFeedback.type === "ok" ? "text-emerald-400" : "text-rose-400"
                  }`}>
                    {saveFeedback.type === "ok" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {saveFeedback.msg}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-[#c69f68] hover:bg-[#dfba85] text-[#0b0a09] text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Enregistrer les modèles WhatsApp</span>
              </button>
            </div>
          </div>

          {/* Caja para Enviar Mensaje de Prueba a WhatsApp Real */}
          <div className="p-4 rounded-2xl bg-[#141210] border border-[#26211c] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#c69f68]" />
                <h4 className="text-xs font-bold text-[#f5f2eb]">Envoyer un WhatsApp de Test</h4>
              </div>
              <span className="text-[10px] text-[#70665a]">Test direct vers votre téléphone</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="+212 600-000000"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-xl bg-[#0b0a09] border border-[#26211c] text-xs text-[#f5f2eb] placeholder-[#70665a] focus:border-[#c69f68] outline-none"
              />
              <button
                type="button"
                onClick={handleSendTest}
                disabled={isSendingTest}
                className="px-3 py-1.5 rounded-xl bg-[#201c18] hover:bg-[#2b251f] border border-[#c69f68]/30 hover:border-[#c69f68] text-[#c69f68] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSendingTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Envoyer le test</span>
              </button>
            </div>

            {testFeedback && (
              <p className={`text-xs ${testFeedback.type === "ok" ? "text-emerald-400" : "text-rose-400"}`}>
                {testFeedback.msg}
              </p>
            )}
          </div>
        </div>

        {/* Columna Derecha: Previsualización Fiel de WhatsApp */}
        <div className="lg:col-span-5 sticky top-6 space-y-3">
          <div className="rounded-3xl border border-[#2b251e] bg-[#0c0d0e] overflow-hidden shadow-2xl">
            {/* Header de Simulación de WhatsApp */}
            <div className="bg-[#1f2c34] px-4 py-3 flex items-center justify-between border-b border-[#2a3942]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#c69f68] flex items-center justify-center text-[#0b0a09] font-bold text-xs shrink-0 shadow">
                  L7
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#e9edef]">Lam7a Studios</span>
                    <span className="text-[10px] text-emerald-400" title="Compte Officiel Vérifié">✓</span>
                  </div>
                  <span className="text-[10px] text-[#8696a0] block">En ligne • Atelier Officiel</span>
                </div>
              </div>

              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#111b21] text-[#c69f68] font-mono border border-[#c69f68]/20">
                Aperçu Direct
              </span>
            </div>

            {/* Área de Mensajes con Fondo WhatsApp */}
            <div className="p-4 min-h-[380px] max-h-[560px] overflow-y-auto space-y-3 bg-[#0b141a] custom-scrollbar flex flex-col justify-end">
              {/* Badge de Seguridad Encriptada */}
              <div className="text-center my-2">
                <span className="inline-block text-[10px] bg-[#182229] text-[#ffd279] px-2.5 py-1 rounded-lg border border-[#222e35] shadow-sm max-w-xs leading-tight">
                  🔒 Messages et appels sont chiffrés de bout en bout.
                </span>
              </div>

              {/* Burbuja del Mensaje Saliente */}
              <div className={`flex ${isRtl ? "justify-start" : "justify-end"}`}>
                <div
                  dir={isRtl ? "rtl" : "ltr"}
                  className={`max-w-[92%] p-3.5 rounded-2xl text-xs text-[#e9edef] leading-relaxed shadow-lg relative ${
                    isRtl
                      ? "bg-[#005c4b] rounded-tr-none text-right font-arabic"
                      : "bg-[#005c4b] rounded-tl-none text-left"
                  }`}
                >
                  {/* Texto con formato */}
                  <div className="whitespace-pre-wrap font-sans text-xs select-text">
                    {renderedPreview.split("\n").map((line, idx) => {
                      // Negritas de WhatsApp *texto*
                      const parts = line.split(/(\*[^*]+\*)/g)
                      return (
                        <p key={idx} className="min-h-[1.1rem]">
                          {parts.map((p, pIdx) => {
                            if (p.startsWith("*") && p.endsWith("*")) {
                              return <strong key={pIdx} className="font-bold text-white">{p.slice(1, -1)}</strong>
                            }
                            if (p.startsWith("http://") || p.startsWith("https://")) {
                              return <span key={pIdx} className="text-[#53bdeb] underline">{p}</span>
                            }
                            return p
                          })}
                        </p>
                      )
                    })}
                  </div>

                  {/* Hora y Doble Check Azul */}
                  <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-[#8696a0]">
                    <span>15:30</span>
                    <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer de Simulación */}
            <div className="bg-[#1f2c34] px-3.5 py-2.5 border-t border-[#2a3942] flex items-center gap-2 text-xs text-[#8696a0]">
              <div className="flex-1 px-3 py-1.5 rounded-xl bg-[#2a3942] text-[11px] text-[#8696a0]">
                Message envoyé automatiquement au client...
              </div>
              <div className="w-7 h-7 rounded-full bg-[#00a884] text-white flex items-center justify-center shrink-0">
                <Send className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#141210] border border-[#26211c] text-[11px] text-[#8c7e70] flex items-start gap-2">
            <Info className="w-4 h-4 text-[#c69f68] shrink-0 mt-0.5" />
            <span>
              Les messages sont envoyés via l'API officielle Evolution WhatsApp de Lam7a Studios. Si le client n'a pas de numéro enregistré ou si le modèle est désactivé, l'envoi est ignoré sans interrompre la session.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

