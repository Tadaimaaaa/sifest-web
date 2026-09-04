"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Store, Save, Edit3, X, User, Phone, Tag, CheckCircle2 } from "lucide-react";
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

// Layout Konfigurasi berdasarkan sketsa
const layoutConfig = {
  blokA: Array.from({ length: 10 }, (_, i) => `A${i + 1}`), // Atas (10)
  blokC: ["C1", "C2"], // Kiri (2)
  blokD: Array.from({ length: 8 }, (_, i) => `D${i + 1}`), // Tengah Atas (8)
  blokE: Array.from({ length: 8 }, (_, i) => `E${i + 1}`), // Tengah Bawah (8)
  blokB: Array.from({ length: 10 }, (_, i) => `B${i + 1}`), // Bawah (10)
};

export default function BazaarDashboard() {
  const [currentUserRole, setCurrentUserRole] = useState("ROLE-001");
  const [isLoading, setIsLoading] = useState(true);
  const [tenants, setTenants] = useState<Record<string, Tenant>>({});
  
  const [selectedTenda, setSelectedTenda] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState<Tenant>({
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
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    setIsLoading(true);
    try {
      const token = Cookies.get("session_token");
      const res = await fetch(`${SCRIPT_URL}?action=getBazaarTenants&token=${token}`);
      const data = await res.json();
      
      if (data.success && data.data) {
        // Convert array to object mapped by id_tenda
        const tenantMap: Record<string, Tenant> = {};
        data.data.forEach((t: Tenant) => {
          tenantMap[t.id_tenda] = t;
        });
        setTenants(tenantMap);
      }
    } catch (error) {
      console.error("Gagal memuat data tenant:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const hasAccess = ["ROLE-001", "SUPER_ADMIN", "ROLE-014"].includes(currentUserRole);

  const handleTendaClick = (id_tenda: string) => {
    setSelectedTenda(id_tenda);
    const existingData = tenants[id_tenda];
    
    if (existingData) {
      setFormData(existingData);
    } else {
      setFormData({
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
        action: "saveBazaarTenant",
        token,
        ...formData
      };

      const res = await fetch(`${SCRIPT_URL}?action=saveBazaarTenant`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success(`Data tenant tenda ${formData.id_tenda} berhasil disimpan!`);
        setTenants(prev => ({ ...prev, [formData.id_tenda]: formData }));
        setIsModalOpen(false);
      } else {
        toast.error(data.message || "Gagal menyimpan data.");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan jaringan.");
    } finally {
      setIsSaving(false);
    }
  };

  const getTendaColor = (id_tenda: string) => {
    const data = tenants[id_tenda];
    if (!data) return "bg-white border-slate-300 text-slate-500 hover:bg-slate-50 hover:border-slate-400"; // Kosong (Tersedia)
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
        
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity z-0" />
      </button>
    );
  };

  if (isLoading) return <FullPageLoader message="Memuat denah bazaar..." fullScreen={false} />;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Link href="/event" className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <Store className="w-6 h-6 text-amber-500" />
              Denah Tenda Bazaar
            </h1>
            <p className="text-sm text-slate-500 mt-1">Klik pada kotak tenda untuk melihat atau mengatur data tenant penyewa.</p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-xs font-semibold text-slate-600">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-white border-2 border-slate-300" /> Kosong</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-rose-50 border-2 border-rose-400" /> Booked</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-blue-50 border-2 border-blue-400" /> DP</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-emerald-50 border-2 border-emerald-500" /> Lunas</div>
        </div>
      </div>

      {/* Interactive Map Area */}
      <div className="bg-slate-50 p-4 md:p-8 rounded-3xl border-2 border-red-500/30 shadow-inner relative overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Batas Merah (Border dari parent) */}
          
          <div className="flex flex-col gap-4 max-w-5xl mx-auto">
            {/* Top Row (Blok A) */}
            <div className="grid grid-cols-10 gap-2 md:gap-3">
              {layoutConfig.blokA.map(id => <TendaBox key={id} id={id} />)}
            </div>

            {/* Middle Section */}
            <div className="flex justify-between items-stretch h-36 md:h-44">
              {/* Left Column (Blok C) */}
              <div className="flex flex-col justify-between w-[calc(10%-8px)]">
                {layoutConfig.blokC.map(id => <TendaBox key={id} id={id} />)}
              </div>

              {/* Center Island (Blok D & E) */}
              <div className="flex-1 mx-8 md:mx-12 flex flex-col justify-center gap-0 bg-slate-200/50 p-3 rounded-2xl border border-slate-200 border-dashed">
                <div className="grid grid-cols-8 gap-2 md:gap-3 mb-1">
                  {layoutConfig.blokD.map(id => <TendaBox key={id} id={id} />)}
                </div>
                {/* Lorong antar island if any, or they are back to back */}
                <div className="grid grid-cols-8 gap-2 md:gap-3 mt-1">
                  {layoutConfig.blokE.map(id => <TendaBox key={id} id={id} />)}
                </div>
              </div>
              
              {/* Right spacer for alignment (since U shape opens to the right) */}
              <div className="w-[calc(10%-8px)] flex items-center justify-center opacity-50">
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pintu Masuk</p>
                  <ArrowRight className="w-6 h-6 text-slate-300 mx-auto mt-2" />
                </div>
              </div>
            </div>

            {/* Bottom Row (Blok B) */}
            <div className="grid grid-cols-10 gap-2 md:gap-3">
              {layoutConfig.blokB.map(id => <TendaBox key={id} id={id} />)}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Tenant */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className={`p-6 border-b ${tenants[formData.id_tenda] ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100'} flex items-center justify-between`}>
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Store className="w-5 h-5 text-amber-500" />
                  Stand {formData.id_tenda}
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  {tenants[formData.id_tenda] ? "Informasi Tenant" : "Tenda ini masih tersedia. Daftarkan tenant baru."}
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5"><Tag className="w-4 h-4 text-slate-400" /> Nama Brand / Toko</label>
                <input 
                  type="text" 
                  required
                  value={formData.nama_brand}
                  onChange={(e) => setFormData({...formData, nama_brand: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  placeholder="Contoh: Es Teh Solo"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5"><User className="w-4 h-4 text-slate-400" /> PIC (Penyewa)</label>
                  <input 
                    type="text" 
                    required
                    value={formData.pic}
                    onChange={(e) => setFormData({...formData, pic: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    placeholder="Nama pemilik"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5"><Phone className="w-4 h-4 text-slate-400" /> No. WA</label>
                  <input 
                    type="text" 
                    required
                    value={formData.kontak}
                    onChange={(e) => setFormData({...formData, kontak: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    placeholder="0812xxx"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Kategori Jualan</label>
                  <select 
                    value={formData.kategori}
                    onChange={(e) => setFormData({...formData, kategori: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  >
                    <option value="Makanan">Makanan</option>
                    <option value="Minuman">Minuman</option>
                    <option value="Pakaian/Aksesoris">Pakaian/Aksesoris</option>
                    <option value="Sponsor/Corporate">Sponsor/Corporate</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Status Pembayaran</label>
                  <select 
                    value={formData.status_bayar}
                    onChange={(e) => setFormData({...formData, status_bayar: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
                  >
                    <option value="Belum Bayar">Belum Bayar (Merah)</option>
                    <option value="DP">DP (Biru)</option>
                    <option value="Lunas">Lunas (Hijau)</option>
                  </select>
                </div>
              </div>

              {hasAccess && (
                <div className="flex justify-end gap-3 pt-6 mt-2 border-t border-slate-100">
                  {tenants[formData.id_tenda] && (
                    <button 
                      type="button"
                      onClick={() => {
                        // Kosongkan form untuk menghapus (atau panggil API hapus)
                        if (confirm("Kosongkan data tenda ini?")) {
                          setFormData({...formData, nama_brand: "", pic: "", kontak: "", status_bayar: "Kosong"});
                        }
                      }}
                      className="px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                    >
                      Kosongkan Tenda
                    </button>
                  )}
                  <button 
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl shadow-sm shadow-amber-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSaving ? "Menyimpan..." : <><Save className="w-4 h-4" /> Simpan Data</>}
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
