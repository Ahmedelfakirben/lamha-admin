/**
 * Plantillas HTML Responsivas y de Lujo para Lam7a Studios Atelier
 * Soporte Completo para las 4 Lenguas del Sistema:
 * - fr (Français - Atelier Standard)
 * - ar (العربية - RTL)
 * - en (English)
 * - es (Español)
 * 
 * Estética: Dark Obsidian (#0d0b09), Oro Champán (#c69f68), Marfil (#f5f2eb)
 * Logo Oficial: https://lam7a.ma/assets/logo/logo-white-clean.png
 */

export type EmailLanguage = "fr" | "es" | "en" | "ar"

const LOGO_URL = "https://lam7a.ma/assets/logo/logo-white-clean.png"
const PORTAL_URL = "https://lam7a.ma/portal"

export function resolveLang(lang?: string | null): EmailLanguage {
  if (lang === "ar" || lang === "en" || lang === "es" || lang === "fr") {
    return lang
  }
  return "fr" // Standard Atelier
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
}

// ---------------------------------------------------------------------------
// DICCIONARIOS MULTILINGÜES (FR / AR / EN / ES)
// ---------------------------------------------------------------------------

const WELCOME_I18N = {
  fr: {
    atelierTag: "ATELIER PHOTOGRAPHIQUE",
    tagline: "Capturer l'éternité dans chaque instant",
    subject: (name: string) => `✦ Bienvenue chez Lam7a Studios — Confirmation de Réservation : ${name}`,
    greeting: (name: string) => `Cher/Chère <span style="color: #c69f68;">${name}</span>,`,
    intro: "C'est un véritable honneur de vous accueillir au sein de <strong>Lam7a Studios</strong>. Nous avons bien enregistré votre projet et réservé la date dans l'agenda de notre atelier.",
    dateLabel: "Date Programmée",
    catLabel: "Catégorie & Spécialité",
    notesLabel: "Notes & Détails",
    noDate: "Date à confirmer",
    desc: "Notre équipe de photographes et directeurs artistiques prépare déjà l'ensemble du dispositif créatif pour immortaliser vos précieux moments avec le plus haut niveau d'exigence et d'élégance.",
    contactPrompt: "Pour toute question, coordination de tenues ou précision avant le jour J, notre équipe reste à votre entière disposition.",
    footerText: "Lam7a Studios Atelier • Tous droits réservés.",
  },
  ar: {
    atelierTag: "استوديو التصوير الفني",
    tagline: "تخليد اللحظات الأبدية بأرقى المعايير",
    subject: (name: string) => `✦ مرحباً بكم في استوديو لمحة — تأكيد حجز جلسة التصوير: ${name}`,
    greeting: (name: string) => `عزيزنا/عزيزتنا <span style="color: #c69f68;">${name}</span>،`,
    intro: "إنه لمن دواعي سرورنا واعتزازنا أن نرحب بكم في <strong>استوديو لمحة (Lam7a Studios)</strong>. لقد تم تسجيل مشروعكم وتثبيت الموعد المحدد في جدول مواعيد الاستوديو.",
    dateLabel: "الموعد المحدد",
    catLabel: "الفئة والتخصص",
    notesLabel: "ملاحظات وتفاصيل",
    noDate: "الموعد قيد التأكيد",
    desc: "فريقنا من المصورين والمشرفين الفنيين يستعد لتقديم أرقى تجربة تصوير توثق لحظاتكم المميزة بأعلى درجات الفخامة والإتقان.",
    contactPrompt: "إذا كانت لديكم أي استفسارات بخصوص الملابس، الموقع أو تفاصيل الجلسة، يسعدنا تواصلكم معنا في أي وقت.",
    footerText: "استوديو لمحة • جميع الحقوق محفوظة.",
  },
  en: {
    atelierTag: "PHOTOGRAPHIC ATELIER",
    tagline: "Capturing eternity in every instant",
    subject: (name: string) => `✦ Welcome to Lam7a Studios — Booking Confirmation: ${name}`,
    greeting: (name: string) => `Dear <span style="color: #c69f68;">${name}</span>,`,
    intro: "It is a true honor to welcome you to <strong>Lam7a Studios</strong>. We have officially registered your project and reserved your date in our atelier's calendar.",
    dateLabel: "Scheduled Date",
    catLabel: "Category & Specialty",
    notesLabel: "Notes & Details",
    noDate: "Date to be confirmed",
    desc: "Our team of photographers and creative directors is already preparing the artistic and technical direction to immortalize your moments with the highest level of craftsmanship and elegance.",
    contactPrompt: "Should you have any inquiries regarding styling, locations, or special requests prior to your session, we remain at your complete disposal.",
    footerText: "Lam7a Studios Atelier • All rights reserved.",
  },
  es: {
    atelierTag: "ATELIER FOTOGRÁFICO",
    tagline: "Capturando la eternidad en cada instante",
    subject: (name: string) => `✦ Bienvenida a Lam7a Studios — Confirmación de Reserva: ${name}`,
    greeting: (name: string) => `Estimado/a <span style="color: #c69f68;">${name}</span>,`,
    intro: "Es un honor darte la más cálida bienvenida a <strong>Lam7a Studios</strong>. Hemos registrado formalmente tu proyecto y reservado la fecha en la agenda de nuestro atelier.",
    dateLabel: "Fecha Programada",
    catLabel: "Categoría & Especialidad",
    notesLabel: "Notas y Detalles",
    noDate: "Fecha por confirmar",
    desc: "Nuestro equipo de fotógrafos y directores de arte ya está preparando todo el despliegue técnico y creativo para inmortalizar tus mejores momentos con la máxima fidelidad, elegancia y cuidado del detalle.",
    contactPrompt: "Si necesitas realizar cualquier consulta, coordinar la vestimenta, ubicación o afinar detalles antes del día señalado, estamos a tu entera disposición.",
    footerText: "Lam7a Studios Atelier • Todos los derechos reservados.",
  },
}

