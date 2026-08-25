"use client";

import { useState, useEffect } from "react";
import { Plus, Search, X, Trash2, Tag, Mail, Inbox, Send, CalendarClock, Download, RefreshCcw, Link, FileText, ExternalLink } from "lucide-react";
import * as XLSX from 'xlsx';
import { SCRIPT_URL } from "@/lib/api";
import Cookies from "js-cookie";
import { toast } from "sonner";
import FullPageLoader from "@/components/FullPageLoader";

type Surat = {
  id_surat: string;
  jenis_surat: string;
  nomor_surat: string;
  tanggal: string;
  instansi: string;
  perihal: string;
  status: string;
  link_file: string;
  added_by: string;
};

const getDriveThumbnail = (url: string) => {
  if (!url || url === '-') return null;
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
  }
  return null;
};

export default function SuratPage() {
  const [currentUserRole, setCurrentUserRole] = useState("ROLE-001");
  const [surat, setSurat] = useState<Surat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [jenisFilter, setJenisFilter] = useState("Semua"); // Semua, Surat Masuk, Surat Keluar
  
  // Format tanggal ISO dari Google Sheets ke format lokal
  const formatTanggal = (dateStr: string) => {
    if (!dateStr || dateStr === "-") return "-";
    if (dateStr.includes("T") && (dateStr.endsWith("Z") || dateStr.includes("+"))) {
      try {
        return new Date(dateStr).toLocaleDateString('id-ID', { 
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
        });
      } catch {
        return dateStr;
      }
    }
    return dateStr;
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingSurat, setEditingSurat] = useState<Surat | null>(null);
  
  const [formData, setFormData] = useState({
    jenis_surat: "Surat Masuk",
    nomor_surat: "",
    tanggal: "",
    instansi: "",
    perihal: "",
    status: "",
    link_file: "",
    fileData: "",
    fileName: "",
    mimeType: ""
  });

  const hasAccess = ["ROLE-001", "ROLE-005"].includes(currentUserRole); // Kestari punya akses khusus
  const canPrint = ["ROLE-001", "ROLE-002", "ROLE-003", "ROLE-005"].includes(currentUserRole);

  const fetchSurat = async () => {
    setIsLoading(true);
    try {
      const token = Cookies.get("session_token");
      const res = await fetch(`${SCRIPT_URL}?action=getSurat&token=${token}`);
      const data = await res.json();
      if (data.success) {
        setSurat(data.data || []);
      } else {
        toast.error(data.message || "Gagal mengambil data surat");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan jaringan");
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
    fetchSurat();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error("Ukuran file terlalu besar (Maks 5MB). Silakan di-compress terlebih dahulu.");
        e.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData({
          ...formData, 
          fileData: event.target?.result as string,
          fileName: file.name,
          mimeType: file.type
        });
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    fetchSurat();
  }, []);

  const handleExportExcel = () => {
    try {
      const exportData = filteredSurat.map((srt, index) => ({
        "No": index + 1,
        "ID Surat": srt.id_surat,
        "Jenis Surat": srt.jenis_surat,
        "Nomor Surat": srt.nomor_surat,
        "Tanggal": formatTanggal(srt.tanggal),
        "Instansi/Tujuan": srt.instansi,
        "Perihal": srt.perihal,
        "Status/Keterangan": srt.status,
        "Link File": srt.link_file,
        "Ditambahkan Oleh": srt.added_by
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Data Surat");

      const wscols = [
        { wch: 5 }, { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 20 },
        { wch: 30 }, { wch: 30 }, { wch: 25 }, { wch: 40 }, { wch: 20 }
      ];
      worksheet['!cols'] = wscols;

      XLSX.writeFile(workbook, `Arsip_Surat_SIFEST_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success("Berhasil mengunduh file Excel!");
    } catch (error) {
      toast.error("Gagal mengekspor file Excel");
      console.error(error);
    }
  };

  const handleSaveSurat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nomor_surat || !formData.perihal) {
      toast.error("Nomor surat dan Perihal wajib diisi!");
      return;
    }

    setIsSubmitting(true);
    const token = Cookies.get("session_token");
    
    const payload = {
      action: editingSurat ? "editSurat" : "addSurat",
      token,
      ...(editingSurat ? { id_surat: editingSurat.id_surat } : {}),
      ...formData
    };

    try {
      const res = await fetch(SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(data.message);
        setIsModalOpen(false);
        resetForm();
        fetchSurat();
      } else {
        toast.error(data.message || "Gagal menyimpan data");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan jaringan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus arsip surat ini?")) return;
    
    setIsLoading(true);
    const token = Cookies.get("session_token");
    try {
      const res = await fetch(SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify({ action: "deleteSurat", token, id_surat: id }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchSurat();
      } else {
        toast.error(data.message);
        setIsLoading(false);
      }
    } catch (error) {
      toast.error("Terjadi kesalahan jaringan");
      setIsLoading(false);
    }
  };

  const openEditModal = (srt: Surat) => {
    setEditingSurat(srt);
    setFormData({
      jenis_surat: srt.jenis_surat,
      nomor_surat: srt.nomor_surat,
      tanggal: srt.tanggal,
      instansi: srt.instansi,
      perihal: srt.perihal,
      status: srt.status,
      link_file: srt.link_file,
      fileData: "",
      fileName: "",
      mimeType: ""
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingSurat(null);
    setFormData({
      jenis_surat: "Surat Masuk",
      nomor_surat: "",
      tanggal: "",
      instansi: "",
      perihal: "",
      status: "",
      link_file: "",
      fileData: "",
      fileName: "",
      mimeType: ""
    });
  };

  const filteredSurat = surat.filter(srt => {
    const matchesSearch = srt.nomor_surat.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          srt.perihal.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          srt.instansi.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesJenis = jenisFilter === "Semua" || srt.jenis_surat === jenisFilter;
    return matchesSearch && matchesJenis;
  });

  const totalSurat = surat.length;
  const totalMasuk = surat.filter(s => s.jenis_surat === "Surat Masuk").length;
  const totalKeluar = surat.filter(s => s.jenis_surat === "Surat Keluar").length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Surat Masuk & Keluar</h1>
          <p className="text-sm text-slate-500 mt-1">
            Sistem pengarsipan digital untuk administrasi kesekretariatan SI FEST.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {canPrint && (
            <button 
              onClick={handleExportExcel}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors border border-emerald-200 shadow-sm"
            >
              <Download className="w-4 h-4" />
              Excel
            </button>
          )}
          <button 
            onClick={fetchSurat}
            className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-slate-600 shadow-sm"
          >
            <RefreshCcw className="w-4 h-4" />
          </button>
          {hasAccess && (
            <button 
              onClick={() => { resetForm(); setIsModalOpen(true); }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Arsip Surat
            </button>
          )}
        </div>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Total Arsip</p>
            <h3 className="text-2xl font-bold text-slate-800">{totalSurat} Surat</h3>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setJenisFilter("Surat Masuk")}>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Inbox className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Surat Masuk</p>
            <h3 className="text-2xl font-bold text-slate-800">{totalMasuk} Dokumen</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setJenisFilter("Surat Keluar")}>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Send className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Surat Keluar</p>
            <h3 className="text-2xl font-bold text-slate-800">{totalKeluar} Dokumen</h3>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Cari no. surat, perihal, instansi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto p-1 bg-slate-100 rounded-xl">
            {["Semua", "Surat Masuk", "Surat Keluar"].map((jenis) => (
              <button
                key={jenis}
                onClick={() => setJenisFilter(jenis)}
                className={`flex-1 sm:flex-none whitespace-nowrap px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  jenisFilter === jenis 
                    ? 'bg-white text-slate-800 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {jenis}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 font-semibold w-16">Jenis</th>
                <th className="px-6 py-4 font-semibold">Identitas Surat</th>
                <th className="px-6 py-4 font-semibold">Tujuan / Pengirim</th>
                <th className="px-6 py-4 font-semibold">Keterangan</th>
                <th className="px-6 py-4 font-semibold">Lampiran</th>
                {hasAccess && <th className="px-6 py-4 font-semibold text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="h-64 relative p-0">
                    <FullPageLoader message="Memuat Data Surat..." fullScreen={false} />
                  </td>
                </tr>
              ) : filteredSurat.length === 0 ? (
                <tr>
                  <td colSpan={hasAccess ? 6 : 5} className="px-6 py-12 text-center text-slate-500 flex-col items-center justify-center">
                    <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                      <FileText className="w-8 h-8 text-slate-300" />
                    </div>
                    Tidak ada data arsip surat yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredSurat.map((srt) => (
                  <tr key={srt.id_surat} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${srt.jenis_surat === 'Surat Masuk' ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'}`} title={srt.jenis_surat}>
                        {srt.jenis_surat === 'Surat Masuk' ? <Inbox className="w-5 h-5" /> : <Send className="w-5 h-5" />}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800 text-[15px] mb-1">{srt.perihal}</p>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-slate-500 font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded w-max">{srt.nomor_surat}</span>
                        <div className="flex items-center gap-1 text-slate-400 mt-1">
                          <CalendarClock className="w-3 h-3" /> <span className="text-xs">{formatTanggal(srt.tanggal)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-700">{srt.instansi}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-600 leading-relaxed max-w-xs">{srt.status}</p>
                    </td>
                    <td className="px-6 py-4">
                      {srt.link_file && srt.link_file !== "-" ? (
                        <a href={srt.link_file} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-medium transition-colors border border-blue-100">
                          <ExternalLink className="w-3.5 h-3.5" /> Buka File
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Tidak ada lampiran</span>
                      )}
                    </td>
                    {hasAccess && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => openEditModal(srt)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Surat"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                          </button>
                          <button 
                            onClick={() => handleDelete(srt.id_surat)}
                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Hapus Surat"
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

      {/* Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-slate-800">
                {editingSurat ? 'Edit Arsip Surat' : 'Arsipkan Surat Baru'}
              </h2>
              <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveSurat} className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Jenis Surat</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="jenis_surat" value="Surat Masuk" checked={formData.jenis_surat === "Surat Masuk"} onChange={(e) => setFormData({...formData, jenis_surat: e.target.value})} className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-slate-700">Surat Masuk</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="jenis_surat" value="Surat Keluar" checked={formData.jenis_surat === "Surat Keluar"} onChange={(e) => setFormData({...formData, jenis_surat: e.target.value})} className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-slate-700">Surat Keluar</span>
                    </label>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Perihal / Judul Surat <span className="text-rose-500">*</span></label>
                  <input type="text" required value={formData.perihal} onChange={(e) => setFormData({...formData, perihal: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" placeholder="Contoh: Undangan Menjadi Pemateri / Peminjaman Tempat" />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nomor Surat <span className="text-rose-500">*</span></label>
                  <input type="text" required value={formData.nomor_surat} onChange={(e) => setFormData({...formData, nomor_surat: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" placeholder="Misal: 01/A/SIFEST/VIII/2026" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tanggal Surat</label>
                  <input type="text" value={formData.tanggal} onChange={(e) => setFormData({...formData, tanggal: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" placeholder="Contoh: 12 Agustus 2026" />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">{formData.jenis_surat === "Surat Masuk" ? "Instansi Pengirim" : "Instansi Tujuan"}</label>
                  <input type="text" value={formData.instansi} onChange={(e) => setFormData({...formData, instansi: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" placeholder="Misal: BEM KM Unand / PT Semen Padang" />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">File / Scan Surat <span className="text-slate-400 font-normal">(Opsional)</span></label>
                  
                  {formData.link_file && formData.link_file !== "-" && (
                    <div className="mb-2 text-xs text-blue-600 flex items-center">
                      <span>File saat ini: </span>
                      <a href={formData.link_file} target="_blank" rel="noreferrer" className="ml-1 underline hover:text-blue-800">Lihat File Tersimpan</a>
                    </div>
                  )}

                  {formData.fileData ? (
                    <div className="relative rounded-xl border border-slate-200 bg-slate-50 p-4 flex items-center gap-3">
                      <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{formData.fileName}</p>
                        <p className="text-xs text-slate-500 truncate">Siap diunggah</p>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, fileData: "", fileName: "", mimeType: ""})}
                        className="bg-white border border-slate-200 text-slate-700 p-2 rounded-full hover:bg-rose-50 hover:text-rose-600 transition-colors shadow-sm"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input 
                        type="file" 
                        accept=".pdf,image/*"
                        onChange={handleFileChange}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/50 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      <p className="text-xs text-slate-400 mt-1.5">
                        Format yang didukung: PDF, JPG, PNG (Maksimal 5MB)
                      </p>
                    </div>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Status / Keterangan Tambahan</label>
                  <textarea rows={2} value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none" placeholder="Contoh: Sudah disetujui, Menunggu balasan, dll..." />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => { setIsModalOpen(false); resetForm(); }} className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                  Batal
                </button>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors flex items-center justify-center min-w-[120px]">
                  {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (editingSurat ? 'Simpan Perubahan' : 'Arsipkan Surat')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
