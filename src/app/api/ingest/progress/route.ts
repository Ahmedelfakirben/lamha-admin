import { NextResponse } from "next/server"
import { getIngestState, resetIngestState } from "@/lib/ingest-job"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    return NextResponse.json(getIngestState(), {
      headers: { "Cache-Control": "no-store" }
    })
  } catch {
    return NextResponse.json({ status: "idle", percent: 0, logs: [] })
  }
}

export async function DELETE() {
  // No se puede limpiar el estado mientras hay una ingesta en curso
  const ok = resetIngestState()
  return NextResponse.json({ success: ok })
}
