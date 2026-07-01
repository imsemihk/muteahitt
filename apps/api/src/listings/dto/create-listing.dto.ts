import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { DealType, ZoningType } from '@prisma/client';

export class CreateListingDto {
  @ApiProperty({ example: 'Kadıköy Merkezde Konut İmarlı Arsa' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'Kadıköy merkeze 500m mesafede, köşe parsel...' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  description: string;

  @ApiProperty({ example: 'İstanbul' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city: string;

  @ApiProperty({ example: 'Kadıköy' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  district: string;

  @ApiPropertyOptional({ example: 'Moda' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  neighborhood?: string;

  @ApiProperty({ example: 850, description: 'Metrekare' })
  @IsNumber()
  @Min(1)
  @Max(10_000_000)
  areaM2: number;

  @ApiProperty({ enum: DealType })
  @IsEnum(DealType)
  dealType: DealType;

  @ApiPropertyOptional({ enum: ZoningType })
  @IsOptional()
  @IsEnum(ZoningType)
  zoningType?: ZoningType;

  @ApiPropertyOptional({ example: 3, description: 'Kat adedi (imara göre)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  floorCount?: number;

  @ApiPropertyOptional({ example: 250, description: 'TAKS (%)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  floorAreaRatio?: number;

  @ApiPropertyOptional({ example: 5_000_000, description: 'İstenen fiyat (TL)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  askingPrice?: number;
}
