"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  X, 
  Printer, 
  Download, 
  Plus, 
  Trash2, 
  Eye, 
  Receipt, 
  RotateCcw, 
  ChevronDown, 
  ChevronUp,
  FileText,
  Building,
  User,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import { toJpeg } from "html-to-image";
import { jsPDF } from "jspdf";
import Swal from "sweetalert2";

export interface InvoiceItem {
  id: string;
  description: string;
  qty: number;
  unitPrice: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  wave: string; // Gelombang Pendaftaran
  
  // Ditagihkan Kepada
  teamOrParticipantName: string;
  leaderName: string;
  institution: string;
  email: string;
  whatsapp: string;
  
  // Rincian Biaya
  items: InvoiceItem[];
  
  // Metode & Instruksi Pembayaran
  bankBri: string;
  bankBsi: string;
  notes1: string;
  notes2: string;
  
  // Tanda Tangan
  leaderNameSign: string;
  leaderRoleSign: string;
  treasurerNameSign: string;
  treasurerRoleSign: string;
  signaturePlaceDate: string;
  
  // Path file tanda tangan asli
  leaderSignatureUrl: string;
  treasurerSignatureUrl: string;
}

// Format tanggal hari ini dalam bahasa Indonesia
const getTodayDateFormatted = () => {
  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  const now = new Date();
  return `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
};

// Pengelolaan nomor urut invoice otomatis
const getStoredInvoiceSeq = (): number => {
  if (typeof window === "undefined") return 101;
  const stored = localStorage.getItem("sifest_invoice_seq");
  if (!stored) {
    localStorage.setItem("sifest_invoice_seq", "101");
    return 101;
  }
  const parsed = parseInt(stored, 10);
  return isNaN(parsed) || parsed < 1 ? 101 : parsed;
};

const formatInvoiceNumber = (seq: number): string => {
  return `INV/SIFEST/2026/${String(seq).padStart(3, "0")}`;
};

// Data invoice baru
const getInitialInvoiceData = (): InvoiceData => {
  const today = getTodayDateFormatted();
  const seq = getStoredInvoiceSeq();
  return {
    invoiceNumber: formatInvoiceNumber(seq),
    invoiceDate: today,
    wave: "Gelombang 1",
    
    // Dimulai kosong sesuai permintaan panitia
    teamOrParticipantName: "",
    leaderName: "",
    institution: "",
    email: "",
    whatsapp: "",
    
    items: [
      {
        id: "1",
        description: "",
        qty: 1,
        unitPrice: 0
      }
    ],
    
    // Pengaturan standar panitia
    bankBri: "Bank BRI: 817301013354530 a.n. ZHARA DELVIA PUTRI",
    bankBsi: "Bank BSI: 7369755115 a.n. Fachratun Rahima",
    notes1: "Unggah bukti transfer melalui dasbor pendaftaran di website official.sifest.my.id",
    notes2: "Kontak konfirmasi Whatsapp: 0851-8577-8725 (Fachratun Rahima).",
    
    leaderNameSign: "Dilan Afri Jones",
    leaderRoleSign: "Ketua Pelaksana SIFEST 2026",
    treasurerNameSign: "Zhara Delvia Putri",
    treasurerRoleSign: "Bendahara SIFEST 2026",
    signaturePlaceDate: `Padang, ${today}`,
    
    // Menggunakan berkas tanda tangan ASLI panitia dari dokumen PDF
    leaderSignatureUrl: "/signatures/ttd-dilan.png",
    treasurerSignatureUrl: "/signatures/ttd-zhara.png"
  };
};

export default function InvoiceModal({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
}) {
  const [data, setData] = useState<InvoiceData>(getInitialInvoiceData());
  const [activeTab, setActiveTab] = useState<"form" | "preview">("form");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const printRef = useRef<HTMLDivElement>(null);

  // Perbarui nomor urut dan tanggal saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      setActiveTab("form");
      const currentSeq = getStoredInvoiceSeq();
      setData(prev => ({
        ...prev,
        invoiceNumber: prev.invoiceNumber ? prev.invoiceNumber : formatInvoiceNumber(currentSeq),
        invoiceDate: getTodayDateFormatted(),
        signaturePlaceDate: `Padang, ${getTodayDateFormatted()}`
      }));
    }
  }, [isOpen]);

  // Tutup dengan tombol Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totalPayment = data.items.reduce((sum, item) => sum + (Number(item.qty || 0) * Number(item.unitPrice || 0)), 0);

  const handleAddItem = () => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      description: "",
      qty: 1,
      unitPrice: 0
    };
    setData(prev => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const handleRemoveItem = (id: string) => {
    if (data.items.length <= 1) {
      setData(prev => ({
        ...prev,
        items: [{ id: "1", description: "", qty: 1, unitPrice: 0 }]
      }));
      return;
    }
    setData(prev => ({ ...prev, items: prev.items.filter(item => item.id !== id) }));
  };

  const handleUpdateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setData(prev => ({
      ...prev,
      items: prev.items.map(item => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  const handleResetForm = () => {
    Swal.fire({
      title: "Kosongkan Formulir?",
      text: "Seluruh data yang telah diisi akan dihapus dan kembali kosong.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Ya, Kosongkan",
      cancelButtonText: "Batal"
    }).then((res) => {
      if (res.isConfirmed) {
        const currentSeq = getStoredInvoiceSeq();
        setData({
          ...getInitialInvoiceData(),
          invoiceNumber: formatInvoiceNumber(currentSeq)
        });
        toastResetSuccess();
      }
    });
  };

  const toastResetSuccess = () => {
    Swal.fire({
      icon: "success",
      title: "Formulir telah dikosongkan",
      timer: 1200,
      showConfirmButton: false,
      toast: true,
      position: "top-end"
    });
  };

  const exportPDF = async (openInNewTab = false) => {
    if (!printRef.current) return;
    setIsExporting(true);

    Swal.fire({
      title: openInNewTab ? "Membuka Dialog Cetak..." : "Membuat Berkas PDF...",
      text: "Mohon tunggu sebentar",
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      await new Promise(r => setTimeout(r, 250));

      const dataUrl = await toJpeg(printRef.current, {
        quality: 0.98,
        pixelRatio: 2.5,
        backgroundColor: "#ffffff",
        cacheBust: true
      });

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true
      });

      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (img.height * pdfWidth) / img.width;

      pdf.addImage(dataUrl, "JPEG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");

      const blob = pdf.output("blob");
      const blobUrl = URL.createObjectURL(blob);
      const safeFilename = data.invoiceNumber.trim()
        ? `Invoice_${data.invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`
        : `Invoice_SIFEST_${Date.now()}.pdf`;

      if (openInNewTab) {
        const printWindow = window.open(blobUrl);
        if (!printWindow) {
          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = safeFilename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } else {
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = safeFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      // Perbarui nomor urut invoice otomatis ke sequence berikutnya setelah berhasil dicetak/diunduh
      const match = data.invoiceNumber.match(/(\d+)$/);
      let nextSeq = 102;
      if (match && match[1]) {
        nextSeq = parseInt(match[1], 10) + 1;
      } else {
        nextSeq = getStoredInvoiceSeq() + 1;
      }
      localStorage.setItem("sifest_invoice_seq", String(nextSeq));

      Swal.close();
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Gagal membuat invoice",
        text: err?.message || "Terjadi kesalahan teknis saat membuat berkas invoice.",
        confirmButtonColor: "#2563eb"
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
        
        {/* Header Modal Bersih & Standar Dashboard */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Cetak Invoice Pembayaran</h3>
              <p className="text-xs text-slate-500">
                Isi data tagihan peserta untuk dicetak atau diunduh sebagai PDF resmi SIFEST 2026.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Tab Navigasi Bersih */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveTab("form")}
                className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === "form" ? "bg-white text-slate-800 shadow-sm font-semibold" : "text-slate-500 hover:text-slate-700"}`}
              >
                Formulir
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${activeTab === "preview" ? "bg-white text-blue-600 shadow-sm font-semibold" : "text-slate-500 hover:text-slate-700"}`}
              >
                <Eye className="w-3.5 h-3.5" />
                Pratinjau A4
              </button>
            </div>

            <button 
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body Container */}
        <div className="flex-1 overflow-y-auto">
          
          {/* TAB 1: FORMULIR INPUT */}
          {activeTab === "form" && (
            <div className="p-6 space-y-6">
              
              {/* Bagian 1: Detail Surat Invoice */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <h4 className="text-sm font-bold text-slate-800">1. Detail Surat Invoice</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700">No. Invoice (Otomatis)</label>
                      <button
                        type="button"
                        onClick={() => {
                          const currentSeq = getStoredInvoiceSeq();
                          setData(prev => ({ ...prev, invoiceNumber: formatInvoiceNumber(currentSeq) }));
                        }}
                        className="text-[11px] text-blue-600 hover:text-blue-700 hover:underline font-medium"
                        title="Muat ulang nomor urut invoice"
                      >
                        Urutkan
                      </button>
                    </div>
                    <input 
                      type="text"
                      value={data.invoiceNumber}
                      onChange={(e) => setData({ ...data, invoiceNumber: e.target.value })}
                      placeholder="INV/SIFEST/2026/101"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500/50 focus:outline-none placeholder:text-slate-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Tanggal Terbit</label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input 
                        type="text"
                        value={data.invoiceDate}
                        onChange={(e) => setData({ ...data, invoiceDate: e.target.value })}
                        placeholder="Contoh: 16 Oktober 2026"
                        className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500/50 focus:outline-none placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Gelombang Pendaftaran</label>
                    <select
                      value={data.wave}
                      onChange={(e) => setData({ ...data, wave: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500/50 focus:outline-none font-medium"
                    >
                      <option value="Gelombang 1">Gelombang 1</option>
                      <option value="Gelombang 2">Gelombang 2</option>
                      <option value="Gelombang 3">Gelombang 3</option>
                      <option value="Early Bird">Early Bird</option>
                      <option value="Presale">Presale</option>
                      <option value="Reguler">Reguler</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Bagian 2: Data Peserta / Ditagihkan Kepada */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <User className="w-4 h-4 text-blue-600" />
                  <h4 className="text-sm font-bold text-slate-800">2. Ditagihkan Kepada (Data Peserta / Tim)</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Nama Tim / Peserta</label>
                    <input 
                      type="text"
                      value={data.teamOrParticipantName}
                      onChange={(e) => setData({ ...data, teamOrParticipantName: e.target.value })}
                      placeholder="Contoh: Tim Cyber Tech"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500/50 focus:outline-none placeholder:text-slate-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Nama Ketua Tim</label>
                    <input 
                      type="text"
                      value={data.leaderName}
                      onChange={(e) => setData({ ...data, leaderName: e.target.value })}
                      placeholder="Contoh: Ahmad Fauzi"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500/50 focus:outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Instansi / Asal Sekolah / Kampus</label>
                    <div className="relative">
                      <Building className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input 
                        type="text"
                        value={data.institution}
                        onChange={(e) => setData({ ...data, institution: e.target.value })}
                        placeholder="Contoh: Universitas Indonesia"
                        className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500/50 focus:outline-none placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Email Peserta</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input 
                        type="email"
                        value={data.email}
                        onChange={(e) => setData({ ...data, email: e.target.value })}
                        placeholder="Contoh: ahmad.fauzi@email.com"
                        className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500/50 focus:outline-none placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">No. WhatsApp</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input 
                        type="text"
                        value={data.whatsapp}
                        onChange={(e) => setData({ ...data, whatsapp: e.target.value })}
                        placeholder="Contoh: 0812-9876-5432"
                        className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500/50 focus:outline-none placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bagian 3: Rincian Biaya Pendaftaran */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-blue-600" />
                    <h4 className="text-sm font-bold text-slate-800">3. Rincian Biaya Pendaftaran</h4>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah Baris
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {data.items.map((item, idx) => (
                    <div key={item.id} className="p-3 sm:p-4 bg-white flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>

                      <div className="flex-1 w-full sm:w-auto">
                        <input 
                          type="text"
                          value={item.description}
                          onChange={(e) => handleUpdateItem(item.id, "description", e.target.value)}
                          placeholder="Deskripsi / Cabang Lomba (Contoh: Biaya Pendaftaran - Competitive Programming)"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/50 focus:outline-none placeholder:text-slate-400"
                        />
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                        <div className="w-20">
                          <input 
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(e) => handleUpdateItem(item.id, "qty", parseInt(e.target.value) || 1)}
                            placeholder="Qty"
                            className="w-full px-2.5 py-2 text-center bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
                          />
                        </div>

                        <div className="w-36">
                          <input 
                            type="text"
                            value={item.unitPrice ? item.unitPrice.toLocaleString("id-ID") : ""}
                            onChange={(e) => {
                              const cleanVal = e.target.value.replace(/\D/g, "");
                              handleUpdateItem(item.id, "unitPrice", cleanVal ? parseInt(cleanVal) : 0);
                            }}
                            placeholder="Rp Harga Satuan"
                            className="w-full px-3 py-2 text-right bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/50 focus:outline-none placeholder:text-slate-400"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Hapus baris"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Subtotal & Total Pembayaran Box */}
                <div className="flex justify-end p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-right">
                    <span className="text-xs text-slate-500 font-medium mr-2">Total Pembayaran:</span>
                    <span className="text-lg font-bold text-slate-900">
                      Rp {totalPayment.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bagian 4: Pengaturan Rekening & Tanda Tangan (Collapsible / Opsional) */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left transition-colors cursor-pointer"
                >
                  <div>
                    <span className="text-xs font-bold text-slate-700">Pengaturan Rekening & Tanda Tangan Pengesahan</span>
                    <p className="text-[11px] text-slate-500">
                      Sudah otomatis disetel dengan rekening panitia & tanda tangan resmi Dilan & Zhara.
                    </p>
                  </div>
                  {showAdvanced ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {showAdvanced && (
                  <div className="p-4 space-y-4 bg-white border-t border-slate-200 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-700">Rekening 1 (BRI)</label>
                        <input 
                          type="text"
                          value={data.bankBri}
                          onChange={(e) => setData({ ...data, bankBri: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-700">Rekening 2 (BSI)</label>
                        <input 
                          type="text"
                          value={data.bankBsi}
                          onChange={(e) => setData({ ...data, bankBsi: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-700">Nama & Jabatan Ketua Pelaksana</label>
                        <input 
                          type="text"
                          value={data.leaderNameSign}
                          onChange={(e) => setData({ ...data, leaderNameSign: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 mb-1"
                        />
                        <input 
                          type="text"
                          value={data.leaderRoleSign}
                          onChange={(e) => setData({ ...data, leaderRoleSign: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-slate-700">Nama & Jabatan Bendahara</label>
                        <input 
                          type="text"
                          value={data.treasurerNameSign}
                          onChange={(e) => setData({ ...data, treasurerNameSign: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 mb-1"
                        />
                        <input 
                          type="text"
                          value={data.treasurerRoleSign}
                          onChange={(e) => setData({ ...data, treasurerRoleSign: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-1 pt-1">
                      <label className="font-semibold text-slate-700">Kota & Tanggal Pengesahan</label>
                      <input 
                        type="text"
                        value={data.signaturePlaceDate}
                        onChange={(e) => setData({ ...data, signaturePlaceDate: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: PRATINJAU DOKUMEN CETAK A4 */}
          {activeTab === "preview" && (
            <div className="bg-slate-100/80 p-4 sm:p-8 flex flex-col items-center min-h-[500px]">
              
              {/* Zoom Toolbar */}
              <div className="flex items-center justify-between w-full max-w-[794px] mb-3 text-xs text-slate-600 px-1">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Pratinjau Dokumen Cetak Standar A4
                </span>
                
                <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-xs">
                  <button
                    type="button"
                    onClick={() => setZoomScale(prev => Math.max(0.6, prev - 0.1))}
                    className="p-1 hover:bg-slate-100 rounded text-slate-600 cursor-pointer"
                    title="Perkecil"
                  >
                    <ZoomOut size={13} />
                  </button>
                  <span className="text-[11px] font-mono w-10 text-center font-medium">
                    {Math.round(zoomScale * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoomScale(prev => Math.min(1.3, prev + 0.1))}
                    className="p-1 hover:bg-slate-100 rounded text-slate-600 cursor-pointer"
                    title="Perbesar"
                  >
                    <ZoomIn size={13} />
                  </button>
                </div>
              </div>

              {/* A4 Sheet Container */}
              <div 
                className="origin-top transition-transform duration-150 shadow-xl border border-slate-200 bg-white"
                style={{
                  transform: `scale(${zoomScale})`,
                  transformOrigin: "top center",
                  marginBottom: zoomScale < 1 ? `-${(1 - zoomScale) * 1123}px` : "20px"
                }}
              >
                {/* INVOICE PREVIEW VISUAL */}
                <div className="w-[794px] min-h-[1123px] p-12 text-slate-900 bg-white flex flex-col justify-between font-sans">
                  
                  <div>
                    {/* KOP SURAT RESMI */}
                    <div className="flex items-center justify-between gap-4">
                      <div className="shrink-0">
                        <img 
                          src="/logo-sifest.png" 
                          alt="Logo SIFEST 2026" 
                          className="h-20 w-auto object-contain"
                        />
                      </div>
                      <div className="text-right space-y-0.5 text-slate-900">
                        <h2 className="text-base font-extrabold tracking-tight text-slate-900 leading-snug">
                          Panitia Pelaksana SIFEST 2026
                        </h2>
                        <h3 className="text-sm font-bold text-slate-800 leading-snug">
                          Sistem Informasi Festival 2026
                        </h3>
                        <p className="text-xs text-slate-700 leading-snug font-medium">
                          Himpunan Mahasiswa Jurusan Sistem Informasi – UPI YPTK Padang
                        </p>
                        <p className="text-[11px] text-slate-600 leading-snug">
                          Sekretariat Jl. Raya Lubuk Begalung, Student Center Lt. 1 Padang Sumbar
                        </p>
                        <p className="text-[11px] text-slate-600 leading-snug">
                          Website: <span className="text-[#0a2558] font-medium">official.sifest.my.id</span> | Email: <span className="text-[#0a2558] font-medium">sinformationfest@gmail.com</span>
                        </p>
                      </div>
                    </div>

                    {/* Garis Pembatas Kop */}
                    <div className="mt-4 mb-6 border-b-2 border-[#0a2558] w-full" />

                    {/* Judul Invoice */}
                    <h1 className="text-center font-extrabold text-2xl text-[#0a2558] tracking-wider mb-7">
                      INVOICE PEMBAYARAN
                    </h1>

                    {/* Metadata Dua Kolom */}
                    <div className="grid grid-cols-2 gap-8 mb-7 text-xs">
                      {/* Ditagihkan Kepada */}
                      <div>
                        <h3 className="font-extrabold text-xs uppercase text-[#0a2558] mb-2.5 tracking-wider">
                          DITAGIHKAN KEPADA:
                        </h3>
                        <table className="w-full border-collapse">
                          <tbody>
                            <tr>
                              <td className="py-1 font-semibold text-slate-800 w-36 align-top">Nama Tim / Peserta</td>
                              <td className="py-1 px-1.5 align-top">:</td>
                              <td className="py-1 font-bold text-slate-900 align-top">
                                {data.teamOrParticipantName || "-"}
                              </td>
                            </tr>
                            <tr>
                              <td className="py-1 font-semibold text-slate-800 align-top">Ketua Tim</td>
                              <td className="py-1 px-1.5 align-top">:</td>
                              <td className="py-1 text-slate-900 align-top">
                                {data.leaderName || "-"}
                              </td>
                            </tr>
                            <tr>
                              <td className="py-1 font-semibold text-slate-800 align-top">Instansi / Sekolah</td>
                              <td className="py-1 px-1.5 align-top">:</td>
                              <td className="py-1 text-slate-900 align-top">
                                {data.institution || "-"}
                              </td>
                            </tr>
                            <tr>
                              <td className="py-1 font-semibold text-slate-800 align-top">Email / WhatsApp</td>
                              <td className="py-1 px-1.5 align-top">:</td>
                              <td className="py-1 text-slate-900 align-top">
                                {data.email || data.whatsapp ? `${data.email || "-"} / ${data.whatsapp || "-"}` : "-"}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Detail Invoice */}
                      <div>
                        <h3 className="font-extrabold text-xs uppercase text-[#0a2558] mb-2.5 tracking-wider">
                          DETAIL INVOICE:
                        </h3>
                        <table className="w-full border-collapse">
                          <tbody>
                            <tr>
                              <td className="py-1 font-semibold text-slate-800 w-36 align-top">No. Invoice</td>
                              <td className="py-1 px-1.5 align-top">:</td>
                              <td className="py-1 font-extrabold text-slate-900 align-top">
                                {data.invoiceNumber || "-"}
                              </td>
                            </tr>
                            <tr>
                              <td className="py-1 font-semibold text-slate-800 align-top">Tanggal</td>
                              <td className="py-1 px-1.5 align-top">:</td>
                              <td className="py-1 text-slate-900 align-top">
                                {data.invoiceDate || "-"}
                              </td>
                            </tr>
                            <tr>
                              <td className="py-1 font-semibold text-slate-800 align-top whitespace-nowrap pr-2">Gelombang Pendaftaran</td>
                              <td className="py-1 px-1.5 align-top">:</td>
                              <td className="py-1 font-semibold text-slate-900 align-top">
                                {data.wave || "-"}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Tabel Rincian Biaya Pendaftaran */}
                    <div className="mb-7">
                      <h3 className="font-extrabold text-xs text-[#0a2558] mb-2 tracking-wide">
                        Rincian Biaya Pendaftaran
                      </h3>
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-[#0a2558] text-white">
                            <th className="py-2.5 px-3 text-center w-10 font-bold border border-[#0a2558]">No</th>
                            <th className="py-2.5 px-3 text-left font-bold border border-[#0a2558]">Deskripsi / Cabang Lomba</th>
                            <th className="py-2.5 px-3 text-center w-14 font-bold border border-[#0a2558]">Qty</th>
                            <th className="py-2.5 px-3 text-right w-32 font-bold border border-[#0a2558]">Harga Satuan</th>
                            <th className="py-2.5 px-3 text-right w-32 font-bold border border-[#0a2558]">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 border-b border-slate-300">
                          {data.items.map((item, idx) => (
                            <tr key={idx} className={idx % 2 === 1 ? "bg-slate-50/50" : "bg-white"}>
                              <td className="py-3 px-3 text-center text-slate-600 border-x border-slate-200">{idx + 1}</td>
                              <td className="py-3 px-3 font-medium text-slate-900 border-x border-slate-200">
                                {item.description || "-"}
                              </td>
                              <td className="py-3 px-3 text-center text-slate-800 border-x border-slate-200">{item.qty || 0}</td>
                              <td className="py-3 px-3 text-right text-slate-800 border-x border-slate-200">
                                Rp {(item.unitPrice || 0).toLocaleString("id-ID")}
                              </td>
                              <td className="py-3 px-3 text-right font-semibold text-slate-900 border-x border-slate-200">
                                Rp {((item.qty || 0) * (item.unitPrice || 0)).toLocaleString("id-ID")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Total Pembayaran */}
                      <div className="flex justify-end pt-3.5 text-right">
                        <div className="text-xs font-bold text-slate-900 flex items-center">
                          TOTAL PEMBAYARAN: 
                          <span className="text-[#ea580c] font-black text-sm sm:text-base ml-2">
                            Rp {totalPayment.toLocaleString("id-ID")}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Metode & Instruksi Pembayaran */}
                    <div className="mb-8 text-xs text-slate-800 space-y-2">
                      <h3 className="font-extrabold text-xs uppercase text-[#0a2558] tracking-wider">
                        METODE & INSTRUKSI PEMBAYARAN
                      </h3>
                      <p className="text-slate-700 leading-relaxed">
                        Silakan melakukan transfer tepat sesuai nominal Total Pembayaran ke salah satu rekening berikut:
                      </p>
                      <div className="space-y-1 font-semibold text-slate-800 pl-1">
                        <p className="flex items-center gap-1.5">
                          <span className="text-sm leading-none">•</span> {data.bankBri}
                        </p>
                        <p className="flex items-center gap-1.5">
                          <span className="text-sm leading-none">•</span> {data.bankBsi}
                        </p>
                      </div>
                      <div className="pt-2 text-slate-700 space-y-0.5 leading-relaxed">
                        <p className="font-bold text-slate-800">Catatan PENTING:</p>
                        <p>1. {data.notes1}</p>
                        <p>2. {data.notes2}</p>
                      </div>
                    </div>
                  </div>

                  {/* Pengesahan Tanda Tangan Menggunakan TTD ASLI Panitia */}
                  <div className="grid grid-cols-2 text-xs text-slate-900 pt-6 mt-4">
                    {/* Ketua Pelaksana */}
                    <div className="text-center w-60">
                      <p className="font-medium text-slate-800 mb-1">Mengetahui,</p>
                      
                      <div className="h-20 flex items-center justify-center my-1">
                        <img 
                          src={data.leaderSignatureUrl} 
                          alt="TTD Ketua Pelaksana" 
                          className="max-h-20 max-w-[150px] object-contain"
                        />
                      </div>

                      <p className="font-extrabold text-slate-950 text-xs tracking-tight">{data.leaderNameSign}</p>
                      <p className="text-[11px] text-slate-600 font-medium">{data.leaderRoleSign}</p>
                    </div>

                    {/* Bendahara */}
                    <div className="text-center w-60 ml-auto">
                      <p className="font-medium text-slate-800 mb-1">{data.signaturePlaceDate}</p>
                      
                      <div className="h-20 flex items-center justify-center my-1">
                        <img 
                          src={data.treasurerSignatureUrl} 
                          alt="TTD Bendahara" 
                          className="max-h-20 max-w-[150px] object-contain"
                        />
                      </div>

                      <p className="font-extrabold text-slate-950 text-xs tracking-tight">{data.treasurerNameSign}</p>
                      <p className="text-[11px] text-slate-600 font-medium">{data.treasurerRoleSign}</p>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          )}

        </div>

        {/* DOM Hidden Renderer Khusus untuk Export PDF (Selalu Tersedia & Tidak Terdistorsi Scale) */}
        <div style={{ position: "fixed", left: "-9999px", top: 0, opacity: 0, pointerEvents: "none" }}>
          <div 
            ref={printRef}
            className="w-[794px] min-h-[1123px] p-12 text-slate-900 bg-white flex flex-col justify-between font-sans"
          >
            <div>
              {/* KOP SURAT */}
              <div className="flex items-center justify-between gap-4">
                <div className="shrink-0">
                  <img 
                    src="/logo-sifest.png" 
                    alt="Logo SIFEST 2026" 
                    className="h-20 w-auto object-contain"
                  />
                </div>
                <div className="text-right space-y-0.5 text-slate-900">
                  <h2 className="text-base font-extrabold tracking-tight text-slate-900 leading-snug">
                    Panitia Pelaksana SIFEST 2026
                  </h2>
                  <h3 className="text-sm font-bold text-slate-800 leading-snug">
                    Sistem Informasi Festival 2026
                  </h3>
                  <p className="text-xs text-slate-700 leading-snug font-medium">
                    Himpunan Mahasiswa Jurusan Sistem Informasi – UPI YPTK Padang
                  </p>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Sekretariat Jl. Raya Lubuk Begalung, Student Center Lt. 1 Padang Sumbar
                  </p>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Website: <span className="text-[#0a2558] font-medium">official.sifest.my.id</span> | Email: <span className="text-[#0a2558] font-medium">sinformationfest@gmail.com</span>
                  </p>
                </div>
              </div>

              {/* Garis Navy */}
              <div className="mt-4 mb-6 border-b-2 border-[#0a2558] w-full" />

              {/* Judul Invoice */}
              <h1 className="text-center font-extrabold text-2xl text-[#0a2558] tracking-wider mb-7">
                INVOICE PEMBAYARAN
              </h1>

              {/* Dua Kolom */}
              <div className="grid grid-cols-2 gap-8 mb-7 text-xs">
                <div>
                  <h3 className="font-extrabold text-xs uppercase text-[#0a2558] mb-2.5 tracking-wider">
                    DITAGIHKAN KEPADA:
                  </h3>
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr>
                        <td className="py-1 font-semibold text-slate-800 w-36 align-top">Nama Tim / Peserta</td>
                        <td className="py-1 px-1.5 align-top">:</td>
                        <td className="py-1 font-bold text-slate-900 align-top">
                          {data.teamOrParticipantName || "-"}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1 font-semibold text-slate-800 align-top">Ketua Tim</td>
                        <td className="py-1 px-1.5 align-top">:</td>
                        <td className="py-1 text-slate-900 align-top">
                          {data.leaderName || "-"}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1 font-semibold text-slate-800 align-top">Instansi / Sekolah</td>
                        <td className="py-1 px-1.5 align-top">:</td>
                        <td className="py-1 text-slate-900 align-top">
                          {data.institution || "-"}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1 font-semibold text-slate-800 align-top">Email / WhatsApp</td>
                        <td className="py-1 px-1.5 align-top">:</td>
                        <td className="py-1 text-slate-900 align-top">
                          {data.email || data.whatsapp ? `${data.email || "-"} / ${data.whatsapp || "-"}` : "-"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div>
                  <h3 className="font-extrabold text-xs uppercase text-[#0a2558] mb-2.5 tracking-wider">
                    DETAIL INVOICE:
                  </h3>
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr>
                        <td className="py-1 font-semibold text-slate-800 w-36 align-top">No. Invoice</td>
                        <td className="py-1 px-1.5 align-top">:</td>
                        <td className="py-1 font-extrabold text-slate-900 align-top">
                          {data.invoiceNumber || "-"}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1 font-semibold text-slate-800 align-top">Tanggal</td>
                        <td className="py-1 px-1.5 align-top">:</td>
                        <td className="py-1 text-slate-900 align-top">
                          {data.invoiceDate || "-"}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1 font-semibold text-slate-800 align-top whitespace-nowrap pr-2">Gelombang Pendaftaran</td>
                        <td className="py-1 px-1.5 align-top">:</td>
                        <td className="py-1 font-semibold text-slate-900 align-top">
                          {data.wave || "-"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tabel Biaya */}
              <div className="mb-7">
                <h3 className="font-extrabold text-xs text-[#0a2558] mb-2 tracking-wide">
                  Rincian Biaya Pendaftaran
                </h3>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#0a2558] text-white">
                      <th className="py-2.5 px-3 text-center w-10 font-bold border border-[#0a2558]">No</th>
                      <th className="py-2.5 px-3 text-left font-bold border border-[#0a2558]">Deskripsi / Cabang Lomba</th>
                      <th className="py-2.5 px-3 text-center w-14 font-bold border border-[#0a2558]">Qty</th>
                      <th className="py-2.5 px-3 text-right w-32 font-bold border border-[#0a2558]">Harga Satuan</th>
                      <th className="py-2.5 px-3 text-right w-32 font-bold border border-[#0a2558]">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 border-b border-slate-300">
                    {data.items.map((item, idx) => (
                      <tr key={idx} className={idx % 2 === 1 ? "bg-slate-50/50" : "bg-white"}>
                        <td className="py-3 px-3 text-center text-slate-600 border-x border-slate-200">{idx + 1}</td>
                        <td className="py-3 px-3 font-medium text-slate-900 border-x border-slate-200">
                          {item.description || "-"}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-800 border-x border-slate-200">{item.qty || 0}</td>
                        <td className="py-3 px-3 text-right text-slate-800 border-x border-slate-200">
                          Rp {(item.unitPrice || 0).toLocaleString("id-ID")}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-slate-900 border-x border-slate-200">
                          Rp {((item.qty || 0) * (item.unitPrice || 0)).toLocaleString("id-ID")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex justify-end pt-3.5 text-right">
                  <div className="text-xs font-bold text-slate-900 flex items-center">
                    TOTAL PEMBAYARAN: 
                    <span className="text-[#ea580c] font-black text-sm sm:text-base ml-2">
                      Rp {totalPayment.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Metode Transfer */}
              <div className="mb-8 text-xs text-slate-800 space-y-2">
                <h3 className="font-extrabold text-xs uppercase text-[#0a2558] tracking-wider">
                  METODE & INSTRUKSI PEMBAYARAN
                </h3>
                <p className="text-slate-700 leading-relaxed">
                  Silakan melakukan transfer tepat sesuai nominal Total Pembayaran ke salah satu rekening berikut:
                </p>
                <div className="space-y-1 font-semibold text-slate-800 pl-1">
                  <p className="flex items-center gap-1.5">
                    <span className="text-sm leading-none">•</span> {data.bankBri}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <span className="text-sm leading-none">•</span> {data.bankBsi}
                  </p>
                </div>
                <div className="pt-2 text-slate-700 space-y-0.5 leading-relaxed">
                  <p className="font-bold text-slate-800">Catatan PENTING:</p>
                  <p>1. {data.notes1}</p>
                  <p>2. {data.notes2}</p>
                </div>
              </div>
            </div>

            {/* Tanda Tangan Asli */}
            <div className="grid grid-cols-2 text-xs text-slate-900 pt-6 mt-4">
              <div className="text-center w-60">
                <p className="font-medium text-slate-800 mb-1">Mengetahui,</p>
                <div className="h-20 flex items-center justify-center my-1">
                  <img 
                    src={data.leaderSignatureUrl} 
                    alt="TTD Ketua Pelaksana" 
                    className="max-h-20 max-w-[150px] object-contain"
                  />
                </div>
                <p className="font-extrabold text-slate-950 text-xs tracking-tight">{data.leaderNameSign}</p>
                <p className="text-[11px] text-slate-600 font-medium">{data.leaderRoleSign}</p>
              </div>

              <div className="text-center w-60 ml-auto">
                <p className="font-medium text-slate-800 mb-1">{data.signaturePlaceDate}</p>
                <div className="h-20 flex items-center justify-center my-1">
                  <img 
                    src={data.treasurerSignatureUrl} 
                    alt="TTD Bendahara" 
                    className="max-h-20 max-w-[150px] object-contain"
                  />
                </div>
                <p className="font-extrabold text-slate-950 text-xs tracking-tight">{data.treasurerNameSign}</p>
                <p className="text-[11px] text-slate-600 font-medium">{data.treasurerRoleSign}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Modal Aksi */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div>
            <button
              type="button"
              onClick={handleResetForm}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition-colors font-medium py-1 px-2 rounded-lg hover:bg-slate-200/60 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Kosongkan Form
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            {activeTab === "form" ? (
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Eye className="w-4 h-4 text-slate-500" />
                <span>Lihat Pratinjau</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveTab("form")}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <span>Edit Formulir</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => exportPDF(true)}
              disabled={isExporting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>Cetak Langsung</span>
            </button>

            <button
              type="button"
              onClick={() => exportPDF(false)}
              disabled={isExporting}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Unduh PDF Invoice</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
