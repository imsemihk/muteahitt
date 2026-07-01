import { notFound } from 'next/navigation';
import Link from 'next/link';
import MarketingNav from '@/components/MarketingNav';
import MarketingFooter from '@/components/MarketingFooter';
import { posts } from '../posts-data';

const categoryColors: Record<string, string> = {
  'Rehber': 'bg-blue-100 text-blue-700',
  'İpuçları': 'bg-green-100 text-green-700',
  'Hukuki': 'bg-purple-100 text-purple-700',
  'Finans': 'bg-yellow-100 text-yellow-700',
};

const contents: Record<string, string> = {
  'kat-karsiligi-nedir': `
Kat karşılığı inşaat sözleşmesi, Türkiye'de en yaygın kullanılan gayrimenkul geliştirme modellerinden biridir. Bu modelde arsa sahibi arsasını müteahhide inşaat yapması için tahsis eder; müteahhit ise inşaat tamamlandıktan sonra arsa sahibine önceden kararlaştırılan sayıda daire ya da bağımsız bölüm verir.

**Nasıl Çalışır?**

Arsa sahibi arsayı vermektedir, müteahhit ise tüm inşaat maliyetini karşılamaktadır. İnşaat tamamlandığında daireler önceden belirlenen oranlarda paylaşılır. Tipik bir oran %40 arsa sahibi, %60 müteahhit şeklindedir ancak bu oran arsanın konumuna, imar durumuna ve piyasa koşullarına göre değişir.

**Avantajları Nelerdir?**

Arsa sahibi herhangi bir nakit ödeme yapmadan yeni dairelere kavuşur. Müteahhit ise arsa bedeli ödemeden inşaat yapabilir. Her iki taraf için de finansal yük önemli ölçüde azalır. İstanbul ve Ankara gibi büyük şehirlerde arsa değerlerinin yüksek olduğu bölgelerde bu model özellikle cazip hale gelir.

**Dikkat Edilmesi Gerekenler**

Sözleşme en önemli adımdır. Teslim tarihi, daire paylaşım oranları, cezai şartlar ve inşaatın standartları sözleşmede net biçimde belirtilmelidir. Müteahhitin mali gücü, referansları ve önceki projeleri mutlaka araştırılmalıdır. Sözleşme noterde onaylatılmalı ve hukuki danışmanlık alınmalıdır.

**müteahitt'te Kat Karşılığı**

Platformumuzda kat karşılığı ilanı açabilir, onlarca doğrulanmış müteahhitten teklif alabilirsiniz. Her teklif müteahhitin önerdiği oran, tamamlanma süresi ve mesajını içerir. Böylece bilinçli bir karar vermeniz kolaylaşır.
  `.trim(),

  'muteahhit-secerken-dikkat': `
Bir arsa için müteahhit seçmek, hayatınızın en önemli kararlarından biri olabilir. Yanlış bir seçim hem büyük mali kayba hem de yıllarca süren hukuki sorunlara yol açabilir. İşte dikkat etmeniz gereken 7 kriter:

**1. Lisans ve Belgeler**

Müteahhitin vergi levhası, ticaret sicil kaydı ve inşaat lisansı güncel ve eksiksiz olmalıdır. müteahitt platformundaki tüm müteahhitler belge doğrulamasından geçmektedir.

**2. Referanslar ve Geçmiş Projeler**

Bizzat tamamlanmış projeleri ziyaret edin. Daha önce çalıştığı arsa sahipleriyle iletişime geçin. Geçmiş projelerden alacağınız gerçek geri bildirimler, reklamlardan çok daha değerlidir.

**3. Mali Güç**

Müteahhitin projenizi finansal olarak tamamlayabilecek kapasitede olması şarttır. Yarım kalan inşaatlar arsa sahipleri için en büyük kabustur. Bankalarla ilişkisi ve kredi geçmişi sorgulanabilir.

**4. Teklif Detayları**

Sunulan teklifin detaylı olması gerekir: kullanılacak malzeme standartları, işçilik kalitesi, teslim takvimi. Sadece oran değil, tüm şartlar net olmalıdır.

**5. Sözleşme Hassasiyeti**

Profesyonel müteahhitler kapsamlı ve net sözleşme yazmaktan çekinmez. Sözleşmede her şeyin yazılı olmasını isteyen bir müteahhit güvenilirliğin işaretidir.

**6. İletişim Kalitesi**

Görüşme sürecinde ne kadar şeffaf ve düzenli iletişim kurduğu, inşaat sürecindeki iletişim kalitesinin habercisidir. Sorularınıza hızlı, net yanıt veren müteahhitleri tercih edin.

**7. Sigorta Kapsamı**

Şantiye sigortası, işçi sigortası ve yapı denetim süreci müteahhitin sorumluluğundadır. Bu konularda açık ve eksiksiz bilgi paylaşan müteahhitleri değerlendirmeye alın.
  `.trim(),

  'imar-durumu-rehberi': `
İmar durumu, bir taşınmaz üzerinde hangi tür yapılaşmanın mümkün olduğunu gösteren resmi belgedir. Arsa sahipleri için en temel belgelerden biridir çünkü projenin fizibiletisini doğrudan belirler.

**İmar Durumu Belgesi Nedir?**

Belediyeler tarafından düzenlenen bu belge; TAKS (Taban Alanı Kat Sayısı), KAKS/Emsal (Kat Alanı Kat Sayısı), kat adedi sınırı, yapı nizamı (bitişik, ayrık, ikiz vb.) ve çekme mesafelerini içerir.

**Nasıl Sorgulanır?**

Tapu ve Kadastro Müdürlüğü'nden ya da ilgili belediyenin imar müdürlüğünden talep edilebilir. Pek çok büyükşehir belediyesi artık online imar durumu sorgulama hizmeti sunmaktadır. İstanbul için İBB'nin e-İmar portalı, Ankara için ABB'nin ilgili sistemi kullanılabilir.

**Emsal Hesabı**

Emsal 2.0 olan 500 m² bir arsada toplam 1.000 m² inşaat yapılabilir. Bu alan kat adedi ve yapı bölünmesine göre dağıtılır. Emsal değeri ne kadar yüksekse, arsanın inşaat potansiyeli o kadar fazladır.

**Neden Önemlidir?**

Müteahhitler kat karşılığı teklif verirken imar durumuna bakarak proje gelirini hesaplar. Yüksek emsal = daha fazla daire = daha cazip oran. İmar durumunu bilmeden ilan açmak, düşük teklifler almanıza neden olabilir.

**İpucu**

müteahitt'te ilan oluştururken imar durumu belgesi yüklemeniz, müteahhitlerin size daha isabetli teklifler vermesini sağlar.
  `.trim(),

  'insaat-maliyeti-hesaplama': `
2026 yılında Türkiye'de inşaat maliyetleri önceki yıllara göre istikrar kazanmaya başlamış olsa da bölgeden bölgeye ve yapı tipine göre önemli farklılıklar sürmektedir.

**Kaba İnşaat Maliyeti**

2026 itibarıyla Türkiye geneli ortalama kaba inşaat maliyeti metrekare başına 8.000–12.000 TL arasında seyretmektedir. İstanbul'da bu rakam 10.000–15.000 TL'ye kadar çıkabilmektedir.

**İnce İşler ve Donanım**

Mutfak, banyo, zemin kaplamaları ve elektrik/tesisat gibi ince işler, inşaat tipine ve kalite standardına göre m² başına 5.000–10.000 TL ek maliyet oluşturabilir.

**Katlar ve Yapı Tipi**

Bodrum, zemin ve çatı katları standart katlardan daha maliyetlidir. Çelik konstrüksiyon yapılar betonarmeye göre genellikle %15–20 daha pahalıdır ancak süre avantajı sağlar.

**Proje ve Müşavirlik Giderleri**

Mimarlık projesi, statik proje, mekanik ve elektrik projeleri ile yapı denetim ücretleri toplam maliyet içinde %5–10 paya sahiptir. Bu gider kalemi genellikle müteahhit tarafından karşılanır.

**Kat Karşılığı Hesabı**

Müteahhitler teklif oluştururken m² birim maliyeti, toplam inşaat alanı ve öngörülen satış fiyatını baz alır. Arsa sahibine verilecek oran bu hesaplamanın çıktısıdır. Piyasayı bilen bir arsa sahibi için bu hesaplamayı anlamak, müzakerelerde güçlü bir koz sağlar.
  `.trim(),

  'arsa-degerleme': `
Arsanızın gerçek piyasa değerini bilmek, hem doğru fiyatla ilan açmak hem de müteahhit tekliflerini değerlendirmek için kritik öneme sahiptir.

**Emsal Karşılaştırma Yöntemi**

En yaygın kullanılan yöntem, yakın çevredeki benzer arsaların satış fiyatlarını karşılaştırmaktır. Tapu müdürlükleri, Tapu ve Kadastro Genel Müdürlüğü'nün TKGM uygulaması ve gayrimenkul portalları bu veriler için başvurulacak kaynaklardır.

**Emsal ve Konum Etkisi**

Aynı mahallede bile emsal farkı değeri önemli ölçüde etkiler. Ulaşım akslarına yakınlık, okul, hastane gibi sosyal donatılara erişim ve manzara gibi faktörler de fiyatı belirler.

**Resmi Değerleme**

SPK lisanslı gayrimenkul değerleme uzmanından değerleme raporu almak, en güvenilir yöntemdir. Bu rapor banka kredi başvurularında da kabul görmektedir.

**Tapu Değeri ve Piyasa Değeri**

Resmi tapu değeri (beyan edilen değer) ile gerçek piyasa değeri arasında önemli farklar olabilir. Müteahhitler hesaplamalarında piyasa değerini esas alır.

**müteahitt'te Değerleme Avantajı**

Platformumuzda ilan açtığınızda birden fazla müteahhitten teklif alırsınız. Bu tekliflerin ortalaması, arsanızın piyasadaki yerini anlamanızı sağlar. Çok düşük ya da yüksek teklifler, piyasanın sizi nasıl değerlendirdiğinin somut göstergesidir.
  `.trim(),

  'sozlesme-maddeleri': `
İnşaat sözleşmesi, arsa sahibi ile müteahhit arasındaki ilişkinin tüm hukuki zeminini oluşturur. Eksik ya da muğlak bir sözleşme ileride ciddi anlaşmazlıklara yol açabilir. İşte mutlaka olması gereken 10 madde:

**1. Tarafların Tam Kimlik Bilgileri**
TC kimlik no, vergi kimlik no, şirket unvanı ve ticaret sicil numaraları eksiksiz yer almalıdır.

**2. Arsa ve Projenin Tanımı**
Parsel no, ada no, yüzölçümü ve üzerinde yapılacak projenin mimari planına atıf bulunmalıdır.

**3. Kat Karşılığı Oranları**
Hangi dairelerin kime ait olacağı, kat ve blok ayrımı dahil tüm bağımsız bölümler tek tek listelenmeli; bölme-makas varsa açıkça belirtilmelidir.

**4. İnşaat Süresi ve Teslim Tarihi**
Ruhsat alım tarihi, inşaata başlama tarihi ve teslim tarihi net olarak yazılmalıdır.

**5. Gecikme Cezası**
Her gecikme günü için uygulanacak cezai şart miktarı belirlenmelidir. Bu madde müteahhiti hızlı tamamlamaya teşvik eder.

**6. İnşaat Kalite Standartları**
Kullanılacak malzemelerin markası, özellikleri ve uygulama standartları ekte teknik şartname olarak yer almalıdır.

**7. Ödeme Planı (Varsa)**
Müteahhite yapılacak ara ödemeler, taksit tarihleri ve koşulları belirlenmelidir.

**8. Temerrüt Halleri**
Her iki tarafın yükümlülüklerini yerine getirmemesi halinde uygulanacak yaptırımlar açıkça tanımlanmalıdır.

**9. Sigorta Yükümlülükleri**
Şantiye all-risk sigortası ve DASK zorunluluğu müteahhit tarafından karşılanmalıdır.

**10. Uyuşmazlık Çözümü**
Anlaşmazlık halinde başvurulacak arabuluculuk ya da mahkeme (hangi adliye) belirlenmeli, tahkim şartı değerlendirilmelidir.
  `.trim(),
};

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = posts.find((p) => p.slug === params.slug);
  if (!post) notFound();

  const related = posts.filter((p) => p.slug !== params.slug).slice(0, 3);
  const content = contents[params.slug] ?? '';

  return (
    <main className="min-h-screen bg-white">
      <MarketingNav />

      <article className="max-w-3xl mx-auto px-6 py-16">
        {/* Meta */}
        <div className="flex items-center gap-3 mb-6">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${categoryColors[post.category] ?? 'bg-gray-100 text-gray-600'}`}>
            {post.category}
          </span>
          <span className="text-sm text-gray-400">{post.date}</span>
          <span className="text-sm text-gray-400">·</span>
          <span className="text-sm text-gray-400">müteahitt Editörü</span>
        </div>

        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 leading-tight">{post.title}</h1>

        {/* Placeholder image */}
        <div className="h-64 bg-gradient-to-br from-orange-100 to-orange-50 rounded-2xl flex items-center justify-center mb-10">
          <svg className="w-16 h-16 text-orange-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>

        {/* Content */}
        <div className="prose prose-gray max-w-none">
          {content.split('\n\n').map((para, i) => {
            if (para.startsWith('**') && para.endsWith('**')) {
              return <h2 key={i} className="text-xl font-bold text-gray-900 mt-8 mb-3">{para.replace(/\*\*/g, '')}</h2>;
            }
            if (para.includes('**')) {
              const parts = para.split(/\*\*(.+?)\*\*/g);
              return (
                <p key={i} className="text-gray-600 leading-relaxed mb-4">
                  {parts.map((part, j) => j % 2 === 1 ? <strong key={j} className="text-gray-900">{part}</strong> : part)}
                </p>
              );
            }
            return <p key={i} className="text-gray-600 leading-relaxed mb-4">{para}</p>;
          })}
        </div>
      </article>

      {/* CTA */}
      <section className="bg-orange-50 py-14 text-center">
        <div className="max-w-xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Platforma Katılın</h2>
          <p className="text-gray-500 mb-6">Ücretsiz kayıt olun, hemen teklif almaya başlayın.</p>
          <Link href="/auth/register" className="bg-orange-500 text-white px-8 py-3 rounded-lg font-medium hover:bg-orange-600 transition-colors inline-block">
            Ücretsiz Kayıt Ol
          </Link>
        </div>
      </section>

      {/* Related posts */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">İlgili Yazılar</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {related.map((rp) => (
              <article key={rp.slug} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                <div className="h-36 bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center">
                  <svg className="w-8 h-8 text-orange-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="p-5">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${categoryColors[rp.category] ?? 'bg-gray-100 text-gray-600'}`}>
                    {rp.category}
                  </span>
                  <h3 className="font-semibold text-gray-900 mt-2 mb-2 leading-snug text-sm">{rp.title}</h3>
                  <Link href={`/blog/${rp.slug}`} className="text-xs font-semibold text-orange-500 hover:text-orange-600 transition-colors">
                    Devamını Oku →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
