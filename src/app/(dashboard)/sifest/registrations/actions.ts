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

export async function getAllRegistrationsForExport() {
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

    // Role-based access logic
    const { data: eventsData } = await supabaseServer
      .from('events')
      .select('*')
      .order('name', { ascending: true });

    const events = eventsData || [];
    let allowedEventIds: string[] | undefined = undefined;

    if (roleId === 'ROLE-012') { // Futsal
      allowedEventIds = events.filter(e => e.slug.includes('futsal')).map(e => e.id);
    } else if (roleId === 'ROLE-013') { // E-Sport
      allowedEventIds = events.filter(e => e.slug.includes('esport')).map(e => e.id);
    } else if (roleId === 'ROLE-010') { // MTQ
      allowedEventIds = events.filter(e => e.slug.includes('mtq') || e.slug.includes('keagamaan')).map(e => e.id);
    } else if (roleId === 'ROLE-011') { // Seminar
      allowedEventIds = events.filter(e => e.slug.includes('seminar')).map(e => e.id);
    } else if (roleId === 'ROLE-014') { // Bazaar
      allowedEventIds = events.filter(e => e.slug.includes('bazaar')).map(e => e.id);
    } else if (!['ROLE-001', 'SUPER_ADMIN', 'ROLE-002', 'ROLE-003', 'ROLE-005', 'ROLE-006', 'ROLE-015'].includes(roleId)) {
      return { success: false, error: 'Anda tidak memiliki hak akses untuk mengekspor data ini.' };
    }

    let query = supabaseServer
      .from('registrations')
      .select('*, events(*), participants(*), transactions(*)')
      .order('created_at', { ascending: false });

    if (allowedEventIds && allowedEventIds.length > 0) {
      query = query.in('event_id', allowedEventIds);
    }

    const { data, error } = await query;
    if (error) {
      return { success: false, error: error.message };
    }

    // Sinkronkan data tenda bazaar dari sheet jika belum tersimpan di metadata
    const { fetchBazaarTenantsFromSheet, findMatchingBazaarTenant } = await import('@/lib/bazaarTents');
    let bazaarTenants: any[] = [];
    try {
      bazaarTenants = await fetchBazaarTenantsFromSheet();
    } catch (e) {
      console.warn("Gagal fetch bazaar sheet:", e);
    }

    const formattedData = (data || []).map((item: any) => {
      const p = Array.isArray(item.participants) ? item.participants[0] : item.participants;
      const e = item.events;
      const t = Array.isArray(item.transactions) ? item.transactions[0] : item.transactions;

      let idTenda = p?.metadata?.id_tenda || p?.metadata?.lokasi_tenda || null;
      if (e?.slug?.startsWith('open-bazaar') && !idTenda && bazaarTenants.length > 0) {
        const matched = findMatchingBazaarTenant(bazaarTenants, {
          brandName: p?.institution,
          picName: p?.full_name,
          whatsapp: p?.whatsapp
        });
        if (matched?.id_tenda) {
          idTenda = matched.id_tenda;
        }
      }

      return {
        id: item.id,
        registration_code: item.registration_code,
        status: item.status,
        payment_proof_url: item.payment_proof_url,
        created_at: item.created_at,
        event: e,
        participant: {
          ...p,
          metadata: {
            ...p?.metadata,
            id_tenda: idTenda
          }
        },
        transaction: t
      };
    });

    return { success: true, data: formattedData };
  } catch (err: any) {
    return { success: false, error: err.message || 'Terjadi kesalahan saat memproses data ekspor' };
  }
}
