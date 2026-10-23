"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Calendar, Camera, KanbanSquare, Users, Menu } from "lucide-react"

interface MobileBottomNavProps {
  onOpenMenu?: () => void
}

export function MobileBottomNav({ onOpenMenu }: MobileBottomNavProps) {
  const pathname = usePathname()

  const navItems = [
    {
      label: "Agenda",
      href: "/calendar",
      icon: Calendar,
      isActive: pathname === "/calendar",
    },
    {
      label: "Galería",
      href: "/photos",
      icon: Camera,
      isActive: pathname === "/photos",
    },
    {
      label: "Proyectos",
      href: "/projects",
      icon: KanbanSquare,
      isActive: pathname === "/projects",
    },
    {
      label: "Clientes",
      href: "/clients",
      icon: Users,
      isActive: pathname === "/clients",
    },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0e0c0a]/95 backdrop-blur-lg border-t border-[#c69f68]/20 pb-[max(env(safe-area-inset-bottom),8px)] pt-1.5 px-3">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 ${
                item.isActive
                  ? "text-[#c69f68] font-medium"
                  : "text-[#8c7a6b] hover:text-[#d4af37]"
              }`}
            >
              <div
                className={`p-1 rounded-lg transition-colors ${
                  item.isActive ? "bg-[#c69f68]/15" : "bg-transparent"
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
            </Link>
          )
        })}

        {onOpenMenu && (
          <button
            type="button"
            onClick={onOpenMenu}
            className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[#8c7a6b] hover:text-[#d4af37] transition-all duration-200"
          >
            <div className="p-1 rounded-lg bg-transparent">
              <Menu className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Más</span>
          </button>
        )}
      </div>
    </nav>
  )
}
