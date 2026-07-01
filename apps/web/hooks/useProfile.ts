'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';

interface VerificationStatus {
  status: string;
  rejectionReason?: string;
  individualVerification?: { id: string; nviVerified: boolean; createdAt: string } | null;
  companyVerification?: { id: string; companyTitle: string; taxNumber: string } | null;
  verificationDocuments: Array<{
    id: string;
    type: string;
    fileName: string;
    uploadedAt: string;
    reviewedAt?: string;
    reviewNote?: string;
  }>;
}

interface Profile {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  avatarUrl?: string;
  role: string;
  userType: string;
  status: string;
  emailVerifiedAt?: string;
}

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: () => api.get<Profile>('/users/me'),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Profile>) => api.patch<Profile>('/users/me', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile'] }),
  });
}

export function useVerificationStatus() {
  return useQuery({
    queryKey: ['verification-status'],
    queryFn: () => api.get<VerificationStatus>('/verification/status'),
  });
}

export function useSubmitIndividual() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { tcNumber: string; dateOfBirth: string }) =>
      api.post('/verification/individual', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['verification-status'] }),
  });
}

export function useSubmitCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/verification/company', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['verification-status'] }),
  });
}

export function useUploadVerificationDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      type: string;
      key: string;
      fileName: string;
      mimeType: string;
      fileSizeBytes: number;
    }) => api.post('/verification/documents', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['verification-status'] }),
  });
}

export function useDeleteVerificationDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/verification/documents/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['verification-status'] }),
  });
}