const PHOTOS_READY_I18N = {
  fr: {
    atelierTag: "ESPACE PRIVÉ & SÉLECTION",
    tagline: "Vos précieux souvenirs sont désormais disponibles",
    subject: (name: string) => `✦ Vos photos sont prêtes sur votre Espace Privé — Lam7a Studios (${name})`,
    greeting: (name: string) => `Bonjour <span style="color: #c69f68;">${name}</span>,`,
    intro: (count?: number) => `Nous avons le plaisir de vous annoncer que votre reportage photo a été traité et calibré par notre atelier. ${count ? `Vous avez <strong>${count} photographies</strong> prêtes à être consultées.` : "Vos photos sont prêtes."}`,
    boxTitle: "VOS IDENTIFIANTS D'ACCÈS",
    emailLabel: "Email d'accès :",
    pinLabel: "CODE PIN DE SÉCURITÉ",
    ctaBtn: "✦ Accéder à mon Espace Privé →",
    stepsTitle: "Quelles sont les prochaines étapes ?",
    step1Title: "Accéder au Portail :",
    step1Desc: (pin: string) => `Cliquez sur le bouton ci-dessus et saisissez votre adresse email ainsi que votre code PIN <strong>${pin}</strong>.`,
    step2Title: "Choisir vos photos préférées :",
    step2Desc: "Dans votre galerie, cliquez sur l'icône cœur (❤️) sur chaque photo que vous souhaitez sélectionner pour l'album ou la retouche finale.",
    step3Title: "Télécharger vos photos sur Google Drive en taille réelle :",
    step3Desc: "Vous pouvez télécharger le dossier complet en haute résolution directement via :",
    driveBtn: "📁 Ouvrir le dossier Google Drive →",
    closing: "Nous espérons de tout cœur que vous apprécierez revivre ces instants autant que nous avons aimé les capturer.",
    footerText: "Lam7a Studios Atelier • Tous droits réservés.",
  },
  ar: {
    atelierTag: "المساحة الخاصة واختيار الصور",
    tagline: "ذكرياتكم الثمينة أصبحت جاهزة الآن",
    subject: (name: string) => `✦ صوركم أصبحت جاهزة في المساحة الخاصة — استوديو لمحة (${name})`,
    greeting: (name: string) => `مرحباً <span style="color: #c69f68;">${name}</span>!`,
    intro: (count?: number) => `يسعدنا إعلامكم أن جلسة التصوير الخاصة بكم تم تجهيزها ومعالجتها فنيّاً بدقة عالية في استوديو لمحة. ${count ? `يتوفر لديكم الآن <strong>${count} صورة</strong> جاهزة للمعاينة.` : "صوركم أصبحت جاهزة الآن."}`,
    boxTitle: "بيانات الدخول الخاصة بكم",
    emailLabel: "البريد الإلكتروني للدخول:",
    pinLabel: "رمز الأمان السري (PIN)",
    ctaBtn: "✦ الدخول إلى مساحتي الخاصة ←",
    stepsTitle: "الخطوات التالية المطلوبة:",
    step1Title: "تسجيل الدخول للمنصة:",
    step1Desc: (pin: string) => `اضغط على الزر أعلاه ثم أدخل بريدك الإلكتروني والرمز السري <strong>${pin}</strong>.`,
    step2Title: "اختيار صوركم المفضلة للألبوم:",
    step2Desc: "أثناء تصفح المعرض، اضغط على أيقونة القلب (❤️) على الصور التي ترغب باختيارها لطباعة الألبوم أو المعالجة النهائية.",
    step3Title: "تحميل الصور الأصلية بالدقة الكاملة من Google Drive:",
    step3Desc: "يمكنكم تحميل كافة الصور بالدقة الكاملة وحجمها الأصلي مباشرة عبر:",
    driveBtn: "📁 فتح مجلد Google Drive للتحميل ←",
    closing: "نتمنى من كل قلوبنا أن تستمتعوا بمشاهدة هذه الذكريات الخالدة بقدر استمتاعنا بتوثيقها لكم.",
    footerText: "استوديو لمحة • جميع الحقوق محفوظة.",
  },
  en: {
    atelierTag: "PRIVATE CLIENT SPACE & SELECTION",
    tagline: "Your precious memories are now available",
    subject: (name: string) => `✦ Your photos are ready in your Private Space — Lam7a Studios (${name})`,
    greeting: (name: string) => `Hello <span style="color: #c69f68;">${name}</span>!`,
    intro: (count?: number) => `We are delighted to inform you that your photoshoot has been processed and calibrated by our atelier. ${count ? `You have <strong>${count} photographs</strong> ready to view.` : "Your photos are now ready."}`,
    boxTitle: "YOUR ACCESS CREDENTIALS",
    emailLabel: "Login Email:",
    pinLabel: "SECURITY PIN CODE",
    ctaBtn: "✦ Access My Private Space →",
    stepsTitle: "Next steps to follow:",
    step1Title: "Log in to the Portal:",
    step1Desc: (pin: string) => `Click the button above and enter your email address and your security PIN <strong>${pin}</strong>.`,
    step2Title: "Select your favorite photos:",
    step2Desc: "In the gallery, click the heart icon (❤️) on each photo you wish to select for the final album or editorial retouches.",
    step3Title: "Download original full-resolution files from Google Drive:",
    step3Desc: "You can download the full high-resolution collection directly from:",
    driveBtn: "📁 Open Google Drive Folder →",
    closing: "We sincerely hope you cherish reliving these moments as much as we enjoyed creating them.",
    footerText: "Lam7a Studios Atelier • All rights reserved.",
  },
  es: {
    atelierTag: "ESPACIO PRIVADO & SELECCIÓN",
    tagline: "Tus recuerdos más bellos ya están disponibles",
    subject: (name: string) => `✦ Tus fotos están listas en tu Espace Privé — Lam7a Studios (${name})`,
    greeting: (name: string) => `¡Hola <span style="color: #c69f68;">${name}</span>!`,
    intro: (count?: number) => `Nos alegra comunicarte que el reportaje fotográfico ha sido procesado y calibrado por nuestro atelier. ${count ? `Ya tienes <strong>${count} fotografías</strong> disponibles para visualizar.` : "Tus fotos ya están listas para ti."}`,
    boxTitle: "TUS CREDENCIALES DE ACCESO",
    emailLabel: "Correo de acceso:",
    pinLabel: "CÓDIGO PIN DE SEGURIDAD",
    ctaBtn: "✦ Acceder a mi Espace Privé →",
    stepsTitle: "¿Qué debes hacer a continuación?",
    step1Title: "Ingresa al Portal:",
    step1Desc: (pin: string) => `Pulsa el botón superior e introduce tu correo y tu código PIN <strong>${pin}</strong>.`,
    step2Title: "Escoge tus fotos favoritas para el álbum:",
    step2Desc: "En la galería, haz clic en el icono del corazón (❤️) en cada foto que desees para el álbum de bodas o retoque editorial.",
    step3Title: "Descarga tus archivos originales en Google Drive en tamaño real:",
    step3Desc: "Puedes descargar la carpeta completa en máxima resolución directamente desde:",
    driveBtn: "📁 Abrir Carpeta de Fotos en Google Drive →",
    closing: "Esperamos de corazón que disfrutes reviviendo estos momentos tanto como nosotros disfrutamos capturándolos.",
    footerText: "Lam7a Studios Atelier • Todos los derechos reservados.",
  },
}

