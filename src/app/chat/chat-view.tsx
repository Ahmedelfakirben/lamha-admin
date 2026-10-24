"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { useLanguage } from "@/context/language-context"
import { normalizePhone } from "@/lib/whatsapp"
import type { WhatsAppMessage } from "@/types/database"
import {
  MessageSquare,
  Search,
  Send,
  Check,
  CheckCheck,
  Clock,
  User,
  Users,
  Sparkles,
  ExternalLink,
  Plus,
  RefreshCw,
  Phone,
  Mail,
  FolderOpen,
  X,
  AlertCircle,
  Loader2,
  Calendar,
  ShieldCheck,
  UserCheck,
  UserX,
} from "lucide-react"

interface ClientContact {
  id: string
  first_name: string
  last_name: string
  email?: string | null
  phone?: string | null
}

interface SessionInfo {
  id: string
  client_id?: string | null
  client_name?: string | null
  client_phone?: string | null
  category?: string | null
  status?: string | null
  event_date?: string | null
}

interface ChatConversation {
  phone: string
  normalizedPhone: string
  client?: ClientContact | null
  sessions: SessionInfo[]
  messages: WhatsAppMessage[]
  latestMessage: WhatsAppMessage
  unreadCount: number
}

const CHAT_I18N = {
  es: {
    title: "Messagerie WhatsApp",
    subtitle: "Centro unificado de conversaciones en tiempo real con clientes y prospectos",
    searchPlaceholder: "Buscar por nombre, teléfono o mensaje...",
    all: "Todos",
    clientsOnly: "Clientes",
    prospectsOnly: "Prospectos",
    newChat: "Nueva Conversación",
    clientBadge: "Cliente",
    prospectBadge: "Prospecto",
    noConversations: "No hay conversaciones aún.",
    noSearchResults: "No se encontraron conversaciones.",
    emptySelectionTitle: "Selecciona una conversación",
    emptySelectionSubtitle: "Elige un chat de la lista de la izquierda o inicia una nueva conversación con cualquier cliente o número.",
    typePlaceholder: "Escribe un mensaje de WhatsApp... (Enter para enviar)",
    send: "Enviar",
    sending: "Enviando...",
    viewClientProfile: "Ver Perfil",
    viewProject: "Ver Proyecto",
    activeSession: "Proyecto asociado",
    allSessions: "Proyectos del cliente",
    quickTemplates: "Plantillas Rápidas",
    newChatModalTitle: "Iniciar Nueva Conversación",
    selectExistingClient: "O selecciona un cliente existente:",
    enterPhoneNumber: "Número de teléfono (con código de país o 06/07):",
    phonePlaceholder: "Ej: 0612345678 o 212612345678",
    firstMessagePrompt: "Mensaje inicial:",
    cancel: "Cancelar",
    startChat: "Iniciar Chat",
    today: "Hoy",
    yesterday: "Ayer",
    templates: [
      {
        title: "Confirmación de Sesión",
        text: "¡Hola! Te confirmamos que tu sesión en Lamha Studios está agendada. ¿Tienes alguna consulta antes del día del shooting?",
      },
      {
        title: "Acceso Espace Privé",
        text: "¡Hola! Tu suite privada en Lamha Studios ya está disponible para que puedas seleccionar tus fotos favoritas.",
      },
      {
        title: "Fotos Listas",
        text: "¡Buenas noticias! Tus fotografías han terminado el proceso de revelado y edición de autor. Ya puedes descargarlas en tu espacio.",
      },
      {
        title: "Recordatorio Cita",
        text: "Recordatorio de Lamha Studios: Te esperamos mañana en nuestro estudio a la hora programada. ¡Hasta pronto!",
      },
    ],
  },
  fr: {
    title: "Messagerie WhatsApp",
    subtitle: "Centre unifié de conversations en direct avec vos clients et prospects",
    searchPlaceholder: "Rechercher par nom, téléphone ou message...",
    all: "Tous",
    clientsOnly: "Clients",
    prospectsOnly: "Prospects",
    newChat: "Nouvelle Conversation",
    clientBadge: "Client",
    prospectBadge: "Prospect",
    noConversations: "Aucune conversation enregistrée.",
    noSearchResults: "Aucun résultat trouvé.",
    emptySelectionTitle: "Sélectionnez une conversation",
    emptySelectionSubtitle: "Choisissez un échange dans la liste de gauche ou démarrez une nouvelle discussion avec un client ou un numéro.",
    typePlaceholder: "Écrivez un message WhatsApp... (Entrée pour envoyer)",
    send: "Envoyer",
    sending: "Envoi...",
    viewClientProfile: "Voir Fiche Client",
    viewProject: "Voir Projet",
    activeSession: "Projet associé",
    allSessions: "Projets du client",
    quickTemplates: "Réponses Rapides",
    newChatModalTitle: "Démarrer une Nouvelle Discussion",
    selectExistingClient: "Ou sélectionnez un client enregistré :",
    enterPhoneNumber: "Numéro de téléphone (avec indicatif ou 06/07) :",
    phonePlaceholder: "Ex : 0612345678 ou 212612345678",
    firstMessagePrompt: "Premier message :",
    cancel: "Annuler",
    startChat: "Démarrer le Chat",
    today: "Aujourd'hui",
    yesterday: "Hier",
    templates: [
      {
        title: "Confirmation Séance",
        text: "Bonjour ! Nous vous confirmons que votre séance chez Lamha Studios est bien réservée. Avez-vous des questions avant le jour du shooting ?",
      },
      {
        title: "Accès Espace Privé",
        text: "Bonjour ! Votre suite privée Lamha Studios est désormais prête pour sélectionner vos photographies d'art préférées.",
      },
      {
        title: "Photos Prêtes",
        text: "Excellente nouvelle ! Vos photographies sont entièrement retouchées et prêtes au téléchargement en haute définition sur votre espace.",
      },
      {
        title: "Rappel Rendez-vous",
        text: "Rappel Lamha Studios : Nous avons le plaisir de vous accueillir demain à l'atelier à l'heure convenue. À très vite !",
      },
    ],
  },
  en: {
    title: "WhatsApp Messaging",
    subtitle: "Unified real-time conversation center with your clients and prospects",
    searchPlaceholder: "Search by name, phone, or message text...",
    all: "All",
    clientsOnly: "Clients",
    prospectsOnly: "Prospects",
    newChat: "New Conversation",
    clientBadge: "Client",
    prospectBadge: "Prospect",
    noConversations: "No conversations recorded yet.",
    noSearchResults: "No conversations match your search.",
    emptySelectionTitle: "Select a conversation",
    emptySelectionSubtitle: "Choose a chat from the left panel or start a brand new discussion with any client or phone number.",
    typePlaceholder: "Type a WhatsApp message... (Press Enter to send)",
    send: "Send",
    sending: "Sending...",
    viewClientProfile: "View Profile",
    viewProject: "View Project",
    activeSession: "Linked project",
    allSessions: "Client projects",
    quickTemplates: "Quick Replies",
    newChatModalTitle: "Start a New Discussion",
    selectExistingClient: "Or choose a registered client:",
    enterPhoneNumber: "Phone number (with country code or 06/07):",
    phonePlaceholder: "e.g., 0612345678 or 212612345678",
    firstMessagePrompt: "Initial message:",
    cancel: "Cancel",
    startChat: "Start Chat",
    today: "Today",
    yesterday: "Yesterday",
    templates: [
      {
        title: "Session Confirmation",
        text: "Hello! We are confirming your photo session booking at Lamha Studios. Do you have any questions before shoot day?",
      },
      {
        title: "Private Suite Access",
        text: "Hello! Your private suite at Lamha Studios is now ready for you to select your favorite fine art photographs.",
      },
      {
        title: "Photos Ready",
        text: "Great news! Your photographs have completed fine-art editing and are ready for high-resolution download in your portal.",
      },
      {
        title: "Appointment Reminder",
        text: "Lamha Studios Reminder: We look forward to welcoming you tomorrow at our atelier at the scheduled time. See you soon!",
      },
    ],
  },
  ar: {
    title: "محادثات واتساب",
    subtitle: "المركز الموحد للمحادثات الحية مع العملاء والزبائن المحتملين في الوقت الفعلي",
    searchPlaceholder: "بحث بالاسم، رقم الهاتف أو محتوى الرسالة...",
    all: "الكل",
    clientsOnly: "العملاء",
    prospectsOnly: "غير مسجلين",
    newChat: "محادثة جديدة",
    clientBadge: "عميل",
    prospectBadge: "جهة اتصال",
    noConversations: "لا توجد محادثات مسجلة بعد.",
    noSearchResults: "لم يتم العثور على أي نتائج.",
    emptySelectionTitle: "اختر محادثة",
    emptySelectionSubtitle: "حدد محادثة من القائمة الجانبية أو ابدأ محادثة جديدة مع أي عميل أو رقم هاتف.",
    typePlaceholder: "اكتب رسالة واتساب... (اضغط Enter للإرسال)",
    send: "إرسال",
    sending: "جاري الإرسال...",
    viewClientProfile: "ملف العميل",
    viewProject: "عرض المشروع",
    activeSession: "المشروع المرتبط",
    allSessions: "مشاريع العميل",
    quickTemplates: "ردود سريعة",
    newChatModalTitle: "بدء محادثة جديدة",
    selectExistingClient: "أو اختر عميلاً مسجلاً:",
    enterPhoneNumber: "رقم الهاتف (مع الرمز الدولي أو 06/07):",
    phonePlaceholder: "مثال: 0612345678 أو 212612345678",
    firstMessagePrompt: "الرسالة الأولى:",
    cancel: "إلغاء",
    startChat: "بدء المحادثة",
    today: "اليوم",
    yesterday: "أمس",
    templates: [
      {
        title: "تأكيد موعد الجلسة",
        text: "مرحباً بكم! نؤكد لكم حجز جلستكم في استوديوهات لمحة. هل لديكم أي استفسار قبل يوم التصوير؟",
      },
      {
        title: "رابط البوابة الخاصة",
        text: "مرحباً بكم! جناحكم الخاص في استوديوهات لمحة جاهز الآن لاختيار صوركم الفنية المفضلة.",
      },
      {
        title: "الصور جاهزة للتحميل",
        text: "بشرى سارة! تم الانتهاء من معالجة وتعديل صوركم الفنية وهي جاهزة للتحميل بجودة عالية عبر بوابتكم الخاصة.",
      },
      {
        title: "تذكير بالموعد",
        text: "تذكير من استوديوهات لمحة: يسعدنا استقبالكم غداً في استوديوهاتنا بالموعد المحدد. نراكم قريباً!",
      },
    ],
  },
}

