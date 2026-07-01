'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useListing } from '../../../hooks/useListings';
import { useAuthStore } from '../../../store/auth.store';
import { api, ApiError } from '../../../lib/api-client';
import { useAuth } from '../../../hooks/useAuth';

const DEAL_TYPE_LABELS: Record<string, string> = {
  KAT_KARSILIGI: 'Kat Karşılığı',
  SATIS: 'Satış',
  KIRA_GELIRI: 'Kira Geliri',
  DIGER: 'Diğer',
};

const OFFER_MODEL_LABELS: Record<string, string> = {
  KAT_KARSILIGI: 'Kat Karşılığı',
  NAKIT: 'Nakit',
  KIRA_GELIRI: 'Kira Geliri',
  KARMA: 'Karma',
  DIGER: 'Diğer',
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Taslak', color: 'bg-gray-100 text-gray-600' },
  ACTIVE: { label: 'Yayında', color: 'bg-green-100 text-green-700' },
  CLOSED: { label: 'Kapalı', color: 'bg-yellow-100 text-yellow-700' },
};

interface OfferFormValues {
  offerModel: 'KAT_KARSILIGI' | 'NAKIT' | 'KIRA_GELIRI' | 'KARMA' | 'DIGER';
  revenueSharePercent?: number;
  cashOfferAmount?: number;
  estimatedMonths: number;
  message: string;
}

