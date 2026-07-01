import { IsNotEmpty, IsString } from 'class-validator';

// Iyzico 3DS callback form-post alanları
export class IyzicoCallbackDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsNotEmpty()
  conversationData: string;
}
