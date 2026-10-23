"use client"

import React, { useState, useMemo } from "react"
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths, 
  isToday,
  parseISO
} from "date-fns"
import { es } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Phone, MessageSquare, NotebookPen } from "lucide-react"

interface SessionItem {
  id: string
  session_date: string
  client_name: string
  client_phone: string | null
  client_email: string | null
  session_type: "photo" | "video"
  category: string
  status: string
  comments: string | null
  internal_notes: string | null
  tags: string[]
}

interface MobileCalendarViewProps {
  sessions: SessionItem[]
}

export function MobileCalendarView({ sessions }: MobileCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())

  // Mapear sesiones por fecha (YYYY-MM-DD)
  const sessionsByDate = useMemo(() => {
    const map: Record<string, SessionItem[]> = {}
    sessions.forEach((s) => {
      if (!s.session_date) return
      const d = s.session_date.split("T")[0]
      if (!map[d]) map[d] = []
      map[d].push(s)
    })
    return map
  }, [sessions])

  // Días del mes actual para la cuadrícula
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 })
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate })

  const selectedDateKey = format(selectedDate, "yyyy-MM-dd")
  const daySessions = sessionsByDate[selectedDateKey] || []

  const weekDayHeaders = ["L", "M", "X", "J", "V", "S", "D"]

  return (
    <div className="md:hidden flex flex-col space-y-4 pb-20">
      {/* Selector de Mes */}
      <div className="flex items-center justify-between bg-[#141210] p-3 rounded-2xl border border-[#26211c] shadow-lg">
        <button
          type="button"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 rounded-xl text-[#a89f91] hover:text-[#f5f2eb] hover:bg-[#201c18] transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-[#c69f68]" />
        </button>

        <div className="text-center">
          <span className="text-sm font-bold font-serif text-[#f5f2eb] capitalize block">
            {format(currentMonth, "MMMM yyyy", { locale: es })}
          </span>
          <button
            type="button"
            onClick={() => {
              const today = new Date()
              setCurrentMonth(today)
              setSelectedDate(today)
            }}
            className="text-[10px] text-[#c69f68] uppercase tracking-wider font-semibold hover:underline"
          >
            Hoy
          </button>
        </div>

        <button
          type="button"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2 rounded-xl text-[#a89f91] hover:text-[#f5f2eb] hover:bg-[#201c18] transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-[#c69f68]" />
        </button>
      </div>

      {/* Mini Cuadrícula del Calendario */}
      <div className="bg-[#141210] p-3 rounded-2xl border border-[#26211c] shadow-lg">
        {/* Cabecera L M X J V S D */}
        <div className="grid grid-cols-7 gap-1 mb-2 text-center">
          {weekDayHeaders.map((day, idx) => (
            <span key={idx} className="text-[11px] font-mono text-[#70665a] font-bold py-0.5">
              {day}
            </span>
          ))}
        </div>

        {/* Celdas de los días */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {calendarDays.map((day, idx) => {
            const dateKey = format(day, "yyyy-MM-dd")
            const isCurrentMonthDay = isSameMonth(day, currentMonth)
            const isSelected = isSameDay(day, selectedDate)
            const isTodayDay = isToday(day)
            const hasSessions = Boolean(sessionsByDate[dateKey]?.length)

            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedDate(day)}
                className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center transition-all relative ${
                  !isCurrentMonthDay
                    ? "opacity-25 text-[#554c42]"
                    : isSelected
                    ? "bg-[#c69f68] text-[#0b0a09] font-bold shadow-md shadow-[#c69f68]/30 scale-105 z-10"
                    : isTodayDay
                    ? "bg-[#201c18] text-[#c69f68] font-bold border border-[#c69f68]/40"
                    : "text-[#d6cebf] hover:bg-[#1a1714]"
                }`}
              >
                <span className="text-xs leading-none">{format(day, "d")}</span>
                {/* Punto indicador de sesión */}
                {hasSessions && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full mt-1 ${
                      isSelected ? "bg-[#0b0a09]" : "bg-[#c69f68]"
                    }`}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Lista de Sesiones del Día Seleccionado */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs uppercase tracking-wider font-semibold text-[#8c7a6b] font-serif">
            {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
          </span>
          <span className="text-[10px] text-[#c69f68] font-mono font-bold">
            {daySessions.length} {daySessions.length === 1 ? "sesión" : "sesiones"}
          </span>
        </div>

        {daySessions.length === 0 ? (
          <div className="p-6 rounded-2xl bg-[#141210]/60 border border-[#26211c] text-center">
            <p className="text-xs text-[#70665a]">No hay sesiones programadas para este día.</p>
          </div>
        ) : (
          daySessions.map((session) => {
            const notes = session.internal_notes || session.comments
            return (
              <div
                key={session.id}
                className="p-3.5 rounded-2xl bg-[#141210] border border-[#26211c] space-y-2.5 shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold font-serif text-[#f5f2eb]">
                      {session.client_name}
                    </h4>
                    <span className="text-[10px] uppercase tracking-wider text-[#c69f68] font-mono font-semibold">
                      {session.category || "Sesión"}
                    </span>
                  </div>

                  {session.client_phone && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={`https://wa.me/${session.client_phone.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20"
                        title="WhatsApp"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </a>
                      <a
                        href={`tel:${session.client_phone}`}
                        className="p-2 rounded-xl bg-[#201c18] text-[#c69f68] hover:bg-[#2c2620] border border-[#c69f68]/20"
                        title="Llamar"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Notas de la Sesión */}
                {notes && notes.trim().length > 0 && (
                  <div className="p-2.5 rounded-xl bg-[#0b0a09] border border-[#221e1a] text-xs space-y-1">
                    <div className="flex items-center gap-1 text-[10px] text-[#c69f68] font-semibold">
                      <NotebookPen className="w-3 h-3" />
                      <span>Notas de la sesión:</span>
                    </div>
                    <p className="text-[#a89f91] text-[11px] leading-relaxed select-text">
                      {notes}
                    </p>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
