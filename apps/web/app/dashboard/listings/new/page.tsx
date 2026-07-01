'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateListingSchema, type CreateListingInput } from '@muteahitt/shared';
import { useCreateListing } from '../../../../hooks/useListings';
import { ApiError } from '../../../../lib/api-client';
import { useState } from 'react';

const DEAL_TYPE_OPTIONS = [
  { value: 'KAT_KARSILIGI', label: 'Kat Karşılığı' },
  { value: 'SATIS', label: 'Satış' },
  { value: 'KIRA_GELIRI', label: 'Kira Geliri' },
  { value: 'DIGER', label: 'Diğer' },
];

const ZONING_TYPE_OPTIONS = [
  { value: 'KONUT', label: 'Konut' },
  { value: 'TICARI', label: 'Ticari' },
  { value: 'KARMA', label: 'Karma' },
  { value: 'TARIMSAL', label: 'Tarımsal' },
  { value: 'SANAYI', label: 'Sanayi' },
  { value: 'DIGER', label: 'Diğer' },
];

export default function NewListingPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState('');
  const createListing = useCreateListing();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CreateListingInput>({
    resolver: zodResolver(CreateListingSchema),
    defaultValues: { dealType: 'KAT_KARSILIGI' },
  });

  async function onSubmit(data: CreateListingInput) {
    setServerError('');
    try {
      const listing = await createListing.mutateAsync(data);
      router.push(`/dashboard/listings`);
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Bir hata oluştu');
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Yeni İlan Oluştur</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Başlık</label>
          <input
            {...register('title')}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            placeholder="Kadıköy Merkezde Konut İmarlı Arsa"
          />
          {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
          <textarea
            {...register('description')}
            rows={4}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
            placeholder="Arsa hakkında detaylı bilgi verin..."
          />
          {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Şehir</label>
            <input
              {...register('city')}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="İstanbul"
            />
            {errors.city && <p className="mt-1 text-xs text-red-500">{errors.city.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">İlçe</label>
            <input
              {...register('district')}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="Kadıköy"
            />
            {errors.district && <p className="mt-1 text-xs text-red-500">{errors.district.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Alan (m²)</label>
            <input
              {...register('areaM2', { valueAsNumber: true })}
              type="number"
              min={1}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="850"
            />
            {errors.areaM2 && <p className="mt-1 text-xs text-red-500">{errors.areaM2.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teklif Modeli</label>
            <select
              {...register('dealType')}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              {DEAL_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">İmar Durumu</label>
            <select
              {...register('zoningType')}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              <option value="">Seçin</option>
              {ZONING_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">İstenen Fiyat (₺)</label>
            <input
              {...register('askingPrice', { valueAsNumber: true })}
              type="number"
              min={0}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="5000000"
            />
          </div>
        </div>

        {serverError && (
          <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{serverError}</div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-2.5 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'Kaydediliyor...' : 'Taslak Olarak Kaydet'}
          </button>
        </div>
      </form>
    </div>
  );
}
