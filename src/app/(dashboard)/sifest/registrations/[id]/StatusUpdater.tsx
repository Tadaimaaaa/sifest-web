"use client";

import { useState } from "react";
import { toast } from "sonner";
import clsx from "clsx";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";
import { updateRegistrationStatus, updatePaymentStatus } from "./actions";

interface StatusUpdaterProps {
  currentStatus: string;
  type: "registration" | "payment";
  id: string; // Registration ID or Transaction ID depending on type
  registrationId: string; // Always need Registration ID for revalidation
  canEdit: boolean;
}

export function StatusUpdater({ currentStatus, type, id, registrationId, canEdit }: StatusUpdaterProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [status, setStatus] = useState(currentStatus);
  const router = useRouter();

  const registrationStatuses = [
    { value: "PENDING", label: "Menunggu" },
    { value: "VERIFIED", label: "Terverifikasi" },
    { value: "REJECTED", label: "Ditolak" },
    { value: "CANCELLED", label: "Dibatalkan" }
  ];

  const paymentStatuses = [
    { value: "PENDING", label: "Menunggu" },
    { value: "WAITING_PAYMENT", label: "Menunggu Pembayaran" },
    { value: "PAID", label: "Lunas" },
    { value: "FAILED", label: "Gagal" },
    { value: "EXPIRED", label: "Kedaluwarsa" }
  ];

  const options = type === "registration" ? registrationStatuses : paymentStatuses;

  const styles: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
    WAITING_PAYMENT: 'bg-blue-100 text-blue-800 border-blue-200',
    PAID: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    VERIFIED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    REJECTED: 'bg-rose-100 text-rose-800 border-rose-200',
    CANCELLED: 'bg-slate-100 text-slate-800 border-slate-200',
    EXPIRED: 'bg-orange-100 text-orange-800 border-orange-200',
    FAILED: 'bg-red-100 text-red-800 border-red-200',
  };

  const getLabel = (val: string) => {
    return options.find(o => o.value === val)?.label || val;
  };

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    if (newStatus === status) return;

    const resultConfirm = await Swal.fire({
      title: 'Ubah Status?',
      text: `Apakah Anda yakin ingin mengubah status ${type === 'registration' ? 'pendaftaran' : 'pembayaran'} menjadi ${getLabel(newStatus)}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonText: 'Batal',
      confirmButtonText: 'Ya, Ubah'
    });

    if (!resultConfirm.isConfirmed) {
      e.target.value = status;
      return;
    }

    setIsUpdating(true);
    try {
      let result;
      if (type === "registration") {
        result = await updateRegistrationStatus(id, newStatus);
      } else {
        result = await updatePaymentStatus(id, newStatus, registrationId);
      }

      if (result.success) {
        setStatus(newStatus);
        toast.success(`Status ${type === 'registration' ? 'pendaftaran' : 'pembayaran'} berhasil diperbarui`);
        router.refresh();
      } else {
        toast.error(result.error || "Gagal memperbarui status");
        e.target.value = status;
      }
    } catch (err) {
      toast.error("Terjadi kesalahan sistem");
      e.target.value = status;
    } finally {
      setIsUpdating(false);
    }
  };

  if (!canEdit) {
    return (
      <span className={clsx("px-3 py-1 inline-flex text-sm font-semibold rounded-full border", styles[status] || 'bg-slate-100 text-slate-800 border-slate-200')}>
        {getLabel(status)}
      </span>
    );
  }

  return (
    <div className="relative inline-block">
      <select
        value={status}
        onChange={handleChange}
        disabled={isUpdating}
        className={clsx(
          "appearance-none px-4 py-1 pr-8 text-sm font-semibold rounded-full border cursor-pointer hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all disabled:opacity-50",
          styles[status] || 'bg-slate-100 text-slate-800 border-slate-200'
        )}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value} className="bg-white text-slate-900 font-medium">
            {opt.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5">
        <svg className={clsx("fill-current h-4 w-4", isUpdating ? "opacity-0" : "opacity-60")} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
        </svg>
        {isUpdating && (
          <div className="absolute right-2.5 w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
        )}
      </div>
    </div>
  );
}
