"use client";

import { useState, useEffect } from "react";
import { 
  Users, Calendar, Clock, MapPin, Search, Plus, Loader2, ArrowLeft, ArrowUpDown, ChevronDown, Edit3, X, Save
} from "lucide-react";
import Link from "next/link";
import Cookies from "js-cookie";
import { toast } from "sonner";
import { getSeminarRegistrations } from "./actions";
import { SCRIPT_URL } from "@/lib/api";

// Types based on Apps Script Event output
interface EventData {
  id: string;
  nama: string;
  kategori: string;
  deskripsi: string;
  tanggal: string;
  waktu?: string;
  lokasi?: string;
  tempat?: string;
  harga?: string;
  status: string;
  kuota: string;
}

// Types based on Supabase registrations
interface Participant {
  id_peserta: string;
  nama_lengkap: string;
  institusi: string;
  email: string;
  kontak: string;
  status_bayar: string;
  created_at?: string;
}

export default function SeminarDashboard() {
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [eventData, setEventData] = useState<EventData | null>(null);
  
  // Participant State
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<EventData>({
    id: "seminar",
    nama: "Seminar Nasional",
    kategori: "Seminar",
    deskripsi: "",
    tanggal: "",
    status: "Akan Datang",
    kuota: ""
  });

  useEffect(() => {
    const role = Cookies.get("user_role");
    if (role) setCurrentUserRole(role);
    fetchData();
  }, []);

  const hasAccess = ["ROLE-001", "SUPER_ADMIN", "ROLE-011"].includes(currentUserRole);

  const fetchData = async () => {
    // 1. Fetch Event Info
    try {
      const resEvent = await fetch(`${SCRIPT_URL}?action=getEvent&id_event=seminar`);
      const dataEvent = await resEvent.json();
      if (dataEvent.success && dataEvent.data) {
        setEventData(dataEvent.data);
        setFormData(dataEvent.data);
      }
    } catch (error) {
      console.error("Gagal mengambil info event seminar:", error);
    }

    // 2. Fetch Participants from Supabase (Official Web Registrations)
    try {
      const dataParticipants = await getSeminarRegistrations();
      if (dataParticipants.success && dataParticipants.data) {
        setParticipants(dataParticipants.data);
        setErrorMessage(null);
      } else {
        setErrorMessage(dataParticipants.message || "Gagal memuat data pendaftar seminar");
        toast.error(dataParticipants.message || "Gagal memuat data pendaftar seminar");
      }
    } catch (error: any) {
      setErrorMessage(error.message || "Terjadi kesalahan sistem");
      console.error("Gagal mengambil data peserta seminar:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter participants
  const filteredParticipants = participants.filter(p => 
    p.nama_lengkap.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.institusi.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch(status?.toLowerCase()) {
      case 'lunas': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'dp': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-rose-100 text-rose-700 border-rose-200';
    }
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;
    setIsSaving(true);
    try {
      const token = Cookies.get("session_token");
      const payload = {
        action: "saveEvent",
        token,
        id_event: "seminar",
        nama_event: "Seminar Nasional",
        tanggal: formData.tanggal,
        tempat: formData.tempat || formData.lokasi,
        deskripsi: formData.deskripsi,
        status: formData.status
      };

      const res = await fetch(`${SCRIPT_URL}?action=saveEvent`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success("Informasi event berhasil diperbarui!");
        setEventData(formData);
        setIsEditing(false);
      } else {
        toast.error(data.message || "Gagal menyimpan data.");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan saat menyimpan data.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!hasAccess && currentUserRole) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <Users className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Akses Ditolak</h2>
          <p className="text-slate-500 max-w-md">Anda tidak memiliki izin untuk mengakses dashboard ini.</p>
          <Link href="/dashboard" className="inline-block mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors">
            Kembali ke Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link 
            href="/event"
            className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
              Seminar Nasional
              {isLoading && <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Kelola data peserta Seminar Nasional SI FEST 2026
            </p>
          </div>
        </div>
        
        {hasAccess && (
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors text-sm font-medium shadow-sm">
              <Plus className="w-4 h-4" />
              <span>Tambah Manual</span>
            </button>
          </div>
        )}
      </div>

      {/* Info Cards */}
      <div className="relative">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-800">Informasi Event</h2>
          {hasAccess && (
            <button 
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-sm font-semibold transition-colors"
            >
              <Edit3 className="w-4 h-4" /> Ubah Info
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-50 rounded-full group-hover:scale-150 transition-transform duration-500" />
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
                <Users className="w-5 h-5" />
              </div>
              <p className="text-sm text-slate-500 font-medium">Total Peserta</p>
              <div className="flex items-baseline gap-2 mt-1">
                <h3 className="text-2xl font-bold text-slate-800">{participants.length}</h3>
                {eventData?.kuota && <span className="text-xs text-slate-400">/ {eventData.kuota}</span>}
              </div>
            </div>
          </div>
          
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3">
              <Calendar className="w-5 h-5" />
            </div>
            <p className="text-sm text-slate-500 font-medium">Tanggal Pelaksanaan</p>
            <h3 className="text-base font-bold text-slate-800 mt-1">{eventData?.tanggal || "26 Oktober 2026"}</h3>
          </div>
          
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center mb-3">
              <Clock className="w-5 h-5" />
            </div>
            <p className="text-sm text-slate-500 font-medium">Waktu (Default)</p>
            <h3 className="text-base font-bold text-slate-800 mt-1">08:00 - Selesai</h3>
          </div>
          
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-fuchsia-100 text-fuchsia-600 flex items-center justify-center mb-3">
              <MapPin className="w-5 h-5" />
            </div>
            <p className="text-sm text-slate-500 font-medium">Lokasi / Tempat</p>
            <h3 className="text-base font-bold text-slate-800 mt-1 truncate" title={eventData?.tempat || eventData?.lokasi || "UPI Convention Center"}>
              {eventData?.tempat || eventData?.lokasi || "UPI Convention Center"}
            </h3>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Daftar Peserta</h2>
              <p className="text-xs text-slate-500">{participants.length} Peserta Terdaftar (Data sinkron dengan Pendaftar Official Web)</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                placeholder="Cari nama atau instansi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-full sm:w-64 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 font-semibold tracking-wider">
                  <div className="flex items-center gap-2 cursor-pointer hover:text-slate-800">
                    NAMA LENGKAP
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-6 py-4 font-semibold tracking-wider">INSTITUSI / ASAL</th>
                <th className="px-6 py-4 font-semibold tracking-wider">EMAIL</th>
                <th className="px-6 py-4 font-semibold tracking-wider">KONTAK WA</th>
                <th className="px-6 py-4 font-semibold tracking-wider">STATUS BAYAR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                      <p className="text-slate-500 text-sm">Memuat data peserta dari server...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredParticipants.length > 0 ? (
                filteredParticipants.map((p, index) => (
                  <tr 
                    key={p.id_peserta || index} 
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">{p.nama_lengkap}</div>
                      <div className="text-xs text-slate-400 mt-0.5">ID: {p.id_peserta}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-slate-600">{p.institusi}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-slate-600">{p.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-slate-600">{p.kontak}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${getStatusColor(p.status_bayar)}`}>
                        {p.status_bayar}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4">
                      <Users className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-slate-800 font-semibold mb-1">Belum ada peserta (atau Gagal Memuat)</h3>
                    <p className="text-sm text-slate-500 mb-2">Jika seharusnya ada peserta, pastikan Environment Variable Vercel sudah benar.</p>
                    {errorMessage && (
                      <div className="bg-rose-50 text-rose-600 text-xs p-3 rounded-lg border border-rose-100 max-w-md mx-auto text-left whitespace-pre-wrap">
                        <span className="font-bold block mb-1">Pesan Error Sistem:</span>
                        {errorMessage}
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">Ubah Info Event</h3>
              <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveEvent} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tanggal Pelaksanaan</label>
                <input 
                  type="text" 
                  value={formData.tanggal || ''}
                  onChange={(e) => setFormData({...formData, tanggal: e.target.value})}
                  placeholder="Contoh: 26 Oktober 2026"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tempat / Lokasi</label>
                <input 
                  type="text" 
                  value={formData.tempat || formData.lokasi || ''}
                  onChange={(e) => setFormData({...formData, tempat: e.target.value, lokasi: e.target.value})}
                  placeholder="Contoh: UPI Convention Center"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Status Event</label>
                <select 
                  value={formData.status || 'Akan Datang'}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="Akan Datang">Akan Datang</option>
                  <option value="Sedang Berlangsung">Sedang Berlangsung</option>
                  <option value="Selesai">Selesai</option>
                </select>
              </div>

              <div className="pt-4 mt-6 border-t border-slate-100 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-70"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
