"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, CalendarDays, Info, Activity, Save, Edit3, X } from "lucide-react";
import { SCRIPT_URL } from "@/lib/api";
import Cookies from "js-cookie";
import { toast } from "sonner";
import FullPageLoader from "@/components/FullPageLoader";

const EVENTS_META = {
  "mtq": { name: "MTQ", color: "from-indigo-500 to-indigo-700", bg: "bg-indigo-50", text: "text-indigo-600", role: "ROLE-010" },
  "seminar": { name: "Seminar Nasional", color: "from-blue-500 to-blue-700", bg: "bg-blue-50", text: "text-blue-600", role: "ROLE-011" },
  "futsal": { name: "Futsal Competition", color: "from-green-500 to-emerald-700", bg: "bg-emerald-50", text: "text-emerald-600", role: "ROLE-012" },
  "esport": { name: "E-Sport Competition", color: "from-rose-500 to-pink-700", bg: "bg-rose-50", text: "text-rose-600", role: "ROLE-013" },
  "bazaar": { name: "Bazaar", color: "from-amber-500 to-orange-700", bg: "bg-amber-50", text: "text-amber-600", role: "ROLE-014" }
};

type EventData = {
  id_event: string;
  nama_event: string;
  tanggal: string;
  tempat: string;
  deskripsi: string;
  status: string;
};

export default function EventDetailPage() {
  const params = useParams();
  const id = params.id as keyof typeof EVENTS_META;
  const router = useRouter();
  
  const [currentUserRole, setCurrentUserRole] = useState("ROLE-001");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const [eventData, setEventData] = useState<EventData>({
    id_event: id,
    nama_event: EVENTS_META[id]?.name || "Unknown Event",
    tanggal: "",
    tempat: "",
    deskripsi: "",
    status: "Akan Datang"
  });

  const [formData, setFormData] = useState<EventData>(eventData);

  const meta = EVENTS_META[id];

  useEffect(() => {
    if (!meta) {
      router.push("/event");
      return;
    }

    const userDataStr = Cookies.get("user_data");
    if (userDataStr) {
      const user = JSON.parse(userDataStr);
      setCurrentUserRole(user.role_id || user.role || "ROLE-004");
    }

    fetchEventData();
  }, [id, router, meta]);

  const fetchEventData = async () => {
    setIsLoading(true);
    try {
      const token = Cookies.get("session_token");
      const res = await fetch(`${SCRIPT_URL}?action=getEvent&id_event=${id}&token=${token}`);
      const data = await res.json();
      
      if (data.success && data.data) {
        setEventData(data.data);
        setFormData(data.data);
      }
    } catch (error) {
      console.error("Gagal memuat data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const hasAccess = ["ROLE-001", "SUPER_ADMIN", meta?.role].includes(currentUserRole);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasAccess) {
      toast.error("Anda tidak memiliki akses untuk mengubah data ini.");
      return;
    }

    setIsSaving(true);
    try {
      const token = Cookies.get("session_token");
      const payload = {
        action: "saveEvent",
        token,
        ...formData
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
      toast.error("Terjadi kesalahan jaringan.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!meta) return null;
  if (isLoading) return <FullPageLoader message="Memuat informasi event..." fullScreen={false} />;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/event" className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{meta.name}</h1>
          <p className="text-sm text-slate-500">Informasi Umum Event</p>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
        {/* Decorative Banner */}
        <div className={`h-24 bg-gradient-to-r ${meta.color} opacity-90 relative overflow-hidden`}>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
        </div>
        
        {/* Profile / Content */}
        <div className="p-6 sm:p-8 relative">
          <div className="flex justify-between items-start mb-6">
            <div className={`-mt-16 w-20 h-20 rounded-2xl ${meta.bg} border-4 border-white shadow-lg flex items-center justify-center relative z-10`}>
              <Activity className={`w-8 h-8 ${meta.text}`} />
            </div>
            
            {hasAccess && !isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-sm font-semibold transition-colors"
              >
                <Edit3 className="w-4 h-4" /> Edit Info
              </button>
            )}
          </div>

          {!isEditing ? (
            // View Mode
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
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2"><Info className="w-3.5 h-3.5" /> Deskripsi Event</label>
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                  <p className="text-slate-700 whitespace-pre-wrap text-sm leading-relaxed">
                    {eventData.deskripsi || "Belum ada deskripsi untuk event ini."}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            // Edit Mode
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tanggal Pelaksanaan</label>
                  <input 
                    type="date" 
                    value={formData.tanggal}
                    onChange={(e) => setFormData({...formData, tanggal: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tempat / Lokasi</label>
                  <input 
                    type="text" 
                    value={formData.tempat}
                    onChange={(e) => setFormData({...formData, tempat: e.target.value})}
                    placeholder="Contoh: GOR UNP"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Status Event</label>
                  <select 
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="Akan Datang">Akan Datang</option>
                    <option value="Sedang Berlangsung">Sedang Berlangsung</option>
                    <option value="Selesai">Selesai</option>
                    <option value="Batal">Batal</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Deskripsi Singkat</label>
                  <textarea 
                    rows={4}
                    value={formData.deskripsi}
                    onChange={(e) => setFormData({...formData, deskripsi: e.target.value})}
                    placeholder="Tuliskan deskripsi atau catatan mengenai event ini..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setFormData(eventData);
                  }}
                  className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm shadow-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? <FullPageLoader message="" fullScreen={false} /> : <Save className="w-4 h-4" />}
                  Simpan Perubahan
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
