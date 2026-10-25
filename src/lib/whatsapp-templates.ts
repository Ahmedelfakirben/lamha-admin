/**
 * Lamha Studios — Plantillas de Mensajes WhatsApp Multilingües
 * Soporte Completo: Français (fr), العربية (ar), English (en), Español (es)
 * 
 * Reglas:
 * 1. URLs limpias sin emojis pegados para evitar cortes en WhatsApp.
 * 2. Formato de lujo y atelier con tipografía y negritas de WhatsApp (*texto*).
 * 3. Siempre incluir acceso al portal oficial https://lam7a.ma/portal con PIN.
 */

export type WhatsAppLanguage = "fr" | "ar" | "en" | "es"

export function resolveLanguage(lang?: string | null): WhatsAppLanguage {
  if (lang === "ar" || lang === "en" || lang === "es" || lang === "fr") {
    return lang
  }
  return "fr" // Default atelier
}

const PORTAL_BASE_URL = "https://lam7a.ma/portal"

// ---------------------------------------------------------------------------
// 1. BIENVENIDA / CONFIRMACIÓN DE PROYECTO
// ---------------------------------------------------------------------------
export function getWelcomeWhatsApp({
  clientName,
  sessionDate,
  category,
  portalPin,
  clientEmail,
  language = "fr",
}: {
  clientName: string
  sessionDate?: string | null
  category?: string | null
  portalPin?: string | null
  clientEmail?: string | null
  language?: string | null
}): string {
  const l = resolveLanguage(language)
  const dateStr = sessionDate ? sessionDate : "à convenir"
  const catStr = category || "Atelier"
  const portalUrl = clientEmail && portalPin 
    ? `${PORTAL_BASE_URL}?pin=${portalPin}&email=${encodeURIComponent(clientEmail)}`
    : PORTAL_BASE_URL

  if (l === "ar") {
    return `*استوديو لمحة • تأكيد حجز المشروع*

أهلاً وسهلاً بك ${clientName}،

يسعدنا تأكيد تسجيل مشروعكم الفني في *استوديو لمحة* (${catStr}).
الموعد المحدد للجلسة: *${dateStr}*

تم إنشاء مساحتكم الخاصة على موقعنا الرسمي:
الرابط المباشر: ${portalUrl}
${clientEmail ? `البريد الإلكتروني: ${clientEmail}\n` : ""}${portalPin ? `رمز الأمان (PIN): *${portalPin}*\n` : ""}
فريقنا الفني يتطلع للقائكم وتقديم تجربة تصوير استثنائية. لأي استفسار يمكنكم الرد مباشرة على هذه المحادثة.

*استوديو لمحة • Lamha Studios*
https://lam7a.ma`
  }

  if (l === "en") {
    return `*Lamha Studios • Project Confirmation*

Hello ${clientName},

We are delighted to confirm your booking with *Lamha Studios* (${catStr}).
Scheduled Date: *${dateStr}*

Your private client suite has been set up on our official portal:
Access Link: ${portalUrl}
${clientEmail ? `Login Email: ${clientEmail}\n` : ""}${portalPin ? `Security PIN: *${portalPin}*\n` : ""}
Our creative team is looking forward to capturing your timeless memories. If you have any questions, feel free to reply directly to this message.

*Lamha Studios Atelier*
https://lam7a.ma`
  }

  if (l === "es") {
    return `*Lamha Studios • Confirmación de Proyecto*

Hola ${clientName},

Es un placer darte la bienvenida a *Lamha Studios* y confirmar el registro de tu proyecto (${catStr}).
Fecha programada: *${dateStr}*

Hemos preparado tu Suite Privada en nuestro portal oficial:
Acceso directo: ${portalUrl}
${clientEmail ? `Correo: ${clientEmail}\n` : ""}${portalPin ? `Código PIN de seguridad: *${portalPin}*\n` : ""}
Nuestro equipo artístico está preparando todo para tu sesión. Si tienes cualquier consulta, puedes responder directamente a este mensaje.

*Lamha Studios Atelier*
https://lam7a.ma`
  }

  // Français (Défaut)
  return `*Lamha Studios • Confirmation de Réservation*

Bonjour ${clientName},

Nous avons l'honneur de vous confirmer l'enregistrement de votre projet chez *Lamha Studios* (${catStr}).
Date programmée : *${dateStr}*

Votre suite privée est d'ores et déjà accessible sur notre portail officiel :
Lien d'accès : ${portalUrl}
${clientEmail ? `Identifiant Email : ${clientEmail}\n` : ""}${portalPin ? `Code PIN de sécurité : *${portalPin}*\n` : ""}
Notre équipe artistique prépare votre séance avec le plus grand soin. Pour toute question, vous pouvez répondre directement à ce message.

*Lamha Studios Atelier*
https://lam7a.ma`
}

