"use client";

import { useState, useEffect } from "react";
import { Plus, Wallet, TrendingUp, TrendingDown, Search, X, Trash2, Calendar, Tag, FileText, Printer, Download } from "lucide-react";
import * as XLSX from 'xlsx';
import { SCRIPT_URL } from "@/lib/api";
import Cookies from "js-cookie";
import { toast } from "sonner";
import Swal from "sweetalert2";
import FullPageLoader from "@/components/FullPageLoader";

const getDriveThumbnail = (url: string) => {
  if (!url || url === '-') return null;
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    // Menggunakan API proxy internal untuk melewati blokir CORS dari Google Drive
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
  }
  return null;
};

export default function KeuanganPage() {
  const [currentUserRole, setCurrentUserRole] = useState("ROLE-004");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editTrxId, setEditTrxId] = useState<string | null>(null);
  const [newTrx, setNewTrx] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    jenis: "INCOME",
    kategori: "Sponsorship",
    keterangan: "",
    nominal: "",
    vol: "",
    satuan: "",
    penanggung_jawab: "",
    status: "Lunas",
    fileData: "",
    fileName: "",
    mimeType: ""
  });

  const hasAccess = ["ROLE-001", "ROLE-006"].includes(currentUserRole);
  const canPrint = ["ROLE-001", "ROLE-002", "ROLE-003", "ROLE-006"].includes(currentUserRole);

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const token = Cookies.get("session_token") || "";
      const response = await fetch(`${SCRIPT_URL}?action=getKeuangan&token=${token}`);
      if (!response.ok) throw new Error("Gagal mengambil data");
      
      const resData = await response.json();
      if (resData.success) {
        setTransactions(resData.data || []);
      } else {
        toast.error(resData.message || "Gagal memuat data keuangan");
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
      const action = editTrxId ? 'editKeuangan' : 'addKeuangan';
      
      const payload = {
        ...newTrx,
        nominal: parseInt(newTrx.nominal.replace(/\D/g, '') || "0", 10),
        token,
        ...(editTrxId && { trx_id: editTrxId }) // Tambahkan trx_id jika edit
      };

      const response = await fetch(`${SCRIPT_URL}?action=${action}`, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });
      
      const resData = await response.json();
      if (resData.success) {
        toast.success(editTrxId ? "Transaksi berhasil diubah!" : "Transaksi berhasil dicatat!");
        setIsModalOpen(false);
        setEditTrxId(null);
        setNewTrx({ ...newTrx, keterangan: "", nominal: "", vol: "", satuan: "", penanggung_jawab: "", status: "Lunas", fileData: "", fileName: "", mimeType: "" }); // reset form
        fetchTransactions(); // Refresh data
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
      tanggal: trx.tanggal.split('T')[0],
      jenis: trx.jenis,
      kategori: trx.kategori,
      keterangan: trx.keterangan || "",
      nominal: (trx.nominal || 0).toLocaleString('id-ID'),
      vol: trx.vol && trx.vol !== "-" ? trx.vol : "",
      satuan: trx.satuan && trx.satuan !== "-" ? trx.satuan : "",
      penanggung_jawab: trx.penanggung_jawab || trx.recorded_by || "",
      status: trx.status || "Lunas",
      fileData: "",
      fileName: "",
      mimeType: "",
      bukti_url: trx.bukti_url && trx.bukti_url !== "-" ? trx.bukti_url : ""
    } as any);
    setIsModalOpen(true);
  };

  const handleDelete = async (trx_id: string) => {
    const result = await Swal.fire({
      title: 'Hapus Transaksi?',
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
    
    // Optimistic UI Update
    const previousTransactions = [...transactions];
    setTransactions(transactions.filter(t => t.trx_id !== trx_id));
    
    try {
      const token = Cookies.get("session_token") || "";
      const response = await fetch(`${SCRIPT_URL}?action=deleteKeuangan`, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ trx_id, token })
      });
      
      const resData = await response.json();
      if (resData.success) {
        toast.success("Transaksi dihapus.");
      } else {
        toast.error(resData.message);
        setTransactions(previousTransactions); // Rollback
      }
    } catch (error) {
      toast.error("Gagal menghapus data.");
      setTransactions(previousTransactions); // Rollback
    }
  };

  // Kalkulasi Saldo
  const totalIncome = transactions.filter(t => t.jenis === 'INCOME').reduce((acc, curr) => acc + Number(curr.nominal), 0);
  const totalExpense = transactions.filter(t => t.jenis === 'EXPENSE').reduce((acc, curr) => acc + Number(curr.nominal), 0);
  const totalBalance = totalIncome - totalExpense;

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
  };

  // Filter List
  const filteredTransactions = transactions.filter(t => {
    const matchSearch = t.keterangan?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                       t.kategori?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = typeFilter ? t.jenis === typeFilter : true;
    
    const trxMonth = new Date(t.tanggal).toISOString().slice(0, 7); // YYYY-MM
    const matchMonth = monthFilter ? trxMonth === monthFilter : true;

    return matchSearch && matchType && matchMonth;
  });

  const KATEGORI_INCOME = ["Sponsorship", "Dana Usaha", "Pendaftaran", "Donatur", "Lainnya"];
  const KATEGORI_EXPENSE = ["Logistik", "Konsumsi", "Acara", "Humas", "Pubdok", "Kesekretariatan", "Operasional", "Lainnya"];
  const currentCategories = newTrx.jenis === "INCOME" ? KATEGORI_INCOME : KATEGORI_EXPENSE;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) { // 3MB limit
        toast.error("Ukuran file terlalu besar (Maks 3MB). Silakan di-compress terlebih dahulu.");
        e.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setNewTrx({
          ...newTrx, 
          fileData: event.target?.result as string,
          fileName: file.name,
          mimeType: file.type
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExportExcel = () => {
    try {
      const exportData = filteredTransactions.map((trx, index) => ({
        "No": index + 1,
        "ID Transaksi": trx.trx_id,
        "Tanggal": new Date(trx.tanggal).toLocaleDateString('id-ID'),
        "Kategori": trx.kategori,
        "Keterangan": trx.keterangan || "-",
        "Jenis": trx.jenis === 'INCOME' ? 'Pemasukan' : 'Pengeluaran',
        "Volume": trx.vol !== "-" && trx.vol ? `${trx.vol} ${trx.satuan}` : "-",
        "Masuk": trx.jenis === 'INCOME' ? trx.nominal : 0,
        "Keluar": trx.jenis === 'EXPENSE' ? trx.nominal : 0,
        "Saldo Akhir": trx.saldo_akhir,
        "Penanggung Jawab": trx.penanggung_jawab || trx.recorded_by,
        "Status": trx.status || "Lunas",
        "Link Bukti": trx.bukti_url !== "-" ? trx.bukti_url : "Tidak ada"
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Data Keuangan");

      // Set column widths
      const wscols = [
        { wch: 5 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 30 },
        { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
        { wch: 20 }, { wch: 15 }, { wch: 40 }
      ];
      worksheet['!cols'] = wscols;

      XLSX.writeFile(workbook, `Laporan_Keuangan_SIFEST_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success("Berhasil mengunduh file Excel!");
    } catch (error) {
      toast.error("Gagal mengekspor file Excel");
      console.error(error);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Data Keuangan</h1>
          <p className="text-sm text-slate-500 mt-1">
            Buku kas digital SI FEST 2026.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto print:hidden">
              <a 
                href="https://docs.google.com/spreadsheets/d/1KTpEz85NNMhap8VSzSszSptX_DLdUcPj/edit?usp=sharing&ouid=101548209300972862261&rtpof=true&sd=true"
                target="_blank"
                rel="noreferrer"
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors border border-slate-200 shadow-sm"
              >
                <FileText className="w-4 h-4" />
                RAB
              </a>
          {canPrint && (
            <>
              <button 
                onClick={() => window.print()}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors border border-slate-200 shadow-sm"
              >
                <Printer className="w-4 h-4" />
                Cetak
              </button>
              <button 
                onClick={handleExportExcel}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors border border-emerald-200 shadow-sm"
              >
                <Download className="w-4 h-4" />
                Excel
              </button>
            </>
          )}
          {hasAccess && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Catat Transaksi
            </button>
          )}
        </div>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 rounded-2xl text-white shadow-lg shadow-blue-900/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Wallet className="w-24 h-24" />
          </div>
          <p className="text-blue-100 text-sm font-medium mb-1">Total Saldo Kas</p>
          <h3 className="text-3xl font-bold tracking-tight">{formatRupiah(totalBalance)}</h3>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium mb-0.5">Total Pemasukan</p>
            <h3 className="text-xl font-bold text-slate-800">{formatRupiah(totalIncome)}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
            <TrendingDown className="w-6 h-6 text-rose-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium mb-0.5">Total Pengeluaran</p>
            <h3 className="text-xl font-bold text-slate-800">{formatRupiah(totalExpense)}</h3>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col print:shadow-none print:border-none">
        {/* Filters */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 bg-slate-50/50 print:hidden">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Cari keterangan / kategori..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
            />
          </div>
          <select 
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="">Semua Jenis</option>
            <option value="INCOME">Pemasukan (Masuk)</option>
            <option value="EXPENSE">Pengeluaran (Keluar)</option>
          </select>
          <input 
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full text-left text-sm text-slate-600 print:text-[11px]">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 font-semibold">No / ID</th>
                <th className="px-6 py-4 font-semibold">Tanggal</th>
                <th className="px-6 py-4 font-semibold">Kategori & Keterangan</th>
                <th className="px-6 py-4 font-semibold text-center">Foto / Bukti</th>
                <th className="px-6 py-4 font-semibold">Vol</th>
                <th className="px-6 py-4 font-semibold text-right">Nominal</th>
                <th className="px-6 py-4 font-semibold text-right">Saldo</th>
                <th className="px-6 py-4 font-semibold">PJ & Status</th>
                {hasAccess && <th className="px-6 py-4 font-semibold text-right print:hidden">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="h-64 relative p-0">
                    <FullPageLoader message="Memuat Data Keuangan..." fullScreen={false} />
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
                    Tidak ada transaksi yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((trx, index) => (
                  <tr key={`${trx.trx_id}-${index}`} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="font-bold text-slate-700">{trx.no || "-"}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{trx.trx_id}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="font-medium text-slate-700">{new Date(trx.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium mb-1.5
                        ${trx.jenis === 'INCOME' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {trx.kategori}
                      </span>
                      <p className="text-slate-800 line-clamp-2 print:line-clamp-none">{trx.keterangan || "-"}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {trx.bukti_url && trx.bukti_url !== "-" ? (
                        <div className="flex flex-col items-center justify-center">
                          {/* Gambar HANYA dimuat dan ditampilkan saat mode Cetak (Print) */}
                          {getDriveThumbnail(trx.bukti_url) && (
                            <img 
                              src={getDriveThumbnail(trx.bukti_url)!} 
                              alt="Bukti" 
                              className="hidden print:block h-16 w-auto object-cover rounded border border-slate-200 mb-1" 
                            />
                          )}
                          
                          {/* Tombol Buka HANYA ditampilkan di layar Web (Sembunyi saat cetak) */}
                          <div className="print:hidden flex flex-col items-center">
                            <span className="text-xs text-slate-400">Ada File</span>
                            <a href={trx.bukti_url} target="_blank" rel="noreferrer" className="text-[10.5px] font-medium text-blue-600 hover:underline mt-0.5">
                              Lihat Bukti
                            </a>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      {trx.vol !== "-" && trx.vol ? `${trx.vol} ${trx.satuan}` : "-"}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <p className={`font-bold ${trx.jenis === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {trx.jenis === 'INCOME' ? '+' : '-'}{formatRupiah(trx.nominal)}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <p className="font-bold text-slate-800">
                        {formatRupiah(trx.saldo_akhir || 0)}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-800 font-medium text-sm">{trx.penanggung_jawab || trx.recorded_by}</p>
                      <span className={`inline-flex mt-1 items-center px-2 py-0.5 rounded text-[10px] font-medium border
                        ${trx.status === 'Lunas' ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : 'border-amber-200 bg-amber-50 text-amber-600'}`}>
                        {trx.status || "Lunas"}
                      </span>
                    </td>
                    {hasAccess && (
                      <td className="px-6 py-4 text-right print:hidden">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleEditClick(trx)}
                            className="p-1.5 text-amber-500 hover:bg-amber-50 hover:text-amber-600 rounded-lg transition-colors"
                            title="Edit Transaksi"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(trx.trx_id)}
                            className="p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors"
                            title="Hapus Transaksi"
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
                {editTrxId ? 'Edit Transaksi' : 'Catat Transaksi Baru'}
              </h3>
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setEditTrxId(null);
                  setNewTrx({ ...newTrx, keterangan: "", nominal: "", vol: "", satuan: "", penanggung_jawab: "", status: "Lunas", fileData: "", fileName: "", mimeType: "", bukti_url: "" } as any);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleAddTransaction} className="p-6 space-y-4 overflow-y-auto flex-1">
              
              {/* Jenis Transaksi Toggle */}
              <div className="flex p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setNewTrx({...newTrx, jenis: 'INCOME', kategori: KATEGORI_INCOME[0]})}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${newTrx.jenis === 'INCOME' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Pemasukan
                </button>
                <button
                  type="button"
                  onClick={() => setNewTrx({...newTrx, jenis: 'EXPENSE', kategori: KATEGORI_EXPENSE[0]})}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${newTrx.jenis === 'EXPENSE' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Pengeluaran
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Tanggal Transaksi</label>
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
                <label className="text-sm font-medium text-slate-700">Kategori</label>
                <div className="relative">
                  <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select 
                    required
                    value={newTrx.kategori}
                    onChange={(e) => setNewTrx({...newTrx, kategori: e.target.value})}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
                  >
                    {currentCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Nominal Total (Rp)</label>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Volume (Opsional)</label>
                  <input 
                    type="number"
                    placeholder="Contoh: 10"
                    value={newTrx.vol}
                    onChange={(e) => setNewTrx({...newTrx, vol: e.target.value})}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500/50 focus:outline-none placeholder:text-slate-400"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Satuan</label>
                  <input 
                    type="text"
                    placeholder="Contoh: Pcs, Rim, dll"
                    value={newTrx.satuan}
                    onChange={(e) => setNewTrx({...newTrx, satuan: e.target.value})}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500/50 focus:outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Detail / Keterangan</label>
                <textarea 
                  required
                  rows={2}
                  placeholder="Misal: Pembayaran DP gedung..."
                  value={newTrx.keterangan}
                  onChange={(e) => setNewTrx({...newTrx, keterangan: e.target.value})}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500/50 focus:outline-none resize-none placeholder:text-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Penanggung Jawab</label>
                  <input 
                    type="text"
                    required
                    placeholder="Nama PJ"
                    value={newTrx.penanggung_jawab}
                    onChange={(e) => setNewTrx({...newTrx, penanggung_jawab: e.target.value})}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500/50 focus:outline-none placeholder:text-slate-400"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Status Pembayaran</label>
                  <select 
                    required
                    value={newTrx.status}
                    onChange={(e) => setNewTrx({...newTrx, status: e.target.value})}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
                  >
                    <option value="Lunas">Lunas</option>
                    <option value="Belum Lunas">Belum Lunas</option>
                    <option value="Hutang">Hutang</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Foto Bukti / Nota <span className="text-slate-400 font-normal">(Opsional)</span></label>
                {(newTrx as any).bukti_url && (
                  <div className="mb-2 text-xs text-blue-600 flex items-center">
                    <span>File saat ini: </span>
                    <a href={(newTrx as any).bukti_url} target="_blank" rel="noreferrer" className="ml-1 underline hover:text-blue-800">Lihat File</a>
                  </div>
                )}
                
                {newTrx.fileData ? (
                  <div className="relative rounded-xl border border-slate-200 bg-slate-50 p-2">
                    <img src={newTrx.fileData} alt="Preview" className="w-full h-32 object-cover rounded-lg mb-2" />
                    <button 
                      type="button"
                      onClick={() => setNewTrx({...newTrx, fileData: "", fileName: "", mimeType: ""})}
                      className="absolute top-4 right-4 bg-white/80 backdrop-blur text-slate-700 p-1.5 rounded-full hover:bg-rose-100 hover:text-rose-600 transition-colors shadow-sm"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <p className="text-xs text-slate-500 truncate text-center px-2 pb-1">{newTrx.fileName}</p>
                  </div>
                ) : (
                  <div className="relative">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleFileChange}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/50 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <p className="text-xs text-slate-400 mt-1.5">
                      Bisa mengambil langsung dari kamera perangkat (HP) atau memilih dari Galeri.
                    </p>
                    <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                      <span className="text-[13px] leading-none mt-0.5">⚠️</span>
                      <p className="text-xs text-amber-700 font-medium leading-relaxed">
                        Pastikan foto / bukti nota yang diunggah terlihat jelas dan benar (sesuai dengan nominal transaksi).
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 flex justify-center"
                >
                  {isSubmitting ? 'Menyimpan...' : (editTrxId ? 'Simpan Perubahan' : 'Simpan Transaksi')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
