'use client';

import Link from 'next/link';
import { useState } from 'react';
import MarketingNav from '@/components/MarketingNav';
import MarketingFooter from '@/components/MarketingFooter';

const landownerPlans = [
  {
    name: 'Ücretsiz',
    price: '₺0',
    period: 'daima ücretsiz',
    badge: null,
    features: [
      'Sınırsız ilan oluşturma',
      'Müteahhit tekliflerini alma',
      'Teklif detaylarını inceleme',
      'Müteahhit profillerini görüntüleme',
    ],
    cta: 'Hemen Kayıt Ol',
    href: '/auth/register?type=landowner',
    highlight: false,
  },
  {
    name: 'İletişim Açma',
    price: '₺399',
    period: 'tek seferlik',
    badge: 'En Popüler',
    features: [
      'Seçtiğin müteahhidin telefonu',
      'Seçtiğin müteahhidin e-postası',
      '7 gün iade garantisi',
      'Anlaşma gerçekleşmezse tam iade',
    ],
    cta: 'Hemen Başla',
    href: '/auth/register?type=landowner',
    highlight: true,
  },
  {
    name: 'Premium İlan',
    price: '₺199',
    period: 'aylık',
    badge: null,
    features: [
      'İlanı liste başında göster',
      'Öncelikli görüntülenme',
      '"Öne Çıkan" rozeti',
      'Daha fazla müteahhit teklifi',
    ],
    cta: 'Premium\'a Geç',
    href: '/auth/register?type=landowner',
    highlight: false,
  },
];

const contractorPlans = [
  {
    name: 'Ücretsiz',
    price: '₺0',
    period: 'daima ücretsiz',
    badge: null,
    features: [
      'Ücretsiz kayıt & profil',
      'Sınırsız ilan inceleme',
      'Aylık 5 teklif hakkı',
      'Temel profil sayfası',
    ],
    cta: 'Hemen Kayıt Ol',
    href: '/auth/register?type=contractor',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '₺299',
    period: 'aylık',
    badge: 'Popüler',
    features: [
      'Aylık 20 teklif hakkı',
      '"Pro" profil rozeti',
      'Öncelikli sıralama',
      'İstatistik & analitik panel',
    ],
    cta: 'Pro\'ya Geç',
    href: '/auth/register?type=contractor',
    highlight: true,
  },
  {
    name: 'Kurumsal',
    price: '₺799',
    period: 'aylık',
    badge: null,
    features: [
      'Sınırsız teklif hakkı',
      'Özel hesap yöneticisi',
      'API entegrasyonu',
      'Özel kurumsal rozet & profil',
    ],
    cta: 'Satışla İletişime Geç',
    href: '/contact',
    highlight: false,
  },
];

const pricingFaqs = [
  {
    q: 'Teklif vermek ücretli mi?',
    a: 'Hayır. Müteahhitler için teklif vermek Ücretsiz ve Pro paketlerde belirlenen kotaya kadar ücretsizdir. Kurumsal pakette sınırsızdır.',
  },
  {
    q: 'İade politikası nedir?',
    a: 'Arsa sahipleri için iletişim bilgisi satın alımında 7 gün iade garantisi geçerlidir. Talep etmeniz yeterli, sorgulamaksızın iade edilir.',
  },
  {
    q: 'Paket değişikliği yapabilir miyim?',
    a: 'Evet. Dilediğiniz zaman üst pakete geçebilir veya iptal edebilirsiniz. Yıllık ödeme seçeneğinde %20 indirim uygulanmaktadır.',
  },
];

export default function PricingPage() {
  const [tab, setTab] = useState<'landowner' | 'contractor'>('landowner');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const plans = tab === 'landowner' ? landownerPlans : contractorPlans;

  return (
    <main className="min-h-screen bg-white">
      <MarketingNav />

      {/* Hero */}
      <section className="bg-gradient-to-br from-orange-50 to-white py-20 text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Şeffaf Fiyatlandırma</h1>
          <p className="text-xl text-gray-500">Sürpriz yok, gizli ücret yok. Ne kadar ödeyeceğinizi önceden bilin.</p>
        </div>
      </section>

      {/* Toggle */}
      <section className="pb-4 text-center">
        <div className="inline-flex bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setTab('landowner')}
            className={`px-6 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === 'landowner' ? 'bg-white text-orange-500 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Arsa Sahibi
          </button>
          <button
            onClick={() => setTab('contractor')}
            className={`px-6 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === 'contractor' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Müteahhit
          </button>
        </div>
      </section>

      {/* Plans */}
      <section className="py-12">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl p-8 border-2 flex flex-col ${
                plan.highlight
                  ? 'border-orange-500 bg-orange-50 relative'
                  : 'border-gray-100 bg-white'
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-bold px-4 py-1 rounded-full">
                  {plan.badge}
                </span>
              )}
              <div className="mb-6">
                <p className="text-lg font-bold text-gray-900 mb-2">{plan.name}</p>
                <p className="text-4xl font-bold text-gray-900">{plan.price}</p>
                <p className="text-sm text-gray-400 mt-1">{plan.period}</p>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={plan.href}
                className={`block text-center py-3 rounded-lg font-semibold text-sm transition-colors ${
                  plan.highlight
                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                    : 'bg-gray-900 text-white hover:bg-gray-700'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-10">Sıkça Sorulan Sorular</h2>
          <div className="space-y-3">
            {pricingFaqs.map((faq, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <button
                  className="w-full text-left px-6 py-5 flex items-center justify-between gap-4"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="font-medium text-gray-900">{faq.q}</span>
                  <svg
                    className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5 text-gray-500 text-sm leading-relaxed border-t border-gray-50">
                    <p className="pt-4">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
