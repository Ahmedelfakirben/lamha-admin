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
  Radio, 
  Loader2, 
  Webhook
} from "lucide-react"
import { useLanguage } from "@/context/language-context"

const GATEWAY_I18N = {
  fr: {
    cardTitle: "Passerelle WhatsApp Atelier",
    instanceLabel: "Instance :",
    checking: "Vérification...",
    connected: "Connecté & Opérationnel",
    waitingConnection: "En attente d'association",
    disconnected: "Déconnecté",
    refreshTooltip: "Actualiser l'état",
    scanPrompt: "Scannez le code QR avec WhatsApp dans Appareils connectés.",
    alreadyConnected: "WhatsApp est déjà connecté et opérationnel.",
    generateQrError: "Impossible de générer le code QR. Vérifiez la clé API.",
    connectionError: "Erreur de connexion avec Evolution API.",
    logoutSuccess: "Session WhatsApp déconnectée avec succès.",
    logoutError: "Erreur lors de la déconnexion.",
    logoutConfirm: "Êtes-vous sûr de vouloir déconnecter le compte WhatsApp officiel de l'Atelier ?",
    webhookSuccess: (url: string) => `Webhook configuré avec succès dans Evolution API (${url}).`,
    webhookError: "Erreur lors de la configuration du webhook.",
    enterPhoneError: "Veuillez saisir un numéro de téléphone pour le test.",
    testSuccess: (phone: string, id: string) => `Message de test envoyé avec succès à ${phone} (ID: ${id}).`,
    testError: "Erreur lors de l'envoi du message de test.",
    manualCodeLabel: "Code d'association manuel :",
    scanInstructions: "Ouvrez WhatsApp sur votre smartphone > Appareils connectés > Connecter un appareil et pointez la caméra vers ce code QR.",
    updateQrBtn: "Actualiser le Code QR",
    linkTitle: "Associer le WhatsApp du Studio",
    linkDesc: "Connectez le numéro WhatsApp officiel du studio pour automatiser les confirmations de rendez-vous, alertes de livraison et dialoguer avec vos clients.",
    generatingQr: "Génération du code QR...",
    generateQrBtn: "Générer le QR Code d'Association",
    autoProjectsTitle: "Automatisation des Projets",
    autoProjectsBadge: "Notifications Transactionnelles Actives",
    autoProjectsDesc: "Confirmation à la création de projet et notification de photos/vidéos prêtes.",
    biTitle: "Réception Bidirectionnelle",
    biBadge: "Webhook Supabase Realtime",
    biDesc: "Les messages envoyés par vos clients sont synchronisés automatiquement.",
    testCardTitle: "Envoyer un Message de Test",
    phoneLabel: "Téléphone avec indicatif pays",
    phonePlaceholder: "Ex : 212612345678",
    textLabel: "Texte du message",
    defaultTestText: "Bonjour depuis Lamha Studios Atelier ! Votre intégration WhatsApp fonctionne parfaitement.",
    sendBtn: "Envoyer",
    sendingBtn: "Envoi...",
    autoWebhookBtn: "Autoconfigurer Webhook",
    configuringWebhook: "Configuration...",
    disconnectBtn: "Déconnecter WhatsApp",
  },
  es: {
    cardTitle: "Pasarela WhatsApp Atelier",
    instanceLabel: "Instancia:",
    checking: "Comprobando...",
    connected: "Conectado y Operativo",
    waitingConnection: "Esperando Vinculación",
    disconnected: "Desconectado",
    refreshTooltip: "Refrescar estado",
    scanPrompt: "Escanea el código QR con tu WhatsApp en Dispositivos vinculados.",
    alreadyConnected: "WhatsApp ya está conectado y operativo.",
    generateQrError: "No se pudo generar el código QR. Comprueba la API Key.",
    connectionError: "Error al conectar con Evolution API.",
    logoutSuccess: "Sesión de WhatsApp cerrada correctamente.",
    logoutError: "Error al cerrar sesión.",
    logoutConfirm: "¿Seguro que deseas desvincular el número de WhatsApp actual del Atelier?",
    webhookSuccess: (url: string) => `Webhook configurado con éxito en Evolution API (${url}).`,
    webhookError: "Error al configurar el webhook.",
    enterPhoneError: "Ingresa un número de teléfono para la prueba.",
    testSuccess: (phone: string, id: string) => `Mensaje de prueba enviado con éxito a ${phone} (ID: ${id}).`,
    testError: "Error al enviar mensaje de prueba.",
    manualCodeLabel: "Código de emparejamiento manual:",
    scanInstructions: "Abre WhatsApp en tu teléfono móvil > Dispositivos vinculados > Vincular un dispositivo y apunta la cámara a este código.",
    updateQrBtn: "Actualizar Código QR",
    linkTitle: "Vincular WhatsApp del Estudio",
    linkDesc: "Conecta el número de WhatsApp oficial del estudio para automatizar confirmaciones de citas, alertas de montaje finalizado y chatear con clientes.",
    generatingQr: "Generando código QR...",
    generateQrBtn: "Generar QR de Vinculación",
    autoProjectsTitle: "Automatización de Proyectos",
    autoProjectsBadge: "Notificaciones Transaccionales Activas",
    autoProjectsDesc: "Confirmación al crear sesión y aviso de entrega de fotos/vídeos listo.",
    biTitle: "Recepción Bidireccional",
    biBadge: "Webhook Supabase Realtime",
    biDesc: "Los mensajes que los clientes envían se sincronizan automáticamente.",
    testCardTitle: "Enviar Mensaje de Prueba",
    phoneLabel: "Teléfono con código país",
    phonePlaceholder: "Ej: 212612345678",
    textLabel: "Texto del mensaje",
    defaultTestText: "¡Hola desde Lamha Studios Atelier! Tu integración de WhatsApp está funcionando correctamente.",
    sendBtn: "Enviar",
    sendingBtn: "Enviando...",
    autoWebhookBtn: "Autoconfigurar Webhook",
    configuringWebhook: "Configurando...",
    disconnectBtn: "Desvincular WhatsApp",
  },
  en: {
    cardTitle: "Atelier WhatsApp Gateway",
    instanceLabel: "Instance:",
    checking: "Checking...",
    connected: "Connected & Operational",
    waitingConnection: "Waiting for Link",
    disconnected: "Disconnected",
    refreshTooltip: "Refresh status",
    scanPrompt: "Scan the QR code using WhatsApp under Linked Devices.",
    alreadyConnected: "WhatsApp is already connected and operational.",
    generateQrError: "Could not generate QR code. Verify the API Key.",
    connectionError: "Error connecting to Evolution API.",
    logoutSuccess: "WhatsApp session successfully disconnected.",
    logoutError: "Error while disconnecting session.",
    logoutConfirm: "Are you sure you want to disconnect the official studio WhatsApp number?",
    webhookSuccess: (url: string) => `Webhook successfully configured in Evolution API (${url}).`,
    webhookError: "Error configuring webhook.",
    enterPhoneError: "Please enter a phone number for the test.",
    testSuccess: (phone: string, id: string) => `Test message sent successfully to ${phone} (ID: ${id}).`,
    testError: "Error sending test message.",
    manualCodeLabel: "Manual pairing code:",
    scanInstructions: "Open WhatsApp on your phone > Linked devices > Link a device and point your camera at this code.",
    updateQrBtn: "Refresh QR Code",
    linkTitle: "Link Studio WhatsApp",
    linkDesc: "Connect the studio's official WhatsApp number to automate appointment confirmations, delivery notices, and direct client chat.",
    generatingQr: "Generating QR code...",
    generateQrBtn: "Generate Pairing QR",
    autoProjectsTitle: "Project Automation",
    autoProjectsBadge: "Active Transactional Notifications",
    autoProjectsDesc: "Automatic booking confirmation and ready-to-deliver photo/video alerts.",
    biTitle: "Two-Way Reception",
    biBadge: "Webhook Supabase Realtime",
    biDesc: "Messages sent by clients sync automatically into your Atelier inbox.",
    testCardTitle: "Send Test Message",
    phoneLabel: "Phone with country code",
    phonePlaceholder: "e.g., 212612345678",
    textLabel: "Message text",
    defaultTestText: "Hello from Lamha Studios Atelier! Your WhatsApp integration is working properly.",
    sendBtn: "Send",
    sendingBtn: "Sending...",
    autoWebhookBtn: "Auto-configure Webhook",
    configuringWebhook: "Configuring...",
    disconnectBtn: "Disconnect WhatsApp",
  },
  ar: {
    cardTitle: "بوابة واتساب للأتيليه",
    instanceLabel: "النسخة:",
    checking: "جاري التحقق...",
    connected: "متصل ويعمل",
    waitingConnection: "في انتظار الربط",
    disconnected: "غير متصل",
    refreshTooltip: "تحديث الحالة",
    scanPrompt: "امسح رمز QR ضوئياً بواسطة واتساب من الأجهزة المرتبطة.",
    alreadyConnected: "واتساب متصل بالفعل ويعمل بشكل مثالي.",
    generateQrError: "تعذر توليد رمز QR. يرجى التحقق من مفتاح API.",
    connectionError: "خطأ في الاتصال بخادم Evolution API.",
    logoutSuccess: "تم إنهاء جلسة واتساب بنجاح.",
    logoutError: "خطأ أثناء تسجيل الخروج.",
    logoutConfirm: "هل أنت متأكد من رغبتك في إلغاء ربط رقم واتساب الحالي للاستوديو؟",
    webhookSuccess: (url: string) => `تم ضبط الويب هوك بنجاح في Evolution API (${url}).`,
    webhookError: "خطأ أثناء إعداد الويب هوك.",
    enterPhoneError: "يرجى كتابة رقم هاتف لإجراء الاختبار.",
    testSuccess: (phone: string, id: string) => `تم إرسال الرسالة التجريبية بنجاح إلى ${phone} (المعرّف: ${id}).`,
    testError: "خطأ أثناء إرسال الرسالة التجريبية.",
    manualCodeLabel: "رمز الربط اليدوي:",
    scanInstructions: "افتح تطبيق واتساب على هاتفك > الأجهزة المرتبطة > ربط جهاز ثم وجّه الكاميرا نحو هذا الرمز.",
    updateQrBtn: "تحديث رمز QR",
    linkTitle: "ربط واتساب الاستوديو",
    linkDesc: "اربط رقم الواتساب الرسمي للاستوديو لأتمتة تأكيدات الحجز، تنبيهات تسليم الصور والمحادثة المباشرة مع العملاء.",
    generatingQr: "جاري توليد رمز QR...",
    generateQrBtn: "توليد رمز QR للربط",
    autoProjectsTitle: "أتمتة المشاريع",
    autoProjectsBadge: "الإشعارات التلقائية نشطة",
    autoProjectsDesc: "تأكيد فوري عند إنشاء الجلسة وإشعار بجاهزية تسليم الصور والفيديوهات.",
    biTitle: "استقبال ثنائي الاتجاه",
    biBadge: "Webhook Supabase Realtime",
    biDesc: "يتم مزامنة الرسائل الواردة من العملاء تلقائياً وبشكل فوري.",
    testCardTitle: "إرسال رسالة تجريبية",
    phoneLabel: "رقم الهاتف مع رمز الدولة",
    phonePlaceholder: "مثال: 212612345678",
    textLabel: "نص الرسالة",
    defaultTestText: "مرحباً من استوديوهات لمحة! تكامل واتساب يعمل بشكل ممتاز.",
    sendBtn: "إرسال",
    sendingBtn: "جاري الإرسال...",
    autoWebhookBtn: "تهيئة الويب هوك تلقائياً",
    configuringWebhook: "جاري التهيئة...",
    disconnectBtn: "إلغاء ربط واتساب",
  },
}

