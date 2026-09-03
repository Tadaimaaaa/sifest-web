"use client";

import { useState, useEffect } from "react";
import { Search, Plus, MoreVertical, ShieldAlert, UserCog, X } from "lucide-react";
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
          <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm w-fit">
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
    </div>
  );
}
