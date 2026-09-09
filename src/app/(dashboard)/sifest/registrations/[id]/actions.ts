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
      // Create new manual transaction
      const { data: newTx, error: insertError } = await supabaseServer
        .from('transactions')
        .insert({
          amount: 0,
          status: newStatus,
          payment_method: 'MANUAL',
          payment_type: 'MANUAL',
          paid_at: newStatus === 'PAID' ? new Date().toISOString() : null
        })
        .select()
        .single();
        
      if (insertError) throw insertError;
      
      // Update registration with new transaction id
      const { error: updateRegError } = await supabaseServer
        .from('registrations')
        .update({ transaction_id: newTx.id })
        .eq('id', registrationId);
        
      if (updateRegError) throw updateRegError;
    } else {
      const { error } = await supabaseServer
        .from('transactions')
        .update({ 
          status: newStatus,
          ...(newStatus === 'PAID' ? { paid_at: new Date().toISOString() } : {})
        })
        .eq('id', transactionId);

      if (error) {
        throw error;
      }
    }

    revalidatePath(`/sifest/registrations/${registrationId}`);
    revalidatePath('/sifest/registrations');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update payment status" };
  }
}
