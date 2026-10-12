import { createAdminClient } from "@/lib/supabase"

export type AuditAction =
  | "SESSION_CREATED"
  | "SESSION_UPDATED"
  | "SESSION_STATUS_CHANGED"
  | "SESSION_DELETED"
  | "MEDIA_BATCH_UPLOADED"
  | "MEDIA_DELETED"
  | "MEDIA_SHARED_TOGGLE"
  | "CLIENT_CREATED"
  | "CLIENT_UPDATED"
  | "CLIENT_DELETED"
  | "PLANNER_STAGE_CHANGED"
  | "DELIVERY_LINK_GENERATED"
  | "CATEGORY_CREATED"
  | "CATEGORY_UPDATED"
  | "CATEGORY_DELETED"
  | "TEAM_MEMBER_INVITED"
  | "TEAM_MEMBER_UPDATED"

export type AuditEntityType =
  | "session"
  | "media_asset"
  | "client"
  | "planner"
  | "delivery"
  | "category"
  | "team"

export interface AuditLogEntry {
  id: string
  user_id: string | null
  user_name: string
  user_email: string
  user_role: string
  action: AuditAction | string
  entity_type: AuditEntityType | string
  entity_id: string
  entity_title: string | null
  details: Record<string, any>
  ip_address: string | null
  created_at: string
}

export interface RecordAuditParams {
  userId?: string | null
  userName?: string
  userEmail?: string
  userRole?: string
  action: AuditAction | string
  entityType: AuditEntityType | string
  entityId: string
  entityTitle?: string | null
  details?: Record<string, any>
  ipAddress?: string | null
}

export interface GetAuditLogsFilter {
  entityType?: AuditEntityType | string
  entityId?: string
  userId?: string
  action?: string
  search?: string
  limit?: number
  offset?: number
}

/**
 * Registra una acción en la bitácora inmutable de auditoría.
 * Diseñado para ser no-bloqueante (fail-safe): nunca rompe la operación principal si la tabla no responde.
 */
export async function recordAuditLog(params: RecordAuditParams): Promise<boolean> {
  try {
    const supabase = createAdminClient()
    
    // Valores por defecto seguros para auditoría
    const fallbackName = params.userName || params.userEmail?.split("@")[0] || "Admin Studio"
    const fallbackEmail = params.userEmail || "admin@lamha.com"
    const fallbackRole = params.userRole || "super_admin"

    const { error } = await supabase.from("audit_logs").insert({
      user_id: params.userId || null,
      user_name: fallbackName,
      user_email: fallbackEmail,
      user_role: fallbackRole,
      action: params.action,
      entity_type: params.entityType,
      entity_id: String(params.entityId),
      entity_title: params.entityTitle || null,
      details: params.details || {},
      ip_address: params.ipAddress || null,
    })

    if (error) {
      // Si la tabla no existe en la BD remota todavía, advertir sin romper
      console.warn("[AUDIT_LOG_WARN] Podría faltar la tabla audit_logs:", error.message)
      return false
    }

    return true
  } catch (err: any) {
    console.error("[AUDIT_LOG_EXCEPTION]:", err?.message || err)
    return false
  }
}

/**
 * Obtiene los registros de auditoría filtrados.
 */
export async function getAuditLogs(filters: GetAuditLogsFilter = {}): Promise<{
  logs: AuditLogEntry[]
  total: number
}> {
  try {
    const supabase = createAdminClient()
    const limit = filters.limit || 50
    const offset = filters.offset || 0

    let query = supabase
      .from("audit_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })

    if (filters.entityType && filters.entityType !== "all") {
      query = query.eq("entity_type", filters.entityType)
    }

    if (filters.entityId) {
      query = query.eq("entity_id", filters.entityId)
    }

    if (filters.userId && filters.userId !== "all") {
      query = query.eq("user_id", filters.userId)
    }

    if (filters.action && filters.action !== "all") {
      query = query.eq("action", filters.action)
    }

    if (filters.search && filters.search.trim()) {
      const term = `%${filters.search.trim()}%`
      query = query.or(`entity_title.ilike.${term},user_name.ilike.${term},user_email.ilike.${term}`)
    }

    query = query.range(offset, offset + limit - 1)

    const { data, count, error } = await query

    if (error) {
      console.warn("[GET_AUDIT_LOGS_WARN]:", error.message)
      return { logs: [], total: 0 }
    }

    return {
      logs: (data as AuditLogEntry[]) || [],
      total: count || 0,
    }
  } catch (err) {
    console.error("[GET_AUDIT_LOGS_EXCEPTION]:", err)
    return { logs: [], total: 0 }
  }
}

/**
 * Métricas rápidas para el encabezado del panel de auditoría.
 */
export async function getAuditStats() {
  try {
    const supabase = createAdminClient()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayIso = today.toISOString()

    const { data, error } = await supabase
      .from("audit_logs")
      .select("action, user_email, created_at")
      .gte("created_at", todayIso)

    if (error || !data) {
      return { totalToday: 0, uploadsToday: 0, projectChangesToday: 0, activeUsersToday: 0 }
    }

    const uniqueUsers = new Set(data.map((d: any) => d.user_email))
    const uploads = data.filter((d: any) => d.action.includes("UPLOAD")).length
    const projectChanges = data.filter((d: any) => d.action.startsWith("SESSION_") || d.action.startsWith("PLANNER_")).length

    return {
      totalToday: data.length,
      uploadsToday: uploads,
      projectChangesToday: projectChanges,
      activeUsersToday: uniqueUsers.size,
    }
  } catch {
    return { totalToday: 0, uploadsToday: 0, projectChangesToday: 0, activeUsersToday: 0 }
  }
}
