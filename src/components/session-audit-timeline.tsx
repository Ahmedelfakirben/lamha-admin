"use client"

import { useState, useEffect } from "react"
import { 
  History, 
  ChevronDown, 
  User, 
  Upload, 
  Trash2, 
  RefreshCw, 
  KanbanSquare, 
  CheckCircle2, 
  Share2, 
  FileEdit,
  Clock,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  FolderDown,
  HardDrive,
  Server,
  Cloud,
  Mail,
  MessageSquare,
  Sparkles,
  Zap,
  Laptop
} from "lucide-react"
import { getAuditLogs, AuditLogEntry } from "@/lib/audit"
import { format } from "date-fns"
import { fr, es, enUS, ar } from "date-fns/locale"
import { useLanguage } from "@/context/language-context"

interface SessionAuditTimelineProps {
  sessionId: string
  clientName: string
}

type TimelineLang = "es" | "fr" | "en" | "ar"

const TIMELINE_I18N: Record<
  TimelineLang,
  {
    title: string
    badge: string
    subtitle: string
    events: string
    viewHistory: string
    timelineOf: (clientName: string) => string
    refresh: string
    loading: string
    empty: string
    element: string
    localPoste: string
    sourceIngestCompanion: string
    sourceWebAdmin: string
    sessionCreatedIngestDesc: string
    sessionCreatedWebDesc: string
    categoryLabel: string
    dateLabel: string
    pinLabel: string
    stageMove: string
    actions: {
      ingestion: string
      upload: string
      delete: string
      planner: string
      status: string
      shared: string
      created: string
      email: string
      whatsapp: string
      selection: string
      modify: string
    }
    visibility: {
      visible: string
      hidden: string
      visibleDesc: string
      hiddenDesc: string
      bulk: (count: number, isShared: boolean) => string
    }
    ingestion: {
      completed: string
      files: string
      photos: string
      videos: string
      destSsd: string
      destNas: string
      destCloud: string
      saved: string
      synced: string
      syncPartial: string
      syncFailed: string
      syncSkipped: string
      targetFolder: string
      sourcePath: string
    }
    stages: Record<string, string>
    notifications: {
      welcomeEmail: (email: string) => string
      welcomeWa: (phone: string) => string
      photosReadyEmail: (email: string, count: number) => string
      photosReadyWa: (phone: string, count: number) => string
      deliveryEmail: (email: string) => string
      selectionSubmitted: (count: number) => string
      customEmail: (subject: string, email: string) => string
    }
  }
