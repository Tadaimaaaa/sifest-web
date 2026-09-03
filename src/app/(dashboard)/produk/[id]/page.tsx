"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Edit2, Trash2, Package, TrendingUp, Image as ImageIcon, Minus, Plus, CheckCircle2, Target, DollarSign, ShoppingBag, ExternalLink, RefreshCcw, X, Download } from "lucide-react";
import * as XLSX from 'xlsx';
import { SCRIPT_URL } from "@/lib/api";
import Cookies from "js-cookie";
import { toast } from "sonner";
import Link from "next/link";

interface Varian {
  id_varian: string;
  nama_varian: string;
  foto?: string;
  jumlah: number;
  tanggal: string;
}

interface Distribusi {
  id_dist: string;
  nama_penerima: string;
  tanggal: string;
  items: {
    id_varian: string;
    nama_varian: string;
    jumlah: number;
  }[];
}

interface PenjualanBundle {
  id_penjualan: string;
  id_paket: string;
  nama_paket: string;
  total_harga: number;
  total_modal: number;
  tanggal: string;
  items: {
    id_varian: string;
    nama_varian: string;
    jumlah: number;
  }[];
}

interface Produk {
  id_produk: string;
  nama_produk: string;
  asal_sponsor: string;
  harga_satuan: number;
  target_penjualan: number;
  sudah_terjual: number;
  keterangan: string;
  foto_produk: string;
  added_by: string;
  varian?: Varian[];
  distribusi?: Distribusi[];
  penjualan_bundle?: PenjualanBundle[];
};

const getDriveThumbnail = (url: string) => {
  if (!url || url === '-') return null;
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
  }
  return null;
};

import { fetcher } from "@/lib/api";
import useSWR from "swr";

