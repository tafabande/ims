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
      title: 'DATA MANAGEMENT',
      items: [
        { id: 'data_intake', label: 'Data Intake & Import Center', shortcut: '', icon: Layers, roles: ['APP_ADMIN', 'SYSADMIN', 'MANAGER', 'STAFF', 'AUDITOR', 'ADMIN'] }
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
        { id: 'import_center', label: 'Import Center & APIs', shortcut: '', icon: FileSpreadsheet, roles: ['APP_ADMIN', 'ADMIN', 'MANAGER', 'AUDITOR'] }
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

  return (
    <aside style={{
      width: '245px',
      background: 'var(--color-paper)',
      borderRight: '1px solid var(--color-rule)',
      display: 'flex',
      flexDirection: 'column',
      minHeight: 'calc(100vh - 60px)',
      padding: '16px 12px'
    }}>
      {/* Brand Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '4px 8px 16px 8px',
        borderBottom: '1px solid var(--color-rule)',
        marginBottom: '14px'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: 'var(--radius-xs)',
          background: 'var(--color-accent)',
          display: 'flex',
          alignItems: 'center',
          justify: 'center',
          color: '#ffffff'
        }}>
          <Box size={18} />
        </div>
        <div>
          <h1 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-ink)', letterSpacing: '-0.02em' }}>
            Enterprise IMS
          </h1>
          <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-dim)' }}>
            v2.4 • Store Management
          </span>
        </div>
      </div>

      {/* Navigation Sections */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, overflowY: 'auto' }}>
        {navSections.map((section, idx) => {
          const visibleItems = section.items.filter(item => item.roles.includes(currentRole));
          if (visibleItems.length === 0) return null;

          return (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{
                fontSize: '0.65rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--color-ink-dim)',
                letterSpacing: '0.05em',
                padding: '0 12px 4px 12px',
                fontWeight: 700
              }}>
                {section.title}
              </div>
              {visibleItems.map((item) => {
                const isActive = activeTab === item.id;
                const Icon = item.icon;

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
                      border: 'none',
                      background: isActive ? 'var(--color-paper-2)' : 'transparent',
                      color: isActive ? 'var(--color-accent)' : 'var(--color-ink-muted)',
                      fontWeight: isActive ? 700 : 500,
                      fontSize: '0.8125rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Icon size={16} color={isActive ? 'var(--color-accent)' : 'currentColor'} />
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.actionBadge > 0 && (
                      <span style={{ fontSize: '10px', fontWeight: 800, background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '1px 6px', borderRadius: '10px' }}>
                        🔴 {item.actionBadge}
                      </span>
                    )}
                    {item.importantBadge > 0 && (
                      <span style={{ fontSize: '10px', fontWeight: 800, background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', padding: '1px 6px', borderRadius: '10px' }}>
                        🟠 {item.importantBadge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Sidebar Footer Logout Button */}
      <button
        onClick={onLogout}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          width: '100%',
          padding: '10px 12px',
          marginTop: '16px',
          fontSize: '0.8125rem',
          fontWeight: 700,
          color: 'var(--color-signal-red)',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer'
        }}
      >
        <LogOut size={16} /> Sign Out of System
      </button>
    </aside>
  );
}
