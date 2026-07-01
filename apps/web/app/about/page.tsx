import Link from 'next/link';
import MarketingNav from '@/components/MarketingNav';
import MarketingFooter from '@/components/MarketingFooter';

const values = [
  {
    title: 'Güven',
    desc: 'Her müteahhit kimlik ve belge doğrulamasından geçer. Arsa sahipleri yalnızca doğrulanmış, şeffaf profillerle karşılaşır.',
    icon: (
      <svg className="w-7 h-7 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    title: 'Şeffaflık',
    desc: 'Fiyatlandırmada, süreçlerde ve iletişimde sürpriz yoktur. Kullanıcılar her adımda tam bilgiye sahip olur.',
    icon: (
      <svg className="w-7 h-7 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
  },
  {
    title: 'Verimlilik',
    desc: 'Aylar süren kapı kapı arayışı yerine dakikalar içinde onlarca teklif. İnşaat sektöründe zamanın değerini biliyoruz.',
    icon: (
      <svg className="w-7 h-7 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
];

const team = [
  {
    name: 'Kerem Arslan',
    role: 'Kurucu & CEO',
    bio: 'İnşaat mühendisliği ve girişimcilik geçmişiyle müteahitt\'i kurdu. 10 yıl sektör deneyimi.',
    initials: 'KA',
  },
  {
    name: 'Deniz Yılmaz',
    role: 'Kurucu & CTO',
    bio: 'Yazılım mimarisi ve ürün geliştirme uzmanı. Öncesinde iki teknoloji şirketinde teknik liderlik.',
    initials: 'DY',
  },
  {
    name: 'Selin Kaya',
    role: 'Pazarlama Direktörü',
    bio: 'Gayrimenkul ve fintech sektörlerinde 8 yıllık büyüme pazarlaması deneyimi.',
    initials: 'SK',
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white">
      <MarketingNav />

      {/* Hero */}
      <section className="bg-gradient-to-br from-orange-50 to-white py-24 text-center">
        <div className="max-w-3xl mx-auto px-6">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Türkiye'nin inşaat sektörünü dijitalleştiriyoruz
          </h1>
          <p className="text-xl text-gray-500 leading-relaxed">
            Arsa sahiplerini güvenilir müteahhitlerle buluşturan, şeffaf ve verimli bir platform inşa ediyoruz.
            Hedefimiz, Türkiye genelinde her inşaat projesinin doğru ortakla başlamasını sağlamak.
          </p>
        </div>
      </section>

      {/* Misyon */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Misyonumuz</h2>
            <p className="text-gray-500 leading-relaxed mb-4">
              Türkiye'de milyonlarca arsa sahibi, güvenilir bir müteahhit bulmak için yıllarca çevresine sorar, sosyal medyada arar,
              tanıdık vasıtasıyla kapı kapı dolaşır. Bu süreç hem zaman hem para kaybı yaratır, üstelik güven sorunlarını çözmez.
            </p>
            <p className="text-gray-500 leading-relaxed">
              müteahitt, bu kopukluğu ortadan kaldırmak için kuruldu. Kimlik ve belge doğrulamasından geçmiş müteahhitleri,
              projelerini duyurmak isteyen arsa sahipleriyle güvenli bir dijital ortamda buluşturuyoruz.
            </p>
          </div>
          <div className="bg-orange-50 rounded-2xl p-8">
            <div className="space-y-4">
              {[
                { label: '500+', desc: 'Aktif İlan' },
                { label: '1.200+', desc: 'Doğrulanmış Müteahhit' },
                { label: '81', desc: 'İlde Hizmet' },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-4">
                  <span className="text-3xl font-bold text-orange-500 w-24 shrink-0">{s.label}</span>
                  <span className="text-gray-600">{s.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Kurucu hikayesi */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Hikayemiz</h2>
          <div className="bg-white rounded-2xl p-8 border border-gray-100">
            <svg className="w-8 h-8 text-orange-200 mb-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
            </svg>
            <p className="text-gray-600 leading-relaxed mb-4">
              müteahitt, 2024 yılında İstanbul'da bir arsa sahibinin güvenilir müteahhit bulmaktaki zorluğunu bizzat yaşamasından doğdu.
              Kurucu Kerem Arslan, ailesinin Kadıköy'deki arsası için 6 ay boyunca müteahhit aradı; onlarca görüşme yaptı,
              sahte referanslarla karşılaştı, sözleşme sürecinde hayal kırıklıkları yaşadı.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Bu deneyim onu harekete geçirdi. Teknoloji geçmişine sahip ortağı Deniz Yılmaz ile birlikte 2024 sonunda
              müteahitt'in ilk versiyonunu geliştirdiler. Platform, bugün Türkiye genelinde yüzlerce başarılı
              arsa-müteahhit eşleşmesine aracılık ediyor.
            </p>
          </div>
        </div>
      </section>

      {/* Değerler */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-12">Değerlerimiz</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {values.map((v) => (
              <div key={v.title} className="bg-white rounded-2xl p-8 border border-gray-100 text-center">
                <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  {v.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{v.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ekip */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-12">Ekibimiz</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {team.map((m) => (
              <div key={m.name} className="bg-white rounded-2xl p-8 border border-gray-100 text-center">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-orange-600 font-bold text-lg">{m.initials}</span>
                </div>
                <p className="font-semibold text-gray-900 mb-1">{m.name}</p>
                <p className="text-sm text-orange-500 font-medium mb-3">{m.role}</p>
                <p className="text-sm text-gray-500 leading-relaxed">{m.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Platforma Katılın</h2>
          <p className="text-gray-500 mb-8">Türkiye'nin inşaat dönüşümünün parçası olun.</p>
          <Link
            href="/auth/register"
            className="bg-orange-500 text-white px-10 py-4 rounded-lg text-lg font-medium hover:bg-orange-600 transition-colors inline-block"
          >
            Ücretsiz Kayıt Ol
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
