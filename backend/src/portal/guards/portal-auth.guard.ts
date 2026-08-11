import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class PortalJwtAuthGuard extends AuthGuard('portal-jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleRequest<TUser = any>(err: Error | null, user: TUser | null, _info: unknown): TUser {
    if (err || !user) {
      throw err || new UnauthorizedException('Portal authentication required');
    }
    return user;
  }
}
