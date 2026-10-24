"use client"

import { useState, useEffect, useCallback } from "react"
import { 
  MessageSquare, 
  QrCode, 
  RefreshCw, 
  Send, 
  LogOut, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ShieldCheck, 
  Radio, 
  Loader2, 
  Webhook, 
  Sparkles 
} from "lucide-react"

export function WhatsAppGatewayCard() {
  const [state, setState] = useState<"open" | "connecting" | "close" | "unknown">("close")
  const [instanceName, setInstanceName] = useState("estudio-fotos")
  const [loading, setLoading] = useState(true)
  const [qrBase64, setQrBase64] = useState<string | null>(null)
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [isGeneratingQr, setIsGeneratingQr] = useState(false)
  const [testPhone, setTestPhone] = useState("")
  const [testText, setTestText] = useState("¡Hola desde Lamha Studios Atelier! Tu integración de WhatsApp está funcionando correctamente. 📸")
  const [isSendingTest, setIsSendingTest] = useState(false)
  const [isConfiguringWebhook, setIsConfiguringWebhook] = useState(false)
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null)

  // Consultar estado de la instancia
  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/status", { cache: "no-store" })
      const data = await res.json()
      if (data?.state) {
        setState(data.state)
        setInstanceName(data.instanceName || "estudio-fotos")
        if (data.state === "open") {
          setQrBase64(null)
          setPairingCode(null)
        }
      }
    } catch (err: any) {
      console.warn("Error al comprobar estado WhatsApp:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    checkStatus()
  }, [checkStatus])

  // Polling automático mientras se está en estado connecting o mostrando QR
  useEffect(() => {
    let interval: any = null
    if (state === "connecting" || qrBase64) {
      interval = setInterval(() => {
        checkStatus()
      }, 4000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [state, qrBase64, checkStatus])

  // Generar o refrescar código QR
  const handleGenerateQR = async () => {
    setIsGeneratingQr(true)
    setFeedback(null)
    try {
      const res = await fetch("/api/whatsapp/status", { method: "POST" })
      const data = await res.json()
      if (data?.base64) {
        setQrBase64(data.base64)
        setPairingCode(data.pairingCode || null)
        setState("connecting")
        setFeedback({ type: "info", text: "Escanea el código QR con tu WhatsApp en Dispositivos vinculados." })
      } else if (data?.state === "open") {
        setState("open")
        setQrBase64(null)
        setFeedback({ type: "success", text: "WhatsApp ya está conectado y operativo." })
      } else {
        setFeedback({ type: "error", text: data?.error || "No se pudo generar el código QR. Comprueba la API Key." })
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Error al conectar con Evolution API." })
    } finally {
      setIsGeneratingQr(false)
    }
  }

  // Cerrar sesión / Desvincular
  const handleLogout = async () => {
    if (!confirm("¿Seguro que deseas desvincular el número de WhatsApp actual del Atelier?")) return
    setLoading(true)
    setFeedback(null)
    try {
      const res = await fetch("/api/whatsapp/status", { method: "DELETE" })
      const data = await res.json()
      if (data?.success) {
        setState("close")
        setQrBase64(null)
        setFeedback({ type: "info", text: "Sesión de WhatsApp cerrada correctamente." })
      } else {
        setFeedback({ type: "error", text: data?.error || "Error al cerrar sesión." })
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message })
    } finally {
      setLoading(false)
      checkStatus()
    }
  }

  // Configurar Webhook automático
  const handleSetupWebhook = async () => {
    setIsConfiguringWebhook(true)
    setFeedback(null)
    try {
      const res = await fetch("/api/whatsapp/webhook-setup", { method: "POST" })
      const data = await res.json()
      if (data?.success) {
        setFeedback({ 
          type: "success", 
          text: `Webhook configurado con éxito en Evolution API (${data.configuredUrl}).` 
        })
      } else {
        setFeedback({ type: "error", text: data?.error || "Error al configurar el webhook." })
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message })
    } finally {
      setIsConfiguringWebhook(false)
    }
  }

  // Enviar mensaje de prueba
  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!testPhone) {
      setFeedback({ type: "error", text: "Ingresa un número de teléfono para la prueba." })
      return
    }

    setIsSendingTest(true)
    setFeedback(null)
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: testPhone, text: testText })
      })
      const data = await res.json()
      if (res.ok && data?.success) {
        setFeedback({ type: "success", text: `Mensaje de prueba enviado con éxito a ${testPhone} (ID: ${data.messageId}).` })
      } else {
        setFeedback({ type: "error", text: data?.error || "Error al enviar mensaje de prueba." })
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message })
    } finally {
      setIsSendingTest(false)
    }
  }

  const isConnected = state === "open"

  return (
    <div className="rounded-2xl border border-[#26211c] bg-[#141210] p-6 shadow-xl space-y-6">
      {/* Cabecera de la Tarjeta */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#26211c]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-[#f5f2eb] font-serif">
                Pasarela WhatsApp Atelier
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1e1b17] border border-[#383025] text-[#c69f68] font-mono">
                Evolution API v2
              </span>
            </div>
            <p className="text-xs text-[#8c7a6b]">
              Instancia: <strong className="text-[#f5f2eb]">{instanceName}</strong>
            </p>
          </div>
        </div>

        {/* Badge de Estado */}
        <div className="flex items-center gap-2">
          {loading ? (
            <span className="flex items-center gap-1.5 text-xs text-[#8c7a6b]">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#c69f68]" />
              Comprobando...
            </span>
          ) : isConnected ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Conectado y Operativo</span>
            </div>
          ) : state === "connecting" ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>Esperando Vinculación</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              <span>Desconectado</span>
            </div>
          )}

          <button
            type="button"
            onClick={checkStatus}
            disabled={loading}
            className="p-1.5 rounded-lg border border-[#2a241d] bg-[#1a1714] hover:bg-[#24201b] text-[#c69f68] transition-colors"
            title="Refrescar estado"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Alertas y Feedback */}
      {feedback && (
        <div className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 border ${
          feedback.type === "success" 
            ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-300"
            : feedback.type === "error"
            ? "bg-red-950/30 border-red-500/30 text-red-300"
            : "bg-[#211b15] border-[#c69f68]/30 text-[#e6c99c]"
        }`}>
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
          ) : feedback.type === "error" ? (
            <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#c69f68]" />
          )}
          <span className="leading-relaxed">{feedback.text}</span>
        </div>
      )}

      {/* Estado: DESCONECTADO O CONECTANDO -> Mostrar QR */}
      {!isConnected && (
        <div className="p-5 rounded-2xl bg-[#0f0e0c] border border-[#26211c] space-y-4 text-center">
          {qrBase64 ? (
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="p-3 bg-white rounded-2xl shadow-2xl border-4 border-[#c69f68]/30 inline-block">
                <img 
                  src={qrBase64.startsWith("data:") ? qrBase64 : `data:image/png;base64,${qrBase64}`} 
                  alt="Código QR WhatsApp" 
                  className="w-56 h-56 object-contain"
                />
              </div>

              {pairingCode && (
                <div className="text-xs text-[#a89f91] space-y-1">
                  <span>Código de emparejamiento manual:</span>
                  <div className="px-3 py-1 rounded-lg bg-[#181613] border border-[#3d342a] text-[#c69f68] font-mono text-sm tracking-wider font-bold">
                    {pairingCode}
                  </div>
                </div>
              )}

              <p className="text-xs text-[#a89f91] max-w-sm leading-relaxed">
                Abre WhatsApp en tu teléfono móvil &gt; <strong>Dispositivos vinculados</strong> &gt; <strong>Vincular un dispositivo</strong> y apunta la cámara a este código.
              </p>

              <button
                type="button"
                onClick={handleGenerateQR}
                disabled={isGeneratingQr}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#1e1b17] hover:bg-[#29241e] border border-[#3d342a] text-[#c69f68] text-xs transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingQr ? "animate-spin" : ""}`} />
                <span>Actualizar Código QR</span>
              </button>
            </div>
          ) : (
            <div className="py-6 flex flex-col items-center justify-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[#1e1b17] border border-[#3d342a] flex items-center justify-center text-[#c69f68]">
                <QrCode className="w-7 h-7" />
              </div>
              <div className="space-y-1 max-w-md">
                <h3 className="text-sm font-semibold text-[#f5f2eb]">
                  Vincular WhatsApp del Estudio
                </h3>
                <p className="text-xs text-[#8c7a6b] leading-relaxed">
                  Conecta el número de WhatsApp oficial del estudio para automatizar confirmaciones de citas, alertas de montaje finalizado y chatear con clientes.
                </p>
              </div>

              <button
                type="button"
                onClick={handleGenerateQR}
                disabled={isGeneratingQr}
                className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#c69f68] to-[#b38952] text-black font-semibold text-xs shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer"
              >
                {isGeneratingQr ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generando código QR...</span>
                  </>
                ) : (
                  <>
                    <QrCode className="w-4 h-4" />
                    <span>Generar QR de Vinculación</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Estado: CONECTADO -> Panel de control y Pruebas */}
      {isConnected && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 text-xs">
            <div className="p-3.5 rounded-xl bg-[#181613] border border-[#26211c] space-y-1">
              <span className="text-[#70665a] uppercase tracking-wider text-[10px] block font-semibold">
                Automatización de Proyectos
              </span>
              <div className="flex items-center gap-2 text-emerald-400 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                <span>Notificaciones Transaccionales Activas</span>
              </div>
              <p className="text-[11px] text-[#8c7a6b]">
                Confirmación al crear sesión y aviso de entrega de fotos/vídeos listo.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#181613] border border-[#26211c] space-y-1">
              <span className="text-[#70665a] uppercase tracking-wider text-[10px] block font-semibold">
                Recepción Bidireccional
              </span>
              <div className="flex items-center gap-2 text-emerald-400 font-medium">
                <Radio className="w-4 h-4" />
                <span>Webhook Supabase Realtime</span>
              </div>
              <p className="text-[11px] text-[#8c7a6b]">
                Los mensajes que los clientes envían se sincronizan automáticamente.
              </p>
            </div>
          </div>

          {/* Formulario de Mensaje de Prueba */}
          <form onSubmit={handleSendTest} className="p-4 rounded-xl bg-[#181613] border border-[#26211c] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#f5f2eb] flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-[#c69f68]" />
                Enviar Mensaje de Prueba
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-1">
                <label className="text-[10px] text-[#70665a] uppercase tracking-wider block mb-1">
                  Teléfono con código país
                </label>
                <input
                  type="text"
                  placeholder="Ej: 212612345678"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#100f0d] border border-[#332c23] text-xs text-[#f5f2eb] placeholder-[#594f43] font-mono focus:outline-none focus:border-[#c69f68]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] text-[#70665a] uppercase tracking-wider block mb-1">
                  Texto del mensaje
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testText}
                    onChange={(e) => setTestText(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-[#100f0d] border border-[#332c23] text-xs text-[#f5f2eb] placeholder-[#594f43] focus:outline-none focus:border-[#c69f68]"
                  />
                  <button
                    type="submit"
                    disabled={isSendingTest}
                    className="px-3.5 py-1.5 rounded-lg bg-[#c69f68] hover:bg-[#b58f58] text-black font-semibold text-xs transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSendingTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>Enviar</span>
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Botones de Utilidad Inferiores */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#26211c]">
        <button
          type="button"
          onClick={handleSetupWebhook}
          disabled={isConfiguringWebhook}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#3d342a] text-[#c69f68] hover:bg-[#1f1b17] text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
          title="Registra automáticamente la URL del Webhook en Evolution API"
        >
          {isConfiguringWebhook ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Webhook className="w-3.5 h-3.5" />}
          <span>Autoconfigurar Webhook</span>
        </button>

        {isConnected && (
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-950/20 text-xs font-medium transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Desvincular WhatsApp</span>
          </button>
        )}
      </div>
    </div>
  )
}
