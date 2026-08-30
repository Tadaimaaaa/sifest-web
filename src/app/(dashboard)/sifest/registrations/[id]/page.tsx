import { getRegistrationById } from '@/lib/sifest/registrations';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, User, Calendar, CreditCard, Clock } from 'lucide-react';
import clsx from 'clsx';

function StatusBadge({ status }: { status: string }) {
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
  
  return (
    <span className={clsx("px-3 py-1 inline-flex text-sm font-semibold rounded-full border", styles[status] || 'bg-slate-100 text-slate-800 border-slate-200')}>
      {status}
    </span>
  );
}

function SectionCard({ title, icon: Icon, children }: { title: string, icon: any, children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex items-center gap-2">
        <Icon className="w-5 h-5 text-slate-500" />
        <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
      </div>
      <div className="p-6 space-y-4">
        {children}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string, value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-slate-100 last:border-0 last:pb-0">
      <span className="text-sm font-medium text-slate-500">{label}</span>
      <span className="text-sm text-slate-900 font-medium sm:text-right mt-1 sm:mt-0">{value || '-'}</span>
    </div>
  );
}

export default async function RegistrationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const registration = await getRegistrationById(id);

  if (!registration) {
    notFound();
  }

  const { participants, events, transactions } = registration;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/sifest/registrations"
          className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Detail Pendaftar</h1>
          <p className="text-sm text-slate-500 mt-1">ID: {registration.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <SectionCard title="Data Registrasi" icon={Calendar}>
            <InfoRow label="Kode Pendaftaran" value={<span className="font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded">{registration.registration_code}</span>} />
            <InfoRow label="Event" value={events?.name} />
            <InfoRow label="Status Pendaftaran" value={<StatusBadge status={registration.status} />} />
            <InfoRow label="Waktu Daftar" value={new Date(registration.created_at).toLocaleString('id-ID')} />
          </SectionCard>

          <SectionCard title="Data Peserta" icon={User}>
            <InfoRow label="Nama Lengkap" value={participants?.full_name} />
            <InfoRow label="Email" value={participants?.email} />
            <InfoRow label="No. HP / WhatsApp" value={participants?.phone_number} />
            <InfoRow label="Asal Institusi" value={participants?.institution_name} />
            <InfoRow label="NIM / NISN" value={participants?.student_id} />
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Informasi Pembayaran" icon={CreditCard}>
            <InfoRow label="Status Pembayaran" value={<StatusBadge status={transactions?.status || 'PENDING'} />} />
            {transactions && (
              <>
                <InfoRow label="Metode Pembayaran" value={transactions.payment_method} />
                <InfoRow label="Tipe Pembayaran" value={transactions.payment_type} />
                <InfoRow label="Nominal" value={new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(transactions.amount)} />
                <InfoRow label="Waktu Pembayaran" value={transactions.paid_at ? new Date(transactions.paid_at).toLocaleString('id-ID') : '-'} />
                <InfoRow label="Transaction ID" value={<span className="font-mono text-xs break-all">{transactions.id}</span>} />
              </>
            )}
            {!transactions && (
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 text-center">
                <p className="text-sm text-slate-500">Belum ada data transaksi pembayaran.</p>
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