const READY_DELIVERY_I18N = {
  fr: {
    atelierTag: "LIVRAISON ATELIER & MONTAGE FINAL",
    tagline: "Votre commande est prête pour le retrait à l'Atelier",
    subject: (name: string) => `✦ Vos photographies d'art sont prêtes à l'Atelier — Lam7a Studios (${name})`,
    greeting: (name: string) => `Cher/Chère <span style="color: #c69f68;">${name}</span>,`,
    intro: "Nous avons l'immense honneur de vous annoncer que les tirages d'art, la reliure de votre album et les finitions de votre projet sont désormais <strong>prêts et finalisés</strong> à notre atelier.",
    pickupTitle: "Retrait à l'Atelier & Téléchargement Final",
    pickupDesc: "Vous pouvez vous présenter à notre studio afin de recevoir votre coffret d'art prestigieux. Vos fichiers numériques définitifs sont également consultables et téléchargeables sur votre Espace Privé.",
    ctaBtn: "✦ Consulter la Livraison sur mon Espace Privé →",
    driveTitle: "Fichiers Haute Résolution Master :",
    driveDesc: "Vos fichiers d'art en taille réelle sont accessibles sur votre dossier Google Drive sécurisé :",
    driveBtn: "📁 Accéder au dossier Google Drive Master →",
    studioAddress: "Lam7a Studios Atelier • Tanger, Maroc",
    closing: "Toute l'équipe de Lam7a Studios vous remercie chaleureusement pour votre confiance et a hâte de vous remettre vos précieux souvenirs.",
    footerText: "Lam7a Studios Atelier • Tous droits réservés.",
  },
  ar: {
    atelierTag: "التسليم النهائي في الاستوديو",
    tagline: "طلبكم وألبومكم الفني جاهز للاستلام الآن",
    subject: (name: string) => `✦ صوركم وألبومكم الفني أصبح جاهزاً في استوديو لمحة (${name})`,
    greeting: (name: string) => `عزيزنا/عزيزتنا <span style="color: #c69f68;">${name}</span>،`,
    intro: "يسعدنا ويشرفنا إعلامكم بأن أعمال الطباعة الفنية، التجليد الفاخر للألبوم واللمسات النهائية لمشروعكم قد <strong>اكتملت بنجاح</strong> وأصبحت جاهزة في الاستوديو.",
    pickupTitle: "الاستلام في الاستوديو والتحميل النهائي",
    pickupDesc: "يسعدنا استقبالكم في استوديو لمحة لتسليمكم ألبومكم الفني الفاخر. كما تتوفر النسخ الرقمية النهائية عبر مساحتكم الخاصة على موقعنا.",
    ctaBtn: "✦ معاينة التسليم النهائي في البوابة الخاصة ←",
    driveTitle: "الملفات الرقمية الأصلية بالدقة الكاملة:",
    driveDesc: "يمكنكم تحميل كافة الملفات بجودتها الكاملة عبر رابط Google Drive الخاص بكم:",
    driveBtn: "📁 فتح مجلد Google Drive للتحميل المباشر ←",
    studioAddress: "استوديو لمحة • طنجة، المغرب",
    closing: "فريق استوديو لمحة يشكركم جزيل الشكر على ثقتكم الغالية ويسعدنا دائماً خدمتكم بأعلى معايير الإتقان.",
    footerText: "استوديو لمحة • جميع الحقوق محفوظة.",
  },
  en: {
    atelierTag: "ATELIER DELIVERY & MASTER ARTWORKS",
    tagline: "Your artworks and fine album are ready for pickup",
    subject: (name: string) => `✦ Your Master Collection is ready at the Atelier — Lam7a Studios (${name})`,
    greeting: (name: string) => `Dear <span style="color: #c69f68;">${name}</span>,`,
    intro: "It is our absolute pleasure to inform you that your fine art prints, luxury linen album, and final edits are now <strong>completed and ready for collection</strong> at our atelier.",
    pickupTitle: "Studio Collection & Digital Delivery",
    pickupDesc: "You are cordially invited to visit our atelier to collect your bespoke photo box and album. Your final high-resolution digital files are also available on your Private Client Space.",
    ctaBtn: "✦ View Delivery on My Private Space →",
    driveTitle: "Master High-Resolution Archive:",
    driveDesc: "All your master original files can be downloaded directly from your secure Google Drive folder:",
    driveBtn: "📁 Open Google Drive Master Folder →",
    studioAddress: "Lam7a Studios Atelier • Tangier, Morocco",
    closing: "The entire Lam7a Studios team thanks you for your trust and looks forward to handing over your cherished memories.",
    footerText: "Lam7a Studios Atelier • All rights reserved.",
  },
  es: {
    atelierTag: "ENTREGA ATELIER & MONTAJE FINAL",
    tagline: "Tu pedido y álbum de arte ya están listos en el estudio",
    subject: (name: string) => `✦ Tu entrega final está lista en el Atelier — Lam7a Studios (${name})`,
    greeting: (name: string) => `Estimado/a <span style="color: #c69f68;">${name}</span>,`,
    intro: "Es un auténtico placer comunicarte que las impresiones de arte, el encuadernado de tu álbum y los acabados finales de tu proyecto ya están <strong>totalmente terminados y listos</strong> en nuestro atelier.",
    pickupTitle: "Recogida en el Estudio y Descarga Digital",
    pickupDesc: "Puedes pasar por nuestro atelier para recoger tu elegante álbum y fotografías físicas. También puedes acceder a tu Espace Privé para ver la entrega digital completa.",
    ctaBtn: "✦ Ver Entrega en mi Espace Privé →",
    driveTitle: "Archivos Finales Master en Alta Resolución:",
    driveDesc: "Tus archivos en máxima calidad original están disponibles en tu carpeta protegida de Google Drive:",
    driveBtn: "📁 Abrir Carpeta Master en Google Drive →",
    studioAddress: "Lam7a Studios Atelier • Tánger, Marruecos",
    closing: "Todo el equipo de Lam7a Studios te agradece enormemente tu confianza y estamos deseando entregarte tus recuerdos más especiales.",
    footerText: "Lam7a Studios Atelier • Todos los derechos reservados.",
  },
}

