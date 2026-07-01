import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsString, Max, Min } from 'class-validator';

export class PresignedUrlDto {
  @ApiProperty({ enum: ['listings', 'documents', 'avatars'] })
  @IsEnum(['listings', 'documents', 'avatars'])
  folder: 'listings' | 'documents' | 'avatars';

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  contentType: string;

  @ApiProperty({ description: 'Dosya boyutu (byte)', example: 1048576 })
  @IsInt()
  @Min(1)
  @Max(20 * 1024 * 1024)
  fileSizeBytes: number;
}
