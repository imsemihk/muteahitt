'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useListing } from '../../../../hooks/useListings';
import { api, ApiError } from '../../../../lib/api-client';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Taslak', color: 'bg-gray-100 text-gray-600' },
  ACTIVE: { label: 'Yayında', color: 'bg-green-100 text-green-700' },
  CLOSED: { label: 'Kapalı', color: 'bg-yellow-100 text-yellow-700' },
};

const OFFER_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Beklemede', color: 'bg-yellow-100 text-yellow-700' },
  ACCEPTED: { label: 'Kabul Edildi', color: 'bg-green-100 text-green-700' },
  REJECTED: { label: 'Reddedildi', color: 'bg-red-100 text-red-600' },
  WITHDRAWN: { label: 'Geri Çekildi', color: 'bg-gray-100 text-gray-500' },
};

const OFFER_MODEL_LABELS: Record<string, string> = {
  KAT_KARSILIGI: 'Kat Karşılığı',
  NAKIT: 'Nakit',
  KIRA_GELIRI: 'Kira Geliri',
  KARMA: 'Karma',
  DIGER: 'Diğer',
};

interface Offer {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
  offerModel: string;
  revenueSharePercent?: number;
  cashOfferAmount?: number;
  estimatedMonths?: number;
  message: string;
  createdAt: string;
  contractor: {
    id: string;
    fullName: string;
  };
}

