'use client';

import Link from 'next/link';
import { useAdminStats } from '@/hooks/useAdmin';

function StatCard({ label, value, href, accent }: { label: string; value?: number | string; href?: string; accent?: string }) {
  const content = (
    <div className={`bg-white rounded-lg border p-5 ${href ? 'hover:border-indigo-300 transition-colors cursor-pointer' : ''}`}>
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${accent ?? 'text-gray-900'}`}>
        {value !== undefined ? value : '—'}
      </p>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

export default function AdminDashboardPage() {
  const { data: stats, isLoading } = useAdminStats();

  const revenue = stats
    ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(
        Number(stats.totalRevenue),
      )
    : undefined;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg border p-5 h-24 animate-pulse bg-gray-100" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <StatCard label="Toplam Kullanıcı" value={stats?.totalUsers} href="/admin/users" />
          <StatCard
            label="Doğrulama Bekleyenler"
            value={stats?.pendingVerification}
            href="/admin/verifications"
            accent={stats?.pendingVerification ? 'text-amber-600' : undefined}
          />
          <StatCard label="Aktif İlanlar" value={stats?.activeListings} href="/admin/listings" />
          <StatCard label="Toplam Ödeme" value={stats?.totalPayments} />
          <StatCard label="Toplam Gelir" value={revenue} accent="text-green-600" />
        </div>
      )}
    </div>
  );
}
