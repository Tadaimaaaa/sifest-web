"use server";

import { supabaseServer } from "@/lib/sifest/supabase";
import { unstable_noStore as noStore, revalidatePath } from 'next/cache';

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
      const txList = Array.isArray(reg.transactions) ? reg.transactions : (reg.transactions ? [reg.transactions] : []);
      
      // Cek apakah ada transaksi berstatus PAID / VERIFIED / FREE
      const hasPaidTx = txList.some((t: any) => 
        ['PAID', 'VERIFIED', 'SETTLED', 'SUCCESS'].includes((t?.status || '').toUpperCase()) || 
        (t?.payment_method || '').toUpperCase() === 'FREE'
      );
      // Cek apakah ada transaksi berstatus DOWN_PAYMENT / DP
      const hasDpTx = txList.some((t: any) => 
        ['DOWN_PAYMENT', 'DP'].includes((t?.status || '').toUpperCase())
      );

      // Cek status dari tabel registrations (jika sudah diverifikasi oleh panitia / bendahara)
      const regStatus = (reg.status || '').toUpperCase();
      const isRegPaid = ['PAID', 'VERIFIED', 'CONFIRMED'].includes(regStatus);
      const isRegDp = ['DOWN_PAYMENT', 'DP'].includes(regStatus);

      let paymentStatus = "Belum Bayar";
      if (hasPaidTx || isRegPaid) {
        paymentStatus = "Lunas";
      } else if (hasDpTx || isRegDp) {
        paymentStatus = "DP";
      } else {
        paymentStatus = "Belum Bayar";
      }

      return {
        id_tim: reg.registration_code,
        reg_id: reg.id,
        nama_tim: participant.metadata?.schoolData?.schoolName || participant.metadata?.teamData?.teamName || participant.institution || participant.institution_name || participant.full_name || "Unknown Squad",
        kapten: participant.metadata?.schoolData?.coachName || participant.metadata?.teamData?.captainName || participant.full_name,
        kontak: participant.whatsapp || participant.phone_number || "-",
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

export async function updateFutsalPaymentStatus(registrationId: string, newStatus: string) {
  try {
    const txStatus = newStatus === 'Lunas' ? 'PAID' : newStatus === 'DP' ? 'DOWN_PAYMENT' : 'PENDING';
    const regStatus = newStatus === 'Lunas' ? 'VERIFIED' : newStatus === 'DP' ? 'DOWN_PAYMENT' : 'PENDING';

    // 1. Update status di tabel registrations
    await supabaseServer
      .from('registrations')
      .update({ status: regStatus })
      .eq('id', registrationId);

    // 2. Update atau buat record di tabel transactions
    const { data: existingTx } = await supabaseServer
      .from('transactions')
      .select('id')
      .eq('registration_id', registrationId)
      .maybeSingle();

    if (existingTx?.id) {
      await supabaseServer
        .from('transactions')
        .update({
          status: txStatus,
          ...(txStatus === 'PAID' ? { paid_at: new Date().toISOString() } : {}),
        })
        .eq('id', existingTx.id);
    } else {
      await supabaseServer
        .from('transactions')
        .insert({
          registration_id: registrationId,
          amount: 0,
          status: txStatus,
          payment_method: 'MANUAL',
          ...(txStatus === 'PAID' ? { paid_at: new Date().toISOString() } : {}),
        });
    }

    revalidatePath('/event/futsal/sma');
    revalidatePath('/event/futsal/mahasiswa');
    revalidatePath('/sifest/registrations');
    revalidatePath(`/sifest/registrations/${registrationId}`);

    return { success: true };
  } catch (error: any) {
    console.error("Failed to update futsal payment status:", error);
    return { success: false, message: error.message };
  }
}