function OfferPanel({ listingId, onClose }: { listingId: string; onClose: () => void }) {
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const qc = useQueryClient();

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<OfferFormValues>({
    defaultValues: { offerModel: 'KAT_KARSILIGI' },
  });

  const selectedModel = watch('offerModel');

  async function onSubmit(data: OfferFormValues) {
    setServerError('');
    try {
      await api.post(`/listings/${listingId}/offers`, data);
      setSuccess(true);
      qc.invalidateQueries({ queryKey: ['listing', listingId] });
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Bir hata oluştu');
    }
  }

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center mt-4">
        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="font-semibold text-green-800 text-sm mb-1">Teklifiniz gönderildi!</p>
        <p className="text-xs text-green-600 mb-3">İlan sahibi teklifinizi inceleyecek.</p>
        <button onClick={onClose} className="text-xs text-orange-500 hover:underline">Kapat</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-3 border-t border-gray-100 pt-4">
      <h3 className="font-semibold text-gray-900 text-sm">Teklif Ver</h3>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Teklif Modeli</label>
        <select
          {...register('offerModel')}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        >
          {Object.entries(OFFER_MODEL_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      {selectedModel === 'KAT_KARSILIGI' && (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Pay Oranı (%)</label>
          <input
            {...register('revenueSharePercent', { valueAsNumber: true })}
            type="number"
            min={1}
            max={99}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            placeholder="35"
          />
        </div>
      )}

      {selectedModel === 'NAKIT' && (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Teklif Tutarı (₺)</label>
          <input
            {...register('cashOfferAmount', { valueAsNumber: true })}
            type="number"
            min={0}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            placeholder="5000000"
          />
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Tahmini İnşaat Süresi (ay)</label>
        <input
          {...register('estimatedMonths', { required: 'Bu alan zorunludur', valueAsNumber: true, min: 1 })}
          type="number"
          min={1}
          max={120}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          placeholder="18"
        />
        {errors.estimatedMonths && <p className="mt-1 text-xs text-red-500">{errors.estimatedMonths.message}</p>}
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Teklif Mesajı</label>
        <textarea
          {...register('message', { required: 'Bu alan zorunludur', minLength: { value: 20, message: 'En az 20 karakter giriniz' } })}
          rows={4}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
          placeholder="Projenizi inceledim, deneyimlerim ve önerim..."
        />
        {errors.message && <p className="mt-1 text-xs text-red-500">{errors.message.message}</p>}
      </div>

      {serverError && (
        <div className="bg-red-50 text-red-700 text-xs px-3 py-2 rounded-lg">{serverError}</div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Vazgeç
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 disabled:opacity-50 transition-colors"
        >
          {isSubmitting ? 'Gönderiliyor...' : 'Gönder'}
        </button>
      </div>
    </form>
  );
}

export default function ListingDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: listing, isLoading } = useListing(id);
  const { user } = useAuthStore();
  const { logout } = useAuth();
  const [offerOpen, setOfferOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

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

  const statusInfo = STATUS_LABELS[listing.status] ?? { label: listing.status, color: 'bg-gray-100 text-gray-600' };
  const isOwner = user?.id === listing.owner?.id;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-gray-900">müteahitt</Link>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <span className="text-sm text-gray-600">{user.email}</span>
                <button
                  onClick={logout}
                  className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Çıkış
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="text-sm text-gray-600 hover:text-gray-900">Giriş</Link>
                <Link href="/auth/register" className="text-sm bg-orange-500 text-white px-3 py-1.5 rounded-lg hover:bg-orange-600">Kayıt Ol</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Breadcrumb */}
      <div className="max-w-6xl mx-auto px-6 pt-4">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Link href="/listings" className="hover:text-orange-500 transition-colors">İlanlar</Link>
          <span>/</span>
          <span className="text-gray-700 truncate max-w-xs">{listing.title}</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="grid md:grid-cols-3 gap-6">

          {/* Sol sütun (2/3) */}
          <div className="md:col-span-2 space-y-4">
            {/* Carousel */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {listing.images && listing.images.length > 0 ? (
                <div className="relative">
                  <div className="h-72 bg-gray-100">
                    <img
                      src={listing.images[currentImageIndex]?.url}
                      alt={listing.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {listing.images.length > 1 && (
                    <>
                      <button
                        onClick={() => setCurrentImageIndex((i) => (i - 1 + listing.images.length) % listing.images.length)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full w-8 h-8 flex items-center justify-center shadow text-gray-700 text-sm"
                      >
                        ‹
                      </button>
                      <button
                        onClick={() => setCurrentImageIndex((i) => (i + 1) % listing.images.length)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full w-8 h-8 flex items-center justify-center shadow text-gray-700 text-sm"
                      >
                        ›
                      </button>
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                        {listing.images.map((_: unknown, i: number) => (
                          <button
                            key={i}
                            onClick={() => setCurrentImageIndex(i)}
                            className={`w-2 h-2 rounded-full transition-colors ${i === currentImageIndex ? 'bg-white' : 'bg-white/50'}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="h-72 bg-gray-100 flex items-center justify-center">
                  <div className="text-center text-gray-300">
                    <svg className="w-12 h-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm">Fotoğraf yok</p>
                  </div>
                </div>
              )}
            </div>

            {/* Başlık & Konum */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-start justify-between gap-3 mb-3">
                <h1 className="text-xl font-bold text-gray-900 flex-1">{listing.title}</h1>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                  <span className="bg-orange-100 text-orange-700 text-xs font-medium px-2 py-0.5 rounded-full">
                    {DEAL_TYPE_LABELS[listing.dealType] ?? listing.dealType}
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                📍 {listing.city}, {listing.district}
              </p>
              {listing.description && (
                <p className="text-gray-700 leading-relaxed whitespace-pre-line text-sm">{listing.description}</p>
              )}
            </div>

            {/* Detaylar */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-4 text-sm">Arsa Detayları</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">Alan</p>
                  <p className="font-semibold text-gray-900">{listing.areaM2?.toLocaleString('tr-TR')} m²</p>
                </div>
                {listing.zoningType && (
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1">İmar Durumu</p>
                    <p className="font-semibold text-gray-900">{listing.zoningType}</p>
                  </div>
                )}
                {listing.floorCount && (
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1">Kat Adedi</p>
                    <p className="font-semibold text-gray-900">{listing.floorCount}</p>
                  </div>
                )}
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">Teklif Modeli</p>
                  <p className="font-semibold text-gray-900">{DEAL_TYPE_LABELS[listing.dealType] ?? listing.dealType}</p>
                </div>
                {listing.createdAt && (
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1">Yayın Tarihi</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(listing.createdAt).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* İlan sahibi için teklifleri görüntüle banner */}
            {user?.role === 'LAND_OWNER' && isOwner && (
              <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-orange-800 text-sm">Gelen teklifleri görüntüleyin</p>
                  <p className="text-xs text-orange-600 mt-0.5">{listing._count?.offers ?? 0} teklif bekleniyor</p>
                </div>
                <Link
                  href={`/dashboard/listings/${id}`}
                  className="bg-orange-500 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors shrink-0"
                >
                  Teklifleri Gör
                </Link>
              </div>
            )}
          </div>

          {/* Sağ sütun (1/3) — Sticky kart */}
          <div>
            <div className="bg-white rounded-2xl border border-gray-100 p-6 sticky top-6">
              {listing.askingPrice ? (
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-1">İstenen Fiyat</p>
                  <p className="text-2xl font-bold text-orange-500">
                    {listing.askingPrice.toLocaleString('tr-TR')} ₺
                  </p>
                </div>
              ) : null}

              <div className="flex items-center gap-2 mb-6">
                <span className="text-sm text-gray-500">Teklif sayısı:</span>
                <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {listing._count?.offers ?? 0}
                </span>
              </div>

              {/* CTA logic */}
              {!user ? (
                <Link
                  href={`/auth/login?redirect=/listings/${id}`}
                  className="block w-full text-center bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors text-sm"
                >
                  Teklif vermek için giriş yap
                </Link>
              ) : user.role === 'LAND_OWNER' ? (
                <div className="space-y-2">
                  <Link
                    href={`/dashboard/listings/${id}/edit`}
                    className="block w-full text-center border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    İlanı Düzenle
                  </Link>
                  <Link
                    href={`/dashboard/listings/${id}`}
                    className="block w-full text-center bg-orange-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors"
                  >
                    Gelen Teklifleri Gör
                  </Link>
                </div>
              ) : user.role === 'CONTRACTOR' ? (
                <>
                  {!offerOpen && (
                    <button
                      onClick={() => setOfferOpen(true)}
                      className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors text-sm"
                    >
                      Teklif Ver
                    </button>
                  )}
                  {offerOpen && (
                    <OfferPanel listingId={id} onClose={() => setOfferOpen(false)} />
                  )}
                </>
              ) : null /* ADMIN — sadece görüntüler */}

              <p className="mt-4 text-xs text-gray-400 text-center">
                İlan sahibi: {listing.owner?.fullName}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
