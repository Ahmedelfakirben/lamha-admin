import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export async function GET() {
  try {
    const workerProgressFile = path.join(process.cwd(), ".worker-progress.json")
    
    if (!fs.existsSync(workerProgressFile)) {
      return NextResponse.json({ status: "idle" })
    }
    
    const data = JSON.parse(fs.readFileSync(workerProgressFile, "utf-8"))
    
    if (data.status === "completed" && data.lastUpdated) {
      const lastUpdated = new Date(data.lastUpdated).getTime()
      const now = new Date().getTime()
      if (now - lastUpdated > 60000) {
        return NextResponse.json({ status: "idle" })
      }
    }

    // El worker escribe latido cada ~0.5s; si lleva 2 min sin actualizar, está muerto
    if (data.status === "running" && data.lastUpdated) {
      const age = new Date().getTime() - new Date(data.lastUpdated).getTime()
      if (age > 120000) {
        return NextResponse.json({
          ...data,
          status: "error",
          message: "El worker de previsualizaciones se detuvo inesperadamente."
        })
      }
    }
    
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ status: "error", message: e.message })
  }
}
