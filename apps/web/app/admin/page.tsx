'use client';

import Link from 'next/link';
import { useAdminStats, useDashboardTrends, useAdminPayments, useAdminUsers } from '@/hooks/useAdmin';

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
  const { data: trendsData } = useDashboardTrends();
  const { data: paymentsData } = useAdminPayments({ page: 1, limit: 5 });
  const { data: usersData } = useAdminUsers({ page: 1, limit: 5 });

  const revenue = stats
    ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(
        Number(stats.totalRevenue),
      )
    : undefined;

  const trends = trendsData as any;
  const recentPayments = (paymentsData as any)?.items ?? [];
  const recentUsers = (usersData as any)?.items ?? [];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Stat kartları */}
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
          <StatCard label="Toplam Ödeme" value={stats?.totalPayments} href="/admin/payments" />
          <StatCard label="Toplam Gelir" value={revenue} accent="text-green-600" />
        </div>
      )}

      {/* Son 30 gün trend verileri */}
      {trends && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <TrendTable title="Son 30 Gün — Kullanıcılar" rows={(trends.usersByDay as any[]) ?? []} valueKey="count" valueLabel="Kayıt" />
          <TrendTable title="Son 30 Gün — İlanlar" rows={(trends.listingsByDay as any[]) ?? []} valueKey="count" valueLabel="İlan" />
          <TrendTable title="Son 30 Gün — Gelir" rows={(trends.revenueByDay as any[]) ?? []} valueKey="total" valueLabel="Gelir (₺)" currency />
        </div>
      )}

      {/* Son ödemeler & son kullanıcılar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Son 5 ödeme */}
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h2 className="font-semibold text-gray-700 text-sm">Son 5 Ödeme</h2>
            <Link href="/admin/payments" className="text-xs text-indigo-600 hover:underline">Tümünü Gör</Link>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y">
              {recentPayments.length === 0 && (
                <tr><td className="px-4 py-4 text-gray-400 text-center" colSpan={3}>Kayıt yok</td></tr>
              )}
              {recentPayments.map((p: any) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-700">{p.buyer?.fullName ?? '—'}</td>
                  <td className="px-4 py-2 text-gray-500 text-xs">{p.offer?.listing?.title ?? '—'}</td>
                  <td className="px-4 py-2 text-right font-medium text-gray-900">
                    {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(Number(p.amount))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Son 5 kullanıcı */}
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h2 className="font-semibold text-gray-700 text-sm">Son 5 Kullanıcı Kaydı</h2>
            <Link href="/admin/users" className="text-xs text-indigo-600 hover:underline">Tümünü Gör</Link>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y">
              {recentUsers.length === 0 && (
                <tr><td className="px-4 py-4 text-gray-400 text-center" colSpan={3}>Kayıt yok</td></tr>
              )}
              {recentUsers.map((u: any) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <Link href={`/admin/users/${u.id}`} className="font-medium text-gray-900 hover:text-indigo-600">{u.fullName}</Link>
                    <div className="text-xs text-gray-400">{u.email}</div>
                  </td>
                  <td className="px-4 py-2 text-gray-500 text-xs">{u.userType}</td>
                  <td className="px-4 py-2 text-xs text-gray-400 text-right">
                    {new Date(u.createdAt).toLocaleDateString('tr-TR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TrendTable({ title, rows, valueKey, valueLabel, currency }: {
  title: string;
  rows: Array<{ date: string; [k: string]: any }>;
  valueKey: string;
  valueLabel: string;
  currency?: boolean;
}) {
  const fmtVal = (v: any) => {
    const n = Number(v);
    if (currency) return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(n);
    return String(v);
  };

  const recent = rows.slice(-7);

  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b">
        <h2 className="font-semibold text-gray-700 text-sm">{title}</h2>
      </div>
      {recent.length === 0 ? (
        <p className="px-4 py-4 text-sm text-gray-400">Veri yok</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-2 text-gray-500 font-medium text-xs">Tarih</th>
              <th className="text-right px-4 py-2 text-gray-500 font-medium text-xs">{valueLabel}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {recent.map((row) => (
              <tr key={String(row.date)} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-gray-600 text-xs">
                  {new Date(String(row.date)).toLocaleDateString('tr-TR')}
                </td>
                <td className="px-4 py-2 text-right font-medium text-gray-900 text-xs">
                  {fmtVal(row[valueKey])}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
