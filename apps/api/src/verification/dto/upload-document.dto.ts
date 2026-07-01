import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsString, Max, Min } from 'class-validator';
import { VerificationDocumentType } from '@prisma/client';

export class UploadDocumentDto {
  @ApiProperty({ enum: VerificationDocumentType })
  @IsEnum(VerificationDocumentType)
  type: VerificationDocumentType;

  @ApiProperty({ description: 'R2 object key — storage/presigned-url\'den gelir' })
  @IsString()
  key: string;

  @ApiProperty({ example: 'kimlik_on.jpg' })
  @IsString()
  fileName: string;

  @ApiProperty()
  @IsString()
  mimeType: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(20 * 1024 * 1024)
  fileSizeBytes: number;
}
