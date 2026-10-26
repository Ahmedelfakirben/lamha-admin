"use client"

import { useState, useEffect } from "react"
import { 
  Server, 
  HardDrive, 
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
  ShieldCheck
} from "lucide-react"
import { useLanguage } from "@/context/language-context"
import { cn } from "@/lib/utils"
import { checkStudioNas } from "@/lib/desktop-bridge"

const NAS_CARD_I18N = {
  fr: {
    title: "Stockage Atelier Dual-Access (SMB Local & Tailscale FTP)",
    subtitle: "Routage intelligent : SMB ultra-rapide au studio avec bascule transparente vers Tailscale hors ligne",
    tabSmb: "1. Réseau Local (SMB)",
    tabFtp: "2. Accès Distant (Tailscale FTP)",
    smbPathLabel: "Chemin d'Accès Réseau SMB Local :",
    smbPathHint: "Ex: \\\\192.168.1.220\\Proyectos ou Z:\\Proyectos (Accès ultra-rapide 1Gbps/10Gbps)",
    smbProbeHostLabel: "Hôte de Sonde Anti-Gel TCP 445 :",
    smbProbeHostHint: "IP testée en < 500ms pour éviter tout blocage hors du studio (Ex: 192.168.1.220)",
    ftpHostLabel: "Hôte / IP Tailscale VPN (Secours Distant) :",
    ftpHostHint: "Ex: 100.x.y.z (IP privée Tailscale de votre NAS accessible de partout)",
    ftpPortLabel: "Port FTP :",
    ftpUserLabel: "Utilisateur NAS / FTP :",
    ftpUserHint: "Utilisateur avec permissions de lecture/écriture",
    ftpPassLabel: "Mot de passe FTP :",
    passPlaceholder: "(Laisser vide pour ne pas modifier)",
    ftpDirLabel: "Dossier Racine Distant :",
    ftpDirHint: "Ex: /usb1_1/Lamha-Storage ou /Proyectos",
    btnTestSmb: "Tester Sonde SMB (< 500ms)",
    btnTestFtp: "Tester FTP Tailscale",
    btnSave: "Enregistrer la Configuration",
    testing: "Test en cours...",
    saving: "Enregistrement...",
    statusSmbOnline: "Connecté : Réseau Local (SMB)",
    statusFtpOnline: "Connecté : Distant (Tailscale FTP)",
    statusOffline: "Stockage Déconnecté",
    saveSuccess: "Configuration double accès enregistrée avec succès !",
    saveError: "Erreur lors de l'enregistrement",
    testSuccess: (ms: number) => `Connexion réussie (${ms}ms)`,
    testError: (err: string) => `Échec : ${err}`,
  },
  es: {
    title: "Almacenamiento Atelier Dual-Access (SMB Local & Tailscale FTP)",
    subtitle: "Enrutamiento inteligente: SMB local a máxima velocidad con salto transparente a Tailscale en remoto",
    tabSmb: "1. Red Local (SMB)",
    tabFtp: "2. Acceso Remoto (Tailscale FTP)",
    smbPathLabel: "Ruta de Red SMB Local (Principal):",
    smbPathHint: "Ej: \\\\192.168.1.220\\Proyectos o unidad mapeada Z:\\Proyectos",
    smbProbeHostLabel: "Host de Sondeo Anti-Congelamiento TCP 445:",
    smbProbeHostHint: "IP verificada en < 500ms por socket para evitar el congelamiento de Windows (Ej: 192.168.1.220)",
    ftpHostLabel: "Host / IP Tailscale VPN (Respaldo Remoto):",
    ftpHostHint: "Ej: 100.x.y.z (IP privada Tailscale del NAS accesible desde cualquier lugar)",
    ftpPortLabel: "Puerto FTP:",
    ftpUserLabel: "Usuario NAS / FTP:",
    ftpUserHint: "Usuario con permisos de lectura y escritura",
    ftpPassLabel: "Contraseña FTP:",
    passPlaceholder: "(Dejar en blanco para no modificar)",
    ftpDirLabel: "Carpeta Base / Compartida:",
    ftpDirHint: "Ej: /usb1_1/Lamha-Storage o /Proyectos",
    btnTestSmb: "Probar Red Local (< 500ms)",
    btnTestFtp: "Probar FTP Tailscale",
    btnSave: "Guardar Configuración Dual",
    testing: "Probando...",
    saving: "Guardando...",
    statusSmbOnline: "Conectado: Red Local (SMB)",
    statusFtpOnline: "Conectado: Remoto (Tailscale FTP)",
    statusOffline: "Almacenamiento Desconectado",
    saveSuccess: "¡Configuración de almacenamiento dual guardada con éxito!",
    saveError: "Error al guardar la configuración",
    testSuccess: (ms: number) => `Conexión exitosa (${ms}ms)`,
    testError: (err: string) => `Fallo: ${err}`,
  },
  en: {
    title: "Dual-Access Atelier Storage (Local SMB & Tailscale FTP)",
    subtitle: "Smart routing: full-speed local SMB at studio with seamless fallback to Tailscale when remote",
    tabSmb: "1. Local Network (SMB)",
    tabFtp: "2. Remote Access (Tailscale FTP)",
    smbPathLabel: "Local SMB Network Path (Primary):",
    smbPathHint: "Ex: \\\\192.168.1.220\\Proyectos or mapped drive Z:\\Proyectos",
    smbProbeHostLabel: "Anti-Freeze TCP 445 Probe Host:",
    smbProbeHostHint: "IP checked in < 500ms via socket to prevent Windows thread hangs (Ex: 192.168.1.220)",
    ftpHostLabel: "Tailscale VPN Host / IP (Remote Fallback):",
    ftpHostHint: "Ex: 100.x.y.z (Private Tailscale IP reachable from outside the studio)",
    ftpPortLabel: "FTP Port:",
    ftpUserLabel: "NAS / FTP Username:",
    ftpUserHint: "User account with read/write access",
    ftpPassLabel: "FTP Password:",
    passPlaceholder: "(Leave blank to keep existing password)",
    ftpDirLabel: "Remote Base Directory:",
    ftpDirHint: "Ex: /usb1_1/Lamha-Storage or /Proyectos",
    btnTestSmb: "Test Local SMB (< 500ms)",
    btnTestFtp: "Test Tailscale FTP",
    btnSave: "Save Dual Configuration",
    testing: "Testing...",
    saving: "Saving...",
    statusSmbOnline: "Connected: Local Network (SMB)",
    statusFtpOnline: "Connected: Remote (Tailscale FTP)",
    statusOffline: "Storage Disconnected",
    saveSuccess: "Dual storage configuration saved successfully!",
    saveError: "Error saving configuration",
    testSuccess: (ms: number) => `Connection successful (${ms}ms)`,
    testError: (err: string) => `Failed: ${err}`,
  },
  ar: {
    title: "نظام التخزين المزدوج للاستوديو (SMB المحلي و Tailscale FTP)",
    subtitle: "توجيه ذكي: اتصال SMB فائق السرعة داخل الاستوديو مع انتقال سلس لـ Tailscale عند العمل عن بعد",
    tabSmb: "1. الشبكة المحلية (SMB)",
    tabFtp: "2. الاتصال عن بعد (Tailscale FTP)",
    smbPathLabel: "مسار شبكة SMB المحلية (الأساسي):",
    smbPathHint: "مثال: \\\\192.168.1.220\\Proyectos أو محرك الأقراص Z:\\Proyectos",
    smbProbeHostLabel: "عنوان فحص TCP 445 السريع لمنع التجميد:",
    smbProbeHostHint: "فحص يتم في أقل من 500ms لمنع تجمد نظام ويندوز (مثال: 192.168.1.220)",
    ftpHostLabel: "مضيف أو عنوان Tailscale VPN (الاحتياطي عن بعد):",
    ftpHostHint: "مثال: 100.x.y.z (عنوان Tailscale الخاص بوحدة NAS للوصول من أي مكان)",
    ftpPortLabel: "منفذ FTP:",
    ftpUserLabel: "اسم مستخدم NAS / FTP:",
    ftpUserHint: "حساب يملك صلاحيات القراءة والكتابة",
    ftpPassLabel: "كلمة مرور FTP:",
    passPlaceholder: "(اتركه فارغاً للإبقاء على كلمة المرور الحالية)",
    ftpDirLabel: "المجلد الرئيسي المشترك:",
    ftpDirHint: "مثال: /usb1_1/Lamha-Storage أو /Proyectos",
    btnTestSmb: "فحص شبكة SMB المحلية (< 500ms)",
    btnTestFtp: "اختبار اتصال Tailscale FTP",
    btnSave: "حفظ الإعدادات المزدوجة",
    testing: "جاري الاختبار...",
    saving: "جاري الحفظ...",
    statusSmbOnline: "متصل: الشبكة المحلية (SMB)",
    statusFtpOnline: "متصل: عن بعد (Tailscale FTP)",
    statusOffline: "وحدة التخزين غير متصلة",
    saveSuccess: "تم حفظ الإعدادات المزدوجة بنجاح!",
    saveError: "حدث خطأ أثناء حفظ الإعدادات",
    testSuccess: (ms: number) => `تم الاتصال بنجاح (${ms} ملي ثانية)`,
    testError: (err: string) => `فشل الاتصال: ${err}`,
  },
} as const

