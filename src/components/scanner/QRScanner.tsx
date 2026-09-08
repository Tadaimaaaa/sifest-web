"use client";

import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (error: any) => void;
}

export default function QRScanner({ onScanSuccess, onScanFailure }: QRScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    // Initialize scanner
    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
      showTorchButtonIfSupported: true,
    };

    // Use a unique ID for the scanner container
    const scannerId = "qr-reader";
    
    // Check if element exists to avoid React strict mode issues
    if (document.getElementById(scannerId)) {
      if (!scannerRef.current) {
        scannerRef.current = new Html5QrcodeScanner(scannerId, config, false);
        scannerRef.current.render(
          (decodedText) => {
            // Pause scanning after success to prevent multiple triggers
            if (scannerRef.current) {
              scannerRef.current.pause(true);
            }
            onScanSuccess(decodedText);
          },
          (error) => {
            if (onScanFailure) {
              onScanFailure(error);
            }
          }
        );
      }
    }

    // Cleanup on unmount
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(error => {
          console.error("Failed to clear html5QrcodeScanner. ", error);
        });
        scannerRef.current = null;
      }
    };
  }, [isClient, onScanSuccess, onScanFailure]);

  if (!isClient) return null;

  return (
    <div className="w-full max-w-md mx-auto overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-xl">
      <div id="qr-reader" className="w-full" />
      <style dangerouslySetInnerHTML={{
        __html: `
        #qr-reader {
          border: none !important;
        }
        #qr-reader__scan_region {
          min-height: 300px;
          background: #f8fafc;
        }
        #qr-reader__dashboard_section_csr span {
          color: #0f172a !important;
          font-family: inherit !important;
        }
        #qr-reader__dashboard_section_swaplink {
          text-decoration: none !important;
          color: #2563eb !important;
          font-weight: 500;
        }
        #qr-reader button {
          background-color: #2563eb;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        #qr-reader button:hover {
          background-color: #1d4ed8;
        }
        #qr-reader__camera_selection {
          padding: 8px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          margin-bottom: 12px;
          width: 100%;
          max-width: 300px;
        }
        `
      }} />
    </div>
  );
}
