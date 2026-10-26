"use server";

import { supabaseServer } from "@/lib/sifest/supabase";
import { unstable_noStore as noStore, revalidatePath } from 'next/cache';

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

    // 3. Format the data to match the Dashboard's Participant table & Attendance
    const formattedParticipants = registrations?.map((reg: any) => {
      const participant = (Array.isArray(reg.participants) ? reg.participants[0] : reg.participants) || {};
      const txList = Array.isArray(reg.transactions) ? reg.transactions : (reg.transactions ? [reg.transactions] : []);
      
      const hasPaidTx = txList.some((t: any) => 
        ['PAID', 'VERIFIED', 'SETTLED', 'SUCCESS'].includes((t?.status || '').toUpperCase()) || 
        (t?.payment_method || '').toUpperCase() === 'FREE'
      );
      const hasDpTx = txList.some((t: any) => 
        ['DOWN_PAYMENT', 'DP'].includes((t?.status || '').toUpperCase())
      );

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

      const metadata = participant.metadata || {};
      const attendance = metadata.attendance || null;
      const attended = Boolean(attendance?.present);
      const attended_at = attendance?.attended_at || null;

      const nobp = metadata.nobp || metadata.nim || metadata.no_bp || metadata.nisn || null;
      const jurusan = metadata.jurusan || metadata.prodi || metadata.program_studi || metadata.major || null;
      const kelas = metadata.kelas || metadata.class || null;

      return {
        id: reg.id,
        participant_id: participant.id || reg.participant_id,
        id_peserta: reg.registration_code,
        registration_code: reg.registration_code,
        nama_lengkap: participant.full_name || "Unknown",
        institusi: participant.institution || participant.institution_name || "-",
        email: participant.email || "-",
        kontak: participant.phone_number || participant.whatsapp || "-",
        status_bayar: paymentStatus,
        created_at: reg.created_at,
        attended,
        attended_at,
        attendance,
        metadata,
        nobp,
        jurusan,
        kelas
      };
    }) || [];

    return { success: true, data: formattedParticipants };
  } catch (error: any) {
    console.error("Failed to fetch seminar registrations:", error);
    return { success: false, data: [], message: error.message };
  }
}

export async function toggleSeminarAttendance(participantId: string, present: boolean) {
  try {
    if (!participantId) {
      return { success: false, message: "ID Peserta tidak valid" };
    }

    // Ambil metadata terkini
    const { data: pData, error: fetchErr } = await supabaseServer
      .from("participants")
      .select("id, full_name, metadata")
      .eq("id", participantId)
      .single();

    if (fetchErr || !pData) {
      return { success: false, message: "Peserta tidak ditemukan" };
    }

    const currentMeta = pData.metadata || {};
    const updatedAttendance = {
      present,
      attended_at: present ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    };

    const newMeta = {
      ...currentMeta,
      attendance: updatedAttendance
    };

    const { error: updateErr } = await supabaseServer
      .from("participants")
      .update({ metadata: newMeta })
      .eq("id", participantId);

    if (updateErr) {
      return { success: false, message: updateErr.message };
    }

    revalidatePath("/event/seminar");
    revalidatePath("/event/seminar/absensi");
    return { 
      success: true, 
      attended: present, 
      attended_at: updatedAttendance.attended_at,
      participant_name: pData.full_name 
    };
  } catch (error: any) {
    console.error("Gagal update absensi:", error);
    return { success: false, message: error.message || "Gagal memperbarui absensi" };
  }
}

async function checkInSingleParticipant(match: any) {
  if (match.attended) {
    return { 
      success: true, 
      alreadyCheckedIn: true, 
      data: match, 
      message: `${match.nama_lengkap} sudah absen sebelumnya pada ${new Date(match.attended_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB.` 
    };
  }

  const toggleRes = await toggleSeminarAttendance(match.participant_id, true);
  if (!toggleRes.success) {
    return { success: false, message: toggleRes.message };
  }

  return {
    success: true,
    alreadyCheckedIn: false,
    data: {
      ...match,
      attended: true,
      attended_at: toggleRes.attended_at
    },
    message: `Presensi berhasil! ${match.nama_lengkap} tercatat HADIR.`
  };
}

