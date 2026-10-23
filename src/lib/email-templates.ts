/**
 * Plantillas HTML Responsivas y de Lujo para Lamha Studios Atelier
 * Soporte Completo para las 4 Lenguas del Sistema:
 * - fr (Français - Atelier Standard)
 * - es (Español)
 * - en (English)
 * - ar (العربية - RTL)
 * 
 * Estética: Dark Obsidian (#12100e), Oro Champán (#c69f68), Marfil (#f5f2eb)
 */

export type EmailLanguage = "fr" | "es" | "en" | "ar"

interface WelcomeEmailParams {
  clientName: string
  sessionDate?: string | null
  category?: string | null
  sessionType?: string | null
  notes?: string | null
  studioEmail?: string
  studioPhone?: string
  language?: EmailLanguage | string
}

interface PhotosReadyEmailParams {
  clientName: string
  portalUrl: string
  clientEmail: string
  portalPin: string
  driveFolderUrl?: string | null
  photosCount?: number
  studioEmail?: string
  studioPhone?: string
  language?: EmailLanguage | string
}

const WELCOME_I18N = {
  fr: {
    atelierTag: "ATELIER PHOTOGRAPHIQUE",
    tagline: "Capturer l'éternité dans chaque instant",
    subject: (name: string) => `✦ Bienvenue chez Lamha Studios — Confirmation de Réservation : ${name}`,
    greeting: (name: string) => `Cher/Chère <span style="color: #c69f68;">${name}</span>,`,
    intro: "C'est un véritable honneur de vous accueillir au sein de <strong>Lamha Studios</strong>. Nous avons bien enregistré votre projet et réservé la date dans l'agenda de notre atelier.",
    dateLabel: "Date Programmée",
    catLabel: "Catégorie & Spécialité",
    notesLabel: "Notes & Détails",
    noDate: "Date à confirmer",
    desc: "Notre équipe de photographes et directeurs artistiques prépare déjà l'ensemble du dispositif créatif pour immortaliser vos précieux moments avec le plus haut niveau d'exigence et d'élégance.",
    contactPrompt: "Pour toute question, coordination de tenues ou précision avant le jour J, notre équipe reste à votre entière disposition.",
    footerText: "Lamha Studios Atelier • Tous droits réservés.",
  },
  es: {
    atelierTag: "ATELIER FOTOGRÁFICO",
    tagline: "Capturando la eternidad en cada instante",
    subject: (name: string) => `✦ Bienvenida a Lamha Studios — Confirmación de Reserva: ${name}`,
    greeting: (name: string) => `Estimado/a <span style="color: #c69f68;">${name}</span>,`,
    intro: "Es un honor darte la más cálida bienvenida a <strong>Lamha Studios</strong>. Hemos registrado formalmente tu proyecto y reservado la fecha en la agenda de nuestro atelier.",
    dateLabel: "Fecha Programada",
    catLabel: "Categoría & Especialidad",
    notesLabel: "Notas y Detalles",
    noDate: "Fecha por confirmar",
    desc: "Nuestro equipo de fotógrafos y directores de arte ya está preparando todo el despliegue técnico y creativo para inmortalizar tus mejores momentos con la máxima fidelidad, elegancia y cuidado del detalle.",
    contactPrompt: "Si necesitas realizar cualquier consulta, coordinar la vestimenta, ubicación o afinar detalles antes del día señalado, estamos a tu entera disposición.",
    footerText: "Lamha Studios Atelier • Todos los derechos reservados.",
  },
  en: {
    atelierTag: "PHOTOGRAPHIC ATELIER",
    tagline: "Capturing eternity in every instant",
    subject: (name: string) => `✦ Welcome to Lamha Studios — Booking Confirmation: ${name}`,
    greeting: (name: string) => `Dear <span style="color: #c69f68;">${name}</span>,`,
    intro: "It is a true honor to welcome you to <strong>Lamha Studios</strong>. We have officially registered your project and reserved your date in our atelier's calendar.",
    dateLabel: "Scheduled Date",
    catLabel: "Category & Specialty",
    notesLabel: "Notes & Details",
    noDate: "Date to be confirmed",
    desc: "Our team of photographers and creative directors is already preparing the artistic and technical direction to immortalize your moments with the highest level of craftsmanship and elegance.",
    contactPrompt: "Should you have any inquiries regarding styling, locations, or special requests prior to your session, we remain at your complete disposal.",
    footerText: "Lamha Studios Atelier • All rights reserved.",
  },
  ar: {
    atelierTag: "استوديو التصوير الفني",
    tagline: "تخليد اللحظات الأبدية بأرقى المعايير",
    subject: (name: string) => `✦ مرحباً بكم في استوديو لمحة — تأكيد حجز جلسة التصوير: ${name}`,
    greeting: (name: string) => `عزيزنا/عزيزتنا <span style="color: #c69f68;">${name}</span>،`,
    intro: "إنه لمن دواعي سرورنا واعتزازنا أن نرحب بكم في <strong>استوديو لمحة (Lamha Studios)</strong>. لقد تم تسجيل مشروعكم وتثبيت الموعد المحدد في جدول مواعيد الاستوديو.",
    dateLabel: "الموعد المحدد",
    catLabel: "الفئة والتخصص",
    notesLabel: "ملاحظات وتفاصيل",
    noDate: "الموعد قيد التأكيد",
    desc: "فريقنا من المصورين والمشرفين الفنيين يستعد لتقديم أرقى تجربة تصوير توثق لحظاتكم المميزة بأعلى درجات الفخامة والإتقان.",
    contactPrompt: "إذا كانت لديكم أي استفسارات بخصوص الملابس، الموقع أو تفاصيل الجلسة، يسعدنا تواصلكم معنا في أي وقت.",
    footerText: "استوديو لمحة • جميع الحقوق محفوظة.",
  },
}

