'use client';

import { use } from 'react';
import Link from 'next/link';
import { useListing } from '../../../hooks/useListings';
import { useAuthStore } from '../../../store/auth.store';
import OfferModal from '../../../components/offers/OfferModal';
import { useState } from 'react';

const DEAL_TYPE_LABELS: Record<string, string> = {
  KAT_KARSILIGI: 'Kat Karşılığı',
  SATIS: 'Satış',
  KIRA_GELIRI: 'Kira Geliri',
  DIGER: 'Diğer',
};

export default function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: listing, isLoading } = useListing(id);
  const { user } = useAuthStore();
  const [offerOpen, setOfferOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">İlan bulunamadı.</p>
          <Link href="/listings" className="text-orange-500 hover:underline">Tüm ilanlara dön</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-4">
          <Link href="/" className="text-lg font-bold text-gray-900">müteahitt</Link>
          <span className="text-gray-300">/</span>
          <Link href="/listings" className="text-sm text-gray-500 hover:text-gray-700">İlanlar</Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Sol: Detaylar */}
          <div className="lg:col-span-2 space-y-4">
            {/* Fotoğraf */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="h-64 bg-gray-100 flex items-center justify-center text-gray-300">
                {listing.images[0] ? (
                  <img src={listing.images[0].url} alt={listing.title} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm">Fotoğraf yok</span>
                )}
              </div>
            </div>

            {/* Başlık */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-start gap-3 mb-4">
                <h1 className="text-xl font-bold text-gray-900 flex-1">{listing.title}</h1>
                <span className="shrink-0 bg-orange-100 text-orange-700 text-xs font-medium px-2 py-1 rounded-full">
                  {DEAL_TYPE_LABELS[listing.dealType] ?? listing.dealType}
                </span>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                📍 {listing.city}, {listing.district}
                {listing.neighborhood ? ` — ${listing.neighborhood}` : ''}
              </p>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">{listing.description}</p>
            </div>
          </div>

          {/* Sağ: Özet kart */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 sticky top-6">
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Alan</span>
                  <span className="font-semibold">{listing.areaM2.toLocaleString('tr-TR')} m²</span>
                </div>
                {listing.zoningType && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">İmar Durumu</span>
                    <span className="font-semibold">{listing.zoningType}</span>
                  </div>
                )}
                {listing.floorCount && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Kat Adedi</span>
                    <span className="font-semibold">{listing.floorCount}</span>
                  </div>
                )}
                {listing.askingPrice ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">İstenen Fiyat</span>
                    <span className="font-bold text-orange-500">
                      {listing.askingPrice.toLocaleString('tr-TR')} ₺
                    </span>
                  </div>
                ) : null}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Teklif Sayısı</span>
                  <span className="font-semibold">{listing._count.offers}</span>
                </div>
              </div>

              {user?.role === 'CONTRACTOR' ? (
                <button
                  onClick={() => setOfferOpen(true)}
                  className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors"
                >
                  Teklif Ver
                </button>
              ) : !user ? (
                <Link
                  href={`/auth/register?type=contractor`}
                  className="block w-full text-center bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors"
                >
                  Teklif Vermek İçin Kayıt Ol
                </Link>
              ) : null}

              <p className="mt-3 text-xs text-gray-400 text-center">
                İlan sahibi: {listing.owner.fullName}
              </p>
            </div>
          </div>
        </div>
      </div>

      {offerOpen && (
        <OfferModal
          listingId={listing.id}
          listingTitle={listing.title}
          onClose={() => setOfferOpen(false)}
        />
      )}
    </div>
  );
}
