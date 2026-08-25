"use client";

import { useState, useEffect } from "react";
import { Users, Activity, Target, Sparkles, AlertCircle } from "lucide-react";
import { SCRIPT_URL } from "@/lib/api";
import Cookies from "js-cookie";
import { toast } from "sonner";
import FullPageLoader from "@/components/FullPageLoader";

import { fetcher } from "@/lib/api";
import useSWR from "swr";

export default function DashboardPage() {
  const [userName, setUserName] = useState("Admin");
  const [currentUserRole, setCurrentUserRole] = useState("ROLE-004");

  useEffect(() => {
    try {
      const userDataStr = Cookies.get("user_data");
      if (userDataStr) {
        const user = JSON.parse(userDataStr);
        setUserName(user.name || "Admin");
        setCurrentUserRole(user.role || "ROLE-004");
      }
    } catch (e) {
      console.error("Gagal membaca cookie user", e);
    }
  }, []);

  const isSuperAdmin = currentUserRole === "ROLE-001" || currentUserRole === "SUPER_ADMIN";

  const { data: resData, error, isLoading } = useSWR("?action=getDashboard", fetcher);

  const stats = resData?.data?.stats || {
    totalPanitia: 0,
    panitiaAktif: 0,
    roleTersedia: 0,
    aktivitasHariIni: 0
  };
  const recentLogs = resData?.data?.recentLogs || [];

  const statCards = [
    { name: "Total Panitia", value: stats.totalPanitia, icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
    { name: "Panitia Aktif", value: stats.panitiaAktif, icon: Activity, color: "text-green-600", bg: "bg-green-100" },
    { name: "Role Tersedia", value: stats.roleTersedia, icon: Target, color: "text-purple-600", bg: "bg-purple-100" },
    { name: "Aktivitas Hari Ini", value: stats.aktivitasHariIni, icon: Sparkles, color: "text-yellow-600", bg: "bg-yellow-100" },
  ];

  if (isLoading) {
    return (
      <div className="h-full min-h-[60vh] relative">
        <FullPageLoader message="Memuat Dashboard..." fullScreen={false} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Halo, <span className="font-semibold text-blue-600">{userName}</span>. Selamat datang kembali!</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center mb-4`}>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
              <p className="text-sm text-slate-500 font-medium">{stat.name}</p>
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      {isSuperAdmin && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center">
            <h2 className="font-semibold text-slate-800">Aktivitas Terakhir</h2>
            <button className="text-sm text-blue-600 font-medium hover:text-blue-700">Lihat Semua</button>
          </div>
          
          {recentLogs.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <Activity className="w-6 h-6 text-slate-300" />
              </div>
              <p className="text-slate-500 text-sm">Belum ada aktivitas yang tercatat hari ini.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {recentLogs.map((log: any, index: number) => (
                <div key={index} className="p-4 hover:bg-slate-50 transition-colors flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 mt-1">
                    <Activity className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-800 font-medium">{log.description || `${log.action} pada modul ${log.module}`}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                      <span className="font-medium text-blue-600">{log.user_id}</span>
                      <span>•</span>
                      <span>{new Date(log.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Info Card for Non-SuperAdmin */}
      {!isSuperAdmin && (
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-lg p-8 text-white relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <h2 className="text-2xl font-bold mb-3">Selamat Bekerja, Tim SI FEST! 🚀</h2>
            <p className="text-blue-100 leading-relaxed mb-6">
              Terima kasih atas dedikasi dan kerja keras Anda dalam menyukseskan acara SI FEST tahun ini. Mari kita jaga semangat, komunikasi, dan kerja sama tim. Gunakan sistem navigasi di sebelah kiri untuk mengelola data sesuai dengan peran dan tanggung jawab divisi Anda.
            </p>
            <div className="flex flex-wrap gap-3">
              <span className="inline-flex items-center bg-white/20 hover:bg-white/30 transition-colors cursor-default px-4 py-2 rounded-xl text-sm font-medium backdrop-blur-sm">
                💡 Jaga Integritas Data
              </span>
              <span className="inline-flex items-center bg-white/20 hover:bg-white/30 transition-colors cursor-default px-4 py-2 rounded-xl text-sm font-medium backdrop-blur-sm">
                🤝 Tetap Semangat
              </span>
            </div>
          </div>
          {/* Decorative shapes */}
          <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 w-64 h-64 bg-blue-500 rounded-full blur-3xl opacity-50 mix-blend-screen pointer-events-none"></div>
          <div className="absolute bottom-0 right-1/4 translate-y-1/2 w-48 h-48 bg-indigo-500 rounded-full blur-3xl opacity-50 mix-blend-screen pointer-events-none"></div>
        </div>
      )}
    </div>
  );
}
