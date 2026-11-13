export type WhatsAppLanguage = "fr" | "ar" | "en" | "es"
export type WhatsAppTemplateKey = "welcome" | "photos_ready" | "selection_confirmed" | "ready_delivery"

export interface SingleWhatsAppTemplateConfig {
  key: WhatsAppTemplateKey
  enabled: boolean
  translations: Record<WhatsAppLanguage, string>
}

export interface WhatsAppAutomationSettings {
  updatedAt: string
  templates: Record<WhatsAppTemplateKey, SingleWhatsAppTemplateConfig>
}

export const DEFAULT_WHATSAPP_TEMPLATES_I18N: Record<WhatsAppTemplateKey, Record<WhatsAppLanguage, string>> = {
  welcome: {
    fr: `*Lam7a Studios • Confirmation de Réservation*

Bonjour {{client_name}},

Nous avons l'honneur de vous confirmer l'enregistrement de votre projet chez *Lam7a Studios* ({{category}}).
Date programmée : *{{session_date}}*{{session_time_line}}

Votre suite privée est d'ores et déjà accessible sur notre portail officiel :
Lien d'accès : {{portal_url}}
{{client_email_line}}{{portal_pin_line}}
Notre équipe artistique prépare votre séance avec le plus grand soin. Pour toute question, vous pouvez répondre directement à ce message.

*Lam7a Studios Atelier*
https://lam7a.ma`,
    ar: `*استوديو لمحة • تأكيد حجز المشروع*

أهلاً وسهلاً بك {{client_name}}،

يسعدنا تأكيد تسجيل مشروعكم الفني في *استوديو لمحة* ({{category}}).
الموعد المحدد للجلسة: *{{session_date}}*{{session_time_line}}

تم إنشاء مساحتكم الخاصة على موقعنا الرسمي:
الرابط المباشر: {{portal_url}}
{{client_email_line}}{{portal_pin_line}}
فريقنا الفني يتطلع للقائكم وتقديم تجربة تصوير استثنائية. لأي استفسار يمكنكم الرد مباشرة على هذه المحادثة.

*استوديو لمحة • Lam7a Studios*
https://lam7a.ma`,
    es: `*Lam7a Studios • Confirmación de Proyecto*

Hola {{client_name}},

Es un placer darte la bienvenida a *Lam7a Studios* y confirmar el registro de tu proyecto ({{category}}).
Fecha programada: *{{session_date}}*{{session_time_line}}

Hemos preparado tu Suite Privada en nuestro portal oficial:
Acceso directo: {{portal_url}}
{{client_email_line}}{{portal_pin_line}}
Nuestro equipo artístico está preparando todo para tu sesión. Si tienes cualquier consulta, puedes responder directamente a este mensaje.

*Lam7a Studios Atelier*
https://lam7a.ma`,
    en: `*Lam7a Studios • Project Confirmation*

Hello {{client_name}},

We are delighted to confirm your booking with *Lam7a Studios* ({{category}}).
Scheduled Date: *{{session_date}}*{{session_time_line}}

Your private client suite has been set up on our official portal:
Access Link: {{portal_url}}
{{client_email_line}}{{portal_pin_line}}
Our creative team is looking forward to capturing your timeless memories. If you have any questions, feel free to reply directly to this message.

*Lam7a Studios Atelier*
https://lam7a.ma`,
  },
  photos_ready: {
    fr: `*Lam7a Studios • Espace Privé Prêt*

Bonjour {{client_name}},

Nous avons le plaisir de vous annoncer que {{photos_count}} de votre séance sont désormais calibrées et prêtes pour votre sélection.

Accédez à votre Suite Privée pour visionner et choisir vos photographies pour l'album :
Lien direct : {{portal_url}}
Identifiant Email : {{client_email}}
Code PIN de sécurité : *{{portal_pin}}*
{{drive_url_block}}
Nous espérons que vous prendrez autant de plaisir à les découvrir que nous en avons eu à les capturer.

*Lam7a Studios Atelier*
https://lam7a.ma`,
    ar: `*استوديو لمحة • مساحتكم الخاصة جاهزة*

مرحباً {{client_name}}،

يسعدنا إعلامكم بأن {{photos_count}} أصبحت جاهزة ومعالجة في استوديو لمحة.

بإمكانكم الآن الدخول لمعاينة واختيار صوركم المفضلة للألبوم عبر بوابتكم الخاصة:
رابط البوابة: {{portal_url}}
البريد الإلكتروني: {{client_email}}
رمز الأمان السري (PIN): *{{portal_pin}}*
{{drive_url_block}}
نتمنى لكم وقتاً ممتعاً في استرجاع هذه اللحظات المميزة.

*استوديو لمحة • Lam7a Studios*
https://lam7a.ma`,
    es: `*Lam7a Studios • Espace Privé Listo*

Hola {{client_name}},

Nos complace informarte que {{photos_count}} de tu reportaje ya están calibradas y listas para ti en Lam7a Studios.

Accede a tu Suite Privada para ver y seleccionar tus fotografías favoritas para el álbum:
Acceso directo: {{portal_url}}
Correo: {{client_email}}
Código PIN: *{{portal_pin}}*
{{drive_url_block}}
Esperamos de corazón que disfrutes reviviendo estos instantes inolvidables.

*Lam7a Studios Atelier*
https://lam7a.ma`,
    en: `*Lam7a Studios • Private Suite Ready*

Hello {{client_name}},

We are thrilled to let you know that {{photos_count}} have been calibrated and are now available for your private viewing.

Access your Private Space to view and select your favorites for the final album:
Direct Access: {{portal_url}}
Login Email: {{client_email}}
Security PIN: *{{portal_pin}}*
{{drive_url_block}}
We hope you enjoy reliving these precious moments.

*Lam7a Studios Atelier*
https://lam7a.ma`,
  },
  selection_confirmed: {
    fr: `*Lam7a Studios • Sélection Bien Reçue*

Merci beaucoup {{client_name}},

Nous confirmons la bonne réception de votre sélection de {{photos_count}} photographies.
Notre équipe de retouche et de reliure commence dès à présent le travail d'édition d'art sur vos clichés.

Nous vous informerons dès que votre commande sera prête.

*Lam7a Studios Atelier*
https://lam7a.ma`,
    ar: `*استوديو لمحة • تم استلام اختياركم بنجاح*

شكراً لك {{client_name}}،

لقد تم استلام قائمة الصور التي اخترتموها بنجاح ({{photos_count}} صورة).
فريق المعالجة والمونتاج الفني في استوديو لمحة يبدأ الآن مرحلة التحسين والطباعة الفنية لألبومكم.

سنوافيكم بإشعار فور اكتمال التجهيز النهائي.

*استوديو لمحة • Lam7a Studios*
https://lam7a.ma`,
    es: `*Lam7a Studios • Selección Recibida con Éxito*

¡Muchas gracias {{client_name}}!

Hemos recibido formalmente tu selección de {{photos_count}} fotografías.
El equipo de retoque y encuadernación de Lam7a Studios ha comenzado el proceso editorial para tu entrega final.

Te avisaremos en cuanto esté listo para entrega.

*Lam7a Studios Atelier*
https://lam7a.ma`,
    en: `*Lam7a Studios • Selection Successfully Received*

Thank you {{client_name}},

We have safely received your final photo selection ({{photos_count}} photos).
Our atelier team has now commenced post-production, fine retouching, and book preparation.

We will notify you as soon as your collection is ready for delivery.

*Lam7a Studios Atelier*
https://lam7a.ma`,
  },
  ready_delivery: {
    fr: `*Lam7a Studios • Vos Photos & Coffret sont Prêts à l'Atelier*

Cher/Chère {{client_name}},

Nous avons le grand plaisir de vous informer que le tirage d'art, le montage final et la reliure de votre projet ({{category}}) sont désormais achevés et disponibles à notre atelier.

Vous pouvez venir retirer votre coffret à l'atelier ou consulter vos rendus finaux sur votre espace privé :
Lien Espace Privé : {{portal_url}}
{{portal_pin_line}}{{drive_url_block}}
N'hésitez pas à nous contacter pour convenir de l'horaire de votre passage.

*Lam7a Studios Atelier*
https://lam7a.ma`,
    ar: `*استوديو لمحة • طلبكم جاهز للاستلام*

عزيزنا/عزيزتنا {{client_name}}،

يسعدنا إبلاغكم بأن أعمال المونتاج، الطباعة الفنية وتجهيز الصور لمشروعكم ({{category}}) أصبحت جاهزة تماماً في استوديو لمحة.

يمكنكم الآن الحضور إلى الاستوديو لاستلام ألبومكم الفني أو الرجوع للبوابة الخاصة لمشاهدة التسليم النهائي:
رابط البوابة: {{portal_url}}
{{portal_pin_line}}{{drive_url_block}}
يسعدنا تواصلكم لتأكيد موعد استلامكم.

*استوديو لمحة • Lam7a Studios*
https://lam7a.ma`,
    es: `*Lam7a Studios • Tu Pedido está Listo en el Estudio*

Estimado/a {{client_name}},

Tenemos el placer de anunciarte que el montaje final, las ampliaciones y tu álbum fotográfico ({{category}}) ya están completamente finalizados en nuestro atelier.

Puedes pasar por el estudio a recoger tu entrega física o consultar tu galería final en el portal:
Acceso al portal: {{portal_url}}
{{portal_pin_line}}{{drive_url_block}}
Por favor, confírmanos cuándo te gustaría pasar a recogerlo.

*Lam7a Studios Atelier*
https://lam7a.ma`,
    en: `*Lam7a Studios • Your Master Collection is Ready*

Dear {{client_name}},

We are delighted to announce that your finished artworks, luxury prints, and final edits ({{category}}) are complete and ready for you at our studio.

You are welcome to visit our atelier for physical collection or review your final delivery on your portal:
Client Portal: {{portal_url}}
{{portal_pin_line}}{{drive_url_block}}
Please contact us to coordinate your pickup time.

*Lam7a Studios Atelier*
https://lam7a.ma`,
  },
}

