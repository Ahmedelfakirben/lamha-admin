-- ==============================================================================
-- LAMHA STUDIOS ERP — ESQUEMA DE AUDITORÍA Y MULTIUSUARIO (RBAC & AUDIT TRAIL)
-- Compatible con PostgreSQL y Supabase
-- ==============================================================================

-- 1. TIPO ENUM DE ROLES DEL ATELIER
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'super_admin',      -- Dirección / Dueño del Atelier (Afaf): Control total y auditoría
    'studio_manager',   -- Gestión de agenda, planner, clientes y presupuestos
    'lead_photographer',-- Cobertura de sesiones, subida de brutos y entregas
    'retoucher_editor', -- Edición de color, calibración, subida de alta resolución
    'assistant'         -- Asistente de plató / visualización limitada
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. TABLA DE PERFILES DE EQUIPO (team_profiles)
CREATE TABLE IF NOT EXISTS team_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'assistant',
  avatar_url TEXT,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TABLA CENTRAL DE REGISTRO DE AUDITORÍA (audit_logs)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  user_role TEXT NOT NULL DEFAULT 'collaborator',
  
  -- Acción y Entidad afectada
  action TEXT NOT NULL, 
  -- Ej: 'SESSION_CREATED', 'SESSION_UPDATED', 'SESSION_DELETED',
  --     'MEDIA_BATCH_UPLOADED', 'MEDIA_DELETED', 'MEDIA_SHARED_TOGGLE',
  --     'CLIENT_CREATED', 'CLIENT_UPDATED',
  --     'PLANNER_STAGE_CHANGED', 'DELIVERY_LINK_GENERATED'
  
  entity_type TEXT NOT NULL, -- 'session', 'media_asset', 'client', 'planner', 'delivery', 'category', 'team'
  entity_id TEXT NOT NULL,   -- ID del proyecto, foto, cliente, etc.
  entity_title TEXT,         -- Nombre legible (ej: 'Boda Leyla & Karim', 'DSC_0412.jpg')
  
  -- Detalles en JSON (diferencias, conteos, parámetros modificados)
  details JSONB DEFAULT '{}'::jsonb,
  
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de alto rendimiento para filtrado rápido en el ERP
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- 4. COLUMNAS DE AUTORÍA Y SOFT-DELETE EN TABLAS MAESTRAS (ALTER TABLE IDEMPOTENTE)

-- En sessions (proyectos)
DO $$ BEGIN
  ALTER TABLE sessions ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  ALTER TABLE sessions ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  ALTER TABLE sessions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
  ALTER TABLE sessions ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  ALTER TABLE sessions ADD COLUMN IF NOT EXISTS lead_photographer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  ALTER TABLE sessions ADD COLUMN IF NOT EXISTS retoucher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  ALTER TABLE sessions ADD COLUMN IF NOT EXISTS assistant_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
EXCEPTION WHEN OTHERS THEN null;
END $$;

-- En clients
DO $$ BEGIN
  ALTER TABLE clients ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  ALTER TABLE clients ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  ALTER TABLE clients ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
  ALTER TABLE clients ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  ALTER TABLE clients ADD COLUMN IF NOT EXISTS assigned_manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
EXCEPTION WHEN OTHERS THEN null;
END $$;

-- En media_assets (fotos y videos)
DO $$ BEGIN
  ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
  ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS delete_reason TEXT;
EXCEPTION WHEN OTHERS THEN null;
END $$;

-- En media_deliveries (entregas)
DO $$ BEGIN
  ALTER TABLE media_deliveries ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  ALTER TABLE media_deliveries ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
EXCEPTION WHEN OTHERS THEN null;
END $$;

-- 5. POLÍTICAS DE SEGURIDAD RLS (Row Level Security)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_profiles ENABLE ROW LEVEL SECURITY;

-- Política de lectura para audit_logs: accesible para usuarios autenticados del equipo
DO $$ BEGIN
  CREATE POLICY "Team members can view audit logs"
    ON audit_logs FOR SELECT
    TO authenticated
    USING (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Política de inserción para audit_logs: cualquier usuario autenticado o service role
DO $$ BEGIN
  CREATE POLICY "Team members and system can insert audit logs"
    ON audit_logs FOR INSERT
    TO authenticated, anon
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Política para team_profiles
DO $$ BEGIN
  CREATE POLICY "Team members can view team profiles"
    ON team_profiles FOR SELECT
    TO authenticated
    USING (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Team members can update their own profile"
    ON team_profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;
