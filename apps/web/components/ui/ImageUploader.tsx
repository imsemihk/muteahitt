'use client';

import { useCallback, useState } from 'react';
import { api, ApiError } from '../../lib/api-client';

interface UploadedImage {
  id: string;
  url: string;
  order: number;
}

interface Props {
  listingId: string;
  existingImages?: UploadedImage[];
  onUpload?: (image: UploadedImage) => void;
  onDelete?: (imageId: string) => void;
  maxImages?: number;
}

export default function ImageUploader({
  listingId,
  existingImages = [],
  onUpload,
  onDelete,
  maxImages = 10,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      if (existingImages.length >= maxImages) {
        setError(`En fazla ${maxImages} görsel yükleyebilirsiniz`);
        return;
      }

      setError('');
      setUploading(true);

      for (const file of Array.from(files)) {
        try {
          // 1. Presigned URL al
          const { uploadUrl, key, publicUrl } = await api.post<{
            uploadUrl: string;
            key: string;
            publicUrl: string;
          }>('/storage/presigned-url', {
            folder: 'listings',
            contentType: file.type,
            fileSizeBytes: file.size,
          });

          // 2. Doğrudan R2'ye PUT
          const uploadRes = await fetch(uploadUrl, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type },
          });

          if (!uploadRes.ok) throw new Error('R2 yükleme başarısız');

          // 3. API'ye onayla
          const image = await api.post<UploadedImage>('/storage/confirm/listing-image', {
            listingId,
            key,
            order: existingImages.length,
          });

          onUpload?.(image);
        } catch (err) {
          setError(err instanceof ApiError ? err.message : 'Yükleme başarısız');
          break;
        }
      }

      setUploading(false);
    },
    [listingId, existingImages.length, maxImages, onUpload],
  );

  const handleDelete = async (imageId: string) => {
    try {
      await api.delete(`/storage/listing-image/${imageId}`);
      onDelete?.(imageId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Silme başarısız');
    }
  };

  return (
    <div className="space-y-3">
      {/* Mevcut görseller */}
      {existingImages.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {existingImages.map((img) => (
            <div key={img.id} className="relative group rounded-xl overflow-hidden aspect-square bg-gray-100">
              <img src={img.url} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => handleDelete(img.id)}
                className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs hidden group-hover:flex items-center justify-center leading-none"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Yükleme alanı */}
      {existingImages.length < maxImages && (
        <label
          className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors ${
            uploading
              ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
              : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50'
          }`}
        >
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            disabled={uploading}
            onChange={(e) => handleFiles(e.target.files)}
          />
          {uploading ? (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
              Yükleniyor...
            </div>
          ) : (
            <>
              <svg className="w-8 h-8 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm text-gray-400">
                Görsel yüklemek için tıklayın veya sürükleyin
              </p>
              <p className="text-xs text-gray-300 mt-1">JPEG, PNG, WebP · Maks. 10 MB</p>
            </>
          )}
        </label>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
