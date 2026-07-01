'use client';

import { useState } from 'react';
import { useSendAnnouncement } from '@/hooks/useAdmin';

export default function AdminAnnouncementsPage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [feedback, setFeedback] = useState<{ sent?: number; error?: string } | null>(null);

  const send = useSendAnnouncement();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    try {
      const result = await send.mutateAsync({ title, body });
      setFeedback({ sent: (result as any).sent });
      setTitle('');
      setBody('');
    } catch (err: any) {
      setFeedback({ error: err?.message ?? 'Bir hata oluştu.' });
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-bold text-gray-900">Duyuru Gönder</h1>

      <div className="bg-white border rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Başlık</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Duyuru başlığı"
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Metin</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              rows={5}
              placeholder="Duyuru metni..."
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {feedback?.sent != null && (
            <p className="text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 text-sm">
              Duyuru {feedback.sent} kullanıcıya gönderildi.
            </p>
          )}
          {feedback?.error && (
            <p className="text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 text-sm">
              {feedback.error}
            </p>
          )}

          <button
            type="submit"
            disabled={send.isPending || !title.trim() || !body.trim()}
            className="px-5 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium disabled:opacity-40 hover:bg-indigo-700 transition-colors"
          >
            {send.isPending ? 'Gönderiliyor...' : 'Tüm Aktif Kullanıcılara Gönder'}
          </button>
        </form>
      </div>
    </div>
  );
}
