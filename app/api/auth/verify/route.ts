import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const supabase = createServerClient();

    // 1. Check if it's an admin demo account
    if (email === 'admin@demo.com') {
      return NextResponse.json({
        user: {
          id: 'admin-123',
          name: 'Demo Admin',
          email,
          role: 'admin',
        }
      });
    }

    // 2. Check if the user exists in the workers table
    const { data: worker } = await supabase
      .from('workers')
      .select('id, name, email')
      .eq('email', email)
      .single();

    if (worker) {
      return NextResponse.json({
        user: {
          id: worker.id,
          name: worker.name,
          email: worker.email,
          role: 'worker',
        }
      });
    }

    // 3. Check if the user exists in the customers table
    const { data: customer } = await supabase
      .from('customers')
      .select('id, name, email')
      .eq('email', email)
      .single();

    if (customer) {
      return NextResponse.json({
        user: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          role: 'customer',
        }
      });
    }

    return NextResponse.json({ error: 'User not found in database' }, { status: 404 });

  } catch (err: any) {
    console.error('Auth Verify Error:', err);
    return NextResponse.json({ error: 'Server error verifying user' }, { status: 500 });
  }
}
