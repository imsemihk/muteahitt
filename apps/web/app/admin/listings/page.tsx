'use client';

import { useState } from 'react';
import { useAdminListings, useSetListingStatus } from '@/hooks/useAdmin';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Taslak',
  ACTIVE: 'Aktif',
  PASSIVE: 'Pasif',
  SOLD: 'Satıldı',
  SUSPENDED: 'Askıda',
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  ACTIVE: 'bg-green-100 text-green-700',
  PASSIVE: 'bg-yellow-100 text-yellow-700',
  SOLD: 'bg-blue-100 text-blue-700',
  SUSPENDED: 'bg-red-100 text-red-700',
};

export default function AdminListingsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useAdminListings({ page, limit: 20, status: statusFilter || undefined });
  const setStatus = useSetListingStatus();

  const [editing, setEditing] = useState<{ id: string; title: string } | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [reason, setReason] = useState('');
  const [feedback, setFeedback] = useState<string>('');

  async function handleStatusChange() {
    if (!editing || !newStatus) return;
    try {
      await setStatus.mutateAsync({ listingId: editing.id, status: newStatus, reason: reason || undefined });
      setFeedback('Durum güncellendi.');
      setEditing(null);
    } catch (e: any) {
      setFeedback(e?.message ?? 'Hata oluştu.');
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">İlanlar</h1>

      {feedback && <p className="text-sm text-green-600">{feedback}</p>}

      <div className="flex gap-3">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Tüm Durumlar (DELETED hariç)</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">İlan</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Sahibi</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Durum</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Teklif</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              : (data as any)?.items?.map((listing: any) => (
                  <tr key={listing.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{listing.title}</p>
                      <p className="text-xs text-gray-500">{listing.city} • {listing.dealType}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700">{listing.owner.fullName}</p>
                      <p className="text-xs text-gray-500">{listing.owner.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[listing.status] ?? ''}`}>
                        {STATUS_LABELS[listing.status] ?? listing.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{listing._count.offers}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => { setEditing({ id: listing.id, title: listing.title }); setNewStatus(''); setReason(''); setFeedback(''); }}
                        className="text-indigo-600 hover:underline text-xs font-medium"
                      >
                        Durum Değiştir
                      </button>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
        {!isLoading && (data as any)?.items?.length === 0 && (
          <p className="text-center text-gray-500 py-10">İlan bulunamadı.</p>
        )}
      </div>

      {(data as any)?.meta && (data as any).meta.pageCount > 1 && (
        <div className="flex justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 border rounded text-sm disabled:opacity-40">‹ Önceki</button>
          <span className="px-3 py-1.5 text-sm text-gray-600">{page} / {(data as any).meta.pageCount}</span>
          <button disabled={page >= (data as any).meta.pageCount} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 border rounded text-sm disabled:opacity-40">Sonraki ›</button>
        </div>
      )}

      {/* Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Durum Değiştir</h2>
            <p className="text-sm text-gray-600 line-clamp-1">{editing.title}</p>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Yeni durum seçin...</option>
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Sebep (isteğe bağlı)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setEditing(null)} className="px-4 py-2 border rounded-md text-sm text-gray-700 hover:bg-gray-50">İptal</button>
              <button
                onClick={handleStatusChange}
                disabled={!newStatus || setStatus.isPending}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium disabled:opacity-40 hover:bg-indigo-700"
              >
                {setStatus.isPending ? 'İşleniyor...' : 'Güncelle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
