import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-100 max-w-6xl mx-auto">
        <span className="text-xl font-bold text-gray-900">müteahitt</span>
        <div className="flex gap-4 items-center">
          <Link href="/listings" className="text-sm text-gray-600 hover:text-gray-900">
            İlanları Gez
          </Link>
          <Link href="/auth/login" className="text-sm text-gray-600 hover:text-gray-900">
            Giriş Yap
          </Link>
          <Link
            href="/auth/register"
            className="text-sm bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
          >
            Kayıt Ol
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
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
      </section>

      {/* Nasıl Çalışır */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Nasıl Çalışır?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'İlan Oluşturun',
                desc: 'Arsanızın bilgilerini, konumunu ve beklentilerinizi girin.',
              },
              {
                step: '2',
                title: 'Teklifler Alın',
                desc: 'Onaylı müteahhitler projenize teklif gönderir, fiyat ve model önerir.',
              },
              {
                step: '3',
                title: 'İletişime Geçin',
                desc: '₺399 karşılığında seçtiğiniz müteahhidin iletişim bilgilerine erişin.',
              },
            ].map((item) => (
              <div key={item.step} className="bg-white rounded-2xl p-8 shadow-sm text-center">
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
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Neden müteahitt?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
                title: 'Güvenli Doğrulama',
                desc: 'TC kimlik ve şirket belgesi doğrulaması',
              },
              {
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                ),
                title: 'Şeffaf Teklif',
                desc: 'Her ilan için birden fazla müteahhit teklif verir',
              },
              {
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                ),
                title: 'Güvenli Ödeme',
                desc: 'İletişim bilgileri sadece anlaşma sonrası açılır',
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

      {/* Footer */}
      <footer className="border-t border-gray-100 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-400">müteahitt © 2026 — Tüm hakları saklıdır.</p>
          <div className="flex gap-6">
            <Link href="/listings" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">İlanlar</Link>
            <Link href="/auth/login" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">Giriş</Link>
            <Link href="/auth/register" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">Kayıt</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
