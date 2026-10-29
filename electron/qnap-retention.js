/**
 * Lam7a Studios — Ciclo de vida del QNAP (RAID 1) con preaviso al cliente.
 *
 * Flujo:
 *  1. Mide lo que ocupan los proyectos en el QNAP (FTP).
 *  2. Si supera el umbral configurado, elige los proyectos ENTREGADOS más antiguos hasta sumar el volumen a liberar.
 *  3. Avisa al cliente (Email + WhatsApp) con un botón de 1 clic para solicitar copia. NO borra nada todavía.
 *  4. Pasados N días (configurable) borra en el QNAP SOLO los proyectos sin solicitud del cliente ni bloqueo VIP.
 *
 * Seguridad: solo toca carpetas vinculadas a una sesión en estado "delivered". Nunca toca el SSD local.
 * Estado persistente en Supabase (tags de sessions: retention:notified|requested|resent|vip_lock|purged:<ts>).
 */
const EventEmitter = require("events")
const { getConfig } = require("./config")
const engine = require("./ingest-engine")

const TB = 1024 ** 4
const DAY_MS = 24 * 60 * 60 * 1000
const FINALS_FOLDER = "04_Entregas_Finales"

function normalizeToken(val) {
  return String(val || "")
    .trim()
    .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]/g, "_")
    .toLowerCase()
}

function isDelivered(status) {
  const s = String(status || "").trim().toLowerCase()
  return s === "delivered" || s === "entregado" || s === "livré" || s === "livre"
}

function tagTs(tags, prefix) {
  const found = (tags || []).find((t) => String(t).startsWith(prefix + ":"))
  if (!found) return null
  const ts = Number(String(found).split(":")[2])
  return Number.isFinite(ts) && ts > 0 ? ts : Date.now()
}

function hasTag(tags, prefix) {
  return (tags || []).some((t) => String(t).startsWith(prefix + ":") || t === prefix)
}

function stripTags(tags, prefixes) {
  return (tags || []).filter((t) => !prefixes.some((p) => String(t).startsWith(p)))
}

function matchSession(folderName, sessions) {
  const lower = folderName.toLowerCase()
  const dateInFolder = folderName.split("_").find((p) => /^\d{4}-\d{2}-\d{2}$/.test(p)) || null
  for (const s of sessions) {
    const cleanDate = String(s.session_date || "").replace(/[^0-9-]/g, "")
    const nonPlace = Array.isArray(s.tags) ? s.tags.find((tg) => tg && !String(tg).toLowerCase().startsWith("place:") && !/^(stage|retention):/i.test(String(tg))) : null
    const proj = normalizeToken(nonPlace || s.subcategory || s.category || "Sesion")
    if (lower === `${cleanDate}_${normalizeToken(s.client_name || "Cliente")}_${proj}`) return s
  }
  if (dateInFolder) {
    const hit = sessions.find((s) => {
      if (s.session_date !== dateInFolder) return false
      const tok = normalizeToken(s.client_name)
      return tok && lower.includes(tok)
    })
    if (hit) return hit
  }
  return null // nunca se actúa sobre carpetas no vinculadas con certeza
}

