"use server";

import { supabaseServer } from "@/lib/sifest/supabase";
import { unstable_noStore as noStore } from 'next/cache';

export async function getSeminarRegistrations() {
  noStore();
  try {
    // 1. Get the Seminar event ID
    const { data: eventData } = await supabaseServer
      .from("events")
      .select("id")
      .eq("slug", "seminar-nasional")
      .single();

    if (!eventData) {
      return { success: false, data: [], message: "Event seminar-nasional tidak ditemukan di Supabase." };
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

    // 3. Format the data to match the Dashboard's Participant table
    const formattedParticipants = registrations?.map((reg: any) => {
      const participant = (Array.isArray(reg.participants) ? reg.participants[0] : reg.participants) || {};
      const transaction = (Array.isArray(reg.transactions) ? reg.transactions[0] : reg.transactions) || {};
      
      // Convert Supabase transaction status to our UI's payment status
      let paymentStatus = "Belum Bayar";
      if (transaction?.status === "PAID") paymentStatus = "Lunas";
      else if (transaction?.status === "PENDING") paymentStatus = "DP"; // Approximation for UI

      return {
        id_peserta: reg.registration_code,
        nama_lengkap: participant.full_name || "Unknown",
        institusi: participant.institution || participant.institution_name || "-",
        email: participant.email || "-",
        kontak: participant.phone_number || participant.whatsapp || "-",
        status_bayar: paymentStatus,
        created_at: reg.created_at
      };
    }) || [];

    return { success: true, data: formattedParticipants };
  } catch (error: any) {
    console.error("Failed to fetch seminar registrations:", error);
    return { success: false, data: [], message: error.message };
  }
}
