"use client";

import { LogOut } from "lucide-react";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";

export function MobileHeader() {
  const router = useRouter();

  const handleLogout = () => {
    Cookies.remove("session_token");
    Cookies.remove("user_data");
    router.push("/login");
  };

  return (
    <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm print:hidden">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white text-xs">
          SI
        </div>
        <span className="font-bold text-slate-800 text-sm tracking-tight">SI FEST 2026</span>
      </div>
      <button
        onClick={handleLogout}
        className="p-2 text-rose-500 bg-rose-50 rounded-xl hover:bg-rose-100 transition-colors"
        title="Keluar"
      >
        <LogOut className="w-4 h-4" />
      </button>
    </div>
  );
}
