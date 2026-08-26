import React, { useState, useEffect, useCallback } from 'react';
import { lazy, Suspense } from 'react';
import { useAuth } from './utils/authStore';
import { apiGet, apiPost, apiPatch } from './utils/apiClient';
import { can } from './utils/permissions';
import './App.css';

import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import WorkSessionBar from './components/layout/WorkSessionBar';
import SessionCloseModal from './components/shifts/SessionCloseModal';
import GlobalCommandPalette from './components/layout/GlobalCommandPalette';
import ToastNotification from './components/common/ToastNotification';
import LoginView from './components/auth/LoginView';

import DashboardView from './components/dashboard/DashboardView';

// Lazy-loaded Feature Modules (Code-split into dedicated chunks)
const ProductsView = lazy(() => import('./components/products/ProductsView'));
const InventoryView = lazy(() => import('./components/inventory/InventoryView'));
const SalesView = lazy(() => import('./components/sales/SalesView'));
const POSTerminalView = lazy(() => import('./components/pos/POSTerminalView'));
const SalesGovernanceView = lazy(() => import('./components/sales/SalesGovernanceView'));
const PurchasesView = lazy(() => import('./components/purchases/PurchasesView'));
const SuppliersView = lazy(() => import('./components/suppliers/SuppliersView'));
const CustomersView = lazy(() => import('./components/customers/CustomersView'));
const ReportsView = lazy(() => import('./components/reports/ReportsView'));
const UsersView = lazy(() => import('./components/users/UsersView'));
const AuditLogsView = lazy(() => import('./components/audit/AuditLogsView'));
const StoresView = lazy(() => import('./components/stores/StoresView'));
const ShiftManagementView = lazy(() => import('./components/shifts/ShiftManagementView'));
const ReturnsView = lazy(() => import('./components/returns/ReturnsView'));
const TransfersView = lazy(() => import('./components/transfers/TransfersView'));
const StocktakeView = lazy(() => import('./components/stocktake/StocktakeView'));
const PromotionsView = lazy(() => import('./components/promotions/PromotionsView'));
const EmployeesView = lazy(() => import('./components/employees/EmployeesView'));
const IntegrityIntelligenceView = lazy(() => import('./components/integrity/IntegrityIntelligenceView'));
const DataIntakeView = lazy(() => import('./components/ingestion/DataIntakeView'));
const PlanningView = lazy(() => import('./components/planning/PlanningView'));
const AttentionCenterView = lazy(() => import('./components/attention/AttentionCenterView'));

/**
 * Route permission map — defines which permission a user needs to access each tab.
 * If the user lacks the required permission, they are redirected to 'dashboard'.
 */
const ROUTE_PERMISSIONS = {
  dashboard: 'inventory.view',
  attention: 'attention.view',
  stores: 'system.config',
  shifts: 'shifts.manage',
  returns: 'sales.refund',
  transfers: 'inventory.transfer',
  stocktake: 'inventory.count',
  promotions: 'sales.policy',
  inventory: 'inventory.view',
  integrity: 'integrity.view',
  pos: 'sales.create',
  sales: 'sales.policy',
  purchases: 'purchases.view',
  products: 'products.view',
  employees: 'employees.view',
  suppliers: 'purchases.view',
  customers: 'sales.view',
  reports: 'reports.view',
  planning: 'reports.view',
  data_intake: 'gateways.manage',
  users: 'users.manage',
  audit: 'audit.view',
};

