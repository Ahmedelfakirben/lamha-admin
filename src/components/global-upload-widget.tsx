"use client"
import React, { useState } from "react"
import { useUpload } from "@/context/upload-context"
import { useLanguage } from "@/context/language-context"
import { Cloud, CheckCircle2, AlertTriangle, Loader2, X, ChevronUp, ChevronDown } from "lucide-react"

export function GlobalUploadWidget() {
  const { uploadState, dismissUpload } = useUpload()
  const { t } = useLanguage()
  const [expanded, setExpanded] = useState(false)

  if (!uploadState.isRunning) return null

  const isCompleted = uploadState.percent === 100 && !uploadState.currentFile.includes("Error")
  const isError = uploadState.currentFile.includes("Error")

  return (
    <div className="fixed bottom-3 right-3 left-3 sm:left-auto sm:right-4 sm:bottom-4 z-[200] sm:w-96 flex flex-col gap-2 animate-in slide-in-from-bottom-5 fade-in duration-500">
      <div className="bg-[#141210]/95 border border-[#c69f68]/40 text-[#f5f2eb] rounded-xl shadow-2xl backdrop-blur-md overflow-hidden flex flex-col">
        {/* Encabezado Principal */}
        <div 
          className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-[#1a1815] transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-3">
            {isCompleted ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : isError ? (
              <AlertTriangle className="w-5 h-5 text-red-400" />
            ) : (
              <Cloud className="w-5 h-5 text-[#c69f68] animate-pulse" />
            )}
            
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-[#f5f2eb]">
                {isCompleted ? t.uploadCompletedTitle : isError ? t.uploadErrorTitle : t.uploadingToDrive}
              </span>
              <span className="text-[10px] text-[#8c7a6b] font-mono mt-0.5">
                {uploadState.percent}% • {uploadState.current} / {uploadState.total} {t.filesCountStr}
                {uploadState.totalMb > 0 && uploadState.uploadedMb !== undefined && ` • ${uploadState.uploadedMb} / ${uploadState.totalMb} MB`}
                {uploadState.etaMinutes != null && ` • ~${uploadState.etaMinutes} min`}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {!isCompleted && !isError && (
              <Loader2 className="w-4 h-4 text-[#c69f68] animate-spin" />
            )}
            {(isCompleted || isError) && (
              <button 
                onClick={(e) => {
                  e.stopPropagation()
                  dismissUpload()
                }}
                className="p-1.5 hover:bg-[#26211c] rounded-md text-[#8c7a6b] hover:text-[#f5f2eb] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            {!isCompleted && !isError && (
              expanded ? <ChevronDown className="w-4 h-4 text-[#8c7a6b]" /> : <ChevronUp className="w-4 h-4 text-[#8c7a6b]" />
            )}
          </div>
        </div>

        {/* Barra de progreso minimizada (cuando no está expandido o aunque lo esté para dar feedback visual continuo) */}
        {!isCompleted && !isError && (
          <div className="h-1 w-full bg-[#0b0a09]">
            <div 
              className="h-full bg-gradient-to-r from-[#b38952] to-[#c69f68] transition-all duration-300"
              style={{ width: `${uploadState.percent}%` }}
            />
          </div>
        )}

        {/* Contenido Expandido */}
        {expanded && (
          <div className="px-4 pb-4 pt-2 border-t border-[#26211c]/50 bg-[#0f0d0c]">
            <div className="text-[11px] font-medium text-[#c69f68] mb-2 truncate">
              {uploadState.currentFile}
            </div>
            <div className="rounded-xl bg-[#050404] border border-[#26211c] p-2.5 h-32 overflow-y-auto font-mono text-[10px] space-y-1.5 scrollbar-thin scrollbar-thumb-[#26211c] scrollbar-track-transparent">
              {uploadState.logs.map((l, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-[#554d43] shrink-0">[{l.time}]</span>
                  <span className={l.level === "success" ? "text-emerald-400 font-medium" : l.level === "error" ? "text-red-400" : "text-[#d1c7b7]"}>
                    {l.msg}
                  </span>
                </div>
              ))}
              {/* Dummy element para mantener scroll al final podría ir aquí */}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
