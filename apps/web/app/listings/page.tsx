'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useListings } from '../../hooks/useListings';
import type { ListListingsInput, ListingSummary } from '@muteahitt/shared';

const DEAL_TYPE_LABELS: Record<string, string> = {
  KAT_KARSILIGI: 'Kat Karşılığı',
  SATIS: 'Satış',
  KIRA_GELIRI: 'Kira Geliri',
  DIGER: 'Diğer',
};

const ZONING_TYPE_LABELS: Record<string, string> = {
  KONUT: 'Konut',
  TICARI: 'Ticari',
  KARMA: 'Karma',
  TARIMSAL: 'Tarımsal',
  SANAYI: 'Sanayi',
  DIGER: 'Diğer',
};

function ListingCard({ listing }: { listing: ListingSummary }) {
  return (
    <Link href={`/listings/${listing.id}`} className="block">
      <div className="bg-white rounded-2xl border border-gray-100 hover:border-orange-200 hover:shadow-md transition-all overflow-hidden">
        <div className="h-40 bg-gray-100 flex items-center justify-center text-gray-300">
          {listing.images[0] ? (
            <img src={listing.images[0].url} alt={listing.title} className="w-full h-full object-cover" />
          ) : (
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">
              {listing.title}
            </h3>
            <span className="shrink-0 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
              {DEAL_TYPE_LABELS[listing.dealType] ?? listing.dealType}
            </span>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            {listing.city} / {listing.district}
            {listing.zoningType ? ` · ${ZONING_TYPE_LABELS[listing.zoningType]}` : ''}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-800">
              {listing.areaM2.toLocaleString('tr-TR')} m²
            </span>
            {listing.askingPrice ? (
              <span className="text-sm font-bold text-orange-500">
                {listing.askingPrice.toLocaleString('tr-TR')} ₺
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-xs text-gray-400">{listing._count.offers} teklif</p>
        </div>
      </div>
    </Link>
  );
}

export default function ListingsPage() {
  const [filters, setFilters] = useState<Partial<ListListingsInput>>({ page: 1 });
  const { data, isLoading } = useListings(filters);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Minimal nav */}
      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-gray-900">müteahitt</Link>
          <div className="flex gap-3">
            <Link href="/auth/login" className="text-sm text-gray-600 hover:text-gray-900">Giriş</Link>
            <Link href="/auth/register" className="text-sm bg-orange-500 text-white px-3 py-1.5 rounded-lg hover:bg-orange-600">Kayıt Ol</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Arsalar & Projeler</h1>

        {/* Filtreler */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6 flex flex-wrap gap-3">
          <input
            placeholder="Şehir"
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 w-32"
            onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value || undefined, page: 1 }))}
          />
          <input
            placeholder="İlçe"
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 w-32"
            onChange={(e) => setFilters((f) => ({ ...f, district: e.target.value || undefined, page: 1 }))}
          />
          <select
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            onChange={(e) => setFilters((f) => ({ ...f, dealType: (e.target.value as any) || undefined, page: 1 }))}
          >
            <option value="">Tüm Modeller</option>
            {Object.entries(DEAL_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <input
            placeholder="Arama..."
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 flex-1 min-w-40"
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value || undefined, page: 1 }))}
          />
        </div>

        {/* Sonuçlar */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 h-64 animate-pulse" />
            ))}
          </div>
        ) : data?.items.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">Filtrelerinize uygun ilan bulunamadı.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data?.items.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>

            {/* Sayfalama */}
            {data && data.meta.pageCount > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                {Array.from({ length: data.meta.pageCount }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setFilters((f) => ({ ...f, page: p }))}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                      filters.page === p
                        ? 'bg-orange-500 text-white'
                        : 'bg-white border border-gray-200 text-gray-600 hover:border-orange-300'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
