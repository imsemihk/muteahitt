'use client';

import Link from 'next/link';
import { useState } from 'react';
import MarketingNav from '@/components/MarketingNav';
import MarketingFooter from '@/components/MarketingFooter';

const faqs = [
  {
    q: 'Platform ücretsiz mi?',
    a: 'Kayıt ve ilan oluşturma tamamen ücretsizdir. Teklif almak ve teklifleri incelemek de ücretsizdir. Sadece beğendiğiniz müteahhidin iletişim bilgilerine erişmek istediğinizde tek seferlik ₺399 ödeme yaparsınız.',
  },
  {
    q: 'Müteahhitler nasıl doğrulanıyor?',
    a: 'Platforma kayıt olan her müteahhit TC kimlik doğrulaması ve şirket belgesi (vergi levhası, ticaret sicil kaydı) kontrolünden geçer. Belgeleri eksik veya sahte olan hesaplar onaylanmaz.',
  },
  {
    q: 'Kaç müteahhitten teklif alabilirim?',
    a: 'Sınırsız. İlanınız aktif olduğu sürece platforma kayıtlı tüm müteahhitler teklif verebilir. Birden fazla teklife ulaşmanız, en iyi anlaşmayı yapmanızı kolaylaştırır.',
  },
  {
    q: 'Kat karşılığı dışında başka model var mı?',
    a: 'Evet. Platformda kat karşılığı, nakit satış, kira geliri modeli ve karma modeller desteklenmektedir. İlanınızı oluştururken tercih ettiğiniz modeli belirtebilir, teklifleri bu kritere göre filtreleyebilirsiniz.',
  },
  {
    q: 'Anlaşma olmazsa ücret iadesi var mı?',
    a: 'Evet, 7 gün iade garantisi sunuyoruz. İletişim bilgisi satın aldığınız tarihten itibaren 7 gün içinde talepte bulunursanız ücretinizi iade ediyoruz.',
  },
];

function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-3xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Sıkça Sorulan Sorular</h2>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <button
                className="w-full text-left px-6 py-5 flex items-center justify-between gap-4"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
              >
                <span className="font-medium text-gray-900">{faq.q}</span>
                <svg
                  className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${openIndex === i ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openIndex === i && (
                <div className="px-6 pb-5 text-gray-500 text-sm leading-relaxed border-t border-gray-50">
                  <p className="pt-4">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      <MarketingNav />

      {/* Hero */}
      <section className="bg-gradient-to-br from-orange-50 to-white">
        <div className="max-w-6xl mx-auto px-6 py-24 text-center">
          <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-6">
            Arsanız için doğru müteahhiti
            <br />
            <span className="text-orange-500">tek platformda bulun</span>
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
            Türkiye'nin inşaat sektörünü dijitalleştiriyoruz. Arsa sahipleri projelerini listeler,
            müteahhitler teklif verir — güvenli, şeffaf, hızlı.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/auth/register?type=landowner"
              className="bg-orange-500 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-orange-600 transition-colors"
            >
              Arsa Sahibiyim
            </Link>
            <Link
              href="/auth/register?type=contractor"
              className="border-2 border-gray-900 text-gray-900 px-8 py-3 rounded-lg text-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Müteahhidim
            </Link>
            <Link
              href="/listings"
              className="border-2 border-orange-500 text-orange-500 px-8 py-3 rounded-lg text-lg font-medium hover:bg-orange-50 transition-colors"
            >
              Arsaları Gez
            </Link>
          </div>
        </div>
      </section>

      {/* Nasıl Çalışır */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">Nasıl Çalışır?</h2>
          <p className="text-center text-gray-500 mb-12 max-w-xl mx-auto">Üç basit adımda projenizi hayata geçirin</p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'İlan Oluşturun',
                desc: 'Arsanızın bilgilerini, konumunu ve beklentilerinizi girin. Kayıt ve ilan ücretsizdir.',
              },
              {
                step: '2',
                title: 'Teklifler Alın',
                desc: 'Onaylı müteahhitler projenize teklif gönderir, fiyat ve model önerir.',
              },
              {
                step: '3',
                title: 'İletişime Geçin',
                desc: '₺399 karşılığında seçtiğiniz müteahhidin iletişim bilgilerine erişin. 7 gün iade garantisi.',
              },
            ].map((item) => (
              <div key={item.step} className="bg-white rounded-2xl p-8 shadow-sm text-center relative">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-orange-500 font-bold text-lg">{item.step}</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Özellikler */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">Neden müteahitt?</h2>
          <p className="text-center text-gray-500 mb-12 max-w-xl mx-auto">Güven, şeffaflık ve hız — birlikte.</p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
                title: 'Güvenli Doğrulama',
                desc: 'TC kimlik ve şirket belgesi doğrulamasından geçmiş müteahhitler.',
              },
              {
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                ),
                title: 'Şeffaf Teklif',
                desc: 'Her ilan için birden fazla müteahhit teklif verir, karşılaştırın.',
              },
              {
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                ),
                title: 'Güvenli Ödeme',
                desc: 'İletişim bilgileri sadece tercih ettiğiniz müteahhit için açılır.',
              },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-2xl p-8 border border-gray-100 text-center">
                <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  {item.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">Kullanıcılarımız Ne Diyor?</h2>
          <p className="text-center text-gray-500 mb-12">Gerçek kullanıcılar, gerçek deneyimler.</p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: 'Kat karşılığı anlaşmam için 8 farklı müteahhitten teklif aldım. Platformu çok pratik buldum.',
                name: 'Ahmet Y.',
                role: 'Arsa Sahibi',
                location: 'Kadıköy, İstanbul',
              },
              {
                quote: 'Artık kapı kapı gezmiyorum. İstanbul\'daki projelere buradan teklif veriyorum ve işimi büyütüyorum.',
                name: 'Mehmet İnşaat A.Ş.',
                role: 'Müteahhit',
                location: 'İstanbul',
              },
              {
                quote: 'Belgeli müteahhitlerle çalışmak güven verdi. 3 ayda anlaşma sağladım, çok memnunum.',
                name: 'Fatma K.',
                role: 'Arsa Sahibi',
                location: 'Çankaya, Ankara',
              },
            ].map((t, i) => (
              <div key={i} className="bg-white rounded-2xl p-8 border border-gray-100">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, s) => (
                    <svg key={s} className="w-4 h-4 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-600 mb-6 leading-relaxed italic">"{t.quote}"</p>
                <div>
                  <p className="font-semibold text-gray-900">{t.name}</p>
                  <p className="text-sm text-gray-400">{t.role} — {t.location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rakamlar */}
      <section className="bg-orange-500 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8 text-center text-white">
            {[
              { value: '500+', label: 'Aktif İlan' },
              { value: '1200+', label: 'Kayıtlı Müteahhit' },
              { value: '₺2.4M+', label: 'İşlem Hacmi' },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-4xl font-bold mb-2">{stat.value}</p>
                <p className="text-orange-100 text-lg">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SSS */}
      <FAQ />

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Projenizi bugün başlatın</h2>
        <p className="text-gray-500 mb-8">Kayıt ücretsiz. Sadece iletişim bilgilerine erişimde ödeme yaparsınız.</p>
        <Link
          href="/auth/register"
          className="bg-orange-500 text-white px-10 py-4 rounded-lg text-lg font-medium hover:bg-orange-600 transition-colors inline-block"
        >
          Ücretsiz Kayıt Ol
        </Link>
      </section>

      <MarketingFooter />
    </main>
  );
}
