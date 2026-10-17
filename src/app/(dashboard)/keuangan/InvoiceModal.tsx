"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  X, 
  Printer, 
  Download, 
  Plus, 
  Trash2, 
  Eye, 
  Edit3, 
  Receipt, 
  RotateCcw, 
  CheckCircle2, 
  ZoomIn, 
  ZoomOut, 
  Sparkles,
  Upload,
  Calendar,
  Layers
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
  status: "UNPAID (Belum Lunas)" | "PAID (Lunas)";
  
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
  
  // Custom uploaded signatures (optional data URLs)
  customLeaderSignatureUrl?: string;
  customTreasurerSignatureUrl?: string;
}

const defaultInvoiceData: InvoiceData = {
  invoiceNumber: "INV/SIFEST/2026/102",
  invoiceDate: "16 Oktober 2026",
  status: "UNPAID (Belum Lunas)",
  
  teamOrParticipantName: "Tim Cyber Tech",
  leaderName: "Ahmad Fauzi",
  institution: "Universitas Indonesia",
  email: "ahmad.fauzi@email.com",
  whatsapp: "0812-9876-5432",
  
  items: [
    {
      id: "1",
      description: "Biaya Pendaftaran - Competitive Programming SIFEST 2026",
      qty: 1,
      unitPrice: 150000
    },
    {
      id: "2",
      description: "Biaya Pendaftaran - UI/UX Design Competition",
      qty: 1,
      unitPrice: 120000
    }
  ],
  
  bankBri: "Bank BRI: 817301013354530 a.n. ZHARA DELVIA PUTRI",
  bankBsi: "Bank BSI: 7369755115 a.n. Fachratun Rahima",
  notes1: "Unggah bukti transfer melalui dasbor pendaftaran di website official.sifest.my.id",
  notes2: "Kontak konfirmasi Whatsapp: 0851-8577-8725 (Fachratun Rahima).",
  
  leaderNameSign: "Dilan Afri Jones",
  leaderRoleSign: "Ketua Pelaksana SIFEST 2026",
  treasurerNameSign: "Zhara Delvia Putri",
  treasurerRoleSign: "Bendahara SIFEST 2026",
  signaturePlaceDate: "Padang, 16 Oktober 2026"
};

// Preset opsi cabang lomba untuk kemudahan panitia
const eventPresets = [
  {
    name: "Contoh Default (CP & UI/UX)",
    items: [
      { id: "1", description: "Biaya Pendaftaran - Competitive Programming SIFEST 2026", qty: 1, unitPrice: 150000 },
      { id: "2", description: "Biaya Pendaftaran - UI/UX Design Competition", qty: 1, unitPrice: 120000 }
    ]
  },
  {
    name: "Turnamen Futsal SLTA",
    items: [
      { id: "1", description: "Biaya Pendaftaran - Turnamen Futsal SLTA Se-Sumbar SIFEST 2026", qty: 1, unitPrice: 400000 }
    ]
  },
  {
    name: "Turnamen Futsal Mahasiswa",
    items: [
      { id: "1", description: "Biaya Pendaftaran - Turnamen Futsal Mahasiswa Se-Sumbar SIFEST 2026", qty: 1, unitPrice: 450000 }
    ]
  },
  {
    name: "E-Sport Mobile Legends",
    items: [
      { id: "1", description: "Biaya Pendaftaran - Turnamen E-Sport MLBB SIFEST 2026", qty: 1, unitPrice: 100000 }
    ]
  },
  {
    name: "Stand Open Bazaar",
    items: [
      { id: "1", description: "Sewa Stand Bazaar SI FEST 2026 (Durasi Penuh)", qty: 1, unitPrice: 350000 }
    ]
  }
];

