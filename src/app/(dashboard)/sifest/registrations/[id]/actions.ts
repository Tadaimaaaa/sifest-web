"use server";

import { supabaseServer } from '@/lib/sifest/supabase';
import { revalidatePath } from 'next/cache';

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
    revalidatePath('/event/futsal/sma');
    revalidatePath('/event/futsal/mahasiswa');
    revalidatePath('/event/esport/mlbb');
    revalidatePath('/event/esport/efootball');
    revalidatePath('/event/seminar');
    revalidatePath('/event/bazaar');
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

    revalidatePath(`/sifest/registrations/${registrationId}`);
    revalidatePath('/sifest/registrations');
    revalidatePath('/event/futsal/sma');
    revalidatePath('/event/futsal/mahasiswa');
    revalidatePath('/event/esport/mlbb');
    revalidatePath('/event/esport/efootball');
    revalidatePath('/event/seminar');
    revalidatePath('/event/bazaar');
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

export async function updateBazaarTent(participantId: string, tentId: string, registrationId: string) {
  try {
    if (!participantId) throw new Error("Participant ID is required");

    // Ambil metadata peserta saat ini
    const { data: p, error: fetchErr } = await supabaseServer
      .from('participants')
      .select('metadata')
      .eq('id', participantId)
      .single();

    if (fetchErr) throw fetchErr;

    const currentMeta = p?.metadata || {};
    const normalizedTent = (!tentId || tentId === 'NONE' || tentId === 'Kosong') ? null : tentId.trim().toUpperCase();

    const updatedMeta = {
      ...currentMeta,
      id_tenda: normalizedTent,
      lokasi_tenda: normalizedTent,
    };

    const { error: updateErr } = await supabaseServer
      .from('participants')
      .update({ metadata: updatedMeta })
      .eq('id', participantId);

    if (updateErr) throw updateErr;

    revalidatePath(`/sifest/registrations/${registrationId}`);
    revalidatePath('/sifest/registrations');
    revalidatePath('/event/bazaar');
    return { success: true, id_tenda: normalizedTent };
  } catch (err: any) {
    console.error('Update bazaar tent error:', err);
    return { success: false, error: err.message || 'Gagal memperbarui lokasi tenda' };
  }
}

