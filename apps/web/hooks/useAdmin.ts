'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface AdminStats {
  totalUsers: number;
  pendingVerification: number;
  activeListings: number;
  totalPayments: number;
  totalRevenue: number;
}

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: string;
  userType: string;
  status: string;
  rejectionReason?: string;
  adminNote?: string;
  createdAt: string;
  emailVerifiedAt?: string;
  individualVerification?: { id: string; nviVerified: boolean; createdAt: string } | null;
  companyVerification?: { id: string; companyTitle: string; taxNumber: string } | null;
  verificationDocuments: {
    id: string;
    type: string;
    fileName: string;
    fileUrl: string;
    uploadedAt: string;
    reviewedAt?: string;
    reviewNote?: string;
  }[];
  _count: { listings: number; offers: number; payments: number };
}

export function useAdminStats() {
  return useQuery<AdminStats>({
    queryKey: ['admin', 'stats'],
    queryFn: () => api.get<AdminStats>('/admin/stats'),
  });
}

export function useAdminUsers(params: {
  page?: number; limit?: number; status?: string; role?: string; q?: string;
}) {
  return useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: () => {
      const sp = new URLSearchParams();
      if (params.page) sp.set('page', String(params.page));
      if (params.limit) sp.set('limit', String(params.limit));
      if (params.status) sp.set('status', params.status);
      if (params.role) sp.set('role', params.role);
      if (params.q) sp.set('q', params.q);
      return api.get(`/admin/users?${sp.toString()}`);
    },
  });
}

export function useAdminUser(userId: string) {
  return useQuery<AdminUser>({
    queryKey: ['admin', 'users', userId],
    queryFn: () => api.get<AdminUser>(`/admin/users/${userId}`),
    enabled: !!userId,
  });
}

export function useUpdateUserStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, status, reason, adminNote }: {
      userId: string; status: string; reason?: string; adminNote?: string;
    }) => api.patch(`/admin/users/${userId}/status`, { status, reason, adminNote }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin'] });
    },
  });
}

export function usePendingVerifications() {
  return useQuery<AdminUser[]>({
    queryKey: ['admin', 'verifications', 'pending'],
    queryFn: () => api.get<AdminUser[]>('/admin/verifications/pending'),
  });
}

export function useReviewVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, action, reason }: {
      userId: string; action: 'approve' | 'reject'; reason?: string;
    }) => api.post(`/admin/verifications/${userId}/review`, { action, reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin'] });
    },
  });
}

export function useAdminListings(params: { page?: number; limit?: number; status?: string }) {
  return useQuery({
    queryKey: ['admin', 'listings', params],
    queryFn: () => {
      const sp = new URLSearchParams();
      if (params.page) sp.set('page', String(params.page));
      if (params.limit) sp.set('limit', String(params.limit));
      if (params.status) sp.set('status', params.status);
      return api.get(`/admin/listings?${sp.toString()}`);
    },
  });
}

export function useSetListingStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ listingId, status, reason }: {
      listingId: string; status: string; reason?: string;
    }) => api.patch(`/admin/listings/${listingId}/status`, { status, reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin'] });
    },
  });
}

export function useAdminPayments(params: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['admin', 'payments', params],
    queryFn: () => {
      const sp = new URLSearchParams();
      if (params.page) sp.set('page', String(params.page));
      if (params.limit) sp.set('limit', String(params.limit));
      return api.get(`/admin/payments?${sp.toString()}`);
    },
  });
}

export function useAdminPaymentStats() {
  return useQuery({
    queryKey: ['admin', 'payments', 'stats'],
    queryFn: () => api.get('/admin/payments/stats'),
  });
}

export function useDashboardTrends() {
  return useQuery({
    queryKey: ['admin', 'dashboard', 'trends'],
    queryFn: () => api.get('/admin/dashboard/trends'),
  });
}

export function useAuditLogs(params: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['admin', 'audit-logs', params],
    queryFn: () => {
      const sp = new URLSearchParams();
      if (params.page) sp.set('page', String(params.page));
      if (params.limit) sp.set('limit', String(params.limit));
      return api.get(`/admin/audit-logs?${sp.toString()}`);
    },
  });
}

export function useSendAnnouncement() {
  return useMutation({
    mutationFn: ({ title, body }: { title: string; body: string }) =>
      api.post('/admin/announcements', { title, body }),
  });
}
