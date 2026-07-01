import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class InitiatePaymentDto {
  @ApiProperty({ description: 'Kilidi açılacak teklif ID' })
  @IsUUID()
  offerId: string;

  @ApiProperty({ description: 'Iyzico conversation ID — frontend\'den gelir' })
  @IsString()
  @IsNotEmpty()
  conversationId: string;
}
