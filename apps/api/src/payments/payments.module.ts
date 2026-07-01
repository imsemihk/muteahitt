import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { IyzicoService } from './iyzico.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, IyzicoService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
