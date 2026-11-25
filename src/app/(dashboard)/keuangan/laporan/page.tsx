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
  Search,
} from "lucide-react";
import FullPageLoader from "@/components/FullPageLoader";
import { splitNotaUrls } from "@/lib/nota";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [showSignatures, setShowSignatures] = useState(false);
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

  // ── 1. Urutkan seluruh data berdasarkan Nomor Urut Kas (No: 1 -> terakhir) ──
  // Sesuai urutan buku kas resmi di spreadsheet agar transaksi terbaru selalu berada di baris paling bawah
  const sortedAll = [...transactions].sort((a, b) => {
    return Number(a.no || 0) - Number(b.no || 0);
  });

  // ── 2. Hitung running saldo secara kronologis dari awal ───────────────────
  let runningSaldo = 0;
  const allWithSaldo = sortedAll.map((trx) => {
    const masuk = trx.jenis === "INCOME" ? Number(trx.nominal || 0) : 0;
    const keluar = trx.jenis === "EXPENSE" ? Number(trx.nominal || 0) : 0;
    runningSaldo = runningSaldo + masuk - keluar;
    return {
      ...trx,
      saldo_kronologis: runningSaldo,
    };
  });

  // ── 3. Filter berdasarkan Periode Tahun, Bulan & Pencarian ────────────────
  const filtered = allWithSaldo.filter((t) => {
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
    const matchSearch = searchQuery
      ? (t.keterangan || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.kategori || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.penanggung_jawab || t.recorded_by || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.trx_id || "").toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchYear && matchMonth && matchSearch;
  });

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
  const totalSaldo = filtered.length > 0 ? filtered[filtered.length - 1].saldo_kronologis : 0;

  // ── Judul Periode ──────────────────────────────────────────────────────────
  const judulPeriode = monthFilter
    ? `${BULAN[parseInt(monthFilter) - 1]} 2025/2026`
    : yearFilter === "2025/2026" || !yearFilter
    ? "2025/2026"
    : `Tahun ${yearFilter}`;

  const handlePrint = async () => {
    // Pastikan gambar nota sudah ter-load sebelum membuka dialog cetak agar tidak kosong/blank
    const images = Array.from(document.querySelectorAll('img[alt="Nota"]')) as HTMLImageElement[];
    const pendingImages = images.filter((img) => !img.complete && img.style.display !== "none");

    if (pendingImages.length > 0) {
      toast.info("Memuat gambar nota sebelum mencetak...");
      await Promise.all(
        pendingImages.map(
          (img) =>
            new Promise((resolve) => {
              img.onload = resolve;
              img.onerror = resolve;
              setTimeout(resolve, 2500);
            })
        )
      );
    }

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
        Saldo: trx.saldo_kronologis || trx.saldo_akhir || 0,
        Nota: splitNotaUrls(trx.bukti_url).join("\n") || "-",
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

            {/* Cari Transaksi */}
            <div className="flex flex-col gap-1 min-w-[200px] flex-1 sm:flex-initial">
              <label className="text-xs font-medium text-slate-500">Cari Keterangan / PJ</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari transaksi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
            </div>

            {/* Reset */}
            {(monthFilter || yearFilter !== "2025/2026" || searchQuery) && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-transparent select-none">Reset</label>
                <button
                  onClick={() => {
                    setMonthFilter("");
                    setYearFilter("2025/2026");
                    setSearchQuery("");
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
        <div className="hidden print:block p-4 pb-3 border-b border-slate-200">
          <div className="text-center mb-1">
            <h2 className="text-xl print:text-2xl font-bold text-slate-900 uppercase tracking-wide">
              Laporan Keuangan – SI FEST 2026
            </h2>
            <p className="text-sm print:text-base font-semibold text-slate-700 mt-1">Periode: {judulPeriode}</p>
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
            <table className="w-full text-left text-sm text-slate-800 print:text-[12.5px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 text-xs print:text-[12px] uppercase font-bold">
                  <th className="px-3 py-3.5 print:py-2.5 whitespace-nowrap">No</th>
                  <th className="px-3 py-3.5 print:py-2.5 whitespace-nowrap">Tanggal</th>
                  <th className="px-3 py-3.5 print:py-2.5">Kategori</th>
                  <th className="px-3 py-3.5 print:py-2.5">Keterangan</th>
                  <th className="px-3 py-3.5 print:py-2.5 whitespace-nowrap">Satuan / Vol</th>
                  <th className="px-3 py-3.5 print:py-2.5 whitespace-nowrap text-right">Harga Satuan</th>
                  <th className="px-3 py-3.5 print:py-2.5 whitespace-nowrap text-right text-emerald-700 w-[1%]" style={{ width: "1%" }}>Debit</th>
                  <th className="px-3 py-3.5 print:py-2.5 whitespace-nowrap text-right text-rose-700 w-[1%]" style={{ width: "1%" }}>Kredit</th>
                  <th className="px-3 py-3.5 print:py-2.5 whitespace-nowrap text-right text-slate-900 w-[1%]" style={{ width: "1%" }}>Saldo</th>
                  <th className="px-2 py-3.5 print:py-2.5 whitespace-nowrap text-center min-w-[180px]">Nota</th>
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
                      <td className="px-3 py-3 print:py-2 whitespace-nowrap">
                        <span className="font-semibold text-slate-700 print:text-[12px]">{trx.no || idx + 1}</span>
                      </td>

                      {/* Tanggal */}
                      <td className="px-3 py-3 print:py-2 whitespace-nowrap text-slate-700 font-medium print:text-[12px]">
                        {formatTanggal(trx.tanggal)}
                      </td>

                      {/* Kategori */}
                      <td className="px-3 py-3 print:py-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] print:text-[11.5px] font-semibold
                            ${trx.jenis === "INCOME"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                            }`}
                        >
                          {trx.kategori}
                        </span>
                      </td>

                      {/* Keterangan */}
                      <td className="px-3 py-3 print:py-2 max-w-xs">
                        <p className="text-slate-800 line-clamp-2 print:line-clamp-none leading-snug print:text-[12px]">
                          {trx.keterangan || "-"}
                        </p>
                      </td>

                      {/* Satuan / Vol */}
                      <td className="px-3 py-3 print:py-2 whitespace-nowrap text-slate-700 font-medium print:text-[12px]">
                        {volText}
                      </td>

                      {/* Harga Satuan */}
                      <td className="px-3 py-3 print:py-2 text-right whitespace-nowrap text-slate-700 font-medium print:text-[12px]">
                        {formatRupiah(hargaSatuan)}
                      </td>

                      {/* Debit */}
                      <td className="px-3 py-3 print:py-2 text-right whitespace-nowrap w-[1%]" style={{ width: "1%" }}>
                        {trx.jenis === "INCOME" ? (
                          <span className="font-bold text-emerald-600 print:text-emerald-700 print:text-[12.5px]">
                            {formatRupiah(trx.nominal)}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Kredit */}
                      <td className="px-3 py-3 print:py-2 text-right whitespace-nowrap w-[1%]" style={{ width: "1%" }}>
                        {trx.jenis === "EXPENSE" ? (
                          <span className="font-bold text-rose-600 print:text-rose-700 print:text-[12.5px]">
                            {formatRupiah(trx.nominal)}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Saldo */}
                      <td className="px-3 py-3 print:py-2 text-right whitespace-nowrap w-[1%]" style={{ width: "1%" }}>
                        <span className="font-bold text-slate-900 print:text-[12.5px]">
                          {formatRupiah(trx.saldo_kronologis || trx.saldo_akhir || 0)}
                        </span>
                      </td>

                      {/* Nota – semua foto berderet, ukuran tiap foto sama */}
                      <td className="px-2 py-2 text-center align-middle min-w-[180px]">
                        {(() => {
                          const urls = splitNotaUrls(trx.bukti_url);
                          if (urls.length === 0) return <span className="text-xs text-slate-300">-</span>;
                          return (
                            <div className="flex flex-wrap items-start justify-center gap-2 mx-auto" style={{ maxWidth: "370px" }}>
                              {urls.map((url, ni) => {
                                const src = getImageSrc(url);
                                if (!src) return null;
                                return (
                                  <div key={`${url}-${ni}`} className="flex flex-col items-center gap-1">
                                    <a href={url} target="_blank" rel="noreferrer" title="Klik untuk membuka ukuran penuh">
                                      <img
                                        src={src}
                                        alt="Nota"
                                        loading="eager"
                                        className="max-h-36 max-w-[165px] w-auto h-auto object-contain rounded-md border border-slate-200 hover:scale-105 transition-transform cursor-zoom-in mx-auto shadow-xs print:max-h-44 print:max-w-[175px]"
                                        onError={(e) => {
                                          // Fallback ke thumbnail Google Drive langsung jika proxy server lambat/gagal
                                          const target = e.currentTarget as HTMLImageElement;
                                          if (target.src.includes('/api/image-proxy')) {
                                            const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
                                            if (match && match[1]) {
                                              target.src = `https://drive.google.com/thumbnail?id=${match[1]}&sz=w800`;
                                              return;
                                            }
                                          }
                                          target.style.display = "none";
                                        }}
                                      />
                                    </a>
                                    <a
                                      href={url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="print:hidden text-[10.5px] text-blue-600 hover:underline font-medium"
                                    >
                                      {urls.length > 1 ? `Lihat ${ni + 1}` : "Lihat Ukuran Penuh"}
                                    </a>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* ── Baris Total (hanya tampil di akhir tabel / lembar terakhir saat cetak) ─────────────────────────────────────────── */}
              <tfoot className="print:table-row-group">
                <tr className="bg-slate-50 border-t-2 border-slate-300 font-bold print:break-inside-avoid text-sm print:text-[13px]">
                  <td colSpan={6} className="px-3 py-3 print:py-2 text-slate-800 uppercase tracking-wide font-bold">
                    Total Saldo
                  </td>
                  <td className="px-3 py-3 print:py-2 text-right whitespace-nowrap text-emerald-700 text-base print:text-[13px] w-[1%]" style={{ width: "1%" }}>
                    {formatRupiah(totalDebit)}
                  </td>
                  <td className="px-3 py-3 print:py-2 text-right whitespace-nowrap text-rose-700 text-base print:text-[13px] w-[1%]" style={{ width: "1%" }}>
                    {formatRupiah(totalKredit)}
                  </td>
                  <td className="px-3 py-3 print:py-2 text-right whitespace-nowrap text-slate-900 text-base print:text-[13px] w-[1%]" style={{ width: "1%" }}>
                    {formatRupiah(totalSaldo)}
                  </td>
                  <td className="min-w-[180px]" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* ── Lembar Pengesahan / Tanda Tangan (Hanya di akhir laporan / lembar terakhir) ── */}
        {!isLoading && filtered.length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-100 p-6 print:p-0 print:border-none print:mt-10 break-inside-avoid print:break-inside-avoid">
            {/* Toggle TTD digital (hanya tampil di layar web) */}
            <div className="print:hidden flex justify-end mb-4">
              <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={showSignatures}
                  onChange={(e) => setShowSignatures(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span>Sertakan Tanda Tangan Digital</span>
              </label>
            </div>

            <div className="text-center font-medium text-slate-800 text-sm print:text-[13px] mb-2">
              Hormat kami,
            </div>

            {/* Baris 1: Ketua Pelaksana (Kiri) & Bendahara I (Kanan) */}
            <div className="grid grid-cols-2 gap-12 text-center text-slate-800 text-sm print:text-[13px] mb-8 max-w-4xl mx-auto">
              {/* Kiri: Ketua Pelaksana */}
              <div className="flex flex-col items-center">
                <div className="h-20 flex items-center justify-center">
                  {showSignatures ? (
                    <img src="/signatures/ttd-dilan.png" alt="TTD Dilan" className="max-h-20 object-contain" />
                  ) : (
                    <div className="h-20" />
                  )}
                </div>
                <p className="font-bold underline text-slate-900 print:text-[13.5px]">
                  Dilan Afri Jones
                </p>
                <p className="text-slate-700 text-xs print:text-[12px] mt-0.5">
                  Ketua Pelaksana
                </p>
              </div>

              {/* Kanan: Bendahara I */}
              <div className="flex flex-col items-center">
                <div className="h-20 flex items-center justify-center">
                  {showSignatures ? (
                    <img src="/signatures/ttd-zhara.png" alt="TTD Zhara" className="max-h-20 object-contain" />
                  ) : (
                    <div className="h-20" />
                  )}
                </div>
                <p className="font-bold underline text-slate-900 print:text-[13.5px]">
                  Zhara Delvian Putri
                </p>
                <p className="text-slate-700 text-xs print:text-[12px] mt-0.5">
                  Bendahara I
                </p>
              </div>
            </div>

            {/* Baris 2: Mengetahui (Tengah) */}
            <div className="text-center text-slate-800 text-sm print:text-[13px] mb-2">
              Mengetahui,
            </div>

            {/* Baris 3: Bupati HMJ-SI (Tengah) */}
            <div className="flex flex-col items-center text-center text-slate-800 text-sm print:text-[13px]">
              <div className="h-20" />
              <p className="font-bold underline text-slate-900 print:text-[13.5px]">
                Farras Amar Zaim Fasha Khoeroni
              </p>
              <p className="text-slate-700 text-xs print:text-[12px] mt-0.5">
                Bupati HMJ-SI
              </p>
            </div>
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
