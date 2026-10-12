import { createClient } from "@/lib/supabase"
import { SettingsClient } from "./settings-client"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const supabase = createClient()
  
  let latencyMs = 0
  let dbConnected = false
  const t0 = Date.now()
  try {
    const { error } = await supabase.from("sessions").select("id").limit(1)
    latencyMs = Date.now() - t0
    dbConnected = !error
  } catch (e) {
    dbConnected = false
  }

  return <SettingsClient latencyMs={latencyMs} dbConnected={dbConnected} />
}
