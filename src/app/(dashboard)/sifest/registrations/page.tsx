import { getRegistrations, getEvents } from '@/lib/sifest/registrations';
import { RegistrationsFilters } from './Filters';
import { RegistrationsPagination } from './Pagination';
import Link from 'next/link';
import clsx from 'clsx';
import { Eye } from 'lucide-react';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    WAITING_PAYMENT: 'bg-blue-100 text-blue-800',
    PAID: 'bg-green-100 text-green-800',
    VERIFIED: 'bg-emerald-100 text-emerald-800',
    REJECTED: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-slate-100 text-slate-800',
    EXPIRED: 'bg-orange-100 text-orange-800',
    FAILED: 'bg-red-100 text-red-800',
  };
  
  return (
    <span className={clsx("px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full", styles[status] || 'bg-slate-100 text-slate-800')}>
      {status}
    </span>
  );
}

export default async function RegistrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const search = params.search || '';
  const event_id = params.event_id || '';
  const status = params.status || '';
  const payment_status = params.payment_status || '';

  const cookieStore = await cookies();
  const userDataCookie = cookieStore.get('user_data')?.value;
  let roleId = "ROLE-004";
  if (userDataCookie) {
    try {
      const user = JSON.parse(decodeURIComponent(userDataCookie));
      roleId = user.role_id || user.role || "ROLE-004";
    } catch(e) {}
  }

  if (roleId !== "ROLE-001" && roleId !== "SUPER_ADMIN") {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center h-[70vh]">
        <div className="w-24 h-24 mb-6 rounded-full bg-slate-100 flex items-center justify-center shadow-inner">
          <span className="text-4xl">🍕</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-3">Fitur Terkunci</h2>
        <p className="text-slate-600 max-w-md mb-6 leading-relaxed">
          Maaf, fitur ini sedang dalam tahap pengembangan khusus dan sementara <strong>hanya bisa diakses oleh Super Admin</strong>.
          <br /><br />
          <span className="text-sm italic text-slate-500">"Belikan admin martabak dulu hehe, sabar yaa masih di develop!"</span>
        </p>
        <Link href="/dashboard" className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">
          Kembali ke Dashboard
        </Link>
      </div>
    );
  }

  const [registrations, events] = await Promise.all([
    getRegistrations({
      page,
      limit: 20,
      search,
      event_id,
      status,
      payment_status
    }),
    getEvents()
  ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pendaftar SI FEST</h1>
          <p className="text-sm text-slate-500 mt-1">Kelola data pendaftaran SI FEST secara real-time dari Official Website.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <RegistrationsFilters events={events} />

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Kode
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Peserta
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Event
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Pembayaran
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {registrations.data.map((reg) => (
                <tr key={reg.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    {reg.registration_code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    <div className="font-medium text-slate-900">{reg.participants?.full_name}</div>
                    <div className="text-xs">{reg.participants?.institution_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {reg.events?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    <StatusBadge status={reg.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    <StatusBadge status={reg.transactions?.status || 'PENDING'} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      href={`/sifest/registrations/${reg.id}`}
                      className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 p-2 rounded-lg inline-flex items-center gap-2 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      Detail
                    </Link>
                  </td>
                </tr>
              ))}
              
              {registrations.data.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    Tidak ada data pendaftar yang ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <RegistrationsPagination totalPages={registrations.totalPages} currentPage={page} />
      </div>
    </div>
  );
}