// ---------------------------------------------------------------------------
// Textos de aviso (4 idiomas)
// ---------------------------------------------------------------------------
function noticeCopy(lang, v) {
  const keep = v.keepFinals
  const C = {
    fr: {
      subject: `Vos fichiers originaux seront supprimés de notre serveur dans ${v.days} jours`,
      title: `Information importante, ${v.name}`,
      intro: `Afin de libérer de l'espace sur notre serveur de stockage, les fichiers de votre projet « ${v.category} » du ${v.date} seront supprimés de notre serveur le ${v.deadline}.`,
      body: keep
        ? "Seuls les fichiers originaux lourds (RAW et vidéos) sont concernés : vos photos finales éditées restent conservées."
        : "L'ensemble des fichiers de ce projet (originaux et éditions) sera supprimé du serveur.",
      ask: "Vous souhaitez recevoir une copie de vos fichiers avant cette date ? Un simple clic suffit : nous bloquons la suppression et vous envoyons vos fichiers.",
      cta: "Demander une copie de mes fichiers",
      wa: `⚠️ *Lam7a Studios — Information importante*\n\nBonjour *${v.name}*,\nLes fichiers de votre projet *${v.category}* (${v.date}) seront supprimés de notre serveur dans *${v.days} jours* (${v.deadline}).\n\nSouhaitez-vous recevoir une copie ? Cliquez ici pour bloquer la suppression et recevoir vos fichiers :\n${v.link}\n\n_L'équipe Lam7a Studios_ 📸`,
    },
    es: {
      subject: `Tus archivos originales se eliminarán de nuestro servidor en ${v.days} días`,
      title: `Información importante, ${v.name}`,
      intro: `Para liberar espacio en nuestro servidor de almacenamiento, los archivos de tu proyecto «${v.category}» del ${v.date} se eliminarán de nuestro servidor el ${v.deadline}.`,
      body: keep
        ? "Solo afecta a los archivos originales pesados (RAW y vídeos): tus fotos finales editadas se conservan."
        : "Se eliminarán todos los archivos de este proyecto del servidor (originales y ediciones).",
      ask: "¿Quieres recibir una copia de tus archivos antes de esa fecha? Basta un clic: bloqueamos el borrado y te enviamos tus archivos.",
      cta: "Solicitar copia de mis archivos",
      wa: `⚠️ *Lam7a Studios — Información importante*\n\nHola *${v.name}*,\nLos archivos de tu proyecto *${v.category}* (${v.date}) se eliminarán de nuestro servidor en *${v.days} días* (${v.deadline}).\n\n¿Quieres recibir una copia? Pulsa aquí para bloquear el borrado y recibir tus archivos:\n${v.link}\n\n_El equipo de Lam7a Studios_ 📸`,
    },
    en: {
      subject: `Your original files will be removed from our server in ${v.days} days`,
      title: `Important notice, ${v.name}`,
      intro: `To free up space on our storage server, the files of your "${v.category}" project from ${v.date} will be removed from our server on ${v.deadline}.`,
      body: keep
        ? "Only the heavy original files (RAW and videos) are affected: your final edited photos are kept."
        : "All files of this project (originals and edits) will be removed from the server.",
      ask: "Would you like a copy of your files before that date? Just one click: we block the deletion and send you your files.",
      cta: "Request a copy of my files",
      wa: `⚠️ *Lam7a Studios — Important notice*\n\nHello *${v.name}*,\nThe files of your *${v.category}* project (${v.date}) will be removed from our server in *${v.days} days* (${v.deadline}).\n\nWould you like a copy? Click here to block the deletion and receive your files:\n${v.link}\n\n_The Lam7a Studios Team_ 📸`,
    },
    ar: {
      subject: `سيتم حذف ملفاتكم الأصلية من خادمنا خلال ${v.days} أيام`,
      title: `إشعار هام، ${v.name}`,
      intro: `لتحرير مساحة على خادم التخزين لدينا، سيتم حذف ملفات مشروعكم «${v.category}» بتاريخ ${v.date} من خادمنا بتاريخ ${v.deadline}.`,
      body: keep
        ? "يشمل ذلك فقط الملفات الأصلية الثقيلة (RAW والفيديو): تبقى صوركم النهائية المعدّلة محفوظة."
        : "سيتم حذف جميع ملفات هذا المشروع (الأصلية والمعدّلة) من الخادم.",
      ask: "هل ترغبون في الحصول على نسخة من ملفاتكم قبل هذا التاريخ؟ نقرة واحدة تكفي: نوقف الحذف ونرسل لكم ملفاتكم.",
      cta: "طلب نسخة من ملفاتي",
      wa: `⚠️ *استوديو لمحة — إشعار هام*\n\nمرحباً *${v.name}*،\nسيتم حذف ملفات مشروعكم *${v.category}* (${v.date}) من خادمنا خلال *${v.days} أيام* (${v.deadline}).\n\nهل ترغبون في نسخة؟ اضغطوا هنا لإيقاف الحذف واستلام ملفاتكم:\n${v.link}\n\n_فريق استوديو لمحة_ 📸`,
    },
  }
  return C[lang] || C.fr
}

