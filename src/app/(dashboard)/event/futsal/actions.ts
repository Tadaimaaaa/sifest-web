"use server";

import { supabaseServer } from "@/lib/sifest/supabase";
import { unstable_noStore as noStore } from 'next/cache';

export async function getFutsalRegistrations() {
  noStore();
  try {
    // 1. Get the Futsal event ID
    const { data: eventData } = await supabaseServer
      .from("events")
      .select("id")
      .eq("slug", "turnamen-futsal")
      .single();

    if (!eventData) {
      return { success: false, data: [], message: "Event turnamen-futsal tidak ditemukan di Supabase." };
    }

    // 2. Get registrations for this event
    const { data: registrations, error } = await supabaseServer
      .from("registrations")
      .select("*, participants(*), transactions(*)")
      .eq("event_id", eventData.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Supabase Error:", error);
      return { success: false, data: [], message: error.message };
    }

    // 3. Format the data to match the Dashboard's Team table
    const formattedTeams = registrations?.map((reg: any) => {
      const participant = (Array.isArray(reg.participants) ? reg.participants[0] : reg.participants) || {};
      const transaction = (Array.isArray(reg.transactions) ? reg.transactions[0] : reg.transactions) || {};
      
      // Convert Supabase transaction status to our UI's payment status
      let paymentStatus = "Belum Bayar";
      if (transaction?.status === "PAID") paymentStatus = "Lunas";
      else if (transaction?.status === "PENDING") paymentStatus = "DP"; // Approximation for UI

      return {
        id_tim: reg.registration_code,
        nama_tim: participant.institution_name || participant.full_name || "Unknown Squad", // usually squad name is stored in institution_name
        kapten: participant.full_name,
        kontak: participant.phone_number,
        status_bayar: paymentStatus
      };
    }) || [];

    return { success: true, data: formattedTeams };
  } catch (error: any) {
    console.error("Failed to fetch futsal registrations:", error);
    return { success: false, data: [], message: error.message };
  }
}
