"use client";

import { useState, useEffect } from "react";
import { Search, Loader2, CheckCircle2, XCircle, Trash2, ExternalLink } from "lucide-react";
import Cookies from "js-cookie";

import { SCRIPT_URL } from "@/lib/api";

interface Volunteer {
  id_volunteer: string;
  nama: string;
  no_bp: string;
  jurusan: string;
  alamat: string;
  no_hp: string;
  link_ig: string;
  event_1: string;
  event_2: string;
  motivasi: string;
  link_bukti: string;
  link_krs: string;
  link_sertifikat: string;
  waktu_daftar: string;
  status: string;
}

export default function VolunteerDashboard() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterEvent, setFilterEvent] = useState("");

  const fetchVolunteers = async () => {
    setIsLoading(true);
    try {
      const token = Cookies.get("session_token");
      const res = await fetch(`${SCRIPT_URL}?action=getVolunteers&token=${token}&t=${Date.now()}`);
      const result = await res.json();
      if (result.success === true) {
        setVolunteers(result.data.reverse()); // Terbaru di atas
      }
    } catch (error) {
      console.error("Failed to fetch volunteers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVolunteers();
  }, []);

  const updateStatus = async (id_volunteer: string, status: string) => {
    if (!confirm(`Yakin ingin mengubah status menjadi ${status}?`)) return;
    
    try {
      const token = Cookies.get("session_token");
      const res = await fetch(SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "updateStatusVolunteer", id_volunteer, status, token })
      });
      const result = await res.json();
      if (result.success === true) {
        fetchVolunteers();
      } else {
        alert("Gagal: " + result.message);
      }
    } catch (e) {
      alert("Error jaringan.");
    }
  };

  const deleteVolunteer = async (id_volunteer: string) => {
    if (!confirm("Yakin ingin menghapus data ini secara permanen?")) return;
    
    try {
      const token = Cookies.get("session_token");
      const res = await fetch(SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "deleteVolunteer", id_volunteer, token })
      });
      const result = await res.json();
      if (result.success === true) {
        fetchVolunteers();
      } else {
        alert("Gagal: " + result.message);
      }
    } catch (e) {
      alert("Error jaringan.");
    }
  };

  const filtered = volunteers.filter(v => {
    const matchSearch = v.nama.toLowerCase().includes(search.toLowerCase()) || v.no_bp.includes(search);
    const matchEvent = filterEvent ? (v.event_1 === filterEvent || v.event_2 === filterEvent) : true;
    return matchSearch && matchEvent;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Diterima": return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 font-bold text-xs rounded-full">Diterima</span>;
      case "Ditolak": return <span className="px-2.5 py-1 bg-rose-100 text-rose-700 font-bold text-xs rounded-full">Ditolak</span>;
      default: return <span className="px-2.5 py-1 bg-amber-100 text-amber-700 font-bold text-xs rounded-full">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-200 tracking-tight">Data Volunteer</h1>
          <p className="text-sm text-slate-400">Kelola pendaftar volunteer SI FEST 2026</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#0F172A] p-4 rounded-2xl border border-slate-700/50 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Cari nama atau No BP..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-700/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select 
          value={filterEvent} 
          onChange={(e) => setFilterEvent(e.target.value)}
          className="px-4 py-2 bg-slate-50 border border-slate-700/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Semua Event</option>
          <option value="Seminar">Seminar</option>
          <option value="Turnamen Futsal (SLTA & Mahasiswa)">Turnamen Futsal</option>
          <option value="Turnamen E-Sport (MLBB & E-Football)">E-Sport</option>
          <option value="Lomba Keagamaan / MTQ">Lomba Keagamaan / MTQ</option>
          <option value="Open Bazaar">Open Bazaar</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#0F172A] rounded-2xl border border-slate-700/50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-white/5/5 text-slate-400 font-semibold">
              <tr>
                <th className="px-6 py-4">Pendaftar</th>
                <th className="px-6 py-4">Kontak & Sosmed</th>
                <th className="px-6 py-4">Pilihan Event</th>
                <th className="px-6 py-4">Berkas</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500 mb-3" />
                    <p className="text-slate-400">Memuat data volunteer...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    Tidak ada pendaftar yang cocok.
                  </td>
                </tr>
              ) : (
                filtered.map((v) => (
                  <tr key={v.id_volunteer} className="hover:bg-[#1e293b]/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-200">{v.nama}</p>
                      <p className="text-xs text-slate-400">{v.no_bp} • {v.jurusan}</p>
                      <p className="text-xs text-slate-400 mt-1">{v.alamat}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-300">{v.no_hp}</p>
                      <a href={v.link_ig} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1">
                        Instagram <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-semibold text-slate-300"><span className="text-slate-400 font-normal">1:</span> {v.event_1}</p>
                      <p className="text-xs font-semibold text-slate-300"><span className="text-slate-400 font-normal">2:</span> {v.event_2}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <a href={v.link_bukti} target="_blank" rel="noreferrer" className="text-[11px] px-2 py-1 bg-slate-800 text-slate-400 rounded hover:bg-slate-200 truncate max-w-[120px]">Bukti IG</a>
                        <a href={v.link_krs} target="_blank" rel="noreferrer" className="text-[11px] px-2 py-1 bg-slate-800 text-slate-400 rounded hover:bg-slate-200 truncate max-w-[120px]">KRS</a>
                        {v.link_sertifikat && v.link_sertifikat.split(',').map((link, idx) => (
                          <a key={idx} href={link.trim()} target="_blank" rel="noreferrer" className="text-[11px] px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 truncate max-w-[120px]">Sertif {idx + 1}</a>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(v.status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {v.status !== 'Diterima' && (
                          <button onClick={() => updateStatus(v.id_volunteer, 'Diterima')} className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-colors" title="Terima">
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        {v.status !== 'Ditolak' && (
                          <button onClick={() => updateStatus(v.id_volunteer, 'Ditolak')} className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-100 transition-colors" title="Tolak">
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => deleteVolunteer(v.id_volunteer)} className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center hover:bg-slate-200 hover:text-slate-400 transition-colors" title="Hapus">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
