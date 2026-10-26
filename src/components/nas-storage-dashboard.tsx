"use client"

import { useState, useEffect, useCallback } from "react"
import {
  HardDrive,
  Server,
  ShieldCheck,
  Folder,
  FolderOpen,
  Image as ImageIcon,
  Video,
  File,
  RefreshCw,
  ExternalLink,
  Check,
  AlertTriangle,
  Loader2,
  Copy,
  ChevronRight,
  ChevronDown,
  Settings,
  Wifi,
  WifiOff,
  Search,
  Sparkles,
  Database,
  ArrowRight,
  FolderPlus
} from "lucide-react"
import { useLanguage } from "@/context/language-context"
import { openLocalFolderOrFile, selectNativeFolder, checkStudioNas } from "@/lib/desktop-bridge"
import Link from "next/link"

interface StorageConfigData {
  success: boolean
  activeType: "nas_ftp" | "local" | "network_share"
  isNetworkReachable: boolean
  activeBasePath: string
  ftp: {
    host: string
    user: string
    baseDir: string
    isOnline: boolean
    latencyMs: number
    projectFoldersCount: number
  }
  local: {
    basePath: string
    exists: boolean
  }
  networkShare: {
    uncPath: string
  }
}

interface ScannedProject {
  folderName: string
  clientName: string
  sessionDate: string
  sessionId?: string
  portalPin?: string
  status?: string
  filesCount: number
  totalSizeMB: number
  subfolders: {
    name: string
    files: Array<{
      name: string
      size: number
      modified: string | null
      type: "photo" | "video" | "other"
      fullPath: string
    }>
  }[]
}

interface ScanResult {
  success: boolean
  storageType: string
  isOnline: boolean
  totalProjects: number
  projects: ScannedProject[]
  totalSessionsInDb: number
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function NasStorageDashboard({ initialSessions = [] }: { initialSessions?: any[] }) {
  const { t } = useLanguage()
  // Storage config state
  const [config, setConfig] = useState<StorageConfigData | null>(null)
  const [isLoadingConfig, setIsLoadingConfig] = useState(true)

  // Scan state
  const [scanData, setScanData] = useState<ScanResult | null>(null)
  const [isLoadingScan, setIsLoadingScan] = useState(true)

  // Root path editing form state
  const [isEditingPath, setIsEditingPath] = useState(false)
  const [ftpHost, setFtpHost] = useState("192.168.11.1")
  const [ftpUser, setFtpUser] = useState("admin")
  const [ftpPassword, setFtpPassword] = useState("Satec2016C@U")
  const [ftpBaseDir, setFtpBaseDir] = useState("/usb1_1/Lamha-Storage")
  const [localPath, setLocalPath] = useState("C:\\Lamha-Storage")
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null)

  // UI state
  const [copied, setCopied] = useState(false)
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<"projects" | "sessions">("projects")

  // Fetch current storage config
  const fetchConfig = useCallback(async () => {
    setIsLoadingConfig(true)
    try {
      const res = await fetch("/api/media/storage-config")
      const data: StorageConfigData = await res.json()
      if (data.success) {
        // Si el servidor de la nube no puede alcanzar el NAS local privado, probar desde el PC local
        if (!data.ftp.isOnline) {
          const probe = await checkStudioNas(data.ftp.host || ftpHost || "192.168.11.1")
          if (probe.reachable) {
            data.ftp.isOnline = true
            data.isNetworkReachable = true
          }
        }
        setConfig(data)
        setFtpHost(data.ftp.host)
        setFtpUser(data.ftp.user)
        setFtpBaseDir(data.ftp.baseDir)
        setLocalPath(data.local.basePath)
      }
    } catch {
      // Intento de rescate nativo
      const probe = await checkStudioNas(ftpHost || "192.168.11.1")
      if (probe.reachable) {
        setConfig(prev => prev ? { ...prev, isNetworkReachable: true, ftp: { ...prev.ftp, isOnline: true } } : prev)
      }
    } finally {
      setIsLoadingConfig(false)
    }
  }, [ftpHost])

