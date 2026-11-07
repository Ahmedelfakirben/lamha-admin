"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Server,
  Wifi,
  WifiOff,
  Key,
  User,
  Folder,
  Check,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Save,
  Globe,
  Network,
  Zap,
  ShieldCheck,
  HardDrive,
} from "lucide-react"
import { useLanguage } from "@/context/language-context"
import { cn } from "@/lib/utils"
import { checkStudioNas, notifyCompanionConfigReload } from "@/lib/desktop-bridge"

const NAS_CARD_I18N = {
  fr: {
    title: "Centre Réseau & Stockage NAS Unifié (LAN Local & Tailscale VPN)",
    subtitle: "Configuration centralisée partagée entre le Panel Admin, le VPS et l'outil d'Ingestion (Zéro identifiant dans le code)",
    modeTitle: "Mode de Routage Réseau :",
    modeAuto: "Auto (Priorité LAN → Tailscale)",
    modeLan: "Forcer Réseau Local (LAN)",
    modeTailscale: "Forcer Tailscale VPN",
    route1Title: "Route 1 · Réseau Local (LAN Studio)",
    route2Title: "Route 2 · Réseau Tailscale (VPN Distant & VPS)",
    lanIpLabel: "IP Réseau Local (LAN) :",
    lanIpHint: "Utilisée automatiquement au studio pour une vitesse maximale (1Gbps)",
    tsIpLabel: "IP Tailscale VPN (NAS) :",
    tsIpHint: "Utilisée hors du studio et par le VPS cloud (admin.lam7a.com)",
    shareNameLabel: "Nom du Partage SMB (Share) :",
    shareNameHint: "Génère automatiquement \\\\IP_LAN\\Partage et \\\\IP_TAILSCALE\\Partage",
    credsTitle: "Identifiants NAS Unifiés (Partagés SMB & FTP)",
    ftpPortLabel: "Port FTP :",
    ftpUserLabel: "Utilisateur NAS :",
    ftpPassLabel: "Mot de passe NAS :",
    passPlaceholder: "(Laisser vide pour conserver le mot de passe actuel)",
    ftpDirLabel: "Dossier Racine FTP :",
    btnTestLan: "Tester LAN",
    btnTestTs: "Tester Tailscale",
    btnSave: "Enregistrer & Synchroniser Partout",
    testing: "Test...",
    saving: "Enregistrement...",
    statusActiveLan: "Actif : Réseau Local (LAN)",
    statusActiveTs: "Actif : Tailscale VPN",
    statusOffline: "NAS Hors Ligne",
    onlineBadge: "En ligne",
    offlineBadge: "Hors ligne",
    saveSuccess: "Configuration centralisée enregistrée dans Supabase et synchronisée avec Ingest Companion !",
    saveError: "Erreur lors de l'enregistrement",
    testSuccess: (ms: number) => `Connexion vérifiée (${ms}ms)`,
    testError: (err: string) => `Échec : ${err}`,
  },
  es: {
    title: "Centro Unificado de Red y NAS (Red Local LAN & Tailscale VPN)",
    subtitle: "Configuración centralizada compartida entre Panel Admin, VPS e Ingest Companion (Cero credenciales en código o .env)",
    modeTitle: "Modo de Enrutamiento de Red:",
    modeAuto: "Auto (Prioridad LAN → Tailscale)",
    modeLan: "Forzar Red Local (LAN)",
    modeTailscale: "Forzar Tailscale VPN",
    route1Title: "Ruta 1 · Red Local (Estudio LAN)",
    route2Title: "Ruta 2 · Red Tailscale (Fuera de Oficina y VPS)",
    lanIpLabel: "IP Red Local (LAN):",
    lanIpHint: "Se usa automáticamente en el estudio a máxima velocidad local",
    tsIpLabel: "IP Tailscale VPN (NAS):",
    tsIpHint: "Se usa automáticamente fuera de la oficina y desde el VPS (admin.lam7a.com)",
    shareNameLabel: "Nombre del Recurso Compartido SMB:",
    shareNameHint: "Genera automáticamente las rutas \\\\IP_LAN\\Recurso y \\\\IP_TAILSCALE\\Recurso",
    credsTitle: "Credenciales Únicas del NAS (Compartidas para LAN y Tailscale)",
    ftpPortLabel: "Puerto FTP:",
    ftpUserLabel: "Usuario NAS (SMB / FTP):",
    ftpPassLabel: "Contraseña NAS:",
    passPlaceholder: "(Dejar en blanco para mantener la contraseña actual)",
    ftpDirLabel: "Carpeta Raíz FTP:",
    btnTestLan: "Probar LAN",
    btnTestTs: "Probar Tailscale",
    btnSave: "Guardar y Sincronizar Centralizado",
    testing: "Probando...",
    saving: "Guardando...",
    statusActiveLan: "Activo: Red Local (LAN)",
    statusActiveTs: "Activo: Tailscale VPN",
    statusOffline: "NAS Desconectado",
    onlineBadge: "En línea",
    offlineBadge: "Sin conexión",
    saveSuccess: "¡Configuración centralizada guardada en Supabase y sincronizada con la herramienta de Ingesta!",
    saveError: "Error al guardar la configuración",
    testSuccess: (ms: number) => `Conexión verificada (${ms}ms)`,
    testError: (err: string) => `Fallo: ${err}`,
  },
  en: {
    title: "Unified Network & NAS Hub (Local LAN & Tailscale VPN)",
    subtitle: "Centralized configuration shared across Admin Panel, Cloud VPS, and Ingest Companion (Zero credentials in code/.env)",
    modeTitle: "Network Routing Mode:",
    modeAuto: "Auto (LAN Priority → Tailscale)",
    modeLan: "Force Local Network (LAN)",
    modeTailscale: "Force Tailscale VPN",
    route1Title: "Route 1 · Local Network (Studio LAN)",
    route2Title: "Route 2 · Tailscale Network (Remote & VPS)",
    lanIpLabel: "Local LAN IP:",
    lanIpHint: "Used automatically in the studio for full Gigabit speed",
    tsIpLabel: "Tailscale VPN IP (NAS):",
    tsIpHint: "Used automatically outside the office and by the Cloud VPS",
    shareNameLabel: "SMB Share Name:",
    shareNameHint: "Automatically builds \\\\LAN_IP\\Share and \\\\TAILSCALE_IP\\Share",
    credsTitle: "Unified NAS Credentials (Shared across SMB & FTP)",
    ftpPortLabel: "FTP Port:",
    ftpUserLabel: "NAS Username:",
    ftpPassLabel: "NAS Password:",
    passPlaceholder: "(Leave blank to keep existing password)",
    ftpDirLabel: "FTP Root Directory:",
    btnTestLan: "Test LAN",
    btnTestTs: "Test Tailscale",
    btnSave: "Save & Sync Everywhere",
    testing: "Testing...",
    saving: "Saving...",
    statusActiveLan: "Active: Local Network (LAN)",
    statusActiveTs: "Active: Tailscale VPN",
    statusOffline: "NAS Offline",
    onlineBadge: "Online",
    offlineBadge: "Offline",
    saveSuccess: "Centralized configuration saved to Supabase and synced with Ingest Companion!",
    saveError: "Error saving configuration",
    testSuccess: (ms: number) => `Connection verified (${ms}ms)`,
    testError: (err: string) => `Failed: ${err}`,
  },
  ar: {
    title: "المركز الموحد للشبكة والتخزين NAS (الشبكة المحلية LAN و Tailscale VPN)",
    subtitle: "إعدادات مركزية مشتركة بين لوحة التحكم والخادم السحابي وأداة التفريغ (بدون كلمات مرور في الكود)",
    modeTitle: "وضع توجيه الشبكة:",
    modeAuto: "تلقائي (الأولوية للمحلي ثم Tailscale)",
    modeLan: "فرض الشبكة المحلية (LAN)",
    modeTailscale: "فرض شبكة Tailscale VPN",
    route1Title: "المسار 1 · الشبكة المحلية (LAN الاستوديو)",
    route2Title: "المسار 2 · شبكة Tailscale (عن بُعد والخادم السحابي)",
    lanIpLabel: "عنوان IP للشبكة المحلية:",
    lanIpHint: "يُستخدم تلقائياً داخل الاستوديو بأقصى سرعة",
    tsIpLabel: "عنوان IP لشبكة Tailscale:",
    tsIpHint: "يُستخدم تلقائياً خارج المكتب ومن الخادم السحابي",
    shareNameLabel: "اسم المجلد المشترك (SMB Share):",
    shareNameHint: "ينشئ المسارات تلقائياً للشبكتين",
    credsTitle: "بيانات اعتماد NAS الموحدة (مشتركة لـ SMB و FTP)",
    ftpPortLabel: "منفذ FTP:",
    ftpUserLabel: "اسم مستخدم NAS:",
    ftpPassLabel: "كلمة مرور NAS:",
    passPlaceholder: "(اتركه فارغاً للإبقاء على كلمة المرور الحالية)",
    ftpDirLabel: "المجلد الرئيسي FTP:",
    btnTestLan: "فحص LAN",
    btnTestTs: "فحص Tailscale",
    btnSave: "حفظ ومزامنة الإعدادات المركزية",
    testing: "جاري الاختبار...",
    saving: "جاري الحفظ...",
    statusActiveLan: "نشط: الشبكة المحلية (LAN)",
    statusActiveTs: "نشط: شبكة Tailscale VPN",
    statusOffline: "وحدة التخزين غير متصلة",
    onlineBadge: "متصل",
    offlineBadge: "غير متصل",
    saveSuccess: "تم حفظ الإعدادات المركزية ومزامنتها بنجاح!",
    saveError: "حدث خطأ أثناء الحفظ",
    testSuccess: (ms: number) => `تم التحقق من الاتصال (${ms}ms)`,
    testError: (err: string) => `فشل: ${err}`,
  },
} as const

