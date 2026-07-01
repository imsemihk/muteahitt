'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAdminUsers } from '@/hooks/useAdmin';

const STATUS_LABELS: Record<string, string> = {
  PENDING_EMAIL: 'E-posta Bekleniyor',
  PENDING_VERIFICATION: 'Doğrulama Bekleniyor',
  ACTIVE: 'Aktif',
  REJECTED: 'Reddedildi',
  SUSPENDED: 'Askıda',
  BANNED: 'Yasaklı',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING_EMAIL: 'bg-gray-100 text-gray-700',
  PENDING_VERIFICATION: 'bg-amber-100 text-amber-700',
  ACTIVE: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  SUSPENDED: 'bg-orange-100 text-orange-700',
  BANNED: 'bg-red-200 text-red-800',
};

export default function AdminUsersPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [role, setRole] = useState('');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useAdminUsers({ page, limit: 20, status: status || undefined, role: role || undefined, q: search || undefined });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Kullanıcılar</h1>

      {/* Filtreler */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="İsim veya e-posta ara..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { setSearch(q); setPage(1); } }}
          className="border rounded-md px-3 py-1.5 text-sm w-60 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Tüm Durumlar</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <select
          value={role}
          onChange={(e) => { setRole(e.target.value); setPage(1); }}
          className="border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Tüm Roller</option>
          <option value="LAND_OWNER">Arsa Sahibi</option>
          <option value="CONTRACTOR">Müteahhit</option>
          <option value="ADMIN">Admin</option>
        </select>
        <button
          onClick={() => { setSearch(q); setPage(1); }}
          className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700"
        >
          Ara
        </button>
      </div>

      {/* Tablo */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Ad / E-posta</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Rol</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Durum</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Kayıt</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              : (data as any)?.items?.map((user: any) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{user.fullName}</p>
                      <p className="text-gray-500 text-xs">{user.email}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {user.role === 'LAND_OWNER' ? 'Arsa Sahibi' : user.role === 'CONTRACTOR' ? 'Müteahhit' : 'Admin'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[user.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {STATUS_LABELS[user.status] ?? user.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(user.createdAt).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="text-indigo-600 hover:underline text-xs font-medium"
                      >
                        Detay →
                      </Link>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
        {!isLoading && (data as any)?.items?.length === 0 && (
          <p className="text-center text-gray-500 py-10">Kullanıcı bulunamadı.</p>
        )}
      </div>

      {/* Sayfalama */}
      {(data as any)?.meta && (data as any).meta.pageCount > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 border rounded text-sm disabled:opacity-40"
          >
            ‹ Önceki
          </button>
          <span className="px-3 py-1.5 text-sm text-gray-600">
            {page} / {(data as any).meta.pageCount}
          </span>
          <button
            disabled={page >= (data as any).meta.pageCount}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 border rounded text-sm disabled:opacity-40"
          >
            Sonraki ›
          </button>
        </div>
      )}
    </div>
  );
}
