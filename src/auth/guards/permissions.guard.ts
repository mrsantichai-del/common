import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.permissions) {
      throw new ForbiddenException('Access denied: Security principal contains no granted permissions');
    }

    // Super admin bypasses permission checks
    if (user.groups && user.groups.includes('SUPER_ADMIN')) {
      return true;
    }

    const userPermissions: string[] = user.permissions;
    const missingPermissions = requiredPermissions.filter(
      (perm) => !userPermissions.includes(perm),
    );

    if (missingPermissions.length > 0) {
      throw new ForbiddenException(
        `Access denied: Missing required permission(s) [${missingPermissions.join(', ')}]. Current permissions: [${userPermissions.join(', ')}]`,
      );
    }

    return true;
  }
}
