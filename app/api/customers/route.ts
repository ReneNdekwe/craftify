import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// POST — Create a new customer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone } = body;

    if (!name || !email || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data: customer, error } = await supabase
      .from('customers')
      .insert({
        name,
        email,
        phone,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Customer creation error:', error);
      return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
    }

    // Trigger n8n webhook for onboarding notifications
    const webhookUrl = process.env.N8N_WEBHOOK_URL || 'https://rndekwe.app.n8n.cloud';
    fetch(`${webhookUrl}/webhook/user-onboarding`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        role: 'customer'
      })
    }).catch(err => console.error('n8n Webhook failed:', err));

    return NextResponse.json({ success: true, customer });
  } catch (error) {
    console.error('Customers POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
