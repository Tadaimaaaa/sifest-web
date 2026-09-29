"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button 
      onClick={() => window.print()}
      className="print:hidden flex items-center gap-2 px-4 py-2 bg-[#0F172A] border border-slate-700/50 hover:bg-slate-50 text-slate-300 text-sm font-medium rounded-lg shadow-sm transition-colors"
    >
      <Printer className="w-4 h-4" />
      Cetak PDF
    </button>
  );
}
