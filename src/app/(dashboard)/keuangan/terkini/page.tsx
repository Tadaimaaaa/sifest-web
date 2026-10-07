"use client";

import { useState, useEffect } from "react";
import { Plus, Search, X, Trash2, Calendar, Tag, FileText, Download } from "lucide-react";
import * as XLSX from 'xlsx';
import Link from "next/link";
import { SCRIPT_URL } from "@/lib/api";
import Cookies from "js-cookie";
import { toast } from "sonner";
import Swal from "sweetalert2";
import FullPageLoader from "@/components/FullPageLoader";

export default function InsertPendaftaranPage() {
  const [currentUserRole, setCurrentUserRole] = useState("ROLE-004");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [kategoriFilter, setKategoriFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editTrxId, setEditTrxId] = useState<string | null>(null);
  
  const [newTrx, setNewTrx] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    nama: "",
    kategori: "Futsal",
    nominal: "",
    bank: "Bank BRI",
    penanggung_jawab: ""
  });

  const hasAccess = ["ROLE-001", "ROLE-002", "ROLE-006"].includes(currentUserRole);

  const KATEGORI_OPTIONS = [
    "Futsal",
    "E-Sport",
    "MTQ",
    "Seminar",
    "Bazaar Umum",
    "Bazaar Mahasiswa"
  ];

  const BANK_OPTIONS = [
    "Bank BRI",
    "Bank Nagari"
  ];

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const token = Cookies.get("session_token") || "";
      const response = await fetch(`${SCRIPT_URL}?action=getInsertPendaftaran&token=${token}`);
      if (!response.ok) throw new Error("Gagal mengambil data");
      
      const resData = await response.json();
      if (resData.success) {
        setTransactions(resData.data || []);
      } else {
        toast.error(resData.message || "Gagal memuat data pendaftaran");
      }
    } catch (error: any) {
      toast.error("Terjadi kesalahan jaringan.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    try {
      const userDataStr = Cookies.get("user_data");
      if (userDataStr) {
        const user = JSON.parse(userDataStr);
        setCurrentUserRole(user.role || "ROLE-004");
      }
    } catch (e) {}
    fetchTransactions();
  }, []);

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const token = Cookies.get("session_token") || "";
      const action = editTrxId ? 'editInsertPendaftaran' : 'addInsertPendaftaran';
      
      const payload = {
        ...newTrx,
        nominal: parseInt(newTrx.nominal.replace(/\D/g, '') || "0", 10),
        token,
        ...(editTrxId && { trx_id: editTrxId })
      };

      const response = await fetch(`${SCRIPT_URL}?action=${action}`, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });
      
      const resData = await response.json();
      if (resData.success) {
        toast.success(editTrxId ? "Pendaftaran berhasil diubah!" : "Pendaftaran berhasil dicatat!");
        setIsModalOpen(false);
        setEditTrxId(null);
        setNewTrx({ 
          tanggal: new Date().toISOString().split('T')[0],
          nama: "",
          kategori: "Futsal",
          nominal: "",
          bank: "Bank BRI",
          penanggung_jawab: "" 
        });
        fetchTransactions(); 
      } else {
        toast.error(resData.message);
      }
    } catch (error) {
      toast.error("Gagal menghubungi server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (trx: any) => {
    setEditTrxId(trx.trx_id);
    setNewTrx({
      tanggal: trx.tanggal ? new Date(trx.tanggal).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      nama: trx.nama || "",
      kategori: trx.kategori || "Futsal",
      nominal: (trx.nominal || 0).toLocaleString('id-ID'),
      bank: trx.bank || "Bank BRI",
      penanggung_jawab: trx.penanggung_jawab || ""
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (trx_id: string) => {
    const result = await Swal.fire({
      title: 'Hapus Pendaftaran?',
      text: "Data yang dihapus tidak dapat dikembalikan!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal',
      reverseButtons: true
    });

    if (!result.isConfirmed) return;
    
    const previousTransactions = [...transactions];
    setTransactions(transactions.filter(t => t.trx_id !== trx_id));
    
    try {
      const token = Cookies.get("session_token") || "";
      const response = await fetch(`${SCRIPT_URL}?action=deleteInsertPendaftaran`, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ trx_id, token })
      });
      
      const resData = await response.json();
      if (resData.success) {
        toast.success("Data pendaftaran dihapus.");
      } else {
        toast.error(resData.message);
        setTransactions(previousTransactions); 
      }
    } catch (error) {
      toast.error("Gagal menghapus data.");
      setTransactions(previousTransactions); 
    }
  };

  // Filter List
  const filteredTransactions = transactions.filter(t => {
    try {
      const matchSearch = (!searchQuery) || 
                         (t.nama?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
                         (t.penanggung_jawab?.toLowerCase() || '').includes(searchQuery.toLowerCase());
      
      const matchKategori = kategoriFilter ? t.kategori === kategoriFilter : true;
      
      let matchMonth = true;
      if (monthFilter && t.tanggal) {
        const dateObj = new Date(t.tanggal);
        if (!isNaN(dateObj.getTime())) {
          const trxMonth = dateObj.toISOString().slice(0, 7);
          matchMonth = trxMonth === monthFilter;
        }
      }

      let matchDate = true;
      if (dateFilter && t.tanggal) {
        const dateObj = new Date(t.tanggal);
        if (!isNaN(dateObj.getTime())) {
          const trxDate = dateObj.toISOString().slice(0, 10);
          matchDate = trxDate === dateFilter;
        }
      }

      return matchSearch && matchKategori && matchMonth && matchDate;
    } catch (e) {
      return false;
    }
  }).sort((a, b) => Number(b.no) - Number(a.no));

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
  };

  const handleExportExcel = () => {
    try {
      const exportData = filteredTransactions.map((trx, index) => ({
        "No": index + 1,
        "ID Pendaftaran": trx.trx_id,
        "Tanggal": new Date(trx.tanggal).toLocaleDateString('id-ID'),
        "Nama Sekolah/Tim/UMKM": trx.nama,
        "Kategori Event": trx.kategori,
        "Nominal": trx.nominal,
        "Bank Penerima": trx.bank,
        "Penanggung Jawab": trx.penanggung_jawab
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Data Pendaftaran");

      const wscols = [
        { wch: 5 }, { wch: 15 }, { wch: 15 }, { wch: 30 }, { wch: 20 },
        { wch: 20 }, { wch: 20 }, { wch: 20 }
      ];
      worksheet['!cols'] = wscols;

      XLSX.writeFile(workbook, `Data_Pendaftaran_SIFEST_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success("Berhasil mengunduh file Excel!");
    } catch (error) {
      toast.error("Gagal mengekspor file Excel");
      console.error(error);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      
      {/* Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <Link href="/keuangan" className="hover:text-blue-600 transition-colors">Data Keuangan</Link>
            <span>/</span>
            <span className="text-slate-800 font-medium">Data Insert Pendaftaran</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Data Insert Pendaftaran</h1>
          <p className="text-sm text-slate-500 mt-1">
            Pencatatan uang masuk pendaftaran secara manual.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto print:hidden">
          <button 
            onClick={handleExportExcel}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors border border-emerald-200 shadow-sm"
          >
            <Download className="w-4 h-4" />
            Excel
          </button>
          {hasAccess && (
            <button 
              onClick={() => {
                setEditTrxId(null);
                setNewTrx({ 
                  tanggal: new Date().toISOString().split('T')[0],
                  nama: "",
                  kategori: "Futsal",
                  nominal: "",
                  bank: "Bank BRI",
                  penanggung_jawab: "" 
                });
                setIsModalOpen(true);
              }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm hover:shadow-md active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Catat Pendaftaran
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-sm print:hidden">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Cari nama pendaftar atau PJ..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/50 focus:outline-none transition-all"
            />
          </div>
          <select
            value={kategoriFilter}
            onChange={(e) => setKategoriFilter(e.target.value)}
            className="w-full md:w-48 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/50 focus:outline-none cursor-pointer"
          >
            <option value="">Semua Kategori</option>
            {KATEGORI_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input 
            type="month" 
            value={monthFilter}
            onChange={(e) => {
              setMonthFilter(e.target.value);
              setDateFilter("");
            }}
            className="w-full md:w-40 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/50 focus:outline-none cursor-pointer text-slate-600"
          />
          <input 
            type="date" 
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              setMonthFilter("");
            }}
            className="w-full md:w-40 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/50 focus:outline-none cursor-pointer text-slate-600"
          />
          <button
            onClick={() => {
              const d = new Date();
              const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              if (dateFilter === today) {
                setDateFilter("");
              } else {
                setDateFilter(today);
                setMonthFilter("");
              }
            }}
            className={`w-full md:w-auto px-4 py-2.5 rounded-xl text-sm font-medium transition-colors border ${dateFilter === new Date().toISOString().split('T')[0] ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
          >
            Hari Ini
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 rounded-tl-2xl">No / ID</th>
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4">Nama Pendaftar</th>
                <th className="px-6 py-4">Kategori Event</th>
                <th className="px-6 py-4">Bank Penerima</th>
                <th className="px-6 py-4 text-right">Nominal</th>
                <th className="px-6 py-4">PJ</th>
                {hasAccess && <th className="px-6 py-4 text-right rounded-tr-2xl print:hidden">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="h-64">
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
                      <div className="flex space-x-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
                      </div>
                      <p className="text-xs font-medium tracking-widest uppercase">Memuat Data Pendaftaran...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    Tidak ada pendaftaran yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((trx, index) => (
                  <tr key={trx.trx_id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-700">{trx.no}</span>
                        <span className="text-xs text-slate-400 font-mono mt-0.5">{trx.trx_id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-slate-600 font-medium text-sm">
                        {(() => {
                          if (!trx.tanggal) return "-";
                          const d = new Date(trx.tanggal);
                          if (isNaN(d.getTime())) return trx.tanggal;
                          return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
                        })()}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-800 font-medium">{trx.nama}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                        {trx.kategori}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-100">
                        {trx.bank}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <p className="font-bold text-emerald-600">
                        {formatRupiah(trx.nominal || 0)}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-800 font-medium text-sm">{trx.penanggung_jawab}</p>
                    </td>
                    {hasAccess && (
                      <td className="px-6 py-4 text-right print:hidden">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleEditClick(trx)}
                            className="p-1.5 text-amber-500 hover:bg-amber-50 hover:text-amber-600 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(trx.trx_id)}
                            className="p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors"
                            title="Hapus"
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

      {/* Modal Add Transaction */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800">
                {editTrxId ? 'Edit Pendaftaran' : 'Catat Pendaftaran Baru'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleAddTransaction} className="p-6 space-y-4 overflow-y-auto flex-1">

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Tanggal Transfer / Bayar</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input 
                    type="date" 
                    required
                    value={newTrx.tanggal}
                    onChange={(e) => setNewTrx({...newTrx, tanggal: e.target.value})}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Nama Sekolah / Tim / UMKM</label>
                <input 
                  type="text"
                  required
                  placeholder="Misal: SMAN 1 Padang"
                  value={newTrx.nama}
                  onChange={(e) => setNewTrx({...newTrx, nama: e.target.value})}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500/50 focus:outline-none placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Kategori Event</label>
                <select 
                  required
                  value={newTrx.kategori}
                  onChange={(e) => setNewTrx({...newTrx, kategori: e.target.value})}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
                >
                  {KATEGORI_OPTIONS.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Nominal (Rp)</label>
                <input 
                  type="text"
                  required
                  placeholder="Contoh: 1500000"
                  value={newTrx.nominal}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setNewTrx({...newTrx, nominal: val ? parseInt(val).toLocaleString('id-ID') : ''})
                  }}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500/50 focus:outline-none placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Bank Penerima</label>
                <select 
                  required
                  value={newTrx.bank}
                  onChange={(e) => setNewTrx({...newTrx, bank: e.target.value})}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
                >
                  {BANK_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Penanggung Jawab (PJ)</label>
                <input 
                  type="text"
                  required
                  placeholder="Nama PJ"
                  value={newTrx.penanggung_jawab}
                  onChange={(e) => setNewTrx({...newTrx, penanggung_jawab: e.target.value})}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500/50 focus:outline-none placeholder:text-slate-400"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 flex justify-center"
                >
                  {isSubmitting ? 'Menyimpan...' : (editTrxId ? 'Simpan Perubahan' : 'Simpan Pendaftaran')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
