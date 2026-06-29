/**
 * Jobs API — List and query jobs
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const jobId = searchParams.get('id');
    const customerId = searchParams.get('customerId');
    const workerId = searchParams.get('workerId');

    // Single job lookup
    if (jobId) {
      const { data: job, error } = await supabase
        .from('jobs')
        .select('*, customers(*), workers(*), categories(name, icon)')
        .eq('id', jobId)
        .single();

      if (error || !job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }

      return NextResponse.json({ job });
    }

    // List jobs with optional status filter
    let query = supabase
      .from('jobs')
      .select('*, customers(name, email), workers(name, email, phone), categories(name, icon)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (status) {
      query = query.eq('status', status);
    }

    if (customerId) {
      query = query.eq('customer_id', customerId);
    } else if (workerId) {
      query = query.or(`status.eq.OPEN,worker_id.eq.${workerId}`);
    } else {
      // Public guest mode: ONLY OPEN jobs
      query = query.eq('status', 'OPEN');
    }

    const { data: jobs, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
    }

    // Redact sensitive data if unauthenticated
    const isPublic = !customerId && !workerId;
    const sanitizedJobs = (jobs || []).map((job: any) => {
      if (isPublic) {
        // Redact exact address (keep just city/postal if possible, or generic string)
        const addressParts = job.address ? job.address.split(',') : [];
        const maskedAddress = addressParts.length > 1 ? addressParts[addressParts.length - 1].trim() : 'Local Area';
        
        return {
          ...job,
          address: maskedAddress,
          customers: null, // completely hide customer details
        };
      }
      return job;
    });

    return NextResponse.json({ jobs: sanitizedJobs });
  } catch (error) {
    console.error('Jobs API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
