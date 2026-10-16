"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Cookies from "js-cookie";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Printer,
  Download,
  Camera,
  Users,
  UserCheck,
  UserX,
  CreditCard,
  Loader2,
  X,
  Sparkles,
  Phone,
  Check
} from "lucide-react";
import {
  getSeminarRegistrations,
  toggleSeminarAttendance,
  checkInSeminarByCode
} from "../actions";
import { SCRIPT_URL } from "@/lib/api";
import QRScanner from "@/components/scanner/QRScanner";

interface Participant {
  id: string;
  participant_id: string;
  id_peserta: string;
  registration_code: string;
  nama_lengkap: string;
  institusi: string;
  email: string;
  kontak: string;
  status_bayar: string;
  created_at?: string;
  attended: boolean;
  attended_at: string | null;
  attendance?: any;
}

interface EventData {
  id: string;
  nama: string;
  kategori: string;
  deskripsi: string;
  tanggal: string;
  waktu?: string;
  lokasi?: string;
  tempat?: string;
  status: string;
}

export default function SeminarAbsensiPage() {
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"ALL" | "HADIR" | "BELUM" | "LUNAS">("ALL");
  
  // Quick Code Check-in
  const [manualCode, setManualCode] = useState("");
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const quickInputRef = useRef<HTMLInputElement>(null);

  // QR Scanner Modal State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [continuousMode, setContinuousMode] = useState(true);
  const [lastScannedResult, setLastScannedResult] = useState<{
    success: boolean;
    name: string;
    code: string;
    institution: string;
    time: string;
    alreadyCheckedIn?: boolean;
  } | null>(null);

  // Updating single participant state
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const userDataStr = Cookies.get("user_data");
    if (userDataStr) {
      try {
        const user = JSON.parse(userDataStr);
        setCurrentUserRole(user.role_id || user.role || "");
      } catch (e) {}
    }
    fetchData();
  }, []);

  const canView = ["ROLE-001", "SUPER_ADMIN", "ROLE-002", "ROLE-003", "ROLE-011", "ROLE-005"].includes(currentUserRole);

  // Beep sound generator for successful scan using Web Audio API
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      // Audio not permitted or not supported
    }
  };

  const fetchData = async () => {
    setIsLoading(true);

    // 1. Ambil data peserta dari Supabase
    getSeminarRegistrations()
      .then((res) => {
        if (res.success && res.data) {
          setParticipants(res.data);
        } else {
          toast.error(res.message || "Gagal memuat peserta seminar");
        }
      })
      .catch((err) => {
        toast.error("Terjadi kesalahan memuat data peserta");
        console.error(err);
      })
      .finally(() => {
        setIsLoading(false);
      });

    // 2. Ambil info event dari Google Apps Script
    try {
      const token = Cookies.get("session_token");
      fetch(`${SCRIPT_URL}?action=getEvent&id_event=seminar&token=${token}`)
        .then((res) => res.json())
        .then((res) => {
          if (res.success && res.data) {
            setEventData(res.data);
          }
        })
        .catch(() => {});
    } catch (e) {}
  };

  // Toggle single participant attendance
  const handleToggleAttendance = async (participant: Participant) => {
    const nextStatus = !participant.attended;
    setUpdatingId(participant.participant_id);

    // Optimistic UI update
    const previousParticipants = [...participants];
    const nowIso = new Date().toISOString();
    setParticipants((prev) =>
      prev.map((p) =>
        p.participant_id === participant.participant_id
          ? { ...p, attended: nextStatus, attended_at: nextStatus ? nowIso : null }
          : p
      )
    );

    try {
      const res = await toggleSeminarAttendance(participant.participant_id, nextStatus);
      if (res.success) {
        toast.success(
          nextStatus
            ? `${participant.nama_lengkap} tercatat HADIR.`
            : `Kehadiran ${participant.nama_lengkap} dibatalkan.`
        );
      } else {
        // Rollback
        setParticipants(previousParticipants);
        toast.error(res.message || "Gagal memperbarui status presensi");
      }
    } catch (err: any) {
      setParticipants(previousParticipants);
      toast.error(`Error: ${err.message || "Gagal memperbarui presensi"}`);
    } finally {
      setUpdatingId(null);
    }
  };

  // Handle Quick Code Check-in (input field)
  const handleManualCheckIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = manualCode.trim();
    if (!code) {
      toast.error("Silakan masukkan ID atau kode tiket peserta!");
      return;
    }

    setIsCheckingIn(true);
    try {
      const res = await checkInSeminarByCode(code);
      if (res.success && res.data) {
        playBeep();
        // Update local state
        setParticipants((prev) =>
          prev.map((p) =>
            p.participant_id === res.data.participant_id
              ? { ...p, attended: true, attended_at: res.data.attended_at }
              : p
          )
        );
        if (res.alreadyCheckedIn) {
          toast.info(res.message);
        } else {
          toast.success(res.message);
        }
        setManualCode("");
        quickInputRef.current?.focus();
      } else {
        toast.error(res.message || "Peserta tidak ditemukan");
      }
    } catch (err: any) {
      toast.error("Gagal melakukan check-in peserta");
    } finally {
      setIsCheckingIn(false);
    }
  };

  // Handle QR Scan Success
  const handleScanSuccess = async (decodedText: string) => {
    try {
      const res = await checkInSeminarByCode(decodedText);
      if (res.success && res.data) {
        playBeep();
        // Update local state
        setParticipants((prev) =>
          prev.map((p) =>
            p.participant_id === res.data.participant_id
              ? { ...p, attended: true, attended_at: res.data.attended_at }
              : p
          )
        );

        const timeStr = new Date(res.data.attended_at || new Date()).toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        }) + " WIB";

        setLastScannedResult({
          success: true,
          name: res.data.nama_lengkap,
          code: res.data.registration_code || res.data.id_peserta,
          institution: res.data.institusi,
          time: timeStr,
          alreadyCheckedIn: res.alreadyCheckedIn
        });

        if (res.alreadyCheckedIn) {
          toast.info(res.message);
        } else {
          toast.success(res.message);
        }

        if (!continuousMode) {
          setIsScannerOpen(false);
        }
      } else {
        toast.error(res.message || "QR Code tidak dikenali sebagai peserta seminar");
      }
    } catch (err: any) {
      toast.error("Gagal memproses QR Code");
    }
  };

  // Ekspor Excel Presensi
  const handleExportExcel = () => {
    if (participants.length === 0) {
      toast.error("Tidak ada data peserta untuk diekspor!");
      return;
    }

    const excelData = participants.map((p, idx) => ({
      "No": idx + 1,
      "ID Registrasi": p.registration_code || p.id_peserta,
      "Nama Lengkap": p.nama_lengkap,
      "Institusi / Asal": p.institusi,
      "Email": p.email,
      "No WhatsApp": p.kontak,
      "Status Pembayaran": p.status_bayar,
      "Status Kehadiran": p.attended ? "HADIR" : "BELUM HADIR",
      "Waktu Kehadiran": p.attended_at
        ? new Date(p.attended_at).toLocaleString("id-ID", {
            dateStyle: "medium",
            timeStyle: "short"
          })
        : "-"
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Presensi Seminar");

    // Auto-fit column widths
    const columnWidths = [
      { wch: 6 },
      { wch: 20 },
      { wch: 30 },
      { wch: 30 },
      { wch: 28 },
      { wch: 18 },
      { wch: 20 },
      { wch: 18 },
      { wch: 25 }
    ];
    worksheet["!cols"] = columnWidths;

    const dateStr = new Date().toISOString().split("T")[0];
    XLSX.writeFile(workbook, `Presensi_Seminar_SI_FEST_2026_${dateStr}.xlsx`);
    toast.success("Data presensi berhasil diekspor ke Excel!");
  };

  // Filter participants
  const filteredParticipants = participants.filter((p) => {
    // Search filter
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      p.nama_lengkap.toLowerCase().includes(q) ||
      p.id_peserta.toLowerCase().includes(q) ||
      (p.registration_code && p.registration_code.toLowerCase().includes(q)) ||
      p.institusi.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.kontak.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    // Tab filter
    if (filterTab === "HADIR") return p.attended;
    if (filterTab === "BELUM") return !p.attended;
    if (filterTab === "LUNAS") return p.status_bayar === "Lunas";
    return true;
  });

  // KPI Calculations
  const totalCount = participants.length;
  const attendedCount = participants.filter((p) => p.attended).length;
  const unattendedCount = totalCount - attendedCount;
  const attendedPercentage = totalCount > 0 ? Math.round((attendedCount / totalCount) * 100) : 0;
  const lunasCount = participants.filter((p) => p.status_bayar === "Lunas").length;

  if (!canView && currentUserRole) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <Users className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Akses Ditolak</h2>
          <p className="text-slate-500 max-w-md">Anda tidak memiliki izin untuk mengelola absensi seminar.</p>
          <Link
            href="/event/seminar"
            className="inline-block mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
          >
            Kembali ke Seminar
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ============================================================== */}
      {/* 1. SCREEN VIEW (Hidden when printing)                          */}
      {/* ============================================================== */}
      <div className="space-y-6 pb-12 print:hidden animate-in fade-in duration-300">
        
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/event/seminar"
              className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors shadow-xs"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  Absensi Seminar
                  {isLoading && <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
                </h1>
                <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 font-semibold text-xs rounded-full">
                  Realtime Check-in
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Presensi kehadiran peserta Seminar Nasional SI FEST 2026
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsScannerOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm shadow-sm hover:shadow transition-all"
            >
              <Camera className="w-4 h-4" />
              <span>Scan QR Tiket</span>
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-semibold text-sm shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>Cetak Lembar Presensi</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm shadow-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Ekspor Excel</span>
            </button>
          </div>
        </div>

        {/* KPI Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Peserta */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Peserta</span>
              <div className="text-2xl font-bold text-slate-800">{totalCount}</div>
              <div className="text-xs text-slate-500">Terdaftar di sistem</div>
            </div>
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
          </div>

          {/* Hadir */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Peserta Hadir</span>
              <div className="text-2xl font-bold text-emerald-600 flex items-baseline gap-2">
                <span>{attendedCount}</span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  {attendedPercentage}%
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${attendedPercentage}%` }}
                />
              </div>
            </div>
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>

          {/* Belum Hadir */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Belum Hadir</span>
              <div className="text-2xl font-bold text-amber-600">{unattendedCount}</div>
              <div className="text-xs text-slate-500">Menunggu check-in</div>
            </div>
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
              <UserX className="w-6 h-6" />
            </div>
          </div>

          {/* Status Bayar Lunas */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Terverifikasi Lunas</span>
              <div className="text-2xl font-bold text-slate-800">{lunasCount}</div>
              <div className="text-xs text-slate-500">{totalCount - lunasCount} Menunggu/DP</div>
            </div>
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center shrink-0">
              <CreditCard className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Quick Check-in Bar */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 rounded-2xl p-4 sm:p-5 text-white shadow-md">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-base sm:text-lg">Check-in Cepat Peserta</h3>
              </div>
              <p className="text-xs sm:text-sm text-blue-100">
                Ketik atau tempel kode pendaftaran tiket (misal: SIF-2026-F4EFA4) lalu tekan Enter.
              </p>
            </div>

            <form onSubmit={handleManualCheckIn} className="flex items-center gap-2 w-full lg:max-w-md">
              <div className="relative flex-1">
                <input
                  ref={quickInputRef}
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  placeholder="Kode Tiket (SIF-2026-...)"
                  className="w-full pl-4 pr-10 py-2.5 bg-white/10 text-white placeholder-blue-200 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/40 font-mono text-sm uppercase"
                />
                {manualCode && (
                  <button
                    type="button"
                    onClick={() => setManualCode("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-200 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={isCheckingIn || !manualCode.trim()}
                className="px-5 py-2.5 bg-white text-indigo-700 hover:bg-blue-50 font-bold text-sm rounded-xl transition-all shadow-sm flex items-center gap-1.5 shrink-0 disabled:opacity-50"
              >
                {isCheckingIn ? (
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-700" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>Check-in</span>
              </button>
            </form>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl">
            <button
              onClick={() => setFilterTab("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterTab === "ALL"
                  ? "bg-white text-slate-800 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Semua ({totalCount})
            </button>
            <button
              onClick={() => setFilterTab("HADIR")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterTab === "HADIR"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-emerald-700"
              }`}
            >
              Hadir ({attendedCount})
            </button>
            <button
              onClick={() => setFilterTab("BELUM")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterTab === "BELUM"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "text-slate-600 hover:text-amber-700"
              }`}
            >
              Belum Hadir ({unattendedCount})
            </button>
            <button
              onClick={() => setFilterTab("LUNAS")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterTab === "LUNAS"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-purple-700"
              }`}
            >
              Lunas ({lunasCount})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, ID, kampus..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* Participants Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4 text-center w-12">No</th>
                  <th className="py-3.5 px-4">ID Peserta</th>
                  <th className="py-3.5 px-4">Nama Lengkap</th>
                  <th className="py-3.5 px-4">Institusi / Asal</th>
                  <th className="py-3.5 px-4">Kontak WA</th>
                  <th className="py-3.5 px-4">Status Bayar</th>
                  <th className="py-3.5 px-4">Kehadiran</th>
                  <th className="py-3.5 px-4 text-center">Aksi Presensi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto mb-2" />
                      Memuat data peserta...
                    </td>
                  </tr>
                ) : filteredParticipants.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Tidak ada peserta yang cocok dengan kriteria pencarian / filter.
                    </td>
                  </tr>
                ) : (
                  filteredParticipants.map((p, idx) => (
                    <tr
                      key={p.participant_id || p.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        p.attended ? "bg-emerald-50/20" : ""
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center text-slate-400 font-mono text-xs">
                        {idx + 1}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                          {p.registration_code || p.id_peserta}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{p.nama_lengkap}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{p.email}</div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {p.institusi}
                      </td>

                      <td className="py-3.5 px-4">
                        {p.kontak && p.kontak !== "-" ? (
                          <a
                            href={`https://wa.me/${p.kontak.replace(/^0/, "62").replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-800 font-medium bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60"
                          >
                            <Phone className="w-3 h-3 text-emerald-600" />
                            <span>{p.kontak}</span>
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            p.status_bayar === "Lunas"
                              ? "bg-emerald-100 text-emerald-700"
                              : p.status_bayar === "DP"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {p.status_bayar}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {p.attended ? (
                          <div className="inline-flex flex-col">
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Hadir
                            </span>
                            {p.attended_at && (
                              <span className="text-[10px] text-slate-400 mt-0.5 font-mono">
                                {new Date(p.attended_at).toLocaleTimeString("id-ID", {
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}{" "}
                                WIB
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                            <Clock className="w-3 h-3 text-slate-400" />
                            Belum Hadir
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleToggleAttendance(p)}
                          disabled={updatingId === p.participant_id}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 mx-auto ${
                            p.attended
                              ? "bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200"
                              : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                          } disabled:opacity-50`}
                        >
                          {updatingId === p.participant_id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : p.attended ? (
                            <>
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Batal Hadir</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Tandai Hadir</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ============================================================== */}
      {/* 2. QR SCANNER MODAL                                           */}
      {/* ============================================================== */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200 print:hidden">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Scanner Tiket Peserta</h3>
                  <p className="text-xs text-slate-500">Scan QR Code E-Ticket untuk check-in instan</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsScannerOpen(false);
                  setLastScannedResult(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              {/* Continuous mode toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-xs font-semibold text-slate-700">Mode Scan Beruntun (Pintu Masuk)</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={continuousMode}
                    onChange={(e) => setContinuousMode(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* QR Scanner View */}
              <div className="pt-2">
                <QRScanner onScanSuccess={handleScanSuccess} />
              </div>

              {/* Last Scanned Feedback Card */}
              {lastScannedResult && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 animate-in zoom-in-95 duration-200 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                          {lastScannedResult.alreadyCheckedIn ? "Sudah Hadir Sebelumnya" : "Presensi Berhasil!"}
                        </span>
                        <span className="text-[11px] font-mono text-emerald-700">{lastScannedResult.time}</span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm mt-0.5 truncate">
                        {lastScannedResult.name}
                      </h4>
                      <div className="text-xs text-slate-600 mt-0.5 flex flex-wrap gap-x-2">
                        <span>ID: <strong className="font-mono text-slate-800">{lastScannedResult.code}</strong></span>
                        <span>•</span>
                        <span>{lastScannedResult.institution}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsScannerOpen(false);
                  setLastScannedResult(null);
                }}
                className="px-5 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-sm font-semibold transition-colors"
              >
                Selesai
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. OFFICIAL PRINT VIEW (A4 Physical Attendance Sheet)         */}
      {/* ============================================================== */}
      <div className="hidden print:block p-8 bg-white text-black font-sans text-xs">
        {/* Kop Surat Resmi */}
        <div className="border-b-2 border-black pb-4 mb-5 text-center">
          <div className="text-sm font-bold tracking-wider uppercase">
            HIMPUNAN MAHASISWA JURUSAN SISTEM INFORMASI (HMJ SI)
          </div>
          <div className="text-xs uppercase font-medium mt-0.5">
            FAKULTAS ILMU KOMPUTER - UNIVERSITAS PUTRA INDONESIA &quot;YPTK&quot; PADANG
          </div>
          <div className="text-base font-extrabold uppercase mt-1 tracking-wide">
            SI FESTIVAL (SI FEST) 2026
          </div>
          <div className="text-[10px] text-gray-700 mt-0.5">
            Sekretariat: Kampus UPI &quot;YPTK&quot; Padang, Jl. Raya Lubuk Begalung, Padang, Sumatera Barat
          </div>
        </div>

        {/* Judul Dokumen */}
        <div className="text-center my-4 space-y-1">
          <h2 className="text-sm font-extrabold uppercase tracking-wide underline">
            DAFTAR HADIR PESERTA SEMINAR NASIONAL
          </h2>
          <p className="text-[11px] font-semibold text-gray-800">
            SI FEST (SISTEM INFORMASI FESTIVAL) 2026
          </p>
        </div>

        {/* Informasi Pelaksanaan */}
        <div className="grid grid-cols-2 gap-y-1 gap-x-4 mb-4 text-[11px] border border-gray-300 p-2.5 rounded bg-gray-50/50">
          <div>
            <span className="font-semibold w-24 inline-block">Hari / Tanggal</span>
            <span>: {eventData?.tanggal || "03 November 2026"}</span>
          </div>
          <div>
            <span className="font-semibold w-24 inline-block">Waktu</span>
            <span>: {eventData?.waktu || "08:00 WIB - Selesai"}</span>
          </div>
          <div>
            <span className="font-semibold w-24 inline-block">Tempat</span>
            <span>: {eventData?.tempat || eventData?.lokasi || "UPI Exhibition Hall (UEH) Lt. 1"}</span>
          </div>
          <div>
            <span className="font-semibold w-24 inline-block">Total Peserta</span>
            <span>: {totalCount} Orang ({attendedCount} Hadir)</span>
          </div>
        </div>

        {/* Tabel Peserta & Kolom Tanda Tangan */}
        <table className="w-full border-collapse border border-black text-[10px]">
          <thead>
            <tr className="bg-gray-100 font-bold text-center border-b border-black">
              <th className="border border-black py-2 px-1 w-8">NO</th>
              <th className="border border-black py-2 px-2 w-28">ID PESERTA</th>
              <th className="border border-black py-2 px-2 text-left">NAMA LENGKAP</th>
              <th className="border border-black py-2 px-2 text-left">INSTITUSI / ASAL</th>
              <th className="border border-black py-2 px-2 w-20">STATUS BAYAR</th>
              <th className="border border-black py-2 px-2 w-36">TANDA TANGAN</th>
            </tr>
          </thead>
          <tbody>
            {participants.map((p, index) => {
              const isEven = (index + 1) % 2 === 0;
              return (
                <tr key={p.participant_id || p.id} className="border-b border-black">
                  <td className="border border-black py-2 text-center">{index + 1}</td>
                  <td className="border border-black py-2 px-2 font-mono text-[9px] text-center font-bold">
                    {p.registration_code || p.id_peserta}
                  </td>
                  <td className="border border-black py-2 px-2 font-semibold">
                    {p.nama_lengkap}
                  </td>
                  <td className="border border-black py-2 px-2">
                    {p.institusi}
                  </td>
                  <td className="border border-black py-2 px-2 text-center font-semibold">
                    {p.status_bayar}
                  </td>
                  <td className="border border-black py-2 px-2 h-9 align-middle">
                    <div className="flex items-center justify-between text-[9px] text-gray-700">
                      {isEven ? (
                        <>
                          <div className="w-1/2"></div>
                          <div className="w-1/2 text-left font-mono">
                            {index + 1}. ....................
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-1/2 text-left font-mono">
                            {index + 1}. ....................
                          </div>
                          <div className="w-1/2"></div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Lembar Tanda Tangan Pengesahan */}
        <div className="mt-8 flex justify-between items-start text-center text-[11px] break-inside-avoid">
          <div className="w-64 space-y-16">
            <div>
              <p>Mengetahui,</p>
              <p className="font-bold">Ketua Pelaksana SI FEST 2026</p>
            </div>
            <div>
              <p className="font-bold underline uppercase">( ........................................ )</p>
              <p className="text-[10px] text-gray-600">NIM: ..............................</p>
            </div>
          </div>

          <div className="w-64 space-y-16">
            <div>
              <p>Padang, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
              <p className="font-bold">Koordinator Divisi Acara Seminar</p>
            </div>
            <div>
              <p className="font-bold underline uppercase">( ........................................ )</p>
              <p className="text-[10px] text-gray-600">NIM: ..............................</p>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
