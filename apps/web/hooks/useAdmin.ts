'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// ─── Tipler ──────────────────────────────────────────────────────────────────

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

export interface AdminListing {
  id: string;
  title: string;
  city: string;
  status: string;
  dealType: string;
  createdAt: string;
  owner: { id: string; fullName: string; email: string };
  _count: { offers: number };
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export function useAdminStats() {
  return useQuery<AdminStats>({
    queryKey: ['admin', 'stats'],
    queryFn: () => apiClient('/admin/stats'),
  });
}

// ─── Kullanıcılar ─────────────────────────────────────────────────────────────

export function useAdminUsers(params: {
  page?: number;
  limit?: number;
  status?: string;
  role?: string;
  q?: string;
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
      return apiClient(`/admin/users?${sp.toString()}`);
    },
  });
}

export function useAdminUser(userId: string) {
  return useQuery<AdminUser>({
    queryKey: ['admin', 'users', userId],
    queryFn: () => apiClient(`/admin/users/${userId}`),
    enabled: !!userId,
  });
}

export function useUpdateUserStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      status,
      reason,
      adminNote,
    }: {
      userId: string;
      status: string;
      reason?: string;
      adminNote?: string;
    }) =>
      apiClient(`/admin/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, reason, adminNote }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
      qc.invalidateQueries({ queryKey: ['admin', 'verifications'] });
    },
  });
}

// ─── Doğrulama ────────────────────────────────────────────────────────────────

export function usePendingVerifications() {
  return useQuery<AdminUser[]>({
    queryKey: ['admin', 'verifications', 'pending'],
    queryFn: () => apiClient('/admin/verifications/pending'),
  });
}

export function useReviewVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      action,
      reason,
    }: {
      userId: string;
      action: 'approve' | 'reject';
      reason?: string;
    }) =>
      apiClient(`/admin/verifications/${userId}/review`, {
        method: 'POST',
        body: JSON.stringify({ action, reason }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin'] });
    },
  });
}

// ─── İlanlar ─────────────────────────────────────────────────────────────────

export function useAdminListings(params: { page?: number; limit?: number; status?: string }) {
  return useQuery({
    queryKey: ['admin', 'listings', params],
    queryFn: () => {
      const sp = new URLSearchParams();
      if (params.page) sp.set('page', String(params.page));
      if (params.limit) sp.set('limit', String(params.limit));
      if (params.status) sp.set('status', params.status);
      return apiClient(`/admin/listings?${sp.toString()}`);
    },
  });
}

export function useSetListingStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      listingId,
      status,
      reason,
    }: {
      listingId: string;
      status: string;
      reason?: string;
    }) =>
      apiClient(`/admin/listings/${listingId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, reason }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'listings'] });
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });
}
