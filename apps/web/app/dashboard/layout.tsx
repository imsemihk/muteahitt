'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { NotificationBell } from '../../components/NotificationBell';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated || !user) return null;

  const isLandOwner = user.role === 'LAND_OWNER';

  const navItems = isLandOwner
    ? [
        { href: '/dashboard/listings', label: 'İlanlarım' },
        { href: '/dashboard/listings/new', label: '+ Yeni İlan' },
        { href: '/dashboard/payments', label: 'Ödemelerim' },
        { href: '/dashboard/profile', label: 'Profil' },
      ]
    : [
        { href: '/listings', label: 'İlanları Gez' },
        { href: '/dashboard/offers', label: 'Tekliflerim' },
        { href: '/dashboard/profile', label: 'Profil' },
      ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-lg font-bold text-gray-900">
              müteahitt
            </Link>
            <div className="hidden md:flex gap-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-medium transition-colors ${
                    pathname.startsWith(item.href)
                      ? 'text-orange-500'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <span className="text-sm text-gray-500">{user.email}</span>
            <button
              onClick={logout}
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              Çıkış
            </button>
          </div>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
