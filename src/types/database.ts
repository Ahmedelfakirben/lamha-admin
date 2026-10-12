// Lamha Studios — Supabase Types
// Auto-generated from supabase_migration.sql

export type SessionType = 'photo' | 'video'

export type SessionStatus =
  | 'pending'
  | 'shooting'
  | 'editing'
  | 'edited'
  | 'delivered'
  | 'archived'

export type SessionCategory =
  | 'wedding'
  | 'newborn'
  | 'birthday'
  | 'graduation'
  | 'event'
  | 'portrait'
  | 'product'
  | 'maternity'
  | 'other'

export type DeliveryType = 'folder_link' | 'final_link' | 'preview_link' | 'nas_path'

export type AssetType =
  | 'raw_photo'
  | 'jpg'
  | 'raw_video'
  | 'video_project'
  | 'video_final'
  | 'reel'
  | 'preset'
  | 'other'

export interface Client {
  id: string
  created_at: string
  updated_at: string
  name: string
  phone: string | null
  email: string | null
  notes: string | null
  total_sessions: number
}

export interface Session {
  id: string
  created_at: string
  updated_at: string
  session_date: string
  client_id: string | null
  client_name: string
  client_phone: string | null
  client_email: string | null
  session_type: SessionType
  category: SessionCategory
  subcategory: string | null
  status: SessionStatus
  tags: string[]
  comments: string | null
  internal_notes: string | null
  portal_pin: string | null
  selected_assets: string[]
  pipeline_stage?: string | null
  // joined
  media_deliveries?: MediaDelivery[]
  media_assets?: MediaAsset[]
}

export interface MediaDelivery {
  id: string
  created_at: string
  session_id: string
  delivery_type: DeliveryType
  url: string
  label: string | null
  delivered_at: string | null
  is_active: boolean
  password: string | null
}

export interface MediaAsset {
  id: string
  created_at: string
  session_id: string | null
  asset_type: AssetType
  filename: string | null
  nas_path: string
  size_mb: number | null
  duration_sec: number | null
  resolution: string | null
  is_archived: boolean
  notes: string | null
  preview_url: string | null
}

export interface SessionSummary {
  id: string
  session_date: string
  client_name: string
  client_phone: string | null
  session_type: SessionType
  category: SessionCategory
  status: SessionStatus
  tags: string[]
  comments: string | null
  created_at: string
  final_link: string | null
  folder_link: string | null
}

// Dashboard stats
export interface DashboardStats {
  total: number
  photo: number
  video: number
  pending: number
  editing: number
  delivered: number
  archived: number
  thisMonth: number
}

// Label maps for UI
export const STATUS_LABELS: Record<SessionStatus, string> = {
  pending:   'Pendiente',
  shooting:  'En Sesión',
  editing:   'En Edición',
  edited:    'Editado',
  delivered: 'Entregado',
  archived:  'Archivado',
}

export const STATUS_COLORS: Record<SessionStatus, string> = {
  pending:   'bg-gray-100 text-gray-600',
  shooting:  'bg-blue-100 text-blue-700',
  editing:   'bg-amber-100 text-amber-700',
  edited:    'bg-yellow-100 text-yellow-700',
  delivered: 'bg-green-100 text-green-700',
  archived:  'bg-slate-100 text-slate-500',
}

export const CATEGORY_LABELS: Record<SessionCategory, string> = {
  wedding:    'Boda',
  newborn:    'Recién Nacido',
  birthday:   'Cumpleaños / Chadda',
  graduation: 'Graduación / Soutenance',
  event:      'Evento',
  portrait:   'Retrato Editorial',
  product:    'Producto',
  maternity:  'Maternidad',
  other:      'Otro',
}

export const TYPE_LABELS: Record<SessionType, string> = {
  photo: '📸 Foto',
  video: '🎬 Video',
}

export const TAG_OPTIONS = [
  { value: 'usb',       label: '💾 USB' },
  { value: 'reel',      label: '📱 Reel' },
  { value: 'best_of',   label: '🌟 Best Of' },
  { value: 'long',      label: '📺 Long' },
  { value: 'instagram', label: '📸 Instagram' },
  { value: 'album',     label: '📗 Álbum' },
]

export interface Category {
  id: string
  slug: string
  name: string
  name_fr?: string | null
  name_en?: string | null
  name_ar?: string | null
  description?: string | null
  cover_image_url?: string | null
  display_order: number
  is_active: boolean
  created_at?: string
  updated_at?: string
  subcategories?: Subcategory[]
  media_count?: number
}

export interface Subcategory {
  id: string
  category_id: string
  slug: string
  name: string
  name_fr?: string | null
  name_en?: string | null
  name_ar?: string | null
  description?: string | null
  cover_image_url?: string | null
  display_order: number
  is_active: boolean
  created_at?: string
  updated_at?: string
  media_count?: number
}

export interface CategoryMedia {
  id: string
  category_id: string
  subcategory_id?: string | null
  image_url: string
  thumbnail_url?: string | null
  title?: string | null
  title_fr?: string | null
  title_en?: string | null
  title_ar?: string | null
  description?: string | null
  is_featured: boolean
  display_order: number
  created_at?: string
}

