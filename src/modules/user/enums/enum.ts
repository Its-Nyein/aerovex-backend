export const accountStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED',
} as const;

export type AccountStatus = (typeof accountStatus)[keyof typeof accountStatus];
