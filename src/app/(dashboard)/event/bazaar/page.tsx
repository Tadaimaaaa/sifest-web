"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Store, Save, Edit3, X, User, Phone, Tag, CheckCircle2, MapPin, CalendarDays, Info, Activity } from "lucide-react";
import { SCRIPT_URL } from "@/lib/api";
import Cookies from "js-cookie";
import { toast } from "sonner";
import FullPageLoader from "@/components/FullPageLoader";

type Tenant = {
  id_tenda: string;
  nama_brand: string;
  pic: string;
  kontak: string;
  kategori: string;
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

// Layout Konfigurasi berdasarkan sketsa (Total 30 Tenda)
const layoutConfig = {
  blokA: Array.from({ length: 8 }, (_, i) => `A${i + 1}`), // Atas (8)
  blokC: ["C1", "C2"], // Kiri (2)
  blokD: Array.from({ length: 6 }, (_, i) => `D${i + 1}`), // Tengah Atas (6)
  blokE: Array.from({ length: 6 }, (_, i) => `E${i + 1}`), // Tengah Bawah (6)
  blokB: Array.from({ length: 8 }, (_, i) => `B${i + 1}`), // Bawah (8)
};

export default function BazaarDashboard() {
  const [currentUserRole, setCurrentUserRole] = useState("ROLE-001");
  const [isLoading, setIsLoading] = useState(true);
  
  // EVENT STATE
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [eventData, setEventData] = useState<EventData>({
    id_event: "bazaar",
    nama_event: "Bazaar",
    tanggal: "",
    tempat: "",
    deskripsi: "",
    status: "Akan Datang"
  });
  const [formDataEvent, setFormDataEvent] = useState<EventData>(eventData);

  // BAZAAR TENANTS STATE
  const [tenants, setTenants] = useState<Record<string, Tenant>>({});
  const [selectedTenda, setSelectedTenda] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSavingTenant, setIsSavingTenant] = useState(false);
  const [formDataTenant, setFormDataTenant] = useState<Tenant>({
    id_tenda: "",
    nama_brand: "",
    pic: "",
    kontak: "",
    kategori: "Makanan",
    status_bayar: "Belum Bayar"
  });

  useEffect(() => {
    const userDataStr = Cookies.get("user_data");
    if (userDataStr) {
      const user = JSON.parse(userDataStr);
      setCurrentUserRole(user.role_id || user.role || "ROLE-004");
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = Cookies.get("session_token");
      
      const [resEvent, resTenants] = await Promise.all([
        fetch(`${SCRIPT_URL}?action=getEvent&id_event=bazaar&token=${token}`).catch(() => null),
        fetch(`${SCRIPT_URL}?action=getBazaarTenants&token=${token}`).catch(() => null)
      ]);
      
      if (resEvent) {
        const dataEvent = await resEvent.json();
        if (dataEvent.success && dataEvent.data) {
          setEventData(dataEvent.data);
          setFormDataEvent(dataEvent.data);
        }
      }

      if (resTenants) {
        const dataTenants = await resTenants.json();
        if (dataTenants.success && dataTenants.data) {
          const tenantMap: Record<string, Tenant> = {};
          dataTenants.data.forEach((t: Tenant) => {
            tenantMap[t.id_tenda] = t;
          });
          setTenants(tenantMap);
        }
      }
    } catch (error) {
      console.error("Gagal memuat data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const hasAccess = ["ROLE-001", "SUPER_ADMIN", "ROLE-014"].includes(currentUserRole);

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasAccess) {
      toast.error("Anda tidak memiliki akses untuk mengubah data ini.");
      return;
    }

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
        toast.error(data.message || "Gagal menyimpan data.");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan jaringan.");
    } finally {
      setIsSavingEvent(false);
    }
  };

  const handleSaveTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasAccess) {
      toast.error("Anda tidak memiliki akses untuk mengubah data ini.");
      return;
    }

    setIsSavingTenant(true);
    try {
      const token = Cookies.get("session_token");
      const payload = { action: "saveBazaarTenant", token, ...formDataTenant };

      const res = await fetch(`${SCRIPT_URL}?action=saveBazaarTenant`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success(`Data tenant tenda ${formDataTenant.id_tenda} berhasil disimpan!`);
        if (formDataTenant.status_bayar === "Kosong") {
          const newTenants = { ...tenants };
          delete newTenants[formDataTenant.id_tenda];
          setTenants(newTenants);
        } else {
          setTenants(prev => ({ ...prev, [formDataTenant.id_tenda]: formDataTenant }));
        }
        setIsModalOpen(false);
      } else {
        toast.error(data.message || "Gagal menyimpan data.");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan jaringan.");
    } finally {
      setIsSavingTenant(false);
    }
  };

  const handleTendaClick = (id_tenda: string) => {
    setSelectedTenda(id_tenda);
    const existingData = tenants[id_tenda];
    
    if (existingData) {
      setFormDataTenant(existingData);
    } else {
      setFormDataTenant({
        id_tenda,
        nama_brand: "",
        pic: "",
        kontak: "",
        kategori: "Makanan",
        status_bayar: "Belum Bayar"
      });
    }
    setIsModalOpen(true);
  };

  const getTendaColor = (id_tenda: string) => {
    const data = tenants[id_tenda];
    if (!data) return "bg-white border-slate-300 text-slate-500 hover:bg-slate-50 hover:border-slate-400"; // Kosong (Tersedia)
    
    if (data.kategori === "Sponsor/Corporate") return "bg-amber-50 border-amber-400 text-amber-700 shadow-sm shadow-amber-500/20";
    if (data.kategori === "Panitia/Internal") return "bg-purple-50 border-purple-400 text-purple-700 shadow-sm shadow-purple-500/20";
    
    if (data.status_bayar === "Lunas") return "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm shadow-emerald-500/20";
    if (data.status_bayar === "DP") return "bg-blue-50 border-blue-400 text-blue-700 shadow-sm shadow-blue-500/20";
    return "bg-rose-50 border-rose-400 text-rose-700 shadow-sm shadow-rose-500/20"; // Belum Bayar
  };

  const TendaBox = ({ id }: { id: string }) => {
    const isOccupied = !!tenants[id];
    return (
      <button 
        onClick={() => handleTendaClick(id)}
        className={`relative w-full aspect-square md:aspect-auto md:h-16 flex flex-col items-center justify-center rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 overflow-hidden ${getTendaColor(id)} group`}
      >
        <span className="text-xs md:text-sm font-black z-10">{id}</span>
        {isOccupied && (
          <span className="text-[8px] md:text-[10px] font-semibold opacity-80 mt-0.5 truncate w-full px-1 z-10">
            {tenants[id].nama_brand}
          </span>
        )}
        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity z-0" />
      </button>
    );
  };

  if (isLoading) return <FullPageLoader message="Memuat informasi bazaar..." fullScreen={false} />;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
      {/* Header Utama */}
      <div className="flex items-center gap-4">
        <Link href="/event" className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            Bazaar
          </h1>
          <p className="text-sm text-slate-500">Informasi Umum Event</p>
        </div>
      </div>

      {/* SECTION 1: Informasi Umum Event */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
        <div className="h-24 bg-gradient-to-r from-amber-500 to-orange-700 opacity-90 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
        </div>
        
        <div className="p-6 sm:p-8 relative">
          <div className="flex justify-between items-start mb-6">
            <div className="-mt-16 w-20 h-20 rounded-2xl bg-amber-50 border-4 border-white shadow-lg flex items-center justify-center relative z-10">
              <Store className="w-8 h-8 text-amber-600" />
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
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2"><Info className="w-3.5 h-3.5" /> Deskripsi Event</label>
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                  <p className="text-slate-700 whitespace-pre-wrap text-sm leading-relaxed">
                    {eventData.deskripsi || "Belum ada deskripsi untuk event ini."}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSaveEvent} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tanggal Pelaksanaan</label>
                  <input 
                    type="date" 
                    value={formDataEvent.tanggal}
                    onChange={(e) => setFormDataEvent({...formDataEvent, tanggal: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tempat / Lokasi</label>
                  <input 
                    type="text" 
                    value={formDataEvent.tempat}
                    onChange={(e) => setFormDataEvent({...formDataEvent, tempat: e.target.value})}
                    placeholder="Contoh: Lapangan Parkir"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Status Event</label>
                  <select 
                    value={formDataEvent.status}
                    onChange={(e) => setFormDataEvent({...formDataEvent, status: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
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
                    value={formDataEvent.deskripsi}
                    onChange={(e) => setFormDataEvent({...formDataEvent, deskripsi: e.target.value})}
                    placeholder="Tuliskan deskripsi atau catatan mengenai event ini..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => {
                    setIsEditingEvent(false);
                    setFormDataEvent(eventData);
                  }}
                  className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  disabled={isSavingEvent}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-xl shadow-sm shadow-amber-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isSavingEvent ? <FullPageLoader message="" fullScreen={false} /> : <Save className="w-4 h-4" />}
                  Simpan Perubahan
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* SECTION 2: Denah Tenda Bazaar */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap px-1">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Store className="w-5 h-5 text-amber-500" />
              Denah Tenda Bazaar
            </h2>
            <p className="text-sm text-slate-500 mt-1">Klik pada kotak tenda untuk melihat atau mengatur penyewa.</p>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-xs font-semibold text-slate-600 flex-wrap">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-white border-2 border-slate-300" /> Kosong</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-rose-50 border-2 border-rose-400" /> Booked</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-blue-50 border-2 border-blue-400" /> DP</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-emerald-50 border-2 border-emerald-500" /> Lunas</div>
            <div className="w-px h-4 bg-slate-200 mx-1"></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-amber-50 border-2 border-amber-400" /> Sponsor</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-purple-50 border-2 border-purple-400" /> Panitia</div>
          </div>
        </div>

        {/* Interactive Map Area */}
        <div className="bg-slate-50 p-4 md:p-8 rounded-3xl border-2 border-red-500/30 shadow-inner relative overflow-x-auto">
          <div className="min-w-[800px]">
            <div className="flex flex-col gap-4 max-w-5xl mx-auto">
              {/* Top Row (Blok A) */}
              <div className="grid grid-cols-8 gap-2 md:gap-3">
                {layoutConfig.blokA.map(id => <TendaBox key={id} id={id} />)}
              </div>

              {/* Middle Section */}
              <div className="flex justify-between items-stretch h-36 md:h-44">
                {/* Left Column (Blok C) */}
                <div className="flex flex-col justify-between w-[calc(12.5%-8px)]">
                  {layoutConfig.blokC.map(id => <TendaBox key={id} id={id} />)}
                </div>

                {/* Center Island (Blok D & E) */}
                <div className="flex-1 mx-8 md:mx-12 flex flex-col justify-center gap-0 bg-slate-200/50 p-3 rounded-2xl border border-slate-200 border-dashed">
                  <div className="grid grid-cols-6 gap-2 md:gap-3 mb-1">
                    {layoutConfig.blokD.map(id => <TendaBox key={id} id={id} />)}
                  </div>
                  <div className="grid grid-cols-6 gap-2 md:gap-3 mt-1">
                    {layoutConfig.blokE.map(id => <TendaBox key={id} id={id} />)}
                  </div>
                </div>
                
                {/* Right spacer for alignment - Gapura Pintu Masuk */}
                <div className="w-[calc(12.5%-8px)] flex items-center justify-center relative">
                  <div className="absolute inset-y-4 -right-12 md:-right-20 w-24 flex flex-col items-center justify-center z-10">
                    {/* Desain Gapura */}
                    <div className="w-full h-full border-t-8 border-r-8 border-b-8 border-amber-600 rounded-r-3xl flex flex-col items-center justify-center bg-amber-50 shadow-inner shadow-amber-900/20 relative">
                      <div className="absolute -top-3 right-4 bg-amber-600 text-white text-[10px] font-black px-2 py-0.5 rounded shadow">PINTU</div>
                      <div className="absolute -bottom-3 right-4 bg-amber-600 text-white text-[10px] font-black px-2 py-0.5 rounded shadow">MASUK</div>
                      <ArrowLeft className="w-8 h-8 text-amber-500 animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Row (Blok B) */}
              <div className="grid grid-cols-8 gap-2 md:gap-3">
                {layoutConfig.blokB.map(id => <TendaBox key={id} id={id} />)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Tenant */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className={`p-6 border-b ${tenants[formDataTenant.id_tenda] ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100'} flex items-center justify-between`}>
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Store className="w-5 h-5 text-amber-500" />
                  Stand {formDataTenant.id_tenda}
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  {tenants[formDataTenant.id_tenda] ? "Informasi Tenant" : "Tenda ini masih tersedia. Daftarkan tenant baru."}
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveTenant} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5"><Tag className="w-4 h-4 text-slate-400" /> Nama Brand / Toko</label>
                <input 
                  type="text" 
                  required
                  value={formDataTenant.nama_brand}
                  onChange={(e) => setFormDataTenant({...formDataTenant, nama_brand: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  placeholder="Contoh: Es Teh Solo"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5"><User className="w-4 h-4 text-slate-400" /> PIC (Penyewa)</label>
                  <input 
                    type="text" 
                    required
                    value={formDataTenant.pic}
                    onChange={(e) => setFormDataTenant({...formDataTenant, pic: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    placeholder="Nama pemilik"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5"><Phone className="w-4 h-4 text-slate-400" /> No. WA</label>
                  <input 
                    type="text" 
                    required
                    value={formDataTenant.kontak}
                    onChange={(e) => setFormDataTenant({...formDataTenant, kontak: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    placeholder="0812xxx"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Kategori Jualan</label>
                  <select 
                    value={formDataTenant.kategori}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "Panitia/Internal") {
                        setFormDataTenant({
                          ...formDataTenant, 
                          kategori: val,
                          nama_brand: formDataTenant.nama_brand || "Panitia",
                          pic: formDataTenant.pic || "Internal",
                          kontak: formDataTenant.kontak || "-",
                          status_bayar: "Lunas"
                        });
                      } else {
                        setFormDataTenant({...formDataTenant, kategori: val});
                      }
                    }}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  >
                    <option value="Makanan">Makanan</option>
                    <option value="Minuman">Minuman</option>
                    <option value="Pakaian/Aksesoris">Pakaian/Aksesoris</option>
                    <option value="Sponsor/Corporate">Sponsor/Corporate</option>
                    <option value="Panitia/Internal">Panitia / Internal</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Status Pembayaran</label>
                  <select 
                    value={formDataTenant.status_bayar}
                    onChange={(e) => setFormDataTenant({...formDataTenant, status_bayar: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
                  >
                    <option value="Belum Bayar">Belum Bayar (Merah)</option>
                    <option value="DP">DP (Biru)</option>
                    <option value="Lunas">Lunas (Hijau)</option>
                  </select>
                </div>
              </div>

              {hasAccess && (
                <div className="flex justify-end gap-3 pt-6 mt-2 border-t border-slate-100">
                  {tenants[formDataTenant.id_tenda] && (
                    <button 
                      type="button"
                      onClick={() => {
                        if (confirm("Kosongkan data tenda ini?")) {
                          setFormDataTenant({...formDataTenant, nama_brand: "", pic: "", kontak: "", status_bayar: "Kosong"});
                        }
                      }}
                      className="px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                    >
                      Kosongkan Tenda
                    </button>
                  )}
                  <button 
                    type="submit"
                    disabled={isSavingTenant}
                    className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl shadow-sm shadow-amber-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSavingTenant ? "Menyimpan..." : <><Save className="w-4 h-4" /> Simpan Data</>}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
