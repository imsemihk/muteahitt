'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '../store/auth.store';
import { api } from '../lib/api-client';
import type { LoginInput, RegisterInput, AuthTokens, CurrentUser } from '@muteahitt/shared';

export function useAuth() {
  const router = useRouter();
  const { user, isAuthenticated, setSession, clearSession } = useAuthStore();

  async function register(data: RegisterInput) {
    await api.post('/auth/register', data);
    // Kayıt sonrası e-posta doğrulama sayfasına yönlendir
    router.push('/auth/verify-email-sent');
  }

  async function login(data: LoginInput) {
    const tokens = await api.post<AuthTokens>('/auth/login', data);
    const me = await fetchMe(tokens.accessToken);
    setSession(me, tokens);
    if (me.role === 'ADMIN') {
      router.push('/admin');
    } else if (me.role === 'CONTRACTOR') {
      router.push('/dashboard/offers');
    } else {
      router.push('/dashboard/listings');
    }
  }

  async function logout() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      await api.post('/auth/logout', { refreshToken }).catch(() => {});
    }
    clearSession();
    router.push('/');
  }

  return { user, isAuthenticated, register, login, logout };
}

async function fetchMe(accessToken: string): Promise<CurrentUser> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'}/auth/me`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const json = await res.json();
  return json.data;
}
