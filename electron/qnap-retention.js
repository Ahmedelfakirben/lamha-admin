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
const fs = require("fs")
const path = require("path")
const EventEmitter = require("events")
const { getConfig, updateSettings, resolveActiveNasRoute, findAvailableSmbShareAsync } = require("./config")
const engine = require("./ingest-engine")

const TB = 1024 ** 4
const GB = 1024 ** 3
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
    const route = await resolveActiveNasRoute()
    const host = route.activeHost || cfg.nasHost
    const ftp = require("basic-ftp")
    const client = new ftp.Client(20000)
    await client.access({
      host,
      user: cfg.nasUser,
      password: cfg.nasPassword,
      port: Number(cfg.nasPort) || 21,
    })
    return client
  }

  /** Mide el QNAP de forma 100% asíncrona (sin bloquear la UI): tamaño por proyecto y cuánto ocupan los 04_Entregas_Finales. */
  async scanUsage(opts = {}) {
    const force = typeof opts === "boolean" ? opts : Boolean(opts && opts.force)
    if (!force && this.lastScan && Date.now() - this.lastScan.at < 60 * 1000) return this.lastScan
    const cfg = getConfig()
    const route = await resolveActiveNasRoute({ force })
    if (route.activeRoute === "offline" || !route.activeHost) {
      return { ok: false, error: "NAS_UNREACHABLE" }
    }

    const IGNORED_ROOT_DIRS = new Set([
      "@recycle",
      "@recently-snapshot",
      "lamha-storage",
      "system volume information",
      "@upload_cache",
      ".qsync",
      ".@qdrive",
    ])

    // ── 1. INTENTO DE ESCANEO ASÍNCRONO POR SMB (Verificado previamente por TCP 445 en <= 350ms) ──
    const smbRoot = await findAvailableSmbShareAsync(cfg)
    if (smbRoot) {
      try {
        let diskTotalBytes = 0
        let diskFreeBytes = 0
        let diskUsedBytes = 0
        try {
          const stFs = fs.promises.statfs ? await fs.promises.statfs(smbRoot) : fs.statfsSync(smbRoot)
          if (stFs && stFs.blocks > 0 && stFs.bsize > 0) {
            diskTotalBytes = stFs.blocks * stFs.bsize
            diskFreeBytes = stFs.bavail * stFs.bsize
            diskUsedBytes = Math.max(0, diskTotalBytes - diskFreeBytes)
          }
        } catch {}

        const rootEntries = await fs.promises.readdir(smbRoot, { withFileTypes: true })
        const projects = []
        let ops = 0
        for (const dir of rootEntries) {
          if (!dir.isDirectory() || dir.name.startsWith(".")) continue
          if (IGNORED_ROOT_DIRS.has(dir.name.toLowerCase())) continue

          let bytes = 0
          let finals = 0
          let filesCount = 0

          const walkFs = async (currentDir, inFinals) => {
            let entries = []
            try {
              entries = await fs.promises.readdir(currentDir, { withFileTypes: true })
            } catch {
              return
            }
            for (const it of entries) {
              if (it.name.startsWith(".")) continue
              const full = path.join(currentDir, it.name)
              if (it.isDirectory()) {
                await walkFs(full, inFinals || it.name === FINALS_FOLDER)
              } else if (it.isFile()) {
                try {
                  const st = await fs.promises.stat(full)
                  bytes += st.size
                  filesCount++
                  if (inFinals) finals += st.size
                } catch {}
                ops++
                if (ops % 60 === 0) {
                  await new Promise((r) => setImmediate(r))
                }
              }
            }
          }

          const fullProjectPath = path.join(smbRoot, dir.name)
          await walkFs(fullProjectPath, false)
          projects.push({ folderName: dir.name, fullPath: fullProjectPath, bytes, finalsBytes: finals, filesCount })
        }

        const projectsBytes = projects.reduce((a, p) => a + p.bytes, 0)
        const usedBytes = projectsBytes > 0 ? projectsBytes : diskUsedBytes
        this.lastScan = {
          ok: true,
          at: Date.now(),
          projects,
          usedBytes,
          projectsBytes,
          diskTotalBytes,
          diskFreeBytes,
          diskUsedBytes,
          smbRoot,
          source: "smb",
          activeRoute: route.activeRoute,
          activeHost: route.activeHost,
        }
        return this.lastScan
      } catch (smbErr) {
        console.warn("[Retention] SMB scan failed, falling back to FTP:", smbErr.message)
      }
    }

    // ── 2. FALLBACK POR FTP ──
    if (!cfg.nasPassword) return { ok: false, error: "NAS_NOT_CONFIGURED" }
    let client
    try {
      client = await this._ftp()
      const baseDir = cfg.nasBaseDir || "/"
      const root = await client.list(baseDir)
      const projects = []
      for (const dir of root.filter((i) => i.isDirectory && i.name !== "." && i.name !== "..")) {
        if (IGNORED_ROOT_DIRS.has(dir.name.toLowerCase())) continue

        let bytes = 0
        let finals = 0
        let filesCount = 0
        const walk = async (rel, depth, inFinals) => {
          if (depth > 8) return
          let items = []
          try {
            const fullDir = path.posix.join(baseDir, rel)
            items = await client.list(fullDir)
          } catch {
            return
          }
          for (const it of items) {
            if (it.name === "." || it.name === ".." || it.name.startsWith(".")) continue
            if (it.isDirectory) {
              await walk(`${rel}/${it.name}`, depth + 1, inFinals || it.name === FINALS_FOLDER)
            } else if (it.isFile) {
              bytes += it.size || 0
              filesCount++
              if (inFinals) finals += it.size || 0
            }
          }
        }
        await walk(dir.name, 1, false)
        projects.push({ folderName: dir.name, bytes, finalsBytes: finals, filesCount })
      }
      const usedBytes = projects.reduce((a, p) => a + p.bytes, 0)
      this.lastScan = { ok: true, at: Date.now(), projects, usedBytes, source: "ftp" }
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
    const unit = cfg.retentionUnit === "GB" ? "GB" : "TB"
    const unitMultiplier = unit === "GB" ? GB : TB
    const relVal = cfg.retentionReleaseValue !== undefined ? cfg.retentionReleaseValue : cfg.retentionReleaseTb
    const need = relVal * unitMultiplier
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
        gb: Number((c.reclaim / GB).toFixed(2)),
        reclaimBytes: c.reclaim,
      })
      sum += c.reclaim
    }
    return {
      items,
      totalBytes: sum,
      totalGb: Number((sum / GB).toFixed(2)),
      totalTb: Number((sum / TB).toFixed(3)),
      totalFormatted: unit === "GB" ? `${Number((sum / GB).toFixed(2))} GB` : `${Number((sum / TB).toFixed(3))} TB`,
      enough: sum >= need,
    }
  }

  async getStatus(opts = {}) {
    const force = typeof opts === "boolean" ? opts : Boolean(opts && opts.force)
    let cfg = getConfig()
    const scan = await this.scanUsage({ force })
    const sessRes = await engine.listSessions()
    const sessions = sessRes && sessRes.ok ? sessRes.sessions : []

    // Auto-corrección inteligente: si el QNAP real reporta > 500 GB por SMB y en ajustes había quedado
    // pegado el tamaño usado como capacidad (68.16 GB) o modo delete_all de una prueba antigua,
    // actualizar automáticamente a la capacidad real del QNAP en TB.
    const scannedUsedGb = scan && scan.ok ? Number((scan.usedBytes / GB).toFixed(2)) : 0
    if (
      scan &&
      scan.ok &&
      scan.diskTotalBytes > 500 * GB &&
      cfg.retentionUnit === "GB" &&
      (Math.abs(Number(cfg.retentionCapacityValue) - scannedUsedGb) < 1 || Number(cfg.retentionCapacityValue) === 68.16)
    ) {
      const realTb = Number((scan.diskTotalBytes / TB).toFixed(2))
      const trigTb = Number((realTb * 0.8).toFixed(2))
      const relTb = Number(Math.max(0.2, realTb * 0.15).toFixed(2))
      updateSettings({
        retentionUnit: "TB",
        retentionCapacityValue: realTb,
        retentionTriggerValue: trigTb,
        retentionReleaseValue: relTb,
        retentionCapacityTb: realTb,
        retentionTriggerTb: trigTb,
        retentionReleaseTb: relTb,
        retentionMode: "keep_finals",
        retentionAutoPurge: false,
      })
      cfg = getConfig()
    }

    const unit = cfg.retentionUnit === "GB" ? "GB" : "TB"
    const unitMultiplier = unit === "GB" ? GB : TB
    const capVal = cfg.retentionCapacityValue !== undefined ? cfg.retentionCapacityValue : cfg.retentionCapacityTb
    const trigVal = cfg.retentionTriggerValue !== undefined ? cfg.retentionTriggerValue : cfg.retentionTriggerTb
    const relVal = cfg.retentionReleaseValue !== undefined ? cfg.retentionReleaseValue : cfg.retentionReleaseTb

    const totalBytes = capVal * unitMultiplier
    const triggerBytes = trigVal * unitMultiplier
    const releaseBytes = relVal * unitMultiplier

    const usedBytes = scan && scan.ok ? scan.usedBytes || 0 : 0
    const freeBytes = Math.max(0, totalBytes - usedBytes)
    const usedPercent = totalBytes > 0 ? Number(((usedBytes / totalBytes) * 100).toFixed(1)) : 0
    const freePercent = Number(Math.max(0, 100 - usedPercent).toFixed(1))
    const overThreshold = usedBytes >= triggerBytes

    const diskTotalGb = scan && scan.diskTotalBytes ? Number((scan.diskTotalBytes / GB).toFixed(1)) : null
    const diskTotalTb = scan && scan.diskTotalBytes ? Number((scan.diskTotalBytes / TB).toFixed(2)) : null
    const diskFreeGb = scan && scan.diskFreeBytes ? Number((scan.diskFreeBytes / GB).toFixed(1)) : null
    const diskFreeTb = scan && scan.diskFreeBytes ? Number((scan.diskFreeBytes / TB).toFixed(2)) : null

    const out = {
      ok: Boolean(scan && scan.ok),
      error: scan && !scan.ok ? scan.error : null,
      unit,
      capacityValue: capVal,
      triggerValue: trigVal,
      releaseValue: relVal,
      diskTotalGb,
      diskTotalTb,
      diskFreeGb,
      diskFreeTb,
      settings: {
        enabled: cfg.retentionEnabled,
        autoNotice: cfg.retentionAutoNotice,
        autoPurge: cfg.retentionAutoPurge,
        unit,
        capacityValue: capVal,
        triggerValue: trigVal,
        releaseValue: relVal,
        capacityTb: cfg.retentionCapacityTb,
        triggerTb: cfg.retentionTriggerTb,
        releaseTb: cfg.retentionReleaseTb,
        graceDays: cfg.retentionGraceDays,
        mode: cfg.retentionMode,
        noticeLang: cfg.retentionNoticeLang || "fr",
      },
      scannedAt: scan && scan.at ? scan.at : null,
      totalBytes,
      totalGb: Number((totalBytes / GB).toFixed(2)),
      totalTb: Number((totalBytes / TB).toFixed(3)),
      usedBytes,
      usedGb: Number((usedBytes / GB).toFixed(2)),
      usedTb: Number((usedBytes / TB).toFixed(3)),
      freeBytes,
      freeGb: Number((freeBytes / GB).toFixed(2)),
      freeTb: Number((freeBytes / TB).toFixed(3)),
      usedPercent,
      freePercent,
      triggerBytes,
      triggerGb: Number((triggerBytes / GB).toFixed(2)),
      triggerTb: Number((triggerBytes / TB).toFixed(3)),
      nasHost: (scan && scan.activeHost) || cfg.nasHost || cfg.nasLanHost || cfg.nasTailscaleHost || "NAS",
      activeRoute: (scan && scan.activeRoute) || "lan",
      nasBaseDir: cfg.nasBaseDir || "/",
      projects: [],
      overThreshold,
      waiting: [],
      requested: [],
      expiredReady: [],
      vipLocked: [],
      plan: { items: [], totalBytes: 0, totalGb: 0, totalTb: 0, totalFormatted: `0 ${unit}`, enough: false },
      lastRun: this.lastRun,
    }

    const now = Date.now()
    for (const s of sessions) {
      const tags = Array.isArray(s.tags) ? s.tags : []
      if (hasTag(tags, "retention:vip_lock")) {
        out.vipLocked.push({ sessionId: s.id, clientName: s.client_name, sessionDate: s.session_date })
        continue
      }
      if (!hasTag(tags, "retention:notified") || hasTag(tags, "retention:purged")) continue
      const ts = tagTs(tags, "retention:notified")
      const deadline = ts + cfg.retentionGraceDays * DAY_MS
      const row = { sessionId: s.id, clientName: s.client_name, sessionDate: s.session_date, deadline, daysLeft: Math.max(0, Math.ceil((deadline - now) / DAY_MS)) }
      if (hasTag(tags, "retention:requested")) out.requested.push(row)
      else if (now >= deadline || hasTag(tags, "retention:resent")) out.expiredReady.push(row)
      else out.waiting.push(row)
    }

    if (scan && scan.ok) {
      out.plan = this.buildPlan(scan, sessions)
      const plannedIds = new Set((out.plan.items || []).map((x) => x.sessionId))

      out.projects = (scan.projects || []).map((p) => {
        const s = matchSession(p.folderName, sessions)
        const tags = s && Array.isArray(s.tags) ? s.tags : []
        const vip = hasTag(tags, "retention:vip_lock")
        const req = hasTag(tags, "retention:requested")
        const notif = hasTag(tags, "retention:notified") && !hasTag(tags, "retention:purged")
        const ts = notif ? tagTs(tags, "retention:notified") : null
        const deadline = ts ? ts + cfg.retentionGraceDays * DAY_MS : null
        const daysLeft = deadline ? Math.max(0, Math.ceil((deadline - now) / DAY_MS)) : null
        const expired = notif && (now >= deadline || hasTag(tags, "retention:resent"))
        const planned = s && plannedIds.has(s.id)
        const delivered = s ? isDelivered(s.status) : false
        const reclaimBytes = this._reclaimable(p, cfg.retentionMode)

        let retentionState = "unlinked"
        if (s) {
          if (vip) retentionState = "vip_lock"
          else if (req) retentionState = "requested"
          else if (expired) retentionState = "expired"
          else if (notif) retentionState = "waiting"
          else if (planned) retentionState = "planned"
          else if (delivered) retentionState = "delivered_safe"
          else retentionState = "active"
        }

        return {
          folderName: p.folderName,
          fullPath: p.fullPath || null,
          bytes: p.bytes,
          finalsBytes: p.finalsBytes,
          filesCount: p.filesCount,
          gb: Number((p.bytes / GB).toFixed(2)),
          mb: Number((p.bytes / (1024 * 1024)).toFixed(1)),
          reclaimGb: Number((reclaimBytes / GB).toFixed(2)),
          finalsGb: Number((p.finalsBytes / GB).toFixed(2)),
          sessionId: s ? s.id : null,
          clientName: s ? s.client_name : p.folderName,
          sessionDate: s ? s.session_date : "",
          sessionStatus: s ? s.status : "unlinked",
          isDelivered: delivered,
          isVipLocked: vip,
          retentionState,
          daysLeft,
        }
      })
    }
    return out
  }

  async toggleVipLock(sessionId, lock = true) {
    if (!sessionId) return { ok: false, error: "MISSING_SESSION_ID" }
    const supabase = engine.getClient()
    const { data: sess, error } = await supabase.from("sessions").select("id, client_name, tags").eq("id", sessionId).maybeSingle()
    if (error || !sess) return { ok: false, error: error?.message || "SESSION_NOT_FOUND" }
    const currentTags = Array.isArray(sess.tags) ? sess.tags : []
    const cleaned = stripTags(currentTags, ["retention:vip_lock"])
    const nextTags = lock ? [...cleaned, `retention:vip_lock:${Date.now()}`] : cleaned
    await supabase.from("sessions").update({ tags: nextTags }).eq("id", sessionId)
    await this._audit(lock ? "RETENTION_VIP_LOCKED" : "RETENTION_VIP_UNLOCKED", sess, { locked: Boolean(lock) })
    return { ok: true, sessionId, locked: Boolean(lock) }
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

  /** Borra en el QNAP lo que corresponda de los proyectos con plazo vencido y sin solicitud del cliente (vía SMB rápido o FTP). */
  async purgeExpired(scan, sessions) {
    const cfg = getConfig()
    if (!scan || !scan.ok) return []
    const now = Date.now()
    const supabase = engine.getClient()
    const smbRoot = await findAvailableSmbShareAsync(cfg)
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
        let removed = 0
        try {
          if (smbRoot) {
            const smbProjDir = path.join(smbRoot, proj.folderName)
            if (cfg.retentionMode === "delete_all") {
              await fs.promises.rm(smbProjDir, { recursive: true, force: true })
              removed = proj.bytes
            } else {
              const entries = await fs.promises.readdir(smbProjDir, { withFileTypes: true })
              for (const e of entries) {
                if (e.name === FINALS_FOLDER) continue
                await fs.promises.rm(path.join(smbProjDir, e.name), { recursive: true, force: true })
              }
              removed = Math.max(0, proj.bytes - proj.finalsBytes)
            }
          } else {
            if (!client) client = await this._ftp()
            const base = path.posix.join(cfg.nasBaseDir || "/", proj.folderName)
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
      const unitMultiplier = cfg.retentionUnit === "GB" ? GB : TB
      const trigVal = cfg.retentionTriggerValue !== undefined ? cfg.retentionTriggerValue : cfg.retentionTriggerTb
      const triggerBytes = trigVal * unitMultiplier
      const over = scan.usedBytes >= triggerBytes
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
      return {
        ok: true,
        purged,
        notified,
        usedBytes: scan.usedBytes,
        usedGb: Number((scan.usedBytes / GB).toFixed(2)),
        usedTb: Number((scan.usedBytes / TB).toFixed(3)),
      }
    } catch (e) {
      return { ok: false, error: e.message || String(e) }
    } finally {
      this.busy = false
    }
  }
}

module.exports = { QnapRetentionManager }

