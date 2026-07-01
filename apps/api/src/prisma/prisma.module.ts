import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Tüm modüllerde import etmeden PrismaService inject edilebilir
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
