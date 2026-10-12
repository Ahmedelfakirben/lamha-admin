import { createClient } from "@/lib/supabase"
import { notFound } from "next/navigation"
import { SessionDetailsClient } from "./session-details-client"
import { generateProjectFolderName } from "@/lib/storage-config"

export const dynamic = "force-dynamic"

function deriveProjectFolder(assets: any[]): string {
  if (!assets || assets.length === 0) return ""
  
  const firstAsset = assets.find((a: any) => a.nas_path && a.nas_path.length > 5)
  if (!firstAsset) return ""

  const nasPath: string = firstAsset.nas_path
  
  const rootPatterns = [
    /^ftp:\/\/[^/]+\/[^/]+\/[^/]+\//i,
    /^\\\\[^\\]+\\[^\\]+\\[^\\]+\\/i,
    /^\/Volumes\/[^/]+\/[^/]+\//i,
    /^\/mnt\/[^/]+\/[^/]+\//i,
    /^[A-Z]:\\[^\\]+\\/i,
  ]

  let relativePath = nasPath
  for (const pattern of rootPatterns) {
    const match = nasPath.match(pattern)
    if (match) {
      relativePath = nasPath.slice(match[0].length)
      break
    }
  }

  const firstSegment = relativePath.split(/[/\\]/).filter(Boolean)[0]
  return firstSegment || ""
}

export default async function SessionDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createClient()
  
  const { data: session, error } = await supabase
    .from("sessions")
    .select("*, media_assets(*), media_deliveries(*)")
    .eq("id", id)
    .single()

  if (error || !session) {
    notFound()
  }

  const selectedAssets: string[] = session.selected_assets || []
  const folderLink = session.media_deliveries?.find((d: any) => d.delivery_type === 'folder_link')?.url
  const finalLink = session.media_deliveries?.find((d: any) => d.delivery_type === 'final_link')?.url

  let projectFolder = deriveProjectFolder(session.media_assets || [])
  if (!projectFolder) {
    projectFolder = generateProjectFolderName(
      session.session_date,
      session.client_name,
      (session.tags && session.tags[0]) || session.category
    )
  }

  return (
    <SessionDetailsClient
      session={session}
      folderLink={folderLink}
      finalLink={finalLink}
      selectedAssets={selectedAssets}
      projectFolder={projectFolder}
    />
  )
}
