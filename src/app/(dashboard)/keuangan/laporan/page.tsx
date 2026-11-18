"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { SCRIPT_URL } from "@/lib/api";
import Cookies from "js-cookie";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  Printer,
  Download,
  FileText,
  TrendingUp,
  TrendingDown,
  Wallet,
  ChevronLeft,
  Filter,
  ExternalLink,
} from "lucide-react";
import FullPageLoader from "@/components/FullPageLoader";

const formatRupiah = (angka: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(angka || 0);

// Konversi URL Google Drive → proxy internal agar bisa dimuat (bypass CORS)
const getImageSrc = (url: string): string | null => {
  if (!url || url === "-") return null;
  if (url.includes("drive.google.com")) {
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
  }
  return url; // URL langsung (non-Drive)
};

const formatTanggal = (raw: string) => {
  if (!raw) return "-";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export default function LaporanKeuanganPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [monthFilter, setMonthFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("2025/2026");
  const printRef = useRef<HTMLDivElement>(null);

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const token = Cookies.get("session_token") || "";
      const res = await fetch(`${SCRIPT_URL}?action=getKeuangan&token=${token}`);
      if (!res.ok) throw new Error("Gagal mengambil data");
      const data = await res.json();
      if (data.success) {
        setTransactions(data.data || []);
      } else {
        toast.error(data.message || "Gagal memuat data keuangan");
      }
    } catch {
      toast.error("Terjadi kesalahan jaringan.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  // ── Filter & sort ascending (laporan berurutan dari awal) ──────────────────
  const filtered = transactions
    .filter((t) => {
      const d = new Date(t.tanggal);
      if (isNaN(d.getTime())) return false;
      const tYear = d.getFullYear().toString();
      const tMonth = String(d.getMonth() + 1).padStart(2, "0");
      const matchYear =
        yearFilter === "2025/2026"
          ? tYear === "2025" || tYear === "2026"
          : yearFilter
          ? tYear === yearFilter
          : true;
      const matchMonth = monthFilter ? tMonth === monthFilter : true;
      return matchYear && matchMonth;
    })
    .sort((a, b) => Number(a.no) - Number(b.no));

  // ── Harga Satuan ───────────────────────────────────────────────────────────
  const getHargaSatuan = (trx: any) => {
    const vol = parseFloat(trx.vol);
    if (!isNaN(vol) && vol > 0 && trx.vol !== "-") {
      return trx.nominal / vol;
    }
    return trx.nominal;
  };

  // ── Totals ─────────────────────────────────────────────────────────────────
  const totalDebit = filtered
    .filter((t) => t.jenis === "INCOME")
    .reduce((acc, t) => acc + Number(t.nominal), 0);
  const totalKredit = filtered
    .filter((t) => t.jenis === "EXPENSE")
    .reduce((acc, t) => acc + Number(t.nominal), 0);
  const totalSaldo = filtered.length > 0 ? filtered[filtered.length - 1].saldo_akhir : 0;

  // ── Judul Periode ──────────────────────────────────────────────────────────
  const judulPeriode = monthFilter
    ? `${BULAN[parseInt(monthFilter) - 1]} 2025/2026`
    : yearFilter === "2025/2026" || !yearFilter
    ? "2025/2026"
    : `Tahun ${yearFilter}`;

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = "";
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  // ── Tahun tersedia dari data ───────────────────────────────────────────────
  const availableYears = Array.from(
    new Set(
      transactions
        .map((t) => new Date(t.tanggal).getFullYear())
        .filter((y) => !isNaN(y))
    )
  ).sort((a, b) => b - a);

  // ── Export Excel ──────────────────────────────────────────────────────────
  const handleExportExcel = () => {
    try {
      const exportData = filtered.map((trx, idx) => ({
        No: idx + 1,
        Tanggal: formatTanggal(trx.tanggal),
        Kategori: trx.kategori,
        Keterangan: trx.keterangan || "-",
        "Satuan / Vol": trx.vol && trx.vol !== "-" && trx.vol !== "0"
          ? `${trx.vol} ${trx.satuan || ""}`.trim()
          : trx.satuan && trx.satuan !== "-"
          ? trx.satuan
          : "-",
        "Harga Satuan": getHargaSatuan(trx),
        Debit: trx.jenis === "INCOME" ? trx.nominal : 0,
        Kredit: trx.jenis === "EXPENSE" ? trx.nominal : 0,
        Saldo: trx.saldo_akhir || 0,
        Nota: trx.bukti_url && trx.bukti_url !== "-" ? trx.bukti_url : "-",
        "Penanggung Jawab": trx.penanggung_jawab || trx.recorded_by || "-",
        Status: trx.status || "Lunas",
      }));

      // Baris total
      exportData.push({
        No: "" as any,
        Tanggal: "TOTAL SALDO",
        Kategori: "",
        Keterangan: "",
        "Satuan / Vol": "",
        "Harga Satuan": "" as any,
        Debit: totalDebit,
        Kredit: totalKredit,
        Saldo: totalSaldo,
        Nota: "",
        "Penanggung Jawab": "",
        Status: "",
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Laporan Keuangan");

      ws["!cols"] = [
        { wch: 5 }, { wch: 15 }, { wch: 20 }, { wch: 35 },
        { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 18 },
        { wch: 18 }, { wch: 40 }, { wch: 20 }, { wch: 15 },
      ];

      XLSX.writeFile(wb, `Laporan_Keuangan_SIFEST_${judulPeriode.replace(/ /g, "_")}.xlsx`);
      toast.success("Berhasil mengunduh file Excel!");
    } catch (err) {
      toast.error("Gagal mengekspor Excel.");
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Link href="/keuangan" className="hover:text-blue-600 transition-colors flex items-center gap-1">
              <ChevronLeft className="w-3.5 h-3.5" />
              Data Keuangan
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-medium">Laporan Keuangan</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Laporan Keuangan</h1>
          <p className="text-sm text-slate-500 mt-1">Laporan buku kas digital SI FEST 2026.</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={handleExportExcel}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors border border-emerald-200 shadow-sm"
          >
            <Download className="w-4 h-4" />
            Excel
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors border border-slate-200 shadow-sm"
          >
            <Printer className="w-4 h-4" />
            Cetak
          </button>
        </div>
      </div>

      {/* ── Filter ─────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm print:hidden">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <Filter className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5 sm:mt-0" />
          <div className="flex flex-wrap gap-3 flex-1">
            {/* Filter Tahun */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Tahun</label>
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="2025/2026">Periode 2025/2026</option>
                <option value="">Semua Tahun</option>
                {availableYears.map((y) => (
                  <option key={y} value={y.toString()}>{y}</option>
                ))}
              </select>
            </div>

            {/* Filter Bulan */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Bulan</label>
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="">Semua Bulan</option>
                {BULAN.map((b, i) => (
                  <option key={i} value={String(i + 1).padStart(2, "0")}>{b}</option>
                ))}
              </select>
            </div>

            {/* Reset */}
            {(monthFilter || yearFilter !== "2025/2026") && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-transparent select-none">Reset</label>
                <button
                  onClick={() => {
                    setMonthFilter("");
                    setYearFilter("2025/2026");
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-medium transition-colors border border-slate-200"
                >
                  Reset Filter
                </button>
              </div>
            )}
          </div>

          {/* Badge Periode */}
          <div className="sm:ml-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-xs font-semibold">
              <FileText className="w-3.5 h-3.5" />
              Periode: {judulPeriode}
            </span>
          </div>
        </div>
      </div>

      {/* ── Summary Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden">
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-5 rounded-2xl text-white shadow-lg shadow-blue-900/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Wallet className="w-20 h-20" />
          </div>
          <p className="text-blue-100 text-xs font-medium mb-1">Saldo Akhir</p>
          <h3 className="text-2xl font-bold tracking-tight">{formatRupiah(totalSaldo)}</h3>
          <p className="text-blue-200 text-xs mt-2">{judulPeriode}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium mb-0.5">Total Debit (Masuk)</p>
            <h3 className="text-lg font-bold text-emerald-600">{formatRupiah(totalDebit)}</h3>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
            <TrendingDown className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium mb-0.5">Total Kredit (Keluar)</p>
            <h3 className="text-lg font-bold text-rose-600">{formatRupiah(totalKredit)}</h3>
          </div>
        </div>
      </div>

      {/* ── Tabel Laporan ──────────────────────────────────────────────────── */}
      <div
        ref={printRef}
        className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:shadow-none print:border-none print:rounded-none"
      >
        {/* Print Header (hanya tampil saat cetak) */}
        <div className="hidden print:block p-4 pb-2 border-b border-slate-200">
          <div className="text-center mb-2">
            <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wide">
              Laporan Keuangan – SI FEST 2026
            </h2>
            <p className="text-sm font-semibold text-slate-600 mt-0.5">Periode: {judulPeriode}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="h-64 relative">
            <FullPageLoader message="Memuat Laporan Keuangan..." fullScreen={false} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
            <FileText className="w-12 h-12 opacity-30" />
            <p className="text-sm font-medium">Tidak ada transaksi untuk periode ini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700 print:text-[10px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase font-semibold">
                  <th className="px-4 py-3.5 whitespace-nowrap">No</th>
                  <th className="px-4 py-3.5 whitespace-nowrap">Tanggal</th>
                  <th className="px-4 py-3.5">Kategori</th>
                  <th className="px-4 py-3.5">Keterangan</th>
                  <th className="px-4 py-3.5 whitespace-nowrap">Satuan / Vol</th>
                  <th className="px-4 py-3.5 whitespace-nowrap text-right">Harga Satuan</th>
                  <th className="px-4 py-3.5 whitespace-nowrap text-right text-emerald-600">Debit</th>
                  <th className="px-4 py-3.5 whitespace-nowrap text-right text-rose-600">Kredit</th>
                  <th className="px-4 py-3.5 whitespace-nowrap text-right">Saldo</th>
                  {/* Nota: tersembunyi saat layar normal, tampil saat cetak */}
                  <th className="px-4 py-3.5 whitespace-nowrap text-center print:hidden">Nota</th>
                  <th className="hidden print:table-cell px-2 py-3.5 whitespace-nowrap text-center" style={{ width: "80px" }}>Nota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((trx, idx) => {
                  const volText =
                    trx.vol && trx.vol !== "-" && trx.vol !== "0"
                      ? `${trx.vol} ${trx.satuan || ""}`.trim()
                      : trx.satuan && trx.satuan !== "-"
                      ? trx.satuan
                      : "-";

                  const hargaSatuan = getHargaSatuan(trx);

                  return (
                    <tr
                      key={`${trx.trx_id}-${idx}`}
                      className="hover:bg-slate-50/60 transition-colors print:hover:bg-transparent"
                    >
                      {/* No */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-semibold text-slate-600">{idx + 1}</span>
                      </td>

                      {/* Tanggal */}
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                        {formatTanggal(trx.tanggal)}
                      </td>

                      {/* Kategori */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium
                            ${trx.jenis === "INCOME"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-rose-100 text-rose-700"
                            }`}
                        >
                          {trx.kategori}
                        </span>
                      </td>

                      {/* Keterangan */}
                      <td className="px-4 py-3 max-w-xs">
                        <p className="text-slate-800 line-clamp-2 print:line-clamp-none leading-snug">
                          {trx.keterangan || "-"}
                        </p>
                      </td>

                      {/* Satuan / Vol */}
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                        {volText}
                      </td>

                      {/* Harga Satuan */}
                      <td className="px-4 py-3 text-right whitespace-nowrap text-slate-700 font-medium">
                        {formatRupiah(hargaSatuan)}
                      </td>

                      {/* Debit */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {trx.jenis === "INCOME" ? (
                          <span className="font-bold text-emerald-600">
                            {formatRupiah(trx.nominal)}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Kredit */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {trx.jenis === "EXPENSE" ? (
                          <span className="font-bold text-rose-600">
                            {formatRupiah(trx.nominal)}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Saldo */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span className="font-bold text-slate-800">
                          {formatRupiah(trx.saldo_akhir || 0)}
                        </span>
                      </td>

                      {/* Nota – gambar langsung tampil di layar & cetak */}
                      <td className="px-4 py-3 text-center align-top print:hidden">
                        {(() => {
                          const src = getImageSrc(trx.bukti_url);
                          if (!src) return <span className="text-xs text-slate-300">-</span>;
                          return (
                            <a href={trx.bukti_url} target="_blank" rel="noreferrer" title="Lihat nota">
                              <img
                                src={src}
                                alt="Nota"
                                className="w-16 h-16 object-cover rounded-lg border border-slate-200 hover:scale-105 transition-transform cursor-zoom-in mx-auto"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = "none";
                                }}
                              />
                            </a>
                          );
                        })()}
                      </td>

                      {/* Nota versi cetak – gambar lebih besar, selalu tampil */}
                      <td className="hidden print:table-cell px-2 py-2 text-center align-top" style={{ width: "80px" }}>
                        {(() => {
                          const src = getImageSrc(trx.bukti_url);
                          if (!src) return <span style={{ fontSize: "9px", color: "#aaa" }}>-</span>;
                          return (
                            <img
                              src={src}
                              alt="Nota"
                              style={{ width: "70px", height: "70px", objectFit: "cover", borderRadius: "4px", border: "1px solid #e2e8f0" }}
                            />
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* ── Baris Total (hanya tampil di akhir tabel / lembar terakhir saat cetak) ─────────────────────────────────────────── */}
              <tfoot className="print:table-row-group">
                <tr className="bg-slate-50 border-t-2 border-slate-300 font-bold print:break-inside-avoid">
                  <td colSpan={6} className="px-4 py-4 text-slate-700 text-sm uppercase tracking-wide">
                    Total Saldo
                  </td>
                  <td className="px-4 py-4 text-right whitespace-nowrap text-emerald-600 text-base">
                    {formatRupiah(totalDebit)}
                  </td>
                  <td className="px-4 py-4 text-right whitespace-nowrap text-rose-600 text-base">
                    {formatRupiah(totalKredit)}
                  </td>
                  <td className="px-4 py-4 text-right whitespace-nowrap text-slate-800 text-base">
                    {formatRupiah(totalSaldo)}
                  </td>
                  <td className="print:hidden" />
                  <td className="hidden print:table-cell" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ── Info jumlah transaksi ──────────────────────────────────────────── */}
      {!isLoading && filtered.length > 0 && (
        <p className="text-xs text-slate-400 text-center print:hidden">
          Menampilkan <span className="font-semibold text-slate-600">{filtered.length}</span> transaksi untuk periode {judulPeriode}
        </p>
      )}
    </div>
  );
}
