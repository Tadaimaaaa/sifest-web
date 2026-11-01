"use client";

import { useEffect, useRef, useState } from "react";
import {
  X,
  Download,
  Printer,
  Copy,
  Check,
  QrCode,
  Sparkles,
  ChevronRight,
  Search,
  Scan,
  ShieldCheck,
  UserCheck
} from "lucide-react";
import { PanitiaUser } from "@/app/(dashboard)/absensi-panitia/page";
import { QRCodeCanvas } from "qrcode.react";
import JsBarcode from "jsbarcode";
import { toPng } from "html-to-image";
import { toast } from "sonner";

interface PanitiaBarcodeCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  panitiaList: PanitiaUser[];
  initialUser?: PanitiaUser | null;
  onOpenScanner?: () => void;
}

export default function PanitiaBarcodeCardModal({
  isOpen,
  onClose,
  panitiaList,
  initialUser,
  onOpenScanner
}: PanitiaBarcodeCardModalProps) {
  const [selectedUser, setSelectedUser] = useState<PanitiaUser | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const barcodeSvgRef = useRef<SVGSVGElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  // Sync selected user when modal opens or initialUser changes
  useEffect(() => {
    if (initialUser) {
      setSelectedUser(initialUser);
    } else if (panitiaList.length > 0 && !selectedUser) {
      setSelectedUser(panitiaList[0]);
    }
  }, [initialUser, panitiaList, isOpen]);

  // Generate 1D Barcode whenever selectedUser changes
  useEffect(() => {
    if (!isOpen || !selectedUser) return;

    const timer = setTimeout(() => {
      if (barcodeSvgRef.current) {
        try {
          const barcodeValue = String(selectedUser.nim || selectedUser.user_id).trim();
          JsBarcode(barcodeSvgRef.current, barcodeValue, {
            format: "CODE128",
            width: 2,
            height: 52,
            displayValue: true,
            text: `NIM: ${barcodeValue}`,
            font: "monospace",
            fontSize: 13,
            textMargin: 4,
            background: "#ffffff",
            lineColor: "#0f172a",
            margin: 8
          });
        } catch (e) {
          console.warn("JsBarcode render error:", e);
        }
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [isOpen, selectedUser]);

  if (!isOpen) return null;

  const currentUser = selectedUser || panitiaList[0];
  const userCode = String(currentUser?.nim || currentUser?.user_id || "");

  // Filtered panitia for selector
  const filteredPanitia = panitiaList.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      String(p.nim).toLowerCase().includes(q) ||
      (p.division && p.division.toLowerCase().includes(q))
    );
  });

  const handleCopyCode = () => {
    if (!userCode) return;
    navigator.clipboard.writeText(userCode);
    setIsCopied(true);
    toast.success(`NIM / Kode ${userCode} berhasil disalin!`);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownloadCard = async () => {
    if (!cardRef.current || !currentUser) return;
    setIsDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        quality: 1,
        pixelRatio: 2.5
      });
      const link = document.createElement("a");
      link.download = `ID-CARD-PANITIA-${currentUser.name.replace(/\s+/g, "_")}-${currentUser.nim}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Kartu ID Barcode berhasil diunduh!");
    } catch (err) {
      console.error("Gagal mengunduh kartu:", err);
      toast.error("Gagal mengunduh kartu ID. Coba ambil tangkapan layar (screenshot).");
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrintCard = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base sm:text-lg flex items-center gap-2">
                ID Card & Barcode Panitia
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  Resmi SI FEST
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Pindai QR / Barcode ini di kamera scanner atau scanner barcode gun untuk presensi instan.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50/40">
          {/* Left Column: Card Selector & Tools (lg:col-span-5) */}
          <div className="lg:col-span-5 space-y-4 flex flex-col">
            {/* Search Panitia */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 block">
                Pilih Panitia
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama, NIM, atau divisi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </div>

            {/* List of Panitia */}
            <div className="flex-1 min-h-[180px] max-h-[260px] lg:max-h-[340px] overflow-y-auto space-y-1.5 pr-1 border border-slate-200 bg-white rounded-2xl p-2 shadow-inner">
              {filteredPanitia.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  Tidak ada panitia yang cocok dengan pencarian.
                </div>
              ) : (
                filteredPanitia.map((p) => {
                  const isSelected = selectedUser?.user_id === p.user_id;
                  return (
                    <button
                      key={p.user_id}
                      onClick={() => setSelectedUser(p)}
                      className={`w-full text-left p-2.5 rounded-xl transition flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? "bg-blue-600 text-white shadow-sm"
                          : "hover:bg-slate-100 text-slate-700"
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-semibold text-xs sm:text-sm truncate">{p.name}</div>
                        <div
                          className={`text-[11px] truncate ${
                            isSelected ? "text-blue-100" : "text-slate-400"
                          }`}
                        >
                          NIM: {p.nim} • {p.division || "Panitia"}
                        </div>
                      </div>
                      {isSelected ? (
                        <Check className="w-4 h-4 shrink-0 text-white" />
                      ) : (
                        <ChevronRight className="w-4 h-4 shrink-0 text-slate-300" />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Action Buttons for this card */}
            <div className="space-y-2 pt-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleDownloadCard}
                  disabled={isDownloading || !currentUser}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{isDownloading ? "Mengunduh..." : "Unduh Gambar"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition active:scale-95 cursor-pointer"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-500" />
                      <span>Salin NIM</span>
                    </>
                  )}
                </button>
              </div>

              {onOpenScanner && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenScanner();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-semibold shadow-sm transition active:scale-95 cursor-pointer"
                >
                  <Scan className="w-4 h-4" />
                  <span>Buka Kamera Scanner Presensi</span>
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Card Preview (lg:col-span-7) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center">
            {currentUser ? (
              <div
                ref={cardRef}
                className="w-full max-w-[340px] sm:max-w-[360px] bg-white rounded-3xl p-5 border-2 border-slate-900 shadow-xl relative overflow-hidden flex flex-col items-center text-center transition-all duration-300"
                style={{
                  background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)"
                }}
              >
                {/* Lanyard Top Punch Hole Decoration */}
                <div className="w-14 h-3 bg-slate-800 rounded-full mb-3 flex items-center justify-center">
                  <div className="w-10 h-1.5 bg-slate-950 rounded-full" />
                </div>

                {/* Event Header Banner */}
                <div className="w-full bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white py-2 px-3 rounded-2xl shadow-sm mb-3">
                  <div className="text-[10px] uppercase tracking-widest font-bold text-blue-200">
                    Official Committee Pass
                  </div>
                  <div className="text-sm font-extrabold tracking-wide">
                    SI FEST 2026
                  </div>
                  <div className="text-[9px] text-blue-100 font-medium">
                    Himpunan Mahasiswa Sistem Informasi
                  </div>
                </div>

                {/* Panitia Info */}
                <div className="w-full mb-3">
                  <h4 className="text-base font-extrabold text-slate-900 tracking-tight leading-tight line-clamp-1">
                    {currentUser.name}
                  </h4>
                  <p className="text-xs font-mono font-bold text-blue-700 tracking-wide mt-0.5">
                    NIM: {currentUser.nim}
                  </p>
                  <div className="inline-flex items-center gap-1.5 mt-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>{currentUser.division || "Kepanitiaan"} • {currentUser.position || "Anggota"}</span>
                  </div>
                </div>

                {/* 2D QR Code Container */}
                <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center">
                  <QRCodeCanvas
                    value={String(currentUser.nim || currentUser.user_id)}
                    size={140}
                    level="H"
                    includeMargin={false}
                    className="rounded-lg"
                  />
                  <span className="text-[9px] font-mono text-slate-400 font-semibold mt-1">
                    QR-CODE PRESENSI
                  </span>
                </div>

                {/* 1D Barcode Container (Code 128) */}
                <div className="w-full mt-3 bg-white p-2 rounded-xl border border-slate-200 flex flex-col items-center shadow-xs">
                  <svg ref={barcodeSvgRef} className="w-full max-h-[70px] overflow-hidden" />
                  <span className="text-[9px] font-mono text-slate-400 font-medium -mt-1">
                    CODE 128 (SCANNER BARCODE GUN READY)
                  </span>
                </div>

                {/* Footer verification note */}
                <div className="w-full mt-3 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                  <span className="flex items-center gap-1">
                    <UserCheck className="w-3 h-3 text-emerald-600" />
                    Terdaftar di Database
                  </span>
                  <span className="font-mono text-slate-500">ID: {currentUser.user_id}</span>
                </div>
              </div>
            ) : (
              <div className="text-center p-8 text-slate-400">
                Pilih panitia terlebih dahulu untuk melihat kartu.
              </div>
            )}

            <p className="text-[11px] text-slate-500 text-center mt-3 max-w-xs">
              💡 <strong>Tips:</strong> Panitia cukup menyimpan foto kartu ini di ponsel dan mengarahkannya ke kamera absensi saat hadir.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-white">
          <div className="text-xs text-slate-500">
            Total Panitia: <strong>{panitiaList.length} orang</strong>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

