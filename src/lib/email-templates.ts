/**
 * Plantillas HTML Responsivas y de Lujo para Lam7a Studios Atelier
 * Soporte Completo para las 4 Lenguas del Sistema:
 * - fr (Français - Atelier Standard)
 * - ar (العربية - RTL)
 * - en (English)
 * - es (Español)
 *
 * Incluye soporte para textos personalizados por plantilla/idioma y
 * redactor libre con Preset HTML de lujo (renderCustomAtelierEmail).
 */

export type EmailLanguage = "fr" | "es" | "en" | "ar"
export type EmailTemplateKey = "welcome" | "photos_ready" | "selection_confirmed" | "ready_delivery"

export interface EmailTemplateLangCopy {
  atelierTag: string
  tagline: string
  subject: string
  greeting: string
  intro: string
  bodyText: string
  ctaBtn: string
  closing: string
  footerText: string
}

const LOGO_URL = "https://admin.lam7a.ma/assets/logo/lamha-logo-email.png"
const PORTAL_URL = "https://lam7a.ma/portal"

export function resolveLang(lang?: string | null): EmailLanguage {
  if (lang === "ar" || lang === "en" || lang === "es" || lang === "fr") {
    return lang
  }
  return "fr" // Standard Atelier
}

export function interpolateEmailVars(
  templateStr: string,
  vars: Record<string, string | number | undefined | null>
): string {
  if (!templateStr) return ""
  return templateStr.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key) => {
    const val = vars[key]
    return val !== undefined && val !== null ? String(val) : ""
  })
}

function formatTextParagraphsToHtml(rawText: string): string {
  if (!rawText) return ""
  const blocks = rawText
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean)

  return blocks
    .map(
      (block) =>
        `<p style="margin: 0 0 18px; font-size: 14px; line-height: 1.75; color: #c4b9ab;">${block.replace(
          /\n/g,
          "<br/>"
        )}</p>`
    )
    .join("\n")
}

