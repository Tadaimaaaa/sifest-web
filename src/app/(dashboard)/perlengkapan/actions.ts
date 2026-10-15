"use server";

import { supabaseServer } from '@/lib/sifest/supabase';
import { INITIAL_LOGISTIK, LogistikItem } from '@/data/logistik';

export type EquipmentItem = LogistikItem;
export const INITIAL_EQUIPMENTS = INITIAL_LOGISTIK;

export async function getEquipments() {
  try {
    const { data, error } = await supabaseServer
      .from('equipments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return { 
        success: true, 
        data: INITIAL_LOGISTIK 
      };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: true, data: INITIAL_LOGISTIK };
  }
}

export async function saveEquipment(data: any) {
  try {
    if (data.id && !data.id.startsWith('log-') && !data.id.startsWith('custom-')) {
      const { error } = await supabaseServer
        .from('equipments')
        .update({
          name: data.name,
          category: data.category,
          subCategory: data.subCategory,
          vol: data.vol,
          kuantitas: data.kuantitas,
          harga_satuan: data.harga_satuan,
          jumlah_harga: data.jumlah_harga,
          keterangan: data.keterangan,
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
          subCategory: data.subCategory,
          vol: data.vol,
          kuantitas: data.kuantitas,
          harga_satuan: data.harga_satuan,
          jumlah_harga: data.jumlah_harga,
          keterangan: data.keterangan
        }]);

      if (error) {
        return { success: true, fallbackLocal: true };
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: true, fallbackLocal: true };
  }
}

export async function deleteEquipment(id: string) {
  try {
    if (id.startsWith('log-') || id.startsWith('custom-')) return { success: true };
    
    const { error } = await supabaseServer
      .from('equipments')
      .delete()
      .eq('id', id);

    if (error) return { success: false, error: 'Gagal menghapus data.' };
    return { success: true };
  } catch (err: any) {
    return { success: true };
  }
}