// ---------------------------------------------------------------------------
// 2. FOTOS LISTAS PARA SELECCIÓN + GOOGLE DRIVE
// ---------------------------------------------------------------------------
export function getPhotosReadyWhatsApp({
  clientName,
  photosCount,
  portalPin,
  clientEmail,
  driveUrl,
  language = "fr",
}: {
  clientName: string
  photosCount?: number | null
  portalPin: string
  clientEmail: string
  driveUrl?: string | null
  language?: string | null
}): string {
  const l = resolveLanguage(language)
  const portalUrl = `${PORTAL_BASE_URL}?pin=${portalPin}&email=${encodeURIComponent(clientEmail)}`
  const countStr = photosCount ? `${photosCount} photos` : "vos photos"

  if (l === "ar") {
    return `*استوديو لمحة • مساحتكم الخاصة جاهزة*

مرحباً ${clientName}،

يسعدنا إعلامكم بأن ${countStr} أصبحت جاهزة ومعالجة في استوديو لمحة.

بإمكانكم الآن الدخول لمعاينة واختيار صوركم المفضلة للألبوم عبر بوابتكم الخاصة:
رابط البوابة: ${portalUrl}
البريد الإلكتروني: ${clientEmail}
رمز الأمان السري (PIN): *${portalPin}*
${driveUrl ? `\nلتحميل كافة الصور بجودتها وحجمها الأصلي عبر Google Drive:\n${driveUrl}\n` : ""}
نتمنى لكم وقتاً ممتعاً في استرجاع هذه اللحظات المميزة.

*استوديو لمحة • Lamha Studios*
https://lam7a.ma`
  }

  if (l === "en") {
    return `*Lamha Studios • Private Suite Ready*

Hello ${clientName},

We are thrilled to let you know that ${countStr} have been calibrated and are now available for your private viewing.

Access your Private Space to view and select your favorites for the final album:
Direct Access: ${portalUrl}
Login Email: ${clientEmail}
Security PIN: *${portalPin}*
${driveUrl ? `\nDownload all original full-resolution files directly via Google Drive:\n${driveUrl}\n` : ""}
We hope you enjoy reliving these precious moments.

*Lamha Studios Atelier*
https://lam7a.ma`
  }

  if (l === "es") {
    return `*Lamha Studios • Espace Privé Listo*

Hola ${clientName},

Nos complace informarte que ${countStr} de tu reportaje ya están calibradas y listas para ti en Lamha Studios.

Accede a tu Suite Privada para ver y seleccionar tus fotografías favoritas para el álbum:
Acceso directo: ${portalUrl}
Correo: ${clientEmail}
Código PIN: *${portalPin}*
${driveUrl ? `\nDescarga todos los archivos originales en su tamaño real desde Google Drive:\n${driveUrl}\n` : ""}
Esperamos de corazón que disfrutes reviviendo estos instantes inolvidables.

*Lamha Studios Atelier*
https://lam7a.ma`
  }

  // Français (Défaut)
  return `*Lamha Studios • Espace Privé Prêt*

Bonjour ${clientName},

Nous avons le plaisir de vous annoncer que ${countStr} de votre séance sont désormais calibrées et prêtes pour votre sélection.

Accédez à votre Suite Privée pour visionner et choisir vos photographies pour l'album :
Lien direct : ${portalUrl}
Identifiant Email : ${clientEmail}
Code PIN de sécurité : *${portalPin}*
${driveUrl ? `\nTélécharger l'ensemble des fichiers originaux en pleine résolution sur Google Drive :\n${driveUrl}\n` : ""}
Nous espérons que vous prendrez autant de plaisir à les découvrir que nous en avons eu à les capturer.

*Lamha Studios Atelier*
https://lam7a.ma`
}

