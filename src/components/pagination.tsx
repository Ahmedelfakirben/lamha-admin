"use client"

import React from "react"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { useLanguage } from "@/context/language-context"

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage?: number
  onPageChange: (page: number) => void
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage = 20,
  onPageChange,
}: PaginationProps) {
  const { t, dir } = useLanguage()

  if (totalPages <= 1) return null

  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisiblePages = 5

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
      } else {
        pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages)
      }
    }
    return pages
  }

  const isRtl = dir === "rtl"

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#26211c]">
      <div className="text-xs text-[#8c7a6b]">
        {t.showing} <span className="text-[#f5f2eb] font-semibold">{totalItems > 0 ? startItem : 0}</span> {t.to}{" "}
        <span className="text-[#f5f2eb] font-semibold">{endItem}</span> {t.of}{" "}
        <span className="text-[#c69f68] font-bold">{totalItems}</span> ({itemsPerPage} {t.itemsPerPage})
      </div>

      <div className="flex items-center gap-1.5">
        {/* First Page */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          title="Primera Página"
          className="p-2 rounded-xl bg-[#181613] border border-[#29241f] text-[#a89f91] hover:text-[#f5f2eb] hover:border-[#c69f68]/40 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          {isRtl ? <ChevronsRight className="w-3.5 h-3.5" /> : <ChevronsLeft className="w-3.5 h-3.5" />}
        </button>

        {/* Previous Page */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          title={t.previous}
          className="px-3 py-1.5 rounded-xl bg-[#181613] border border-[#29241f] text-xs text-[#a89f91] hover:text-[#f5f2eb] hover:border-[#c69f68]/40 disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 transition-colors"
        >
          {isRtl ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{t.previous}</span>
        </button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, idx) => {
            if (page === "...") {
              return (
                <span key={`dots-${idx}`} className="px-2 text-xs text-[#70665a]">
                  ...
                </span>
              )
            }

            const isCurrent = page === currentPage
            return (
              <button
                key={`page-${page}`}
                onClick={() => onPageChange(page as number)}
                className={`min-w-[32px] h-[32px] px-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isCurrent
                    ? "bg-[#c69f68] text-[#0b0a09] shadow-md shadow-[#c69f68]/20 font-bold"
                    : "bg-[#181613] border border-[#29241f] text-[#a89f91] hover:text-[#f5f2eb] hover:border-[#c69f68]/40"
                }`}
              >
                {page}
              </button>
            )
          })}
        </div>

        {/* Next Page */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          title={t.next}
          className="px-3 py-1.5 rounded-xl bg-[#181613] border border-[#29241f] text-xs text-[#a89f91] hover:text-[#f5f2eb] hover:border-[#c69f68]/40 disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 transition-colors"
        >
          <span className="hidden sm:inline">{t.next}</span>
          {isRtl ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>

        {/* Last Page */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          title="Última Página"
          className="p-2 rounded-xl bg-[#181613] border border-[#29241f] text-[#a89f91] hover:text-[#f5f2eb] hover:border-[#c69f68]/40 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          {isRtl ? <ChevronsLeft className="w-3.5 h-3.5" /> : <ChevronsRight className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  )
}
