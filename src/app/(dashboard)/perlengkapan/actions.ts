"use server";

import { INITIAL_LOGISTIK, LogistikItem } from '@/data/logistik';

export type EquipmentItem = LogistikItem;
export const INITIAL_EQUIPMENTS = INITIAL_LOGISTIK;

export async function getEquipments() {
  return { 
    success: true, 
    data: INITIAL_LOGISTIK 
  };
}

export async function saveEquipment(data: any) {
  return { success: true };
}

export async function deleteEquipment(id: string) {
  return { success: true };
}
