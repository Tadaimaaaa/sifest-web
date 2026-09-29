"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ScanLine, AlertCircle, RefreshCw } from 'lucide-react';
import QRScanner from '@/components/scanner/QRScanner';

export default function ScannerPage() {
  const router = useRouter();
  const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleScanSuccess = (decodedText: string) => {
    try {
      // Expecting JSON payload from E-Ticket like {"id":"uuid", "code":"REG-..."}
      const data = JSON.parse(decodedText);
      
      if (data.id) {
        setScanStatus('success');
        // Redirect to detail page
        router.push(`/sifest/registrations/${data.id}`);
      } else {
        throw new Error("Format QR tidak valid (Data ID tidak ditemukan).");
      }
    } catch (e: any) {
      setScanStatus('error');
      setErrorMessage(e.message || "Bukan QR Code SI FEST yang valid.");
    }
  };

  const handleScanFailure = (error: any) => {
    // Ignore frequent scan failures as they just mean "no QR detected yet"
  };

  const resetScanner = () => {
    setScanStatus('idle');
    setErrorMessage('');
    // The safest way to truly reset Html5QrcodeScanner is to reload the route or unmount/remount
    window.location.reload();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ScanLine className="w-6 h-6 text-blue-600" />
          Scanner Tiket Peserta
        </h1>
        <p className="text-slate-600">
          Arahkan kamera ke QR Code pada E-Ticket peserta untuk melihat detail dan melakukan validasi pendaftaran.
        </p>
      </div>

      {scanStatus === 'error' && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-red-800">Pemindaian Gagal</h3>
            <p className="text-sm text-red-600 mt-1">{errorMessage}</p>
            <button 
              onClick={resetScanner}
              className="mt-3 flex items-center gap-1.5 text-xs font-medium text-red-700 hover:text-red-800 px-3 py-1.5 bg-red-100 rounded-lg transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Coba Lagi
            </button>
          </div>
        </div>
      )}

      {scanStatus === 'success' && (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
            <ScanLine className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">QR Code Ditemukan!</h3>
          <p className="text-slate-600 animate-pulse">Mengalihkan ke halaman detail peserta...</p>
        </div>
      )}

      {scanStatus === 'idle' && (
        <div className="pt-4">
          <QRScanner 
            onScanSuccess={handleScanSuccess} 
            onScanFailure={handleScanFailure} 
          />
        </div>
      )}
    </div>
  );
}