export default function InvoiceModal({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
}) {
  const [data, setData] = useState<InvoiceData>(defaultInvoiceData);
  const [activeTab, setActiveTab] = useState<"form" | "preview">("form");
  const [isExporting, setIsExporting] = useState(false);
  const [scale, setScale] = useState(1);
  const printRef = useRef<HTMLDivElement>(null);

  // Responsive scale saat modal dibuka di layar kecil
  useEffect(() => {
    if (isOpen && typeof window !== "undefined") {
      const handleResize = () => {
        const availableWidth = window.innerWidth >= 1024 ? (window.innerWidth * 0.45) : (window.innerWidth - 48);
        if (availableWidth < 794) {
          const calculatedScale = Math.max(0.35, Number((availableWidth / 794).toFixed(2)));
          setScale(calculatedScale);
        } else {
          setScale(1);
        }
      };
      handleResize();
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, [isOpen, activeTab]);

  // Handle ESC key
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

  const totalPayment = data.items.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      description: "",
      qty: 1,
      unitPrice: 0
    };
    setData(prev => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const removeItem = (id: string) => {
    if (data.items.length <= 1) return;
    setData(prev => ({ ...prev, items: prev.items.filter(item => item.id !== id) }));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setData(prev => ({
      ...prev,
      items: prev.items.map(item => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  const applyPreset = (presetItems: InvoiceItem[]) => {
    setData(prev => ({
      ...prev,
      items: presetItems.map((item, idx) => ({ ...item, id: (idx + 1).toString() }))
    }));
  };

  const handleSignatureUpload = (person: "leader" | "treasurer", e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        if (person === "leader") {
          setData(prev => ({ ...prev, customLeaderSignatureUrl: reader.result as string }));
        } else {
          setData(prev => ({ ...prev, customTreasurerSignatureUrl: reader.result as string }));
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const exportPDF = async (openInNewTab = false) => {
    if (!printRef.current) return;
    setIsExporting(true);

    Swal.fire({
      title: openInNewTab ? 'Menyiapkan Cetak...' : 'Menyiapkan Unduhan PDF...',
      text: 'Sedang memproses dokumen invoice',
      imageUrl: '/logo-sifest.png',
      imageWidth: 80,
      imageAlt: 'Logo SIFEST',
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => {
        const image = Swal.getImage();
        if (image) image.classList.add('animate-pulse');
      }
    });

    try {
      await new Promise(r => setTimeout(r, 200));

      const dataUrl = await toJpeg(printRef.current, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: '#ffffff'
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

      const blob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      const safeFilename = `Invoice_${data.invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

      if (openInNewTab) {
        const printWindow = window.open(blobUrl);
        if (!printWindow) {
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = safeFilename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } else {
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = safeFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      Swal.close();
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Gagal membuat PDF',
        text: err?.message || 'Terjadi kesalahan saat memproses PDF invoice.',
        confirmButtonColor: '#3b82f6'
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div className="bg-white w-full max-w-7xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Modal */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
              <Receipt size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Cetak Invoice Pembayaran
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  SI FEST 2026
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Isi form invoice di bawah atau gunakan preset, lalu pratinjau & cetak/unduh PDF A4 resmi.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab switch for mobile / smaller screens */}
            <div className="flex bg-slate-800 p-1 rounded-xl text-xs font-medium lg:hidden">
              <button
                type="button"
                onClick={() => setActiveTab("form")}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${activeTab === 'form' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
              >
                <Edit3 size={14} /> Form
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${activeTab === 'preview' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
              >
                <Eye size={14} /> Pratinjau
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body - 2 Columns on LG */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          
          {/* LEFT: FORM INPUT */}
          <div className={`w-full lg:w-1/2 p-6 overflow-y-auto space-y-6 border-r border-slate-200 bg-slate-50/50 ${activeTab === 'preview' ? 'hidden lg:block' : 'block'}`}>
            
            {/* Quick Presets */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-500" /> Preset Cepat Cabang Lomba
                </span>
                <button
                  type="button"
                  onClick={() => setData(defaultInvoiceData)}
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  <RotateCcw size={12} /> Reset Default
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {eventPresets.map((preset, pIdx) => (
                  <button
                    key={pIdx}
                    type="button"
                    onClick={() => applyPreset(preset.items as any)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-300 transition-colors cursor-pointer font-medium"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 1. Detail Invoice */}
            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
                1. Detail Invoice
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">No. Invoice</label>
                  <input
                    type="text"
                    value={data.invoiceNumber}
                    onChange={(e) => setData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                    placeholder="INV/SIFEST/2026/102"
                    className="w-full text-xs h-10 px-3 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Tanggal Invoice</label>
                  <input
                    type="text"
                    value={data.invoiceDate}
                    onChange={(e) => setData(prev => ({ ...prev, invoiceDate: e.target.value }))}
                    placeholder="16 Oktober 2026"
                    className="w-full text-xs h-10 px-3 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Status Pembayaran</label>
                  <select
                    value={data.status}
                    onChange={(e) => setData(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full text-xs h-10 px-3 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 font-bold text-slate-800"
                  >
                    <option value="UNPAID (Belum Lunas)">UNPAID (Belum Lunas)</option>
                    <option value="PAID (Lunas)">PAID (Lunas)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 2. Ditagihkan Kepada */}
            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
                2. Ditagihkan Kepada (Data Peserta / Tim)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Nama Tim / Peserta</label>
                  <input
                    type="text"
                    value={data.teamOrParticipantName}
                    onChange={(e) => setData(prev => ({ ...prev, teamOrParticipantName: e.target.value }))}
                    placeholder="Tim Cyber Tech"
                    className="w-full text-xs h-10 px-3 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Ketua Tim</label>
                  <input
                    type="text"
                    value={data.leaderName}
                    onChange={(e) => setData(prev => ({ ...prev, leaderName: e.target.value }))}
                    placeholder="Ahmad Fauzi"
                    className="w-full text-xs h-10 px-3 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700">Instansi / Sekolah / Universitas</label>
                  <input
                    type="text"
                    value={data.institution}
                    onChange={(e) => setData(prev => ({ ...prev, institution: e.target.value }))}
                    placeholder="Universitas Indonesia"
                    className="w-full text-xs h-10 px-3 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Email</label>
                  <input
                    type="email"
                    value={data.email}
                    onChange={(e) => setData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="ahmad.fauzi@email.com"
                    className="w-full text-xs h-10 px-3 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">No. WhatsApp</label>
                  <input
                    type="text"
                    value={data.whatsapp}
                    onChange={(e) => setData(prev => ({ ...prev, whatsapp: e.target.value }))}
                    placeholder="0812-9876-5432"
                    className="w-full text-xs h-10 px-3 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* 3. Rincian Biaya */}
            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="font-bold text-sm text-slate-900">
                  3. Rincian Biaya Pendaftaran
                </h3>
                <button
                  type="button"
                  onClick={addItem}
                  className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold text-xs flex items-center gap-1 transition-colors"
                >
                  <Plus size={14} /> Tambah Item
                </button>
              </div>

              <div className="space-y-3">
                {data.items.map((item, idx) => (
                  <div key={item.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 relative">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600">Item #{idx + 1}</span>
                      {data.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="text-red-500 hover:text-red-700 p-1 transition-colors"
                          title="Hapus Item"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600">Deskripsi / Cabang Lomba</label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        placeholder="Biaya Pendaftaran - Cabang Lomba..."
                        className="w-full text-xs h-9 px-3 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 bg-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-600">Qty</label>
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e) => updateItem(item.id, 'qty', parseInt(e.target.value) || 1)}
                          className="w-full text-xs h-9 px-3 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-600">Harga Satuan (Rp)</label>
                        <input
                          type="number"
                          step="5000"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(item.id, 'unitPrice', parseInt(e.target.value) || 0)}
                          className="w-full text-xs h-9 px-3 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 bg-white"
                        />
                      </div>
                    </div>
                    <div className="text-right text-xs font-semibold text-slate-700 pt-1">
                      Subtotal: <span className="text-blue-600 font-bold">Rp {(item.qty * item.unitPrice).toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-between">
                <span className="text-xs font-bold text-orange-900">Total Pembayaran:</span>
                <span className="text-base font-extrabold text-orange-600">
                  Rp {totalPayment.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* 4. Rekening & Catatan */}
            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
                4. Metode Pembayaran & Catatan
              </h3>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Rekening 1 (BRI)</label>
                  <input
                    type="text"
                    value={data.bankBri}
                    onChange={(e) => setData(prev => ({ ...prev, bankBri: e.target.value }))}
                    className="w-full text-xs h-9 px-3 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Rekening 2 (BSI)</label>
                  <input
                    type="text"
                    value={data.bankBsi}
                    onChange={(e) => setData(prev => ({ ...prev, bankBsi: e.target.value }))}
                    className="w-full text-xs h-9 px-3 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Catatan 1 (Upload Bukti)</label>
                  <input
                    type="text"
                    value={data.notes1}
                    onChange={(e) => setData(prev => ({ ...prev, notes1: e.target.value }))}
                    className="w-full text-xs h-9 px-3 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Catatan 2 (Konfirmasi WhatsApp)</label>
                  <input
                    type="text"
                    value={data.notes2}
                    onChange={(e) => setData(prev => ({ ...prev, notes2: e.target.value }))}
                    className="w-full text-xs h-9 px-3 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* 5. Tanda Tangan */}
            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
                5. Tanda Tangan & Pengesahan
              </h3>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Tempat & Tanggal Pengesahan</label>
                  <input
                    type="text"
                    value={data.signaturePlaceDate}
                    onChange={(e) => setData(prev => ({ ...prev, signaturePlaceDate: e.target.value }))}
                    placeholder="Padang, 16 Oktober 2026"
                    className="w-full text-xs h-9 px-3 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {/* Ketua Pelaksana */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <span className="text-xs font-bold text-slate-800">Ketua Pelaksana</span>
                    <input
                      type="text"
                      value={data.leaderNameSign}
                      onChange={(e) => setData(prev => ({ ...prev, leaderNameSign: e.target.value }))}
                      placeholder="Dilan Afri Jones"
                      className="w-full text-xs h-9 px-3 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 bg-white font-semibold"
                    />
                    <input
                      type="text"
                      value={data.leaderRoleSign}
                      onChange={(e) => setData(prev => ({ ...prev, leaderRoleSign: e.target.value }))}
                      placeholder="Ketua Pelaksana SIFEST 2026"
                      className="w-full text-xs h-9 px-3 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 bg-white text-slate-600"
                    />
                    <div className="pt-1">
                      <label className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 cursor-pointer">
                        <Upload size={12} />
                        <span>{data.customLeaderSignatureUrl ? 'Ganti TTD (Gambar)' : 'Upload TTD Kustom'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleSignatureUpload("leader", e)}
                        />
                      </label>
                      {data.customLeaderSignatureUrl && (
                        <button
                          type="button"
                          onClick={() => setData(prev => ({ ...prev, customLeaderSignatureUrl: undefined }))}
                          className="text-[10px] text-red-500 hover:underline mt-0.5"
                        >
                          Gunakan TTD Default
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Bendahara */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <span className="text-xs font-bold text-slate-800">Bendahara</span>
                    <input
                      type="text"
                      value={data.treasurerNameSign}
                      onChange={(e) => setData(prev => ({ ...prev, treasurerNameSign: e.target.value }))}
                      placeholder="Zhara Delvia Putri"
                      className="w-full text-xs h-9 px-3 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 bg-white font-semibold"
                    />
                    <input
                      type="text"
                      value={data.treasurerRoleSign}
                      onChange={(e) => setData(prev => ({ ...prev, treasurerRoleSign: e.target.value }))}
                      placeholder="Bendahara SIFEST 2026"
                      className="w-full text-xs h-9 px-3 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 bg-white text-slate-600"
                    />
                    <div className="pt-1">
                      <label className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 cursor-pointer">
                        <Upload size={12} />
                        <span>{data.customTreasurerSignatureUrl ? 'Ganti TTD (Gambar)' : 'Upload TTD Kustom'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleSignatureUpload("treasurer", e)}
                        />
                      </label>
                      {data.customTreasurerSignatureUrl && (
                        <button
                          type="button"
                          onClick={() => setData(prev => ({ ...prev, customTreasurerSignatureUrl: undefined }))}
                          className="text-[10px] text-red-500 hover:underline mt-0.5"
                        >
                          Gunakan TTD Default
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT: LIVE PREVIEW A4 */}
          <div className={`w-full lg:w-1/2 p-4 lg:p-6 overflow-y-auto bg-slate-200/80 flex flex-col items-center justify-start ${activeTab === 'form' ? 'hidden lg:flex' : 'flex'}`}>
            <div className="w-full max-w-[794px] flex items-center justify-between mb-3 text-xs text-slate-600 px-1">
              <span className="font-semibold flex items-center gap-1.5">
                <Eye size={14} className="text-blue-600" /> Pratinjau Dokumen Cetak (Ukuran A4)
              </span>
              <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-300 shadow-xs">
                <button
                  type="button"
                  onClick={() => setScale(prev => Math.max(0.35, prev - 0.05))}
                  className="p-1 hover:bg-slate-100 rounded text-slate-600"
                  title="Perkecil"
                >
                  <ZoomOut size={13} />
                </button>
                <span className="text-[11px] font-mono w-10 text-center font-medium">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setScale(prev => Math.min(1.2, prev + 0.05))}
                  className="p-1 hover:bg-slate-100 rounded text-slate-600"
                  title="Perbesar"
                >
                  <ZoomIn size={13} />
                </button>
              </div>
            </div>

            {/* A4 Document Wrapper with Scale */}
            <div 
              className="origin-top transition-transform duration-150 shadow-2xl rounded-sm"
              style={{
                transform: `scale(${scale})`,
                transformOrigin: 'top center',
                marginBottom: `${Math.max(0, (1123 * scale) - 1123 + 40)}px`
              }}
            >
              {/* THE EXACT INVOICE DOCUMENT */}
              <div 
                ref={printRef}
                className="w-[794px] min-h-[1123px] bg-white p-12 text-slate-900 select-none flex flex-col justify-between"
                style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
              >
                <div>
                  {/* HEADER / KOP SURAT */}
                  <div className="flex items-center justify-between gap-4">
                    {/* SIFEST Logo */}
                    <div className="shrink-0">
                      <img 
                        src="/logo-sifest.png" 
                        alt="Logo SIFEST 2026" 
                        className="h-20 w-auto object-contain"
                        crossOrigin="anonymous"
                      />
                    </div>

                    {/* Organization Details */}
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

                  {/* Horizontal Divider Line */}
                  <div className="mt-4 mb-6 border-b-2 border-[#0a2558] w-full" />

                  {/* INVOICE TITLE */}
                  <h1 className="text-center font-extrabold text-2xl text-[#0a2558] tracking-wider mb-7">
                    INVOICE PEMBAYARAN
                  </h1>

                  {/* TWO-COLUMN INFO */}
                  <div className="grid grid-cols-2 gap-8 mb-7 text-xs">
                    {/* DITAGIHKAN KEPADA */}
                    <div>
                      <h3 className="font-extrabold text-xs uppercase text-[#0a2558] mb-2.5 tracking-wider">
                        DITAGIHKAN KEPADA:
                      </h3>
                      <table className="w-full border-collapse">
                        <tbody>
                          <tr>
                            <td className="py-1 font-semibold text-slate-800 w-36 align-top">Nama Tim / Peserta</td>
                            <td className="py-1 px-1.5 align-top">:</td>
                            <td className="py-1 font-bold text-slate-900 align-top">{data.teamOrParticipantName}</td>
                          </tr>
                          <tr>
                            <td className="py-1 font-semibold text-slate-800 align-top">Ketua Tim</td>
                            <td className="py-1 px-1.5 align-top">:</td>
                            <td className="py-1 text-slate-900 align-top">{data.leaderName}</td>
                          </tr>
                          <tr>
                            <td className="py-1 font-semibold text-slate-800 align-top">Instansi / Sekolah</td>
                            <td className="py-1 px-1.5 align-top">:</td>
                            <td className="py-1 text-slate-900 align-top">{data.institution}</td>
                          </tr>
                          <tr>
                            <td className="py-1 font-semibold text-slate-800 align-top">Email / WhatsApp</td>
                            <td className="py-1 px-1.5 align-top">:</td>
                            <td className="py-1 text-slate-900 align-top">{data.email} / {data.whatsapp}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* DETAIL INVOICE */}
                    <div>
                      <h3 className="font-extrabold text-xs uppercase text-[#0a2558] mb-2.5 tracking-wider">
                        DETAIL INVOICE:
                      </h3>
                      <table className="w-full border-collapse">
                        <tbody>
                          <tr>
                            <td className="py-1 font-semibold text-slate-800 w-28 align-top">No. Invoice</td>
                            <td className="py-1 px-1.5 align-top">:</td>
                            <td className="py-1 font-extrabold text-slate-900 align-top">{data.invoiceNumber}</td>
                          </tr>
                          <tr>
                            <td className="py-1 font-semibold text-slate-800 align-top">Tanggal</td>
                            <td className="py-1 px-1.5 align-top">:</td>
                            <td className="py-1 text-slate-900 align-top">{data.invoiceDate}</td>
                          </tr>
                          <tr>
                            <td className="py-1 font-semibold text-slate-800 align-top">Status</td>
                            <td className="py-1 px-1.5 align-top">:</td>
                            <td className="py-1 align-top">
                              <span className={`font-bold ${data.status.includes('PAID (Lunas)') && !data.status.includes('UNPAID') ? 'text-emerald-600' : 'text-red-600'}`}>
                                {data.status}
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* RINCIAN BIAYA PENDAFTARAN TABLE */}
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
                          <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                            <td className="py-3 px-3 text-center text-slate-600 border-x border-slate-200">{idx + 1}</td>
                            <td className="py-3 px-3 font-medium text-slate-900 border-x border-slate-200">{item.description}</td>
                            <td className="py-3 px-3 text-center text-slate-800 border-x border-slate-200">{item.qty}</td>
                            <td className="py-3 px-3 text-right text-slate-800 border-x border-slate-200">Rp {item.unitPrice.toLocaleString('id-ID')}</td>
                            <td className="py-3 px-3 text-right font-semibold text-slate-900 border-x border-slate-200">
                              Rp {(item.qty * item.unitPrice).toLocaleString('id-ID')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* TOTAL PEMBAYARAN */}
                    <div className="flex justify-end pt-3.5 text-right">
                      <div className="text-xs font-bold text-slate-900 flex items-center">
                        TOTAL PEMBAYARAN: 
                        <span className="text-[#ea580c] font-black text-sm sm:text-base ml-2">
                          Rp {totalPayment.toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* METODE & INSTRUKSI PEMBAYARAN */}
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

                {/* SIGNATURE SECTION (PENGESAHAN) */}
                <div className="grid grid-cols-2 text-xs text-slate-900 pt-6 mt-4">
                  {/* Ketua Pelaksana */}
                  <div className="text-center w-60">
                    <p className="font-medium text-slate-800 mb-1">Mengetahui,</p>
                    
                    {/* Signature Graphics */}
                    <div className="h-20 flex items-center justify-center my-1">
                      {data.customLeaderSignatureUrl ? (
                        <img 
                          src={data.customLeaderSignatureUrl} 
                          alt="TTD Ketua" 
                          className="max-h-20 max-w-[150px] object-contain"
                          crossOrigin="anonymous"
                        />
                      ) : (
                        /* Authentic Signature Graphic for Dilan */
                        <svg viewBox="0 0 140 60" className="w-32 h-16 text-slate-900 fill-none stroke-current stroke-2">
                          <path d="M 25 45 C 30 20, 35 10, 42 22 C 48 32, 40 50, 52 35 C 60 25, 68 30, 75 22 C 80 15, 88 40, 92 28 C 95 18, 105 25, 115 20" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M 20 48 Q 65 38, 120 42" strokeLinecap="round" />
                          <circle cx="85" cy="18" r="2" fill="currentColor" />
                        </svg>
                      )}
                    </div>

                    <p className="font-extrabold text-slate-950 text-xs tracking-tight">{data.leaderNameSign}</p>
                    <p className="text-[11px] text-slate-600 font-medium">{data.leaderRoleSign}</p>
                  </div>

                  {/* Bendahara */}
                  <div className="text-center w-60 ml-auto">
                    <p className="font-medium text-slate-800 mb-1">{data.signaturePlaceDate}</p>
                    
                    {/* Signature Graphics */}
                    <div className="h-20 flex items-center justify-center my-1">
                      {data.customTreasurerSignatureUrl ? (
                        <img 
                          src={data.customTreasurerSignatureUrl} 
                          alt="TTD Bendahara" 
                          className="max-h-20 max-w-[150px] object-contain"
                          crossOrigin="anonymous"
                        />
                      ) : (
                        /* Authentic Signature Graphic for Zhara */
                        <svg viewBox="0 0 140 60" className="w-32 h-16 text-slate-900 fill-none stroke-current stroke-2">
                          <path d="M 50 15 L 60 48 M 45 30 L 68 28" strokeLinecap="round" />
                          <path d="M 58 20 C 70 8, 85 15, 78 32 C 72 45, 60 52, 75 48 C 88 44, 98 25, 90 38 C 85 45, 105 40, 115 35" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M 40 50 Q 80 44, 118 46" strokeLinecap="round" />
                        </svg>
                      )}
                    </div>

                    <p className="font-extrabold text-slate-950 text-xs tracking-tight">{data.treasurerNameSign}</p>
                    <p className="text-[11px] text-slate-600 font-medium">{data.treasurerRoleSign}</p>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer / Action Buttons */}
        <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 hidden sm:block">
            Format: Standar Dokumen A4 Resmi SIFEST 2026
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-colors cursor-pointer"
            >
              Tutup
            </button>

            <button
              type="button"
              onClick={() => exportPDF(true)}
              disabled={isExporting}
              className="px-4 py-2.5 rounded-xl border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Printer size={16} />
              <span>Cetak Langsung</span>
            </button>

            <button
              type="button"
              onClick={() => exportPDF(false)}
              disabled={isExporting}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
            >
              <Download size={16} />
              <span>Unduh PDF Invoice</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
