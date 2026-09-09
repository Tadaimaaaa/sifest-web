"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Image as ImageIcon } from "lucide-react";
import { supabaseServer } from "@/lib/sifest/supabase"; // Note: supabaseServer shouldn't really be used in client, but sifest-web seems to have a client one? 
import Cookies from "js-cookie";
import { toast } from "sonner";
import FullPageLoader from "@/components/FullPageLoader";
import Swal from "sweetalert2";

type MediaPartner = {
  id: string;
  name: string;
  logo_url: string;
  created_at: string;
};

export default function MediaPartnerAdminPage() {
  const [currentUserRole, setCurrentUserRole] = useState("ROLE-001");
  const [partners, setPartners] = useState<MediaPartner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    logo_url: ""
  });

  const fetchPartners = async () => {
    setIsLoading(true);
    try {
      // Actually we need to hit an API route or use a Supabase client.
      // Let's create an API route for this, or just use fetch to our own API if it exists.
      // Since we don't have an API route yet, let's use standard fetch to a new Next.js route we'll create.
      const res = await fetch("/api/media-partners");
      const data = await res.json();
      if (data.success) {
        setPartners(data.data || []);
      } else {
        toast.error("Gagal mengambil data media partner");
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
        setCurrentUserRole(user.role || "ROLE-001");
      }
    } catch {}
    fetchPartners();
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error("Nama wajib diisi");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/media-partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success("Media Partner berhasil ditambahkan");
        setIsModalOpen(false);
        setFormData({ name: "", logo_url: "" });
        fetchPartners();
      } else {
        toast.error(data.message || "Gagal menyimpan");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan jaringan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const result = await Swal.fire({
      title: "Hapus Media Partner?",
      text: `Anda yakin ingin menghapus "${name}" dari website?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#ef4444",
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/media-partners?id=${id}`, {
          method: "DELETE",
        });
        const data = await res.json();
        
        if (data.success) {
          toast.success("Berhasil dihapus");
          fetchPartners();
        } else {
          toast.error(data.message || "Gagal menghapus");
        }
      } catch (error) {
        toast.error("Terjadi kesalahan jaringan");
      }
    }
  };

  if (isLoading) return <FullPageLoader />;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Media Partner (Website)</h1>
          <p className="text-sm text-slate-500 mt-1">Kelola logo Media Partner yang tampil di halaman depan website SI FEST.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Tambah Media Partner
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 rounded-tl-2xl">Logo</th>
                <th className="px-6 py-4">Nama Media Partner</th>
                <th className="px-6 py-4 text-right rounded-tr-2xl">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {partners.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-slate-300 mb-3" />
                      <p className="text-base font-medium text-slate-600">Belum ada data</p>
                      <p className="text-xs mt-1">Media Partner yang ditambahkan akan muncul di sini.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                partners.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      {p.logo_url ? (
                        <div className="w-24 h-12 bg-slate-100 rounded border border-slate-200 flex items-center justify-center overflow-hidden p-1">
                          <img src={p.logo_url} alt={p.name} className="max-w-full max-h-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-24 h-12 bg-slate-100 rounded border border-slate-200 flex items-center justify-center text-slate-400 text-xs">
                          No Logo
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">{p.name}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(p.id, p.name)}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors inline-flex"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-lg">Tambah Media Partner</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                &times;
              </button>
            </div>
            
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nama Media Partner</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none"
                  placeholder="Contoh: Info Kampus"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Link Logo (URL)</label>
                <input
                  type="url"
                  value={formData.logo_url}
                  onChange={e => setFormData({...formData, logo_url: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none"
                  placeholder="https://.../logo.png"
                />
                <p className="text-xs text-slate-500 mt-1">Masukkan link gambar logo transparan (.png). Anda bisa menggunakan link Google Drive yang sudah disesuaikan.</p>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Logo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
