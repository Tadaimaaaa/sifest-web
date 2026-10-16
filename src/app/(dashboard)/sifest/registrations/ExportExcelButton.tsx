"use client";

import { useState } from "react";
import { FileSpreadsheet, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { getAllRegistrationsForExport } from "./actions";

// Helper status formatters
const STATUS_TEXT: Record<string, string> = {
  PENDING: "Menunggu",
  WAITING_PAYMENT: "Menunggu Bayar",
  DOWN_PAYMENT: "Uang Muka (DP)",
  PAID: "Sudah Lunas",
  VERIFIED: "Terverifikasi",
  REJECTED: "Ditolak",
  CANCELLED: "Dibatalkan",
  EXPIRED: "Kedaluwarsa",
  FAILED: "Gagal",
  FREE: "Gratis (Free)"
};

function formatPaymentStatus(tx: any, metadata: any): string {
  if (tx?.payment_method === 'FREE') return 'Gratis (Free)';
  const status = tx?.status;
  if (status === 'PAID' || status === 'VERIFIED') return 'Sudah Lunas';
  if (status === 'DOWN_PAYMENT') return 'Uang Muka (DP)';
  if (status === 'WAITING_PAYMENT' || status === 'PENDING') return 'Menunggu Bayar';
  if (status === 'REJECTED') return 'Ditolak';
  if (status === 'CANCELLED') return 'Dibatalkan';

  if (metadata?.status_bayar) {
    if (metadata.status_bayar === 'Lunas') return 'Sudah Lunas';
    if (metadata.status_bayar === 'DP') return 'Uang Muka (DP)';
    return metadata.status_bayar;
  }

  return status || 'Belum Bayar';
}

function sanitizeSheetName(name: string, existingNames: Set<string>): string {
  // Excel limits sheet names to 31 chars and disallows \ / ? * [ ] :
  let clean = name.replace(/[\\\/\?\*\[\]\:]/g, " ").trim();
  
  // Singkatan umum agar muat dan rapi
  clean = clean
    .replace(/^Turnamen\s+/i, "")
    .replace(/^Open\s+/i, "")
    .trim();

  if (clean.length > 28) {
    clean = clean.substring(0, 28).trim();
  }
  if (!clean) clean = "Event";

  let finalName = clean;
  let counter = 1;
  while (existingNames.has(finalName.toLowerCase())) {
    finalName = `${clean.substring(0, 25)} (${counter++})`;
  }
  existingNames.add(finalName.toLowerCase());
  return finalName;
}

function autoFitColumns(data: any[]): { wch: number }[] {
  if (!data || data.length === 0) return [];
  const colWidths: number[] = [];
  const keys = Object.keys(data[0]);

  keys.forEach((key, colIndex) => {
    let maxLen = key.length;
    data.forEach(row => {
      const val = row[key];
      if (val !== undefined && val !== null) {
        const len = String(val).length;
        if (len > maxLen) maxLen = len;
      }
    });
    // Beri padding dan batas maksimal
    colWidths[colIndex] = Math.min(Math.max(maxLen + 3, 10), 60);
  });

  return colWidths.map(wch => ({ wch }));
}

export default function ExportExcelButton() {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    const toastId = toast.loading("Mengambil data seluruh peserta SI FEST...");

    try {
      const res = await getAllRegistrationsForExport();
      if (!res.success || !res.data) {
        throw new Error(res.error || "Gagal mengambil data dari database");
      }

      const allData = res.data;
      if (allData.length === 0) {
        toast.info("Tidak ada data pendaftar untuk diekspor", { id: toastId });
        setIsExporting(false);
        return;
      }

      toast.loading("Menyusun lembar kerja Excel per event...", { id: toastId });

      const wb = XLSX.utils.book_new();
      const usedSheetNames = new Set<string>();

      // 1. MASTER SHEET: "Semua Pendaftar"
      const masterRows = allData.map((item: any, idx: number) => {
        const p = item.participant || {};
        const e = item.event || {};
        const tx = item.transaction || {};
        const m = p.metadata || {};

        return {
          "No": idx + 1,
          "Kode Pendaftaran": item.registration_code,
          "Tanggal Daftar": new Date(item.created_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }),
          "Event": e.name || "-",
          "Nama Peserta / PJ": p.full_name || "-",
          "Institusi / Asal Sekolah / Tim": p.institution || "-",
          "No. WhatsApp": p.whatsapp || "-",
          "Email": p.email || "-",
          "Lokasi Tenda": m.id_tenda ? `Stand ${m.id_tenda}` : "-",
          "Status Pendaftaran": STATUS_TEXT[item.status] || item.status,
          "Status Pembayaran": formatPaymentStatus(tx, m),
          "Metode Bayar": tx.payment_method || (item.payment_proof_url ? "Manual Transfer" : "-"),
          "Nominal": tx.amount ? Number(tx.amount) : 0,
          "Bukti Pembayaran": item.payment_proof_url || "-"
        };
      });

      const wsMaster = XLSX.utils.json_to_sheet(masterRows);
      wsMaster["!cols"] = autoFitColumns(masterRows);
      XLSX.utils.book_append_sheet(wb, wsMaster, "Semua Pendaftar");
      usedSheetNames.add("semua pendaftar");

      // 2. GROUPING DATA BY EVENT
      const eventGroups: Record<string, { event: any; items: any[] }> = {};
      allData.forEach((item: any) => {
        const eventId = item.event?.id || "unknown";
        if (!eventGroups[eventId]) {
          eventGroups[eventId] = {
            event: item.event,
            items: []
          };
        }
        eventGroups[eventId].items.push(item);
      });

      // 3. CREATE DEDICATED SHEET PER EVENT
      Object.values(eventGroups).forEach(({ event, items }) => {
        const eventSlug = event?.slug || "";
        const eventName = event?.name || "Event";
        const sheetTitle = sanitizeSheetName(eventName, usedSheetNames);

        let eventRows: any[] = [];

        if (eventSlug.startsWith("open-bazaar")) {
          // FORMAT BAZAAR
          eventRows = items.map((item, idx) => {
            const p = item.participant || {};
            const tx = item.transaction || {};
            const m = p.metadata || {};
            return {
              "No": idx + 1,
              "Kode Pendaftaran": item.registration_code,
              "Tanggal Daftar": new Date(item.created_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }),
              "Nama Usaha / Brand": p.institution || "-",
              "Nama Penanggung Jawab": p.full_name || "-",
              "No. WhatsApp": p.whatsapp || "-",
              "Email": p.email || "-",
              "Lokasi Tenda": m.id_tenda ? `Stand ${m.id_tenda}` : "Belum Ditentukan",
              "Kategori Usaha": m.category || "-",
              "Produk Dijual": m.products || "-",
              "Alamat Usaha": m.address || "-",
              "Instagram": m.instagram || "-",
              "Status Pendaftaran": STATUS_TEXT[item.status] || item.status,
              "Status Pembayaran": formatPaymentStatus(tx, m),
              "Bukti Bayar": item.payment_proof_url || "-"
            };
          });
        } else if (eventSlug.includes("futsal")) {
          // FORMAT FUTSAL
          eventRows = items.map((item, idx) => {
            const p = item.participant || {};
            const tx = item.transaction || {};
            const m = p.metadata || {};
            const school = m.schoolData || {};
            const team = m.teamData || {};
            const players = Array.isArray(m.players) ? m.players : [];
            const captain = players[0] || {};

            const playerSummary = players
              .map((pl: any, pIdx: number) => `${pIdx + 1}. ${pl.name || "-"} (${pl.jerseyNumber ? `#${pl.jerseyNumber}` : ""}${pl.posisi ? ` - ${pl.posisi}` : ""})`)
              .join("; ");

            return {
              "No": idx + 1,
              "Kode Pendaftaran": item.registration_code,
              "Tanggal Daftar": new Date(item.created_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }),
              "Nama Tim / Sekolah": school.schoolName || p.institution || "-",
              "Asal Kota / Kab": school.city || "-",
              "Nama Kapten": captain.name || p.full_name || "-",
              "No. WA Kapten": captain.whatsapp || p.whatsapp || "-",
              "NISN / NIM Kapten": captain.nisn || "-",
              "Nama Pelatih / Pembina": team.coachName || school.coachName || "-",
              "No. WA Pelatih": team.coachWhatsapp || school.coachWhatsapp || "-",
              "Jumlah Pemain": players.length,
              "Rincian Pemain": playerSummary || "-",
              "Status Pendaftaran": STATUS_TEXT[item.status] || item.status,
              "Status Pembayaran": formatPaymentStatus(tx, m),
              "Bukti Bayar": item.payment_proof_url || "-"
            };
          });
        } else if (eventSlug === "turnamen-esport-mlbb") {
          // FORMAT MLBB
          eventRows = items.map((item, idx) => {
            const p = item.participant || {};
            const tx = item.transaction || {};
            const m = p.metadata || {};
            const team = m.teamData || {};
            const players = Array.isArray(m.players) ? m.players : [];

            const memberSummary = players
              .map((pl: any, pIdx: number) => `${pIdx + 1}. ${pl.name || "-"} [Ign: ${pl.nickname || "-"}, ID: ${pl.idGame || "-"}]`)
              .join("; ");

            return {
              "No": idx + 1,
              "Kode Pendaftaran": item.registration_code,
              "Tanggal Daftar": new Date(item.created_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }),
              "Nama Tim": team.teamName || p.institution || "-",
              "Kategori": team.teamCategory || "-",
              "Nama Kapten": team.captainName || p.full_name || "-",
              "No. WA Kapten": team.captainWhatsapp || p.whatsapp || "-",
              "Nama Pelatih": team.coachName || "-",
              "WA Pelatih": team.coachWhatsapp || "-",
              "Jumlah Anggota": players.length,
              "Rincian Anggota": memberSummary || "-",
              "Status Pendaftaran": STATUS_TEXT[item.status] || item.status,
              "Status Pembayaran": formatPaymentStatus(tx, m),
              "Bukti Bayar": item.payment_proof_url || "-"
            };
          });
        } else if (eventSlug === "turnamen-esport-efootball") {
          // FORMAT E-FOOTBALL
          eventRows = items.map((item, idx) => {
            const p = item.participant || {};
            const tx = item.transaction || {};
            const m = p.metadata || {};
            return {
              "No": idx + 1,
              "Kode Pendaftaran": item.registration_code,
              "Tanggal Daftar": new Date(item.created_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }),
              "Nama Peserta": p.full_name || "-",
              "No. WhatsApp": p.whatsapp || "-",
              "Email": p.email || "-",
              "Asal Institusi / Daerah": p.institution || "-",
              "Jumlah Slot": m.slotCount === "2" ? "2 Slot" : "1 Slot",
              "Nama In-Game Slot 2": m.slotCount === "2" ? (m.teamName2 || "-") : "-",
              "Status Pendaftaran": STATUS_TEXT[item.status] || item.status,
              "Status Pembayaran": formatPaymentStatus(tx, m),
              "Bukti Bayar": item.payment_proof_url || "-"
            };
          });
        } else if (eventSlug.includes("keagamaan") || eventSlug.includes("mtq")) {
          // FORMAT MTQ / KEAGAMAAN
          eventRows = items.map((item, idx) => {
            const p = item.participant || {};
            const tx = item.transaction || {};
            const m = p.metadata || {};
            return {
              "No": idx + 1,
              "Kode Pendaftaran": item.registration_code,
              "Tanggal Daftar": new Date(item.created_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }),
              "Nama Peserta": p.full_name || "-",
              "Asal Sekolah / Madrasah": p.institution || "-",
              "No. WhatsApp": p.whatsapp || "-",
              "Email": p.email || "-",
              "Guru / Pendamping": m.guruPendamping || "-",
              "WA Guru Pendamping": m.nowaGuruPendamping || "-",
              "Status Pendaftaran": STATUS_TEXT[item.status] || item.status,
              "Status Pembayaran": formatPaymentStatus(tx, m),
              "Bukti Bayar": item.payment_proof_url || "-"
            };
          });
        } else if (eventSlug.includes("seminar")) {
          // FORMAT SEMINAR
          eventRows = items.map((item, idx) => {
            const p = item.participant || {};
            const tx = item.transaction || {};
            const m = p.metadata || {};
            return {
              "No": idx + 1,
              "Kode Pendaftaran": item.registration_code,
              "Tanggal Daftar": new Date(item.created_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }),
              "Nama Peserta": p.full_name || "-",
              "Asal Institusi": p.institution || "-",
              "No. WhatsApp": p.whatsapp || "-",
              "Email": p.email || "-",
              "Jurusan": m.jurusan || "-",
              "No BP / NIM": m.nobp || "-",
              "Kelas": m.kelas || "-",
              "Status Pendaftaran": STATUS_TEXT[item.status] || item.status,
              "Status Pembayaran": formatPaymentStatus(tx, m),
              "Bukti Bayar": item.payment_proof_url || "-"
            };
          });
        } else {
          // GENERAL FORMAT FOR OTHER EVENTS
          eventRows = items.map((item, idx) => {
            const p = item.participant || {};
            const tx = item.transaction || {};
            const m = p.metadata || {};
            return {
              "No": idx + 1,
              "Kode Pendaftaran": item.registration_code,
              "Tanggal Daftar": new Date(item.created_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }),
              "Nama Peserta": p.full_name || "-",
              "Institusi / Tim": p.institution || "-",
              "No. WhatsApp": p.whatsapp || "-",
              "Email": p.email || "-",
              "Status Pendaftaran": STATUS_TEXT[item.status] || item.status,
              "Status Pembayaran": formatPaymentStatus(tx, m),
              "Bukti Bayar": item.payment_proof_url || "-"
            };
          });
        }

        const wsEvent = XLSX.utils.json_to_sheet(eventRows);
        wsEvent["!cols"] = autoFitColumns(eventRows);
        XLSX.utils.book_append_sheet(wb, wsEvent, sheetTitle);
      });

      // 4. WRITE WORKBOOK TO BROWSER DOWNLOAD
      const now = new Date();
      const dateStr = now.toISOString().split("T")[0];
      const fileName = `Data_Peserta_SIFEST_2026_${dateStr}.xlsx`;

      XLSX.writeFile(wb, fileName);
      toast.success("File Excel berhasil diunduh!", { id: toastId });
    } catch (err: any) {
      console.error("Gagal ekspor Excel:", err);
      toast.error(`Gagal mengekspor data: ${err.message || err}`, { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={isExporting}
      className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
      title="Ekspor seluruh data peserta ke Excel (Tiap event beda sheet)"
    >
      {isExporting ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-white" />
          <span>Mengekspor...</span>
        </>
      ) : (
        <>
          <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
          <span>Ekspor Excel</span>
        </>
      )}
    </button>
  );
}
