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
  isToday 
} from "date-fns"
import { es } from "date-fns/locale"
import { 
  ChevronLeft, 
  ChevronRight, 
  Phone, 
  MessageSquare, 
  NotebookPen, 
  Plus, 
  Save, 
  Check, 
  Edit3, 
  X,
  Calendar as CalendarIcon,
  Clock,
  Sparkles
} from "lucide-react"
import { SessionDialog } from "@/components/session-dialog"
import { updateSessionNotes } from "@/app/actions"

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
  onRefresh?: () => void
}

export function MobileCalendarView({ sessions, onRefresh }: MobileCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  
  // Edición rápida de notas
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [noteDraft, setNoteDraft] = useState<string>("")
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [saveSuccessId, setSaveSuccessId] = useState<string | null>(null)

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

  // Guardar nota editada en la sesión
  const handleSaveNote = async (sessionId: string) => {
    setIsSavingNote(true)
    try {
      const res = await updateSessionNotes(sessionId, noteDraft)
      if (res && res.success) {
        // Actualizar localmente la sesión
        const target = sessions.find(s => s.id === sessionId)
        if (target) {
          target.comments = noteDraft
        }
        setSaveSuccessId(sessionId)
        setEditingSessionId(null)
        setTimeout(() => setSaveSuccessId(null), 2500)
        if (onRefresh) onRefresh()
      } else {
        alert("No se pudo guardar la nota: " + (res?.error || "Error desconocido"))
      }
    } catch (e: any) {
      alert("Error: " + e.message)
    } finally {
      setIsSavingNote(false)
    }
  }

  return (
    <div className="md:hidden flex flex-col space-y-4 pb-24">
      {/* Barra de Título y Botón Crear Sesión */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-lg font-serif font-bold text-[#f5f2eb] tracking-wide flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-[#c69f68]" />
            <span>Calendario</span>
          </h2>
          <p className="text-[11px] text-[#8c7a6b]">Agenda y eventos diarios</p>
        </div>

        {/* Botón para crear sesión directamente en el día seleccionado */}
        <SessionDialog
          defaultDate={selectedDateKey}
          onSuccess={() => onRefresh && onRefresh()}
          customTrigger={
            <button
              type="button"
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#c69f68] to-[#dfba85] text-[#0b0a09] font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-[#c69f68]/20 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Añadir</span>
            </button>
          }
        />
      </div>

      {/* Selector de Mes */}
      <div className="flex items-center justify-between bg-[#141210] p-3 rounded-2xl border border-[#26211c] shadow-lg">
        <button
          type="button"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 rounded-xl text-[#a89f91] hover:text-[#f5f2eb] hover:bg-[#201c18] transition-colors cursor-pointer"
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
            className="text-[10px] text-[#c69f68] uppercase tracking-wider font-semibold hover:underline cursor-pointer"
          >
            Hoy
          </button>
        </div>

        <button
          type="button"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2 rounded-xl text-[#a89f91] hover:text-[#f5f2eb] hover:bg-[#201c18] transition-colors cursor-pointer"
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
            const daySess = sessionsByDate[dateKey] || []
            const hasSessions = daySess.length > 0
            const hasNotes = daySess.some(s => Boolean(s.comments && s.comments.trim().length > 0))

            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedDate(day)}
                className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center transition-all relative cursor-pointer ${
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
                
                {/* Puntos indicadores: sesión y nota */}
                <div className="flex items-center gap-0.5 mt-1">
                  {hasSessions && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? "bg-[#0b0a09]" : "bg-[#c69f68]"
                      }`}
                    />
                  )}
                  {hasNotes && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? "bg-amber-950" : "bg-amber-400"
                      }`}
                      title="Tiene notas"
                    />
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Lista de Sesiones del Día Seleccionado */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs uppercase tracking-wider font-semibold text-[#8c7a6b] font-serif">
            {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
          </span>
          <span className="text-[10px] text-[#c69f68] font-mono font-bold">
            {daySessions.length} {daySessions.length === 1 ? "sesión" : "sesiones"}
          </span>
        </div>

        {daySessions.length === 0 ? (
          <div className="p-6 rounded-2xl bg-[#141210]/60 border border-[#26211c] text-center space-y-3">
            <p className="text-xs text-[#70665a]">No hay sesiones programadas para este día.</p>
            <SessionDialog
              defaultDate={selectedDateKey}
              onSuccess={() => onRefresh && onRefresh()}
              customTrigger={
                <button
                  type="button"
                  className="px-3.5 py-1.5 rounded-xl bg-[#1c1815] hover:bg-[#25201b] border border-[#2e261f] text-[#c69f68] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Programar sesión en esta fecha</span>
                </button>
              }
            />
          </div>
        ) : (
          daySessions.map((session) => {
            const isEditingThis = editingSessionId === session.id
            const currentNotes = session.comments || session.internal_notes || ""
            const hasNotes = currentNotes.trim().length > 0

            return (
              <div
                key={session.id}
                className="p-3.5 rounded-2xl bg-[#141210] border border-[#26211c] space-y-3 shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold font-serif text-[#f5f2eb] truncate">
                      {session.client_name}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] uppercase tracking-wider text-[#c69f68] font-mono font-semibold">
                        {session.category || "Sesión"}
                      </span>
                      <span className="text-[10px] text-[#70665a] uppercase font-mono">
                        • {session.session_type === "photo" ? "Fotografía" : "Vídeo"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {session.client_phone && (
                      <>
                        <a
                          href={`https://wa.me/${session.client_phone.replace(/[^0-9]/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors"
                          title="WhatsApp"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </a>
                        <a
                          href={`tel:${session.client_phone}`}
                          className="p-2 rounded-xl bg-[#201c18] text-[#c69f68] hover:bg-[#2c2620] border border-[#c69f68]/20 transition-colors"
                          title="Llamar"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                      </>
                    )}
                  </div>
                </div>

                {/* Sección de Notas del Evento (Visualizar + Añadir / Editar) */}
                <div className="p-3 rounded-xl bg-[#0b0a09] border border-[#221e1a] space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-[#c69f68] font-semibold">
                      <NotebookPen className="w-3.5 h-3.5" />
                      <span>Notas de la sesión</span>
                      {saveSuccessId === session.id && (
                        <span className="text-[10px] text-emerald-400 flex items-center gap-0.5 ml-2 font-mono">
                          <Check className="w-3 h-3" /> Guardado
                        </span>
                      )}
                    </div>

                    {!isEditingThis && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSessionId(session.id)
                          setNoteDraft(session.comments || "")
                        }}
                        className="text-[11px] text-[#8c7a6b] hover:text-[#c69f68] flex items-center gap-1 font-medium transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>{hasNotes ? "Editar" : "Añadir nota"}</span>
                      </button>
                    )}
                  </div>

                  {/* Formulario de edición o visualización */}
                  {isEditingThis ? (
                    <div className="space-y-2 pt-1">
                      <textarea
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        placeholder="Escribe detalles, preferencias del cliente, instrucciones de vestuario, localizaciones..."
                        rows={3}
                        className="w-full p-2.5 rounded-xl bg-[#141210] border border-[#383129] text-xs text-[#f5f2eb] placeholder-[#70665a] outline-none focus:border-[#c69f68] transition-colors resize-none"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingSessionId(null)}
                          className="px-2.5 py-1 rounded-lg text-xs text-[#8c7a6b] hover:text-[#f5f2eb] cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveNote(session.id)}
                          disabled={isSavingNote}
                          className="px-3 py-1 rounded-lg bg-[#c69f68] text-[#0b0a09] font-bold text-xs flex items-center gap-1 shadow-md hover:brightness-110 disabled:opacity-50 cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{isSavingNote ? "Guardando..." : "Guardar Nota"}</span>
                        </button>
                      </div>
                    </div>
                  ) : hasNotes ? (
                    <p className="text-[#a89f91] text-xs leading-relaxed whitespace-pre-wrap select-text">
                      {currentNotes}
                    </p>
                  ) : (
                    <p className="text-[#554c42] text-[11px] italic">
                      Sin notas para esta sesión. Toca &quot;Añadir nota&quot; para registrar comentarios.
                    </p>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