const SELECTION_CONFIRMED_I18N = {
  fr: {
    atelierTag: "SÉLECTION VALIDÉE & EN ÉDITION",
    tagline: "Nous avons bien reçu votre sélection de photographies",
    subject: (name: string) => `✦ Confirmation de votre sélection d'art — Lam7a Studios (${name})`,
    greeting: (name: string) => `Bonjour <span style="color: #c69f68;">${name}</span>,`,
    intro: (count: number) => `Nous confirmons la bonne réception de votre sélection de <strong>${count} photographies</strong> validées depuis votre Espace Privé.`,
    desc: "Notre équipe de direction artistique et de retouche d'art prend immédiatement le relais pour la calibration colorimétrique avancée et la mise en page de votre album.",
    ctaBtn: "✦ Revoir ma Sélection sur le Portail →",
    footerText: "Lam7a Studios Atelier • Tous droits réservés.",
  },
  ar: {
    atelierTag: "تم اعتماد الاختيار وبدء المونتاج",
    tagline: "تم استلام قائمتكم المختارة من الصور بنجاح",
    subject: (name: string) => `✦ تأكيد استلام اختياركم الفني — استوديو لمحة (${name})`,
    greeting: (name: string) => `مرحباً <span style="color: #c69f68;">${name}</span>!`,
    intro: (count: number) => `نؤكد لكم استلام اختياركم لـ <strong>${count} صورة</strong> تم اعتمادها بنجاح عبر مساحتكم الخاصة.`,
    desc: "فريق الإشراف الفني والمعالجة الدقيقة في استوديو لمحة يباشر الآن مرحلة المعايرة اللونية وتصميم الألبوم وفق أعلى معايير الجودة.",
    ctaBtn: "✦ مراجعة الصور المختارة في البوابة ←",
    footerText: "استوديو لمحة • جميع الحقوق محفوظة.",
  },
  en: {
    atelierTag: "SELECTION CONFIRMED & IN PRODUCTION",
    tagline: "Your photo selection has been safely received",
    subject: (name: string) => `✦ Photo Selection Confirmed — Lam7a Studios (${name})`,
    greeting: (name: string) => `Hello <span style="color: #c69f68;">${name}</span>!`,
    intro: (count: number) => `We confirm the successful receipt of your curated selection of <strong>${count} photographs</strong> from your Private Space.`,
    desc: "Our creative team has commenced the master retouching, color grading, and custom book layout for your project.",
    ctaBtn: "✦ Review Selection on Portal →",
    footerText: "Lam7a Studios Atelier • All rights reserved.",
  },
  es: {
    atelierTag: "SELECCIÓN CONFIRMADA & EN EDICIÓN",
    tagline: "Hemos recibido tu selección de fotografías",
    subject: (name: string) => `✦ Confirmación de tu Selección — Lam7a Studios (${name})`,
    greeting: (name: string) => `¡Hola <span style="color: #c69f68;">${name}</span>!`,
    intro: (count: number) => `Confirmamos la recepción de tu selección de <strong>${count} fotografías</strong> enviada desde tu Espace Privé.`,
    desc: "Nuestro equipo editorial y de retoque de arte comienza ahora la fase de postproducción y maquetación de tu álbum.",
    ctaBtn: "✦ Revisar mi Selección en el Portal →",
    footerText: "Lam7a Studios Atelier • Todos los derechos reservados.",
  },
}