function buildNoticeHtml(lang, v) {
  const t = noticeCopy(lang, v)
  const rtl = lang === "ar"
  const dir = rtl ? "rtl" : "ltr"
  const align = rtl ? "right" : "left"
  const logo = "https://admin.lam7a.ma/assets/logo/admin-brand-logo.png"
  return {
    subject: t.subject,
    html: `<!DOCTYPE html><html lang="${lang}" dir="${dir}"><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background-color:#0c0a09;color:#f5f5f4;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0c0a09;padding:40px 16px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#141210;border:1px solid #292524;border-radius:16px;overflow:hidden;">
<tr><td style="padding:36px 32px 24px;text-align:center;border-bottom:1px solid #292524;"><img src="${logo}" alt="Lam7a Studios" width="165" style="display:block;margin:0 auto;max-width:165px;height:auto;"/></td></tr>
<tr><td style="padding:32px;text-align:${align};direction:${dir};">
<h1 style="margin:0 0 16px;font-size:22px;font-weight:600;color:#fafaf9;">${t.title}</h1>
<p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#d6d3d1;">${t.intro}</p>
<p style="margin:0 0 14px;font-size:14px;line-height:1.7;color:#a8a29e;">${t.body}</p>
<p style="margin:0 0 22px;font-size:15px;line-height:1.7;color:#d6d3d1;">${t.ask}</p>
<div style="text-align:center;margin-top:24px;"><a href="${v.link}" target="_blank" style="display:inline-block;padding:14px 30px;background:linear-gradient(135deg,#d6b36a 0%,#b89146 100%);color:#0c0a09;font-weight:700;font-size:14px;text-decoration:none;border-radius:10px;">${t.cta}</a></div>
</td></tr>
<tr><td style="padding:24px 30px 28px;background-color:#0c0a09;border-top:1px solid #292524;text-align:center;">
<p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#c69f68;letter-spacing:1.5px;text-transform:uppercase;">Atelier &amp; Studio</p>
<p style="margin:0 0 10px;font-size:12px;color:#d6d0c7;">Bojarah, Yedi Mavi, Tetouan, Morocco</p>
<p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#9c8e7f;letter-spacing:1px;text-transform:uppercase;">Téléphones Officiels</p>
<p style="margin:0;font-size:13px;color:#f5f2eb;font-weight:600;">0539702927 / 0762517478</p>
</td></tr></table></td></tr></table></body></html>`,
    wa: t.wa,
  }
}

// ---------------------------------------------------------------------------
class QnapRetentionManager extends EventEmitter {
  constructor() {
    super()
    this.timer = null
    this.busy = false
    this.lastScan = null // { at, projects:[], usedBytes }
    this.lastRun = null
  }

  start() {
    this.stop()
    this.timer = setInterval(() => this.runCycle({ auto: true }).catch(() => {}), 30 * 60 * 1000)
    setTimeout(() => this.runCycle({ auto: true }).catch(() => {}), 90 * 1000)
  }

  stop() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  async _ftp() {
    const cfg = getConfig()
    const ftp = require("basic-ftp")
    const client = new ftp.Client(20000)
    await client.access({ host: cfg.nasHost, user: cfg.nasUser, password: cfg.nasPassword, port: 21 })
    return client
  }

  /** Mide el QNAP: tamaño por proyecto y cuánto ocupan los 04_Entregas_Finales. */
  async scanUsage({ force = false } = {}) {
    if (!force && this.lastScan && Date.now() - this.lastScan.at < 20 * 60 * 1000) return this.lastScan
    const cfg = getConfig()
    if (!cfg.nasHost || !cfg.nasPassword) return { ok: false, error: "NAS_NOT_CONFIGURED" }
    let client
    try {
      client = await this._ftp()
      const root = await client.list(cfg.nasBaseDir)
      const projects = []
      for (const dir of root.filter((i) => i.isDirectory && i.name !== "." && i.name !== "..")) {
        let bytes = 0
        let finals = 0
        const walk = async (rel, depth, inFinals) => {
          if (depth > 8) return
          let items = []
          try {
            items = await client.list(`${cfg.nasBaseDir}/${rel}`)
          } catch {
            return
          }
          for (const it of items) {
            if (it.name === "." || it.name === "..") continue
            if (it.isDirectory) {
              await walk(`${rel}/${it.name}`, depth + 1, inFinals || it.name === FINALS_FOLDER)
            } else if (it.isFile) {
              bytes += it.size
              if (inFinals) finals += it.size
            }
          }
        }
        await walk(dir.name, 1, false)
        projects.push({ folderName: dir.name, bytes, finalsBytes: finals })
      }
      const usedBytes = projects.reduce((a, p) => a + p.bytes, 0)
      this.lastScan = { ok: true, at: Date.now(), projects, usedBytes }
      return this.lastScan
    } catch (e) {
      return { ok: false, error: e.message || String(e) }
    } finally {
      try {
        client && client.close()
      } catch {}
    }
  }

