"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, AlertCircle, RefreshCw, SwitchCamera } from "lucide-react";

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (error: any) => void;
}

export default function QRScanner({ onScanSuccess, onScanFailure }: QRScannerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const [availableCameras, setAvailableCameras] = useState<any[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const onScanSuccessRef = useRef(onScanSuccess);
  const onScanFailureRef = useRef(onScanFailure);
  const lastScanTimeRef = useRef(0);
  const lastScanTextRef = useRef("");

  useEffect(() => {
    onScanSuccessRef.current = onScanSuccess;
    onScanFailureRef.current = onScanFailure;
  }, [onScanSuccess, onScanFailure]);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (e) {
        console.warn("Error stopping scanner:", e);
      }
      scannerRef.current = null;
    }
  }, []);

  const startScannerWithConfig = useCallback(async (cameraChoice: any) => {
    setIsStarting(true);
    setError(null);

    await stopScanner();

    try {
      const scannerElement = document.getElementById("qr-reader");
      if (!scannerElement) return;

      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;

      const scanConfig = {
        fps: 20,
        // Scan full video frame for maximum speed and easy targeting
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const edge = Math.max(200, Math.floor(minEdge * 0.8));
          return { width: edge, height: edge };
        },
        aspectRatio: 1.0,
      };

      const handleSuccess = (decodedText: string) => {
        const now = Date.now();
        // Debounce same QR code for 1.2s to prevent multiple triggers
        if (now - lastScanTimeRef.current < 1200 && lastScanTextRef.current === decodedText) {
          return;
        }
        lastScanTimeRef.current = now;
        lastScanTextRef.current = decodedText;
        onScanSuccessRef.current?.(decodedText);
      };

      const handleError = (err: any) => {
        onScanFailureRef.current?.(err);
      };

      // Try camera choice
      try {
        await html5QrCode.start(cameraChoice, scanConfig, handleSuccess, handleError);
        setHasPermission(true);
      } catch (err1) {
        console.warn("Camera start with primary config failed, trying fallback...", err1);
        // Fallback: If back camera failed (e.g. on laptop), try front camera
        await html5QrCode.start({ facingMode: "user" }, scanConfig, handleSuccess, handleError);
        setHasPermission(true);
      }
    } catch (err: any) {
      console.error("Camera start failed completely:", err);
      setHasPermission(false);
      setError(err?.message || "Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan.");
    } finally {
      setIsStarting(false);
    }
  }, [stopScanner]);

  useEffect(() => {
    let mounted = true;

    // Detect available cameras
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (mounted && devices && devices.length > 0) {
          setAvailableCameras(devices);
          // Prefer back/rear camera on phones
          const backIdx = devices.findIndex(
            (d) =>
              d.label.toLowerCase().includes("back") ||
              d.label.toLowerCase().includes("rear") ||
              d.label.toLowerCase().includes("environment") ||
              d.label.toLowerCase().includes("belakang")
          );
          const initialIdx = backIdx !== -1 ? backIdx : 0;
          setCurrentCameraIndex(initialIdx);
          startScannerWithConfig(devices[initialIdx].id);
        } else if (mounted) {
          // If getCameras returned empty list (e.g. before permission), start directly with facingMode
          startScannerWithConfig({ facingMode: "environment" });
        }
      })
      .catch(() => {
        if (mounted) {
          // Start with facingMode directly
          startScannerWithConfig({ facingMode: "environment" });
        }
      });

    return () => {
      mounted = false;
      stopScanner();
    };
  }, [startScannerWithConfig, stopScanner]);

  // Switch between available cameras
  const handleSwitchCamera = () => {
    if (availableCameras.length <= 1) return;
    const nextIdx = (currentCameraIndex + 1) % availableCameras.length;
    setCurrentCameraIndex(nextIdx);
    startScannerWithConfig(availableCameras[nextIdx].id);
  };

  if (hasPermission === false) {
    return (
      <div className="w-full max-w-sm mx-auto p-6 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col items-center text-center text-white">
        <div className="w-14 h-14 bg-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mb-3">
          <AlertCircle size={28} />
        </div>
        <h3 className="text-base font-bold mb-1">Kamera Belum Terhubung</h3>
        <p className="text-xs text-slate-400 mb-4">{error || "Izinkan akses kamera di browser Anda."}</p>
        <button
          onClick={() => startScannerWithConfig({ facingMode: "environment" })}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Coba Akses Kamera Lagi</span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-sm mx-auto overflow-hidden rounded-3xl bg-black shadow-2xl ring-2 ring-slate-800">
      
      {/* Video Container */}
      <div id="qr-reader" className="w-full" style={{ minHeight: "320px" }} />

      {/* Switch Camera Button if multiple exist */}
      {availableCameras.length > 1 && (
        <button
          onClick={handleSwitchCamera}
          className="absolute top-3 right-3 z-20 px-3 py-1.5 bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md transition-all"
        >
          <SwitchCamera className="w-3.5 h-3.5 text-indigo-400" />
          <span>Ganti Kamera</span>
        </button>
      )}

      {/* QRIS-like Overlay */}
      <div className="absolute inset-0 pointer-events-none flex flex-col">
        {/* Top Dark Overlay */}
        <div className="flex-1 bg-black/40 flex flex-col items-center justify-center p-3">
          <div className="bg-black/50 backdrop-blur-md px-3.5 py-1 rounded-full flex items-center gap-2 mb-1 border border-white/10">
            <Camera size={13} className="text-emerald-400" />
            <span className="text-[11px] font-bold text-white tracking-wide uppercase">
              {isStarting ? "Menghubungkan Kamera..." : "Kamera Aktif"}
            </span>
          </div>
          <p className="text-white/80 text-[11px] font-medium text-center">
            Arahkan QR Code tiket ke depan kamera
          </p>
        </div>

        {/* Center Scanner Window */}
        <div className="flex">
          <div className="flex-1 bg-black/40" />
          <div className="w-[240px] h-[240px] relative">
            {/* Animated Scanning Line */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400 shadow-[0_0_15px_#3b82f6] animate-scan-line" />
            
            {/* Corner Markers */}
            <div className="absolute top-0 left-0 w-7 h-7 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
            <div className="absolute top-0 right-0 w-7 h-7 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
            <div className="absolute bottom-0 left-0 w-7 h-7 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
            <div className="absolute bottom-0 right-0 w-7 h-7 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />
          </div>
          <div className="flex-1 bg-black/40" />
        </div>

        {/* Bottom Dark Overlay */}
        <div className="flex-1 bg-black/40 flex items-center justify-center pb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[10px] text-emerald-200 font-bold tracking-widest uppercase">
              Mendeteksi QR...
            </span>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        #qr-reader video {
          object-fit: cover !important;
          width: 100% !important;
          height: 100% !important;
        }
        #qr-reader img {
          display: none !important;
        }
        #qr-reader__dashboard {
          display: none !important;
        }
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-scan-line {
          animation: scan 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        `
      }} />
    </div>
  );
}