  // Scan all projects on storage
  const fetchScan = useCallback(async () => {
    setIsLoadingScan(true)
    try {
      const res = await fetch("/api/media/scan-all")
      const data: ScanResult = await res.json()
      if (data.success) {
        setScanData(data)
        // Auto-expand first project
        if (data.projects.length > 0) {
          setExpandedProjects({ [data.projects[0].folderName]: true })
        }
      }
    } catch {
      // Ignorar
    } finally {
      setIsLoadingScan(false)
    }
  }, [])

  useEffect(() => {
    fetchConfig()
    fetchScan()
  }, [fetchConfig, fetchScan])

  const copyPath = () => {
    if (config?.activeBasePath) {
      navigator.clipboard.writeText(config.activeBasePath)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleOpenExplorer = async (filePath?: string) => {
    const target = filePath || config?.activeBasePath
    if (!target) return
    try {
      await openLocalFolderOrFile(target, "reveal")
    } catch {}
  }

  const handlePickLocalPath = async () => {
    const picked = await selectNativeFolder("Seleccionar Carpeta Raíz de Almacenamiento Local (SSD / Lamha-Storage)")
    if (picked) {
      setLocalPath(picked)
    }
  }

  const handleTestConnection = async () => {
    setIsTesting(true)
    setTestResult(null)
    try {
      const res = await fetch("/api/media/storage-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: ftpHost,
          user: ftpUser,
          password: ftpPassword,
          baseDir: ftpBaseDir,
          localBasePath: localPath,
          testOnly: true,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setTestResult({
          success: true,
          message: data.message || "Conexión exitosa"
        })
      } else {
        // Fallback: Si el servidor cloud no tiene acceso a la IP privada, verificar desde el PC físico
        const probe = await checkStudioNas(ftpHost)
        if (probe.reachable) {
          setTestResult({
            success: true,
            message: `Conexión verificada con éxito desde el PC local hacia el NAS en ${ftpHost}:21`
          })
          setConfig(prev => prev ? { ...prev, isNetworkReachable: true, ftp: { ...prev.ftp, isOnline: true } } : prev)
        } else {
          setTestResult({
            success: false,
            message: data.error || "Fallo de conexión"
          })
        }
      }
    } catch (e: any) {
      const probe = await checkStudioNas(ftpHost)
      if (probe.reachable) {
        setTestResult({
          success: true,
          message: `Conexión verificada con éxito desde el PC local hacia el NAS en ${ftpHost}:21`
        })
        setConfig(prev => prev ? { ...prev, isNetworkReachable: true, ftp: { ...prev.ftp, isOnline: true } } : prev)
      } else {
        setTestResult({ success: false, message: e.message || "Error al conectar" })
      }
    } finally {
      setIsTesting(false)
    }
  }

  const handleSaveConfig = async () => {
    setIsSaving(true)
    setSaveFeedback(null)
    try {
      const res = await fetch("/api/media/storage-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: ftpHost,
          user: ftpUser,
          password: ftpPassword,
          baseDir: ftpBaseDir,
          localBasePath: localPath,
          testOnly: false,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSaveFeedback("Ruta raíz guardada y aplicada correctamente.")
        setIsEditingPath(false)
        await fetchConfig()
        await fetchScan()
        setTimeout(() => setSaveFeedback(null), 5000)
      } else {
        setTestResult({ success: false, message: data.error || "Error al guardar configuración" })
      }
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || "Error de red al guardar" })
    } finally {
      setIsSaving(false)
    }
  }

  const toggleProject = (folderName: string) => {
    setExpandedProjects(prev => ({ ...prev, [folderName]: !prev[folderName] }))
  }

  // Filter projects by search query
  const filteredProjects = scanData?.projects.filter(p => {
    const q = searchQuery.toLowerCase()
    return p.folderName.toLowerCase().includes(q) ||
           p.clientName.toLowerCase().includes(q) ||
           p.subfolders.some(s => s.files.some(f => f.name.toLowerCase().includes(q)))
  }) || []

