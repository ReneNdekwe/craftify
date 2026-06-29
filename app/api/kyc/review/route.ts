import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// POST — Update KYC status (Approve or Reject)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { workerId, status } = body;

    if (!workerId || !status) {
      return NextResponse.json({ error: 'workerId and status are required' }, { status: 400 });
    }

    if (!['VERIFIED', 'REJECTED', 'PENDING'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status. Must be VERIFIED, REJECTED, or PENDING' }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data: updatedKyc, error } = await supabase
      .from('worker_kyc')
      .update({ status })
      .eq('worker_id', workerId)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating KYC status:', error);
      return NextResponse.json({ error: 'Failed to update KYC status' }, { status: 500 });
    }

    return NextResponse.json({ success: true, kyc: updatedKyc });
  } catch (err) {
    console.error('Review KYC API Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
