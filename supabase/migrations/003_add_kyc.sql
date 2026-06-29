-- ============================================================
-- Worker KYC Table + Supabase Storage Setup
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Create the worker_kyc table
CREATE TABLE IF NOT EXISTS worker_kyc (
  worker_id UUID PRIMARY KEY REFERENCES workers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'VERIFIED', 'REJECTED')),
  id_url TEXT,        -- Government ID document URL
  license_url TEXT,   -- Trade license/certificate URL
  insurance_url TEXT, -- Liability insurance proof URL
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create the storage bucket (run in Supabase Dashboard > Storage > New Bucket)
-- Bucket name: kyc-documents
-- Public: Yes (so URLs are accessible)
-- File size limit: 10MB
-- Allowed MIME types: image/jpeg, image/png, application/pdf

-- Or via SQL:
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kyc-documents',
  'kyc-documents',
  true,
  10485760,  -- 10MB
  ARRAY['image/jpeg', 'image/png', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage policy: allow service role to upload (our API uses service role key)
CREATE POLICY "Service role can manage KYC files"
  ON storage.objects
  FOR ALL
  USING (bucket_id = 'kyc-documents')
  WITH CHECK (bucket_id = 'kyc-documents');
