import fs from "fs"
import path from "path"

/**
 * Estado compartido del job de ingesta (SD -> SSD).
 *
 * - Vive en memoria (globalThis) para que sobreviva al HMR de Next y sea
 *   accesible desde cualquier route handler del mismo proceso.
 * - Se vuelca a disco de forma ASÍNCRONA y con debounce (nunca bloquea el event loop).
 * - El progreso se calcula por BYTES (no por nº de archivos) para que la barra
 *   avance de forma fluida incluso con RAW/vídeos de tamaños muy distintos.
 */

export interface IngestLog {
  timestamp: string
  level: "info" | "success" | "warn" | "error"
  message: string
}

export interface IngestStats {
  totalFiles: number
  copiedPhotos: number
  copiedVideos: number
  totalMB: number
  elapsedSec: number
  avgMBps: number
}

export interface IngestJobState {
  status: "idle" | "running" | "completed" | "error"
  phase: "idle" | "preparing" | "copying" | "syncing" | "done"
  total: number
  current: number
  percent: number
  bytesTotal: number
  bytesCopied: number
  speedMBps: number
  etaSec: number | null
  currentFile: string
  logs: IngestLog[]
  sessionId?: string
  projectRootPath?: string
  folderName?: string
  stats?: IngestStats
  insertedAssetsCount?: number
  error?: string
  startedAt?: number
  copyStartedAt?: number
  updatedAt: string
}

const MB = 1024 * 1024
const MAX_LOGS = 200
const FLUSH_INTERVAL_MS = 500

const g = globalThis as unknown as {
  __ingestState?: IngestJobState
  __ingestFlushTimer?: ReturnType<typeof setTimeout> | null
  __ingestSample?: { t: number; b: number }
}

const progressFile = () => path.join(process.cwd(), ".ingest-progress.json")

function emptyState(): IngestJobState {
  return {
    status: "idle",
    phase: "idle",
    total: 0,
    current: 0,
    percent: 0,
    bytesTotal: 0,
    bytesCopied: 0,
    speedMBps: 0,
    etaSec: null,
    currentFile: "",
    logs: [],
    updatedAt: new Date().toISOString()
  }
}

/** Recalcula velocidad, ETA y porcentaje (barato; se puede llamar en cada lectura). */
function refreshDerived(s: IngestJobState) {
  const now = Date.now()

  if (s.status === "running") {
    if (s.phase === "copying") {
      const sample = g.__ingestSample
      if (sample) {
        const dt = now - sample.t
        if (dt >= 1000) {
          const instant = (s.bytesCopied - sample.b) / MB / (dt / 1000)
          s.speedMBps = s.speedMBps > 0 ? s.speedMBps * 0.6 + instant * 0.4 : instant
          g.__ingestSample = { t: now, b: s.bytesCopied }
        }
      }
      s.etaSec =
        s.speedMBps > 0.1 && s.bytesTotal > 0
          ? Math.max(0, Math.round((s.bytesTotal - s.bytesCopied) / MB / s.speedMBps))
          : null
      const pct = s.bytesTotal > 0 ? Math.floor((s.bytesCopied / s.bytesTotal) * 100) : 0
      s.percent = Math.min(98, Math.max(3, pct))
    } else if (s.phase === "syncing") {
      s.percent = 99
      s.etaSec = null
    } else {
      s.percent = Math.max(s.percent, 2)
    }
  } else if (s.status === "completed") {
    s.percent = 100
    s.etaSec = 0
  }

  s.updatedAt = new Date().toISOString()
}

async function writeToDisk() {
  const s = g.__ingestState
  if (!s) return
  refreshDerived(s)
  try {
    await fs.promises.writeFile(progressFile(), JSON.stringify(s))
  } catch {
    /* el progreso en disco es solo un respaldo; no debe romper el job */
  }
}

