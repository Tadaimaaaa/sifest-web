"use client";

import { Printer, Download, Eye, X, ZoomIn, ZoomOut, RotateCcw, FileText, Loader2 } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import Swal from "sweetalert2";

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
      
      const dataUrl = await toPng(printRef.current, { 
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });
      
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });
      
      const img = new Image();
      img.src = dataUrl;
      
      await new Promise((resolve) => {
        img.onload = resolve;
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (img.height * pdfWidth) / img.width;
      
      if (pdfHeight > pdf.internal.pageSize.getHeight()) {
        pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight);
      } else {
        const marginY = (pdf.internal.pageSize.getHeight() - pdfHeight) / 2;
        pdf.addImage(dataUrl, "PNG", 0, marginY, pdfWidth, pdfHeight);
      }
      
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

  // Form Content Component
  const FormDocument = () => (
    <div 
      ref={printRef} 
      className="w-[794px] min-h-[1123px] bg-white text-black px-10 py-12 font-serif relative shadow-2xl rounded-sm border border-slate-200 select-text" 
      style={{ fontFamily: '"Times New Roman", Times, serif' }}
    >
      {/* KOP SURAT */}
      <div className="flex items-center justify-between pb-3">
        <img src="/logo-hmjsi.jpg" alt="Logo HMJ SI" className="w-[90px] h-[90px] object-contain" />
        <div className="text-center flex-1 px-4 text-black">
          <h1 className="text-[15px] font-bold leading-snug" style={{ fontFamily: '"Times New Roman", Times, serif' }}>PANITIA PELAKSANA SISTEM INFORMASI FESTIVAL</h1>
          <h2 className="text-[15px] font-bold leading-snug" style={{ fontFamily: '"Times New Roman", Times, serif' }}>HIMPUNAN MAHASISWA JURUSAN SISTEM INFORMASI</h2>
          <h3 className="text-[15px] font-bold leading-snug" style={{ fontFamily: '"Times New Roman", Times, serif' }}>FAKULTAS ILMU KOMPUTER</h3>
          <h4 className="text-[15px] font-bold leading-snug" style={{ fontFamily: '"Times New Roman", Times, serif' }}>REPUBLIK MAHASISWA UNIVERSITAS PUTRA INDONESIA "YPTK" PADANG</h4>
          <p className="text-[12px] leading-snug mt-1" style={{ fontFamily: '"Times New Roman", Times, serif' }}>Sekretariat Jl. Raya Lubuk Begalung, Student Center Lt. 1 Padang Sumbar</p>
          <p className="text-[12px] leading-snug" style={{ fontFamily: '"Times New Roman", Times, serif' }}>Email : <span className="text-blue-700 underline">sinformationfest@gmail.com</span> Instagram : @sifest.hmjsi</p>
        </div>
        <div className="flex items-center gap-2">
          <img src="/logo-rema.png" alt="Logo REMA" className="w-[85px] h-[85px] object-contain" />
          <img src="/logo-sifest.png" alt="Logo SIFEST" className="w-[90px] h-[90px] object-contain" />
        </div>
      </div>
      
      {/* Garis Pembatas */}
      <div className="w-full border-t-[3px] border-black mt-2 mb-1"></div>
      <div className="w-full border-t border-black mb-6"></div>

      {/* Judul Formulir */}
      <h2 className="text-center font-bold text-lg mb-8" style={{ fontFamily: '"Times New Roman", Times, serif', textDecoration: 'underline' }}>
        FORMULIR PENDAFTARAN {e.name?.toUpperCase() || "PESERTA"}
      </h2>

      {/* Konten Data Utama */}
      <table className="w-full text-[14px] mb-6" style={{ fontFamily: '"Times New Roman", Times, serif', lineHeight: '1.8' }}>
        <tbody>
          <tr>
            <td className="w-[35%] font-bold align-top">Kode Pendaftaran</td>
            <td className="w-[20px] align-top">:</td>
            <td className="align-top font-mono font-bold bg-gray-100 px-2 rounded inline-block">{registration.registration_code}</td>
          </tr>
          <tr>
            <td className="w-[35%] font-bold align-top">Event</td>
            <td className="w-[20px] align-top">:</td>
            <td className="align-top font-bold">{e.name}</td>
          </tr>
          <tr>
            <td className="w-[35%] font-bold align-top pt-4">{e.slug?.startsWith('open-bazaar') ? "Nama Penanggung Jawab" : "Nama Lengkap / Kapten"}</td>
            <td className="w-[20px] align-top pt-4">:</td>
            <td className="align-top pt-4">{p.full_name}</td>
          </tr>
          <tr>
            <td className="w-[35%] font-bold align-top">{e.slug?.startsWith('open-bazaar') ? "Nama Usaha/Brand" : "Asal Institusi / Tim"}</td>
            <td className="w-[20px] align-top">:</td>
            <td className="align-top">{p.institution}</td>
          </tr>
          <tr>
            <td className="w-[35%] font-bold align-top">Email</td>
            <td className="w-[20px] align-top">:</td>
            <td className="align-top">{p.email}</td>
          </tr>
          <tr>
            <td className="w-[35%] font-bold align-top">No. WhatsApp</td>
            <td className="w-[20px] align-top">:</td>
            <td className="align-top">{p.whatsapp}</td>
          </tr>
          
          {/* Mahasiswa UPI YPTK */}
          {p.institution === 'UPI YPTK Padang' && m.jurusan && (
            <>
              <tr>
                <td className="w-[35%] font-bold align-top">Jurusan / Kelas</td>
                <td className="w-[20px] align-top">:</td>
                <td className="align-top">{m.jurusan} {m.kelas ? `- ${m.kelas}` : ''}</td>
              </tr>
              <tr>
                <td className="w-[35%] font-bold align-top">No BP</td>
                <td className="w-[20px] align-top">:</td>
                <td className="align-top">{m.nobp}</td>
              </tr>
            </>
          )}

          {/* Data Khusus Bazaar */}
          {e.slug?.startsWith('open-bazaar') && (
            <>
              <tr>
                <td className="w-[35%] font-bold align-top pt-4">Alamat Usaha</td>
                <td className="w-[20px] align-top pt-4">:</td>
                <td className="align-top pt-4">{m.address || '-'}</td>
              </tr>
              <tr>
                <td className="w-[35%] font-bold align-top">Kategori & Produk</td>
                <td className="w-[20px] align-top">:</td>
                <td className="align-top">{m.category || '-'} ({m.products || '-'})</td>
              </tr>
              <tr>
                <td className="w-[35%] font-bold align-top">Instagram</td>
                <td className="w-[20px] align-top">:</td>
                <td className="align-top">{m.instagram || '-'}</td>
              </tr>
            </>
          )}

          {/* Data Khusus MTQ */}
          {e.slug === 'lomba-keagamaan' && (
            <>
              <tr>
                <td className="w-[35%] font-bold align-top pt-4">Nama Pembimbing</td>
                <td className="w-[20px] align-top pt-4">:</td>
                <td className="align-top pt-4">{m.guruPendamping || '-'}</td>
              </tr>
              <tr>
                <td className="w-[35%] font-bold align-top">No. WA Pembimbing</td>
                <td className="w-[20px] align-top">:</td>
                <td className="align-top">{m.nowaGuruPendamping || '-'}</td>
              </tr>
            </>
          )}
        </tbody>
      </table>

      {/* Data Khusus Futsal & E-Sport (Pelatih) */}
      {m.teamData && (
        <div className="mb-6">
          <h3 className="font-bold text-[15px] mb-2" style={{ fontFamily: '"Times New Roman", Times, serif', textDecoration: 'underline' }}>Data Pelatih (Coach)</h3>
          <table className="w-full text-[15px]" style={{ fontFamily: '"Times New Roman", Times, serif', lineHeight: '1.8' }}>
            <tbody>
              <tr>
                <td className="w-[35%] font-bold align-top">Nama Pelatih</td>
                <td className="w-[20px] align-top">:</td>
                <td className="align-top">{m.teamData.coachName || '-'}</td>
              </tr>
              <tr>
                <td className="w-[35%] font-bold align-top">No. WA Pelatih</td>
                <td className="w-[20px] align-top">:</td>
                <td className="align-top">{m.teamData.coachWhatsapp || '-'}</td>
              </tr>
              {m.teamData.assistantCoachName && (
                <tr>
                  <td className="w-[35%] font-bold align-top">Asisten Pelatih</td>
                  <td className="w-[20px] align-top">:</td>
                  <td className="align-top">{m.teamData.assistantCoachName}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Data Khusus Tim (Pemain) */}
      {m.players && m.players.length > 0 && (
        <div className="mb-6">
          <h3 className="font-bold text-[15px] mb-2" style={{ fontFamily: '"Times New Roman", Times, serif', textDecoration: 'underline' }}>Daftar Anggota Tim</h3>
          <table className="w-full text-[14px] border-collapse border border-black" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black px-2 py-1 text-center w-[10%]">No</th>
                <th className="border border-black px-2 py-1 text-left w-[35%]">Nama Lengkap</th>
                {e.slug?.includes('esport') || e.slug === 'mlbb' ? (
                  <th className="border border-black px-2 py-1 text-left">Nickname / ID</th>
                ) : (
                  <th className="border border-black px-2 py-1 text-left">NISN / No. BP</th>
                )}
                <th className="border border-black px-2 py-1 text-center w-[20%]">Status / Posisi</th>
                {e.slug?.includes('futsal') && (
                  <th className="border border-black px-2 py-1 text-center w-[15%]">No. Punggung</th>
                )}
              </tr>
            </thead>
            <tbody>
              {m.players.map((player: any, idx: number) => (
                <tr key={idx}>
                  <td className="border border-black px-2 py-1 text-center">{idx + 1}</td>
                  <td className="border border-black px-2 py-1">{player.name}</td>
                  {e.slug?.includes('esport') || e.slug === 'mlbb' ? (
                    <td className="border border-black px-2 py-1">{player.nickname || '-'}</td>
                  ) : (
                    <td className="border border-black px-2 py-1">{player.nisn || player.nobp || '-'}</td>
                  )}
                  <td className="border border-black px-2 py-1 text-center">{player.posisi || player.role || (idx === 0 ? 'Kapten' : 'Anggota')}</td>
                  {e.slug?.includes('futsal') && (
                    <td className="border border-black px-2 py-1 text-center">{player.jerseyNumber || '-'}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Status Verifikasi */}
      <table className="w-full text-[15px] mb-8" style={{ fontFamily: '"Times New Roman", Times, serif', lineHeight: '1.8' }}>
        <tbody>
          <tr>
            <td className="w-[35%] font-bold align-top">Status Pendaftaran</td>
            <td className="w-[20px] align-top">:</td>
            <td className="align-top font-bold uppercase">{registration.status === 'VERIFIED' ? 'TERVERIFIKASI' : registration.status === 'PAID' ? 'LUNAS (Menunggu Verifikasi)' : registration.status}</td>
          </tr>
        </tbody>
      </table>

      {/* Tanda Tangan */}
      <div className="absolute bottom-16 right-16 flex justify-end" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
        <div className="text-center w-[250px]">
          <p className="mb-20">Padang, {new Date(registration.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' })}</p>
          <p className="font-bold border-b border-black inline-block px-4 pb-1">{p.full_name}</p>
          <p className="mt-1">Pendaftar</p>
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
              <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm md:text-base font-bold text-white tracking-tight">Pratinjau Formulir Pendaftaran</h2>
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
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
              style={{ 
                transform: `scale(${scale})`, 
                transformOrigin: 'top center',
                transition: 'transform 0.15s ease-out',
                marginBottom: scale < 1 ? `-${(1 - scale) * 1123}px` : '40px'
              }}
              className="shrink-0 my-4"
            >
              <FormDocument />
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
