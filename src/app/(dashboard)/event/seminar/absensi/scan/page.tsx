"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Camera, Check, AlertTriangle, GraduationCap, Building2, Smartphone, IdCard } from "lucide-react";
import { getSeminarRegistrations, toggleSeminarAttendance, checkInSeminarByCode } from "../../actions";
import QRScanner from "@/components/scanner/QRScanner";

export default function MobileSeminarScannerPage() {
  const [lastScanned, setLastScanned] = useState<any | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [localParticipants, setLocalParticipants] = useState<any[]>([]);

  useEffect(() => {
    // Pre-cache seminar participants in mobile browser memory for instant (0ms) scanning
    getSeminarRegistrations().then(res => {
      if (res.success && res.data) {
        setLocalParticipants(res.data);
      }
    });
  }, []);

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {}
  };

  const handleScanSuccess = async (decodedText: string) => {
    let cleanCode = decodedText.trim();
    let cleanId = "";

    if (cleanCode.startsWith("{") && cleanCode.endsWith("}")) {
      try {
        const parsed = JSON.parse(cleanCode);
        if (parsed.code) cleanCode = String(parsed.code).trim();
        if (parsed.id) cleanId = String(parsed.id).trim();
      } catch (e) {}
    }

    // ⚡ 1. INSTANT LOCAL MATCH (0ms)
    const match = localParticipants.find((p) =>
      (cleanCode && p.registration_code?.toLowerCase() === cleanCode.toLowerCase()) ||
      (cleanCode && p.id_peserta?.toLowerCase() === cleanCode.toLowerCase()) ||
      (cleanId && (p.id === cleanId || p.participant_id === cleanId)) ||
      (cleanCode && (p.id === cleanCode || p.participant_id === cleanCode))
    );

    if (match) {
      playBeep();
      const nowIso = new Date().toISOString();
      const isAlready = Boolean(match.attended);
      const timeStr = new Date(isAlready ? (match.attended_at || nowIso) : nowIso).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }) + " WIB";

      setLastScanned({
        ...match,
        attended: true,
        isAlreadyCheckedIn: isAlready,
        timeStr
      });

      if (!isAlready) {
        setLocalParticipants(prev =>
          prev.map(p => p.participant_id === match.participant_id ? { ...p, attended: true, attended_at: nowIso } : p)
        );
        toggleSeminarAttendance(match.participant_id, true);
      }
      return;
    }

    // ⚡ 2. Fallback to server if not in local cache
    if (isProcessing) return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const res = await checkInSeminarByCode(cleanCode || cleanId);
      if (res.success && res.data) {
        playBeep();
        const timeStr = new Date(res.data.attended_at || new Date()).toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        }) + " WIB";

        setLastScanned({
          ...res.data,
          isAlreadyCheckedIn: res.alreadyCheckedIn,
          timeStr
        });
      } else {
        setErrorMessage(res.message || "QR Code tidak dikenali sebagai peserta seminar.");
      }
    } catch (err: any) {
      setErrorMessage("Terjadi kesalahan saat memproses scan.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Top Mobile Header */}
      <div className="p-4 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between sticky top-0 z-20">
        <Link
          href="/event/seminar/absensi"
          className="w-9 h-9 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center hover:bg-slate-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="text-center">
          <h1 className="text-sm font-bold text-white flex items-center justify-center gap-1.5">
            <Smartphone className="w-4 h-4 text-emerald-400" />
            Scanner HP Panitia
          </h1>
          <p className="text-[10px] text-slate-400">Sinkronisasi Realtime ke Laptop</p>
        </div>
        <div className="w-9" />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col p-4 max-w-md mx-auto w-full space-y-4">
        
        {/* Camera Box */}
        <div className="rounded-3xl overflow-hidden border border-slate-800 shadow-xl bg-black">
          <QRScanner onScanSuccess={handleScanSuccess} />
        </div>

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="p-3 bg-blue-900/50 border border-blue-500/50 rounded-2xl text-center text-xs text-blue-200 animate-pulse">
            Memverifikasi data tiket ke server...
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 bg-rose-950/80 border border-rose-600/60 rounded-2xl text-rose-200 text-xs flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Result Card on Phone */}
        {lastScanned && (
          <div
            className={`p-5 rounded-3xl border shadow-xl animate-in zoom-in-95 duration-200 space-y-3 ${
              lastScanned.isAlreadyCheckedIn
                ? "bg-amber-950/70 border-amber-500/60 text-amber-100"
                : "bg-emerald-950/70 border-emerald-500/60 text-emerald-100"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full bg-white/20">
                {lastScanned.isAlreadyCheckedIn ? "Sudah Hadir Sebelumnya" : "Presensi Berhasil!"}
              </span>
              <span className="text-xs font-mono text-white/80">{lastScanned.timeStr}</span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-white/60">Nama Peserta</span>
              <h3 className="text-xl font-black text-white leading-tight">
                {lastScanned.nama_lengkap}
              </h3>
              <div className="text-xs font-mono text-emerald-300">
                ID: {lastScanned.registration_code || lastScanned.id_peserta}
              </div>
            </div>

            {/* Asal Instansi / UPI Detail */}
            {lastScanned.institusi.toLowerCase().includes("upi") ||
            lastScanned.institusi.toLowerCase().includes("yptk") ||
            Boolean(lastScanned.nobp) ? (
              <div className="p-3 bg-white/10 rounded-2xl border border-white/10 space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-white">
                  <GraduationCap className="w-4 h-4 text-indigo-300" />
                  <span>UPI &quot;YPTK&quot; Padang</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                  <div>
                    <span className="text-white/60 block text-[9px] uppercase font-semibold">Jurusan</span>
                    <strong className="text-white">{lastScanned.jurusan || "Sistem Informasi"}</strong>
                  </div>
                  <div>
                    <span className="text-white/60 block text-[9px] uppercase font-semibold">No. BP</span>
                    <strong className="text-white font-mono">{lastScanned.nobp || "-"}</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-white/10 rounded-2xl border border-white/10 text-xs flex items-center gap-2">
                <Building2 className="w-4 h-4 text-white/60 shrink-0" />
                <div>
                  <span className="text-white/60 block text-[9px] uppercase font-semibold">Asal Instansi</span>
                  <strong className="text-white">{lastScanned.institusi}</strong>
                </div>
              </div>
            )}

            <div className="pt-1 text-[11px] text-white/70 flex items-center justify-between">
              <span>Status Bayar: <strong>{lastScanned.status_bayar}</strong></span>
              <span className="text-emerald-300 font-semibold">✓ Tersinkron ke Laptop</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
