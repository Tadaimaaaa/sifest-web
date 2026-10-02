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

    // Delete the registration (it cascades to participants and transactions automatically due to ON DELETE CASCADE)
    const { error: deleteRegError } = await supabaseServer
      .from('registrations')
      .delete()
      .eq('id', id);

    if (deleteRegError) {
      return { success: false, error: deleteRegError.message };
    }

    revalidatePath('/sifest/registrations');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
