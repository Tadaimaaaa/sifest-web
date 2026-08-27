"use client";

import { useState, useEffect } from "react";
import { Activity, Clock, User, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    try {
      const userData = Cookies.get("user_data");
      if (userData) {
        const user = JSON.parse(userData);
        if (user.role === "ROLE-001" || user.role_id === "ROLE-001") {
          setIsSuperAdmin(true);
        } else {
          // If not superadmin, redirect them back
          toast.error("Anda tidak memiliki akses ke halaman ini.");
          router.push("/dashboard");
        }
      }
    } catch (e) {}
  }, [router]);

  useEffect(() => {
    if (!isSuperAdmin) return;

    const fetchLogs = async () => {
      try {
        const { SCRIPT_URL } = await import('@/lib/api');
        const token = Cookies.get("session_token");
        if (!token) return;

        const response = await fetch(`${SCRIPT_URL}?action=getActivityLogs`, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ session_token: token }),
        });

        const data = await response.json();
        if (data.success) {
          setLogs(data.data || []);
        } else {
          toast.error("Gagal mengambil data aktivitas");
        }
      } catch (error) {
        toast.error("Terjadi kesalahan jaringan.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
  }, [isSuperAdmin]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-slate-500">Memuat log aktivitas...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Log Aktivitas</h1>
          <p className="text-sm text-slate-500 mt-1">Riwayat aktivitas seluruh panitia dalam sistem.</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {logs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Activity className="w-6 h-6 text-slate-300" />
            </div>
            <p className="text-slate-500">Belum ada aktivitas yang tercatat.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-sm">
                  <th className="font-semibold text-slate-600 py-3 px-4">Waktu</th>
                  <th className="font-semibold text-slate-600 py-3 px-4">User ID</th>
                  <th className="font-semibold text-slate-600 py-3 px-4">Aksi</th>
                  <th className="font-semibold text-slate-600 py-3 px-4">Deskripsi</th>
                  <th className="font-semibold text-slate-600 py-3 px-4">Modul</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {logs.map((log, index) => {
                  const date = new Date(log.created_at);
                  const formattedDate = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                  const formattedTime = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

                  return (
                    <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formattedDate}, {formattedTime}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-blue-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {log.user_id || '-'}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700 whitespace-nowrap">
                        {log.action}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-md truncate" title={log.description}>
                        {log.description}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                          {log.module}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
