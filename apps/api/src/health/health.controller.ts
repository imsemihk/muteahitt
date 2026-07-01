import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  async check() {
    const [db, cache] = await Promise.all([
      this.prisma.healthCheck(),
      this.redis.healthCheck(),
    ]);

    const status = db && cache ? 'ok' : 'degraded';

    return {
      status,
      timestamp: new Date().toISOString(),
      version: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local',
      services: {
        database: db,
        cache,
      },
    };
  }
}
