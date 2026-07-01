'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import type { PaymentSummary, Paginated, UnlockedContact } from '@muteahitt/shared';

export function useMyPayments(page = 1) {
  return useQuery({
    queryKey: ['payments', page],
    queryFn: () => api.get<Paginated<PaymentSummary>>(`/payments/me?page=${page}`),
  });
}

export function useUnlockedContact(offerId: string, enabled = true) {
  return useQuery({
    queryKey: ['unlocked-contact', offerId],
    queryFn: () => api.get<UnlockedContact>(`/payments/unlocked/${offerId}`),
    enabled,
    retry: false,
  });
}

export function useInitiatePayment() {
  return useMutation({
    mutationFn: (data: { offerId: string; conversationId: string }) =>
      api.post<{ paymentId: string; checkoutFormContent: string; token: string }>(
        '/payments/initiate',
        data,
      ),
  });
}