  _reclaimable(p, mode) {
    return mode === "delete_all" ? p.bytes : Math.max(0, p.bytes - p.finalsBytes)
  }

  /** Lista de proyectos candidatos (entregados, más antiguos primero) hasta sumar el volumen a liberar. */
  buildPlan(scan, sessions) {
    const cfg = getConfig()
    const need = cfg.retentionReleaseTb * TB
    const items = []
    let sum = 0
    const candidates = []
    for (const p of scan.projects) {
      const s = matchSession(p.folderName, sessions)
      if (!s || !isDelivered(s.status)) continue
      const tags = Array.isArray(s.tags) ? s.tags : []
      if (hasTag(tags, "retention:vip_lock") || hasTag(tags, "retention:requested") || hasTag(tags, "retention:notified") || hasTag(tags, "retention:purged")) continue
      const reclaim = this._reclaimable(p, cfg.retentionMode)
      if (reclaim <= 0) continue
      candidates.push({ project: p, session: s, reclaim })
    }
    candidates.sort((a, b) => String(a.session.session_date).localeCompare(String(b.session.session_date)))
    for (const c of candidates) {
      if (sum >= need) break
      items.push({
        sessionId: c.session.id,
        folderName: c.project.folderName,
        clientName: c.session.client_name,
        sessionDate: c.session.session_date,
        gb: Number((c.reclaim / 1024 ** 3).toFixed(2)),
        reclaimBytes: c.reclaim,
      })
      sum += c.reclaim
    }
    return { items, totalBytes: sum, totalTb: Number((sum / TB).toFixed(3)), enough: sum >= need }
  }

  async getStatus({ force = false } = {}) {
    const cfg = getConfig()
    const scan = await this.scanUsage({ force })
    const sessRes = await engine.listSessions()
    const sessions = sessRes && sessRes.ok ? sessRes.sessions : []
    const out = {
      ok: Boolean(scan && scan.ok),
      error: scan && !scan.ok ? scan.error : null,
      settings: {
        enabled: cfg.retentionEnabled,
        capacityTb: cfg.retentionCapacityTb,
        triggerTb: cfg.retentionTriggerTb,
        releaseTb: cfg.retentionReleaseTb,
        graceDays: cfg.retentionGraceDays,
        mode: cfg.retentionMode,
      },
      scannedAt: scan && scan.at ? scan.at : null,
      usedBytes: 0,
      usedGb: 0,
      usedTb: 0,
      nasHost: cfg.nasHost || "192.168.11.1",
      nasBaseDir: cfg.nasBaseDir || "/usb1_1/Lamha-Storage",
      projects: [],
      overThreshold: false,
      waiting: [],
      requested: [],
      expiredReady: [],
      plan: { items: [], totalTb: 0, enough: false },
      lastRun: this.lastRun,
    }
    const now = Date.now()
    for (const s of sessions) {
      const tags = Array.isArray(s.tags) ? s.tags : []
      if (!hasTag(tags, "retention:notified") || hasTag(tags, "retention:purged")) continue
      const ts = tagTs(tags, "retention:notified")
      const deadline = ts + cfg.retentionGraceDays * DAY_MS
      const row = { sessionId: s.id, clientName: s.client_name, sessionDate: s.session_date, deadline, daysLeft: Math.max(0, Math.ceil((deadline - now) / DAY_MS)) }
      if (hasTag(tags, "retention:vip_lock")) continue
      if (hasTag(tags, "retention:requested")) out.requested.push(row)
      else if (now >= deadline || hasTag(tags, "retention:resent")) out.expiredReady.push(row)
      else out.waiting.push(row)
    }
    if (scan && scan.ok) {
      out.usedBytes = scan.usedBytes || 0
      out.usedGb = Number((scan.usedBytes / 1024 ** 3).toFixed(2))
      out.usedTb = Number((scan.usedBytes / TB).toFixed(3))
      out.projects = scan.projects || []
      out.overThreshold = scan.usedBytes >= cfg.retentionTriggerTb * TB
      out.plan = this.buildPlan(scan, sessions)
    }
    return out
  }

