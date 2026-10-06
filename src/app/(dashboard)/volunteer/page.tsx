"use client";

import { useState, useEffect } from "react";
import { Search, Loader2, CheckCircle2, XCircle, Trash2, ExternalLink, Info, X } from "lucide-react";
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
  const [selectedVolunteer, setSelectedVolunteer] = useState<Volunteer | null>(null);

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
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Data Volunteer</h1>
          <p className="text-sm text-slate-500">Kelola pendaftar volunteer SI FEST 2026</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Cari nama atau No BP..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select 
          value={filterEvent} 
          onChange={(e) => setFilterEvent(e.target.value)}
          className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-semibold">
              <tr>
                <th className="px-6 py-4">Pendaftar</th>
                <th className="px-6 py-4">Kontak & Sosmed</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500 mb-3" />
                    <p className="text-slate-500">Memuat data volunteer...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    Tidak ada pendaftar yang cocok.
                  </td>
                </tr>
              ) : (
                filtered.map((v) => (
                  <tr key={v.id_volunteer} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800">{v.nama}</p>
                      <p className="text-xs text-slate-500">{v.no_bp} • {v.jurusan}</p>
                      <p className="text-xs text-slate-400 mt-1">{v.alamat}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-700">{v.no_hp}</p>
                      <a href={v.link_ig} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1">
                        Instagram <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(v.status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setSelectedVolunteer(v)} className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors" title="Detail">
                          <Info className="w-4 h-4" />
                        </button>
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
                        <button onClick={() => deleteVolunteer(v.id_volunteer)} className="w-8 h-8 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-slate-200 hover:text-slate-600 transition-colors" title="Hapus">
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

      {/* Modal Detail */}
      {selectedVolunteer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between shrink-0 bg-blue-50">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Detail Volunteer</h2>
                <p className="text-xs text-blue-600 font-medium mt-0.5">{selectedVolunteer.nama}</p>
              </div>
              <button onClick={() => setSelectedVolunteer(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Informasi Pribadi</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-slate-500">Nama Lengkap</p>
                      <p className="text-sm font-medium text-slate-900">{selectedVolunteer.nama}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">NIM / No. BP</p>
                      <p className="text-sm font-medium text-slate-900">{selectedVolunteer.no_bp}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Jurusan</p>
                      <p className="text-sm font-medium text-slate-900">{selectedVolunteer.jurusan}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">No. HP / WhatsApp</p>
                      <p className="text-sm font-medium text-slate-900">{selectedVolunteer.no_hp}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Instagram</p>
                      <a href={selectedVolunteer.link_ig} target="_blank" rel="noreferrer" className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1">
                        Buka Instagram <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Pilihan & Berkas</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-slate-500">Pilihan Event 1</p>
                      <p className="text-sm font-medium text-slate-900">{selectedVolunteer.event_1}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Pilihan Event 2</p>
                      <p className="text-sm font-medium text-slate-900">{selectedVolunteer.event_2}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Berkas Pendukung</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <a href={selectedVolunteer.link_bukti} target="_blank" rel="noreferrer" className="text-[11px] px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-1">Bukti IG <ExternalLink className="w-3 h-3" /></a>
                        <a href={selectedVolunteer.link_krs} target="_blank" rel="noreferrer" className="text-[11px] px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-1">KRS <ExternalLink className="w-3 h-3" /></a>
                        {selectedVolunteer.link_sertifikat && selectedVolunteer.link_sertifikat.split(',').map((link, idx) => (
                          <a key={idx} href={link.trim()} target="_blank" rel="noreferrer" className="text-[11px] px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1">Sertifikat {idx + 1} <ExternalLink className="w-3 h-3" /></a>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Alamat Lengkap</h3>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-700">
                  {selectedVolunteer.alamat}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Motivasi Bergabung</h3>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-700 whitespace-pre-wrap">
                  {selectedVolunteer.motivasi}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 p-4 bg-slate-50 flex justify-end">
              <button onClick={() => setSelectedVolunteer(null)} className="px-5 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