// ---------------------------------------------------------------------------
// TEXTOS POR DEFECTO EDITABLES POR PLANTILLA E IDIOMA
// Variables soportadas: {{clientName}}, {{sessionDate}}, {{category}}, {{portalPin}}, {{photosCount}}, {{clientEmail}}
// ---------------------------------------------------------------------------
export const DEFAULT_TEMPLATES_I18N: Record<EmailTemplateKey, Record<EmailLanguage, EmailTemplateLangCopy>> = {
  welcome: {
    fr: {
      atelierTag: "ATELIER PHOTOGRAPHIQUE",
      tagline: "Capturer l'éternité dans chaque instant",
      subject: "✦ Bienvenue chez Lam7a Studios — Confirmation de Réservation : {{clientName}}",
      greeting: "Cher/Chère {{clientName}},",
      intro:
        "C'est un véritable honneur de vous accueillir au sein de <strong>Lam7a Studios</strong>. Nous avons bien enregistré votre projet et réservé la date dans l'agenda de notre atelier.",
      bodyText:
        "Notre équipe de photographes et directeurs artistiques prépare déjà l'ensemble du dispositif créatif pour immortaliser vos précieux moments avec le plus haut niveau d'exigence et d'élégance.",
      ctaBtn: "✦ Accéder au Portail Client →",
      closing:
        "Pour toute question, coordination de tenues ou précision avant le jour J, notre équipe reste à votre entière disposition.",
      footerText: "Lam7a Studios Atelier • Tous droits réservés.",
    },
    ar: {
      atelierTag: "استوديو التصوير الفني",
      tagline: "تخليد اللحظات الأبدية بأرقى المعايير",
      subject: "✦ مرحباً بكم في استوديو لمحة — تأكيد حجز جلسة التصوير: {{clientName}}",
      greeting: "عزيزنا/عزيزتنا {{clientName}}،",
      intro:
        "إنه لمن دواعي سرورنا واعتزازنا أن نرحب بكم في <strong>استوديو لمحة (Lam7a Studios)</strong>. لقد تم تسجيل مشروعكم وتثبيت الموعد المحدد في جدول مواعيد الاستوديو.",
      bodyText:
        "فريقنا من المصورين والمشرفين الفنيين يستعد لتقديم أرقى تجربة تصوير توثق لحظاتكم المميزة بأعلى درجات الفخامة والإتقان.",
      ctaBtn: "✦ الدخول إلى المساحة الخاصة ←",
      closing:
        "إذا كانت لديكم أي استفسارات بخصوص الملابس، الموقع أو تفاصيل الجلسة، يسعدنا تواصلكم معنا في أي وقت.",
      footerText: "استوديو لمحة • جميع الحقوق محفوظة.",
    },
    en: {
      atelierTag: "PHOTOGRAPHIC ATELIER",
      tagline: "Capturing eternity in every instant",
      subject: "✦ Welcome to Lam7a Studios — Booking Confirmation: {{clientName}}",
      greeting: "Dear {{clientName}},",
      intro:
        "It is a true honor to welcome you to <strong>Lam7a Studios</strong>. We have officially registered your project and reserved your date in our atelier's calendar.",
      bodyText:
        "Our team of photographers and creative directors is already preparing the artistic and technical direction to immortalize your moments with the highest level of craftsmanship and elegance.",
      ctaBtn: "✦ Open Client Portal →",
      closing:
        "Should you have any inquiries regarding styling, locations, or special requests prior to your session, we remain at your complete disposal.",
      footerText: "Lam7a Studios Atelier • All rights reserved.",
    },
    es: {
      atelierTag: "ATELIER FOTOGRÁFICO",
      tagline: "Capturando la eternidad en cada instante",
      subject: "✦ Bienvenida a Lam7a Studios — Confirmación de Reserva: {{clientName}}",
      greeting: "Estimado/a {{clientName}},",
      intro:
        "Es un honor darte la más cálida bienvenida a <strong>Lam7a Studios</strong>. Hemos registrado formalmente tu proyecto y reservado la fecha en la agenda de nuestro atelier.",
      bodyText:
        "Nuestro equipo de fotógrafos y directores de arte ya está preparando todo el despliegue técnico y creativo para inmortalizar tus mejores momentos con la máxima fidelidad, elegancia y cuidado del detalle.",
      ctaBtn: "✦ Acceder al Portal Cliente →",
      closing:
        "Si necesitas realizar cualquier consulta, coordinar la vestimenta, ubicación o afinar detalles antes del día señalado, estamos a tu entera disposición.",
      footerText: "Lam7a Studios Atelier • Todos los derechos reservados.",
    },
  },
  photos_ready: {
    fr: {
      atelierTag: "ESPACE PRIVÉ & SÉLECTION",
      tagline: "Vos précieux souvenirs sont désormais disponibles",
      subject: "✦ Vos photos sont prêtes sur votre Espace Privé — Lam7a Studios ({{clientName}})",
      greeting: "Bonjour {{clientName}},",
      intro:
        "Nous avons le plaisir de vous annoncer que votre reportage photo a été traité et calibré par notre atelier. Vos photographies ({{photosCount}}) sont prêtes à être consultées sur votre Espace Privé.",
      bodyText:
        "Connectez-vous avec votre email et votre code PIN {{portalPin}}, puis cliquez sur l'icône cœur (❤️) sur chaque photo que vous souhaitez sélectionner pour l'album ou la retouche finale.",
      ctaBtn: "✦ Accéder à mon Espace Privé →",
      closing:
        "Nous espérons de tout cœur que vous apprécierez revivre ces instants autant que nous avons aimé les capturer.",
      footerText: "Lam7a Studios Atelier • Tous droits réservés.",
    },
    ar: {
      atelierTag: "المساحة الخاصة واختيار الصور",
      tagline: "ذكرياتكم الثمينة أصبحت جاهزة الآن",
      subject: "✦ صوركم أصبحت جاهزة في المساحة الخاصة — استوديو لمحة ({{clientName}})",
      greeting: "مرحباً {{clientName}}!",
      intro:
        "يسعدنا إعلامكم أن جلسة التصوير الخاصة بكم تم تجهيزها ومعالجتها فنيّاً بدقة عالية في استوديو لمحة. يتوفر لديكم الآن ({{photosCount}}) صورة جاهزة للمعاينة.",
      bodyText:
        "سجلوا الدخول باستخدام بريدكم الإلكتروني والرمز السري {{portalPin}}، ثم اضغطوا على أيقونة القلب (❤️) على الصور التي ترغبون باختيارها للألبوم أو المعالجة النهائية.",
      ctaBtn: "✦ الدخول إلى مساحتي الخاصة ←",
      closing:
        "نتمنى من كل قلوبنا أن تستمتعوا بمشاهدة هذه الذكريات الخالدة بقدر استمتاعنا بتوثيقها لكم.",
      footerText: "استوديو لمحة • جميع الحقوق محفوظة.",
    },
    en: {
      atelierTag: "PRIVATE CLIENT SPACE & SELECTION",
      tagline: "Your precious memories are now available",
      subject: "✦ Your photos are ready in your Private Space — Lam7a Studios ({{clientName}})",
      greeting: "Hello {{clientName}}!",
      intro:
        "We are delighted to inform you that your photoshoot has been processed and calibrated by our atelier. Your photographs ({{photosCount}}) are ready to view.",
      bodyText:
        "Log in using your email address and security PIN {{portalPin}}, then click the heart icon (❤️) on each photo you wish to select for your final album or editorial retouching.",
      ctaBtn: "✦ Access My Private Space →",
      closing:
        "We sincerely hope you cherish reliving these moments as much as we enjoyed creating them.",
      footerText: "Lam7a Studios Atelier • All rights reserved.",
    },
    es: {
      atelierTag: "ESPACIO PRIVADO & SELECCIÓN",
      tagline: "Tus recuerdos más bellos ya están disponibles",
      subject: "✦ Tus fotos están listas en tu Espace Privé — Lam7a Studios ({{clientName}})",
      greeting: "¡Hola {{clientName}}!",
      intro:
        "Nos alegra comunicarte que el reportaje fotográfico ha sido procesado y calibrado por nuestro atelier. Ya tienes tus fotografías ({{photosCount}}) disponibles para visualizar.",
      bodyText:
        "Ingresa al portal con tu correo y tu código PIN {{portalPin}}, y haz clic en el icono del corazón (❤️) en cada foto que desees seleccionar para el álbum o retoque editorial.",
      ctaBtn: "✦ Acceder a mi Espace Privé →",
      closing:
        "Esperamos de corazón que disfrutes reviviendo estos momentos tanto como nosotros disfrutamos capturándolos.",
      footerText: "Lam7a Studios Atelier • Todos los derechos reservados.",
    },
  },
  selection_confirmed: {
    fr: {
      atelierTag: "SÉLECTION VALIDÉE & EN ÉDITION",
      tagline: "Nous avons bien reçu votre sélection de photographies",
      subject: "✦ Confirmation de votre sélection d'art — Lam7a Studios ({{clientName}})",
      greeting: "Bonjour {{clientName}},",
      intro:
        "Nous confirmons la bonne réception de votre sélection de <strong>{{photosCount}} photographies</strong> validées depuis votre Espace Privé.",
      bodyText:
        "Notre équipe de direction artistique et de retouche d'art prend immédiatement le relais pour la calibration colorimétrique avancée et la mise en page de votre album.",
      ctaBtn: "✦ Revoir ma Sélection sur le Portail →",
      closing:
        "Nous vous tiendrons informé(e) dès que votre livraison finale sera prête à l'atelier.",
      footerText: "Lam7a Studios Atelier • Tous droits réservés.",
    },
    ar: {
      atelierTag: "تم اعتماد الاختيار وبدء المونتاج",
      tagline: "تم استلام قائمتكم المختارة من الصور بنجاح",
      subject: "✦ تأكيد استلام اختياركم الفني — استوديو لمحة ({{clientName}})",
      greeting: "مرحباً {{clientName}}!",
      intro:
        "نؤكد لكم استلام اختياركم لـ <strong>{{photosCount}} صورة</strong> تم اعتمادها بنجاح عبر مساحتكم الخاصة.",
      bodyText:
        "فريق الإشراف الفني والمعالجة الدقيقة في استوديو لمحة يباشر الآن مرحلة المعايرة اللونية وتصميم الألبوم وفق أعلى معايير الجودة.",
      ctaBtn: "✦ مراجعة الصور المختارة في البوابة ←",
      closing:
        "سنقوم بإشعاركم فور جاهزية النسخة النهائية والألبوم للاستلام في الاستوديو.",
      footerText: "استوديو لمحة • جميع الحقوق محفوظة.",
    },
    en: {
      atelierTag: "SELECTION CONFIRMED & IN PRODUCTION",
      tagline: "Your photo selection has been safely received",
      subject: "✦ Photo Selection Confirmed — Lam7a Studios ({{clientName}})",
      greeting: "Hello {{clientName}}!",
      intro:
        "We confirm the successful receipt of your curated selection of <strong>{{photosCount}} photographs</strong> from your Private Space.",
      bodyText:
        "Our creative team has commenced the master retouching, color grading, and custom book layout for your project.",
      ctaBtn: "✦ Review Selection on Portal →",
      closing:
        "We will notify you as soon as your final collection is ready at the atelier.",
      footerText: "Lam7a Studios Atelier • All rights reserved.",
    },
    es: {
      atelierTag: "SELECCIÓN CONFIRMADA & EN EDICIÓN",
      tagline: "Hemos recibido tu selección de fotografías",
      subject: "✦ Confirmación de tu Selección — Lam7a Studios ({{clientName}})",
      greeting: "¡Hola {{clientName}}!",
      intro:
        "Confirmamos la recepción de tu selección de <strong>{{photosCount}} fotografías</strong> enviada desde tu Espace Privé.",
      bodyText:
        "Nuestro equipo editorial y de retoque de arte comienza ahora la fase de postproducción y maquetación de tu álbum.",
      ctaBtn: "✦ Revisar mi Selección en el Portal →",
      closing:
        "Te avisaremos en cuanto tu entrega final esté lista en el estudio.",
      footerText: "Lam7a Studios Atelier • Todos los derechos reservados.",
    },
  },
  ready_delivery: {
    fr: {
      atelierTag: "LIVRAISON ATELIER & MONTAGE FINAL",
      tagline: "Votre commande est prête pour le retrait à l'Atelier",
      subject: "✦ Vos photographies d'art sont prêtes à l'Atelier — Lam7a Studios ({{clientName}})",
      greeting: "Cher/Chère {{clientName}},",
      intro:
        "Nous avons l'immense honneur de vous annoncer que les tirages d'art, la reliure de votre album et les finitions de votre projet sont désormais <strong>prêts et finalisés</strong> à notre atelier.",
      bodyText:
        "Vous pouvez vous présenter à notre studio à Tanger afin de recevoir votre coffret d'art prestigieux. Vos fichiers numériques définitifs sont également consultables et téléchargeables sur votre Espace Privé.",
      ctaBtn: "✦ Consulter la Livraison sur mon Espace Privé →",
      closing:
        "Toute l'équipe de Lam7a Studios vous remercie chaleureusement pour votre confiance et a hâte de vous remettre vos précieux souvenirs.",
      footerText: "Lam7a Studios Atelier • Tous droits réservés.",
    },
    ar: {
      atelierTag: "التسليم النهائي في الاستوديو",
      tagline: "طلبكم وألبومكم الفني جاهز للاستلام الآن",
      subject: "✦ صوركم وألبومكم الفني أصبح جاهزاً في استوديو لمحة ({{clientName}})",
      greeting: "عزيزنا/عزيزتنا {{clientName}}،",
      intro:
        "يسعدنا ويشرفنا إعلامكم بأن أعمال الطباعة الفنية، التجليد الفاخر للألبوم واللمسات النهائية لمشروعكم قد <strong>اكتملت بنجاح</strong> وأصبحت جاهزة في الاستوديو.",
      bodyText:
        "يسعدنا استقبالكم في استوديو لمحة بطنجة لتسليمكم ألبومكم الفني الفاخر. كما تتوفر النسخ الرقمية النهائية عبر مساحتكم الخاصة على موقعنا.",
      ctaBtn: "✦ معاينة التسليم النهائي في البوابة الخاصة ←",
      closing:
        "فريق استوديو لمحة يشكركم جزيل الشكر على ثقتكم الغالية ويسعدنا دائماً خدمتكم بأعلى معايير الإتقان.",
      footerText: "استوديو لمحة • جميع الحقوق محفوظة.",
    },
    en: {
      atelierTag: "ATELIER DELIVERY & MASTER ARTWORKS",
      tagline: "Your artworks and fine album are ready for pickup",
      subject: "✦ Your Master Collection is ready at the Atelier — Lam7a Studios ({{clientName}})",
      greeting: "Dear {{clientName}},",
      intro:
        "It is our absolute pleasure to inform you that your fine art prints, luxury linen album, and final edits are now <strong>completed and ready for collection</strong> at our atelier.",
      bodyText:
        "You are cordially invited to visit our atelier in Tangier to collect your bespoke photo box and album. Your final high-resolution digital files are also available on your Private Client Space.",
      ctaBtn: "✦ View Delivery on My Private Space →",
      closing:
        "The entire Lam7a Studios team thanks you for your trust and looks forward to handing over your cherished memories.",
      footerText: "Lam7a Studios Atelier • All rights reserved.",
    },
    es: {
      atelierTag: "ENTREGA ATELIER & MONTAJE FINAL",
      tagline: "Tu pedido y álbum de arte ya están listos en el estudio",
      subject: "✦ Tu entrega final está lista en el Atelier — Lam7a Studios ({{clientName}})",
      greeting: "Estimado/a {{clientName}},",
      intro:
        "Es un auténtico placer comunicarte que las impresiones de arte, el encuadernado de tu álbum y los acabados finales de tu proyecto ya están <strong>totalmente terminados y listos</strong> en nuestro atelier.",
      bodyText:
        "Puedes pasar por nuestro atelier en Tánger para recoger tu elegante álbum y fotografías físicas. También puedes acceder a tu Espace Privé para ver la entrega digital completa.",
      ctaBtn: "✦ Ver Entrega en mi Espace Privé →",
      closing:
        "Todo el equipo de Lam7a Studios te agradece enormemente tu confianza y estamos deseando entregarte tus recuerdos más especiales.",
      footerText: "Lam7a Studios Atelier • Todos los derechos reservados.",
    },
  },
}

