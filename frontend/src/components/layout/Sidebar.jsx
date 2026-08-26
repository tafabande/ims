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
  Box,
  Building2,
  Clock,
  RotateCcw,
  ArrowRightLeft,
  ClipboardList,
  Tag,
  LogOut,
  Layers,
  FileSpreadsheet,
  TrendingUp
} from 'lucide-react';
import { can } from '../../utils/permissions';

export default function Sidebar({ activeTab, setActiveTab, currentRole, onLogout }) {
  const navSections = [
    {
      title: 'MAIN OVERVIEW',
      items: [
        { id: 'dashboard', label: 'Dashboard Overview', shortcut: 'Alt+D', icon: LayoutDashboard, roles: ['APP_ADMIN', 'SYSADMIN', 'MANAGER', 'STAFF', 'AUDITOR', 'ADMIN'] },
        { id: 'attention', label: 'Operational Attention', actionBadge: 2, importantBadge: 2, shortcut: 'Alt+A', icon: ShieldAlert, roles: ['APP_ADMIN', 'SYSADMIN', 'MANAGER', 'STAFF', 'AUDITOR', 'ADMIN'] }
      ]
    },
    {
      title: 'STORE OPERATIONS',
      items: [
        { id: 'stores', label: 'Store & Branch Management', shortcut: '', icon: Building2, roles: ['MANAGER', 'APP_ADMIN'] },
        { id: 'shifts', label: 'Shift & Cash Till', shortcut: '', icon: Clock, roles: ['STAFF'] },
        { id: 'returns', label: 'Returns & Refunds', shortcut: '', icon: RotateCcw, roles: ['MANAGER', 'STAFF', 'AUDITOR'] },
        { id: 'transfers', label: 'Stock Transfers', shortcut: '', icon: ArrowRightLeft, roles: ['MANAGER', 'AUDITOR'] },
        { id: 'stocktake', label: 'Stock Counting & Audit', shortcut: '', icon: ClipboardList, roles: ['MANAGER', 'STAFF', 'AUDITOR'] },
        { id: 'promotions', label: 'Discounts & Promos', shortcut: '', icon: Tag, roles: ['MANAGER', 'APP_ADMIN'] }
      ]
    },
    {
      title: 'OPERATIONS',
      items: [
        { id: 'inventory', label: 'Stock & Audit Ledger', shortcut: 'Alt+I', icon: Boxes, roles: ['MANAGER', 'STAFF', 'AUDITOR', 'APP_ADMIN'] },
        { id: 'integrity', label: 'Integrity & Anomaly Engine', shortcut: '', icon: ShieldAlert, roles: ['MANAGER', 'STAFF', 'AUDITOR', 'APP_ADMIN', 'ADMIN'] },
        { id: 'sales', label: 'Sales & POS Terminal', shortcut: 'Alt+S', icon: ShoppingCart, roles: ['MANAGER', 'STAFF', 'AUDITOR'] },
        { id: 'purchases', label: 'Purchase Orders', shortcut: 'Alt+B', icon: ShoppingBag, roles: ['MANAGER', 'AUDITOR'] }
      ]
    },
    {
      title: 'CATALOG & DIRECTORY',
      items: [
        { id: 'products', label: 'Products Catalog', shortcut: 'Alt+P', icon: Package, roles: ['MANAGER', 'STAFF', 'AUDITOR', 'APP_ADMIN'] },
        { id: 'employees', label: 'Employees Directory', shortcut: '', icon: Users, roles: ['MANAGER', 'APP_ADMIN', 'AUDITOR'] },
        { id: 'suppliers', label: 'Suppliers Directory', shortcut: '', icon: Truck, roles: ['MANAGER', 'APP_ADMIN', 'AUDITOR'] },
        { id: 'customers', label: 'Customer Records', shortcut: '', icon: Users, roles: ['MANAGER', 'STAFF', 'AUDITOR', 'APP_ADMIN'] }
      ]
    },
    {
      title: 'ANALYTICS & PLANNING',
      items: [
        { id: 'reports', label: 'Reports & Analytics', shortcut: 'Alt+R', icon: BarChart3, roles: ['MANAGER', 'APP_ADMIN', 'AUDITOR', 'ADMIN'] },
        { id: 'planning', label: 'Planning & Forecasting', shortcut: '', icon: TrendingUp, roles: ['MANAGER', 'APP_ADMIN', 'AUDITOR', 'ADMIN'] }
      ]
    },
    {
      title: 'DATA & INTEGRATIONS',
      items: [
        { id: 'data_intake', label: 'Data Intake & Import Center', shortcut: '', icon: FileSpreadsheet, roles: ['APP_ADMIN', 'SYSADMIN', 'MANAGER', 'STAFF', 'AUDITOR', 'ADMIN'] }
      ]
    },
    {
      title: 'ADMINISTRATION',
      items: [
        { id: 'users', label: 'User & RBAC Control', shortcut: '', icon: UserCog, roles: ['APP_ADMIN', 'ADMIN'] },
        { id: 'audit', label: 'Security Audit Logs', shortcut: '', icon: ShieldAlert, roles: ['APP_ADMIN', 'AUDITOR', 'ADMIN'] }
      ]
    }
  ];

  const userRole = (currentRole || 'MANAGER').toUpperCase();

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
      {/* Navigation Sections */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>
        {navSections.map((section, idx) => {
          const visibleItems = section.items.filter(item => 
            !item.roles || item.roles.includes(userRole)
          );

          if (visibleItems.length === 0) return null;

          return (
            <div key={idx} style={{ marginBottom: '20px' }}>
              <div style={{
                fontSize: '0.6875rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                color: 'var(--color-ink-muted)',
                letterSpacing: '0.5px',
                padding: '0 8px 6px 8px',
                textTransform: 'uppercase'
              }}>
                {section.title}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {visibleItems.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: item.actionBadge > 0 ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid transparent',
                        background: isActive ? 'var(--color-paper-2)' : 'transparent',
                        color: isActive ? 'var(--color-accent)' : 'var(--color-ink-muted)',
                        fontWeight: isActive ? 700 : 500,
                        fontSize: '0.8125rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <Icon size={16} color={isActive ? 'var(--color-accent)' : 'currentColor'} />
                      <span style={{ flex: 1 }}>{item.label}</span>
                      {item.actionBadge > 0 && (
                        <span style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          background: 'var(--color-accent)',
                          boxShadow: '0 0 6px var(--color-accent)'
                        }} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Role Context */}
      <div style={{
        padding: '14px 16px',
        borderTop: '1px solid var(--color-rule)',
        background: 'var(--color-paper-2)'
      }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>
          Role: {userRole}
        </div>
        <div style={{ fontSize: '0.6875rem', color: 'var(--color-ink-muted)' }}>
          System Standard RBAC
        </div>
      </div>
    </aside>
  );
}
