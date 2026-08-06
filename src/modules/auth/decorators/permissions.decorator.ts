import { SetMetadata } from '@nestjs/common';

export const actions = [
  'create',
  'view',
  'update',
  'delete',
  'upload_image',
  // whatever you want
] as const;

export const subjects = [
  'user',
  // whatever you want
];

export type Action = (typeof actions)[number];
export type Subject = (typeof subjects)[number];

export const PERMISSION_METADATA_KEY = 'permissions';
export type RequiredPermissions = {
  action: Action;
  subject: Subject;
};

export const Permissions = (...permissions: RequiredPermissions[]) =>
  SetMetadata(PERMISSION_METADATA_KEY, permissions);
