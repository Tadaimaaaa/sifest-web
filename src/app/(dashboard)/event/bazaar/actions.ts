"use server";

import { supabaseServer } from '@/lib/sifest/supabase';

export async function getBazaarParticipants() {
  try {
    const { data, error } = await supabaseServer
      .from('registrations')
      .select('*, events!inner(slug), participants(*), transactions(*)')
      .ilike('events.slug', 'open-bazaar%')
      .in('transactions.status', ['PAID', 'VERIFIED', 'FREE', 'PENDING'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bazaar participants:', error);
      return { success: false, data: [] };
    }

    // Format data to be easily consumed by the client
    const formattedData = (data || []).map((reg: any) => {
      const p = Array.isArray(reg.participants) ? reg.participants[0] : reg.participants;
      return {
        id: reg.id,
        registration_code: reg.registration_code,
        nama_brand: p?.institution || 'Unknown',
        pic: p?.full_name || 'Unknown',
        kontak: p?.whatsapp || '-',
        kategori: p?.metadata?.category || 'Makanan',
      };
    });

    return { success: true, data: formattedData };
  } catch (error) {
    console.error('Failed to get bazaar participants:', error);
    return { success: false, data: [] };
  }
}
