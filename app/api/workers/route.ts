/**
 * Workers API — CRUD operations for worker management
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// GET — List all workers (with optional filters)
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const categoryId = searchParams.get('categoryId');

    let query = supabase
      .from('workers')
      .select('*, categories(name, icon), kyc:worker_kyc(*)')
      .order('name', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    }
    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data: workers, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch workers' }, { status: 500 });
    }

    return NextResponse.json({ workers: workers || [] });
  } catch (error) {
    console.error('Workers GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST — Create a new worker
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, categoryId, latitude, longitude, stripeAccountId } = body;

    if (!name || !email || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createServerClient();

    let finalCategoryId = categoryId;
    if (!finalCategoryId) {
      const { data: cat } = await supabase.from('categories').select('id').limit(1).single();
      finalCategoryId = cat?.id;
    }

    const { data: worker, error } = await supabase
      .from('workers')
      .insert({
        name,
        email,
        phone,
        category_id: finalCategoryId,
        latitude: latitude || 0,
        longitude: longitude || 0,
        stripe_account_id: stripeAccountId || null,
        status: 'ACTIVE',
      })
      .select('*')
      .single();

    if (error) {
      console.error('Worker creation error:', error);
      return NextResponse.json({ error: 'Failed to create worker' }, { status: 500 });
    }

    // Trigger n8n webhook for onboarding notifications
    const webhookUrl = process.env.N8N_WEBHOOK_URL || 'https://rndekwe.app.n8n.cloud';
    fetch(`${webhookUrl}/webhook/user-onboarding`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: worker.name,
        email: worker.email,
        phone: worker.phone,
        role: 'worker'
      })
    })
    .then(res => {
      if (!res.ok) console.error(`n8n Webhook HTTP error: ${res.status} (Is the workflow Active?)`);
    })
    .catch(err => console.error('n8n Webhook failed:', err));

    return NextResponse.json({ success: true, worker });
  } catch (error) {
    console.error('Workers POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT — Update a worker
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing worker ID' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Map frontend field names to database column names
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.categoryId !== undefined) dbUpdates.category_id = updates.categoryId;
    if (updates.latitude !== undefined) dbUpdates.latitude = updates.latitude;
    if (updates.longitude !== undefined) dbUpdates.longitude = updates.longitude;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.stripeAccountId !== undefined) dbUpdates.stripe_account_id = updates.stripeAccountId;

    const { data: worker, error } = await supabase
      .from('workers')
      .update(dbUpdates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to update worker' }, { status: 500 });
    }

    return NextResponse.json({ success: true, worker });
  } catch (error) {
    console.error('Workers PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
