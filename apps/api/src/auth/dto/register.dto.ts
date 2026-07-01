import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRole, UserType } from '@prisma/client';

export class RegisterDto {
  @ApiProperty({ example: 'Ahmet Yılmaz' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  fullName: string;

  @ApiProperty({ example: 'ahmet@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Güçlü1234!' })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Şifre en az bir büyük harf, bir küçük harf ve bir rakam içermelidir',
  })
  password: string;

  @ApiProperty({ enum: UserType })
  @IsEnum(UserType)
  userType: UserType;

  @ApiProperty({ enum: [UserRole.LAND_OWNER, UserRole.CONTRACTOR] })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiProperty({ example: '05551234567' })
  @IsString()
  @Matches(/^05\d{9}$/, { message: 'Geçerli bir Türk telefon numarası girin (05XXXXXXXXX)' })
  phone: string;
}
