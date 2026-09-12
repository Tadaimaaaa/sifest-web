"use server";

import { supabaseServer } from "@/lib/sifest/supabase";
import { unstable_noStore as noStore } from 'next/cache';

export async function getFutsalData(gameSlug: string) {
  noStore();
  try {
    // 1. Get the Futsal event ID
    const { data: eventData } = await supabaseServer
      .from("events")
      .select("id")
      .eq("slug", gameSlug)
      .single();

    if (!eventData) {
      return { success: false, teams: [], bracket: null, message: `Event ${gameSlug} tidak ditemukan di Supabase.` };
    }

    // 2. Fetch both registrations and bracket concurrently on the server
    const [regsResult, bracketResult] = await Promise.all([
      supabaseServer
        .from("registrations")
        .select("*, participants(*), transactions(*)")
        .eq("event_id", eventData.id)
        .order("created_at", { ascending: true }),
      supabaseServer
        .from('event_brackets')
        .select('bracket_data')
        .eq('event_slug', gameSlug)
        .single()
    ]);

    if (regsResult.error) {
      console.error("Supabase Error (Registrations):", regsResult.error);
      return { success: false, teams: [], bracket: null, message: regsResult.error.message };
    }

    let bracketData = null;
    if (bracketResult.error && bracketResult.error.code !== 'PGRST116') {
      console.error("Supabase Error (Bracket):", bracketResult.error);
    } else if (bracketResult.data) {
      bracketData = bracketResult.data.bracket_data;
    }

    // 3. Format the data to match the Dashboard's Team table
    const formattedTeams = regsResult.data?.map((reg: any) => {
      const participant = (Array.isArray(reg.participants) ? reg.participants[0] : reg.participants) || {};
      const transaction = (Array.isArray(reg.transactions) ? reg.transactions[0] : reg.transactions) || {};
      
      let paymentStatus = "Belum Bayar";
      if (transaction?.status === "PAID") paymentStatus = "Lunas";
      else if (transaction?.status === "PENDING") paymentStatus = "DP";

      return {
        id_tim: reg.registration_code,
        nama_tim: participant.institution_name || participant.full_name || "Unknown Squad",
        kapten: participant.full_name,
        kontak: participant.phone_number,
        status_bayar: paymentStatus
      };
    }) || [];

    return { success: true, teams: formattedTeams, bracket: bracketData };
  } catch (error: any) {
    console.error("Failed to fetch futsal data:", error);
    return { success: false, teams: [], bracket: null, message: error.message };
  }
}

export async function saveBracket(eventSlug: string, bracketData: any) {
  try {
    const { data, error } = await supabaseServer
      .from('event_brackets')
      .upsert(
        { event_slug: eventSlug, bracket_data: bracketData, updated_at: new Date().toISOString() },
        { onConflict: 'event_slug' }
      )
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    console.error("Failed to save bracket:", error);
    return { success: false, message: error.message };
  }
}