export default function App() {
  const { isAuthenticated, user, logout, sessionKey } = useAuth();
  const [theme, setTheme] = useState(() => localStorage.getItem('ims_theme') || 'dark');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [isSessionCloseModalOpen, setIsSessionCloseModalOpen] = useState(false);
  const [lowStockCount, setLowStockCount] = useState(0);

  // Listen for forced logout events emitted by apiClient on 401
  useEffect(() => {
    const handleForceLogout = () => {
      handleShowToast('error', 'Session Expired', 'Your session has expired. Please sign in again.');
      logout();
    };
    window.addEventListener('ims:auth:logout', handleForceLogout);
    return () => window.removeEventListener('ims:auth:logout', handleForceLogout);
  }, [logout]);

  // Apply Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ims_theme', theme);
  }, [theme]);

  // Fetch low stock count from API (not from local state)
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    if (!can(user.role, 'inventory.view')) return;
    apiGet('/products?low_stock=true&limit=1')
      .then((data) => setLowStockCount(data?.low_stock_count ?? data?.total ?? 0))
      .catch(() => {});
  }, [isAuthenticated, user]);

  // Fetch active work session from API
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    apiGet('/work-sessions/active')
      .then((data) => setActiveSession(data || null))
      .catch(() => setActiveSession(null));
  }, [isAuthenticated, user]);

  // Tab navigation guard — redirect if user lacks permission
  const handleSetActiveTab = useCallback((tab) => {
    const requiredPerm = ROUTE_PERMISSIONS[tab];
    if (requiredPerm && user && !can(user.role, requiredPerm)) {
      handleShowToast('error', 'Access Denied', `Your role (${user.role}) does not have access to this section.`);
      return;
    }
    setActiveTab(tab);
  }, [user]);

  // Global Toast Helper
  const handleShowToast = (type, title, message) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const handleDismissToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      handleShowToast('info', 'Theme Toggled', `Switched to ${next.toUpperCase()} mode.`);
      return next;
    });
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
      if (e.altKey) {
        const map = { d: 'dashboard', p: 'products', i: 'inventory', s: 'sales', r: 'reports' };
        const tab = map[e.key.toLowerCase()];
        if (tab) { e.preventDefault(); handleSetActiveTab(tab); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSetActiveTab]);

  // Work Session Handlers — all persist to API
  const handleStartSession = async (sessionData) => {
    try {
      const session = await apiPost('/work-sessions', sessionData);
      setActiveSession(session);
      handleShowToast('success', 'Session Started', `Work session ${session.session_code} is now active.`);
    } catch (err) {
      handleShowToast('error', 'Session Error', err.message || 'Failed to start work session.');
    }
  };

  const handlePauseSession = async () => {
    if (!activeSession) return;
    try {
      const updated = await apiPatch(`/work-sessions/${activeSession.id}/pause`, {});
      setActiveSession(updated);
      handleShowToast('warning', 'Session Paused', 'Operational session PAUSED. Workflows locked.');
    } catch (err) {
      handleShowToast('error', 'Session Error', err.message);
    }
  };

  const handleResumeSession = async () => {
    if (!activeSession) return;
    try {
      const updated = await apiPatch(`/work-sessions/${activeSession.id}/resume`, {});
      setActiveSession(updated);
      handleShowToast('info', 'Session Resumed', 'Operational session is now ACTIVE.');
    } catch (err) {
      handleShowToast('error', 'Session Error', err.message);
    }
  };

  const handleCloseSession = async ({ actual_counted_cash, notes }) => {
    if (!activeSession) return;
    try {
      const result = await apiPost(`/work-sessions/${activeSession.id}/close`, {
        actual_counted_cash,
        notes,
      });
      setActiveSession(null);
      setIsSessionCloseModalOpen(false);
      const variance = result.variance ?? 0;
      if (variance === 0) {
        handleShowToast('success', 'Session Reconciled & Closed', `Cash matched exactly.`);
      } else {
        handleShowToast(
          'error',
          'Session Closed with Variance',
          `Cash ${variance < 0 ? 'shortage' : 'overage'} of $${Math.abs(variance).toFixed(2)} logged.`
        );
      }
    } catch (err) {
      handleShowToast('error', 'Session Close Error', err.message);
    }
  };

  const handleLogout = async () => {
    handleShowToast('info', 'Signing Out', 'Clearing session and signing you out...');
    await logout();
  };

  const handleLoginSuccess = (loggedInUser) => {
    handleShowToast('success', 'Authenticated', `Welcome back, ${loggedInUser.fullName}!`);
    setActiveTab('dashboard');
  };

  // Not authenticated → show login (keyed by sessionKey to ensure full remount after logout)
  if (!isAuthenticated || !user) {
    return (
      <div key={`login-${sessionKey}`}>
        <LoginView onLoginSuccess={handleLoginSuccess} />
        <ToastNotification toasts={toasts} onDismiss={handleDismissToast} />
      </div>
    );
  }

  const currentRole = user.role;

  return (
    // key={sessionKey} ensures full remount of entire tree on logout → zero data bleed
    <div key={`app-${sessionKey}`} style={{ minHeight: '100vh', background: 'var(--color-paper)', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navigation */}
      <Navbar
        currentUser={user}
        theme={theme}
        toggleTheme={toggleTheme}
        lowStockCount={lowStockCount}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onNavigateToLowStock={() => handleSetActiveTab('inventory')}
        onLogout={handleLogout}
      />

      {/* Layer B: Operational Work Context Bar */}
      <WorkSessionBar
        currentRole={currentRole}
        activeSession={activeSession}
        onStartSession={handleStartSession}
        onPauseSession={handlePauseSession}
        onResumeSession={handleResumeSession}
        onOpenCloseModal={() => setIsSessionCloseModalOpen(true)}
        onShowToast={handleShowToast}
      />

      <div style={{ display: 'flex', flex: 1 }}>
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={handleSetActiveTab}
          currentUser={user}
          onLogout={handleLogout}
        />

        {/* Main Content Area */}
        <main style={{ flex: 1, padding: '24px', maxWidth: '1400px' }}>
          <Suspense
            fallback={
              <div className="loading-fallback-container">
                <div className="loading-spinner-warm"></div>
                <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-ink-muted)', letterSpacing: '0.03em' }}>Loading IMS Module...</p>
              </div>
            }
          >
            {activeTab === 'dashboard' && (
              <DashboardView
                currentRole={currentRole}
                currentUser={user}
                onNavigate={handleSetActiveTab}
                onShowToast={handleShowToast}
              />
            )}

            {activeTab === 'attention' && (
              <AttentionCenterView
                currentRole={currentRole}
                currentUser={user}
                onShowToast={handleShowToast}
                onNavigate={handleSetActiveTab}
              />
            )}

            {activeTab === 'stores' && (
              <StoresView currentRole={currentRole} currentUser={user} onShowToast={handleShowToast} />
            )}

            {activeTab === 'shifts' && (
              <ShiftManagementView currentRole={currentRole} currentUser={user} onShowToast={handleShowToast} />
            )}

            {activeTab === 'data_intake' && (
              <DataIntakeView currentRole={currentRole} currentUser={user} onShowToast={handleShowToast} />
            )}

            {activeTab === 'integrity' && (
              <IntegrityIntelligenceView currentRole={currentRole} currentUser={user} onShowToast={handleShowToast} />
            )}

            {activeTab === 'planning' && (
              <PlanningView currentRole={currentRole} currentUser={user} onShowToast={handleShowToast} />
            )}

            {activeTab === 'returns' && (
              <ReturnsView currentRole={currentRole} currentUser={user} onShowToast={handleShowToast} />
            )}

            {activeTab === 'transfers' && (
              <TransfersView currentRole={currentRole} currentUser={user} onShowToast={handleShowToast} />
            )}

            {activeTab === 'stocktake' && (
              <StocktakeView currentRole={currentRole} currentUser={user} onShowToast={handleShowToast} />
            )}

            {activeTab === 'promotions' && (
              <PromotionsView currentRole={currentRole} currentUser={user} onShowToast={handleShowToast} />
            )}

            {activeTab === 'employees' && (
              <EmployeesView currentRole={currentRole} currentUser={user} onShowToast={handleShowToast} />
            )}

            {activeTab === 'products' && (
              <ProductsView
                currentRole={currentRole}
                currentUser={user}
                onShowToast={handleShowToast}
              />
            )}

            {activeTab === 'inventory' && (
              <InventoryView
                currentRole={currentRole}
                currentUser={user}
                onShowToast={handleShowToast}
              />
            )}

            {activeTab === 'pos' && (
              <POSTerminalView
                currentRole={currentRole}
                currentUser={user}
                activeSession={activeSession}
                onShowToast={handleShowToast}
              />
            )}

            {activeTab === 'sales' && (
              <SalesGovernanceView
                currentRole={currentRole}
                currentUser={user}
                onShowToast={handleShowToast}
              />
            )}

            {activeTab === 'purchases' && (
              <PurchasesView
                currentRole={currentRole}
                currentUser={user}
                onShowToast={handleShowToast}
              />
            )}

            {activeTab === 'suppliers' && (
              <SuppliersView currentRole={currentRole} currentUser={user} onShowToast={handleShowToast} />
            )}

            {activeTab === 'customers' && (
              <CustomersView currentRole={currentRole} currentUser={user} onShowToast={handleShowToast} />
            )}

            {activeTab === 'reports' && (
              <ReportsView currentRole={currentRole} currentUser={user} onShowToast={handleShowToast} />
            )}

            {activeTab === 'users' && (
              <UsersView currentRole={currentRole} currentUser={user} onShowToast={handleShowToast} />
            )}

            {activeTab === 'audit' && (
              <AuditLogsView currentRole={currentRole} currentUser={user} onShowToast={handleShowToast} />
            )}
          </Suspense>
        </main>
      </div>

      {/* Global ⌘K Command Palette */}
      <GlobalCommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={handleSetActiveTab}
        toggleTheme={toggleTheme}
        theme={theme}
        currentRole={currentRole}
        currentUser={user}
      />

      {/* Session Close & Cash Float Reconciliation Modal */}
      {isSessionCloseModalOpen && (
        <SessionCloseModal
          activeSession={activeSession}
          onCloseSession={handleCloseSession}
          onCloseModal={() => setIsSessionCloseModalOpen(false)}
        />
      )}

      {/* Global Toast Notification Overlay */}
      <ToastNotification toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
}