// ---------------------------------------------------------------------------
// RENDERIZADOR: CABECERA CON LOGO OFICIAL
// ---------------------------------------------------------------------------
function renderHeader(tag: string, tagline: string) {
  return `
    <tr>
      <td align="center" style="padding: 40px 30px 25px; border-bottom: 1px solid #231e19; background: linear-gradient(180deg, #181512 0%, #12100e 100%);">
        <a href="https://lam7a.ma" target="_blank" style="text-decoration: none; display: inline-block;">
          <img src="${LOGO_URL}" alt="Lam7a Studios" width="60" height="60" style="display: block; margin: 0 auto 16px; border: 0; outline: none; width: 60px; height: 60px;" />
        </a>
        <span style="display: inline-block; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #c69f68; border: 1px solid rgba(198, 159, 104, 0.4); padding: 5px 14px; border-radius: 20px; font-weight: 600; margin-bottom: 14px;">
          ${tag}
        </span>
        <h1 style="margin: 0; font-family: Georgia, serif; font-size: 26px; font-weight: normal; color: #f5f2eb; letter-spacing: 2px;">
          LAM7A STUDIOS
        </h1>
        <p style="margin: 8px 0 0; font-size: 13px; color: #9c8e7f; font-style: italic;">
          ${tagline}
        </p>
      </td>
    </tr>
  `
}

