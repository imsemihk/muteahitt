'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '../../../../store/auth.store';
import {
  useVerificationStatus,
  useSubmitIndividual,
  useSubmitCompany,
  useUploadVerificationDocument,
  useDeleteVerificationDocument,
} from '../../../../hooks/useProfile';
import { api, ApiError } from '../../../../lib/api-client';

const DOC_TYPE_LABELS: Record<string, string> = {
  TC_KIMLIK_ON: 'TC Kimlik Ön Yüz',
  TC_KIMLIK_ARKA: 'TC Kimlik Arka Yüz',
  PASAPORT: 'Pasaport',
  VERGI_LEVHASI: 'Vergi Levhası',
  TICARET_SICIL: 'Ticaret Sicil Belgesi',
  IMZA_SIRKULERI: 'İmza Sirküleri',
  FAALIYET_BELGESI: 'Faaliyet Belgesi',
  DIGER: 'Diğer',
};

export default function VerificationPage() {
  const { user } = useAuthStore();
  const { data: status, isLoading } = useVerificationStatus();
  const submitIndividual = useSubmitIndividual();
  const submitCompany = useSubmitCompany();
  const uploadDoc = useUploadVerificationDocument();
  const deleteDoc = useDeleteVerificationDocument();

  const [serverError, setServerError] = useState('');
  const [uploading, setUploading] = useState(false);

  const isContractor = user?.role === 'CONTRACTOR';

  const individualForm = useForm<{ tcNumber: string; dateOfBirth: string }>({});
  const companyForm = useForm<{
    companyTitle: string; taxNumber: string; taxOffice: string;
    tradeRegistryNumber: string; authorizedPersonName: string; city: string;
  }>({});

  async function handleIndividualSubmit(data: { tcNumber: string; dateOfBirth: string }) {
    setServerError('');
    try {
      await submitIndividual.mutateAsync(data);
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Bir hata oluştu');
    }
  }

  async function handleCompanySubmit(data: Record<string, string>) {
    setServerError('');
    try {
      await submitCompany.mutateAsync(data);
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Bir hata oluştu');
    }
  }

  async function handleDocumentUpload(file: File, docType: string) {
    setUploading(true);
    setServerError('');
    try {
      const { uploadUrl, key } = await api.post<{ uploadUrl: string; key: string; publicUrl: string }>(
        '/storage/presigned-url',
        { folder: 'documents', contentType: file.type, fileSizeBytes: file.size },
      );

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });
      if (!uploadRes.ok) throw new Error('Yükleme başarısız');

      await uploadDoc.mutateAsync({
        type: docType,
        key,
        fileName: file.name,
        mimeType: file.type,
        fileSizeBytes: file.size,
      });
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Belge yüklenemedi');
    } finally {
      setUploading(false);
    }
  }

  if (isLoading) {
    return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Kimlik Doğrulama</h1>

      {/* Durum banner */}
      {status?.status === 'PENDING_VERIFICATION' && (
        <div className="bg-blue-50 text-blue-700 rounded-2xl px-5 py-4">
          <p className="font-semibold">Belgeleriniz İnceleniyor</p>
          <p className="text-sm mt-0.5 opacity-80">En geç 2 iş günü içinde sonuçlandırılacaktır.</p>
        </div>
      )}

      {status?.status === 'ACTIVE' && (status.individualVerification || status.companyVerification) && (
        <div className="bg-green-50 text-green-700 rounded-2xl px-5 py-4">
          <p className="font-semibold">Hesabınız Doğrulandı ✓</p>
        </div>
      )}

      {/* Bireysel Kimlik Formu */}
      {!status?.individualVerification && !status?.companyVerification && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Bireysel Kimlik Bilgileri</h2>
          <p className="text-sm text-gray-500">TC kimlik numaranız şifreli olarak saklanır, hiçbir zaman açık metin olarak görüntülenmez.</p>

          <form onSubmit={individualForm.handleSubmit(handleIndividualSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">TC Kimlik No</label>
              <input
                {...individualForm.register('tcNumber', { required: true })}
                maxLength={11}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 font-mono tracking-widest"
                placeholder="xxxxxxxxxxx"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Doğum Tarihi</label>
              <input
                {...individualForm.register('dateOfBirth', { required: true })}
                type="date"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            {serverError && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{serverError}</div>}
            <button
              type="submit"
              disabled={submitIndividual.isPending}
              className="w-full py-2.5 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50"
            >
              {submitIndividual.isPending ? 'Kaydediliyor...' : 'Kimlik Bilgilerini Kaydet'}
            </button>
          </form>
        </div>
      )}

      {/* Belge Yükleme */}
      {(status?.individualVerification || status?.companyVerification) && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Belgeler</h2>

          {/* Yüklenmiş belgeler */}
          {status.verificationDocuments.length > 0 && (
            <div className="space-y-2 mb-4">
              {status.verificationDocuments.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {DOC_TYPE_LABELS[doc.type] ?? doc.type}
                    </p>
                    <p className="text-xs text-gray-400">{doc.fileName}</p>
                    {doc.reviewedAt && doc.reviewNote && (
                      <p className="text-xs text-red-500 mt-0.5">Not: {doc.reviewNote}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {doc.reviewedAt ? (
                      <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">İncelendi</span>
                    ) : (
                      <button
                        onClick={() => deleteDoc.mutate(doc.id)}
                        className="text-xs text-red-400 hover:text-red-600"
                      >
                        Sil
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Belge yükleme */}
          <div className="space-y-3">
            {(['TC_KIMLIK_ON', 'TC_KIMLIK_ARKA'] as const).map((docType) => {
              const existing = status.verificationDocuments.find((d) => d.type === docType);
              return (
                <div key={docType}>
                  <label className={`flex items-center justify-between p-3 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${existing ? 'border-green-200 bg-green-50' : 'border-gray-200 hover:border-orange-300'}`}>
                    <span className="text-sm text-gray-600">{DOC_TYPE_LABELS[docType]}</span>
                    {existing ? (
                      <span className="text-xs text-green-600">✓ Yüklendi</span>
                    ) : (
                      <span className="text-xs text-gray-400">Dosya seç</span>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,application/pdf"
                      className="sr-only"
                      disabled={uploading || !!existing}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleDocumentUpload(file, docType);
                      }}
                    />
                  </label>
                </div>
              );
            })}
          </div>

          {serverError && <p className="mt-3 text-xs text-red-500">{serverError}</p>}
          {uploading && <p className="mt-3 text-xs text-gray-400">Yükleniyor...</p>}
        </div>
      )}
    </div>
  );
}
