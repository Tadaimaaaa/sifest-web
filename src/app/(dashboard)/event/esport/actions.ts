"use server";

import { supabaseServer } from "@/lib/sifest/supabase";

export async function getEsportRegistrations(gameSlug: string) {
  try {
    // 1. Get the Esport event ID
    const { data: eventData } = await supabaseServer
      .from("events")
      .select("id")
      .eq("slug", gameSlug)
      .single();

    if (!eventData) {
      return { success: false, data: [] };
    }

    // 2. Get registrations and bracket for this event concurrently
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
      console.error("Supabase Error:", regsResult.error);
      return { success: false, data: [], bracket: null };
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
      
      // Convert Supabase transaction status to our UI's payment status
      let paymentStatus = "Belum Bayar";
      if (transaction?.status === "PAID") paymentStatus = "Lunas";
      else if (transaction?.status === "PENDING") paymentStatus = "DP"; // Approximation for UI

      return {
        id_tim: reg.registration_code,
        nama_tim: gameSlug === "turnamen-esport-efootball" 
          ? participant.full_name
          : (participant.metadata?.teamData?.teamName || participant.institution || participant.institution_name || participant.full_name || "Unknown Squad"),
        kapten: participant.metadata?.teamData?.captainName || participant.full_name,
        kontak: participant.whatsapp || participant.phone_number || "-",
        status_bayar: paymentStatus,
        slot_count: participant.metadata?.slotCount || '1',
        in_game_slot2: participant.metadata?.teamName2 || null,
      };
    }) || [];

    return { success: true, data: formattedTeams, bracket: bracketData };
  } catch (error) {
    console.error("Failed to fetch esport registrations:", error);
    return { success: false, data: [], bracket: null };
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
    console.error("Failed to save esport bracket:", error);
    return { success: false, message: error.message };
  }
}
