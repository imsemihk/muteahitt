'use client';

import { useState } from 'react';
import MarketingNav from '@/components/MarketingNav';
import MarketingFooter from '@/components/MarketingFooter';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log('Contact form submitted:', form);
    setSubmitted(true);
  }

  return (
    <main className="min-h-screen bg-white">
      <MarketingNav />

      {/* Hero */}
      <section className="bg-gradient-to-br from-orange-50 to-white py-20 text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">İletişim</h1>
          <p className="text-xl text-gray-500">Sorularınız için buradayız. Genellikle 24 saat içinde yanıt veririz.</p>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-2 gap-16">
          {/* Info */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-8">Bize Ulaşın</h2>
            <div className="space-y-6">
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 mb-0.5">E-posta</p>
                  <a href="mailto:destek@muteahitt.com" className="text-gray-500 hover:text-orange-500 transition-colors">destek@muteahitt.com</a>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 mb-0.5">Telefon</p>
                  <p className="text-gray-500">Yakında aktif olacak</p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 mb-0.5">Konum</p>
                  <p className="text-gray-500">İstanbul, Türkiye</p>
                </div>
              </div>
            </div>

            <div className="mt-10 bg-orange-50 rounded-2xl p-6">
              <p className="font-semibold text-gray-900 mb-2">Destek saatleri</p>
              <p className="text-sm text-gray-500">Pazartesi – Cuma: 09:00 – 18:00</p>
              <p className="text-sm text-gray-500">Cumartesi: 10:00 – 14:00</p>
              <p className="text-sm text-gray-400 mt-2">Ortalama yanıt süresi: &lt; 4 saat</p>
            </div>
          </div>

          {/* Form */}
          <div>
            {submitted ? (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Mesajınız Alındı!</h3>
                <p className="text-gray-500">En kısa sürede size dönüş yapacağız. Teşekkürler!</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">Ad Soyad</label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Adınız Soyadınız"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">E-posta</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={handleChange}
                    placeholder="ornek@email.com"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
                  />
                </div>
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1.5">Konu</label>
                  <select
                    id="subject"
                    name="subject"
                    required
                    value={form.subject}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition bg-white"
                  >
                    <option value="">Konu seçin</option>
                    <option value="destek">Teknik Destek</option>
                    <option value="hesap">Hesap Sorusu</option>
                    <option value="odeme">Ödeme / Fatura</option>
                    <option value="oneri">Öneri</option>
                    <option value="diger">Diğer</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1.5">Mesaj</label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={5}
                    value={form.message}
                    onChange={handleChange}
                    placeholder="Mesajınızı buraya yazın..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition resize-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors"
                >
                  Gönder
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
