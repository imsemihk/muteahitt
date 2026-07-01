import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { RedisService } from '../../redis/redis.service';

export interface RefreshPayload {
  sub: string;
  jti: string; // token ID — Redis'te saklanır
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    config: ConfigService,
    private readonly redis: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      secretOrKey: config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      ignoreExpiration: false,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: RefreshPayload) {
    const key = `refresh:${payload.sub}:${payload.jti}`;
    const stored = await this.redis.get(key);

    if (!stored) {
      throw new UnauthorizedException('Refresh token geçersiz veya süresi dolmuş');
    }

    return { userId: payload.sub, jti: payload.jti };
  }
}
