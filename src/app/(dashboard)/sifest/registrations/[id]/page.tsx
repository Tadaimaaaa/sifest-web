import { getRegistrationById } from '@/lib/sifest/registrations';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { ArrowLeft, User, Calendar, CreditCard, Clock, School, Users, FileText } from 'lucide-react';
import clsx from 'clsx';
import PrintButton from './PrintButton';

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
  const resolvedParams = await params;
  
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

  const registration = await getRegistrationById(resolvedParams.id);

  if (!registration) {
    notFound();
  }

  const { participants, events, transactions } = registration;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
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
        <PrintButton />
      </div>

      <div className="hidden print:block mb-8 text-center border-b pb-4">
        <h1 className="text-2xl font-bold text-slate-900">Formulir Pendaftaran {events?.name}</h1>
        <p className="text-sm text-slate-500 mt-1">Kode Pendaftaran: {registration.registration_code}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <SectionCard title="Data Registrasi" icon={Calendar}>
            <InfoRow label="Kode Pendaftaran" value={<span className="font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded">{registration.registration_code}</span>} />
            <InfoRow label="Event" value={events?.name} />
            <InfoRow label="Status Pendaftaran" value={<StatusBadge status={registration.status} />} />
            <InfoRow label="Waktu Daftar" value={new Date(registration.created_at).toLocaleString('id-ID')} />
          </SectionCard>

          {events?.slug === 'turnamen-futsal-slta' ? (
            <>
              {participants?.metadata?.players?.[0] && (
                <SectionCard title="Data Kapten" icon={User}>
                  <InfoRow label="Nama Kapten" value={participants.metadata.players[0].name} />
                  <InfoRow label="NISN" value={participants.metadata.players[0].nisn} />
                  <InfoRow label="WhatsApp Kapten" value={participants.metadata.players[0].whatsapp} />
                  <InfoRow label="Posisi" value={participants.metadata.players[0].posisi || "-"} />
                  <InfoRow label="No. Punggung" value={participants.metadata.players[0].jerseyNumber || "-"} />
                </SectionCard>
              )}
            </>
          ) : (
            <SectionCard title="Data Peserta" icon={User}>
              <InfoRow label="Nama Lengkap" value={participants?.full_name} />
              <InfoRow label="Email" value={participants?.email} />
              <InfoRow label="No. HP / WhatsApp" value={participants?.whatsapp} />
              <InfoRow label="Asal Institusi" value={participants?.institution} />
            </SectionCard>
          )}

          {participants?.metadata?.teamData && (
            <SectionCard title="Data Pelatih" icon={User}>
              <InfoRow label="Nama Pelatih" value={participants.metadata.teamData.coachName} />
              <InfoRow label="WA Pelatih" value={participants.metadata.teamData.coachWhatsapp} />
              <InfoRow label="Asisten Pelatih" value={participants.metadata.teamData.assistantCoachName || "-"} />
            </SectionCard>
          )}


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
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 text-center space-y-4">
                <p className="text-sm text-slate-500">
                  Menggunakan sistem pembayaran manual.
                </p>
                {registration.payment_proof_url ? (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-slate-700">Bukti Pembayaran Diunggah:</p>
                    <a href={registration.payment_proof_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-blue-600 hover:underline text-sm font-medium">
                      <FileText className="w-4 h-4" />
                      Lihat Bukti Transfer
                    </a>
                  </div>
                ) : (
                  <p className="text-sm text-amber-600 font-medium">Peserta belum mengunggah bukti pembayaran.</p>
                )}
              </div>
            )}
          </SectionCard>

          {participants?.metadata?.schoolData && (
            <SectionCard title="Data Sekolah (Futsal)" icon={School}>
              <InfoRow label="Nama Sekolah" value={participants.metadata.schoolData.schoolName} />
              <InfoRow label="Jenjang" value={participants.metadata.schoolData.level} />
              <InfoRow label="Alamat" value={participants.metadata.schoolData.address} />
              <InfoRow label="Kota/Kab" value={participants.metadata.schoolData.city} />
              <InfoRow label="Penanggung Jawab / Pembina" value={participants.metadata.schoolData.coachName} />
              <InfoRow label="WA Penanggung Jawab" value={participants.metadata.schoolData.coachWhatsapp} />
            </SectionCard>
          )}
        </div>
      </div>

      {participants?.metadata?.players && (
        <div className="mt-6">
          <SectionCard title={`Daftar Pemain (${participants.metadata.players.length})`} icon={Users}>
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-sm text-left text-slate-500 whitespace-nowrap">
                <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                  <tr>
                    <th className="px-4 py-2">No</th>
                    <th className="px-4 py-2">Nama</th>
                    <th className="px-4 py-2">NISN</th>
                    <th className="px-4 py-2">Posisi</th>
                    <th className="px-4 py-2">No. Punggung</th>
                    <th className="px-4 py-2">KTS</th>
                    <th className="px-4 py-2">Foto</th>
                    <th className="px-4 py-2">Akta</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.metadata.players.map((p: any, idx: number) => (
                    <tr key={idx} className="bg-white border-b hover:bg-slate-50">
                      <td className="px-4 py-2">{idx + 1} {idx === 0 && "(Kapten)"}</td>
                      <td className="px-4 py-2 font-medium text-slate-900">{p.name}</td>
                      <td className="px-4 py-2">{p.nisn}</td>
                      <td className="px-4 py-2">{p.posisi || "-"}</td>
                      <td className="px-4 py-2">{p.jerseyNumber || "-"}</td>
                      <td className="px-4 py-2">
                        {p.studentCardUrl ? (
                          <a href={p.studentCardUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Lihat</a>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {p.photoUrl ? (
                          <a href={p.photoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Lihat</a>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {p.birthCertificateUrl ? (
                          <a href={p.birthCertificateUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Lihat</a>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
}
