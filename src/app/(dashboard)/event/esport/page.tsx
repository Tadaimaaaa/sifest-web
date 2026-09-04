"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Gamepad2, Save, Edit3, User, Phone, MapPin, CalendarDays, Activity, Trash2, Plus, Trophy, Info, Users } from "lucide-react";
import { SCRIPT_URL } from "@/lib/api";
import Cookies from "js-cookie";
import { toast } from "sonner";
import FullPageLoader from "@/components/FullPageLoader";
import Swal from 'sweetalert2';

type Team = {
  id_tim: string;
  nama_tim: string;
  kapten: string;
  kontak: string;
  status_bayar: string;
};

type EventData = {
  id_event: string;
  nama_event: string;
  tanggal: string;
  tempat: string;
  deskripsi: string;
  status: string;
};

export default function EsportDashboard() {
  const [currentUserRole, setCurrentUserRole] = useState("ROLE-001");
  const [isLoading, setIsLoading] = useState(true);
  
  // EVENT STATE
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [eventData, setEventData] = useState<EventData>({
    id_event: "esport",
    nama_event: "E-Sport Competition",
    tanggal: "",
    tempat: "",
    deskripsi: "",
    status: "Akan Datang"
  });
  const [formDataEvent, setFormDataEvent] = useState<EventData>(eventData);

  // TEAM STATE
  const [teams, setTeams] = useState<Team[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSavingTeam, setIsSavingTeam] = useState(false);
  const [formDataTeam, setFormDataTeam] = useState<Team>({
    id_tim: "",
    nama_tim: "",
    kapten: "",
    kontak: "",
    status_bayar: "Belum Bayar"
  });
  const [isEditingTeam, setIsEditingTeam] = useState(false);

  useEffect(() => {
    const role = Cookies.get("user_role");
    if (role) setCurrentUserRole(role);
    fetchData();
  }, []);

  const hasAccess = ["ROLE-001", "SUPER_ADMIN", "ROLE-013"].includes(currentUserRole);

  const fetchData = async () => {
    try {
      // 1. Fetch Event Info
      const resEvent = await fetch(`${SCRIPT_URL}?action=getEvent&id_event=esport`);
      const dataEvent = await resEvent.json();
      if (dataEvent.success && dataEvent.data) {
        setEventData(dataEvent.data);
        setFormDataEvent(dataEvent.data);
      }

      // 2. Fetch Teams
      const resTeams = await fetch(`${SCRIPT_URL}?action=getEsportTeams`);
      const dataTeams = await resTeams.json();
      if (dataTeams.success && dataTeams.data) {
        setTeams(dataTeams.data);
      }
    } catch (error) {
      console.error("Gagal mengambil data esport:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasAccess) return;

    setIsSavingEvent(true);
    try {
      const token = Cookies.get("session_token");
      const payload = { action: "saveEvent", token, ...formDataEvent };

      const res = await fetch(`${SCRIPT_URL}?action=saveEvent`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success("Informasi event berhasil diperbarui!");
        setEventData(formDataEvent);
        setIsEditingEvent(false);
      } else {
        toast.error(data.message || "Gagal menyimpan data event.");
      }
    } catch (error: any) {
      toast.error(`Terjadi kesalahan: ${error.message || error}`);
    } finally {
      setIsSavingEvent(false);
    }
  };

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasAccess) return;

    setIsSavingTeam(true);
    try {
      const token = Cookies.get("session_token");
      const payload = { 
        action: "saveEsportTeam", 
        token, 
        ...formDataTeam,
        id_tim: formDataTeam.id_tim || `MLBB-${new Date().getTime()}`
      };

      const res = await fetch(`${SCRIPT_URL}?action=saveEsportTeam`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success(`Data tim ${payload.nama_tim} berhasil disimpan!`);
        setIsModalOpen(false);
        fetchData(); 
      } else {
        toast.error(data.message || "Gagal menyimpan data tim.");
      }
    } catch (error: any) {
      toast.error(`Gagal menyimpan: ${error.message || error}`);
    } finally {
      setIsSavingTeam(false);
    }
  };

  const handleDeleteTeam = async (id_tim: string) => {
    const result = await Swal.fire({
      title: 'Hapus Tim?',
      text: "Data tim yang dihapus tidak dapat dikembalikan!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal',
      reverseButtons: true
    });

    if (!result.isConfirmed) return;
    
    try {
      const token = Cookies.get("session_token");
      const payload = { action: "deleteEsportTeam", token, id_tim };
      const res = await fetch(`${SCRIPT_URL}?action=deleteEsportTeam`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success("Tim berhasil dihapus");
        fetchData();
      } else {
        toast.error(data.message || "Gagal menghapus tim");
      }
    } catch (error: any) {
      toast.error(`Gagal menghapus: ${error.message || error}`);
    }
  };

  const openAddModal = () => {
    setFormDataTeam({
      id_tim: "",
      nama_tim: "",
      kapten: "",
      kontak: "",
      status_bayar: "Belum Bayar"
    });
    setIsEditingTeam(false);
    setIsModalOpen(true);
  };

  const openEditModal = (team: Team) => {
    setFormDataTeam(team);
    setIsEditingTeam(true);
    setIsModalOpen(true);
  };

  if (isLoading) return <FullPageLoader message="Memuat informasi E-Sport..." fullScreen={false} />;

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
          <p className="text-sm text-slate-500">Informasi Umum Event</p>
        </div>
      </div>

      {/* SECTION 1: Informasi Umum Event */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
        <div className="h-24 bg-gradient-to-r from-rose-500 to-pink-700 opacity-90 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
        </div>
        
        <div className="p-6 sm:p-8 relative">
          <div className="flex justify-between items-start mb-6">
            <div className="-mt-16 w-20 h-20 rounded-2xl bg-rose-50 border-4 border-white shadow-lg flex items-center justify-center relative z-10">
              <Gamepad2 className="w-8 h-8 text-rose-600" />
            </div>
            
            {hasAccess && !isEditingEvent && (
              <button 
                onClick={() => setIsEditingEvent(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-sm font-semibold transition-colors"
              >
                <Edit3 className="w-4 h-4" /> Edit Info
              </button>
            )}
          </div>

          {!isEditingEvent ? (
            <div className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1"><CalendarDays className="w-3.5 h-3.5" /> Tanggal Pelaksanaan</label>
                  <p className="text-base font-semibold text-slate-800">
                    {eventData.tanggal ? new Date(eventData.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : "Belum ditentukan"}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1"><MapPin className="w-3.5 h-3.5" /> Tempat / Lokasi</label>
                  <p className="text-base font-semibold text-slate-800">{eventData.tempat || "Belum ditentukan"}</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1"><Activity className="w-3.5 h-3.5" /> Status Event</label>
                  <span className={`inline-flex px-3 py-1 rounded-lg text-sm font-bold mt-1 ${
                    eventData.status === 'Selesai' ? 'bg-emerald-100 text-emerald-700' :
                    eventData.status === 'Batal' ? 'bg-rose-100 text-rose-700' :
                    eventData.status === 'Sedang Berlangsung' ? 'bg-blue-100 text-blue-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {eventData.status}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2"><Info className="w-3.5 h-3.5" /> Deskripsi Singkat</label>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-slate-600 leading-relaxed text-sm whitespace-pre-wrap">
                    {eventData.deskripsi || "Belum ada deskripsi untuk event ini."}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSaveEvent} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Tanggal Pelaksanaan</label>
                  <input 
                    type="date" 
                    value={formDataEvent.tanggal ? new Date(formDataEvent.tanggal).toISOString().split('T')[0] : ""}
                    onChange={(e) => setFormDataEvent({...formDataEvent, tanggal: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Tempat / Lokasi</label>
                  <input 
                    type="text" 
                    value={formDataEvent.tempat}
                    onChange={(e) => setFormDataEvent({...formDataEvent, tempat: e.target.value})}
                    placeholder="Contoh: GOR UNP"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Status Event</label>
                  <select 
                    value={formDataEvent.status}
                    onChange={(e) => setFormDataEvent({...formDataEvent, status: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  >
                    <option value="Akan Datang">Akan Datang</option>
                    <option value="Sedang Berlangsung">Sedang Berlangsung</option>
                    <option value="Selesai">Selesai</option>
                    <option value="Batal">Batal</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Deskripsi Singkat</label>
                  <textarea 
                    value={formDataEvent.deskripsi}
                    onChange={(e) => setFormDataEvent({...formDataEvent, deskripsi: e.target.value})}
                    rows={4}
                    placeholder="Tuliskan deskripsi atau catatan mengenai event ini..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsEditingEvent(false)}
                  className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  disabled={isSavingEvent}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl shadow-sm shadow-rose-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isSavingEvent ? "Menyimpan..." : <><Save className="w-4 h-4" /> Simpan Perubahan</>}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* SECTION 2: Data Tim (Tabel) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center border border-purple-100">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Daftar Tim Bertanding</h2>
              <p className="text-xs text-slate-500">{teams.length} Tim Terdaftar</p>
            </div>
          </div>
          {hasAccess && (
            <button 
              onClick={openAddModal}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl shadow-sm shadow-rose-500/20 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Registrasi Tim
            </button>
          )}
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Nama Tim</th>
                <th className="px-6 py-4 font-semibold">Kapten</th>
                <th className="px-6 py-4 font-semibold">Kontak WA</th>
                <th className="px-6 py-4 font-semibold">Status Bayar</th>
                {hasAccess && <th className="px-6 py-4 font-semibold text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {teams.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4">
                      <Gamepad2 className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-slate-800 font-semibold mb-1">Belum ada tim</h3>
                    <p className="text-sm text-slate-500">Daftarkan tim pertama yang akan bertanding.</p>
                  </td>
                </tr>
              ) : (
                teams.map((team, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800">{team.nama_tim}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{team.id_tim}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {team.kapten}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {team.kontak}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-bold ${
                        team.status_bayar === 'Lunas' ? 'bg-emerald-100 text-emerald-700' :
                        team.status_bayar === 'DP' ? 'bg-blue-100 text-blue-700' :
                        'bg-rose-100 text-rose-700'
                      }`}>
                        {team.status_bayar}
                      </span>
                    </td>
                    {hasAccess && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => openEditModal(team)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteTeam(team.id_tim)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3: Turnamen Bracket Viewer (Visual Only) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-100">
              <Trophy className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Bagan Pertandingan</h2>
              <p className="text-xs text-slate-500">Preview Bracket Turnamen</p>
            </div>
          </div>
        </div>
        <div className="p-8 flex items-center justify-center min-h-[300px] bg-slate-50/50 relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
          
          <div className="text-center relative z-10 w-full">
            {teams.length < 2 ? (
              <div className="py-12">
                <Gamepad2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-slate-600 font-semibold mb-2">Bracket Generator</h3>
                <p className="text-slate-500 text-sm max-w-sm mx-auto">Sistem akan secara otomatis menyusun bagan pertandingan ketika minimal ada 2 tim yang terdaftar.</p>
              </div>
            ) : (
              <div className="py-8 opacity-50 flex flex-col items-center">
                <Trophy className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-slate-600 font-semibold mb-2">Fitur Bagan Dalam Pengembangan</h3>
                <p className="text-slate-500 text-sm max-w-sm mx-auto">Bagan pertandingan 1v1 akan ditampilkan di sini.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Add/Edit Tim */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden relative z-10 shadow-xl animate-in zoom-in-95 duration-200">
            
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center border border-rose-100">
                  <Gamepad2 className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{isEditingTeam ? 'Edit Tim' : 'Registrasi Tim'}</h3>
                  <p className="text-xs text-slate-500">Data pendaftaran turnamen</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveTeam} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Nama Tim (Squad)</label>
                <input 
                  type="text" 
                  required
                  value={formDataTeam.nama_tim}
                  onChange={(e) => setFormDataTeam({...formDataTeam, nama_tim: e.target.value})}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  placeholder="Contoh: RRQ Hoshi"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-slate-400" /> Kapten</label>
                  <input 
                    type="text" 
                    required
                    value={formDataTeam.kapten}
                    onChange={(e) => setFormDataTeam({...formDataTeam, kapten: e.target.value})}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    placeholder="Nama Kapten"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" /> No. WA</label>
                  <input 
                    type="text" 
                    required
                    value={formDataTeam.kontak}
                    onChange={(e) => setFormDataTeam({...formDataTeam, kontak: e.target.value})}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    placeholder="0812xxx"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Status Pembayaran</label>
                <select 
                  value={formDataTeam.status_bayar}
                  onChange={(e) => setFormDataTeam({...formDataTeam, status_bayar: e.target.value})}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium"
                >
                  <option value="Belum Bayar">Belum Bayar (Merah)</option>
                  <option value="DP">DP (Biru)</option>
                  <option value="Lunas">Lunas (Hijau)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-6 mt-2 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  disabled={isSavingTeam}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl shadow-sm shadow-rose-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isSavingTeam ? "Menyimpan..." : <><Save className="w-4 h-4" /> Simpan Data</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
