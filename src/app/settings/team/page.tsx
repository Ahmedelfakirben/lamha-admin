import { TeamManagementCard } from "@/components/team-management-card"
import Link from "next/link"
import { ArrowLeft, Users } from "lucide-react"

export const dynamic = "force-dynamic"

export default function TeamSettingsPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Link
          href="/settings"
          className="w-9 h-9 rounded-xl bg-[#141210] hover:bg-[#1a1714] border border-[#26211c] text-[#a89f91] hover:text-[#f5f2eb] flex items-center justify-center transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold font-serif text-[#f5f2eb]">
            Gestión del Equipo & Colaboradores
          </h1>
          <p className="text-xs text-[#8c7a6b]">
            Altas, bajas, contraseñas y asignación de roles en el ERP de Lam7a Studios
          </p>
        </div>
      </div>

      <TeamManagementCard />
    </div>
  )
}
