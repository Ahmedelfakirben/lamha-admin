"use client"

import React from "react"
import { useLanguage } from "@/context/language-context"

export default function GlobalRouteLoading() {
  const { language } = useLanguage()

  const text =
    language === "fr"
      ? "Synchronisation des données de l'atelier..."
      : language === "ar"
      ? "جارٍ تحميل بيانات الاستوديو..."
      : language === "en"
      ? "Loading studio workspace..."
      : "Cargando datos del estudio..."

  return (
    <div className="w-full py-6 space-y-6 animate-in fade-in duration-200 select-none">
      {/* Cabecera sutil con indicador compacto */}
      <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-[#141210]/90 border border-[#26211c] shadow-lg">
        <div className="flex items-center gap-3.5">
          {/* Anillo dorado sutil */}
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-[#0e0c0a] border border-[#c69f68]/35 shadow-inner">
            <span className="w-4 h-4 rounded-full border-2 border-[#c69f68] border-t-transparent animate-spin" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-serif font-semibold tracking-wide text-[#f5f2eb]">
              {text}
            </p>
            <div className="h-1.5 w-36 rounded-full bg-[#241f1a] overflow-hidden">
              <div className="h-full w-1/2 bg-gradient-to-r from-[#8c6428] via-[#c69f68] to-[#8c6428] animate-pulse rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Esqueletos sutiles (Skeletons) que mantienen la estructura visual */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-28 rounded-2xl bg-[#141210]/60 border border-[#26211c]/80 p-4 flex flex-col justify-between animate-pulse"
          >
            <div className="h-3 w-24 rounded bg-[#26211c]" />
            <div className="h-6 w-16 rounded bg-[#2c251f]" />
            <div className="h-2.5 w-32 rounded bg-[#1f1b17]" />
          </div>
        ))}
      </div>

      <div className="h-64 rounded-2xl bg-[#141210]/50 border border-[#26211c]/70 p-5 space-y-4 animate-pulse">
        <div className="h-4 w-48 rounded bg-[#26211c]" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-36 rounded-xl bg-[#1b1814] border border-[#26211c]/60" />
          ))}
        </div>
      </div>
    </div>
  )
}
