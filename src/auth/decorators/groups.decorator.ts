import { SetMetadata } from '@nestjs/common';

export const GROUPS_KEY = 'groups';
export const RequireGroups = (...groups: string[]) =>
  SetMetadata(GROUPS_KEY, groups);
