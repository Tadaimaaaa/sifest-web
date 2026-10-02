"use client";

import { useState, useEffect } from "react";
import { Package, Plus, Search, Edit3, Trash2, X, AlertCircle, HardHat, FileText, CheckCircle2, ChevronRight, Info } from "lucide-react";
import { toast } from "sonner";
import FullPageLoader from "@/components/FullPageLoader";
import { getEquipments, saveEquipment, deleteEquipment } from "./actions";

type Equipment = {
  id: string;
  name: string;
  category: string;
  total_quantity: number;
  borrowed_quantity: number;
  condition: string;
  pic: string;
  notes: string;
};

export default function PerlengkapanPage() {
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Semua");
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Equipment>>({
    name: "", category: "Logistik", total_quantity: 0, borrowed_quantity: 0, condition: "Baik", pic: "", notes: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const res = await getEquipments();
    if (res.success && res.data) {
      setEquipments(res.data);
    } else if (res.error) {
      toast.error(res.error);
    }
    setIsLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const res = await saveEquipment(formData);
    if (res.success) {
      toast.success("Data perlengkapan berhasil disimpan!");
      setIsModalOpen(false);
      fetchData();
    } else {
      toast.error(res.error || "Gagal menyimpan data.");
    }
    setIsSaving(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus data perlengkapan "${name}"?`)) return;
    
    const res = await deleteEquipment(id);
    if (res.success) {
      toast.success("Data berhasil dihapus!");
      fetchData();
    } else {
      toast.error(res.error || "Gagal menghapus data.");
    }
  };

  const openModal = (item?: Equipment) => {
    if (item) {
      setFormData(item);
    } else {
      setFormData({ name: "", category: "Logistik", total_quantity: 1, borrowed_quantity: 0, condition: "Baik", pic: "", notes: "" });
    }
    setIsModalOpen(true);
  };

  const categories = ["Semua", "Logistik", "Kelistrikan", "Mebel", "Elektronik", "Dekorasi", "ATK", "Lainnya"];
  
  const filteredData = equipments.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                          (item.pic || "").toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "Semua" || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalItems = equipments.reduce((acc, curr) => acc + curr.total_quantity, 0);
  const totalBorrowed = equipments.reduce((acc, curr) => acc + curr.borrowed_quantity, 0);
  const totalBroken = equipments.filter(item => item.condition.includes("Rusak")).length;

  if (isLoading) return <FullPageLoader message="Memuat data logistik..." />;

  const isDummy = equipments.length > 0 && equipments[0].id.startsWith('dummy');

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-600" />
            Data Perlengkapan
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manajemen inventaris, logistik, dan peminjaman barang SI FEST.</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 shadow-sm shadow-blue-500/20 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" /> Tambah Barang
        </button>
      </div>

      {isDummy && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-amber-800">Mode Pratinjau (Data Dummy)</h3>
            <p className="text-xs text-amber-700 mt-1">Tabel <b>equipments</b> belum tersedia di Supabase. Data yang ditampilkan ini hanya pratinjau. Hubungi pengembang untuk menjalankan file migrasi database.</p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
            <Package className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Barang</p>
            <p className="text-2xl font-bold text-slate-800">{totalItems}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center">
            <HardHat className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Sedang Dipinjam / Digunakan</p>
            <p className="text-2xl font-bold text-slate-800">{totalBorrowed}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-rose-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Terdapat Kerusakan</p>
            <p className="text-2xl font-bold text-slate-800">{totalBroken}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50/50">
          <div className="relative w-full md:w-80">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Cari nama barang atau PIC..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  categoryFilter === cat 
                    ? "bg-slate-800 text-white" 
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-white border-b-2 border-slate-100 text-slate-500">
                <th className="py-4 px-6 font-semibold">Nama Barang</th>
                <th className="py-4 px-6 font-semibold text-center">Stok</th>
                <th className="py-4 px-6 font-semibold">Peminjam / PIC</th>
                <th className="py-4 px-6 font-semibold">Kondisi</th>
                <th className="py-4 px-6 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length > 0 ? filteredData.map(item => {
                const sisa = item.total_quantity - item.borrowed_quantity;
                return (
                  <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-800">{item.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-500 font-medium px-2 py-0.5 bg-slate-100 rounded-md">{item.category}</span>
                        {item.notes && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1" title={item.notes}>
                            <FileText className="w-3 h-3" /> Catatan
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center gap-3">
                        <div className="text-center">
                          <div className="text-lg font-black text-slate-800">{item.total_quantity}</div>
                          <div className="text-[10px] font-bold uppercase text-slate-400">Total</div>
                        </div>
                        <div className="w-px h-8 bg-slate-200"></div>
                        <div className="text-center">
                          <div className="text-lg font-black text-amber-600">{item.borrowed_quantity}</div>
                          <div className="text-[10px] font-bold uppercase text-amber-500/70">Keluar</div>
                        </div>
                        <div className="w-px h-8 bg-slate-200"></div>
                        <div className="text-center">
                          <div className={`text-lg font-black ${sisa > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>{sisa}</div>
                          <div className={`text-[10px] font-bold uppercase ${sisa > 0 ? 'text-emerald-500/70' : 'text-slate-400'}`}>Sisa</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {item.borrowed_quantity > 0 ? (
                        <div>
                          <div className="font-semibold text-slate-700 flex items-center gap-1.5">
                            <HardHat className="w-3.5 h-3.5 text-slate-400" /> {item.pic || "Tidak diketahui"}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-xs">- Tersedia di Gudang -</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex px-2.5 py-1 text-xs font-bold rounded-lg ${
                        item.condition === 'Baik' ? 'bg-emerald-100 text-emerald-700' :
                        item.condition.includes('Rusak') ? 'bg-rose-100 text-rose-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {item.condition}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openModal(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(item.id, item.name)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Hapus">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                      <Package className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-slate-500 font-medium">Tidak ada data perlengkapan ditemukan.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                {formData.id ? 'Edit Perlengkapan' : 'Tambah Perlengkapan'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6">
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nama Barang *</label>
                  <input 
                    type="text" required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="Contoh: Tenda Sarnafil"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Kategori</label>
                    <select 
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                      {categories.filter(c => c !== "Semua").map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Kondisi Fisik</label>
                    <select 
                      value={formData.condition}
                      onChange={(e) => setFormData({...formData, condition: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                      <option value="Baik">Baik</option>
                      <option value="Kurang Baik">Kurang Baik</option>
                      <option value="Rusak Ringan">Rusak Ringan</option>
                      <option value="Rusak Berat">Rusak Berat</option>
                      <option value="Hilang">Hilang</option>
                    </select>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-blue-900 mb-1.5">Total Keseluruhan</label>
                      <div className="flex items-center">
                        <button type="button" onClick={() => setFormData({...formData, total_quantity: Math.max(1, (formData.total_quantity||0) - 1)})} className="w-10 h-10 bg-white border border-blue-200 rounded-l-xl text-blue-600 font-bold hover:bg-blue-100">-</button>
                        <input type="number" min="1" value={formData.total_quantity} onChange={(e) => setFormData({...formData, total_quantity: parseInt(e.target.value)||0})} className="w-full h-10 text-center border-y border-blue-200 bg-white focus:outline-none font-bold text-slate-800" />
                        <button type="button" onClick={() => setFormData({...formData, total_quantity: (formData.total_quantity||0) + 1})} className="w-10 h-10 bg-white border border-blue-200 rounded-r-xl text-blue-600 font-bold hover:bg-blue-100">+</button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-blue-900 mb-1.5">Sedang Keluar/Dipinjam</label>
                      <div className="flex items-center">
                        <button type="button" onClick={() => setFormData({...formData, borrowed_quantity: Math.max(0, (formData.borrowed_quantity||0) - 1)})} className="w-10 h-10 bg-white border border-blue-200 rounded-l-xl text-amber-600 font-bold hover:bg-blue-100">-</button>
                        <input type="number" min="0" value={formData.borrowed_quantity} onChange={(e) => setFormData({...formData, borrowed_quantity: parseInt(e.target.value)||0})} className="w-full h-10 text-center border-y border-blue-200 bg-white focus:outline-none font-bold text-amber-700" />
                        <button type="button" onClick={() => setFormData({...formData, borrowed_quantity: (formData.borrowed_quantity||0) + 1})} className="w-10 h-10 bg-white border border-blue-200 rounded-r-xl text-amber-600 font-bold hover:bg-blue-100">+</button>
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-blue-600/80 mt-3 flex items-center gap-1.5"><Info className="w-3 h-3" /> Sisa di gudang akan otomatis dihitung.</p>
                </div>

                {(formData.borrowed_quantity || 0) > 0 && (
                  <div className="animate-in fade-in zoom-in-95 duration-200">
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Peminjam / PIC Barang Keluar</label>
                    <input 
                      type="text"
                      value={formData.pic}
                      onChange={(e) => setFormData({...formData, pic: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-amber-300 focus:border-amber-500 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      placeholder="Contoh: Divisi Keamanan / Tenant A1"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Catatan Tambahan (Opsional)</label>
                  <textarea 
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                    placeholder="Informasi vendor sewa, tanggal pengembalian, dll."
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 mt-6 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm shadow-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? "Menyimpan..." : <><CheckCircle2 className="w-4 h-4" /> Simpan Data</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
