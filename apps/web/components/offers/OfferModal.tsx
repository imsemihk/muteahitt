'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateOfferSchema, type CreateOfferInput } from '@muteahitt/shared';
import { api, ApiError } from '../../lib/api-client';
import { useQueryClient } from '@tanstack/react-query';

const OFFER_MODEL_LABELS: Record<string, string> = {
  KAT_KARSILIGI: 'Kat Karşılığı',
  NAKIT: 'Nakit',
  KIRA_GELIRI: 'Kira Geliri',
  KARMA: 'Karma',
  DIGER: 'Diğer',
};

interface Props {
  listingId: string;
  listingTitle: string;
  onClose: () => void;
}

export default function OfferModal({ listingId, listingTitle, onClose }: Props) {
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const qc = useQueryClient();

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<CreateOfferInput>({
    resolver: zodResolver(CreateOfferSchema),
    defaultValues: { offerModel: 'KAT_KARSILIGI' },
  });

  const selectedModel = watch('offerModel');

  async function onSubmit(data: CreateOfferInput) {
    setServerError('');
    try {
      await api.post(`/listings/${listingId}/offers`, data);
      setSuccess(true);
      qc.invalidateQueries({ queryKey: ['listing', listingId] });
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Bir hata oluştu');
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900">Teklif Ver</h2>
            <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{listingTitle}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {success ? (
          <div className="p-10 text-center">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Teklifiniz gönderildi</h3>
            <p className="text-sm text-gray-500 mb-6">İlan sahibi teklifinizi inceleyecek.</p>
            <button onClick={onClose} className="text-sm text-orange-500 hover:underline">Kapat</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teklif Modeli</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Pay Oranı (%)</label>
                <input
                  {...register('revenueSharePercent', { valueAsNumber: true })}
                  type="number"
                  min={1}
                  max={99}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="35"
                />
                {errors.revenueSharePercent && <p className="mt-1 text-xs text-red-500">{errors.revenueSharePercent.message}</p>}
              </div>
            )}

            {selectedModel === 'NAKIT' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teklif Tutarı (₺)</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tahmini Süre (ay)
              </label>
              <input
                {...register('estimatedMonths', { valueAsNumber: true })}
                type="number"
                min={1}
                max={120}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="18"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teklif Mesajı
                <span className="font-normal text-gray-400 ml-1">(min. 50 karakter)</span>
              </label>
              <textarea
                {...register('message')}
                rows={5}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                placeholder="Projenizi inceledim, deneyimlerim ve önerim hakkında..."
              />
              {errors.message && <p className="mt-1 text-xs text-red-500">{errors.message.message}</p>}
              <p className="mt-1 text-xs text-gray-400">
                Telefon, e-posta veya sosyal medya bilgisi eklemeyin.
              </p>
            </div>

            {serverError && (
              <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{serverError}</div>
            )}

            <div className="flex gap-3 pt-2">
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
                className="flex-1 py-2.5 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Gönderiliyor...' : 'Teklifi Gönder'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
