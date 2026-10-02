'use server'

import { supabaseServer } from '@/lib/sifest/supabase';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

export async function deleteRegistrationAction(id: string) {
  try {
    const cookieStore = await cookies();
    const userDataCookie = cookieStore.get('user_data')?.value;
    let roleId = "ROLE-004";
    if (userDataCookie) {
      try {
        const user = JSON.parse(decodeURIComponent(userDataCookie));
        roleId = user.role_id || user.role || "ROLE-004";
      } catch(e) {}
    }

    if (!['ROLE-001', 'SUPER_ADMIN'].includes(roleId)) {
      return { success: false, error: 'Unauthorized' };
    }

    // Get registration first to get participant_id and transaction_id
    const { data: reg, error: fetchError } = await supabaseServer
      .from('registrations')
      .select('participant_id, transaction_id')
      .eq('id', id)
      .single();

    if (fetchError) {
      return { success: false, error: fetchError.message };
    }

    // Delete the registration
    const { error: deleteRegError } = await supabaseServer
      .from('registrations')
      .delete()
      .eq('id', id);

    if (deleteRegError) {
      return { success: false, error: deleteRegError.message };
    }

    // Delete related transaction and participant
    if (reg) {
      if (reg.transaction_id) {
        await supabaseServer.from('transactions').delete().eq('id', reg.transaction_id);
      }
      if (reg.participant_id) {
        await supabaseServer.from('participants').delete().eq('id', reg.participant_id);
      }
    }

    revalidatePath('/sifest/registrations');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