const PHOTOS_READY_I18N = {
  fr: {
    atelierTag: "ESPACE PRIVÉ & SÉLECTION",
    tagline: "Vos précieux souvenirs sont désormais disponibles",
    subject: (name: string) => `✦ Vos photos sont prêtes sur votre Espace Privé — Lamha Studios (${name})`,
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
    step3Title: "Télécharger vos photos sur Google Drive :",
    step3Desc: "Vous pouvez télécharger le dossier complet en haute résolution directement via :",
    driveBtn: "📁 Ouvrir le dossier Google Drive →",
    closing: "Nous espérons de tout cœur que vous apprécierez revivre ces instants autant que nous avons aimé les capturer.",
    footerText: "Lamha Studios Atelier • Tous droits réservés.",
  },
  es: {
    atelierTag: "ESPACIO PRIVADO & SELECCIÓN",
    tagline: "Tus recuerdos más bellos ya están disponibles",
    subject: (name: string) => `✦ Tus fotos están listas en tu Espace Privé — Lamha Studios (${name})`,
    greeting: (name: string) => `¡Hola <span style="color: #c69f68;">${name}</span>!`,
    intro: (count?: number) => `Nos alegra comunicarte que el reportaje fotográfico ha sido procesado y calibrado por nuestro atelier. ${count ? `Ya tienes <strong>${count} fotografías</strong> disponibles para visualizar.` : "Tus fotos ya están listas para ti."}`,
    boxTitle: "TUS CREDENCIALES DE ACCESO",
    emailLabel: "Correo de acceso:",
    pinLabel: "CÓDIGO PIN DE SEGURIDAD",
    ctaBtn: "✦ Acceder a mi Espace Privé →",
    stepsTitle: "¿Qué debes hacer a continuación?",
    step1Title: "Ingresa al Portal:",
    step1Desc: (pin: string) => `Pulsa el botón superior e introduce tu correo y tu código PIN <strong>${pin}</strong>.`,
    step2Title: "Escoge tus fotos favoritas:",
    step2Desc: "En la galería, haz clic en el icono del corazón (❤️) en cada foto que desees para el álbum de bodas o retoque editorial.",
    step3Title: "Descarga tus archivos originales en Google Drive:",
    step3Desc: "Puedes descargar la carpeta completa en máxima resolución directamente desde:",
    driveBtn: "📁 Abrir Carpeta de Fotos en Google Drive →",
    closing: "Esperamos de corazón que disfrutes reviviendo estos momentos tanto como nosotros disfrutamos capturándolos.",
    footerText: "Lamha Studios Atelier • Todos los derechos reservados.",
  },
  en: {
    atelierTag: "PRIVATE CLIENT SPACE & SELECTION",
    tagline: "Your precious memories are now available",
    subject: (name: string) => `✦ Your photos are ready in your Private Space — Lamha Studios (${name})`,
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
    step3Title: "Download original files from Google Drive:",
    step3Desc: "You can download the full high-resolution collection directly from:",
    driveBtn: "📁 Open Google Drive Folder →",
    closing: "We sincerely hope you cherish reliving these moments as much as we enjoyed creating them.",
    footerText: "Lamha Studios Atelier • All rights reserved.",
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
    step2Title: "اختيار صوركم المفضلة:",
    step2Desc: "أثناء تصفح المعرض، اضغط على أيقونة القلب (❤️) على الصور التي ترغب باختيارها لطباعة الألبوم أو المعالجة النهائية.",
    step3Title: "تحميل الصور الأصلية من Google Drive:",
    step3Desc: "يمكنكم تحميل كافة الصور بالدقة الكاملة مباشرة عبر:",
    driveBtn: "📁 فتح مجلد Google Drive للتحميل ←",
    closing: "نتمنى من كل قلوبنا أن تستمتعوا بمشاهدة هذه الذكريات الخالدة بقدر استمتاعنا بتوثيقها لكم.",
    footerText: "استوديو لمحة • جميع الحقوق محفوظة.",
  },
}

