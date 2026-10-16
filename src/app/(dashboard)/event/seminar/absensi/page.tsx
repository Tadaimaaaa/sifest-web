"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  Check,
  Smartphone,
  Usb,
  AlertTriangle,
  GraduationCap,
  Building2,
  IdCard,
  BadgeCheck,
  ExternalLink
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
  metadata?: any;
  nobp?: string | null;
  jurusan?: string | null;
  kelas?: string | null;
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

interface PopupModalData {
  participant: Participant;
  isAlreadyCheckedIn: boolean;
  timeString: string;
}

export default function SeminarAbsensiPage() {
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"ALL" | "HADIR" | "BELUM" | "LUNAS">("ALL");

  // Popup Modal Detail State (Pop-up yang diminta user di laptop)
  const [popupData, setPopupData] = useState<PopupModalData | null>(null);
  const [autoCloseCountdown, setAutoCloseCountdown] = useState<number>(7);
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Quick Code Check-in
  const [manualCode, setManualCode] = useState("");
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [lastScannedRaw, setLastScannedRaw] = useState<string>("");
  const quickInputRef = useRef<HTMLInputElement>(null);

  // QR Scanner Modal State (Laptop Web Cam)
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [continuousMode, setContinuousMode] = useState(true);

  // HP Sync / Petunjuk Modal
  const [isHpGuideOpen, setIsHpGuideOpen] = useState(false);

  // Single participant update loading indicator
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Play pleasant musical chord chime on check-in
  const playSuccessChime = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = audioCtx.currentTime;
      // Harmony chord: C5 (523Hz), E5 (659Hz), G5 (784Hz)
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);
        gain.gain.setValueAtTime(0.12, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.35);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.35);
      });
    } catch (e) {}
  }, []);

  // Trigger popup modal with auto-close countdown
  const triggerPopupModal = useCallback((participant: Participant, isAlreadyCheckedIn: boolean) => {
    playSuccessChime();

    const timeStr = new Date(participant.attended_at || new Date()).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }) + " WIB";

    setPopupData({
      participant,
      isAlreadyCheckedIn,
      timeString: timeStr
    });

    setAutoCloseCountdown(7);
    if (autoCloseTimerRef.current) clearInterval(autoCloseTimerRef.current);
    autoCloseTimerRef.current = setInterval(() => {
      setAutoCloseCountdown((prev) => {
        if (prev <= 1) {
          if (autoCloseTimerRef.current) clearInterval(autoCloseTimerRef.current);
          setPopupData(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [playSuccessChime]);

  // Close popup
  const closePopup = () => {
    if (autoCloseTimerRef.current) clearInterval(autoCloseTimerRef.current);
    setPopupData(null);
  };

  // Helper to extract clean ticket code or ID from any format (JSON, URL, raw string)
  const extractTicketCode = (rawText: string) => {
    const text = (rawText || "").trim();
    let code = "";
    let id = "";

    // 1. JSON Payload from E-Ticket (e.g. {"id":"...","code":"SIF-2026-..."})
    if (text.startsWith("{") && text.endsWith("}")) {
      try {
        const parsed = JSON.parse(text);
        if (parsed.code) code = String(parsed.code).trim();
        if (parsed.id) id = String(parsed.id).trim();
        if (code || id) return { code, id };
      } catch (e) {}
    }

    // 2. URL format (e.g. https://.../SIF-2026-... or ?code=...)
    if (text.includes("http") || text.includes("/") || text.includes("?")) {
      try {
        const url = new URL(text.startsWith("http") ? text : `https://${text}`);
        const c = url.searchParams.get("code") || url.searchParams.get("id_peserta");
        const i = url.searchParams.get("id") || url.searchParams.get("registration_id");
        if (c) code = c.trim();
        if (i) id = i.trim();
      } catch (e) {}

      const parts = text.split("/").map((s) => s.trim()).filter(Boolean);
      for (const part of parts) {
        if (/^SIF-[\w-]+$/i.test(part) || /^REG-[\w-]+$/i.test(part)) {
          code = part;
          break;
        }
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(part)) {
          id = part;
          break;
        }
      }
    }

    // 3. Regex match for SIF-... or REG-... anywhere in string
    if (!code) {
      const sifMatch = text.match(/(SIF-[\w-]+)/i) || text.match(/(REG-[\w-]+)/i);
      if (sifMatch) code = sifMatch[1].trim();
    }

    // 4. UUID match anywhere in string
    if (!id) {
      const uuidMatch = text.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
      if (uuidMatch) id = uuidMatch[1].trim();
    }

    // Fallback: raw text as code
    if (!code && !id) {
      code = text;
    }

    return { code, id };
  };

  // Process check-in for any code (from USB scanner, QR cam, or input bar)
  const processCheckInCode = useCallback(async (codeToProcess: string, source: "usb_scanner" | "input" | "camera") => {
    const raw = codeToProcess.trim();
    if (!raw) return;

    setLastScannedRaw(raw);
    const { code, id } = extractTicketCode(raw);
    console.log("Memproses check-in tiket:", { raw, code, id });

    // ⚡ TAHAP 1: INSTANT LOCAL MATCH (0 Milliseconds!)
    // Cocokkan langsung dengan data peserta di memori browser
    const localMatch = participants.find((p) => {
      const pCode = (p.registration_code || p.id_peserta || "").toLowerCase().trim();
      const pId = (p.id || "").toLowerCase().trim();
      const pParticipantId = (p.participant_id || "").toLowerCase().trim();

      const searchCode = (code || "").toLowerCase().trim();
      const searchId = (id || "").toLowerCase().trim();

      return (
        (searchCode && (pCode === searchCode || pCode.includes(searchCode) || searchCode.includes(pCode))) ||
        (searchId && (pId === searchId || pParticipantId === searchId)) ||
        (searchCode && (pId === searchCode || pParticipantId === searchCode))
      );
    });

    if (localMatch) {
      const nowIso = new Date().toISOString();
      const isAlready = Boolean(localMatch.attended);

      // 1. LANGSUNG MUNCULKAN POP-UP DI LAPTOP & BUNYIKAN CHIME (0ms)!
      triggerPopupModal(
        {
          ...localMatch,
          attended: true,
          attended_at: isAlready ? localMatch.attended_at : nowIso
        },
        isAlready
      );

      // 2. Langsung update tabel di layar
      if (!isAlready) {
        setParticipants((prev) =>
          prev.map((p) =>
            p.participant_id === localMatch.participant_id
              ? { ...p, attended: true, attended_at: nowIso }
              : p
          )
        );

        // 3. Simpan ke database Supabase di latar belakang
        toggleSeminarAttendance(localMatch.participant_id, true).catch((err) => {
          console.error("Gagal sync ke database di background:", err);
        });
      }

      if (source === "input") {
        setManualCode("");
        quickInputRef.current?.focus();
      }
      return;
    }

    // ⚡ TAHAP 2: Jika peserta belum ada di cache memory lokal
    setIsCheckingIn(true);
    try {
      const res = await checkInSeminarByCode(code || id || raw);
      if (res.success && res.data) {
        setParticipants((prev) =>
          prev.map((p) =>
            p.participant_id === res.data.participant_id
              ? { ...p, ...res.data, attended: true, attended_at: res.data.attended_at }
              : p
          )
        );

        triggerPopupModal(res.data, Boolean(res.alreadyCheckedIn));

        if (source === "input") {
          setManualCode("");
          quickInputRef.current?.focus();
        }
      } else {
        toast.error(res.message || `Peserta dengan kode "${code || raw}" tidak ditemukan di Seminar SI FEST 2026.`);
      }
    } catch (err: any) {
      toast.error("Gagal melakukan check-in peserta");
    } finally {
      setIsCheckingIn(false);
    }
  }, [participants, triggerPopupModal]);

  // Global listener for USB Barcode Scanner / HP via USB (HID Keyboard Emulation)
  useEffect(() => {
    let keyBuffer = "";
    let bufferTimer: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Close popup if Esc is pressed
      if (e.key === "Escape") {
        closePopup();
        return;
      }

      const activeEl = document.activeElement as HTMLElement | null;
      const isInput = activeEl?.tagName === "INPUT" || activeEl?.tagName === "TEXTAREA";

      if (e.key === "Enter") {
        let codeToProcess = "";

        // Jika user tekan Enter di quick input, ambil value input
        if (isInput && activeEl === quickInputRef.current) {
          e.preventDefault();
          codeToProcess = (activeEl as HTMLInputElement).value || keyBuffer;
        } else if (keyBuffer.trim().length >= 3) {
          e.preventDefault();
          codeToProcess = keyBuffer.trim();
        }

        keyBuffer = "";
        clearTimeout(bufferTimer);

        if (codeToProcess) {
          processCheckInCode(codeToProcess, "usb_scanner");
        }
        return;
      }

      // Collect single printable characters
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        keyBuffer += e.key;
        clearTimeout(bufferTimer);
        // Barcode scanners send characters in rapid bursts. Reset buffer if idle for 400ms.
        bufferTimer = setTimeout(() => {
          keyBuffer = "";
        }, 400);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(bufferTimer);
    };
  }, [processCheckInCode]);

  useEffect(() => {
    const userDataStr = Cookies.get("user_data");
    if (userDataStr) {
      try {
        const user = JSON.parse(userDataStr);
        setCurrentUserRole(user.role_id || user.role || "");
      } catch (e) {}
    }
    fetchData();

    // Auto-refresh data every 4 seconds in background to sync when scanned from HP online
    const interval = setInterval(() => {
      getSeminarRegistrations()
        .then((res) => {
          if (res.success && res.data) {
            setParticipants((prev) => {
              // Check if any participant got checked in externally from HP
              res.data.forEach((newP: Participant) => {
                const oldP = prev.find((p) => p.participant_id === newP.participant_id);
                if (oldP && !oldP.attended && newP.attended) {
                  // Trigger popup automatically on laptop!
                  triggerPopupModal(newP, false);
                }
              });
              return res.data;
            });
          }
        })
        .catch(() => {});
    }, 4000);

    return () => clearInterval(interval);
  }, [triggerPopupModal]);

  const canView = ["ROLE-001", "SUPER_ADMIN", "ROLE-002", "ROLE-003", "ROLE-011", "ROLE-005"].includes(currentUserRole);

  const fetchData = async () => {
    setIsLoading(true);

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

  // Toggle single participant attendance from table button
  const handleToggleAttendance = async (participant: Participant) => {
    const nextStatus = !participant.attended;
    setUpdatingId(participant.participant_id);

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
        if (nextStatus) {
          triggerPopupModal({ ...participant, attended: true, attended_at: nowIso }, false);
        } else {
          toast.info(`Kehadiran ${participant.nama_lengkap} dibatalkan.`);
        }
      } else {
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
      "Jurusan": p.jurusan || "-",
      "No. BP / NIM": p.nobp || "-",
      "Kelas": p.kelas || "-",
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

    const columnWidths = [
      { wch: 6 },
      { wch: 20 },
      { wch: 30 },
      { wch: 28 },
      { wch: 24 },
      { wch: 18 },
      { wch: 12 },
      { wch: 28 },
      { wch: 18 },
      { wch: 20 },
      { wch: 18 },
      { wch: 24 }
    ];
    worksheet["!cols"] = columnWidths;

    const dateStr = new Date().toISOString().split("T")[0];
    XLSX.writeFile(workbook, `Presensi_Seminar_SI_FEST_2026_${dateStr}.xlsx`);
    toast.success("Data presensi berhasil diekspor ke Excel!");
  };

  // Filter participants
  const filteredParticipants = participants.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      p.nama_lengkap.toLowerCase().includes(q) ||
      p.id_peserta.toLowerCase().includes(q) ||
      (p.registration_code && p.registration_code.toLowerCase().includes(q)) ||
      p.institusi.toLowerCase().includes(q) ||
      (p.jurusan && p.jurusan.toLowerCase().includes(q)) ||
      (p.nobp && p.nobp.toLowerCase().includes(q)) ||
      p.email.toLowerCase().includes(q) ||
      p.kontak.toLowerCase().includes(q);

    if (!matchesSearch) return false;

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
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full">
                  <Usb className="w-3.5 h-3.5 text-emerald-600" />
                  USB Scanner Aktif
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
              onClick={() => setIsHpGuideOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-sm shadow-sm transition-all"
            >
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span>Scan via HP / USB</span>
            </button>

            <button
              onClick={() => setIsScannerOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm shadow-sm transition-all"
            >
              <Camera className="w-4 h-4" />
              <span>Kamera Laptop</span>
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-semibold text-sm shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>Cetak Presensi (A4)</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm shadow-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Excel</span>
            </button>
          </div>
        </div>

        {/* Live USB / Scanner Status Banner */}
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3 sm:px-4 flex items-center justify-between gap-3 text-xs text-emerald-950">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="font-semibold text-slate-800">
              Listener Scanner Aktif:
            </span>
            <span className="text-slate-600 hidden sm:inline">
              Hubungkan HP via kabel USB / alat scanner barcode. Begitu QR discan, laptop akan langsung menampilkan pop-up data peserta secara otomatis!
            </span>
            <span className="text-slate-600 sm:hidden">
              Scanner siap menerima data tiket secara instan.
            </span>
          </div>
          <button
            onClick={() => setIsHpGuideOpen(true)}
            className="text-xs font-bold text-emerald-800 hover:underline shrink-0 flex items-center gap-1"
          >
            <span>Panduan HP</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* KPI Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                Ketik / scan kode tiket (misal: SIF-2026-F4EFA4) lalu tekan Enter.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                processCheckInCode(manualCode, "input");
              }}
              className="flex items-center gap-2 w-full lg:max-w-md"
            >
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

          {/* Live Scan Status Bar */}
          <div className="mt-3 pt-2.5 border-t border-white/15 flex flex-wrap items-center justify-between gap-2 text-[11px] text-blue-100">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-medium">Scanner USB / Keyboard Siap Menerima Input</span>
              {lastScannedRaw && (
                <span className="bg-white/20 text-white font-mono px-2 py-0.5 rounded text-[10px]">
                  Terakhir dibaca: {lastScannedRaw.length > 35 ? `${lastScannedRaw.slice(0, 35)}...` : lastScannedRaw}
                </span>
              )}
            </div>
            {participants.length > 0 && (
              <button
                type="button"
                onClick={() => processCheckInCode(participants[0].registration_code || participants[0].id_peserta, "input")}
                className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg font-semibold transition-colors flex items-center gap-1 text-[11px]"
              >
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>Test Pop-up ({participants[0].nama_lengkap.split(" ")[0]})</span>
              </button>
            )}
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
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

          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, ID, BP, kampus..."
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
                  <th className="py-3.5 px-4">Jurusan / NoBP</th>
                  <th className="py-3.5 px-4">Kontak WA</th>
                  <th className="py-3.5 px-4">Status Bayar</th>
                  <th className="py-3.5 px-4">Kehadiran</th>
                  <th className="py-3.5 px-4 text-center">Aksi Presensi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-500">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto mb-2" />
                      Memuat data peserta...
                    </td>
                  </tr>
                ) : filteredParticipants.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
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
                        <div>{p.institusi}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        {p.nobp || p.jurusan ? (
                          <div className="space-y-0.5">
                            {p.jurusan && (
                              <div className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded inline-block">
                                {p.jurusan} {p.kelas ? `(${p.kelas})` : ""}
                              </div>
                            )}
                            {p.nobp && (
                              <div className="text-xs font-mono font-medium text-slate-600">
                                BP: {p.nobp}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
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
      {/* 2. THE BIG POP-UP MODAL (TAMPILAN POP-UP DI LAPTOP)             */}
      {/* ============================================================== */}
      {popupData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200 print:hidden">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            
            {/* Header Banner */}
            <div
              className={`px-6 py-5 text-white flex items-center justify-between ${
                popupData.isAlreadyCheckedIn
                  ? "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600"
                  : "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
                  {popupData.isAlreadyCheckedIn ? (
                    <AlertTriangle className="w-7 h-7 text-amber-100 animate-bounce" />
                  ) : (
                    <BadgeCheck className="w-7 h-7 text-emerald-100" />
                  )}
                </div>
                <div>
                  <div className="text-xs uppercase tracking-widest font-extrabold text-white/80">
                    {popupData.isAlreadyCheckedIn ? "Peringatan Presensi" : "Presensi Berhasil"}
                  </div>
                  <h3 className="text-xl font-black text-white tracking-tight">
                    {popupData.isAlreadyCheckedIn ? "Sudah Hadir Sebelumnya" : "Peserta Tercatat HADIR"}
                  </h3>
                </div>
              </div>

              <button
                onClick={closePopup}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                title="Tutup (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Complete Detail of Participant */}
            <div className="p-6 sm:p-7 space-y-5">
              
              {/* ID Peserta & Timestamp */}
              <div className="flex items-center justify-between bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-200/80">
                <div className="flex items-center gap-2">
                  <IdCard className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-500">KODE TIKET:</span>
                  <span className="font-mono text-xs font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {popupData.participant.registration_code || popupData.participant.id_peserta}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{popupData.timeString}</span>
                </div>
              </div>

              {/* Nama Lengkap Peserta */}
              <div className="space-y-1">
                <span className="text-xs uppercase tracking-wider font-bold text-slate-400">
                  Nama Lengkap Peserta
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
                  {popupData.participant.nama_lengkap}
                </h2>
              </div>

              {/* Asal Instansi (Khusus UPI: Tampilkan Jurusan dan NoBP!) */}
              {popupData.participant.institusi.toLowerCase().includes("upi") ||
              popupData.participant.institusi.toLowerCase().includes("yptk") ||
              Boolean(popupData.participant.nobp) ? (
                /* Card Khusus Mahasiswa UPI YPTK */
                <div className="bg-gradient-to-br from-indigo-50/90 via-blue-50/70 to-slate-50 border-2 border-indigo-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-indigo-600 shrink-0" />
                    <span className="text-xs font-extrabold uppercase tracking-wide text-indigo-900">
                      Mahasiswa UPI &quot;YPTK&quot; Padang
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-indigo-100">
                    {/* Jurusan */}
                    <div className="space-y-0.5 bg-white p-3 rounded-xl border border-indigo-100 shadow-2xs">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Jurusan / Prodi
                      </span>
                      <div className="text-base font-extrabold text-indigo-950">
                        {popupData.participant.jurusan || "Sistem Informasi"}
                      </div>
                      {popupData.participant.kelas && (
                        <div className="text-xs text-indigo-700 font-semibold">
                          Kelas: {popupData.participant.kelas}
                        </div>
                      )}
                    </div>

                    {/* No. BP / NIM */}
                    <div className="space-y-0.5 bg-white p-3 rounded-xl border border-indigo-100 shadow-2xs">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        No. BP / NIM
                      </span>
                      <div className="text-base font-extrabold text-indigo-950 font-mono tracking-wide">
                        {popupData.participant.nobp || "-"}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Terdaftar di SIAKAD UPI YPTK
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Card Umum / Luar Kampus */
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <span>ASAL INSTANSI / KAMPUS / SEKOLAH</span>
                  </div>
                  <div className="text-lg font-bold text-slate-800">
                    {popupData.participant.institusi}
                  </div>
                </div>
              )}

              {/* Status Bayar & Kontak */}
              <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-slate-400 font-semibold block mb-1">Status Pembayaran</span>
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full font-bold ${
                      popupData.participant.status_bayar === "Lunas"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {popupData.participant.status_bayar}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-slate-400 font-semibold block mb-1">Kontak WhatsApp</span>
                  <span className="font-mono font-bold text-slate-700">
                    {popupData.participant.kontak || "-"}
                  </span>
                </div>
              </div>

            </div>

            {/* Modal Footer with Countdown */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <div className="text-xs text-slate-500 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Menutup dalam <strong>{autoCloseCountdown}d</strong> (atau scan peserta berikutnya)</span>
              </div>

              <button
                onClick={closePopup}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-xs"
              >
                Tutup (Esc)
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. PANDUAN SCAN VIA HP / KABEL USB MODAL                       */}
      {/* ============================================================== */}
      {isHpGuideOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200 print:hidden">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Cara Scan Tiket dari HP Panitia</h3>
                  <p className="text-xs text-slate-300">Hubungkan ke laptop atau gunakan web scanner</p>
                </div>
              </div>
              <button
                onClick={() => setIsHpGuideOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-sm">
              {/* Metode 1: Kabel USB */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <Usb className="w-4 h-4 text-blue-600" />
                  <span>Metode 1: Hubungkan HP via Kabel USB (Barcode to PC)</span>
                </div>
                <ol className="list-decimal list-inside text-xs text-slate-600 space-y-1.5 pl-1 leading-relaxed">
                  <li>Colokkan kabel USB dari HP ke laptop.</li>
                  <li>
                    Gunakan aplikasi seperti <strong>Barcode to PC</strong> (tersedia gratis di Play Store/App Store) atau gunakan alat scanner barcode USB.
                  </li>
                  <li>
                    Di laptop, panitia <strong>TIDAK PERLU mengklik apa pun</strong>. Layar ini sudah memiliki listener otomatis!
                  </li>
                  <li>
                    Arahkan kamera HP ke QR Code tiket peserta. Data akan otomatis masuk ke laptop dan <strong>pop-up detail langsung muncul</strong>!
                  </li>
                </ol>
              </div>

              {/* Metode 2: HP Membuka Web Langsung (Tanpa Kabel) */}
              <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 font-bold text-indigo-900">
                  <Smartphone className="w-4 h-4 text-indigo-600" />
                  <span>Metode 2: Buka Web Scanner Langsung di Browser HP</span>
                </div>
                <p className="text-xs text-indigo-800 leading-relaxed">
                  Panitia juga bisa langsung membuka halaman scanner resmi di HP tanpa kabel apapun:
                </p>
                <div className="p-2.5 bg-white rounded-xl border border-indigo-200 font-mono text-xs text-indigo-950 font-bold select-all flex items-center justify-between">
                  <span>/event/seminar/absensi/scan</span>
                  <Link
                    href="/event/seminar/absensi/scan"
                    target="_blank"
                    className="text-xs font-sans text-blue-600 underline font-semibold"
                  >
                    Buka
                  </Link>
                </div>
                <p className="text-[11px] text-slate-500">
                  Karena sistem memiliki auto-sync realtime, saat panitia scan di HP, layar laptop di meja registrasi akan otomatis mendeteksi dan memunculkan pop-up kehadiran!
                </p>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsHpGuideOpen(false)}
                className="px-5 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-sm font-semibold transition-colors"
              >
                Mengerti
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. LAPTOP WEBCAM SCANNER MODAL                                 */}
      {/* ============================================================== */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200 print:hidden">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Scanner Kamera Laptop</h3>
                  <p className="text-xs text-slate-500">Arahkan QR Code tiket ke depan webcam laptop</p>
                </div>
              </div>
              <button
                onClick={() => setIsScannerOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
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

              <div className="pt-2">
                <QRScanner
                  onScanSuccess={(code) => {
                    processCheckInCode(code, "camera");
                    if (!continuousMode) setIsScannerOpen(false);
                  }}
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsScannerOpen(false)}
                className="px-5 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-sm font-semibold transition-colors"
              >
                Selesai
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. OFFICIAL PRINT VIEW (A4 Physical Attendance Sheet)         */}
      {/* ============================================================== */}
      <div className="hidden print:block p-8 bg-white text-black font-sans text-xs">
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

        <div className="text-center my-4 space-y-1">
          <h2 className="text-sm font-extrabold uppercase tracking-wide underline">
            DAFTAR HADIR PESERTA SEMINAR NASIONAL
          </h2>
          <p className="text-[11px] font-semibold text-gray-800">
            SI FEST (SISTEM INFORMASI FESTIVAL) 2026
          </p>
        </div>

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

        <table className="w-full border-collapse border border-black text-[10px]">
          <thead>
            <tr className="bg-gray-100 font-bold text-center border-b border-black">
              <th className="border border-black py-2 px-1 w-8">NO</th>
              <th className="border border-black py-2 px-2 w-28">ID PESERTA</th>
              <th className="border border-black py-2 px-2 text-left">NAMA LENGKAP</th>
              <th className="border border-black py-2 px-2 text-left">INSTITUSI / ASAL</th>
              <th className="border border-black py-2 px-2 text-left w-32">JURUSAN / BP</th>
              <th className="border border-black py-2 px-2 w-20">STATUS BAYAR</th>
              <th className="border border-black py-2 px-2 w-32">TANDA TANGAN</th>
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
                  <td className="border border-black py-2 px-2">
                    {p.jurusan || p.nobp ? `${p.jurusan || "-"} / ${p.nobp || "-"}` : "-"}
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
