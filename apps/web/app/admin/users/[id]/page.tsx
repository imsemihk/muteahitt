'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdminUser, useUpdateUserStatus } from '@/hooks/useAdmin';

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Aktif' },
  { value: 'PENDING_VERIFICATION', label: 'Doğrulama Bekleniyor' },
  { value: 'REJECTED', label: 'Reddedildi' },
  { value: 'SUSPENDED', label: 'Askıya Al' },
  { value: 'BANNED', label: 'Yasakla' },
];

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: user, isLoading } = useAdminUser(id);
  const updateStatus = useUpdateUserStatus();

  const [newStatus, setNewStatus] = useState('');
  const [reason, setReason] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (isLoading) return <div className="animate-pulse h-8 w-48 bg-gray-100 rounded" />;
  if (!user) return <p className="text-red-600">Kullanıcı bulunamadı.</p>;

  async function handleStatusUpdate() {
    if (!newStatus) return;
    setError('');
    setSuccess('');
    try {
      await updateStatus.mutateAsync({ userId: id, status: newStatus, reason: reason || undefined, adminNote: adminNote || undefined });
      setSuccess('Durum güncellendi.');
      setNewStatus('');
      setReason('');
      setAdminNote('');
    } catch (e: any) {
      setError(e?.message ?? 'Bir hata oluştu.');
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700">← Geri</button>
        <h1 className="text-2xl font-bold text-gray-900">{user.fullName}</h1>
      </div>

      {/* Temel bilgiler */}
      <div className="bg-white border rounded-lg p-5 space-y-3 text-sm">
        <h2 className="font-semibold text-gray-700 mb-3">Kullanıcı Bilgileri</h2>
        <Row label="E-posta" value={user.email} />
        <Row label="Telefon" value={user.phone ?? '—'} />
        <Row label="Rol" value={user.role} />
        <Row label="Tip" value={user.userType} />
        <Row label="Durum" value={user.status} />
        <Row label="Kayıt" value={new Date(user.createdAt).toLocaleString('tr-TR')} />
        <Row label="E-posta Doğrulama" value={user.emailVerifiedAt ? new Date(user.emailVerifiedAt).toLocaleString('tr-TR') : 'Doğrulanmamış'} />
        {user.rejectionReason && <Row label="Red Sebebi" value={user.rejectionReason} />}
        {user.adminNote && <Row label="Admin Notu" value={user.adminNote} />}
        <Row label="İlanlar" value={String(user._count.listings)} />
        <Row label="Teklifler" value={String(user._count.offers)} />
        <Row label="Ödemeler" value={String(user._count.payments)} />
      </div>

      {/* Doğrulama */}
      {(user.individualVerification || user.companyVerification) && (
        <div className="bg-white border rounded-lg p-5 text-sm space-y-3">
          <h2 className="font-semibold text-gray-700 mb-3">Kimlik Doğrulama</h2>
          {user.individualVerification && (
            <div className="space-y-1">
              <p className="font-medium text-gray-700">Bireysel Doğrulama</p>
              <Row label="NVI Durumu" value={user.individualVerification.nviVerified ? 'Doğrulandı' : 'Bekliyor'} />
              <Row label="Başvuru Tarihi" value={new Date(user.individualVerification.createdAt).toLocaleString('tr-TR')} />
            </div>
          )}
          {user.companyVerification && (
            <div className="space-y-1">
              <p className="font-medium text-gray-700">Şirket Doğrulama</p>
              <Row label="Şirket Adı" value={user.companyVerification.companyTitle} />
              <Row label="Vergi No" value={user.companyVerification.taxNumber} />
            </div>
          )}
        </div>
      )}

      {/* Belgeler */}
      {user.verificationDocuments.length > 0 && (
        <div className="bg-white border rounded-lg p-5 text-sm">
          <h2 className="font-semibold text-gray-700 mb-3">Doğrulama Belgeleri</h2>
          <ul className="space-y-3">
            {user.verificationDocuments.map((doc) => (
              <li key={doc.id} className="border rounded-md p-3 bg-gray-50">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-medium text-gray-800">{doc.fileName}</span>
                    <span className="ml-2 text-xs text-gray-400">({doc.type})</span>
                    {doc.reviewedAt && (
                      <div className="text-xs text-gray-400 mt-0.5">
                        İncelendi: {new Date(doc.reviewedAt).toLocaleString('tr-TR')}
                      </div>
                    )}
                    {doc.reviewNote && (
                      <div className="text-xs text-gray-500 mt-0.5">Not: {doc.reviewNote}</div>
                    )}
                  </div>
                  <div className="flex gap-2 items-center shrink-0">
                    {doc.reviewedAt ? (
                      <span className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">İncelendi</span>
                    ) : (
                      <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Bekliyor</span>
                    )}
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-indigo-600 hover:underline font-medium"
                    >
                      Görüntüle →
                    </a>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Durum değiştir */}
      <div className="bg-white border rounded-lg p-5 space-y-4 text-sm">
        <div>
          <h2 className="font-semibold text-gray-700">Durum Değiştir</h2>
          <p className="text-xs text-gray-400 mt-0.5">Mevcut durum: <span className="font-medium text-gray-600">{user.status}</span></p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {STATUS_OPTIONS.filter((o) => o.value !== user.status).map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setNewStatus(newStatus === o.value ? '' : o.value)}
              className={`px-3 py-2 rounded-md border text-left text-sm font-medium transition-colors ${
                newStatus === o.value
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        {newStatus && (
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Sebep (kullanıcıya bildirim olarak gönderilir)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="text"
              placeholder="Admin notu (sadece admin panelinde görünür, gizli)"
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}
        {error && <p className="text-red-600 bg-red-50 px-3 py-2 rounded-md border border-red-200">{error}</p>}
        {success && <p className="text-green-600 bg-green-50 px-3 py-2 rounded-md border border-green-200">{success}</p>}
        <button
          onClick={handleStatusUpdate}
          disabled={!newStatus || updateStatus.isPending}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium disabled:opacity-40 hover:bg-indigo-700 transition-colors"
        >
          {updateStatus.isPending ? 'Güncelleniyor...' : `"${STATUS_OPTIONS.find(o => o.value === newStatus)?.label ?? '...'}" Olarak Güncelle`}
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-40 shrink-0 text-gray-500">{label}</span>
      <span className="text-gray-900">{value}</span>
    </div>
  );
}
