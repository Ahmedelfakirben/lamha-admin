"use client"

import type { Metadata } from "next"
import { Outfit } from "next/font/google"
import { usePathname } from "next/navigation"
import "./globals.css"
import { Sidebar } from "@/components/sidebar"
import { Toaster } from "@/components/ui/toast"
import { LanguageProvider } from "@/context/language-context"
import { ThemeProvider } from "@/context/theme-context"
import { UploadProvider } from "@/context/upload-context"
import { WorkerProgressWidget } from "@/components/worker-progress-widget"
import { GlobalUploadWidget } from "@/components/global-upload-widget"

const outfit = Outfit({ subsets: ["latin"] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isAuthPage = pathname === "/login" || pathname?.startsWith("/auth")

  return (
    <html lang="es" className="dark h-full">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="alternate icon" href="/icon.svg" />
        <title>Lamha Studios • Studio Atelier</title>
      </head>
      <body className={`${outfit.className} h-full m-0 p-0 overflow-hidden bg-[#0b0a09] text-[#f5f2eb]`}>
        <ThemeProvider>
          <LanguageProvider>
            <UploadProvider>
              {isAuthPage ? (
                <div className="w-full h-full overflow-y-auto bg-[#0b0a09]">
                {children}
              </div>
            ) : (
              <div className="flex flex-col md:flex-row h-full w-full overflow-hidden bg-[#0b0a09]">
                <Sidebar />
                <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#12100e]">
                  {/* Main Workspace with Lighter Background Tone and Expandable Width */}
                  <main className="flex-1 overflow-y-auto overflow-x-hidden p-3.5 sm:p-5 md:p-8 bg-[#1f1b17] bg-gradient-to-b from-[#26211c] via-[#201c18] to-[#1a1714] transition-all duration-300 ease-in-out">
                    <div className="w-full max-w-[1850px] mx-auto space-y-6 sm:space-y-8">
                      {children}
                    </div>
                  </main>
                </div>
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
