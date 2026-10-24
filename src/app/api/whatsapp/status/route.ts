import { NextResponse, type NextRequest } from "next/server"
import { getInstanceStatus, connectAndGetQR, logoutInstance } from "@/lib/whatsapp"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const status = await getInstanceStatus()
    return NextResponse.json(status)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST() {
  try {
    const qrData = await connectAndGetQR()
    return NextResponse.json(qrData)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const res = await logoutInstance()
    return NextResponse.json(res)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
