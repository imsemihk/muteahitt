'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const navLinks = [
  { href: '/', label: 'Ana Sayfa' },
  { href: '/listings', label: 'İlanlar' },
  { href: '/how-it-works', label: 'Nasıl Çalışır' },
  { href: '/pricing', label: 'Paketler' },
  { href: '/blog', label: 'Blog' },
  { href: '/about', label: 'Hakkımızda' },
  { href: '/contact', label: 'İletişim' },
];

export default function MarketingNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <nav className="border-b border-gray-100 bg-white sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="text-xl font-bold text-gray-900 shrink-0">
          müteahitt
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors ${
                pathname === link.href
                  ? 'text-orange-500'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop auth */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/auth/login"
            className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
          >
            Giriş Yap
          </Link>
          <Link
            href="/auth/register"
            className="text-sm bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors font-medium"
          >
            Kayıt Ol
          </Link>
        </div>

        {/* Hamburger */}
        <button
          className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          onClick={() => setOpen(!open)}
          aria-label="Menüyü aç/kapat"
        >
          {open ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-gray-100 bg-white px-6 py-4 flex flex-col gap-3">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={`text-sm font-medium py-1 transition-colors ${
                pathname === link.href
                  ? 'text-orange-500'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <Link
              href="/auth/login"
              onClick={() => setOpen(false)}
              className="text-sm text-gray-600 hover:text-gray-900 font-medium"
            >
              Giriş Yap
            </Link>
            <Link
              href="/auth/register"
              onClick={() => setOpen(false)}
              className="text-sm bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors font-medium"
            >
              Kayıt Ol
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