// ---------------------------------------------------------------------------
// 3. READY FOR DELIVERY / RETIRADA EN EL ESTUDIO
// ---------------------------------------------------------------------------
export function getReadyForDeliveryWhatsApp({
  clientName,
  category,
  portalPin,
  clientEmail,
  driveUrl,
  language = "fr",
}: {
  clientName: string
  category?: string | null
  portalPin?: string | null
  clientEmail?: string | null
  driveUrl?: string | null
  language?: string | null
}): string {
  const l = resolveLanguage(language)
  const catStr = category ? ` (${category})` : ""
  const portalUrl = clientEmail && portalPin 
    ? `${PORTAL_BASE_URL}?pin=${portalPin}&email=${encodeURIComponent(clientEmail)}`
    : PORTAL_BASE_URL

  if (l === "ar") {
    return `*استوديو لمحة • طلبكم جاهز للاستلام*

عزيزنا/عزيزتنا ${clientName}،

يسعدنا إبلاغكم بأن أعمال المونتاج، الطباعة الفنية وتجهيز الصور لمشروعكم${catStr} أصبحت جاهزة تماماً في استوديو لمحة.

يمكنكم الآن الحضور إلى الاستوديو لاستلام ألبومكم الفني أو الرجوع للبوابة الخاصة لمشاهدة التسليم النهائي:
رابط البوابة: ${portalUrl}
${portalPin ? `رمز الأمان: *${portalPin}*\n` : ""}${driveUrl ? `رابط التحميل المباشر Google Drive:\n${driveUrl}\n` : ""}
يسعدنا تواصلكم لتأكيد موعد استلامكم.

*استوديو لمحة • Lamha Studios*
https://lam7a.ma`
  }

  if (l === "en") {
    return `*Lamha Studios • Your Master Collection is Ready*

Dear ${clientName},

We are delighted to announce that your finished artworks, luxury prints, and final edits${catStr} are complete and ready for you at our studio.

You are welcome to visit our atelier for physical collection or review your final delivery on your portal:
Client Portal: ${portalUrl}
${portalPin ? `Security PIN: *${portalPin}*\n` : ""}${driveUrl ? `Download HD Master Files (Google Drive):\n${driveUrl}\n` : ""}
Please contact us to coordinate your pickup time.

*Lamha Studios Atelier*
https://lam7a.ma`
  }

  if (l === "es") {
    return `*Lamha Studios • Tu Pedido está Listo en el Estudio*

Estimado/a ${clientName},

Tenemos el placer de anunciarte que el montaje final, las ampliaciones y tu álbum fotográfico${catStr} ya están completamente finalizados en nuestro atelier.

Puedes pasar por el estudio a recoger tu entrega física o consultar tu galería final en el portal:
Acceso al portal: ${portalUrl}
${portalPin ? `Código PIN: *${portalPin}*\n` : ""}${driveUrl ? `Descarga Final HD en Google Drive:\n${driveUrl}\n` : ""}
Por favor, confírmanos cuándo te gustaría pasar a recogerlo.

*Lamha Studios Atelier*
https://lam7a.ma`
  }

  // Français (Défaut)
  return `*Lamha Studios • Vos Photos & Coffret sont Prêts à l'Atelier*

Cher/Chère ${clientName},

Nous avons le grand plaisir de vous informer que le tirage d'art, le montage final et la reliure de votre projet${catStr} sont désormais achevés et disponibles à notre atelier.

Vous pouvez venir retirer votre coffret à l'atelier ou consulter vos rendus finaux sur votre espace privé :
Lien Espace Privé : ${portalUrl}
${portalPin ? `Code PIN de sécurité : *${portalPin}*\n` : ""}${driveUrl ? `Téléchargement Haute Définition (Google Drive) :\n${driveUrl}\n` : ""}
N'hésitez pas à nous contacter pour convenir de l'horaire de votre passage.

*Lamha Studios Atelier*
https://lam7a.ma`
}

