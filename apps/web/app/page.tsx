import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-100 max-w-6xl mx-auto">
        <span className="text-xl font-bold text-gray-900">müteahitt</span>
        <div className="flex gap-4">
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
      <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} müteahitt.com — Tüm hakları saklıdır.
      </footer>
    </main>
  );
}
