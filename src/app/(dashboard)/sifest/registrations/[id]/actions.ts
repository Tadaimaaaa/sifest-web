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
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update payment status" };
  }
}
