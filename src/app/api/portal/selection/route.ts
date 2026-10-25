import { NextRequest, NextResponse } from "next/server"
import { submitClientSelectionAction } from "@/app/actions"

export const dynamic = "force-dynamic"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { 
      sessionId, 
      selectedAssets = [], 
      notesCount = 0, 
      generalNotes = "", 
      assetNotes = {}, 
      language = "fr" 
    } = body

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "sessionId est requis." },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    const result = await submitClientSelectionAction({
      sessionId,
      selectedAssets,
      notesCount,
      generalNotes,
      assetNotes,
      language,
    })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500, headers: CORS_HEADERS }
      )
    }

    return NextResponse.json(
      { success: true, message: "Sélection enregistrée et notifiée avec succès." },
      { status: 200, headers: CORS_HEADERS }
    )
  } catch (error: any) {
    console.error("[API_PORTAL_SELECTION_ERROR]", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Erreur interne du serveur." },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