export async function checkInSeminarByCode(codeRaw: string) {
  try {
    let searchCode = codeRaw.trim();
    let searchId = "";

    // Cek jika input adalah JSON string dari QR e-ticket
    if (searchCode.startsWith("{") && searchCode.endsWith("}")) {
      try {
        const parsed = JSON.parse(searchCode);
        if (parsed.code) searchCode = String(parsed.code).trim();
        if (parsed.id) searchId = String(parsed.id).trim();
      } catch (e) {
        // Abaikan parse error, gunakan raw
      }
    }

    // Direct indexed query ke tabel registrations (sangat cepat ~50ms)
    let query = supabaseServer
      .from("registrations")
      .select("id, registration_code, participant_id, created_at, participants(*), transactions(*)");

    if (searchCode && searchId) {
      query = query.or(`registration_code.ilike.${searchCode},id.eq.${searchId}`);
    } else if (searchCode) {
      query = query.or(`registration_code.ilike.${searchCode},id.eq.${searchCode}`);
    } else if (searchId) {
      query = query.eq("id", searchId);
    }

    const { data: regList, error: regErr } = await query.limit(1);

    if (regErr || !regList || regList.length === 0) {
      // Fallback: cari dari seluruh pendaftar seminar
      const registrationsRes = await getSeminarRegistrations();
      const participants = registrationsRes.data || [];
      const match = participants.find((p: any) => 
        (searchCode && p.registration_code?.toLowerCase() === searchCode.toLowerCase()) ||
        (searchId && (p.id === searchId || p.participant_id === searchId)) ||
        (searchCode && (p.id === searchCode || p.participant_id === searchCode))
      );

      if (!match) {
        return { 
          success: false, 
          message: `Peserta dengan kode "${searchCode || searchId}" tidak terdaftar di Seminar SI FEST 2026.` 
        };
      }
      return await checkInSingleParticipant(match);
    }

    const reg = regList[0];
    const participant = (Array.isArray(reg.participants) ? reg.participants[0] : reg.participants) || {};
    const transaction = (Array.isArray(reg.transactions) ? reg.transactions[0] : reg.transactions) || {};

    let paymentStatus = "Belum Bayar";
    if (transaction?.payment_method === "FREE") paymentStatus = "Lunas";
    else if (transaction?.status === "PAID" || transaction?.status === "VERIFIED") paymentStatus = "Lunas";
    else if (transaction?.status === "DOWN_PAYMENT" || transaction?.status === "PENDING") paymentStatus = "DP";

    const metadata = participant.metadata || {};
    const attendance = metadata.attendance || null;
    const attended = Boolean(attendance?.present);
    const attended_at = attendance?.attended_at || null;

    const nobp = metadata.nobp || metadata.nim || metadata.no_bp || metadata.nisn || null;
    const jurusan = metadata.jurusan || metadata.prodi || metadata.program_studi || metadata.major || null;
    const kelas = metadata.kelas || metadata.class || null;

    const formattedMatch = {
      id: reg.id,
      participant_id: participant.id || reg.participant_id,
      id_peserta: reg.registration_code,
      registration_code: reg.registration_code,
      nama_lengkap: participant.full_name || "Unknown",
      institusi: participant.institution || participant.institution_name || "-",
      email: participant.email || "-",
      kontak: participant.phone_number || participant.whatsapp || "-",
      status_bayar: paymentStatus,
      created_at: reg.created_at,
      attended,
      attended_at,
      attendance,
      metadata,
      nobp,
      jurusan,
      kelas
    };

    return await checkInSingleParticipant(formattedMatch);
  } catch (error: any) {
    console.error("Gagal check-in peserta seminar:", error);
    return { success: false, message: error.message || "Gagal melakukan presensi" };
  }
}

export async function bulkToggleSeminarAttendance(participantIds: string[], present: boolean) {
  try {
    if (!participantIds || participantIds.length === 0) {
      return { success: false, message: "Daftar peserta kosong" };
    }

    for (const pId of participantIds) {
      const { data: pData } = await supabaseServer
        .from("participants")
        .select("id, metadata")
        .eq("id", pId)
        .single();

      if (pData) {
        const currentMeta = pData.metadata || {};
        const newMeta = {
          ...currentMeta,
          attendance: {
            present,
            attended_at: present ? new Date().toISOString() : null,
            updated_at: new Date().toISOString()
          }
        };
        await supabaseServer
          .from("participants")
          .update({ metadata: newMeta })
          .eq("id", pId);
      }
    }

    revalidatePath("/event/seminar");
    revalidatePath("/event/seminar/absensi");
    return { success: true, count: participantIds.length };
  } catch (error: any) {
    return { success: false, message: error.message || "Gagal memperbarui massal" };
  }
}
