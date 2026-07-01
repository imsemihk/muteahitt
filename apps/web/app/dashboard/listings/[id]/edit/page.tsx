'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UpdateListingSchema, type UpdateListingInput } from '@muteahitt/shared';
import { useListing, useUpdateListing } from '../../../../../hooks/useListings';
import { ApiError } from '../../../../../lib/api-client';
import ImageUploader from '../../../../../components/ui/ImageUploader';

export default function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: listing, isLoading, refetch } = useListing(id);
  const updateListing = useUpdateListing(id);
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<UpdateListingInput>({
    resolver: zodResolver(UpdateListingSchema),
    values: listing
      ? {
          title: listing.title,
          description: listing.description,
          city: listing.city,
          district: listing.district,
          neighborhood: listing.neighborhood,
          areaM2: listing.areaM2,
          dealType: listing.dealType as any,
          zoningType: listing.zoningType as any,
          askingPrice: listing.askingPrice,
        }
      : undefined,
  });

  async function onSubmit(data: UpdateListingInput) {
    setServerError('');
    try {
      await updateListing.mutateAsync(data);
      router.push('/dashboard/listings');
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Bir hata oluştu');
    }
  }

  if (isLoading) {
    return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full" /></div>;
  }

  if (!listing) return <p className="text-gray-500">İlan bulunamadı</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-gray-900 mb-6">İlanı Düzenle</h1>

      <div className="space-y-4">
        {/* Görseller */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Görseller</h2>
          <ImageUploader
            listingId={id}
            existingImages={listing.images}
            onUpload={() => refetch()}
            onDelete={() => refetch()}
          />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">İlan Bilgileri</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Başlık</label>
            <input {...register('title')} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
            <textarea {...register('description')} rows={4} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
            {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Şehir</label>
              <input {...register('city')} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">İlçe</label>
              <input {...register('district')} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alan (m²)</label>
              <input {...register('areaM2', { valueAsNumber: true })} type="number" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">İstenen Fiyat (₺)</label>
              <input {...register('askingPrice', { valueAsNumber: true })} type="number" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
          </div>

          {serverError && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{serverError}</div>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => router.back()} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
              İptal
            </button>
            <button type="submit" disabled={isSubmitting} className="flex-1 py-2.5 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors">
              {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