  // Total counted files & size
  const totalScannedFiles = scanData?.projects.reduce((acc, p) => acc + p.filesCount, 0) || 0
  const totalScannedBytes = scanData?.projects.reduce((acc, p) => acc + (p.totalSizeMB || 0) * 1024 * 1024, 0) || 0

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c69f68]/10 border border-[#c69f68]/30 text-[#c69f68] text-xs font-semibold tracking-wider uppercase mb-2">
            <HardDrive className="w-3.5 h-3.5" />
            <span>{t.nasInfrastructure}</span>
          </div>
          <h1 className="text-3xl font-serif tracking-wide text-[#f5f2eb]">
            {t.nasTitle}
          </h1>
          <p className="text-xs text-[#8c7a6b]">
            {t.nasSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {config && (
            <span className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium border ${
              config.isNetworkReachable
                ? "bg-emerald-950/40 text-emerald-400 border-emerald-800/40"
                : "bg-amber-950/40 text-amber-400 border-amber-800/40"
            }`}>
              {config.isNetworkReachable ? (
                <>
                  <Wifi className="w-3.5 h-3.5" />
                  <span>{t.routerZteOnline} ({config.ftp.latencyMs}ms)</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5" />
                  <span>{t.localMode}</span>
                </>
              )}
            </span>
          )}

          <button
            onClick={() => {
              fetchConfig()
              fetchScan()
            }}
            disabled={isLoadingConfig || isLoadingScan}
            className="p-2 rounded-xl bg-[#141210] hover:bg-[#1f1b17] border border-[#26211c] text-[#a89f91] hover:text-[#f5f2eb] transition-all"
            title={t.rescanBtn}
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingConfig || isLoadingScan ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── Save Feedback Banner ── */}
      {saveFeedback && (
        <div className="px-4 py-3 rounded-2xl bg-emerald-950/40 border border-emerald-800/40 flex items-center justify-between text-emerald-400 text-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{saveFeedback}</span>
          </div>
          <button onClick={() => setSaveFeedback(null)} className="text-[11px] underline hover:text-emerald-300">
            ✕
          </button>
        </div>
      )}

      {/* ── KPI Overview Cards (Real Dynamic Data) ── */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Router USB Real Volume */}
        <div className="rounded-2xl border border-[#26211c] bg-[#141210] p-6 shadow-xl space-y-3">
          <div className="flex items-center justify-between text-[#8c7a6b]">
            <span className="text-xs uppercase tracking-wider">{t.usbNasCapacity}</span>
            <Server className="w-4 h-4 text-[#c69f68]" />
          </div>
          {isLoadingScan ? (
            <div className="flex items-center gap-2 py-1">
              <Loader2 className="w-5 h-5 animate-spin text-[#c69f68]" />
              <span className="text-xs font-mono text-[#8c7a6b]">Calculando volumen...</span>
            </div>
          ) : (
            <div className="text-2xl font-bold font-serif text-[#f5f2eb]">
              {totalScannedBytes > 0 ? formatBytes(totalScannedBytes) : "0 B"}
            </div>
          )}
          <div className="w-full bg-[#201c18] rounded-full h-2 overflow-hidden">
            <div
              className="bg-[#c69f68] h-full rounded-full transition-all duration-500"
              style={{
                width: isLoadingScan ? "0%" : `${Math.min(100, Math.max(6, (totalScannedBytes / (32 * 1024 * 1024 * 1024)) * 100))}%`
              }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-[#8c7a6b]">
            <span>{t.used}: {isLoadingScan ? "..." : formatBytes(totalScannedBytes)}</span>
            <span className="text-[#c69f68] font-mono">
              {config?.isNetworkReachable ? "NAS En Línea" : "Local"}
            </span>
          </div>
        </div>

        {/* Card 2: Proyectos Físicos */}
        <div className="rounded-2xl border border-[#26211c] bg-[#141210] p-6 shadow-xl space-y-3">
          <div className="flex items-center justify-between text-[#8c7a6b]">
            <span className="text-xs uppercase tracking-wider">{t.foldersInStorage}</span>
            <Folder className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-serif text-[#f5f2eb]">
            {isLoadingScan ? (
              <div className="flex items-center gap-2 py-1">
                <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
              </div>
            ) : (
              scanData?.totalProjects ?? 0
            )}
          </div>
          <p className="text-[11px] text-[#8c7a6b]">
            {t.structureTag} (01_RAW, 02_Seleccion...)
          </p>
        </div>

        {/* Card 3: Archivos Catalogados */}
        <div className="rounded-2xl border border-[#26211c] bg-[#141210] p-6 shadow-xl space-y-3">
          <div className="flex items-center justify-between text-[#8c7a6b]">
            <span className="text-xs uppercase tracking-wider">{t.scannedFiles}</span>
            <ImageIcon className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-serif text-[#c69f68]">
            {isLoadingScan ? (
              <div className="flex items-center gap-2 py-1">
                <Loader2 className="w-5 h-5 animate-spin text-sky-400" />
              </div>
            ) : (
              totalScannedFiles
            )}
          </div>
          <p className="text-[11px] text-[#8c7a6b]">
            {t.photosCount} &amp; {t.videosCount}
          </p>
        </div>

        {/* Card 4: Sesiones en Supabase */}
        <div className="rounded-2xl border border-[#26211c] bg-[#141210] p-6 shadow-xl space-y-3">
          <div className="flex items-center justify-between text-[#8c7a6b]">
            <span className="text-xs uppercase tracking-wider">{t.supabaseIndex}</span>
            <Database className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-serif text-[#f5f2eb]">
            {isLoadingScan ? (
              <div className="flex items-center gap-2 py-1">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
              </div>
            ) : (
              scanData?.totalSessionsInDb ?? initialSessions.length
            )}
          </div>
          <p className="text-[11px] text-[#8c7a6b]">
            {t.totalSessions}
          </p>
        </div>
      </div>

      {/* ── Root Path Configuration Card (Interactive) ── */}
      <div className="rounded-2xl border border-[#26211c] bg-[#141210] shadow-xl overflow-hidden">
        <div className="p-6 border-b border-[#26211c] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#171512] to-[#141210]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-[#c69f68]" />
              <h2 className="text-base font-semibold text-[#f5f2eb] font-serif">
                {t.storageRootPath}
              </h2>
            </div>
            <p className="text-xs text-[#8c7a6b]">
              {t.automatedDestination}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenExplorer()}
              className="px-3 py-1.5 rounded-xl bg-[#1c1915] hover:bg-[#25201b] border border-[#26211c] hover:border-[#c69f68]/40 text-xs text-[#a89f91] hover:text-[#f5f2eb] transition-all flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{t.openInWindows}</span>
            </button>

            <button
              onClick={() => setIsEditingPath(!isEditingPath)}
              className="px-3.5 py-1.5 rounded-xl bg-[#c69f68]/10 hover:bg-[#c69f68]/20 border border-[#c69f68]/30 text-[#c69f68] text-xs font-medium transition-all flex items-center gap-1.5"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>{isEditingPath ? t.closeConfig : t.modifyRootPath}</span>
            </button>
          </div>
        </div>

        {/* Current Active Path Bar */}
        <div className="px-6 py-4 bg-[#100f0d] border-b border-[#1f1b17] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xs text-[#70665a] uppercase tracking-wider font-semibold shrink-0">
              {t.activePathLabel}
            </span>
            {isLoadingConfig ? (
              <div className="flex items-center gap-2 text-xs text-[#8c7a6b]">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#c69f68]" />
                <span className="font-mono">Conectando al almacenamiento...</span>
              </div>
            ) : (
              <code className="text-xs font-mono text-[#c69f68] bg-[#181613] px-3 py-1.5 rounded-lg border border-[#26211c] truncate select-all">
                {config?.activeBasePath || "Sin ruta activa configurada"}
              </code>
            )}
          </div>

          <button
            onClick={copyPath}
            className="px-2.5 py-1 rounded-lg bg-[#181613] hover:bg-[#221e1a] border border-[#26211c] text-[#a89f91] hover:text-[#f5f2eb] text-xs transition-colors flex items-center gap-1.5 shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? t.copiedBtn : t.copyPathBtn}</span>
          </button>
        </div>

        {/* Editing Drawer / Form */}
        {isEditingPath && (
          <div className="p-6 bg-[#0f0e0c] border-b border-[#26211c] space-y-6 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Quick Presets */}
            <div className="space-y-2">
              <span className="text-[11px] uppercase tracking-wider text-[#70665a] font-semibold">
                Presets:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFtpHost("192.168.11.1")
                    setFtpUser("admin")
                    setFtpPassword("Satec2016C@U")
                    setFtpBaseDir("/usb1_1/Lamha-Storage")
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#181613] hover:bg-[#24201b] border border-[#26211c] hover:border-[#c69f68]/40 text-xs text-[#f5f2eb] transition-all flex items-center gap-2"
                >
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t.presetZte}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLocalPath("C:\\Lamha-Storage")
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#181613] hover:bg-[#24201b] border border-[#26211c] hover:border-[#c69f68]/40 text-xs text-[#f5f2eb] transition-all flex items-center gap-2"
                >
                  <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t.presetLocal}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFtpBaseDir("/usb1_1/Lamha-Storage-Backup")
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#181613] hover:bg-[#24201b] border border-[#26211c] hover:border-[#c69f68]/40 text-xs text-[#a89f91] transition-all flex items-center gap-2"
                >
                  <Folder className="w-3.5 h-3.5 text-sky-400" />
                  <span>{t.presetBackup}</span>
                </button>
              </div>
            </div>

            {/* Inputs Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <label className="text-xs text-[#a89f91]">{t.hostIpLabel}</label>
                <input
                  type="text"
                  value={ftpHost}
                  onChange={(e) => setFtpHost(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141210] border border-[#26211c] focus:border-[#c69f68] text-xs font-mono text-[#f5f2eb] outline-none"
                  placeholder="192.168.11.1"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-[#a89f91]">{t.ftpUserLabel}</label>
                <input
                  type="text"
                  value={ftpUser}
                  onChange={(e) => setFtpUser(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141210] border border-[#26211c] focus:border-[#c69f68] text-xs font-mono text-[#f5f2eb] outline-none"
                  placeholder="admin"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-[#a89f91]">{t.ftpPasswordLabel}</label>
                <input
                  type="password"
                  value={ftpPassword}
                  onChange={(e) => setFtpPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141210] border border-[#26211c] focus:border-[#c69f68] text-xs font-mono text-[#f5f2eb] outline-none"
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-[#a89f91]">{t.ftpBaseFolderLabel}</label>
                <input
                  type="text"
                  value={ftpBaseDir}
                  onChange={(e) => setFtpBaseDir(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141210] border border-[#26211c] focus:border-[#c69f68] text-xs font-mono text-[#f5f2eb] outline-none"
                  placeholder="/usb1_1/Lamha-Storage"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-[#a89f91] flex items-center justify-between">
                <span>{t.localFallbackPathLabel}</span>
                <button
                  type="button"
                  onClick={handlePickLocalPath}
                  className="text-[11px] text-[#c69f68] hover:underline flex items-center gap-1 font-sans"
                >
                  <FolderOpen className="w-3 h-3" />
                  <span>Examinar en este PC...</span>
                </button>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={localPath}
                  onChange={(e) => setLocalPath(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-[#141210] border border-[#26211c] focus:border-[#c69f68] text-xs font-mono text-[#f5f2eb] outline-none"
                  placeholder="C:\Lamha-Storage"
                />
                <button
                  type="button"
                  onClick={handlePickLocalPath}
                  className="px-3 py-2 rounded-xl bg-[#1c1915] hover:bg-[#25201b] border border-[#26211c] hover:border-[#c69f68]/40 text-xs text-[#c69f68] flex items-center gap-1.5 shrink-0"
                  title="Seleccionar carpeta en Windows"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Examinar</span>
                </button>
              </div>
            </div>

            {/* Test connection feedback */}
            {testResult && (
              <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                testResult.success
                  ? "bg-emerald-950/30 text-emerald-400 border-emerald-800/40"
                  : "bg-rose-950/30 text-rose-400 border-rose-800/40"
              }`}>
                {testResult.success ? <Check className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                <span>{testResult.message}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="px-4 py-2 rounded-xl bg-[#181613] hover:bg-[#201c18] border border-[#26211c] hover:border-[#c69f68]/40 text-xs font-medium text-[#c69f68] transition-all flex items-center gap-2"
              >
                {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />}
                <span>{isTesting ? t.testingConn : t.testConnBtn}</span>
              </button>

              <button
                type="button"
                onClick={handleSaveConfig}
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#c69f68] to-[#dfba89] text-black font-semibold text-xs shadow-lg hover:opacity-95 active:scale-95 transition-all flex items-center gap-2"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>{isSaving ? t.savingConfig : t.saveActivePathBtn}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Main Storage Projects & Supabase Index ── */}
      <div className="rounded-2xl border border-[#26211c] bg-[#141210] shadow-xl overflow-hidden space-y-0">
        {/* Navigation Tabs and Search */}
        <div className="p-6 border-b border-[#26211c] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("projects")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                activeTab === "projects"
                  ? "bg-[#c69f68] text-black shadow-md"
                  : "bg-[#181613] text-[#8c7a6b] hover:text-[#f5f2eb] border border-[#26211c]"
              }`}
            >
              {t.projectsInStorageTab} ({isLoadingScan ? "..." : (scanData?.totalProjects ?? 0)})
            </button>

            <button
              onClick={() => setActiveTab("sessions")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                activeTab === "sessions"
                  ? "bg-[#c69f68] text-black shadow-md"
                  : "bg-[#181613] text-[#8c7a6b] hover:text-[#f5f2eb] border border-[#26211c]"
              }`}
            >
              {t.supabaseIndexTab} ({isLoadingScan && initialSessions.length === 0 ? "..." : (scanData?.totalSessionsInDb ?? initialSessions.length)})
            </button>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 text-[#70665a] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchNasPlaceholder}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#181613] border border-[#26211c] focus:border-[#c69f68] text-xs text-[#f5f2eb] outline-none"
            />
          </div>
        </div>

        {/* Tab 1: Physical Projects and Files */}
        {activeTab === "projects" && (
          <div className="divide-y divide-[#1f1b17]">
            {isLoadingScan && (
              <div className="py-16 text-center text-[#70665a] flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-[#c69f68]" />
                <span className="text-xs">Escaneando directorios en el almacenamiento NAS...</span>
              </div>
            )}

            {!isLoadingScan && filteredProjects.length === 0 && (
              <div className="py-16 text-center text-[#70665a] px-4 space-y-2">
                <FolderOpen className="w-8 h-8 text-[#3d362f] mx-auto" />
                <p className="text-xs">No se encontraron proyectos en el almacenamiento.</p>
                <p className="text-[11px] text-[#554c42]">
                  Crea una nueva carpeta o realiza una ingesta para iniciar la estructura.
                </p>
              </div>
            )}

            {!isLoadingScan && filteredProjects.map((proj) => {
              const isExpanded = !!expandedProjects[proj.folderName]
              return (
                <div key={proj.folderName} className="p-5 hover:bg-[#161412]/40 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <button
                        onClick={() => toggleProject(proj.folderName)}
                        className="p-1 rounded-lg hover:bg-[#201c18] text-[#c69f68] mt-0.5"
                      >
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-[#f5f2eb]">
                            {proj.clientName}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1e1b17] border border-[#26211c] text-[#a89f91] font-mono">
                            {proj.sessionDate}
                          </span>
                          {proj.sessionId && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
                              Vinculado a Supabase
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-1">
                          <code className="text-[11px] font-mono text-[#8c7a6b] truncate">
                            {proj.folderName}
                          </code>
                          <span className="text-[#3d362f]">·</span>
                          <span className="text-[11px] text-[#70665a]">
                            {proj.filesCount} archivo{proj.filesCount !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {proj.sessionId && (
                        <Link
                          href={`/sessions/${proj.sessionId}`}
                          className="px-3 py-1.5 rounded-xl bg-[#1c1915] hover:bg-[#241f19] border border-[#26211c] hover:border-[#c69f68]/40 text-[11px] text-[#c69f68] font-medium transition-colors flex items-center gap-1.5"
                        >
                          <span>Ver Sesión</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      )}

                      <button
                        onClick={() => handleOpenExplorer(`${config?.activeBasePath}/${proj.folderName}`)}
                        className="p-1.5 rounded-xl bg-[#181613] hover:bg-[#201c18] border border-[#26211c] text-[#a89f91] hover:text-[#f5f2eb] transition-colors"
                        title="Abrir carpeta del proyecto en Explorador"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Subfolders View */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-[#1f1b17] space-y-3 pl-8">
                      {proj.subfolders.map((sub) => (
                        <div key={sub.name} className="space-y-1.5">
                          <div className="flex items-center gap-2 text-xs font-semibold text-[#a89f91]">
                            <Folder className="w-3.5 h-3.5 text-[#c69f68]" />
                            <span>{sub.name}</span>
                            <span className="text-[10px] text-[#554c42] font-mono">
                              ({sub.files.length} archivos)
                            </span>
                          </div>

                          {sub.files.length > 0 ? (
                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 pl-5">
                              {sub.files.map((file) => (
                                <div
                                  key={file.name}
                                  className="p-2.5 rounded-xl bg-[#12100e] border border-[#201c18] flex items-center justify-between text-xs"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    {file.type === "photo" ? (
                                      <ImageIcon className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                                    ) : file.type === "video" ? (
                                      <Video className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                    ) : (
                                      <File className="w-3.5 h-3.5 text-[#70665a] shrink-0" />
                                    )}
                                    <span className="font-mono text-[#d5cfc5] truncate text-[11px]">
                                      {file.name}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-[10px] text-[#554c42] font-mono">
                                      {formatBytes(file.size)}
                                    </span>
                                    <button
                                      onClick={() => handleOpenExplorer(file.fullPath)}
                                      className="p-1 rounded hover:bg-[#1e1b17] text-[#70665a] hover:text-[#c69f68]"
                                      title="Abrir archivo"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[10px] text-[#554c42] pl-5 italic">Directorio vacío</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Tab 2: Supabase Cataloged Sessions */}
        {activeTab === "sessions" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#181613] text-[#70665a] uppercase tracking-wider border-b border-[#26211c] text-[10px]">
                <tr>
                  <th className="px-6 py-3.5">Cliente / Proyecto</th>
                  <th className="px-6 py-3.5">Fecha</th>
                  <th className="px-6 py-3.5">Tipo / Categoría</th>
                  <th className="px-6 py-3.5">Estado</th>
                  <th className="px-6 py-3.5">PIN Portal</th>
                  <th className="px-6 py-3.5 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f1b17]">
                {(initialSessions.length > 0 ? initialSessions : []).slice(0, 30).map((session: any) => (
                  <tr key={session.id} className="hover:bg-[#161412]/50 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="font-medium text-[#f5f2eb]">{session.client_name}</div>
                      <div className="text-[10px] text-[#70665a] font-mono">
                        {(session.tags && session.tags[0]) || "Sesión General"}
                      </div>
                    </td>

                    <td className="px-6 py-3.5 text-[#8c7a6b] font-mono text-[11px]">
                      {session.session_date}
                    </td>

                    <td className="px-6 py-3.5">
                      <span className="capitalize px-2 py-0.5 rounded text-[10px] font-semibold bg-[#1a1714] text-[#c69f68] border border-[#c69f68]/20">
                        {session.category || session.session_type}
                      </span>
                    </td>

                    <td className="px-6 py-3.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        session.status === "delivered" 
                          ? "bg-emerald-950/40 text-emerald-400 border border-emerald-800/40"
                          : session.status === "edited"
                          ? "bg-blue-950/40 text-blue-400 border border-blue-800/40"
                          : "bg-amber-950/40 text-amber-400 border border-amber-800/40"
                      }`}>
                        {session.status}
                      </span>
                    </td>

                    <td className="px-6 py-3.5 font-mono text-[#c69f68]">
                      {session.portal_pin || "—"}
                    </td>

                    <td className="px-6 py-3.5 text-right">
                      <Link
                        href={`/sessions/${session.id}`}
                        className="text-xs text-[#c69f68] hover:underline inline-flex items-center gap-1"
                      >
                        <span>Gestionar</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
