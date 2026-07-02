'use client';

import { useCallback, useRef, useState } from 'react';
import { api } from '../lib/api-client';

export interface UploadedImage {
  id?: string;
  key: string;
  url: string;
  order: number;
  uploading?: boolean;
  error?: string;
}

interface Props {
  listingId?: string;
  images: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  maxImages?: number;
}

export default function ImageUploader({
  listingId,
  images,
  onChange,
  maxImages = 8,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      const remaining = maxImages - images.length;
      if (remaining <= 0) return;
      const toUpload = files.slice(0, remaining);

      // Add placeholders
      const placeholders: UploadedImage[] = toUpload.map((file, i) => ({
        key: `pending-${Date.now()}-${i}`,
        url: URL.createObjectURL(file),
        order: images.length + i,
        uploading: true,
      }));

      onChange([...images, ...placeholders]);

      const updated = [...images, ...placeholders];

      for (let i = 0; i < toUpload.length; i++) {
        const file = toUpload[i];
        const placeholderKey = placeholders[i].key;

        try {
          // 1. Get presigned URL
          const { uploadUrl, key, publicUrl } = await api.post<{
            uploadUrl: string;
            key: string;
            publicUrl: string;
          }>('/storage/presigned-url', {
            folder: 'listings',
            contentType: file.type,
            fileSizeBytes: file.size,
          });

          // 2. Upload directly to R2
          const uploadRes = await fetch(uploadUrl, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type },
          });

          if (!uploadRes.ok) throw new Error('R2 yükleme başarısız');

          const order = images.length + i;

          // 3. Confirm if listingId is available
          let confirmedId: string | undefined;
          if (listingId) {
            const confirmed = await api.post<{ id: string; url: string; order: number }>(
              '/storage/confirm/listing-image',
              { listingId, key, order },
            );
            confirmedId = confirmed.id;
          }

          // Replace placeholder
          const idx = updated.findIndex((img) => img.key === placeholderKey);
          if (idx !== -1) {
            updated[idx] = {
              id: confirmedId,
              key,
              url: publicUrl,
              order,
              uploading: false,
            };
          }
          onChange([...updated]);
        } catch (err) {
          const idx = updated.findIndex((img) => img.key === placeholderKey);
          if (idx !== -1) {
            updated[idx] = {
              ...updated[idx],
              uploading: false,
              error: err instanceof Error ? err.message : 'Yükleme başarısız',
            };
          }
          onChange([...updated]);
        }
      }
    },
    [images, listingId, maxImages, onChange],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      uploadFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      ['image/jpeg', 'image/png', 'image/webp'].includes(f.type),
    );
    if (files.length) uploadFiles(files);
  };

  const handleDelete = async (img: UploadedImage) => {
    if (img.id) {
      try {
        await api.delete(`/storage/listing-image/${img.id}`);
      } catch {
        // ignore — remove from UI anyway
      }
    }
    onChange(
      images
        .filter((i) => i.key !== img.key)
        .map((i, idx) => ({ ...i, order: idx })),
    );
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {images.map((img) => (
          <div
            key={img.key}
            className={`relative group rounded-xl overflow-hidden aspect-square bg-gray-100 ${
              img.error ? 'border-2 border-red-400' : ''
            }`}
          >
            <img
              src={img.url}
              alt=""
              className={`w-full h-full object-cover ${img.uploading ? 'opacity-50' : ''}`}
            />
            {img.uploading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {img.error && (
              <div className="absolute inset-0 flex items-end p-1">
                <p className="text-xs text-red-600 bg-white/80 rounded px-1 leading-tight">{img.error}</p>
              </div>
            )}
            {!img.uploading && (
              <button
                type="button"
                onClick={() => handleDelete(img)}
                className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-sm hidden group-hover:flex items-center justify-center leading-none"
              >
                ×
              </button>
            )}
          </div>
        ))}

        {/* Add photo card */}
        {images.length < maxImages && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center aspect-square rounded-xl border-2 border-dashed transition-colors ${
              isDragging
                ? 'border-orange-400 bg-orange-50'
                : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50'
            }`}
          >
            <svg
              className="w-7 h-7 text-gray-300 mb-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span className="text-xs text-gray-400">Fotoğraf Ekle</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        onChange={handleInputChange}
      />
    </div>
  );
}
