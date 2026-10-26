"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Cookies from "js-cookie";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  UserCheck,
  Search,
  Calendar,
  Clock,
  Printer,
  Download,
  Camera,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  HelpCircle,
  Plus,
  RefreshCw,
  Check,
  X,
  Sparkles,
  FileText,
  SlidersHorizontal,
  ChevronDown,
  Layers,
  ArrowRight,
  ShieldCheck,
  Send,
  Scan,
  RotateCcw,
  Trash2,
  AlertTriangle
} from "lucide-react";
import FullPageLoader from "@/components/FullPageLoader";
import FaceIDScannerModal from "@/components/scanner/FaceIDScannerModal";
import FaceEnrollmentModal from "@/components/scanner/FaceEnrollmentModal";
import { SCRIPT_URL } from "@/lib/api";

export interface PanitiaUser {
  user_id: string;
  name: string;
  nim: string | number;
  username: string;
  email?: string;
  phone?: string;
  division: string;
  position: string;
  role_id: string;
  status: string;
}

export type AttendanceStatus = "HADIR" | "IZIN" | "SAKIT" | "ALPHA" | "BELUM";

export interface AttendanceRecord {
  id_absensi: string;
  user_id: string;
  nim: string | number;
  nama: string;
  divisi: string;
  jabatan: string;
  tanggal: string;
  sesi: string;
  status: AttendanceStatus;
  waktu_absen: string;
  keterangan: string;
  recorded_by: string;
  updated_at: string;
  face_snapshot?: string;
}

export function formatFullIndonesianDate(dateStr: string, timeStr?: string) {
  try {
    if (!dateStr) return { fullDate: "-", fullDateTime: "-" };
    const parts = dateStr.split("-");
    if (parts.length < 3) return { fullDate: dateStr, fullDateTime: `${dateStr} ${timeStr || ""}` };
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);

    const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const MONTHS = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];

    const dayName = DAYS[d.getDay()] || "";
    const monthName = MONTHS[month] || "";
    const fullDate = `${dayName}, ${day} ${monthName} ${year}`;
    const fullDateTime = timeStr ? `${fullDate} • ${timeStr}` : fullDate;

    return { fullDate, fullDateTime };
  } catch (e) {
    return { fullDate: dateStr, fullDateTime: `${dateStr} ${timeStr || ""}` };
  }
}

// Sesi agenda presensi dikelola secara dinamis oleh pengguna / admin