export function getDefaultWhatsAppAutomationSettings(): WhatsAppAutomationSettings {
  return {
    updatedAt: new Date().toISOString(),
    templates: {
      welcome: {
        key: "welcome",
        enabled: true,
        translations: JSON.parse(JSON.stringify(DEFAULT_WHATSAPP_TEMPLATES_I18N.welcome)),
      },
      photos_ready: {
        key: "photos_ready",
        enabled: true,
        translations: JSON.parse(JSON.stringify(DEFAULT_WHATSAPP_TEMPLATES_I18N.photos_ready)),
      },
      selection_confirmed: {
        key: "selection_confirmed",
        enabled: true,
        translations: JSON.parse(JSON.stringify(DEFAULT_WHATSAPP_TEMPLATES_I18N.selection_confirmed)),
      },
      ready_delivery: {
        key: "ready_delivery",
        enabled: true,
        translations: JSON.parse(JSON.stringify(DEFAULT_WHATSAPP_TEMPLATES_I18N.ready_delivery)),
      },
    },
  }
}

export function renderWhatsAppMessageTemplate({
  templateText,
  language = "fr",
  data,
}: {
  templateText: string
  language?: WhatsAppLanguage
  data: {
    clientName: string
    sessionDate?: string | null
    sessionTime?: string | null
    category?: string | null
    portalPin?: string | null
    clientEmail?: string | null
    driveUrl?: string | null
    photosCount?: number | null
  }
}): string {
  const portalBaseUrl = "https://lam7a.ma/portal"
  const portalUrl = data.clientEmail && data.portalPin 
    ? `${portalBaseUrl}?pin=${data.portalPin}&email=${encodeURIComponent(data.clientEmail)}`
    : portalBaseUrl

  const isAr = language === "ar"
  const isEn = language === "en"
  const isEs = language === "es"

  const timeLine = data.sessionTime
    ? isAr
      ? ` • الساعة: *${data.sessionTime}*`
      : isEn
      ? ` at *${data.sessionTime}*`
      : isEs
      ? ` a las *${data.sessionTime}*`
      : ` à *${data.sessionTime}*`
    : ""

  const emailLine = data.clientEmail
    ? isAr
      ? `البريد الإلكتروني: ${data.clientEmail}\n`
      : isEn
      ? `Login Email: ${data.clientEmail}\n`
      : isEs
      ? `Correo: ${data.clientEmail}\n`
      : `Identifiant Email : ${data.clientEmail}\n`
    : ""

  const pinLine = data.portalPin
    ? isAr
      ? `رمز الأمان (PIN): *${data.portalPin}*\n`
      : isEn
      ? `Security PIN: *${data.portalPin}*\n`
      : isEs
      ? `Código PIN de seguridad: *${data.portalPin}*\n`
      : `Code PIN de sécurité : *${data.portalPin}*\n`
    : ""

  const driveBlock = data.driveUrl
    ? isAr
      ? `\nلتحميل كافة الصور بجودتها وحجمها الأصلي عبر Google Drive:\n${data.driveUrl}\n`
      : isEn
      ? `\nDownload all original full-resolution files directly via Google Drive:\n${data.driveUrl}\n`
      : isEs
      ? `\nDescarga todos los archivos originales en su tamaño real desde Google Drive:\n${data.driveUrl}\n`
      : `\nTélécharger l'ensemble des fichiers originaux en pleine résolution sur Google Drive :\n${data.driveUrl}\n`
    : ""

  let countFormatted = "vos photos"
  if (data.photosCount) {
    countFormatted = isAr ? `${data.photosCount} صورة` : isEn ? `${data.photosCount} photos` : isEs ? `${data.photosCount} fotos` : `${data.photosCount} photos`
  }

  let text = templateText
    .replace(/\{\{client_name\}\}/g, data.clientName || "")
    .replace(/\{\{session_date\}\}/g, data.sessionDate || (isAr ? "يحدد لاحقاً" : isEn ? "TBD" : isEs ? "A convenir" : "à convenir"))
    .replace(/\{\{session_time\}\}/g, data.sessionTime || "")
    .replace(/\{\{session_time_line\}\}/g, timeLine)
    .replace(/\{\{category\}\}/g, data.category || "Studio")
    .replace(/\{\{portal_url\}\}/g, portalUrl)
    .replace(/\{\{portal_pin\}\}/g, data.portalPin || "")
    .replace(/\{\{portal_pin_line\}\}/g, pinLine)
    .replace(/\{\{client_email\}\}/g, data.clientEmail || "")
    .replace(/\{\{client_email_line\}\}/g, emailLine)
    .replace(/\{\{drive_url\}\}/g, data.driveUrl || "")
    .replace(/\{\{drive_url_block\}\}/g, driveBlock)
    .replace(/\{\{photos_count\}\}/g, countFormatted)

  return text
}
