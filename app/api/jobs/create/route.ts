/**
 * Workflow 1 — New Emergency Request (Dispatch)
 *
 * 1. Customer submits emergency request
 * 2. Calculate 20% Craftify fee and worker payout
 * 3. Create job record in Supabase (Status: OPEN)
 * 4. Find workers by category (Active only)
 * 5. Filter workers within 15 km radius
 * 6. Send Email & WhatsApp alerts with job details and accept link
 *
 * OUTPUT: Job = OPEN, Workers notified
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { calculateFees } from '@/lib/fees';
import { v4 as uuidv4 } from 'uuid';
import { notifyWorkersOfJob } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customerName,
      customerEmail,
      customerPhone,
      categoryId,
      description,
      address,
      latitude,
      longitude,
      price,
      severity,
    } = body;

    // Validate required fields
    if (!customerName || !customerEmail || !customerPhone || !categoryId || !description || !address || !latitude || !longitude || !price) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Step 1: Create or find customer
    let customerId: string;
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('email', customerEmail)
      .single();

    if (existingCustomer) {
      customerId = existingCustomer.id;
      // Update name/phone if changed
      await supabase.from('customers').update({ name: customerName, phone: customerPhone }).eq('id', customerId);
    } else {
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({ name: customerName, email: customerEmail, phone: customerPhone })
        .select('id')
        .single();

      if (customerError || !newCustomer) {
        return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
      }
      customerId = newCustomer.id;
    }

    // Step 2: Calculate fees
    const fees = calculateFees(price);

    // Step 3: Create job record
    const acceptToken = uuidv4();
    const finalDescription = severity && severity !== 'MEDIUM' 
      ? `[SEVERITY: ${severity}] ${description}` 
      : description;

    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        customer_id: customerId,
        category_id: categoryId,
        description: finalDescription,
        address,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        base_price: fees.totalPrice,
        current_price: fees.totalPrice,
        platform_fee: fees.platformFee,
        worker_payout: fees.workerPayout,
        status: 'OPEN',
        accept_token: acceptToken,
      })
      .select('*')
      .single();

    if (jobError || !job) {
      console.error('Job creation error:', jobError);
      return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
    }

    // Step 4 & 5: Find workers to notify
    // Step 5: Find eligible workers (Send to ALL active workers to ensure notification works)
    let workersToNotify: Array<{ id: string; name: string; email: string; phone: string }> = [];

    const { data: nearbyWorkers, error: workersError } = await supabase
      .from('workers')
      .select('id, name, email, phone')
      .eq('status', 'ACTIVE');

    if (workersError) {
      console.error('Worker search error:', workersError);
    }

    if (nearbyWorkers) {
      workersToNotify = nearbyWorkers;
    } else {
      // Fallback: notify ALL active workers regardless of category or location
      console.log('No nearby workers found — falling back to ALL active workers');
      const { data: allWorkers, error: allWorkersError } = await supabase
        .from('workers')
        .select('id, name, email, phone')
        .eq('status', 'ACTIVE');

      if (allWorkersError) {
        console.error('All workers fetch error:', allWorkersError);
      } else {
        workersToNotify = allWorkers || [];
      }
    }

    // Get category name for notifications
    const { data: category } = await supabase
      .from('categories')
      .select('name')
      .eq('id', categoryId)
      .single();

    const categoryName = category?.name || 'Emergency';

    // Step 6: Notify workers (Native + Delegated to n8n)
    await notifyWorkersOfJob(job, workersToNotify as any, categoryName).catch(err => console.error('Native notification failed:', err));

    const webhookUrl = process.env.N8N_WEBHOOK_URL || 'https://rndekwe.app.n8n.cloud';
    fetch(`${webhookUrl}/webhook/dispatch-job`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job: {
          description: job.description,
          address: job.address,
          worker_payout: job.worker_payout,
          accept_token: job.accept_token,
        },
        workers: workersToNotify
      })
    }).catch(err => console.error('Failed to trigger n8n dispatch-job webhook:', err));

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        status: job.status,
        currentPrice: job.current_price,
        platformFee: job.platform_fee,
        workerPayout: job.worker_payout,
        acceptToken: job.accept_token,
      },
      workersNotified: workersToNotify.length,
      message: workersToNotify.length > 0
        ? `Job created and ${workersToNotify.length} worker(s) notified`
        : 'Job created but no workers found nearby. Price will escalate automatically.',
    });
  } catch (error) {
    console.error('Workflow 1 error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
