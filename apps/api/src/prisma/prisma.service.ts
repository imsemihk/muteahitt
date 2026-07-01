import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import * as Sentry from '@sentry/node';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'error' },
        { emit: 'stdout', level: 'warn' },
      ],
    });
  }

  async onModuleInit() {
    // 1 saniyeden uzun sorgular için uyarı
    this.$on('query' as never, (e: Prisma.QueryEvent) => {
      if (e.duration > 1000) {
        this.logger.warn(`Yavaş sorgu (${e.duration}ms): ${e.query}`);

        if (process.env.NODE_ENV === 'production') {
          Sentry.captureMessage(`Yavaş DB sorgusu: ${e.duration}ms`, 'warning');
        }
      }
    });

    await this.$connect();
    this.logger.log('Veritabanı bağlantısı kuruldu');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
