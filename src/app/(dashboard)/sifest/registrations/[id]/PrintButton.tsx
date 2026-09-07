"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button 
      onClick={() => window.print()}
      className="print:hidden flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg shadow-sm transition-colors"
    >
      <Printer className="w-4 h-4" />
      Cetak PDF
    </button>
  );
}
