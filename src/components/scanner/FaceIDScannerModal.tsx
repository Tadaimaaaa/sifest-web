"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Camera,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  User,
  ShieldCheck,
  Check,
  Volume2,
  VolumeX,
  Scan,
  Users,
  Search,
  CheckCheck,
  UserX,
  SwitchCamera
} from "lucide-react";
import Cookies from "js-cookie";
import { PanitiaUser } from "@/app/(dashboard)/absensi-panitia/page";
import { toast } from "sonner";
import {
  extractRobustFaceFeatures,
  computeBiometricMatch,
  fetchEnrolledFacesFromDb
} from "@/lib/face-biometrics";

interface FaceIDScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  panitiaList: PanitiaUser[];
  initialSelectedUser?: PanitiaUser | null;
  onAttendanceSuccess: (user: PanitiaUser, snapshotBase64?: string) => Promise<any>;
  onOpenEnrollment?: (user?: PanitiaUser | null) => void;
  sessionTitle?: string;
}

// ==================== MAIN COMPONENT ====================

export default function FaceIDScannerModal({
  isOpen,
  onClose,
  panitiaList,
  initialSelectedUser,
  onAttendanceSuccess,
  onOpenEnrollment,
  sessionTitle
}: FaceIDScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Camera Facing Mode: "user" (Depan/Selfie) atau "environment" (Kamera Belakang)
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  // Mobile Tab: "scanner" atau "panitia" (khusus tampilan HP / layar kecil)
  const [mobileTab, setMobileTab] = useState<"scanner" | "panitia">("scanner");

  // States
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  // Face Detection & Recognition States
  const [scanState, setScanState] = useState<"IDLE" | "DETECTING" | "ANALYZING" | "VERIFIED" | "UNMATCHED">("IDLE");
  const [confidence, setConfidence] = useState(0);
  const [detectedUser, setDetectedUser] = useState<PanitiaUser | null>(null);
  const [verifiedUser, setVerifiedUser] = useState<PanitiaUser | null>(null);
  const [capturedSnapshot, setCapturedSnapshot] = useState<string | null>(null);

  // Manual target override (if operator clicks a panitia on right panel)
  const [manualTargetUser, setManualTargetUser] = useState<PanitiaUser | null>(null);
  const [searchTarget, setSearchTarget] = useState("");
  const [quickNimInput, setQuickNimInput] = useState("");

  // Enrolled faces & pre-computed biometric vectors
  const [enrolledFaces, setEnrolledFaces] = useState<Record<string, string>>({});
  const [enrolledVectors, setEnrolledVectors] = useState<Record<string, number[]>>({});
  const [isLoadingDb, setIsLoadingDb] = useState(false);

  // Audio Synthesizers
  const playAudioChime = useCallback((type: "scan" | "success" | "error") => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = audioCtx.currentTime;

      if (type === "scan") {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(780, now + 0.08);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === "success") {
        // Apple Face ID style two-tone high unlock ding (F# -> C#)
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.frequency.setValueAtTime(740, now);
        gain1.gain.setValueAtTime(0.18, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        osc1.start(now);
        osc1.stop(now + 0.18);

        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.frequency.setValueAtTime(1108, now + 0.09);
        gain2.gain.setValueAtTime(0.2, now + 0.09);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.start(now + 0.09);
        osc2.stop(now + 0.35);
      } else if (type === "error") {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(240, now);
        gain.gain.setValueAtTime(0.15, now);
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

  // Load enrolled faces from Cloud Database & pre-compute biometric vectors
  useEffect(() => {
    if (!isOpen) return;

    setIsLoadingDb(true);
    fetchEnrolledFacesFromDb()
      .then(({ photos, vectors }) => {
        setEnrolledFaces(photos);
        setEnrolledVectors(vectors);
        setIsLoadingDb(false);

        // Pastikan setiap foto memiliki vektor biometrik
        Object.entries(photos).forEach(([userId, base64Photo]) => {
          if (!vectors[userId] || vectors[userId].length === 0) {
            const img = new Image();
            img.onload = () => {
              const vec = extractRobustFaceFeatures(img);
              if (vec) {
                setEnrolledVectors((prev) => ({ ...prev, [userId]: vec }));
              }
            };
            img.src = base64Photo;
          }
        });
      })
      .catch((err) => {
        console.error("Gagal load wajah dari database:", err);
        setIsLoadingDb(false);
      });
  }, [isOpen]);

  // Sync initial user prop if provided
  useEffect(() => {
    if (initialSelectedUser) {
      setManualTargetUser(initialSelectedUser);
      setQuickNimInput(String(initialSelectedUser.nim || ""));
    } else {
      setManualTargetUser(null);
      setQuickNimInput("");
    }
  }, [initialSelectedUser, isOpen]);

  // Start Camera with facingMode support (user = selfie, environment = rear/kamera belakang)
  const startCamera = useCallback(async (mode: "user" | "environment" = facingMode) => {
    setCameraError(null);
    setIsCameraReady(false);

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {});
          setIsCameraReady(true);
        };
      }
    } catch (err: any) {
      console.error("Camera access failed:", err);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(() => {});
            setIsCameraReady(true);
          };
        }
      } catch (fallbackErr: any) {
        setCameraError(
          fallbackErr.name === "NotAllowedError" || fallbackErr.name === "PermissionDeniedError"
            ? "Akses kamera ditolak. Mohon izinkan izin kamera di browser Anda."
            : "Kamera tidak terdeteksi atau sedang digunakan aplikasi lain."
        );
      }
    }
  }, [facingMode]);

  // Beralih antara Kamera Depan & Kamera Belakang
  const toggleFacingMode = () => {
    const nextMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextMode);
    startCamera(nextMode);
    toast.info(`Beralih ke ${nextMode === "user" ? "Kamera Depan (Selfie)" : "Kamera Belakang"}`);
  };

  // Stop Camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCameraReady(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      startCamera();
      setScanState("IDLE");
      setVerifiedUser(null);
      setDetectedUser(null);
      setConfidence(0);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  // Capture current frame from video as Base64 JPEG
  const captureFrame = (): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const minDim = Math.min(video.videoWidth || 640, video.videoHeight || 480);
    const startX = ((video.videoWidth || 640) - minDim) / 2;
    const startY = ((video.videoHeight || 480) - minDim) / 2;

    if (facingMode === "user") {
      // Mirror hanya jika kamera depan (selfie)
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, startX, startY, minDim, minDim, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85);
  };

  // Execute verification and check-in for targeted user
  const triggerVerification = async (target: PanitiaUser, score: number) => {
    if (!target) return;

    const snapshot = captureFrame() || undefined;
    setCapturedSnapshot(snapshot || null);
    setVerifiedUser(target);
    setScanState("VERIFIED");
    setConfidence(score);
    playAudioChime("success");
    speakGreeting(target.name);
    toast.success(`Face ID Match (${score}%): ${target.name} terverifikasi HADIR!`);

    // Save attendance
    try {
      await onAttendanceSuccess(target, snapshot);
    } catch (e) {}

    // Auto-reset after 3.2 seconds for next person in line
    setTimeout(() => {
      setScanState("IDLE");
      setVerifiedUser(null);
      setDetectedUser(null);
      setCapturedSnapshot(null);
      setConfidence(0);
    }, 3200);
  };

  // ==================== REAL-TIME BIOMETRIC MATCHING ENGINE ====================
  // Scans webcam frame every 220ms and compares against all registered panitia faces from database
  useEffect(() => {
    if (!isOpen || !isCameraReady || scanState === "VERIFIED") return;

    let isCancelled = false;
    let matchInterval: NodeJS.Timeout;

    const runBiometricComparison = () => {
      if (isCancelled || !videoRef.current) return;

      // Extract live robust feature vector from center of webcam feed
      const liveVector = extractRobustFaceFeatures(videoRef.current);
      if (!liveVector) return;

      // If manual target was selected by operator:
      if (manualTargetUser) {
        const enrolledVec = enrolledVectors[manualTargetUser.user_id];
        if (enrolledVec && enrolledVec.length > 0) {
          const score = computeBiometricMatch(liveVector, enrolledVec);
          setConfidence(score);
          if (score >= 52) {
            setScanState("ANALYZING");
            setDetectedUser(manualTargetUser);
            triggerVerification(manualTargetUser, score);
          } else {
            setScanState("UNMATCHED");
            setDetectedUser(null);
          }
        } else {
          setScanState("UNMATCHED");
          setConfidence(0);
          setDetectedUser(null);
        }
        return;
      }

      // AUTO-MATCHING: Compare live vector against all registered faces in database
      const vectorEntries = Object.entries(enrolledVectors);

      if (vectorEntries.length === 0) {
        setScanState("UNMATCHED");
        setDetectedUser(null);
        setConfidence(0);
        return;
      }

      let bestScore = 0;
      let secondScore = 0;
      let bestUserId: string | null = null;

      for (const [userId, vec] of vectorEntries) {
        if (!vec || vec.length === 0) continue;
        const score = computeBiometricMatch(liveVector, vec);
        if (score > bestScore) {
          secondScore = bestScore;
          bestScore = score;
          bestUserId = userId;
        } else if (score > secondScore) {
          secondScore = score;
        }
      }

      const matchedPanitia = bestUserId ? panitiaList.find((p) => p.user_id === bestUserId) : null;

      // THRESHOLD: Cepat terdeteksi (>=56% atau >=50% dengan selisih jelas terhadap kandidat lain)
      if (matchedPanitia && (bestScore >= 56 || (bestScore >= 50 && bestScore - secondScore >= 7))) {
        setScanState("ANALYZING");
        setDetectedUser(matchedPanitia);
        setConfidence(bestScore);
        playAudioChime("scan");

        // Verified!
        triggerVerification(matchedPanitia, bestScore);
      } else {
        setScanState("UNMATCHED");
        setDetectedUser(null);
        setConfidence(bestScore);
      }
    };

    matchInterval = setInterval(runBiometricComparison, 220);

    return () => {
      isCancelled = true;
      clearInterval(matchInterval);
    };
  }, [
    isOpen,
    isCameraReady,
    scanState,
    manualTargetUser,
    enrolledVectors,
    panitiaList,
    playAudioChime
  ]);

  // Handle Quick NIM input matching
  const handleQuickNimMatch = (value: string) => {
    setQuickNimInput(value);
    const clean = value.trim().toLowerCase();
    if (!clean) {
      setManualTargetUser(null);
      return;
    }

    const match = panitiaList.find((p) => {
      const pNim = String(p.nim).toLowerCase();
      const pUser = String(p.user_id).toLowerCase();
      return pNim === clean || pUser === clean;
    });

    if (match) {
      setManualTargetUser(match);
      setScanState("IDLE");
      setConfidence(0);
      toast.info(`Target Manual: ${match.name}`);
    }
  };

  const handleQuickNimSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = quickNimInput.trim().toLowerCase();
    if (!clean) return;

    const match = panitiaList.find((p) => {
      const pNim = String(p.nim).toLowerCase();
      const pName = p.name.toLowerCase();
      const pUser = String(p.user_id).toLowerCase();
      return pNim === clean || pName.includes(clean) || pUser === clean;
    });

    if (match) {
      setManualTargetUser(match);
      setScanState("IDLE");
      setConfidence(0);
      toast.info(`Target Manual: ${match.name}`);
    } else {
      toast.error("Panitia tidak ditemukan dengan NIM / Nama tersebut.");
    }
  };

  if (!isOpen) return null;

  const currentDisplayUser = verifiedUser || detectedUser || manualTargetUser;
  const enrolledCount = Object.keys(enrolledFaces).length;

  const filteredPanitiaSearch = panitiaList.filter((p) => {
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
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 flex-shrink-0">
              <Scan className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-white font-extrabold text-sm sm:text-base md:text-lg tracking-tight truncate">
                  Face ID Biometric
                </h3>
                {sessionTitle && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Sesi: {sessionTitle}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Cloud: {enrolledCount} Terdaftar</span>
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 hidden sm:block truncate">
                Kamera membandingkan wajah Anda langsung dengan foto master yang telah terdaftar.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Switch Camera Button */}
            <button
              type="button"
              onClick={toggleFacingMode}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              title={facingMode === "user" ? "Beralih ke Kamera Belakang" : "Beralih ke Kamera Depan (Selfie)"}
            >
              <SwitchCamera className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />
              <span className="hidden sm:inline">{facingMode === "user" ? "Kamera Belakang" : "Kamera Depan"}</span>
            </button>

            {/* Audio Toggle */}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-1.5 sm:p-2 rounded-xl border transition-colors ${
                soundEnabled
                  ? "bg-slate-800 text-cyan-400 border-slate-700"
                  : "bg-slate-800/40 text-slate-500 border-slate-800"
              }`}
              title={soundEnabled ? "Audio Efek Aktif" : "Audio Efek Mute"}
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

        {/* Mobile Navigation Tabs (khusus HP & Layar Kecil) */}
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
            <Scan className="w-3.5 h-3.5" />
            <span>Scanner Kamera</span>
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
            <span>Pilih Target ({enrolledCount})</span>
          </button>
        </div>

        {/* Content Body: Split View (Camera Viewfinder + Panitia Target Queue) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-y-auto">
          {/* Main Viewfinder (Col 8) */}
          <div
            className={`lg:col-span-8 p-3 sm:p-6 flex flex-col items-center justify-center bg-black/40 relative ${
              mobileTab === "scanner" ? "flex" : "hidden lg:flex"
            }`}
          >
            {/* Hidden Canvas for Frame Snapshots */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Video Viewport with Biometric Overlay */}
            <div className="relative w-full max-w-lg aspect-[4/3] rounded-3xl overflow-hidden bg-slate-950 border-2 border-slate-800 shadow-2xl flex items-center justify-center group">
              {/* Webcam Video */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${
                  facingMode === "user" ? "transform -scale-x-100" : "transform-none"
                }`}
              />

              {/* Floating Switch Camera button on the viewfinder */}
              <button
                type="button"
                onClick={toggleFacingMode}
                className="absolute top-12 sm:top-14 right-3 z-30 px-2.5 py-1.5 bg-black/75 hover:bg-black/90 backdrop-blur-md rounded-full text-white text-[11px] font-bold border border-cyan-500/30 flex items-center gap-1.5 shadow-lg active:scale-95 transition-all cursor-pointer pointer-events-auto"
                title="Ganti ke Kamera Depan / Belakang"
              >
                <SwitchCamera className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden xs:inline">{facingMode === "user" ? "Kamera Belakang" : "Kamera Depan"}</span>
              </button>

              {/* Camera Error Message */}
              {cameraError && (
                <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center text-white">
                  <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
                  <p className="font-bold text-sm text-rose-400 mb-2">{cameraError}</p>
                  <button
                    type="button"
                    onClick={() => startCamera(facingMode)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" /> Coba Lagi
                  </button>
                </div>
              )}

              {/* Biometric HUD Overlay (Apple Face ID Sci-Fi Style) */}
              {!cameraError && isCameraReady && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                  {/* Subtle Vignette Gradient */}
                  <div className="absolute inset-0 bg-radial-gradient from-transparent via-black/20 to-black/60" />

                  {/* Top Biometric Status Banner */}
                  <div className="absolute top-4 inset-x-4 flex justify-between items-center text-[11px] font-mono font-bold text-cyan-400 px-3 py-1.5 bg-black/75 backdrop-blur-md rounded-full border border-cyan-500/40">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          scanState === "VERIFIED"
                            ? "bg-emerald-400 animate-ping"
                            : scanState === "ANALYZING"
                            ? "bg-cyan-400 animate-pulse"
                            : scanState === "UNMATCHED"
                            ? "bg-amber-400 animate-pulse"
                            : "bg-slate-400"
                        }`}
                      />
                      <span className="truncate">
                        {scanState === "VERIFIED" && "WAJAH TERVERIFIKASI HADIR!"}
                        {scanState === "ANALYZING" &&
                          `WAJAH COCOK: ${(currentDisplayUser?.name || "").toUpperCase()} (${confidence}%)`}
                        {scanState === "UNMATCHED" &&
                          (enrolledCount === 0
                            ? "BELUM ADA WAJAH TERDAFTAR DI SISTEM"
                            : `MEMINDAI... (Kecocokan Tertinggi: ${confidence}%)`)}
                        {scanState === "IDLE" && "SIAP MEMINDAI WAJAH..."}
                      </span>
                    </div>
                    <span className="text-slate-400 text-[10px] flex-shrink-0 ml-2">FPS: 30 • AI</span>
                  </div>

                  {/* Central Face Target Frame */}
                  <div
                    className={`relative w-56 h-64 md:w-64 md:h-72 rounded-[48px] border-2 transition-all duration-300 flex items-center justify-center ${
                      scanState === "VERIFIED"
                        ? "border-emerald-400 bg-emerald-500/10 shadow-[0_0_50px_rgba(52,211,153,0.35)]"
                        : scanState === "ANALYZING"
                        ? "border-cyan-400 bg-cyan-500/5 shadow-[0_0_40px_rgba(34,211,238,0.25)]"
                        : scanState === "UNMATCHED"
                        ? "border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                        : "border-slate-500/50"
                    }`}
                  >
                    {/* 4 Glowing Corner Brackets */}
                    <div
                      className={`absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 rounded-tl-2xl ${
                        scanState === "VERIFIED" ? "border-emerald-400" : scanState === "ANALYZING" ? "border-cyan-400" : "border-slate-400"
                      }`}
                    />
                    <div
                      className={`absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 rounded-tr-2xl ${
                        scanState === "VERIFIED" ? "border-emerald-400" : scanState === "ANALYZING" ? "border-cyan-400" : "border-slate-400"
                      }`}
                    />
                    <div
                      className={`absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 rounded-bl-2xl ${
                        scanState === "VERIFIED" ? "border-emerald-400" : scanState === "ANALYZING" ? "border-cyan-400" : "border-slate-400"
                      }`}
                    />
                    <div
                      className={`absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 rounded-br-2xl ${
                        scanState === "VERIFIED" ? "border-emerald-400" : scanState === "ANALYZING" ? "border-cyan-400" : "border-slate-400"
                      }`}
                    />

                    {/* Sweeping Laser Line Active Across the Face */}
                    {scanState !== "VERIFIED" && (
                      <div className="absolute inset-x-2 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] animate-pulse top-1/2 -translate-y-1/2" />
                    )}

                    {/* Verified Icon & Confirmation Animation */}
                    {scanState === "VERIFIED" && verifiedUser && (
                      <div className="flex flex-col items-center justify-center animate-in zoom-in duration-200">
                        <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/50 mb-2">
                          <Check className="w-10 h-10 stroke-[3]" />
                        </div>
                        <span className="text-white text-xs font-black uppercase tracking-wider bg-emerald-600/80 px-2.5 py-0.5 rounded-full border border-emerald-400/50">
                          FACE ID MATCH
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Target Crosshairs */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                    <div className="w-72 h-px bg-cyan-400" />
                    <div className="h-72 w-px bg-cyan-400 absolute" />
                  </div>
                </div>
              )}
            </div>

            {/* Quick NIM Input Directly Under Camera */}
            <form onSubmit={handleQuickNimSubmit} className="w-full max-w-lg mt-3 flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Ketik NIM untuk override / ganti target manual..."
                  value={quickNimInput}
                  onChange={(e) => handleQuickNimMatch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
              {manualTargetUser && (
                <button
                  type="button"
                  onClick={() => {
                    setManualTargetUser(null);
                    setQuickNimInput("");
                    setScanState("IDLE");
                    toast.info("Kembali ke mode pencocokan wajah otomatis.");
                  }}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl font-bold cursor-pointer transition-colors"
                >
                  Reset Auto
                </button>
              )}
            </form>

            {/* Bottom Target Card (Who is being verified) */}
            <div className="w-full max-w-lg mt-3 bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-full bg-slate-800 border-2 border-cyan-500/40 overflow-hidden flex items-center justify-center flex-shrink-0">
                  {currentDisplayUser ? (
                    <img
                      src={
                        enrolledFaces[currentDisplayUser.user_id] ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentDisplayUser.name}`
                      }
                      alt={currentDisplayUser.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-6 h-6 text-slate-500" />
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-[11px] text-slate-400 font-semibold truncate">
                    {verifiedUser
                      ? "Presensi Berhasil (Hadir):"
                      : detectedUser
                      ? `Wajah Cocok (${confidence}%):`
                      : manualTargetUser
                      ? "Target Terpilih:"
                      : "Pencocokan Wajah Otomatis:"}
                  </p>
                  <h4 className="text-white font-extrabold text-sm truncate max-w-[240px]">
                    {currentDisplayUser
                      ? currentDisplayUser.name
                      : enrolledCount === 0
                      ? "Belum ada wajah terdaftar"
                      : "Arahkan wajah ke kamera..."}
                  </h4>
                  <p className="text-[11px] text-cyan-400 font-mono truncate">
                    {currentDisplayUser
                      ? `${currentDisplayUser.division} • ${currentDisplayUser.nim}`
                      : enrolledCount === 0
                      ? "Daftarkan wajah panitia terlebih dahulu"
                      : "Sistem mencocokkan otomatis"}
                  </p>
                </div>
              </div>

              {scanState === "VERIFIED" ? (
                <div className="flex items-center gap-1 text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-xs font-bold">
                  <Check className="w-4 h-4" />
                  <span>Hadir</span>
                </div>
              ) : enrolledCount === 0 && onOpenEnrollment ? (
                <button
                  type="button"
                  onClick={() => onOpenEnrollment(null)}
                  className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Daftar Wajah</span>
                </button>
              ) : manualTargetUser && !enrolledFaces[manualTargetUser.user_id] && onOpenEnrollment ? (
                <button
                  type="button"
                  onClick={() => onOpenEnrollment(manualTargetUser)}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Daftar Wajah</span>
                </button>
              ) : scanState === "UNMATCHED" && enrolledCount > 0 ? (
                <div className="text-[10px] text-amber-400 bg-amber-950/60 border border-amber-500/30 px-2 py-1 rounded-xl text-right">
                  <span>Wajah belum cocok</span>
                  <span className="block font-mono text-slate-400">Min. 68%</span>
                </div>
              ) : null}
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
                  <Users className="w-4 h-4 text-cyan-400" />
                  Master Wajah ({enrolledCount}/{panitiaList.length})
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">
                  {enrolledCount} Terdaftar
                </span>
              </div>
              <input
                type="text"
                placeholder="Cari nama / NIM / divisi..."
                value={searchTarget}
                onChange={(e) => setSearchTarget(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[360px] lg:max-h-[460px]">
              {filteredPanitiaSearch.map((p) => {
                const isSelected = (manualTargetUser || detectedUser || verifiedUser)?.user_id === p.user_id;
                const isEnrolled = !!enrolledFaces[p.user_id];

                return (
                  <div
                    key={p.user_id}
                    onClick={() => {
                      setManualTargetUser(p);
                      setQuickNimInput(String(p.nim));
                      setScanState("IDLE");
                      setConfidence(0);
                      setMobileTab("scanner"); // Otomatis kembali ke scanner kamera di HP
                      toast.info(`Target Face ID: ${p.name}`);
                    }}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? "bg-cyan-950/70 border-cyan-500 text-white shadow-lg shadow-cyan-950/50 ring-1 ring-cyan-400/40"
                        : "bg-slate-800/60 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex-shrink-0 overflow-hidden border border-slate-600">
                        {enrolledFaces[p.user_id] ? (
                          <img
                            src={enrolledFaces[p.user_id]}
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
                        <p className="text-xs font-bold truncate leading-tight">{p.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono truncate">
                          {p.division} • {p.nim}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isEnrolled ? (
                        <span
                          className="text-[9px] font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 px-1.5 py-0.5 rounded flex items-center gap-1"
                          title="Wajah sudah terdaftar di sistem Face ID"
                        >
                          <CheckCheck className="w-3 h-3 text-emerald-400" />
                          <span>Terdaftar</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenEnrollment) onOpenEnrollment(p);
                          }}
                          className="text-[9px] text-purple-300 bg-purple-950/70 border border-purple-500/30 hover:bg-purple-900/80 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                          title="Daftarkan foto wajah panitia ini"
                        >
                          + Daftar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
              <p className="font-semibold text-slate-300">💡 Cara Kerja Biometrik:</p>
              <p>1. Kamera membandingkan kontur wajah live dengan foto yang ada di <strong>Master Wajah</strong>.</p>
              <p>2. Jika cocok (kemiripan ≥ 68%), nama pemilik wajah langsung terverifikasi <strong>HADIR</strong>.</p>
              <p>3. Jika wajah belum terdaftar, daftarkan terlebih dahulu via menu <strong>Daftar Wajah Panitia</strong>.</p>

              {onOpenEnrollment && (
                <button
                  type="button"
                  onClick={() => onOpenEnrollment(manualTargetUser || null)}
                  className="w-full mt-2 py-2 px-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-900/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Buka Pendaftaran Wajah Panitia</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
