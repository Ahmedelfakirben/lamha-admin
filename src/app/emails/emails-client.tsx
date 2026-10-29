"use client"

import React, { useState, useMemo, useEffect } from "react"
import {
  Mail,
  Send,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Save,
  Eye,
  Smartphone,
  Monitor,
  User,
  Search,
  KeyRound,
  FolderOpen,
  Power,
  Layers,
  PenSquare,
  Sliders,
  Check,
  Loader2,
} from "lucide-react"
import type { EmailAutomationSettings } from "@/lib/email-settings"
import { getDefaultEmailAutomationSettings } from "@/lib/email-settings"
import {
  DEFAULT_TEMPLATES_I18N,
  EmailLanguage,
  EmailTemplateKey,
  EmailTemplateLangCopy,
  renderCustomAtelierEmail,
  renderPhotosReadyEmail,
  renderReadyForDeliveryEmail,
  renderSelectionConfirmedEmail,
  renderWelcomeEmail,
} from "@/lib/email-templates"
import {
  ExistingClientOption,
  saveEmailAutomationSettingsAction,
  sendCustomClientEmailAction,
  sendTestAutomatedEmailAction,
} from "@/app/actions"
import { useLanguage, Language } from "@/context/language-context"
import { EMAIL_UI_I18N } from "@/lib/email-ui-i18n"

interface EmailsClientProps {
  initialSettings: EmailAutomationSettings
  clients: ExistingClientOption[]
  sessions: any[]
  smtpReady: boolean
  smtpFromEmail: string
}

const TEMPLATE_META: {
  key: EmailTemplateKey
  badgeKey: "badgeCreationIngest" | "badgePlannerShared" | "badgePortalSelection" | "badgePlannerReady"
  triggerLabel: Record<string, string>
  title: Record<string, string>
  desc: Record<string, string>
}[] = [
  {
    key: "welcome",
    badgeKey: "badgeCreationIngest",
    triggerLabel: {
      es: "Al crear sesión (Admin o Ingesta)",
      fr: "À la création de séance (Admin ou Ingestion)",
      en: "On session creation (Admin or Ingest)",
      ar: "عند تسجيل الجلسة (الإدارة أو أداة الاستيراد)",
    },
    title: {
      es: "1. Bienvenida y Confirmación de Reserva",
      fr: "1. Bienvenue & Confirmation de Réservation",
      en: "1. Welcome & Booking Confirmation",
      ar: "1. الترحيب وتأكيد الحجز",
    },
    desc: {
      es: "Se envía automáticamente cuando registras una nueva sesión con email del cliente.",
      fr: "Envoyé automatiquement lors de l'enregistrement d'une nouvelle séance avec email du client.",
      en: "Automatically sent when a new session is created with a client email address.",
      ar: "يُرسل تلقائياً عند تسجيل جلسة جديدة تحتوي على بريد إلكتروني للعميل.",
    },
  },
  {
    key: "photos_ready",
    badgeKey: "badgePlannerShared",
    triggerLabel: {
      es: "Planner: Fase 'Compartido / Selección'",
      fr: "Planner : Étape 'Partagé / Sélection'",
      en: "Planner: 'Shared / Selection' Stage",
      ar: "المخطط: مرحلة 'تمت المشاركة / الاختيار'",
    },
    title: {
      es: "2. Fotos Listas en Espace Privé (PIN + Drive)",
      fr: "2. Photos Prêtes sur l'Espace Privé (PIN + Drive)",
      en: "2. Photos Ready in Private Space (PIN + Drive)",
      ar: "2. الصور جاهزة في المساحة الخاصة (PIN + Drive)",
    },
    desc: {
      es: "Se envía al pasar un proyecto a 'Compartido' en el Planner o pulsar Enviar Acceso.",
      fr: "Envoyé lors du passage à 'Partagé' dans le Planner ou via le bouton Envoyer Accès.",
      en: "Sent when moving a project to 'Shared' in the Planner or clicking Send Access.",
      ar: "يُرسل عند نقل المشروع إلى 'تمت المشاركة' في المخطط أو النقر على إرسال بيانات الدخول.",
    },
  },
  {
    key: "selection_confirmed",
    badgeKey: "badgePortalSelection",
    triggerLabel: {
      es: "Portal: Cliente confirma su selección",
      fr: "Portail : Le client valide sa sélection",
      en: "Portal: Client submits photo selection",
      ar: "البوابة: العميل يؤكد اختيار الصور",
    },
    title: {
      es: "3. Confirmación de Selección Recibida",
      fr: "3. Confirmation de Sélection Reçue",
      en: "3. Photo Selection Confirmed",
      ar: "3. تأكيد استلام اختيار الصور",
    },
    desc: {
      es: "Se envía automáticamente al cliente cuando envía su selección de fotos desde el portal.",
      fr: "Envoyé automatiquement au client lorsqu'il soumet sa sélection depuis le portail.",
      en: "Automatically sent to the client after submitting their selection on the portal.",
      ar: "يُرسل تلقائياً للعميل فور إرسال اختياره للصور من البوابة.",
    },
  },
  {
    key: "ready_delivery",
    badgeKey: "badgePlannerReady",
    triggerLabel: {
      es: "Planner: Fase 'Listo para Entrega'",
      fr: "Planner : Étape 'Prêt pour Livraison'",
      en: "Planner: 'Ready for Delivery' Stage",
      ar: "المخطط: مرحلة 'جاهز للتسليم'",
    },
    title: {
      es: "4. Proyecto / Álbum Listo para Entrega en Estudio",
      fr: "4. Projet / Album Prêt pour Retrait à l'Atelier",
      en: "4. Project / Album Ready for Studio Pickup",
      ar: "4. المشروع / الألبوم جاهز للاستلام في الاستوديو",
    },
    desc: {
      es: "Se envía al mover el proyecto a 'Listo para Entrega' en el Planner.",
      fr: "Envoyé lors du passage du projet à 'Prêt pour Livraison' dans le Planner.",
      en: "Sent when moving the project to 'Ready for Delivery' in the Planner.",
      ar: "يُرسل عند نقل المشروع إلى 'جاهز للتسليم' في المخطط.",
    },
  },
]

