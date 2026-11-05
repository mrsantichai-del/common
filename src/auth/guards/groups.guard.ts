import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GROUPS_KEY } from '../decorators/groups.decorator';

@Injectable()
export class GroupsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredGroups = this.reflector.getAllAndOverride<string[]>(
      GROUPS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredGroups || requiredGroups.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.groups) {
      throw new ForbiddenException('Access denied: Principal has no group memberships');
    }

    if (user.groups.includes('SUPER_ADMIN')) {
      return true;
    }

    const hasGroup = requiredGroups.some((group) => user.groups.includes(group));

    if (!hasGroup) {
      throw new ForbiddenException(
        `Access denied: Required group membership [${requiredGroups.join(', ')}]. Current groups: [${user.groups.join(', ')}]`,
      );
    }

    return true;
  }
}
