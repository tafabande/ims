// Centralized Permission System for IMS Frontend
export const ROLE_PERMISSIONS = {
  APP_ADMIN: [
    'users.manage', 'roles.manage', 'audit.view', 'system.config',
    'inventory.view', 'inventory.adjust', 'inventory.receive', 'inventory.transfer',
    'sales.view', 'sales.create', 'sales.refund', 'sales.policy',
    'purchases.view', 'purchases.create', 'purchases.approve', 'reports.view',
    'broadcast.send', 'attention.view', 'attention.decide', 'attention.comment',
    'data.export'
  ],
  SYSADMIN: [
    'users.manage', 'roles.manage', 'audit.view', 'system.config',
    'inventory.view', 'inventory.adjust', 'inventory.receive', 'inventory.transfer',
    'sales.view', 'sales.create', 'sales.refund', 'sales.policy',
    'purchases.view', 'purchases.create', 'purchases.approve', 'reports.view',
    'broadcast.send', 'attention.view', 'attention.decide', 'attention.comment',
    'data.export'
  ],
  MANAGER: [
    'inventory.view', 'inventory.adjust', 'inventory.receive', 'inventory.transfer',
    'sales.view', 'sales.approve_large', 'sales.policy', 'sales.refund.approve',
    'purchases.view', 'purchases.create', 'purchases.approve',
    'reports.view', 'attention.view', 'attention.decide', 'attention.comment',
    'broadcast.send', 'gateways.manage'
  ],
  WAREHOUSE: [
    'inventory.view', 'inventory.adjust', 'inventory.receive', 'inventory.transfer', 'inventory.count',
    'purchases.view', 'purchases.receive', 'attention.view', 'attention.comment'
  ],
  STAFF: [
    'sales.view', 'sales.create', 'shifts.manage', 'inventory.view', 'attention.view', 'attention.comment'
  ],
  STAFF_SELLER: [
    'sales.view', 'sales.create', 'shifts.manage', 'inventory.view', 'attention.view', 'attention.comment'
  ],
  STAFF_MOVER: [
    'inventory.view', 'inventory.transfer', 'inventory.receive', 'attention.view', 'attention.comment'
  ],
  AUDITOR: [
    'inventory.view', 'sales.view', 'purchases.view', 'reports.view', 'audit.view',
    'attention.view', 'attention.comment'
  ]
};

export function can(role, permission) {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role.toUpperCase()] || ROLE_PERMISSIONS.STAFF;
  return permissions.includes(permission);
}