// ---------------------------------------------------------------------------
// RENDERIZADOR: PIE CON CONMUTADOR DE IDIOMAS Y DATOS OFICIALES
// ---------------------------------------------------------------------------
function renderFooter(portalUrl: string, studioEmail: string, studioPhone: string, footerText: string) {
  const portalWithLang = (l: string) => {
    return portalUrl.includes("?") ? `${portalUrl}&lang=${l}` : `${portalUrl}?lang=${l}`
  }

  return `
    <tr>
      <td style="padding: 25px 35px 35px; background-color: #0b0a09; border-top: 1px solid #231e19; text-align: center;">
        <!-- Selector de Lenguas -->
        <div style="margin-bottom: 18px; font-size: 11px; color: #8e8071;">
          <span style="color: #63584c; margin-right: 6px;">Langue / Language / اللغة:</span>
          <a href="${portalWithLang('fr')}" style="color: #c69f68; text-decoration: none; margin: 0 4px; font-weight: 600;">Français</a> •
          <a href="${portalWithLang('ar')}" style="color: #c69f68; text-decoration: none; margin: 0 4px; font-weight: 600;">العربية</a> •
          <a href="${portalWithLang('en')}" style="color: #c69f68; text-decoration: none; margin: 0 4px; font-weight: 600;">English</a> •
          <a href="${portalWithLang('es')}" style="color: #c69f68; text-decoration: none; margin: 0 4px; font-weight: 600;">Español</a>
        </div>
        <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #c69f68; font-family: Georgia, serif;">
          Lam7a Studios Atelier • Haute Photographie
        </p>
        <p style="margin: 0 0 14px; font-size: 12px; color: #7a6e61;">
          ✉ ${studioEmail} &nbsp;|&nbsp; ☎ ${studioPhone} &nbsp;|&nbsp; 🌐 <a href="https://lam7a.ma" style="color: #c69f68; text-decoration: none;">www.lam7a.ma</a>
        </p>
        <p style="margin: 0; font-size: 11px; color: #52483d;">
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
  const t = WELCOME_I18N[lang]
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
  const formattedDate = sessionDate
    ? new Date(sessionDate).toLocaleDateString(localeCode, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : t.noDate

  const subject = t.subject(clientName)

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
          ${renderHeader(t.atelierTag, t.tagline)}

          <tr>
            <td style="padding: 35px 35px 25px; direction: ${isRtl ? "rtl" : "ltr"}; text-align: ${isRtl ? "right" : "left"};">
              <h2 style="margin: 0 0 16px; font-family: Georgia, serif; font-size: 20px; color: #f5f2eb; font-weight: normal;">
                ${t.greeting(clientName)}
              </h2>
              <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.7; color: #c4b9ab;">
                ${t.intro}
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #181512; border: 1px solid #2e261f; border-radius: 12px; margin: 24px 0; overflow: hidden; direction: ${isRtl ? "rtl" : "ltr"}; text-align: ${isRtl ? "right" : "left"};">
                <tr>
                  <td style="padding: 18px 22px; border-bottom: 1px solid #26201a;">
                    <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #8e8071; display: block; margin-bottom: 4px;">${t.dateLabel}</span>
                    <span style="font-size: 15px; font-weight: 600; color: #c69f68; font-family: Georgia, serif;">📅 ${formattedDate}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 22px; border-bottom: 1px solid #26201a;">
                    <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #8e8071; display: block; margin-bottom: 4px;">${t.catLabel}</span>
                    <span style="font-size: 14px; color: #f5f2eb;">✦ ${category} ${sessionType ? `(${sessionType})` : ""}</span>
                  </td>
                </tr>
                ${
                  notes
                    ? `
                <tr>
                  <td style="padding: 16px 22px;">
                    <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #8e8071; display: block; margin-bottom: 4px;">${t.notesLabel}</span>
                    <span style="font-size: 13px; color: #b8aba0; line-height: 1.5;">${notes}</span>
                  </td>
                </tr>
                `
                    : ""
                }
              </table>

              <p style="margin: 20px 0; font-size: 14px; line-height: 1.7; color: #c4b9ab;">
                ${t.desc}
              </p>

              <p style="margin: 20px 0 0; font-size: 13px; color: #9c8e7f; line-height: 1.6;">
                ${t.contactPrompt}
              </p>
            </td>
          </tr>

          ${renderFooter(PORTAL_URL, studioEmail, studioPhone, t.footerText)}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

  const text = `
${t.atelierTag} — LAM7A STUDIOS
${t.greeting(clientName).replace(/<[^>]+>/g, "")}

${t.intro.replace(/<[^>]+>/g, "")}

- ${t.dateLabel}: ${formattedDate}
- ${t.catLabel}: ${category}
${notes ? `- ${t.notesLabel}: ${notes}\n` : ""}
${t.desc}

${t.contactPrompt}

✉ ${studioEmail} | ☎ ${studioPhone} | https://lam7a.ma
`

  return { subject, html, text }
}

// ===========================================================================
// 2. PLANTILLA: FOTOS LISTAS EN ESPACE PRIVÉ & GOOGLE DRIVE ORIGINALES
// ===========================================================================
export function renderPhotosReadyEmail(params: PhotosReadyEmailParams): { subject: string; html: string; text: string } {
  const lang = resolveLang(params.language)
  const t = PHOTOS_READY_I18N[lang]
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
  const subject = t.subject(clientName)

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
          ${renderHeader(t.atelierTag, t.tagline)}

          <tr>
            <td style="padding: 35px 35px 25px; direction: ${isRtl ? "rtl" : "ltr"}; text-align: ${isRtl ? "right" : "left"};">
              <h2 style="margin: 0 0 16px; font-family: Georgia, serif; font-size: 20px; color: #f5f2eb; font-weight: normal;">
                ${t.greeting(clientName)}
              </h2>
              <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.7; color: #c4b9ab;">
                ${t.intro(photosCount)}
              </p>

              <!-- Credentials Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #1b1714 0%, #161310 100%); border: 1px solid #3d3328; border-radius: 14px; margin: 24px 0; overflow: hidden;">
                <tr>
                  <td align="center" style="padding: 24px 20px;">
                    <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #c69f68; font-weight: 600; display: block; margin-bottom: 12px;">
                      ${t.boxTitle}
                    </span>
                    <p style="margin: 0 0 6px; font-size: 13px; color: #8e8071;">
                      ${t.emailLabel} <strong style="color: #f5f2eb;">${clientEmail}</strong>
                    </p>
                    <p style="margin: 0 0 16px; font-size: 12px; color: #8e8071;">
                      ${t.pinLabel}
                    </p>
                    <span style="display: inline-block; font-size: 30px; letter-spacing: 8px; font-family: Georgia, serif; font-weight: bold; color: #c69f68; background-color: #0d0c0a; border: 1px solid #3d3328; padding: 10px 24px; border-radius: 10px; margin-bottom: 20px;">
                      ${portalPin}
                    </span>
                    <div>
                      <a href="${targetPortalUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #c69f68 0%, #9e753b 100%); color: #0f0d0b; text-decoration: none; font-size: 14px; font-weight: bold; letter-spacing: 0.5px; padding: 14px 28px; border-radius: 10px; box-shadow: 0 4px 14px rgba(198, 159, 104, 0.3);">
                        ${t.ctaBtn}
                      </a>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Steps -->
              <h3 style="margin: 28px 0 14px; font-family: Georgia, serif; font-size: 16px; color: #f5f2eb; font-weight: normal;">
                ${t.stepsTitle}
              </h3>

              <div style="margin-bottom: 14px;">
                <p style="margin: 0 0 4px; font-size: 13px; font-weight: 600; color: #c69f68;">
                  1. ${t.step1Title}
                </p>
                <p style="margin: 0; font-size: 13px; color: #9c8e7f; line-height: 1.6;">
                  ${t.step1Desc(portalPin)}
                </p>
              </div>

              <div style="margin-bottom: 14px;">
                <p style="margin: 0 0 4px; font-size: 13px; font-weight: 600; color: #c69f68;">
                  2. ${t.step2Title}
                </p>
                <p style="margin: 0; font-size: 13px; color: #9c8e7f; line-height: 1.6;">
                  ${t.step2Desc}
                </p>
              </div>

              ${
                driveFolderUrl
                  ? `
              <div style="margin-top: 20px; padding: 16px 18px; background-color: #171412; border: 1px dashed #3d3328; border-radius: 12px;">
                <p style="margin: 0 0 4px; font-size: 13px; font-weight: 600; color: #38bdf8;">
                  3. ${t.step3Title}
                </p>
                <p style="margin: 0 0 12px; font-size: 13px; color: #9c8e7f; line-height: 1.6;">
                  ${t.step3Desc}
                </p>
                <a href="${driveFolderUrl}" target="_blank" style="display: inline-block; background-color: #0b1a29; border: 1px solid #1e3a5f; color: #38bdf8; text-decoration: none; font-size: 13px; font-weight: 600; padding: 10px 18px; border-radius: 8px;">
                  ${t.driveBtn}
                </a>
              </div>
              `
                  : ""
              }

              <p style="margin: 28px 0 0; font-size: 13px; color: #9c8e7f; line-height: 1.6; font-style: italic;">
                ${t.closing}
              </p>
            </td>
          </tr>

          ${renderFooter(targetPortalUrl, studioEmail, studioPhone, t.footerText)}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

  const text = `
${t.atelierTag} — LAM7A STUDIOS
${t.greeting(clientName).replace(/<[^>]+>/g, "")}

${t.intro(photosCount).replace(/<[^>]+>/g, "")}

${t.boxTitle}:
- Portal: ${targetPortalUrl}
- ${t.emailLabel} ${clientEmail}
- ${t.pinLabel}: ${portalPin}

${t.stepsTitle}
1. ${t.step1Title} ${targetPortalUrl}
2. ${t.step2Title}
${driveFolderUrl ? `3. ${t.step3Title}\n${driveFolderUrl}\n` : ""}

${t.closing}

✉ ${studioEmail} | ☎ ${studioPhone} | https://lam7a.ma
`

  return { subject, html, text }
}

// ===========================================================================
// 3. PLANTILLA: READY FOR DELIVERY / RETIRO EN EL ESTUDIO
// ===========================================================================
export function renderReadyForDeliveryEmail(params: ReadyForDeliveryEmailParams): { subject: string; html: string; text: string } {
  const lang = resolveLang(params.language)
  const t = READY_DELIVERY_I18N[lang]
  const isRtl = lang === "ar"

  const {
    clientName,
    clientEmail = "",
    portalPin = "",
    driveFolderUrl,
    studioEmail = "contact@lam7a.ma",
    studioPhone = "+212 600-000000",
  } = params

  const targetPortalUrl = clientEmail && portalPin 
    ? `${PORTAL_URL}?pin=${portalPin}&email=${encodeURIComponent(clientEmail)}`
    : PORTAL_URL

  const subject = t.subject(clientName)

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
          ${renderHeader(t.atelierTag, t.tagline)}

          <tr>
            <td style="padding: 35px 35px 25px; direction: ${isRtl ? "rtl" : "ltr"}; text-align: ${isRtl ? "right" : "left"};">
              <h2 style="margin: 0 0 16px; font-family: Georgia, serif; font-size: 20px; color: #f5f2eb; font-weight: normal;">
                ${t.greeting(clientName)}
              </h2>
              <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.7; color: #c4b9ab;">
                ${t.intro}
              </p>

              <!-- Delivery Ready Banner -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #1f1a14 0%, #171410 100%); border: 1px solid #4a3c2c; border-radius: 14px; margin: 24px 0; overflow: hidden;">
                <tr>
                  <td align="center" style="padding: 24px 20px;">
                    <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #10b981; font-weight: 600; display: block; margin-bottom: 8px;">
                      ✓ ${t.pickupTitle}
                    </span>
                    <p style="margin: 0 0 18px; font-size: 13px; color: #d4c7b6; line-height: 1.6; max-width: 480px;">
                      ${t.pickupDesc}
                    </p>
                    <div>
                      <a href="${targetPortalUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #c69f68 0%, #9e753b 100%); color: #0f0d0b; text-decoration: none; font-size: 14px; font-weight: bold; letter-spacing: 0.5px; padding: 14px 28px; border-radius: 10px; box-shadow: 0 4px 14px rgba(198, 159, 104, 0.3);">
                        ${t.ctaBtn}
                      </a>
                    </div>
                  </td>
                </tr>
              </table>

              ${
                driveFolderUrl
                  ? `
              <div style="margin: 20px 0; padding: 18px 20px; background-color: #171412; border: 1px dashed #3d3328; border-radius: 12px;">
                <p style="margin: 0 0 4px; font-size: 13px; font-weight: 600; color: #38bdf8;">
                  ${t.driveTitle}
                </p>
                <p style="margin: 0 0 12px; font-size: 13px; color: #9c8e7f; line-height: 1.6;">
                  ${t.driveDesc}
                </p>
                <a href="${driveFolderUrl}" target="_blank" style="display: inline-block; background-color: #0b1a29; border: 1px solid #1e3a5f; color: #38bdf8; text-decoration: none; font-size: 13px; font-weight: 600; padding: 10px 18px; border-radius: 8px;">
                  ${t.driveBtn}
                </a>
              </div>
              `
                  : ""
              }

              <div style="margin-top: 24px; padding: 14px 18px; background-color: #0d0c0b; border-radius: 10px; border: 1px solid #231e19;">
                <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #8e8071; display: block; margin-bottom: 2px;">Atelier :</span>
                <span style="font-size: 13px; color: #c69f68; font-weight: 600;">📍 ${t.studioAddress}</span>
              </div>

              <p style="margin: 24px 0 0; font-size: 13px; color: #9c8e7f; line-height: 1.6; font-style: italic;">
                ${t.closing}
              </p>
            </td>
          </tr>

          ${renderFooter(targetPortalUrl, studioEmail, studioPhone, t.footerText)}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

  const text = `
${t.atelierTag} — LAM7A STUDIOS
${t.greeting(clientName).replace(/<[^>]+>/g, "")}

${t.intro.replace(/<[^>]+>/g, "")}

${t.pickupTitle}
${t.pickupDesc}

- Portal: ${targetPortalUrl}
${driveFolderUrl ? `- Google Drive Master: ${driveFolderUrl}\n` : ""}
- Atelier: ${t.studioAddress}

${t.closing}

✉ ${studioEmail} | ☎ ${studioPhone} | https://lam7a.ma
`

  return { subject, html, text }
}

// ===========================================================================
// 4. PLANTILLA: CONFIRMACIÓN DE SELECCIÓN DE FOTOS
// ===========================================================================
export function renderSelectionConfirmedEmail(params: SelectionConfirmedEmailParams): { subject: string; html: string; text: string } {
  const lang = resolveLang(params.language)
  const t = SELECTION_CONFIRMED_I18N[lang]
  const isRtl = lang === "ar"

  const {
    clientName,
    photosCount,
    clientEmail = "",
    portalPin = "",
    studioEmail = "contact@lam7a.ma",
    studioPhone = "+212 600-000000",
  } = params

  const targetPortalUrl = clientEmail && portalPin 
    ? `${PORTAL_URL}?pin=${portalPin}&email=${encodeURIComponent(clientEmail)}`
    : PORTAL_URL

  const subject = t.subject(clientName)

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
          ${renderHeader(t.atelierTag, t.tagline)}

          <tr>
            <td style="padding: 35px 35px 25px; direction: ${isRtl ? "rtl" : "ltr"}; text-align: ${isRtl ? "right" : "left"};">
              <h2 style="margin: 0 0 16px; font-family: Georgia, serif; font-size: 20px; color: #f5f2eb; font-weight: normal;">
                ${t.greeting(clientName)}
              </h2>
              <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.7; color: #c4b9ab;">
                ${t.intro(photosCount)}
              </p>

              <div style="padding: 20px; background-color: #181512; border: 1px solid #332a21; border-radius: 12px; margin: 20px 0; text-align: center;">
                <span style="font-size: 28px; font-weight: bold; color: #c69f68; font-family: Georgia, serif; display: block; margin-bottom: 6px;">
                  📸 ${photosCount} photos
                </span>
                <span style="font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #10b981; font-weight: 600;">
                  ✓ Sélection Enregistrée avec Succès
                </span>
              </div>

              <p style="margin: 20px 0; font-size: 14px; line-height: 1.7; color: #c4b9ab;">
                ${t.desc}
              </p>

              <div style="text-align: center; margin: 28px 0 10px;">
                <a href="${targetPortalUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #c69f68 0%, #9e753b 100%); color: #0f0d0b; text-decoration: none; font-size: 13px; font-weight: bold; letter-spacing: 0.5px; padding: 12px 24px; border-radius: 10px;">
                  ${t.ctaBtn}
                </a>
              </div>
            </td>
          </tr>

          ${renderFooter(targetPortalUrl, studioEmail, studioPhone, t.footerText)}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

  const text = `
${t.atelierTag} — LAM7A STUDIOS
${t.greeting(clientName).replace(/<[^>]+>/g, "")}

${t.intro(photosCount).replace(/<[^>]+>/g, "")}

${t.desc}

Portal: ${targetPortalUrl}

✉ ${studioEmail} | ☎ ${studioPhone} | https://lam7a.ma
`

  return { subject, html, text }
}

