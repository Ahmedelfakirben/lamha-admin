"use client"

import { useState, useEffect } from "react"
import { Server, HardDrive, Wifi, WifiOff, Key, User, Folder, Check, AlertCircle, RefreshCw, Eye, EyeOff, Save } from "lucide-react"
import { useLanguage } from "@/context/language-context"
import { cn } from "@/lib/utils"

const NAS_CARD_I18N = {
  fr: {
    title: "Configuration NAS & QNAP Atelier",
    subtitle: "Paramètres de connexion FTP locale pour l'archivage maître et les ingestas",
    hostLabel: "Hôte / Adresse IP du NAS (QNAP) :",
    hostHint: "Ex: 192.168.1.150 ou 192.168.11.1 (sur le même réseau local)",
    userLabel: "Utilisateur du NAS :",
    userHint: "Ex: admin ou utilisateur avec droits d'écriture",
    passLabel: "Mot de passe du NAS :",
    passPlaceholder: "(Laisser vide pour ne pas modifier)",
    dirLabel: "Dossier Racine / Partage :",
    dirHint: "Ex: /Lamha-Storage ou /usb1_1/Lamha-Storage",
    btnTest: "Tester la Connexion",
    btnSave: "Enregistrer la Configuration",
    testing: "Test en cours...",
    saving: "Enregistrement...",
    statusOnline: "NAS En Ligne",
    statusOffline: "NAS Non Détecté",
    saveSuccess: "Configuration enregistrée avec succès !",
    saveError: "Erreur lors de l'enregistrement",
    testSuccess: (ms: number) => `Connecté avec succès au NAS (${ms}ms)`,
    testError: (err: string) => `Échec de connexion : ${err}`,
  },
  es: {
    title: "Configuración NAS & QNAP Atelier",
    subtitle: "Ajustes de conexión FTP local para el archivo maestro e ingestas",
    hostLabel: "Host / Dirección IP del NAS (QNAP):",
    hostHint: "Ej: 192.168.1.150 o 192.168.11.1 (en la misma red local)",
    userLabel: "Usuario del NAS:",
    userHint: "Ej: admin o usuario con permisos de escritura",
    passLabel: "Contraseña del NAS:",
    passPlaceholder: "(Dejar en blanco para no modificar)",
    dirLabel: "Carpeta Base / Compartida:",
    dirHint: "Ej: /Lamha-Storage o /usb1_1/Lamha-Storage",
    btnTest: "Probar Conexión",
    btnSave: "Guardar Configuración",
    testing: "Probando...",
    saving: "Guardando...",
    statusOnline: "NAS En Línea",
    statusOffline: "NAS No Detectado",
    saveSuccess: "¡Configuración guardada con éxito!",
    saveError: "Error al guardar la configuración",
    testSuccess: (ms: number) => `Conectado al NAS con éxito (${ms}ms)`,
    testError: (err: string) => `Fallo de conexión: ${err}`,
  },
  en: {
    title: "NAS & QNAP Atelier Configuration",
    subtitle: "Local FTP connection settings for master archiving and ingests",
    hostLabel: "NAS Host / IP Address (QNAP):",
    hostHint: "Ex: 192.168.1.150 or 192.168.11.1 (on the same local network)",
    userLabel: "NAS Username:",
    userHint: "Ex: admin or dedicated studio user",
    passLabel: "NAS Password:",
    passPlaceholder: "(Leave empty to keep existing password)",
    dirLabel: "Base Directory / Share Folder:",
    dirHint: "Ex: /Lamha-Storage or /usb1_1/Lamha-Storage",
    btnTest: "Test Connection",
    btnSave: "Save Configuration",
    testing: "Testing...",
    saving: "Saving...",
    statusOnline: "NAS Online",
    statusOffline: "NAS Unreachable",
    saveSuccess: "Configuration saved successfully!",
    saveError: "Error saving configuration",
    testSuccess: (ms: number) => `Connected successfully to NAS (${ms}ms)`,
    testError: (err: string) => `Connection failed: ${err}`,
  },
  ar: {
    title: "إعدادات وحدة التخزين NAS و QNAP في الأتيليه",
    subtitle: "إعدادات اتصال FTP المحلي للأرشفة الرئيسية ونقل ملفات الجلسات",
    hostLabel: "عنوان IP أو مضيف NAS (QNAP):",
    hostHint: "مثال: 192.168.1.150 أو 192.168.11.1 (على نفس الشبكة المحلية)",
    userLabel: "اسم مستخدم NAS:",
    userHint: "مثال: admin أو مستخدم له صلاحيات الكتابة",
    passLabel: "كلمة مرور NAS:",
    passPlaceholder: "(اتركه فارغاً للحفاظ على كلمة المرور الحالية)",
    dirLabel: "المجلد المشترك / المسار الرئيسي:",
    dirHint: "مثال: /Lamha-Storage أو /usb1_1/Lamha-Storage",
    btnTest: "اختبار الاتصال",
    btnSave: "حفظ الإعدادات",
    testing: "جاري الاختبار...",
    saving: "جاري الحفظ...",
    statusOnline: "وحدة NAS متصلة",
    statusOffline: "تعذر الاتصال بـ NAS",
    saveSuccess: "تم حفظ الإعدادات بنجاح!",
    saveError: "حدث خطأ أثناء حفظ الإعدادات",
    testSuccess: (ms: number) => `تم الاتصال بنجاح بـ NAS (${ms} ملي ثانية)`,
    testError: (err: string) => `فشل الاتصال: ${err}`,
  },
}

