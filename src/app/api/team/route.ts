import { NextResponse } from "next/server"
import { createServiceRoleClient, createClient } from "@/lib/supabase"
import { recordAuditLog } from "@/lib/audit"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const adminClient = createServiceRoleClient()

    // 1. Obtener perfiles de la tabla team_profiles con Service Role (evita bloqueo RLS en servidor sin cookies)
    const { data: profiles, error: profileErr } = await adminClient
      .from("team_profiles")
      .select("*")
      .order("created_at", { ascending: false })

    // 2. Sincronizar también con auth.users para que cualquier usuario de Auth (como el admin principal) aparezca siempre
    try {
      const { data: authData, error: authErr } = await adminClient.auth.admin.listUsers()

      if (!authErr && authData && authData.users) {
        const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]))
        const mergedMembers: any[] = [...(profiles || [])]

        for (const u of authData.users) {
          if (!profileMap.has(u.id)) {
            const defaultRole =
              u.user_metadata?.role ||
              (u.email?.includes("admin") || u.email?.includes("afaf") ? "super_admin" : "assistant")
            const defaultName =
              u.user_metadata?.full_name ||
              (u.email?.includes("admin") ? "Admin Lam7a Studio" : u.email?.split("@")[0] || "Miembro")

            const newProfile = {
              id: u.id,
              email: u.email || "",
              full_name: defaultName,
              role: defaultRole,
              avatar_url: u.user_metadata?.avatar_url || null,
              phone: u.phone || null,
              is_active: true,
              last_login_at: u.last_sign_in_at,
              created_at: u.created_at,
            }
            mergedMembers.push(newProfile)
            try {
              await adminClient.from("team_profiles").upsert(newProfile)
            } catch {}
          }
        }

        return NextResponse.json({ success: true, members: mergedMembers })
      }
    } catch {
      // Ignorar fallo de auth.admin para no bloquear la interfaz
    }

    if (!profileErr && profiles) {
      return NextResponse.json({ success: true, members: profiles })
    }

    return NextResponse.json({ success: true, members: [] })
  } catch (err: any) {
    return NextResponse.json({ success: true, members: [], warning: err.message })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, password, full_name, role, phone, creatorContext } = body

    if (!email || !password || !full_name) {
      return NextResponse.json(
        { success: false, error: "Email, contraseña y nombre completo son obligatorios." },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()
    const assignedRole = role || "assistant"

    // 1. Crear el usuario en Supabase Auth
    // Nota: No pasamos `role` en el INSERT inicial de auth.users porque existe un trigger legacy
    // hacia `public.profiles` cuya restricción CHECK solo acepta 'admin'. Asignamos `role` en
    // user_metadata justo después mediante updateUserById y en `team_profiles`.
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: email.trim(),
      password: password.trim(),
      email_confirm: true,
      user_metadata: {
        full_name: full_name.trim(),
      },
    })

    if (authError) {
      return NextResponse.json({ success: false, error: authError.message }, { status: 400 })
    }

    const userId = authUser.user.id

    // 1b. Actualizar user_metadata con el rol del atelier (sin disparar el trigger AFTER INSERT de profiles)
    await supabase.auth.admin
      .updateUserById(userId, {
        user_metadata: {
          full_name: full_name.trim(),
          role: assignedRole,
        },
      })
      .catch(() => {})

    // 2. Insertar o actualizar en la tabla team_profiles
    try {
      await supabase.from("team_profiles").upsert({
        id: userId,
        email: email.trim(),
        full_name: full_name.trim(),
        role: assignedRole,
        phone: phone?.trim() || null,
        is_active: true,
      })
    } catch (e: any) {
      console.warn("No se pudo insertar en team_profiles (quizá no se ha ejecutado el SQL aún):", e.message)
    }

    // 3. Registrar en Auditoría inmutable
    await recordAuditLog({
      action: "TEAM_MEMBER_INVITED",
      entityType: "team",
      entityId: userId,
      entityTitle: full_name.trim(),
      details: {
        email: email.trim(),
        role: assignedRole,
        phone: phone || null,
      },
      userId: creatorContext?.userId,
      userName: creatorContext?.userName,
      userEmail: creatorContext?.userEmail,
      userRole: creatorContext?.userRole,
    })

    return NextResponse.json({
      success: true,
      member: {
        id: userId,
        email: email.trim(),
        full_name: full_name.trim(),
        role: assignedRole,
        is_active: true,
      },
      message: `Usuario ${full_name} creado con éxito. Ya puede iniciar sesión.`,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const { id, role, is_active, password, full_name, userContext } = body

    if (!id) {
      return NextResponse.json({ success: false, error: "ID de usuario requerido." }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // 1. Actualizar contraseña o metadata en Auth si se proporcionan
    const authUpdatePayload: any = {}
    if (password && password.trim().length >= 6) {
      authUpdatePayload.password = password.trim()
    }
    if (role || full_name) {
      authUpdatePayload.user_metadata = {
        ...(role ? { role } : {}),
        ...(full_name ? { full_name } : {}),
      }
    }

    if (Object.keys(authUpdatePayload).length > 0) {
      const { error: updateAuthErr } = await supabase.auth.admin.updateUserById(id, authUpdatePayload)
      if (updateAuthErr) {
        return NextResponse.json({ success: false, error: updateAuthErr.message }, { status: 400 })
      }
    }

    // 2. Actualizar en team_profiles
    const profileUpdate: any = {}
    if (role) profileUpdate.role = role
    if (typeof is_active === "boolean") profileUpdate.is_active = is_active
    if (full_name) profileUpdate.full_name = full_name

    try {
      await supabase.from("team_profiles").update(profileUpdate).eq("id", id)
    } catch (e: any) {
      console.warn("No se pudo actualizar team_profiles:", e.message)
    }

    // 3. Auditoría
    await recordAuditLog({
      action: "TEAM_MEMBER_UPDATED",
      entityType: "team",
      entityId: id,
      details: { ...profileUpdate, passwordChanged: Boolean(password) },
      userId: userContext?.userId,
      userName: userContext?.userName,
      userEmail: userContext?.userEmail,
    })

    return NextResponse.json({ success: true, message: "Miembro del equipo actualizado correctamente." })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ success: false, error: "ID de usuario requerido." }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Eliminar de auth
    const { error: delErr } = await supabase.auth.admin.deleteUser(id)
    if (delErr) {
      return NextResponse.json({ success: false, error: delErr.message }, { status: 400 })
    }

    // Eliminar de team_profiles si existe
    try {
      await supabase.from("team_profiles").delete().eq("id", id)
    } catch {}

    await recordAuditLog({
      action: "TEAM_MEMBER_UPDATED",
      entityType: "team",
      entityId: id,
      details: { deleted: true },
    })

    return NextResponse.json({ success: true, message: "Usuario eliminado del sistema correctamente." })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