function scheduleFlush() {
  if (g.__ingestFlushTimer) return
  g.__ingestFlushTimer = setTimeout(() => {
    g.__ingestFlushTimer = null
    void writeToDisk()
  }, FLUSH_INTERVAL_MS)
}

async function flushNow() {
  if (g.__ingestFlushTimer) {
    clearTimeout(g.__ingestFlushTimer)
    g.__ingestFlushTimer = null
  }
  await writeToDisk()
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

/** Devuelve el estado actual (memoria > disco > vacío). */
export function getIngestState(): IngestJobState {
  if (g.__ingestState) {
    refreshDerived(g.__ingestState)
    return g.__ingestState
  }
  try {
    const raw = fs.readFileSync(progressFile(), "utf-8")
    const fromDisk = JSON.parse(raw) as IngestJobState
    // Si el servidor se reinició a mitad de un job, no puede seguir "running".
    if (fromDisk.status === "running") {
      fromDisk.status = "error"
      fromDisk.error = "La ingesta anterior se interrumpió (el servidor se reinició)."
    }
    return fromDisk
  } catch {
    return emptyState()
  }
}

export function isIngestRunning(): boolean {
  return g.__ingestState?.status === "running"
}

/** Reinicia el estado y marca el job como en curso. */
export function startIngestJob(): IngestJobState {
  const s = emptyState()
  s.status = "running"
  s.phase = "preparing"
  s.percent = 2
  s.startedAt = Date.now()
  g.__ingestState = s
  g.__ingestSample = undefined
  scheduleFlush()
  return s
}

/** Limpia el estado (solo si no hay un job en curso). */
export function resetIngestState(): boolean {
  if (isIngestRunning()) return false
  g.__ingestState = undefined
  g.__ingestSample = undefined
  try {
    if (fs.existsSync(progressFile())) fs.unlinkSync(progressFile())
  } catch {}
  return true
}

export function ingestLog(level: IngestLog["level"], message: string) {
  const s = g.__ingestState
  console.log(`[Ingest] ${message}`)
  if (!s) return
  s.logs.push({ timestamp: new Date().toLocaleTimeString(), level, message })
  if (s.logs.length > MAX_LOGS) s.logs.splice(0, s.logs.length - MAX_LOGS)
  scheduleFlush()
}

export function ingestSetMeta(meta: Partial<Pick<IngestJobState, "sessionId" | "projectRootPath" | "folderName">>) {
  const s = g.__ingestState
  if (!s) return
  Object.assign(s, meta)
  scheduleFlush()
}

export function ingestBeginCopy(totalFiles: number, totalBytes: number) {
  const s = g.__ingestState
  if (!s) return
  s.phase = "copying"
  s.total = totalFiles
  s.bytesTotal = totalBytes
  s.copyStartedAt = Date.now()
  g.__ingestSample = { t: Date.now(), b: 0 }
  scheduleFlush()
}

export function ingestSetCurrentFile(name: string) {
  const s = g.__ingestState
  if (!s) return
  s.currentFile = name
  scheduleFlush()
}

export function ingestAddBytes(n: number) {
  const s = g.__ingestState
  if (!s) return
  s.bytesCopied += n
  scheduleFlush()
}

export function ingestFileDone() {
  const s = g.__ingestState
  if (!s) return
  s.current++
  scheduleFlush()
}

export function ingestSetPhase(phase: IngestJobState["phase"]) {
  const s = g.__ingestState
  if (!s) return
  s.phase = phase
  scheduleFlush()
}

export async function ingestComplete(stats: IngestStats, insertedAssetsCount: number) {
  const s = g.__ingestState
  if (!s) return
  s.status = "completed"
  s.phase = "done"
  s.stats = stats
  s.insertedAssetsCount = insertedAssetsCount
  s.currentFile = ""
  await flushNow()
}

export async function ingestFail(message: string) {
  const s = g.__ingestState
  if (!s) return
  s.status = "error"
  s.error = message
  s.logs.push({ timestamp: new Date().toLocaleTimeString(), level: "error", message })
  await flushNow()
}
