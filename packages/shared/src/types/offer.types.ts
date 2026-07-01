export type OfferModel = 'KAT_KARSILIGI' | 'NAKIT' | 'KIRA_GELIRI' | 'KARMA' | 'DIGER';
export type OfferStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';

export interface OfferSummary {
  id: string;
  offerModel: OfferModel;
  message: string;
  revenueSharePercent?: number;
  cashOfferAmount?: number;
  estimatedMonths?: number;
  status: OfferStatus;
  createdAt: string;
  contractor: { id: string; fullName: string };
}

export interface MyOffer extends OfferSummary {
  listing: {
    id: string;
    title: string;
    city: string;
    status: string;
  };
}
