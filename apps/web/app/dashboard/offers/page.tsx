'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '../../../lib/api-client';
import type { MyOffer, Paginated } from '@muteahitt/shared';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Bekliyor', color: 'bg-yellow-100 text-yellow-700' },
  ACCEPTED: { label: 'Kabul Edildi', color: 'bg-green-100 text-green-700' },
  REJECTED: { label: 'Reddedildi', color: 'bg-red-100 text-red-600' },
  WITHDRAWN: { label: 'Geri Çekildi', color: 'bg-gray-100 text-gray-500' },
};

const MODEL_LABELS: Record<string, string> = {
  KAT_KARSILIGI: 'Kat Karşılığı',
  NAKIT: 'Nakit',
  KIRA_GELIRI: 'Kira Geliri',
  KARMA: 'Karma',
  DIGER: 'Diğer',
};

export default function MyOffersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-offers'],
    queryFn: () => api.get<Paginated<MyOffer>>('/offers/me'),
  });

  if (isLoading) {
    return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Tekliflerim</h1>

      {data?.items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-gray-400 mb-4">Henüz teklif vermediniz.</p>
          <Link
            href="/listings"
            className="inline-block bg-orange-500 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-orange-600"
          >
            İlanları Gez
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {data?.items.map((offer) => {
            const status = STATUS_LABELS[offer.status] ?? { label: offer.status, color: 'bg-gray-100 text-gray-600' };
            return (
              <div key={offer.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <Link
                      href={`/listings/${offer.listing.id}`}
                      className="font-semibold text-gray-900 hover:text-orange-500 transition-colors"
                    >
                      {offer.listing.title}
                    </Link>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {offer.listing.city} · {MODEL_LABELS[offer.offerModel] ?? offer.offerModel}
                      {offer.revenueSharePercent ? ` · %${offer.revenueSharePercent}` : ''}
                      {offer.cashOfferAmount ? ` · ${offer.cashOfferAmount.toLocaleString('tr-TR')} ₺` : ''}
                    </p>
                  </div>
                  <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>
                    {status.label}
                  </span>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">{offer.message}</p>

                {offer.status === 'ACCEPTED' && (
                  <div className="mt-3 p-3 bg-green-50 rounded-lg text-sm text-green-700">
                    Teklifiniz kabul edildi. İletişim bilgilerine erişmek için ödeme yapabilirsiniz.
                    <Link
                      href={`/dashboard/payments/unlock/${offer.id}`}
                      className="block mt-1 font-semibold underline"
                    >
                      İletişim Bilgilerini Aç →
                    </Link>
                  </div>
                )}

                <p className="mt-2 text-xs text-gray-400">
                  {new Date(offer.createdAt).toLocaleDateString('tr-TR')}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
