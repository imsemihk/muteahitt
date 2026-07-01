export type DealType = 'KAT_KARSILIGI' | 'SATIS' | 'KIRA_GELIRI' | 'DIGER';
export type ZoningType = 'KONUT' | 'TICARI' | 'KARMA' | 'TARIMSAL' | 'SANAYI' | 'DIGER';
export type ListingStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'DELETED';

export interface ListingImage {
  id: string;
  url: string;
  order: number;
}

export interface ListingSummary {
  id: string;
  title: string;
  city: string;
  district: string;
  neighborhood?: string;
  areaM2: number;
  dealType: DealType;
  zoningType?: ZoningType;
  askingPrice?: number;
  status: ListingStatus;
  createdAt: string;
  images: ListingImage[];
  owner: { id: string; fullName: string };
  _count: { offers: number };
}

export interface ListingDetail extends ListingSummary {
  description: string;
  floorCount?: number;
  floorAreaRatio?: number;
  documents: { id: string; name: string; url: string }[];
}
