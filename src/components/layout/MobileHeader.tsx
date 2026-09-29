"use client";

import { LogOut, Menu } from "lucide-react";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";

export function MobileHeader() {
  const router = useRouter();

  const handleLogout = () => {
    Cookies.remove("session_token");
    Cookies.remove("user_data");
    router.push("/login");
  };

  const toggleSidebar = () => {
    window.dispatchEvent(new Event('toggle-mobile-sidebar'));
  };

  return (
    <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm print:hidden">
      <div className="flex items-center gap-3">
        <button onClick={toggleSidebar} className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 flex-shrink-0">
            <img src="/logo-sifest.png" alt="SI FEST Logo" className="w-full h-full object-contain" />
          </div>
          <span className="font-bold text-slate-800 text-sm tracking-tight">SI FEST</span>
        </div>
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
