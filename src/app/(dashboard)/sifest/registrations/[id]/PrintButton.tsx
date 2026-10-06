"use client";

import { Printer } from "lucide-react";
import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import Swal from "sweetalert2";

export default function PrintButton({ registration }: { registration?: any }) {
  const printRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const exportPDF = async () => {
    if (!registration || !printRef.current) return;
    
    setIsExporting(true);
    Swal.fire({
      title: 'Menyiapkan PDF...',
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
      // Tunggu sebentar agar render DOM selesai dengan baik
      await new Promise(r => setTimeout(r, 300));
      
      const dataUrl = await toPng(printRef.current, { 
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        style: {
          position: 'static',
          left: 'auto',
          top: 'auto'
        }
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
      window.open(blobUrl, '_blank');
      Swal.close();
    } catch (error: any) {
      console.error("Gagal cetak PDF:", error);
      Swal.fire("Error!", "Terjadi kesalahan saat mencetak PDF: " + (error.message || error.toString()), "error");
    } finally {
      setIsExporting(false);
    }
  };

  if (!registration) return null;
  const p = registration.participants || {};
  const e = registration.events || {};
  const m = p.metadata || {};

  return (
    <>
      <button 
        onClick={exportPDF}
        disabled={isExporting}
        className="print:hidden flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50"
      >
        <Printer className="w-4 h-4" />
        {isExporting ? "Memproses..." : "Cetak PDF"}
      </button>

      {/* HIDDEN PRINT TEMPLATE */}
      <div className="overflow-hidden h-0 w-0 absolute left-[-9999px] top-[-9999px]">
        <div ref={printRef} className="w-[800px] bg-white text-black p-10 font-serif" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
          
          {/* KOP SURAT */}
          <div className="flex items-center justify-between pb-3">
            <img src="/logo-rema.png" alt="Logo REMA" className="w-[85px] object-contain" />
            <div className="text-center flex-1 px-2 text-black">
              <h1 className="text-[16.5px] font-bold leading-tight" style={{ fontFamily: '"Times New Roman", Times, serif' }}>PANITIA PELAKSANA SISTEM INFORMASI FESTIVAL</h1>
              <h2 className="text-[16.5px] font-bold leading-tight" style={{ fontFamily: '"Times New Roman", Times, serif' }}>HIMPUNAN MAHASISWA JURUSAN SISTEM INFORMASI</h2>
              <h3 className="text-[16.5px] font-bold leading-tight" style={{ fontFamily: '"Times New Roman", Times, serif' }}>FAKULTAS ILMU KOMPUTER</h3>
              <h4 className="text-[16.5px] font-bold leading-tight" style={{ fontFamily: '"Times New Roman", Times, serif' }}>REPUBLIK MAHASISWA UNIVERSITAS PUTRA INDONESIA "YPTK" PADANG</h4>
              <p className="text-[14px] leading-tight mt-1.5" style={{ fontFamily: '"Times New Roman", Times, serif' }}>Sekretariat Jl. Raya Lubuk Begalung, Student Center Lt. 1 Padang Sumbar</p>
              <p className="text-[14px] leading-tight" style={{ fontFamily: '"Times New Roman", Times, serif' }}>Email : <span className="text-blue-700 underline">sinformationfest@gmail.com</span> Instagram : @sifest.hmjsi</p>
            </div>
            <div className="flex items-center gap-1">
              <img src="/logo-hmjsi.jpg" alt="Logo HMJ SI" className="w-[75px] object-contain" />
              <img src="/logo-sifest.png" alt="Logo SIFEST" className="w-[80px] object-contain" />
            </div>
          </div>
          
          {/* Garis Pembatas */}
          <div className="w-full border-t-[3px] border-black mt-2 mb-1"></div>
          <div className="w-full border-t border-black mb-6"></div>

          {/* Judul Formulir */}
          <h2 className="text-center font-bold text-lg mb-8" style={{ fontFamily: '"Times New Roman", Times, serif', textDecoration: 'underline' }}>
            FORMULIR PENDAFTARAN {e.name?.toUpperCase() || "PESERTA"}
          </h2>

          {/* Konten Data */}
          <table className="w-full text-[15px] mb-8" style={{ fontFamily: '"Times New Roman", Times, serif', lineHeight: '2' }}>
            <tbody>
              <tr>
                <td className="w-1/3 font-bold align-top">Kode Pendaftaran</td>
                <td className="w-[20px] align-top">:</td>
                <td className="align-top font-mono font-bold bg-gray-100 px-2 rounded">{registration.registration_code}</td>
              </tr>
              <tr>
                <td className="w-1/3 font-bold align-top">Event</td>
                <td className="w-[20px] align-top">:</td>
                <td className="align-top font-bold">{e.name}</td>
              </tr>
              <tr>
                <td className="w-1/3 font-bold align-top pt-4">Nama Lengkap / Instansi</td>
                <td className="w-[20px] align-top pt-4">:</td>
                <td className="align-top pt-4">{p.full_name}</td>
              </tr>
              <tr>
                <td className="w-1/3 font-bold align-top">Asal Institusi</td>
                <td className="w-[20px] align-top">:</td>
                <td className="align-top">{p.institution}</td>
              </tr>
              <tr>
                <td className="w-1/3 font-bold align-top">Email</td>
                <td className="w-[20px] align-top">:</td>
                <td className="align-top">{p.email}</td>
              </tr>
              <tr>
                <td className="w-1/3 font-bold align-top">No. WhatsApp</td>
                <td className="w-[20px] align-top">:</td>
                <td className="align-top">{p.whatsapp}</td>
              </tr>
              {m.address && (
                <tr>
                  <td className="w-1/3 font-bold align-top">Alamat Lengkap</td>
                  <td className="w-[20px] align-top">:</td>
                  <td className="align-top">{m.address}</td>
                </tr>
              )}
              {m.instagram && (
                <tr>
                  <td className="w-1/3 font-bold align-top">Instagram</td>
                  <td className="w-[20px] align-top">:</td>
                  <td className="align-top">{m.instagram}</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Tanda Tangan */}
          <div className="flex justify-end mt-16" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
            <div className="text-center w-[250px]">
              <p className="mb-20">Padang, {new Date(registration.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p className="font-bold border-b border-black inline-block px-4 pb-1">{p.full_name}</p>
              <p className="mt-1">Pendaftar</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
