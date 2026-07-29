import { CanActivate, ExecutionContext} from '@nestjs/common';
import { Injectable, ForbiddenException } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { Reflector } from '@nestjs/core';

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { CsrfService } from '../services/csrf.service';

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(
    private readonly csrfService: CsrfService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // Skip CSRF for public routes
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Only validate CSRF for state-changing methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return true;
    }

    const cookieToken = request.cookies?.csrf_token;
    const headerToken = request.headers['x-csrf-token'];

    if (!this.csrfService.validateToken(cookieToken, headerToken)) {
      throw new ForbiddenException('Invalid CSRF token');
    }

    return true;
  }
}
