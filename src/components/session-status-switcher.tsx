"use client"

import { useState } from "react"
import { updateSessionStatus } from "@/app/actions"
import { SessionStatus } from "@/types/database"
import { Loader2 } from "lucide-react"
import { useLanguage } from "@/context/language-context"

interface SessionStatusSwitcherProps {
  sessionId: string
  currentStatus: SessionStatus
}

export function SessionStatusSwitcher({ sessionId, currentStatus }: SessionStatusSwitcherProps) {
  const { t } = useLanguage()
  const [status, setStatus] = useState<SessionStatus>(currentStatus)
  const [loading, setLoading] = useState(false)

  const handleChange = async (newStatus: string) => {
    setLoading(true)
    const res = await updateSessionStatus(sessionId, newStatus)
    setLoading(false)
    if (res.success) {
      setStatus(newStatus as SessionStatus)
    } else {
      alert("Error: " + res.error)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-[#8c7a6b]">{t.status}:</span>
      <div className="relative">
        <select
          value={status}
          onChange={(e) => handleChange(e.target.value)}
          disabled={loading}
          className="bg-[#181613] border border-[#29241f] hover:border-[#c69f68]/40 rounded-xl px-3 py-1.5 text-xs text-[#f5f2eb] font-medium focus:outline-none focus:border-[#c69f68] transition-colors cursor-pointer"
        >
          <option value="pending">{t.pending}</option>
          <option value="shooting">{t.shooting}</option>
          <option value="editing">{t.inEditing}</option>
          <option value="delivered">{t.statusDeliveredToClient}</option>
        </select>
        {loading && (
          <Loader2 className="w-3 h-3 animate-spin text-[#c69f68] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        )}
      </div>
    </div>
  )
}
