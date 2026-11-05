import { IsArray, IsString } from 'class-validator';

export class AssignUserGroupsDto {
  @IsArray()
  @IsString({ each: true })
  groups: string[];
}
