"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Gamepad2, Save, Edit3, User, Phone, MapPin, CalendarDays, Activity, Trash2, Plus, Trophy, Info, Users } from "lucide-react";
import { SCRIPT_URL } from "@/lib/api";
import Cookies from "js-cookie";
import { toast } from "sonner";
import FullPageLoader from "@/components/FullPageLoader";
import { getEsportRegistrations } from "./actions";
import { Loader2, Shuffle } from "lucide-react";

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

  // TEAM STATE (Read Only)
  const [teams, setTeams] = useState<Team[]>([]);
  
  // BRACKET STATE
  const [shuffledTeams, setShuffledTeams] = useState<(Team | null)[]>(Array(16).fill(null));
  const [isSpinning, setIsSpinning] = useState(false);

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

      // 2. Fetch Teams from Supabase (Official Web Registrations)
      const dataTeams = await getEsportRegistrations();
      if (dataTeams.success && dataTeams.data) {
        setTeams(dataTeams.data);
        
        // Initialize bracket with padded teams up to 16
        const initialBracket: (Team | null)[] = [...dataTeams.data];
        while (initialBracket.length < 16) {
          initialBracket.push(null);
        }
        setShuffledTeams(initialBracket.slice(0, 16));
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

  // Bracket Spinning Effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSpinning) {
      interval = setInterval(() => {
        setShuffledTeams(prev => {
          const newArr = [...prev];
          for (let i = newArr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
          }
          return newArr;
        });
      }, 50); // 50ms fast shuffle
    }
    return () => clearInterval(interval);
  }, [isSpinning]);

  const toggleSpin = () => {
    setIsSpinning(!isSpinning);
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
              <p className="text-xs text-slate-500">
                {teams.length} Tim Terdaftar (Data sinkron dengan Pendaftar Official Web)
              </p>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Nama Tim</th>
                <th className="px-6 py-4 font-semibold">Kapten</th>
                <th className="px-6 py-4 font-semibold">Kontak WA</th>
                <th className="px-6 py-4 font-semibold">Status Bayar</th>
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3: Turnamen Bracket Viewer (Visual Only) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-100">
              <Trophy className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Bagan Pertandingan</h2>
              <p className="text-xs text-slate-500">Preview Bracket Turnamen & Pengundian</p>
            </div>
          </div>
          {hasAccess && (
            <button 
              onClick={toggleSpin}
              className={`px-6 py-2.5 text-white text-sm font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 ${
                isSpinning 
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20 animate-pulse' 
                  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
              }`}
            >
              {isSpinning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Stop Pengundian!
                </>
              ) : (
                <>
                  <Shuffle className="w-4 h-4" />
                  Acak Tim (Spin)
                </>
              )}
            </button>
          )}
        </div>
        <div className="p-8 w-full overflow-x-auto bg-slate-50/50 relative">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
          
          <div className="relative z-10 min-w-[1000px] h-[800px] flex gap-12 px-4 py-4">
            {/* Round 1 (16 Teams) */}
            <div className="flex flex-col justify-around w-56 shrink-0 relative">
              <div className="absolute -top-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-center w-full">Round of 16</div>
              {Array(8).fill(0).map((_, i) => {
                const team1 = shuffledTeams[i * 2];
                const team2 = shuffledTeams[i * 2 + 1];
                return (
                  <div key={`r1-${i}`} className="w-full bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden flex flex-col text-xs relative z-10">
                    <div className="px-3 py-2 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <span className={`font-semibold ${team1 ? 'text-slate-800' : 'text-slate-400'}`}>
                        {team1 ? team1.nama_tim : 'TBD (BYE)'}
                      </span>
                      <span className="text-slate-300">-</span>
                    </div>
                    <div className="px-3 py-2 flex justify-between items-center bg-white">
                      <span className={`font-semibold ${team2 ? 'text-slate-800' : 'text-slate-400'}`}>
                        {team2 ? team2.nama_tim : 'TBD (BYE)'}
                      </span>
                      <span className="text-slate-300">-</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quarterfinals */}
            <div className="flex flex-col justify-around w-56 shrink-0 relative">
              <div className="absolute -top-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-center w-full">Quarterfinals</div>
              {Array(4).fill(0).map((_, i) => (
                <div key={`qf-${i}`} className="w-full bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden flex flex-col text-xs relative z-10">
                  <div className="px-3 py-2 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <span className="font-semibold text-slate-400">TBD</span>
                    <span className="text-slate-300">-</span>
                  </div>
                  <div className="px-3 py-2 flex justify-between items-center bg-white">
                    <span className="font-semibold text-slate-400">TBD</span>
                    <span className="text-slate-300">-</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Semifinals */}
            <div className="flex flex-col justify-around w-56 shrink-0 relative">
              <div className="absolute -top-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-center w-full">Semifinals</div>
              {Array(2).fill(0).map((_, i) => (
                <div key={`sf-${i}`} className="w-full bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden flex flex-col text-xs relative z-10">
                  <div className="px-3 py-2 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <span className="font-semibold text-slate-400">TBD</span>
                    <span className="text-slate-300">-</span>
                  </div>
                  <div className="px-3 py-2 flex justify-between items-center bg-white">
                    <span className="font-semibold text-slate-400">TBD</span>
                    <span className="text-slate-300">-</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Final */}
            <div className="flex flex-col justify-around w-56 shrink-0 relative">
              <div className="absolute -top-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-center w-full">Grand Final</div>
              <div className="w-full bg-white border border-amber-300 shadow-md rounded-lg overflow-hidden flex flex-col text-xs relative z-10">
                <div className="bg-amber-100 text-amber-700 text-[10px] font-bold text-center py-1 uppercase tracking-wider">Final Match</div>
                <div className="px-3 py-2 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <span className="font-semibold text-slate-400">TBD</span>
                  <span className="text-slate-300">-</span>
                </div>
                <div className="px-3 py-2 flex justify-between items-center bg-white">
                  <span className="font-semibold text-slate-400">TBD</span>
                  <span className="text-slate-300">-</span>
                </div>
              </div>
            </div>

            {/* Winner */}
            <div className="flex flex-col justify-center w-56 shrink-0 relative pl-4">
              <div className="p-4 bg-gradient-to-r from-amber-100 to-amber-50 border border-amber-200 rounded-xl flex flex-col items-center justify-center gap-2 shadow-sm text-center">
                <Trophy className="w-8 h-8 text-amber-500 mb-1" />
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Champion</span>
                <span className="font-bold text-slate-800 text-lg">TBD</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
