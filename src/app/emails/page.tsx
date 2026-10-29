import { createClient } from "@/lib/supabase"
import { getExistingClients } from "@/app/actions"
import { getEmailAutomationSettings } from "@/lib/email-settings"
import { getSmtpConfig, isEmailConfigured } from "@/lib/email"
import { EmailsClient } from "./emails-client"

export const dynamic = "force-dynamic"

export default async function EmailsPage() {
  const supabase = createClient()

  const [initialSettings, clientsRes, sessionsRes] = await Promise.all([
    getEmailAutomationSettings(true),
    getExistingClients(),
    supabase
      .from("sessions")
      .select("id, client_name, client_email, client_phone, session_date, category, subcategory, portal_pin, status, media_deliveries(url, delivery_type)")
      .order("session_date", { ascending: false })
      .limit(200),
  ])

  const smtp = getSmtpConfig()
  const smtpReady = isEmailConfigured()

  return (
    <EmailsClient
      initialSettings={initialSettings}
      clients={clientsRes.clients || []}
      sessions={(sessionsRes.data as any[]) || []}
      smtpReady={smtpReady}
      smtpFromEmail={smtp.fromEmail}
    />
  )
}

