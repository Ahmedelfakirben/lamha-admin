"use client"

import { useState, useEffect } from "react"
import { 
  Users, 
  UserPlus, 
  UserCheck, 
  Camera, 
  Palette, 
  Key, 
  Trash2, 
  RefreshCw, 
  Check, 
  Eye, 
  EyeOff, 
  Sparkles, 
  Phone, 
  Mail, 
  User, 
  ShieldAlert
} from "lucide-react"
import { useLanguage } from "@/context/language-context"

interface TeamMember {
  id: string
  email: string
  full_name: string
  role: "super_admin" | "studio_manager" | "lead_photographer" | "retoucher_editor" | "assistant" | string
  avatar_url?: string | null
  phone?: string | null
  is_active: boolean
  last_login_at?: string | null
  created_at: string
}

const TEAM_I18N = {
  es: {
    title: "Equipo del Atelier & Control de Acceso (Multi-Usuario)",
    subtitle: "Gestiona a los fotógrafos, retocadores y administradores del estudio. Cada acción queda firmada a su nombre en la auditoría.",
    rbacTag: "RBAC & Trazabilidad",
    reloadTooltip: "Recargar equipo",
    createMember: "+ Crear Miembro",
    loading: "Cargando miembros del atelier...",
    noMembers: "No hay colaboradores registrados todavía en team_profiles. Puedes dar de alta usuarios o ejecutar el script de auditoría.",
    suspended: "Suspendido",
    changeRoleTooltip: "Cambiar rol",
    changePasswordTooltip: "Cambiar contraseña",
    deactivateTooltip: "Desactivar acceso",
    activateTooltip: "Activar acceso",
    deleteTooltip: "Eliminar usuario",
    super_admin: "Director / Super Admin",
    studio_manager: "Studio Manager",
    lead_photographer: "Fotógrafo Principal",
    retoucher_editor: "Retocador / Editor",
    assistant: "Asistente de Plató",
    newMemberTitle: "Dar de Alta Nuevo Colaborador",
    fullNameLabel: "Nombre Completo *",
    emailLabel: "Correo Electrónico (Login) *",
    roleLabel: "Rol en el Atelier *",
    passwordLabel: "Contraseña Inicial *",
    generateRandom: "Generar aleatoria",
    phoneLabel: "Teléfono / WhatsApp (Opcional)",
    cancel: "Cancelar",
    creating: "Creando...",
    createBtn: "Crear y Dar Acceso",
    resetPasswordTitle: "Nueva Contraseña para",
    newPasswordLabel: "Nueva Contraseña (mínimo 6 caracteres)",
    savePasswordBtn: "Guardar Contraseña",
    confirmDelete: "¿Estás seguro de eliminar el acceso de",
    deleteError: "Error al eliminar:",
    passwordUpdated: "Contraseña actualizada con éxito para",
    namePlaceholder: "Ej: Karim Benali",
    emailPlaceholder: "colaborador@lam7a.ma",
    passwordPlaceholder: "Mínimo 6 caracteres",
  },
  fr: {
    title: "Équipe de l'Atelier & Contrôle d'Accès (Multi-Utilisateurs)",
    subtitle: "Gérez les photographes, retoucheurs et administrateurs du studio. Chaque action est signée à leur nom dans l'audit.",
    rbacTag: "RBAC & Traçabilité",
    reloadTooltip: "Recharger l'équipe",
    createMember: "+ Créer un Membre",
    loading: "Chargement des membres de l'atelier...",
    noMembers: "Aucun collaborateur enregistré pour le moment. Vous pouvez créer des utilisateurs ou exécuter le script d'audit.",
    suspended: "Suspendu",
    changeRoleTooltip: "Changer de rôle",
    changePasswordTooltip: "Modifier le mot de passe",
    deactivateTooltip: "Désactiver l'accès",
    activateTooltip: "Activer l'accès",
    deleteTooltip: "Supprimer l'utilisateur",
    super_admin: "Directeur / Super Admin",
    studio_manager: "Studio Manager",
    lead_photographer: "Photographe Principal",
    retoucher_editor: "Retoucheur / Éditeur",
    assistant: "Assistant Plateau",
    newMemberTitle: "Ajout d'un Nouveau Collaborateur",
    fullNameLabel: "Nom Complet *",
    emailLabel: "Adresse Email (Connexion) *",
    roleLabel: "Rôle dans l'Atelier *",
    passwordLabel: "Mot de passe Initial *",
    generateRandom: "Générer aléatoire",
    phoneLabel: "Téléphone / WhatsApp (Optionnel)",
    cancel: "Annuler",
    creating: "Création...",
    createBtn: "Créer et Donner Accès",
    resetPasswordTitle: "Nouveau Mot de Passe pour",
    newPasswordLabel: "Nouveau mot de passe (min 6 caractères)",
    savePasswordBtn: "Enregistrer le mot de passe",
    confirmDelete: "Êtes-vous sûr de vouloir supprimer l'accès de",
    deleteError: "Erreur lors de la suppression :",
    passwordUpdated: "Mot de passe mis à jour avec succès pour",
    namePlaceholder: "Ex : Karim Benali",
    emailPlaceholder: "collaborateur@lam7a.ma",
    passwordPlaceholder: "Minimum 6 caractères",
  },
  en: {
    title: "Atelier Team & Access Control (Multi-User)",
    subtitle: "Manage photographers, retouchers, and studio administrators. Every action is signed under their name in the audit log.",
    rbacTag: "RBAC & Audit Trail",
    reloadTooltip: "Reload team",
    createMember: "+ Create Member",
    loading: "Loading atelier members...",
    noMembers: "No team members registered yet in team_profiles. You can create users or run the audit schema script.",
    suspended: "Suspended",
    changeRoleTooltip: "Change role",
    changePasswordTooltip: "Change password",
    deactivateTooltip: "Deactivate access",
    activateTooltip: "Activate access",
    deleteTooltip: "Delete user",
    super_admin: "Director / Super Admin",
    studio_manager: "Studio Manager",
    lead_photographer: "Lead Photographer",
    retoucher_editor: "Retoucher / Editor",
    assistant: "Studio Assistant",
    newMemberTitle: "Register New Team Member",
    fullNameLabel: "Full Name *",
    emailLabel: "Email Address (Login) *",
    roleLabel: "Atelier Role *",
    passwordLabel: "Initial Password *",
    generateRandom: "Generate random",
    phoneLabel: "Phone / WhatsApp (Optional)",
    cancel: "Cancel",
    creating: "Creating...",
    createBtn: "Create & Grant Access",
    resetPasswordTitle: "New Password for",
    newPasswordLabel: "New Password (min 6 characters)",
    savePasswordBtn: "Save Password",
    confirmDelete: "Are you sure you want to remove access for",
    deleteError: "Error while deleting:",
    passwordUpdated: "Password successfully updated for",
    namePlaceholder: "e.g. Karim Benali",
    emailPlaceholder: "collaborator@lam7a.ma",
    passwordPlaceholder: "Minimum 6 characters",
  },
  ar: {
    title: "فريق العمل والتحكم في الوصول (متعدد المستخدمين)",
    subtitle: "إدارة المصورين والمعدلين ومسؤولي الاستوديو. يتم توثيق وتسجيل كل إجراء بأسمائهم في سجل التدقيق.",
    rbacTag: "الصلاحيات والتتبع RBAC",
    reloadTooltip: "إعادة تحميل الفريق",
    createMember: "+ إضافة عضو جديد",
    loading: "جاري تحميل أعضاء الفريق...",
    noMembers: "لا يوجد أعضاء مسجلين في جدول team_profiles حتى الآن. يمكنك إنشاء مستخدمين أو تنفيذ سكربت التدقيق في Supabase.",
    suspended: "معطل",
    changeRoleTooltip: "تغيير الصلاحية",
    changePasswordTooltip: "تغيير كلمة المرور",
    deactivateTooltip: "تعطيل الحساب",
    activateTooltip: "تفعيل الحساب",
    deleteTooltip: "حذف المستخدم",
    super_admin: "المدير العام (Super Admin)",
    studio_manager: "مدير الاستوديو",
    lead_photographer: "المصور الرئيسي",
    retoucher_editor: "معدل الصور / محرر",
    assistant: "مساعد استوديو",
    newMemberTitle: "تسجيل عضو جديد بالفريق",
    fullNameLabel: "الاسم الكامل *",
    emailLabel: "البريد الإلكتروني (تسجيل الدخول) *",
    roleLabel: "الصلاحية في الاستوديو *",
    passwordLabel: "كلمة المرور الأولية *",
    generateRandom: "توليد عشوائي",
    phoneLabel: "الهاتف / واتساب (اختياري)",
    cancel: "إلغاء",
    creating: "جاري الإنشاء...",
    createBtn: "إنشاء ومنح الوصول",
    resetPasswordTitle: "كلمة مرور جديدة للمستخدم",
    newPasswordLabel: "كلمة المرور الجديدة (6 أحرف على الأقل)",
    savePasswordBtn: "حفظ كلمة المرور",
    confirmDelete: "هل أنت متأكد من رغبتك في حذف وصول",
    deleteError: "خطأ أثناء الحذف:",
    passwordUpdated: "تم تحديث كلمة المرور بنجاح للمستخدم",
    namePlaceholder: "مثال: كريم بنعلي",
    emailPlaceholder: "member@lam7a.ma",
    passwordPlaceholder: "6 أحرف كحد أدنى",
  }
}

