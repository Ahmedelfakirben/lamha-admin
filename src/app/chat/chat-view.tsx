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
  Image as ImageIcon,
} from "lucide-react"

interface ClientContact {
  id: string
  name: string
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
  remoteJid?: string
  pushName?: string | null
  contactName?: string | null
  profilePicUrl?: string | null
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
    selectExistingClient: "O selecciona un cliente de tus proyectos:",
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
        text: "¡Hola! Te confirmamos que tu sesión en Lam7a Studios está agendada. ¿Tienes alguna consulta antes del día del shooting?",
      },
      {
        title: "Acceso Espace Privé",
        text: "¡Hola! Tu suite privada en Lam7a Studios ya está disponible para que puedas seleccionar tus fotos favoritas.",
      },
      {
        title: "Fotos Listas",
        text: "¡Buenas noticias! Tus fotografías han terminado el proceso de revelado y edición de autor. Ya puedes descargarlas en tu espacio.",
      },
      {
        title: "Recordatorio Cita",
        text: "Recordatorio de Lam7a Studios: Te esperamos mañana en nuestro estudio a la hora programada. ¡Hasta pronto!",
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
    selectExistingClient: "Ou sélectionnez un client de vos projets :",
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
        text: "Bonjour ! Nous vous confirmons que votre séance chez Lam7a Studios est bien réservée. Avez-vous des questions avant le jour du shooting ?",
      },
      {
        title: "Accès Espace Privé",
        text: "Bonjour ! Votre suite privée Lam7a Studios est désormais prête pour sélectionner vos photographies d'art préférées.",
      },
      {
        title: "Photos Prêtes",
        text: "Excellente nouvelle ! Vos photographies sont entièrement retouchées et prêtes au téléchargement en haute définition sur votre espace.",
      },
      {
        title: "Rappel Rendez-vous",
        text: "Rappel Lam7a Studios : Nous avons le plaisir de vous accueillir demain à l'atelier à l'heure convenue. À très vite !",
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
    selectExistingClient: "Or choose a registered client from your projects:",
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
        text: "Hello! We are confirming your photo session booking at Lam7a Studios. Do you have any questions before shoot day?",
      },
      {
        title: "Private Suite Access",
        text: "Hello! Your private suite at Lam7a Studios is now ready for you to select your favorite fine art photographs.",
      },
      {
        title: "Photos Ready",
        text: "Great news! Your photographs have completed fine-art editing and are ready for high-resolution download in your portal.",
      },
      {
        title: "Appointment Reminder",
        text: "Lam7a Studios Reminder: We look forward to welcoming you tomorrow at our atelier at the scheduled time. See you soon!",
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
    selectExistingClient: "أو اختر عميلاً مسجلاً من مشاريعك:",
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
  const [evolutionChats, setEvolutionChats] = useState<any[]>([])
  const [clients, setClients] = useState<ClientContact[]>([])
  const [sessions, setSessions] = useState<SessionInfo[]>([])
  const [selectedPhone, setSelectedPhone] = useState<string | null>(
    initialPhoneParam ? normalizePhone(initialPhoneParam) : null
  )
  const [searchQuery, setSearchQuery] = useState("")
  const [filterTab, setFilterTab] = useState<"all" | "clients" | "prospects">("all")
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

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

    // A. Cargar chats históricos de Evolution API (los 137 chats de WhatsApp)
    try {
      const res = await fetch("/api/whatsapp/chats", { cache: "no-store" })
      const data = await res.json()
      if (data.success && Array.isArray(data.chats)) {
        setEvolutionChats(data.chats)
      }
    } catch (e) {
      console.warn("Evolution API chats non disponibles:", e)
    }

    // B. Cargar mensajes locales de Supabase
    const { data: msgData } = await supabase
      .from("whatsapp_messages")
      .select("*")
      .order("created_at", { ascending: true })

    if (msgData) {
      setMessages(msgData)
    }

    // C. Cargar clientes desde la tabla de sesiones (base de datos real del estudio)
    const { data: sessionData } = await supabase
      .from("sessions")
      .select("id, client_id, client_name, client_phone, client_email, category, status, session_date")
      .order("created_at", { ascending: false })

    if (sessionData) {
      setSessions(sessionData)

      // Extraer clientes únicos agrupando por nombre
      const clientMap = new Map<string, ClientContact>()
      for (const s of sessionData) {
        if (s.client_name && s.client_name.trim()) {
          const key = s.client_name.trim().toLowerCase()
          if (!clientMap.has(key)) {
            clientMap.set(key, {
              id: s.client_id || s.id,
              name: s.client_name.trim(),
              email: s.client_email || null,
              phone: s.client_phone || null,
            })
          } else {
            const existing = clientMap.get(key)!
            if (!existing.phone && s.client_phone) {
              existing.phone = s.client_phone
            }
            if (!existing.email && s.client_email) {
              existing.email = s.client_email
            }
          }
        }
      }

      // También cargar de la tabla 'clients' si tuviera registros
      try {
        const { data: clientTableData } = await supabase
          .from("clients")
          .select("id, name, email, phone")
        if (clientTableData && Array.isArray(clientTableData)) {
          for (const c of clientTableData) {
            if (c.name && c.name.trim()) {
              const key = c.name.trim().toLowerCase()
              if (!clientMap.has(key)) {
                clientMap.set(key, {
                  id: c.id,
                  name: c.name.trim(),
                  email: c.email || null,
                  phone: c.phone || null,
                })
              }
            }
          }
        }
      } catch {}

      setClients(Array.from(clientMap.values()))
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
    if (!clean) return null
    const last9 = clean.slice(-9)
    const last8 = clean.slice(-8)

    for (const c of clients) {
      if (!c.phone) continue
      const cClean = normalizePhone(c.phone)
      if (!cClean) continue
      if (
        cClean === clean ||
        (last9 && cClean.endsWith(last9)) ||
        (clean.length >= 9 && cClean.slice(-9) === last9) ||
        (last8 && cClean.endsWith(last8))
      ) {
        return c
      }
    }
    return null
  }

  // ── 4. AGRUPAR MENSAJES Y CHATS EN CONVERSACIONES ──
  const conversations: ChatConversation[] = useMemo(() => {
    const map = new Map<string, WhatsAppMessage[]>()
    const metaMap = new Map<string, { remoteJid: string; pushName?: string | null; profilePicUrl?: string | null }>()

    // A. Incorporar los chats de Evolution API
    for (const ec of evolutionChats) {
      if (!ec.remoteJid) continue
      const rawDigits = ec.realPhone || ec.remoteJid.replace(/@.*$/, "")
      const norm = normalizePhone(rawDigits)
      if (!norm) continue

      metaMap.set(norm, {
        remoteJid: ec.remoteJid,
        pushName: ec.contactName || ec.pushName || null,
        profilePicUrl: ec.profilePicUrl || null,
      })

      // Mensaje preview
      if (ec.lastMessage && !map.has(norm)) {
        const text = ec.lastMessage.message?.conversation
          || ec.lastMessage.message?.extendedTextMessage?.text
          || ec.lastMessage.message?.imageMessage?.caption
          || (ec.lastMessage.messageType ? `[${ec.lastMessage.messageType}]` : "Message WhatsApp")

        const ts = ec.updatedAt
          || (ec.lastMessage.messageTimestamp ? new Date(ec.lastMessage.messageTimestamp * 1000).toISOString() : new Date().toISOString())

        map.set(norm, [{
          id: ec.lastMessage.id || ec.remoteJid,
          remote_jid: ec.remoteJid,
          phone: rawDigits,
          client_id: null,
          session_id: null,
          from_me: Boolean(ec.lastMessage.key?.fromMe),
          message_type: ec.lastMessage.messageType || "text",
          content: text,
          status: "delivered",
          external_message_id: ec.lastMessage.key?.id || null,
          created_at: ts,
        }])
      }
    }

    // B. Incorporar mensajes de Supabase
    for (const msg of messages) {
      const norm = normalizePhone(msg.phone || "")
      if (!norm) continue

      if (!map.has(norm)) {
        map.set(norm, [])
      }
      const existing = map.get(norm)!
      // Si solo tenía el dummy de lastMessage de evolution, reemplazarlo
      if (existing.length === 1 && existing[0].id === existing[0].remote_jid) {
        map.set(norm, [msg])
      } else {
        if (!existing.some((e) => e.id === msg.id || (e.external_message_id && e.external_message_id === msg.external_message_id))) {
          existing.push(msg)
        }
      }
    }

    const convList: ChatConversation[] = []

    map.forEach((msgs, normPhone) => {
      // Orden cronológico
      msgs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

      const client = matchClientByPhone(normPhone)
      const meta = metaMap.get(normPhone)

      const matchedSessions = sessions.filter((s) => {
        if (client && s.client_name === client.name) return true
        if (s.client_phone && normalizePhone(s.client_phone) === normPhone) return true
        return false
      })

      const latestMessage = msgs[msgs.length - 1]
      const unreadCount = msgs.filter((m) => !m.from_me && m.status !== "read").length

      convList.push({
        phone: msgs[0]?.phone || normPhone,
        normalizedPhone: normPhone,
        remoteJid: meta?.remoteJid || `${normPhone}@s.whatsapp.net`,
        pushName: meta?.pushName,
        contactName: meta?.pushName,
        profilePicUrl: meta?.profilePicUrl,
        client,
        sessions: matchedSessions,
        messages: msgs,
        latestMessage,
        unreadCount,
      })
    })

    return convList.sort(
      (a, b) =>
        new Date(b.latestMessage.created_at).getTime() -
        new Date(a.latestMessage.created_at).getTime()
    )
  }, [evolutionChats, messages, clients, sessions])

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

  // Cargar historial de Evolution si la conversación tiene pocos mensajes
  useEffect(() => {
    if (!activeConversation) return
    const jid = activeConversation.remoteJid
    const phone = activeConversation.phone

    if (jid && activeConversation.messages.length <= 1) {
      setIsLoadingHistory(true)
      fetch("/api/whatsapp/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remoteJid: jid, phone }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.success && Array.isArray(data.messages)) {
            const parsed: WhatsAppMessage[] = data.messages.map((m: any) => {
              const text = m.message?.conversation
                || m.message?.extendedTextMessage?.text
                || m.message?.imageMessage?.caption
                || (m.messageType ? `[${m.messageType}]` : "Message WhatsApp")

              const ts = m.messageTimestamp
                ? new Date(m.messageTimestamp * 1000).toISOString()
                : m.createdAt || new Date().toISOString()

              return {
                id: m.id || m.key?.id || String(Math.random()),
                remote_jid: m.key?.remoteJid || jid,
                phone: phone,
                client_id: null,
                session_id: null,
                from_me: Boolean(m.key?.fromMe),
                message_type: m.messageType || "text",
                content: text,
                status: (m.status === "READ" ? "read" : m.status === "DELIVERY_ACK" ? "delivered" : "sent") as any,
                external_message_id: m.key?.id || null,
                created_at: ts,
              }
            })

            setMessages((prev) => {
              const existingIds = new Set(prev.map((p) => p.external_message_id || p.id))
              const toAdd = parsed.filter((n) => !existingIds.has(n.external_message_id || n.id))
              return [...prev, ...toAdd]
            })
          }
        })
        .catch(() => {})
        .finally(() => setIsLoadingHistory(false))
    }
  }, [selectedPhone])

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

      const clientName = (c.client?.name || c.contactName || c.pushName || "").toLowerCase()
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
      if (cl?.phone && cl.phone !== "0000000000") {
        targetPhone = cl.phone
      }
    }

    if (!targetPhone || targetPhone === "0000000000") {
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
            type="button"
            onClick={() => setIsNewChatOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#c69f68] to-[#9b7844] hover:from-[#d1ab75] hover:to-[#aa864e] text-[#0b0a09] text-xs font-bold shadow-md shadow-[#c69f68]/20 flex items-center gap-2 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>{strings.newChat}</span>
          </button>
          <button
            type="button"
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
                type="button"
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
                type="button"
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
                type="button"
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
                const displayName = conv.client?.name || conv.contactName || conv.pushName || conv.phone
                const lastMsg = conv.latestMessage

                return (
                  <button
                    type="button"
                    key={conv.normalizedPhone}
                    onClick={() => setSelectedPhone(conv.normalizedPhone)}
                    className={`w-full p-3.5 text-left flex items-start gap-3 transition-colors relative ${
                      isSelected
                        ? "bg-[#1f1b17] border-l-2 border-[#c69f68]"
                        : "hover:bg-[#181512]"
                    }`}
                  >
                    {/* Avatar con foto de WhatsApp o iniciales */}
                    <div className="relative shrink-0">
                      {conv.profilePicUrl ? (
                        <img
                          src={conv.profilePicUrl}
                          alt={displayName}
                          className="w-11 h-11 rounded-full object-cover border border-[#c69f68]/30 shadow-sm"
                        />
                      ) : (
                        <div
                          className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-xs uppercase shadow-sm ${
                            conv.client
                              ? "bg-gradient-to-br from-[#c69f68]/30 to-[#9b7844]/20 border border-[#c69f68]/40 text-[#f0d8b4]"
                              : "bg-[#201c18] border border-[#382d20] text-[#8c7a6b]"
                          }`}
                        >
                          {conv.client ? (
                            conv.client.name.substring(0, 2).toUpperCase()
                          ) : (conv.contactName || conv.pushName) ? (
                            (conv.contactName || conv.pushName)!.substring(0, 2).toUpperCase()
                          ) : (
                            <Phone className="w-4 h-4" />
                          )}
                        </div>
                      )}
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
                          {displayName}
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
                  {activeConversation.profilePicUrl ? (
                    <img
                      src={activeConversation.profilePicUrl}
                      alt={activeConversation.client?.name || activeConversation.contactName || activeConversation.pushName || activeConversation.phone}
                      className="w-10 h-10 rounded-full object-cover border border-[#c69f68]/40 shadow-sm shrink-0"
                    />
                  ) : (
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs uppercase shadow-sm shrink-0 ${
                        activeConversation.client
                          ? "bg-gradient-to-br from-[#c69f68]/30 to-[#9b7844]/20 border border-[#c69f68]/40 text-[#f0d8b4]"
                          : "bg-[#201c18] border border-[#382d20] text-[#8c7a6b]"
                      }`}
                    >
                      {activeConversation.client ? (
                        activeConversation.client.name.substring(0, 2).toUpperCase()
                      ) : (activeConversation.contactName || activeConversation.pushName) ? (
                        (activeConversation.contactName || activeConversation.pushName)!.substring(0, 2).toUpperCase()
                      ) : (
                        <Phone className="w-4 h-4" />
                      )}
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-semibold text-[#f0ebe3] truncate">
                        {activeConversation.client?.name || activeConversation.contactName || activeConversation.pushName || activeConversation.phone}
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
                  {isLoadingHistory && (
                    <span className="text-[11px] text-[#c69f68] flex items-center gap-1 font-mono">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Historique...</span>
                    </span>
                  )}

                  {activeConversation.client && (
                    <Link
                      href={`/clients`}
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
                      type="button"
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
                    type="button"
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
                type="button"
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
                type="button"
                onClick={() => setIsNewChatOpen(false)}
                className="text-[#70665a] hover:text-[#ded8d0] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Elegir cliente existente (cargado de las sesiones del estudio) */}
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
                  if (cl?.phone && cl.phone !== "0000000000" && cl.phone.replace(/\D/g, "").length >= 8) {
                    setNewChatPhone(cl.phone)
                  } else {
                    setNewChatPhone("")
                  }
                }}
                className="w-full py-2 px-3 rounded-xl bg-[#0b0a09] border border-[#26211c] text-xs text-[#ded8d0] focus:border-[#c69f68] focus:outline-none"
              >
                <option value="">-- {strings.selectExistingClient} --</option>
                {clients.map((c) => {
                  const hasRealPhone = c.phone && c.phone !== "0000000000" && c.phone.replace(/\D/g, "").length >= 8
                  return (
                    <option key={c.id} value={c.id}>
                      {c.name} {hasRealPhone ? `(${c.phone})` : c.email ? `(${c.email})` : "(Sans téléphone)"}
                    </option>
                  )
                })}
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
                type="button"
                onClick={() => setIsNewChatOpen(false)}
                className="px-3.5 py-2 rounded-xl bg-[#201c18] hover:bg-[#28231e] text-xs text-[#8c7a6b] transition-colors"
              >
                {strings.cancel}
              </button>
              <button
                type="button"
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
