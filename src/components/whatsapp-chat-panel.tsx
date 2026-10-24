"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase"
import type { WhatsAppMessage } from "@/types/database"
import { 
  Send, 
  MessageSquare, 
  Check, 
  CheckCheck, 
  Clock, 
  AlertCircle, 
  Loader2, 
  Sparkles, 
  PhoneCall, 
  User, 
  FileText, 
  Image as ImageIcon 
} from "lucide-react"
import { format } from "date-fns"

interface WhatsAppChatPanelProps {
  clientId?: string | null
  sessionId?: string | null
  clientPhone?: string | null
  clientName?: string | null
  title?: string
}

export function WhatsAppChatPanel({
  clientId,
  sessionId,
  clientPhone,
  clientName,
  title = "Chat de WhatsApp con Cliente"
}: WhatsAppChatPanelProps) {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [inputText, setInputText] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" })
  }

  // Cargar historial de mensajes inicial
  const fetchMessages = useCallback(async () => {
    try {
      const supabase = createClient()
      let query = supabase
        .from("whatsapp_messages")
        .select("*")
        .order("created_at", { ascending: true })

      if (sessionId) {
        query = query.eq("session_id", sessionId)
      } else if (clientId) {
        query = query.eq("client_id", clientId)
      } else if (clientPhone) {
        const cleanPhone = clientPhone.replace(/\D/g, "")
        query = query.eq("phone", cleanPhone)
      } else {
        setLoading(false)
        return
      }

      const { data, error: qErr } = await query
      if (qErr) {
        console.warn("[WhatsApp Chat] Error consultando mensajes:", qErr)
      } else if (data) {
        setMessages(data as WhatsAppMessage[])
      }
    } catch (err: any) {
      console.warn("[WhatsApp Chat] Excepción al consultar mensajes:", err)
    } finally {
      setLoading(false)
    }
  }, [sessionId, clientId, clientPhone])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  useEffect(() => {
    scrollToBottom(false)
  }, [messages])

  // Suscripción a Supabase Realtime para recibir mensajes entrantes en vivo
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`chat-whatsapp-${sessionId || clientId || clientPhone || "all"}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "whatsapp_messages"
        },
        (payload: any) => {
          if (payload.eventType === "INSERT") {
            const newMsg = payload.new as WhatsAppMessage
            const matchesSession = sessionId && newMsg.session_id === sessionId
            const matchesClient = clientId && newMsg.client_id === clientId
            const matchesPhone = clientPhone && newMsg.phone === clientPhone.replace(/\D/g, "")

            if (matchesSession || matchesClient || matchesPhone || (!sessionId && !clientId && !clientPhone)) {
              setMessages((prev) => {
                if (prev.some((m) => m.id === newMsg.id || (m.external_message_id && m.external_message_id === newMsg.external_message_id))) {
                  return prev
                }
                return [...prev, newMsg]
              })
            }
          } else if (payload.eventType === "UPDATE") {
            const updatedMsg = payload.new as WhatsAppMessage
            setMessages((prev) =>
              prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, clientId, clientPhone])

  // Enviar mensaje
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!inputText.trim() || sending) return

    const targetPhone = clientPhone
    if (!targetPhone) {
      setError("Este cliente no tiene un número de teléfono asignado para WhatsApp.")
      return
    }

    setSending(true)
    setError(null)
    const textToSend = inputText.trim()
    setInputText("")

    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: targetPhone,
          text: textToSend,
          clientId: clientId || null,
          sessionId: sessionId || null
        })
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error || "No se pudo enviar el mensaje por WhatsApp.")
        setInputText(textToSend) // Restaurar texto si falló
      } else {
        // Refrescar mensajes por seguridad si Realtime tardase
        fetchMessages()
      }
    } catch (err: any) {
      setError(err.message || "Error al conectar con la pasarela de WhatsApp.")
      setInputText(textToSend)
    } finally {
      setSending(false)
    }
  }

  // Plantillas rápidas
  const applyTemplate = (templateType: "confirm" | "ready" | "portal") => {
    const name = clientName || "Estimado/a cliente"
    if (templateType === "confirm") {
      setInputText(`¡Hola ${name}! 📸 Te confirmamos tu sesión de fotos en Lamha Studios. Si tienes alguna consulta previa, puedes responder a este mensaje.`)
    } else if (templateType === "ready") {
      setInputText(`¡Hola ${name}! 🎉 El montaje de fotos y vídeos de tu sesión ya está completamente finalizado y disponible para ti.`)
    } else if (templateType === "portal") {
      setInputText(`¡Hola ${name}! Puedes acceder a tu galería privada de selección en el portal de clientes de Lamha Studios.`)
    }
  }

  return (
    <div className="rounded-2xl border border-[#26211c] bg-[#141210] flex flex-col h-[520px] shadow-xl overflow-hidden">
      {/* Header del Chat */}
      <div className="p-4 border-b border-[#26211c] bg-[#171411] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#f5f2eb] font-serif flex items-center gap-2">
              <span>{title}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </h3>
            <p className="text-[11px] text-[#8c7a6b] flex items-center gap-2">
              <span>{clientName || "Cliente"}</span>
              {clientPhone && (
                <>
                  <span>•</span>
                  <span className="font-mono text-[#c69f68]">{clientPhone}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Acciones de Cabecera */}
        <div className="flex items-center gap-2">
          {clientPhone && (
            <a
              href={`https://wa.me/${clientPhone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-lg border border-[#383025] bg-[#1c1915] hover:bg-[#26211c] text-[#c69f68] text-[11px] flex items-center gap-1.5 transition-colors"
              title="Abrir en WhatsApp Web nativo"
            >
              <span>Abrir WhatsApp Web</span>
            </a>
          )}
        </div>
      </div>

      {/* Alerta de Error si ocurre */}
      {error && (
        <div className="p-2.5 px-4 bg-red-950/40 border-b border-red-500/30 text-red-300 text-xs flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-200 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Área de Mensajes */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0d0c0a]/60">
        {loading ? (
          <div className="h-full flex items-center justify-center text-[#8c7a6b] text-xs gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#c69f68]" />
            <span>Cargando mensajes...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
            <div className="w-12 h-12 rounded-full bg-[#181613] border border-[#2b241c] flex items-center justify-center text-[#70665a]">
              <MessageSquare className="w-5 h-5" />
            </div>
            <p className="text-xs text-[#a89f91] font-medium">No hay mensajes previos registrados</p>
            <p className="text-[11px] text-[#70665a] max-w-xs">
              Envía un mensaje para iniciar la conversación o utiliza una plantilla rápida.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.from_me
            let timeStr = ""
            try {
              timeStr = format(new Date(msg.created_at), "HH:mm")
            } catch {
              timeStr = ""
            }

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[78%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-md text-xs leading-relaxed ${
                    isMe
                      ? "bg-gradient-to-r from-[#c69f68] to-[#b38952] text-[#0b0a09] font-medium rounded-br-sm"
                      : "bg-[#1c1915] border border-[#2b251e] text-[#f5f2eb] rounded-bl-sm"
                  }`}
                >
                  {/* Contenido multimedia badge si aplica */}
                  {msg.message_type && msg.message_type !== "text" && (
                    <div className={`text-[10px] uppercase font-bold tracking-wider mb-1 flex items-center gap-1 ${
                      isMe ? "text-[#0b0a09]/70" : "text-[#c69f68]"
                    }`}>
                      {msg.message_type === "image" ? <ImageIcon className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                      <span>{msg.message_type}</span>
                    </div>
                  )}

                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>

                  {/* Pie de burbuja con hora y checks */}
                  <div
                    className={`flex items-center justify-end gap-1 text-[10px] mt-1 ${
                      isMe ? "text-[#0b0a09]/70" : "text-[#70665a]"
                    }`}
                  >
                    <span>{timeStr}</span>
                    {isMe && (
                      <span title={msg.status === "read" ? "Leído" : msg.status === "delivered" ? "Entregado" : "Enviado"}>
                        {msg.status === "read" ? (
                          <CheckCheck className="w-3.5 h-3.5 text-blue-900" />
                        ) : msg.status === "delivered" ? (
                          <CheckCheck className="w-3.5 h-3.5 text-[#0b0a09]/60" />
                        ) : (
                          <Check className="w-3.5 h-3.5 text-[#0b0a09]/50" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Plantillas Rápidas */}
      <div className="p-2 px-3 border-t border-[#26211c] bg-[#141210] flex items-center gap-2 overflow-x-auto shrink-0 select-none">
        <span className="text-[10px] text-[#70665a] uppercase font-bold shrink-0 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-[#c69f68]" /> Plantillas:
        </span>
        <button
          type="button"
          onClick={() => applyTemplate("confirm")}
          className="px-2.5 py-1 rounded-full bg-[#1c1915] hover:bg-[#26211c] border border-[#332a21] text-[10px] text-[#c69f68] whitespace-nowrap transition-colors"
        >
          Confirmación cita
        </button>
        <button
          type="button"
          onClick={() => applyTemplate("ready")}
          className="px-2.5 py-1 rounded-full bg-[#1c1915] hover:bg-[#26211c] border border-[#332a21] text-[10px] text-[#c69f68] whitespace-nowrap transition-colors"
        >
          Montaje listo
        </button>
        <button
          type="button"
          onClick={() => applyTemplate("portal")}
          className="px-2.5 py-1 rounded-full bg-[#1c1915] hover:bg-[#26211c] border border-[#332a21] text-[10px] text-[#c69f68] whitespace-nowrap transition-colors"
        >
          Acceso Portal
        </button>
      </div>

      {/* Formulario Inferior de Envío */}
      <form onSubmit={handleSend} className="p-3 border-t border-[#26211c] bg-[#171411] flex items-center gap-2 shrink-0">
        <input
          type="text"
          placeholder={clientPhone ? `Escribe un WhatsApp para ${clientName || "el cliente"}...` : "El cliente no tiene teléfono asignado"}
          disabled={!clientPhone || sending}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="flex-1 px-3.5 py-2 rounded-xl bg-[#0f0e0c] border border-[#332c24] text-xs text-[#f5f2eb] placeholder-[#665c50] focus:outline-none focus:border-[#c69f68] disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!clientPhone || !inputText.trim() || sending}
          className="px-4 py-2 rounded-xl bg-[#c69f68] hover:bg-[#b38952] text-black font-semibold text-xs flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          <span className="hidden sm:inline">Enviar</span>
        </button>
      </form>
    </div>
  )
}
