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
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `Formulir_${registration.registration_code}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => URL.revokeObjectURL(blobUrl), 500);
      
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
        <div ref={printRef} className="w-[794px] h-[1123px] bg-white text-black px-10 py-12 font-serif relative" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
          
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
                <td className="align-top font-mono font-bold bg-gray-100 px-2 rounded">{registration.registration_code}</td>
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

          {/* Data Khusus Futsal & E-Sport (Tim & Pemain) */}
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

          {/* Status Verifikasi (Opsional untuk print) */}
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
