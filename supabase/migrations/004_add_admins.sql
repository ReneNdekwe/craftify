-- ============================================================
-- Admins Table Setup
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Create the admins table
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Insert initial admin user
INSERT INTO admins (name, email)
VALUES ('Craftify Admin', 'admin@craftify.com')
ON CONFLICT (email) DO NOTHING;