const LANG_TABS: { code: EmailLanguage; label: string; badge: string }[] = [
  { code: "fr", label: "Français", badge: "FR" },
  { code: "ar", label: "العربية", badge: "AR" },
  { code: "es", label: "Español", badge: "ES" },
  { code: "en", label: "English", badge: "EN" },
]

const QUICK_MESSAGE_PRESETS: Record<
  EmailLanguage,
  { id: string; label: string; tag: string; subject: string; body: string }[]
> = {
  fr: [
    {
      id: "reminder",
      label: "📅 Rappel de Séance",
      tag: "RAPPEL DE RENDEZ-VOUS",
      subject: "✦ Rappel de votre séance photo chez Lam7a Studios — {{clientName}}",
      body: "Nous avons le plaisir de vous rappeler votre prochaine séance au sein de notre atelier.\n\nToute notre équipe artistique vous attend avec impatience. N'hésitez pas à nous contacter si vous avez la moindre question concernant la préparation ou les tenues.",
    },
    {
      id: "selection_followup",
      label: "❤️ Relance Sélection",
      tag: "SÉLECTION DE VOS PHOTOS",
      subject: "✦ Votre sélection de photographies — Lam7a Studios ({{clientName}})",
      body: "Nous espérons que vous allez bien et que vous avez pris plaisir à découvrir vos photographies sur votre Espace Privé.\n\nDès que vous aurez terminé votre sélection (en cliquant sur l'icône ❤️ sur vos photos préférées), notre équipe pourra lancer la retouche finale et la mise en page de votre album.",
    },
    {
      id: "delivery_notice",
      label: "🎁 Information Livraison",
      tag: "LIVRAISON & ATELIER",
      subject: "✦ Information importante concernant votre projet — Lam7a Studios",
      body: "Nous tenions à vous informer de l'avancement de votre projet photographique.\n\nNos horaires d'ouverture à l'atelier de Tanger sont du lundi au samedi. Vous pouvez également consulter votre Espace Privé à tout moment.",
    },
  ],
  es: [
    {
      id: "reminder",
      label: "📅 Recordatorio de Cita",
      tag: "RECORDATORIO DE SESIÓN",
      subject: "✦ Recordatorio de tu sesión en Lam7a Studios — {{clientName}}",
      body: "Nos alegra recordarte tu próxima sesión fotográfica en nuestro atelier.\n\nTodo nuestro equipo creativo te espera con ilusión. Si tienes cualquier duda sobre el vestuario o los detalles previos, estamos a tu entera disposición.",
    },
    {
      id: "selection_followup",
      label: "❤️ Seguimiento de Selección",
      tag: "SELECCIÓN DE FOTOS",
      subject: "✦ Selección de tus fotografías — Lam7a Studios ({{clientName}})",
      body: "Esperamos que te encuentres muy bien y que hayas disfrutado viendo tus fotografías en tu Espace Privé.\n\nEn cuanto marques tus fotos favoritas con el corazón (❤️) y confirmes tu selección en el portal, nuestro equipo comenzará la edición final y el diseño de tu álbum.",
    },
    {
      id: "delivery_notice",
      label: "🎁 Aviso de Entrega / Estudio",
      tag: "INFORMACIÓN DEL ATELIER",
      subject: "✦ Información sobre tu proyecto — Lam7a Studios ({{clientName}})",
      body: "Nos ponemos en contacto contigo desde Lam7a Studios para informarte sobre el estado de tu proyecto.\n\nRecuerda que puedes acceder en cualquier momento a tu Espace Privé o escribirnos directamente para coordinar tu visita al estudio.",
    },
  ],
  en: [
    {
      id: "reminder",
      label: "📅 Session Reminder",
      tag: "SESSION REMINDER",
      subject: "✦ Reminder for your upcoming session at Lam7a Studios — {{clientName}}",
      body: "We are delighted to remind you of your upcoming photoshoot at our atelier.\n\nOur creative team is looking forward to welcoming you. Please let us know if you have any questions regarding styling or preparation.",
    },
    {
      id: "selection_followup",
      label: "❤️ Selection Follow-up",
      tag: "PHOTO SELECTION",
      subject: "✦ Your photo selection — Lam7a Studios ({{clientName}})",
      body: "We hope you are doing well and enjoyed viewing your gallery in your Private Client Space.\n\nAs soon as you complete your favorite photo selection (using the ❤️ icon), our retouching and album design team will immediately begin production.",
    },
    {
      id: "delivery_notice",
      label: "🎁 Studio & Delivery Info",
      tag: "ATELIER UPDATE",
      subject: "✦ Update regarding your project — Lam7a Studios ({{clientName}})",
      body: "We are reaching out from Lam7a Studios with an update regarding your project.\n\nYou can access your Private Client Space anytime or reply to this message to coordinate your studio visit.",
    },
  ],
  ar: [
    {
      id: "reminder",
      label: "📅 تذكير بموعد الجلسة",
      tag: "تذكير بالموعد",
      subject: "✦ تذكير بموعد جلسة التصوير في استوديو لمحة — {{clientName}}",
      body: "يسعدنا تذكيركم بموعد جلسة التصوير القادمة في استوديو لمحة.\n\nفريقنا الفني بانتظاركم بكل سرور. لا تترددوا في التواصل معنا لأي استفسار يتعلق بالتحضيرات.",
    },
    {
      id: "selection_followup",
      label: "❤️ متابعة اختيار الصور",
      tag: "اختيار الصور للألبوم",
      subject: "✦ متابعة اختيار صوركم — استوديو لمحة ({{clientName}})",
      body: "نتمنى أن تكونوا بخير وأن تكونوا قد استمتعتم بمشاهدة صوركم في المساحة الخاصة.\n\nفور إتمام اختيار صوركم المفضلة (بالضغط على أيقونة ❤️)، سيباشر فريقنا التصميم والمعالجة النهائية للألبوم.",
    },
    {
      id: "delivery_notice",
      label: "🎁 إشعار من الاستوديو",
      tag: "إشعار من استوديو لمحة",
      subject: "✦ معلومات بخصوص مشروعكم — استوديو لمحة ({{clientName}})",
      body: "نتواصل معكم من استوديو لمحة لإطلاعكم على مستجدات مشروعكم الفوتوغرافي.\n\nيمكنكم الدخول إلى مساحتكم الخاصة في أي وقت أو التواصل معنا لتنسيق زيارتكم للاستوديو.",
    },
  ],
}

