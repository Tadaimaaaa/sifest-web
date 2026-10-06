"use server";

import { supabaseServer } from '@/lib/sifest/supabase';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { SCRIPT_URL } from '@/lib/api';

export async function updateRegistrationStatus(registrationId: string, newStatus: string) {
  try {
    const { error } = await supabaseServer
      .from('registrations')
      .update({ status: newStatus })
      .eq('id', registrationId);

    if (error) {
      throw error;
    }

    revalidatePath(`/sifest/registrations/${registrationId}`);
    revalidatePath('/sifest/registrations');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update registration status" };
  }
}

export async function updatePaymentStatus(transactionId: string, newStatus: string, registrationId: string) {
  try {
    if (!transactionId) {
      // No transaction yet — check if one exists linked to this registration
      const { data: existing } = await supabaseServer
        .from('transactions')
        .select('id')
        .eq('registration_id', registrationId)
        .maybeSingle();

      if (existing?.id) {
        // Update existing transaction found via registration_id
        const { error } = await supabaseServer
          .from('transactions')
          .update({
            status: newStatus,
            ...(newStatus === 'PAID' ? { paid_at: new Date().toISOString() } : {}),
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        // Create a brand new transaction with registration_id
        const { error: insertError } = await supabaseServer
          .from('transactions')
          .insert({
            registration_id: registrationId,
            amount: 0,
            status: newStatus,
            payment_method: 'MANUAL',
            ...(newStatus === 'PAID' ? { paid_at: new Date().toISOString() } : {}),
          });
        if (insertError) throw insertError;
      }
    } else {
      // Update transaction by its own ID
      const { error } = await supabaseServer
        .from('transactions')
        .update({
          status: newStatus,
          ...(newStatus === 'PAID' ? { paid_at: new Date().toISOString() } : {}),
        })
        .eq('id', transactionId);
      if (error) throw error;
    }

    // SYNC TO KEUANGAN IF PAID OR DOWN_PAYMENT
    if (newStatus === 'PAID' || newStatus === 'DOWN_PAYMENT') {
      try {
        const cookieStore = cookies();
        // @ts-ignore - Next.js 15+ uses async cookies, Next.js 14 uses sync
        const token = (typeof cookieStore.then === 'function' ? await cookieStore : cookieStore).get('session_token')?.value || '';

        const { data: reg } = await supabaseServer
          .from('registrations')
          .select(`
            *,
            events(name, price),
            participants(name, institution)
          `)
          .eq('id', registrationId)
          .single();

        if (reg) {
          const { data: trx } = await supabaseServer
            .from('transactions')
            .select('amount')
            .eq('registration_id', registrationId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const nominal = trx?.amount || reg.events?.price || 0;
          const statusKeuangan = newStatus === 'PAID' ? 'Lunas' : 'Uang Muka';
          const keterangan = `Pendaftaran ${reg.participants?.name || 'Peserta'} (${reg.participants?.institution || 'Umum'})`;
          const satuan = reg.events?.name || 'Event';
          const buktiUrls = (reg.payment_proof_url || "").split(',').map((u: string) => u.trim()).filter(Boolean);
          const buktiUrl = buktiUrls.length > 0 ? buktiUrls[0] : "";

          // Fetch POST to Apps Script backend
          await fetch(`${SCRIPT_URL}?action=addKeuangan`, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              tanggal: new Date().toISOString().split('T')[0],
              jenis: "INCOME",
              kategori: "Pendaftaran",
              nominal: nominal.toString(),
              vol: "1",
              satuan: satuan,
              keterangan: keterangan,
              penanggung_jawab: "Sistem Registrasi",
              status: statusKeuangan,
              bukti_url: buktiUrl,
              token: token
            })
          });
        }
      } catch (e) {
        console.error('Failed to sync to Keuangan:', e);
      }
    }

    revalidatePath(`/sifest/registrations/${registrationId}`);
    revalidatePath('/sifest/registrations');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update payment status" };
  }
}

export async function uploadPaymentProof(registrationId: string, formData: FormData) {
  try {
    const file = formData.get('file') as File;
    if (!file) throw new Error('No file provided');

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fileExt = file.name.split('.').pop();
    const fileName = `payment_proofs/${registrationId}_pelunasan_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabaseServer.storage
      .from('registration_files')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabaseServer.storage
      .from('registration_files')
      .getPublicUrl(fileName);

    const publicUrl = publicUrlData.publicUrl;

    const { data: regData } = await supabaseServer
      .from('registrations')
      .select('payment_proof_url')
      .eq('id', registrationId)
      .single();

    let newPaymentProofUrl = publicUrl;
    if (regData?.payment_proof_url) {
      // Avoid appending duplicates if somehow called twice
      if (!regData.payment_proof_url.includes(publicUrl)) {
        newPaymentProofUrl = `${regData.payment_proof_url},${publicUrl}`;
      } else {
        newPaymentProofUrl = regData.payment_proof_url;
      }
    }

    const { error: dbError } = await supabaseServer
      .from('registrations')
      .update({ payment_proof_url: newPaymentProofUrl })
      .eq('id', registrationId);

    if (dbError) throw dbError;

    revalidatePath(`/sifest/registrations/${registrationId}`);
    return { success: true, url: publicUrl };
  } catch (err: any) {
    console.error('Upload proof error:', err);
    return { success: false, error: err.message || 'Failed to upload proof' };
  }
}
