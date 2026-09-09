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
    const { error } = await supabaseServer
      .from('transactions')
      .update({ status: newStatus })
      .eq('id', transactionId);

    if (error) {
      throw error;
    }

    revalidatePath(`/sifest/registrations/${registrationId}`);
    revalidatePath('/sifest/registrations');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update payment status" };
  }
}
