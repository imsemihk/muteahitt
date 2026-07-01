import Link from 'next/link';

export default function VerifyEmailSentPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">E-postanızı kontrol edin</h1>
          <p className="text-gray-500 mb-8">
            Kayıt olduğunuz adrese doğrulama bağlantısı gönderdik. Bağlantı 24 saat geçerlidir.
          </p>
          <Link href="/auth/login" className="text-orange-500 hover:underline text-sm">
            Giriş sayfasına dön
          </Link>
        </div>
      </div>
    </div>
  );
}
