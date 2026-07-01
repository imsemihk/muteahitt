'use client';

import { useState } from 'react';
import { usePendingVerifications, useReviewVerification, AdminUser } from '@/hooks/useAdmin';

export default function AdminVerificationsPage() {
  const { data: users, isLoading } = usePendingVerifications();
  const review = useReviewVerification();

  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [action, setAction] = useState<'approve' | 'reject' | ''>('');
  const [reason, setReason] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  async function handleSubmit() {
    if (!selected || !action) return;
    if (action === 'reject' && !reason) return;
    setFeedback(null);
    try {
      await review.mutateAsync({ userId: selected.id, action, reason: reason || undefined });
      setFeedback({ type: 'success', msg: `${selected.fullName} — ${action === 'approve' ? 'onaylandı' : 'reddedildi'}.` });
      setSelected(null);
      setAction('');
      setReason('');
    } catch (e: any) {
      setFeedback({ type: 'error', msg: e?.message ?? 'Hata oluştu.' });
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Doğrulama Bekleyenler</h1>

      {feedback && (
        <div className={`rounded-md px-4 py-3 text-sm ${feedback.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {feedback.msg}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-white border rounded-lg animate-pulse" />
          ))}
        </div>
      ) : !users?.length ? (
        <div className="bg-white border rounded-lg p-10 text-center text-gray-500">
          Bekleyen doğrulama yok.
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <div key={user.id} className="bg-white border rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-900">{user.fullName}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {user.individualVerification ? 'Bireysel' : 'Şirket'} •{' '}
                    {user.verificationDocuments.length} belge •{' '}
                    {new Date(user.createdAt).toLocaleDateString('tr-TR')}
                  </p>
                  {user.verificationDocuments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {user.verificationDocuments.map((doc) => (
                        <a
                          key={doc.id}
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-indigo-600 hover:underline border border-indigo-200 px-2 py-0.5 rounded"
                        >
                          {doc.type.replace(/_/g, ' ')}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => { setSelected(user); setAction('approve'); setReason(''); }}
                    className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                  >
                    Onayla
                  </button>
                  <button
                    onClick={() => { setSelected(user); setAction('reject'); setReason(''); }}
                    className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
                  >
                    Reddet
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal onay */}
      {selected && action && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {action === 'approve' ? 'Doğrulamayı Onayla' : 'Doğrulamayı Reddet'}
            </h2>
            <p className="text-sm text-gray-600">
              <span className="font-medium">{selected.fullName}</span> kullanıcısının doğrulaması{' '}
              {action === 'approve' ? 'onaylanacak' : 'reddedilecek'}.
            </p>
            {action === 'reject' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Red sebebi <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Kullanıcıya gösterilecek red sebebi..."
                  className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setSelected(null); setAction(''); setReason(''); }}
                className="px-4 py-2 border rounded-md text-sm text-gray-700 hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                onClick={handleSubmit}
                disabled={review.isPending || (action === 'reject' && !reason)}
                className={`px-4 py-2 text-white rounded-md text-sm font-medium disabled:opacity-40 ${
                  action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {review.isPending ? 'İşleniyor...' : action === 'approve' ? 'Onayla' : 'Reddet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