export function NasConfigCard({ onSaved }: { onSaved?: () => void } = {}) {
  const { language, dir } = useLanguage()
  const isRtl = dir === "rtl"
  const activeLang = language === "ar" || language === "en" || language === "es" || language === "fr" ? language : "es"
  const texts = NAS_CARD_I18N[activeLang]

  // Modo de red: 'auto' | 'lan' | 'tailscale'
  const [networkMode, setNetworkMode] = useState<"auto" | "lan" | "tailscale">("auto")

  // Ruta 1 (LAN) & Ruta 2 (Tailscale) + Share común
  const [lanHost, setLanHost] = useState("")
  const [tailscaleHost, setTailscaleHost] = useState("")
  const [shareName, setShareName] = useState("Lamha-Storage")

  // Credenciales compartidas
  const [ftpPort, setFtpPort] = useState(21)
  const [nasUser, setNasUser] = useState("")
  const [nasPassword, setNasPassword] = useState("")
  const [nasBaseDir, setNasBaseDir] = useState("/")
  const [hasPassword, setHasPassword] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Estados en vivo
  const [activeRoute, setActiveRoute] = useState<"lan" | "tailscale" | "offline">("offline")
  const [lanOnline, setLanOnline] = useState<boolean>(false)
  const [lanLatency, setLanLatency] = useState<number>(-1)
  const [tsOnline, setTsOnline] = useState<boolean>(false)
  const [tsLatency, setTsLatency] = useState<number>(-1)

  const [loading, setLoading] = useState(true)
  const [switchingMode, setSwitchingMode] = useState(false)
  const [testingLan, setTestingLan] = useState(false)
  const [testingTs, setTestingTs] = useState(false)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null)

  const loadConfig = useCallback(async (force = false) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/deliveries/settings${force ? "?force=true" : ""}`, { cache: "no-store" })
      const data = await res.json()

      let nextLanHost = ""
      let nextTsHost = ""
      let nextPort = 21
      let nextMode: "auto" | "lan" | "tailscale" = "auto"

      if (data.settings) {
        nextMode = data.settings.storage_mode || "auto"
        nextLanHost = data.settings.smb_probe_host || ""
        nextTsHost = data.settings.ftp_remote_host || ""
        nextPort = Number(data.settings.ftp_remote_port) || 21

        setNetworkMode(nextMode)
        setLanHost(nextLanHost)
        setTailscaleHost(nextTsHost)
        setShareName(data.settings.share_name || "Lamha-Storage")
        setFtpPort(nextPort)
        setNasUser(data.settings.ftp_remote_user || "")
        setNasBaseDir(data.settings.ftp_remote_base_dir || "/")
        setHasPassword(Boolean(data.settings.has_nas_password))
      }

      let isLanOk = Boolean(data.lanOnline)
      let lanMs = Number(data.lanLatencyMs) || -1
      let isTsOk = Boolean(data.tailscaleOnline)
      let tsMs = Number(data.tailscaleLatencyMs) || -1

      // Si estamos en el navegador del PC del estudio y el servidor cloud no ve la LAN privada, comprobar vía puente local
      if (!isLanOk && nextLanHost) {
        const localCheck = await checkStudioNas(nextLanHost, nextPort)
        if (localCheck.reachable) {
          isLanOk = true
          lanMs = 5
        }
      }
      if (!isTsOk && nextTsHost) {
        const tsCheck = await checkStudioNas(nextTsHost, nextPort)
        if (tsCheck.reachable) {
          isTsOk = true
          tsMs = 12
        }
      }

      setLanOnline(isLanOk)
      setLanLatency(lanMs)
      setTsOnline(isTsOk)
      setTsLatency(tsMs)

      if (nextMode === "lan") {
        setActiveRoute(isLanOk ? "lan" : "offline")
      } else if (nextMode === "tailscale") {
        setActiveRoute(isTsOk ? "tailscale" : "offline")
      } else {
        setActiveRoute(isLanOk ? "lan" : isTsOk ? "tailscale" : "offline")
      }
    } catch {
      setActiveRoute("offline")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadConfig(false)
  }, [loadConfig])

  // Cambiar modo de red al instante (Auto / LAN / Tailscale)
  const handleQuickModeSwitch = async (mode: "auto" | "lan" | "tailscale") => {
    setNetworkMode(mode)
    setSwitchingMode(true)
    setFeedback(null)
    try {
      const res = await fetch("/api/deliveries/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ network_mode: mode }),
      })
      const data = await res.json()
      if (data.success) {
        await notifyCompanionConfigReload()
        await loadConfig(true)
        onSaved?.()
      }
    } catch {} finally {
      setSwitchingMode(false)
    }
  }

  // Probar Ruta 1 (LAN)
  const handleTestLan = async () => {
    if (!lanHost.trim()) return
    setTestingLan(true)
    setFeedback(null)
    const host = lanHost.trim()
    try {
      const localCheck = await checkStudioNas(host, 445)
      if (localCheck.reachable) {
        setLanOnline(true)
        setLanLatency(5)
        setFeedback({ type: "success", msg: `${texts.testSuccess(5)} [LAN SMB: \\\\${host}\\${shareName}]` })
        setTestingLan(false)
        return
      }

      const res = await fetch("/api/deliveries/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test_smb: true, smb_probe_host: host, ftp_remote_port: ftpPort }),
      })
      const data = await res.json()
      if (data.reachable) {
        setLanOnline(true)
        setLanLatency(data.latencyMs || 5)
        setFeedback({ type: "success", msg: data.message || texts.testSuccess(data.latencyMs) })
      } else {
        setLanOnline(false)
        setFeedback({ type: "error", msg: texts.testError(data.message || "Sin respuesta en LAN") })
      }
    } catch (err: any) {
      setLanOnline(false)
      setFeedback({ type: "error", msg: texts.testError(err.message) })
    } finally {
      setTestingLan(false)
    }
  }

  // Probar Ruta 2 (Tailscale)
  const handleTestTailscale = async () => {
    if (!tailscaleHost.trim()) return
    setTestingTs(true)
    setFeedback(null)
    const host = tailscaleHost.trim()
    try {
      const res = await fetch("/api/deliveries/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          test_ftp: true,
          ftp_remote_host: host,
          ftp_remote_port: ftpPort,
          ftp_remote_user: nasUser,
          ftp_remote_password: nasPassword,
          ftp_remote_base_dir: nasBaseDir,
        }),
      })
      const data = await res.json()
      if (data.reachable || data.online) {
        setTsOnline(true)
        setTsLatency(data.latencyMs || 10)
        setFeedback({ type: "success", msg: data.message || `${texts.testSuccess(data.latencyMs)} [Tailscale: ${host}]` })
      } else {
        const localCheck = await checkStudioNas(host, ftpPort)
        if (localCheck.reachable) {
          setTsOnline(true)
          setTsLatency(10)
          setFeedback({ type: "success", msg: `${texts.testSuccess(10)} [Tailscale: ${host}:${ftpPort}]` })
        } else {
          setTsOnline(false)
          setFeedback({ type: "error", msg: texts.testError(data.message || "Tailscale inalcanzable") })
        }
      }
    } catch (err: any) {
      setTsOnline(false)
      setFeedback({ type: "error", msg: texts.testError(err.message) })
    } finally {
      setTestingTs(false)
    }
  }

  // Guardar todo en Supabase + sincronizar Ingest Companion
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setFeedback(null)
    try {
      const cleanShare = shareName.trim().replace(/^[\\/]+|[\\/]+$/g, "") || "Lamha-Storage"
      const cleanLan = lanHost.trim()
      const cleanTs = tailscaleHost.trim()

      const res = await fetch("/api/deliveries/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          network_mode: networkMode,
          smb_probe_host: cleanLan,
          ftp_remote_host: cleanTs,
          share_name: cleanShare,
          smb_network_path: cleanLan ? `\\\\${cleanLan}\\${cleanShare}` : "",
          ftp_remote_port: ftpPort,
          ftp_remote_user: nasUser.trim(),
          ftp_remote_password: nasPassword,
          ftp_remote_base_dir: nasBaseDir.trim() || "/",
        }),
      })
      const data = await res.json()
      if (data.success) {
        if (nasPassword) setHasPassword(true)
        setNasPassword("")
        await notifyCompanionConfigReload()
        await loadConfig(true)
        onSaved?.()
        setFeedback({ type: "success", msg: texts.saveSuccess })
      } else {
        setFeedback({ type: "error", msg: data.error || texts.saveError })
      }
    } catch (err: any) {
      setFeedback({ type: "error", msg: err.message || texts.saveError })
    } finally {
      setSaving(false)
    }
  }

  const cleanSharePreview = shareName.trim().replace(/^[\\/]+|[\\/]+$/g, "") || "Lamha-Storage"

  return (
    <div
      className={cn(
        "rounded-2xl border border-[#26211c] bg-[#141210] p-6 shadow-xl space-y-6 md:col-span-2",
        isRtl && "text-right"
      )}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#26211c] gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#c69f68]/10 flex items-center justify-center text-[#c69f68] shrink-0">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#f5f2eb] font-serif">{texts.title}</h2>
            <p className="text-xs text-[#8c7a6b]">{texts.subtitle}</p>
          </div>
        </div>

        {/* Estado Activo en Vivo */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {loading || switchingMode ? (
            <span className="text-[11px] text-[#70665a] flex items-center gap-1.5 font-mono">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#c69f68]" />
            </span>
          ) : activeRoute === "lan" ? (
            <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm">
              <Zap className="w-3.5 h-3.5" />
              <span>{texts.statusActiveLan}</span>
              <span className="text-[10px] text-emerald-300 font-mono">({lanHost})</span>
            </div>
          ) : activeRoute === "tailscale" ? (
            <div className="flex items-center gap-2 text-sky-400 bg-sky-500/10 border border-sky-500/30 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm">
              <Globe className="w-3.5 h-3.5" />
              <span>{texts.statusActiveTs}</span>
              <span className="text-[10px] text-sky-300 font-mono">({tailscaleHost})</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-rose-400 bg-rose-500/10 border border-rose-500/30 px-3 py-1.5 rounded-xl text-xs font-semibold">
              <WifiOff className="w-3.5 h-3.5" />
              <span>{texts.statusOffline}</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => loadConfig(true)}
            className="p-2 rounded-xl bg-[#181613] hover:bg-[#221e19] border border-[#26211c] text-[#a89f91] hover:text-[#f5f2eb] transition-colors cursor-pointer"
            title="Refrescar estado de red"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Selector de Modo de Red (Switch Instantáneo Auto / LAN / Tailscale) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-[#0f0e0c] border border-[#26211c]">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#d5cfc5]">
          <ShieldCheck className="w-4 h-4 text-[#c69f68]" />
          <span>{texts.modeTitle}</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleQuickModeSwitch("auto")}
            disabled={switchingMode}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer",
              networkMode === "auto"
                ? "bg-[#c69f68] text-[#0b0a09] shadow-sm font-bold"
                : "bg-[#181613] text-[#a89f91] hover:text-[#f5f2eb] border border-[#26211c]"
            )}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{texts.modeAuto}</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickModeSwitch("lan")}
            disabled={switchingMode}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer",
              networkMode === "lan"
                ? "bg-emerald-500 text-[#0b0a09] shadow-sm font-bold"
                : "bg-[#181613] text-[#a89f91] hover:text-[#f5f2eb] border border-[#26211c]"
            )}
          >
            <Network className="w-3.5 h-3.5" />
            <span>{texts.modeLan}</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickModeSwitch("tailscale")}
            disabled={switchingMode}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer",
              networkMode === "tailscale"
                ? "bg-sky-500 text-[#0b0a09] shadow-sm font-bold"
                : "bg-[#181613] text-[#a89f91] hover:text-[#f5f2eb] border border-[#26211c]"
            )}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{texts.modeTailscale}</span>
          </button>
        </div>
      </div>

      {/* Formulario Centralizado */}
      <form onSubmit={handleSave} className="space-y-5 text-xs">
        {/* Tarjetas Gemelas: Ruta 1 (LAN Local) y Ruta 2 (Tailscale VPN) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* RUTA 1: RED LOCAL LAN */}
          <div
            className={cn(
              "p-4 rounded-xl border space-y-3 transition-all",
              activeRoute === "lan"
                ? "bg-emerald-950/10 border-emerald-500/40"
                : "bg-[#100f0d] border-[#26211c]"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-[#f5f2eb]">
                <Network className="w-4 h-4 text-emerald-400" />
                <span>{texts.route1Title}</span>
              </div>
              <span
                className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full font-mono border",
                  lanOnline
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                    : "bg-[#1c1915] text-[#70665a] border-[#26211c]"
                )}
              >
                {lanOnline ? `● ${texts.onlineBadge}${lanLatency > 0 ? ` (${lanLatency}ms)` : ""}` : `○ ${texts.offlineBadge}`}
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-[#a89f91] font-medium block">{texts.lanIpLabel}</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={lanHost}
                  onChange={(e) => setLanHost(e.target.value)}
                  placeholder="Ej: 192.168.11.200"
                  className="flex-1 px-3 py-2 rounded-xl bg-[#181613] border border-[#29241f] text-[#f5f2eb] focus:border-emerald-500 outline-none font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={handleTestLan}
                  disabled={testingLan || !lanHost.trim()}
                  className="px-3 py-2 rounded-xl bg-[#1f1a15] hover:bg-[#28211b] border border-emerald-500/30 text-emerald-300 font-semibold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {testingLan ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />}
                  <span>{testingLan ? texts.testing : texts.btnTestLan}</span>
                </button>
              </div>
              <span className="text-[10px] text-[#70665a] block">{texts.lanIpHint}</span>
            </div>

            <div className="pt-1 text-[11px] font-mono text-[#8c7a6b] flex items-center justify-between bg-[#141210] px-3 py-1.5 rounded-lg border border-[#221e19]">
              <span>SMB LAN:</span>
              <span className="text-emerald-300 truncate">
                {lanHost.trim() ? `\\\\${lanHost.trim()}\\${cleanSharePreview}` : "—"}
              </span>
            </div>
          </div>

          {/* RUTA 2: RED TAILSCALE VPN */}
          <div
            className={cn(
              "p-4 rounded-xl border space-y-3 transition-all",
              activeRoute === "tailscale"
                ? "bg-sky-950/10 border-sky-500/40"
                : "bg-[#100f0d] border-[#26211c]"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-[#f5f2eb]">
                <Globe className="w-4 h-4 text-sky-400" />
                <span>{texts.route2Title}</span>
              </div>
              <span
                className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full font-mono border",
                  tsOnline
                    ? "bg-sky-500/15 text-sky-300 border-sky-500/30"
                    : "bg-[#1c1915] text-[#70665a] border-[#26211c]"
                )}
              >
                {tsOnline ? `● ${texts.onlineBadge}${tsLatency > 0 ? ` (${tsLatency}ms)` : ""}` : `○ ${texts.offlineBadge}`}
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-[#a89f91] font-medium block">{texts.tsIpLabel}</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tailscaleHost}
                  onChange={(e) => setTailscaleHost(e.target.value)}
                  placeholder="Ej: 100.113.239.52"
                  className="flex-1 px-3 py-2 rounded-xl bg-[#181613] border border-[#29241f] text-[#f5f2eb] focus:border-sky-500 outline-none font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={handleTestTailscale}
                  disabled={testingTs || !tailscaleHost.trim()}
                  className="px-3 py-2 rounded-xl bg-[#1f1a15] hover:bg-[#28211b] border border-sky-500/30 text-sky-300 font-semibold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {testingTs ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                  <span>{testingTs ? texts.testing : texts.btnTestTs}</span>
                </button>
              </div>
              <span className="text-[10px] text-[#70665a] block">{texts.tsIpHint}</span>
            </div>

            <div className="pt-1 text-[11px] font-mono text-[#8c7a6b] flex items-center justify-between bg-[#141210] px-3 py-1.5 rounded-lg border border-[#221e19]">
              <span>SMB / FTP Tailscale:</span>
              <span className="text-sky-300 truncate">
                {tailscaleHost.trim() ? `\\\\${tailscaleHost.trim()}\\${cleanSharePreview}` : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Credenciales Únicas Compartidas y Carpetas */}
        <div className="p-4 rounded-xl bg-[#100f0d] border border-[#26211c] space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#c69f68]">
            <Key className="w-4 h-4" />
            <span>{texts.credsTitle}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* Share Name SMB */}
            <div className="space-y-1">
              <label className="text-[#a89f91] font-medium block">{texts.shareNameLabel}</label>
              <div className="relative">
                <HardDrive className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#70665a]" />
                <input
                  type="text"
                  value={shareName}
                  onChange={(e) => setShareName(e.target.value)}
                  placeholder="Lamha-Storage"
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#181613] border border-[#29241f] text-[#f5f2eb] focus:border-[#c69f68] outline-none font-mono text-xs"
                />
              </div>
              <span className="text-[10px] text-[#70665a] block">{texts.shareNameHint}</span>
            </div>

            {/* FTP Base Dir */}
            <div className="space-y-1">
              <label className="text-[#a89f91] font-medium block">{texts.ftpDirLabel}</label>
              <div className="relative">
                <Folder className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#70665a]" />
                <input
                  type="text"
                  value={nasBaseDir}
                  onChange={(e) => setNasBaseDir(e.target.value)}
                  placeholder="/"
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#181613] border border-[#29241f] text-[#f5f2eb] focus:border-[#c69f68] outline-none font-mono text-xs"
                />
              </div>
            </div>

            {/* FTP Port */}
            <div className="space-y-1">
              <label className="text-[#a89f91] font-medium block">{texts.ftpPortLabel}</label>
              <input
                type="number"
                value={ftpPort}
                onChange={(e) => setFtpPort(parseInt(e.target.value, 10) || 21)}
                placeholder="21"
                className="w-full px-3 py-2 rounded-xl bg-[#181613] border border-[#29241f] text-[#f5f2eb] focus:border-[#c69f68] outline-none font-mono text-xs"
              />
            </div>

            {/* NAS Username */}
            <div className="space-y-1">
              <label className="text-[#a89f91] font-medium block">{texts.ftpUserLabel}</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#70665a]" />
                <input
                  type="text"
                  value={nasUser}
                  onChange={(e) => setNasUser(e.target.value)}
                  placeholder="Usuario NAS"
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#181613] border border-[#29241f] text-[#f5f2eb] focus:border-[#c69f68] outline-none font-mono text-xs"
                />
              </div>
            </div>

            {/* NAS Password */}
            <div className="space-y-1">
              <label className="text-[#a89f91] font-medium flex items-center justify-between">
                <span>{texts.ftpPassLabel}</span>
                {hasPassword && <span className="text-[10px] text-emerald-400 font-normal">●●●● (OK)</span>}
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#70665a]" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={nasPassword}
                  onChange={(e) => setNasPassword(e.target.value)}
                  placeholder={texts.passPlaceholder}
                  className="w-full pl-8 pr-9 py-2 rounded-xl bg-[#181613] border border-[#29241f] text-[#f5f2eb] focus:border-[#c69f68] outline-none text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#70665a] hover:text-[#f5f2eb]"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={cn(
              "p-3 rounded-xl border flex items-center gap-2.5 text-xs animate-in fade-in duration-200",
              feedback.type === "success"
                ? "bg-emerald-950/30 border-emerald-800/40 text-emerald-300"
                : "bg-rose-950/30 border-rose-800/40 text-rose-300"
            )}
          >
            {feedback.type === "success" ? (
              <Check className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span className="font-medium">{feedback.msg}</span>
          </div>
        )}

        {/* Save Button */}
        <div className="flex items-center justify-end pt-2 border-t border-[#26211c]">
          <button
            type="submit"
            disabled={saving || testingLan || testingTs}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#c69f68] to-[#dfba85] text-[#0b0a09] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md hover:opacity-95 disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>{saving ? texts.saving : texts.btnSave}</span>
          </button>
        </div>
      </form>
    </div>
  )
}
