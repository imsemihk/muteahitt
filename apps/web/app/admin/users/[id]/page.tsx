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
        <div className="bg-white border rounded-lg p-5 text-sm">
          <h2 className="font-semibold text-gray-700 mb-3">Kimlik Doğrulama</h2>
          {user.individualVerification && (
            <p className="text-gray-600">
              Bireysel — NVI: {user.individualVerification.nviVerified ? '✓ Doğrulandı' : 'Bekliyor'}
            </p>
          )}
          {user.companyVerification && (
            <p className="text-gray-600">
              {user.companyVerification.companyTitle} (VKN: {user.companyVerification.taxNumber})
            </p>
          )}
        </div>
      )}

      {/* Belgeler */}
      {user.verificationDocuments.length > 0 && (
        <div className="bg-white border rounded-lg p-5 text-sm">
          <h2 className="font-semibold text-gray-700 mb-3">Belgeler</h2>
          <ul className="space-y-2">
            {user.verificationDocuments.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between">
                <span className="text-gray-700">{doc.fileName} <span className="text-gray-400 text-xs">({doc.type})</span></span>
                <div className="flex gap-3 items-center">
                  {doc.reviewedAt ? (
                    <span className="text-xs text-green-600">İncelendi</span>
                  ) : (
                    <span className="text-xs text-amber-600">Bekliyor</span>
                  )}
                  <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline text-xs">
                    Görüntüle
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Durum değiştir */}
      <div className="bg-white border rounded-lg p-5 space-y-3 text-sm">
        <h2 className="font-semibold text-gray-700">Durum Değiştir</h2>
        <select
          value={newStatus}
          onChange={(e) => setNewStatus(e.target.value)}
          className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Yeni durum seçin...</option>
          {STATUS_OPTIONS.filter((o) => o.value !== user.status).map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Sebep (kullanıcıya gösterilir)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <input
          type="text"
          placeholder="Admin notu (gizli)"
          value={adminNote}
          onChange={(e) => setAdminNote(e.target.value)}
          className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {error && <p className="text-red-600">{error}</p>}
        {success && <p className="text-green-600">{success}</p>}
        <button
          onClick={handleStatusUpdate}
          disabled={!newStatus || updateStatus.isPending}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium disabled:opacity-40 hover:bg-indigo-700"
        >
          {updateStatus.isPending ? 'Güncelleniyor...' : 'Güncelle'}
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
