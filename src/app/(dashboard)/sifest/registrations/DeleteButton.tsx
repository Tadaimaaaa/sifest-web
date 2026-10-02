'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { deleteRegistrationAction } from './actions';
import { useRouter } from 'next/navigation';

export function DeleteButton({ id }: { id: string }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (confirm('Apakah Anda yakin ingin menghapus data ini? Data yang terhapus tidak dapat dikembalikan, termasuk data peserta dan transaksi terkait.')) {
      setIsDeleting(true);
      const result = await deleteRegistrationAction(id);
      
      if (result.success) {
        alert('Data berhasil dihapus');
        router.refresh();
      } else {
        alert(`Gagal menghapus data: ${result.error}`);
        setIsDeleting(false);
      }
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      title="Hapus Data"
      className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 p-2 rounded-lg inline-flex items-center gap-2 transition-colors disabled:opacity-50"
    >
      <Trash2 className="w-4 h-4" />
      {isDeleting ? 'Menghapus...' : 'Hapus'}
    </button>
  );
}
