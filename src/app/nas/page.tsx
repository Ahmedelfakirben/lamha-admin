import { createClient } from "@/lib/supabase"
import { NasStorageDashboard } from "@/components/nas-storage-dashboard"

export const dynamic = "force-dynamic"

export default async function NasStoragePage() {
  const supabase = createClient()

  // Obtener sesiones reales de clientes desde la base de datos Supabase
  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, client_name, session_date, category, session_type, status, portal_pin, tags")
    .order("session_date", { ascending: false })
    .limit(200)

  return <NasStorageDashboard initialSessions={sessions || []} />
}