// ---------------------------------------------------------------------------
// 4. CONFIRMACIÓN AL CLIENTE TRAS ENVIAR SELECCIÓN
// ---------------------------------------------------------------------------
export function getSelectionReceivedClientWhatsApp({
  clientName,
  photosCount,
  language = "fr",
}: {
  clientName: string
  photosCount: number
  language?: string | null
}): string {
  const l = resolveLanguage(language)

  if (l === "ar") {
    return `*استوديو لمحة • تم استلام اختياركم بنجاح*

شكراً لك ${clientName}،

لقد تم استلام قائمة الصور التي اخترتموها بنجاح (${photosCount} صورة).
فريق المعالجة والمونتاج الفني في استوديو لمحة يبدأ الآن مرحلة التحسين والطباعة الفنية لألبومكم.

سنوافيكم بإشعار فور اكتمال التجهيز النهائي.

*استوديو لمحة • Lamha Studios*
https://lam7a.ma`
  }

  if (l === "en") {
    return `*Lamha Studios • Selection Successfully Received*

Thank you ${clientName},

We have safely received your final photo selection (${photosCount} photos).
Our atelier team has now commenced post-production, fine retouching, and book preparation.

We will notify you as soon as your collection is ready for delivery.

*Lamha Studios Atelier*
https://lam7a.ma`
  }

  if (l === "es") {
    return `*Lamha Studios • Selección Recibida con Éxito*

¡Muchas gracias ${clientName}!

Hemos recibido formalmente tu selección de ${photosCount} fotografías.
El equipo de retoque y encuadernación de Lamha Studios ha comenzado el proceso editorial para tu entrega final.

Te avisaremos en cuanto esté listo para entrega.

*Lamha Studios Atelier*
https://lam7a.ma`
  }

  // Français (Défaut)
  return `*Lamha Studios • Sélection Bien Reçue*

Merci beaucoup ${clientName},

Nous confirmons la bonne réception de votre sélection de ${photosCount} photographies.
Notre équipe de retouche et de reliure commence dès à présent le travail d'édition d'art sur vos clichés.

Nous vous informerons dès que votre commande sera prête pour la livraison finale.

*Lamha Studios Atelier*
https://lam7a.ma`
}

// ---------------------------------------------------------------------------
// 5. ALERTA INTERNA AL ESTUDIO (AFAF ELARIBI / EQUIPO)
// ---------------------------------------------------------------------------
export function getStudioSelectionAlertWhatsApp({
  clientName,
  photosCount,
  notesCount = 0,
  clientPhone,
}: {
  clientName: string
  photosCount: number
  notesCount?: number
  clientPhone?: string | null
}): string {
  return `*✦ ALERTA ATELIER: Nueva Selección de Cliente Enviada*

El cliente *${clientName}* acaba de validar y enviar su selección desde el Portal Privado.

📸 Fotografías elegidas: *${photosCount} fotos*
💬 Fotos con notas de retoque: *${notesCount}*
${clientPhone ? `📞 Teléfono: ${clientPhone}\n` : ""}
El proyecto ha avanzado a la etapa *Client Selection / Montaje*. Puedes consultarlo en el panel de administración:
https://admin.lam7a.ma/projects`
}
