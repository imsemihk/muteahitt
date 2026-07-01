'use client';
import { useEffect, useRef, useState } from 'react';
import { useUnreadCount, useNotifications, useMarkAsRead, useMarkAllAsRead } from '../hooks/useNotifications';

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: unreadData } = useUnreadCount();
  const { data: notifData } = useNotifications();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const count = unreadData?.count ?? 0;
  const notifications = notifData?.items?.slice(0, 5) ?? [];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 text-gray-500 hover:text-gray-900 transition-colors"
        aria-label="Bildirimler"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {count > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-red-500 rounded-full">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-semibold text-gray-900 text-sm">Bildirimler</span>
            {notifications.length > 0 && (
              <button
                onClick={() => markAllAsRead.mutate()}
                className="text-xs text-orange-500 hover:text-orange-600 transition-colors"
              >
                Tümünü okundu işaretle
              </button>
            )}
          </div>

          <div className="divide-y divide-gray-50">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">Bildirim yok</div>
            ) : (
              notifications.map((n: any) => (
                <button
                  key={n.id}
                  onClick={() => markAsRead.mutate(n.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${!n.readAt ? 'bg-orange-50' : ''}`}
                >
                  <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
                  <p className="text-xs text-gray-400 mt-1">{formatDate(n.createdAt)}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
