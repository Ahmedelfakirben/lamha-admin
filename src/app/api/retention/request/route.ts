import { NextRequest, NextResponse } from "next/server"
import { createAdminClient, createClient } from "@/lib/supabase"

const COPY = {
  fr: {
    dir: "ltr",
    title: "Demande de Conservation Confirmée",
    subtitle: "Vos souvenirs sont protégés chez Lam7a Studios",
    message: (name: string) =>
      `Cher(e) <strong>${name}</strong>, nous avons bien enregistré votre demande de récupération pour vos fichiers originaux.`,
    shieldBadge: "🔒 Suppression Automatique Bloquée",
    details:
      "Votre dossier sur notre serveur QNAP a été immédiatement verrouillé. Aucun fichier ne sera supprimé et notre équipe vous enverra un nouveau lien de téléchargement très prochainement.",
    contactBtn: "Contacter l'Atelier sur WhatsApp",
    portalBtn: "Accéder au Portail Client",
    footer: "Atelier & Studio · Bojarah, Yedi Mavi, Tetouan, Morocco · 0539702927 / 0762517478",
  },
  es: {
    dir: "ltr",
    title: "Solicitud de Copia Confirmada",
    subtitle: "Tus recuerdos están protegidos en Lam7a Studios",
    message: (name: string) =>
      `Estimado/a <strong>${name}</strong>, hemos registrado correctamente tu solicitud para conservar y reenviar tus archivos originales.`,
    shieldBadge: "🔒 Eliminación Automática Bloqueada",
    details:
      "Tu carpeta en nuestro servidor QNAP ha quedado protegida inmediatamente. Ningún archivo será eliminado y nuestro equipo te enviará un nuevo enlace de descarga muy pronto.",
    contactBtn: "Contactar con el Estudio por WhatsApp",
    portalBtn: "Ir al Portal de Clientes",
    footer: "Atelier & Studio · Bojarah, Yedi Mavi, Tetouan, Morocco · 0539702927 / 0762517478",
  },
  en: {
    dir: "ltr",
    title: "Backup Copy Request Confirmed",
    subtitle: "Your memories are protected at Lam7a Studios",
    message: (name: string) =>
      `Dear <strong>${name}</strong>, we have successfully registered your request to keep and resend your original files.`,
    shieldBadge: "🔒 Automatic Deletion Blocked",
    details:
      "Your project folder on our QNAP server has been immediately locked. No files will be deleted, and our team will send you a fresh download link shortly.",
    contactBtn: "Contact Studio on WhatsApp",
    portalBtn: "Go to Client Portal",
    footer: "Atelier & Studio · Bojarah, Yedi Mavi, Tetouan, Morocco · 0539702927 / 0762517478",
  },
  ar: {
    dir: "rtl",
    title: "تم تأكيد طلب الاحتفاظ بالصور",
    subtitle: "ذكرياتكم محمية لدى أستوديو لمحة",
    message: (name: string) =>
      `عزيزي/عزيزتي <strong>${name}</strong>، لقد تم تسجيل طلبكم للاحتفاظ بالملفات الأصلية وإعادة إرسالها بنجاح.`,
    shieldBadge: "🔒 تم إيقاف الحذف التلقائي",
    details:
      "تم تأمين مجلد مشروعكم على خادم الأستوديو فوراً. لن يتم حذف أي ملف، وسيقوم فريقنا بإرسال رابط تحميل جديد لكم في أقرب وقت.",
    contactBtn: "تواصل مع الأستوديو عبر واتساب",
    portalBtn: "الدخول إلى بوابة العملاء",
    footer: "Atelier & Studio · Bojarah, Yedi Mavi, Tetouan, Morocco · 0539702927 / 0762517478",
  },
}

