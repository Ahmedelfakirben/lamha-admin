"use client"

import { useState, useEffect } from "react"
import { Settings, ShieldCheck, Database, MapPin, Phone, Mail, Sparkles, Key } from "lucide-react"
import { useLanguage } from "@/context/language-context"
import { TeamManagementCard } from "@/components/team-management-card"

interface SettingsClientProps {
  latencyMs: number
  dbConnected: boolean
}

export function SettingsClient({ latencyMs, dbConnected }: SettingsClientProps) {
  const { t } = useLanguage()

  const dbStatusText = dbConnected ? t.connectedOperative : t.connError

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c69f68]/10 border border-[#c69f68]/30 text-[#c69f68] text-xs font-semibold tracking-wider uppercase mb-2">
          <Settings className="w-3 h-3" />
          <span>{t.studioSettingsTag}</span>
        </div>
        <h1 className="text-3xl font-serif tracking-wide text-[#f5f2eb]">
          {t.generalSettingsTitle}
        </h1>
        <p className="text-xs text-[#8c7a6b]">
          {t.generalSettingsSubtitle}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Brand & Studio Information */}
        <div className="rounded-2xl border border-[#26211c] bg-[#141210] p-6 shadow-xl space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-[#26211c]">
            <div className="w-10 h-10 rounded-xl bg-[#c69f68]/10 flex items-center justify-center text-[#c69f68]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#f5f2eb] font-serif">
                {t.studioIdentity}
              </h2>
              <p className="text-xs text-[#8c7a6b]">{t.artisticDirection}</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-[#181613] border border-[#26211c]">
              <MapPin className="w-4 h-4 text-[#c69f68] shrink-0 mt-0.5" />
              <div>
                <span className="text-[#70665a] uppercase tracking-wider text-[10px] block font-semibold">{t.atelierStudioLabel}</span>
                <span className="text-[#f5f2eb] font-medium">Bojarah, Yedi Mavi, Tetouan, Morocco</span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-[#181613] border border-[#26211c]">
              <Phone className="w-4 h-4 text-[#c69f68] shrink-0 mt-0.5" />
              <div>
                <span className="text-[#70665a] uppercase tracking-wider text-[10px] block font-semibold">{t.officialPhonesLabel}</span>
                <span className="text-[#f5f2eb] font-medium">0539702927 / 0762517478</span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-[#181613] border border-[#26211c]">
              <Mail className="w-4 h-4 text-[#c69f68] shrink-0 mt-0.5" />
              <div>
                <span className="text-[#70665a] uppercase tracking-wider text-[10px] block font-semibold">{t.emailLabel}</span>
                <span className="text-[#f5f2eb] font-medium">Lamha@afafelaribi.com</span>
              </div>
            </div>
          </div>
        </div>

        {/* Supabase Infrastructure Diagnostic */}
        <div className="rounded-2xl border border-[#26211c] bg-[#141210] p-6 shadow-xl space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-[#26211c]">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#f5f2eb] font-serif">
                {t.supabaseInfra}
              </h2>
              <p className="text-xs text-[#8c7a6b]">{t.postgresConnection}</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-[#181613] border border-[#26211c] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[#70665a] uppercase tracking-wider text-[10px] font-semibold">{t.linkStatus}</span>
                <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {dbStatusText} ({latencyMs}ms)
                </span>
              </div>
              <div className="text-[11px] font-mono text-[#a89f91] truncate bg-[#100f0d] p-2 rounded border border-[#26211c]">
                {process.env.NEXT_PUBLIC_SUPABASE_URL}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#181613] border border-[#26211c] space-y-2">
              <span className="text-[#70665a] uppercase tracking-wider text-[10px] block font-semibold">{t.securityRls}</span>
              <div className="flex items-center gap-2 text-emerald-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>{t.rlsActive}</span>
              </div>
              <p className="text-[11px] text-[#8c7a6b]">
                {t.rlsDesc}
              </p>
            </div>
          </div>
        </div>

        {/* Team Management & User Creation (ERP Multi-User) */}
        <TeamManagementCard />

        {/* Dual Mode Delivery & Storage Hub */}
        <DualDeliverySettingsCard />
      </div>
    </div>
  )
}

function DualDeliverySettingsCard() {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [cleaning, setCleaning] = useState(false)
  const [storageMode, setStorageMode] = useState<"auto" | "cloud" | "nas">("auto")
  const [effectiveMode, setEffectiveMode] = useState<string>("cloud")
  const [retentionDays, setRetentionDays] = useState(30)
  const [isNasOnline, setIsNasOnline] = useState(false)
  const [hasGDrive, setHasGDrive] = useState(false)
  const [gdriveEmail, setGdriveEmail] = useState("")
  const [gdriveParentId, setGdriveParentId] = useState("")
  const [isOAuthConnected, setIsOAuthConnected] = useState(false)
  const [oauthEmail, setOauthEmail] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/deliveries/settings")
        const data = await res.json()
        if (data.success && data.settings) {
          setStorageMode(data.settings.storage_mode || "auto")
          setRetentionDays(data.settings.default_retention_days || 30)
          setHasGDrive(data.settings.has_gdrive_credentials)
          setGdriveEmail(data.settings.gdrive_client_email || "")
          setGdriveParentId(data.settings.gdrive_parent_folder_id || "")
          setIsOAuthConnected(Boolean(data.settings.isOAuthConnected))
          setOauthEmail(data.settings.oauthEmail || null)
          setIsNasOnline(data.isNasOnline)
          setEffectiveMode(data.effectiveMode || "cloud")
        }
      } catch (err) {
        console.error("Error cargando configuración de entregas:", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleConnectGoogle = async () => {
    try {
      const res = await fetch("/api/auth/google/url")
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert("Error: " + (data.error || "No se pudo generar el enlace de conexión"))
      }
    } catch (err: any) {
      alert("Error: " + err.message)
    }
  }

  const handleDisconnectGoogle = async () => {
    if (!confirm("¿Deseas desconectar la cuenta de Google Drive?")) return
    try {
      await fetch("/api/auth/google/disconnect", { method: "POST" })
      window.location.reload()
    } catch {}
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch("/api/deliveries/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storage_mode: storageMode,
          default_retention_days: retentionDays,
          gdrive_parent_folder_id: gdriveParentId,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage("Configuración guardada correctamente.")
      } else {
        setMessage(`Error: ${data.error || "No se pudo guardar"}`)
      }
    } catch (e: any) {
      setMessage(`Error: ${e.message}`)
    } finally {
      setSaving(false)
      setTimeout(() => setMessage(null), 4000)
    }
  }

  const handleRunCleanup = async () => {
    setCleaning(true)
    setMessage(null)
    try {
      const res = await fetch("/api/deliveries/cleanup", { method: "POST" })
      const data = await res.json()
      if (data.success) {
        setMessage(data.message)
      } else {
        setMessage(`Error en limpieza: ${data.error}`)
      }
    } catch (e: any) {
      setMessage(`Error: ${e.message}`)
    } finally {
      setCleaning(false)
      setTimeout(() => setMessage(null), 5000)
    }
  }

  return (
    <div className="rounded-2xl border border-[#26211c] bg-[#141210] p-6 shadow-xl space-y-6 md:col-span-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#26211c]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#c69f68]/10 flex items-center justify-center text-[#c69f68]">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#f5f2eb] font-serif">
              {t.dualStorageEnvTitle}
            </h2>
            <p className="text-xs text-[#8c7a6b]">
              {t.dualStorageEnvSubtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono uppercase px-2.5 py-1 rounded-md border border-[#3a332a] bg-[#181613] text-[#e5c38e]">
            {t.activeModeLabel} {effectiveMode === "nas" ? t.activeModeNas : t.activeModeCloud}
          </span>
        </div>
      </div>

      {message && (
        <div className="p-3 rounded-xl bg-[#c69f68]/10 border border-[#c69f68]/30 text-[#e5c38e] text-xs font-medium">
          {message}
        </div>
      )}

      {/* Selector de Modos */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Opción 1: Nube */}
        <button
          type="button"
          onClick={() => setStorageMode("cloud")}
          className={`p-4 rounded-xl border text-left transition-all ${
            storageMode === "cloud"
              ? "bg-[#211b15] border-[#c69f68] ring-1 ring-[#c69f68]"
              : "bg-[#181613] border-[#26211c] hover:border-[#3d342a]"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-[#f5f2eb]">{t.modeCloudTitle}</span>
            {storageMode === "cloud" && <span className="w-2 h-2 rounded-full bg-[#c69f68]" />}
          </div>
          <p className="text-[11px] text-[#8c7a6b] leading-relaxed">
            {t.modeCloudDesc}
          </p>
        </button>

        {/* Opción 2: Estudio / NAS */}
        <button
          type="button"
          onClick={() => setStorageMode("nas")}
          className={`p-4 rounded-xl border text-left transition-all ${
            storageMode === "nas"
              ? "bg-[#211b15] border-[#c69f68] ring-1 ring-[#c69f68]"
              : "bg-[#181613] border-[#26211c] hover:border-[#3d342a]"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-[#f5f2eb]">{t.modeNasTitle}</span>
            {storageMode === "nas" && <span className="w-2 h-2 rounded-full bg-[#c69f68]" />}
          </div>
          <p className="text-[11px] text-[#8c7a6b] leading-relaxed">
            {t.modeNasDesc}
          </p>
        </button>

        {/* Opción 3: Auto-Detección */}
        <button
          type="button"
          onClick={() => setStorageMode("auto")}
          className={`p-4 rounded-xl border text-left transition-all ${
            storageMode === "auto"
              ? "bg-[#211b15] border-[#c69f68] ring-1 ring-[#c69f68]"
              : "bg-[#181613] border-[#26211c] hover:border-[#3d342a]"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-[#f5f2eb]">{t.modeAutoTitle}</span>
            {storageMode === "auto" && <span className="w-2 h-2 rounded-full bg-[#c69f68]" />}
          </div>
          <p className="text-[11px] text-[#8c7a6b] leading-relaxed">
            {t.modeAutoDesc}
          </p>
        </button>
      </div>

      {/* Estados y Parámetros */}
      <div className="grid gap-4 sm:grid-cols-3 text-xs pt-2">
        {/* Diagnóstico NAS */}
        <div className="p-3.5 rounded-xl bg-[#181613] border border-[#26211c] space-y-1">
          <span className="text-[#70665a] uppercase tracking-wider text-[10px] block font-semibold">{t.nasServerStatus}</span>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isNasOnline ? "bg-emerald-400" : "bg-amber-500"}`} />
            <span className={`font-medium ${isNasOnline ? "text-emerald-400" : "text-amber-400"}`}>
              {isNasOnline ? t.nasOnlineLabel : t.nasOfflineLabel}
            </span>
          </div>
          <p className="text-[11px] text-[#8c7a6b]">
            {isNasOnline ? t.nasFtpAvailable : t.nasNoConnection}
          </p>
        </div>

        {/* Google Drive Status & Conexión OAuth 2.0 */}
        <div className="p-3.5 rounded-xl bg-[#181613] border border-[#26211c] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[#70665a] uppercase tracking-wider text-[10px] block font-semibold">Google Drive</span>
            {isOAuthConnected ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleConnectGoogle}
                  className="text-[10px] text-[#c69f68] hover:underline cursor-pointer"
                  title="Conectar otra cuenta de Google"
                >
                  {t.changeAccount}
                </button>
                <button
                  type="button"
                  onClick={handleDisconnectGoogle}
                  className="text-[10px] text-red-400 hover:underline cursor-pointer"
                  title="Desconectar cuenta"
                >
                  {t.disconnect}
                </button>
              </div>
            ) : null}
          </div>

          {isOAuthConnected ? (
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-semibold text-emerald-400 text-xs">{t.connectedOAuth}</span>
              </div>
              <p className="text-[11px] text-[#f5f2eb] font-mono truncate mt-0.5" title={oauthEmail || ""}>
                {oauthEmail}
              </p>
              <p className="text-[10px] text-[#70665a] mt-0.5">
                {t.unlimitedQuotaNote}
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="font-medium text-amber-400 text-xs">{t.unlinked}</span>
              </div>
              <button
                type="button"
                onClick={handleConnectGoogle}
                className="w-full py-1.5 px-3 rounded-lg bg-gradient-to-r from-[#c69f68] to-[#b38952] text-black font-semibold text-xs shadow hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>{t.connectGoogleDrive}</span>
              </button>
            </div>
          )}
        </div>

        {/* Retención y Reciclaje */}
        <div className="p-3.5 rounded-xl bg-[#181613] border border-[#26211c] space-y-1">
          <span className="text-[#70665a] uppercase tracking-wider text-[10px] block font-semibold">{t.deliveryRetention}</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="7"
              max="180"
              value={retentionDays}
              onChange={(e) => setRetentionDays(parseInt(e.target.value, 10) || 30)}
              className="w-16 px-2 py-0.5 rounded bg-[#100f0d] border border-[#3a332a] text-[#f5f2eb] font-mono text-xs"
            />
            <span className="text-[#c69f68] font-medium">{t.daysInCloud}</span>
          </div>
          <p className="text-[11px] text-[#8c7a6b]">
            {t.retentionNotice}
          </p>
        </div>
      </div>

      {/* Botones de Acción */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#26211c]">
        <button
          type="button"
          onClick={handleRunCleanup}
          disabled={cleaning}
          className="px-4 py-2 rounded-xl border border-[#3d342a] text-[#a89f91] hover:text-[#f5f2eb] hover:bg-[#1f1b17] text-xs font-medium transition-colors disabled:opacity-50"
        >
          {cleaning ? t.cleaningInProgress : t.manualRecycleBtn}
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 rounded-xl bg-[#c69f68] hover:bg-[#b58f58] text-[#12100d] font-semibold text-xs transition-colors disabled:opacity-50"
        >
          {saving ? t.saving : t.saveStoragePreferences}
        </button>
      </div>
    </div>
  )
}

