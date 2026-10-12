"use client"
import { useState, useEffect } from "react"
import { Loader2, CheckCircle2 } from "lucide-react"
import { useLanguage } from "@/context/language-context"

export function WorkerProgressWidget() {
  const { t } = useLanguage()
  const [progress, setProgress] = useState<any>(null)

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/worker/progress")
        const data = await res.json()
        setProgress(data)
      } catch (e) {
        // ignorar errores de red
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  if (!progress || progress.status === "idle") return null

  if (progress.status === "completed") {
    return (
      <div className="fixed bottom-3 right-3 left-3 sm:left-auto sm:right-4 sm:bottom-4 bg-emerald-950/90 border border-emerald-500/40 text-emerald-400 p-3.5 sm:p-4 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-3 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-500">
        <CheckCircle2 className="w-5 h-5 shrink-0" />
        <div className="text-xs sm:text-sm font-medium">{t.previewsGenerated} ({progress.total})</div>
      </div>
    )
  }

  return (
    <div className="fixed bottom-3 right-3 left-3 sm:left-auto sm:right-4 sm:bottom-4 bg-[#141210]/95 border border-[#c69f68]/40 text-[#f5f2eb] p-3.5 sm:p-4 rounded-xl shadow-2xl backdrop-blur-md sm:w-80 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-500">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2.5">
          <Loader2 className="w-4 h-4 text-[#c69f68] animate-spin" />
          <span className="text-sm font-medium">{t.previewEngineTitle}</span>
        </div>
        <span className="text-xs font-bold text-[#c69f68]">{progress.percent}%</span>
      </div>
      
      <div className="w-full bg-[#0b0a09] border border-[#26211c] rounded-full h-2 mb-2.5 overflow-hidden">
        <div 
          className="bg-gradient-to-r from-[#c69f68] to-[#e8c89b] h-full rounded-full transition-all duration-500 ease-out" 
          style={{ width: `${progress.percent}%` }}
        />
      </div>
      
      <div className="text-[11px] text-[#8c7a6b] truncate">
        {progress.message || `${t.processingFilesCount} ${progress.completed} / ${progress.total}...`}
      </div>
    </div>
  )
}
