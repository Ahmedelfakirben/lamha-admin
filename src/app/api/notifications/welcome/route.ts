import { NextRequest, NextResponse } from "next/server"
import { triggerWelcomeNotificationsForSessionAction } from "@/app/actions"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sessionId, language, sendEmail, sendWhatsApp, userContext } = body || {}

    if (!sessionId) {
      return NextResponse.json({ success: false, error: "sessionId is required" }, { status: 400 })
    }

    const res = await triggerWelcomeNotificationsForSessionAction({
      sessionId,
      language: language || "fr",
      sendEmail: sendEmail !== false,
      sendWhatsApp: sendWhatsApp !== false,
      userContext,
    })

    return NextResponse.json(res)
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    )
  }
}

