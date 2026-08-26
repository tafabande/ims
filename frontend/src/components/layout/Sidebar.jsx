import React from 'react';
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
  LogOut,
  FileSpreadsheet,
  TrendingUp
} from 'lucide-react';
import { can } from '../../utils/permissions';

export default function Sidebar({ activeTab, setActiveTab, currentRole = 'MANAGER', onLogout }) {
  const roleUpper = (currentRole || 'MANAGER').toUpperCase();

  // Define sidebar items with exact required permission flags
  const rawSections = [
    {
      title: 'MAIN OVERVIEW',
      items: [
        { id: 'dashboard', label: 'Dashboard Overview', shortcut: 'Alt+D', icon: LayoutDashboard, perm: 'inventory.view' },
        { id: 'attention', label: 'Operational Attention', actionBadge: 2, importantBadge: 2, shortcut: 'Alt+A', icon: ShieldAlert, perm: 'attention.view' }
      ]
    },
    {
      title: 'STORE OPERATIONS',
      items: [
        { id: 'stores', label: 'Store & Branch Management', icon: Building2, perm: 'system.config' },
        { id: 'shifts', label: 'Shift & Cash Till', icon: Clock, perm: 'shifts.manage' },
        { id: 'returns', label: 'Returns & Refunds', icon: RotateCcw, perm: 'sales.refund' },
        { id: 'transfers', label: 'Stock Transfers', icon: ArrowRightLeft, perm: 'inventory.transfer' },
        { id: 'stocktake', label: 'Stock Counting & Audit', icon: ClipboardList, perm: 'inventory.count' },
        { id: 'promotions', label: 'Discounts & Promos', icon: Tag, perm: 'sales.policy' }
      ]
    },
    {
      title: 'OPERATIONS',
      items: [
        { id: 'inventory', label: 'Stock & Audit Ledger', shortcut: 'Alt+I', icon: Boxes, perm: 'inventory.view' },
        { id: 'integrity', label: 'Integrity & Anomaly Engine', icon: ShieldAlert, perm: 'attention.decide' },
        { id: 'sales', label: 'Sales & POS Terminal', shortcut: 'Alt+S', icon: ShoppingCart, perm: 'sales.view' },
        { id: 'purchases', label: 'Purchase Orders', shortcut: 'Alt+B', icon: ShoppingBag, perm: 'purchases.view' }
      ]
    },
    {
      title: 'CATALOG & DIRECTORY',
      items: [
        { id: 'products', label: 'Products Catalog', shortcut: 'Alt+P', icon: Package, perm: 'inventory.view' },
        { id: 'employees', label: 'Employees Directory', icon: Users, perm: 'attention.decide' },
        { id: 'suppliers', label: 'Suppliers Directory', icon: Truck, perm: 'purchases.view' },
        { id: 'customers', label: 'Customer Records', icon: Users, perm: 'sales.view' }
      ]
    },
    {
      title: 'ANALYTICS & PLANNING',
      items: [
        { id: 'reports', label: 'Reports & Analytics', shortcut: 'Alt+R', icon: BarChart3, perm: 'reports.view' },
        { id: 'planning', label: 'Planning & Forecasting', icon: TrendingUp, perm: 'reports.view' }
      ]
    },
    {
      title: 'DATA & INTEGRATIONS',
      items: [
        { id: 'data_intake', label: 'Data Intake & Import Center', icon: FileSpreadsheet, perm: 'gateways.manage' }
      ]
    },
    {
      title: 'ADMINISTRATION',
      items: [
        { id: 'users', label: 'User & RBAC Control', icon: UserCog, perm: 'users.manage' },
        { id: 'audit', label: 'Security Audit Logs', icon: ShieldAlert, perm: 'audit.view' }
      ]
    }
  ];

  // Filter out items and sections based on role permissions
  const navSections = rawSections
    .map(section => {
      const allowedItems = section.items.filter(item => can(roleUpper, item.perm));
      return { ...section, items: allowedItems };
    })
    .filter(section => section.items.length > 0);

  return (
    <aside style={{
      width: '245px',
      background: 'var(--color-paper)',
      borderRight: '1px solid var(--color-rule)',
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 60px)',
      position: 'sticky',
      top: '60px',
      userSelect: 'none',
      zIndex: 40
    }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>
        {navSections.map(section => (
          <div key={section.title} style={{ marginBottom: '20px' }}>
            <div style={{
              fontSize: '0.65rem',
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              color: 'var(--color-ink-muted)',
              letterSpacing: '0.08em',
              padding: '0 8px 8px 8px',
              textTransform: 'uppercase'
            }}>
              {section.title}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {section.items.map(item => {
                const IconComponent = item.icon;
                const isActive = activeTab === item.id;
                const hasActionBadge = item.actionBadge > 0;

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justify: 'space-between',
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
                      boxShadow: isActive ? 'inset 2px 0 0 var(--color-accent)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <IconComponent size={16} style={{ color: isActive ? 'var(--color-accent)' : 'var(--color-ink-muted)' }} />
                      <span>{item.label}</span>
                    </div>

                    {hasActionBadge && (
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '10px',
                        background: 'rgba(239, 68, 68, 0.15)',
                        color: 'var(--color-signal-red)',
                        fontFamily: 'var(--font-mono)'
                      }}>
                        {item.actionBadge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
