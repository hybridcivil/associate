-- ============================================================================
-- HYBRID CIVIL — SUPABASE DATABASE MIGRATION & SCHEMA
-- Compatible with Supabase PostgreSQL, GitHub Auto-Migrations & Realtime Sync
-- ============================================================================

-- 1. Associates Table
CREATE TABLE IF NOT EXISTS public.associates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  password TEXT,
  email TEXT,
  address TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Clients Table
CREATE TABLE IF NOT EXISTS public.clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  project TEXT NOT NULL,
  price NUMERIC DEFAULT 0,
  advance NUMERIC DEFAULT 0,
  associate_id TEXT,
  date TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Transactions Table
CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  client_id TEXT,
  associate_id TEXT,
  share_type TEXT,
  amount NUMERIC DEFAULT 0,
  profit NUMERIC DEFAULT 0,
  kind TEXT,
  distribution_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
  id TEXT PRIMARY KEY,
  associate_id TEXT NOT NULL,
  date TEXT NOT NULL,
  amount NUMERIC DEFAULT 0,
  parts JSONB DEFAULT '{}'::jsonb,
  allocations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
  id TEXT PRIMARY KEY,
  sender_role TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  receiver_name TEXT,
  associate_id TEXT NOT NULL,
  subject TEXT,
  content TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  priority TEXT DEFAULT 'normal',
  category TEXT DEFAULT 'general',
  is_edited BOOLEAN DEFAULT false,
  edited_at TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. System Settings & App State
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. App Database Store (Unified snapshot backup for seamless high-resilience sync)
CREATE TABLE IF NOT EXISTS public.app_database (
  key TEXT PRIMARY KEY DEFAULT 'main',
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Enables both anon key and authenticated client read/write access
-- ============================================================================

ALTER TABLE public.associates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_database ENABLE ROW LEVEL SECURITY;

-- Associates Policies
DROP POLICY IF EXISTS "Public access for associates" ON public.associates;
CREATE POLICY "Public access for associates" ON public.associates FOR ALL USING (true) WITH CHECK (true);

-- Clients Policies
DROP POLICY IF EXISTS "Public access for clients" ON public.clients;
CREATE POLICY "Public access for clients" ON public.clients FOR ALL USING (true) WITH CHECK (true);

-- Transactions Policies
DROP POLICY IF EXISTS "Public access for transactions" ON public.transactions;
CREATE POLICY "Public access for transactions" ON public.transactions FOR ALL USING (true) WITH CHECK (true);

-- Payments Policies
DROP POLICY IF EXISTS "Public access for payments" ON public.payments;
CREATE POLICY "Public access for payments" ON public.payments FOR ALL USING (true) WITH CHECK (true);

-- Messages Policies
DROP POLICY IF EXISTS "Public access for messages" ON public.messages;
CREATE POLICY "Public access for messages" ON public.messages FOR ALL USING (true) WITH CHECK (true);

-- System Settings Policies
DROP POLICY IF EXISTS "Public access for system_settings" ON public.system_settings;
CREATE POLICY "Public access for system_settings" ON public.system_settings FOR ALL USING (true) WITH CHECK (true);

-- App Database Policies
DROP POLICY IF EXISTS "Public access for app_database" ON public.app_database;
CREATE POLICY "Public access for app_database" ON public.app_database FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime publication for tables so clients receive instant live updates
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.associates, public.clients, public.transactions, public.payments, public.messages, public.app_database;
  END IF;
EXCEPTION
  WHEN others THEN
    -- Ignore if already part of publication
    NULL;
END $$;