> = {
  fr: {
    title: "Traçabilité & Journal d'Audit",
    badge: "Audit Trail ERP",
    subtitle: "Historique chronologique des ingestions de matériel, téléversements, étapes et partages de ce projet.",
    events: "événements",
    viewHistory: "Voir l'historique",
    timelineOf: (clientName) => `Chronologie des actions sur ${clientName}`,
    refresh: "Actualiser",
    loading: "Chargement de l'audit du projet...",
    empty: "Aucun enregistrement d'audit pour ce projet ou les actions ont été enregistrées avant l'activation du module.",
    element: "Élément :",
    localPoste: "Poste Local Studio PC3",
    sourceIngestCompanion: "⚡ Créé via Ingest Companion (PC3)",
    sourceWebAdmin: "💻 Créé depuis le panneau web",
    sessionCreatedIngestDesc: "Projet et dossier initialisés directement depuis l'outil de bureau Ingest Companion.",
    sessionCreatedWebDesc: "Projet créé manuellement depuis le panneau d'administration web.",
    categoryLabel: "Catégorie",
    dateLabel: "Date de séance",
    pinLabel: "Code PIN client",
    stageMove: "Étape du projet modifiée",
    actions: {
      ingestion: "Ingestion Ingest Companion",
      upload: "Téléversement de photos",
      delete: "Photo / Élément supprimé",
      planner: "Changement de Planner",
      status: "Changement de statut",
      shared: "Visibilité des photos",
      created: "Création du projet",
      email: "Notification Email",
      whatsapp: "Notification WhatsApp",
      selection: "Sélection du client",
      modify: "Modification",
    },
    visibility: {
      visible: "Partagé avec le client",
      hidden: "Masqué au client (Atelier uniquement)",
      visibleDesc: "Cette photo est désormais visible et sélectionnable par le client sur son portail web privé.",
      hiddenDesc: "Cette photo a été masquée du portail client et reste réservée à l'équipe de l'atelier.",
      bulk: (count, isShared) => `${count} photo(s) modifiée(s) : ${isShared ? "Visibles sur le portail client" : "Masquées au client"}`,
    },
    ingestion: {
      completed: "Ingestion de médias terminée avec succès",
      files: "fichiers",
      photos: "Photos",
      videos: "Vidéos",
      destSsd: "SSD Local",
      destNas: "NAS Synology",
      destCloud: "Vignettes Cloud",
      saved: "Enregistré",
      synced: "Synchronisé",
      syncPartial: "Partiel",
      syncFailed: "Échec de connexion",
      syncSkipped: "Désactivé",
      targetFolder: "Dossier cible",
      sourcePath: "Source",
    },
    stages: {
      shooting: "Prise de vue",
      selection: "Sélection client",
      editing: "Retouche & Montage",
      review: "Contrôle qualité",
      delivered: "Livré / Terminé",
    },
    notifications: {
      welcomeEmail: (email) => `Email de bienvenue officiel envoyé avec succès à ${email} (Code PIN inclus).`,
      welcomeWa: (phone) => `Message WhatsApp de bienvenue envoyé au ${phone} (Code PIN inclus).`,
      photosReadyEmail: (email, count) => `Email de photos prêtes envoyé à ${email} (${count} photos à sélectionner).`,
      photosReadyWa: (phone, count) => `Message WhatsApp envoyé au ${phone} (${count} photos prêtes pour sélection).`,
      deliveryEmail: (email) => `Email de livraison finale envoyé avec succès à ${email}.`,
      selectionSubmitted: (count) => `Le client a validé et transmis sa sélection définitive : ${count} photos choisies.`,
      customEmail: (subject, email) => `Email officiel envoyé à ${email} : « ${subject} »`,
    },
  },
  es: {
    title: "Trazabilidad & Registro de Auditoría",
    badge: "Audit Trail ERP",
    subtitle: "Historial cronológico de ingestas de material, subidas de fotos, cambios de etapas y visibilidad en este proyecto.",
    events: "eventos",
    viewHistory: "Ver historial",
    timelineOf: (clientName) => `Línea de tiempo de acciones en ${clientName}`,
    refresh: "Actualizar",
    loading: "Cargando auditoría del proyecto...",
    empty: "Aún no hay registros de auditoría para este proyecto o las acciones se registraron antes de activar el módulo.",
    element: "Elemento:",
    localPoste: "Poste Local Studio PC3",
    sourceIngestCompanion: "⚡ Creado vía Ingest Companion (PC3)",
    sourceWebAdmin: "💻 Creado desde panel web",
    sessionCreatedIngestDesc: "Proyecto y carpeta inicializados directamente desde la herramienta Ingest Companion.",
    sessionCreatedWebDesc: "Proyecto creado manualmente desde el panel de administración web.",
    categoryLabel: "Categoría",
    dateLabel: "Fecha de sesión",
    pinLabel: "Código PIN cliente",
    stageMove: "Etapa de proyecto modificada",
    actions: {
      ingestion: "Ingesta Ingest Companion",
      upload: "Subida de Fotos",
      delete: "Foto / Elemento Eliminado",
      planner: "Cambio en Planner",
      status: "Cambio de Estado",
      shared: "Visibilidad de Fotos",
      created: "Creación de Proyecto",
      email: "Notificación por Correo",
      whatsapp: "Notificación por WhatsApp",
      selection: "Selección del Cliente",
      modify: "Modificación",
    },
    visibility: {
      visible: "Visible para el cliente",
      hidden: "Oculto al cliente (Uso interno)",
      visibleDesc: "Esta foto ahora es visible y seleccionable por el cliente en su portal web privado.",
      hiddenDesc: "Esta foto ha sido ocultada del portal del cliente y queda reservada para el atelier.",
      bulk: (count, isShared) => `${count} foto(s) actualizadas a: ${isShared ? "Visibles en el portal" : "Ocultas al cliente"}`,
    },
    ingestion: {
      completed: "Ingesta de material completada con éxito",
      files: "archivos",
      photos: "Fotos",
      videos: "Videos",
      destSsd: "SSD Local",
      destNas: "NAS Synology",
      destCloud: "Miniaturas Cloud",
      saved: "Guardado",
      synced: "Sincronizado",
      syncPartial: "Parcial",
      syncFailed: "Fallo conexión NAS",
      syncSkipped: "Desactivado",
      targetFolder: "Carpeta destino",
      sourcePath: "Origen",
    },
    stages: {
      shooting: "Toma de Fotos",
      selection: "Selección Cliente",
      editing: "Retoque y Montaje",
      review: "Control de Calidad",
      delivered: "Entregado / Finalizado",
    },
    notifications: {
      welcomeEmail: (email) => `Correo de bienvenida oficial enviado con éxito a ${email} (Código PIN incluido).`,
      welcomeWa: (phone) => `Mensaje de WhatsApp de bienvenida enviado al ${phone} (Código PIN incluido).`,
      photosReadyEmail: (email, count) => `Correo de fotos listas enviado a ${email} (${count} fotos para selección).`,
      photosReadyWa: (phone, count) => `WhatsApp de fotos listas enviado al ${phone} (${count} fotos).`,
      deliveryEmail: (email) => `Correo de entrega final enviado con éxito a ${email}.`,
      selectionSubmitted: (count) => `El cliente confirmó y envió su selección definitiva: ${count} fotos seleccionadas.`,
      customEmail: (subject, email) => `Correo oficial enviado a ${email}: « ${subject} »`,
    },
  },
  en: {
    title: "Traceability & Audit Trail",
    badge: "Audit Trail ERP",
    subtitle: "Chronological history of media ingests, photo uploads, stage updates, and visibility changes for this project.",
    events: "events",
    viewHistory: "View history",
    timelineOf: (clientName) => `Timeline of actions on ${clientName}`,
    refresh: "Refresh",
    loading: "Loading project audit trail...",
    empty: "No audit records for this project yet, or actions were recorded before activating the module.",
    element: "Item:",
    localPoste: "Local Station Studio PC3",
    sourceIngestCompanion: "⚡ Created via Ingest Companion (PC3)",
    sourceWebAdmin: "💻 Created from Web Admin",
    sessionCreatedIngestDesc: "Project and folders initialized directly from the desktop Ingest Companion tool.",
    sessionCreatedWebDesc: "Project manually created from the web administration panel.",
    categoryLabel: "Category",
    dateLabel: "Session date",
    pinLabel: "Client PIN code",
    stageMove: "Project stage changed",
    actions: {
      ingestion: "Ingest Companion Run",
      upload: "Photos Upload",
      delete: "Photo / Item Deleted",
      planner: "Planner Change",
      status: "Status Change",
      shared: "Photos Visibility",
      created: "Project Created",
      email: "Email Notification",
      whatsapp: "WhatsApp Notification",
      selection: "Client Selection",
      modify: "Modification",
    },
    visibility: {
      visible: "Shared with client",
      hidden: "Hidden from client (Studio only)",
      visibleDesc: "This photo is now visible and selectable by the client in their private web portal.",
      hiddenDesc: "This photo has been hidden from the client portal and remains private for the studio team.",
      bulk: (count, isShared) => `${count} photo(s) updated to: ${isShared ? "Visible on client portal" : "Hidden from client"}`,
    },
    ingestion: {
      completed: "Media ingestion completed successfully",
      files: "files",
      photos: "Photos",
      videos: "Videos",
      destSsd: "Local SSD",
      destNas: "Synology NAS",
      destCloud: "Cloud Previews",
      saved: "Saved",
      synced: "Synced",
      syncPartial: "Partial",
      syncFailed: "NAS Connection Failed",
      syncSkipped: "Disabled",
      targetFolder: "Target folder",
      sourcePath: "Source",
    },
    stages: {
      shooting: "Photo Shoot",
      selection: "Client Selection",
      editing: "Editing & Retouch",
      review: "Quality Review",
      delivered: "Delivered / Done",
    },
    notifications: {
      welcomeEmail: (email) => `Official welcome email successfully sent to ${email} (PIN code included).`,
      welcomeWa: (phone) => `Welcome WhatsApp message successfully sent to ${phone} (PIN code included).`,
      photosReadyEmail: (email, count) => `Photos ready email sent to ${email} (${count} photos to select).`,
      photosReadyWa: (phone, count) => `Photos ready WhatsApp message sent to ${phone} (${count} photos).`,
      deliveryEmail: (email) => `Final delivery email successfully sent to ${email}.`,
      selectionSubmitted: (count) => `Client confirmed and submitted their final selection: ${count} photos chosen.`,
      customEmail: (subject, email) => `Official custom email sent to ${email}: "${subject}"`,
    },
  },
  ar: {
    title: "التتبع وسجل التدقيق",
    badge: "مسار تدقيق ERP",
    subtitle: "سجل زمني لعمليات استيراد الوسائط، رفع الصور، تغيير المراحل ومشاركة الملفات في هذا المشروع.",
    events: "أحداث",
    viewHistory: "عرض السجل",
    timelineOf: (clientName) => `الجدول الزمني للإجراءات في ${clientName}`,
    refresh: "تحديث",
    loading: "جاري تحميل سجل تدقيق المشروع...",
    empty: "لا توجد سجلات تدقيق لهذا المشروع بعد أو أن الإجراءات تم تسجيلها قبل تفعيل الوحدة.",
    element: "العنصر:",
    localPoste: "المحطة المحلية Studio PC3",
    sourceIngestCompanion: "⚡ تم الإنشاء عبر Ingest Companion (PC3)",
    sourceWebAdmin: "💻 تم الإنشاء من لوحة التحكم الويب",
    sessionCreatedIngestDesc: "تمت تهيئة المشروع والمجلد مباشرة من برنامج الاستيراد المكتبي Ingest Companion.",
    sessionCreatedWebDesc: "تم إنشاء المشروع يدويًا من لوحة تحكم الإدارة.",
    categoryLabel: "التصنيف",
    dateLabel: "تاريخ الجلسة",
    pinLabel: "رمز PIN للعميل",
    stageMove: "تم تغيير مرحلة المشروع",
    actions: {
      ingestion: "استيراد Ingest Companion",
      upload: "رفع الصور",
      delete: "صورة / عنصر محذوف",
      planner: "تعديل في المخطط",
      status: "تغيير الحالة",
      shared: "ظهور الصور للعميل",
      created: "إنشاء المشروع",
      email: "إشعار بريد إلكتروني",
      whatsapp: "إشعار واتساب",
      selection: "اختيار العميل",
      modify: "تعديل",
    },
    visibility: {
      visible: "مشارك مع العميل",
      hidden: "مخفي عن العميل (خاص بالأستوديو)",
      visibleDesc: "هذه الصورة أصبحت الآن مرئية وقابلة للاختيار من طرف العميل في بوابته الخاصة.",
      hiddenDesc: "تم إخفاء هذه الصورة من بوابة العميل وتبقى مخصصة لفريق الأستوديو الداخلي.",
      bulk: (count, isShared) => `تم تحديث ${count} صورة لتصبح: ${isShared ? "مرئية في البوابة" : "مخفية عن العميل"}`,
    },
    ingestion: {
      completed: "اكتمل استيراد الوسائط بنجاح",
      files: "ملفات",
      photos: "صور",
      videos: "فيديوهات",
      destSsd: "قرص SSD محلي",
      destNas: "خادم Synology NAS",
      destCloud: "معاينات السحابة",
      saved: "تم الحفظ",
      synced: "تمت المزامنة",
      syncPartial: "مزامنة جزئية",
      syncFailed: "فشل الاتصال بـ NAS",
      syncSkipped: "معطل",
      targetFolder: "المجلد الهدف",
      sourcePath: "المصدر",
    },
    stages: {
      shooting: "جلسة التصوير",
      selection: "اختيار الصور",
      editing: "المعالجة والمونتاج",
      review: "مراجعة الجودة",
      delivered: "تم التسليم",
    },
    notifications: {
      welcomeEmail: (email) => `تم إرسال بريد الترحيب الرسمي بنجاح إلى ${email} (شامل رمز PIN).`,
      welcomeWa: (phone) => `تم إرسال رسالة واتساب للترحيب إلى ${phone} (شامل رمز PIN).`,
      photosReadyEmail: (email, count) => `تم إرسال بريد جاهزية الصور إلى ${email} (${count} صورة للاختيار).`,
      photosReadyWa: (phone, count) => `تم إرسال رسالة واتساب إلى ${phone} (${count} صورة جاهزة للاختيار).`,
      deliveryEmail: (email) => `تم إرسال بريد التسليم النهائي بنجاح إلى ${email}.`,
      selectionSubmitted: (count) => `قام العميل بتأكيد وإرسال اختياره النهائي: تم اختيار ${count} صورة.`,
      customEmail: (subject, email) => `تم إرسال بريد رسمي إلى ${email}: « ${subject} »`,
    },
  },
}

