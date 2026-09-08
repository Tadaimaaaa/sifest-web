"use client";

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, AlertCircle } from 'lucide-react';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (error: any) => void;
}

export default function QRScanner({ onScanSuccess, onScanFailure }: QRScannerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    
    const startScanner = async () => {
      try {
        // Request camera permissions first to check if available
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length) {
          if (mounted) setHasPermission(true);
          
          if (!scannerRef.current) {
            scannerRef.current = new Html5Qrcode("qr-reader");
            
            await scannerRef.current.start(
              { facingMode: "environment" }, // Prefer back camera
              {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
              },
              (decodedText) => {
                if (!isScanningRef.current) {
                  isScanningRef.current = true;
                  // Stop scanning immediately after success to avoid multiple triggers
                  if (scannerRef.current && scannerRef.current.isScanning) {
                    scannerRef.current.pause(true);
                  }
                  onScanSuccess(decodedText);
                }
              },
              (err) => {
                if (onScanFailure) onScanFailure(err);
              }
            );
          }
        } else {
          if (mounted) {
            setHasPermission(false);
            setError("Tidak ada kamera yang terdeteksi di perangkat Anda.");
          }
        }
      } catch (err: any) {
        if (mounted) {
          setHasPermission(false);
          setError("Akses kamera ditolak atau tidak didukung oleh browser. Pastikan Anda memberikan izin akses kamera.");
        }
      }
    };

    startScanner();

    return () => {
      mounted = false;
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(e => console.error("Error stopping scanner", e));
      }
      if (scannerRef.current) {
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    };
  }, [onScanSuccess, onScanFailure]);

  if (hasPermission === false) {
    return (
      <div className="w-full max-w-sm mx-auto p-8 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-300 flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-500">
          <AlertCircle size={32} />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">Kamera Tidak Tersedia</h3>
        <p className="text-sm text-slate-500">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-6 px-4 py-2 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800"
        >
          Muat Ulang
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-sm mx-auto overflow-hidden rounded-3xl bg-black shadow-2xl shadow-blue-900/20 ring-4 ring-slate-100">
      
      {/* Video Container */}
      <div id="qr-reader" className="w-full" style={{ minHeight: '350px' }} />

      {/* QRIS-like Overlay */}
      <div className="absolute inset-0 pointer-events-none flex flex-col">
        {/* Top Dark Overlay */}
        <div className="flex-1 bg-black/50 flex flex-col items-center justify-center p-4">
          <div className="bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full flex items-center gap-2 mb-2">
            <Camera size={14} className="text-white" />
            <span className="text-xs font-medium text-white tracking-wide uppercase">Scanner Aktif</span>
          </div>
          <p className="text-white/80 text-xs font-medium text-center px-6">
            Posisikan QR Code tiket di dalam area kotak
          </p>
        </div>

        {/* Center Scanner Window */}
        <div className="flex">
          <div className="flex-1 bg-black/50" />
          <div className="w-[250px] h-[250px] relative">
            {/* Animated Scanning Line */}
            <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 shadow-[0_0_15px_#3b82f6] animate-scan-line" />
            
            {/* Corner Markers */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-xl" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-xl" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-xl" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-xl" />
          </div>
          <div className="flex-1 bg-black/50" />
        </div>

        {/* Bottom Dark Overlay */}
        <div className="flex-1 bg-black/50 flex items-center justify-center pb-6">
          <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
             <span className="text-xs text-blue-200 font-medium tracking-widest uppercase">Mendeteksi...</span>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        /* Hide html5-qrcode default UI elements */
        #qr-reader video {
          object-fit: cover !important;
          width: 100% !important;
          height: 100% !important;
        }
        #qr-reader img {
          display: none !important;
        }
        /* Create animation for scanning line */
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-scan-line {
          animation: scan 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        `
      }} />
    </div>
  );
}
