"use client";

import Link from "next/link";
import { ArrowLeft, Trophy, ArrowRight } from "lucide-react";

export default function FutsalSelectionPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
      {/* Header Utama */}
      <div className="flex items-center gap-4">
        <Link href="/event" className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            Futsal Competition
          </h1>
          <p className="text-sm text-slate-500">Pilih kategori kompetisi Futsal untuk dikelola</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        {/* Futsal SMA Card */}
        <Link 
          href="/event/futsal/sma"
          className="group relative bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-xl hover:shadow-emerald-900/10 transition-all hover:-translate-y-1 overflow-hidden"
        >
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full opacity-10 blur-3xl group-hover:opacity-20 transition-opacity" />
          
          <div className="flex items-start justify-between mb-8 relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300">
              <Trophy className="w-8 h-8" />
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600 transition-colors shadow-sm">
              <ArrowRight className="w-5 h-5 -rotate-45 group-hover:rotate-0 transition-transform duration-300" />
            </div>
          </div>
          
          <div className="relative z-10">
            <h3 className="text-xl font-bold text-slate-800 tracking-tight mb-2 group-hover:text-emerald-700 transition-colors">
              Tingkat SMA/Sederajat
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Kelola pendaftaran tim, susun bracket pertandingan, dan pantau jalannya turnamen tingkat SMA.
            </p>
          </div>
        </Link>

        {/* Futsal Umum Card */}
        <Link 
          href="/event/futsal/umum"
          className="group relative bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-xl hover:shadow-teal-900/10 transition-all hover:-translate-y-1 overflow-hidden"
        >
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-gradient-to-br from-teal-400 to-cyan-600 rounded-full opacity-10 blur-3xl group-hover:opacity-20 transition-opacity" />
          
          <div className="flex items-start justify-between mb-8 relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-100 text-teal-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300">
              <Trophy className="w-8 h-8" />
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-teal-600 group-hover:text-white group-hover:border-teal-600 transition-colors shadow-sm">
              <ArrowRight className="w-5 h-5 -rotate-45 group-hover:rotate-0 transition-transform duration-300" />
            </div>
          </div>
          
          <div className="relative z-10">
            <h3 className="text-xl font-bold text-slate-800 tracking-tight mb-2 group-hover:text-teal-700 transition-colors">
              Tingkat Mahasiswa / Umum
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Kelola pendaftaran tim, susun bracket pertandingan, dan pantau turnamen Mahasiswa/Umum.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
