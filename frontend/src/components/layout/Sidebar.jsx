import {
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingCart,
  ShoppingBag,
  Truck,
  Users,
  BarChart3,
  ShieldAlert,
  UserCog,
  Building2,
  Clock,
  RotateCcw,
  ArrowRightLeft,
  ClipboardList,
  Tag,
  FileSpreadsheet,
  TrendingUp,
  Sliders,
  AlertTriangle,
} from 'lucide-react';
import { can } from '../../utils/permissions';

/**
 * Permission check using SERVER-ISSUED permissions from the JWT.
 * The user.permissions array is the authoritative source.
 * Falls back to the local role map only in degraded mode.
 */
function userCan(user, permission) {
  if (!user) return false;
  if (Array.isArray(user.permissions) && user.permissions.length > 0) {
    return user.permissions.includes(permission);
  }
  return can(user.role, permission);
}

/**
 * Sidebar — navigation menu filtered strictly by the authenticated user's
 * server-issued permissions. Users see ONLY the sections they have access to.
 */
export default function Sidebar({ activeTab, setActiveTab, currentUser, onLogout }) {
  const rawSections = [
    {
      title: 'MAIN OVERVIEW',
      items: [
        { id: 'dashboard', label: 'Dashboard Overview', shortcut: 'Alt+D', icon: LayoutDashboard, perm: 'inventory.view' },
        { id: 'attention', label: 'Operational Attention', icon: AlertTriangle, perm: 'attention.view' },
      ],
    },
    {
      title: 'STORE OPERATIONS',
      items: [
        { id: 'stores', label: 'Store & Branch Management', icon: Building2, perm: 'system.config' },
        { id: 'shifts', label: 'Shift & Cash Till', icon: Clock, perm: 'shifts.manage' },
        { id: 'returns', label: 'Returns & Refunds', icon: RotateCcw, perm: 'sales.refund' },
        { id: 'transfers', label: 'Stock Transfers', icon: ArrowRightLeft, perm: 'inventory.transfer' },
        { id: 'stocktake', label: 'Stock Counting & Audit', icon: ClipboardList, perm: 'inventory.count' },
        { id: 'promotions', label: 'Discounts & Promos', icon: Tag, perm: 'sales.policy' },
      ],
    },
    {
      title: 'OPERATIONS',
      items: [
        { id: 'inventory', label: 'Stock & Audit Ledger', shortcut: 'Alt+I', icon: Boxes, perm: 'inventory.view' },
        { id: 'integrity', label: 'Integrity & Anomaly Engine', icon: ShieldAlert, perm: 'integrity.view' },
        { id: 'pos', label: 'POS Checkout Register', shortcut: 'Alt+S', icon: ShoppingCart, perm: 'sales.create' },
        { id: 'sales', label: 'Sales Policy & Rates', icon: Sliders, perm: 'sales.policy' },
        { id: 'purchases', label: 'Purchase Orders', shortcut: 'Alt+B', icon: ShoppingBag, perm: 'purchases.view' },
      ],
    },
    {
      title: 'CATALOG & DIRECTORY',
      items: [
        { id: 'products', label: 'Products Catalog', shortcut: 'Alt+P', icon: Package, perm: 'products.view' },
        { id: 'employees', label: 'Employees Directory', icon: Users, perm: 'employees.view' },
        { id: 'suppliers', label: 'Suppliers Directory', icon: Truck, perm: 'purchases.view' },
        { id: 'customers', label: 'Customer Records', icon: Users, perm: 'sales.view' },
      ],
    },
    {
      title: 'ANALYTICS & PLANNING',
      items: [
        { id: 'reports', label: 'Reports & Analytics', shortcut: 'Alt+R', icon: BarChart3, perm: 'reports.view' },
        { id: 'planning', label: 'Planning & Forecasting', icon: TrendingUp, perm: 'reports.view' },
      ],
    },
    {
      title: 'DATA & INTEGRATIONS',
      items: [
        { id: 'data_intake', label: 'Data Intake & Import Center', icon: FileSpreadsheet, perm: 'gateways.manage' },
      ],
    },
    {
      title: 'ADMINISTRATION',
      items: [
        { id: 'users', label: 'User & RBAC Control', icon: UserCog, perm: 'users.manage' },
        { id: 'audit', label: 'Security Audit Logs', icon: ShieldAlert, perm: 'audit.view' },
      ],
    },
  ];

  // Filter sections and items strictly by user's server-issued permissions
  const navSections = rawSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => userCan(currentUser, item.perm)),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <aside
      style={{
        width: '245px',
        background: 'var(--color-paper)',
        borderRight: '1px solid var(--color-rule)',
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 60px)',
        position: 'sticky',
        top: '60px',
        userSelect: 'none',
        zIndex: 40,
      }}
    >
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>
        {navSections.map((section) => (
          <div key={section.title} style={{ marginBottom: '20px' }}>
            <div
              style={{
                fontSize: '0.65rem',
                fontWeight: 800,
                fontFamily: 'var(--font-mono)',
                color: 'var(--color-ink-muted)',
                letterSpacing: '0.08em',
                padding: '0 8px 8px 8px',
                textTransform: 'uppercase',
              }}
            >
              {section.title}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {section.items.map((item) => {
                const IconComponent = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    title={item.shortcut ? `${item.label} (${item.shortcut})` : item.label}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-xs)',
                      border: 'none',
                      background: isActive ? 'var(--color-paper-2)' : 'transparent',
                      color: isActive ? 'var(--color-accent)' : 'var(--color-ink)',
                      fontWeight: isActive ? 700 : 500,
                      fontSize: '0.8125rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                      boxShadow: isActive ? 'inset 2px 0 0 var(--color-accent)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <IconComponent
                        size={16}
                        style={{ color: isActive ? 'var(--color-accent)' : 'var(--color-ink-muted)' }}
                      />
                      <span>{item.label}</span>
                    </div>

                    {item.shortcut && !isActive && (
                      <span
                        style={{
                          fontSize: '0.65rem',
                          color: 'var(--color-ink-dim)',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {item.shortcut}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* User info footer */}
      {currentUser && (
        <div
          style={{
            padding: '12px',
            borderTop: '1px solid var(--color-rule)',
            fontSize: '0.72rem',
            color: 'var(--color-ink-muted)',
          }}
        >
          <div style={{ fontWeight: 700, color: 'var(--color-ink)', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {currentUser.fullName || currentUser.full_name}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)', fontSize: '0.68rem' }}>
            {currentUser.role}
          </div>
        </div>
      )}
    </aside>
  );
}
