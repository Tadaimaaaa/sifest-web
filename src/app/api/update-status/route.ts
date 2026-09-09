import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/sifest/supabase';

export async function GET() {
  try {
    // Test: fetch one registration and try to update it to its own status
    const { data: reg } = await supabaseServer
      .from('registrations')
      .select('id, status')
      .limit(1)
      .single();

    if (!reg) return NextResponse.json({ ok: false, error: 'No registrations found' });

    const { error: updateError, status: updateStatus } = await supabaseServer
      .from('registrations')
      .update({ status: reg.status })
      .eq('id', reg.id);

    return NextResponse.json({
      ok: !updateError,
      reg_id: reg.id,
      reg_status: reg.status,
      update_http_status: updateStatus,
      update_error: updateError?.message || null
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, id, newStatus, registrationId } = body;

    if (!type || !newStatus || !registrationId) {
      return NextResponse.json({ success: false, error: 'Parameter tidak lengkap' }, { status: 400 });
    }

    const validRegStatuses = ['PENDING', 'CONFIRMED', 'CANCELLED'];
    const validPayStatuses = ['PENDING', 'PAID', 'EXPIRED', 'FAILED', 'CANCELLED'];

    if (type === 'registration') {
      if (!validRegStatuses.includes(newStatus)) {
        return NextResponse.json({ success: false, error: 'Status pendaftaran tidak valid' }, { status: 400 });
      }

      const { error } = await supabaseServer
        .from('registrations')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

    } else if (type === 'payment') {
      if (!validPayStatuses.includes(newStatus)) {
        return NextResponse.json({ success: false, error: 'Status pembayaran tidak valid' }, { status: 400 });
      }

      if (!id) {
        // Create new manual transaction
        const { data: newTx, error: insertError } = await supabaseServer
          .from('transactions')
          .insert({
            registration_id: registrationId,
            amount: 0,
            status: newStatus,
            payment_method: 'MANUAL',
            paid_at: newStatus === 'PAID' ? new Date().toISOString() : null
          })
          .select()
          .single();

        if (insertError) throw insertError;

        const { error: regError } = await supabaseServer
          .from('registrations')
          .update({ transaction_id: newTx.id })
          .eq('id', registrationId);

        if (regError) throw regError;

      } else {
        const { error } = await supabaseServer
          .from('transactions')
          .update({
            status: newStatus,
            ...(newStatus === 'PAID' ? { paid_at: new Date().toISOString() } : {})
          })
          .eq('id', id);

        if (error) throw error;
      }
    } else {
      return NextResponse.json({ success: false, error: 'Tipe tidak valid' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[update-status API error]', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
  }
}
