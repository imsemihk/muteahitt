export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

export interface PaymentSummary {
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  createdAt: string;
  offer: {
    id: string;
    listing: { id: string; title: string };
    contractor: { id: string; fullName: string };
  };
}

export interface UnlockedContact {
  contractorId: string;
  fullName: string;
  email: string;
  phone: string;
  unlockedAt: string;
}
