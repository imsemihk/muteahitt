'use client';

import { useState } from 'react';
import { useAdminPayments, useAdminPaymentStats } from '@/hooks/useAdmin';

function StatCard({ label, value, accent }: { label: string; value?: string | number; accent?: string }) {
  return (
    <div className="bg-white rounded-lg border p-5">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${accent ?? 'text-gray-900'}`}>{value !== undefined ? value : '—'}</p>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: 'bg-green-100 text-green-700',
  PENDING: 'bg-amber-100 text-amber-700',
  FAILED: 'bg-red-100 text-red-700',
  REFUNDED: 'bg-gray-100 text-gray-700',
};

export default function AdminPaymentsPage() {
  const [page, setPage] = useState(1);
  const { data: stats } = useAdminPaymentStats();
  const { data, isLoading } = useAdminPayments({ page, limit: 20 });

  const s = stats as any;
  const d = data as any;
  const items = d?.items ?? [];
  const meta = d?.meta;

  const fmtCurrency = (v: number) =>
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(v);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Ödemeler</h1>

      {/* Stat kartları */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Toplam İşlem" value={s?.total} />
        <StatCard label="Tamamlanan" value={s?.completed} accent="text-green-600" />
        <StatCard label="Bekleyen" value={s?.pending} accent="text-amber-600" />
        <StatCard label="Toplam Gelir" value={s?.totalRevenue != null ? fmtCurrency(Number(s.totalRevenue)) : undefined} accent="text-green-600" />
      </div>

      {/* Tablo */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Tarih</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Kullanıcı</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">İlan</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Tutar</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Durum</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((__, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              : items.map((p: any) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(p.createdAt).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{p.buyer?.fullName ?? '—'}</div>
                      <div className="text-xs text-gray-400">{p.buyer?.email}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {p.offer?.listing?.title ?? '—'}
                      {p.offer?.listing?.city && <span className="text-gray-400 ml-1 text-xs">({p.offer.listing.city})</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {fmtCurrency(Number(p.amount))}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>

        {/* Sayfalama */}
        {meta && meta.pageCount > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-gray-600">
            <span>{meta.total} işlem, sayfa {meta.page}/{meta.pageCount}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50"
              >
                ‹ Önceki
              </button>
              <button
                onClick={() => setPage((p) => Math.min(meta.pageCount, p + 1))}
                disabled={page === meta.pageCount}
                className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50"
              >
                Sonraki ›
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