function resolveLang(lang?: string): EmailLanguage {
  if (lang === "ar" || lang === "en" || lang === "es" || lang === "fr") {
    return lang
  }
  return "fr"
}

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
    studioEmail = "contact@lamhastudios.ma",
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
<body style="margin: 0; padding: 0; background-color: #0a0908; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f5f2eb; direction: ${isRtl ? "rtl" : "ltr"}; text-align: ${isRtl ? "right" : "left"};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0908; padding: 40px 15px;">
    <tr>
      <td align="center">
        <!-- Container -->
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #141210; border: 1px solid #2b251f; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.6);">
          
          <!-- Header Banner -->
          <tr>
            <td align="center" style="padding: 45px 30px 25px; border-bottom: 1px solid #231e19; background: linear-gradient(180deg, #1a1714 0%, #141210 100%);">
              <span style="display: inline-block; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #c69f68; border: 1px solid rgba(198, 159, 104, 0.35); padding: 5px 14px; border-radius: 20px; font-weight: 600; margin-bottom: 14px;">
                ${t.atelierTag}
              </span>
              <h1 style="margin: 0; font-family: Georgia, serif; font-size: 28px; font-weight: normal; color: #f5f2eb; letter-spacing: 1px;">
                LAMHA STUDIOS
              </h1>
              <p style="margin: 8px 0 0; font-size: 13px; color: #9c8e7f; font-style: italic;">
                ${t.tagline}
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 35px 35px 25px; direction: ${isRtl ? "rtl" : "ltr"}; text-align: ${isRtl ? "right" : "left"};">
              <h2 style="margin: 0 0 16px; font-family: Georgia, serif; font-size: 20px; color: #f5f2eb; font-weight: normal;">
                ${t.greeting(clientName)}
              </h2>
              <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.7; color: #c4b9ab;">
                ${t.intro}
              </p>

              <!-- Session Details Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #1a1714; border: 1px solid #2e261f; border-radius: 12px; margin: 24px 0; overflow: hidden; direction: ${isRtl ? "rtl" : "ltr"}; text-align: ${isRtl ? "right" : "left"};">
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

          <!-- Contact & Footer -->
          <tr>
            <td style="padding: 25px 35px 35px; background-color: #0f0e0d; border-top: 1px solid #231e19; text-align: center;">
              <p style="margin: 0 0 10px; font-size: 13px; font-weight: 600; color: #c69f68;">
                Lamha Studios Atelier
              </p>
              <p style="margin: 0 0 16px; font-size: 12px; color: #7a6e61;">
                ✉ ${studioEmail} &nbsp;|&nbsp; ☎ ${studioPhone}
              </p>
              <p style="margin: 0; font-size: 11px; color: #52483d;">
                © ${new Date().getFullYear()} ${t.footerText}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

  const text = `
${t.atelierTag} — LAMHA STUDIOS
${t.greeting(clientName).replace(/<[^>]+>/g, "")}

${t.intro.replace(/<[^>]+>/g, "")}

- ${t.dateLabel}: ${formattedDate}
- ${t.catLabel}: ${category} ${sessionType ? `(${sessionType})` : ""}
${notes ? `- ${t.notesLabel}: ${notes}\n` : ""}

${t.desc.replace(/<[^>]+>/g, "")}
${t.contactPrompt}

✉ ${studioEmail} | ☎ ${studioPhone}
`

  return { subject, html, text }
}

