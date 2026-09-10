"use client";

import { useEffect, useState } from "react";
import { getSeminarRegistrations } from "../actions";
import { Printer, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function CertificatePage() {
  const [participants, setParticipants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await getSeminarRegistrations();
        if (res.success && res.data) {
          setParticipants(res.data.filter((p: any) => p.status_bayar === 'Lunas'));
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
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <span className="ml-3 text-slate-500 font-medium">Memuat data peserta...</span>
      </div>
    );
  }

  if (participants.length === 0) {
    return (
      <div className="flex flex-col h-screen items-center justify-center gap-4">
        <div className="text-slate-500 font-medium">Belum ada peserta yang lunas.</div>
        <Link href="/event/seminar" className="text-blue-600 hover:underline flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Kembali ke Event
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-slate-200 min-h-screen p-8 print:p-0 print:bg-white">
      {/* Header Controls */}
      <div className="mb-8 flex justify-between items-center print:hidden max-w-[1056px] mx-auto">
        <Link href="/event/seminar" className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium shadow-sm">
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali</span>
        </Link>
        <button 
          onClick={() => window.print()} 
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-colors"
        >
          <Printer className="w-5 h-5" />
          Cetak Sertifikat ({participants.length})
        </button>
      </div>

      {/* Certificates Container */}
      <div className="flex flex-col gap-12 items-center print:gap-0 print:block">
        {participants.map((p, index) => (
          <div 
            key={p.id} 
            className="bg-white w-[1056px] h-[816px] relative shadow-2xl print:shadow-none print:w-[1056px] print:h-[816px] flex flex-col items-center justify-center border-[16px] border-blue-900 overflow-hidden"
            style={{ 
              pageBreakAfter: index === participants.length - 1 ? 'auto' : 'always',
              breakAfter: index === participants.length - 1 ? 'auto' : 'page',
              backgroundImage: 'radial-gradient(circle at center, #f8fafc 0%, #f1f5f9 100%)'
            }}
          >
            {/* Decorative Elements */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-blue-100 rounded-br-full opacity-50"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-yellow-50 rounded-tl-full opacity-50"></div>
            
            <div className="z-10 flex flex-col items-center text-center px-24">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 bg-blue-900 rounded-full flex items-center justify-center text-white font-black text-2xl">SI</div>
                <h2 className="text-2xl font-bold tracking-widest text-slate-800 uppercase">FESTIVAL SISTEM INFORMASI</h2>
              </div>

              <h1 className="text-6xl font-black text-blue-900 mb-2 tracking-tight">E-SERTIFIKAT</h1>
              <h3 className="text-xl text-blue-600 font-semibold tracking-[0.2em] uppercase mb-12">Talk Show Nasional 2026</h3>
              
              <p className="text-xl text-slate-500 mb-6 uppercase tracking-wider font-medium">Diberikan Kepada</p>
              
              <h2 className="text-5xl font-serif font-bold text-slate-800 mb-4 border-b-2 border-slate-300 pb-2 px-16 inline-block">
                {p.nama_lengkap}
              </h2>
              <p className="text-xl text-slate-500 mb-12 font-medium">{p.institusi}</p>
              
              <p className="text-lg text-slate-600 max-w-3xl leading-relaxed">
                Atas partisipasinya sebagai <strong>Peserta</strong> dalam acara <strong>Talk Show Teknologi dan Informasi</strong> dengan tema <br/>
                <em className="text-slate-800 font-medium">"Sinergi Inovasi: Menautkan Teknologi, Merangkul Keberagaman"</em> <br/>
                yang diselenggarakan oleh Himpunan Mahasiswa Jurusan Sistem Informasi UPI "YPTK" Padang <br/>
                pada tanggal 03 November 2026.
              </p>

              {/* Signatures */}
              <div className="flex justify-between w-full mt-20 px-12">
                <div className="flex flex-col items-center">
                  <div className="w-40 h-20 border-b border-slate-400 mb-2"></div>
                  <p className="font-bold text-slate-800">Nama Ketua Pelaksana</p>
                  <p className="text-sm text-slate-500">Ketua Pelaksana SI FEST 2026</p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-40 h-20 border-b border-slate-400 mb-2"></div>
                  <p className="font-bold text-slate-800">Nama Pemateri</p>
                  <p className="text-sm text-slate-500">Pemateri Talk Show</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