export function WhatsAppGatewayCard() {
  const { language } = useLanguage()
  const strings = GATEWAY_I18N[language as keyof typeof GATEWAY_I18N] || GATEWAY_I18N.fr
  const isRtl = language === "ar"

  const [state, setState] = useState<"open" | "connecting" | "close" | "unknown">("close")
  const [instanceName, setInstanceName] = useState("lam7astudio")
  const [loading, setLoading] = useState(true)
  const [qrBase64, setQrBase64] = useState<string | null>(null)
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [isGeneratingQr, setIsGeneratingQr] = useState(false)
  const [testPhone, setTestPhone] = useState("")
  const [testText, setTestText] = useState(strings.defaultTestText)
  const [isSendingTest, setIsSendingTest] = useState(false)
  const [isConfiguringWebhook, setIsConfiguringWebhook] = useState(false)
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null)

  // Actualizar mensaje de prueba por defecto si cambia el idioma y no fue editado
  useEffect(() => {
    setTestText(strings.defaultTestText)
  }, [language, strings.defaultTestText])

  // Consultar estado de la instancia
  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/status", { cache: "no-store" })
      const data = await res.json()
      if (data?.state) {
        setState(data.state)
        setInstanceName(data.instanceName || "lam7astudio")
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
        setFeedback({ type: "info", text: strings.scanPrompt })
      } else if (data?.state === "open") {
        setState("open")
        setQrBase64(null)
        setFeedback({ type: "success", text: strings.alreadyConnected })
      } else {
        setFeedback({ type: "error", text: data?.error || strings.generateQrError })
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || strings.connectionError })
    } finally {
      setIsGeneratingQr(false)
    }
  }

  // Cerrar sesión / Desvincular
  const handleLogout = async () => {
    if (!confirm(strings.logoutConfirm)) return
    setLoading(true)
    setFeedback(null)
    try {
      const res = await fetch("/api/whatsapp/status", { method: "DELETE" })
      const data = await res.json()
      if (data?.success) {
        setState("close")
        setQrBase64(null)
        setFeedback({ type: "info", text: strings.logoutSuccess })
      } else {
        setFeedback({ type: "error", text: data?.error || strings.logoutError })
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
          text: strings.webhookSuccess(data.configuredUrl) 
        })
      } else {
        setFeedback({ type: "error", text: data?.error || strings.webhookError })
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
    if (!testPhone.trim()) {
      setFeedback({ type: "error", text: strings.enterPhoneError })
      return
    }

    setIsSendingTest(true)
    setFeedback(null)
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: testPhone.trim(), text: testText.trim() })
      })
      const data = await res.json()
      if (res.ok && data?.success) {
        setFeedback({ type: "success", text: strings.testSuccess(testPhone, data.messageId || "OK") })
      } else {
        setFeedback({ type: "error", text: data?.error || strings.testError })
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message })
    } finally {
      setIsSendingTest(false)
    }
  }

  const isConnected = state === "open"

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="rounded-2xl border border-[#26211c] bg-[#141210] p-6 shadow-xl space-y-6">
      {/* Cabecera de la Tarjeta */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#26211c]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-[#f5f2eb] font-serif">
                {strings.cardTitle}
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1e1b17] border border-[#383025] text-[#c69f68] font-mono">
                Evolution API v2
              </span>
            </div>
            <p className="text-xs text-[#8c7a6b]">
              {strings.instanceLabel} <strong className="text-[#f5f2eb]">{instanceName}</strong>
            </p>
          </div>
        </div>

        {/* Badge de Estado */}
        <div className="flex items-center gap-2">
          {loading ? (
            <span className="flex items-center gap-1.5 text-xs text-[#8c7a6b]">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#c69f68]" />
              {strings.checking}
            </span>
          ) : isConnected ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{strings.connected}</span>
            </div>
          ) : state === "connecting" ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>{strings.waitingConnection}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              <span>{strings.disconnected}</span>
            </div>
          )}

          <button
            type="button"
            onClick={checkStatus}
            disabled={loading}
            className="p-1.5 rounded-lg border border-[#2a241d] bg-[#1a1714] hover:bg-[#24201b] text-[#c69f68] transition-colors"
            title={strings.refreshTooltip}
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
                  alt="WhatsApp QR Code" 
                  className="w-56 h-56 object-contain"
                />
              </div>

              {pairingCode && (
                <div className="text-xs text-[#a89f91] space-y-1">
                  <span>{strings.manualCodeLabel}</span>
                  <div className="px-3 py-1 rounded-lg bg-[#181613] border border-[#3d342a] text-[#c69f68] font-mono text-sm tracking-wider font-bold">
                    {pairingCode}
                  </div>
                </div>
              )}

              <p className="text-xs text-[#a89f91] max-w-sm leading-relaxed">
                {strings.scanInstructions}
              </p>

              <button
                type="button"
                onClick={handleGenerateQR}
                disabled={isGeneratingQr}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#1e1b17] hover:bg-[#29241e] border border-[#3d342a] text-[#c69f68] text-xs transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingQr ? "animate-spin" : ""}`} />
                <span>{strings.updateQrBtn}</span>
              </button>
            </div>
          ) : (
            <div className="py-6 flex flex-col items-center justify-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[#1e1b17] border border-[#3d342a] flex items-center justify-center text-[#c69f68]">
                <QrCode className="w-7 h-7" />
              </div>
              <div className="space-y-1 max-w-md">
                <h3 className="text-sm font-semibold text-[#f5f2eb]">
                  {strings.linkTitle}
                </h3>
                <p className="text-xs text-[#8c7a6b] leading-relaxed">
                  {strings.linkDesc}
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
                    <span>{strings.generatingQr}</span>
                  </>
                ) : (
                  <>
                    <QrCode className="w-4 h-4" />
                    <span>{strings.generateQrBtn}</span>
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
                {strings.autoProjectsTitle}
              </span>
              <div className="flex items-center gap-2 text-emerald-400 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                <span>{strings.autoProjectsBadge}</span>
              </div>
              <p className="text-[11px] text-[#8c7a6b]">
                {strings.autoProjectsDesc}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#181613] border border-[#26211c] space-y-1">
              <span className="text-[#70665a] uppercase tracking-wider text-[10px] block font-semibold">
                {strings.biTitle}
              </span>
              <div className="flex items-center gap-2 text-emerald-400 font-medium">
                <Radio className="w-4 h-4" />
                <span>{strings.biBadge}</span>
              </div>
              <p className="text-[11px] text-[#8c7a6b]">
                {strings.biDesc}
              </p>
            </div>
          </div>

          {/* Formulario de Mensaje de Prueba */}
          <form onSubmit={handleSendTest} className="p-4 rounded-xl bg-[#181613] border border-[#26211c] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#f5f2eb] flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-[#c69f68]" />
                {strings.testCardTitle}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-1">
                <label className="text-[10px] text-[#70665a] uppercase tracking-wider block mb-1">
                  {strings.phoneLabel}
                </label>
                <input
                  type="text"
                  placeholder={strings.phonePlaceholder}
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#100f0d] border border-[#332c23] text-xs text-[#f5f2eb] placeholder-[#594f43] font-mono focus:outline-none focus:border-[#c69f68]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] text-[#70665a] uppercase tracking-wider block mb-1">
                  {strings.textLabel}
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
                    <span>{strings.sendBtn}</span>
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
          title="Evolution API Webhook"
        >
          {isConfiguringWebhook ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Webhook className="w-3.5 h-3.5" />}
          <span>{isConfiguringWebhook ? strings.configuringWebhook : strings.autoWebhookBtn}</span>
        </button>

        {isConnected && (
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-950/20 text-xs font-medium transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{strings.disconnectBtn}</span>
          </button>
        )}
      </div>
    </div>
  )
}