export interface WelcomeEmailParams {
  clientName: string
  sessionDate?: string | null
  category?: string | null
  sessionType?: string | null
  notes?: string | null
  studioEmail?: string
  studioPhone?: string
  language?: EmailLanguage | string
  customCopy?: Partial<EmailTemplateLangCopy>
}

export interface PhotosReadyEmailParams {
  clientName: string
  portalUrl?: string
  clientEmail: string
  portalPin: string
  driveFolderUrl?: string | null
  photosCount?: number
  studioEmail?: string
  studioPhone?: string
  language?: EmailLanguage | string
  customCopy?: Partial<EmailTemplateLangCopy>
}

export interface ReadyForDeliveryEmailParams {
  clientName: string
  category?: string | null
  portalUrl?: string
  clientEmail?: string | null
  portalPin?: string | null
  driveFolderUrl?: string | null
  studioEmail?: string
  studioPhone?: string
  language?: EmailLanguage | string
  customCopy?: Partial<EmailTemplateLangCopy>
}

export interface SelectionConfirmedEmailParams {
  clientName: string
  photosCount: number
  notesCount?: number
  portalUrl?: string
  clientEmail?: string | null
  portalPin?: string | null
  studioEmail?: string
  studioPhone?: string
  language?: EmailLanguage | string
  customCopy?: Partial<EmailTemplateLangCopy>
}

export interface CustomAtelierEmailParams {
  clientName: string
  clientEmail: string
  subject: string
  bodyMessage: string
  atelierTag?: string
  tagline?: string
  includePortalBox?: boolean
  portalPin?: string | null
  driveFolderUrl?: string | null
  ctaButtonText?: string | null
  ctaButtonUrl?: string | null
  closingText?: string | null
  studioEmail?: string
  studioPhone?: string
  language?: EmailLanguage | string
}

