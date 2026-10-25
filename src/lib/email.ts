import nodemailer from "nodemailer"
import { 
  renderWelcomeEmail, 
  renderPhotosReadyEmail, 
  renderReadyForDeliveryEmail, 
  renderSelectionConfirmedEmail 
} from "./email-templates"

export interface SmtpConfig {
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
  fromName: string
  fromEmail: string
}

export function getSmtpConfig(): SmtpConfig {
  return {
    host: process.env.SMTP_HOST || "smtp.office365.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    fromName: process.env.SMTP_FROM_NAME || "Lamha Studios",
    fromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || "contact@lamhastudios.ma",
  }
}

export function isEmailConfigured(): boolean {
  const config = getSmtpConfig()
  return Boolean(config.user && config.pass)
}

function createTransporter() {
  const config = getSmtpConfig()
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure, // false for 587 (STARTTLS)
    auth: {
      user: config.user,
      pass: config.pass,
    },
    tls: {
      ciphers: "SSLv3",
      rejectUnauthorized: false, // Prevents self-signed or proxy TLS issues
    },
  })
}

/**
 * Envía el correo de bienvenida y confirmación de reserva al crear el proyecto
 */
export async function sendWelcomeEmailNotification(params: {
  clientName: string
  clientEmail: string
  sessionDate?: string | null
  category?: string | null
  sessionType?: string | null
  notes?: string | null
  language?: string
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    if (!params.clientEmail) {
      return { success: false, error: "El cliente no tiene correo electrónico configurado." }
    }

    if (!isEmailConfigured()) {
      console.warn("[EMAIL_WARN] Variables SMTP de Microsoft Exchange no configuradas en .env.local")
      return { 
        success: false, 
        error: "Servidor de correo Microsoft Exchange no configurado. Configure SMTP_USER y SMTP_PASS en .env.local" 
      }
    }

    const config = getSmtpConfig()
    const { subject, html, text } = renderWelcomeEmail({
      clientName: params.clientName,
      sessionDate: params.sessionDate,
      category: params.category,
      sessionType: params.sessionType,
      notes: params.notes,
      studioEmail: config.fromEmail,
      language: params.language,
    })

    const transporter = createTransporter()
    const info = await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: params.clientEmail,
      subject,
      text,
      html,
    })

    console.log(`[EMAIL_SUCCESS] Correo de bienvenida enviado a ${params.clientEmail}. ID: ${info.messageId}`)
    return { success: true, messageId: info.messageId }
  } catch (err: any) {
    console.error("[EMAIL_ERROR] Error enviando correo de bienvenida:", err)
    return { success: false, error: err?.message || "Error al enviar el correo con Microsoft Exchange." }
  }
}

/**
 * Envía la notificación de fotos listas con credenciales, PIN e instrucciones de selección y Google Drive
 */
export async function sendPhotosReadyNotification(params: {
  clientName: string
  clientEmail: string
  portalPin: string
  driveFolderUrl?: string | null
  photosCount?: number
  language?: string
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    if (!params.clientEmail) {
      return { success: false, error: "El cliente no tiene un correo electrónico registrado." }
    }

    if (!params.portalPin) {
      return { success: false, error: "Este proyecto no tiene un Código PIN de acceso configurado." }
    }

    if (!isEmailConfigured()) {
      console.warn("[EMAIL_WARN] Variables SMTP de Microsoft Exchange no configuradas en .env.local")
      return { 
        success: false, 
        error: "Servidor de correo Microsoft Exchange no configurado. Configure SMTP_USER y SMTP_PASS en .env.local" 
      }
    }

    const config = getSmtpConfig()
    const portalBaseUrl = process.env.NEXT_PUBLIC_CLIENT_PORTAL_URL || "https://lam7a.ma/portal"

    const { subject, html, text } = renderPhotosReadyEmail({
      clientName: params.clientName,
      portalUrl: portalBaseUrl,
      clientEmail: params.clientEmail,
      portalPin: params.portalPin,
      driveFolderUrl: params.driveFolderUrl,
      photosCount: params.photosCount,
      studioEmail: config.fromEmail,
      language: params.language,
    })

    const transporter = createTransporter()
    const info = await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: params.clientEmail,
      subject,
      text,
      html,
    })

    console.log(`[EMAIL_SUCCESS] Correo de fotos listas enviado a ${params.clientEmail}. ID: ${info.messageId}`)
    return { success: true, messageId: info.messageId }
  } catch (err: any) {
    console.error("[EMAIL_ERROR] Error enviando correo de fotos listas:", err)
    return { success: false, error: err?.message || "Error al enviar el correo con Microsoft Exchange." }
  }
}

