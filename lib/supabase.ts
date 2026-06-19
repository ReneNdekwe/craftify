import { createClient } from '@supabase/supabase-js';

// Browser client (uses anon key — respects RLS)
export function createBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createClient(supabaseUrl, supabaseAnonKey);
}

// Server client (uses service role key — bypasses RLS)
export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Database types
export type JobStatus = 'OPEN' | 'ACCEPTED' | 'COMPLETED' | 'PAID' | 'CANCELLED';
export type WorkerStatus = 'ACTIVE' | 'INACTIVE';

export interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  created_at: string;
}

export interface Worker {
  id: string;
  name: string;
  email: string;
  phone: string;
  category_id: string;
  latitude: number;
  longitude: number;
  status: WorkerStatus;
  stripe_account_id: string | null;
  rating: number;
  jobs_completed: number;
  created_at: string;
}

export interface Job {
  id: string;
  customer_id: string;
  worker_id: string | null;
  category_id: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  base_price: number;
  current_price: number;
  platform_fee: number;
  worker_payout: number;
  status: JobStatus;
  escalation_count: number;
  accept_token: string;
  stripe_payment_intent_id: string | null;
  stripe_transfer_id: string | null;
  created_at: string;
  last_escalated_at: string;
  accepted_at: string | null;
  completed_at: string | null;
  paid_at: string | null;
}

export interface JobNotification {
  id: string;
  job_id: string;
  worker_id: string | null;
  customer_id: string | null;
  channel: 'email' | 'whatsapp';
  notification_type: string;
  recipient_email: string | null;
  recipient_phone: string | null;
  message_preview: string | null;
  sent_at: string;
}
