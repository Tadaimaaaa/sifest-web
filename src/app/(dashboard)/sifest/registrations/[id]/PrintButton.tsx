"use client";

import { Printer, Download, Eye, X, ZoomIn, ZoomOut, RotateCcw, FileText, Loader2 } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { toJpeg } from "html-to-image";
import { jsPDF } from "jspdf";
import Swal from "sweetalert2";
import { getTentLocationLabel } from "@/lib/bazaarTents";

export default function PrintButton({ registration }: { registration?: any }) {
  const printRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [scale, setScale] = useState(1);

  // Responsive scale saat pertama kali modal pratinjau dibuka
  useEffect(() => {
    if (isPreviewOpen && typeof window !== "undefined") {
      const availableWidth = window.innerWidth - 64;
      if (availableWidth < 794) {
        const calculatedScale = Math.max(0.45, Number((availableWidth / 794).toFixed(2)));
        setScale(calculatedScale);
      } else {
        setScale(1);
      }
    }
  }, [isPreviewOpen]);

  // Handle ESC key untuk menutup modal pratinjau
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isPreviewOpen) {
        setIsPreviewOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPreviewOpen]);

  const exportPDF = async (openInNewTab = false) => {
    if (!registration || !printRef.current) return;
    
    setIsExporting(true);
    Swal.fire({
      title: openInNewTab ? 'Menyiapkan Cetak...' : 'Menyiapkan Unduhan PDF...',
      text: 'Mohon tunggu sebentar',
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
      // Delay sejenak untuk memastikan render DOM stabil
      await new Promise(r => setTimeout(r, 200));
      
      const node = printRef.current;
      const naturalWidth = 794;
      const naturalHeight = node.scrollHeight || 1123;

      // Kompresi langsung ke JPEG berukuran optimal tanpa mengurangi ketajaman teks
      const dataUrl = await toJpeg(node, { 
        quality: 0.92,
        pixelRatio: 2,
        width: naturalWidth,
        height: naturalHeight,
        backgroundColor: '#ffffff',
        style: {
          transform: 'none',
          transformOrigin: 'top left',
          margin: '0',
        }
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
      
      const pageWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm
      
      let renderWidth = pageWidth;
      let renderHeight = (img.height * pageWidth) / img.width;
      let posX = 0;
      let posY = 0;
      
      if (renderHeight > pageHeight) {
        // Skala agar PAS 1 halaman tanpa pernah terpotong
        renderHeight = pageHeight;
        renderWidth = (img.width * pageHeight) / img.height;
        posX = (pageWidth - renderWidth) / 2;
        posY = 0;
      } else {
        posY = Math.max(0, (pageHeight - renderHeight) / 2);
      }
      
      pdf.addImage(dataUrl, "JPEG", posX, posY, renderWidth, renderHeight, undefined, "FAST");
      
      const blob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      
      if (openInNewTab) {
        const printWindow = window.open(blobUrl);
        if (!printWindow) {
          // Jika popup diblokir browser, fallback ke download
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = `Formulir_${registration.registration_code}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } else {
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `Formulir_${registration.registration_code}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      Swal.close();
    } catch (error: any) {
      console.error("Gagal cetak PDF:", error);
      Swal.fire("Error!", "Terjadi kesalahan saat memproses PDF: " + (error.message || error.toString()), "error");
    } finally {
      setIsExporting(false);
    }
  };

  if (!registration) return null;
  const p = registration.participants || {};
  const e = registration.events || {};
  const m = p.metadata || {};
  const tx = Array.isArray(registration.transactions) 
    ? registration.transactions[0] 
    : (registration.transactions || {});

  const getPaymentStatusText = () => {
    if (tx.payment_method === 'FREE') return 'GRATIS / FREE';
    
    const status = tx.status || '';
    if (status === 'PAID' || status === 'VERIFIED') return 'SUDAH LUNAS';
    if (status === 'DOWN_PAYMENT') return 'UANG MUKA (DP)';
    if (status === 'WAITING_PAYMENT' || status === 'PENDING') return 'MENUNGGU PEMBAYARAN';
    if (status === 'REJECTED') return 'DITOLAK';
    if (status === 'CANCELLED') return 'DIBATALKAN';

    if (m.status_bayar) {
      if (m.status_bayar === 'Lunas') return 'SUDAH LUNAS';
      if (m.status_bayar === 'DP') return 'UANG MUKA (DP)';
      return String(m.status_bayar).toUpperCase();
    }

    return status ? status.toUpperCase() : 'BELUM DIVERIFIKASI';
  };

  // Form Content Component
  const FormDocument = () => (
    <div 
      ref={printRef} 
      className="w-[794px] min-h-[1123px] bg-white text-black px-10 py-7 font-serif flex flex-col justify-between relative shadow-2xl rounded-sm border border-slate-200 select-text" 
      style={{ fontFamily: '"Times New Roman", Times, serif' }}
    >
      <div className="flex-1 flex flex-col">
        {/* KOP SURAT */}
        <div className="flex items-center justify-between pb-2">
          <img src="/logo-hmjsi.jpg" alt="Logo HMJ SI" className="w-[74px] h-[74px] object-contain shrink-0" />
          <div className="text-center flex-1 px-3 text-black">
            <h1 className="text-[13.5px] font-bold leading-tight" style={{ fontFamily: '"Times New Roman", Times, serif' }}>PANITIA PELAKSANA SISTEM INFORMASI FESTIVAL</h1>
            <h2 className="text-[13.5px] font-bold leading-tight" style={{ fontFamily: '"Times New Roman", Times, serif' }}>HIMPUNAN MAHASISWA JURUSAN SISTEM INFORMASI</h2>
            <h3 className="text-[13.5px] font-bold leading-tight" style={{ fontFamily: '"Times New Roman", Times, serif' }}>FAKULTAS ILMU KOMPUTER</h3>
            <h4 className="text-[13.5px] font-bold leading-tight" style={{ fontFamily: '"Times New Roman", Times, serif' }}>REPUBLIK MAHASISWA UNIVERSITAS PUTRA INDONESIA "YPTK" PADANG</h4>
            <p className="text-[11px] leading-tight mt-1" style={{ fontFamily: '"Times New Roman", Times, serif' }}>Sekretariat Jl. Raya Lubuk Begalung, Student Center Lt. 1 Padang Sumbar</p>
            <p className="text-[11px] leading-tight text-black" style={{ fontFamily: '"Times New Roman", Times, serif' }}>Email : sinformationfest@gmail.com | Instagram : @sifest.hmjsi</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <img src="/logo-rema.png" alt="Logo REMA" className="w-[70px] h-[70px] object-contain" />
            <img src="/logo-sifest.png" alt="Logo SIFEST" className="w-[74px] h-[74px] object-contain" />
          </div>
        </div>
        
        {/* Garis Pembatas */}
        <div className="w-full border-t-[2.5px] border-black mt-1 mb-[2px]"></div>
        <div className="w-full border-t border-black mb-3"></div>

        {/* Judul Formulir */}
        <h2 className="text-center font-bold text-[15px] mb-3 tracking-wide" style={{ fontFamily: '"Times New Roman", Times, serif', textDecoration: 'underline' }}>
          FORMULIR PENDAFTARAN {e.name?.toUpperCase() || "PESERTA"}
        </h2>

        {/* Konten Data Utama */}
        <table className="w-full text-[13px] mb-3" style={{ fontFamily: '"Times New Roman", Times, serif', lineHeight: '1.45' }}>
          <tbody>
            <tr>
              <td className="w-[35%] font-bold align-top py-0.5">Kode Pendaftaran</td>
              <td className="w-[20px] align-top py-0.5">:</td>
              <td className="align-top font-mono font-bold text-black py-0.5">{registration.registration_code}</td>
            </tr>
            <tr>
              <td className="w-[35%] font-bold align-top py-0.5">Event</td>
              <td className="w-[20px] align-top py-0.5">:</td>
              <td className="align-top font-bold py-0.5">{e.name}</td>
            </tr>
            <tr>
              <td className="w-[35%] font-bold align-top py-0.5">{e.slug?.startsWith('open-bazaar') ? "Nama Penanggung Jawab" : "Nama Lengkap / Kapten"}</td>
              <td className="w-[20px] align-top py-0.5">:</td>
              <td className="align-top py-0.5">{p.full_name}</td>
            </tr>
            <tr>
              <td className="w-[35%] font-bold align-top py-0.5">{e.slug?.startsWith('open-bazaar') ? "Nama Usaha/Brand" : "Asal Institusi / Tim"}</td>
              <td className="w-[20px] align-top py-0.5">:</td>
              <td className="align-top py-0.5">{p.institution}</td>
            </tr>
            <tr>
              <td className="w-[35%] font-bold align-top py-0.5">Email</td>
              <td className="w-[20px] align-top py-0.5">:</td>
              <td className="align-top py-0.5">{p.email}</td>
            </tr>
            <tr>
              <td className="w-[35%] font-bold align-top py-0.5">No. WhatsApp</td>
              <td className="w-[20px] align-top py-0.5">:</td>
              <td className="align-top py-0.5">{p.whatsapp}</td>
            </tr>
            
            {/* Mahasiswa UPI YPTK */}
            {p.institution === 'UPI YPTK Padang' && m.jurusan && (
              <>
                <tr>
                  <td className="w-[35%] font-bold align-top py-0.5">Jurusan / Kelas</td>
                  <td className="w-[20px] align-top py-0.5">:</td>
                  <td className="align-top py-0.5">{m.jurusan} {m.kelas ? `- ${m.kelas}` : ''}</td>
                </tr>
                <tr>
                  <td className="w-[35%] font-bold align-top py-0.5">No BP</td>
                  <td className="w-[20px] align-top py-0.5">:</td>
                  <td className="align-top py-0.5">{m.nobp}</td>
                </tr>
              </>
            )}

            {/* Data Khusus Bazaar */}
            {e.slug?.startsWith('open-bazaar') && (
              <>
                <tr>
                  <td className="w-[35%] font-bold align-top py-0.5">Lokasi Tenda</td>
                  <td className="w-[20px] align-top py-0.5">:</td>
                  <td className="align-top py-0.5 font-bold text-black">
                    {getTentLocationLabel(m.id_tenda || m.lokasi_tenda)}
                  </td>
                </tr>
                <tr>
                  <td className="w-[35%] font-bold align-top py-0.5">Alamat Usaha</td>
                  <td className="w-[20px] align-top py-0.5">:</td>
                  <td className="align-top py-0.5">{m.address || '-'}</td>
                </tr>
                <tr>
                  <td className="w-[35%] font-bold align-top py-0.5">Kategori & Produk</td>
                  <td className="w-[20px] align-top py-0.5">:</td>
                  <td className="align-top py-0.5">{m.category || '-'} ({m.products || '-'})</td>
                </tr>
                <tr>
                  <td className="w-[35%] font-bold align-top py-0.5">Instagram</td>
                  <td className="w-[20px] align-top py-0.5">:</td>
                  <td className="align-top py-0.5">{m.instagram || '-'}</td>
                </tr>
              </>
            )}

            {/* Data Khusus MTQ */}
            {e.slug === 'lomba-keagamaan' && (
              <>
                <tr>
                  <td className="w-[35%] font-bold align-top py-0.5">Nama Pembimbing</td>
                  <td className="w-[20px] align-top py-0.5">:</td>
                  <td className="align-top py-0.5">{m.guruPendamping || '-'}</td>
                </tr>
                <tr>
                  <td className="w-[35%] font-bold align-top py-0.5">No. WA Pembimbing</td>
                  <td className="w-[20px] align-top py-0.5">:</td>
                  <td className="align-top py-0.5">{m.nowaGuruPendamping || '-'}</td>
                </tr>
              </>
            )}
          </tbody>
        </table>

        {/* Data Khusus Futsal & E-Sport (Pelatih) */}
        {m.teamData && (
          <div className="mb-3">
            <h3 className="font-bold text-[13px] mb-1" style={{ fontFamily: '"Times New Roman", Times, serif', textDecoration: 'underline' }}>Data Pelatih (Coach)</h3>
            <table className="w-full text-[13px]" style={{ fontFamily: '"Times New Roman", Times, serif', lineHeight: '1.45' }}>
              <tbody>
                <tr>
                  <td className="w-[35%] font-bold align-top py-0.5">Nama Pelatih</td>
                  <td className="w-[20px] align-top py-0.5">:</td>
                  <td className="align-top py-0.5">{m.teamData.coachName || '-'}</td>
                </tr>
                <tr>
                  <td className="w-[35%] font-bold align-top py-0.5">No. WA Pelatih</td>
                  <td className="w-[20px] align-top py-0.5">:</td>
                  <td className="align-top py-0.5">{m.teamData.coachWhatsapp || '-'}</td>
                </tr>
                {m.teamData.assistantCoachName && (
                  <tr>
                    <td className="w-[35%] font-bold align-top py-0.5">Asisten Pelatih</td>
                    <td className="w-[20px] align-top py-0.5">:</td>
                    <td className="align-top py-0.5">{m.teamData.assistantCoachName}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Data Khusus Tim (Pemain) */}
        {m.players && m.players.length > 0 && (
          <div className="mb-3">
            <h3 className="font-bold text-[13px] mb-1" style={{ fontFamily: '"Times New Roman", Times, serif', textDecoration: 'underline' }}>
              Daftar Anggota Tim ({m.players.length} Pemain)
            </h3>
            <table className="w-full text-[11.5px] border-collapse border border-black" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
              <thead>
                <tr className="bg-gray-100 font-bold">
                  <th className="border border-black px-2 py-0.5 text-center w-[7%]">No</th>
                  <th className="border border-black px-2 py-0.5 text-left w-[36%]">Nama Lengkap</th>
                  {e.slug?.includes('esport') || e.slug === 'mlbb' ? (
                    <th className="border border-black px-2 py-0.5 text-left">Nickname / ID</th>
                  ) : (
                    <th className="border border-black px-2 py-0.5 text-left">NISN / No. BP</th>
                  )}
                  <th className="border border-black px-2 py-0.5 text-center w-[20%]">Status / Posisi</th>
                  {e.slug?.includes('futsal') && (
                    <th className="border border-black px-2 py-0.5 text-center w-[15%]">No. Punggung</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {m.players.map((player: any, idx: number) => (
                  <tr key={idx} className="leading-tight">
                    <td className="border border-black px-2 py-[2.5px] text-center">{idx + 1}</td>
                    <td className="border border-black px-2 py-[2.5px] font-medium">{player.name}</td>
                    {e.slug?.includes('esport') || e.slug === 'mlbb' ? (
                      <td className="border border-black px-2 py-[2.5px]">{player.nickname || '-'}</td>
                    ) : (
                      <td className="border border-black px-2 py-[2.5px]">{player.nisn || player.nobp || '-'}</td>
                    )}
                    <td className="border border-black px-2 py-[2.5px] text-center">{player.posisi || player.role || (idx === 0 ? 'Kapten' : 'Anggota')}</td>
                    {e.slug?.includes('futsal') && (
                      <td className="border border-black px-2 py-[2.5px] text-center font-bold">{player.jerseyNumber || '-'}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bagian Bawah: Status Pendaftaran & Tanda Tangan */}
      <div className="mt-auto pt-3 border-t border-slate-300 flex items-start justify-between gap-6" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
        {/* Kolom Kiri: Status & Informasi */}
        <div className="flex-1 max-w-[420px]">
          <table className="w-full text-[13px]" style={{ lineHeight: '1.45' }}>
            <tbody>
              <tr>
                <td className="w-[145px] font-bold align-top py-0.5">Status Pendaftaran</td>
                <td className="w-[15px] align-top py-0.5">:</td>
                <td className="align-top font-bold uppercase py-0.5">
                  {registration.status === 'VERIFIED' ? 'TERVERIFIKASI' : registration.status === 'PAID' ? 'LUNAS (Menunggu Verifikasi)' : registration.status}
                </td>
              </tr>
              <tr>
                <td className="w-[145px] font-bold align-top py-0.5">Status Pembayaran</td>
                <td className="w-[15px] align-top py-0.5">:</td>
                <td className="align-top font-bold uppercase py-0.5">
                  {getPaymentStatusText()}
                </td>
              </tr>
            </tbody>
          </table>
          <p className="text-[11px] text-slate-600 mt-2 italic leading-relaxed">
            * Simpan formulir pendaftaran ini sebagai bukti registrasi kepesertaan yang sah pada SI FEST 2026.
          </p>
        </div>

        {/* Kolom Kanan: Tanda Tangan Pendaftar */}
        <div className="text-center w-[230px] shrink-0 text-[13px]">
          <p>Padang, {new Date(registration.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' })}</p>
          <div className="h-14 flex items-center justify-center">
            {/* Ruang untuk tanda tangan fisik */}
          </div>
          <p className="font-bold border-b border-black inline-block px-4 pb-0.5">{p.full_name}</p>
          <p className="mt-0.5 text-[12px] text-slate-700">Pendaftar</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Trigger Button di Halaman Detail */}
      <button 
        onClick={() => setIsPreviewOpen(true)}
        className="print:hidden flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-sm font-semibold rounded-xl shadow-sm transition-all hover:shadow active:scale-95"
      >
        <Printer className="w-4 h-4 text-blue-600" />
        <span>Cetak PDF</span>
      </button>

      {/* MODAL PRATINJAU PDF */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          
          {/* Top Bar / Navigation Toolbar */}
          <div className="h-16 px-4 md:px-6 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between shrink-0 text-white z-20 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm md:text-base font-bold text-white tracking-tight">Pratinjau Formulir Pendaftaran</h2>
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    {registration.registration_code}
                  </span>
                </div>
                <p className="text-xs text-slate-400 hidden sm:block truncate max-w-xs md:max-w-md">
                  {e.name} • {p.full_name}
                </p>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center gap-2 md:gap-3">
              {/* Zoom Controls */}
              <div className="hidden md:flex items-center bg-slate-800 border border-slate-700/80 rounded-xl p-1 text-slate-300 text-xs shadow-inner">
                <button 
                  onClick={() => setScale(s => Math.max(0.4, Number((s - 0.1).toFixed(2))))}
                  className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors text-slate-300 hover:text-white"
                  title="Perkecil (Zoom Out)"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="px-2 font-mono text-[11px] min-w-[45px] text-center font-bold text-slate-200">
                  {Math.round(scale * 100)}%
                </span>
                <button 
                  onClick={() => setScale(s => Math.min(1.5, Number((s + 0.1).toFixed(2))))}
                  className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors text-slate-300 hover:text-white"
                  title="Perbesar (Zoom In)"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setScale(1)}
                  className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors text-slate-300 hover:text-white ml-1 border-l border-slate-700"
                  title="Kembalikan Ukuran Asli (100%)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Print Button (Buka di Tab Baru / Cetak) */}
              <button
                onClick={() => exportPDF(true)}
                disabled={isExporting}
                className="flex items-center gap-1.5 px-3 md:px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs md:text-sm font-semibold transition-all shadow-sm active:scale-95 disabled:opacity-50"
                title="Buka dokumen di tab baru untuk dicetak"
              >
                <Printer className="w-4 h-4 text-slate-300" />
                <span className="hidden sm:inline">Cetak</span>
              </button>

              {/* Download PDF Button */}
              <button
                onClick={() => exportPDF(false)}
                disabled={isExporting}
                className="flex items-center gap-2 px-3.5 md:px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs md:text-sm font-bold transition-all shadow-lg shadow-blue-600/30 active:scale-95 disabled:opacity-50"
                title="Download file PDF ke perangkat"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Unduh PDF</span>
                  </>
                )}
              </button>

              {/* Close Button */}
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors ml-1"
                title="Tutup Pratinjau (ESC)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Scrollable Document Canvas */}
          <div className="flex-1 overflow-auto p-4 md:p-8 flex justify-center items-start bg-slate-950/70">
            <div 
              className="shrink-0 my-4 shadow-2xl transition-all duration-150"
              style={{ 
                width: `${794 * scale}px`,
                height: `${1123 * scale}px`,
              }}
            >
              <div 
                style={{ 
                  transform: `scale(${scale})`, 
                  transformOrigin: 'top left',
                  width: '794px',
                  minHeight: '1123px',
                }}
              >
                <FormDocument />
              </div>
            </div>
          </div>

          {/* Bottom Bar Info */}
          <div className="py-2.5 px-4 bg-slate-900 border-t border-slate-800 text-center text-xs text-slate-400 shrink-0 flex items-center justify-between sm:justify-center gap-4">
            <span>Tekan <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300 font-mono">ESC</kbd> untuk menutup pratinjau</span>
            <span className="sm:hidden font-mono text-[11px] text-blue-400 font-semibold">{Math.round(scale * 100)}%</span>
          </div>

        </div>
      )}

      {/* Hidden Fallback jika modal tidak terbuka namun fungsi export dipanggil */}
      {!isPreviewOpen && (
        <div className="overflow-hidden h-0 w-0 absolute left-[-9999px] top-[-9999px]">
          <FormDocument />
        </div>
      )}
    </>
  );
}
