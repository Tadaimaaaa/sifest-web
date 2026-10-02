'use client';

import { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { deleteRegistrationAction } from './actions';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';

export function DeleteButton({ id }: { id: string }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => setMounted(true), []);

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteRegistrationAction(id);
    
    if (result.success) {
      setShowModal(false);
      router.refresh();
    } else {
      alert(`Gagal menghapus data: ${result.error}`);
      setIsDeleting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        title="Hapus Data"
        className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 p-2 rounded-lg inline-flex items-center gap-2 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
        Hapus
      </button>

      {mounted && showModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 whitespace-normal text-center">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4 mx-auto">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Hapus Pendaftar?</h3>
              <p className="text-slate-500 text-sm">
                Apakah Anda yakin ingin menghapus data pendaftaran ini? Data peserta dan transaksi yang terkait juga akan dihapus secara permanen dan tidak dapat dikembalikan.
              </p>
            </div>
            <div className="bg-slate-50 px-6 py-4 flex items-center justify-center gap-3 border-t border-slate-100">
              <button
                onClick={() => setShowModal(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                    Menghapus...
                  </>
                ) : (
                  'Ya, Hapus Data'
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
