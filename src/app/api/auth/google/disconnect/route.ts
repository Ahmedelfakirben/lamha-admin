import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  return createClient(url, key, { auth: { persistSession: false } })
}

export async function POST() {
  try {
    const supabase = getSupabaseAdmin()
    await supabase
      .from("studio_delivery_settings")
      .update({
        gdrive_client_email: null,
        gdrive_private_key: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1)

    return NextResponse.json({ success: true, message: "Cuenta de Google Drive desconectada." })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