export function NasConfigCard() {
  const { language, dir } = useLanguage()
  const isRtl = dir === "rtl"
  const texts = NAS_CARD_I18N[language as keyof typeof NAS_CARD_I18N] || NAS_CARD_I18N.fr

  const [host, setHost] = useState("192.168.11.1")
  const [user, setUser] = useState("admin")
  const [password, setPassword] = useState("")
  const [baseDir, setBaseDir] = useState("/usb1_1/Lamha-Storage")
  const [hasPassword, setHasPassword] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const [isOnline, setIsOnline] = useState<boolean | null>(null)
  const [latencyMs, setLatencyMs] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null)

  // Cargar configuración actual
  const loadConfig = async () => {
    try {
      const res = await fetch("/api/settings/nas")
      const data = await res.json()
      if (data.host) setHost(data.host)
      if (data.user) setUser(data.user)
      if (data.baseDir) setBaseDir(data.baseDir)
      setHasPassword(Boolean(data.hasPassword))
      setIsOnline(data.online)
      setLatencyMs(data.latencyMs)
    } catch {
      setIsOnline(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadConfig()
  }, [])

  const handleTestConnection = async () => {
    setTesting(true)
    setFeedback(null)
    try {
      const res = await fetch("/api/settings/nas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host, user, password, baseDir, testOnly: true }),
      })
      const data = await res.json()
      if (data.online) {
        setIsOnline(true)
        setLatencyMs(data.latencyMs)
        setFeedback({ type: "success", msg: texts.testSuccess(data.latencyMs) })
      } else {
        setIsOnline(false)
        setFeedback({ type: "error", msg: texts.testError(data.error || "Timeout") })
      }
    } catch (err: any) {
      setIsOnline(false)
      setFeedback({ type: "error", msg: texts.testError(err.message) })
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setFeedback(null)
    try {
      const res = await fetch("/api/settings/nas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host, user, password, baseDir }),
      })
      const data = await res.json()
      if (data.success) {
        setFeedback({ type: "success", msg: texts.saveSuccess })
        if (password) setHasPassword(true)
        setPassword("")
        // Probar conexión tras guardar
        handleTestConnection()
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

        {/* Status Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {loading ? (
            <span className="text-[11px] text-[#70665a] flex items-center gap-1.5 font-mono">
              <RefreshCw className="w-3 h-3 animate-spin text-[#c69f68]" />
            </span>
          ) : isOnline ? (
            <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-xl text-xs font-semibold">
              <Wifi className="w-3.5 h-3.5" />
              <span>{texts.statusOnline}</span>
              {latencyMs !== null && latencyMs > 0 && (
                <span className="text-[10px] text-emerald-300 font-mono">({latencyMs}ms)</span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-rose-400 bg-rose-500/10 border border-rose-500/30 px-3 py-1 rounded-xl text-xs font-semibold">
              <WifiOff className="w-3.5 h-3.5" />
              <span>{texts.statusOffline}</span>
            </div>
          )}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="space-y-4 text-xs">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Host IP */}
          <div className="space-y-1.5">
            <label className="text-[#a89f91] font-semibold block">
              {texts.hostLabel}
            </label>
            <div className="relative">
              <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#70665a]" />
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="192.168.1.150"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#181613] border border-[#29241f] text-[#f5f2eb] focus:border-[#c69f68] outline-none font-mono text-xs transition-colors"
                required
              />
            </div>
            <span className="text-[10px] text-[#70665a] block">{texts.hostHint}</span>
          </div>

          {/* User */}
          <div className="space-y-1.5">
            <label className="text-[#a89f91] font-semibold block">
              {texts.userLabel}
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#70665a]" />
              <input
                type="text"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                placeholder="admin"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#181613] border border-[#29241f] text-[#f5f2eb] focus:border-[#c69f68] outline-none font-mono text-xs transition-colors"
                required
              />
            </div>
            <span className="text-[10px] text-[#70665a] block">{texts.userHint}</span>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-[#a89f91] font-semibold flex items-center justify-between">
              <span>{texts.passLabel}</span>
              {hasPassword && (
                <span className="text-[10px] text-emerald-400 font-normal">●●●●●●●● (enregistré)</span>
              )}
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#70665a]" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={texts.passPlaceholder}
                className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-[#181613] border border-[#29241f] text-[#f5f2eb] focus:border-[#c69f68] outline-none text-xs transition-colors"
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
          <div className="space-y-1.5">
            <label className="text-[#a89f91] font-semibold block">
              {texts.dirLabel}
            </label>
            <div className="relative">
              <Folder className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#70665a]" />
              <input
                type="text"
                value={baseDir}
                onChange={(e) => setBaseDir(e.target.value)}
                placeholder="/Lamha-Storage"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#181613] border border-[#29241f] text-[#f5f2eb] focus:border-[#c69f68] outline-none font-mono text-xs transition-colors"
                required
              />
            </div>
            <span className="text-[10px] text-[#70665a] block">{texts.dirHint}</span>
          </div>
        </div>

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

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing || saving}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#1f1a15] hover:bg-[#28211b] border border-[#c69f68]/30 text-[#c69f68] font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />}
            <span>{testing ? texts.testing : texts.btnTest}</span>
          </button>

          <button
            type="submit"
            disabled={saving || testing}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#c69f68] to-[#dfba85] text-[#0b0a09] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md hover:opacity-95 disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>{saving ? texts.saving : texts.btnSave}</span>
          </button>
        </div>
      </form>
    </div>
  )
}
