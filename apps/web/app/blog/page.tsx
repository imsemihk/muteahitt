import Link from 'next/link';
import MarketingNav from '@/components/MarketingNav';
import MarketingFooter from '@/components/MarketingFooter';

export const posts = [
  {
    slug: 'kat-karsiligi-nedir',
    title: 'Kat Karşılığı Nedir? Arsa Sahipleri İçin Kapsamlı Rehber',
    category: 'Rehber',
    date: '15 Haziran 2026',
    excerpt: 'Kat karşılığı inşaat sözleşmesi, arsa sahibi ile müteahhit arasında imzalanan ve arsanın inşaat karşılığında daire paylaşımıyla el değiştirdiği bir modeldir. Bu rehberde her şeyi bulacaksınız.',
  },
  {
    slug: 'muteahhit-secerken-dikkat',
    title: 'Müteahhit Seçerken Dikkat Edilmesi Gereken 7 Kriter',
    category: 'İpuçları',
    date: '8 Haziran 2026',
    excerpt: 'Güvenilir bir müteahhit bulmak, projenizin başarısı için kritik öneme sahiptir. Yanlış seçim hem maddi hem de zaman kaybına yol açabilir.',
  },
  {
    slug: 'imar-durumu-rehberi',
    title: 'İmar Durumu Nedir? Nasıl Sorgulanır?',
    category: 'Hukuki',
    date: '1 Haziran 2026',
    excerpt: 'İmar durumu belgesi, bir arsanın üzerine ne kadar ve ne tür yapı inşa edilebileceğini belirleyen resmi belgedir. Sorgulama adımlarını anlıyoruz.',
  },
  {
    slug: 'insaat-maliyeti-hesaplama',
    title: '2026 Türkiye İnşaat Maliyeti Hesaplama Rehberi',
    category: 'Finans',
    date: '25 Mayıs 2026',
    excerpt: 'İnşaat maliyeti hesaplamak, proje bütçenizi doğru planlamak için ilk adımdır. Metrekare maliyetleri, işçilik ve malzeme fiyatlarını ele alıyoruz.',
  },
  {
    slug: 'arsa-degerleme',
    title: 'Arsanızın Gerçek Değerini Nasıl Öğrenirsiniz?',
    category: 'Finans',
    date: '18 Mayıs 2026',
    excerpt: 'Arsa değerlemesi, doğru fiyatla ilan açmanın ve müzakere etmenin temelidir. Emsal karşılaştırması, konum analizi ve resmi yöntemlerle değer tespiti.',
  },
  {
    slug: 'sozlesme-maddeleri',
    title: 'İnşaat Sözleşmesinde Olması Gereken 10 Madde',
    category: 'Hukuki',
    date: '10 Mayıs 2026',
    excerpt: 'İnşaat sözleşmesi, arsa sahibi ile müteahhit arasındaki en kritik belgedir. Hangi maddelerin mutlaka yer alması gerektiğini avukat perspektifiyle inceliyoruz.',
  },
];

const categoryColors: Record<string, string> = {
  'Rehber': 'bg-blue-100 text-blue-700',
  'İpuçları': 'bg-green-100 text-green-700',
  'Hukuki': 'bg-purple-100 text-purple-700',
  'Finans': 'bg-yellow-100 text-yellow-700',
};

export default function BlogPage() {
  return (
    <main className="min-h-screen bg-white">
      <MarketingNav />

      {/* Hero */}
      <section className="bg-gradient-to-br from-orange-50 to-white py-20 text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Blog</h1>
          <p className="text-xl text-gray-500">
            İnşaat, gayrimenkul ve kat karşılığı hakkında bilgiye dayalı içerikler.
          </p>
        </div>
      </section>

      {/* Posts grid */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map((post) => (
            <article key={post.slug} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
              {/* Placeholder image */}
              <div className="h-48 bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center">
                <svg className="w-12 h-12 text-orange-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="p-6 flex flex-col flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${categoryColors[post.category] ?? 'bg-gray-100 text-gray-600'}`}>
                    {post.category}
                  </span>
                  <span className="text-xs text-gray-400">{post.date}</span>
                </div>
                <h2 className="font-bold text-gray-900 mb-2 leading-snug">{post.title}</h2>
                <p className="text-sm text-gray-500 leading-relaxed flex-1">{post.excerpt}</p>
                <Link
                  href={`/blog/${post.slug}`}
                  className="mt-4 text-sm font-semibold text-orange-500 hover:text-orange-600 transition-colors inline-flex items-center gap-1"
                >
                  Devamını Oku
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
