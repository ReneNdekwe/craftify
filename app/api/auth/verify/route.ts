import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const supabase = createServerClient();

    // 1. Check if the user exists in the admins table
    const { data: admin } = await supabase
      .from('admins')
      .select('id, name, email')
      .eq('email', email)
      .single();

    if (admin) {
      return NextResponse.json({
        user: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          phone: '', // Admins might not have phone numbers required
          role: 'admin',
        }
      });
    }

    // 2. Check if the user exists in the workers table
    const { data: worker } = await supabase
      .from('workers')
      .select('id, name, email, phone')
      .eq('email', email)
      .single();

    if (worker) {
      return NextResponse.json({
        user: {
          id: worker.id,
          name: worker.name,
          email: worker.email,
          phone: worker.phone,
          role: 'worker',
        }
      });
    }

    // 3. Check if the user exists in the customers table
    const { data: customer } = await supabase
      .from('customers')
      .select('id, name, email, phone')
      .eq('email', email)
      .single();

    if (customer) {
      return NextResponse.json({
        user: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
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
