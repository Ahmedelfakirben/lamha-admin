"use client"

import React, { useEffect, useState, useCallback, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"
import { RotateCw, Sparkles } from "lucide-react"
import { useLanguage } from "@/context/language-context"
import { useUpload } from "@/context/upload-context"

const LABELS = {
  fr: {
    loading: "Chargement...",
    refreshing: "Actualisation...",
    refreshBtn: "Actualiser",
    refreshTooltip: "Actualiser la page (F5) • Double-clic pour rechargement forcé",
    uploadWarn: "Une synchronisation est en cours. Voulez-vous vraiment recharger la page ?",
  },
  es: {
    loading: "Cargando...",
    refreshing: "Actualizando...",
    refreshBtn: "Actualizar",
    refreshTooltip: "Actualizar página (F5) • Doble clic para recarga completa",
    uploadWarn: "Hay una subida o sincronización en curso. ¿Seguro que deseas recargar la página?",
  },
  en: {
    loading: "Loading...",
    refreshing: "Refreshing...",
    refreshBtn: "Refresh",
    refreshTooltip: "Refresh page (F5) • Double-click for hard reload",
    uploadWarn: "An upload/sync is currently running. Are you sure you want to reload?",
  },
  ar: {
    loading: "جارٍ التحميل...",
    refreshing: "جارٍ التحديث...",
    refreshBtn: "تحديث",
    refreshTooltip: "تحديث الصفحة (F5)",
    uploadWarn: "توجد عملية رفع جارية حالياً. هل أنت متأكد من إعادة تحميل الصفحة؟",
  },
}

/**
 * Barra superior dorada ultra-fina + píldora flotante sutil al navegar entre secciones
 */
export function NavigationProgress() {
  const pathname = usePathname()
  const { language } = useLanguage()
  const [isNavigating, setIsNavigating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [labelMode, setLabelMode] = useState<"loading" | "refreshing">("loading")
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastPathRef = useRef(pathname)

  const finishProgress = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current)
    setProgress(100)
    const doneTimer = setTimeout(() => {
      setIsNavigating(false)
      setProgress(0)
    }, 260)
    return () => clearTimeout(doneTimer)
  }, [])

  const startProgress = useCallback((mode: "loading" | "refreshing" = "loading") => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current)

    setLabelMode(mode)
    setIsNavigating(true)
    setProgress(18)

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev
        const step = prev < 50 ? 12 : prev < 75 ? 6 : 2
        return Math.min(prev + step, 90)
      })
    }, 180)

    // Safety auto-hide if route didn't change (e.g. same route or cancelled)
    safetyTimeoutRef.current = setTimeout(() => {
      finishProgress()
    }, 8000)
  }, [finishProgress])

  // Detectar cuando cambia el pathname (navegación completada)
  useEffect(() => {
    if (lastPathRef.current !== pathname) {
      lastPathRef.current = pathname
      finishProgress()
    }
  }, [pathname, finishProgress])

  // Escuchar clics globales en enlaces internos (<a>) y evento personalizado de refresco
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return
      }
      const anchor = (e.target as HTMLElement | null)?.closest("a")
      if (!anchor) return

      const href = anchor.getAttribute("href")
      const target = anchor.getAttribute("target")
      if (
        !href ||
        target === "_blank" ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("javascript:") ||
        anchor.hasAttribute("download")
      ) {
        return
      }

      try {
        const url = new URL(href, window.location.origin)
        if (url.origin !== window.location.origin) return
        const currentFull = window.location.pathname + window.location.search
        const nextFull = url.pathname + url.search
        if (nextFull !== currentFull) {
          startProgress("loading")
        }
      } catch {}
    }

    const handleCustomRefresh = () => {
      startProgress("refreshing")
    }

    document.addEventListener("click", handleClick, true)
    window.addEventListener("lamha:page-refresh-start", handleCustomRefresh)
    return () => {
      document.removeEventListener("click", handleClick, true)
      window.removeEventListener("lamha:page-refresh-start", handleCustomRefresh)
    }
  }, [startProgress])

  if (!isNavigating && progress === 0) return null

  const t = LABELS[language] || LABELS.fr

  return (
    <>
      {/* 1. Barra superior ultra-fina dorada (2.5px) */}
      <div className="fixed top-9 left-0 right-0 h-[2.5px] z-[9999] pointer-events-none overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#8c6428] via-[#c69f68] to-[#f3d7a8] shadow-[0_0_12px_rgba(198,159,104,0.9)] transition-all duration-200 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 2. Píldora flotante pequeña y sutil en la esquina superior derecha */}
      <div className="fixed top-12 right-5 z-[9998] pointer-events-none animate-in fade-in slide-in-from-top-1 duration-200">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#141210]/95 border border-[#c69f68]/40 shadow-[0_6px_24px_rgba(0,0,0,0.65)] backdrop-blur-md">
          <span className="relative flex h-3.5 w-3.5 items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#c69f68] opacity-35" />
            <span className="w-3.5 h-3.5 rounded-full border-2 border-[#c69f68] border-t-transparent animate-spin" />
          </span>
          <span className="text-[11px] font-medium tracking-wide text-[#f5f2eb]">
            {labelMode === "refreshing" ? t.refreshing : t.loading}
          </span>
        </div>
      </div>
    </>
  )
}

/**
 * Botón de Actualizar / Recargar página para la barra superior de la app
 */
export function HeaderRefreshButton() {
  const router = useRouter()
  const { language } = useLanguage()
  const { uploadState } = useUpload()
  const [isSpinning, setIsSpinning] = useState(false)

  const t = LABELS[language] || LABELS.fr

  const triggerReload = useCallback(
    (hardReload = false) => {
      if (uploadState?.isRunning) {
        const ok = window.confirm(t.uploadWarn)
        if (!ok) return
      }

      setIsSpinning(true)
      window.dispatchEvent(new CustomEvent("lamha:page-refresh-start"))

      if (hardReload) {
        window.location.reload()
        return
      }

      // Refrescar datos de servidor Next.js y recargar la ventana para desbloquear cualquier estado colgado
      try {
        router.refresh()
      } catch {}

      setTimeout(() => {
        window.location.reload()
      }, 180)
    },
    [router, t.uploadWarn, uploadState?.isRunning]
  )

  // Atajo global F5 para recargar en la app de escritorio
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F5") {
        e.preventDefault()
        triggerReload(true)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [triggerReload])

  return (
    <button
      type="button"
      onClick={() => triggerReload(false)}
      onDoubleClick={() => triggerReload(true)}
      style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      className="h-6 px-2.5 rounded-md bg-[#161310] hover:bg-[#c69f68]/20 border border-[#2c251f] hover:border-[#c69f68]/60 text-[#c69f68] hover:text-[#f5f2eb] text-[10.5px] font-medium flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-sm"
      title={t.refreshTooltip}
    >
      <RotateCw className={`w-3 h-3 text-[#c69f68] ${isSpinning ? "animate-spin" : ""}`} />
      <span className="hidden sm:inline">{t.refreshBtn}</span>
    </button>
  )
}
