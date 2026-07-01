import { z } from 'zod';

export const OfferModelEnum = z.enum([
  'KAT_KARSILIGI',
  'NAKIT',
  'KIRA_GELIRI',
  'KARMA',
  'DIGER',
]);

export const CreateOfferSchema = z.object({
  offerModel: OfferModelEnum,
  message: z
    .string()
    .min(50, 'Teklif mesajı en az 50 karakter olmalıdır')
    .max(3000)
    .refine(
      (val) => !/(\+90|0)?\s*[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}/.test(val),
      { message: 'Mesaja telefon numarası eklenemez' },
    )
    .refine(
      (val) => !/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/.test(val),
      { message: 'Mesaja e-posta adresi eklenemez' },
    )
    .refine((val) => !/https?:\/\/|www\./i.test(val), { message: 'Mesaja bağlantı eklenemez' }),
  revenueSharePercent: z.number().int().min(1).max(99).optional(),
  cashOfferAmount: z.number().int().min(0).optional(),
  estimatedMonths: z.number().int().min(1).max(120).optional(),
});

export const UpdateOfferSchema = CreateOfferSchema.partial();

export type CreateOfferInput = z.infer<typeof CreateOfferSchema>;
export type UpdateOfferInput = z.infer<typeof UpdateOfferSchema>;