// ---------------------------------------------------------------------------
// ETIQUETAS AUXILIARES FIJAS DE LAS CAJAS INTERNAS
// ---------------------------------------------------------------------------
const STATIC_LABELS = {
  fr: {
    dateLabel: "Date Programmée",
    catLabel: "Catégorie & Spécialité",
    notesLabel: "Notes & Détails",
    noDate: "Date à confirmer",
    boxTitle: "VOS IDENTIFIANTS D'ACCÈS",
    emailLabel: "Email d'accès :",
    pinLabel: "CODE PIN DE SÉCURITÉ",
    driveTitle: "Fichiers Haute Résolution sur Google Drive :",
    driveBtn: "📁 Ouvrir le dossier Google Drive →",
    pickupBannerTitle: "Retrait à l'Atelier & Livraison",
    studioAddress: "Lam7a Studios Atelier • Tanger, Maroc",
    selectionSavedBadge: "✓ Sélection Enregistrée avec Succès",
  },
  ar: {
    dateLabel: "الموعد المحدد",
    catLabel: "الفئة والتخصص",
    notesLabel: "ملاحظات وتفاصيل",
    noDate: "الموعد قيد التأكيد",
    boxTitle: "بيانات الدخول الخاصة بكم",
    emailLabel: "البريد الإلكتروني للدخول:",
    pinLabel: "رمز الأمان السري (PIN)",
    driveTitle: "الملفات الأصلية بالدقة الكاملة عبر Google Drive:",
    driveBtn: "📁 فتح مجلد Google Drive للتحميل ←",
    pickupBannerTitle: "الاستلام في الاستوديو والتحميل النهائي",
    studioAddress: "استوديو لمحة • طنجة، المغرب",
    selectionSavedBadge: "✓ تم حفظ الاختيار بنجاح",
  },
  en: {
    dateLabel: "Scheduled Date",
    catLabel: "Category & Specialty",
    notesLabel: "Notes & Details",
    noDate: "Date to be confirmed",
    boxTitle: "YOUR ACCESS CREDENTIALS",
    emailLabel: "Login Email:",
    pinLabel: "SECURITY PIN CODE",
    driveTitle: "Full-Resolution Files on Google Drive:",
    driveBtn: "📁 Open Google Drive Folder →",
    pickupBannerTitle: "Studio Collection & Digital Delivery",
    studioAddress: "Lam7a Studios Atelier • Tangier, Morocco",
    selectionSavedBadge: "✓ Selection Successfully Recorded",
  },
  es: {
    dateLabel: "Fecha Programada",
    catLabel: "Categoría & Especialidad",
    notesLabel: "Notas y Detalles",
    noDate: "Fecha por confirmar",
    boxTitle: "TUS CREDENCIALES DE ACCESO",
    emailLabel: "Correo de acceso:",
    pinLabel: "CÓDIGO PIN DE SEGURIDAD",
    driveTitle: "Archivos en Alta Resolución en Google Drive:",
    driveBtn: "📁 Abrir Carpeta en Google Drive →",
    pickupBannerTitle: "Recogida en el Estudio y Descarga Digital",
    studioAddress: "Lam7a Studios Atelier • Tánger, Marruecos",
    selectionSavedBadge: "✓ Selección Registrada con Éxito",
  },
}

// ---------------------------------------------------------------------------
// RENDERIZADOR: CABECERA CON LOGO OFICIAL
// ---------------------------------------------------------------------------
function renderHeader(_tag?: string, tagline?: string) {
  return `
    <tr>
      <td align="center" style="padding: 38px 30px 22px; border-bottom: 1px solid #231e19; background: linear-gradient(180deg, #181512 0%, #12100e 100%);">
        <a href="https://lam7a.ma" target="_blank" style="text-decoration: none; display: inline-block;">
          <img src="${LOGO_URL}" alt="Lam7a Studios" width="165" style="display: block; margin: 0 auto; border: 0; outline: none; width: 165px; max-width: 100%; height: auto;" />
        </a>
        ${
          tagline
            ? `<p style="margin: 8px 0 0; font-size: 12px; color: #9c8e7f; font-style: italic; letter-spacing: 0.5px;">${tagline}</p>`
            : ""
        }
      </td>
    </tr>
  `
}

// ---------------------------------------------------------------------------
// RENDERIZADOR: PIE CON CONMUTADOR DE IDIOMAS Y DATOS OFICIALES
// ---------------------------------------------------------------------------
function renderFooter(portalUrl: string, _studioEmail: string, _studioPhone: string, footerText: string) {
  const portalWithLang = (l: string) => {
    return portalUrl.includes("?") ? `${portalUrl}&lang=${l}` : `${portalUrl}?lang=${l}`
  }

  return `
    <tr>
      <td style="padding: 26px 30px 32px; background-color: #0b0a09; border-top: 1px solid #231e19; text-align: center;">
        <div style="margin-bottom: 20px; font-size: 11px; color: #8e8071;">
          <span style="color: #63584c; margin-right: 6px;">Langue / Language / اللغة:</span>
          <a href="${portalWithLang("fr")}" style="color: #c69f68; text-decoration: none; margin: 0 4px; font-weight: 600;">Français</a> •
          <a href="${portalWithLang("ar")}" style="color: #c69f68; text-decoration: none; margin: 0 4px; font-weight: 600;">العربية</a> •
          <a href="${portalWithLang("en")}" style="color: #c69f68; text-decoration: none; margin: 0 4px; font-weight: 600;">English</a> •
          <a href="${portalWithLang("es")}" style="color: #c69f68; text-decoration: none; margin: 0 4px; font-weight: 600;">Español</a>
        </div>

        <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto; max-width: 440px; width: 100%; background-color: #14110e; border: 1px solid #28221b; border-radius: 12px;">
          <tr>
            <td align="center" style="padding: 16px 20px; text-align: center;">
              <p style="margin: 0 0 4px; font-size: 12px; font-weight: 700; color: #c69f68; letter-spacing: 1.5px; text-transform: uppercase;">
                Atelier &amp; Studio
              </p>
              <p style="margin: 0 0 12px; font-size: 12px; color: #d6d0c7; line-height: 1.5;">
                Bojarah, Yedi Mavi, Tetouan, Morocco
              </p>
              <p style="margin: 0 0 4px; font-size: 11px; font-weight: 600; color: #9c8e7f; letter-spacing: 1px; text-transform: uppercase;">
                Téléphones Officiels
              </p>
              <p style="margin: 0; font-size: 13px; color: #f5f2eb; font-weight: 600; letter-spacing: 0.5px;">
                <a href="tel:+212539702927" style="color: #c69f68; text-decoration: none;">0539702927</a> &nbsp;/&nbsp; <a href="tel:+212762517478" style="color: #c69f68; text-decoration: none;">0762517478</a>
              </p>
            </td>
          </tr>
        </table>

        <p style="margin: 18px 0 0; font-size: 11px; color: #63584c;">
          © ${new Date().getFullYear()} ${footerText}
        </p>
      </td>
    </tr>
  `
}

