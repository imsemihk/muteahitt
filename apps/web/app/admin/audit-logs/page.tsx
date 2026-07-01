'use client';

import { useState } from 'react';
import { useAuditLogs } from '@/hooks/useAdmin';

export default function AdminAuditLogsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAuditLogs({ page, limit: 20 });

  const d = data as any;
  const items = d?.items ?? [];
  const meta = d?.meta;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>

      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Tarih</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Admin</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Aksiyon</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Entity</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Not</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading
              ? Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((__, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              : items.map((log: any) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString('tr-TR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{log.admin?.fullName ?? '—'}</div>
                      <div className="text-xs text-gray-400">{log.admin?.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700">{log.action}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <span className="font-medium">{log.entityType}</span>
                      <span className="text-gray-400 ml-1 text-xs">#{log.entityId?.slice(0, 8)}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{log.note ?? '—'}</td>
                  </tr>
                ))}
          </tbody>
        </table>

        {meta && meta.pageCount > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-gray-600">
            <span>{meta.total} kayıt, sayfa {meta.page}/{meta.pageCount}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50"
              >
                ‹ Önceki
              </button>
              <button
                onClick={() => setPage((p) => Math.min(meta.pageCount, p + 1))}
                disabled={page === meta.pageCount}
                className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50"
              >
                Sonraki ›
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
