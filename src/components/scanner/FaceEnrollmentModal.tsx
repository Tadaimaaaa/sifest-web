"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Camera,
  X,
  Check,
  AlertCircle,
  RefreshCw,
  User,
  ShieldCheck,
  Search,
  CheckCheck,
  Sparkles,
  Users,
  Trash2,
  Upload
} from "lucide-react";
import { PanitiaUser } from "@/app/(dashboard)/absensi-panitia/page";
import { toast } from "sonner";

interface FaceEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  panitiaList: PanitiaUser[];
  initialSelectedUser?: PanitiaUser | null;
  onEnrollSuccess?: (user: PanitiaUser, photoBase64: string) => void;
}

export default function FaceEnrollmentModal({
  isOpen,
  onClose,
  panitiaList,
  initialSelectedUser,
  onEnrollSuccess
}: FaceEnrollmentModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [selectedUser, setSelectedUser] = useState<PanitiaUser | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "ENROLLED" | "NOT_ENROLLED">("ALL");

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);

  // Store enrolled faces { [userId]: base64Snapshot }
  const [enrolledFaces, setEnrolledFaces] = useState<Record<string, string>>({});

  // Load enrolled faces on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("sifest_enrolled_face_profiles");
        if (cached) {
          setEnrolledFaces(JSON.parse(cached));
        }
      } catch (e) {}
    }
  }, [isOpen]);

  // Sync initial user
  useEffect(() => {
    if (initialSelectedUser) {
      setSelectedUser(initialSelectedUser);
      setCapturedPreview(null);
    } else if (panitiaList.length > 0 && !selectedUser) {
      setSelectedUser(panitiaList[0]);
    }
  }, [initialSelectedUser, panitiaList, isOpen]);

  // Start Camera
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setIsCameraReady(false);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
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
      setCameraError(
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "Akses kamera ditolak. Berikan izin akses kamera di browser Anda."
          : "Kamera tidak terdeteksi atau sedang digunakan aplikasi lain."
      );
    }
  }, []);

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
      setCapturedPreview(null);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  // Take Snapshot
  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = 480;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw square cropped & mirrored
    const minDim = Math.min(video.videoWidth || 640, video.videoHeight || 480);
    const startX = ((video.videoWidth || 640) - minDim) / 2;
    const startY = ((video.videoHeight || 480) - minDim) / 2;

    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, startX, startY, minDim, minDim, 0, 0, canvas.width, canvas.height);

    const base64 = canvas.toDataURL("image/jpeg", 0.85);
    setCapturedPreview(base64);
  };

  // Save Enrollment
  const handleSaveEnrollment = () => {
    if (!selectedUser || !capturedPreview) return;

    const next = { ...enrolledFaces, [selectedUser.user_id]: capturedPreview };
    setEnrolledFaces(next);
    try {
      localStorage.setItem("sifest_enrolled_face_profiles", JSON.stringify(next));
    } catch (e) {}

    toast.success(`Wajah ${selectedUser.name} berhasil didaftarkan ke sistem Face ID!`);
    if (onEnrollSuccess) {
      onEnrollSuccess(selectedUser, capturedPreview);
    }
    setCapturedPreview(null);
  };

  // Delete Enrollment
  const handleDeleteEnrollment = (user: PanitiaUser) => {
    const next = { ...enrolledFaces };
    delete next[user.user_id];
    setEnrolledFaces(next);
    try {
      localStorage.setItem("sifest_enrolled_face_profiles", JSON.stringify(next));
    } catch (e) {}
    toast.info(`Data wajah ${user.name} telah dihapus.`);
  };

  if (!isOpen) return null;

  const filteredList = panitiaList.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      String(p.nim).includes(q) ||
      p.division.toLowerCase().includes(q);

    const isEnrolled = !!enrolledFaces[p.user_id];
    if (filterStatus === "ENROLLED") return matchSearch && isEnrolled;
    if (filterStatus === "NOT_ENROLLED") return matchSearch && !isEnrolled;
    return matchSearch;
  });

  const enrolledCount = panitiaList.filter((p) => !!enrolledFaces[p.user_id]).length;

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 md:p-6 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="p-4 md:px-6 md:py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-white font-extrabold text-base md:text-lg tracking-tight">
                  Pendaftaran Wajah Panitia
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase tracking-widest">
                  Face Enrollment
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Daftarkan foto selfie master panitia agar Face ID mengenali otomatis saat presensi.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Split View (Panitia List + Camera Enrollment Viewport) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-y-auto">
          {/* Left Panel: Panitia Directory (Col 5) */}
          <div className="lg:col-span-5 p-4 border-b lg:border-b-0 lg:border-r border-slate-800 bg-slate-900/60 flex flex-col">
            <div className="space-y-2 mb-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-purple-400" />
                  Pilih Panitia ({panitiaList.length})
                </span>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  {enrolledCount}/{panitiaList.length} Terdaftar
                </span>
              </div>

              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cari nama / NIM panitia..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setFilterStatus("ALL")}
                  className={`flex-1 py-1 rounded-lg transition-colors cursor-pointer text-center ${
                    filterStatus === "ALL" ? "bg-purple-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Semua
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus("ENROLLED")}
                  className={`flex-1 py-1 rounded-lg transition-colors cursor-pointer text-center ${
                    filterStatus === "ENROLLED" ? "bg-purple-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Terdaftar ({enrolledCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus("NOT_ENROLLED")}
                  className={`flex-1 py-1 rounded-lg transition-colors cursor-pointer text-center ${
                    filterStatus === "NOT_ENROLLED" ? "bg-purple-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Belum ({panitiaList.length - enrolledCount})
                </button>
              </div>
            </div>

            {/* Scrollable Panitia List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[380px] lg:max-h-[460px]">
              {filteredList.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Tidak ada panitia yang sesuai pencarian.
                </div>
              ) : (
                filteredList.map((p) => {
                  const isSelected = selectedUser?.user_id === p.user_id;
                  const isEnrolled = !!enrolledFaces[p.user_id];
                  const existingPhoto = enrolledFaces[p.user_id];

                  return (
                    <div
                      key={p.user_id}
                      onClick={() => {
                        setSelectedUser(p);
                        setCapturedPreview(null);
                      }}
                      className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? "bg-purple-950/60 border-purple-500 text-white shadow-lg shadow-purple-950/50 ring-1 ring-purple-400/40"
                          : "bg-slate-800/50 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-slate-700 flex-shrink-0 overflow-hidden border border-slate-600">
                          {existingPhoto ? (
                            <img src={existingPhoto} alt={p.name} className="w-full h-full object-cover" />
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

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {isEnrolled ? (
                          <span className="text-[9px] font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCheck className="w-3 h-3 text-emerald-400" />
                            <span>Terdaftar</span>
                          </span>
                        ) : (
                          <span className="text-[9px] font-semibold text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
                            Belum
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Panel: Camera & Photo Capture Viewport (Col 7) */}
          <div className="lg:col-span-7 p-4 md:p-6 flex flex-col items-center justify-center bg-black/40">
            <canvas ref={canvasRef} className="hidden" />

            {selectedUser ? (
              <div className="w-full max-w-md flex flex-col items-center space-y-4">
                {/* Selected User Header Card */}
                <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800 border border-purple-500/40 overflow-hidden flex items-center justify-center">
                      {enrolledFaces[selectedUser.user_id] ? (
                        <img
                          src={enrolledFaces[selectedUser.user_id]}
                          alt={selectedUser.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-white font-extrabold text-sm truncate max-w-[200px]">
                        {selectedUser.name}
                      </h4>
                      <p className="text-[11px] text-purple-300 font-mono">
                        {selectedUser.division} • {selectedUser.nim}
                      </p>
                    </div>
                  </div>

                  {enrolledFaces[selectedUser.user_id] && (
                    <button
                      type="button"
                      onClick={() => handleDeleteEnrollment(selectedUser)}
                      className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 rounded-xl transition-colors"
                      title="Hapus foto wajah ini"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Viewfinder Viewport */}
                <div className="relative w-full aspect-square max-w-sm rounded-3xl overflow-hidden bg-slate-950 border-2 border-slate-800 shadow-2xl flex items-center justify-center group">
                  {capturedPreview ? (
                    /* Captured Photo Preview */
                    <div className="relative w-full h-full">
                      <img
                        src={capturedPreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-3 right-3 px-2.5 py-1 bg-black/70 backdrop-blur-md rounded-full text-emerald-400 text-xs font-bold border border-emerald-500/30 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Foto Siap Disimpan</span>
                      </div>
                    </div>
                  ) : (
                    /* Live Webcam Video */
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover transform -scale-x-100"
                      />

                      {/* Oval Portrait Guide */}
                      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                        <div className="w-52 h-64 rounded-[50%] border-2 border-dashed border-purple-400/80 shadow-[0_0_30px_rgba(168,85,247,0.25)] flex items-center justify-center">
                          <div className="text-center px-3 py-1 bg-black/60 rounded-full text-[10px] text-purple-200 font-semibold backdrop-blur-sm">
                            Posisikan wajah di dalam oval
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {cameraError && (
                    <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center text-white">
                      <AlertCircle className="w-10 h-10 text-rose-500 mb-2" />
                      <p className="font-bold text-xs text-rose-400 mb-2">{cameraError}</p>
                      <button
                        type="button"
                        onClick={startCamera}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs font-bold"
                      >
                        Coba Lagi
                      </button>
                    </div>
                  )}
                </div>

                {/* Action Buttons for Capture */}
                <div className="flex items-center gap-3 w-full max-w-sm">
                  {capturedPreview ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setCapturedPreview(null)}
                        className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>Foto Ulang</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSaveEnrollment}
                        className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>Simpan Wajah</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={!isCameraReady}
                      onClick={handleCapture}
                      className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-2xl text-xs md:text-sm font-extrabold shadow-lg shadow-purple-600/30 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Ambil Foto Wajah (Selfie)</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-500 text-xs">
                Pilih panitia di sebelah kiri untuk mulai mendaftarkan wajah.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
