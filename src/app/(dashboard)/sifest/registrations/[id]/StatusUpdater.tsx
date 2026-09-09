"use client";

import { useState } from "react";
import { toast } from "sonner";
import clsx from "clsx";
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

  const registrationStatuses = ["PENDING", "VERIFIED", "REJECTED", "CANCELLED"];
  const paymentStatuses = ["PENDING", "WAITING_PAYMENT", "PAID", "FAILED", "EXPIRED"];

  const options = type === "registration" ? registrationStatuses : paymentStatuses;

  const styles: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    WAITING_PAYMENT: 'bg-blue-100 text-blue-800 border-blue-200',
    PAID: 'bg-green-100 text-green-800 border-green-200',
    VERIFIED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    REJECTED: 'bg-red-100 text-red-800 border-red-200',
    CANCELLED: 'bg-slate-100 text-slate-800 border-slate-200',
    EXPIRED: 'bg-orange-100 text-orange-800 border-orange-200',
    FAILED: 'bg-red-100 text-red-800 border-red-200',
  };

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    if (newStatus === status) return;

    if (!confirm(`Apakah Anda yakin ingin mengubah status ${type === 'registration' ? 'pendaftaran' : 'pembayaran'} menjadi ${newStatus}?`)) {
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
        {status}
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
          "appearance-none px-3 py-1 pr-8 text-sm font-semibold rounded-full border cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-400 transition-colors disabled:opacity-50",
          styles[status] || 'bg-slate-100 text-slate-800 border-slate-200'
        )}
      >
        {options.map(opt => (
          <option key={opt} value={opt} className="bg-white text-slate-900 font-medium">
            {opt}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
        <svg className={clsx("fill-current h-4 w-4", isUpdating ? "opacity-0" : "opacity-50")} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
        </svg>
        {isUpdating && (
          <div className="absolute right-2.5 w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
        )}
      </div>
    </div>
  );
}
