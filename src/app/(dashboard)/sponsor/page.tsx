"use client";

import { useState, useEffect } from "react";
import { Plus, Search, X, Trash2, Tag, Handshake, Mail, Phone, CalendarClock, Download, RefreshCcw } from "lucide-react";
import * as XLSX from 'xlsx';
import { SCRIPT_URL } from "@/lib/api";
import Cookies from "js-cookie";
import { toast } from "sonner";
import FullPageLoader from "@/components/FullPageLoader";

type Sponsor = {
  id_sponsor: string;
  nama_sponsor: string;
  pic: string;
  kontak: string;
  email: string;
  tgl_proposal: string;
  tgl_followup: string;
  status: string;
  keterangan: string;
  catatan: string;
  added_by: string;
};

const STATUS_OPTIONS = [
  "Belum Dihubungi",
  "Sudah Dihubungi",
  "Ditinjau",
  "Butuh Diskusi dengan Panitia",
  "Sudah ke Lokasi",
  "Deal / Potensial",
  "Ditolak",
  "Tidak Ada Respons"
];

export default function SponsorPage() {
  const [currentUserRole, setCurrentUserRole] = useState("ROLE-001");
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua");
  
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
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);
  
  const [formData, setFormData] = useState({
    nama_sponsor: "",
    pic: "",
    kontak: "",
    email: "",
    tgl_proposal: "",
    tgl_followup: "",
    status: "Belum Dihubungi",
    keterangan: "",
    catatan: ""
  });

  const hasAccess = ["ROLE-001", "ROLE-007"].includes(currentUserRole);
  const canPrint = ["ROLE-001", "ROLE-002", "ROLE-003", "ROLE-007"].includes(currentUserRole);

  const fetchSponsors = async () => {
    setIsLoading(true);
    try {
      const token = Cookies.get("session_token");
      const res = await fetch(`${SCRIPT_URL}?action=getSponsors&token=${token}`);
      const data = await res.json();
      if (data.success) {
        setSponsors(data.data || []);
      } else {
        toast.error(data.message || "Gagal mengambil data sponsor");
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
    fetchSponsors();
  }, []);

  const handleExportExcel = () => {
    try {
      const exportData = filteredSponsors.map((spn, index) => ({
        "No": index + 1,
        "ID Sponsor": spn.id_sponsor,
        "Nama Sponsor / Brand": spn.nama_sponsor,
        "PIC / Kontak": spn.pic,
        "No. HP / Link Form": spn.kontak,
        "Email": spn.email,
        "Tanggal Pemberian Proposal": formatTanggal(spn.tgl_proposal),
        "Follow Up Proposal": formatTanggal(spn.tgl_followup),
        "Status": spn.status,
        "Keterangan": spn.keterangan,
        "Catatan": spn.catatan,
        "Ditambahkan Oleh": spn.added_by
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Data Sponsor");

      // Set column widths
      const wscols = [
        { wch: 5 }, { wch: 15 }, { wch: 25 }, { wch: 20 }, { wch: 20 },
        { wch: 25 }, { wch: 25 }, { wch: 20 }, { wch: 25 }, { wch: 30 },
        { wch: 30 }, { wch: 20 }
      ];
      worksheet['!cols'] = wscols;

      XLSX.writeFile(workbook, `Data_Sponsor_SIFEST_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success("Berhasil mengunduh file Excel!");
    } catch (error) {
      toast.error("Gagal mengekspor file Excel");
      console.error(error);
    }
  };

  const handleSaveSponsor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama_sponsor) {
      toast.error("Nama sponsor wajib diisi!");
      return;
    }

    setIsSubmitting(true);
    const token = Cookies.get("session_token");
    
    const payload = {
      action: editingSponsor ? "editSponsor" : "addSponsor",
      token,
      ...(editingSponsor ? { id_sponsor: editingSponsor.id_sponsor } : {}),
      ...formData
    };

    try {
      const actionParam = editingSponsor ? "editSponsor" : "addSponsor";
      const res = await fetch(`${SCRIPT_URL}?action=${actionParam}`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(data.message);
        setIsModalOpen(false);
        resetForm();
        fetchSponsors();
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
    if (!confirm("Apakah Anda yakin ingin menghapus data sponsor ini?")) return;
    
    setIsLoading(true);
    const token = Cookies.get("session_token");
    try {
      const res = await fetch(`${SCRIPT_URL}?action=deleteSponsor`, {
        method: "POST",
        body: JSON.stringify({ action: "deleteSponsor", token, id_sponsor: id }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchSponsors();
      } else {
        toast.error(data.message);
        setIsLoading(false);
      }
    } catch (error) {
      toast.error("Terjadi kesalahan jaringan");
      setIsLoading(false);
    }
  };

  const openEditModal = (spn: Sponsor) => {
    setEditingSponsor(spn);
    setFormData({
      nama_sponsor: spn.nama_sponsor,
      pic: spn.pic,
      kontak: spn.kontak,
      email: spn.email,
      tgl_proposal: spn.tgl_proposal,
      tgl_followup: spn.tgl_followup,
      status: spn.status,
      keterangan: spn.keterangan,
      catatan: spn.catatan
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingSponsor(null);
    setFormData({
      nama_sponsor: "",
      pic: "",
      kontak: "",
      email: "",
      tgl_proposal: "",
      tgl_followup: "",
      status: "Belum Dihubungi",
      keterangan: "",
      catatan: ""
    });
  };

  const filteredSponsors = sponsors.filter(spn => {
    const matchesSearch = spn.nama_sponsor.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          spn.pic.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "Semua" || spn.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch(status) {
      case "Deal / Potensial": return "bg-emerald-100 text-emerald-700";
      case "Ditolak": return "bg-rose-100 text-rose-700";
      case "Ditinjau": return "bg-amber-100 text-amber-700";
      case "Sudah Dihubungi": return "bg-blue-100 text-blue-700";
      case "Sudah ke Lokasi": return "bg-indigo-100 text-indigo-700";
      case "Tidak Ada Respons": return "bg-slate-100 text-slate-600";
      case "Butuh Diskusi dengan Panitia": return "bg-purple-100 text-purple-700";
      default: return "bg-slate-100 text-slate-500";
    }
  };

  const totalSponsor = sponsors.length;
  const totalDeal = sponsors.filter(s => s.status === "Deal / Potensial").length;
  const totalPending = sponsors.filter(s => s.status === "Ditinjau" || s.status === "Sudah Dihubungi").length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Data Sponsor</h1>
          <p className="text-sm text-slate-500 mt-1">
            Pantau dan kelola pencarian dana serta sponsorship SI FEST.
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
            onClick={fetchSponsors}
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
              Tambah Sponsor
            </button>
          )}
        </div>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Handshake className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Total Sponsor</p>
            <h3 className="text-2xl font-bold text-slate-800">{totalSponsor} Instansi</h3>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Handshake className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Deal / Potensial</p>
            <h3 className="text-2xl font-bold text-slate-800">{totalDeal} Instansi</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <CalendarClock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Prospek / Ditinjau</p>
            <h3 className="text-2xl font-bold text-slate-800">{totalPending} Instansi</h3>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Cari sponsor atau PIC..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
            {["Semua", "Deal / Potensial", "Ditinjau", "Sudah Dihubungi", "Ditolak"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  statusFilter === status 
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20' 
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 font-semibold">Sponsor & Kontak</th>
                <th className="px-6 py-4 font-semibold">Tgl Proposal & Follow Up</th>
                <th className="px-6 py-4 font-semibold">Status & Keterangan</th>
                <th className="px-6 py-4 font-semibold">Catatan Internal</th>
                {hasAccess && <th className="px-6 py-4 font-semibold text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="h-64 relative p-0">
                    <FullPageLoader message="Memuat Data Sponsor..." fullScreen={false} />
                  </td>
                </tr>
              ) : filteredSponsors.length === 0 ? (
                <tr>
                  <td colSpan={hasAccess ? 5 : 4} className="px-6 py-12 text-center text-slate-500">
                    Tidak ada data sponsor yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredSponsors.map((spn) => (
                  <tr key={spn.id_sponsor} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800 text-[15px] mb-1">{spn.nama_sponsor}</p>
                      {spn.pic !== "-" && (
                        <div className="flex items-center gap-1.5 text-slate-500 mb-0.5">
                          <Tag className="w-3 h-3" /> <span className="text-xs">{spn.pic}</span>
                        </div>
                      )}
                      {spn.kontak !== "-" && (
                        <div className="flex items-center gap-1.5 text-blue-600 mb-0.5">
                          <Phone className="w-3 h-3" /> 
                          <a href={spn.kontak.startsWith('http') ? spn.kontak : `tel:${spn.kontak}`} target="_blank" rel="noreferrer" className="text-xs hover:underline truncate max-w-[200px]">
                            {spn.kontak}
                          </a>
                        </div>
                      )}
                      {spn.email !== "-" && (
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Mail className="w-3 h-3" /> <span className="text-xs">{spn.email}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-700">
                      <div className="mb-1">
                        <span className="text-xs text-slate-400 block mb-0.5">Tgl Proposal:</span>
                        <span className="font-medium">{formatTanggal(spn.tgl_proposal)}</span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 block mb-0.5">Follow Up:</span>
                        <span className="font-medium text-amber-600">{formatTanggal(spn.tgl_followup)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold mb-2 ${getStatusColor(spn.status)}`}>
                        {spn.status}
                      </span>
                      <p className="text-sm text-slate-600 leading-relaxed max-w-xs">{spn.keterangan}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap max-w-xs">{spn.catatan}</p>
                    </td>
                    {hasAccess && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => openEditModal(spn)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Sponsor"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                          </button>
                          <button 
                            onClick={() => handleDelete(spn.id_sponsor)}
                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Hapus Sponsor"
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
                {editingSponsor ? 'Edit Data Sponsor' : 'Tambah Sponsor Baru'}
              </h2>
              <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveSponsor} className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nama Sponsor / Brand <span className="text-rose-500">*</span></label>
                  <input type="text" required value={formData.nama_sponsor} onChange={(e) => setFormData({...formData, nama_sponsor: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" placeholder="Contoh: PT. Semen Padang / Kopi Kenangan" />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">PIC / Kontak Person</label>
                  <input type="text" value={formData.pic} onChange={(e) => setFormData({...formData, pic: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" placeholder="Nama orang yg dihubungi" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">No. HP / Link Form</label>
                  <input type="text" value={formData.kontak} onChange={(e) => setFormData({...formData, kontak: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" placeholder="0812xxx atau link GForm" />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" placeholder="email@perusahaan.com" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tgl Pemberian Proposal</label>
                  <input type="text" value={formData.tgl_proposal} onChange={(e) => setFormData({...formData, tgl_proposal: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" placeholder="Misal: Selasa, 11 Agt 2026" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tgl Follow Up</label>
                  <input type="text" value={formData.tgl_followup} onChange={(e) => setFormData({...formData, tgl_followup: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" placeholder="Kapan akan ditanya lagi?" />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Status</label>
                  <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer">
                    {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Keterangan / Progress</label>
                  <textarea rows={2} value={formData.keterangan} onChange={(e) => setFormData({...formData, keterangan: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none" placeholder="Penjelasan singkat mengenai respons sponsor..." />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Catatan Khusus (Internal)</label>
                  <textarea rows={2} value={formData.catatan} onChange={(e) => setFormData({...formData, catatan: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none" placeholder="Contoh: Menunggu manajer kembali ke Padang" />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => { setIsModalOpen(false); resetForm(); }} className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                  Batal
                </button>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors flex items-center justify-center min-w-[120px]">
                  {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (editingSponsor ? 'Simpan' : 'Tambah Sponsor')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