// ===========================================================================
// 1. PLANTILLA: BIENVENIDA / CONFIRMACIÓN DE RESERVA
// ===========================================================================
export function renderWelcomeEmail(params: WelcomeEmailParams): { subject: string; html: string; text: string } {
  const lang = resolveLang(params.language)
  const baseCopy = DEFAULT_TEMPLATES_I18N.welcome[lang]
  const copy: EmailTemplateLangCopy = { ...baseCopy, ...(params.customCopy || {}) }
  const labels = STATIC_LABELS[lang]
  const isRtl = lang === "ar"

  const {
    clientName,
    sessionDate,
    category = "Studio Photography",
    sessionType,
    notes,
    studioEmail = "contact@lam7a.ma",
    studioPhone = "+212 600-000000",
  } = params

  const localeCode = lang === "ar" ? "ar-MA" : lang === "es" ? "es-ES" : lang === "en" ? "en-US" : "fr-FR"
  let formattedDate = labels.noDate
  if (sessionDate) {
    try {
      formattedDate = new Date(sessionDate).toLocaleDateString(localeCode, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    } catch {
      formattedDate = sessionDate
    }
  }

  const vars = {
    clientName,
    sessionDate: formattedDate,
    category: category || "Atelier",
  }

  const subject = interpolateEmailVars(copy.subject, vars)
  const greetingHtml = interpolateEmailVars(copy.greeting, {
    ...vars,
    clientName: `<span style="color: #c69f68;">${clientName}</span>`,
  })
  const introHtml = interpolateEmailVars(copy.intro, vars)
  const bodyHtml = formatTextParagraphsToHtml(interpolateEmailVars(copy.bodyText, vars))
  const closingHtml = interpolateEmailVars(copy.closing, vars)

  const html = `
<!DOCTYPE html>
<html lang="${lang}" dir="${isRtl ? "rtl" : "ltr"}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #080706; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f5f2eb; direction: ${isRtl ? "rtl" : "ltr"}; text-align: ${isRtl ? "right" : "left"};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #080706; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #12100e; border: 1px solid #2b251f; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.6);">
          ${renderHeader(copy.atelierTag, copy.tagline)}

          <tr>
            <td style="padding: 35px 35px 25px; direction: ${isRtl ? "rtl" : "ltr"}; text-align: ${isRtl ? "right" : "left"};">
              <h2 style="margin: 0 0 16px; font-family: Georgia, serif; font-size: 20px; color: #f5f2eb; font-weight: normal;">
                ${greetingHtml}
              </h2>
              <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.7; color: #c4b9ab;">
                ${introHtml}
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #181512; border: 1px solid #2e261f; border-radius: 12px; margin: 24px 0; overflow: hidden; direction: ${isRtl ? "rtl" : "ltr"}; text-align: ${isRtl ? "right" : "left"};">
                <tr>
                  <td style="padding: 18px 22px; border-bottom: 1px solid #26201a;">
                    <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #8e8071; display: block; margin-bottom: 4px;">${labels.dateLabel}</span>
                    <span style="font-size: 15px; font-weight: 600; color: #c69f68; font-family: Georgia, serif;">📅 ${formattedDate}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 22px; border-bottom: 1px solid #26201a;">
                    <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #8e8071; display: block; margin-bottom: 4px;">${labels.catLabel}</span>
                    <span style="font-size: 14px; color: #f5f2eb;">✦ ${category} ${sessionType ? `(${sessionType})` : ""}</span>
                  </td>
                </tr>
                ${
                  notes
                    ? `
                <tr>
                  <td style="padding: 16px 22px;">
                    <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #8e8071; display: block; margin-bottom: 4px;">${labels.notesLabel}</span>
                    <span style="font-size: 13px; color: #b8aba0; line-height: 1.5;">${notes}</span>
                  </td>
                </tr>
                `
                    : ""
                }
              </table>

              ${bodyHtml}

              <p style="margin: 20px 0 0; font-size: 13px; color: #9c8e7f; line-height: 1.6;">
                ${closingHtml}
              </p>
            </td>
          </tr>

          ${renderFooter(PORTAL_URL, studioEmail, studioPhone, copy.footerText)}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

  const text = `
LAM7A STUDIOS
${interpolateEmailVars(copy.greeting, vars).replace(/<[^>]+>/g, "")}

${introHtml.replace(/<[^>]+>/g, "")}

- ${labels.dateLabel}: ${formattedDate}
- ${labels.catLabel}: ${category}
${notes ? `- ${labels.notesLabel}: ${notes}\n` : ""}
${interpolateEmailVars(copy.bodyText, vars).replace(/<[^>]+>/g, "")}

${closingHtml.replace(/<[^>]+>/g, "")}

---
Atelier & Studio : Bojarah, Yedi Mavi, Tetouan, Morocco
Téléphones Officiels : 0539702927 / 0762517478
https://lam7a.ma
`

  return { subject, html, text }
}

// ===========================================================================
// 2. PLANTILLA: FOTOS LISTAS EN ESPACE PRIVÉ & GOOGLE DRIVE ORIGINALES
// ===========================================================================
export function renderPhotosReadyEmail(params: PhotosReadyEmailParams): { subject: string; html: string; text: string } {
  const lang = resolveLang(params.language)
  const baseCopy = DEFAULT_TEMPLATES_I18N.photos_ready[lang]
  const copy: EmailTemplateLangCopy = { ...baseCopy, ...(params.customCopy || {}) }
  const labels = STATIC_LABELS[lang]
  const isRtl = lang === "ar"

  const {
    clientName,
    clientEmail,
    portalPin,
    driveFolderUrl,
    photosCount,
    studioEmail = "contact@lam7a.ma",
    studioPhone = "+212 600-000000",
  } = params

  const targetPortalUrl = `${PORTAL_URL}?pin=${portalPin}&email=${encodeURIComponent(clientEmail)}`
  const vars = {
    clientName,
    clientEmail,
    portalPin,
    photosCount: photosCount !== undefined ? String(photosCount) : "✦",
  }

  const subject = interpolateEmailVars(copy.subject, vars)
  const greetingHtml = interpolateEmailVars(copy.greeting, {
    ...vars,
    clientName: `<span style="color: #c69f68;">${clientName}</span>`,
  })
  const introHtml = interpolateEmailVars(copy.intro, vars)
  const bodyHtml = formatTextParagraphsToHtml(interpolateEmailVars(copy.bodyText, vars))
  const ctaBtnText = interpolateEmailVars(copy.ctaBtn, vars)
  const closingHtml = interpolateEmailVars(copy.closing, vars)

  const html = `
<!DOCTYPE html>
<html lang="${lang}" dir="${isRtl ? "rtl" : "ltr"}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #080706; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f5f2eb; direction: ${isRtl ? "rtl" : "ltr"}; text-align: ${isRtl ? "right" : "left"};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #080706; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #12100e; border: 1px solid #2b251f; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.6);">
          ${renderHeader(copy.atelierTag, copy.tagline)}

          <tr>
            <td style="padding: 35px 35px 25px; direction: ${isRtl ? "rtl" : "ltr"}; text-align: ${isRtl ? "right" : "left"};">
              <h2 style="margin: 0 0 16px; font-family: Georgia, serif; font-size: 20px; color: #f5f2eb; font-weight: normal;">
                ${greetingHtml}
              </h2>
              <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.7; color: #c4b9ab;">
                ${introHtml}
              </p>

              <!-- Credentials Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #1b1714 0%, #161310 100%); border: 1px solid #3d3328; border-radius: 14px; margin: 24px 0; overflow: hidden;">
                <tr>
                  <td align="center" style="padding: 24px 20px;">
                    <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #c69f68; font-weight: 600; display: block; margin-bottom: 12px;">
                      ${labels.boxTitle}
                    </span>
                    <p style="margin: 0 0 6px; font-size: 13px; color: #8e8071;">
                      ${labels.emailLabel} <strong style="color: #f5f2eb;">${clientEmail}</strong>
                    </p>
                    <p style="margin: 0 0 16px; font-size: 12px; color: #8e8071;">
                      ${labels.pinLabel}
                    </p>
                    <span style="display: inline-block; font-size: 30px; letter-spacing: 8px; font-family: Georgia, serif; font-weight: bold; color: #c69f68; background-color: #0d0c0a; border: 1px solid #3d3328; padding: 10px 24px; border-radius: 10px; margin-bottom: 20px;">
                      ${portalPin}
                    </span>
                    <div>
                      <a href="${targetPortalUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #c69f68 0%, #9e753b 100%); color: #0f0d0b; text-decoration: none; font-size: 14px; font-weight: bold; letter-spacing: 0.5px; padding: 14px 28px; border-radius: 10px; box-shadow: 0 4px 14px rgba(198, 159, 104, 0.3);">
                        ${ctaBtnText}
                      </a>
                    </div>
                  </td>
                </tr>
              </table>

              ${bodyHtml}

              ${
                driveFolderUrl
                  ? `
              <div style="margin-top: 20px; padding: 16px 18px; background-color: #171412; border: 1px dashed #3d3328; border-radius: 12px;">
                <p style="margin: 0 0 10px; font-size: 13px; font-weight: 600; color: #38bdf8;">
                  ${labels.driveTitle}
                </p>
                <a href="${driveFolderUrl}" target="_blank" style="display: inline-block; background-color: #0b1a29; border: 1px solid #1e3a5f; color: #38bdf8; text-decoration: none; font-size: 13px; font-weight: 600; padding: 10px 18px; border-radius: 8px;">
                  ${labels.driveBtn}
                </a>
              </div>
              `
                  : ""
              }

              <p style="margin: 28px 0 0; font-size: 13px; color: #9c8e7f; line-height: 1.6; font-style: italic;">
                ${closingHtml}
              </p>
            </td>
          </tr>

          ${renderFooter(targetPortalUrl, studioEmail, studioPhone, copy.footerText)}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

  const text = `
LAM7A STUDIOS
${interpolateEmailVars(copy.greeting, vars).replace(/<[^>]+>/g, "")}

${introHtml.replace(/<[^>]+>/g, "")}

${labels.boxTitle}:
- Portal: ${targetPortalUrl}
- ${labels.emailLabel} ${clientEmail}
- ${labels.pinLabel}: ${portalPin}

${interpolateEmailVars(copy.bodyText, vars).replace(/<[^>]+>/g, "")}
${driveFolderUrl ? `\nGoogle Drive: ${driveFolderUrl}\n` : ""}
${closingHtml.replace(/<[^>]+>/g, "")}

---
Atelier & Studio : Bojarah, Yedi Mavi, Tetouan, Morocco
Téléphones Officiels : 0539702927 / 0762517478
https://lam7a.ma
`

  return { subject, html, text }
}

// ===========================================================================
// 3. PLANTILLA: READY FOR DELIVERY / RETIRO EN EL ESTUDIO
// ===========================================================================
export function renderReadyForDeliveryEmail(params: ReadyForDeliveryEmailParams): { subject: string; html: string; text: string } {
  const lang = resolveLang(params.language)
  const baseCopy = DEFAULT_TEMPLATES_I18N.ready_delivery[lang]
  const copy: EmailTemplateLangCopy = { ...baseCopy, ...(params.customCopy || {}) }
  const labels = STATIC_LABELS[lang]
  const isRtl = lang === "ar"

  const {
    clientName,
    category = "Atelier",
    clientEmail = "",
    portalPin = "",
    driveFolderUrl,
    studioEmail = "contact@lam7a.ma",
    studioPhone = "+212 600-000000",
  } = params

  const targetPortalUrl =
    clientEmail && portalPin
      ? `${PORTAL_URL}?pin=${portalPin}&email=${encodeURIComponent(clientEmail)}`
      : PORTAL_URL

  const vars = {
    clientName,
    category: category || "Atelier",
    portalPin: portalPin || "",
    clientEmail: clientEmail || "",
  }

  const subject = interpolateEmailVars(copy.subject, vars)
  const greetingHtml = interpolateEmailVars(copy.greeting, {
    ...vars,
    clientName: `<span style="color: #c69f68;">${clientName}</span>`,
  })
  const introHtml = interpolateEmailVars(copy.intro, vars)
  const bodyHtml = interpolateEmailVars(copy.bodyText, vars)
  const ctaBtnText = interpolateEmailVars(copy.ctaBtn, vars)
  const closingHtml = interpolateEmailVars(copy.closing, vars)

  const html = `
<!DOCTYPE html>
<html lang="${lang}" dir="${isRtl ? "rtl" : "ltr"}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #080706; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f5f2eb; direction: ${isRtl ? "rtl" : "ltr"}; text-align: ${isRtl ? "right" : "left"};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #080706; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #12100e; border: 1px solid #2b251f; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.6);">
          ${renderHeader(copy.atelierTag, copy.tagline)}

          <tr>
            <td style="padding: 35px 35px 25px; direction: ${isRtl ? "rtl" : "ltr"}; text-align: ${isRtl ? "right" : "left"};">
              <h2 style="margin: 0 0 16px; font-family: Georgia, serif; font-size: 20px; color: #f5f2eb; font-weight: normal;">
                ${greetingHtml}
              </h2>
              <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.7; color: #c4b9ab;">
                ${introHtml}
              </p>

              <!-- Delivery Ready Banner -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #1f1a14 0%, #171410 100%); border: 1px solid #4a3c2c; border-radius: 14px; margin: 24px 0; overflow: hidden;">
                <tr>
                  <td align="center" style="padding: 24px 20px;">
                    <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #10b981; font-weight: 600; display: block; margin-bottom: 8px;">
                      ✓ ${labels.pickupBannerTitle}
                    </span>
                    <p style="margin: 0 0 18px; font-size: 13px; color: #d4c7b6; line-height: 1.6; max-width: 480px;">
                      ${bodyHtml}
                    </p>
                    <div>
                      <a href="${targetPortalUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #c69f68 0%, #9e753b 100%); color: #0f0d0b; text-decoration: none; font-size: 14px; font-weight: bold; letter-spacing: 0.5px; padding: 14px 28px; border-radius: 10px; box-shadow: 0 4px 14px rgba(198, 159, 104, 0.3);">
                        ${ctaBtnText}
                      </a>
                    </div>
                  </td>
                </tr>
              </table>

              ${
                driveFolderUrl
                  ? `
              <div style="margin: 20px 0; padding: 18px 20px; background-color: #171412; border: 1px dashed #3d3328; border-radius: 12px;">
                <p style="margin: 0 0 10px; font-size: 13px; font-weight: 600; color: #38bdf8;">
                  ${labels.driveTitle}
                </p>
                <a href="${driveFolderUrl}" target="_blank" style="display: inline-block; background-color: #0b1a29; border: 1px solid #1e3a5f; color: #38bdf8; text-decoration: none; font-size: 13px; font-weight: 600; padding: 10px 18px; border-radius: 8px;">
                  ${labels.driveBtn}
                </a>
              </div>
              `
                  : ""
              }

              <div style="margin-top: 24px; padding: 14px 18px; background-color: #0d0c0b; border-radius: 10px; border: 1px solid #231e19;">
                <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #8e8071; display: block; margin-bottom: 2px;">Atelier :</span>
                <span style="font-size: 13px; color: #c69f68; font-weight: 600;">📍 ${labels.studioAddress}</span>
              </div>

              <p style="margin: 24px 0 0; font-size: 13px; color: #9c8e7f; line-height: 1.6; font-style: italic;">
                ${closingHtml}
              </p>
            </td>
          </tr>

          ${renderFooter(targetPortalUrl, studioEmail, studioPhone, copy.footerText)}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

  const text = `
LAM7A STUDIOS
${interpolateEmailVars(copy.greeting, vars).replace(/<[^>]+>/g, "")}

${introHtml.replace(/<[^>]+>/g, "")}

${labels.pickupBannerTitle}
${bodyHtml.replace(/<[^>]+>/g, "")}

- Portal: ${targetPortalUrl}
${driveFolderUrl ? `- Google Drive Master: ${driveFolderUrl}\n` : ""}
- Atelier: ${labels.studioAddress}

${closingHtml.replace(/<[^>]+>/g, "")}

---
Atelier & Studio : Bojarah, Yedi Mavi, Tetouan, Morocco
Téléphones Officiels : 0539702927 / 0762517478
https://lam7a.ma
`

  return { subject, html, text }
}

// ===========================================================================
// 4. PLANTILLA: CONFIRMACIÓN DE SELECCIÓN DE FOTOS
// ===========================================================================
export function renderSelectionConfirmedEmail(params: SelectionConfirmedEmailParams): { subject: string; html: string; text: string } {
  const lang = resolveLang(params.language)
  const baseCopy = DEFAULT_TEMPLATES_I18N.selection_confirmed[lang]
  const copy: EmailTemplateLangCopy = { ...baseCopy, ...(params.customCopy || {}) }
  const labels = STATIC_LABELS[lang]
  const isRtl = lang === "ar"

  const {
    clientName,
    photosCount,
    clientEmail = "",
    portalPin = "",
    studioEmail = "contact@lam7a.ma",
    studioPhone = "+212 600-000000",
  } = params

  const targetPortalUrl =
    clientEmail && portalPin
      ? `${PORTAL_URL}?pin=${portalPin}&email=${encodeURIComponent(clientEmail)}`
      : PORTAL_URL

  const vars = {
    clientName,
    photosCount: String(photosCount || 0),
    portalPin: portalPin || "",
    clientEmail: clientEmail || "",
  }

  const subject = interpolateEmailVars(copy.subject, vars)
  const greetingHtml = interpolateEmailVars(copy.greeting, {
    ...vars,
    clientName: `<span style="color: #c69f68;">${clientName}</span>`,
  })
  const introHtml = interpolateEmailVars(copy.intro, vars)
  const bodyHtml = formatTextParagraphsToHtml(interpolateEmailVars(copy.bodyText, vars))
  const ctaBtnText = interpolateEmailVars(copy.ctaBtn, vars)
  const closingHtml = interpolateEmailVars(copy.closing, vars)

  const html = `
<!DOCTYPE html>
<html lang="${lang}" dir="${isRtl ? "rtl" : "ltr"}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #080706; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f5f2eb; direction: ${isRtl ? "rtl" : "ltr"}; text-align: ${isRtl ? "right" : "left"};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #080706; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #12100e; border: 1px solid #2b251f; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.6);">
          ${renderHeader(copy.atelierTag, copy.tagline)}

          <tr>
            <td style="padding: 35px 35px 25px; direction: ${isRtl ? "rtl" : "ltr"}; text-align: ${isRtl ? "right" : "left"};">
              <h2 style="margin: 0 0 16px; font-family: Georgia, serif; font-size: 20px; color: #f5f2eb; font-weight: normal;">
                ${greetingHtml}
              </h2>
              <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.7; color: #c4b9ab;">
                ${introHtml}
              </p>

              <div style="padding: 20px; background-color: #181512; border: 1px solid #332a21; border-radius: 12px; margin: 20px 0; text-align: center;">
                <span style="font-size: 28px; font-weight: bold; color: #c69f68; font-family: Georgia, serif; display: block; margin-bottom: 6px;">
                  📸 ${photosCount} photos
                </span>
                <span style="font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #10b981; font-weight: 600;">
                  ${labels.selectionSavedBadge}
                </span>
              </div>

              ${bodyHtml}

              <div style="text-align: center; margin: 28px 0 14px;">
                <a href="${targetPortalUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #c69f68 0%, #9e753b 100%); color: #0f0d0b; text-decoration: none; font-size: 13px; font-weight: bold; letter-spacing: 0.5px; padding: 12px 24px; border-radius: 10px;">
                  ${ctaBtnText}
                </a>
              </div>

              ${
                closingHtml
                  ? `<p style="margin: 20px 0 0; font-size: 13px; color: #9c8e7f; line-height: 1.6; font-style: italic;">${closingHtml}</p>`
                  : ""
              }
            </td>
          </tr>

          ${renderFooter(targetPortalUrl, studioEmail, studioPhone, copy.footerText)}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

  const text = `
LAM7A STUDIOS
${interpolateEmailVars(copy.greeting, vars).replace(/<[^>]+>/g, "")}

${introHtml.replace(/<[^>]+>/g, "")}

${interpolateEmailVars(copy.bodyText, vars).replace(/<[^>]+>/g, "")}

Portal: ${targetPortalUrl}

---
Atelier & Studio : Bojarah, Yedi Mavi, Tetouan, Morocco
Téléphones Officiels : 0539702927 / 0762517478
https://lam7a.ma
`

  return { subject, html, text }
}

// ===========================================================================
// 5. REDACTOR LIBRE CON PRESET HTML OFICIAL DE LAM7A STUDIOS
// ===========================================================================
export function renderCustomAtelierEmail(params: CustomAtelierEmailParams): { subject: string; html: string; text: string } {
  const lang = resolveLang(params.language)
  const labels = STATIC_LABELS[lang]
  const defaultWelcome = DEFAULT_TEMPLATES_I18N.welcome[lang]
  const isRtl = lang === "ar"

  const {
    clientName = "Client",
    clientEmail = "",
    subject,
    bodyMessage,
    atelierTag = defaultWelcome.atelierTag,
    tagline = defaultWelcome.tagline,
    includePortalBox = false,
    portalPin,
    driveFolderUrl,
    ctaButtonText,
    ctaButtonUrl,
    closingText,
    studioEmail = "contact@lam7a.ma",
    studioPhone = "+212 600-000000",
  } = params

  const targetPortalUrl =
    clientEmail && portalPin
      ? `${PORTAL_URL}?pin=${portalPin}&email=${encodeURIComponent(clientEmail)}`
      : PORTAL_URL

  const vars = {
    clientName,
    clientEmail,
    portalPin: portalPin || "",
  }

  const finalSubject = interpolateEmailVars(subject || `✦ Lam7a Studios — ${clientName}`, vars)
  const greetingHtml = interpolateEmailVars(defaultWelcome.greeting, {
    ...vars,
    clientName: `<span style="color: #c69f68;">${clientName}</span>`,
  })
  const formattedBodyHtml = formatTextParagraphsToHtml(interpolateEmailVars(bodyMessage || "", vars))
  const finalClosing = interpolateEmailVars(
    closingText !== undefined && closingText !== null ? closingText : defaultWelcome.closing,
    vars
  )

  const effectiveCtaUrl = ctaButtonUrl || targetPortalUrl
  const effectiveCtaText = ctaButtonText ? interpolateEmailVars(ctaButtonText, vars) : null

  const html = `
<!DOCTYPE html>
<html lang="${lang}" dir="${isRtl ? "rtl" : "ltr"}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${finalSubject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #080706; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f5f2eb; direction: ${isRtl ? "rtl" : "ltr"}; text-align: ${isRtl ? "right" : "left"};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #080706; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #12100e; border: 1px solid #2b251f; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.6);">
          ${renderHeader(atelierTag, tagline)}

          <tr>
            <td style="padding: 35px 35px 25px; direction: ${isRtl ? "rtl" : "ltr"}; text-align: ${isRtl ? "right" : "left"};">
              <h2 style="margin: 0 0 18px; font-family: Georgia, serif; font-size: 20px; color: #f5f2eb; font-weight: normal;">
                ${greetingHtml}
              </h2>

              <div style="margin: 16px 0 24px;">
                ${formattedBodyHtml}
              </div>

              ${
                includePortalBox && portalPin
                  ? `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #1b1714 0%, #161310 100%); border: 1px solid #3d3328; border-radius: 14px; margin: 24px 0; overflow: hidden;">
                <tr>
                  <td align="center" style="padding: 22px 20px;">
                    <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #c69f68; font-weight: 600; display: block; margin-bottom: 10px;">
                      ${labels.boxTitle}
                    </span>
                    <p style="margin: 0 0 6px; font-size: 13px; color: #8e8071;">
                      ${labels.emailLabel} <strong style="color: #f5f2eb;">${clientEmail}</strong>
                    </p>
                    <p style="margin: 0 0 12px; font-size: 12px; color: #8e8071;">
                      ${labels.pinLabel}
                    </p>
                    <span style="display: inline-block; font-size: 28px; letter-spacing: 8px; font-family: Georgia, serif; font-weight: bold; color: #c69f68; background-color: #0d0c0a; border: 1px solid #3d3328; padding: 8px 22px; border-radius: 10px; margin-bottom: 16px;">
                      ${portalPin}
                    </span>
                    <div>
                      <a href="${targetPortalUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #c69f68 0%, #9e753b 100%); color: #0f0d0b; text-decoration: none; font-size: 14px; font-weight: bold; letter-spacing: 0.5px; padding: 13px 26px; border-radius: 10px; box-shadow: 0 4px 14px rgba(198, 159, 104, 0.3);">
                        ${effectiveCtaText || DEFAULT_TEMPLATES_I18N.photos_ready[lang].ctaBtn}
                      </a>
                    </div>
                  </td>
                </tr>
              </table>
              `
                  : effectiveCtaText
                  ? `
              <div style="text-align: center; margin: 26px 0 18px;">
                <a href="${effectiveCtaUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #c69f68 0%, #9e753b 100%); color: #0f0d0b; text-decoration: none; font-size: 14px; font-weight: bold; letter-spacing: 0.5px; padding: 14px 28px; border-radius: 10px; box-shadow: 0 4px 14px rgba(198, 159, 104, 0.3);">
                  ${effectiveCtaText}
                </a>
              </div>
              `
                  : ""
              }

              ${
                driveFolderUrl
                  ? `
              <div style="margin: 20px 0; padding: 16px 18px; background-color: #171412; border: 1px dashed #3d3328; border-radius: 12px;">
                <p style="margin: 0 0 10px; font-size: 13px; font-weight: 600; color: #38bdf8;">
                  ${labels.driveTitle}
                </p>
                <a href="${driveFolderUrl}" target="_blank" style="display: inline-block; background-color: #0b1a29; border: 1px solid #1e3a5f; color: #38bdf8; text-decoration: none; font-size: 13px; font-weight: 600; padding: 10px 18px; border-radius: 8px;">
                  ${labels.driveBtn}
                </a>
              </div>
              `
                  : ""
              }

              ${
                finalClosing
                  ? `
              <p style="margin: 24px 0 0; font-size: 13px; color: #9c8e7f; line-height: 1.6; font-style: italic; border-top: 1px solid #231e19; padding-top: 18px;">
                ${finalClosing}
              </p>
              `
                  : ""
              }
            </td>
          </tr>

          ${renderFooter(targetPortalUrl, studioEmail, studioPhone, defaultWelcome.footerText)}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

  const text = `
LAM7A STUDIOS
${interpolateEmailVars(defaultWelcome.greeting, vars).replace(/<[^>]+>/g, "")}

${interpolateEmailVars(bodyMessage || "", vars)}
${includePortalBox && portalPin ? `\nPortal: ${targetPortalUrl}\nPIN: ${portalPin}\n` : ""}
${driveFolderUrl ? `\nGoogle Drive: ${driveFolderUrl}\n` : ""}
${finalClosing ? `\n${finalClosing}\n` : ""}

---
Atelier & Studio : Bojarah, Yedi Mavi, Tetouan, Morocco
Téléphones Officiels : 0539702927 / 0762517478
https://lam7a.ma
`

  return { subject: finalSubject, html, text }
}
