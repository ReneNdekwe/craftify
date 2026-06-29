import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// GET — fetch KYC status for a worker
export async function GET(req: NextRequest) {
  const workerId = req.nextUrl.searchParams.get('workerId');
  if (!workerId) {
    return NextResponse.json({ error: 'workerId is required' }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('worker_kyc')
    .select('*')
    .eq('worker_id', workerId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If no KYC record exists yet, return a default pending state
  if (!data) {
    return NextResponse.json({
      kyc: {
        worker_id: workerId,
        status: 'PENDING',
        id_url: null,
        license_url: null,
        insurance_url: null,
      },
    });
  }

  return NextResponse.json({ kyc: data });
}

// POST — upload a KYC document to Supabase Storage + update the kyc record
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const workerId = formData.get('workerId') as string;
  const docType = formData.get('docType') as string; // 'id' | 'license' | 'insurance'
  const file = formData.get('file') as File;

  if (!workerId || !docType || !file) {
    return NextResponse.json({ error: 'workerId, docType, and file are required' }, { status: 400 });
  }

  if (!['id', 'license', 'insurance'].includes(docType)) {
    return NextResponse.json({ error: 'docType must be id, license, or insurance' }, { status: 400 });
  }

  const supabase = createServerClient();

  // Upload file to Supabase Storage
  const ext = file.name.split('.').pop() || 'pdf';
  const storagePath = `kyc/${workerId}/${docType}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await supabase.storage
    .from('kyc-documents')
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: true, // overwrite if re-uploading
    });

  if (uploadError) {
    return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
  }

  // Get the public URL
  const { data: urlData } = supabase.storage
    .from('kyc-documents')
    .getPublicUrl(storagePath);

  const publicUrl = urlData.publicUrl;

  // Upsert the KYC record
  const columnMap: Record<string, string> = {
    id: 'id_url',
    license: 'license_url',
    insurance: 'insurance_url',
  };

  // First check if record exists
  const { data: existing } = await supabase
    .from('worker_kyc')
    .select('worker_id')
    .eq('worker_id', workerId)
    .maybeSingle();

  if (existing) {
    // Update existing record
    const { error: updateError } = await supabase
      .from('worker_kyc')
      .update({ [columnMap[docType]]: publicUrl })
      .eq('worker_id', workerId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  } else {
    // Insert new record
    const { error: insertError } = await supabase
      .from('worker_kyc')
      .insert({
        worker_id: workerId,
        status: 'PENDING',
        [columnMap[docType]]: publicUrl,
      });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  // Check if all 3 docs are uploaded — if so, auto-update status to PENDING (ready for review)
  const { data: kycRecord } = await supabase
    .from('worker_kyc')
    .select('*')
    .eq('worker_id', workerId)
    .single();

  return NextResponse.json({
    success: true,
    url: publicUrl,
    kyc: kycRecord,
  });
}
