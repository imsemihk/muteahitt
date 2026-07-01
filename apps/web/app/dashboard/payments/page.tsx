'use client';

import Link from 'next/link';
import { useMyPayments } from '../../../hooks/usePayments';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Bekliyor', color: 'bg-yellow-100 text-yellow-700' },
  PROCESSING: { label: 'İşleniyor', color: 'bg-blue-100 text-blue-700' },
  COMPLETED: { label: 'Tamamlandı', color: 'bg-green-100 text-green-700' },
  FAILED: { label: 'Başarısız', color: 'bg-red-100 text-red-600' },
  REFUNDED: { label: 'İade Edildi', color: 'bg-gray-100 text-gray-600' },
};

export default function PaymentsPage() {
  const { data, isLoading } = useMyPayments();

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Ödeme Geçmişim</h1>

      {data?.items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-gray-400">Henüz ödeme yapmadınız.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data?.items.map((payment) => {
            const status = STATUS_LABELS[payment.status] ?? { label: payment.status, color: 'bg-gray-100 text-gray-600' };
            return (
              <div key={payment.id} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">
                    {payment.offer.listing.title}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Müteahhit: {payment.offer.contractor.fullName} ·{' '}
                    {new Date(payment.createdAt).toLocaleDateString('tr-TR')}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>
                    {status.label}
                  </span>
                  <span className="font-bold text-gray-900">
                    {payment.amount.toLocaleString('tr-TR')} {payment.currency}
                  </span>
                  {payment.status === 'COMPLETED' && (
                    <Link
                      href={`/dashboard/payments/unlock/${payment.offer.id}`}
                      className="text-xs text-orange-500 hover:underline"
                    >
                      İletişimi Gör
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
