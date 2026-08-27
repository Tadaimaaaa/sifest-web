"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Trash2, Edit2, CalendarClock, Link, FileImage, Image as ImageIcon, Video, FolderArchive, Send, Clock, CheckCircle } from "lucide-react";
import { SCRIPT_URL } from "@/lib/api";
import Cookies from "js-cookie";
import { toast } from "sonner";
import Swal from "sweetalert2";
import FullPageLoader from "@/components/FullPageLoader";

type Planner = {
  id: string;
  judul: string;
  platform: string;
  jadwal: string;
  status: string;
  caption: string;
  link_asset: string;
  pic: string;
};

type Asset = {
  id: string;
  nama_asset: string;
  kategori: string;
  link_drive: string;
  keterangan: string;
  added_by: string;
};

type RequestDesain = {
  id: string;
  pemohon: string;
  divisi: string;
  deskripsi: string;
  kebutuhan: string;
  deadline: string;
  status: string;
  link_hasil: string;
};

export default function PubdokPage() {
  const [activeTab, setActiveTab] = useState<"planner" | "asset" | "request">("planner");
  
  const [planners, setPlanners] = useState<Planner[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [requests, setRequests] = useState<RequestDesain[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [isPlannerModalOpen, setIsPlannerModalOpen] = useState(false);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [currentUserRole, setCurrentUserRole] = useState("ROLE-004");
  const hasAccess = ["ROLE-001", "ROLE-007"].includes(currentUserRole); // Superadmin & Pubdok

  // Forms
  const [plannerForm, setPlannerForm] = useState({ judul: "", platform: "Instagram", jadwal: "", status: "Draft", caption: "", link_asset: "", pic: "" });
  const [assetForm, setAssetForm] = useState({ nama_asset: "", kategori: "Foto", link_drive: "", keterangan: "" });
  const [requestForm, setRequestForm] = useState({ event: "", deskripsi: "", kebutuhan: "Poster", deadline: "" });

  const fetchData = async () => {
    try {
      const res = await fetch(`${SCRIPT_URL}?action=getPubdok&t=${new Date().getTime()}`);
      const data = await res.json();
      if (data.success) {
        setPlanners(data.data.planner || []);
        setAssets(data.data.assets || []);
        setRequests(data.data.requests || []);
      }
    } catch (error) {
      toast.error("Gagal mengambil data Pubdok");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    try {
      const ud = Cookies.get("user_data");
      if (ud) {
        const user = JSON.parse(ud);
        if (user.role) setCurrentUserRole(user.role);
        else if (user.role_id) setCurrentUserRole(user.role_id);
      }
    } catch (e) {}
    fetchData();
  }, []);

  // Handlers for Planner
  const handleSavePlanner = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const token = Cookies.get("session_token");
    const payload = { 
      action: editingId ? "editPubdokPlanner" : "addPubdokPlanner", 
      token, 
      ...(editingId && { id: editingId }), 
      ...plannerForm 
    };

    try {
      const actionParam = editingId ? "editPubdokPlanner" : "addPubdokPlanner";
      const res = await fetch(`${SCRIPT_URL}?action=${actionParam}`, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setIsPlannerModalOpen(false);
        setEditingId(null);
        setPlannerForm({ judul: "", platform: "Instagram", jadwal: "", status: "Draft", caption: "", link_asset: "", pic: "" });
        setActiveTab("planner");
        fetchData();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("Kesalahan jaringan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePlanner = async (id: string) => {
    const result = await Swal.fire({
      title: 'Hapus Jadwal?',
      text: "Jadwal ini akan dihapus dari Planner",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonText: 'Batal',
      confirmButtonText: 'Hapus'
    });
    if (!result.isConfirmed) return;

    const previous = [...planners];
    setPlanners(planners.filter(p => p.id !== id));
    
    try {
      const token = Cookies.get("session_token");
      const res = await fetch(`${SCRIPT_URL}?action=deletePubdokPlanner`, {
        method: "POST",
        body: JSON.stringify({ action: "deletePubdokPlanner", token, id })
      });
      const data = await res.json();
      if (!data.success) {
        setPlanners(previous);
        toast.error(data.message);
      } else {
        toast.success("Dihapus");
      }
    } catch (error) {
      setPlanners(previous);
      toast.error("Error");
    }
  };

  // Handlers for Asset
  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const token = Cookies.get("session_token");
    
    try {
      const res = await fetch(`${SCRIPT_URL}?action=addPubdokAsset`, {
        method: "POST",
        body: JSON.stringify({ action: "addPubdokAsset", token, ...assetForm })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setIsAssetModalOpen(false);
        setAssetForm({ nama_asset: "", kategori: "Foto", link_drive: "", keterangan: "" });
        setActiveTab("asset");
        fetchData();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("Kesalahan jaringan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAsset = async (id: string) => {
    const result = await Swal.fire({ title: 'Hapus Asset?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444' });
    if (!result.isConfirmed) return;
    const previous = [...assets];
    setAssets(assets.filter(a => a.id !== id));
    try {
      const token = Cookies.get("session_token");
      const res = await fetch(`${SCRIPT_URL}?action=deletePubdokAsset`, { method: "POST", body: JSON.stringify({ action: "deletePubdokAsset", token, id }) });
      if (!(await res.json()).success) setAssets(previous);
    } catch { setAssets(previous); }
  };

  // Handlers for Request
  const handleSaveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const token = Cookies.get("session_token");
    try {
      const res = await fetch(`${SCRIPT_URL}?action=addPubdokRequest`, {
        method: "POST",
        body: JSON.stringify({ action: "addPubdokRequest", token, ...requestForm })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setIsRequestModalOpen(false);
        setRequestForm({ event: "", deskripsi: "", kebutuhan: "Poster", deadline: "" });
        fetchData();
      } else {
        toast.error(data.message);
      }
    } catch (error: any) {
      toast.error("Gagal mengirim request: " + error.message);
      console.error("fetch error:", error);
    } finally { setIsSubmitting(false); }
  };
  
  const handleUpdateReqStatus = async (id: string, currentStatus: string) => {
    const { value: formValues } = await Swal.fire({
      title: 'Update Status Request',
      html: `
        <select id="swal-input1" class="swal2-input">
          <option value="Menunggu" ${currentStatus === 'Menunggu' ? 'selected' : ''}>Menunggu</option>
          <option value="Dikerjakan" ${currentStatus === 'Dikerjakan' ? 'selected' : ''}>Dikerjakan</option>
          <option value="Selesai" ${currentStatus === 'Selesai' ? 'selected' : ''}>Selesai</option>
        </select>
        <input id="swal-input2" class="swal2-input" placeholder="Link Hasil (Opsional)">
      `,
      focusConfirm: false,
      showCancelButton: true,
      preConfirm: () => {
        return {
          status: (document.getElementById('swal-input1') as HTMLSelectElement).value,
          link_hasil: (document.getElementById('swal-input2') as HTMLInputElement).value
        }
      }
    });

    if (formValues) {
      setIsSubmitting(true);
      try {
        const token = Cookies.get("session_token");
        const res = await fetch(`${SCRIPT_URL}?action=editPubdokRequestStatus`, {
          method: "POST",
          body: JSON.stringify({ action: "editPubdokRequestStatus", token, id, ...formValues })
        });
        if ((await res.json()).success) {
          toast.success("Status diupdate");
          fetchData();
        }
      } catch (error: any) {
        toast.error("Gagal update status: " + error.message);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleAccRequest = async (id: string, event: string) => {
    const result = await Swal.fire({
      title: 'ACC Request Ini?',
      text: `Request "${event}" akan dimasukkan ke Planner Daftar Pekerjaan secara otomatis.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      confirmButtonText: 'Ya, ACC & Masukkan',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      setIsSubmitting(true);
      const token = Cookies.get("session_token");
      const toastId = toast.loading("Menerima request...");
      try {
        const res = await fetch(`${SCRIPT_URL}?action=accPubdokRequest`, {
          method: "POST",
          body: JSON.stringify({ action: "accPubdokRequest", token, id })
        });
        const data = await res.json();
        if (data.success) {
          toast.success(data.message, { id: toastId });
          fetchData();
        } else {
          toast.error(data.message, { id: toastId });
        }
      } catch (error: any) {
        toast.error("Gagal mengirim aksi: " + error.message, { id: toastId });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleDeleteRequest = async (id: string) => {
    const result = await Swal.fire({
      title: 'Hapus Request?',
      text: "Data yang dihapus tidak dapat dikembalikan!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      setIsSubmitting(true);
      const token = Cookies.get("session_token");
      const previous = [...requests];
      setRequests(requests.filter(r => r.id !== id));
      
      try {
        const res = await fetch(`${SCRIPT_URL}?action=deletePubdokRequest`, {
          method: "POST",
          body: JSON.stringify({ action: "deletePubdokRequest", token, id })
        });
        if ((await res.json()).success) {
          toast.success("Request dihapus");
        } else {
          setRequests(previous);
        }
      } catch {
        setRequests(previous);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  if (isLoading) return <FullPageLoader />;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      {isSubmitting && <FullPageLoader message="Memproses..." fullScreen={true} />}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pubdok</h1>
          <p className="text-sm text-slate-500 mt-1">Pusat kelola pekerjaan, jadwal konten, dan request desain Pubdok.</p>
        </div>
        <div className="flex flex-col gap-2 w-full sm:w-auto">
          {hasAccess && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
              <button onClick={() => setIsPlannerModalOpen(true)} className="px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-2 shadow-sm"><Plus className="w-4 h-4"/> Pekerjaan Baru</button>
              <button onClick={() => setIsRequestModalOpen(true)} className="px-4 py-3 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 flex items-center justify-center gap-2 shadow-sm"><Plus className="w-4 h-4"/> Request Desain</button>
            </div>
          )}
          {!hasAccess && (
            <button onClick={() => setIsRequestModalOpen(true)} className="px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 flex items-center justify-center gap-2 shadow-sm w-full sm:w-auto"><Plus className="w-4 h-4"/> Buat Request Desain</button>
          )}
        </div>
      </div>

      <div className="space-y-10 mt-6">
        {/* SECTION: PLANNER */}
        <div>
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2"><CalendarClock className="w-5 h-5 text-blue-600"/> Daftar Pekerjaan (Planner)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {planners.map(p => (
            <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <span className={`px-2 py-1 rounded text-xs font-semibold ${p.status === 'Draft' ? 'bg-slate-100 text-slate-600' : p.status === 'Ready' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>{p.status}</span>
                {hasAccess && (
                  <div className="flex gap-1">
                    <button onClick={() => { setEditingId(p.id); setPlannerForm(p as any); setIsPlannerModalOpen(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDeletePlanner(p.id)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  </div>
                )}
              </div>
              <h3 className="font-bold text-slate-800 mb-1">{p.judul}</h3>
              <p className="text-sm text-slate-500 mb-4 line-clamp-2">{p.caption}</p>
              
              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex items-center gap-2"><CalendarClock className="w-4 h-4 text-slate-400" /> {p.jadwal}</div>
                <div className="flex items-center gap-2"><Send className="w-4 h-4 text-slate-400" /> {p.platform}</div>
                {p.pic && p.pic !== "-" && (
                  <div className="flex items-center gap-2"><Link className="w-4 h-4 text-slate-400" /> <a href={p.pic} target="_blank" className="text-emerald-600 hover:underline truncate">Link Konten</a></div>
                )}
              </div>
            </div>
          ))}
          {planners.length === 0 && <div className="col-span-full py-10 text-center text-slate-400">Belum ada jadwal konten.</div>}
        </div>
        </div>



        {/* SECTION: REQUEST */}
        <div>
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2"><Send className="w-5 h-5 text-emerald-600"/> Request Desain</h2>
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-medium">Event / Acara</th>
                <th className="px-6 py-4 font-medium">Kebutuhan</th>
                <th className="px-6 py-4 font-medium">Deadline</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map(r => (
                <tr key={r.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-800">{r.event}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-800">{r.kebutuhan}</p>
                    <p className="text-xs text-slate-500 truncate max-w-[200px]" title={r.deskripsi}>{r.deskripsi}</p>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{r.deadline}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${r.status === 'Selesai' ? 'bg-emerald-100 text-emerald-700' : r.status === 'Dikerjakan' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{r.status}</span>
                  </td>
                  <td className="px-6 py-4">
                    {hasAccess ? (
                      <div className="flex gap-2">
                        <button onClick={() => handleUpdateReqStatus(r.id, r.status)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Update Status"><Edit2 className="w-4 h-4"/></button>
                        {r.status === 'Menunggu' && <button onClick={() => handleAccRequest(r.id, r.event)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="ACC & Masukkan ke Planner"><CheckCircle className="w-4 h-4"/></button>}
                        {r.link_hasil && r.link_hasil !== "-" && <a href={r.link_hasil} target="_blank" className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Lihat Hasil"><FileImage className="w-4 h-4"/></a>}
                        <button onClick={() => handleDeleteRequest(r.id)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg" title="Hapus Request"><Trash2 className="w-4 h-4"/></button>
                      </div>
                    ) : (
                      <div className="flex gap-2 items-center">
                        {r.link_hasil && r.link_hasil !== "-" ? (
                          <a href={r.link_hasil} target="_blank" className="text-indigo-600 hover:underline text-xs font-medium flex items-center gap-1"><Link className="w-3 h-3"/> Lihat Hasil</a>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Dikelola oleh Pubdok</span>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {requests.length === 0 && <div className="py-10 text-center text-slate-400">Belum ada request desain.</div>}
        </div>
        </div>
      </div>

      {/* MODALS */}
      {isPlannerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-5 text-slate-800">{editingId ? 'Edit Konten' : 'Konten Baru'}</h2>
            <form onSubmit={handleSavePlanner} className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1">Judul Konten</label>
                <input required type="text" value={plannerForm.judul} onChange={e => setPlannerForm({...plannerForm, judul: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-1">Platform</label>
                  <select value={plannerForm.platform} onChange={e => setPlannerForm({...plannerForm, platform: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                    <option>Instagram</option><option>Tiktok</option><option>Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-1">Status</label>
                  <select value={plannerForm.status} onChange={e => setPlannerForm({...plannerForm, status: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                    <option>Draft</option><option>Ready</option><option>Posted</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1">Jadwal (Deadline)</label>
                <input type="text" value={plannerForm.jadwal} onChange={e => setPlannerForm({...plannerForm, jadwal: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50" placeholder="Misal: 12 Ags 2026, 19:00" />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1">Link Konten (Opsional)</label>
                <input type="text" value={plannerForm.pic} onChange={e => setPlannerForm({...plannerForm, pic: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50" placeholder="Link Instagram/TikTok jika sudah rilis" />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setIsPlannerModalOpen(false)} className="px-4 py-2 text-slate-600 bg-slate-100 rounded-xl">Batal</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-xl">{isSubmitting ? 'Simpan...' : 'Simpan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAssetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-5 text-slate-800">Tambah Asset</h2>
            <form onSubmit={handleSaveAsset} className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1">Nama Asset</label>
                <input required type="text" value={assetForm.nama_asset} onChange={e => setAssetForm({...assetForm, nama_asset: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1">Kategori</label>
                <select value={assetForm.kategori} onChange={e => setAssetForm({...assetForm, kategori: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                  <option>Foto</option><option>Video</option><option>Logo</option><option>Template</option><option>Dokumen</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1">Link GDrive</label>
                <input required type="text" value={assetForm.link_drive} onChange={e => setAssetForm({...assetForm, link_drive: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setIsAssetModalOpen(false)} className="px-4 py-2 text-slate-600 bg-slate-100 rounded-xl">Batal</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-indigo-600 text-white rounded-xl">{isSubmitting ? 'Simpan...' : 'Simpan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-5 text-slate-800">Request Desain Baru</h2>
            <form onSubmit={handleSaveRequest} className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1">Nama Event / Acara</label>
                <input required type="text" value={requestForm.event} onChange={e => setRequestForm({...requestForm, event: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50" placeholder="Misal: SI FEST / Futsal" />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1">Jenis Kebutuhan</label>
                <select value={requestForm.kebutuhan} onChange={e => setRequestForm({...requestForm, kebutuhan: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                  <option>Poster</option><option>Sertifikat</option><option>Video Reel</option><option>Spanduk</option><option>Banner</option><option>Lainnya</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1">Deskripsi Detail</label>
                <textarea required rows={3} value={requestForm.deskripsi} onChange={e => setRequestForm({...requestForm, deskripsi: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50" placeholder="Jelaskan kebutuhan lengkap (ukuran, warna, tulisan)" />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1">Deadline Kapan?</label>
                <input required type="text" value={requestForm.deadline} onChange={e => setRequestForm({...requestForm, deadline: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50" placeholder="Misal: Besok jam 12 Siang" />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setIsRequestModalOpen(false)} className="px-4 py-2 text-slate-600 bg-slate-100 rounded-xl">Batal</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-emerald-600 text-white rounded-xl">{isSubmitting ? 'Kirim...' : 'Kirim Request'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
