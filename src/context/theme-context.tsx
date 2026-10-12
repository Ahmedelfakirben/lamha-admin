"use client"

import React, { createContext, useContext, useEffect, useState } from "react"

export type Theme = "dark" | "light"

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  mounted: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark")
  const [mounted, setMounted] = useState(false)

  const applyTheme = (t: Theme) => {
    const root = document.documentElement
    if (t === "light") {
      root.classList.remove("dark")
      root.classList.add("light")
      root.style.colorScheme = "light"
    } else {
      root.classList.remove("light")
      root.classList.add("dark")
      root.style.colorScheme = "dark"
    }
  }

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("lamha_theme") as Theme | null
      if (savedTheme === "light" || savedTheme === "dark") {
        setThemeState(savedTheme)
        applyTheme(savedTheme)
      } else {
        applyTheme("dark")
      }
    } catch {
      applyTheme("dark")
    }
    setMounted(true)
  }, [])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    try {
      localStorage.setItem("lamha_theme", newTheme)
    } catch {
      // Ignorar error de localStorage
    }
    applyTheme(newTheme)
  }

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark"
    setTheme(next)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, mounted }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