export default function ProdukDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  
  const { data: resData, error, isLoading, mutate } = useSWR(`?action=getProdukById&id=${id}`, fetcher);
  const produk: Produk | null = resData?.data || null;

  const [hasAccess, setHasAccess] = useState(false);
  
  // Modal edit
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    nama_produk: "",
    asal_sponsor: "",
    harga_satuan: "",
    target_penjualan: "",
    sudah_terjual: "",
    keterangan: "",
    foto_produk: "",
    fileData: "",
    fileName: "",
    mimeType: ""
  });

  const [isVarianModalOpen, setIsVarianModalOpen] = useState(false);
  const [isVarianSubmitting, setIsVarianSubmitting] = useState(false);
  const [varianFormData, setVarianFormData] = useState({
    nama_varian: "",
    jumlah: "",
    fileData: "",
    fileName: "",
    mimeType: ""
  });

  const [isDistribusiModalOpen, setIsDistribusiModalOpen] = useState(false);
  const [isDistribusiSubmitting, setIsDistribusiSubmitting] = useState(false);
  const [distribusiFormData, setDistribusiFormData] = useState({
    nama_penerima: "",
    tanggal: new Date().toISOString().split('T')[0],
    items: {} as Record<string, number>
  });

  type BundleType = {
    id: string;
    nama: string;
    harga: number;
    maxItems?: number;
    minItems?: number;
    isDynamic?: boolean;
  };

  const BUNDLES: BundleType[] = [
    { id: 'chill', nama: 'Paket Chill', harga: 15000, maxItems: 1 },
    { id: 'bestie', nama: 'Paket Bestie', harga: 27000, maxItems: 2 },
    { id: 'trio', nama: 'Paket Trio', harga: 39000, maxItems: 3 },
    { id: 'heboh', nama: 'Paket Heboh', harga: 50000, maxItems: 4 },
    { id: 'borongan', nama: 'Paket Borongan', harga: 12500, minItems: 5, isDynamic: true },
  ];
  const MODAL_SATUAN = 9000;

  const [isBundleModalOpen, setIsBundleModalOpen] = useState(false);
  const [selectedBundle, setSelectedBundle] = useState<BundleType | null>(null);
  const [bundleItems, setBundleItems] = useState<Record<string, number>>({});
  const [isBundleSubmitting, setIsBundleSubmitting] = useState(false);
  const [isDetailVarianOpen, setIsDetailVarianOpen] = useState(false);
  const [terjualOleh, setTerjualOleh] = useState("ara");

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka || 0);
  };

  useEffect(() => {
    try {
      const userDataStr = Cookies.get("user_data");
      if (userDataStr) {
        const user = JSON.parse(userDataStr);
        setHasAccess(["ROLE-001", "ROLE-006"].includes(user.role || ""));
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (resData && !resData.success) {
      toast.error("Produk tidak ditemukan");
      router.push("/produk");
    }
  }, [resData, router]);

  const handleDelete = async () => {
    if (!produk) return;
    if (!confirm(`Apakah Anda yakin ingin menghapus produk "${produk.nama_produk}"?`)) return;
    const token = Cookies.get("session_token");
    try {
      const payload = { action: "deleteProduk", token, id_produk: produk.id_produk };
      const res = await fetch(`${SCRIPT_URL}?action=deleteProduk`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Produk berhasil dihapus");
        router.push("/produk");
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("Terjadi kesalahan jaringan");
    }
  };

  const openEditModal = () => {
    if (!produk) return;
    setFormData({
      nama_produk: produk.nama_produk,
      asal_sponsor: produk.asal_sponsor,
      harga_satuan: produk.harga_satuan ? produk.harga_satuan.toLocaleString('id-ID') : "",
      target_penjualan: produk.target_penjualan?.toString() || "",
      sudah_terjual: produk.sudah_terjual?.toString() || "",
      keterangan: produk.keterangan !== "-" ? produk.keterangan : "",
      foto_produk: produk.foto_produk,
      fileData: "", fileName: "", mimeType: ""
    });
    setIsEditModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { toast.error("Maks 5MB"); return; }
      const reader = new FileReader();
      reader.onload = (event) => setFormData({ ...formData, fileData: event.target?.result as string, fileName: file.name, mimeType: file.type });
      reader.readAsDataURL(file);
    }
  };

  const handleVarianFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { toast.error("Maks 5MB"); return; }
      const reader = new FileReader();
      reader.onload = (event) => setVarianFormData({ ...varianFormData, fileData: event.target?.result as string, fileName: file.name, mimeType: file.type });
      reader.readAsDataURL(file);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!produk) return;
    setIsSubmitting(true);
    const token = Cookies.get("session_token");
    const payload = {
      action: "editProduk", token, id_produk: produk.id_produk,
      nama_produk: formData.nama_produk,
      asal_sponsor: formData.asal_sponsor,
      harga_satuan: parseInt(formData.harga_satuan.toString().replace(/\D/g, '') || "0", 10),
      target_penjualan: parseInt(formData.target_penjualan || "0", 10),
      sudah_terjual: parseInt(formData.sudah_terjual || "0", 10),
      keterangan: formData.keterangan,
      foto_produk: formData.foto_produk,
      fileData: formData.fileData, fileName: formData.fileName, mimeType: formData.mimeType
    };
    try {
      const res = await fetch(`${SCRIPT_URL}?action=editProduk`, { 
        method: "POST", 
        body: JSON.stringify(payload) 
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Produk berhasil diperbarui!");
        setIsEditModalOpen(false);
        mutate();
      } else {
        toast.error(data.message);
      }
    } catch { toast.error("Terjadi kesalahan jaringan"); }
    finally { setIsSubmitting(false); }
  };

  const handleAddVarian = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!produk) return;
    setIsVarianSubmitting(true);
    const token = Cookies.get("session_token");
    try {
      const payload = {
        action: "addVarianProduk",
        token,
        id_produk: produk.id_produk,
        nama_varian: varianFormData.nama_varian,
        jumlah: varianFormData.jumlah,
        fileData: varianFormData.fileData,
        fileName: varianFormData.fileName,
        mimeType: varianFormData.mimeType
      };
      const res = await fetch(`${SCRIPT_URL}?action=addVarianProduk`, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Varian berhasil ditambahkan!");
        setIsVarianModalOpen(false);
        setVarianFormData({ nama_varian: "", jumlah: "", fileData: "", fileName: "", mimeType: "" });
        mutate();
      } else {
        toast.error(data.message);
      }
    } catch { toast.error("Gagal menambahkan varian"); }
    finally { setIsVarianSubmitting(false); }
  };

  const handleUpdateVarianStock = async (id_varian: string, newJumlah: number) => {
    if (!produk || newJumlah < 0) return;
    const token = Cookies.get("session_token");
    try {
      const payload = { action: "updateVarianProduk", token, id_produk: produk.id_produk, id_varian, jumlah: newJumlah };
      const res = await fetch(`${SCRIPT_URL}?action=updateVarianProduk`, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        mutate();
      } else {
        toast.error(data.message);
      }
    } catch { toast.error("Gagal memperbarui stok"); }
  };

  const handleDeleteVarian = async (id_varian: string) => {
    if (!confirm("Hapus varian ini?")) return;
    if (!produk) return;
    const token = Cookies.get("session_token");
    try {
      const payload = { action: "deleteVarianProduk", token, id_produk: produk.id_produk, id_varian };
      const res = await fetch(`${SCRIPT_URL}?action=deleteVarianProduk`, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Varian dihapus!");
        mutate();
      } else {
        toast.error(data.message);
      }
    } catch { toast.error("Gagal menghapus varian"); }
  };

  const handleAddDistribusiMulti = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!produk) return;
    
    const items = Object.entries(distribusiFormData.items)
      .filter(([_, qty]) => qty > 0)
      .map(([id, qty]) => {
        const varianObj = produk.varian?.find(v => v.id_varian === id);
        return {
          id_varian: id,
          nama_varian: varianObj ? varianObj.nama_varian : id,
          jumlah: qty
        };
      });

    if (items.length === 0) {
      toast.error("Pilih minimal satu varian untuk didistribusikan.");
      return;
    }

    setIsDistribusiSubmitting(true);
    const token = Cookies.get("session_token");
    try {
      const payload = {
        action: "addDistribusiMultiProduk",
        token,
        id_produk: produk.id_produk,
        nama_penerima: distribusiFormData.nama_penerima,
        tanggal: distribusiFormData.tanggal,
        items
      };
      const res = await fetch(`${SCRIPT_URL}?action=addDistribusiMultiProduk`, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Distribusi berhasil disimpan!");
        setIsDistribusiModalOpen(false);
        setDistribusiFormData({ nama_penerima: "", tanggal: new Date().toISOString().split('T')[0], items: {} });
        mutate();
      } else {
        toast.error(data.message);
      }
    } catch { toast.error("Gagal menyimpan distribusi"); }
    finally { setIsDistribusiSubmitting(false); }
  };

  const handleDeleteDistribusi = async (id_dist: string) => {
    if (!confirm("Hapus data distribusi ini?")) return;
    if (!produk) return;
    const token = Cookies.get("session_token");
    try {
      const payload = { action: "deleteDistribusiProduk", token, id_produk: produk.id_produk, id_dist };
      const res = await fetch(`${SCRIPT_URL}?action=deleteDistribusiProduk`, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Data distribusi dihapus!");
        mutate();
      } else {
        toast.error(data.message);
      }
    } catch { toast.error("Gagal menghapus distribusi"); }
  };

  const handleAddPenjualanBundle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!produk || !selectedBundle) return;
    
    // Validasi kuota varian
    const totalSelected = Object.values(bundleItems).reduce((sum, val) => sum + val, 0);
    if (selectedBundle.isDynamic) {
      if (totalSelected < (selectedBundle.minItems || 0)) {
        toast.error(`Minimal pembelian ${selectedBundle.minItems} barang!`);
        return;
      }
    } else {
      if (totalSelected !== selectedBundle.maxItems) {
        toast.error(`Harus memilih tepat ${selectedBundle.maxItems} barang!`);
        return;
      }
    }

    setIsBundleSubmitting(true);
    const token = Cookies.get("session_token");
    
    const items = Object.entries(bundleItems)
      .filter(([_, qty]) => qty > 0)
      .map(([id_varian, qty]) => {
        const v = produk.varian?.find(x => x.id_varian === id_varian);
        return { id_varian, nama_varian: v?.nama_varian || "", jumlah: qty };
      });

    const finalHarga = selectedBundle.isDynamic ? totalSelected * selectedBundle.harga : selectedBundle.harga;
    const total_modal = selectedBundle.isDynamic ? totalSelected * MODAL_SATUAN : (selectedBundle.maxItems || 0) * MODAL_SATUAN;
    
    try {
      const payload = {
        action: "addPenjualanBundleProduk", token,
        id_produk: produk.id_produk,
        id_paket: selectedBundle.id,
        nama_paket: selectedBundle.nama,
        total_harga: finalHarga,
        total_modal: total_modal,
        terjual_oleh: terjualOleh,
        items
      };
      
      const res = await fetch(`${SCRIPT_URL}?action=addPenjualanBundleProduk`, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Penjualan berhasil dicatat!");
        setIsBundleModalOpen(false);
        setBundleItems({});
        mutate();
      } else {
        toast.error(data.message);
      }
    } catch { toast.error("Gagal mencatat penjualan"); }
    finally { setIsBundleSubmitting(false); }
  };

  const handleDeletePenjualanBundle = async (id_penjualan: string) => {
    if (!confirm("Hapus data penjualan bundle ini? (Stok akan dikembalikan)")) return;
    if (!produk) return;
    const token = Cookies.get("session_token");
    try {
      const payload = { action: "deletePenjualanBundleProduk", token, id_produk: produk.id_produk, id_penjualan };
      const res = await fetch(`${SCRIPT_URL}?action=deletePenjualanBundleProduk`, {
        method: "POST", body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Penjualan dibatalkan, stok dikembalikan!");
        mutate();
      } else {
        toast.error(data.message);
      }
    } catch { toast.error("Gagal membatalkan penjualan"); }
  };

  const handleExportPenjualanBundle = () => {
    if (!produk || !produk.penjualan_bundle || produk.penjualan_bundle.length === 0) {
      toast.error("Tidak ada data penjualan untuk diexport.");
      return;
    }

    try {
      const exportData = produk.penjualan_bundle.map((sale) => {
        const itemTerjual = sale.items.map(i => `${i.jumlah}x ${i.nama_varian}`).join(", ");
        return {
          "ID Penjualan": sale.id_penjualan,
          "Tanggal": new Date(sale.tanggal).toLocaleString('id-ID'),
          "Nama Paket": sale.nama_paket,
          "Item Terjual": itemTerjual,
          "Total Harga (Pendapatan)": sale.total_harga,
          "Total Modal": sale.total_modal || 0,
          "Untung Bersih": sale.total_harga - (sale.total_modal || 0)
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Penjualan Bundle");

      const wscols = [
        { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 40 },
        { wch: 25 }, { wch: 25 }, { wch: 25 }
      ];
      worksheet['!cols'] = wscols;

      XLSX.writeFile(workbook, `Penjualan_${produk.nama_produk.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success("Berhasil mengunduh data penjualan!");
    } catch (error) {
      toast.error("Gagal mengekspor file Excel");
      console.error(error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-48"></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-96 bg-slate-200 rounded-2xl"></div>
          <div className="space-y-4">
            <div className="h-8 bg-slate-200 rounded w-3/4"></div>
            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            <div className="h-32 bg-slate-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!produk) return null;

  const thumbnail = getDriveThumbnail(produk.foto_produk);
  const totalPendapatan = produk.penjualan_bundle?.reduce((sum, item) => sum + (item.total_harga || 0), 0) || 0;
  const totalModal = produk.penjualan_bundle?.reduce((sum, item) => sum + (item.total_modal || 0), 0) || 0;
  const untungBersih = totalPendapatan - totalModal;
  const totalPcsTerjual = produk.penjualan_bundle?.reduce((sum, sale) => {
    return sum + (sale.items?.reduce((itemSum, item) => itemSum + (item.jumlah || 0), 0) || 0);
  }, 0) || 0;

  const varianTerjual: Record<string, { nama: string; jumlah: number; foto?: string }> = {};
  produk.penjualan_bundle?.forEach(sale => {
    sale.items?.forEach(item => {
      if (!varianTerjual[item.id_varian]) {
        const variantData = produk.varian?.find(v => v.id_varian === item.id_varian);
        varianTerjual[item.id_varian] = { 
          nama: item.nama_varian, 
          jumlah: 0,
          foto: variantData?.foto
        };
      }
      varianTerjual[item.id_varian].jumlah += (item.jumlah || 0);
    });
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Breadcrumb / Back */}
      <div className="flex items-center gap-3">
        <Link href="/produk" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Kembali ke Katalog
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium text-slate-700 truncate">{produk.nama_produk}</span>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* Left: Product Image & Varian */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="aspect-square w-full bg-slate-100 relative">
              {thumbnail ? (
                <img src={thumbnail} alt={produk.nama_produk} className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300">
                  <ImageIcon className="w-20 h-20 mb-3" />
                  <span className="text-sm font-medium uppercase tracking-widest">Belum Ada Foto</span>
                </div>
              )}
            </div>
            {produk.foto_produk && produk.foto_produk !== "-" && (
              <div className="p-4 border-t border-slate-100">
                <a href={produk.foto_produk} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors font-medium">
                  <ExternalLink className="w-4 h-4" /> Buka foto di Google Drive
                </a>
              </div>
            )}
          </div>

          {/* Varian & Stok Barang */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                📦 Varian & Stok
                {produk.varian && produk.varian.length > 0 && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-black rounded-md">
                    Total: {produk.varian.reduce((sum, v) => sum + (v.jumlah || 0), 0)} pcs
                  </span>
                )}
              </h3>
              {hasAccess && (
                <button
                  onClick={() => setIsVarianModalOpen(true)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Varian
                </button>
              )}
            </div>
            
            {!produk.varian || produk.varian.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">
                Belum ada data varian barang.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                {produk.varian.map((varItem) => (
                  <div key={varItem.id_varian} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      {varItem.foto && varItem.foto !== "-" && (
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                          <img src={getDriveThumbnail(varItem.foto) || varItem.foto} alt={varItem.nama_varian} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-bold text-slate-800">{varItem.nama_varian}</p>
                        <p className="text-xs text-slate-400 mt-0.5">Ditambahkan: {new Date(varItem.tanggal).toLocaleDateString('id-ID')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasAccess && (
                        <button
                          onClick={() => handleUpdateVarianStock(varItem.id_varian, Math.max(0, varItem.jumlah - 1))}
                          className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors shadow-sm font-bold"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                      )}
                      <span className="w-12 text-center text-base font-black text-slate-700">{varItem.jumlah}</span>
                      {hasAccess && (
                        <button
                          onClick={() => handleUpdateVarianStock(varItem.id_varian, varItem.jumlah + 1)}
                          className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors shadow-sm font-bold"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      )}
                      {hasAccess && (
                        <button
                          onClick={() => handleDeleteVarian(varItem.id_varian)}
                          className="w-7 h-7 rounded-lg bg-white border border-rose-100 text-rose-500 flex items-center justify-center hover:bg-rose-50 transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 shadow-sm ml-1"
                          title="Hapus Varian"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Product Info */}
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-1">{produk.asal_sponsor}</p>
              <h1 className="text-3xl font-black text-slate-800 leading-tight">{produk.nama_produk}</h1>
              <p className="text-xs text-slate-400 mt-1 font-mono">{produk.id_produk}</p>
            </div>
            {hasAccess && (
              <div className="flex gap-2 shrink-0">
                <button onClick={openEditModal} className="p-2.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors border border-blue-100" title="Edit">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={handleDelete} className="p-2.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors border border-rose-100" title="Hapus">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Distribusi Multi (Alokasi) */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mt-4">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                📋 Riwayat Distribusi
                {produk.distribusi && produk.distribusi.length > 0 && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-black rounded-md">
                    Total: {produk.distribusi.reduce((sum, dist) => sum + (dist.items?.reduce((itemSum, item) => itemSum + (item.jumlah || 0), 0) || 0), 0)} pcs
                  </span>
                )}
              </h3>
              {hasAccess && (
                <button
                  onClick={() => setIsDistribusiModalOpen(true)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Bagikan ke Panitia
                </button>
              )}
            </div>
            
            {!produk.distribusi || produk.distribusi.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">
                Belum ada data riwayat distribusi barang.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
                {produk.distribusi.map((dist) => (
                  <div key={dist.id_dist} className="p-4 hover:bg-slate-50 transition-colors group">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-bold text-slate-800">{dist.nama_penerima}</p>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400">{new Date(dist.tanggal).toLocaleDateString('id-ID', { dateStyle: 'medium' })}</span>
                        {hasAccess && (
                          <button
                            onClick={() => handleDeleteDistribusi(dist.id_dist)}
                            className="w-7 h-7 rounded-lg bg-white border border-rose-100 text-rose-500 flex items-center justify-center hover:bg-rose-50 transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 shadow-sm"
                            title="Hapus Distribusi"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    {/* List of taken items */}
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {dist.items?.map(item => (
                        <div key={item.id_varian} className="flex items-center justify-between bg-white border border-slate-100 px-3 py-1.5 rounded-lg">
                          <span className="text-xs font-medium text-slate-600 truncate mr-2" title={item.nama_varian}>{item.nama_varian}</span>
                          <span className="text-xs font-bold text-slate-800 shrink-0">{item.jumlah} pcs</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stats Grid Premium */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 lg:gap-4">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 md:p-5 flex flex-col justify-center shadow-sm">
              <p className="text-[10px] md:text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Harga Satuan</p>
              <p className="text-lg xl:text-xl 2xl:text-2xl font-black tracking-tight text-slate-800">{formatRupiah(produk.harga_satuan)}</p>
            </div>
            
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-4 md:p-5 text-white shadow-lg shadow-orange-500/20 flex flex-col justify-center">
              <p className="text-orange-100 text-[10px] md:text-xs font-bold uppercase tracking-wider mb-1">Total Terjual</p>
              <p className="text-lg xl:text-xl 2xl:text-2xl font-black tracking-tight">{totalPcsTerjual} <span className="text-xs md:text-sm font-medium opacity-80">pcs</span></p>
            </div>
            
            <button 
              onClick={() => setIsDetailVarianOpen(true)}
              className="bg-white border border-slate-200 rounded-2xl p-3 md:p-4 hover:border-blue-300 hover:bg-blue-50 transition-colors flex items-center justify-center gap-3 cursor-pointer group shadow-sm col-span-2 md:col-span-1"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all shrink-0">
                <Target className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-wider mb-0.5">Rincian</p>
                <p className="text-sm md:text-base font-black tracking-tight text-slate-800 group-hover:text-blue-700 transition-colors whitespace-nowrap">Lihat Detail</p>
              </div>
            </button>

            <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl p-4 md:p-5 text-white shadow-lg shadow-emerald-500/20 flex flex-col justify-center">
              <p className="text-emerald-100 text-[10px] md:text-xs font-bold uppercase tracking-wider mb-1">Pendapatan</p>
              <p className="text-lg xl:text-xl 2xl:text-2xl font-black tracking-tight">{formatRupiah(totalPendapatan)}</p>
            </div>
            
            <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 shadow-sm flex flex-col justify-center">
              <p className="text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-wider mb-1">Modal Dasar</p>
              <p className="text-lg xl:text-xl 2xl:text-2xl font-black tracking-tight text-slate-700">{formatRupiah(totalModal)}</p>
            </div>
            
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-4 md:p-5 text-white shadow-lg shadow-blue-500/20 flex flex-col justify-center col-span-2 md:col-span-1">
              <p className="text-blue-100 text-[10px] md:text-xs font-bold uppercase tracking-wider mb-1">Laba Bersih</p>
              <p className="text-lg xl:text-xl 2xl:text-2xl font-black tracking-tight">{formatRupiah(untungBersih)}</p>
            </div>
          </div>

          {/* POS Kasir Bundle */}
          {hasAccess && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mt-4">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="text-sm font-bold text-slate-700">🛒 Penjualan Paket Bundle</h3>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {BUNDLES.map(bundle => (
                  <div key={bundle.id} className="border border-slate-100 rounded-xl p-3 flex flex-col justify-between hover:border-blue-200 hover:bg-blue-50/50 transition-colors group">
                    <div>
                      <p className="font-bold text-slate-800">{bundle.nama}</p>
                      <p className="text-xs text-slate-500 mb-3">{bundle.isDynamic ? `Minimal ${bundle.minItems} Varian Barang` : `${bundle.maxItems} Varian Barang`}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="font-black text-blue-600">{bundle.isDynamic ? `${formatRupiah(bundle.harga)}/pcs` : formatRupiah(bundle.harga)}</p>
                      <button
                        onClick={() => {
                          setSelectedBundle(bundle);
                          setBundleItems({});
                          setTerjualOleh("ara");
                          setIsBundleModalOpen(true);
                        }}
                        className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Riwayat Penjualan Bundle */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mt-4">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-700">🧾 Riwayat Penjualan Bundle</h3>
              {produk.penjualan_bundle && produk.penjualan_bundle.length > 0 && (
                <button
                  onClick={handleExportPenjualanBundle}
                  className="px-3 py-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" /> Export Excel
                </button>
              )}
            </div>
            {!produk.penjualan_bundle || produk.penjualan_bundle.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">Belum ada riwayat penjualan.</div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
                {produk.penjualan_bundle.map(sale => (
                  <div key={sale.id_penjualan} className="p-4 hover:bg-slate-50 transition-colors group">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-sm font-bold text-slate-800">{sale.nama_paket}</p>
                        <p className="text-xs text-slate-400">{new Date(sale.tanggal).toLocaleString('id-ID')}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-sm font-black text-emerald-600">+{formatRupiah(sale.total_harga)}</p>
                        {hasAccess && (
                          <button
                            onClick={() => handleDeletePenjualanBundle(sale.id_penjualan)}
                            className="w-7 h-7 rounded-lg bg-white border border-rose-100 text-rose-500 flex items-center justify-center hover:bg-rose-50 transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 shadow-sm"
                            title="Batalkan Penjualan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {sale.items.map(item => (
                        <span key={item.id_varian} className="inline-flex items-center px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">
                          {item.jumlah}x {item.nama_varian}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>



          <p className="text-xs text-slate-400 text-right">Ditambahkan oleh: {produk.added_by}</p>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-slate-800">Edit Produk Sponsor</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nama Produk <span className="text-rose-500">*</span></label>
                  <input type="text" required value={formData.nama_produk} onChange={(e) => setFormData({...formData, nama_produk: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Asal Sponsor <span className="text-rose-500">*</span></label>
                  <input type="text" required value={formData.asal_sponsor} onChange={(e) => setFormData({...formData, asal_sponsor: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Harga Satuan (Rp)</label>
                  <input type="text" value={formData.harga_satuan} onChange={(e) => { const val = e.target.value.replace(/\D/g, ''); setFormData({...formData, harga_satuan: val ? parseInt(val).toLocaleString('id-ID') : ''}); }} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Target (Pcs)</label>
                    <input type="number" value={formData.target_penjualan} onChange={(e) => setFormData({...formData, target_penjualan: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Terjual (Pcs)</label>
                    <input type="number" value={formData.sudah_terjual} onChange={(e) => setFormData({...formData, sudah_terjual: e.target.value})} className="w-full px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-900 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Keterangan</label>
                  <textarea rows={2} value={formData.keterangan} onChange={(e) => setFormData({...formData, keterangan: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Ganti Foto Produk <span className="text-slate-400 font-normal">(kosongkan jika tidak ganti)</span></label>
                  {formData.fileData ? (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <img src={formData.fileData} alt="" className="w-12 h-12 rounded-lg object-cover border" />
                      <span className="text-sm font-medium text-slate-700 flex-1 truncate">{formData.fileName}</span>
                      <button type="button" onClick={() => setFormData({...formData, fileData: "", fileName: "", mimeType: ""})} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <input type="file" accept="image/*" onChange={handleFileChange} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/50 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                  )}
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Batal</button>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-colors flex items-center justify-center min-w-[120px]">
                  {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Varian Modal */}
      {isVarianModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Tambah Varian Produk</h2>
              <button onClick={() => setIsVarianModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddVarian} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nama Varian / Rasa <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Keripik Pisang Coklat"
                  value={varianFormData.nama_varian}
                  onChange={(e) => setVarianFormData({ ...varianFormData, nama_varian: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Foto Varian <span className="text-slate-400 font-normal">(opsional)</span></label>
                  {varianFormData.fileData ? (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <img src={varianFormData.fileData} alt="" className="w-12 h-12 rounded-lg object-cover border" />
                      <span className="text-sm font-medium text-slate-700 flex-1 truncate">{varianFormData.fileName}</span>
                      <button type="button" onClick={() => setVarianFormData({...varianFormData, fileData: "", fileName: "", mimeType: ""})} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <input type="file" accept="image/*" onChange={handleVarianFileChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/50 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                  )}
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Stok Awal <span className="text-rose-500">*</span></label>
                  <input
                    type="number"
                    required
                    min={0}
                    placeholder="0"
                    value={varianFormData.jumlah}
                    onChange={(e) => setVarianFormData({ ...varianFormData, jumlah: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsVarianModalOpen(false)} className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Batal</button>
                <button type="submit" disabled={isVarianSubmitting} className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-colors flex items-center justify-center min-w-[120px]">
                  {isVarianSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Simpan Varian'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Distribusi Multi Modal */}
      {isDistribusiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-bold text-slate-800">Bagikan ke Panitia</h2>
              <button onClick={() => setIsDistribusiModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddDistribusiMulti} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tanggal Distribusi <span className="text-rose-500">*</span></label>
                <input
                  type="date"
                  required
                  value={distribusiFormData.tanggal}
                  onChange={(e) => setDistribusiFormData({ ...distribusiFormData, tanggal: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nama Panitia / Penerima <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Budi (Div. Danus)"
                  value={distribusiFormData.nama_penerima}
                  onChange={(e) => setDistribusiFormData({ ...distribusiFormData, nama_penerima: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">Tentukan Jumlah per Varian</label>
                {!produk.varian || produk.varian.length === 0 ? (
                  <div className="text-sm text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                    Belum ada varian produk. Silakan tambah varian terlebih dahulu.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {produk.varian.map((varItem) => {
                      const qty = distribusiFormData.items[varItem.id_varian] || 0;
                      return (
                        <div key={varItem.id_varian} className="flex items-center justify-between bg-white border border-slate-200 p-3 rounded-xl shadow-sm">
                          <div className="flex items-center gap-3">
                            {varItem.foto && varItem.foto !== "-" ? (
                              <img src={getDriveThumbnail(varItem.foto) || varItem.foto} alt="" className="w-8 h-8 rounded border object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded border bg-slate-100 flex items-center justify-center text-slate-400">
                                <Package className="w-4 h-4" />
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-bold text-slate-800">{varItem.nama_varian}</p>
                              <p className="text-xs text-slate-400">Stok: {varItem.jumlah}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-1 border border-slate-200">
                            <button
                              type="button"
                              onClick={() => setDistribusiFormData(prev => ({
                                ...prev,
                                items: { ...prev.items, [varItem.id_varian]: Math.max(0, qty - 1) }
                              }))}
                              className="w-8 h-8 rounded-md bg-white border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-100 transition-colors font-bold shadow-sm"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-8 text-center text-sm font-black text-slate-800">{qty}</span>
                            <button
                              type="button"
                              onClick={() => setDistribusiFormData(prev => ({
                                ...prev,
                                items: { ...prev.items, [varItem.id_varian]: qty + 1 }
                              }))}
                              className="w-8 h-8 rounded-md bg-white border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-100 transition-colors font-bold shadow-sm"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
              
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 sticky bottom-0 bg-white">
                <button type="button" onClick={() => setIsDistribusiModalOpen(false)} className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Batal</button>
                <button type="submit" disabled={isDistribusiSubmitting || (!produk.varian || produk.varian.length === 0)} className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-colors flex items-center justify-center min-w-[120px]">
                  {isDistribusiSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Simpan Distribusi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bundle Modal */}
      {isBundleModalOpen && selectedBundle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="border-b border-slate-100 px-6 py-4 flex flex-col gap-3 shrink-0 bg-blue-50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Kasir: {selectedBundle.nama}</h2>
                  <p className="text-xs text-blue-600 font-medium mt-0.5">
                    {selectedBundle.isDynamic ? `Pilih minimal ${selectedBundle.minItems} barang` : `Pilih ${selectedBundle.maxItems} barang yang terjual`}
                  </p>
                </div>
                <button onClick={() => setIsBundleModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex items-center gap-3 mt-1">
                <label className="text-sm font-semibold text-slate-700 whitespace-nowrap">Terjual Oleh:</label>
                <select
                  value={terjualOleh}
                  onChange={(e) => { setTerjualOleh(e.target.value); setBundleItems({}); }}
                  className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="ara">Ara (Stok Utama)</option>
                  {produk.distribusi?.map(dist => (
                    <option key={dist.id_dist} value={dist.nama_penerima}>{dist.nama_penerima} (Distributor)</option>
                  ))}
                </select>
              </div>
            </div>
            
            <form onSubmit={handleAddPenjualanBundle} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                {!produk.varian || produk.varian.length === 0 ? (
                  <div className="text-sm text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                    Belum ada varian produk. Silakan tambah varian terlebih dahulu.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {produk.varian.map((varItem) => {
                      let maxStock = varItem.jumlah;
                      if (terjualOleh !== "ara") {
                        const dist = produk.distribusi?.find(d => d.nama_penerima === terjualOleh);
                        const distItem = dist?.items?.find(i => i.id_varian === varItem.id_varian);
                        maxStock = distItem?.jumlah || 0;
                      }

                      if (terjualOleh !== "ara" && maxStock === 0) return null;

                      const qty = bundleItems[varItem.id_varian] || 0;
                      const totalSelected = Object.values(bundleItems).reduce((sum, val) => sum + val, 0);
                      
                      return (
                        <div key={varItem.id_varian} className={`flex items-center justify-between bg-white border border-slate-200 p-3 rounded-xl shadow-sm transition-colors ${maxStock === 0 ? 'opacity-50 grayscale' : 'hover:border-blue-200'}`}>
                          <div className="flex items-center gap-3">
                            {varItem.foto && varItem.foto !== "-" ? (
                              <img src={getDriveThumbnail(varItem.foto) || varItem.foto} alt="" className="w-10 h-10 rounded-lg border object-cover" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg border bg-slate-100 flex items-center justify-center text-slate-400">
                                <Package className="w-5 h-5" />
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-bold text-slate-800">{varItem.nama_varian}</p>
                              <p className={`text-xs ${maxStock === 0 ? 'text-rose-500 font-semibold' : 'text-slate-400'}`}>
                                {terjualOleh !== "ara" ? `Stok Distributor: ${maxStock}` : `Sisa Stok: ${maxStock}`}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-1 border border-slate-200">
                            <button
                              type="button"
                              disabled={qty <= 0}
                              onClick={() => setBundleItems(prev => ({ ...prev, [varItem.id_varian]: Math.max(0, qty - 1) }))}
                              className="w-8 h-8 rounded-md bg-white border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-100 transition-colors font-bold shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-8 text-center text-base font-black text-slate-800">{qty}</span>
                            <button
                              type="button"
                              disabled={(!selectedBundle.isDynamic && totalSelected >= (selectedBundle.maxItems || 0)) || qty >= maxStock}
                              onClick={() => setBundleItems(prev => ({ ...prev, [varItem.id_varian]: qty + 1 }))}
                              className="w-8 h-8 rounded-md bg-white border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-100 transition-colors font-bold shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
              
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 sticky bottom-0 bg-white">
                <div className="flex-1">
                  <p className="text-xs text-slate-500 font-semibold">Total Terpilih:</p>
                  <p className={`text-lg font-black ${
                    selectedBundle.isDynamic 
                      ? (Object.values(bundleItems).reduce((sum, val) => sum + val, 0) >= (selectedBundle.minItems || 0) ? 'text-emerald-600' : 'text-slate-700')
                      : (Object.values(bundleItems).reduce((sum, val) => sum + val, 0) === selectedBundle.maxItems ? 'text-emerald-600' : 'text-slate-700')
                  }`}>
                    {Object.values(bundleItems).reduce((sum, val) => sum + val, 0)} {selectedBundle.isDynamic ? `(Min. ${selectedBundle.minItems})` : `/ ${selectedBundle.maxItems}`}
                  </p>
                  {selectedBundle.isDynamic && (
                     <p className="text-xs font-bold text-blue-600 mt-1">Total: {formatRupiah(Object.values(bundleItems).reduce((sum, val) => sum + val, 0) * selectedBundle.harga)}</p>
                  )}
                </div>
                <button type="button" onClick={() => setIsBundleModalOpen(false)} className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Batal</button>
                <button 
                  type="submit" 
                  disabled={
                    isBundleSubmitting || 
                    (selectedBundle.isDynamic 
                      ? Object.values(bundleItems).reduce((sum, val) => sum + val, 0) < (selectedBundle.minItems || 0)
                      : Object.values(bundleItems).reduce((sum, val) => sum + val, 0) !== selectedBundle.maxItems)
                  } 
                  className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors flex items-center justify-center min-w-[120px] shadow-md shadow-blue-500/20"
                >
                  {isBundleSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Catat Penjualan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Varian Terjual Modal */}
      {isDetailVarianOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between shrink-0 bg-amber-50">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Detail Varian Terjual</h2>
                <p className="text-xs text-amber-600 font-medium mt-0.5">Total Keseluruhan: {totalPcsTerjual} pcs</p>
              </div>
              <button onClick={() => setIsDetailVarianOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {Object.keys(varianTerjual).length === 0 ? (
                <div className="text-sm text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                  Belum ada varian yang terjual.
                </div>
              ) : (
                Object.values(varianTerjual).sort((a,b) => b.jumlah - a.jumlah).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-white border border-slate-200 p-3 rounded-xl shadow-sm hover:border-amber-200 transition-colors">
                    <div className="flex items-center gap-3">
                      {item.foto && item.foto !== "-" ? (
                        <img src={getDriveThumbnail(item.foto) || item.foto} alt={item.nama} className="w-10 h-10 rounded-lg border object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg border bg-slate-100 flex items-center justify-center text-slate-400">
                          <Package className="w-5 h-5" />
                        </div>
                      )}
                      <p className="text-sm font-bold text-slate-800">{item.nama}</p>
                    </div>
                    <span className="px-3 py-1 bg-amber-100 text-amber-700 text-sm font-black rounded-lg shadow-sm border border-amber-200 shrink-0">{item.jumlah} pcs</span>
                  </div>
                ))
              )}
            </div>
            
            <div className="pt-4 border-t border-slate-100 flex justify-end px-6 pb-6 bg-white">
              <button type="button" onClick={() => setIsDetailVarianOpen(false)} className="w-full px-5 py-2.5 text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl transition-colors shadow-lg">Tutup Rincian</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
