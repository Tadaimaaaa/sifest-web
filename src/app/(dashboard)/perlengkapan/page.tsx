"use client";

import { useState, useEffect } from "react";
import { Package, Plus, Search, Edit3, Trash2, X, Download, RotateCcw, CheckCircle2, DollarSign, Layers, Tag, Info } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import FullPageLoader from "@/components/FullPageLoader";
import { getEquipments, saveEquipment, deleteEquipment, EquipmentItem, INITIAL_EQUIPMENTS } from "./actions";

export default function PerlengkapanPage() {
  const [equipments, setEquipments] = useState<EquipmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Semua");
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<EquipmentItem>>({
    name: "", 
    category: "Perlengkapan Umum", 
    subCategory: "PERLENGKAPAN",
    vol: "1", 
    kuantitas: "Unit", 
    harga_satuan: 0, 
    jumlah_harga: 0, 
    keterangan: "-"
  });

  const LOCAL_STORAGE_KEY = "sifest_rab_logistik_data_v3";

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = () => {
    setIsLoading(true);
    try {
      if (typeof window !== "undefined") {
        const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (localData) {
          try {
            const parsed = JSON.parse(localData);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setEquipments(parsed);
              setIsLoading(false);
              return;
            }
          } catch (e) {}
        }
      }
    } catch (err) {}
    setEquipments(INITIAL_EQUIPMENTS);
    setIsLoading(false);
  };

  const handleResetToSpreadsheet = () => {
    if (!confirm("Apakah Anda yakin ingin menyinkronkan ulang data ke versi asli spreadsheet? Perubahan manual lokal akan direset.")) return;
    setEquipments(INITIAL_EQUIPMENTS);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_EQUIPMENTS));
    } catch (e) {}
    toast.success("Data berhasil disinkronkan kembali ke versi asli spreadsheet!");
  };

  const saveToLocalAndState = (updatedList: EquipmentItem[]) => {
    setEquipments(updatedList);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));
    } catch (e) {}
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      toast.error("Nama barang wajib diisi!");
      return;
    }

    setIsSaving(true);
    const numVol = typeof formData.vol === 'number' ? formData.vol : parseFloat(String(formData.vol)) || 0;
    const numHargaSatuan = Number(formData.harga_satuan) || 0;
    const calculatedJumlah = Number(formData.jumlah_harga) || (numVol * numHargaSatuan);

    const payload: EquipmentItem = {
      id: formData.id || `custom-${Date.now()}`,
      name: formData.name.trim(),
      category: formData.category || "Perlengkapan Umum",
      subCategory: formData.subCategory || "PERLENGKAPAN",
      vol: formData.vol || "-",
      kuantitas: formData.kuantitas || "-",
      harga_satuan: numHargaSatuan,
      jumlah_harga: calculatedJumlah,
      keterangan: formData.keterangan || "-"
    };

    if (formData.id) {
      const updated = equipments.map(item => item.id === formData.id ? payload : item);
      saveToLocalAndState(updated);
      await saveEquipment(payload);
      toast.success("Data barang berhasil diperbarui!");
    } else {
      const updated = [payload, ...equipments];
      saveToLocalAndState(updated);
      await saveEquipment(payload);
      toast.success("Barang baru berhasil ditambahkan!");
    }

    setIsSaving(false);
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus "${name}"?`)) return;
    
    const updated = equipments.filter(item => item.id !== id);
    saveToLocalAndState(updated);
    await deleteEquipment(id);
    toast.success("Data barang berhasil dihapus!");
  };

  const openModal = (item?: EquipmentItem) => {
    if (item) {
      setFormData(item);
    } else {
      setFormData({ 
        name: "", 
        category: categoryFilter !== "Semua" ? categoryFilter : "Perlengkapan Umum", 
        subCategory: "PERLENGKAPAN",
        vol: "1", 
        kuantitas: "Unit", 
        harga_satuan: 0, 
        jumlah_harga: 0, 
        keterangan: "-" 
      });
    }
    setIsModalOpen(true);
  };

  // Grouped Categories for clean tabs
  const FILTER_TABS = [
    "Semua",
    "Perlengkapan Umum",
    "Event MTQ",
    "Event Bazzar",
    "Event Turnamen Futsal",
    "Event Seminar",
    "Event Mobile Legends",
    "Event E-Football",
    "Inventaris Barang"
  ];

  const filteredData = equipments.filter(item => {
    const matchesSearch = (item.name || "").toLowerCase().includes(search.toLowerCase()) || 
                          (item.keterangan || "").toLowerCase().includes(search.toLowerCase()) ||
                          (item.subCategory || "").toLowerCase().includes(search.toLowerCase());
    
    let matchesCategory = true;
    if (categoryFilter !== "Semua") {
      if (categoryFilter === "Inventaris Barang") {
        matchesCategory = item.category.startsWith("Inventaris");
      } else {
        matchesCategory = item.category === categoryFilter;
      }
    }
    return matchesSearch && matchesCategory;
  });

  const totalBiaya = filteredData.reduce((acc, curr) => acc + (Number(curr.jumlah_harga) || 0), 0);
  const totalItemCount = filteredData.length;

  const formatRupiah = (val: number) => {
    if (!val || isNaN(val) || val === 0) return "-";
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);
  };

  const handleExportExcel = () => {
    try {
      const exportRows = filteredData.map((item, idx) => ({
        "NO": idx + 1,
        "NAMA BARANG": item.name,
        "KATEGORI": item.category,
        "SUB KATEGORI": item.subCategory || "-",
        "VOL": item.vol,
        "KUANTITAS": item.kuantitas,
        "HARGA SATUAN": item.harga_satuan,
        "JUMLAH HARGA": item.jumlah_harga,
        "KETERANGAN": item.keterangan
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "LOGISTIK");

      worksheet["!cols"] = [
        { wch: 6 },
        { wch: 32 },
        { wch: 22 },
        { wch: 18 },
        { wch: 10 },
        { wch: 14 },
        { wch: 18 },
        { wch: 18 },
        { wch: 25 }
      ];

      XLSX.writeFile(workbook, `RAB_LOGISTIK_SIFEST_${new Date().toISOString().split("T")[0]}.xlsx`);
      toast.success("File Excel berhasil diunduh!");
    } catch (err) {
      toast.error("Gagal mengekspor data ke Excel.");
    }
  };

  if (isLoading) return <FullPageLoader message="Memuat data RAB Logistik..." />;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-emerald-600" />
            Data Perlengkapan (RAB Logistik)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Data rencana anggaran biaya (RAB) dan logistik SI FEST 2026 sesuai spreadsheet.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleResetToSpreadsheet}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-all text-xs"
            title="Sinkronkan ulang dengan data asli spreadsheet"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Spreadsheet
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-semibold rounded-xl transition-all shadow-sm text-sm"
          >
            <Download className="w-4 h-4" /> Excel
          </button>
          <button 
            onClick={() => openModal()}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 shadow-sm shadow-blue-500/20 transition-all active:scale-95 text-sm"
          >
            <Plus className="w-4 h-4" /> Tambah Barang
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
            <Package className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">
              {categoryFilter === "Semua" ? "Total Item Barang" : `Item (${categoryFilter})`}
            </p>
            <p className="text-2xl font-bold text-slate-800">{totalItemCount} Barang</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">
              {categoryFilter === "Semua" ? "Total Anggaran RAB" : `Subtotal Biaya`}
            </p>
            <p className="text-2xl font-bold text-emerald-700">
              {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(totalBiaya)}
            </p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Keseluruhan RAB</p>
            <p className="text-2xl font-bold text-slate-800">Rp 7.916.000</p>
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
              placeholder="Cari nama barang, keterangan..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
            />
          </div>
          
          <div className="flex flex-wrap gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            {FILTER_TABS.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  categoryFilter === cat 
                    ? "bg-slate-800 text-white shadow-sm" 
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Table - 100% Sesuai Kolom Spreadsheet */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-emerald-50/80 border-b-2 border-emerald-100 text-emerald-950 uppercase text-xs tracking-wider">
                <th className="py-4 px-4 font-bold text-center w-14">NO</th>
                <th className="py-4 px-6 font-bold">NAMA BARANG</th>
                <th className="py-4 px-4 font-bold text-center w-20">VOL</th>
                <th className="py-4 px-4 font-bold text-center w-28">KUANTITAS</th>
                <th className="py-4 px-6 font-bold text-right">HARGA SATUAN</th>
                <th className="py-4 px-6 font-bold text-right">JUMLAH HARGA</th>
                <th className="py-4 px-6 font-bold">KETERANGAN</th>
                <th className="py-4 px-6 font-bold text-right">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length > 0 ? filteredData.map((item, index) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="py-4 px-4 text-center font-bold text-slate-500">
                    {index + 1}
                  </td>
                  <td className="py-4 px-6">
                    <div className="font-bold text-slate-800 text-[15px]">{item.name}</div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="text-[11px] text-emerald-700 font-semibold px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded-md">
                        {item.category}
                      </span>
                      {item.subCategory && (
                        <span className="text-[10px] text-slate-500 font-medium px-2 py-0.5 bg-slate-100 rounded-md">
                          {item.subCategory}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center font-medium text-slate-700">
                    {item.vol !== undefined && item.vol !== "" && item.vol !== null ? item.vol : "-"}
                  </td>
                  <td className="py-4 px-4 text-center font-medium text-slate-700">
                    <span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-semibold text-slate-600">
                      {item.kuantitas || "-"}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right font-medium text-slate-700 whitespace-nowrap">
                    {formatRupiah(item.harga_satuan)}
                  </td>
                  <td className="py-4 px-6 text-right font-bold text-emerald-700 whitespace-nowrap">
                    {formatRupiah(item.jumlah_harga)}
                  </td>
                  <td className="py-4 px-6 text-slate-600 text-sm">
                    {item.keterangan && item.keterangan !== "-" ? (
                      <span className="text-slate-700 bg-amber-50 text-amber-800 px-2 py-0.5 rounded text-xs border border-amber-200 font-medium">
                        {item.keterangan}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">-</span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => openModal(item)} 
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                        title="Edit Barang"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id, item.name)} 
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" 
                        title="Hapus Barang"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                      <Package className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-slate-500 font-medium">Tidak ada data barang ditemukan pada kategori ini.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form Tambah / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-600" />
                {formData.id ? 'Edit Data Barang' : 'Tambah Barang Logistik'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">NAMA BARANG *</label>
                  <input 
                    type="text" 
                    required
                    value={formData.name || ""}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    placeholder="Contoh: Baju Panitia / Trophy"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">KATEGORI</label>
                    <input
                      type="text"
                      list="category-suggestions"
                      value={formData.category || "Perlengkapan Umum"}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      placeholder="Pilih atau ketik..."
                    />
                    <datalist id="category-suggestions">
                      <option value="Perlengkapan Umum" />
                      <option value="Event MTQ" />
                      <option value="Event Bazzar" />
                      <option value="Event Turnamen Futsal" />
                      <option value="Event Seminar" />
                      <option value="Event Mobile Legends" />
                      <option value="Event E-Football" />
                      <option value="Inventaris (Turnamen Futsal)" />
                      <option value="Inventaris (Bazzar)" />
                      <option value="Inventaris (Mobile Legends)" />
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">KUANTITAS (SATUAN)</label>
                    <input 
                      type="text"
                      value={formData.kuantitas || ""}
                      onChange={(e) => setFormData({...formData, kuantitas: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      placeholder="Pcs, Unit, Lembar, Pack..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">VOL</label>
                    <input 
                      type="text"
                      value={formData.vol || ""}
                      onChange={(e) => {
                        const newVol = e.target.value;
                        const numVol = parseFloat(newVol) || 0;
                        const hargaSatuan = Number(formData.harga_satuan) || 0;
                        setFormData({
                          ...formData, 
                          vol: newVol,
                          jumlah_harga: numVol > 0 && hargaSatuan > 0 ? numVol * hargaSatuan : formData.jumlah_harga
                        });
                      }}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
                      placeholder="1 / -"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">HARGA SATUAN (RP)</label>
                    <input 
                      type="number"
                      min="0"
                      value={formData.harga_satuan || ""}
                      onChange={(e) => {
                        const newHarga = parseFloat(e.target.value) || 0;
                        const numVol = parseFloat(String(formData.vol)) || 0;
                        setFormData({
                          ...formData, 
                          harga_satuan: newHarga,
                          jumlah_harga: numVol > 0 && newHarga > 0 ? numVol * newHarga : formData.jumlah_harga
                        });
                      }}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
                      placeholder="Contoh: 135000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-emerald-800 mb-1.5">JUMLAH HARGA (RP)</label>
                  <input 
                    type="number"
                    min="0"
                    value={formData.jumlah_harga || ""}
                    onChange={(e) => setFormData({...formData, jumlah_harga: parseFloat(e.target.value) || 0})}
                    className="w-full px-4 py-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold text-emerald-900"
                    placeholder="Total biaya (Vol x Harga Satuan)"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Otomatis terhitung dari Vol × Harga Satuan, atau ketik langsung jika tanpa Vol.</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">KETERANGAN</label>
                  <textarea 
                    rows={2}
                    value={formData.keterangan || ""}
                    onChange={(e) => setFormData({...formData, keterangan: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                    placeholder="Keterangan tambahan (opsional)"
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
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-sm shadow-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
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
