"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  QrCode,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Users,
  Check,
  Volume2,
  VolumeX,
  SwitchCamera,
  Keyboard,
  Clock,
  Sparkles
} from "lucide-react";
import { PanitiaUser } from "@/app/(dashboard)/absensi-panitia/page";
import { toast } from "sonner";

interface PanitiaBarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  panitiaList: PanitiaUser[];
  onAttendanceSuccess: (user: PanitiaUser, keterangan?: string) => Promise<any>;
  sessionTitle?: string;
  onOpenIdCardModal?: (user?: PanitiaUser | null) => void;
}

export default function PanitiaBarcodeScannerModal({
  isOpen,
  onClose,
  panitiaList,
  onAttendanceSuccess,
  sessionTitle,
  onOpenIdCardModal
}: PanitiaBarcodeScannerModalProps) {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  // Mobile Tab: "scanner" | "panitia"
  const [mobileTab, setMobileTab] = useState<"scanner" | "panitia">("scanner");

  // Verified & Feedback state
  const [verifiedUser, setVerifiedUser] = useState<PanitiaUser | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string>("");
  const [isAlreadyAttended, setIsAlreadyAttended] = useState(false);

  // Manual input / USB Barcode input
  const [manualInput, setManualInput] = useState("");
  const [searchTarget, setSearchTarget] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanTimeRef = useRef(0);
  const lastScanTextRef = useRef("");

  // Sound Synthesizers
  const playChime = useCallback((type: "success" | "already" | "error") => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = audioCtx.currentTime;

      if (type === "success") {
        // High crisp double ding (Cash register / POS scanner ding)
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.frequency.setValueAtTime(1046, now); // C6
        gain1.gain.setValueAtTime(0.2, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        osc1.start(now);
        osc1.stop(now + 0.12);

        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.frequency.setValueAtTime(1318, now + 0.08); // E6
        gain2.gain.setValueAtTime(0.22, now + 0.08);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.start(now + 0.08);
        osc2.stop(now + 0.28);
      } else if (type === "already") {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.setValueAtTime(587, now);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
      } else {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(220, now);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
      }
    } catch (e) {}
  }, [soundEnabled]);

  // Voice Greeting
  const speakGreeting = useCallback((userName: string) => {
    if (!voiceEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const text = `Presensi berhasil. Selamat bertugas, ${userName.split(" ")[0]}!`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "id-ID";
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {}
  }, [voiceEnabled]);

  // Find Panitia by code / raw scan
  const findPanitia = useCallback((raw: string): PanitiaUser | null => {
    const clean = raw.trim();
    if (!clean) return null;

    // 1. Check JSON payload
    if (clean.startsWith("{") && clean.endsWith("}")) {
      try {
        const parsed = JSON.parse(raw);
        const search = String(parsed.nim || parsed.user_id || parsed.id || "").toLowerCase();
        if (search) {
          const match = panitiaList.find(
            (p) => String(p.nim).toLowerCase() === search || p.user_id.toLowerCase() === search
          );
          if (match) return match;
        }
      } catch (e) {}
    }

    // 2. Extract digits only for NIM comparison (handles prefixes like "NIM: 23101152610332", barcode labels, or scanner suffixes)
    const digitsOnly = clean.replace(/\D/g, "");
    if (digitsOnly.length >= 6) {
      const matchByDigits = panitiaList.find((p) => {
        const pNimDigits = String(p.nim).replace(/\D/g, "");
        return pNimDigits === digitsOnly || digitsOnly.includes(pNimDigits) || pNimDigits.includes(digitsOnly);
      });
      if (matchByDigits) return matchByDigits;
    }

    // 3. Direct normalized match against NIM, user_id, username, or name
    const lowerClean = clean.toLowerCase();
    const match = panitiaList.find((p) => {
      const pNim = String(p.nim).toLowerCase();
      const pUser = String(p.user_id).toLowerCase();
      const pUsername = String(p.username || "").toLowerCase();
      const pName = p.name.toLowerCase();

      return (
        pNim === lowerClean ||
        pUser === lowerClean ||
        pUsername === lowerClean ||
        lowerClean.includes(pNim) ||
        lowerClean.includes(pUser) ||
        pName === lowerClean ||
        lowerClean.includes(pName)
      );
    });

    return match || null;
  }, [panitiaList]);

  // Process Attendance
  const handleProcessScan = useCallback(async (codeText: string) => {
    const clean = codeText.trim();
    if (!clean) return;

    setLastScannedCode(clean);
    const target = findPanitia(clean);

    if (target) {
      setVerifiedUser(target);
      setIsAlreadyAttended(false);
      playChime("success");
      speakGreeting(target.name);
      toast.success(`Barcode Cocok: ${target.name} terverifikasi HADIR!`);

      try {
        await onAttendanceSuccess(target, `Presensi via Barcode Sesi ${sessionTitle || ""}`);
      } catch (e) {}

      // Auto clear feedback after 3.5s
      setTimeout(() => {
        setVerifiedUser(null);
        setLastScannedCode("");
      }, 3500);
    } else {
      playChime("error");
      toast.error(`Kode Barcode "${clean}" tidak ditemukan di daftar panitia.`);
    }
  }, [findPanitia, onAttendanceSuccess, playChime, speakGreeting, sessionTitle]);

  // Stop Scanner Camera
  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (e) {}
      scannerRef.current = null;
    }
    setIsCameraReady(false);
  }, []);

  // Start Scanner Camera
  const startScanner = useCallback(async (mode: "environment" | "user" = facingMode) => {
    setCameraError(null);
    setIsCameraReady(false);
    await stopScanner();

    try {
      const element = document.getElementById("panitia-barcode-reader");
      if (!element) return;

      const html5QrCode = new Html5Qrcode("panitia-barcode-reader", {
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        },
        verbose: false
      });
      scannerRef.current = html5QrCode;

      const config = {
        fps: 25,
        qrbox: (w: number, h: number) => {
          return {
            width: Math.min(Math.floor(w * 0.9), 420),
            height: Math.min(Math.floor(h * 0.65), 260)
          };
        }
      };

      const handleSuccess = (decodedText: string) => {
        const now = Date.now();
        // Debounce same code 1.5s
        if (now - lastScanTimeRef.current < 1500 && lastScanTextRef.current === decodedText) {
          return;
        }
        lastScanTimeRef.current = now;
        lastScanTextRef.current = decodedText;
        handleProcessScan(decodedText);
      };

      try {
        await html5QrCode.start({ facingMode: mode }, config, handleSuccess, () => {});
        setIsCameraReady(true);
      } catch (err1) {
        // Fallback facingMode
        await html5QrCode.start({ facingMode: "user" }, config, handleSuccess, () => {});
        setIsCameraReady(true);
      }
    } catch (err: any) {
      console.error("Gagal start barcode camera:", err);
      setCameraError(
        err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError"
          ? "Izin akses kamera ditolak. Berikan izin kamera di browser Anda."
          : "Kamera tidak terdeteksi atau sedang digunakan aplikasi lain."
      );
    }
  }, [facingMode, handleProcessScan, stopScanner]);

  // Toggle Camera
  const toggleFacingMode = () => {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    startScanner(next);
    toast.info(`Beralih ke ${next === "environment" ? "Kamera Belakang" : "Kamera Depan"}`);
  };

  useEffect(() => {
    if (isOpen) {
      startScanner();
      setVerifiedUser(null);
      setLastScannedCode("");
      setTimeout(() => inputRef.current?.focus(), 300);
    } else {
      stopScanner();
    }
    return () => {
      stopScanner();
    };
  }, [isOpen, startScanner, stopScanner]);

  // Global listener for USB / Bluetooth Barcode Scanners while modal is open
  useEffect(() => {
    if (!isOpen) return;

    let buffer = "";
    let timer: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in search input
      const activeEl = document.activeElement;
      if (activeEl && activeEl.getAttribute("data-search-target") === "true") {
        return;
      }

      if (e.key === "Enter") {
        if (buffer.trim().length >= 3) {
          e.preventDefault();
          const code = buffer.trim();
          buffer = "";
          handleProcessScan(code);
        }
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        buffer += e.key;
        clearTimeout(timer);
        timer = setTimeout(() => {
          buffer = "";
        }, 400);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
    };
  }, [isOpen, handleProcessScan]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    handleProcessScan(manualInput.trim());
    setManualInput("");
  };

  if (!isOpen) return null;

  const filteredPanitia = panitiaList.filter((p) => {
    const q = searchTarget.toLowerCase().trim();
    return (
      !q ||
      p.name.toLowerCase().includes(q) ||
      String(p.nim).includes(q) ||
      p.division.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[96dvh] sm:max-h-[92vh]">
        {/* Header Bar */}
        <div className="p-3 sm:p-4 md:px-6 md:py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0">
              <QrCode className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-white font-extrabold text-sm sm:text-base md:text-lg tracking-tight truncate">
                  Presensi Barcode / QR Code
                </h3>
                {sessionTitle && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Sesi: {sessionTitle}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Kamera & Scanner USB Aktif</span>
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 hidden sm:block truncate">
                Arahkan Barcode / QR Code ID Card panitia ke kamera atau gunakan alat scanner barcode USB.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Switch Camera */}
            <button
              type="button"
              onClick={toggleFacingMode}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              title={facingMode === "environment" ? "Beralih ke Kamera Depan" : "Beralih ke Kamera Belakang"}
            >
              <SwitchCamera className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">{facingMode === "environment" ? "Kamera Belakang" : "Kamera Depan"}</span>
            </button>

            {/* Audio Toggle */}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-1.5 sm:p-2 rounded-xl border transition-colors ${
                soundEnabled
                  ? "bg-slate-800 text-blue-400 border-slate-700"
                  : "bg-slate-800/40 text-slate-500 border-slate-800"
              }`}
              title={soundEnabled ? "Audio Chime Aktif" : "Audio Mute"}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="flex lg:hidden border-b border-slate-800 bg-slate-900 px-3 py-2 gap-2">
          <button
            type="button"
            onClick={() => setMobileTab("scanner")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              mobileTab === "scanner"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Scanner Barcode</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("panitia")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              mobileTab === "panitia"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Daftar Panitia ({panitiaList.length})</span>
          </button>
        </div>

        {/* Content Body: Split View */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-y-auto">
          {/* Main Viewfinder (Col 8) */}
          <div
            className={`lg:col-span-8 p-3 sm:p-6 flex flex-col items-center justify-center bg-black/40 relative ${
              mobileTab === "scanner" ? "flex" : "hidden lg:flex"
            }`}
          >
            {/* Barcode Camera Viewport */}
            <div className="relative w-full max-w-lg aspect-square rounded-3xl overflow-hidden bg-slate-950 border-2 border-slate-800 shadow-2xl flex items-center justify-center group">
              <div id="panitia-barcode-reader" className="w-full h-full" />

              {/* Camera Error Message */}
              {cameraError && (
                <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center text-white z-20">
                  <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
                  <p className="font-bold text-sm text-rose-400 mb-2">{cameraError}</p>
                  <button
                    type="button"
                    onClick={() => startScanner(facingMode)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" /> Coba Lagi
                  </button>
                </div>
              )}

              {/* Laser Target Overlay */}
              {!cameraError && isCameraReady && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6 z-10">
                  <div className="relative w-72 h-44 sm:w-80 sm:h-52 md:w-96 md:h-56 rounded-3xl border-2 border-blue-400/80 shadow-[0_0_35px_rgba(59,130,246,0.3)] flex items-center justify-center">
                    {/* Glowing Corner Brackets */}
                    <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 rounded-tl-xl border-blue-400" />
                    <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 rounded-tr-xl border-blue-400" />
                    <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 rounded-bl-xl border-blue-400" />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 rounded-br-xl border-blue-400" />

                    {/* Sweeping Laser Line */}
                    <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_12px_#3b82f6] animate-pulse top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              )}

              {/* Verified Flash Confirmation */}
              {verifiedUser && (
                <div className="absolute inset-0 bg-emerald-950/90 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-6 text-center text-white animate-in zoom-in duration-200">
                  <div className="w-20 h-20 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-2xl shadow-emerald-500/50 mb-3">
                    <Check className="w-12 h-12 stroke-[3]" />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-widest text-emerald-300 bg-emerald-900/60 border border-emerald-500/40 px-3 py-1 rounded-full mb-2">
                    PRESENSI BERHASIL
                  </span>
                  <h3 className="text-xl font-extrabold text-white truncate max-w-sm">
                    {verifiedUser.name}
                  </h3>
                  <p className="text-xs text-emerald-200 font-mono mt-0.5">
                    {verifiedUser.division} • {verifiedUser.nim}
                  </p>
                </div>
              )}
            </div>

            {/* Quick NIM / Barcode Input Directly Under Camera */}
            <form onSubmit={handleManualSubmit} className="w-full max-w-lg mt-3 flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Scan barcode scanner USB / ketik NIM / Nama..."
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
                <Keyboard className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
              <button
                type="submit"
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <span>Enter</span>
              </button>
            </form>

            {/* Hint & ID Card Link */}
            <div className="w-full max-w-lg mt-3 p-3 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-400">
                <Clock className="w-4 h-4 text-blue-400" />
                <span>Panitia dapat menunjukkan barcode dari layar HP atau ID Card.</span>
              </div>
              {onOpenIdCardModal && (
                <button
                  type="button"
                  onClick={() => onOpenIdCardModal(verifiedUser || null)}
                  className="text-blue-400 hover:text-blue-300 font-bold underline cursor-pointer text-[11px]"
                >
                  Lihat ID Card Panitia
                </button>
              )}
            </div>
          </div>

          {/* Right Sidebar: Panitia Queue / Selection (Col 4) */}
          <div
            className={`lg:col-span-4 p-3 sm:p-4 border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-900/60 flex flex-col ${
              mobileTab === "panitia" ? "flex" : "hidden lg:flex"
            }`}
          >
            <div className="mb-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-400" />
                  Daftar Panitia ({panitiaList.length})
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">
                  {panitiaList.length} Total
                </span>
              </div>
              <input
                data-search-target="true"
                type="text"
                placeholder="Cari nama / NIM / divisi..."
                value={searchTarget}
                onChange={(e) => setSearchTarget(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[380px] lg:max-h-[460px]">
              {filteredPanitia.map((p) => (
                <div
                  key={p.user_id}
                  onClick={() => {
                    handleProcessScan(String(p.nim));
                    setMobileTab("scanner");
                  }}
                  className="p-2.5 rounded-xl border border-slate-800 bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex-shrink-0 overflow-hidden border border-slate-600">
                      <img
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`}
                        alt={p.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate leading-tight group-hover:text-blue-300 transition-colors">
                        {p.name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono truncate">
                        {p.division} • {p.nim}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-[9px] font-bold text-blue-300 bg-blue-950/70 border border-blue-500/30 px-2 py-0.5 rounded-lg opacity-80 group-hover:opacity-100">
                      Pilih
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

