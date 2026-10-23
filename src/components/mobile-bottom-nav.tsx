"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Calendar, Camera, KanbanSquare, Users, Menu } from "lucide-react"

interface MobileBottomNavProps {}

export function MobileBottomNav({}: MobileBottomNavProps) {
  const pathname = usePathname()

  const navItems = [
    {
      label: "Calendario",
      href: "/calendar",
      icon: Calendar,
      isActive: pathname === "/calendar" || pathname === "/",
    },
    {
      label: "Galería",
      href: "/photos",
      icon: Camera,
      isActive: pathname.startsWith("/photos"),
    },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0e0c0a]/95 backdrop-blur-lg border-t border-[#c69f68]/20 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 px-6">
      <div className="flex items-center justify-around max-w-sm mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-4 rounded-2xl transition-all duration-200 ${
                item.isActive
                  ? "text-[#c69f68] font-bold"
                  : "text-[#8c7a6b] hover:text-[#d4af37]"
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-colors ${
                  item.isActive ? "bg-[#c69f68]/20 text-[#c69f68]" : "bg-transparent text-[#8c7a6b]"
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[11px] mt-1 tracking-tight font-serif">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
