import React from 'react';
import { 
  ShoppingCart, 
  Clock, 
  PackageCheck, 
  Truck, 
  Sliders, 
  ShieldCheck, 
  Users, 
  FileText 
} from 'lucide-react';

import StaffDashboard from './StaffDashboard';
import WarehouseDashboard from './WarehouseDashboard';
import ManagerDashboard from './ManagerDashboard';
import AdminDashboard from './AdminDashboard';
import AuditorDashboard from './AuditorDashboard';

export default function DashboardView({ 
  products = [], 
  sales = [], 
  purchases = [],
  users = [],
  currentRole = 'MANAGER',
  onNavigate,
  salesPolicy = { zigExchangeRate: 13.50 }
}) {
  const roleName = (currentRole || 'MANAGER').toUpperCase();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* OPERATIONAL HEADER STRIP */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-accent)', fontWeight: 700, letterSpacing: '0.05em' }}>
              {roleName} OPERATIONAL CONTEXT
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>• Wednesday, 26 Aug 2026</span>
            <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', fontWeight: 800, fontFamily: 'monospace' }}>
              1 USD = {salesPolicy?.zigExchangeRate || 13.5} ZiG
            </span>
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'var(--color-ink)', letterSpacing: '-0.02em' }}>
            {roleName === 'STAFF' || roleName === 'STAFF_SELLER' ? 'Store Front-Desk Operations & POS Register' :
             roleName === 'WAREHOUSE' || roleName === 'STAFF_MOVER' ? 'Warehouse Operations & Logistics Movement Hub' :
             roleName === 'APP_ADMIN' || roleName === 'SYSADMIN' || roleName === 'ADMIN' ? 'System Infrastructure & RBAC Control Hub' :
             roleName === 'AUDITOR' ? 'Financial Ledger Integrity & Audit Monitor' :
             'Executive Operations & Manager Decision Control'}
          </h2>
        </div>

        {/* Role-Specific Primary Quick Actions */}
        <div style={{ display: 'flex', gap: '10px' }}>
          {(roleName === 'STAFF' || roleName === 'STAFF_SELLER') && (
            <>
              <button className="btn btn-primary" onClick={() => onNavigate('pos')}>
                <ShoppingCart size={15} /> Launch POS Register
              </button>
              <button className="btn btn-secondary" onClick={() => onNavigate('shifts')}>
                <Clock size={15} /> Register Till & Shift
              </button>
            </>
          )}

          {(roleName === 'WAREHOUSE' || roleName === 'STAFF_MOVER') && (
            <>
              <button className="btn btn-primary" onClick={() => onNavigate('purchases')}>
                <PackageCheck size={15} /> Goods Receiving (GRN)
              </button>
              <button className="btn btn-secondary" onClick={() => onNavigate('transfers')}>
                <Truck size={15} /> Dispatch & Transfers
              </button>
            </>
          )}

          {roleName === 'MANAGER' && (
            <>
              <button className="btn btn-primary" onClick={() => onNavigate('sales')}>
                <Sliders size={15} /> Sales Policy & Rates
              </button>
              <button className="btn btn-secondary" onClick={() => onNavigate('attention')}>
                <ShieldCheck size={15} /> Open Attention Center
              </button>
            </>
          )}

          {(roleName === 'APP_ADMIN' || roleName === 'SYSADMIN' || roleName === 'ADMIN') && (
            <button className="btn btn-primary" onClick={() => onNavigate('users')}>
              <Users size={15} /> Manage Users & RBAC
            </button>
          )}

          {roleName === 'AUDITOR' && (
            <button className="btn btn-primary" onClick={() => onNavigate('audit_logs')}>
              <FileText size={15} /> View System Audit Logs
            </button>
          )}
        </div>
      </div>

      {/* DYNAMIC ROLE-BASED DASHBOARD ROUTING */}
      {(roleName === 'STAFF' || roleName === 'STAFF_SELLER') && (
        <StaffDashboard 
          sales={sales} 
          salesPolicy={salesPolicy} 
          onNavigate={onNavigate} 
        />
      )}

      {(roleName === 'WAREHOUSE' || roleName === 'STAFF_MOVER') && (
        <WarehouseDashboard 
          products={products} 
          purchases={purchases} 
          onNavigate={onNavigate} 
        />
      )}

      {roleName === 'MANAGER' && (
        <ManagerDashboard 
          products={products} 
          sales={sales} 
          salesPolicy={salesPolicy} 
          onNavigate={onNavigate} 
        />
      )}

      {(roleName === 'APP_ADMIN' || roleName === 'SYSADMIN' || roleName === 'ADMIN') && (
        <AdminDashboard 
          users={users} 
          onNavigate={onNavigate} 
        />
      )}

      {roleName === 'AUDITOR' && (
        <AuditorDashboard 
          products={products} 
          sales={sales} 
          onNavigate={onNavigate} 
        />
      )}

    </div>
  );
}