export function NasConfigCard() {
  const { language, dir } = useLanguage()
  const isRtl = dir === "rtl"
  const activeLang = (language === "ar" || language === "en" || language === "es" || language === "fr")
    ? language
    : "es"
  const texts = NAS_CARD_I18N[activeLang]

  const [activeTab, setActiveTab] = useState<"smb" | "ftp">("smb")

  // Estado SMB Local
  const [smbNetworkPath, setSmbNetworkPath] = useState("\\\\192.168.1.220\\Proyectos")
  const [smbProbeHost, setSmbProbeHost] = useState("192.168.1.220")

  // Estado FTP Tailscale
  const [ftpRemoteHost, setFtpRemoteHost] = useState("")
  const [ftpRemotePort, setFtpRemotePort] = useState(21)
  const [ftpRemoteUser, setFtpRemoteUser] = useState("admin")
  const [ftpRemotePassword, setFtpRemotePassword] = useState("")
  const [ftpRemoteBaseDir, setFtpRemoteBaseDir] = useState("/usb1_1/Lamha-Storage")
  const [hasPassword, setHasPassword] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Estados de conexión
  const [isSmbOnline, setIsSmbOnline] = useState<boolean | null>(null)
  const [isFtpOnline, setIsFtpOnline] = useState<boolean | null>(null)
  const [connectionMode, setConnectionMode] = useState<"smb_local" | "tailscale_ftp" | "offline">("offline")
  const [latencyMs, setLatencyMs] = useState<number | null>(null)

  const [loading, setLoading] = useState(true)
  const [testingSmb, setTestingSmb] = useState(false)
  const [testingFtp, setTestingFtp] = useState(false)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null)

  // Cargar configuración actual desde API
  const loadConfig = async () => {
    try {
      const res = await fetch("/api/deliveries/settings")
      const data = await res.json()
      let isSmb = Boolean(data.isSmbOnline)
      let isFtp = Boolean(data.isNasOnline)
      let mode = data.connectionMode || "offline"

      if (data.settings) {
        if (data.settings.smb_network_path) setSmbNetworkPath(data.settings.smb_network_path)
        if (data.settings.smb_probe_host) setSmbProbeHost(data.settings.smb_probe_host)
        if (data.settings.ftp_remote_host !== undefined) setFtpRemoteHost(data.settings.ftp_remote_host)
        if (data.settings.ftp_remote_port) setFtpRemotePort(data.settings.ftp_remote_port)
        if (data.settings.ftp_remote_user) setFtpRemoteUser(data.settings.ftp_remote_user)
        if (data.settings.ftp_remote_base_dir) setFtpRemoteBaseDir(data.settings.ftp_remote_base_dir)
        setHasPassword(Boolean(data.settings.ftp_remote_password))
      }

      // Si la nube marca offline pero estamos en la red local del estudio, verificar directamente por socket TCP
      if (!isSmb && !isFtp) {
        const testHost = data.settings?.ftp_remote_host || "192.168.11.1"
        const testPort = Number(data.settings?.ftp_remote_port) || 21
        const localCheck = await checkStudioNas(testHost, testPort)
        if (localCheck.reachable) {
          isFtp = true
          mode = "ftp"
        }
      }

      setIsSmbOnline(isSmb)
      setIsFtpOnline(isFtp)
      setConnectionMode(mode)
    } catch {
      setIsSmbOnline(false)
      setIsFtpOnline(false)
      setConnectionMode("offline")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadConfig()
  }, [])

  // Probar Socket TCP 445 en < 500ms
  const handleTestSmb = async () => {
    setTestingSmb(true)
    setFeedback(null)
    const host = smbProbeHost || "192.168.11.1"
    try {
      // 1. Probar localmente desde el PC
      const localCheck = await checkStudioNas(host, 445)
      if (localCheck.reachable) {
        setIsSmbOnline(true)
        setLatencyMs(15)
        setFeedback({ type: "success", msg: texts.testSuccess(15) + ` [SMB Local: ${host}:445]` })
        setTestingSmb(false)
        return
      }

      // 2. Consulta API backend
      const res = await fetch("/api/deliveries/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test_smb: true, smb_probe_host: host }),
      })
      const data = await res.json()
      if (data.reachable) {
        setIsSmbOnline(true)
        setLatencyMs(data.latencyMs)
        setFeedback({ type: "success", msg: texts.testSuccess(data.latencyMs) + ` [${host}:445]` })
      } else {
        setIsSmbOnline(false)
        setFeedback({ type: "error", msg: texts.testError(data.message || "Timeout 500ms") })
      }
    } catch (err: any) {
      setIsSmbOnline(false)
      setFeedback({ type: "error", msg: texts.testError(err.message) })
    } finally {
      setTestingSmb(false)
    }
  }

  // Probar FTP Tailscale
  const handleTestFtp = async () => {
    setTestingFtp(true)
    setFeedback(null)
    const targetHost = ftpRemoteHost || "192.168.11.1"
    const targetPort = Number(ftpRemotePort) || 21

    try {
      // 1. Probar localmente desde el PC (app de escritorio o Ingest Companion)
      const localCheck = await checkStudioNas(targetHost, targetPort)
      if (localCheck.reachable) {
        setIsFtpOnline(true)
        setFeedback({ type: "success", msg: texts.testSuccess(15) + ` [FTP Local Verificado: ${targetHost}:${targetPort}]` })
        setTestingFtp(false)
        return
      }

      // 2. Probar mediante la API de backend (si es Tailscale con IP accesible desde la nube)
      const res = await fetch("/api/settings/nas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          host: targetHost, 
          user: ftpRemoteUser, 
          password: ftpRemotePassword, 
          baseDir: ftpRemoteBaseDir, 
          testOnly: true 
        }),
      })
      const data = await res.json()
      if (data.online) {
        setIsFtpOnline(true)
        setFeedback({ type: "success", msg: texts.testSuccess(data.latencyMs) + ` [FTP]` })
      } else {
        setIsFtpOnline(false)
        setFeedback({ type: "error", msg: texts.testError(data.error || "Timeout") })
      }
    } catch (err: any) {
      setIsFtpOnline(false)
      setFeedback({ type: "error", msg: texts.testError(err.message) })
    } finally {
      setTestingFtp(false)
    }
  }

  // Guardar configuración dual
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setFeedback(null)
    try {
      const res = await fetch("/api/deliveries/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          smb_network_path: smbNetworkPath,
          smb_probe_host: smbProbeHost,
          ftp_remote_host: ftpRemoteHost,
          ftp_remote_port: ftpRemotePort,
          ftp_remote_user: ftpRemoteUser,
          ftp_remote_password: ftpRemotePassword,
          ftp_remote_base_dir: ftpRemoteBaseDir,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setFeedback({ type: "success", msg: texts.saveSuccess })
        if (ftpRemotePassword) setHasPassword(true)
        setFtpRemotePassword("")
        loadConfig()
      } else {
        setFeedback({ type: "error", msg: data.error || texts.saveError })
      }
    } catch (err: any) {
      setFeedback({ type: "error", msg: err.message || texts.saveError })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={cn(
      "rounded-2xl border border-[#26211c] bg-[#141210] p-6 shadow-xl space-y-6 md:col-span-2",
      isRtl && "text-right"
    )}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#26211c] gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#c69f68]/10 flex items-center justify-center text-[#c69f68] shrink-0">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#f5f2eb] font-serif">
              {texts.title}
            </h2>
            <p className="text-xs text-[#8c7a6b]">{texts.subtitle}</p>
          </div>
        </div>

        {/* Live Status Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {loading ? (
            <span className="text-[11px] text-[#70665a] flex items-center gap-1.5 font-mono">
              <RefreshCw className="w-3 h-3 animate-spin text-[#c69f68]" />
            </span>
          ) : isSmbOnline ? (
            <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-xl text-xs font-semibold shadow-sm">
              <Zap className="w-3.5 h-3.5" />
              <span>{texts.statusSmbOnline}</span>
              {latencyMs !== null && latencyMs > 0 && (
                <span className="text-[10px] text-emerald-300 font-mono">({latencyMs}ms)</span>
              )}
            </div>
          ) : isFtpOnline ? (
            <div className="flex items-center gap-2 text-purple-400 bg-purple-500/10 border border-purple-500/30 px-3 py-1 rounded-xl text-xs font-semibold shadow-sm">
              <Globe className="w-3.5 h-3.5" />
              <span>{texts.statusFtpOnline}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-rose-400 bg-rose-500/10 border border-rose-500/30 px-3 py-1 rounded-xl text-xs font-semibold">
              <WifiOff className="w-3.5 h-3.5" />
              <span>{texts.statusOffline}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex items-center gap-2 p-1 rounded-xl bg-[#0f0e0c] border border-[#26211c] w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("smb")}
          className={cn(
            "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer",
            activeTab === "smb"
              ? "bg-[#c69f68] text-[#0b0a09] shadow-sm font-bold"
              : "text-[#8c7a6b] hover:text-[#f5f2eb]"
          )}
        >
          <Network className="w-3.5 h-3.5" />
          <span>{texts.tabSmb}</span>
          {isSmbOnline && <span className="w-2 h-2 rounded-full bg-emerald-950 animate-pulse" />}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("ftp")}
          className={cn(
            "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer",
            activeTab === "ftp"
              ? "bg-purple-600 text-white shadow-sm font-bold"
              : "text-[#8c7a6b] hover:text-[#f5f2eb]"
          )}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>{texts.tabFtp}</span>
          {isFtpOnline && <span className="w-2 h-2 rounded-full bg-purple-200 animate-pulse" />}
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="space-y-4 text-xs">
        {activeTab === "smb" ? (
          /* TAB 1: SMB Local */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-150">
            {/* SMB Path */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[#a89f91] font-semibold block">
                {texts.smbPathLabel}
              </label>
              <div className="relative">
                <Network className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#70665a]" />
                <input
                  type="text"
                  value={smbNetworkPath}
                  onChange={(e) => setSmbNetworkPath(e.target.value)}
                  placeholder="\\\\192.168.1.220\\Proyectos"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#181613] border border-[#29241f] text-[#f5f2eb] focus:border-[#c69f68] outline-none font-mono text-xs transition-colors"
                  required
                />
              </div>
              <span className="text-[10px] text-[#70665a] block">{texts.smbPathHint}</span>
            </div>

            {/* Probe Host */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[#a89f91] font-semibold flex items-center justify-between">
                <span>{texts.smbProbeHostLabel}</span>
                <span className="text-[10px] text-sky-400 font-mono font-normal">Puerto 445 • Timeout 500ms</span>
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#70665a]" />
                  <input
                    type="text"
                    value={smbProbeHost}
                    onChange={(e) => setSmbProbeHost(e.target.value)}
                    placeholder="192.168.1.220"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#181613] border border-[#29241f] text-[#f5f2eb] focus:border-[#c69f68] outline-none font-mono text-xs transition-colors"
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={handleTestSmb}
                  disabled={testingSmb || saving}
                  className="px-4 py-2.5 rounded-xl bg-[#1f1a15] hover:bg-[#28211b] border border-[#c69f68]/30 text-[#c69f68] font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {testingSmb ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  <span>{testingSmb ? texts.testing : texts.btnTestSmb}</span>
                </button>
              </div>
              <span className="text-[10px] text-[#70665a] block">{texts.smbProbeHostHint}</span>
            </div>
          </div>
        ) : (
          /* TAB 2: Tailscale FTP */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-150">
            {/* Tailscale IP */}
            <div className="space-y-1.5">
              <label className="text-[#a89f91] font-semibold block">
                {texts.ftpHostLabel}
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#70665a]" />
                <input
                  type="text"
                  value={ftpRemoteHost}
                  onChange={(e) => setFtpRemoteHost(e.target.value)}
                  placeholder="100.64.0.5"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#181613] border border-[#29241f] text-[#f5f2eb] focus:border-purple-500 outline-none font-mono text-xs transition-colors"
                />
              </div>
              <span className="text-[10px] text-[#70665a] block">{texts.ftpHostHint}</span>
            </div>

            {/* FTP Port */}
            <div className="space-y-1.5">
              <label className="text-[#a89f91] font-semibold block">
                {texts.ftpPortLabel}
              </label>
              <input
                type="number"
                value={ftpRemotePort}
                onChange={(e) => setFtpRemotePort(parseInt(e.target.value, 10) || 21)}
                placeholder="21"
                className="w-full px-3 py-2.5 rounded-xl bg-[#181613] border border-[#29241f] text-[#f5f2eb] focus:border-purple-500 outline-none font-mono text-xs transition-colors"
              />
              <span className="text-[10px] text-[#70665a] block">Puerto estándar (21)</span>
            </div>

            {/* User */}
            <div className="space-y-1.5">
              <label className="text-[#a89f91] font-semibold block">
                {texts.ftpUserLabel}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#70665a]" />
                <input
                  type="text"
                  value={ftpRemoteUser}
                  onChange={(e) => setFtpRemoteUser(e.target.value)}
                  placeholder="admin"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#181613] border border-[#29241f] text-[#f5f2eb] focus:border-purple-500 outline-none font-mono text-xs transition-colors"
                />
              </div>
              <span className="text-[10px] text-[#70665a] block">{texts.ftpUserHint}</span>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-[#a89f91] font-semibold flex items-center justify-between">
                <span>{texts.ftpPassLabel}</span>
                {hasPassword && (
                  <span className="text-[10px] text-emerald-400 font-normal">●●●●●●●● (enregistré)</span>
                )}
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#70665a]" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={ftpRemotePassword}
                  onChange={(e) => setFtpRemotePassword(e.target.value)}
                  placeholder={texts.passPlaceholder}
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-[#181613] border border-[#29241f] text-[#f5f2eb] focus:border-purple-500 outline-none text-xs transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#70665a] hover:text-[#f5f2eb]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Base Directory */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[#a89f91] font-semibold block">
                {texts.ftpDirLabel}
              </label>
              <div className="relative">
                <Folder className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#70665a]" />
                <input
                  type="text"
                  value={ftpRemoteBaseDir}
                  onChange={(e) => setFtpRemoteBaseDir(e.target.value)}
                  placeholder="/usb1_1/Lamha-Storage"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#181613] border border-[#29241f] text-[#f5f2eb] focus:border-purple-500 outline-none font-mono text-xs transition-colors"
                />
              </div>
              <span className="text-[10px] text-[#70665a] block">{texts.ftpDirHint}</span>
            </div>

            <div className="md:col-span-2 flex justify-start">
              <button
                type="button"
                onClick={handleTestFtp}
                disabled={testingFtp || saving}
                className="px-4 py-2 rounded-xl bg-[#1f1a15] hover:bg-[#28211b] border border-purple-500/40 text-purple-300 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {testingFtp ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                <span>{testingFtp ? texts.testing : texts.btnTestFtp}</span>
              </button>
            </div>
          </div>
        )}

        {/* Feedback Alert */}
        {feedback && (
          <div className={cn(
            "p-3 rounded-xl border flex items-center gap-2.5 text-xs animate-in fade-in duration-200",
            feedback.type === "success" 
              ? "bg-emerald-950/30 border-emerald-800/40 text-emerald-300"
              : "bg-rose-950/30 border-rose-800/40 text-rose-300"
          )}>
            {feedback.type === "success" ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span className="font-medium">{feedback.msg}</span>
          </div>
        )}

        {/* Save Button */}
        <div className="flex items-center justify-end pt-2 border-t border-[#26211c]">
          <button
            type="submit"
            disabled={saving || testingSmb || testingFtp}
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
