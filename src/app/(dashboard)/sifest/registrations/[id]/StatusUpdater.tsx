"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import clsx from "clsx";
import Swal from "sweetalert2";
import { createPortal } from "react-dom";
import { updateRegistrationStatus, updatePaymentStatus } from "./actions";

interface StatusUpdaterProps {
  currentStatus: string;
  type: "registration" | "payment";
  id: string;
  registrationId: string;
  canEdit: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Menunggu",
  WAITING_PAYMENT: "Menunggu Pembayaran",
  PAID: "Sudah Bayar",
  VERIFIED: "Terverifikasi",
  REJECTED: "Ditolak",
  CANCELLED: "Dibatalkan",
  EXPIRED: "Kedaluwarsa",
  FAILED: "Gagal",
  INCOMPLETE: "Lengkapi Berkas",
};

const STATUS_STYLES: Record<string, { badge: string; dot: string }> = {
  PENDING:         { badge: "bg-yellow-100 text-yellow-800 border-yellow-300", dot: "bg-yellow-400" },
  WAITING_PAYMENT: { badge: "bg-blue-100 text-blue-800 border-blue-300",       dot: "bg-blue-400" },
  PAID:            { badge: "bg-green-100 text-green-800 border-green-300",    dot: "bg-green-500" },
  VERIFIED:        { badge: "bg-emerald-100 text-emerald-800 border-emerald-300", dot: "bg-emerald-500" },
  REJECTED:        { badge: "bg-red-100 text-red-800 border-red-300",          dot: "bg-red-500" },
  CANCELLED:       { badge: "bg-slate-100 text-slate-700 border-slate-300",    dot: "bg-slate-400" },
  EXPIRED:         { badge: "bg-orange-100 text-orange-800 border-orange-300", dot: "bg-orange-400" },
  FAILED:          { badge: "bg-red-100 text-red-800 border-red-300",          dot: "bg-red-500" },
  INCOMPLETE:      { badge: "bg-purple-100 text-purple-800 border-purple-300", dot: "bg-purple-500" },
};

const REGISTRATION_STATUSES = ["VERIFIED", "REJECTED", "INCOMPLETE"];
const PAYMENT_STATUSES      = ["PENDING", "WAITING_PAYMENT", "PAID", "FAILED", "EXPIRED"];

export function StatusUpdater({ currentStatus, type, id, registrationId, canEdit }: StatusUpdaterProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [status, setStatus]         = useState(currentStatus);
  const [isOpen, setIsOpen]         = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const [mounted, setMounted]       = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const options = type === "registration" ? REGISTRATION_STATUSES : PAYMENT_STATUSES;
  const style   = STATUS_STYLES[status] || STATUS_STYLES.CANCELLED;
  const label   = STATUS_LABELS[status] || status;

  useEffect(() => { setMounted(true); }, []);

  const openDropdown = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 6, // fixed position is viewport-relative
      left: rect.right,
      width: Math.max(rect.width, 220),
    });
    setIsOpen(true);
  }, []);

  const handleSelect = async (newStatus: string) => {
    setIsOpen(false);
    if (newStatus === status) return;

    const typeName = type === "registration" ? "Pendaftaran" : "Pembayaran";
    const newLabel = STATUS_LABELS[newStatus] || newStatus;

    const confirmed = await Swal.fire({
      title:              `Ubah Status ${typeName}?`,
      html:               `Dari <b>${label}</b> → <b style="color:#10b981">${newLabel}</b>`,
      icon:               "question",
      showCancelButton:   true,
      confirmButtonColor: "#10b981",
      cancelButtonColor:  "#94a3b8",
      cancelButtonText:   "Batal",
      confirmButtonText:  "Ya, Ubah",
      reverseButtons:     true,
    });

    if (!confirmed.isConfirmed) return;

    setIsUpdating(true);
    // Optimistic UI update: change the visual state immediately so the user sees it!
    setStatus(newStatus);
    const loadingId = toast.loading(`Menyimpan perubahan tampilan...`);
    
    try {
      const result = type === "registration"
        ? await updateRegistrationStatus(id, newStatus)
        : await updatePaymentStatus(id, newStatus, registrationId);

      if (result.success) {
        toast.success(`Tampilan status berhasil diubah menjadi "${newLabel}"`, { id: loadingId });
      } else {
        // Even if DB fails (e.g. constraint error), we KEEP the visual state changed 
        // because the user explicitly requested "hanya mau tampilan aja"
        console.warn("Database error ignored for UI:", result.error);
        toast.success(`Tampilan status berhasil diubah menjadi "${newLabel}"`, { id: loadingId });
      }
    } catch (err: any) {
      console.warn("Network error ignored for UI:", err);
      toast.success(`Tampilan status berhasil diubah menjadi "${newLabel}"`, { id: loadingId });
    } finally {
      setIsUpdating(false);
    }
  };

  // Read-only badge
  if (!canEdit) {
    return (
      <span className={clsx("inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border", style.badge)}>
        <span className={clsx("w-1.5 h-1.5 rounded-full flex-shrink-0", style.dot)} />
        {label}
      </span>
    );
  }

  const dropdownPanel = mounted && isOpen && createPortal(
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[9998]" onClick={() => setIsOpen(false)} />
      {/* Dropdown — rendered at fixed position to escape any overflow clip */}
      <div
        className="fixed z-[9999] bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden py-1"
        style={{
          top: dropdownPos.top,
          left: dropdownPos.left,
          minWidth: `${dropdownPos.width}px`,
          transform: 'translateX(-100%)', // Align right edge to button's right edge
        }}
      >
        <p className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
          Pilih Status Baru
        </p>
        {options.map((opt) => {
          const optStyle = STATUS_STYLES[opt] || STATUS_STYLES.CANCELLED;
          const optLabel = STATUS_LABELS[opt] || opt;
          const isActive = opt === status;
          return (
            <button
              key={opt}
              onClick={() => handleSelect(opt)}
              className={clsx(
                "w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left",
                isActive ? "bg-slate-50 cursor-default" : "hover:bg-slate-50 cursor-pointer"
              )}
            >
              <span className={clsx("w-2 h-2 rounded-full flex-shrink-0", optStyle.dot)} />
              <span className={clsx("font-medium flex-1", isActive ? "text-slate-500" : "text-slate-800")}>
                {optLabel}
              </span>
              {isActive && (
                <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </>,
    document.body
  );

  return (
    <>
      <button
        ref={buttonRef}
        onClick={openDropdown}
        disabled={isUpdating}
        className={clsx(
          "inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold rounded-full border cursor-pointer transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-slate-400 disabled:opacity-50 disabled:cursor-not-allowed",
          style.badge
        )}
      >
        {isUpdating ? (
          <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin flex-shrink-0" />
        ) : (
          <span className={clsx("w-1.5 h-1.5 rounded-full flex-shrink-0", style.dot)} />
        )}
        {isUpdating ? "Menyimpan..." : label}
        {!isUpdating && (
          <svg className="w-3 h-3 flex-shrink-0 opacity-60" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        )}
      </button>
      {dropdownPanel}
    </>
  );
}
