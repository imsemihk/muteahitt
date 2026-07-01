import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { OfferModel } from '@prisma/client';

export class CreateOfferDto {
  @ApiProperty({ enum: OfferModel, description: 'Teklif modeli (KAT_KARŞILIĞI, SATIŞ, KİRA_GELİRİ...)' })
  @IsEnum(OfferModel)
  offerModel: OfferModel;

  @ApiProperty({ example: 'Projeye uygun kat karşılığı teklif veriyorum...' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(3000)
  message: string;

  @ApiPropertyOptional({ example: 35, description: 'Kat karşılığı yüzdesi' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(99)
  revenueSharePercent?: number;

  @ApiPropertyOptional({ example: 4_500_000, description: 'Nakit teklif tutarı (TL)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  cashOfferAmount?: number;

  @ApiPropertyOptional({ example: 18, description: 'Tahmini inşaat süresi (ay)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  estimatedMonths?: number;
}
