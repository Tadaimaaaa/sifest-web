"use server";

import { supabaseServer } from "@/lib/sifest/supabase";
import { unstable_noStore as noStore } from 'next/cache';

export async function getSeminarRegistrations() {
  noStore();
  try {
    // 1. Get the Seminar event IDs (flexible matching for slug and name)
    const { data: eventsData, error: eventErr } = await supabaseServer
      .from("events")
      .select("id, slug, name");

    if (eventErr) {
      console.error("Error fetching events:", eventErr);
    }

    const seminarEvents = (eventsData || []).filter(e => 
      e.slug?.includes("seminar") || 
      e.slug?.includes("talk-show") || 
      e.slug?.includes("talkshow") ||
      e.name?.toLowerCase().includes("seminar") ||
      e.name?.toLowerCase().includes("talk show")
    );

    const eventIds = seminarEvents.map(e => e.id);
    if (eventIds.length === 0) {
      return { success: true, data: [] };
    }

    // 2. Get registrations for this event
    const { data: registrations, error } = await supabaseServer
      .from("registrations")
      .select("*, participants(*), transactions(*)")
      .in("event_id", eventIds)
      .order("created_at", { ascending: false });

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
      if (transaction?.payment_method === "FREE") paymentStatus = "Lunas";
      else if (transaction?.status === "PAID" || transaction?.status === "VERIFIED") paymentStatus = "Lunas";
      else if (transaction?.status === "DOWN_PAYMENT" || transaction?.status === "PENDING") paymentStatus = "DP";

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
