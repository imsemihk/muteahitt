import { Module } from '@nestjs/common';
import { OffersController } from './offers.controller';
import { OffersService } from './offers.service';
import { ContentFilterService } from './content-filter.service';

@Module({
  controllers: [OffersController],
  providers: [OffersService, ContentFilterService],
  exports: [OffersService],
})
export class OffersModule {}
