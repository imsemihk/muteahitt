'use client';

import { use, useEffect, useRef, useState } from 'react';
import { useUnlockedContact, useInitiatePayment } from '../../../../../hooks/usePayments';
import { ApiError } from '../../../../../lib/api-client';
import { v4 as uuidv4 } from 'uuid';

export default function UnlockContactPage({ params }: { params: Promise<{ offerId: string }> }) {
  const { offerId } = use(params);

  // Önce bu offer için daha önce ödeme yapılmış mı kontrol et
  const { data: existing, isLoading: checking } = useUnlockedContact(offerId);

  if (checking) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (existing) {
    return <ContactCard contact={existing} />;
  }

  return <PaymentFlow offerId={offerId} />;
}

// ─── Ödeme daha önce yapılmışsa doğrudan iletişim bilgisini göster ────────────
function ContactCard({ contact }: { contact: { fullName: string; email: string; phone: string; unlockedAt: string } }) {
  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold text-gray-900 mb-6">İletişim Bilgileri</h1>
      <div className="bg-white rounded-2xl border border-gray-100 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-900">İletişim Açık</p>
            <p className="text-xs text-gray-400">
              {new Date(contact.unlockedAt).toLocaleDateString('tr-TR')} tarihinde açıldı
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-500 mb-1">Ad Soyad</p>
            <p className="font-semibold text-gray-900">{contact.fullName}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-500 mb-1">Telefon</p>
            <a href={`tel:${contact.phone}`} className="font-semibold text-orange-500 hover:underline">
              {contact.phone}
            </a>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-500 mb-1">E-posta</p>
            <a href={`mailto:${contact.email}`} className="font-semibold text-orange-500 hover:underline">
              {contact.email}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Ödeme akışı ──────────────────────────────────────────────────────────────
function PaymentFlow({ offerId }: { offerId: string }) {
  const [step, setStep] = useState<'confirm' | 'checkout' | 'done'>('confirm');
  const [checkoutHtml, setCheckoutHtml] = useState('');
  const [error, setError] = useState('');
  const formRef = useRef<HTMLDivElement>(null);
  const initiate = useInitiatePayment();

  async function handlePay() {
    setError('');
    const conversationId = uuidv4();
    try {
      const result = await initiate.mutateAsync({ offerId, conversationId });
      setCheckoutHtml(result.checkoutFormContent);
      setStep('checkout');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ödeme başlatılamadı');
    }
  }

  // Iyzico checkout form HTML enjekte edilince script'leri çalıştır
  useEffect(() => {
    if (step !== 'checkout' || !checkoutHtml || !formRef.current) return;

    formRef.current.innerHTML = checkoutHtml;

    // Iyzico form içindeki script tag'larını çalıştır
    formRef.current.querySelectorAll('script').forEach((oldScript) => {
      const newScript = document.createElement('script');
      Array.from(oldScript.attributes).forEach((attr) => newScript.setAttribute(attr.name, attr.value));
      newScript.textContent = oldScript.textContent;
      oldScript.parentNode?.replaceChild(newScript, oldScript);
    });
  }, [step, checkoutHtml]);

  if (step === 'confirm') {
    return (
      <div className="max-w-lg">
        <h1 className="text-xl font-bold text-gray-900 mb-6">İletişim Bilgilerini Aç</h1>

        <div className="bg-white rounded-2xl border border-gray-100 p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-gray-900">₺399</p>
            <p className="text-sm text-gray-500 mt-1">Tek seferlik iletişim kilidi açma</p>
          </div>

          <ul className="space-y-3 mb-8 text-sm text-gray-600">
            {[
              'Müteahhidin telefon numarasına erişim',
              'E-posta adresiyle doğrudan iletişim',
              'Ödeme güvenceli — 256-bit SSL şifreli',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {item}
              </li>
            ))}
          </ul>

          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg mb-4">{error}</div>
          )}

          <button
            onClick={handlePay}
            disabled={initiate.isPending}
            className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 disabled:opacity-50 transition-colors"
          >
            {initiate.isPending ? 'Ödeme başlatılıyor...' : 'Güvenli Ödeme Yap →'}
          </button>

          <p className="mt-4 text-center text-xs text-gray-400">
            Iyzico altyapısıyla güvenli ödeme
          </p>
        </div>
      </div>
    );
  }

  if (step === 'checkout') {
    return (
      <div className="max-w-lg">
        <h1 className="text-xl font-bold text-gray-900 mb-6">Ödeme</h1>
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div ref={formRef} />
        </div>
      </div>
    );
  }

  return null;
}
