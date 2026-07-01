import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class ConfirmListingImageDto {
  @ApiProperty()
  @IsUUID()
  listingId: string;

  @ApiProperty({ description: 'R2 object key — presigned-url yanıtından gelir' })
  @IsString()
  key: string;

  @ApiPropertyOptional({ description: 'Sıralama', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
