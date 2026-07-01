'use client';

import Link from 'next/link';
import { useMyListings, usePublishListing, useDeleteListing } from '../../../hooks/useListings';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Taslak', color: 'bg-gray-100 text-gray-600' },
  ACTIVE: { label: 'Yayında', color: 'bg-green-100 text-green-700' },
  CLOSED: { label: 'Kapalı', color: 'bg-yellow-100 text-yellow-700' },
};

export default function MyListingsPage() {
  const { data, isLoading } = useMyListings();
  const publish = usePublishListing();
  const remove = useDeleteListing();

  if (isLoading) {
    return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">İlanlarım</h1>
        <Link
          href="/dashboard/listings/new"
          className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
        >
          + Yeni İlan
        </Link>
      </div>

      {data?.items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-gray-400 mb-4">Henüz ilan oluşturmadınız.</p>
          <Link
            href="/dashboard/listings/new"
            className="inline-block bg-orange-500 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-orange-600"
          >
            İlk İlanınızı Oluşturun
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {data?.items.map((listing) => {
            const statusInfo = STATUS_LABELS[listing.status] ?? { label: listing.status, color: 'bg-gray-100 text-gray-600' };
            return (
              <div
                key={listing.id}
                className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="font-semibold text-gray-900 truncate">{listing.title}</h2>
                    <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {listing.city} / {listing.district} · {listing.areaM2.toLocaleString('tr-TR')} m²
                    · {listing._count.offers} teklif
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/listings/${listing.id}`}
                    className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-50"
                  >
                    Görüntüle
                  </Link>
                  <Link
                    href={`/dashboard/listings/${listing.id}/edit`}
                    className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-50"
                  >
                    Düzenle
                  </Link>
                  {listing.status === 'DRAFT' && (
                    <button
                      onClick={() => publish.mutate(listing.id)}
                      disabled={publish.isPending}
                      className="text-xs bg-green-500 text-white px-2 py-1 rounded-lg hover:bg-green-600 disabled:opacity-50"
                    >
                      Yayınla
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirm('İlanı silmek istediğinize emin misiniz?')) {
                        remove.mutate(listing.id);
                      }
                    }}
                    disabled={remove.isPending}
                    className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 disabled:opacity-50"
                  >
                    Sil
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
