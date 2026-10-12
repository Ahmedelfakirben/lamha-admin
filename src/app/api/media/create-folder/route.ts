import { NextRequest, NextResponse } from "next/server"
import { createProjectFoldersOnStorage, generateProjectFolderName } from "@/lib/storage-config"
import { createClient } from "@supabase/supabase-js"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )
}

/**
 * POST /api/media/create-folder
 * Crea la jerarquía de carpetas estándar de un proyecto en el NAS (FTP) y local:
 * - 01_RAW/Fotos
 * - 01_RAW/Videos
 * - 02_Seleccion_Cliente
 * - 03_Edicion_Master
 * - 04_Entregas_Finales
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { folderName, sessionId } = body

    let targetFolder = folderName

    // Si no se especificó folderName pero sí sessionId, resolverlo de la base de datos
    if (!targetFolder && sessionId) {
      const supabase = getSupabase()
      const { data: session } = await supabase
        .from("sessions")
        .select("session_date, client_name, tags, category")
        .eq("id", sessionId)
        .single()

      if (session) {
        const projName = (session.tags && session.tags[0]) || session.category || "Sesion"
        targetFolder = generateProjectFolderName(session.session_date, session.client_name, projName)
      }
    }

    if (!targetFolder || typeof targetFolder !== "string") {
      return NextResponse.json(
        { success: false, error: "El nombre de la carpeta o el ID de sesión es requerido." },
        { status: 400 }
      )
    }

    const result = await createProjectFoldersOnStorage(targetFolder)

    return NextResponse.json({
      success: result.success,
      folderName: result.folderName,
      createdOnNas: result.createdOnNas,
      createdLocally: result.createdLocally,
      message: result.createdOnNas 
        ? `Carpetas estructuradas creadas con éxito en el NAS (FTP).`
        : `Carpetas estructuradas creadas en almacenamiento local.`
    })
  } catch (error: any) {
    console.error("[Create Folder API Error]:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Error al crear la estructura de carpetas." },
      { status: 500 }
    )
  }
}
