import { getRegistrationById } from '@/lib/sifest/registrations';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { ArrowLeft, User, Calendar, CreditCard, Clock, School, Users, FileText } from 'lucide-react';
import clsx from 'clsx';
import PrintButton from './PrintButton';

import { StatusUpdater } from './StatusUpdater';

// RBAC Helper Functions
function canEditPaymentStatus(roleId: string): boolean {
  return ['ROLE-001', 'ROLE-005', 'ROLE-006'].includes(roleId);
}

function canEditRegistrationStatus(roleId: string, eventSlug: string | undefined): boolean {
  if (['ROLE-001', 'ROLE-003'].includes(roleId)) return true;
  if (!eventSlug) return false;
  
  if (eventSlug.includes('futsal') && roleId === 'ROLE-012') return true;
  if ((eventSlug.includes('esport') || eventSlug === 'mlbb') && roleId === 'ROLE-013') return true;
  if ((eventSlug.includes('mtq') || eventSlug.includes('keagamaan')) && roleId === 'ROLE-010') return true;
  if (eventSlug.includes('seminar') && roleId === 'ROLE-011') return true;
  if (eventSlug.includes('bazaar') && roleId === 'ROLE-014') return true;
  
  return false;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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


  const registration = await getRegistrationById(resolvedParams.id);

  if (!registration) {
    notFound();
  }

  const { participants, events, transactions } = registration;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 1.5cm;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}} />
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
          <div className="print:hidden space-y-6">
            <SectionCard title="Data Registrasi" icon={Calendar}>
              <InfoRow label="Kode Pendaftaran" value={<span className="font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded">{registration.registration_code}</span>} />
              <InfoRow label="Event" value={events?.name} />
              <InfoRow label="Status Pendaftaran" value={
                <StatusUpdater 
                  currentStatus={registration.status} 
                  type="registration" 
                  id={registration.id} 
                  registrationId={registration.id}
                  canEdit={canEditRegistrationStatus(roleId, events?.slug)} 
                />
              } />
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
                <InfoRow label={events?.slug?.startsWith('open-bazaar') ? "Nama Penanggung Jawab" : "Nama Lengkap"} value={participants?.full_name} />
                <InfoRow label="Email" value={participants?.email} />
                <InfoRow label="No. HP / WhatsApp" value={participants?.whatsapp} />
                <InfoRow label={events?.slug?.startsWith('open-bazaar') ? "Nama Usaha/Brand" : "Asal Institusi"} value={participants?.institution} />
                {events?.slug?.startsWith('open-bazaar') && participants?.metadata && (
                  <div className="pt-2 mt-2 border-t border-slate-100">
                    <InfoRow label="Alamat" value={participants.metadata.address} />
                    <InfoRow label="Instagram" value={participants.metadata.instagram} />
                    <InfoRow label="Kategori Usaha" value={participants.metadata.category} />
                    <InfoRow label="Produk" value={participants.metadata.products} />
                  </div>
                )}
                {events?.slug === 'lomba-keagamaan' && participants?.metadata && (
                  <div className="pt-2 mt-2 border-t border-slate-100">
                    <InfoRow label="Kelas" value={participants.metadata.grade} />
                    <InfoRow label="Nama Pembimbing" value={participants.metadata.mentorName} />
                    <InfoRow label="WA Pembimbing" value={participants.metadata.mentorWhatsapp} />
                  </div>
                )}
                {participants?.metadata?.fotoKtpUrl && (
                  <InfoRow label="Foto KTP" value={<a href={participants.metadata.fotoKtpUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-50 text-green-700 hover:bg-green-100 font-medium text-xs border border-green-200 transition-colors"><FileText className="w-3.5 h-3.5" /> Data Valid (Lihat)</a>} />
                )}
                {participants?.metadata?.fotoKtmUrl && (
                  <InfoRow label="Foto KTM" value={<a href={participants.metadata.fotoKtmUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-50 text-green-700 hover:bg-green-100 font-medium text-xs border border-green-200 transition-colors"><FileText className="w-3.5 h-3.5" /> Data Valid (Lihat)</a>} />
                )}
                {participants?.metadata?.studentCardUrl && (
                  <InfoRow label="Surat Keterangan/Kartu Pelajar" value={<a href={participants.metadata.studentCardUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-50 text-green-700 hover:bg-green-100 font-medium text-xs border border-green-200 transition-colors"><FileText className="w-3.5 h-3.5" /> Data Valid (Lihat)</a>} />
                )}
              </SectionCard>
            )}
          </div>

          {participants?.metadata?.teamData && !events?.slug?.includes('futsal') && (
            <SectionCard title="Data Pelatih" icon={User}>
              <InfoRow label="Nama Pelatih" value={participants.metadata.teamData.coachName} />
              <InfoRow label="WA Pelatih" value={participants.metadata.teamData.coachWhatsapp} />
              <InfoRow label="Asisten Pelatih" value={participants.metadata.teamData.assistantCoachName || "-"} />
            </SectionCard>
          )}


        </div>

        <div className="space-y-6">
          <div className="print:hidden">
            <SectionCard title="Informasi Pembayaran" icon={CreditCard}>
              <InfoRow label="Status Pembayaran" value={
                <StatusUpdater 
                  currentStatus={transactions?.status || 'PENDING'} 
                  type="payment" 
                  id={transactions?.id || ''} 
                  registrationId={registration.id}
                  canEdit={transactions ? canEditPaymentStatus(roleId) : false} 
                />
              } />
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
                      <a href={registration.payment_proof_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-50 text-green-700 hover:bg-green-100 font-medium text-xs border border-green-200 transition-colors">
                        <FileText className="w-3.5 h-3.5" />
                        Bukti Valid (Lihat)
                      </a>
                    </div>
                  ) : (
                    <p className="text-sm text-amber-600 font-medium">Peserta belum mengunggah bukti pembayaran.</p>
                  )}
                </div>
              )}
            </SectionCard>
          </div>

          {participants?.metadata?.teamData && !events?.slug?.includes('futsal') && (
            <SectionCard title="Data Tim (E-Sport)" icon={Users}>
              <InfoRow label="Nama Tim" value={participants.metadata.teamData.teamName} />
              <InfoRow label="Kategori" value={participants.metadata.teamData.teamCategory} />
              <InfoRow label="Kapten" value={participants.metadata.teamData.captainName} />
              <InfoRow label="WA Kapten" value={participants.metadata.teamData.captainWhatsapp} />
            </SectionCard>
          )}

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
                    {participants?.metadata?.teamData && !events?.slug?.includes('futsal') ? (
                      <>
                        <th className="px-4 py-2">Nickname</th>
                        <th className="px-4 py-2">ID Game</th>
                      </>
                    ) : (
                      <>
                        <th className="px-4 py-2">NISN</th>
                        <th className="px-4 py-2">Posisi</th>
                        <th className="px-4 py-2">No. Punggung</th>
                      </>
                    )}
                    <th className="px-4 py-2">KTS</th>
                    <th className="px-4 py-2">Foto</th>
                    <th className="px-4 py-2">Akta</th>
                  </tr>
                </thead>
                <tbody>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {participants.metadata.players.map((p: any, idx: number) => (
                    <tr key={idx} className="bg-white border-b hover:bg-slate-50">
                      <td className="px-4 py-2">{idx + 1} {idx === 0 && "(Kapten)"}</td>
                      <td className="px-4 py-2 font-medium text-slate-900">{p.name}</td>
                      {participants?.metadata?.teamData && !events?.slug?.includes('futsal') ? (
                        <>
                          <td className="px-4 py-2">{p.nickname || "-"}</td>
                          <td className="px-4 py-2">{p.idGame || "-"}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-2">{p.nisn}</td>
                          <td className="px-4 py-2">{p.posisi || "-"}</td>
                          <td className="px-4 py-2">{p.jerseyNumber || "-"}</td>
                        </>
                      )}
                      <td className="px-4 py-2">
                        {p.studentCardUrl ? (
                          <a href={p.studentCardUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-green-50 text-green-700 hover:bg-green-100 font-medium text-[11px] border border-green-200 transition-colors">Data Valid (Lihat)</a>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {p.photoUrl ? (
                          <a href={p.photoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-green-50 text-green-700 hover:bg-green-100 font-medium text-[11px] border border-green-200 transition-colors">Data Valid (Lihat)</a>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {p.birthCertificateUrl ? (
                          <a href={p.birthCertificateUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-green-50 text-green-700 hover:bg-green-100 font-medium text-[11px] border border-green-200 transition-colors">Data Valid (Lihat)</a>
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