export function EmailsClient({
  initialSettings,
  clients,
  sessions,
  smtpReady,
  smtpFromEmail,
}: EmailsClientProps) {
  const { language: uiLang, dir } = useLanguage()
  const activeUiLang: Language =
    uiLang === "ar" || uiLang === "en" || uiLang === "es" || uiLang === "fr" ? uiLang : "fr"
  const dict = EMAIL_UI_I18N[activeUiLang] || EMAIL_UI_I18N.fr

  // Pestaña activa: "automations" (Correos automáticos) vs "composer" (Enviar correo libre)
  const [activeTab, setActiveTab] = useState<"automations" | "composer">("automations")

  // --- Estado de Automatizaciones y Plantillas ---
  const [settings, setSettings] = useState<EmailAutomationSettings>(initialSettings)
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<EmailTemplateKey>("welcome")
  const [selectedEditLang, setSelectedEditLang] = useState<EmailLanguage>(activeUiLang)
  const [previewViewport, setPreviewViewport] = useState<"desktop" | "mobile">("desktop")
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [saveFeedback, setSaveFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null)
  const [testEmailTarget, setTestEmailTarget] = useState("")
  const [isSendingTest, setIsSendingTest] = useState(false)

  // Sincronizar el idioma de edición con el idioma del panel cuando el usuario cambia de idioma
  useEffect(() => {
    setSelectedEditLang(activeUiLang)
    setComposerLang(activeUiLang)
  }, [activeUiLang])

  // --- Estado del Redactor de Correos a Placer (Composer) ---
  const [clientSearch, setClientSearch] = useState("")
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [composerClientName, setComposerClientName] = useState("")
  const [composerClientEmail, setComposerClientEmail] = useState("")
  const [composerSessionId, setComposerSessionId] = useState("")
  const [composerLang, setComposerLang] = useState<EmailLanguage>(activeUiLang)
  const [composerTag, setComposerTag] = useState("ATELIER PHOTOGRAPHIQUE")
  const [composerSubject, setComposerSubject] = useState("")
  const [composerBody, setComposerBody] = useState("")
  const [composerIncludePortal, setComposerIncludePortal] = useState(true)
  const [composerPortalPin, setComposerPortalPin] = useState("")
  const [composerDriveUrl, setComposerDriveUrl] = useState("")
  const [composerCtaText, setComposerCtaText] = useState("")
  const [composerCtaUrl, setComposerCtaUrl] = useState("")
  const [composerClosing, setComposerClosing] = useState("")
  const [isSendingCustom, setIsSendingCustom] = useState(false)
  const [composerFeedback, setComposerFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null)

  const currentTplConfig = settings.templates[selectedTemplateKey]
  const currentLangCopy = currentTplConfig.translations[selectedEditLang]

  // Actualizar un campo de texto de la plantilla seleccionada
  const updateTemplateField = (field: keyof EmailTemplateLangCopy, value: string) => {
    setSettings((prev) => ({
      ...prev,
      templates: {
        ...prev.templates,
        [selectedTemplateKey]: {
          ...prev.templates[selectedTemplateKey],
          translations: {
            ...prev.templates[selectedTemplateKey].translations,
            [selectedEditLang]: {
              ...prev.templates[selectedTemplateKey].translations[selectedEditLang],
              [field]: value,
            },
          },
        },
      },
    }))
  }

  // Activar / Desactivar un correo automático y guardarlo en el acto
  const handleToggleTemplateEnabled = async (key: EmailTemplateKey, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    const nextEnabled = !settings.templates[key].enabled
    const nextSettings: EmailAutomationSettings = {
      ...settings,
      updatedAt: new Date().toISOString(),
      templates: {
        ...settings.templates,
        [key]: {
          ...settings.templates[key],
          enabled: nextEnabled,
        },
      },
    }
    setSettings(nextSettings)
    setIsSavingSettings(true)
    try {
      const res = await saveEmailAutomationSettingsAction(nextSettings)
      if (res.success) {
        setSaveFeedback({
          type: "ok",
          msg: nextEnabled ? dict.msgToggledOn : dict.msgToggledOff,
        })
      }
    } finally {
      setIsSavingSettings(false)
      setTimeout(() => setSaveFeedback(null), 3500)
    }
  }

  const handleSaveAllSettings = async () => {
    setIsSavingSettings(true)
    setSaveFeedback(null)
    try {
      const res = await saveEmailAutomationSettingsAction(settings)
      if (res.success) {
        setSaveFeedback({ type: "ok", msg: dict.msgSettingsSaved })
      } else {
        setSaveFeedback({ type: "err", msg: res.error || dict.msgSettingsSaveError })
      }
    } finally {
      setIsSavingSettings(false)
      setTimeout(() => setSaveFeedback(null), 4000)
    }
  }

  const handleResetCurrentTemplate = () => {
    const defCopy = DEFAULT_TEMPLATES_I18N[selectedTemplateKey][selectedEditLang]
    setSettings((prev) => ({
      ...prev,
      templates: {
        ...prev.templates,
        [selectedTemplateKey]: {
          ...prev.templates[selectedTemplateKey],
          translations: {
            ...prev.templates[selectedTemplateKey].translations,
            [selectedEditLang]: JSON.parse(JSON.stringify(defCopy)),
          },
        },
      },
    }))
    setSaveFeedback({
      type: "ok",
      msg: dict.msgResetDone(selectedEditLang.toUpperCase()),
    })
  }

  const handleSendTestEmail = async () => {
    if (!testEmailTarget.trim()) return
    setIsSendingTest(true)
    setSaveFeedback(null)
    try {
      // Guardar primero cambios actuales para que la prueba refleje lo editado
      await saveEmailAutomationSettingsAction(settings)
      const res = await sendTestAutomatedEmailAction({
        templateKey: selectedTemplateKey,
        toEmail: testEmailTarget.trim(),
        language: selectedEditLang,
      })
      if (res.success) {
        setSaveFeedback({ type: "ok", msg: dict.msgTestSent(testEmailTarget.trim()) })
      } else {
        setSaveFeedback({ type: "err", msg: res.error || dict.msgTestError })
      }
    } finally {
      setIsSendingTest(false)
    }
  }

  // Vista previa HTML en vivo para la pestaña de Automatizaciones
  const automatedPreview = useMemo(() => {
    const sampleName = "Sarah Benali"
    const sampleEmail = "sarah.benali@exemple.com"
    const samplePin = "4829"
    const sampleDate = new Date().toISOString().split("T")[0]

    if (selectedTemplateKey === "welcome") {
      return renderWelcomeEmail({
        clientName: sampleName,
        sessionDate: sampleDate,
        category: "Mariage & Portrait Editorial",
        sessionType: "photo",
        notes: "Pack Prestige + Album Lin Naturel",
        studioEmail: smtpFromEmail,
        language: selectedEditLang,
        customCopy: currentLangCopy,
      })
    } else if (selectedTemplateKey === "photos_ready") {
      return renderPhotosReadyEmail({
        clientName: sampleName,
        clientEmail: sampleEmail,
        portalPin: samplePin,
        driveFolderUrl: "https://drive.google.com/drive/folders/lam7a-sample",
        photosCount: 148,
        studioEmail: smtpFromEmail,
        language: selectedEditLang,
        customCopy: currentLangCopy,
      })
    } else if (selectedTemplateKey === "selection_confirmed") {
      return renderSelectionConfirmedEmail({
        clientName: sampleName,
        clientEmail: sampleEmail,
        portalPin: samplePin,
        photosCount: 60,
        notesCount: 3,
        studioEmail: smtpFromEmail,
        language: selectedEditLang,
        customCopy: currentLangCopy,
      })
    } else {
      return renderReadyForDeliveryEmail({
        clientName: sampleName,
        clientEmail: sampleEmail,
        portalPin: samplePin,
        category: "Mariage & Album d'Art",
        driveFolderUrl: "https://drive.google.com/drive/folders/lam7a-master",
        studioEmail: smtpFromEmail,
        language: selectedEditLang,
        customCopy: currentLangCopy,
      })
    }
  }, [selectedTemplateKey, selectedEditLang, currentLangCopy, smtpFromEmail])

  // Clientes filtrados para el selector del Redactor Libre
  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase()
    if (!q) return clients.slice(0, 25)
    return clients
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.phone && c.phone.toLowerCase().includes(q))
      )
      .slice(0, 25)
  }, [clients, clientSearch])

  // Sesiones asociadas al cliente elegido en el Redactor Libre
  const clientSessions = useMemo(() => {
    if (!composerClientName.trim() && !composerClientEmail.trim()) return sessions.slice(0, 20)
    const nameLower = composerClientName.trim().toLowerCase()
    const emailLower = composerClientEmail.trim().toLowerCase()
    const matches = sessions.filter(
      (s) =>
        (nameLower && String(s.client_name || "").toLowerCase().includes(nameLower)) ||
        (emailLower && String(s.client_email || "").toLowerCase() === emailLower)
    )
    return matches.length > 0 ? matches : sessions.slice(0, 20)
  }, [sessions, composerClientName, composerClientEmail])

  const handleSelectComposerClient = (c: ExistingClientOption) => {
    setComposerClientName(c.name)
    setComposerClientEmail(c.email || "")
    setClientSearch(`${c.name}${c.email ? ` (${c.email})` : ""}`)
    setShowClientDropdown(false)

    // Si tiene alguna sesión con PIN, cargarla automáticamente
    const matchingSess = sessions.find(
      (s) =>
        String(s.client_name || "").trim().toLowerCase() === c.name.trim().toLowerCase() ||
        (c.email && String(s.client_email || "").trim().toLowerCase() === c.email.trim().toLowerCase())
    )
    if (matchingSess) {
      setComposerSessionId(matchingSess.id)
      setComposerPortalPin(matchingSess.portal_pin || "")
      const deliv = Array.isArray(matchingSess.media_deliveries) ? matchingSess.media_deliveries[0] : null
      setComposerDriveUrl(deliv?.url || "")
    }
  }

  const handleSelectComposerSession = (sessId: string) => {
    setComposerSessionId(sessId)
    const found = sessions.find((s) => s.id === sessId)
    if (found) {
      if (found.client_name) setComposerClientName(found.client_name)
      if (found.client_email) setComposerClientEmail(found.client_email)
      setComposerPortalPin(found.portal_pin || "")
      const deliv = Array.isArray(found.media_deliveries) ? found.media_deliveries[0] : null
      setComposerDriveUrl(deliv?.url || "")
    }
  }

  const applyComposerPreset = (preset: { tag: string; subject: string; body: string }) => {
    setComposerTag(preset.tag)
    setComposerSubject(preset.subject)
    setComposerBody(preset.body)
  }

  // Vista previa HTML en vivo para el Redactor Libre (Composer)
  const composerPreview = useMemo(() => {
    return renderCustomAtelierEmail({
      clientName: composerClientName || "Sarah Benali",
      clientEmail: composerClientEmail || "client@exemple.com",
      subject: composerSubject || `✦ Message de Lam7a Studios — ${composerClientName || "Client"}`,
      bodyMessage:
        composerBody ||
        "Écrivez votre message dans le panneau de gauche pour prévisualiser instantanément le rendu HTML officiel de Lam7a Studios.",
      atelierTag: composerTag || "ATELIER PHOTOGRAPHIQUE",
      includePortalBox: composerIncludePortal,
      portalPin: composerPortalPin || null,
      driveFolderUrl: composerDriveUrl || null,
      ctaButtonText: composerCtaText || null,
      ctaButtonUrl: composerCtaUrl || null,
      closingText: composerClosing || undefined,
      studioEmail: smtpFromEmail,
      language: composerLang,
    })
  }, [
    composerClientName,
    composerClientEmail,
    composerSubject,
    composerBody,
    composerTag,
    composerIncludePortal,
    composerPortalPin,
    composerDriveUrl,
    composerCtaText,
    composerCtaUrl,
    composerClosing,
    smtpFromEmail,
    composerLang,
  ])

  const handleSendCustomEmail = async () => {
    if (!composerClientEmail.trim()) {
      setComposerFeedback({ type: "err", msg: dict.msgRequireEmail })
      return
    }
    if (!composerBody.trim()) {
      setComposerFeedback({ type: "err", msg: dict.msgRequireBody })
      return
    }
    setIsSendingCustom(true)
    setComposerFeedback(null)
    try {
      const res = await sendCustomClientEmailAction({
        sessionId: composerSessionId || null,
        clientName: composerClientName.trim() || "Client",
        clientEmail: composerClientEmail.trim(),
        subject: composerSubject.trim() || `✦ Lam7a Studios — ${composerClientName.trim() || "Atelier"}`,
        bodyMessage: composerBody,
        atelierTag: composerTag.trim() || "ATELIER PHOTOGRAPHIQUE",
        includePortalBox: composerIncludePortal,
        portalPin: composerPortalPin.trim() || null,
        driveFolderUrl: composerDriveUrl.trim() || null,
        ctaButtonText: composerCtaText.trim() || null,
        ctaButtonUrl: composerCtaUrl.trim() || null,
        closingText: composerClosing.trim() || undefined,
        language: composerLang,
      })

      if (res.success) {
        setComposerFeedback({
          type: "ok",
          msg: dict.msgCustomSent(composerClientEmail.trim()),
        })
      } else {
        setComposerFeedback({
          type: "err",
          msg: res.error || dict.msgCustomError,
        })
      }
    } finally {
      setIsSendingCustom(false)
    }
  }

  return (
    <div
      dir={dir}
      className={`min-h-screen bg-[#0b0a09] text-[#f5f2eb] p-4 md:p-8 space-y-6 ${
        dir === "rtl" ? "font-arabic" : ""
      }`}
    >
      {/* Cabecera Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#26211c] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#c69f68]/15 border border-[#c69f68]/30 flex items-center justify-center text-[#c69f68] shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-serif tracking-wide text-[#f5f2eb]">
                {dict.pageTitle}
              </h1>
              <p className="text-xs text-[#9c8e7f] mt-0.5">
                {dict.pageSubtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Estado SMTP + Selector de Pestañas */}
        <div className="flex flex-wrap items-center gap-3">
          <div
            className={`px-3 py-1.5 rounded-xl text-xs border flex items-center gap-2 ${
              smtpReady
                ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-400"
                : "bg-amber-950/30 border-amber-500/30 text-amber-400"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${smtpReady ? "bg-emerald-400" : "bg-amber-400"}`} />
            <span>{dict.exchangeLabel} {smtpFromEmail}</span>
          </div>

          <div className="flex bg-[#151210] p-1 rounded-xl border border-[#2b241d]">
            <button
              type="button"
              onClick={() => setActiveTab("automations")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "automations"
                  ? "bg-[#c69f68] text-[#0f0d0b] shadow"
                  : "text-[#a89f91] hover:text-[#f5f2eb]"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{dict.tabAutomations}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("composer")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "composer"
                  ? "bg-[#c69f68] text-[#0f0d0b] shadow"
                  : "text-[#a89f91] hover:text-[#f5f2eb]"
              }`}
            >
              <PenSquare className="w-3.5 h-3.5" />
              <span>{dict.tabComposer}</span>
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================================
          PESTAÑA 1: AUTOMATIZACIONES Y EDITOR DE PLANTILLAS DEL PLANNER
         ===================================================================== */}
      {activeTab === "automations" && (
        <div className="space-y-6">
          {/* 4 Tarjetas de Disparadores con Interruptor Activar / Desactivar */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5">
            {TEMPLATE_META.map((item) => {
              const isSelected = selectedTemplateKey === item.key
              const isEnabled = settings.templates[item.key]?.enabled !== false
              return (
                <div
                  key={item.key}
                  onClick={() => setSelectedTemplateKey(item.key)}
                  className={`cursor-pointer rounded-2xl p-4 border transition-all flex flex-col justify-between gap-3 ${
                    isSelected
                      ? "bg-[#191512] border-[#c69f68] shadow-lg shadow-[#c69f68]/5"
                      : "bg-[#12100e] border-[#26211c] hover:border-[#3d3328]"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#c69f68]/15 text-[#c69f68] border border-[#c69f68]/30 font-semibold">
                        {dict[item.badgeKey]}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => handleToggleTemplateEnabled(item.key, e)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${
                          isEnabled
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/25"
                            : "bg-zinc-800/70 text-zinc-400 border-zinc-700 hover:bg-zinc-800"
                        }`}
                        title={dict.toggleTooltip}
                      >
                        <Power className="w-3 h-3" />
                        <span>{isEnabled ? dict.statusActive : dict.statusDisabled}</span>
                      </button>
                    </div>

                    <h3 className="text-sm font-bold text-[#f5f2eb] leading-snug">
                      {item.title[activeUiLang] || item.title.fr || item.title.es}
                    </h3>
                    <p className="text-xs text-[#9c8e7f] leading-relaxed">
                      {item.desc[activeUiLang] || item.desc.fr || item.desc.es}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#241f1a] flex items-center justify-between text-[11px] text-[#8c7a6b]">
                    <span>⚡ {item.triggerLabel[activeUiLang] || item.triggerLabel.fr || item.triggerLabel.es}</span>
                    {isSelected && <span className="text-[#c69f68] font-bold">{dict.editingLabel}</span>}
                  </div>
                </div>
              )
            })}
          </div>

          {saveFeedback && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
                saveFeedback.type === "ok"
                  ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                  : "bg-red-950/40 border-red-500/40 text-red-300"
              }`}
            >
              {saveFeedback.type === "ok" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{saveFeedback.msg}</span>
            </div>
          )}

          {/* Editor de Contenido (Izquierda) + Vista Previa HTML en Vivo (Derecha) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Panel Izquierdo: Campos Editables */}
            <div className="lg:col-span-6 bg-[#12100e] border border-[#26211c] rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#241f1a] pb-3.5">
                <div>
                  <h2 className="text-sm font-bold text-[#c69f68] uppercase tracking-wider">
                    {dict.editTitle}
                  </h2>
                  <p className="text-xs text-[#8c7a6b]">
                    {dict.editSubtitle}
                  </p>
                </div>

                {/* Selector de idioma del contenido de la plantilla */}
                <div className="flex bg-[#1a1613] p-1 rounded-xl border border-[#2d261f]">
                  {LANG_TABS.map((lt) => (
                    <button
                      key={lt.code}
                      type="button"
                      onClick={() => setSelectedEditLang(lt.code)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        selectedEditLang === lt.code
                          ? "bg-[#c69f68] text-[#0f0d0b]"
                          : "text-[#9c8e7f] hover:text-[#f5f2eb]"
                      }`}
                    >
                      {lt.badge}
                    </button>
                  ))}
                </div>
              </div>

              {/* Variables disponibles */}
              <div className="bg-[#171411] border border-[#2a231c] rounded-xl p-3 space-y-1.5">
                <div className="text-[11px] font-semibold text-[#c69f68]">
                  {dict.dynamicVarsTitle}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { v: "{{clientName}}", desc: dict.varDescClientName },
                    { v: "{{sessionDate}}", desc: dict.varDescSessionDate },
                    { v: "{{category}}", desc: dict.varDescCategory },
                    { v: "{{portalPin}}", desc: dict.varDescPortalPin },
                    { v: "{{photosCount}}", desc: dict.varDescPhotosCount },
                  ].map((item) => (
                    <button
                      key={item.v}
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(item.v)
                        setSaveFeedback({ type: "ok", msg: dict.varCopiedFeedback(item.v) })
                        setTimeout(() => setSaveFeedback(null), 2000)
                      }}
                      className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#221d18] hover:bg-[#2e2720] text-[#e5d5bc] border border-[#382f26]"
                      title={`${item.v} (${item.desc})`}
                    >
                      {item.v} <span className="text-[#8c7a6b] font-sans">({item.desc})</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-[#9c8e7f] mb-1 font-medium">
                  {dict.fieldTagline}
                </label>
                <input
                  type="text"
                  value={currentLangCopy.tagline}
                  onChange={(e) => updateTemplateField("tagline", e.target.value)}
                  className="w-full bg-[#181512] border border-[#2e261f] rounded-xl px-3 py-2 text-xs text-[#f5f2eb] focus:border-[#c69f68] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-[#9c8e7f] mb-1 font-medium">
                  {dict.fieldSubject}
                </label>
                <input
                  type="text"
                  value={currentLangCopy.subject}
                  onChange={(e) => updateTemplateField("subject", e.target.value)}
                  className="w-full bg-[#181512] border border-[#2e261f] rounded-xl px-3 py-2 text-xs text-[#f5f2eb] focus:border-[#c69f68] outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#9c8e7f] mb-1 font-medium">
                    {dict.fieldGreeting}
                  </label>
                  <input
                    type="text"
                    value={currentLangCopy.greeting}
                    onChange={(e) => updateTemplateField("greeting", e.target.value)}
                    className="w-full bg-[#181512] border border-[#2e261f] rounded-xl px-3 py-2 text-xs text-[#f5f2eb] focus:border-[#c69f68] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#9c8e7f] mb-1 font-medium">
                    {dict.fieldCtaBtn}
                  </label>
                  <input
                    type="text"
                    value={currentLangCopy.ctaBtn}
                    onChange={(e) => updateTemplateField("ctaBtn", e.target.value)}
                    className="w-full bg-[#181512] border border-[#2e261f] rounded-xl px-3 py-2 text-xs text-[#f5f2eb] focus:border-[#c69f68] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-[#9c8e7f] mb-1 font-medium">
                  {dict.fieldIntro}
                </label>
                <textarea
                  rows={3}
                  value={currentLangCopy.intro}
                  onChange={(e) => updateTemplateField("intro", e.target.value)}
                  className="w-full bg-[#181512] border border-[#2e261f] rounded-xl px-3 py-2 text-xs text-[#f5f2eb] focus:border-[#c69f68] outline-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs text-[#9c8e7f] mb-1 font-medium">
                  {dict.fieldBodyText}
                </label>
                <textarea
                  rows={3}
                  value={currentLangCopy.bodyText}
                  onChange={(e) => updateTemplateField("bodyText", e.target.value)}
                  className="w-full bg-[#181512] border border-[#2e261f] rounded-xl px-3 py-2 text-xs text-[#f5f2eb] focus:border-[#c69f68] outline-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs text-[#9c8e7f] mb-1 font-medium">
                  {dict.fieldClosing}
                </label>
                <textarea
                  rows={2}
                  value={currentLangCopy.closing}
                  onChange={(e) => updateTemplateField("closing", e.target.value)}
                  className="w-full bg-[#181512] border border-[#2e261f] rounded-xl px-3 py-2 text-xs text-[#f5f2eb] focus:border-[#c69f68] outline-none leading-relaxed"
                />
              </div>

              {/* Botones de Acción (Guardar / Restaurar / Enviar Prueba) */}
              <div className="pt-3 border-t border-[#26211c] flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleResetCurrentTemplate}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-[#1a1613] hover:bg-[#231e19] text-[#a89f91] border border-[#2e261f]"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{dict.btnResetDefault(selectedEditLang.toUpperCase())}</span>
                </button>

                <button
                  type="button"
                  disabled={isSavingSettings}
                  onClick={handleSaveAllSettings}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#c69f68] to-[#9e753b] text-[#0f0d0b] hover:opacity-95 disabled:opacity-50 shadow-md"
                >
                  {isSavingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{dict.btnSaveChanges}</span>
                </button>
              </div>

              {/* Enviar correo de prueba */}
              <div className="pt-3 border-t border-[#26211c] flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="email"
                  value={testEmailTarget}
                  onChange={(e) => setTestEmailTarget(e.target.value)}
                  placeholder={dict.placeholderTestEmail}
                  className="flex-1 bg-[#181512] border border-[#2e261f] rounded-xl px-3 py-2 text-xs text-[#f5f2eb] focus:border-[#c69f68] outline-none"
                />
                <button
                  type="button"
                  disabled={isSendingTest || !testEmailTarget.trim()}
                  onClick={handleSendTestEmail}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#1e1915] hover:bg-[#2a231d] text-[#c69f68] border border-[#c69f68]/40 disabled:opacity-40"
                >
                  {isSendingTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>{dict.btnSendTest}</span>
                </button>
              </div>
            </div>

            {/* Panel Derecho: Vista Previa HTML en Vivo */}
            <div className="lg:col-span-6 bg-[#12100e] border border-[#26211c] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#241f1a] pb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#c69f68]">
                    <Eye className="w-4 h-4" />
                    <span>{dict.previewTitleAutomated(selectedEditLang.toUpperCase())}</span>
                  </div>
                  <p className="text-[11px] text-[#9c8e7f] truncate mt-0.5">
                    {dict.previewSubjectLabel} <strong className="text-[#f5f2eb]">{automatedPreview.subject}</strong>
                  </p>
                </div>

                <div className="flex bg-[#1a1613] p-1 rounded-xl border border-[#2d261f]">
                  <button
                    type="button"
                    onClick={() => setPreviewViewport("desktop")}
                    className={`p-1.5 rounded-lg ${
                      previewViewport === "desktop" ? "bg-[#c69f68] text-[#0f0d0b]" : "text-[#9c8e7f]"
                    }`}
                    title={dict.previewDesktopTooltip}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewViewport("mobile")}
                    className={`p-1.5 rounded-lg ${
                      previewViewport === "mobile" ? "bg-[#c69f68] text-[#0f0d0b]" : "text-[#9c8e7f]"
                    }`}
                    title={dict.previewMobileTooltip}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex justify-center bg-[#080706] rounded-xl border border-[#221d18] p-2 overflow-hidden">
                <iframe
                  title="Email Live Preview"
                  srcDoc={automatedPreview.html}
                  className="rounded-lg border-0 transition-all duration-200 bg-[#080706]"
                  style={{
                    width: previewViewport === "mobile" ? "375px" : "100%",
                    height: "660px",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          PESTAÑA 2: ENVIAR CORREO A PLACER (REDACTOR LIBRE CON PRESET HTML)
         ===================================================================== */}
      {activeTab === "composer" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Columna Izquierda: Redactor */}
          <div className="lg:col-span-6 bg-[#12100e] border border-[#26211c] rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#241f1a] pb-3.5">
              <div>
                <h2 className="text-sm font-bold text-[#c69f68] uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span>{dict.composerTitle}</span>
                </h2>
                <p className="text-xs text-[#8c7a6b]">
                  {dict.composerSubtitle}
                </p>
              </div>

              {/* Idioma del correo que se enviará al cliente */}
              <div className="flex bg-[#1a1613] p-1 rounded-xl border border-[#2d261f]">
                {LANG_TABS.map((lt) => (
                  <button
                    key={lt.code}
                    type="button"
                    onClick={() => setComposerLang(lt.code)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      composerLang === lt.code
                        ? "bg-[#c69f68] text-[#0f0d0b]"
                        : "text-[#9c8e7f] hover:text-[#f5f2eb]"
                    }`}
                  >
                    {lt.badge}
                  </button>
                ))}
              </div>
            </div>

            {composerFeedback && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
                  composerFeedback.type === "ok"
                    ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                    : "bg-red-950/40 border-red-500/40 text-red-300"
                }`}
              >
                {composerFeedback.type === "ok" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{composerFeedback.msg}</span>
              </div>
            )}

            {/* 1. Buscador de Cliente Existente */}
            <div className="space-y-3 bg-[#171411] border border-[#2a231c] rounded-xl p-3.5">
              <div className="relative">
                <label className="block text-xs font-semibold text-[#c69f68] mb-1">
                  {dict.composerStep1}
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#8c7a6b] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={clientSearch}
                    onFocus={() => setShowClientDropdown(true)}
                    onChange={(e) => {
                      setClientSearch(e.target.value)
                      setShowClientDropdown(true)
                    }}
                    placeholder={dict.composerSearchPlaceholder}
                    className="w-full bg-[#12100e] border border-[#2e261f] rounded-xl pl-9 pr-3 py-2 text-xs text-[#f5f2eb] focus:border-[#c69f68] outline-none"
                  />
                </div>

                {showClientDropdown && filteredClients.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full max-h-52 overflow-y-auto bg-[#151210] border border-[#3d3328] rounded-xl shadow-2xl divide-y divide-[#241f1a]">
                    {filteredClients.map((c, idx) => (
                      <div
                        key={`${c.name}-${idx}`}
                        onClick={() => handleSelectComposerClient(c)}
                        className="px-3 py-2 hover:bg-[#221d18] cursor-pointer flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-[#f5f2eb]">{c.name}</div>
                          <div className="text-[11px] text-[#9c8e7f]">
                            {c.email || dict.composerNoEmail} {c.phone ? `• ${c.phone}` : ""}
                          </div>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#c69f68]/15 text-[#c69f68]">
                          {c.sessionCount} {dict.composerSessionsSuffix}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-[#9c8e7f] mb-1">{dict.composerClientNameLabel}</label>
                  <input
                    type="text"
                    value={composerClientName}
                    onChange={(e) => setComposerClientName(e.target.value)}
                    placeholder={dict.composerClientNamePlaceholder}
                    className="w-full bg-[#12100e] border border-[#2e261f] rounded-xl px-3 py-2 text-xs text-[#f5f2eb] focus:border-[#c69f68] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#9c8e7f] mb-1">{dict.composerClientEmailLabel}</label>
                  <input
                    type="email"
                    value={composerClientEmail}
                    onChange={(e) => setComposerClientEmail(e.target.value)}
                    placeholder={dict.composerClientEmailPlaceholder}
                    className="w-full bg-[#12100e] border border-[#2e261f] rounded-xl px-3 py-2 text-xs text-[#f5f2eb] focus:border-[#c69f68] outline-none"
                  />
                </div>
              </div>

              {/* Vincular sesión opcional para autocompletar PIN y Drive */}
              <div>
                <label className="block text-[11px] text-[#9c8e7f] mb-1">
                  {dict.composerLinkSessionLabel}
                </label>
                <select
                  value={composerSessionId}
                  onChange={(e) => handleSelectComposerSession(e.target.value)}
                  className="w-full bg-[#12100e] border border-[#2e261f] rounded-xl px-3 py-2 text-xs text-[#f5f2eb] focus:border-[#c69f68] outline-none"
                >
                  <option value="">{dict.composerNoSessionOption}</option>
                  {clientSessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.client_name} — {s.category} ({s.session_date}) {s.portal_pin ? `[PIN: ${s.portal_pin}]` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 2. Plantillas Rápidas de Texto (1 Clic) */}
            <div>
              <label className="block text-xs text-[#9c8e7f] mb-1.5 font-medium">
                {dict.composerStep2}
              </label>
              <div className="flex flex-wrap gap-2">
                {(QUICK_MESSAGE_PRESETS[composerLang] || QUICK_MESSAGE_PRESETS.fr).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyComposerPreset(p)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium bg-[#1a1613] hover:bg-[#26201a] text-[#e5d5bc] border border-[#332a22] transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Asunto y Cuerpo del Mensaje */}
            <div>
              <label className="block text-xs text-[#9c8e7f] mb-1 font-medium">{dict.composerSubjectLabel}</label>
              <input
                type="text"
                value={composerSubject}
                onChange={(e) => setComposerSubject(e.target.value)}
                placeholder={dict.composerSubjectPlaceholder}
                className="w-full bg-[#181512] border border-[#2e261f] rounded-xl px-3 py-2 text-xs text-[#f5f2eb] focus:border-[#c69f68] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-[#9c8e7f] mb-1 font-medium">
                {dict.composerBodyLabel}
              </label>
              <textarea
                rows={6}
                value={composerBody}
                onChange={(e) => setComposerBody(e.target.value)}
                placeholder={dict.composerBodyPlaceholder}
                className="w-full bg-[#181512] border border-[#2e261f] rounded-xl px-3.5 py-2.5 text-xs text-[#f5f2eb] focus:border-[#c69f68] outline-none leading-relaxed"
              />
            </div>

            {/* Opciones extra: Incluir Caja de PIN del Portal / Enlace Drive */}
            <div className="bg-[#171411] border border-[#2a231c] rounded-xl p-3.5 space-y-3">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-[#e5d5bc]">
                <input
                  type="checkbox"
                  checked={composerIncludePortal}
                  onChange={(e) => setComposerIncludePortal(e.target.checked)}
                  className="rounded accent-[#c69f68]"
                />
                <span>{dict.composerIncludePortalLabel}</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-[#9c8e7f] mb-1">{dict.composerPinLabel}</label>
                  <input
                    type="text"
                    value={composerPortalPin}
                    onChange={(e) => setComposerPortalPin(e.target.value)}
                    placeholder="Ej: 4829"
                    className="w-full bg-[#12100e] border border-[#2e261f] rounded-xl px-3 py-1.5 text-xs font-mono text-[#c69f68] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#9c8e7f] mb-1">{dict.composerDriveLabel}</label>
                  <input
                    type="text"
                    value={composerDriveUrl}
                    onChange={(e) => setComposerDriveUrl(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="w-full bg-[#12100e] border border-[#2e261f] rounded-xl px-3 py-1.5 text-xs text-[#f5f2eb] outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                disabled={isSendingCustom}
                onClick={handleSendCustomEmail}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold bg-gradient-to-r from-[#c69f68] to-[#9e753b] text-[#0f0d0b] hover:opacity-95 disabled:opacity-50 shadow-lg"
              >
                {isSendingCustom ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>{dict.composerBtnSend}</span>
              </button>
            </div>
          </div>

          {/* Columna Derecha: Vista Previa del Correo Personalizado */}
          <div className="lg:col-span-6 bg-[#12100e] border border-[#26211c] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#241f1a] pb-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-bold text-[#c69f68]">
                  <Eye className="w-4 h-4" />
                  <span>{dict.composerPreviewTitle(composerLang.toUpperCase())}</span>
                </div>
                <p className="text-[11px] text-[#9c8e7f] truncate mt-0.5">
                  {dict.composerPreviewTo} <strong className="text-[#f5f2eb]">{composerClientEmail || "client@exemple.com"}</strong> • {dict.previewSubjectLabel}{" "}
                  <strong className="text-[#f5f2eb]">{composerPreview.subject}</strong>
                </p>
              </div>
            </div>

            <div className="flex justify-center bg-[#080706] rounded-xl border border-[#221d18] p-2 overflow-hidden">
              <iframe
                title="Custom Email Preview"
                srcDoc={composerPreview.html}
                className="rounded-lg border-0 w-full bg-[#080706]"
                style={{ height: "680px" }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
