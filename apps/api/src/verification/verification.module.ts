import { Module } from '@nestjs/common';
import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';
import { EncryptionService } from '../common/crypto/encryption.service';

@Module({
  controllers: [VerificationController],
  providers: [VerificationService, EncryptionService],
  exports: [VerificationService, EncryptionService],
})
export class VerificationModule {}
