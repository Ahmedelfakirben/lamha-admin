"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { 
  LayoutDashboard, 
  Calendar,
  KanbanSquare,
  Camera, 
  Film, 
  Users, 
  FolderTree,
  HardDrive, 
  Settings, 
  Layers,
  Plus,
  LogOut,
  Globe,
  User,
  ChevronUp,
  LogIn,
  Sun,
  Moon,
  Menu,
  X,
  ShieldCheck
} from "lucide-react"
import { BrandLogo } from "@/components/brand-logo"
import { useLanguage, Language } from "@/context/language-context"
import { useTheme } from "@/context/theme-context"
import { SessionDialog } from "@/components/session-dialog"
import { createClient } from "@/lib/supabase"

const LANGUAGE_OPTIONS: { code: Language; label: string; flag: string }[] = [
  { code: "es", label: "Español", flag: "ES" },
  { code: "fr", label: "Français", flag: "FR" },
  { code: "en", label: "English", flag: "EN" },
  { code: "ar", label: "العربية", flag: "AR" },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { t, language, setLanguage } = useLanguage()
  const { theme, setTheme } = useTheme()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Auth & User Profile State
  const [user, setUser] = useState<{ email?: string; name?: string } | null>(null)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  // Persist collapsed preference in localStorage
  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem("lamha_sidebar_collapsed")
    if (saved === "true") {
      setIsCollapsed(true)
    }
  }, [])

  // Auto-close mobile drawer when pathname changes
  useEffect(() => {
    setIsMobileOpen(false)
  }, [pathname])

  // Supabase Auth listener
  useEffect(() => {
    const supabase = createClient()

    // Initial check
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUser({
          email: data.user.email,
          name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || "Admin Studio"
        })
      }
    })

    // Listen for auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user) {
        setUser({
          email: session.user.email,
          name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || "Admin Studio"
        })
      } else {
        setUser(null)
      }
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  const handleLogout = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      setUser(null)
      setIsUserMenuOpen(false)
      setIsMobileOpen(false)
      window.location.href = "/login"
    } catch (err) {
      console.error("Erreur lors de la déconnexion:", err)
      window.location.href = "/login"
    }
  }

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev
      localStorage.setItem("lamha_sidebar_collapsed", String(next))
      return next
    })
  }

  const NAV_ITEMS = [
    { href: "/", label: t.dashboard, icon: LayoutDashboard },
    { href: "/calendar", label: t.calendar, icon: Calendar },
    { href: "/planner", label: t.planner, icon: KanbanSquare },
    { href: "/projects", label: t.unifiedView, icon: Layers },
    { href: "/photos", label: t.photoSessions, icon: Camera },
    { href: "/videos", label: t.videoProduction, icon: Film },
    { href: "/clients", label: t.clientDirectory, icon: Users },
    { href: "/categories", label: t.categoriesMenu, icon: FolderTree },
  ]

  const SYSTEM_ITEMS = [
    { href: "/audit", label: t.auditTrail, icon: ShieldCheck },
    { href: "/nas", label: t.nasStorage, icon: HardDrive },
    { href: "/settings", label: t.settings, icon: Settings },
  ]

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────
          1. MOBILE TOP NAVIGATION BAR (Visible only on < md screens)
          ───────────────────────────────────────────────────────────── */}
      <header className="md:hidden w-full h-14 shrink-0 bg-[#0b0a09] border-b border-[#26211c] px-3.5 flex items-center justify-between z-30 select-none">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsMobileOpen(true)}
            className="p-2 rounded-xl text-[#f5f2eb] hover:text-[#c69f68] hover:bg-[#1a1714] border border-[#26211c] transition-colors"
            aria-label="Abrir menú"
          >
            <Menu className="w-5 h-5 text-[#c69f68]" />
          </button>

          <Link href="/" className="hover:opacity-90 transition-opacity flex items-center">
            <BrandLogo width={110} color={theme === "light" ? "#9E753B" : "#C69F68"} showSubtitle={false} />
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Add Session Button */}
          <SessionDialog
            triggerType="add"
            customTrigger={
              <button 
                title={t.addSessionBtn}
                className="h-8 px-2.5 rounded-lg bg-gradient-to-r from-[#c69f68] to-[#dfba85] text-[#0b0a09] font-bold text-xs flex items-center gap-1 shadow-sm active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5 text-[#0b0a09]" />
                <span className="hidden sm:inline">{t.addSessionBtn}</span>
              </button>
            }
          />

          {/* Quick Profile / Drawer Trigger */}
          <button
            type="button"
            onClick={() => setIsMobileOpen(true)}
            className="w-8 h-8 rounded-lg bg-[#141210] border border-[#26211c] flex items-center justify-center text-[#c69f68] text-xs font-bold"
            title={user?.email || "Menu"}
          >
            {user?.name ? user.name.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. MOBILE SLIDE-OVER DRAWER (Visible only when open on < md)
          ───────────────────────────────────────────────────────────── */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop Blur */}
          <div 
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          />

          {/* Drawer Sidebar */}
          <div className="relative w-72 max-w-[85vw] h-full bg-[#0b0a09] border-r border-[#26211c] shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="h-16 border-b border-[#26211c] px-4 flex items-center justify-between">
              <Link href="/" onClick={() => setIsMobileOpen(false)} className="flex items-center">
                <BrandLogo width={120} color={theme === "light" ? "#9E753B" : "#C69F68"} showSubtitle={true} />
              </Link>
              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                className="p-2 rounded-xl text-[#8c7a6b] hover:text-[#f5f2eb] hover:bg-[#1a1714] border border-[#26211c] transition-colors"
                aria-label="Cerrar menú"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation Items */}
            <div className="flex-1 overflow-y-auto py-4 px-3 space-y-5 custom-scrollbar">
              <div>
                <div className="px-3 mb-2 text-[10px] uppercase tracking-[0.2em] text-[#70665a] font-semibold">
                  {t.studioManagement}
                </div>
                <nav className="space-y-1">
                  {NAV_ITEMS.map((item) => {
                    const active = isActive(item.href)
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileOpen(false)}
                        className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition-all ${
                          active
                            ? "bg-[#1c1815] text-[#c69f68] font-bold border border-[#c69f68]/30"
                            : "text-[#a89f91] hover:bg-[#161412] hover:text-[#f5f2eb]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={`h-4 w-4 shrink-0 ${active ? "text-[#c69f68]" : "text-[#70665a]"}`} />
                          <span>{item.label}</span>
                        </div>
                        {active && <div className="w-1.5 h-1.5 rounded-full bg-[#c69f68]" />}
                      </Link>
                    )
                  })}
                </nav>
              </div>
            </div>

            {/* Mobile Drawer Footer Controls */}
            <div className="p-3.5 border-t border-[#26211c] bg-[#0c0b0a] space-y-3">
              <SessionDialog
                triggerType="add"
                customTrigger={
                  <button className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#c69f68] to-[#dfba85] text-[#0b0a09] font-bold text-xs shadow-md">
                    <Plus className="w-4 h-4 text-[#0b0a09]" />
                    <span>{t.addSessionBtn}</span>
                  </button>
                }
              />

              {/* User row */}
              <div className="p-2.5 rounded-xl bg-[#141210] border border-[#26211c] flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#c69f68]/30 to-[#1c1815] border border-[#c69f68]/50 flex items-center justify-center text-[#c69f68] font-bold text-xs shrink-0">
                    {user?.name ? user.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#f5f2eb] truncate">{user?.name || "Studio Admin"}</div>
                    <div className="text-[10px] text-[#70665a] truncate">{user?.email || "Lamha Studios"}</div>
                  </div>
                </div>

                {user && (
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title={t.logout}
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Infrastructure Links in Mobile Drawer */}
              <div className="space-y-1">
                <div className="px-1 text-[10px] font-bold uppercase tracking-wider text-[#70665a] flex items-center gap-1.5">
                  <HardDrive className="w-3 h-3 text-[#c69f68]" />
                  <span>{t.infrastructure}</span>
                </div>
                <div className="space-y-0.5">
                  {SYSTEM_ITEMS.map((item) => {
                    const active = isActive(item.href)
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileOpen(false)}
                        className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-all ${
                          active
                            ? "bg-[#1c1815] text-[#c69f68] font-bold border border-[#c69f68]/30"
                            : "text-[#a89f91] hover:bg-[#161412] hover:text-[#f5f2eb]"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className={`h-3.5 w-3.5 shrink-0 ${active ? "text-[#c69f68]" : "text-[#70665a]"}`} />
                          <span>{item.label}</span>
                        </div>
                        {active && <div className="w-1.5 h-1.5 rounded-full bg-[#c69f68]" />}
                      </Link>
                    )
                  })}
                </div>
              </div>

              {/* Language Switcher Grid */}
              <div className="space-y-1">
                <div className="px-1 text-[10px] font-bold uppercase tracking-wider text-[#70665a] flex items-center gap-1.5">
                  <Globe className="w-3 h-3 text-[#c69f68]" />
                  <span>{t.languageLabel}</span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {LANGUAGE_OPTIONS.map((opt) => (
                    <button
                      key={opt.code}
                      type="button"
                      onClick={() => setLanguage(opt.code)}
                      className={`py-1.5 rounded-lg text-[11px] font-mono font-bold transition-all ${
                        language === opt.code
                          ? "bg-[#c69f68] text-[#0b0a09]"
                          : "bg-[#141210] text-[#a89f91] border border-[#26211c]"
                      }`}
                    >
                      {opt.flag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme Switcher */}
              <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium ${
                    theme === "dark"
                      ? "bg-[#c69f68]/20 text-[#c69f68] font-bold border border-[#c69f68]/50"
                      : "bg-[#141210] text-[#a89f91] border border-[#26211c]"
                  }`}
                >
                  <Moon className="w-3 h-3" />
                  <span>{t.darkTheme}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium ${
                    theme === "light"
                      ? "bg-[#c69f68]/20 text-[#c69f68] font-bold border border-[#c69f68]/50"
                      : "bg-[#141210] text-[#a89f91] border border-[#26211c]"
                  }`}
                >
                  <Sun className="w-3 h-3 text-amber-500" />
                  <span>{t.lightTheme}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. DESKTOP DOCKED SIDEBAR (Visible only on md+ screens)
          ───────────────────────────────────────────────────────────── */}
      <aside 
        className={`hidden md:flex h-full flex-col bg-[#0b0a09] text-[#f5f2eb] border-r border-[#26211c] select-none shrink-0 transition-all duration-300 ease-in-out relative ${
          isCollapsed ? "w-[72px]" : "w-64"
        }`}
      >
        {/* Brand Header - Clicking Logo Toggles Collapse / Expand */}
        <div className={`flex h-24 border-b border-[#26211c] px-3 py-2 transition-all ${
          theme === "light" ? "bg-white" : "bg-gradient-to-b from-[#161411] to-[#0b0a09]"
        } items-center justify-center`}>
          <button
            type="button"
            onClick={toggleCollapse}
            title={isCollapsed ? "Développer le menu / Expandir menú" : "Réduire le menu / Plegar menú"}
            className="w-full flex flex-col items-center justify-center hover:opacity-85 active:scale-95 transition-all cursor-pointer group py-1"
          >
            {!isCollapsed ? (
              <BrandLogo width={135} color={theme === "light" ? "#9E753B" : "#C69F68"} showSubtitle={true} />
            ) : (
              <BrandLogo width={36} color={theme === "light" ? "#9E753B" : "#C69F68"} showSubtitle={false} />
            )}
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto py-5 px-2.5 space-y-6 custom-scrollbar">
          <div>
            {!isCollapsed && (
              <div className="px-3 mb-2 text-[10px] uppercase tracking-[0.2em] text-[#70665a] font-semibold">
                {t.studioManagement}
              </div>
            )}
            <nav className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.href)
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={isCollapsed ? item.label : undefined}
                    className={`group relative flex items-center rounded-xl transition-all ${
                      isCollapsed 
                        ? "justify-center p-2.5" 
                        : "justify-between gap-3 px-3 py-2.5 text-xs font-medium"
                    } ${
                      active
                        ? "bg-[#1c1815] text-[#c69f68] font-semibold shadow-inner border border-[#c69f68]/30"
                        : "text-[#a89f91] hover:bg-[#161412] hover:text-[#f5f2eb]"
                    }`}
                  >
                    <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3"}`}>
                      <Icon className={`h-4 w-4 shrink-0 ${active ? "text-[#c69f68]" : "text-[#70665a]"}`} />
                      {!isCollapsed && <span>{item.label}</span>}
                    </div>
                    
                    {!isCollapsed && active && (
                      <div className="w-1.5 h-1.5 rounded-full bg-[#c69f68]" />
                    )}

                    {/* Floating tooltip when collapsed */}
                    {isCollapsed && (
                      <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-[#181512] border border-[#332b23] text-xs font-semibold text-[#f5f2eb] whitespace-nowrap shadow-2xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                        {item.label}
                      </div>
                    )}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Sidebar Action Footer */}
        <div className={`p-3 border-t border-[#26211c] bg-[#0c0b0a] ${isCollapsed ? "flex flex-col items-center gap-2.5" : "space-y-2.5"}`}>
          <SessionDialog
            triggerType="add"
            customTrigger={
              !isCollapsed ? (
                <button className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#c69f68] to-[#dfba85] text-[#0b0a09] font-bold text-xs shadow-md hover:shadow-[#c69f68]/20 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer">
                  <Plus className="w-4 h-4 text-[#0b0a09]" />
                  <span>{t.addSessionBtn}</span>
                </button>
              ) : (
                <button 
                  title={t.addSessionBtn}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-r from-[#c69f68] to-[#dfba85] text-[#0b0a09] font-bold shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-[#0b0a09]" />
                </button>
              )
            }
          />

          {/* Unified User & Language Dropdown */}
          <div className="relative w-full">
            <button
              type="button"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className={`w-full flex items-center rounded-xl bg-[#141210] hover:bg-[#1c1815] border border-[#26211c] hover:border-[#c69f68]/40 transition-all cursor-pointer ${
                isCollapsed 
                  ? "justify-center p-2" 
                  : "justify-between p-2.5"
              }`}
              title={user?.email ? `Connecté: ${user.email}` : "Menu Utilisateur & Langue"}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Avatar with status indicator */}
                <div className="relative shrink-0">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#c69f68]/30 to-[#1c1815] border border-[#c69f68]/50 flex items-center justify-center text-[#c69f68] font-bold text-xs">
                    {user?.name ? user.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#0c0b0a]" />
                </div>

                {!isCollapsed && (
                  <div className="min-w-0 text-left">
                    <div className="text-xs font-bold text-[#f5f2eb] truncate">
                      {user?.name || "Studio Admin"}
                    </div>
                    <div className="text-[10px] text-[#70665a] truncate">
                      {user?.email || "Lamha Studios"}
                    </div>
                  </div>
                )}
              </div>

              {!isCollapsed && (
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Active Language Badge */}
                  <span className="w-5 h-4 rounded-sm bg-[#c69f68]/20 text-[#c69f68] font-mono text-[9px] font-bold flex items-center justify-center border border-[#c69f68]/30">
                    {language.toUpperCase()}
                  </span>
                  <ChevronUp className={`w-3.5 h-3.5 text-[#70665a] transition-transform ${isUserMenuOpen ? "rotate-180" : ""}`} />
                </div>
              )}
            </button>

            {/* Unified Floating DropUp Menu */}
            {isUserMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />
                <div className={`absolute bottom-full mb-2 z-50 rounded-2xl bg-[#141210] border border-[#2d251e] shadow-2xl p-2.5 space-y-2.5 ${
                  isCollapsed ? "left-0 w-64" : "left-0 right-0 w-full"
                }`}>
                  {/* User Info Header */}
                  <div className="p-2.5 rounded-xl bg-[#0b0a09] border border-[#221e1a] flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#c69f68]/30 to-[#1c1815] border border-[#c69f68]/50 flex items-center justify-center text-[#c69f68] font-bold text-sm shrink-0">
                      {user?.name ? user.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-[#f5f2eb] truncate">
                        {user?.name || t.adminRole}
                      </div>
                      <div className="text-[10px] text-[#8c7a6b] truncate">
                        {user?.email || "admin@lamhastudios.com"}
                      </div>
                    </div>
                  </div>

                  {/* Section: Infrastructure (Audit, NAS, Paramètres) */}
                  <div className="space-y-1">
                    <div className="px-1.5 text-[10px] font-bold uppercase tracking-wider text-[#70665a] flex items-center gap-1.5">
                      <HardDrive className="w-3 h-3 text-[#c69f68]" />
                      <span>{t.infrastructure}</span>
                    </div>
                    <div className="space-y-0.5 pt-0.5">
                      {SYSTEM_ITEMS.map((item) => {
                        const active = isActive(item.href)
                        const Icon = item.icon
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setIsUserMenuOpen(false)}
                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                              active
                                ? "bg-[#c69f68]/20 text-[#c69f68] font-bold border border-[#c69f68]/40"
                                : "text-[#d4cbbf] hover:bg-[#1c1815] hover:text-[#f5f2eb]"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <Icon className={`w-3.5 h-3.5 ${active ? "text-[#c69f68]" : "text-[#8c7a6b]"}`} />
                              <span>{item.label}</span>
                            </div>
                            {active && <div className="w-1.5 h-1.5 rounded-full bg-[#c69f68]" />}
                          </Link>
                        )
                      })}
                    </div>
                  </div>

                  <div className="border-t border-[#26201a]" />

                  {/* Section: Language Switcher */}
                  <div className="space-y-1">
                    <div className="px-1.5 text-[10px] font-bold uppercase tracking-wider text-[#70665a] flex items-center gap-1.5">
                      <Globe className="w-3 h-3 text-[#c69f68]" />
                      <span>{t.languageLabel}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 pt-0.5">
                      {LANGUAGE_OPTIONS.map((opt) => {
                        const isCurrent = language === opt.code
                        return (
                          <button
                            key={opt.code}
                            type="button"
                            onClick={() => {
                              setLanguage(opt.code)
                              setIsUserMenuOpen(false)
                            }}
                            className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                              isCurrent
                                ? "bg-[#c69f68]/20 text-[#c69f68] font-bold border border-[#c69f68]/40"
                                : "text-[#a89f91] hover:bg-[#1c1815] hover:text-[#f5f2eb]"
                            }`}
                          >
                            <span>{opt.label}</span>
                            <span className="font-mono text-[9px] opacity-75">{opt.flag}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="border-t border-[#26201a]" />

                  {/* Section: Theme Switcher (Estilo Claro / Oscuro) */}
                  <div className="space-y-1">
                    <div className="px-1.5 text-[10px] font-bold uppercase tracking-wider text-[#70665a] flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {theme === "dark" ? (
                          <Moon className="w-3 h-3 text-[#c69f68]" />
                        ) : (
                          <Sun className="w-3 h-3 text-[#c69f68]" />
                        )}
                        <span>{t.themeLabel}</span>
                      </div>
                      <span className="text-[9px] font-mono font-medium text-[#c69f68] bg-[#c69f68]/15 px-1.5 py-0.5 rounded">
                        {theme === "dark" ? t.darkTheme : t.lightTheme}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 pt-0.5">
                      <button
                        type="button"
                        onClick={() => setTheme("dark")}
                        className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          theme === "dark"
                            ? "bg-[#c69f68]/20 text-[#c69f68] font-bold border border-[#c69f68]/50 shadow-sm"
                            : "text-[#a89f91] hover:bg-[#1c1815] hover:text-[#f5f2eb] border border-transparent"
                        }`}
                      >
                        <Moon className="w-3.5 h-3.5 text-[#c69f68]" />
                        <span>{t.darkTheme}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTheme("light")}
                        className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          theme === "light"
                            ? "bg-[#c69f68]/20 text-[#c69f68] font-bold border border-[#c69f68]/50 shadow-sm"
                            : "text-[#a89f91] hover:bg-[#1c1815] hover:text-[#f5f2eb] border border-transparent"
                        }`}
                      >
                        <Sun className="w-3.5 h-3.5 text-amber-500" />
                        <span>{t.lightTheme}</span>
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-[#26201a]" />

                  {/* Section: Logout Button */}
                  {user ? (
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{t.logout}</span>
                    </button>
                  ) : (
                    <Link
                      href="/login"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[#c69f68]/15 hover:bg-[#c69f68]/25 text-[#c69f68] border border-[#c69f68]/30 text-xs font-semibold transition-colors"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>{t.login}</span>
                    </Link>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
