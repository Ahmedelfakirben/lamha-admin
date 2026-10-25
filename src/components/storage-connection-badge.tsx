"use client"

import { useState, useEffect } from "react"
import { Zap, Globe, WifiOff, RefreshCw } from "lucide-react"
import { useLanguage } from "@/context/language-context"
import { cn } from "@/lib/utils"

interface StorageStatus {
  isSmbOnline: boolean
  isNasOnline: boolean
  connectionMode: "smb_local" | "tailscale_ftp" | "offline"
  effectiveMode: string
  settings?: {
    smb_probe_host?: string
    ftp_remote_host?: string
  }
}

export function StorageConnectionBadge({ 
  className, 
  compact = false 
}: { 
  className?: string
  compact?: boolean 
}) {
  const { language } = useLanguage()
  const [status, setStatus] = useState<StorageStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchStatus = async (isManual = false) => {
    if (isManual) setRefreshing(true)
    try {
      const res = await fetch("/api/deliveries/settings")
      const data = await res.json()
      setStatus({
        isSmbOnline: Boolean(data.isSmbOnline),
        isNasOnline: Boolean(data.isNasOnline),
        connectionMode: data.connectionMode || "offline",
        effectiveMode: data.effectiveMode || "cloud",
        settings: data.settings,
      })
    } catch {
      setStatus({
        isSmbOnline: false,
        isNasOnline: false,
        connectionMode: "offline",
        effectiveMode: "cloud",
      })
    } finally {
      setLoading(false)
      if (isManual) setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    // Sondeo de estado cada 45 segundos para mantener actualizado el modo de conexión
    const interval = setInterval(() => fetchStatus(), 45000)
    return () => clearInterval(interval)
  }, [])

  if (loading && !status) {
    return (
      <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#141210] border border-[#26211c] text-[10px] text-[#70665a]", className)}>
        <RefreshCw className="w-3 h-3 animate-spin text-[#c69f68]" />
        {!compact && <span>Verificando red...</span>}
      </div>
    )
  }

  const isSmb = status?.isSmbOnline
  const isFtp = !isSmb && status?.isNasOnline

  const getLabels = () => {
    if (language === "es") {
      if (isSmb) return { label: "Red Local (SMB)", desc: "Estudio LAN • Máxima Velocidad" }
      if (isFtp) return { label: "Remoto (Tailscale FTP)", desc: "VPN Remota Activa" }
      return { label: "Almacenamiento Offline", desc: "Sin conexión a NAS" }
    }
    if (language === "fr") {
      if (isSmb) return { label: "Réseau Local (SMB)", desc: "Studio LAN • Débit Maximal" }
      if (isFtp) return { label: "Distant (Tailscale FTP)", desc: "VPN Distant Actif" }
      return { label: "Stockage Hors-Ligne", desc: "Non connecté au NAS" }
    }
    if (language === "ar") {
      if (isSmb) return { label: "الشبكة المحلية (SMB)", desc: "الاستوديو • سرعة قصوى" }
      if (isFtp) return { label: "عن بعد (Tailscale FTP)", desc: "شبكة VPN نشطة" }
      return { label: "التخزين غير متصل", desc: "لا يوجد اتصال بـ NAS" }
    }
    // Default en
    if (isSmb) return { label: "Local LAN (SMB)", desc: "Studio LAN • Full Speed" }
    if (isFtp) return { label: "Remote (Tailscale FTP)", desc: "Remote VPN Active" }
    return { label: "Storage Offline", desc: "No NAS connection" }
  }

  const { label, desc } = getLabels()

  return (
    <div
      onClick={() => fetchStatus(true)}
      title={`${label} — ${desc} (Click para refrescar)`}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-semibold border transition-all cursor-pointer select-none",
        isSmb
          ? "bg-emerald-500/10 hover:bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
          : isFtp
          ? "bg-purple-500/10 hover:bg-purple-500/15 border-purple-500/30 text-purple-300"
          : "bg-rose-500/10 hover:bg-rose-500/15 border-rose-500/30 text-rose-400",
        className
      )}
    >
      {refreshing ? (
        <RefreshCw className="w-3 h-3 animate-spin shrink-0" />
      ) : isSmb ? (
        <Zap className="w-3 h-3 shrink-0 text-emerald-400" />
      ) : isFtp ? (
        <Globe className="w-3 h-3 shrink-0 text-purple-400" />
      ) : (
        <WifiOff className="w-3 h-3 shrink-0 text-rose-400" />
      )}

      {!compact && (
        <span className="truncate max-w-[140px] font-mono">
          {label}
        </span>
      )}

      {isSmb && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
      {isFtp && <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />}
    </div>
  )
}
