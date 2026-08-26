// Centralized Capability-Based Permission System for IMS Frontend
// Enforces Strict Segregation of Duties (SoD):
// - Administrative Authority: Manage users, roles, system config, audit logs. NO operational decision rights.
// - Managerial Authority: Approve/reject operational requests, define policies, manage attention queue & sales rules.
// - Staff Authority: Execute front-desk sales, handle stock movements, manage shift tills.
// - Auditor Authority: Read-only inspection of ledgers and audit records.

export const ROLE_PERMISSIONS = {
  // SYSTEM & SECURITY ADMINISTRATORS (System Administration & Governance)
  APP_ADMIN: [
    'users.manage',
    'roles.manage',
    'audit.view',
    'audit.export',
    'system.config',
    'inventory.view',
    'sales.view',
    'purchases.view',
    'products.view',
    'reports.view',
    'data.export',
    'employees.view',
    'integrity.view'
  ],
  SYSADMIN: [
    'users.manage',
    'roles.manage',
    'audit.view',
    'audit.export',
    'system.config',
    'inventory.view',
    'sales.view',
    'purchases.view',
    'products.view',
    'reports.view',
    'data.export',
    'employees.view',
    'integrity.view'
  ],

  // OPERATIONAL BUSINESS MANAGERS (Operational Decision & Approval Authority)
  MANAGER: [
    'attention.view',
    'attention.decide',
    'attention.comment',
    'sales.view',
    'sales.create',
    'sales.policy',
    'sales.approve_large',
    'sales.refund',
    'sales.refund.approve',
    'gateways.manage',
    'purchases.view',
    'purchases.create',
    'purchases.approve',
    'purchases.receive',
    'inventory.view',
    'inventory.adjust',
    'inventory.receive',
    'inventory.transfer',
    'inventory.count',
    'products.view',
    'products.create',
    'products.edit',
    'products.delete',
    'shifts.manage',
    'reports.view',
    'broadcast.send',
    'system.config',
    'employees.view',
    'integrity.view'
  ],

  // WAREHOUSE OPERATIONS STAFF
  WAREHOUSE: [
    'inventory.view',
    'inventory.adjust',
    'inventory.receive',
    'inventory.transfer',
    'inventory.count',
    'purchases.view',
    'purchases.receive',
    'products.view'
  ],

  // FRONT-DESK CASHIERS & SELLERS
  STAFF: [
    'sales.view',
    'sales.create',
    'sales.refund',
    'shifts.manage',
    'inventory.view',
    'products.view'
  ],
  STAFF_SELLER: [
    'sales.view',
    'sales.create',
    'sales.refund',
    'shifts.manage',
    'inventory.view',
    'products.view'
  ],

  // LOGISTICS & STOCK MOVERS
  STAFF_MOVER: [
    'inventory.view',
    'inventory.transfer',
    'inventory.receive',
    'products.view'
  ],

  // INDEPENDENT COMPLIANCE AUDITORS
  AUDITOR: [
    'inventory.view',
    'sales.view',
    'purchases.view',
    'products.view',
    'reports.view',
    'audit.view',
    'audit.export',
    'employees.view',
    'integrity.view'
  ]
};

/**
 * Capability-based permission check.
 * Evaluates whether a given role possesses a specific permission capability.
 * 
 * @param {string} role - The current active role (e.g. 'MANAGER', 'APP_ADMIN')
 * @param {string} permission - The specific capability required (e.g. 'attention.decide')
 * @returns {boolean} True if the role possesses the capability, false otherwise.
 */
export function can(role, permission) {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role.toUpperCase()] || ROLE_PERMISSIONS.STAFF;
  return permissions.includes(permission);
}
