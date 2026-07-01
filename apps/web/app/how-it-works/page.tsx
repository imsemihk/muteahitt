import Link from 'next/link';
import MarketingNav from '@/components/MarketingNav';
import MarketingFooter from '@/components/MarketingFooter';

const landownerSteps = [
  {
    n: '1',
    title: 'Ücretsiz Kayıt & Kimlik Doğrulama',
    desc: 'Ad, soyad ve e-posta ile birkaç dakikada kayıt olun. TC kimlik numaranızla kimliğinizi doğrulayın. Hesabınız anında aktif hale gelir.',
  },
  {
    n: '2',
    title: 'İlan Oluşturun',
    desc: 'Arsanızın konumunu, büyüklüğünü, imar durumunu ve beklentilerinizi girin. Fotoğraf ekleyin, tercih ettiğiniz proje modelini (kat karşılığı, nakit vb.) belirtin.',
  },
  {
    n: '3',
    title: 'Teklifleri İnceleyin',
    desc: 'Platformdaki onaylı müteahhitler ilanınıza teklif gönderir. Her teklifte müteahhitin profili, referansları, önerilen model ve tamamlanma süresi yer alır.',
  },
  {
    n: '4',
    title: 'Beğendiğinizi Seçin, İletişim Bilgisini Alın',
    desc: 'En uygun teklifi seçtikten sonra tek seferlik ₺399 ödeyerek müteahhidin telefon numarasına ve e-postasına ulaşın. 7 gün iade garantisi geçerlidir.',
  },
  {
    n: '5',
    title: 'Görüşün, Sözleşmeyi İmzalayın',
    desc: 'Müteahhitle bizzat görüşün, projenizin detaylarını netleştirin ve noter onaylı sözleşmeyi imzalayarak inşaat sürecini başlatın.',
  },
];

const contractorSteps = [
  {
    n: '1',
    title: 'Ücretsiz Kayıt & Şirket Belgesi Doğrulama',
    desc: 'Şirket bilgileriniz, vergi levhası ve ticaret sicil kaydınızla kayıt olun. Belgeleriniz 24 saat içinde incelenir ve hesabınız onaylanır.',
  },
  {
    n: '2',
    title: 'İlanları Filtreleyin ve İnceleyin',
    desc: 'İstanbul, Ankara veya tüm Türkiye genelinde ilanları konum, büyüklük, imar durumu ve proje modeline göre filtreleyin.',
  },
  {
    n: '3',
    title: 'Beğendiğiniz Projeye Teklif Verin',
    desc: 'İlgilendiğiniz ilana tercih ettiğiniz model, tamamlanma süresi ve detaylı mesajınızla teklif gönderin. Teklif vermek tamamen ücretsizdir.',
  },
  {
    n: '4',
    title: 'Teklif Kabul Edilince Bildirim Alın',
    desc: 'Arsa sahibi teklifinizi seçtiğinde e-posta ve platform bildirimi alırsınız. Artık iletişim bilgilerine arsa sahibi ulaşacaktır.',
  },
  {
    n: '5',
    title: 'Arsa Sahibiyle İletişime Geçin',
    desc: 'Arsa sahibiyle görüşün, projeyi detaylandırın ve sözleşmeyi imzalayarak portföyünüzü büyütün.',
  },
];

const comparison = [
  { feature: 'Kayıt ücreti', landowner: 'Ücretsiz', contractor: 'Ücretsiz' },
  { feature: 'İlan oluşturma', landowner: 'Ücretsiz', contractor: '—' },
  { feature: 'Teklif verme', landowner: '—', contractor: 'Ücretsiz' },
  { feature: 'İletişim bilgisi erişimi', landowner: '₺399 / tek seferlik', contractor: 'Arsa sahibi erişir' },
  { feature: 'Kimlik doğrulama', landowner: 'TC Kimlik', contractor: 'Şirket belgesi + TC Kimlik' },
  { feature: 'İade garantisi', landowner: '7 gün', contractor: '—' },
];

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen bg-white">
      <MarketingNav />

      {/* Hero */}
      <section className="bg-gradient-to-br from-orange-50 to-white py-20 text-center">
        <div className="max-w-3xl mx-auto px-6">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Platform Nasıl Çalışır?</h1>
          <p className="text-xl text-gray-500">
            İster arsa sahibi ister müteahhit olun — doğru adımlarla hedefinize ulaşın.
          </p>
        </div>
      </section>

      {/* Two columns */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-16">
          {/* Arsa Sahibi */}
          <div>
            <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-600 text-sm font-semibold px-4 py-2 rounded-full mb-8">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Arsa Sahibi İçin
            </div>
            <div className="space-y-8">
              {landownerSteps.map((step) => (
                <div key={step.n} className="flex gap-5">
                  <div className="shrink-0 w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-sm">
                    {step.n}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{step.title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Müteahhit */}
          <div>
            <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 text-sm font-semibold px-4 py-2 rounded-full mb-8">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Müteahhit İçin
            </div>
            <div className="space-y-8">
              {contractorSteps.map((step) => (
                <div key={step.n} className="flex gap-5">
                  <div className="shrink-0 w-10 h-10 rounded-full bg-gray-800 text-white flex items-center justify-center font-bold text-sm">
                    {step.n}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{step.title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-10">Karşılaştırma</h2>
          <div className="overflow-x-auto rounded-2xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left px-6 py-4 font-semibold text-gray-700">Özellik</th>
                  <th className="text-center px-6 py-4 font-semibold text-orange-500">Arsa Sahibi</th>
                  <th className="text-center px-6 py-4 font-semibold text-gray-700">Müteahhit</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {comparison.map((row) => (
                  <tr key={row.feature}>
                    <td className="px-6 py-4 text-gray-700">{row.feature}</td>
                    <td className="px-6 py-4 text-center text-gray-600">{row.landowner}</td>
                    <td className="px-6 py-4 text-center text-gray-600">{row.contractor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Hemen Başlayın</h2>
          <p className="text-gray-500 mb-8">Kayıt tamamen ücretsiz. İlk teklifinizi dakikalar içinde alın.</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/auth/register?type=landowner" className="bg-orange-500 text-white px-8 py-3 rounded-lg font-medium hover:bg-orange-600 transition-colors">
              Arsa Sahibiyim
            </Link>
            <Link href="/auth/register?type=contractor" className="border-2 border-gray-900 text-gray-900 px-8 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors">
              Müteahhidim
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
