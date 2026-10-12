import { createClient } from "@/lib/supabase"
import { notFound } from "next/navigation"
import { ClientProfileView } from "./client-profile-view"

export const dynamic = "force-dynamic"

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const decodedId = decodeURIComponent(id).trim()
  const supabase = createClient()

  let clientRecord: any = null
  let clientName = decodedId
  let clientPhone: string | null = null
  let clientEmail: string | null = null
  let clientNotes: string | null = null

  // 1. Check if ID matches a record in the `clients` table (by UUID or name)
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decodedId)
  if (isUuid) {
    const { data: c } = await supabase
      .from("clients")
      .select("*")
      .eq("id", decodedId)
      .maybeSingle()
    if (c) {
      clientRecord = c
      clientName = c.name
      clientPhone = c.phone || null
      clientEmail = c.email || null
      clientNotes = c.notes || null
    }
  }

  if (!clientRecord) {
    const { data: c } = await supabase
      .from("clients")
      .select("*")
      .ilike("name", decodedId)
      .maybeSingle()
    if (c) {
      clientRecord = c
      clientName = c.name
      clientPhone = c.phone || null
      clientEmail = c.email || null
      clientNotes = c.notes || null
    }
  }

  // 2. Fetch all sessions for this client (with media assets and deliveries)
  let sessionsQuery = supabase
    .from("sessions")
    .select("*, media_assets(*), media_deliveries(*)")
    .order("session_date", { ascending: false })

  if (clientRecord?.id) {
    sessionsQuery = sessionsQuery.or(`client_id.eq.${clientRecord.id},client_name.ilike.${clientName}`)
  } else {
    sessionsQuery = sessionsQuery.ilike("client_name", clientName)
  }

  const { data: sessions, error } = await sessionsQuery

  if (error) {
    console.error("Erreur récupération sessions du client:", error)
  }

  // If no sessions and no client profile found, 404
  if ((!sessions || sessions.length === 0) && !clientRecord) {
    notFound()
  }

  const sessionList = sessions || []

  // Fallback to session contact info if not present in clients table
  if (!clientPhone) {
    clientPhone = sessionList.find((s: any) => s.client_phone)?.client_phone || null
  }
  if (!clientEmail) {
    clientEmail = sessionList.find((s: any) => s.client_email)?.client_email || null
  }
  if (!clientNotes) {
    clientNotes = sessionList.find((s: any) => s.comments)?.comments || null
  }

  // Fallback for client name casing from sessions if possible
  if (sessionList.length > 0 && sessionList[0].client_name) {
    clientName = sessionList[0].client_name
  }

  return (
    <ClientProfileView
      clientName={clientName}
      clientPhone={clientPhone}
      clientEmail={clientEmail}
      clientNotes={clientNotes}
      sessions={sessionList}
    />
  )
}
