"use client";

import { useEffect, useState } from "react";
import { getMtqRegistrations } from "../actions";
import { Printer, Loader2, ArrowLeft, Award, Sparkles } from "lucide-react";
import Link from "next/link";

export default function MtqCertificatePage() {
  const [participants, setParticipants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await getMtqRegistrations();
        if (res.success && res.data) {
          // Tampilkan semua peserta MTQ yang terdaftar (atau yang lunas)
          setParticipants(res.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        <span className="ml-3 text-slate-600 font-medium">Memuat data peserta MTQ...</span>
      </div>
    );
  }

  if (participants.length === 0) {
    return (
      <div className="flex flex-col h-screen items-center justify-center gap-4 bg-slate-50">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
          <Award className="w-8 h-8" />
        </div>
        <div className="text-slate-600 font-semibold text-lg">Belum ada data peserta MTQ yang tersedia.</div>
        <Link href="/event/mtq" className="text-emerald-600 hover:underline flex items-center gap-2 font-medium">
          <ArrowLeft className="w-4 h-4" /> Kembali ke Event MTQ
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-slate-200 min-h-screen p-8 print:p-0 print:bg-white font-sans">
      {/* Header Controls (Hidden saat print) */}
      <div className="mb-8 flex flex-wrap gap-4 justify-between items-center print:hidden max-w-[1123px] mx-auto bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <Link 
          href="/event/mtq" 
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-medium text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Event MTQ</span>
        </Link>

        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-500 hidden sm:block">
            Total Peserta: <strong className="text-slate-800">{participants.length}</strong>
          </div>
          <button 
            onClick={() => window.print()} 
            className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-md hover:bg-emerald-700 transition-colors text-sm cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Cetak Sertifikat ({participants.length})
          </button>
        </div>
      </div>

      {/* Info Desain Template (Hidden saat print) */}
      <div className="mb-6 max-w-[1123px] mx-auto print:hidden">
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-xs text-emerald-800 font-medium">
          <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Halaman cetak sertifikat MTQ aktif. Desain dan tata letak sertifikat siap disesuaikan begitu template desain resmi dikirimkan.</span>
        </div>
      </div>

      {/* Certificates Container (A4 Landscape: 1123px x 794px) */}
      <div className="flex flex-col gap-12 items-center print:gap-0 print:block">
        {participants.map((p, index) => (
          <div 
            key={p.id_peserta || index} 
            className="bg-white w-[1123px] h-[794px] relative shadow-2xl print:shadow-none print:w-[1123px] print:h-[794px] flex flex-col justify-between p-16 border-[12px] border-emerald-800 overflow-hidden"
            style={{ 
              pageBreakAfter: index === participants.length - 1 ? 'auto' : 'always',
              breakAfter: index === participants.length - 1 ? 'auto' : 'page',
              backgroundImage: 'radial-gradient(circle at center, #ffffff 0%, #f8fafc 100%)'
            }}
          >
            {/* Ornamen Sudut */}
            <div className="absolute top-0 left-0 w-44 h-44 bg-emerald-100/50 rounded-br-full pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-44 h-44 bg-amber-100/40 rounded-tl-full pointer-events-none"></div>

            {/* Header Sertifikat: Logo & Instansi */}
            <div className="relative z-10 flex items-center justify-between border-b-2 border-emerald-800/30 pb-6">
              <div className="flex items-center gap-4">
                <img src="/logo-hmjsi.jpg" alt="HMJ SI" className="h-16 w-auto object-contain" />
                <img src="/logo-sifest.png" alt="SIFEST 2026" className="h-16 w-auto object-contain" />
              </div>
              <div className="text-right">
                <h4 className="text-sm font-bold text-slate-800 tracking-wider uppercase">Sistem Informasi Festival 2026</h4>
                <p className="text-xs text-slate-600">Himpunan Mahasiswa Jurusan Sistem Informasi - UPI YPTK Padang</p>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">No: SERT/SIFEST/MTQ/{p.id_peserta || String(index + 1).padStart(3, '0')}</p>
              </div>
            </div>

            {/* Konten Utama Sertifikat */}
            <div className="relative z-10 text-center my-auto px-12">
              <h1 className="text-5xl font-serif font-black text-emerald-900 tracking-wider uppercase mb-2">
                SERTIFIKAT
              </h1>
              <h3 className="text-base font-semibold text-amber-700 tracking-[0.25em] uppercase mb-6">
                Lomba Keagamaan (MTQ) SI FEST 2026
              </h3>

              <p className="text-sm text-slate-600 uppercase tracking-widest font-medium mb-3">
                Diberikan kepada:
              </p>

              {/* Nama Peserta */}
              <h2 className="text-4xl font-serif font-extrabold text-slate-900 mb-2 border-b-2 border-slate-300 pb-2 inline-block px-12">
                {p.nama_lengkap}
              </h2>

              <p className="text-lg font-medium text-slate-700 mb-6">
                {p.institusi}
              </p>

              <p className="text-sm text-slate-600 max-w-3xl mx-auto leading-relaxed">
                Sebagai <strong>Peserta</strong> pada cabang <strong>Lomba Keagamaan (Musabaqah Tilawatil Qur'an)</strong> dalam rangkaian acara Festival Himpunan Mahasiswa Jurusan Sistem Informasi (SI FEST 2026) Universitas Putra Indonesia "YPTK" Padang.
              </p>
            </div>

            {/* Footer / Pengesahan Tanda Tangan */}
            <div className="relative z-10 flex items-end justify-between pt-6 border-t border-slate-200 text-xs text-slate-800">
              <div className="text-center w-56">
                <p className="font-medium text-slate-600 mb-1">Ketua Pelaksana</p>
                <div className="h-16 flex items-center justify-center">
                  <img src="/signatures/ttd-dilan.png" alt="TTD Dilan" className="max-h-16 object-contain" />
                </div>
                <p className="font-bold text-slate-900 text-sm border-t border-slate-300 pt-1 mt-1">Dilan Afri Jones</p>
                <p className="text-[11px] text-slate-500">Ketua Pelaksana SIFEST 2026</p>
              </div>

              <div className="text-center">
                <p className="text-xs text-slate-500">Padang, 02 November 2026</p>
              </div>

              <div className="text-center w-56">
                <p className="font-medium text-slate-600 mb-1">Bendahara Pelaksana</p>
                <div className="h-16 flex items-center justify-center">
                  <img src="/signatures/ttd-zhara.png" alt="TTD Zhara" className="max-h-16 object-contain" />
                </div>
                <p className="font-bold text-slate-900 text-sm border-t border-slate-300 pt-1 mt-1">Zhara Delvia Putri</p>
                <p className="text-[11px] text-slate-500">Bendahara SIFEST 2026</p>
              </div>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}