export function SessionAuditTimeline({ sessionId, clientName }: SessionAuditTimelineProps) {
  const { language } = useLanguage()
  const activeLang = (["es", "fr", "en", "ar"].includes(language) ? language : "fr") as TimelineLang
  const t = TIMELINE_I18N[activeLang]
  const isRTL = activeLang === "ar"

  const [isOpen, setIsOpen] = useState(false)
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(false)

  const dateLocale = activeLang === "es" ? es : activeLang === "en" ? enUS : activeLang === "ar" ? ar : fr

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const res = await getAuditLogs({
        entityId: sessionId,
        limit: 40,
      })
      setLogs(res.logs)
    } catch (err) {
      console.error("Error fetching project audit logs:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [sessionId])

  const getActionBadge = (action: string) => {
    if (action.includes("INGESTION")) {
      return {
        icon: FolderDown,
        label: t.actions.ingestion,
        color: "text-amber-400 [html.light_&]:text-amber-700 bg-amber-500/15 [html.light_&]:bg-amber-50 border-amber-500/30 [html.light_&]:border-amber-200",
      }
    }
    if (action.includes("UPLOAD")) {
      return {
        icon: Upload,
        label: t.actions.upload,
        color: "text-emerald-400 [html.light_&]:text-emerald-700 bg-emerald-500/15 [html.light_&]:bg-emerald-50 border-emerald-500/30 [html.light_&]:border-emerald-200",
      }
    }
    if (action.includes("DELETED")) {
      return {
        icon: Trash2,
        label: t.actions.delete,
        color: "text-rose-400 [html.light_&]:text-rose-700 bg-rose-500/15 [html.light_&]:bg-rose-50 border-rose-500/30 [html.light_&]:border-rose-200",
      }
    }
    if (action.includes("PLANNER")) {
      return {
        icon: KanbanSquare,
        label: t.actions.planner,
        color: "text-amber-400 [html.light_&]:text-amber-700 bg-amber-500/15 [html.light_&]:bg-amber-50 border-amber-500/30 [html.light_&]:border-amber-200",
      }
    }
    if (action.includes("STATUS")) {
      return {
        icon: RefreshCw,
        label: t.actions.status,
        color: "text-sky-400 [html.light_&]:text-sky-700 bg-sky-500/15 [html.light_&]:bg-sky-50 border-sky-500/30 [html.light_&]:border-sky-200",
      }
    }
    if (action.includes("SHARED")) {
      return {
        icon: Share2,
        label: t.actions.shared,
        color: "text-purple-400 [html.light_&]:text-purple-700 bg-purple-500/15 [html.light_&]:bg-purple-50 border-purple-500/30 [html.light_&]:border-purple-200",
      }
    }
    if (action.includes("EMAIL")) {
      return {
        icon: Mail,
        label: t.actions.email,
        color: "text-sky-400 [html.light_&]:text-sky-700 bg-sky-500/15 [html.light_&]:bg-sky-50 border-sky-500/30 [html.light_&]:border-sky-200",
      }
    }
    if (action.includes("WHATSAPP")) {
      return {
        icon: MessageSquare,
        label: t.actions.whatsapp,
        color: "text-emerald-400 [html.light_&]:text-emerald-700 bg-emerald-500/15 [html.light_&]:bg-emerald-50 border-emerald-500/30 [html.light_&]:border-emerald-200",
      }
    }
    if (action.includes("SELECTION")) {
      return {
        icon: Sparkles,
        label: t.actions.selection,
        color: "text-amber-400 [html.light_&]:text-amber-700 bg-amber-500/15 [html.light_&]:bg-amber-50 border-amber-500/30 [html.light_&]:border-amber-200",
      }
    }
    if (action.includes("CREATED")) {
      return {
        icon: CheckCircle2,
        label: t.actions.created,
        color: "text-[#c69f68] [html.light_&]:text-[#9b7538] bg-[#c69f68]/15 [html.light_&]:bg-[#f4efe4] border-[#c69f68]/30 [html.light_&]:border-[#c69f68]/40",
      }
    }
    return {
      icon: FileEdit,
      label: t.actions.modify,
      color: "text-[#a89f91] [html.light_&]:text-[#6b5f54] bg-[#1a1714] [html.light_&]:bg-[#f4efe4] border-[#26211c] [html.light_&]:border-[#e6dfcf]",
    }
  }

  // Renderizador amigable y legible para el usuario humano
  const renderFriendlyDetails = (log: AuditLogEntry) => {
    const action = log.action || ""
    const d = log.details || {}

    // 1. Visibilidad compartida con el cliente (MEDIA_SHARED_TOGGLE)
    if (action.includes("SHARED")) {
      const isShared = Boolean(d.is_shared)
      const count = typeof d.count === "number" ? d.count : null
      const filename = d.filename || (log.entity_type === "media_asset" ? log.entity_title : null)

      return (
        <div className="space-y-2 mt-1">
          <div className="flex flex-wrap items-center gap-2">
            {isShared ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 [html.light_&]:text-emerald-700 border border-emerald-500/30 [html.light_&]:border-emerald-200">
                <Eye className="w-3.5 h-3.5" />
                {t.visibility.visible}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-500/15 text-amber-400 [html.light_&]:text-amber-700 border border-amber-500/30 [html.light_&]:border-amber-200">
                <EyeOff className="w-3.5 h-3.5" />
                {t.visibility.hidden}
              </span>
            )}
            {filename && (
              <span className="text-xs font-mono text-[#f5f2eb] [html.light_&]:text-[#1c1917] bg-[#1a1714] [html.light_&]:bg-[#f4efe4] px-2 py-0.5 rounded border border-[#26211c] [html.light_&]:border-[#e6dfcf]">
                📷 {filename}
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#a89f91] [html.light_&]:text-[#6b5f54] leading-relaxed">
            {count ? t.visibility.bulk(count, isShared) : (isShared ? t.visibility.visibleDesc : t.visibility.hiddenDesc)}
          </p>
        </div>
      )
    }

    // 2. Ingesta de material terminada desde Ingest Companion (INGESTION_COMPLETED)
    if (action.includes("INGESTION")) {
      const filesCount = d.files_count || 0
      const photosCount = d.photos_count || 0
      const videosCount = d.videos_count || 0
      const totalMb = d.total_mb || 0
      const gbFormatted = (totalMb / 1024).toFixed(1)
      const nasStatus = d.nas_status || "done"
      const cloudOk = d.cloud_ok || 0
      const folderName = d.folder_name || ""

      return (
        <div className="space-y-2 mt-1.5 p-3 rounded-xl bg-[#0c0b0a]/80 [html.light_&]:bg-[#f8f5ee] border border-[#26211c] [html.light_&]:border-[#e6dfcf]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-[#f5f2eb] [html.light_&]:text-[#1c1917] flex items-center gap-1.5">
              <FolderDown className="w-4 h-4 text-[#c69f68] [html.light_&]:text-[#9b7538]" />
              {t.ingestion.completed}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#c69f68]/15 [html.light_&]:bg-[#f4efe4] text-[#c69f68] [html.light_&]:text-[#9b7538] border border-[#c69f68]/30 font-semibold">
              {filesCount} {t.ingestion.files} ({gbFormatted} GB)
            </span>
          </div>

          <div className="text-[11px] text-[#d4cbbf] [html.light_&]:text-[#4a4036] flex items-center gap-3">
            <span>📸 {photosCount} {t.ingestion.photos}</span>
            {videosCount > 0 && <span>🎥 {videosCount} {t.ingestion.videos}</span>}
          </div>

          {/* Destinos de almacenamiento */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 pt-1 text-[10px]">
            <div className="p-1.5 rounded-lg bg-[#141210] [html.light_&]:bg-[#ffffff] border border-[#26211c] [html.light_&]:border-[#e6dfcf] flex items-center gap-1.5">
              <HardDrive className="w-3 h-3 text-emerald-400 [html.light_&]:text-emerald-600 shrink-0" />
              <span className="text-[#a89f91] [html.light_&]:text-[#6b5f54]">{t.ingestion.destSsd}:</span>
              <span className="text-emerald-400 [html.light_&]:text-emerald-700 font-semibold">{t.ingestion.saved}</span>
            </div>

            <div className="p-1.5 rounded-lg bg-[#141210] [html.light_&]:bg-[#ffffff] border border-[#26211c] [html.light_&]:border-[#e6dfcf] flex items-center gap-1.5">
              <Server className="w-3 h-3 text-[#c69f68] [html.light_&]:text-[#9b7538] shrink-0" />
              <span className="text-[#a89f91] [html.light_&]:text-[#6b5f54]">{t.ingestion.destNas}:</span>
              {nasStatus === "done" ? (
                <span className="text-emerald-400 [html.light_&]:text-emerald-700 font-semibold">{t.ingestion.synced}</span>
              ) : nasStatus === "partial" ? (
                <span className="text-amber-400 [html.light_&]:text-amber-700 font-semibold">{t.ingestion.syncPartial}</span>
              ) : nasStatus === "failed" ? (
                <span className="text-rose-400 [html.light_&]:text-rose-700 font-semibold">{t.ingestion.syncFailed}</span>
              ) : (
                <span className="text-[#8c7a6b] [html.light_&]:text-[#786b5e] font-semibold">{t.ingestion.syncSkipped}</span>
              )}
            </div>

            <div className="p-1.5 rounded-lg bg-[#141210] [html.light_&]:bg-[#ffffff] border border-[#26211c] [html.light_&]:border-[#e6dfcf] flex items-center gap-1.5">
              <Cloud className="w-3 h-3 text-sky-400 [html.light_&]:text-sky-600 shrink-0" />
              <span className="text-[#a89f91] [html.light_&]:text-[#6b5f54]">{t.ingestion.destCloud}:</span>
              <span className="text-sky-400 [html.light_&]:text-sky-700 font-semibold">{cloudOk} WebP</span>
            </div>
          </div>

          {folderName && (
            <div className="text-[10px] text-[#8c7a6b] [html.light_&]:text-[#786b5e] font-mono truncate pt-0.5">
              📁 {t.ingestion.targetFolder}: <span className="text-[#d4cbbf] [html.light_&]:text-[#2c2621]">{folderName}</span>
            </div>
          )}
        </div>
      )
    }

    // 3. Creación de Proyecto (SESSION_CREATED)
    if (action.includes("SESSION_CREATED") || action.includes("CLIENT_CREATED")) {
      const isIngestSource = d.source === "ingest_companion" || log.user_role === "ingest_station" || log.user_email?.includes("ingest")
      const category = d.category || d.type || ""
      const sessionDate = d.session_date || d.date || ""
      const pin = d.portal_pin

      return (
        <div className="space-y-1.5 mt-1">
          <div className="flex items-center gap-2">
            {isIngestSource ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 [html.light_&]:bg-amber-50 text-amber-400 [html.light_&]:text-amber-800 border border-amber-500/30">
                <Zap className="w-3 h-3 text-[#c69f68] [html.light_&]:text-[#9b7538]" />
                {t.sourceIngestCompanion}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#c69f68]/15 [html.light_&]:bg-[#f4efe4] text-[#c69f68] [html.light_&]:text-[#9b7538] border border-[#c69f68]/30">
                <Laptop className="w-3 h-3" />
                {t.sourceWebAdmin}
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#d4cbbf] [html.light_&]:text-[#544c43]">
            {isIngestSource ? t.sessionCreatedIngestDesc : t.sessionCreatedWebDesc}
          </p>
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#8c7a6b] [html.light_&]:text-[#6b5f54]">
            {category && <span>🏷️ {t.categoryLabel}: <strong className="text-[#f5f2eb] [html.light_&]:text-[#1c1917] capitalize">{category}</strong></span>}
            {sessionDate && <span>📅 {t.dateLabel}: <strong className="text-[#f5f2eb] [html.light_&]:text-[#1c1917]">{sessionDate}</strong></span>}
            {pin && <span>🔑 {t.pinLabel}: <strong className="text-[#c69f68] [html.light_&]:text-[#9b7538] font-mono">{pin}</strong></span>}
          </div>
        </div>
      )
    }

    // 4. Cambios en el Planner (PLANNER_STAGE_CHANGED)
    if (action.includes("PLANNER")) {
      const prev = d.previous_stage
      const next = d.new_stage
      const prevName = prev ? (t.stages[prev] || prev) : ""
      const nextName = next ? (t.stages[next] || next) : ""

      return (
        <div className="space-y-1 mt-1 text-[11px] text-[#d4cbbf] [html.light_&]:text-[#544c43]">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[#8c7a6b] [html.light_&]:text-[#786b5e]">{t.stageMove}:</span>
            {prevName && (
              <span className="px-2 py-0.5 rounded bg-[#1e1a16] [html.light_&]:bg-[#f4efe4] text-[#a89f91] [html.light_&]:text-[#6b5f54] border border-[#26211c] [html.light_&]:border-[#e6dfcf]">
                {prevName}
              </span>
            )}
            <span className="text-[#c69f68] [html.light_&]:text-[#9b7538] font-bold">→</span>
            {nextName && (
              <span className="px-2 py-0.5 rounded bg-[#c69f68]/20 [html.light_&]:bg-[#e6dfcf] text-[#c69f68] [html.light_&]:text-[#9b7538] font-semibold border border-[#c69f68]/40">
                {nextName}
              </span>
            )}
          </div>
        </div>
      )
    }

    // 5. Notificaciones de Email & WhatsApp
    if (action === "EMAIL_WELCOME_SENT") {
      return (
        <p className="text-[11px] text-[#d4cbbf] [html.light_&]:text-[#544c43] mt-1">
          {t.notifications.welcomeEmail(d.email || log.entity_title || "")}
        </p>
      )
    }
    if (action === "WHATSAPP_WELCOME_SENT") {
      return (
        <p className="text-[11px] text-[#d4cbbf] [html.light_&]:text-[#544c43] mt-1">
          {t.notifications.welcomeWa(d.phone || "")}
        </p>
      )
    }
    if (action === "EMAIL_PHOTOS_READY_SENT") {
      return (
        <p className="text-[11px] text-[#d4cbbf] [html.light_&]:text-[#544c43] mt-1">
          {t.notifications.photosReadyEmail(d.email || "", d.photos_count || 0)}
        </p>
      )
    }
    if (action === "WHATSAPP_PHOTOS_READY_SENT") {
      return (
        <p className="text-[11px] text-[#d4cbbf] [html.light_&]:text-[#544c43] mt-1">
          {t.notifications.photosReadyWa(d.phone || "", d.photos_count || 0)}
        </p>
      )
    }
    if (action === "EMAIL_READY_FOR_DELIVERY_SENT") {
      return (
        <p className="text-[11px] text-[#d4cbbf] [html.light_&]:text-[#544c43] mt-1">
          {t.notifications.deliveryEmail(d.email || "")}
        </p>
      )
    }
    if (action === "CLIENT_SELECTION_SUBMITTED") {
      return (
        <p className="text-[11px] text-[#d4cbbf] [html.light_&]:text-[#544c43] mt-1 font-semibold text-amber-300 [html.light_&]:text-amber-800">
          {t.notifications.selectionSubmitted(d.photos_count || 0)}
        </p>
      )
    }
    if (action === "EMAIL_CUSTOM_SENT") {
      return (
        <p className="text-[11px] text-[#d4cbbf] [html.light_&]:text-[#544c43] mt-1">
          {t.notifications.customEmail(d.subject || "", d.email || "")}
        </p>
      )
    }

    // 6. Subidas y eliminaciones de archivos
    if (action === "MEDIA_BATCH_UPLOADED") {
      return (
        <p className="text-[11px] text-[#d4cbbf] [html.light_&]:text-[#544c43] mt-1">
          📸 {d.filename || log.entity_title || "Fichier"} {d.size_mb ? `(${d.size_mb} MB)` : ""}
        </p>
      )
    }
    if (action === "MEDIA_DELETED") {
      return (
        <p className="text-[11px] text-[#d4cbbf] [html.light_&]:text-[#544c43] mt-1">
          🗑️ {d.filename || log.entity_title || "Fichier supprimé"}
        </p>
      )
    }

    // 7. Fallback limpio sin UUIDs crudos
    const cleanEntries = Object.entries(d).filter(
      ([key]) => !["asset_id", "user_id", "deleted_asset_id", "messageId"].includes(key)
    )

    if (cleanEntries.length === 0) return null

    return (
      <div className="text-[10px] font-mono text-[#8c7a6b] [html.light_&]:text-[#6b5f54] bg-[#0c0b0a] [html.light_&]:bg-[#f5efe3] p-2 rounded-lg border border-[#26211c]/80 [html.light_&]:border-[#e6dfcf] overflow-x-auto mt-1">
        {cleanEntries.map(([key, val]) => (
          <div key={key} className="flex gap-1.5">
            <span className="text-[#c69f68] [html.light_&]:text-[#9b7538] capitalize">{key.replace(/_/g, " ")}:</span>
            <span className="text-[#d4cbbf] [html.light_&]:text-[#2c2621]">
              {typeof val === "object" ? JSON.stringify(val) : String(val)}
            </span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div 
      dir={isRTL ? "rtl" : "ltr"}
      className="rounded-2xl bg-[#141210] [html.light_&]:bg-[#ffffff] border border-[#26211c] [html.light_&]:border-[#e6dfcf] overflow-hidden transition-all shadow-md [html.light_&]:shadow-sm"
    >
      {/* Header bar / Accordion trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between text-left rtl:text-right hover:bg-[#181613] [html.light_&]:hover:bg-[#faf7f0] transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#c69f68]/20 to-[#181613] [html.light_&]:to-[#f4efe4] border border-[#c69f68]/35 flex items-center justify-center text-[#c69f68] [html.light_&]:text-[#9b7538] shrink-0">
            <History className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-serif font-bold text-[#f5f2eb] [html.light_&]:text-[#1c1917] tracking-wide">
                {t.title}
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1e1a16] [html.light_&]:bg-[#f4efe4] border border-[#c69f68]/25 text-[#c69f68] [html.light_&]:text-[#9b7538] font-mono">
                {t.badge}
              </span>
            </div>
            <p className="text-[11px] text-[#8c7a6b] [html.light_&]:text-[#786b5e] mt-0.5 truncate">
              {t.subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-[#a89f91] [html.light_&]:text-[#786b5e] font-mono hidden sm:inline">
            {logs.length > 0 ? `${logs.length} ${t.events}` : t.viewHistory}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-[#c69f68] [html.light_&]:text-[#9b7538] transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {/* Accordion Content */}
      {isOpen && (
        <div className="p-4 border-t border-[#26211c] [html.light_&]:border-[#e6dfcf] bg-[#0d0c0b]/60 [html.light_&]:bg-[#faf7f0] space-y-3">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[10px] uppercase tracking-wider text-[#70665a] [html.light_&]:text-[#786b5e] font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#c69f68] [html.light_&]:text-[#9b7538]" />
              {t.timelineOf(clientName)}
            </span>
            <button
              type="button"
              onClick={fetchLogs}
              disabled={loading}
              className="text-[11px] text-[#c69f68] [html.light_&]:text-[#9b7538] hover:text-[#dfba85] [html.light_&]:hover:text-[#b88c44] flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
              <span>{t.refresh}</span>
            </button>
          </div>

          {loading ? (
            <div className="py-8 text-center text-[#8c7a6b] [html.light_&]:text-[#786b5e] text-xs flex flex-col items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-[#c69f68] [html.light_&]:text-[#9b7538]" />
              <span>{t.loading}</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-6 text-center text-[#70665a] [html.light_&]:text-[#786b5e] text-xs bg-[#110f0d] [html.light_&]:bg-[#ffffff] rounded-xl border border-[#26211c]/60 [html.light_&]:border-[#e6dfcf] [html.light_&]:shadow-xs p-4">
              <AlertCircle className="w-4 h-4 mx-auto mb-1 text-[#c69f68]/60 [html.light_&]:text-[#9b7538]/70" />
              <span>{t.empty}</span>
            </div>
          ) : (
            <div className={`space-y-2 relative before:absolute before:inset-0 ${isRTL ? "before:right-3.5 before:left-auto" : "before:left-3.5 before:right-auto"} before:w-0.5 before:bg-[#26211c] [html.light_&]:before:bg-[#e6dfcf] before:content-['']`}>
              {logs.map((log) => {
                const badge = getActionBadge(log.action)
                const IconComponent = badge.icon
                const formattedDate = format(new Date(log.created_at), "dd MMM yyyy • HH:mm", {
                  locale: dateLocale,
                })
                const isIngestHardware = log.user_role === "ingest_station" || log.details?.source === "ingest_companion"

                return (
                  <div key={log.id} className={`relative flex items-start gap-3 ${isRTL ? "pr-8 pl-0" : "pl-8 pr-0"} py-1.5 group`}>
                    {/* Timeline Node dot */}
                    <div className={`absolute ${isRTL ? "right-2 left-auto" : "left-2 right-auto"} top-3 w-3.5 h-3.5 rounded-full bg-[#181512] [html.light_&]:bg-[#ffffff] border-2 border-[#c69f68] [html.light_&]:border-[#9b7538] group-hover:scale-110 transition-transform`} />

                    <div className="flex-1 p-3 rounded-xl bg-[#141210] [html.light_&]:bg-[#ffffff] border border-[#26211c] [html.light_&]:border-[#e6dfcf] [html.light_&]:shadow-xs hover:border-[#c69f68]/40 [html.light_&]:hover:border-[#9b7538]/50 transition-colors space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        {/* Action badge */}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${badge.color}`}>
                          <IconComponent className="w-3 h-3" />
                          <span>{badge.label}</span>
                        </span>

                        {/* Timestamp */}
                        <span className="text-[10px] font-mono text-[#70665a] [html.light_&]:text-[#786b5e] flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {formattedDate}
                        </span>
                      </div>

                      {/* User & Station Attribution */}
                      <div className="flex items-center gap-2 text-xs text-[#f5f2eb] [html.light_&]:text-[#1c1917] flex-wrap">
                        <div className="w-5 h-5 rounded-full bg-[#1e1b18] [html.light_&]:bg-[#f4efe4] border border-[#c69f68]/40 [html.light_&]:border-[#9b7538]/40 flex items-center justify-center text-[#c69f68] [html.light_&]:text-[#9b7538] text-[10px] font-bold">
                          {isIngestHardware ? (
                            <Zap className="w-3 h-3 text-[#c69f68]" />
                          ) : (
                            <User className="w-2.5 h-2.5" />
                          )}
                        </div>
                        <span className="font-semibold text-[#f5f2eb] [html.light_&]:text-[#1c1917]">
                          {isIngestHardware ? "Ingest Companion (PC3)" : log.user_name}
                        </span>
                        <span className="text-[10px] text-[#8c7a6b] [html.light_&]:text-[#786b5e] font-mono">
                          ({isIngestHardware ? t.localPoste : log.user_email})
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded uppercase font-mono font-bold ${
                          isIngestHardware 
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" 
                            : "bg-[#1e1b18] [html.light_&]:bg-[#f4efe4] text-[#c69f68] [html.light_&]:text-[#9b7538]"
                        }`}>
                          {isIngestHardware ? "INGEST_HARDWARE" : log.user_role}
                        </span>
                      </div>

                      {/* Renderizador formateado y humano */}
                      {renderFriendlyDetails(log)}
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
