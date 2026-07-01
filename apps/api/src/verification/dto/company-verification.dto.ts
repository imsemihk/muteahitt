import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { CompanyType } from '@prisma/client';

export class CompanyVerificationDto {
  @ApiProperty({ example: 'Yılmaz İnşaat Ltd. Şti.' })
  @IsString()
  @MaxLength(200)
  companyTitle: string;

  @ApiProperty({ description: '10 haneli vergi numarası' })
  @IsString()
  @Matches(/^\d{10}$/, { message: 'Vergi numarası 10 haneli rakam olmalıdır' })
  taxNumber: string;

  @ApiProperty({ example: 'Kadıköy VD' })
  @IsString()
  @MaxLength(100)
  taxOffice: string;

  @ApiProperty({ example: '12345' })
  @IsString()
  @MaxLength(50)
  tradeRegistryNumber: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  tradeRegistryOffice?: string;

  @ApiPropertyOptional({ enum: CompanyType })
  @IsOptional()
  @IsEnum(CompanyType)
  companyType?: CompanyType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiProperty({ description: 'Yetkili kişi adı soyadı' })
  @IsString()
  @MaxLength(100)
  authorizedPersonName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  authorizedPersonTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^05\d{9}$/, { message: 'Geçerli bir telefon numarası girin' })
  authorizedPersonPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear())
  foundedYear?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  employeeCount?: number;
}
