"use server";

import { supabaseServer } from '@/lib/sifest/supabase';

export type EquipmentItem = {
  id: string;
  no?: number;
  name: string;
  category: string;
  vol: string | number;
  kuantitas: string;
  harga_satuan: number;
  jumlah_harga: number;
  keterangan: string;
};

export const INITIAL_EQUIPMENTS: EquipmentItem[] = [
  { id: 'log-01', no: 1, name: 'Baju Panitia', category: 'Perlengkapan', vol: '-', kuantitas: 'Pcs', harga_satuan: 135000, jumlah_harga: 0, keterangan: '-' },
  { id: 'log-02', no: 2, name: 'ID Card Panitia', category: 'Perlengkapan', vol: '-', kuantitas: 'Pcs', harga_satuan: 25000, jumlah_harga: 0, keterangan: '-' },
  { id: 'log-03', no: 3, name: 'Sertifikat Panitia', category: 'Perlengkapan', vol: '-', kuantitas: 'Lembar', harga_satuan: 5000, jumlah_harga: 0, keterangan: '-' },
  { id: 'log-04', no: 4, name: 'HT', category: 'Perlengkapan', vol: '-', kuantitas: 'pcs/ 5H', harga_satuan: 300000, jumlah_harga: 0, keterangan: '-' },
  { id: 'log-05', no: 5, name: 'Spanduk Sosialisasi 2 x 1', category: 'Perlengkapan', vol: 1, kuantitas: 'Unit', harga_satuan: 46000, jumlah_harga: 46000, keterangan: '-' },
  { id: 'log-06', no: 6, name: 'Spanduk Banner', category: 'Perlengkapan', vol: 1, kuantitas: 'Unit', harga_satuan: 30000, jumlah_harga: 30000, keterangan: '-' },
  { id: 'log-07', no: 7, name: 'Transportasi', category: 'Perlengkapan', vol: 1, kuantitas: 'Unit', harga_satuan: 500000, jumlah_harga: 500000, keterangan: '-' },
  { id: 'log-08', no: 1, name: 'Roti Andalas', category: 'Konsumsi', vol: 10, kuantitas: 'Pack', harga_satuan: 9000, jumlah_harga: 90000, keterangan: '-' },
  { id: 'log-09', no: 2, name: 'Air Mineral', category: 'Konsumsi', vol: 10, kuantitas: 'Botol', harga_satuan: 1700, jumlah_harga: 17000, keterangan: '-' },
  { id: 'log-10', no: 1, name: 'Trophy', category: 'Event MTQ', vol: 3, kuantitas: 'Unit', harga_satuan: 100000, jumlah_harga: 300000, keterangan: '-' },
  { id: 'log-11', no: 2, name: 'Sertifikat', category: 'Event MTQ', vol: 30, kuantitas: 'Lembar', harga_satuan: 5000, jumlah_harga: 150000, keterangan: '-' },
  { id: 'log-12', no: 3, name: 'Sterofoam Juara', category: 'Event MTQ', vol: 3, kuantitas: 'Pcs', harga_satuan: 5000, jumlah_harga: 15000, keterangan: '-' },
];

export async function getEquipments() {
  try {
    const { data, error } = await supabaseServer
      .from('equipments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return { 
        success: true, 
        data: INITIAL_EQUIPMENTS 
      };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: true, data: INITIAL_EQUIPMENTS };
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
