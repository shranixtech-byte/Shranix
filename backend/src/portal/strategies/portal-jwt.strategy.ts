import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { DatabaseService } from '../../database/database.service';

export interface PortalJwtPayload {
  sub: string; // portal user id
  email: string;
  customerId: string;
  role: string;
  type: 'portal';
  tokenVersion: number;
}

@Injectable()
export class PortalJwtStrategy extends PassportStrategy(Strategy, 'portal-jwt') {
  constructor(private readonly database: DatabaseService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'dev-secret-change-in-production',
      algorithms: ['HS256'],
    });
  }

  async validate(payload: PortalJwtPayload): Promise<PortalJwtPayload> {
    // Only portal tokens are accepted — internal ERP tokens must never
    // grant access to the customer portal (and vice-versa).
    if (payload?.type !== 'portal' || !payload.sub || !payload.customerId) {
      throw new UnauthorizedException('Invalid portal token');
    }
    const user = await this.database.portalUsers.findById(payload.sub).catch(() => null);
    if (!user || user.isDeleted) {
      throw new UnauthorizedException('Portal account not found');
    }
    if (user.status !== 'active') {
      throw new UnauthorizedException('Portal account is not active');
    }
    // Token version — bumping it invalidates all outstanding sessions
    // (password reset / forced logout).
    if (Number(user.tokenVersion ?? 0) !== Number(payload.tokenVersion ?? 0)) {
      throw new UnauthorizedException('Session is no longer valid');
    }
    return {
      sub: user.id,
      email: user.email,
      customerId: user.customerId,
      role: user.role,
      type: 'portal',
      tokenVersion: user.tokenVersion ?? 0,
    };
  }
}