export function renderPhotosReadyEmail(params: PhotosReadyEmailParams): { subject: string; html: string; text: string } {
  const lang = resolveLang(params.language)
  const t = PHOTOS_READY_I18N[lang]
  const isRtl = lang === "ar"

  const {
    clientName,
    portalUrl,
    clientEmail,
    portalPin,
    driveFolderUrl,
    photosCount,
    studioEmail = "contact@lamhastudios.ma",
    studioPhone = "+212 600-000000",
  } = params

  const subject = t.subject(clientName)

  const html = `
<!DOCTYPE html>
<html lang="${lang}" dir="${isRtl ? "rtl" : "ltr"}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0908; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f5f2eb; direction: ${isRtl ? "rtl" : "ltr"}; text-align: ${isRtl ? "right" : "left"};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0908; padding: 40px 15px;">
    <tr>
      <td align="center">
        <!-- Container -->
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #141210; border: 1px solid #2b251f; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.6);">
          
          <!-- Header Banner -->
          <tr>
            <td align="center" style="padding: 45px 30px 25px; border-bottom: 1px solid #231e19; background: linear-gradient(180deg, #1a1714 0%, #141210 100%);">
              <span style="display: inline-block; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #c69f68; border: 1px solid rgba(198, 159, 104, 0.35); padding: 5px 14px; border-radius: 20px; font-weight: 600; margin-bottom: 14px;">
                ${t.atelierTag}
              </span>
              <h1 style="margin: 0; font-family: Georgia, serif; font-size: 28px; font-weight: normal; color: #f5f2eb; letter-spacing: 1px;">
                LAMHA STUDIOS
              </h1>
              <p style="margin: 8px 0 0; font-size: 13px; color: #9c8e7f; font-style: italic;">
                ${t.tagline}
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 35px 35px 25px; direction: ${isRtl ? "rtl" : "ltr"}; text-align: ${isRtl ? "right" : "left"};">
              <h2 style="margin: 0 0 16px; font-family: Georgia, serif; font-size: 20px; color: #f5f2eb; font-weight: normal;">
                ${t.greeting(clientName)}
              </h2>
              <p style="margin: 0 0 22px; font-size: 14px; line-height: 1.7; color: #c4b9ab;">
                ${t.intro(photosCount)}
              </p>

              <!-- Access Credentials Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #191613; border: 2px solid #3d3328; border-radius: 14px; margin: 26px 0; overflow: hidden; text-align: center;">
                <tr>
                  <td style="padding: 26px 20px;">
                    <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #c69f68; font-weight: 600; display: block; margin-bottom: 10px;">
                      ${t.boxTitle}
                    </span>

                    <table role="presentation" width="100%" style="margin: 12px 0 18px;">
                      <tr>
                        <td align="center" style="font-size: 13px; color: #a89f92; padding: 4px 0;">
                          ${t.emailLabel} <strong style="color: #f5f2eb;">${clientEmail}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding: 10px 0;">
                          <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #7a6e61; display: block; margin-bottom: 6px;">${t.pinLabel}</span>
                          <span style="display: inline-block; font-family: 'Courier New', monospace; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #c69f68; background-color: #0f0e0d; border: 1px solid #3d3328; padding: 8px 24px; border-radius: 8px;">
                            ${portalPin}
                          </span>
                        </td>
                      </tr>
                    </table>

                    <!-- CTA Button -->
                    <table role="presentation" cellspacing="0" cellpadding="0" align="center" style="margin: 10px auto 0;">
                      <tr>
                        <td align="center" style="background: linear-gradient(135deg, #c69f68 0%, #a87d43 100%); border-radius: 8px;">
                          <a href="${portalUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 600; color: #0d0c0b; text-decoration: none; letter-spacing: 0.5px;">
                            ${t.ctaBtn}
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Steps Guide -->
              <h3 style="margin: 30px 0 16px; font-family: Georgia, serif; font-size: 16px; color: #c69f68; font-weight: normal;">
                ${t.stepsTitle}
              </h3>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td width="36" valign="top" style="${isRtl ? "padding-left: 12px;" : "padding-right: 12px;"}">
                    <div style="width: 28px; height: 28px; border-radius: 50%; background-color: #241f1a; border: 1px solid #c69f68; color: #c69f68; font-weight: bold; font-size: 12px; line-height: 28px; text-align: center;">1</div>
                  </td>
                  <td valign="top" style="font-size: 13px; line-height: 1.6; color: #c4b9ab; padding-bottom: 14px;">
                    <strong>${t.step1Title}</strong> ${t.step1Desc(portalPin)}
                  </td>
                </tr>
                <tr>
                  <td width="36" valign="top" style="${isRtl ? "padding-left: 12px;" : "padding-right: 12px;"}">
                    <div style="width: 28px; height: 28px; border-radius: 50%; background-color: #241f1a; border: 1px solid #c69f68; color: #c69f68; font-weight: bold; font-size: 12px; line-height: 28px; text-align: center;">2</div>
                  </td>
                  <td valign="top" style="font-size: 13px; line-height: 1.6; color: #c4b9ab; padding-bottom: 14px;">
                    <strong>${t.step2Title}</strong> ${t.step2Desc}
                  </td>
                </tr>
                ${
                  driveFolderUrl
                    ? `
                <tr>
                  <td width="36" valign="top" style="${isRtl ? "padding-left: 12px;" : "padding-right: 12px;"}">
                    <div style="width: 28px; height: 28px; border-radius: 50%; background-color: #241f1a; border: 1px solid #c69f68; color: #c69f68; font-weight: bold; font-size: 12px; line-height: 28px; text-align: center;">3</div>
                  </td>
                  <td valign="top" style="font-size: 13px; line-height: 1.6; color: #c4b9ab; padding-bottom: 14px;">
                    <strong>${t.step3Title}</strong> ${t.step3Desc}
                    <div style="margin-top: 8px;">
                      <a href="${driveFolderUrl}" target="_blank" style="display: inline-block; font-size: 12px; font-weight: 600; color: #c69f68; background-color: #241f1a; border: 1px solid #3d3328; padding: 6px 14px; border-radius: 6px; text-decoration: none;">
                        ${t.driveBtn}
                      </a>
                    </div>
                  </td>
                </tr>
                `
                    : ""
                }
              </table>

              <p style="margin: 25px 0 0; font-size: 13px; color: #9c8e7f; line-height: 1.6;">
                ${t.closing}
              </p>
            </td>
          </tr>

          <!-- Contact & Footer -->
          <tr>
            <td style="padding: 25px 35px 35px; background-color: #0f0e0d; border-top: 1px solid #231e19; text-align: center;">
              <p style="margin: 0 0 10px; font-size: 13px; font-weight: 600; color: #c69f68;">
                Lamha Studios Atelier
              </p>
              <p style="margin: 0 0 16px; font-size: 12px; color: #7a6e61;">
                ✉ ${studioEmail} &nbsp;|&nbsp; ☎ ${studioPhone}
              </p>
              <p style="margin: 0; font-size: 11px; color: #52483d;">
                © ${new Date().getFullYear()} ${t.footerText}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

  const text = `
${t.atelierTag} — LAMHA STUDIOS
${t.greeting(clientName).replace(/<[^>]+>/g, "")}

${t.intro(photosCount).replace(/<[^>]+>/g, "")}

${t.boxTitle}:
- Portal: ${portalUrl}
- ${t.emailLabel} ${clientEmail}
- ${t.pinLabel}: ${portalPin}

${t.stepsTitle}
1. ${t.step1Title} ${portalUrl}
2. ${t.step2Title}
${driveFolderUrl ? `3. ${t.step3Title}\n${driveFolderUrl}\n` : ""}

${t.closing}

✉ ${studioEmail} | ☎ ${studioPhone}
`

  return { subject, html, text }
}