function OfferCard({ offer, listingId }: { offer: Offer; listingId: string }) {
  const [expanded, setExpanded] = useState(false);
  const [actionError, setActionError] = useState('');
  const qc = useQueryClient();

  const accept = useMutation({
    mutationFn: () => api.patch(`/offers/${offer.id}/accept`),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['listing-offers', listingId] });
      const prev = qc.getQueryData<Offer[]>(['listing-offers', listingId]);
      qc.setQueryData<Offer[]>(['listing-offers', listingId], (old) =>
        old?.map((o) => (o.id === offer.id ? { ...o, status: 'ACCEPTED' } : o))
      );
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      qc.setQueryData(['listing-offers', listingId], ctx?.prev);
      setActionError(err instanceof ApiError ? err.message : 'Bir hata oluştu');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['listing-offers', listingId] }),
  });

  const reject = useMutation({
    mutationFn: () => api.patch(`/offers/${offer.id}/reject`),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['listing-offers', listingId] });
      const prev = qc.getQueryData<Offer[]>(['listing-offers', listingId]);
      qc.setQueryData<Offer[]>(['listing-offers', listingId], (old) =>
        old?.map((o) => (o.id === offer.id ? { ...o, status: 'REJECTED' } : o))
      );
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      qc.setQueryData(['listing-offers', listingId], ctx?.prev);
      setActionError(err instanceof ApiError ? err.message : 'Bir hata oluştu');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['listing-offers', listingId] }),
  });

  const statusInfo = OFFER_STATUS_LABELS[offer.status] ?? { label: offer.status, color: 'bg-gray-100 text-gray-600' };
  const isLong = offer.message.length > 150;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <p className="font-semibold text-gray-900">{offer.contractor?.fullName}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(offer.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${statusInfo.color}`}>
          {statusInfo.label}
        </span>
      </div>

      {/* Teklif bilgileri */}
      <div className="flex flex-wrap gap-3 mb-3">
        <div className="bg-gray-50 rounded-lg px-3 py-1.5">
          <p className="text-xs text-gray-500">Model</p>
          <p className="text-sm font-semibold text-gray-800">{OFFER_MODEL_LABELS[offer.offerModel] ?? offer.offerModel}</p>
        </div>

        {offer.revenueSharePercent != null && (
          <div className="bg-gray-50 rounded-lg px-3 py-1.5">
            <p className="text-xs text-gray-500">Pay Oranı</p>
            <p className="text-sm font-semibold text-gray-800">%{offer.revenueSharePercent}</p>
          </div>
        )}

        {offer.cashOfferAmount != null && (
          <div className="bg-gray-50 rounded-lg px-3 py-1.5">
            <p className="text-xs text-gray-500">Teklif Tutarı</p>
            <p className="text-sm font-semibold text-orange-500">{offer.cashOfferAmount.toLocaleString('tr-TR')} ₺</p>
          </div>
        )}

        {offer.estimatedMonths != null && (
          <div className="bg-gray-50 rounded-lg px-3 py-1.5">
            <p className="text-xs text-gray-500">Süre</p>
            <p className="text-sm font-semibold text-gray-800">{offer.estimatedMonths} ay</p>
          </div>
        )}
      </div>

      {/* Mesaj */}
      <div className="mb-3">
        <p className="text-sm text-gray-700 leading-relaxed">
          {expanded || !isLong ? offer.message : offer.message.slice(0, 150) + '...'}
        </p>
        {isLong && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-1 text-xs text-orange-500 hover:underline"
          >
            {expanded ? 'Daha az göster' : 'Daha fazla göster'}
          </button>
        )}
      </div>

      {actionError && (
        <div className="bg-red-50 text-red-700 text-xs px-3 py-2 rounded-lg mb-3">{actionError}</div>
      )}

      {/* Aksiyon butonları */}
      {offer.status === 'PENDING' && (
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => { setActionError(''); accept.mutate(); }}
            disabled={accept.isPending || reject.isPending}
            className="flex-1 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50 transition-colors"
          >
            {accept.isPending ? 'İşleniyor...' : 'Kabul Et'}
          </button>
          <button
            onClick={() => { setActionError(''); reject.mutate(); }}
            disabled={accept.isPending || reject.isPending}
            className="flex-1 py-2 bg-red-100 text-red-600 rounded-lg text-sm font-medium hover:bg-red-200 disabled:opacity-50 transition-colors"
          >
            {reject.isPending ? 'İşleniyor...' : 'Reddet'}
          </button>
        </div>
      )}

      {offer.status === 'ACCEPTED' && (
        <Link
          href={`/dashboard/payments/unlock/${offer.id}`}
          className="block mt-2 text-center text-sm text-orange-500 font-medium hover:underline"
        >
          İletişim bilgisini görüntüle →
        </Link>
      )}
    </div>
  );
}

export default function ListingOffersPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: listing, isLoading: listingLoading } = useListing(id);

  const { data: offers, isLoading: offersLoading } = useQuery<Offer[]>({
    queryKey: ['listing-offers', id],
    queryFn: () => api.get<Offer[]>(`/listings/${id}/offers`),
    enabled: !!id,
  });

  const isLoading = listingLoading || offersLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const listingStatusInfo = listing
    ? (STATUS_LABELS[listing.status] ?? { label: listing.status, color: 'bg-gray-100 text-gray-600' })
    : null;

  return (
    <div>
      {/* Back link */}
      <div className="mb-4">
        <Link
          href="/dashboard/listings"
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors"
        >
          <span>←</span> İlanlarıma Dön
        </Link>
      </div>

      {/* Başlık */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <h1 className="text-xl font-bold text-gray-900 min-w-0">
          {listing ? (
            <>
              <span className="truncate block">{listing.title}</span>
              <span className="text-sm font-normal text-gray-400">— Gelen Teklifler</span>
            </>
          ) : (
            'Gelen Teklifler'
          )}
        </h1>
        {listing && (
          <Link
            href={`/dashboard/listings/${id}/edit`}
            className="shrink-0 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            İlanı Düzenle
          </Link>
        )}
      </div>

      {/* İlan özet kartı */}
      {listing && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            {listingStatusInfo && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${listingStatusInfo.color}`}>
                {listingStatusInfo.label}
              </span>
            )}
            <span className="text-sm text-gray-600 font-medium">{listing.city}, {listing.district}</span>
          </div>
          <span className="text-sm text-gray-500">{listing.areaM2?.toLocaleString('tr-TR')} m²</span>
          <span className="text-sm text-gray-400">{offers?.length ?? 0} teklif</span>
          <Link
            href={`/listings/${id}`}
            className="ml-auto text-xs text-orange-500 hover:underline"
          >
            İlanı görüntüle →
          </Link>
        </div>
      )}

      {/* Teklifler */}
      {!offers || offers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-gray-400 text-sm">Henüz teklif yok.</p>
          <p className="text-xs text-gray-300 mt-1">İlanınız aktif olduğunda müteahhitler teklif gönderebilir.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {offers.map((offer) => (
            <OfferCard key={offer.id} offer={offer} listingId={id} />
          ))}
        </div>
      )}
    </div>
  );
}
