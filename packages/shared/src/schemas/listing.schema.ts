import { z } from 'zod';

export const DealTypeEnum = z.enum(['KAT_KARSILIGI', 'SATIS', 'KIRA_GELIRI', 'DIGER']);
export const ZoningTypeEnum = z.enum(['KONUT', 'TICARI', 'KARMA', 'TARIMSAL', 'SANAYI', 'DIGER']);
export const ListingStatusEnum = z.enum(['DRAFT', 'ACTIVE', 'CLOSED', 'DELETED']);

export const CreateListingSchema = z.object({
  title: z.string().min(5, 'Başlık en az 5 karakter olmalıdır').max(200),
  description: z.string().min(20, 'Açıklama en az 20 karakter olmalıdır').max(5000),
  city: z.string().min(2).max(100),
  district: z.string().min(2).max(100),
  neighborhood: z.string().max(100).optional(),
  areaM2: z.number().min(1).max(10_000_000),
  dealType: DealTypeEnum,
  zoningType: ZoningTypeEnum.optional(),
  floorCount: z.number().int().min(1).max(50).optional(),
  floorAreaRatio: z.number().min(0).max(100).optional(),
  askingPrice: z.number().min(0).optional(),
});

export const UpdateListingSchema = CreateListingSchema.partial();

export const ListListingsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  city: z.string().optional(),
  district: z.string().optional(),
  dealType: DealTypeEnum.optional(),
  zoningType: ZoningTypeEnum.optional(),
  status: ListingStatusEnum.optional(),
  minArea: z.coerce.number().min(0).optional(),
  maxArea: z.coerce.number().min(0).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  q: z.string().trim().optional(),
  sortBy: z.enum(['createdAt', 'areaM2', 'askingPrice']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateListingInput = z.infer<typeof CreateListingSchema>;
export type UpdateListingInput = z.infer<typeof UpdateListingSchema>;
export type ListListingsInput = z.infer<typeof ListListingsSchema>;
