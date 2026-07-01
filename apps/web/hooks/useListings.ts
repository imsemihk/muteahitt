'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import type {
  ListingSummary,
  ListingDetail,
  Paginated,
  CreateListingInput,
  UpdateListingInput,
  ListListingsInput,
} from '@muteahitt/shared';

export function useListings(params?: Partial<ListListingsInput>) {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') query.set(k, String(v));
    });
  }

  return useQuery({
    queryKey: ['listings', params],
    queryFn: () => api.get<Paginated<ListingSummary>>(`/listings?${query}`),
  });
}

export function useListing(id: string) {
  return useQuery({
    queryKey: ['listing', id],
    queryFn: () => api.get<ListingDetail>(`/listings/${id}`),
    enabled: !!id,
  });
}

export function useMyListings(page = 1) {
  return useQuery({
    queryKey: ['my-listings', page],
    queryFn: () => api.get<Paginated<ListingDetail>>(`/listings/me/listings?page=${page}`),
  });
}

export function useCreateListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateListingInput) => api.post<ListingSummary>('/listings', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-listings'] }),
  });
}

export function useUpdateListing(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateListingInput) => api.patch<ListingSummary>(`/listings/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['listing', id] });
      qc.invalidateQueries({ queryKey: ['my-listings'] });
    },
  });
}

export function usePublishListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch<ListingSummary>(`/listings/${id}/publish`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-listings'] }),
  });
}

export function useDeleteListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/listings/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-listings'] }),
  });
}