const DIVISION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Steering Committee": { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  "Acara Inti": { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  "Perlengkapan": { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  "Pubdok": { bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-200" },
  "Keuangan": { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  "Bendahara": { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  "Sponsor": { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  "Bazaar": { bg: "bg-yellow-50", text: "text-yellow-800", border: "border-yellow-200" },
  "Konsumsi": { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  "Humas": { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200" },
  "Volunteer": { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" }
};

export default function AbsensiPanitiaPage() {
  const [panitiaList, setPanitiaList] = useState<PanitiaUser[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceRecord>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Filter & Config
  const [tanggal, setTanggal] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [sessions, setSessions] = useState<string[]>([]);
  const [sesi, setSesi] = useState<string>("");
  const [customSesi, setCustomSesi] = useState<string>("");
  const [isCustomSesi, setIsCustomSesi] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [divisionFilter, setDivisionFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | AttendanceStatus>("ALL");

  // Face ID & Enrollment Modals
  const [isFaceIDOpen, setIsFaceIDOpen] = useState(false);
  const [faceIDTargetUser, setFaceIDTargetUser] = useState<PanitiaUser | null>(null);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [enrollModalUser, setEnrollModalUser] = useState<PanitiaUser | null>(null);
  const [enrolledMap, setEnrolledMap] = useState<Record<string, string>>({});
  const [quickCodeInput, setQuickCodeInput] = useState("");
  const [noteModalUser, setNoteModalUser] = useState<PanitiaUser | null>(null);
  const [noteInput, setNoteInput] = useState("");
  const [currentAdminName, setCurrentAdminName] = useState("Admin");

  // Reset Modal State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetScope, setResetScope] = useState<"SESSION_ONLY" | "ALL_DATA">("ALL_DATA");
  const [includeFaceProfiles, setIncludeFaceProfiles] = useState(true);

  // Audio Beep Synthesizer for Fast Scanning Feedback
  const playBeep = (freq = 880, duration = 120) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration / 1000);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration / 1000);
    } catch (e) {}
  };

  const activeSesi = isCustomSesi && customSesi.trim() ? customSesi.trim() : sesi;

  // Key untuk penyimpanan lokal cadangan per tanggal & sesi
  const storageKey = useMemo(() => {
    return `sifest_absensi_panitia_${tanggal}_${(activeSesi || "default").replace(/[^a-zA-Z0-9]/g, "_")}`;
  }, [tanggal, activeSesi]);

  // Tambah sesi baru dan simpan ke localStorage
  const handleAddSession = (name?: string) => {
    const newSesi = (name || customSesi).trim();
    if (!newSesi) {
      toast.error("Nama sesi / agenda tidak boleh kosong");
      return;
    }
    setSessions(prev => {
      const exists = prev.find(s => s.toLowerCase() === newSesi.toLowerCase());
      if (exists) {
        setSesi(exists);
        return prev;
      }
      const next = [...prev, newSesi];
      try {
        localStorage.setItem("sifest_panitia_sessions", JSON.stringify(next));
      } catch (e) {}
      return next;
    });
    setSesi(newSesi);
    setIsCustomSesi(false);
    setCustomSesi("");
    toast.success(`Sesi "${newSesi}" berhasil ditambahkan!`);
  };

  // Hapus sesi dari daftar
  const handleDeleteSession = (target: string) => {
    if (!target) return;
    if (!confirm(`Hapus sesi "${target}" dari daftar pilihan?`)) return;
    setSessions(prev => {
      const next = prev.filter(s => s !== target);
      try {
        localStorage.setItem("sifest_panitia_sessions", JSON.stringify(next));
      } catch (e) {}
      if (sesi === target) {
        setSesi(next[0] || "");
      }
      return next;
    });
    toast.success(`Sesi "${target}" telah dihapus.`);
  };

  // Load User Data, Sesi Tersimpan & Initial Attendance
  useEffect(() => {
    const userDataStr = Cookies.get("user_data");
    if (userDataStr) {
      try {
        const u = JSON.parse(userDataStr);
        if (u.name) setCurrentAdminName(u.name);
      } catch (e) {}
    }
    try {
      const cachedFaces = localStorage.getItem("sifest_enrolled_face_profiles");
      if (cachedFaces) setEnrolledMap(JSON.parse(cachedFaces));
    } catch (e) {}

    // Load saved custom sessions
    try {
      const saved = localStorage.getItem("sifest_panitia_sessions");
      if (saved) {
        const list = JSON.parse(saved);
        if (Array.isArray(list) && list.length > 0) {
          setSessions(list);
          setSesi(prev => prev || list[0]);
        }
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    fetchData();
  }, [tanggal, activeSesi]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Daftar Panitia dari Sheet Users
      const token = Cookies.get("session_token") || "";
      const usersRes = await fetch(`${SCRIPT_URL}?action=getUsers&token=${token}`).catch(() => null);
      let usersData: PanitiaUser[] = [];

      if (usersRes && usersRes.ok) {
        const json = await usersRes.json();
        if (json.success && Array.isArray(json.data)) {
          usersData = json.data;
          setPanitiaList(usersData);
        }
      }

      // 2. Fetch Data Absensi dari Google Apps Script
      const params = new URLSearchParams({
        action: "getAbsensiPanitia",
        tanggal,
        sesi: activeSesi || "ALL",
        token
      });
      const attRes = await fetch(`${SCRIPT_URL}?${params.toString()}`).catch(() => null);
      let remoteMap: Record<string, AttendanceRecord> = {};

      if (attRes && attRes.ok) {
        const json = await attRes.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const remoteSessions: string[] = [];
          json.data.forEach((r: AttendanceRecord) => {
            if (r.sesi && !remoteSessions.includes(r.sesi)) {
              remoteSessions.push(r.sesi);
            }
            if (!activeSesi || r.sesi === activeSesi) {
              if (r.user_id) remoteMap[r.user_id] = r;
            }
          });

          if (remoteSessions.length > 0) {
            setSessions(prev => {
              const merged = Array.from(new Set([...prev, ...remoteSessions]));
              try {
                localStorage.setItem("sifest_panitia_sessions", JSON.stringify(merged));
              } catch (e) {}
              return merged;
            });
            if (!activeSesi) {
              setSesi(remoteSessions[0]);
            }
          }
        }
      }

      // 3. Fallback / Merge dengan localStorage cadangan
      if (typeof window !== "undefined") {
        try {
          const cached = localStorage.getItem(storageKey);
          if (cached) {
            const localMap: Record<string, AttendanceRecord> = JSON.parse(cached);
            // Satukan, prioritaskan data yang memiliki timestamp paling baru
            remoteMap = { ...localMap, ...remoteMap };
          }
        } catch (e) {}
      }

      setAttendanceMap(remoteMap);
    } catch (error) {
      console.error("Gagal memuat absensi panitia:", error);
      toast.error("Gagal memuat data presensi panitia.");
    } finally {
      setIsLoading(false);
    }
  };

  // Simpan record ke Remote & LocalStorage
  const updateAttendance = async (
    user: PanitiaUser,
    newStatus: AttendanceStatus,
    keteranganCustom?: string,
    snapshotBase64?: string
  ) => {
    if (!activeSesi) {
      toast.error("Silakan buat atau pilih sesi / agenda terlebih dahulu!");
      return;
    }
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")} WIB`;
    const prev = attendanceMap[user.user_id];

    let facePhoto = snapshotBase64;
    if (!facePhoto && typeof window !== "undefined") {
      facePhoto = localStorage.getItem(`sifest_face_snapshot_${user.user_id}_${tanggal}`) || prev?.face_snapshot;
    }

    const record: AttendanceRecord = {
      id_absensi: prev?.id_absensi || `ABS-${Date.now()}`,
      user_id: user.user_id,
      nim: user.nim,
      nama: user.name,
      divisi: user.division,
      jabatan: user.position,
      tanggal,
      sesi: activeSesi,
      status: newStatus,
      waktu_absen: newStatus === "HADIR" ? (prev?.waktu_absen || timeStr) : (newStatus === "BELUM" ? "" : timeStr),
      keterangan: keteranganCustom !== undefined ? keteranganCustom : (prev?.keterangan || ""),
      recorded_by: currentAdminName,
      updated_at: now.toISOString(),
      face_snapshot: facePhoto || undefined
    };

    // Update state optimis di UI
    const nextMap = { ...attendanceMap, [user.user_id]: record };
    setAttendanceMap(nextMap);

    // Simpan ke localStorage seketika
    try {
      localStorage.setItem(storageKey, JSON.stringify(nextMap));
    } catch (e) {}

    // Simpan ke Google Apps Script backend
    try {
      const token = Cookies.get("session_token") || "";
      const payload = {
        action: "recordAbsensiPanitia",
        token,
        ...record
      };

      fetch(`${SCRIPT_URL}?action=recordAbsensiPanitia`, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      }).catch(err => console.warn("Sync to backend deferred:", err));
    } catch (err) {}

    return record;
  };

  // Tandai Semua Hadir
  const handleMarkAllHadir = async () => {
    if (!activeSesi) {
      toast.error("Silakan buat atau pilih sesi / agenda terlebih dahulu!");
      return;
    }
    if (!confirm(`Tandai seluruh ${filteredPanitia.length} panitia yang tampil sebagai HADIR?`)) return;

    setIsSaving(true);
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")} WIB`;
    const nextMap = { ...attendanceMap };
    const recordsToSync: AttendanceRecord[] = [];

    filteredPanitia.forEach(user => {
      const prev = nextMap[user.user_id];
      const rec: AttendanceRecord = {
        id_absensi: prev?.id_absensi || `ABS-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        user_id: user.user_id,
        nim: user.nim,
        nama: user.name,
        divisi: user.division,
        jabatan: user.position,
        tanggal,
        sesi: activeSesi,
        status: "HADIR",
        waktu_absen: prev?.waktu_absen || timeStr,
        keterangan: prev?.keterangan || "",
        recorded_by: currentAdminName,
        updated_at: now.toISOString()
      };
      nextMap[user.user_id] = rec;
      recordsToSync.push(rec);
    });

    setAttendanceMap(nextMap);
    try {
      localStorage.setItem(storageKey, JSON.stringify(nextMap));
    } catch (e) {}

    toast.success(`Berhasil menandai ${recordsToSync.length} panitia sebagai HADIR`);

    // Async sync ke backend
    try {
      const token = Cookies.get("session_token") || "";
      await fetch(`${SCRIPT_URL}?action=bulkRecordAbsensiPanitia`, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "bulkRecordAbsensiPanitia",
          token,
          tanggal,
          sesi: activeSesi,
          recorded_by: currentAdminName,
          records: recordsToSync
        })
      });
    } catch (e) {} finally {
      setIsSaving(false);
    }
  };

  // Reset Data Presensi & Biometrik
  const handleExecuteReset = async () => {
    setIsSaving(true);
    try {
      const token = Cookies.get("session_token") || "";

      // 1. Optimistic Local State Reset
      setAttendanceMap({});

      // 2. Clear LocalStorage
      if (typeof window !== "undefined") {
        try {
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k) {
              if (resetScope === "ALL_DATA") {
                if (k.startsWith("sifest_absensi_panitia_") || k.startsWith("sifest_face_snapshot_")) {
                  keysToRemove.push(k);
                }
              } else {
                if (k === storageKey) {
                  keysToRemove.push(k);
                }
              }
            }
          }
          keysToRemove.forEach(k => localStorage.removeItem(k));

          if (resetScope === "ALL_DATA" && includeFaceProfiles) {
            localStorage.removeItem("sifest_enrolled_face_profiles");
            setEnrolledMap({});
          }
        } catch (e) {}
      }

      // 3. Backend Sync
      const resetRecords = panitiaList.map(p => ({
        user_id: p.user_id,
        status: "BELUM",
        waktu_absen: "",
        keterangan: ""
      }));

      await fetch(`${SCRIPT_URL}?action=bulkRecordAbsensiPanitia`, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "bulkRecordAbsensiPanitia",
          token,
          tanggal,
          sesi: activeSesi,
          recorded_by: currentAdminName,
          records: resetRecords
        })
      }).catch(() => {});

      // Call backend resetAbsensiPanitia if available
      fetch(`${SCRIPT_URL}?action=resetAbsensiPanitia`, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          token,
          tanggal: resetScope === "SESSION_ONLY" ? tanggal : undefined,
          sesi: resetScope === "SESSION_ONLY" ? activeSesi : undefined
        })
      }).catch(() => {});

      setIsResetModalOpen(false);
      toast.success(
        resetScope === "ALL_DATA"
          ? (includeFaceProfiles
              ? "Seluruh data presensi dan biometrik berhasil direset bersih! (Daftar 69 panitia tetap aman)."
              : "Seluruh data presensi berhasil direset bersih ke 0 Hadir!")
          : `Data presensi untuk sesi "${activeSesi}" berhasil direset.`
      );

      await fetchData();
    } catch (err) {
      console.error(err);
      toast.error("Gagal melakukan reset data presensi.");
    } finally {
      setIsSaving(false);
    }
  };

  // Handler Scan Barcode / Input NIM Cepat
  const handleQuickCheckIn = (code: string) => {
    const clean = code.trim().toLowerCase();
    if (!clean) return;

    const matched = panitiaList.find(p => {
      const pNim = String(p.nim || "").toLowerCase().trim();
      const pUid = String(p.user_id || "").toLowerCase().trim();
      const pUser = String(p.username || "").toLowerCase().trim();
      return pNim === clean || pUid === clean || pUser === clean;
    });

    if (matched) {
      playBeep(880, 150);
      updateAttendance(matched, "HADIR");
      toast.success(`Hadir: ${matched.name} (${matched.division})`, {
        icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />
      });
      setQuickCodeInput("");
    } else {
      playBeep(320, 250);
      toast.error(`Panitia tidak ditemukan untuk kode: "${code}"`);
    }
  };

  // Export Excel
  const handleExportExcel = () => {
    if (!activeSesi) {
      toast.error("Silakan buat atau pilih sesi / agenda terlebih dahulu sebelum export!");
      return;
    }
    if (panitiaList.length === 0) {
      toast.error("Tidak ada data panitia untuk diexport.");
      return;
    }

    const rows = panitiaList.map((p, idx) => {
      const att = attendanceMap[p.user_id];
      const statusLabel = att?.status || "BELUM";
      return {
        "No": idx + 1,
        "ID Panitia": p.user_id,
        "NIM / No BP": p.nim,
        "Nama Lengkap": p.name,
        "Divisi": p.division,
        "Jabatan": p.position,
        "Status Kehadiran": statusLabel,
        "Waktu Absen": att?.waktu_absen || "-",
        "Keterangan": att?.keterangan || "-",
        "Dicatat Oleh": att?.recorded_by || "-",
        "Tanggal": tanggal,
        "Sesi / Agenda": activeSesi
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Absensi Panitia");

    // Auto set column widths
    const maxCols = [5, 12, 16, 32, 20, 16, 16, 14, 25, 15, 12, 30];
    worksheet["!cols"] = maxCols.map(w => ({ wch: w }));

    const fileName = `Rekap_Absensi_Panitia_${activeSesi.replace(/[^a-zA-Z0-9]/g, "_")}_${tanggal}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    toast.success("File Excel rekap absensi berhasil diunduh!");
  };

  // Filtered Panitia List
  const allDivisions = useMemo(() => {
    const set = new Set<string>();
    panitiaList.forEach(p => {
      if (p.division) set.add(p.division);
    });
    return Array.from(set).sort();
  }, [panitiaList]);

  const filteredPanitia = useMemo(() => {
    return panitiaList.filter(p => {
      // Search
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        String(p.nim).toLowerCase().includes(q) ||
        p.user_id.toLowerCase().includes(q) ||
        p.division.toLowerCase().includes(q);

      // Division
      const matchDivision = divisionFilter === "ALL" || p.division === divisionFilter;

      // Status
      const currentStatus = attendanceMap[p.user_id]?.status || "BELUM";
      let matchStatus = true;
      if (statusFilter !== "ALL") {
        if (statusFilter === "BELUM") {
          matchStatus = currentStatus === "BELUM" || currentStatus === "ALPHA";
        } else {
          matchStatus = currentStatus === statusFilter;
        }
      }

      return matchSearch && matchDivision && matchStatus;
    });
  }, [panitiaList, searchQuery, divisionFilter, statusFilter, attendanceMap]);

  // Statistics
  const stats = useMemo(() => {
    let hadir = 0;
    let izin = 0;
    let sakit = 0;
    let alpha = 0;

    panitiaList.forEach(p => {
      const st = attendanceMap[p.user_id]?.status;
      if (st === "HADIR") hadir++;
      else if (st === "IZIN") izin++;
      else if (st === "SAKIT") sakit++;
      else if (st === "ALPHA") alpha++;
    });

    const total = panitiaList.length;
    const belum = total - hadir - izin - sakit - alpha;
    const persenHadir = total > 0 ? Math.round((hadir / total) * 100) : 0;

    return { total, hadir, izin, sakit, alpha, belum, persenHadir };
  }, [panitiaList, attendanceMap]);

  if (isLoading) return <FullPageLoader message="Memuat data absensi panitia..." fullScreen={false} />;

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      {/* ==================== PRINT TEMPLATE (Hidden on Screen, Visible on Print) ==================== */}
      <div className="hidden print:block text-slate-900 bg-white p-6 font-sans">
        <div className="border-b-2 border-slate-900 pb-4 mb-4 text-center">
          <h1 className="text-xl font-bold uppercase tracking-wider">Himpunan Mahasiswa Jurusan Sistem Informasi (HMJ SI)</h1>
          <h2 className="text-2xl font-black uppercase text-slate-900">Festival Sistem Informasi (SI FEST 2026)</h2>
          <p className="text-xs text-slate-600 mt-1">Sekretariat: Kampus Universitas Putra Indonesia &quot;YPTK&quot; Padang | Email: sifest@upi-yptk.ac.id</p>
        </div>

        <div className="flex justify-between items-center text-xs mb-4">
          <div>
            <p><span className="font-bold">Agenda / Sesi:</span> {activeSesi}</p>
            <p><span className="font-bold">Tanggal Kegiatan:</span> {tanggal}</p>
          </div>
          <div className="text-right">
            <p><span className="font-bold">Total Panitia:</span> {stats.total} Orang</p>
            <p><span className="font-bold">Kehadiran:</span> {stats.hadir} Hadir ({stats.persenHadir}%) | {stats.izin} Izin | {stats.sakit} Sakit | {stats.belum + stats.alpha} Belum</p>
          </div>
        </div>

        <table className="w-full text-xs border border-slate-800 border-collapse mb-8">
          <thead>
            <tr className="bg-slate-100 text-slate-800">
              <th className="border border-slate-800 p-1.5 w-8 text-center">No</th>
              <th className="border border-slate-800 p-1.5 text-center w-28">NIM / BP</th>
              <th className="border border-slate-800 p-1.5 text-left">Nama Panitia</th>
              <th className="border border-slate-800 p-1.5 text-left w-36">Divisi</th>
              <th className="border border-slate-800 p-1.5 text-center w-20">Status</th>
              <th className="border border-slate-800 p-1.5 text-center w-24">Waktu</th>
              <th className="border border-slate-800 p-1.5 text-left">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {panitiaList.map((p, idx) => {
              const att = attendanceMap[p.user_id];
              const st = att?.status || "BELUM";
              return (
                <tr key={p.user_id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                  <td className="border border-slate-800 p-1 text-center">{idx + 1}</td>
                  <td className="border border-slate-800 p-1 text-center font-mono">{p.nim}</td>
                  <td className="border border-slate-800 p-1 font-semibold">{p.name}</td>
                  <td className="border border-slate-800 p-1">{p.division}</td>
                  <td className="border border-slate-800 p-1 text-center font-bold">
                    {st === "HADIR" ? "HADIR" : st === "IZIN" ? "IZIN" : st === "SAKIT" ? "SAKIT" : "ALPHA"}
                  </td>
                  <td className="border border-slate-800 p-1 text-center">{att?.waktu_absen || "-"}</td>
                  <td className="border border-slate-800 p-1 text-slate-600">{att?.keterangan || "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Tanda Tangan */}
        <div className="flex justify-between items-end pt-8 px-8 text-xs">
          <div className="text-center">
            <p>Mengetahui,</p>
            <p className="font-bold">Ketua Pelaksana SI FEST 2026</p>
            <div className="h-16" />
            <p className="font-bold underline">Ahlazzikri Azamuddin</p>
            <p className="text-[10px] text-slate-500">NIM. 23101152610322</p>
          </div>
          <div className="text-center">
            <p>Padang, {tanggal}</p>
            <p className="font-bold">Sekretaris Umum</p>
            <div className="h-16" />
            <p className="font-bold underline">Angelicca Rehuel Saphira</p>
            <p className="text-[10px] text-slate-500">NIM. 23101152610165</p>
          </div>
        </div>
      </div>

      {/* ==================== WEB DASHBOARD VIEW ==================== */}
      <div className="print:hidden space-y-6">
        {/* Header Hero Section */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-blue-950/10 relative overflow-hidden">
          <div className="absolute right-0 top-0 -mr-16 -mt-16 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute right-40 bottom-0 -mb-16 w-60 h-60 bg-blue-400/20 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-blue-200 border border-white/15">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                Presensi & Log Kehadiran Panitia SI FEST 2026
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-3">
                <UserCheck className="w-8 h-8 text-blue-300" />
                Absensi Panitia
              </h1>
              <p className="text-sm text-blue-100 max-w-xl">
                Catat presensi harian, rapat pleno, dan agenda kepanitiaan dengan Presensi Face ID Biometrik AI dan Pendaftaran Wajah.
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Fitur 1: Presensi Face ID */}
              <button
                type="button"
                onClick={() => {
                  if (!activeSesi) {
                    toast.error("Silakan buat atau pilih sesi / agenda terlebih dahulu sebelum scan Face ID!");
                    return;
                  }
                  setFaceIDTargetUser(null);
                  setIsFaceIDOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs md:text-sm font-extrabold shadow-lg shadow-cyan-600/30 transition-all hover:scale-105 active:scale-95 cursor-pointer ring-2 ring-cyan-300/40"
              >
                <Scan className="w-4 h-4 animate-pulse text-cyan-100" />
                <span>Presensi Face ID</span>
              </button>

              {/* Fitur 2: Daftar Wajah Panitia */}
              <button
                type="button"
                onClick={() => {
                  setEnrollModalUser(null);
                  setIsEnrollModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white rounded-xl text-xs md:text-sm font-extrabold shadow-lg shadow-purple-600/30 transition-all hover:scale-105 active:scale-95 cursor-pointer ring-2 ring-purple-300/40"
              >
                <Camera className="w-4 h-4 text-purple-100" />
                <span>Daftar Wajah Panitia</span>
              </button>

              <button
                type="button"
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs md:text-sm font-semibold border border-white/20 backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
                title="Download Rekap Excel"
              >
                <Download className="w-4 h-4" />
                <span>Export Excel</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!activeSesi) {
                    toast.error("Silakan buat atau pilih sesi / agenda terlebih dahulu sebelum cetak!");
                    return;
                  }
                  window.print();
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs md:text-sm font-semibold border border-white/20 backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
                title="Cetak Rekap Absensi"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Rekap</span>
              </button>
            </div>
          </div>
        </div>

        {/* Setting Agenda, Tanggal, & Sesi */}
        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            {/* Tanggal Picker */}
            <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700">
              <Calendar className="w-4 h-4 text-blue-600" />
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="bg-transparent border-none text-slate-800 text-sm font-semibold focus:outline-none cursor-pointer"
              />
            </div>

            {/* Sesi / Agenda Selector */}
            <div className="flex-1 flex items-center gap-2">
              {sessions.length === 0 || isCustomSesi ? (
                <div className="flex items-center gap-2 w-full">
                  <input
                    type="text"
                    autoFocus
                    placeholder="Ketik nama sesi / agenda (contoh: Rapat Pleno 1)..."
                    value={customSesi}
                    onChange={(e) => setCustomSesi(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddSession();
                      }
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-blue-400 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddSession()}
                    disabled={!customSesi.trim()}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah</span>
                  </button>
                  {sessions.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomSesi(false);
                        setCustomSesi("");
                      }}
                      className="p-2.5 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs cursor-pointer"
                      title="Batal"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 w-full">
                  <div className="relative flex-1">
                    <select
                      value={sesi}
                      onChange={(e) => {
                        if (e.target.value === "__CUSTOM__") {
                          setIsCustomSesi(true);
                          setCustomSesi("");
                        } else {
                          setSesi(e.target.value);
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer appearance-none pr-9"
                    >
                      {sessions.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                      <option value="__CUSTOM__">+ Buat Sesi / Agenda Baru...</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteSession(sesi)}
                    className="p-2.5 text-slate-400 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-xl transition-colors cursor-pointer"
                    title={`Hapus sesi "${sesi}" dari daftar`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              disabled={isSaving}
              onClick={handleMarkAllHadir}
              className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-xs md:text-sm border border-blue-200/80 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4 text-blue-600" />
              <span>Tandai Semua Hadir</span>
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => setIsResetModalOpen(true)}
              className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs md:text-sm border border-rose-200/80 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
              title="Reset seluruh data kehadiran & foto (sisakan list 69 panitia)"
            >
              <RotateCcw className="w-4 h-4 text-rose-600" />
              <span>Reset Presensi</span>
            </button>
            <button
              type="button"
              onClick={fetchData}
              className="p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Warning Alert jika belum ada sesi */}
        {!activeSesi && (
          <div className="bg-amber-50/90 border border-amber-200/80 rounded-2xl p-4 flex items-center gap-3 text-amber-900 text-sm shadow-sm animate-in fade-in">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div className="text-xs md:text-sm">
              <span className="font-bold">Belum ada sesi / agenda yang aktif:</span> Silakan ketik nama sesi baru pada kolom di atas (misalnya: <em>Rapat Pleno 1</em>, <em>Briefing Panitia</em>, dll) lalu klik <strong>Tambah</strong> untuk memulai absensi.
            </div>
          </div>
        )}

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
          {/* Total Panitia */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Panitia</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-slate-900">{stats.total}</span>
              <span className="text-xs text-slate-500 ml-1">orang</span>
            </div>
          </div>

          {/* Hadir */}
          <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200/80 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Hadir</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <div>
                <span className="text-2xl font-black text-emerald-700">{stats.hadir}</span>
                <span className="text-xs text-emerald-600 ml-1">orang</span>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                {stats.persenHadir}%
              </span>
            </div>
          </div>

          {/* Izin */}
          <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/80 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Izin</span>
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-amber-700">{stats.izin}</span>
              <span className="text-xs text-amber-600 ml-1">orang</span>
            </div>
          </div>

          {/* Sakit */}
          <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-200/80 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Sakit</span>
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-blue-700">{stats.sakit}</span>
              <span className="text-xs text-blue-600 ml-1">orang</span>
            </div>
          </div>

          {/* Belum Hadir / Alpha */}
          <div className="col-span-2 md:col-span-1 bg-rose-50/60 p-4 rounded-2xl border border-rose-200/80 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">Belum / Alpha</span>
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-rose-700">{stats.belum + stats.alpha}</span>
              <span className="text-xs text-rose-600 ml-1">orang</span>
            </div>
          </div>
        </div>

        {/* Quick Search & NIM Input */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Ketik NIM / Nama Panitia lalu tekan Enter untuk presensi..."
              value={quickCodeInput}
              onChange={(e) => setQuickCodeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleQuickCheckIn(quickCodeInput);
                }
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <button
            type="button"
            onClick={() => handleQuickCheckIn(quickCodeInput)}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs md:text-sm font-bold shadow-sm shadow-blue-600/20 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Presensi Cepat</span>
          </button>
        </div>

        {/* Filters Bar: Search, Status Tabs, & Division */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto text-xs font-semibold text-slate-600">
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg transition-all ${statusFilter === "ALL" ? "bg-white text-slate-900 shadow-sm font-bold" : "hover:text-slate-900"}`}
            >
              Semua ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("HADIR")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${statusFilter === "HADIR" ? "bg-emerald-600 text-white shadow-sm font-bold" : "hover:text-emerald-700"}`}
            >
              <div className={`w-2 h-2 rounded-full ${statusFilter === "HADIR" ? "bg-white" : "bg-emerald-500"}`} />
              Hadir ({stats.hadir})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("IZIN")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${statusFilter === "IZIN" ? "bg-amber-500 text-white shadow-sm font-bold" : "hover:text-amber-700"}`}
            >
              <div className={`w-2 h-2 rounded-full ${statusFilter === "IZIN" ? "bg-white" : "bg-amber-500"}`} />
              Izin ({stats.izin})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("SAKIT")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${statusFilter === "SAKIT" ? "bg-blue-600 text-white shadow-sm font-bold" : "hover:text-blue-700"}`}
            >
              <div className={`w-2 h-2 rounded-full ${statusFilter === "SAKIT" ? "bg-white" : "bg-blue-500"}`} />
              Sakit ({stats.sakit})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("BELUM")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${statusFilter === "BELUM" ? "bg-rose-600 text-white shadow-sm font-bold" : "hover:text-rose-700"}`}
            >
              <div className={`w-2 h-2 rounded-full ${statusFilter === "BELUM" ? "bg-white" : "bg-rose-500"}`} />
              Belum ({stats.belum + stats.alpha})
            </button>
          </div>

          {/* Division Filter & Text Search */}
          <div className="flex items-center gap-2.5 flex-1 max-w-lg">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama atau NIM..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="relative w-48">
              <select
                value={divisionFilter}
                onChange={(e) => setDivisionFilter(e.target.value)}
                className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer appearance-none pr-8 truncate"
              >
                <option value="ALL">Semua Divisi</option>
                {allDivisions.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Tabel Data Panitia */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Daftar Presensi Panitia ({filteredPanitia.length} Orang)
            </h3>
            <span className="text-xs text-slate-400">
              Menampilkan {filteredPanitia.length} dari {panitiaList.length} total panitia
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-12 text-center">No</th>
                  <th className="py-3.5 px-4">Panitia</th>
                  <th className="py-3.5 px-4">Divisi & Jabatan</th>
                  <th className="py-3.5 px-4 text-center">Status Presensi</th>
                  <th className="py-3.5 px-4">Waktu & Catatan</th>
                  <th className="py-3.5 px-4 text-center w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPanitia.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 text-sm">
                      Tidak ada panitia yang sesuai dengan pencarian / filter.
                    </td>
                  </tr>
                ) : (
                  filteredPanitia.map((p, idx) => {
                    const att = attendanceMap[p.user_id];
                    const currentStatus = att?.status || "BELUM";
                    const divStyle = DIVISION_COLORS[p.division] || { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" };

                    return (
                      <tr key={p.user_id} className="hover:bg-slate-50/80 transition-colors group">
                        {/* No */}
                        <td className="py-3 px-4 text-center text-xs font-semibold text-slate-400">
                          {idx + 1}
                        </td>

                        {/* Panitia Info */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden flex-shrink-0 border border-slate-200">
                              {enrolledMap[p.user_id] ? (
                                <img
                                  src={enrolledMap[p.user_id]}
                                  alt={p.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <img
                                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`}
                                  alt={p.name}
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="font-bold text-slate-800 text-sm truncate" title={p.name}>
                                  {p.name}
                                </p>
                                {enrolledMap[p.user_id] && (
                                  <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.2 rounded-full whitespace-nowrap">
                                    Face ID
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                <span className="font-mono text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded text-[11px] font-semibold">
                                  {p.nim}
                                </span>
                                <span>•</span>
                                <span className="text-[11px] text-slate-400">@{p.username}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Divisi & Jabatan */}
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${divStyle.bg} ${divStyle.text} ${divStyle.border}`}>
                              {p.division}
                            </span>
                            <p className="text-xs text-slate-500 font-medium pl-0.5">{p.position}</p>
                          </div>
                        </td>

                        {/* Status Presensi (Segmented Toggle) */}
                        <td className="py-3 px-4">
                          <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl gap-1">
                            {/* HADIR */}
                            <button
                              type="button"
                              onClick={() => updateAttendance(p, "HADIR")}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${currentStatus === "HADIR" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:text-emerald-700"}`}
                              title="Tandai Hadir"
                            >
                              Hadir
                            </button>

                            {/* IZIN */}
                            <button
                              type="button"
                              onClick={() => {
                                setNoteModalUser(p);
                                setNoteInput(att?.keterangan || "");
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${currentStatus === "IZIN" ? "bg-amber-500 text-white shadow-sm" : "text-slate-600 hover:text-amber-700"}`}
                              title="Tandai Izin"
                            >
                              Izin
                            </button>

                            {/* SAKIT */}
                            <button
                              type="button"
                              onClick={() => updateAttendance(p, "SAKIT")}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${currentStatus === "SAKIT" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:text-blue-700"}`}
                              title="Tandai Sakit"
                            >
                              Sakit
                            </button>

                            {/* ALPHA */}
                            <button
                              type="button"
                              onClick={() => updateAttendance(p, "ALPHA")}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${currentStatus === "ALPHA" ? "bg-rose-600 text-white shadow-sm" : "text-slate-600 hover:text-rose-700"}`}
                              title="Tandai Alpha / Tanpa Keterangan"
                            >
                              Alpha
                            </button>
                          </div>
                        </td>

                        {/* Waktu & Catatan */}
                        <td className="py-3 px-4">
                          <div className="space-y-1 text-xs">
                            {att?.waktu_absen ? (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <div className="flex items-center gap-1 font-semibold text-emerald-700">
                                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>{att.waktu_absen}</span>
                                </div>
                                {(att?.face_snapshot || (typeof window !== "undefined" && localStorage.getItem(`sifest_face_snapshot_${p.user_id}_${tanggal}`)) || enrolledMap[p.user_id]) && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setNoteModalUser(p);
                                      setNoteInput(att?.keterangan || "");
                                    }}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200 text-[10px] font-bold cursor-pointer transition-colors"
                                    title="Lihat Foto Bukti Presensi Face ID & Waktu Lengkap"
                                  >
                                    <Camera className="w-3 h-3 text-cyan-600" />
                                    <span>Bukti Foto</span>
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Belum absen</span>
                            )}
                            {att?.keterangan && (
                              <p
                                onClick={() => {
                                  setNoteModalUser(p);
                                  setNoteInput(att.keterangan);
                                }}
                                className="text-[11px] text-slate-600 bg-amber-50 hover:bg-amber-100 border border-amber-200/60 rounded px-1.5 py-0.5 inline-block cursor-pointer transition-colors"
                                title="Klik untuk lihat detail presensi & ubah keterangan"
                              >
                                Ket: {att.keterangan}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Fitur 1: Presensi Face ID */}
                            <button
                              type="button"
                              onClick={() => {
                                setFaceIDTargetUser(p);
                                setIsFaceIDOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors cursor-pointer"
                              title="Presensi Face ID Panitia Ini"
                            >
                              <Scan className="w-4 h-4" />
                            </button>

                            {/* Fitur 2: Daftar Wajah Panitia */}
                            <button
                              type="button"
                              onClick={() => {
                                setEnrollModalUser(p);
                                setIsEnrollModalOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                              title="Daftarkan / Perbarui Foto Wajah Panitia"
                            >
                              <Camera className="w-4 h-4" />
                            </button>

                            {/* Keterangan */}
                            <button
                              type="button"
                              onClick={() => {
                                setNoteModalUser(p);
                                setNoteInput(att?.keterangan || "");
                              }}
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                              title="Tambah / Ubah Keterangan"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ==================== MODAL PENDAFTARAN WAJAH PANITIA (FACE ENROLLMENT) ==================== */}
      <FaceEnrollmentModal
        isOpen={isEnrollModalOpen}
        onClose={() => {
          setIsEnrollModalOpen(false);
          setEnrollModalUser(null);
          try {
            const cached = localStorage.getItem("sifest_enrolled_face_profiles");
            if (cached) setEnrolledMap(JSON.parse(cached));
          } catch (e) {}
        }}
        panitiaList={panitiaList}
        initialSelectedUser={enrollModalUser}
        onEnrollSuccess={() => {
          try {
            const cached = localStorage.getItem("sifest_enrolled_face_profiles");
            if (cached) setEnrolledMap(JSON.parse(cached));
          } catch (e) {}
        }}
      />

      {/* ==================== MODAL DETAIL PRESENSI & BUKTI FACE ID ==================== */}
      {noteModalUser && (() => {
        const att = attendanceMap[noteModalUser.user_id];
        const status = att?.status || "BELUM";
        const snapshotPhoto =
          att?.face_snapshot ||
          (typeof window !== "undefined"
            ? localStorage.getItem(`sifest_face_snapshot_${noteModalUser.user_id}_${tanggal}`)
            : null) ||
          enrolledMap[noteModalUser.user_id];

        const { fullDate, fullDateTime } = formatFullIndonesianDate(att?.tanggal || tanggal, att?.waktu_absen);
        const isFaceID = att?.keterangan?.toLowerCase().includes("face id") || !!snapshotPhoto;

        return (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 md:p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
              {/* Header */}
              <div
                className={`p-4 md:p-5 text-white flex items-center justify-between ${
                  isFaceID
                    ? "bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-700"
                    : "bg-gradient-to-r from-amber-500 to-orange-600"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner">
                    {isFaceID ? (
                      <Scan className="w-5 h-5 text-white animate-pulse" />
                    ) : (
                      <FileText className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base leading-tight">
                      {isFaceID ? "Detail Presensi Face ID" : "Detail & Keterangan Presensi"}
                    </h3>
                    <p className="text-xs text-white/80">
                      Bukti kehadiran dan waktu presensi lengkap
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setNoteModalUser(null)}
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 md:p-6 space-y-4 overflow-y-auto flex-1">
                {/* Panitia Info Card */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-full bg-slate-200 overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
                      {snapshotPhoto ? (
                        <img src={snapshotPhoto} alt={noteModalUser.name} className="w-full h-full object-cover" />
                      ) : (
                        <img
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${noteModalUser.name}`}
                          alt={noteModalUser.name}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-slate-900 text-sm truncate">{noteModalUser.name}</h4>
                      <p className="text-xs text-slate-500 font-mono truncate">
                        {noteModalUser.division} • {noteModalUser.nim}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold border flex-shrink-0 ${
                      status === "HADIR"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : status === "IZIN"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : status === "SAKIT"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-rose-50 text-rose-700 border-rose-200"
                    }`}
                  >
                    {status}
                  </span>
                </div>

                {/* Foto Bukti Presensi Face ID */}
                {snapshotPhoto && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Camera className="w-4 h-4 text-cyan-600" />
                        Foto Saat Face ID:
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" /> Wajah Terverifikasi
                      </span>
                    </div>

                    <div className="relative rounded-2xl overflow-hidden bg-slate-950 border-2 border-cyan-500/40 shadow-lg aspect-[4/3] max-w-xs mx-auto flex items-center justify-center group">
                      <img
                        src={snapshotPhoto}
                        alt="Foto Bukti Face ID"
                        className="w-full h-full object-cover"
                      />

                      {/* Watermark Overlay Tanggal & Jam Lengkap */}
                      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent text-white font-mono text-left">
                        <p className="font-bold text-cyan-300 text-xs flex items-center gap-1">
                          <Scan className="w-3.5 h-3.5 text-cyan-400" />
                          <span>SI FEST 2026 • FACE ID</span>
                        </p>
                        <p className="text-[11px] text-slate-200 mt-0.5 font-medium">{fullDateTime}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Detail Waktu & Format Tanggal Lengkap */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2.5 text-xs text-slate-700">
                  <div className="flex items-start gap-2.5">
                    <Calendar className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-500 block text-[11px]">Hari, Tanggal, Bulan, Tahun:</span>
                      <span className="font-bold text-slate-900 text-sm">{fullDate}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Clock className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-500 block text-[11px]">Waktu / Jam Presensi:</span>
                      <span className="font-mono font-bold text-emerald-700 text-sm">
                        {att?.waktu_absen || "Belum ada jam absen"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Layers className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-500 block text-[11px]">Sesi Agenda:</span>
                      <span className="font-bold text-slate-800">{att?.sesi || activeSesi}</span>
                    </div>
                  </div>
                </div>

                {/* Catatan / Keterangan */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Keterangan Presensi:
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Contoh: Presensi via Face ID Biometrik, Sakit demam, Izin kuliah, dll..."
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setNoteModalUser(null)}
                  className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateAttendance(noteModalUser, att?.status || "HADIR", noteInput);
                    setNoteModalUser(null);
                    toast.success(`Keterangan disimpan untuk ${noteModalUser.name}`);
                  }}
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ==================== MODAL FACE ID BIOMETRIC SCANNER ==================== */}
      <FaceIDScannerModal
        isOpen={isFaceIDOpen}
        onClose={() => {
          setIsFaceIDOpen(false);
          setFaceIDTargetUser(null);
        }}
        panitiaList={panitiaList}
        initialSelectedUser={faceIDTargetUser}
        onOpenEnrollment={(user) => {
          setIsFaceIDOpen(false);
          setEnrollModalUser(user || null);
          setIsEnrollModalOpen(true);
        }}
        onAttendanceSuccess={async (user, snapshotBase64) => {
          if (snapshotBase64) {
            try {
              localStorage.setItem(`sifest_face_snapshot_${user.user_id}_${tanggal}`, snapshotBase64);
            } catch (e) {}
          }
          await updateAttendance(user, "HADIR", "Presensi via Face ID Biometrik");
        }}
      />

      {/* ==================== MODAL DAFTAR WAJAH PANITIA (MASTER FACE ENROLLMENT) ==================== */}
      <FaceEnrollmentModal
        isOpen={isEnrollModalOpen}
        onClose={() => {
          setIsEnrollModalOpen(false);
          setEnrollModalUser(null);
        }}
        panitiaList={panitiaList}
        initialSelectedUser={enrollModalUser}
        onEnrollSuccess={(user, photoBase64) => {
          setEnrolledMap((prev) => ({ ...prev, [user.user_id]: photoBase64 }));
        }}
      />

      {/* ==================== MODAL KONFIRMASI RESET PRESENSI ==================== */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-[90] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 md:p-6 bg-gradient-to-r from-rose-50 to-amber-50 border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center flex-shrink-0">
                  <RotateCcw className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Reset Data Presensi Panitia
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Kembalikan kehadiran ke 0 Hadir (69 Belum Hadir)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 md:p-6 space-y-4 overflow-y-auto">
              <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 space-y-1">
                  <p className="font-bold">Daftar Panitia Tetap Tersimpan Aman:</p>
                  <p className="text-amber-800">
                    Sebanyak <strong>{panitiaList.length} orang panitia</strong> tidak akan dihapus. Yang direset hanyalah catatan status kehadiran (HADIR/IZIN/SAKIT) kembali menjadi <strong>BELUM HADIR</strong>.
                  </p>
                </div>
              </div>

              {/* Scope Selection */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Pilih Lingkup Reset:
                </label>
                <div
                  onClick={() => setResetScope("ALL_DATA")}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    resetScope === "ALL_DATA"
                      ? "border-rose-500 bg-rose-50/50 shadow-sm ring-1 ring-rose-400/30"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="pr-3">
                    <p className="text-sm font-bold text-slate-900">Reset SEMUA Sesi & Riwayat Kehadiran (Bersih Total)</p>
                    <p className="text-xs text-slate-500">Mereset semua tanggal & sesi ke 0 Hadir ({panitiaList.length} Belum).</p>
                  </div>
                  <input
                    type="radio"
                    name="reset_scope"
                    checked={resetScope === "ALL_DATA"}
                    onChange={() => setResetScope("ALL_DATA")}
                    className="w-4 h-4 text-rose-600 focus:ring-rose-500 cursor-pointer"
                  />
                </div>

                <div
                  onClick={() => setResetScope("SESSION_ONLY")}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    resetScope === "SESSION_ONLY"
                      ? "border-rose-500 bg-rose-50/50 shadow-sm ring-1 ring-rose-400/30"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="pr-3">
                    <p className="text-sm font-bold text-slate-900">Reset Sesi Ini Saja</p>
                    <p className="text-xs text-slate-500">
                      Hanya tanggal <strong>{tanggal}</strong> & sesi <strong>{activeSesi}</strong>.
                    </p>
                  </div>
                  <input
                    type="radio"
                    name="reset_scope"
                    checked={resetScope === "SESSION_ONLY"}
                    onChange={() => setResetScope("SESSION_ONLY")}
                    className="w-4 h-4 text-rose-600 focus:ring-rose-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Option to clear Face profiles */}
              {resetScope === "ALL_DATA" && (
                <label className="flex items-start gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={includeFaceProfiles}
                    onChange={(e) => setIncludeFaceProfiles(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                  />
                  <div className="text-xs text-slate-700">
                    <span className="font-bold block text-slate-900">Hapus juga Master Wajah & Foto Snapshot Face ID</span>
                    <span className="text-slate-500">Bersihkan seluruh foto selfie uji coba Face ID agar mulai dari awal.</span>
                  </div>
                </label>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setIsResetModalOpen(false)}
                className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleExecuteReset}
                className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20 flex items-center gap-2 cursor-pointer transition-all"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                <span>Ya, Reset Data Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
