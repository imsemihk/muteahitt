import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { OffersService } from './offers.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Offers')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  // Müteahhit bir ilana teklif verir
  @Post('listings/:listingId/offers')
  @UseGuards(RolesGuard)
  @Roles(UserRole.CONTRACTOR)
  @ApiOperation({ summary: 'İlana teklif ver' })
  create(
    @Param('listingId') listingId: string,
    @CurrentUser('id') contractorId: string,
    @Body() dto: CreateOfferDto,
  ) {
    return this.offersService.create(contractorId, listingId, dto);
  }

  // Arsa sahibi ilanındaki teklifleri görür
  @Get('listings/:listingId/offers')
  @ApiOperation({ summary: 'İlanın teklifleri (ilan sahibi / admin)' })
  findByListing(
    @Param('listingId') listingId: string,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.offersService.findByListing(listingId, requesterId, requesterRole);
  }

  // Müteahhidin kendi teklifleri
  @Get('offers/me')
  @UseGuards(RolesGuard)
  @Roles(UserRole.CONTRACTOR)
  @ApiOperation({ summary: 'Kendi tekliflerim' })
  myOffers(
    @CurrentUser('id') contractorId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.offersService.findMyOffers(contractorId, page, limit);
  }

  // Müteahhit teklifini günceller
  @Patch('offers/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.CONTRACTOR)
  @ApiOperation({ summary: 'Teklifi güncelle (sadece PENDING)' })
  update(
    @Param('id') offerId: string,
    @CurrentUser('id') contractorId: string,
    @Body() dto: UpdateOfferDto,
  ) {
    return this.offersService.update(offerId, contractorId, dto);
  }

  // Müteahhit teklifini geri çeker
  @Patch('offers/:id/withdraw')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(UserRole.CONTRACTOR)
  @ApiOperation({ summary: 'Teklifi geri çek' })
  withdraw(
    @Param('id') offerId: string,
    @CurrentUser('id') contractorId: string,
  ) {
    return this.offersService.withdraw(offerId, contractorId);
  }

  // Arsa sahibi teklifi kabul eder
  @Patch('offers/:id/accept')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(UserRole.LAND_OWNER)
  @ApiOperation({ summary: 'Teklifi kabul et' })
  accept(
    @Param('id') offerId: string,
    @CurrentUser('id') ownerId: string,
  ) {
    return this.offersService.accept(offerId, ownerId);
  }

  // Arsa sahibi teklifi reddeder
  @Patch('offers/:id/reject')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(UserRole.LAND_OWNER)
  @ApiOperation({ summary: 'Teklifi reddet' })
  reject(
    @Param('id') offerId: string,
    @CurrentUser('id') ownerId: string,
  ) {
    return this.offersService.reject(offerId, ownerId);
  }
}
