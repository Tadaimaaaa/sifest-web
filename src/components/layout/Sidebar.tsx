"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Handshake, Mail, Package, LogOut, Wallet, Camera } from "lucide-react";
import clsx from "clsx";
import { useState, useEffect } from "react";
import Cookies from "js-cookie";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Pendaftar", href: "/sifest/registrations", icon: Users },
  { name: "Data Panitia", href: "/users", icon: Users },
  { name: "Data Keuangan", href: "/keuangan", icon: Wallet },
  { name: "Data Sponsor", href: "/sponsor", icon: Handshake },
  { name: "Surat Masuk & Keluar", href: "/surat", icon: Mail },
  { name: "Produk Sponsor", href: "/produk", icon: Package },
  { name: "Pubdok", href: "/pubdok", icon: Camera },
];

export function Sidebar() {
  const pathname = usePathname();

  const [userData, setUserData] = useState({ name: "User", position: "Panitia", seed: "Admin", role_id: "" });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      const ud = Cookies.get("user_data");
      if (ud) {
        const user = JSON.parse(ud);
        setUserData({
          name: user.name || "User",
          position: user.position || user.division || "Panitia",
          seed: user.name || "Admin",
          role_id: user.role_id || user.role || ""
        });
      }
    } catch (e) {}

    const toggleHandler = () => setIsOpen(prev => !prev);
    window.addEventListener('toggle-mobile-sidebar', toggleHandler);
    return () => window.removeEventListener('toggle-mobile-sidebar', toggleHandler);
  }, []);

  // Tutup sidebar saat route berubah (di mobile)
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Overlay Backdrop untuk Mobile */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Component */}
      <aside className={clsx(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 h-screen flex flex-col transition-transform duration-300 ease-in-out md:relative md:translate-x-0 print:hidden",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 flex-shrink-0">
            <img src="/logo-sifest.png" alt="SI FEST Logo" className="w-full h-full object-contain" />
          </div>
        <div>
          <h2 className="font-bold text-slate-800 text-lg leading-tight">SI FEST</h2>
          <p className="text-xs text-slate-500">Management</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm",
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <Icon className={clsx("w-5 h-5", isActive ? "text-blue-600" : "text-slate-400")} />
              {item.name}
            </Link>
          );
        })}
        
        {userData.role_id === 'ROLE-001' && (
          <Link
            href="/logs"
            className={clsx(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm mt-4 border border-slate-200",
              pathname.startsWith('/logs')
                ? "bg-slate-800 text-white border-transparent"
                : "text-slate-700 bg-slate-50 hover:bg-slate-100"
            )}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={clsx("w-5 h-5", pathname.startsWith('/logs') ? "text-slate-300" : "text-slate-500")}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            Log Aktivitas
          </Link>
        )}
      </nav>

      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-10 h-10 rounded-full bg-slate-200 flex-shrink-0 overflow-hidden">
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.seed}`} alt="Avatar" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate" title={userData.name}>{userData.name}</p>
            <p className="text-xs text-slate-500 truncate" title={userData.position}>{userData.position}</p>
          </div>
        </div>
        <button
          onClick={() => {
            // Hapus cookies sesi
            document.cookie = 'session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
            document.cookie = 'user_data=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
            // Redirect ke halaman login
            window.location.href = '/login';
          }}
          className="mt-2 w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-all font-medium text-sm"
        >
          <LogOut className="w-5 h-5" />
          Keluar
        </button>
      </div>
    </aside>
    </>
  );
}