export function TeamManagementCard() {
  const { language } = useLanguage()
  const isRTL = language === "ar"
  const strings = TEAM_I18N[language as keyof typeof TEAM_I18N] || TEAM_I18N.es

  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // New member form
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("lead_photographer")
  const [password, setPassword] = useState("")
  const [phone, setPhone] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  // Password reset modal state
  const [resettingUser, setResettingUser] = useState<TeamMember | null>(null)
  const [newPassword, setNewPassword] = useState("")

  const loadMembers = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/team")
      const data = await res.json()
      if (data.success && data.members) {
        setMembers(data.members)
      } else {
        // En caso de aviso sin fallar
        setMembers(data.members || [])
      }
    } catch (err: any) {
      console.warn("Error cargando equipo:", err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMembers()
  }, [])

  const handleGeneratePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%"
    let gen = ""
    for (let i = 0; i < 10; i++) {
      gen += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setPassword(gen)
    setShowPassword(true)
  }

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !password.trim()) {
      setMessage({ type: "error", text: "Por favor completa el nombre, correo y contraseña." })
      return
    }

    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: name.trim(),
          email: email.trim(),
          role,
          password: password.trim(),
          phone: phone.trim() || null,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setMessage({ type: "success", text: `¡Usuario ${name} registrado con éxito!` })
        setShowAddModal(false)
        setName("")
        setEmail("")
        setPassword("")
        setPhone("")
        loadMembers()
      } else {
        setMessage({ type: "error", text: data.error || "No se pudo crear el usuario." })
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message })
    } finally {
      setSaving(false)
      setTimeout(() => setMessage(null), 6000)
    }
  }

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    try {
      const res = await fetch("/api/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: memberId, role: newRole }),
      })
      const data = await res.json()
      if (data.success) {
        setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)))
      } else {
        alert("Error al actualizar rol: " + data.error)
      }
    } catch (e: any) {
      alert("Error: " + e.message)
    }
  }

  const handleToggleActive = async (member: TeamMember) => {
    const nextState = !member.is_active
    try {
      const res = await fetch("/api/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: member.id, is_active: nextState }),
      })
      const data = await res.json()
      if (data.success) {
        setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, is_active: nextState } : m)))
      } else {
        alert("Error: " + data.error)
      }
    } catch (e: any) {
      alert("Error: " + e.message)
    }
  }

  const handleDeleteMember = async (member: TeamMember) => {
    if (!confirm(`${strings.confirmDelete} ${member.full_name} (${member.email})?`)) {
      return
    }

    try {
      const res = await fetch(`/api/team?id=${member.id}`, { method: "DELETE" })
      const data = await res.json()
      if (data.success) {
        setMembers((prev) => prev.filter((m) => m.id !== member.id))
      } else {
        alert(`${strings.deleteError} ${data.error}`)
      }
    } catch (e: any) {
      alert("Error: " + e.message)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resettingUser || newPassword.length < 6) return
    try {
      const res = await fetch("/api/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: resettingUser.id, password: newPassword }),
      })
      const data = await res.json()
      if (data.success) {
        alert(`${strings.passwordUpdated} ${resettingUser.full_name}.`)
        setResettingUser(null)
        setNewPassword("")
      } else {
        alert("Error: " + data.error)
      }
    } catch (e: any) {
      alert("Error: " + e.message)
    }
  }

  const getRoleBadge = (r: string) => {
    switch (r) {
      case "super_admin":
        return { label: strings.super_admin, color: "text-[#c69f68] bg-[#c69f68]/15 border-[#c69f68]/30", icon: Sparkles }
      case "studio_manager":
        return { label: strings.studio_manager, color: "text-amber-400 bg-amber-500/15 border-amber-500/30", icon: UserCheck }
      case "lead_photographer":
        return { label: strings.lead_photographer, color: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30", icon: Camera }
      case "retoucher_editor":
        return { label: strings.retoucher_editor, color: "text-purple-400 bg-purple-500/15 border-purple-500/30", icon: Palette }
      default:
        return { label: strings.assistant, color: "text-[#a89f91] bg-[#1a1714] border-[#26211c]", icon: User }
    }
  }

  return (
    <div className="rounded-2xl border border-[#26211c] bg-[#141210] p-6 shadow-xl space-y-6 md:col-span-2" dir={isRTL ? "rtl" : "ltr"}>
      {/* Toast message */}
      {message && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-lg animate-in fade-in ${
            message.type === "success"
              ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
              : "bg-rose-500/15 border-rose-500/40 text-rose-300"
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#26211c]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#c69f68]/15 border border-[#c69f68]/30 flex items-center justify-center text-[#c69f68]">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-[#f5f2eb] font-serif">
                {strings.title}
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#1c1815] text-[#c69f68] border border-[#c69f68]/30">
                {strings.rbacTag}
              </span>
            </div>
            <p className="text-xs text-[#8c7a6b]">
              {strings.subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadMembers}
            disabled={loading}
            className="p-2 rounded-xl bg-[#181613] hover:bg-[#201c18] border border-[#26211c] text-[#a89f91] hover:text-[#c69f68] transition-colors cursor-pointer"
            title={strings.reloadTooltip}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="h-9 px-4 rounded-xl bg-gradient-to-r from-[#c69f68] to-[#dfba85] text-[#0b0a09] text-xs font-bold flex items-center gap-2 shadow-md hover:brightness-105 active:scale-95 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-[#0b0a09]" />
            <span>{strings.createMember}</span>
          </button>
        </div>
      </div>

      {/* Members List */}
      {loading ? (
        <div className="py-12 text-center text-[#8c7a6b] text-xs flex flex-col items-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-[#c69f68]" />
          <span>{strings.loading}</span>
        </div>
      ) : members.length === 0 ? (
        <div className="py-8 text-center text-[#70665a] text-xs bg-[#0b0a09] rounded-xl border border-[#26211c] p-4">
          <Users className="w-6 h-6 mx-auto mb-2 text-[#c69f68]/40" />
          <span>{strings.noMembers}</span>
        </div>
      ) : (
        <div className="space-y-2.5">
          {members.map((member) => {
            const badge = getRoleBadge(member.role)
            const RoleIcon = badge.icon

            return (
              <div
                key={member.id}
                className="p-3.5 rounded-xl bg-[#161412] border border-[#26211c] hover:border-[#383027] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                {/* User info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#c69f68]/25 to-[#1c1815] border border-[#c69f68]/40 flex items-center justify-center text-[#c69f68] font-bold text-xs shrink-0">
                    {member.full_name ? member.full_name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-[#f5f2eb] truncate">{member.full_name}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border flex items-center gap-1 ${badge.color}`}>
                        <RoleIcon className="w-2.5 h-2.5" />
                        <span>{badge.label}</span>
                      </span>
                      {!member.is_active && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950/60 text-rose-400 border border-rose-800/40 font-bold">
                          {strings.suspended}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-[#70665a] font-mono mt-0.5">
                      <span>{member.email}</span>
                      {member.phone && <span>• {member.phone}</span>}
                    </div>
                  </div>
                </div>

                {/* Actions & Role Switcher */}
                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  {/* Role dropdown */}
                  <select
                    value={member.role}
                    onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                    className="h-8 px-2.5 rounded-lg bg-[#0b0a09] border border-[#26211c] text-[#d4cbbf] text-[11px] focus:outline-none focus:border-[#c69f68]/60 cursor-pointer"
                    title={strings.changeRoleTooltip}
                  >
                    <option value="super_admin">{strings.super_admin}</option>
                    <option value="studio_manager">{strings.studio_manager}</option>
                    <option value="lead_photographer">{strings.lead_photographer}</option>
                    <option value="retoucher_editor">{strings.retoucher_editor}</option>
                    <option value="assistant">{strings.assistant}</option>
                  </select>

                  {/* Reset Password button */}
                  <button
                    type="button"
                    onClick={() => {
                      setResettingUser(member)
                      setNewPassword("")
                    }}
                    className="p-1.5 rounded-lg bg-[#1a1714] hover:bg-[#25201b] border border-[#26211c] text-[#a89f91] hover:text-[#c69f68] transition-colors"
                    title={strings.changePasswordTooltip}
                  >
                    <Key className="w-3.5 h-3.5" />
                  </button>

                  {/* Toggle active status */}
                  <button
                    type="button"
                    onClick={() => handleToggleActive(member)}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      member.is_active
                        ? "bg-[#1a1714] hover:bg-rose-950/40 border-[#26211c] hover:border-rose-800/50 text-[#a89f91] hover:text-rose-300"
                        : "bg-emerald-950/30 hover:bg-emerald-950/50 border-emerald-800/50 text-emerald-400"
                    }`}
                    title={member.is_active ? strings.deactivateTooltip : strings.activateTooltip}
                  >
                    {member.is_active ? (
                      <span className="text-[10px] font-bold px-1 text-emerald-400">ON</span>
                    ) : (
                      <span className="text-[10px] font-bold px-1 text-rose-400">OFF</span>
                    )}
                  </button>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => handleDeleteMember(member)}
                    className="p-1.5 rounded-lg bg-[#1a1714] hover:bg-rose-950/40 border border-[#26211c] hover:border-rose-900/50 text-[#70665a] hover:text-rose-400 transition-colors"
                    title={strings.deleteTooltip}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modal: Crear Nuevo Miembro ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm [html.light_&]:bg-black/35 animate-in fade-in" dir={isRTL ? "rtl" : "ltr"}>
          <div className="w-full max-w-md bg-[#141210] border border-[#26211c] rounded-2xl shadow-2xl p-6 space-y-4 [html.light_&]:bg-white [html.light_&]:border-[#e6dfcf] [html.light_&]:text-[#1c1917]">
            <div className="flex items-center justify-between border-b border-[#26211c] [html.light_&]:border-[#e6dfcf] pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#c69f68]" />
                <h3 className="text-base font-serif font-bold text-[#f5f2eb] [html.light_&]:text-[#1c1917]">
                  {strings.newMemberTitle}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-[#8c7a6b] hover:text-[#f5f2eb] [html.light_&]:hover:text-[#1c1917] p-1 rounded-lg hover:bg-[#1a1714] [html.light_&]:hover:bg-[#f2ede1] transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMember} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#a89f91] [html.light_&]:text-[#5a4e40] font-semibold mb-1">{strings.fullNameLabel}</label>
                <div className="relative">
                  <User className={`w-4 h-4 text-[#70665a] absolute ${isRTL ? "right-3" : "left-3"} top-1/2 -translate-y-1/2`} />
                  <input
                    type="text"
                    required
                    placeholder={strings.namePlaceholder}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full h-9 ${isRTL ? "pr-9 pl-3" : "pl-9 pr-3"} rounded-xl bg-[#181613] [html.light_&]:bg-[#f7f3ea] border border-[#26211c] [html.light_&]:border-[#e6dfcf] text-[#f5f2eb] [html.light_&]:text-[#1c1917] focus:outline-none focus:border-[#c69f68] transition-colors`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#a89f91] [html.light_&]:text-[#5a4e40] font-semibold mb-1">{strings.emailLabel}</label>
                <div className="relative">
                  <Mail className={`w-4 h-4 text-[#70665a] absolute ${isRTL ? "right-3" : "left-3"} top-1/2 -translate-y-1/2`} />
                  <input
                    type="email"
                    required
                    placeholder={strings.emailPlaceholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full h-9 ${isRTL ? "pr-9 pl-3" : "pl-9 pr-3"} rounded-xl bg-[#181613] [html.light_&]:bg-[#f7f3ea] border border-[#26211c] [html.light_&]:border-[#e6dfcf] text-[#f5f2eb] [html.light_&]:text-[#1c1917] focus:outline-none focus:border-[#c69f68] transition-colors`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#a89f91] [html.light_&]:text-[#5a4e40] font-semibold mb-1">{strings.roleLabel}</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl bg-[#181613] [html.light_&]:bg-[#f7f3ea] border border-[#26211c] [html.light_&]:border-[#e6dfcf] text-[#f5f2eb] [html.light_&]:text-[#1c1917] focus:outline-none focus:border-[#c69f68] cursor-pointer transition-colors"
                >
                  <option value="lead_photographer">📸 {strings.lead_photographer}</option>
                  <option value="retoucher_editor">🎨 {strings.retoucher_editor}</option>
                  <option value="studio_manager">📋 {strings.studio_manager}</option>
                  <option value="super_admin">👑 {strings.super_admin}</option>
                  <option value="assistant">🎬 {strings.assistant}</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[#a89f91] [html.light_&]:text-[#5a4e40] font-semibold">{strings.passwordLabel}</label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-[10px] text-[#c69f68] hover:underline"
                  >
                    {strings.generateRandom}
                  </button>
                </div>
                <div className="relative">
                  <Key className={`w-4 h-4 text-[#70665a] absolute ${isRTL ? "right-3" : "left-3"} top-1/2 -translate-y-1/2`} />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    placeholder={strings.passwordPlaceholder}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full h-9 ${isRTL ? "pr-9 pl-10" : "pl-9 pr-10"} rounded-xl bg-[#181613] [html.light_&]:bg-[#f7f3ea] border border-[#26211c] [html.light_&]:border-[#e6dfcf] text-[#f5f2eb] [html.light_&]:text-[#1c1917] focus:outline-none focus:border-[#c69f68] font-mono transition-colors`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute ${isRTL ? "left-3" : "right-3"} top-1/2 -translate-y-1/2 text-[#70665a] hover:text-[#f5f2eb] [html.light_&]:hover:text-[#1c1917]`}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[#a89f91] [html.light_&]:text-[#5a4e40] font-semibold mb-1">{strings.phoneLabel}</label>
                <div className="relative">
                  <Phone className={`w-4 h-4 text-[#70665a] absolute ${isRTL ? "right-3" : "left-3"} top-1/2 -translate-y-1/2`} />
                  <input
                    type="tel"
                    placeholder="+212 600-000000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={`w-full h-9 ${isRTL ? "pr-9 pl-3" : "pl-9 pr-3"} rounded-xl bg-[#181613] [html.light_&]:bg-[#f7f3ea] border border-[#26211c] [html.light_&]:border-[#e6dfcf] text-[#f5f2eb] [html.light_&]:text-[#1c1917] focus:outline-none focus:border-[#c69f68] transition-colors`}
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#26211c] [html.light_&]:border-[#e6dfcf]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#181613] [html.light_&]:bg-[#f2ede1] text-[#a89f91] [html.light_&]:text-[#5a4e40] hover:text-[#f5f2eb] [html.light_&]:hover:text-[#1c1917] text-xs font-semibold cursor-pointer transition-colors"
                >
                  {strings.cancel}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#c69f68] to-[#dfba85] text-[#0b0a09] text-xs font-bold hover:brightness-105 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{strings.creating}</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{strings.createBtn}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Cambiar Contraseña ── */}
      {resettingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm [html.light_&]:bg-black/35 animate-in fade-in" dir={isRTL ? "rtl" : "ltr"}>
          <div className="w-full max-w-sm bg-[#141210] border border-[#26211c] rounded-2xl shadow-2xl p-6 space-y-4 [html.light_&]:bg-white [html.light_&]:border-[#e6dfcf] [html.light_&]:text-[#1c1917]">
            <div className="flex items-center justify-between border-b border-[#26211c] [html.light_&]:border-[#e6dfcf] pb-3">
              <h3 className="text-sm font-serif font-bold text-[#f5f2eb] [html.light_&]:text-[#1c1917]">
                {strings.resetPasswordTitle} {resettingUser.full_name}
              </h3>
              <button
                type="button"
                onClick={() => setResettingUser(null)}
                className="text-[#8c7a6b] hover:text-[#f5f2eb] [html.light_&]:hover:text-[#1c1917] p-1 rounded-lg hover:bg-[#1a1714] [html.light_&]:hover:bg-[#f2ede1] transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#a89f91] [html.light_&]:text-[#5a4e40] font-semibold mb-1">{strings.newPasswordLabel}</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder={strings.passwordPlaceholder}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl bg-[#181613] [html.light_&]:bg-[#f7f3ea] border border-[#26211c] [html.light_&]:border-[#e6dfcf] text-[#f5f2eb] [html.light_&]:text-[#1c1917] focus:outline-none focus:border-[#c69f68] font-mono transition-colors"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#26211c] [html.light_&]:border-[#e6dfcf]">
                <button
                  type="button"
                  onClick={() => setResettingUser(null)}
                  className="px-3 py-1.5 rounded-lg bg-[#181613] [html.light_&]:bg-[#f2ede1] text-[#a89f91] [html.light_&]:text-[#5a4e40] hover:text-[#f5f2eb] [html.light_&]:hover:text-[#1c1917] text-xs transition-colors"
                >
                  {strings.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#c69f68] text-[#0b0a09] font-bold text-xs hover:brightness-105 active:scale-95 transition-all shadow-md"
                >
                  {strings.savePasswordBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
