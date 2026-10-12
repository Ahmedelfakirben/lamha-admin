/**
 * Lamha Preview Worker (proceso independiente)
 *
 * Lanzado por /api/ingest cuando termina la copia SD -> SSD:
 *   node scripts/preview-worker.mjs <ruta-al-job.json>
 *
 * Por qué es un proceso aparte:
 *  - Sobrevive a recompilados (HMR) y reinicios del dev server de Next.
 *  - No compite con el event loop de la UI.
 *
 * Pipeline por foto (todo en memoria, sin ficheros temporales):
 *   SSD local -> exiftool (daemon) PreviewImage -> sharp resize/WebP -> Supabase Storage -> DB
 *
 * Concurrencia: varias fotos a la vez, de modo que mientras una se sube por red
 * otra se está procesando en CPU.
 */
import fs from "node:fs"
import path from "node:path"
import sharp from "sharp"
import { ExifTool } from "exiftool-vendored"
import { createClient } from "@supabase/supabase-js"

const CONCURRENCY = Number(process.env.LAMHA_WORKER_CONCURRENCY || 4)
const UPLOAD_RETRIES = 2
const FLUSH_MS = 500

// -- Carga de variables de entorno (por si el proceso padre no las pasó) -----
function loadEnvFallback() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return
  try {
    const envPath = path.join(process.cwd(), ".env.local")
    for (const line of fs.readFileSync(envPath, "utf-8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && !line.trim().startsWith("#") && !process.env[m[1]]) process.env[m[1]] = m[2]
    }
  } catch {}
}
loadEnvFallback()

const jobFile = process.argv[2]
if (!jobFile || !fs.existsSync(jobFile)) {
  console.error("[Worker] Falta el fichero de job:", jobFile)
  process.exit(1)
}

const job = JSON.parse(fs.readFileSync(jobFile, "utf-8"))
const assets = job.assets || []
const total = assets.length
const progressFile = job.progressFile || path.join(process.cwd(), ".worker-progress.json")

let completed = 0
let failed = 0
let message = `Iniciando generación de ${total} vistas previas WebP en segundo plano...`
let status = "running"

// -- Progreso: escritura atómica (tmp + rename) para que el lector nunca vea JSON parcial
function writeProgress() {
  const payload = JSON.stringify({
    status,
    total,
    completed,
    failed,
    percent: total > 0 ? Math.round((completed / total) * 100) : 100,
    message,
    lastUpdated: new Date().toISOString(),
    pid: process.pid
  })
  const tmp = `${progressFile}.tmp`
  try {
    fs.writeFileSync(tmp, payload)
    fs.renameSync(tmp, progressFile)
  } catch {
    try { fs.writeFileSync(progressFile, payload) } catch {}
  }
}
writeProgress()
const flushTimer = setInterval(writeProgress, FLUSH_MS)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
)

// exiftool en modo daemon: UN proceso que se queda encendido y atiende todas las fotos
const et = new ExifTool({ maxProcs: 2, taskTimeoutMillis: 30000 })

// sharp: no acaparar CPU mientras el usuario edita
sharp.concurrency(2)
sharp.cache(false)

/** Obtiene el JPEG embebido del RAW (o null si hay que dejar que sharp lea el fichero). */
async function getEmbeddedJpeg(asset) {
  for (const tag of ["PreviewImage", "JpgFromRaw"]) {
    try {
      const buf = await et.extractBinaryTagToBuffer(tag, asset.localPath)
      if (buf && buf.length > 2000) return buf
    } catch {}
  }
  return null
}

async function buildWebp(asset) {
  let input = asset.localPath
  if (!asset.isJpg) {
    const embedded = await getEmbeddedJpeg(asset)
    if (embedded) input = embedded
  }
  return sharp(input, { failOn: "none" })
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80, effort: 2 })
    .toBuffer()
}

async function uploadWithRetry(storagePath, buffer) {
  let lastErr
  for (let attempt = 0; attempt <= UPLOAD_RETRIES; attempt++) {
    const { error } = await supabase.storage.from("session-previews").upload(storagePath, buffer, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: true
    })
    if (!error) return
    lastErr = error
    await new Promise(r => setTimeout(r, 400 * (attempt + 1)))
  }
  throw lastErr
}

async function processAsset(asset) {
  try {
    const webp = await buildWebp(asset)
    const baseName = path.parse(asset.filename).name
    const storagePath = `${job.sessionId}/${baseName}_preview.webp`

    await uploadWithRetry(storagePath, webp)

    const { data } = supabase.storage.from("session-previews").getPublicUrl(storagePath)
    const { error: dbError } = await supabase
      .from("media_assets")
      .update({ preview_url: data.publicUrl })
      .eq("id", asset.id)
    if (dbError) throw dbError
  } catch (e) {
    failed++
    console.error(`[Worker] Error procesando ${asset.filename}: ${e?.message || e}`)
  } finally {
    completed++
    message = `Generadas ${completed}/${total} vistas previas...`
  }
}

async function main() {
  let next = 0
  const runner = async () => {
    while (true) {
      const i = next++
      if (i >= total) return
      await processAsset(assets[i])
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, Math.max(total, 1)) }, runner))

  status = "completed"
  message =
    failed > 0
      ? `Vistas previas listas (${total - failed}/${total}). ${failed} con error, revisa la consola del worker.`
      : "¡Todas las vistas previas generadas y subidas a la nube con éxito!"
}

async function shutdown(code) {
  clearInterval(flushTimer)
  writeProgress()
  try { await et.end() } catch {}
  try { fs.unlinkSync(jobFile) } catch {}
  process.exit(code)
}

process.on("uncaughtException", async err => {
  status = "error"
  message = `Error crítico del worker: ${err?.message || err}`
  await shutdown(1)
})

main()
  .then(() => shutdown(0))
  .catch(async err => {
    status = "error"
    message = `Error crítico del worker: ${err?.message || err}`
    await shutdown(1)
  })
