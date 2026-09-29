'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Event } from '@/lib/sifest/types';

export function RegistrationsFilters({ events }: { events: Event[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('search') || '');

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== 'ALL') {
        params.set(name, value);
      } else {
        params.delete(name);
      }
      // Reset page when filter changes
      if (name !== 'page') {
        params.set('page', '1');
      }
      return params.toString();
    },
    [searchParams]
  );

  const handleFilterChange = (name: string, value: string) => {
    router.push(pathname + '?' + createQueryString(name, value));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    handleFilterChange('search', search);
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 mb-6">
      <form onSubmit={handleSearch} className="flex-1">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Cari nama peserta atau kode pendaftaran..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </form>

      <div className="flex gap-2">
        <select
          className="block w-full pl-3 pr-10 py-2 text-white text-base border-slate-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg"
          onChange={(e) => handleFilterChange('event_id', e.target.value)}
          defaultValue={searchParams.get('event_id') || 'ALL'}
        >
          <option value="ALL" className="text-white">Semua Event</option>
          {events.map((e) => (
            <option key={e.id} value={e.id} className="text-white">
              {e.name}
            </option>
          ))}
        </select>

        <select
          className="block w-full pl-3 pr-10 py-2 text-white text-base border-slate-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg"
          onChange={(e) => handleFilterChange('status', e.target.value)}
          defaultValue={searchParams.get('status') || 'ALL'}
        >
          <option value="ALL" className="text-white">Semua Status</option>
          <option value="PENDING" className="text-white">Menunggu</option>
          <option value="WAITING_PAYMENT" className="text-white">Menunggu Pembayaran</option>
          <option value="PAID" className="text-white">Sudah Bayar</option>
          <option value="VERIFIED" className="text-white">Terverifikasi</option>
          <option value="REJECTED" className="text-white">Ditolak</option>
          <option value="INCOMPLETE" className="text-white">Lengkapi Berkas</option>
          <option value="CANCELLED" className="text-white">Dibatalkan</option>
        </select>

        <select
          className="block w-full pl-3 pr-10 py-2 text-white text-base border-slate-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg"
          onChange={(e) => handleFilterChange('payment_status', e.target.value)}
          defaultValue={searchParams.get('payment_status') || 'ALL'}
        >
          <option value="ALL" className="text-white">Semua Pembayaran</option>
          <option value="PENDING" className="text-white">Menunggu</option>
          <option value="PAID" className="text-white">Sudah Bayar</option>
          <option value="FAILED" className="text-white">Gagal</option>
          <option value="EXPIRED" className="text-white">Kedaluwarsa</option>
        </select>
      </div>
    </div>
  );
}