function getDb() {
  try {
    return createAdminClient()
  } catch {
    return createClient()
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get("session") || ""
  const rawLang = (searchParams.get("lang") || "fr").toLowerCase()
  const lang = (["fr", "es", "en", "ar"].includes(rawLang) ? rawLang : "fr") as keyof typeof COPY
  const t = COPY[lang]

  let clientName = "Client Lam7a"

  if (sessionId) {
    try {
      const supabase = getDb()
      const { data: session } = await supabase
        .from("sessions")
        .select("id, client_name, client_email, client_phone, tags")
        .eq("id", sessionId)
        .single()

      if (session) {
        clientName = session.client_name || clientName
        const currentTags: string[] = Array.isArray(session.tags) ? session.tags : []
        const filtered = currentTags.filter(
          (tg) => !String(tg).startsWith("retention:requested") && !String(tg).startsWith("retention:resent")
        )
        const nowTs = Date.now()
        const updatedTags = [...filtered, `retention:requested:${nowTs}`]

        await supabase
          .from("sessions")
          .update({ tags: updatedTags })
          .eq("id", session.id)

        // Registrar también en audit_logs para trazabilidad del proyecto y panel admin
        await supabase.from("audit_logs").insert({
          action: "CLIENT_RETENTION_REQUESTED",
          entity_type: "session",
          entity_id: session.id,
          entity_title: session.client_name,
          user_name: session.client_name || "Client",
          user_email: session.client_email || "client@lam7a.ma",
          user_role: "client",
          details: {
            requested_at: new Date(nowTs).toISOString(),
            client_phone: session.client_phone || "",
            client_email: session.client_email || "",
            qnap_hold: true,
          },
        })
      }
    } catch (err) {
      console.error("[RETENTION_REQUEST_ERR]:", err)
    }
  }

  const html = `<!DOCTYPE html>
<html lang="${lang}" dir="${t.dir}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${t.title} — Lam7a Studios</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0b0a09;
      color: #f5f2eb;
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      max-width: 540px;
      width: 100%;
      background: #141210;
      border: 1px solid #2e261f;
      border-radius: 20px;
      padding: 40px 32px;
      text-align: center;
      box-shadow: 0 25px 60px rgba(0,0,0,0.65);
    }
    .logo {
      width: 155px;
      height: auto;
      margin: 0 auto 24px;
      display: block;
    }
    .badge {
      display: inline-block;
      background: rgba(16, 185, 129, 0.14);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.35);
      padding: 7px 16px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 18px;
    }
    h1 {
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 24px;
      color: #f5f2eb;
      margin-bottom: 8px;
    }
    .sub {
      font-size: 13px;
      color: #c69f68;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-bottom: 22px;
    }
    .msg {
      font-size: 15px;
      line-height: 1.65;
      color: #ded8ce;
      margin-bottom: 16px;
    }
    .details {
      font-size: 13.5px;
      line-height: 1.6;
      color: #a89f91;
      background: #0d0c0a;
      border: 1px solid #241f1a;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 26px;
    }
    .actions {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .btn-gold {
      display: block;
      text-decoration: none;
      background: linear-gradient(135deg, #d4af7a, #b88c4a);
      color: #0b0a09;
      font-weight: 700;
      font-size: 14px;
      padding: 13px 20px;
      border-radius: 12px;
    }
    .btn-outline {
      display: block;
      text-decoration: none;
      background: #1b1714;
      color: #d4cbbf;
      border: 1px solid #332b22;
      font-weight: 600;
      font-size: 13px;
      padding: 11px 18px;
      border-radius: 12px;
    }
    .footer {
      margin-top: 28px;
      padding-top: 18px;
      border-top: 1px solid #221d18;
      font-size: 11px;
      color: #70665a;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="card">
    <img src="https://admin.lam7a.ma/assets/logo/admin-brand-logo.png" alt="Lam7a Studios" class="logo" />
    <div class="badge">${t.shieldBadge}</div>
    <h1>${t.title}</h1>
    <div class="sub">${t.subtitle}</div>
    <p class="msg">${t.message(clientName)}</p>
    <div class="details">${t.details}</div>
    <div class="actions">
      <a href="https://wa.me/212762517478" class="btn-gold">${t.contactBtn}</a>
      <a href="https://lam7a.ma" class="btn-outline">${t.portalBtn}</a>
    </div>
    <div class="footer">${t.footer}</div>
  </div>
</body>
</html>`

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  })
}

