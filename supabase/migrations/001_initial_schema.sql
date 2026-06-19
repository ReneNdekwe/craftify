-- ============================================================
-- Craftify Emergency — Supabase Database Schema
-- ============================================================

-- 1. ENUMS
-- ============================================================
CREATE TYPE job_status AS ENUM ('OPEN', 'ACCEPTED', 'COMPLETED', 'PAID', 'CANCELLED');
CREATE TYPE worker_status AS ENUM ('ACTIVE', 'INACTIVE');

-- 2. CATEGORIES
-- ============================================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  icon TEXT, -- emoji or icon identifier
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default categories
INSERT INTO categories (name, icon, description) VALUES
  ('Plumber', '🔧', 'Pipe repairs, leaks, drain clearing, water heater issues'),
  ('Electrician', '⚡', 'Electrical faults, power outages, wiring, circuit breakers'),
  ('Locksmith', '🔑', 'Lockouts, lock changes, key cutting, security upgrades'),
  ('HVAC', '❄️', 'Heating, ventilation, air conditioning repairs'),
  ('Glass Repair', '🪟', 'Broken windows, glass door repairs, emergency boarding'),
  ('General Handyman', '🛠️', 'General repairs, furniture assembly, odd jobs'),
  ('Pest Control', '🐛', 'Emergency pest removal, fumigation'),
  ('Roofing', '🏠', 'Roof leaks, storm damage, emergency tarping');

-- 3. CUSTOMERS
-- ============================================================
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. WORKERS
-- ============================================================
CREATE TABLE workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id),
  latitude FLOAT8 NOT NULL DEFAULT 0,
  longitude FLOAT8 NOT NULL DEFAULT 0,
  status worker_status NOT NULL DEFAULT 'ACTIVE',
  stripe_account_id TEXT,
  rating NUMERIC(3,2) DEFAULT 5.00,
  jobs_completed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workers_category ON workers(category_id);
CREATE INDEX idx_workers_status ON workers(status);

-- 5. JOBS
-- ============================================================
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  worker_id UUID REFERENCES workers(id),
  category_id UUID NOT NULL REFERENCES categories(id),
  description TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude FLOAT8 NOT NULL,
  longitude FLOAT8 NOT NULL,
  base_price NUMERIC(10,2) NOT NULL,
  current_price NUMERIC(10,2) NOT NULL,
  platform_fee NUMERIC(10,2) NOT NULL,
  worker_payout NUMERIC(10,2) NOT NULL,
  status job_status NOT NULL DEFAULT 'OPEN',
  escalation_count INTEGER NOT NULL DEFAULT 0,
  accept_token TEXT NOT NULL UNIQUE, -- unique token for accept links
  stripe_payment_intent_id TEXT,
  stripe_transfer_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_escalated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ
);

CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_accept_token ON jobs(accept_token);
CREATE INDEX idx_jobs_customer ON jobs(customer_id);
CREATE INDEX idx_jobs_worker ON jobs(worker_id);

-- 6. JOB NOTIFICATIONS LOG
-- ============================================================
CREATE TABLE job_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id),
  worker_id UUID REFERENCES workers(id),
  customer_id UUID REFERENCES customers(id),
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp')),
  notification_type TEXT NOT NULL, -- 'dispatch', 'accepted', 'completed', 'receipt'
  recipient_email TEXT,
  recipient_phone TEXT,
  message_preview TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. SQL FUNCTIONS
-- ============================================================

-- Find active workers within a given radius (km) for a specific category
CREATE OR REPLACE FUNCTION find_nearby_workers(
  p_latitude FLOAT8,
  p_longitude FLOAT8,
  p_radius_km FLOAT8 DEFAULT 15.0,
  p_category_id UUID DEFAULT NULL
)
RETURNS SETOF workers
LANGUAGE sql
STABLE
AS $$
  SELECT w.*
  FROM workers w
  WHERE w.status = 'ACTIVE'
    AND (p_category_id IS NULL OR w.category_id = p_category_id)
    AND (
      6371 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(p_latitude))
          * cos(radians(w.latitude))
          * cos(radians(w.longitude) - radians(p_longitude))
          + sin(radians(p_latitude))
          * sin(radians(w.latitude))
        ))
      )
    ) <= p_radius_km
  ORDER BY
    6371 * acos(
      LEAST(1.0, GREATEST(-1.0,
        cos(radians(p_latitude))
        * cos(radians(w.latitude))
        * cos(radians(w.longitude) - radians(p_longitude))
        + sin(radians(p_latitude))
        * sin(radians(w.latitude))
      ))
    ) ASC;
$$;

-- Find stale jobs that need price escalation
-- Jobs that are OPEN and haven't been escalated in the last 5 minutes
CREATE OR REPLACE FUNCTION find_stale_jobs()
RETURNS SETOF jobs
LANGUAGE sql
STABLE
AS $$
  SELECT j.*
  FROM jobs j
  WHERE j.status = 'OPEN'
    AND j.last_escalated_at < (now() - interval '5 minutes')
    AND j.current_price < 900.00;
$$;

-- Enable Row Level Security (basic policies)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Allow public read access to categories
CREATE POLICY "Categories are viewable by everyone" ON categories
  FOR SELECT USING (true);

-- Service role has full access (server-side API routes)
-- These policies allow the service role key to bypass RLS
CREATE POLICY "Service role full access customers" ON customers
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access workers" ON workers
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access jobs" ON jobs
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access notifications" ON job_notifications
  FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime for jobs table
ALTER PUBLICATION supabase_realtime ADD TABLE jobs;
