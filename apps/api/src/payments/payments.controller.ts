import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { IyzicoCallbackDto } from './dto/iyzico-callback.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // Ödeme başlat — checkoutFormContent frontend'e gömülür
  @Post('initiate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.LAND_OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Iyzico 3DS ödeme başlat (₺399 iletişim kilidi açma)' })
  initiate(
    @CurrentUser('id') buyerId: string,
    @Body() dto: InitiatePaymentDto,
    @Req() req: Request,
  ) {
    return this.paymentsService.initiate(buyerId, dto, req);
  }

  // Iyzico 3DS form-post callback — JWT yok, Iyzico çağırır
  @Post('callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iyzico 3DS callback (internal)' })
  callback(@Body() dto: IyzicoCallbackDto) {
    return this.paymentsService.handleCallback(dto.token);
  }

  // Kilit açılmış iletişim bilgisini getir
  @Get('unlocked/:offerId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.LAND_OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Açılmış iletişim bilgisini getir' })
  getUnlockedContact(
    @CurrentUser('id') buyerId: string,
    @Param('offerId') offerId: string,
  ) {
    return this.paymentsService.getUnlockedContact(buyerId, offerId);
  }

  // Ödeme geçmişim
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ödeme geçmişim' })
  myPayments(
    @CurrentUser('id') buyerId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.paymentsService.getMyPayments(buyerId, page, limit);
  }
}
