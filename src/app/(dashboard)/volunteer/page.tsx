"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2, CheckCircle2, XCircle, Trash2, ExternalLink, Info, X, Download } from "lucide-react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import Cookies from "js-cookie";

import { SCRIPT_URL } from "@/lib/api";

interface Volunteer {
  id_volunteer: string;
  nama: string;
  no_bp: string;
  jurusan: string;
  alamat: string;
  no_hp: string;
  link_ig: string;
  event_1: string;
  event_2: string;
  motivasi: string;
  link_bukti: string;
  link_krs: string;
  link_sertifikat: string;
  waktu_daftar: string;
  status: string;
}

export default function VolunteerDashboard() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterEvent, setFilterEvent] = useState("");
  const [selectedVolunteer, setSelectedVolunteer] = useState<Volunteer | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const fetchVolunteers = async () => {
    setIsLoading(true);
    try {
      const token = Cookies.get("session_token");
      const res = await fetch(`${SCRIPT_URL}?action=getVolunteers&token=${token}&t=${Date.now()}`);
      const result = await res.json();
      if (result.success === true) {
        setVolunteers(result.data.reverse()); // Terbaru di atas
      }
    } catch (error) {
      console.error("Failed to fetch volunteers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVolunteers();
  }, []);

  const updateStatus = async (id_volunteer: string, status: string) => {
    if (!confirm(`Yakin ingin mengubah status menjadi ${status}?`)) return;
    
    try {
      const token = Cookies.get("session_token");
      const res = await fetch(SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "updateStatusVolunteer", id_volunteer, status, token })
      });
      const result = await res.json();
      if (result.success === true) {
        fetchVolunteers();
      } else {
        alert("Gagal: " + result.message);
      }
    } catch (e) {
      alert("Error jaringan.");
    }
  };

  const deleteVolunteer = async (id_volunteer: string) => {
    if (!confirm("Yakin ingin menghapus data ini secara permanen?")) return;
    
    try {
      const token = Cookies.get("session_token");
      const res = await fetch(SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "deleteVolunteer", id_volunteer, token })
      });
      const result = await res.json();
      if (result.success === true) {
        fetchVolunteers();
      } else {
        alert("Gagal: " + result.message);
      }
    } catch (e) {
      alert("Error jaringan.");
    }
  };

  const exportPDF = async () => {
    if (!selectedVolunteer || !printRef.current) return;
    
    setIsExporting(true);
    try {
      // Mengambil elemen printRef (format laporan resmi)
      const dataUrl = await toPng(printRef.current, { 
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        // Penting untuk memastikan elemen yang disembunyikan (-9999px) dirender dengan benar
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
      
      // Buat image object untuk mendapatkan dimensinya
      const img = new Image();
      img.src = dataUrl;
      
      await new Promise((resolve) => {
        img.onload = resolve;
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (img.height * pdfWidth) / img.width;
      
      // Jika tinggi modal melebihi halaman A4
      if (pdfHeight > pdf.internal.pageSize.getHeight()) {
        pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight);
      } else {
        // Center vertically if smaller
        const marginY = (pdf.internal.pageSize.getHeight() - pdfHeight) / 2;
        pdf.addImage(dataUrl, "PNG", 0, marginY, pdfWidth, pdfHeight);
      }
      
      // Output as blob url for preview
      const blob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } catch (error: any) {
      console.error("Gagal cetak PDF:", error);
      alert("Terjadi kesalahan saat mencetak PDF: " + (error.message || error.toString()));
    } finally {
      setIsExporting(false);
    }
  };

  const filtered = volunteers.filter(v => {
    const matchSearch = v.nama.toLowerCase().includes(search.toLowerCase()) || v.no_bp.includes(search);
    const matchEvent = filterEvent ? (v.event_1 === filterEvent || v.event_2 === filterEvent) : true;
    return matchSearch && matchEvent;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Diterima": return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 font-bold text-xs rounded-full">Diterima</span>;
      case "Ditolak": return <span className="px-2.5 py-1 bg-rose-100 text-rose-700 font-bold text-xs rounded-full">Ditolak</span>;
      default: return <span className="px-2.5 py-1 bg-amber-100 text-amber-700 font-bold text-xs rounded-full">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Data Volunteer</h1>
          <p className="text-sm text-slate-500">Kelola pendaftar volunteer SI FEST 2026</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Cari nama atau No BP..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select 
          value={filterEvent} 
          onChange={(e) => setFilterEvent(e.target.value)}
          className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Semua Event</option>
          <option value="Seminar">Seminar</option>
          <option value="Turnamen Futsal (SLTA & Mahasiswa)">Turnamen Futsal</option>
          <option value="Turnamen E-Sport (MLBB & E-Football)">E-Sport</option>
          <option value="Lomba Keagamaan / MTQ">Lomba Keagamaan / MTQ</option>
          <option value="Open Bazaar">Open Bazaar</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-semibold">
              <tr>
                <th className="px-6 py-4">Nama</th>
                <th className="px-6 py-4">No. BP</th>
                <th className="px-6 py-4">No. WhatsApp</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500 mb-3" />
                    <p className="text-slate-500">Memuat data volunteer...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    Tidak ada pendaftar yang cocok.
                  </td>
                </tr>
              ) : (
                filtered.map((v) => (
                  <tr key={v.id_volunteer} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800">
                      {v.nama}
                    </td>
                    <td className="px-6 py-4 text-slate-700 font-medium">
                      {v.no_bp}
                    </td>
                    <td className="px-6 py-4 text-slate-700 font-medium">
                      {v.no_hp}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(v.status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setSelectedVolunteer(v)} className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 font-medium text-xs flex items-center gap-1.5 hover:bg-blue-600 hover:text-white transition-all shadow-sm" title="Lihat Detail">
                          <Info className="w-4 h-4" /> Detail
                        </button>
                        {v.status !== 'Diterima' && (
                          <button onClick={() => updateStatus(v.id_volunteer, 'Diterima')} className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 font-medium text-xs flex items-center gap-1.5 hover:bg-emerald-600 hover:text-white transition-all shadow-sm" title="Terima">
                            <CheckCircle2 className="w-4 h-4" /> Terima
                          </button>
                        )}
                        {v.status !== 'Ditolak' && (
                          <button onClick={() => updateStatus(v.id_volunteer, 'Ditolak')} className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 font-medium text-xs flex items-center gap-1.5 hover:bg-rose-600 hover:text-white transition-all shadow-sm" title="Tolak">
                            <XCircle className="w-4 h-4" /> Tolak
                          </button>
                        )}
                        <button onClick={() => deleteVolunteer(v.id_volunteer)} className="p-1.5 rounded-lg bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all shadow-sm" title="Hapus">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detail */}
      {selectedVolunteer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div ref={modalRef} className="bg-white/95 backdrop-blur-xl border border-white rounded-3xl w-full max-w-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header Modal */}
            <div className="relative px-8 py-6 border-b border-slate-100 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/30">
                  {selectedVolunteer.nama.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">{selectedVolunteer.nama}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-semibold text-blue-600 bg-blue-100/50 px-2.5 py-0.5 rounded-full">{selectedVolunteer.no_bp}</span>
                    <span className="text-xs font-medium text-slate-500">{selectedVolunteer.jurusan}</span>
                  </div>
                </div>
              </div>
              <button data-html2canvas-ignore onClick={() => setSelectedVolunteer(null)} className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Body Modal */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Kontak Card */}
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm shadow-slate-200/50">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-5">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                      <ExternalLink className="w-4 h-4" />
                    </div>
                    Kontak & Sosial Media
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">WhatsApp</p>
                      <p className="text-sm font-medium text-slate-900">{selectedVolunteer.no_hp}</p>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Instagram</p>
                      <a href={selectedVolunteer.link_ig} target="_blank" rel="noreferrer" className="text-sm font-bold text-blue-600 hover:text-blue-700 hover:underline">
                        Buka Profil ↗
                      </a>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Alamat Lengkap</p>
                      <p className="text-sm text-slate-700 leading-relaxed">{selectedVolunteer.alamat}</p>
                    </div>
                  </div>
                </div>

                {/* Event & Berkas Card */}
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm shadow-slate-200/50">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-5">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
                      <Info className="w-4 h-4" />
                    </div>
                    Pilihan Event & Berkas
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pilihan 1</p>
                      <p className="text-sm font-bold text-slate-800">{selectedVolunteer.event_1}</p>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pilihan 2</p>
                      <p className="text-sm font-bold text-slate-800">{selectedVolunteer.event_2}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Berkas Pendukung</p>
                      <div className="flex flex-wrap gap-2">
                        <a href={selectedVolunteer.link_bukti} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                          Bukti IG <ExternalLink className="w-3 h-3" />
                        </a>
                        <a href={selectedVolunteer.link_krs} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 bg-purple-50 text-purple-700 rounded-full hover:bg-purple-600 hover:text-white transition-all shadow-sm">
                          KRS <ExternalLink className="w-3 h-3" />
                        </a>
                        {selectedVolunteer.link_sertifikat && selectedVolunteer.link_sertifikat.split(',').map((link, idx) => (
                          <a key={idx} href={link.trim()} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 bg-pink-50 text-pink-700 rounded-full hover:bg-pink-600 hover:text-white transition-all shadow-sm">
                            Sertif {idx + 1} <ExternalLink className="w-3 h-3" />
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Motivasi */}
              <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Motivasi Bergabung</h3>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap italic">
                  "{selectedVolunteer.motivasi}"
                </p>
              </div>
            </div>

            {/* Footer Modal */}
            <div data-html2canvas-ignore className="border-t border-slate-100 px-8 py-5 bg-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status:</span>
                {getStatusBadge(selectedVolunteer.status)}
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={exportPDF} 
                  disabled={isExporting}
                  className="px-5 py-2.5 bg-blue-50 text-blue-600 text-sm font-semibold rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Cetak PDF
                </button>
                <button onClick={() => setSelectedVolunteer(null)} className="px-6 py-2.5 bg-slate-800 text-white text-sm font-semibold rounded-xl hover:bg-slate-700 hover:shadow-lg hover:shadow-slate-800/20 transition-all transform hover:-translate-y-0.5">
                  Tutup Detail
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Report Template for PDF */}
      <div style={{ position: "absolute", left: "-9999px", top: "-9999px", pointerEvents: "none" }}>
        {/* Menggunakan persis dimensi A4 (210x297mm) dengan margin standar (2.54cm) */}
        <div ref={printRef} className="w-[210mm] min-h-[297mm] bg-white text-black px-[2.54cm] py-[2.54cm] flex flex-col" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
          
          {/* KOP SURAT */}
          <div className="flex items-center justify-between pb-2">
            {/* Logo Kiri: REMA */}
            <img src="/logo-rema.jpg" alt="Logo REMA" className="w-[100px] object-contain mix-blend-multiply" />
            
            {/* Teks Tengah */}
            <div className="text-center flex-1 px-4 text-black">
              <h1 className="text-[17px] font-bold leading-[1.2]">PANITIA PELAKSANA SISTEM INFORMASI FESTIVAL</h1>
              <h2 className="text-[17px] font-bold leading-[1.2]">HIMPUNAN MAHASISWA JURUSAN SISTEM INFORMASI</h2>
              <h3 className="text-[17px] font-bold leading-[1.2]">FAKULTAS ILMU KOMPUTER</h3>
              <h4 className="text-[15.5px] font-bold leading-[1.2]">REPUBLIK MAHASISWA UNIVERSITAS PUTRA INDONESIA "YPTK" PADANG</h4>
              <p className="text-[14px] leading-[1.3] mt-1">Sekretariat Jl. Raya Lubuk Begalung, Student Center Lt. 1 Padang Sumbar</p>
              <p className="text-[14px] leading-[1.3]">Email : <span className="text-blue-700 underline">sinformationfest@gmail.com</span> Instagram : @sifest.hmjsi</p>
            </div>
            
            {/* Logo Kanan: HMJSI & SIFEST */}
            <div className="flex items-center justify-end gap-1 w-[120px]">
              <img src="/logo-hmjsi.png" alt="Logo HMJSI" className="w-[75px] h-auto object-contain mix-blend-multiply" />
              <img src="/logo-sifest.png" alt="Logo SIFEST" className="w-[50px] h-auto object-contain mix-blend-multiply" />
            </div>
          </div>
          
          {/* Garis Kop Surat Ganda */}
          <div className="w-full border-b-[2px] border-black mb-[2px]"></div>
          <div className="w-full border-b-[4px] border-black mb-8"></div>
          
          {/* JUDUL */}
          <h4 className="text-center text-lg font-bold uppercase mb-8 underline decoration-2 underline-offset-4">
            Formulir Pendaftaran Volunteer
          </h4>
          
          {/* KONTEN */}
          {selectedVolunteer && (
            <div className="flex-1 text-base leading-relaxed">
              <table className="w-full mb-8 border-collapse">
                <tbody>
                  <tr>
                    <td className="py-2.5 w-1/3 font-semibold">Nama Lengkap</td>
                    <td className="py-2.5 w-4">:</td>
                    <td className="py-2.5">{selectedVolunteer.nama}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-semibold">NIM / No. BP</td>
                    <td className="py-2.5">:</td>
                    <td className="py-2.5">{selectedVolunteer.no_bp}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-semibold">Jurusan</td>
                    <td className="py-2.5">:</td>
                    <td className="py-2.5">{selectedVolunteer.jurusan}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-semibold">No. WhatsApp</td>
                    <td className="py-2.5">:</td>
                    <td className="py-2.5">{selectedVolunteer.no_hp}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-semibold">Instagram</td>
                    <td className="py-2.5">:</td>
                    <td className="py-2.5">{selectedVolunteer.link_ig}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-semibold align-top">Alamat Lengkap</td>
                    <td className="py-2.5 align-top">:</td>
                    <td className="py-2.5 text-justify">{selectedVolunteer.alamat}</td>
                  </tr>
                </tbody>
              </table>

              <h5 className="font-bold text-lg mb-3 border-b border-gray-300 pb-1">Pilihan Event</h5>
              <table className="w-full mb-8 border-collapse">
                <tbody>
                  <tr>
                    <td className="py-2.5 w-1/3 font-semibold">Pilihan Utama</td>
                    <td className="py-2.5 w-4">:</td>
                    <td className="py-2.5">{selectedVolunteer.event_1}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-semibold">Pilihan Kedua</td>
                    <td className="py-2.5">:</td>
                    <td className="py-2.5">{selectedVolunteer.event_2}</td>
                  </tr>
                </tbody>
              </table>

              <h5 className="font-bold text-lg mb-3 border-b border-gray-300 pb-1">Motivasi Bergabung</h5>
              <p className="text-justify italic mb-8 border border-gray-300 p-5 rounded-lg bg-gray-50/50 min-h-[100px]">
                "{selectedVolunteer.motivasi}"
              </p>
            </div>
          )}
          
          {/* TTD */}
          <div className="mt-auto pt-16 flex justify-end">
            <div className="text-center w-64">
              <p className="mb-24">Padang, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p className="font-bold border-b border-black inline-block px-4 pb-1">
                {selectedVolunteer?.nama || 'Pendaftar'}
              </p>
              <p className="mt-1">NIM: {selectedVolunteer?.no_bp}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
