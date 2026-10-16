"use client";

import { useState, useEffect } from "react";
import { Store, Edit2, Check, X, Loader2, MapPin, AlertCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { 
  BAZAAR_TENTS, 
  getTentBlockLabel, 
  BazaarTenantFromSheet, 
  cleanPhone, 
  cleanText, 
  isTextSimilar,
  findMatchingBazaarTenant 
} from "@/lib/bazaarTents";
import { updateBazaarTent } from "./actions";
import { SCRIPT_URL } from "@/lib/api";
import Cookies from "js-cookie";

interface BazaarTentUpdaterProps {
  currentTent?: string | null;
  detectedFromSheet?: string | null;
  allTenants?: BazaarTenantFromSheet[];
  participantId?: string;
  registrationId: string;
  brandName?: string;
  picName?: string;
  picWhatsapp?: string;
  category?: string;
  paymentStatus?: string;
  canEdit: boolean;
}

export default function BazaarTentUpdater({
  currentTent: initialTent,
  detectedFromSheet,
  allTenants: initialTenants = [],
  participantId,
  registrationId,
  brandName = "",
  picName = "",
  picWhatsapp = "",
  category = "Makanan",
  paymentStatus = "Belum Bayar",
  canEdit
}: BazaarTentUpdaterProps) {
  // Gunakan initialTent atau hasil deteksi dari event bazaar sheet
  const resolvedInitial = initialTent && initialTent !== "NONE" && initialTent !== "-" 
    ? initialTent 
    : (detectedFromSheet || null);

  const [tent, setTent] = useState<string | null>(resolvedInitial);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTent, setSelectedTent] = useState<string>(resolvedInitial || "");
  const [isSaving, setIsSaving] = useState(false);
  const [tenantsList, setTenantsList] = useState<BazaarTenantFromSheet[]>(initialTenants);
  const [matchedTent, setMatchedTent] = useState<string | null>(detectedFromSheet || null);

  // Jika allTenants belum tersedia atau mau refresh data terkini saat modal dibuka
  useEffect(() => {
    if (isModalOpen || tenantsList.length === 0) {
      fetch(`${SCRIPT_URL}?action=getBazaarTenants`)
        .then(res => res.json())
        .then(data => {
          if (data.success && Array.isArray(data.data)) {
            setTenantsList(data.data);
            const found = findMatchingBazaarTenant(data.data, {
              brandName,
              picName,
              whatsapp: picWhatsapp
            });
            if (found?.id_tenda) {
              setMatchedTent(found.id_tenda);
              if (!tent) {
                setTent(found.id_tenda);
                setSelectedTent(found.id_tenda);
              }
            }
          }
        })
        .catch(err => console.warn("Gagal fetch data bazaar tenants:", err));
    }
  }, [isModalOpen, brandName, picName, picWhatsapp, tent, tenantsList.length]);

  // Map tenant berdasarkan id_tenda
  const tenantMap: Record<string, BazaarTenantFromSheet> = {};
  tenantsList.forEach(t => {
    if (t.id_tenda) {
      tenantMap[t.id_tenda.trim().toUpperCase()] = t;
    }
  });

  const handleSaveTent = async () => {
    if (!participantId) {
      toast.error("Participant ID tidak ditemukan.");
      return;
    }

    setIsSaving(true);
    try {
      const tentToSave = selectedTent === "NONE" || !selectedTent ? "NONE" : selectedTent;

      // 1. Update di Supabase metadata peserta
      const result = await updateBazaarTent(participantId, tentToSave, registrationId);
      if (!result.success) {
        throw new Error(result.error);
      }

      // 2. Sinkronisasi ke Google Sheets (Bazaar Floor Plan)
      try {
        const token = Cookies.get("session_token");
        if (token) {
          if (tentToSave !== "NONE") {
            await fetch(`${SCRIPT_URL}?action=saveBazaarTenant`, {
              method: "POST",
              headers: { "Content-Type": "text/plain;charset=utf-8" },
              body: JSON.stringify({
                action: "saveBazaarTenant",
                token,
                id_tenda: tentToSave,
                nama_brand: brandName,
                pic: picName,
                kontak: picWhatsapp,
                kategori: category,
                status_bayar: paymentStatus === 'PAID' || paymentStatus === 'VERIFIED' ? 'Lunas' : 
                              paymentStatus === 'DOWN_PAYMENT' ? 'DP' : 'Belum Bayar'
              })
            });
          } else if (tent) {
            // Kosongkan tenda sebelumnya di sheet
            await fetch(`${SCRIPT_URL}?action=saveBazaarTenant`, {
              method: "POST",
              headers: { "Content-Type": "text/plain;charset=utf-8" },
              body: JSON.stringify({
                action: "saveBazaarTenant",
                token,
                id_tenda: tent,
                status_bayar: "Kosong"
              })
            });
          }
        }
      } catch (sheetErr) {
        console.warn("Gagal sinkronisasi Google Sheets:", sheetErr);
      }

      const newTentVal = tentToSave === "NONE" ? null : tentToSave;
      setTent(newTentVal);
      setIsModalOpen(false);
      toast.success(newTentVal ? `Lokasi tenda berhasil ditetapkan ke Stand ${newTentVal}!` : "Lokasi tenda berhasil dikosongkan.");
    } catch (err: any) {
      console.error(err);
      toast.error(`Gagal menyimpan lokasi tenda: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  const blockGroups = [
    { title: "Blok A (Atas / Depan - 8 Tenda)", prefix: "A" },
    { title: "Blok B (Bawah / Belakang - 8 Tenda)", prefix: "B" },
    { title: "Blok C (Samping Kiri - 2 Tenda)", prefix: "C" },
    { title: "Blok D (Tengah Atas - 6 Tenda)", prefix: "D" },
    { title: "Blok E (Tengah Bawah - 6 Tenda)", prefix: "E" },
  ];

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {tent ? (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-300 text-amber-900 rounded-xl shadow-xs">
            <Store className="w-4 h-4 text-amber-600 shrink-0" />
            <div className="text-sm font-bold tracking-tight">
              Stand {tent}
            </div>
          </div>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-500 rounded-xl text-xs font-semibold">
            <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
            Belum Ditentukan
          </span>
        )}

        {canEdit && (
          <button
            type="button"
            onClick={() => {
              setSelectedTent(tent || matchedTent || "");
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
            {tent ? "Ubah Tenda" : "Tetapkan Tenda"}
          </button>
        )}
      </div>

      {/* Modal Pemilihan Lokasi Tenda */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header Modal */}
            <div className="px-6 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Tetapkan Lokasi Tenda</h3>
                  <p className="text-xs text-slate-500">{brandName ? `Tenant: ${brandName}` : "Pilih stand bazaar peserta"}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content List Tenda */}
            <div className="p-6 overflow-y-auto space-y-5">
              <div className="p-3 bg-blue-50/70 border border-blue-200/60 rounded-xl flex items-start gap-2.5 text-xs text-blue-800">
                <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>Pilihlah salah satu nomor stand tenda yang tersedia sesuai tata letak denah bazaar SI FEST 2026.</span>
              </div>

              {/* Alert jika terdeteksi di data Event Bazaar */}
              {matchedTent && (
                <div className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-950 shadow-xs">
                  <div className="flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-slate-800">
                        Data Event Bazaar: <span className="text-amber-700 font-extrabold">Stand {matchedTent}</span>
                      </div>
                      <div className="text-slate-500 text-[11px] mt-0.5">
                        Tenant ini sudah tercatat di <strong>Stand {matchedTent}</strong> pada denah bazaar.
                      </div>
                    </div>
                  </div>
                  {selectedTent !== matchedTent && (
                    <button
                      type="button"
                      onClick={() => setSelectedTent(matchedTent)}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs shrink-0 shadow-sm transition-all"
                    >
                      Pilih Stand {matchedTent}
                    </button>
                  )}
                </div>
              )}

              {/* Opsi Kosongkan */}
              <label 
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedTent === "NONE" || selectedTent === "" 
                    ? "bg-slate-100 border-slate-400 text-slate-800 font-semibold shadow-xs" 
                    : "border-slate-200 hover:bg-slate-50 text-slate-600"
                }`}
              >
                <div className="flex items-center gap-2.5 text-sm">
                  <input
                    type="radio"
                    name="tent_choice"
                    value="NONE"
                    checked={selectedTent === "NONE" || selectedTent === ""}
                    onChange={() => setSelectedTent("NONE")}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span>Belum Ditentukan (Kosongkan Tenda)</span>
                </div>
              </label>

              {/* Group per Blok */}
              {blockGroups.map(group => {
                const groupTents = BAZAAR_TENTS.filter(t => t.id.startsWith(group.prefix));
                return (
                  <div key={group.prefix} className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
                      {group.title}
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {groupTents.map(t => {
                        const occupant = tenantMap[t.id];
                        const isThisTenant = occupant && (
                          cleanPhone(occupant.kontak) === cleanPhone(picWhatsapp) ||
                          isTextSimilar(occupant.nama_brand, brandName) ||
                          isTextSimilar(occupant.pic, picName)
                        );
                        const isSelected = selectedTent === t.id;

                        let styleClasses = "bg-white border-slate-200 text-slate-700 hover:border-amber-400 hover:bg-amber-50/50";
                        if (isSelected) {
                          styleClasses = "bg-amber-500 border-amber-600 text-white shadow-md shadow-amber-500/25 scale-[1.02]";
                        } else if (isThisTenant) {
                          styleClasses = "bg-amber-50 border-amber-400 text-amber-900 ring-2 ring-amber-300";
                        } else if (occupant) {
                          styleClasses = "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300";
                        }

                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setSelectedTent(t.id)}
                            className={`p-2.5 rounded-xl border text-sm font-bold flex flex-col items-center justify-center transition-all text-center min-h-[64px] ${styleClasses}`}
                          >
                            <span className="text-base font-extrabold">{t.id}</span>
                            <span className={`text-[10px] leading-tight truncate max-w-full font-medium mt-0.5 ${
                              isSelected 
                                ? 'text-amber-100 font-semibold' 
                                : isThisTenant
                                ? 'text-amber-800 font-bold'
                                : occupant 
                                ? 'text-slate-500' 
                                : 'text-emerald-600'
                            }`}>
                              {isThisTenant 
                                ? "Tenant Ini" 
                                : occupant 
                                ? occupant.nama_brand 
                                : "Tersedia"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer Modal */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveTent}
                className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-amber-500/20 flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Simpan Lokasi Tenda</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
