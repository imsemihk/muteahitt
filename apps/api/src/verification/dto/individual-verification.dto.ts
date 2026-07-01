import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, Length, Matches } from 'class-validator';

export class IndividualVerificationDto {
  @ApiProperty({ description: '11 haneli TC kimlik numarası' })
  @IsString()
  @Length(11, 11, { message: 'TC kimlik numarası 11 haneli olmalıdır' })
  @Matches(/^\d{11}$/, { message: 'TC kimlik numarası sadece rakamlardan oluşmalıdır' })
  tcNumber: string;

  @ApiProperty({ example: '1990-05-15', description: 'Doğum tarihi (YYYY-MM-DD)' })
  @IsDateString()
  dateOfBirth: string;

  @ApiPropertyOptional({ default: 'TR' })
  @IsOptional()
  @IsString()
  @Length(2, 3)
  nationality?: string;
}
