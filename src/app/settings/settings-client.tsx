"use client"

import { useState, useEffect } from "react"
import { 
  Settings, 
  ShieldCheck, 
  Database, 
  MapPin, 
  Phone, 
  Mail, 
  Sparkles, 
  Key, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ChevronDown, 
  ChevronUp 
} from "lucide-react"
import { useLanguage } from "@/context/language-context"
import { TeamManagementCard } from "@/components/team-management-card"
import { WhatsAppGatewayCard } from "@/components/whatsapp-gateway-card"
import { NasConfigCard } from "@/components/nas-config-card"

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
                <span className="text-[#f5f2eb] font-medium">contact@lam7a.ma</span>
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

        {/* NAS & QNAP Atelier Storage Settings */}
        <NasConfigCard />

        {/* Team Management & User Creation (ERP Multi-User) */}
        <TeamManagementCard />

        {/* Dual Mode Delivery & Storage Hub */}
        <DualDeliverySettingsCard />

        {/* WhatsApp Gateway Integration */}
        <WhatsAppGatewayCard />
      </div>
    </div>
  )
}

function DualDeliverySettingsCard() {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [cleaning, setCleaning] = useState(false)
  const [retentionDays, setRetentionDays] = useState(30)
  const [testingGDrive, setTestingGDrive] = useState(false)
  const [gdriveTestResult, setGdriveTestResult] = useState<{ success: boolean; message: string; email?: string } | null>(null)
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
          setRetentionDays(data.settings.default_retention_days || 30)
          setGdriveParentId(data.settings.gdrive_parent_folder_id || "")
          setIsOAuthConnected(Boolean(data.settings.isOAuthConnected))
          setOauthEmail(data.settings.oauthEmail || null)
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
        if (typeof window !== "undefined" && (window.desktopAdminAPI || (window as any).electronAPI)) {
          window.open(data.url, "_blank")
        } else {
          window.open(data.url, "_blank") || (window.location.href = data.url)
        }
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

  const handleTestGDrive = async () => {
    setTestingGDrive(true)
    setGdriveTestResult(null)
    try {
      const res = await fetch("/api/deliveries/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          test_gdrive: true,
          gdrive_parent_folder_id: gdriveParentId || undefined,
        }),
      })
      const data = await res.json()
      setGdriveTestResult(data)
    } catch (err: any) {
      setGdriveTestResult({ success: false, message: err.message })
    } finally {
      setTestingGDrive(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const payload: any = {
        default_retention_days: retentionDays,
        gdrive_parent_folder_id: gdriveParentId.trim() || null,
      }
      const res = await fetch("/api/deliveries/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data.success) {
        setMessage("Preferencias de Google Drive guardadas correctamente.")
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
              Google Drive & Entregas Cloud (OAuth 2.0)
            </h2>
            <p className="text-xs text-[#8c7a6b]">
              Conecta la cuenta oficial de Google Drive del estudio con 1 clic para exportar galerías de entrega a los clientes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-mono uppercase px-2.5 py-1 rounded-md border ${
            isOAuthConnected
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-amber-500/30 bg-amber-500/10 text-amber-400"
          }`}>
            {isOAuthConnected ? `Google Drive Activo (${oauthEmail})` : t.unlinked}
          </span>
        </div>
      </div>

      {message && (
        <div className="p-3 rounded-xl bg-[#c69f68]/10 border border-[#c69f68]/30 text-[#e5c38e] text-xs font-medium">
          {message}
        </div>
      )}

      {/* Conexión OAuth 2.0 + Carpeta Raíz Opcional + Retención */}
      <div className="grid gap-4 sm:grid-cols-3 text-xs">
        {/* 1. Cuenta Google Drive OAuth 2.0 */}
        <div className="p-4 rounded-xl bg-[#181613] border border-[#26211c] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[#70665a] uppercase tracking-wider text-[10px] block font-semibold">
              Cuenta de Google Drive
            </span>
            {isOAuthConnected && (
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
            )}
          </div>

          {isOAuthConnected ? (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-semibold text-emerald-400 text-xs">{t.connectedOAuth}</span>
              </div>
              <p className="text-[11px] text-[#f5f2eb] font-mono truncate" title={oauthEmail || ""}>
                {oauthEmail}
              </p>
              <p className="text-[10px] text-[#70665a]">
                {t.unlimitedQuotaNote}
              </p>
              <button
                type="button"
                onClick={handleTestGDrive}
                disabled={testingGDrive}
                className="w-full mt-1 py-1.5 px-3 rounded-lg border border-[#c69f68]/40 hover:border-[#c69f68] bg-[#c69f68]/10 text-[#c69f68] font-semibold text-[11px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {testingGDrive && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{testingGDrive ? "Comprobando..." : "Probar Conexión con Google Drive"}</span>
              </button>
              {gdriveTestResult && (
                <div className={`text-[11px] flex items-center gap-1.5 pt-1 ${gdriveTestResult.success ? "text-emerald-400" : "text-rose-400"}`}>
                  {gdriveTestResult.success ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                  <span className="truncate">{gdriveTestResult.message}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="font-medium text-amber-400 text-xs">{t.unlinked}</span>
              </div>
              <p className="text-[11px] text-[#8c7a6b]">
                Inicia sesión con el correo de Google del estudio para habilitar la subida directa a su Google Drive.
              </p>
              <button
                type="button"
                onClick={handleConnectGoogle}
                className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-[#c69f68] to-[#b38952] text-black font-semibold text-xs shadow hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>{t.connectGoogleDrive}</span>
              </button>
            </div>
          )}
        </div>

        {/* 2. Carpeta Raíz Opcional en Drive */}
        <div className="p-4 rounded-xl bg-[#181613] border border-[#26211c] space-y-2">
          <span className="text-[#70665a] uppercase tracking-wider text-[10px] block font-semibold">
            Carpeta Raíz en Drive (Opcional)
          </span>
          <input
            type="text"
            value={gdriveParentId}
            onChange={(e) => setGdriveParentId(e.target.value)}
            placeholder="Automático (Lam7a Studios - Entregas)"
            className="w-full px-3 py-1.5 rounded-lg bg-[#100f0d] border border-[#26211c] text-[#f5f2eb] font-mono text-xs focus:outline-none focus:border-[#c69f68]"
          />
          <p className="text-[10.5px] text-[#8c7a6b] leading-relaxed">
            Déjalo en blanco para que el sistema cree y use automáticamente la carpeta <b>Lam7a Studios - Entregas</b> en el Google Drive conectado.
          </p>
        </div>

        {/* 3. Retención y Reciclaje */}
        <div className="p-4 rounded-xl bg-[#181613] border border-[#26211c] space-y-2">
          <span className="text-[#70665a] uppercase tracking-wider text-[10px] block font-semibold">{t.deliveryRetention}</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="7"
              max="180"
              value={retentionDays}
              onChange={(e) => setRetentionDays(parseInt(e.target.value, 10) || 30)}
              className="w-16 px-2 py-1 rounded bg-[#100f0d] border border-[#3a332a] text-[#f5f2eb] font-mono text-xs"
            />
            <span className="text-[#c69f68] font-medium">{t.daysInCloud}</span>
          </div>
          <p className="text-[10.5px] text-[#8c7a6b] leading-relaxed">
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
          className="px-5 py-2 rounded-xl bg-[#c69f68] hover:bg-[#b58f58] text-[#12100d] font-semibold text-xs transition-colors disabled:opacity-50 cursor-pointer"
        >
          {saving ? t.saving : t.saveStoragePreferences}
        </button>
      </div>
    </div>
  )
}