export function ChatView() {
  const { language, dir } = useLanguage()
  const searchParams = useSearchParams()
  const initialPhoneParam = searchParams.get("phone")
  const isRTL = language === "ar"
  const strings = CHAT_I18N[language as keyof typeof CHAT_I18N] || CHAT_I18N.fr

  const [messages, setMessages] = useState<WhatsAppMessage[]>([])
  const [clients, setClients] = useState<ClientContact[]>([])
  const [sessions, setSessions] = useState<SessionInfo[]>([])
  const [selectedPhone, setSelectedPhone] = useState<string | null>(
    initialPhoneParam ? normalizePhone(initialPhoneParam) : null
  )
  const [searchQuery, setSearchQuery] = useState("")
  const [filterTab, setFilterTab] = useState<"all" | "clients" | "prospects">("all")

  // Input message state
  const [inputText, setInputText] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  // New Chat Modal state
  const [isNewChatOpen, setIsNewChatOpen] = useState(false)
  const [newChatPhone, setNewChatPhone] = useState("")
  const [newChatInitialMsg, setNewChatInitialMsg] = useState("")
  const [newChatSelectedClientId, setNewChatSelectedClientId] = useState("")

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // ── 1. CARGA INICIAL DE DATOS ──
  const fetchAllData = async () => {
    const supabase = createClient()

    // Cargar mensajes
    const { data: msgData } = await supabase
      .from("whatsapp_messages")
      .select("*")
      .order("created_at", { ascending: true })

    if (msgData) {
      setMessages(msgData)
    }

    // Cargar clientes
    const { data: clientData } = await supabase
      .from("clients")
      .select("id, first_name, last_name, email, phone")

    if (clientData) {
      setClients(clientData)
    }

    // Cargar sesiones
    const { data: sessionData } = await supabase
      .from("sessions")
      .select("id, client_id, client_name, client_phone, category, status, event_date")
      .order("created_at", { ascending: false })

    if (sessionData) {
      setSessions(sessionData)
    }
  }

  useEffect(() => {
    fetchAllData()

    // ── 2. SUSCRIPCIÓN EN TIEMPO REAL CON SUPABASE REALTIME ──
    const supabase = createClient()
    const channel = supabase
      .channel("whatsapp_global_chat_channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_messages" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newMsg = payload.new as WhatsAppMessage
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev
              return [...prev, newMsg]
            })
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as WhatsAppMessage
            setMessages((prev) =>
              prev.map((m) => (m.id === updated.id ? updated : m))
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // ── 3. EMPAREJAR TELÉFONOS CON CLIENTES ──
  const matchClientByPhone = (phone: string): ClientContact | null => {
    if (!phone) return null
    const clean = normalizePhone(phone)
    const last9 = clean.slice(-9)

    for (const c of clients) {
      if (!c.phone) continue
      const cClean = normalizePhone(c.phone)
      if (cClean === clean || (last9 && cClean.endsWith(last9))) {
        return c
      }
    }
    return null
  }

  // ── 4. AGRUPAR MENSAJES POR CONVERSACIÓN ──
  const conversations: ChatConversation[] = useMemo(() => {
    const map = new Map<string, WhatsAppMessage[]>()

    for (const msg of messages) {
      const norm = normalizePhone(msg.phone || "")
      if (!norm) continue

      if (!map.has(norm)) {
        map.set(norm, [])
      }
      map.get(norm)!.push(msg)
    }

    const convList: ChatConversation[] = []

    map.forEach((msgs, normPhone) => {
      const client = matchClientByPhone(normPhone)

      // Emparejar sesiones
      const matchedSessions = sessions.filter((s) => {
        if (client && s.client_id === client.id) return true
        if (s.client_phone && normalizePhone(s.client_phone) === normPhone) return true
        return false
      })

      const latestMessage = msgs[msgs.length - 1]

      // Contar no leídos (mensajes de cliente que no han sido leídos)
      const unreadCount = msgs.filter((m) => !m.from_me && m.status !== "read").length

      convList.push({
        phone: msgs[0]?.phone || normPhone,
        normalizedPhone: normPhone,
        client,
        sessions: matchedSessions,
        messages: msgs,
        latestMessage,
        unreadCount,
      })
    })

    // Ordenar de más reciente a más antiguo
    return convList.sort(
      (a, b) =>
        new Date(b.latestMessage.created_at).getTime() -
        new Date(a.latestMessage.created_at).getTime()
    )
  }, [messages, clients, sessions])

  // Seleccionar la primera conversación si no hay ninguna seleccionada
  useEffect(() => {
    if (!selectedPhone && conversations.length > 0) {
      setSelectedPhone(conversations[0].normalizedPhone)
    }
  }, [conversations, selectedPhone])

  // Conversación activa
  const activeConversation = useMemo(() => {
    if (!selectedPhone) return null
    return conversations.find((c) => c.normalizedPhone === selectedPhone) || null
  }, [conversations, selectedPhone])

  // Scroll al final al recibir mensajes o cambiar de chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [activeConversation?.messages?.length, selectedPhone])

  // Filtrado de conversaciones
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      // Filtro de pestañas
      if (filterTab === "clients" && !c.client) return false
      if (filterTab === "prospects" && c.client) return false

      // Búsqueda
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()

      const clientName = c.client
        ? `${c.client.first_name} ${c.client.last_name}`.toLowerCase()
        : ""
      const phone = c.phone.toLowerCase()
      const hasMatchingMsg = c.messages.some((m) =>
        m.content.toLowerCase().includes(q)
      )

      return clientName.includes(q) || phone.includes(q) || hasMatchingMsg
    })
  }, [conversations, filterTab, searchQuery])

  // ── 5. ENVIAR MENSAJE EN CHAT ACTIVO ──
  const handleSendMessage = async () => {
    if (!activeConversation || !inputText.trim() || isSending) return

    const phoneToSend = activeConversation.phone
    const textToSend = inputText.trim()

    setIsSending(true)
    setSendError(null)

    try {
      const activeSession = activeConversation.sessions[0]
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phoneToSend,
          text: textToSend,
          clientId: activeConversation.client?.id || null,
          sessionId: activeSession?.id || null,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setInputText("")
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto"
        }
      } else {
        setSendError(data.error || "Erreur lors de l'envoi WhatsApp")
      }
    } catch (err: any) {
      setSendError(err.message || "Erreur réseau")
    } finally {
      setIsSending(false)
    }
  }

  // ── 6. INICIAR NUEVO CHAT DESDE EL MODAL ──
  const handleStartNewChat = async () => {
    let targetPhone = newChatPhone.trim()

    if (newChatSelectedClientId) {
      const cl = clients.find((c) => c.id === newChatSelectedClientId)
      if (cl?.phone) {
        targetPhone = cl.phone
      }
    }

    if (!targetPhone) {
      alert("Veuillez saisir un numéro de téléphone valide")
      return
    }

    const norm = normalizePhone(targetPhone)
    setSelectedPhone(norm)
    setIsNewChatOpen(false)

    // Si además escribió un primer mensaje, enviarlo
    if (newChatInitialMsg.trim()) {
      setIsSending(true)
      try {
        await fetch("/api/whatsapp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: targetPhone,
            text: newChatInitialMsg.trim(),
            clientId: newChatSelectedClientId || null,
          }),
        })
        setNewChatInitialMsg("")
        setNewChatPhone("")
        setNewChatSelectedClientId("")
      } catch (e) {
        console.error(e)
      } finally {
        setIsSending(false)
      }
    }
  }

  // Formato de hora relativo
  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } catch {
      return ""
    }
  }

  return (
    <div className={`space-y-4 ${isRTL ? "text-right" : "text-left"}`} dir={dir}>
      {/* ── CABECERA DE LA PÁGINA ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#26211c]">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#e5c38e] flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-[#25D366]/15 border border-[#25D366]/30 text-[#25D366]">
              <MessageSquare className="w-5 h-5" />
            </span>
            <span>{strings.title}</span>
          </h1>
          <p className="text-xs text-[#8c7a6b] mt-1">{strings.subtitle}</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsNewChatOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#c69f68] to-[#9b7844] hover:from-[#d1ab75] hover:to-[#aa864e] text-[#0b0a09] text-xs font-bold shadow-md shadow-[#c69f68]/20 flex items-center gap-2 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>{strings.newChat}</span>
          </button>
          <button
            onClick={fetchAllData}
            title="Rafraîchir"
            className="p-2 rounded-xl bg-[#141210] hover:bg-[#1f1b17] border border-[#26211c] text-[#8c7a6b] hover:text-[#c69f68] transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── CONTENEDOR PRINCIPAL: VISTA DIVIDIDA (TWO-PANE SPLIT) ── */}
      <div className="h-[calc(100vh-190px)] min-h-[580px] rounded-2xl border border-[#26211c] bg-[#0f0e0c] shadow-2xl flex overflow-hidden">
        {/* ── PANEL IZQUIERDO: LISTA DE CONVERSACIONES ── */}
        <div className="w-80 md:w-96 flex-shrink-0 border-r border-[#26211c] bg-[#141210] flex flex-col">
          {/* Barra de búsqueda */}
          <div className="p-3 border-b border-[#26211c] space-y-2.5">
            <div className="relative">
              <Search
                className={`w-3.5 h-3.5 absolute top-1/2 -translate-y-1/2 text-[#70665a] ${
                  isRTL ? "right-3" : "left-3"
                }`}
              />
              <input
                type="text"
                placeholder={strings.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full py-2 bg-[#0b0a09] border border-[#26211c] rounded-xl text-xs text-[#ded8d0] placeholder:text-[#5e5449] focus:border-[#c69f68] focus:outline-none transition-colors ${
                  isRTL ? "pr-8 pl-3" : "pl-8 pr-3"
                }`}
              />
            </div>

            {/* Pestañas de Filtro: Todos / Clientes / Prospectos */}
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#0b0a09] border border-[#26211c]">
              <button
                onClick={() => setFilterTab("all")}
                className={`flex-1 py-1 text-[11px] font-medium rounded-md transition-all ${
                  filterTab === "all"
                    ? "bg-[#25201a] text-[#c69f68] shadow-sm font-semibold"
                    : "text-[#70665a] hover:text-[#c69f68]"
                }`}
              >
                {strings.all} ({conversations.length})
              </button>
              <button
                onClick={() => setFilterTab("clients")}
                className={`flex-1 py-1 text-[11px] font-medium rounded-md transition-all flex items-center justify-center gap-1 ${
                  filterTab === "clients"
                    ? "bg-[#25201a] text-[#c69f68] shadow-sm font-semibold"
                    : "text-[#70665a] hover:text-[#c69f68]"
                }`}
              >
                <UserCheck className="w-3 h-3 text-[#c69f68]" />
                <span>{strings.clientsOnly}</span>
              </button>
              <button
                onClick={() => setFilterTab("prospects")}
                className={`flex-1 py-1 text-[11px] font-medium rounded-md transition-all flex items-center justify-center gap-1 ${
                  filterTab === "prospects"
                    ? "bg-[#25201a] text-[#c69f68] shadow-sm font-semibold"
                    : "text-[#70665a] hover:text-[#c69f68]"
                }`}
              >
                <UserX className="w-3 h-3 text-[#8c7a6b]" />
                <span>{strings.prospectsOnly}</span>
              </button>
            </div>
          </div>

          {/* Lista scrolleable de chats */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#1e1b17]">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#70665a] space-y-2">
                <MessageSquare className="w-8 h-8 mx-auto opacity-30 text-[#c69f68]" />
                <p>{searchQuery ? strings.noSearchResults : strings.noConversations}</p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = selectedPhone === conv.normalizedPhone
                const clientName = conv.client
                  ? `${conv.client.first_name} ${conv.client.last_name}`
                  : conv.phone

                const lastMsg = conv.latestMessage

                return (
                  <button
                    key={conv.normalizedPhone}
                    onClick={() => setSelectedPhone(conv.normalizedPhone)}
                    className={`w-full p-3.5 text-left flex items-start gap-3 transition-colors relative ${
                      isSelected
                        ? "bg-[#1f1b17] border-l-2 border-[#c69f68]"
                        : "hover:bg-[#181512]"
                    }`}
                  >
                    {/* Avatar con iniciales o icono */}
                    <div className="relative">
                      <div
                        className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-xs uppercase shadow-sm ${
                          conv.client
                            ? "bg-gradient-to-br from-[#c69f68]/30 to-[#9b7844]/20 border border-[#c69f68]/40 text-[#f0d8b4]"
                            : "bg-[#201c18] border border-[#382d20] text-[#8c7a6b]"
                        }`}
                      >
                        {conv.client ? (
                          `${conv.client.first_name?.[0] || ""}${conv.client.last_name?.[0] || ""}` || "CL"
                        ) : (
                          <Phone className="w-4 h-4" />
                        )}
                      </div>
                      {conv.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#25D366] text-[#0b0a09] font-bold text-[9px] flex items-center justify-center shadow-md">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>

                    {/* Info de contacto y último mensaje */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span
                          className={`text-xs font-semibold truncate ${
                            isSelected ? "text-[#e5c38e]" : "text-[#ded8d0]"
                          }`}
                        >
                          {clientName}
                        </span>
                        <span className="text-[10px] text-[#70665a] shrink-0 font-mono">
                          {formatTime(lastMsg.created_at)}
                        </span>
                      </div>

                      {/* Badges de Cliente vs Prospecto */}
                      <div className="flex items-center gap-1.5 mb-1">
                        {conv.client ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[#c69f68]/15 border border-[#c69f68]/30 text-[#e5c38e]">
                            <UserCheck className="w-2.5 h-2.5" />
                            <span>{strings.clientBadge}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-[#221c17] text-[#8c7a6b] border border-[#2b251f]">
                            <User className="w-2.5 h-2.5" />
                            <span>{strings.prospectBadge}</span>
                          </span>
                        )}

                        {conv.sessions.length > 0 && (
                          <span className="text-[9px] text-[#70665a] font-mono">
                            • {conv.sessions.length} proj.
                          </span>
                        )}
                      </div>

                      {/* Snippet del último mensaje */}
                      <p className="text-[11px] text-[#8c7a6b] truncate flex items-center gap-1">
                        {lastMsg.from_me && (
                          <span className="shrink-0 text-[#c69f68]">
                            {lastMsg.status === "read" ? (
                              <CheckCheck className="w-3 h-3 text-[#55ef88]" />
                            ) : lastMsg.status === "delivered" ? (
                              <CheckCheck className="w-3 h-3 text-[#c69f68]" />
                            ) : (
                              <Check className="w-3 h-3 text-[#8c7a6b]" />
                            )}
                          </span>
                        )}
                        <span className="truncate">{lastMsg.content}</span>
                      </p>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* ── PANEL DERECHO: CONVERSACIÓN ACTIVA ── */}
        <div className="flex-1 flex flex-col bg-[#0b0a09]">
          {activeConversation ? (
            <>
              {/* Cabecera del chat activo */}
              <div className="p-3.5 px-5 border-b border-[#26211c] bg-[#141210] flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs uppercase shadow-sm shrink-0 ${
                      activeConversation.client
                        ? "bg-gradient-to-br from-[#c69f68]/30 to-[#9b7844]/20 border border-[#c69f68]/40 text-[#f0d8b4]"
                        : "bg-[#201c18] border border-[#382d20] text-[#8c7a6b]"
                    }`}
                  >
                    {activeConversation.client ? (
                      `${activeConversation.client.first_name?.[0] || ""}${activeConversation.client.last_name?.[0] || ""}` || "CL"
                    ) : (
                      <Phone className="w-4 h-4" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-semibold text-[#f0ebe3] truncate">
                        {activeConversation.client
                          ? `${activeConversation.client.first_name} ${activeConversation.client.last_name}`
                          : activeConversation.phone}
                      </h2>
                      {activeConversation.client ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#c69f68]/20 border border-[#c69f68]/40 text-[#e5c38e]">
                          {strings.clientBadge}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#221c17] text-[#8c7a6b] border border-[#2b251f]">
                          {strings.prospectBadge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#70665a] font-mono flex items-center gap-2 mt-0.5">
                      <span>{activeConversation.phone}</span>
                      {activeConversation.client?.email && (
                        <span>• {activeConversation.client.email}</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Acciones directas de contacto */}
                <div className="flex items-center gap-2 shrink-0">
                  {activeConversation.client && (
                    <Link
                      href={`/clients/${activeConversation.client.id}`}
                      className="px-2.5 py-1.5 rounded-lg bg-[#201c18] hover:bg-[#28231e] border border-[#382d20] text-xs text-[#c69f68] flex items-center gap-1.5 transition-colors"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{strings.viewClientProfile}</span>
                    </Link>
                  )}

                  {activeConversation.sessions.length > 0 && (
                    <Link
                      href={`/sessions/${activeConversation.sessions[0].id}`}
                      className="px-2.5 py-1.5 rounded-lg bg-[#201c18] hover:bg-[#28231e] border border-[#382d20] text-xs text-[#ded8d0] flex items-center gap-1.5 transition-colors"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-[#c69f68]" />
                      <span className="hidden sm:inline">{strings.viewProject}</span>
                    </Link>
                  )}
                </div>
              </div>

              {/* Área de mensajes con scroll */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3.5">
                {activeConversation.messages.map((msg) => {
                  const isOutbound = msg.from_me

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 text-xs shadow-md space-y-1 relative group ${
                          isOutbound
                            ? "bg-gradient-to-br from-[#251f18] to-[#1c1813] border border-[#483722] text-[#f2e9dc] rounded-tr-xs"
                            : "bg-[#181614] border border-[#2b251f] text-[#ded8d0] rounded-tl-xs"
                        }`}
                      >
                        {/* Contenido del mensaje con saltos de línea */}
                        <div className="whitespace-pre-wrap leading-relaxed select-text font-sans">
                          {msg.content}
                        </div>

                        {/* Metadatos (Hora y Checks de entrega/lectura) */}
                        <div
                          className={`flex items-center gap-1 text-[10px] pt-0.5 ${
                            isOutbound ? "justify-end text-[#9e8b78]" : "justify-start text-[#70665a]"
                          }`}
                        >
                          <span className="font-mono">{formatTime(msg.created_at)}</span>
                          {isOutbound && (
                            <span className="ml-0.5">
                              {msg.status === "read" ? (
                                <span title="Lu">
                                  <CheckCheck className="w-3.5 h-3.5 text-[#55ef88]" />
                                </span>
                              ) : msg.status === "delivered" ? (
                                <span title="Distribué">
                                  <CheckCheck className="w-3.5 h-3.5 text-[#c69f68]" />
                                </span>
                              ) : msg.status === "failed" ? (
                                <span title="Échec">
                                  <AlertCircle className="w-3 h-3 text-red-400" />
                                </span>
                              ) : msg.status === "sent" ? (
                                <span title="Envoyé">
                                  <Check className="w-3 h-3 text-[#9e8b78]" />
                                </span>
                              ) : (
                                <span title="En attente">
                                  <Clock className="w-3 h-3 text-[#70665a]" />
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Barra inferior: Plantillas Rápidas + Input + Envío */}
              <div className="p-3 border-t border-[#26211c] bg-[#141210] space-y-2">
                {/* Carrusel de Plantillas Rápidas */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  <span className="text-[10px] text-[#70665a] shrink-0 font-medium flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#c69f68]" />
                    <span>{strings.quickTemplates}:</span>
                  </span>
                  {strings.templates.map((tpl, i) => (
                    <button
                      key={i}
                      onClick={() => setInputText(tpl.text)}
                      className="shrink-0 px-2.5 py-1 rounded-full bg-[#1e1b17] hover:bg-[#28231e] border border-[#2b251f] hover:border-[#c69f68]/40 text-[11px] text-[#c69f68] transition-colors"
                    >
                      {tpl.title}
                    </button>
                  ))}
                </div>

                {/* Feedback de error si lo hubiese */}
                {sendError && (
                  <div className="p-2 rounded-lg bg-red-950/30 border border-red-800/40 text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{sendError}</span>
                  </div>
                )}

                {/* Caja de Redacción */}
                <div className="flex items-end gap-2">
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                    placeholder={strings.typePlaceholder}
                    className="flex-1 max-h-32 min-h-[42px] py-2.5 px-3.5 bg-[#0b0a09] border border-[#26211c] rounded-xl text-xs text-[#ded8d0] placeholder:text-[#5e5449] focus:border-[#c69f68] focus:outline-none resize-none transition-colors"
                  />

                  <button
                    disabled={isSending || !inputText.trim()}
                    onClick={handleSendMessage}
                    className="h-[42px] px-4 rounded-xl bg-gradient-to-r from-[#20ba59] to-[#25D366] hover:from-[#25D366] hover:to-[#2ee572] disabled:opacity-40 text-[#0b0a09] text-xs font-bold shadow-md shadow-[#25D366]/20 flex items-center justify-center gap-1.5 transition-all shrink-0"
                  >
                    {isSending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span className="hidden sm:inline">{strings.send}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Estado vacío: Ninguna conversación seleccionada */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-[#141210] border border-[#26211c] flex items-center justify-center text-[#c69f68] shadow-inner">
                <MessageSquare className="w-8 h-8 opacity-60" />
              </div>
              <h3 className="text-base font-serif font-bold text-[#e5c38e]">
                {strings.emptySelectionTitle}
              </h3>
              <p className="text-xs text-[#70665a] max-w-sm">
                {strings.emptySelectionSubtitle}
              </p>
              <button
                onClick={() => setIsNewChatOpen(true)}
                className="mt-2 px-4 py-2 rounded-xl bg-[#c69f68] hover:bg-[#d1ab75] text-[#0b0a09] text-xs font-bold shadow-md transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>{strings.newChat}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL DE NUEVA CONVERSACIÓN ── */}
      {isNewChatOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[#141210] border border-[#382d20] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#26211c]">
              <div className="flex items-center gap-2 text-sm font-serif font-bold text-[#e5c38e]">
                <MessageSquare className="w-4 h-4 text-[#25D366]" />
                <span>{strings.newChatModalTitle}</span>
              </div>
              <button
                onClick={() => setIsNewChatOpen(false)}
                className="text-[#70665a] hover:text-[#ded8d0] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Elegir cliente existente */}
            <div className="space-y-1.5">
              <label className="text-xs text-[#8c7a6b] font-medium block">
                {strings.selectExistingClient}
              </label>
              <select
                value={newChatSelectedClientId}
                onChange={(e) => {
                  const val = e.target.value
                  setNewChatSelectedClientId(val)
                  const cl = clients.find((c) => c.id === val)
                  if (cl?.phone) {
                    setNewChatPhone(cl.phone)
                  }
                }}
                className="w-full py-2 px-3 rounded-xl bg-[#0b0a09] border border-[#26211c] text-xs text-[#ded8d0] focus:border-[#c69f68] focus:outline-none"
              >
                <option value="">-- {strings.selectExistingClient} --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name} {c.phone ? `(${c.phone})` : "(Sans téléphone)"}
                  </option>
                ))}
              </select>
            </div>

            {/* O ingresar número manual */}
            <div className="space-y-1.5">
              <label className="text-xs text-[#8c7a6b] font-medium block">
                {strings.enterPhoneNumber}
              </label>
              <input
                type="text"
                placeholder={strings.phonePlaceholder}
                value={newChatPhone}
                onChange={(e) => setNewChatPhone(e.target.value)}
                className="w-full py-2 px-3 rounded-xl bg-[#0b0a09] border border-[#26211c] text-xs font-mono text-[#e5c38e] focus:border-[#c69f68] focus:outline-none"
              />
            </div>

            {/* Mensaje inicial opcional */}
            <div className="space-y-1.5">
              <label className="text-xs text-[#8c7a6b] font-medium block">
                {strings.firstMessagePrompt}
              </label>
              <textarea
                rows={2}
                value={newChatInitialMsg}
                onChange={(e) => setNewChatInitialMsg(e.target.value)}
                placeholder="Bonjour..."
                className="w-full py-2 px-3 rounded-xl bg-[#0b0a09] border border-[#26211c] text-xs text-[#ded8d0] focus:border-[#c69f68] focus:outline-none resize-none"
              />
            </div>

            {/* Botones de acción */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsNewChatOpen(false)}
                className="px-3.5 py-2 rounded-xl bg-[#201c18] hover:bg-[#28231e] text-xs text-[#8c7a6b] transition-colors"
              >
                {strings.cancel}
              </button>
              <button
                disabled={!newChatPhone.trim() && !newChatSelectedClientId}
                onClick={handleStartNewChat}
                className="px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#20ba59] disabled:opacity-50 text-[#0b0a09] text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{strings.startChat}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
