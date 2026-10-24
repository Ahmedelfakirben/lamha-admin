import { Metadata } from "next"
import { Suspense } from "react"
import { ChatView } from "./chat-view"

export const metadata: Metadata = {
  title: "Messagerie WhatsApp • Lamha Studios",
  description: "Centre de messagerie WhatsApp en direct pour Lamha Studios",
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-[#70665a]">Chargement de la messagerie...</div>}>
      <ChatView />
    </Suspense>
  )
}
