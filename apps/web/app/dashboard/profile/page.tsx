'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { useProfile, useUpdateProfile } from '../../../hooks/useProfile';
import { useAuthStore } from '../../../store/auth.store';
import { ApiError } from '../../../lib/api-client';

const STATUS_INFO: Record<string, { label: string; color: string; desc: string }> = {
  PENDING_EMAIL: { label: 'E-posta Doğrulanmadı', color: 'text-yellow-600 bg-yellow-50', desc: 'E-posta adresinizi doğrulayın.' },
  ACTIVE: { label: 'Aktif', color: 'text-green-600 bg-green-50', desc: 'Hesabınız aktif.' },
  PENDING_VERIFICATION: { label: 'Doğrulama Bekleniyor', color: 'text-blue-600 bg-blue-50', desc: 'Belgeleriniz inceleniyor.' },
  SUSPENDED: { label: 'Askıya Alındı', color: 'text-red-600 bg-red-50', desc: 'Hesabınız askıya alındı.' },
  BANNED: { label: 'Yasaklandı', color: 'text-red-700 bg-red-50', desc: 'Hesabınıza erişim kısıtlandı.' },
};

export default function ProfilePage() {
  const { data: profile, isLoading } = useProfile();
  const { user } = useAuthStore();
  const updateProfile = useUpdateProfile();
  const [saved, setSaved] = useState(false);
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, formState: { isDirty, isSubmitting } } = useForm({
    values: {
      fullName: profile?.fullName ?? '',
      phone: profile?.phone ?? '',
    },
  });

  async function onSubmit(data: { fullName: string; phone: string }) {
    setServerError('');
    try {
      await updateProfile.mutateAsync(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Bir hata oluştu');
    }
  }

  if (isLoading) {
    return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full" /></div>;
  }

  const statusInfo = STATUS_INFO[profile?.status ?? ''] ?? { label: profile?.status, color: 'text-gray-600 bg-gray-50', desc: '' };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Profilim</h1>

      {/* Hesap Durumu */}
      <div className={`rounded-2xl px-5 py-4 flex items-center justify-between ${statusInfo.color}`}>
        <div>
          <p className="font-semibold">{statusInfo.label}</p>
          <p className="text-sm opacity-80 mt-0.5">{statusInfo.desc}</p>
        </div>
        {(profile?.status === 'ACTIVE' || profile?.status === 'PENDING_VERIFICATION') && (
          <Link
            href="/dashboard/profile/verification"
            className="text-sm font-medium underline opacity-80 hover:opacity-100 shrink-0"
          >
            Doğrulama →
          </Link>
        )}
      </div>

      {/* Profil Formu */}
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Kişisel Bilgiler</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad</label>
          <input
            {...register('fullName')}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
          <input
            value={profile?.email ?? ''}
            disabled
            className="w-full px-3 py-2 border border-gray-100 rounded-lg text-sm bg-gray-50 text-gray-400"
          />
          <p className="mt-1 text-xs text-gray-400">E-posta adresi değiştirilemez</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
          <input
            {...register('phone')}
            type="tel"
            placeholder="05551234567"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        {serverError && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{serverError}</div>}
        {saved && <div className="bg-green-50 text-green-700 text-sm px-3 py-2 rounded-lg">Profil güncellendi ✓</div>}

        <button
          type="submit"
          disabled={!isDirty || isSubmitting}
          className="w-full py-2.5 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-40 transition-colors"
        >
          {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </form>

      {/* Hesap türü */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-3">Hesap Bilgileri</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Hesap Türü</span>
            <span className="font-medium">{profile?.userType === 'LAND_OWNER' ? 'Arsa Sahibi' : 'Müteahhit'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Kayıt Tarihi</span>
            <span className="font-medium">{profile?.emailVerifiedAt ? new Date(profile.emailVerifiedAt).toLocaleDateString('tr-TR') : '—'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
