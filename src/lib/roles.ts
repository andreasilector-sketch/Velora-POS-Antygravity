export const ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  CAJERO: 'cajero',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

export const ROLE_PERMISSIONS = {
  [ROLES.SUPERADMIN]: ['all'],
  [ROLES.ADMIN]: ['all'],
  [ROLES.CAJERO]: ['pos', 'caja', 'dashboard_limited'],
};
