/**
 * Jobs by Token API — Look up a job by its accept_token
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Missing token parameter' }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data: job, error } = await supabase
      .from('jobs')
      .select('*, customers(name, email), workers(name, email, phone), categories(name, icon)')
      .eq('accept_token', token)
      .single();

    if (error || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({ job });
  } catch (error) {
    console.error('Jobs by-token API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
