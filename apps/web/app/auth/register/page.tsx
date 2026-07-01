'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RegisterSchema, type RegisterInput } from '@muteahitt/shared';
import { useAuth } from '../../../hooks/useAuth';
import { ApiError } from '../../../lib/api-client';

function RegisterForm() {
  const searchParams = useSearchParams();
  const defaultType = searchParams.get('type') === 'contractor' ? 'CONTRACTOR' : 'LAND_OWNER';
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register: registerUser } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: { userType: defaultType },
  });

  async function onSubmit(data: RegisterInput) {
    setLoading(true);
    setServerError('');
    try {
      await registerUser(data);
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      {/* Kullanıcı tipi seçimi */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {(['LAND_OWNER', 'CONTRACTOR'] as const).map((type) => (
          <label
            key={type}
            className="flex flex-col items-center p-3 rounded-xl border-2 cursor-pointer has-[:checked]:border-orange-500 has-[:checked]:bg-orange-50 border-gray-200 transition-colors"
          >
            <input
              {...register('userType')}
              type="radio"
              value={type}
              className="sr-only"
            />
            <span className="text-lg">{type === 'LAND_OWNER' ? '🏗️' : '👷'}</span>
            <span className="text-sm font-medium mt-1">
              {type === 'LAND_OWNER' ? 'Arsa Sahibi' : 'Müteahhit'}
            </span>
          </label>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad</label>
          <input
            {...register('fullName')}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
            placeholder="Ahmet Yılmaz"
          />
          {errors.fullName && <p className="mt-1 text-xs text-red-500">{errors.fullName.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
          <input
            {...register('email')}
            type="email"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
            placeholder="ahmet@example.com"
          />
          {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
          <input
            {...register('phone')}
            type="tel"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
            placeholder="05551234567"
          />
          {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Şifre</label>
          <input
            {...register('password')}
            type="password"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
        </div>

        {serverError && (
          <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">
            {serverError}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-orange-500 text-white py-2.5 rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Kayıt yapılıyor...' : 'Kayıt Ol'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-500">
        Zaten hesabın var mı?{' '}
        <Link href="/auth/login" className="text-orange-500 hover:underline">
          Giriş yap
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-gray-900">
            müteahitt
          </Link>
          <h1 className="mt-4 text-xl font-semibold text-gray-800">Hesap oluştur</h1>
        </div>
        <Suspense fallback={<div className="h-96 bg-white rounded-2xl animate-pulse" />}>
          <RegisterForm />
        </Suspense>
      </div>
    </div>
  );
}
