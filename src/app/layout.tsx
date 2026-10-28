"use client"

import { useEffect } from "react"
import type { Metadata } from "next"
import { Outfit } from "next/font/google"
import { usePathname } from "next/navigation"
import "./globals.css"
import { Sidebar } from "@/components/sidebar"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Toaster } from "@/components/ui/toast"
import { LanguageProvider } from "@/context/language-context"
import { ThemeProvider } from "@/context/theme-context"
import { UploadProvider } from "@/context/upload-context"
import { WorkerProgressWidget } from "@/components/worker-progress-widget"
import { GlobalUploadWidget } from "@/components/global-upload-widget"
import { NavigationProgress, HeaderRefreshButton } from "@/components/navigation-progress"

const outfit = Outfit({ subsets: ["latin"] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isAuthPage = pathname === "/login" || pathname?.startsWith("/auth")

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      const isLocalhost = typeof window !== "undefined" && (
        window.location.hostname === "localhost" || 
        window.location.hostname === "127.0.0.1" || 
        window.location.hostname === "::1"
      )

      if (process.env.NODE_ENV === "production" && !isLocalhost) {
        navigator.serviceWorker.register("/sw.js").catch((err) => {
          console.warn("ServiceWorker registration failed: ", err)
        })
      } else {
        // En entorno de desarrollo o localhost, desregistrar Service Workers para evitar interceptar rutas, HMR y WebSockets
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister()
          }
        }).catch(() => {})
      }
    }
  }, [])

  return (
    <html lang="es" className="dark h-full" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="alternate icon" href="/icon.svg" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0b0a09" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Lam7a Studios" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <title>Lam7a Studios • Studio Atelier</title>
      </head>
      <body 
        className={`${outfit.className} h-full m-0 p-0 overflow-hidden bg-[#0b0a09] text-[#f5f2eb] flex flex-col`}
        suppressHydrationWarning
      >
        {/* Luxury Desktop Drag Header Bar with Quick Refresh Button */}
        <header
          className="w-full h-9 min-h-[36px] bg-[#0b0a09] border-b border-[#231f1a] flex items-center justify-between px-4 select-none z-50 shrink-0"
          style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
        >
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-[#c69f68] shadow-[0_0_8px_rgba(198,159,104,0.6)]"></span>
            <span className="font-serif tracking-wider text-[#f5f2eb] font-medium text-[11px] uppercase">Lam7a Studios</span>
            <span className="text-[#c69f68]/40">•</span>
            <span className="text-[#c69f68]/80 text-[11px] font-sans tracking-wide">Studio Atelier</span>
          </div>
          <div className="flex items-center h-full gap-2">
            <HeaderRefreshButton />
            {/* Reserved space for native Windows title bar controls (Minimize, Maximize, Close) */}
            <div className="w-36 h-full" style={{ WebkitAppRegion: "drag" } as React.CSSProperties} />
          </div>
        </header>

        <ThemeProvider>
          <LanguageProvider>
            <UploadProvider>
              <NavigationProgress />
              {isAuthPage ? (
                <div className="w-full flex-1 overflow-y-auto bg-[#0b0a09]">
                  {children}
                </div>
              ) : (
                <div className="flex-1 flex flex-col md:flex-row min-h-0 w-full overflow-hidden bg-[#0b0a09]">
                  <Sidebar />
                  <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#12100e]">
                    {/* Main Workspace with Lighter Background Tone and Expandable Width */}
                    <main className="flex-1 overflow-y-auto overflow-x-hidden p-3.5 sm:p-5 md:p-8 pb-24 md:pb-8 bg-[#1f1b17] bg-gradient-to-b from-[#26211c] via-[#201c18] to-[#1a1714] transition-all duration-300 ease-in-out">
                      <div className="w-full max-w-[1850px] mx-auto space-y-6 sm:space-y-8">
                        {children}
                      </div>
                    </main>
                  </div>
                  <MobileBottomNav />
                  <WorkerProgressWidget />
                  <GlobalUploadWidget />
                </div>
              )}
              <Toaster />
            </UploadProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
