"use client";

import { useState, useEffect } from "react";
import { Search, Plus, MoreVertical, ShieldAlert, UserCog, X, UserPlus, Eye, EyeOff, Loader2 } from "lucide-react";
import { SCRIPT_URL } from "@/lib/api";
import Cookies from "js-cookie";
import { toast } from "sonner";
import FullPageLoader from "@/components/FullPageLoader";

export default function UsersPage() {
  const [currentUserRole, setCurrentUserRole] = useState("PANITIA");
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // States for search and filter
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // States for Manage Access Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editRole, setEditRole] = useState("");
  const [editStatus, setEditStatus] = useState("");

  // States for Add Panitia Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    nim: "",
    username: "",
    password: "sifest2026",
    email: "",
    phone: "",
    division: "Acara Inti",
    position: "Anggota",
    role_id: "ROLE-004",
    status: "ACTIVE"
  });

  const isSuperAdmin = currentUserRole === "ROLE-001" || currentUserRole === "SUPER_ADMIN";

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const token = Cookies.get("session_token") || "";
      const response = await fetch(`${SCRIPT_URL}?action=getUsers&token=${token}`);
      if (!response.ok) throw new Error("Gagal terhubung ke API");
      
      const resData = await response.json();
      if (resData.success) {
        setUsers(resData.data || []);
      } else {
        toast.error(resData.message || "Gagal mengambil data panitia");
      }
    } catch (error: any) {
      toast.error("Terjadi kesalahan jaringan.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    try {
      const userDataStr = Cookies.get("user_data");
      if (userDataStr) {
        const user = JSON.parse(userDataStr);
        setCurrentUserRole(user.role || "ROLE-004");
      }
    } catch (e) {
      console.error("Gagal membaca cookie user", e);
    }
    fetchUsers();
  }, []);

  const openManageModal = (user: any) => {
    setSelectedUser(user);
    setEditRole(user.role_id);
    setEditStatus(user.status);
    setIsModalOpen(true);
  };

  const handleUpdateAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    setIsUpdating(true);
    try {
      const token = Cookies.get("session_token") || "";
      const payload = {
        target_user_id: selectedUser.user_id,
        role_id: editRole,
        status: editStatus,
        token: token
      };

      const response = await fetch(`${SCRIPT_URL}?action=updateUserAccess`, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });
      
      const resData = await response.json();
      if (resData.success) {
        toast.success("Hak akses berhasil diperbarui!");
        setIsModalOpen(false);
        // Perbarui state lokal secara instan tanpa re-fetch untuk kecepatan
        setUsers(users.map(u => {
          if (u.user_id === selectedUser.user_id) {
            return { ...u, role_id: editRole, status: editStatus };
          }
          return u;
        }));
      } else {
        toast.error(resData.message || "Gagal memperbarui akses");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan jaringan.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCreatePanitia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim()) {
      toast.error("Nama lengkap panitia wajib diisi!");
      return;
    }
    if (!addForm.username.trim()) {
      toast.error("Username wajib diisi!");
      return;
    }
    if (!addForm.password.trim()) {
      toast.error("Password wajib diisi!");
      return;
    }

    setIsCreating(true);
    const toastId = toast.loading("Menambahkan panitia baru...");
    try {
      const token = Cookies.get("session_token") || "";
      const payload = {
        action: "createUser",
        token: token,
        name: addForm.name.trim(),
        nim: addForm.nim.trim(),
        username: addForm.username.trim().toLowerCase(),
        password: addForm.password,
        email: addForm.email.trim(),
        phone: addForm.phone.trim(),
        division: addForm.division,
        position: addForm.position,
        role_id: addForm.role_id,
        status: addForm.status
      };

      const response = await fetch(`${SCRIPT_URL}?action=createUser`, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });

      const resData = await response.json();
      if (resData.success) {
        toast.success(resData.message || "Panitia baru berhasil ditambahkan!", { id: toastId });
        setIsAddModalOpen(false);
        setAddForm({
          name: "",
          nim: "",
          username: "",
          password: "sifest2026",
          email: "",
          phone: "",
          division: "Acara Inti",
          position: "Anggota",
          role_id: "ROLE-004",
          status: "ACTIVE"
        });
        if (resData.data) {
          setUsers(prev => [resData.data, ...prev]);
        } else {
          fetchUsers();
        }
      } else {
        toast.error(resData.message || "Gagal menambahkan panitia.", { id: toastId });
      }
    } catch (error: any) {
      toast.error(`Terjadi kesalahan jaringan: ${error.message || error}`, { id: toastId });
    } finally {
      setIsCreating(false);
    }
  };

  // Format Role Badge
  const getRoleBadge = (roleId: string) => {
    switch (roleId) {
      case 'ROLE-001':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Super Admin</span>;
      case 'ROLE-002':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">Steering Committee</span>;
      case 'ROLE-003':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">PJ / Kapel</span>;
      case 'ROLE-005':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-700">Sekretaris</span>;
      case 'ROLE-006':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Bendahara</span>;
      case 'ROLE-007':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Pubdok</span>;
      case 'ROLE-008':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">Humas</span>;
      case 'ROLE-009':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-700">Promosi</span>;
      case 'ROLE-010':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">MTQ</span>;
      case 'ROLE-011':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Seminar</span>;
      case 'ROLE-012':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Futsal</span>;
      case 'ROLE-013':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700">E-Sport</span>;
      case 'ROLE-014':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Bazaar</span>;
      case 'ROLE-015':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-fuchsia-100 text-fuchsia-700">Acara Inti</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">Panitia</span>;
    }
  };

  // Filter Data
  const filteredUsers = users.filter((user) => {
    const matchesSearch = 
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      user.nim?.toString().includes(searchQuery);
      
    const matchesRole = roleFilter ? user.role_id === roleFilter : true;
    const matchesStatus = statusFilter ? user.status === statusFilter : true;

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Data Panitia</h1>
          <p className="text-sm text-slate-500 mt-1">
            {isSuperAdmin ? "Kelola data pengguna dan hak akses aplikasi." : "Daftar panitia dan divisi SI FEST 2026."}
          </p>
        </div>
        {isSuperAdmin && (
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm w-fit cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Tambah Panitia
          </button>
        )}
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-slate-400" />
          </div>
          <input
            type="text"
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            placeholder="Cari nama atau NIM..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        {/* Filter Role & Status */}
        <div className="flex gap-2 overflow-x-auto">
          <select 
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-700"
          >
            <option value="">Semua Role</option>
            <option value="ROLE-001">Super Admin</option>
            <option value="ROLE-002">SC</option>
            <option value="ROLE-003">PJ/Kapel</option>
            <option value="ROLE-006">Bendahara</option>
            <option value="ROLE-004">Panitia Biasa</option>
            <option value="ROLE-005">Sekretaris</option>
            <option value="ROLE-007">Pubdok</option>
            <option value="ROLE-008">Humas</option>
            <option value="ROLE-009">Promosi</option>
            <option value="ROLE-010">MTQ</option>
            <option value="ROLE-011">Seminar</option>
            <option value="ROLE-012">Futsal</option>
            <option value="ROLE-013">E-Sport</option>
            <option value="ROLE-014">Bazaar</option>
            <option value="ROLE-015">Acara Inti</option>
          </select>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-700"
          >
            <option value="">Semua Status</option>
            <option value="ACTIVE">Aktif</option>
            <option value="INACTIVE">Nonaktif</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-semibold">Nama / NIM</th>
                <th className="px-6 py-4 font-semibold">Divisi / Posisi</th>
                <th className="px-6 py-4 font-semibold">Role</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                {isSuperAdmin && <th className="px-6 py-4 font-semibold text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="h-64 relative p-0">
                    <FullPageLoader message="Memuat Data Panitia..." fullScreen={false} />
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 5 : 4} className="px-6 py-12 text-center text-slate-500">
                    Tidak ada panitia yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.user_id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-800">{user.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{user.nim || "-"}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-700">{user.division || "-"}</p>
                      <p className="text-xs text-slate-500 mt-0.5 font-medium">{user.position || "-"}</p>
                    </td>
                    <td className="px-6 py-4">
                      {getRoleBadge(user.role_id)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 ${user.status === 'ACTIVE' ? 'text-green-600' : 'text-slate-400'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'ACTIVE' ? 'bg-green-600' : 'bg-slate-400'}`}></span>
                        {user.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    {isSuperAdmin && (
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => openManageModal(user)}
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors font-medium text-xs border border-transparent hover:border-blue-200"
                        >
                          Kelola Akses
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Kelola Akses */}
      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-blue-600" />
                Kelola Akses Panitia
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateAccess} className="p-6 space-y-5">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-2">
                <p className="text-sm text-slate-500">Nama</p>
                <p className="font-semibold text-slate-800">{selectedUser.name}</p>
                <p className="text-xs text-slate-500 mt-1">{selectedUser.division} - {selectedUser.position}</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Ubah Jabatan (Role)</label>
                <select 
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-800 font-medium"
                >
                  <option value="ROLE-001">Super Admin</option>
                  <option value="ROLE-002">Steering Committee (SC)</option>
                  <option value="ROLE-003">PJ / Kapel</option>
                  <option value="ROLE-006">Bendahara</option>
                  <option value="ROLE-004">Panitia Biasa</option>
                  <option value="ROLE-005">Sekretaris</option>
                  <option value="ROLE-007">Pubdok</option>
                  <option value="ROLE-008">Humas</option>
                  <option value="ROLE-009">Promosi</option>
                  <option value="ROLE-010">Panitia MTQ</option>
                  <option value="ROLE-011">Panitia Seminar</option>
                  <option value="ROLE-012">Panitia Futsal</option>
                  <option value="ROLE-013">Panitia E-Sport</option>
                  <option value="ROLE-014">Panitia Bazaar</option>
                  <option value="ROLE-015">Acara Inti</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Status Akun</label>
                <select 
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-medium
                    ${editStatus === 'ACTIVE' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
                >
                  <option value="ACTIVE">Aktif (Bisa Login)</option>
                  <option value="INACTIVE">Nonaktif (Diblokir)</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Pilih nonaktif jika panitia ini mengundurkan diri atau sudah tidak berhak mengakses sistem.
                </p>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isUpdating ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Tambah Panitia */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <h2 className="font-bold text-slate-800 flex items-center gap-2 text-base">
                <UserPlus className="w-5 h-5 text-blue-600" />
                Tambah Panitia Baru
              </h2>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreatePanitia} className="p-6 overflow-y-auto space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nama Lengkap */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">Nama Lengkap <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Muhammad Farhan"
                    value={addForm.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      const autoSlug = val.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 12);
                      setAddForm(prev => ({
                        ...prev,
                        name: val,
                        username: prev.username === "" || prev.username === autoSlug.substring(0, prev.username.length) ? autoSlug : prev.username,
                        email: prev.email === "" || prev.email.includes("@sifest.com") ? (autoSlug ? `${autoSlug}@sifest.com` : "") : prev.email
                      }));
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-800"
                  />
                </div>

                {/* NIM */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">NIM (Nomor BP)</label>
                  <input
                    type="text"
                    placeholder="Contoh: 23101152610123"
                    value={addForm.nim}
                    onChange={(e) => setAddForm({...addForm, nim: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-800"
                  />
                </div>

                {/* Username */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">Username Login <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="farhan123"
                    value={addForm.username}
                    onChange={(e) => setAddForm({...addForm, username: e.target.value.toLowerCase().replace(/\s+/g, '')})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-800 font-mono"
                  />
                </div>

                {/* Password */}
                <div className="sm:col-span-2 space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-600 uppercase">Password Akun <span className="text-red-500">*</span></label>
                    <button
                      type="button"
                      onClick={() => setAddForm({...addForm, password: "sifest2026"})}
                      className="text-[11px] text-blue-600 hover:underline font-medium"
                    >
                      Reset Default (sifest2026)
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Masukkan password..."
                      value={addForm.password}
                      onChange={(e) => setAddForm({...addForm, password: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Divisi */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">Divisi Kepanitiaan</label>
                  <select
                    value={addForm.division}
                    onChange={(e) => setAddForm({...addForm, division: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-800 font-medium"
                  >
                    <option value="Steering Committee">Steering Committee</option>
                    <option value="Badan Pengurus Harian (BPH)">Badan Pengurus Harian (BPH)</option>
                    <option value="Acara Inti">Acara Inti</option>
                    <option value="Event Seminar Nasional">Event Seminar Nasional</option>
                    <option value="Event Turnamen Futsal">Event Turnamen Futsal</option>
                    <option value="Event Esport Competition">Event Esport Competition</option>
                    <option value="Event Bazar Ekonomi Kreatif">Event Bazar Ekonomi Kreatif</option>
                    <option value="Event MTQ & Lomba Keagamaan">Event MTQ & Lomba Keagamaan</option>
                    <option value="Pubdok">Pubdok</option>
                    <option value="Humas">Humas</option>
                    <option value="Promosi">Promosi</option>
                    <option value="Perlengkapan">Perlengkapan</option>
                    <option value="Konsumsi">Konsumsi</option>
                    <option value="Kestari">Kestari</option>
                    <option value="Semua Divisi">Semua Divisi</option>
                  </select>
                </div>

                {/* Posisi */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">Posisi / Jabatan</label>
                  <input
                    type="text"
                    placeholder="Koordinator Acara / Anggota"
                    value={addForm.position}
                    onChange={(e) => setAddForm({...addForm, position: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-800"
                  />
                </div>

                {/* Role / Hak Akses */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">Role Hak Akses</label>
                  <select
                    value={addForm.role_id}
                    onChange={(e) => setAddForm({...addForm, role_id: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-800 font-medium"
                  >
                    <option value="ROLE-004">Panitia Biasa</option>
                    <option value="ROLE-001">Super Admin</option>
                    <option value="ROLE-002">Steering Committee (SC)</option>
                    <option value="ROLE-003">PJ / Kapel</option>
                    <option value="ROLE-005">Sekretaris</option>
                    <option value="ROLE-006">Bendahara</option>
                    <option value="ROLE-007">Pubdok</option>
                    <option value="ROLE-008">Humas</option>
                    <option value="ROLE-009">Promosi</option>
                    <option value="ROLE-010">Panitia MTQ</option>
                    <option value="ROLE-011">Panitia Seminar</option>
                    <option value="ROLE-012">Panitia Futsal</option>
                    <option value="ROLE-013">Panitia E-Sport</option>
                    <option value="ROLE-014">Panitia Bazaar</option>
                    <option value="ROLE-015">Acara Inti</option>
                  </select>
                </div>

                {/* Status Akun */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">Status Akun</label>
                  <select
                    value={addForm.status}
                    onChange={(e) => setAddForm({...addForm, status: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-800 font-medium"
                  >
                    <option value="ACTIVE">Aktif (Bisa Login)</option>
                    <option value="INACTIVE">Nonaktif (Diblokir)</option>
                  </select>
                </div>

                {/* Email & Phone */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">Email (Opsional)</label>
                  <input
                    type="email"
                    placeholder="panitia@sifest.com"
                    value={addForm.email}
                    onChange={(e) => setAddForm({...addForm, email: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">No. WhatsApp / HP</label>
                  <input
                    type="text"
                    placeholder="08xxxxxxxxxx"
                    value={addForm.phone}
                    onChange={(e) => setAddForm({...addForm, phone: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-800"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Simpan Panitia
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
