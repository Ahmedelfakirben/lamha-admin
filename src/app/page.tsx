import { createClient } from "@/lib/supabase"
import { Session, SessionStatus, STATUS_LABELS, CATEGORY_LABELS } from "@/types/database"
import { DashboardHomeClient } from "@/app/dashboard-home-client"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const supabase = createClient()
  
  // Fetch real sessions from Supabase
  const { data: rawSessions } = await supabase
    .from("sessions")
    .select("*, media_deliveries(*)")
    .order("session_date", { ascending: false })

  const sessions: Session[] = rawSessions || []

  // Aggregate Category Data for PieChart
  const catMap: Record<string, number> = {}
  sessions.forEach(s => {
    const cat = CATEGORY_LABELS[s.category] || s.category || "Otro"
    catMap[cat] = (catMap[cat] || 0) + 1
  })
  const categoryData = Object.entries(catMap).map(([name, value]) => ({ name, value }))

  // Aggregate Status Data for BarChart
  const statusOrder: SessionStatus[] = ["pending", "shooting", "editing", "edited", "delivered"]
  const statusData = statusOrder.map(st => ({
    status: STATUS_LABELS[st] || st,
    count: sessions.filter(s => s.status === st).length
  }))

  return (
    <DashboardHomeClient 
      sessions={sessions} 
      categoryData={categoryData} 
      statusData={statusData} 
    />
  )
}