/**
 * Envía la notificación de proyecto listo para entrega final / recogida en estudio
 */
export async function sendReadyForDeliveryNotification(params: {
  clientName: string
  clientEmail: string
  category?: string | null
  portalPin?: string | null
  driveFolderUrl?: string | null
  language?: string
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    if (!params.clientEmail) {
      return { success: false, error: "El cliente no tiene correo electrónico configurado." }
    }

    if (!isEmailConfigured()) {
      console.warn("[EMAIL_WARN] Variables SMTP de Microsoft Exchange no configuradas en .env.local")
      return { 
        success: false, 
        error: "Servidor de correo Microsoft Exchange no configurado. Configure SMTP_USER y SMTP_PASS en .env.local" 
      }
    }

    const config = getSmtpConfig()
    const portalBaseUrl = process.env.NEXT_PUBLIC_CLIENT_PORTAL_URL || "https://lam7a.ma/portal"

    const { subject, html, text } = renderReadyForDeliveryEmail({
      clientName: params.clientName,
      category: params.category,
      portalUrl: portalBaseUrl,
      clientEmail: params.clientEmail,
      portalPin: params.portalPin,
      driveFolderUrl: params.driveFolderUrl,
      studioEmail: config.fromEmail,
      language: params.language,
    })

    const transporter = createTransporter()
    const info = await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: params.clientEmail,
      subject,
      text,
      html,
    })

    console.log(`[EMAIL_SUCCESS] Correo Ready for Delivery enviado a ${params.clientEmail}. ID: ${info.messageId}`)
    return { success: true, messageId: info.messageId }
  } catch (err: any) {
    console.error("[EMAIL_ERROR] Error enviando correo Ready for Delivery:", err)
    return { success: false, error: err?.message || "Error al enviar el correo con Microsoft Exchange." }
  }
}

/**
 * Envía la confirmación al cliente tras enviar su selección en el portal
 */
export async function sendSelectionConfirmedNotification(params: {
  clientName: string
  clientEmail: string
  photosCount: number
  notesCount?: number
  portalPin?: string | null
  language?: string
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    if (!params.clientEmail) {
      return { success: false, error: "El cliente no tiene correo electrónico configurado." }
    }

    if (!isEmailConfigured()) {
      console.warn("[EMAIL_WARN] Variables SMTP de Microsoft Exchange no configuradas en .env.local")
      return { 
        success: false, 
        error: "Servidor de correo Microsoft Exchange no configurado. Configure SMTP_USER y SMTP_PASS en .env.local" 
      }
    }

    const config = getSmtpConfig()
    const portalBaseUrl = process.env.NEXT_PUBLIC_CLIENT_PORTAL_URL || "https://lam7a.ma/portal"

    const { subject, html, text } = renderSelectionConfirmedEmail({
      clientName: params.clientName,
      photosCount: params.photosCount,
      notesCount: params.notesCount,
      portalUrl: portalBaseUrl,
      clientEmail: params.clientEmail,
      portalPin: params.portalPin,
      studioEmail: config.fromEmail,
      language: params.language,
    })

    const transporter = createTransporter()
    const info = await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: params.clientEmail,
      subject,
      text,
      html,
    })

    console.log(`[EMAIL_SUCCESS] Correo de confirmación de selección enviado a ${params.clientEmail}. ID: ${info.messageId}`)
    return { success: true, messageId: info.messageId }
  } catch (err: any) {
    console.error("[EMAIL_ERROR] Error enviando correo de confirmación de selección:", err)
    return { success: false, error: err?.message || "Error al enviar el correo con Microsoft Exchange." }
  }
}

/**
 * Prueba de conexión diagnóstica con Microsoft Exchange
 */
export async function testExchangeSmtpConnection(): Promise<{ success: boolean; message: string }> {
  try {
    if (!isEmailConfigured()) {
      return { success: false, message: "SMTP_USER o SMTP_PASS no están configurados en .env.local." }
    }
    const transporter = createTransporter()
    await transporter.verify()
    return { success: true, message: "Conexión con Microsoft Exchange exitosa." }
  } catch (err: any) {
    return { success: false, message: `Fallo de conexión Exchange: ${err?.message || err}` }
  }
}
