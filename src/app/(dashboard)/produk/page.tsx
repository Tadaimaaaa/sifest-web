"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Package, Image as ImageIcon, RefreshCcw, X, Trash2 } from "lucide-react";
import { SCRIPT_URL } from "@/lib/api";
import Cookies from "js-cookie";
import { toast } from "sonner";
import FullPageLoader from "@/components/FullPageLoader";

type Produk = {
  id_produk: string;
  nama_produk: string;
  asal_sponsor: string;
  harga_satuan: number;
  target_penjualan: number;
  sudah_terjual: number;
  keterangan: string;
  foto_produk: string;
  added_by: string;
};

const getDriveThumbnail = (url: string) => {
  if (!url || url === '-') return null;
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
  if (match?.[1]) return `/api/image-proxy?url=${encodeURIComponent(url)}`;
  return null;
};

import { fetcher } from "@/lib/api";
import useSWR from "swr";

export default function ProdukSponsorPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [hasAccess, setHasAccess] = useState(false);

  const { data: resData, error, isLoading, mutate } = useSWR("?action=getProduk", fetcher);
  const produkList: Produk[] = resData?.data || [];

  // Modal tambah produk
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    nama_produk: "", asal_sponsor: "", harga_satuan: "",
    target_penjualan: "", sudah_terjual: "0", keterangan: "",
    fileData: "", fileName: "", mimeType: ""
  });

  // Delete modal
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const formatRupiah = (angka: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka || 0);

  useEffect(() => {
    try {
      const ud = Cookies.get("user_data");
      if (ud) setHasAccess(["ROLE-001", "ROLE-006"].includes(JSON.parse(ud).role || ""));
    } catch {}
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Maks 5MB"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setFormData({ ...formData, fileData: ev.target?.result as string, fileName: file.name, mimeType: file.type });
    reader.readAsDataURL(file);
  };

  const handleTambah = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const token = Cookies.get("session_token");
    try {
      const payload = {
        action: "addProduk", token,
        nama_produk: formData.nama_produk,
        asal_sponsor: formData.asal_sponsor,
        harga_satuan: parseInt(formData.harga_satuan.replace(/\D/g, '') || "0"),
        target_penjualan: parseInt(formData.target_penjualan || "0"),
        sudah_terjual: parseInt(formData.sudah_terjual || "0"),
        keterangan: formData.keterangan,
        fileData: formData.fileData, fileName: formData.fileName, mimeType: formData.mimeType
      };
      
      const res = await fetch(`${SCRIPT_URL}?action=addProduk`, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Produk berhasil ditambahkan!");
        setIsModalOpen(false);
        setFormData({ nama_produk: "", asal_sponsor: "", harga_satuan: "", target_penjualan: "", sudah_terjual: "0", keterangan: "", fileData: "", fileName: "", mimeType: "" });
        mutate();
      } else toast.error(data.message);
    } catch { toast.error("Gagal menyimpan produk"); }
    finally { setIsSubmitting(false); }
  };

  const confirmDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDeletingId(id);
  };

  const executeDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    const token = Cookies.get("session_token");
    try {
      const payload = { action: "deleteProduk", token, id_produk: deletingId };
      const res = await fetch(`${SCRIPT_URL}?action=deleteProduk`, { 
        method: "POST", 
        body: JSON.stringify(payload) 
      });
      const data = await res.json();
      if (data.success) { 
        toast.success("Produk berhasil dihapus"); 
        mutate(); 
        setDeletingId(null);
      }
      else toast.error(data.message);
    } catch { toast.error("Gagal menghapus produk"); }
    finally { setIsDeleting(false); }
  };

  const filtered = produkList.filter(p =>
    p.nama_produk.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.asal_sponsor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Katalog Produk Sponsor</h1>
          <p className="text-sm text-slate-500 mt-1">Klik kartu produk untuk melihat detail dan memperbarui penjualan.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => mutate()} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 transition-colors shadow-sm">
            <RefreshCcw className="w-4 h-4" />
          </button>
          {hasAccess && (
            <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm">
              <Plus className="w-4 h-4" /> Tambah Produk
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Cari produk atau sponsor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
        />
      </div>

      {/* Grid Produk */}
      {isLoading ? (
        <div className="h-64 relative w-full">
          <FullPageLoader message="Memuat Katalog Produk..." fullScreen={false} />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.length === 0 ? (
          <div className="col-span-full py-24 flex flex-col items-center text-center bg-white rounded-2xl border border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
              <Package className="w-8 h-8 text-slate-300" />
            </div>
            <p className="font-semibold text-slate-600">Belum ada produk</p>
            <p className="text-sm text-slate-400 mt-1">Tambahkan produk dari sponsor untuk mulai melacak penjualan.</p>
          </div>
        ) : (
          filtered.map((prd) => {
            const thumb = getDriveThumbnail(prd.foto_produk);

            return (
              <div 
                key={prd.id_produk} 
                onClick={() => router.push(`/produk/${prd.id_produk}`)} 
                className="group block cursor-pointer"
              >
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md hover:-translate-y-1 transition-all duration-200">
                  
                  {/* Foto */}
                  <div className="aspect-square w-full bg-slate-100 relative overflow-hidden">
                    {thumb ? (
                      <img src={thumb} alt={prd.nama_produk} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300">
                        <ImageIcon className="w-10 h-10 mb-1" />
                        <span className="text-[10px] uppercase tracking-widest">No Image</span>
                      </div>
                    )}
                    {hasAccess && (
                      <button
                        onClick={(e) => confirmDelete(e, prd.id_produk)}
                        className="absolute top-2 left-2 p-1.5 bg-white/90 backdrop-blur text-rose-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-rose-50 z-10"
                        title="Hapus"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Info */}
                  <div className="px-3 py-3">
                    <p className="font-bold text-slate-800 text-sm leading-tight line-clamp-2">{prd.nama_produk}</p>
                    <p className="text-[11px] text-blue-600 font-medium mt-0.5 truncate">{prd.asal_sponsor}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => !isDeleting && setDeletingId(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Hapus Produk?</h3>
              <p className="text-slate-500 text-sm mb-6">
                Tindakan ini tidak dapat dibatalkan. Data produk akan dihapus secara permanen.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeletingId(null)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={executeDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-rose-500 text-white font-semibold text-sm hover:bg-rose-600 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <RefreshCcw className="w-4 h-4 animate-spin" />
                      Menghapus...
                    </>
                  ) : (
                    "Ya, Hapus"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-t-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-slate-800">Tambah Produk Baru</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleTambah} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nama Produk <span className="text-rose-500">*</span></label>
                <input required value={formData.nama_produk} onChange={(e) => setFormData({...formData, nama_produk: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" placeholder="Kopi Americano" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Asal Sponsor <span className="text-rose-500">*</span></label>
                <input required value={formData.asal_sponsor} onChange={(e) => setFormData({...formData, asal_sponsor: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" placeholder="Nama Brand" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Foto Produk <span className="text-slate-400 font-normal">(Opsional)</span></label>
                {formData.fileData ? (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <img src={formData.fileData} alt="" className="w-12 h-12 rounded-lg object-cover border" />
                    <span className="text-sm text-slate-700 flex-1 truncate">{formData.fileName}</span>
                    <button type="button" onClick={() => setFormData({...formData, fileData:"", fileName:"", mimeType:""})} className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <input type="file" accept="image/*" onChange={handleFileChange} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/50 focus:outline-none file:mr-4 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                )}
              </div>
              <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Batal</button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl flex items-center gap-2 min-w-[120px] justify-center">
                  {isSubmitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Simpan Produk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Loaders */}
      {isDeleting && <FullPageLoader message="Menghapus Produk..." />}
      {isSubmitting && <FullPageLoader message="Menyimpan Produk..." />}
    </div>
  );
}