  async _audit(action, session, details) {
    try {
      await engine.getClient().from("audit_logs").insert({
        action,
        entity_type: "session",
        entity_id: session.id,
        entity_title: session.client_name,
        user_name: "Ingest Companion (PC3)",
        user_email: "ingest@lamha.ma",
        user_role: "ingest_station",
        details: { source: "ingest_companion", station: "Poste Local Studio PC3", ...details },
      })
    } catch {}
  }

  async _notifyOne(session, lang) {
    const cfg = getConfig()
    const days = cfg.retentionGraceDays
    const deadlineDate = new Date(Date.now() + days * DAY_MS)
    const v = {
      name: session.client_name,
      category: session.category || "Séance",
      date: session.session_date,
      days,
      deadline: deadlineDate.toLocaleDateString(lang === "ar" ? "ar-MA" : lang === "es" ? "es-ES" : lang === "en" ? "en-GB" : "fr-FR", { day: "2-digit", month: "long", year: "numeric" }),
      keepFinals: cfg.retentionMode === "keep_finals",
      link: `${String(cfg.dashboardUrl).replace(/\/+$/, "")}/api/retention/request?session=${session.id}&lang=${lang}`,
    }
    const msg = buildNoticeHtml(lang, v)
    const res = { email: false, whatsapp: false }

    if (session.client_email && session.client_email.includes("@") && cfg.smtpUser && cfg.smtpPass) {
      try {
        const nodemailer = require("nodemailer")
        const transporter = nodemailer.createTransport({
          host: cfg.smtpHost || "smtp.office365.com",
          port: Number(cfg.smtpPort || 587),
          secure: Boolean(cfg.smtpSecure),
          auth: { user: cfg.smtpUser, pass: cfg.smtpPass },
          tls: { ciphers: "SSLv3", rejectUnauthorized: false },
        })
        await transporter.sendMail({
          from: `"${cfg.smtpFromName || "Lam7a Studios"}" <${cfg.smtpFromEmail || cfg.smtpUser}>`,
          to: session.client_email.trim(),
          subject: msg.subject,
          html: msg.html,
        })
        res.email = true
      } catch {}
    }

    const phone = engine.normalizePhoneForWhatsApp(session.client_phone)
    if (phone && cfg.evolutionUrl && cfg.evolutionKey) {
      try {
        const r = await fetch(`${cfg.evolutionUrl}/message/sendText/${cfg.evolutionInstance || "lam7astudio"}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: cfg.evolutionKey },
          body: JSON.stringify({ number: phone, text: msg.wa, delay: 1200, linkPreview: true }),
        })
        res.whatsapp = r.ok
      } catch {}
    }
    return { ...res, deadline: deadlineDate.toISOString() }
  }

  /** Marca los proyectos del plan como "en preaviso" y avisa a los clientes. */
  async startNotice(plan, sessions) {
    const cfg = getConfig()
    const lang = cfg.retentionNoticeLang
    const supabase = engine.getClient()
    const results = []
    for (const item of plan.items) {
      const s = sessions.find((x) => x.id === item.sessionId)
      if (!s) continue
      const notify = await this._notifyOne(s, lang)
      if (!notify.email && !notify.whatsapp) {
        // Sin canal de aviso efectivo: NO se inicia la cuenta atrás (nunca se borra sin avisar)
        results.push({ ...item, notified: false })
        continue
      }
      const tags = [...stripTags(s.tags, ["retention:notified", "retention:resent"]), `retention:notified:${Date.now()}`]
      await supabase.from("sessions").update({ tags }).eq("id", s.id)
      await this._audit("RETENTION_NOTICE_SENT", s, {
        grace_days: cfg.retentionGraceDays,
        deadline: notify.deadline,
        mode: cfg.retentionMode,
        email_sent: notify.email,
        whatsapp_sent: notify.whatsapp,
        folder_name: item.folderName,
        reclaim_gb: item.gb,
        language: lang,
      })
      results.push({ ...item, notified: true, email: notify.email, whatsapp: notify.whatsapp })
    }
    return results
  }

  /** Borra en el QNAP lo que corresponda de los proyectos con plazo vencido y sin solicitud del cliente. */
  async purgeExpired(scan, sessions) {
    const cfg = getConfig()
    if (!scan || !scan.ok) return []
    const now = Date.now()
    const supabase = engine.getClient()
    const done = []
    let client
    try {
      for (const s of sessions) {
        const tags = Array.isArray(s.tags) ? s.tags : []
        if (!hasTag(tags, "retention:notified")) continue
        if (hasTag(tags, "retention:requested") || hasTag(tags, "retention:vip_lock") || hasTag(tags, "retention:purged")) continue
        if (!isDelivered(s.status)) continue
        const ts = tagTs(tags, "retention:notified")
        const expired = now >= ts + cfg.retentionGraceDays * DAY_MS
        if (!expired && !hasTag(tags, "retention:resent")) continue

        const proj = scan.projects.find((p) => matchSession(p.folderName, [s]) === s)
        if (!proj) continue
        if (!client) client = await this._ftp()
        const base = `${cfg.nasBaseDir}/${proj.folderName}`
        let removed = 0
        try {
          if (cfg.retentionMode === "delete_all") {
            await client.removeDir(base)
            removed = proj.bytes
          } else {
            const entries = await client.list(base)
            for (const e of entries) {
              if (e.name === "." || e.name === ".." || e.name === FINALS_FOLDER) continue
              if (e.isDirectory) await client.removeDir(`${base}/${e.name}`)
              else await client.remove(`${base}/${e.name}`)
            }
            removed = Math.max(0, proj.bytes - proj.finalsBytes)
          }
        } catch (e) {
          await this._audit("RETENTION_PURGE_FAILED", s, { folder_name: proj.folderName, error: e.message || String(e) })
          continue
        }
        const newTags = [...stripTags(tags, ["retention:notified", "retention:resent"]), `retention:purged:${Date.now()}`]
        await supabase.from("sessions").update({ tags: newTags }).eq("id", s.id)
        await this._audit("RETENTION_PURGED", s, {
          folder_name: proj.folderName,
          mode: cfg.retentionMode,
          freed_gb: Number((removed / 1024 ** 3).toFixed(2)),
        })
        done.push({ sessionId: s.id, clientName: s.client_name, folderName: proj.folderName, freedBytes: removed })
      }
    } finally {
      try {
        client && client.close()
      } catch {}
    }
    if (done.length) this.lastScan = null // fuerza nueva medición
    return done
  }

  /**
   * Ciclo completo. auto=true respeta los interruptores (enabled / autoNotice / autoPurge);
   * auto=false (botones manuales) ejecuta la acción pedida.
   */
  async runCycle({ auto = false, forceNotice = false, forcePurge = false } = {}) {
    const cfg = getConfig()
    if (auto && !cfg.retentionEnabled) return { ok: true, skipped: "DISABLED" }
    if (this.busy) return { ok: false, error: "BUSY" }
    if (engine.isIngesting()) return { ok: true, skipped: "INGEST_RUNNING" }
    this.busy = true
    try {
      const sessRes = await engine.listSessions()
      if (!sessRes || !sessRes.ok) return { ok: false, error: "NO_SESSIONS" }
      let sessions = sessRes.sessions
      let scan = await this.scanUsage({ force: true })
      if (!scan.ok) return { ok: false, error: scan.error }

      let purged = []
      if (forcePurge || (auto && cfg.retentionAutoPurge)) {
        purged = await this.purgeExpired(scan, sessions)
        if (purged.length) {
          const again = await engine.listSessions()
          if (again && again.ok) sessions = again.sessions
          scan = await this.scanUsage({ force: true })
        }
      }

      let notified = []
      const over = scan.usedBytes >= cfg.retentionTriggerTb * TB
      if (forceNotice || (auto && cfg.retentionAutoNotice && over)) {
        const waiting = sessions.some((s) => {
          const tags = Array.isArray(s.tags) ? s.tags : []
          return hasTag(tags, "retention:notified") && !hasTag(tags, "retention:requested") && !hasTag(tags, "retention:vip_lock") && !hasTag(tags, "retention:purged")
        })
        if (!waiting && (over || forceNotice)) {
          const plan = this.buildPlan(scan, sessions)
          if (plan.items.length) notified = await this.startNotice(plan, sessions)
        }
      }
      this.lastRun = { at: Date.now(), purged: purged.length, notified: notified.filter((n) => n.notified).length }
      this.emit("changed", this.lastRun)
      return { ok: true, purged, notified, usedTb: Number((scan.usedBytes / TB).toFixed(3)) }
    } catch (e) {
      return { ok: false, error: e.message || String(e) }
    } finally {
      this.busy = false
    }
  }
}

module.exports = { QnapRetentionManager }

