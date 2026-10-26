"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { BrandLogo } from "@/components/brand-logo"
import { createClient } from "@/lib/supabase"
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Loader2, 
  AlertCircle, 
  ShieldCheck, 
  Sparkles
} from "lucide-react"
import { useLanguage, LanguageSelector } from "@/context/language-context"

export default function LoginPage() {
  const router = useRouter()
  const { t, language } = useLanguage()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)

  // Redirect if already logged in (con timeout de seguridad para que nunca se quede colgado)
  useEffect(() => {
    let mounted = true
    const timeout = setTimeout(() => {
      if (mounted) setCheckingAuth(false)
    }, 1200)

    async function checkSession() {
      try {
        const supabase = createClient()
        const userPromise = supabase.auth.getUser()
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 1200))
        const res: any = await Promise.race([userPromise, timeoutPromise])
        if (res?.data?.user && mounted) {
          router.replace("/")
          return
        }
      } catch (e) {
        // Not logged in or timeout, continue to login form
      } finally {
        if (mounted) setCheckingAuth(false)
      }
    }
    checkSession()

    return () => {
      mounted = false
      clearTimeout(timeout)
    }
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setErrorMsg(
        language === "es" 
          ? "Por favor ingrese su correo electrónico y contraseña." 
          : language === "ar" 
          ? "يرجى إدخال البريد الإلكتروني وكلمة المرور." 
          : "Veuillez saisir votre email et mot de passe."
      )
      return
    }

    setLoading(true)
    setErrorMsg(null)

    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      })

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          setErrorMsg(
            language === "es"
              ? "Credenciales incorrectas. Verifique su correo y contraseña."
              : language === "ar"
              ? "بيانات الاعتماد غير صحيحة. يرجى التحقق من البريد الإلكتروني وكلمة المرور."
              : "Identifiants incorrects. Veuillez vérifier votre email et mot de passe."
          )
        } else {
          setErrorMsg(error.message)
        }
        setLoading(false)
        return
      }

      if (data?.user) {
        const searchParams = new URLSearchParams(window.location.search)
        const destination = searchParams.get('redirectedFrom') || '/'
        window.location.href = destination
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Erreur de connexion.")
      setLoading(false)
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#0b0a09]">
        <div className="flex flex-col items-center gap-3">
          <BrandLogo width={160} color="#C69F68" showSubtitle={true} />
          <Loader2 className="w-5 h-5 text-[#c69f68] animate-spin mt-4" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-[#0b0a09] text-[#f5f2eb] relative overflow-hidden select-none">
      {/* Decorative Gold Ambient Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#c69f68]/10 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#c69f68]/10 rounded-full blur-[128px] pointer-events-none" />

      {/* Top Bar with Language Selector */}
      <header className="w-full px-6 py-5 flex items-center justify-end z-10">
        <div className="flex items-center gap-3">
          <LanguageSelector compact={false} />
        </div>
      </header>

      {/* Central Login Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 z-10">
        <div className="w-full max-w-md rounded-3xl bg-[#14120f]/90 border border-[#2d251e] shadow-2xl backdrop-blur-xl p-8 md:p-10 space-y-7 relative">
          {/* Studio Badge & Header */}
          <div className="text-center space-y-3 flex flex-col items-center">
            <Link href="/" className="hover:opacity-90 transition-opacity pb-1">
              <BrandLogo width={180} color="#f5f2eb" showSubtitle={false} />
              <h1 className="sr-only">
                {language === "es" 
                  ? "Lam7a Studios - Iniciar Sesión" 
                  : language === "ar" 
                  ? "استوديوهات لمحة - تسجيل الدخول" 
                  : "Lam7a Studios - Connexion Studio"}
              </h1>
            </Link>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1f1a15] border border-[#c69f68]/30 text-[10px] font-mono uppercase tracking-[0.2em] text-[#c69f68] font-bold">
              <Sparkles className="w-3 h-3 text-[#c69f68]" />
              <span>Studio Atelier • Administration</span>
            </div>

            <p className="text-xs text-[#8c7a6b] max-w-xs mx-auto">
              {language === "es"
                ? "Acceda al panel de gestión, ingesta de medios y entrega a clientes."
                : language === "ar"
                ? "الوصول إلى لوحة التحكم واستيراد الوسائط وتسليم العملاء."
                : "Accédez à la gestion des séances, ingesta de médias et livraisons clients."}
            </p>
          </div>

          {/* Error Alert Banner */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#a89f91]">
                {language === "es" ? "Correo Electrónico" : language === "ar" ? "البريد الإلكتروني" : "Adresse Email"}
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#c69f68]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@lam7a.ma"
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-[#0b0a09] border border-[#2b251f] text-xs text-[#f5f2eb] placeholder:text-[#554c42] focus:border-[#c69f68] focus:ring-1 focus:ring-[#c69f68]/30 outline-none transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-[#a89f91]">
                  {language === "es" ? "Contraseña" : language === "ar" ? "كلمة المرور" : "Mot de Passe"}
                </label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#c69f68]" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#0b0a09] border border-[#2b251f] text-xs text-[#f5f2eb] placeholder:text-[#554c42] focus:border-[#c69f68] focus:ring-1 focus:ring-[#c69f68]/30 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#70665a] hover:text-[#c69f68] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <label className="flex items-center gap-2 text-[#8c7a6b] cursor-pointer hover:text-[#f5f2eb] transition-colors">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-[#332b23] bg-[#1a1714] text-[#c69f68] focus:ring-[#c69f68]"
                />
                <span>{language === "es" ? "Recordarme" : language === "ar" ? "تذكرني" : "Rester connecté"}</span>
              </label>

              <span className="text-[11px] text-[#70665a] italic">
                {language === "es" ? "Acceso Seguro" : "Accès Sécurisé"}
              </span>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#c69f68] via-[#dfba85] to-[#c69f68] hover:opacity-95 text-[#0b0a09] font-serif font-bold text-sm shadow-xl shadow-[#c69f68]/15 hover:shadow-[#c69f68]/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#0b0a09]" />
                    <span>
                      {language === "es" ? "Verificando..." : language === "ar" ? "جاري التحقق..." : "Connexion en cours..."}
                    </span>
                  </>
                ) : (
                  <>
                    <span>
                      {language === "es" ? "Entrar al Atelier" : language === "ar" ? "دخول إلى الاستوديو" : "Accéder à l'Atelier"}
                    </span>
                    <ArrowRight className="w-4 h-4 text-[#0b0a09]" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Security footnote */}
          <div className="pt-3 border-t border-[#26201a] flex items-center justify-center gap-2 text-[11px] text-[#70665a]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Chiffrement SSL 256-bit • Supabase Cloud Auth</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-4 text-center text-xs text-[#554c42] z-10">
        © 2026 Lam7a Studios. Tous droits réservés. Système d'Ingestion & Gestion.
      </footer>
    </div>
  )
}
