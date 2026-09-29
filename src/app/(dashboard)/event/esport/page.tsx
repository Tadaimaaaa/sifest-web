"use client";

import Link from "next/link";
import { ArrowLeft, Gamepad2, ArrowRight } from "lucide-react";

export default function EsportSelectionPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
      {/* Header Utama */}
      <div className="flex items-center gap-4">
        <Link href="/event" className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            E-Sport Competition
          </h1>
          <p className="text-sm text-slate-500">Pilih sub-event E-Sport untuk dikelola</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        {/* MLBB Card */}
        <Link 
          href="/event/esport/mlbb"
          className="group relative bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-xl hover:shadow-blue-900/10 transition-all hover:-translate-y-1 overflow-hidden"
        >
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-full opacity-10 blur-3xl group-hover:opacity-20 transition-opacity" />
          
          <div className="flex items-start justify-between mb-8 relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-50 to-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300">
              <Gamepad2 className="w-8 h-8" />
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-colors shadow-sm">
              <ArrowRight className="w-5 h-5 -rotate-45 group-hover:rotate-0 transition-transform duration-300" />
            </div>
          </div>
          
          <div className="relative z-10">
            <h3 className="text-xl font-bold text-slate-800 tracking-tight mb-2 group-hover:text-blue-700 transition-colors">
              Mobile Legends: Bang Bang
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Kelola pendaftaran tim, susun bracket pertandingan, dan pantau jalannya turnamen MLBB.
            </p>
          </div>
        </Link>

        {/* E-Football Card */}
        <Link 
          href="/event/esport/efootball"
          className="group relative bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-xl hover:shadow-rose-900/10 transition-all hover:-translate-y-1 overflow-hidden"
        >
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-gradient-to-br from-rose-400 to-red-600 rounded-full opacity-10 blur-3xl group-hover:opacity-20 transition-opacity" />
          
          <div className="flex items-start justify-between mb-8 relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-50 to-red-50 border border-rose-100 text-rose-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300">
              <Gamepad2 className="w-8 h-8" />
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-rose-600 group-hover:text-white group-hover:border-rose-600 transition-colors shadow-sm">
              <ArrowRight className="w-5 h-5 -rotate-45 group-hover:rotate-0 transition-transform duration-300" />
            </div>
          </div>
          
          <div className="relative z-10">
            <h3 className="text-xl font-bold text-slate-800 tracking-tight mb-2 group-hover:text-rose-700 transition-colors">
              E-Football
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Kelola peserta turnamen, jumlah slot pemain (1 atau 2 slot), dan jadwalkan pertandingan E-Football.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
