"use server";

import { supabaseServer } from '@/lib/sifest/supabase';

export async function getEquipments() {
  try {
    const { data, error } = await supabaseServer
      .from('equipments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching equipments:', error);
      // Fallback dummy data if table does not exist
      if (error.code === '42P01') {
        return { 
          success: true, 
          data: [
            { id: 'dummy-1', name: 'Tenda Sarnafil 3x3', category: 'Logistik', total_quantity: 10, borrowed_quantity: 2, condition: 'Baik', pic: 'Divisi Logistik', notes: 'Sewa dari vendor' },
            { id: 'dummy-2', name: 'Kursi Lipat Chitose', category: 'Mebel', total_quantity: 50, borrowed_quantity: 15, condition: 'Baik', pic: 'Divisi Acara', notes: 'Untuk area panggung' },
            { id: 'dummy-3', name: 'Kabel Roll 50m', category: 'Kelistrikan', total_quantity: 5, borrowed_quantity: 5, condition: 'Rusak (1)', pic: 'Divisi Perlengkapan', notes: '1 kabel putus' },
            { id: 'dummy-4', name: 'Handy Talky (HT)', category: 'Elektronik', total_quantity: 20, borrowed_quantity: 20, condition: 'Baik', pic: 'Seluruh Panitia', notes: 'Baterai harus dicharge' }
          ] 
        };
      }
      return { success: false, error: 'Gagal mengambil data perlengkapan.' };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Terjadi kesalahan sistem.' };
  }
}

export async function saveEquipment(data: any) {
  try {
    if (data.id && !data.id.startsWith('dummy-')) {
      const { error } = await supabaseServer
        .from('equipments')
        .update({
          name: data.name,
          category: data.category,
          total_quantity: data.total_quantity,
          borrowed_quantity: data.borrowed_quantity,
          condition: data.condition,
          pic: data.pic,
          notes: data.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.id);

      if (error) return { success: false, error: 'Gagal memperbarui data.' };
    } else {
      const { error } = await supabaseServer
        .from('equipments')
        .insert([{
          name: data.name,
          category: data.category,
          total_quantity: data.total_quantity,
          borrowed_quantity: data.borrowed_quantity,
          condition: data.condition,
          pic: data.pic,
          notes: data.notes
        }]);

      if (error) {
        if (error.code === '42P01') return { success: false, error: 'Tabel equipments belum dibuat di Supabase.' };
        return { success: false, error: 'Gagal menyimpan data.' };
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Terjadi kesalahan sistem.' };
  }
}

export async function deleteEquipment(id: string) {
  try {
    if (id.startsWith('dummy-')) return { success: true };
    
    const { error } = await supabaseServer
      .from('equipments')
      .delete()
      .eq('id', id);

    if (error) return { success: false, error: 'Gagal menghapus data.' };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Terjadi kesalahan sistem.' };
  }
}
