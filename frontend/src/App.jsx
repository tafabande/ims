import React, { useState, useEffect } from 'react';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import WorkSessionBar from './components/layout/WorkSessionBar';
import SessionCloseModal from './components/shifts/SessionCloseModal';
import GlobalCommandPalette from './components/layout/GlobalCommandPalette';
import ToastNotification from './components/common/ToastNotification';
import LoginView from './components/auth/LoginView';

import { lazy, Suspense } from 'react';

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




import { 
  INITIAL_PRODUCTS, 
  INITIAL_CATEGORIES, 
  INITIAL_SUPPLIERS, 
  INITIAL_CUSTOMERS, 
  INITIAL_TRANSACTIONS, 
  INITIAL_PURCHASES, 
  INITIAL_SALES,
  INITIAL_USERS
} from './data/mockData';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [theme, setTheme] = useState('dark');
  const [currentRole, setCurrentRole] = useState('APP_ADMIN'); // 'SYSADMIN' | 'APP_ADMIN' | 'MANAGER' | 'STAFF' | 'AUDITOR'
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Core Application Data State
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  const [suppliers, setSuppliers] = useState(INITIAL_SUPPLIERS);
  const [customers, setCustomers] = useState(INITIAL_CUSTOMERS);
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);
  const [purchases, setPurchases] = useState(INITIAL_PURCHASES);
  const [sales, setSales] = useState(INITIAL_SALES);
  const [users, setUsers] = useState(INITIAL_USERS);

  // Layer B: Operational Work Session State
  const [activeSession, setActiveSession] = useState({
    id: 1,
    session_code: 'WS-2026-0826-0041',
    session_type: 'SALES',
    status: 'ACTIVE',
    location_name: 'Harare Store #01',
    device_id: 'POS-01',
    opening_float: 200.00,
    total_sales_amount: 1420.00,
    total_refunds_amount: 80.00,
    expected_closing: 1540.00
  });
  const [isSessionCloseModalOpen, setIsSessionCloseModalOpen] = useState(false);

  const handleStartSession = (sessionData) => {
    setActiveSession({
      id: Date.now(),
      session_code: `WS-${Date.now().toString().slice(-6)}`,
      session_type: sessionData.session_type,
      status: 'ACTIVE',
      location_name: sessionData.location_name,
      device_id: sessionData.device_id,
      opening_float: sessionData.opening_float,
      total_sales_amount: 0.00,
      total_refunds_amount: 0.00,
      expected_closing: sessionData.opening_float
    });
  };

  const handlePauseSession = () => {
    if (activeSession) {
      setActiveSession({ ...activeSession, status: 'PAUSED' });
      handleShowToast('warning', 'Session Paused', 'Operational session PAUSED. Workflows locked.');
    }
  };

  const handleResumeSession = () => {
    if (activeSession) {
      setActiveSession({ ...activeSession, status: 'ACTIVE' });
      handleShowToast('info', 'Session Resumed', 'Operational session is now ACTIVE.');
    }
  };

  const handleCloseSession = ({ actual_counted_cash, notes }) => {
    if (!activeSession) return;
    const expected = (activeSession.opening_float || 0) + (activeSession.total_sales_amount || 0) - (activeSession.total_refunds_amount || 0);
    const variance = actual_counted_cash - expected;
    
    setActiveSession(null);
    setIsSessionCloseModalOpen(false);

    if (variance === 0) {
      handleShowToast('success', 'Session Reconciled & Closed', `Closing cash matched $${expected.toFixed(2)} exactly.`);
    } else {
      handleShowToast('error', 'Session Closed with Variance', `Cash ${variance < 0 ? 'shortage' : 'overage'} of $${Math.abs(variance).toFixed(2)} logged.`);
    }
  };

  // Central Sales Control Policy & Dynamic Exchange Rate State
  const [salesPolicy, setSalesPolicy] = useState({
    maxCashierDiscountPct: 5.0,
    highValueApprovalThreshold: 1000.00,
    standardTaxRatePct: 10.0,
    zigExchangeRate: 13.50, // 1 USD = 13.50 ZiG
    allowNegativeStockSale: false
  });

  const [gateways, setGateways] = useState([
    { id: 'cash', name: 'Cash (USD / ZiG)', type: 'CASH', surchargePct: 0.0, enabled: true, usage: 'BOTH' },
    { id: 'ecocash', name: 'EcoCash Mobile Money', type: 'MOBILE_WALLET', surchargePct: 2.5, enabled: true, usage: 'BOTH' },
    { id: 'telecash', name: 'Telecash Mobile', type: 'MOBILE_WALLET', surchargePct: 2.0, enabled: true, usage: 'CUSTOMER' },
    { id: 'onemoney', name: 'OneMoney NetOne', type: 'MOBILE_WALLET', surchargePct: 2.0, enabled: true, usage: 'CUSTOMER' },
    { id: 'innbucks', name: 'InnBucks Retail Voucher', type: 'RETAIL_WALLET', surchargePct: 1.0, enabled: true, usage: 'BOTH' },
    { id: 'card_local', name: 'Debit / Credit Card (Local EFTPOS)', type: 'CARD', surchargePct: 1.5, enabled: true, usage: 'BOTH' },
    { id: 'zipit', name: 'Inter-Bank ZIPIT Transfer', type: 'BANK_INTERBANK', surchargePct: 1.0, enabled: true, usage: 'BOTH' },
    { id: 'rtgs', name: 'RTGS Electronic Bank Transfer', type: 'BANK_DOMESTIC', surchargePct: 0.5, enabled: true, usage: 'BOTH' }
  ]);

  // Apply Theme Data Attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Global Toast Helper
  const handleShowToast = (type, title, message) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const handleDismissToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Global Keyboard Shortcuts (⌘K, Alt+D, Alt+P, Alt+I, Alt+S, Alt+R)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // ⌘K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
      // Alt shortcuts
      if (e.altKey) {
        if (e.key.toLowerCase() === 'd') { e.preventDefault(); setActiveTab('dashboard'); }
        if (e.key.toLowerCase() === 'p') { e.preventDefault(); setActiveTab('products'); }
        if (e.key.toLowerCase() === 'i') { e.preventDefault(); setActiveTab('inventory'); }
        if (e.key.toLowerCase() === 's') { e.preventDefault(); setActiveTab('sales'); }
        if (e.key.toLowerCase() === 'r') { e.preventDefault(); setActiveTab('reports'); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleTheme = () => {
    setTheme(prev => {
      const nextTheme = prev === 'dark' ? 'light' : 'dark';
      handleShowToast('info', 'Theme Toggled', `Switched workspace color mode to ${nextTheme.toUpperCase()}.`);
      return nextTheme;
    });
  };

  const lowStockCount = products.filter(p => p.stock_quantity <= p.reorder_level).length;

  // Handler: Add New Product
  const handleAddProduct = (newProduct) => {
    setProducts([newProduct, ...products]);
  };

  // Handler: Update Product
  const handleUpdateProduct = (updatedProduct) => {
    setProducts(products.map(p => p.id === updatedProduct.id ? updatedProduct : p));
  };

  // Handler: Delete Product
  const handleDeleteProduct = (productId) => {
    setProducts(products.filter(p => p.id !== productId));
  };

  // Handler: Stock Adjustment
  const handleStockAdjustment = ({ productId, quantity, type, reference, notes }) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    // Update Product Stock
    const updatedProducts = products.map(p => {
      if (p.id === productId) {
        return { ...p, stock_quantity: p.stock_quantity + quantity };
      }
      return p;
    });
    setProducts(updatedProducts);

    // Record Immutable Transaction
    const newTx = {
      id: Date.now(),
      product_id: productId,
      product_name: prod.name,
      type: type || 'ADJUSTMENT',
      quantity: quantity,
      reference: reference || `REF-${Date.now()}`,
      user_name: currentRole === 'ADMIN' ? 'Alice Admin' : currentRole === 'MANAGER' ? 'Bob Manager' : 'Charlie Staff',
      timestamp: new Date().toISOString(),
      notes: notes || ''
    };
    setTransactions([newTx, ...transactions]);
  };

  // Handler: Receive Purchase Order
  const handleReceivePurchase = (poId) => {
    const po = purchases.find(p => p.id === poId);
    if (!po || po.status === 'RECEIVED') return;

    // Update PO Status
    setPurchases(purchases.map(p => p.id === poId ? { ...p, status: 'RECEIVED', received_at: new Date().toISOString() } : p));

    // Automatically update stock levels & record purchase transactions
    po.items.forEach(item => {
      handleStockAdjustment({
        productId: item.product_id,
        quantity: item.quantity,
        type: 'PURCHASE',
        reference: po.po_number,
        notes: `PO Received from ${po.supplier_name}`
      });
    });
  };

  // Handler: Create Purchase Order
  const handleCreatePurchase = (newPo) => {
    setPurchases([newPo, ...purchases]);
  };

  // Handler: Process Sale
  const handleProcessSale = (newSale) => {
    setSales([newSale, ...sales]);

    // Update customer stats
    setCustomers(customers.map(c => {
      if (c.id === newSale.customer_id) {
        return {
          ...c,
          total_orders: c.total_orders + 1,
          total_spent: c.total_spent + newSale.total_amount
        };
      }
      return c;
    }));

    // Automatically reduce stock levels & record sale transactions
    newSale.items.forEach(item => {
      handleStockAdjustment({
        productId: item.product_id,
        quantity: -item.quantity,
        type: 'SALE',
        reference: newSale.invoice_number,
        notes: `Sale POS to ${newSale.customer_name}`
      });
    });
  };

  // Handler: Add Supplier
  const handleAddSupplier = (newSupplier) => {
    setSuppliers([...suppliers, newSupplier]);
  };

  // Handler: Add Customer
  const handleAddCustomer = (newCustomer) => {
    setCustomers([...customers, newCustomer]);
  };

  // Handler: Logout & Login Session Management
  const handleLogout = () => {
    setIsLoggedIn(false);
    handleShowToast('info', 'Logged Out', 'You have been signed out of IMS.');
  };

  const handleLogin = (selectedRole, userName) => {
    setCurrentRole(selectedRole);
    setIsLoggedIn(true);
    handleShowToast('success', 'Authenticated', `Welcome back, ${userName}!`);
  };

  if (!isLoggedIn) {
    return (
      <>
        <LoginView onLogin={handleLogin} />
        <ToastNotification toasts={toasts} onDismiss={handleDismissToast} />
      </>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-paper)', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navigation */}
      <Navbar
        currentRole={currentRole}
        setCurrentRole={(newRole) => {
          setCurrentRole(newRole);
          handleShowToast('info', 'Role Switched', `Active access role changed to ${newRole}.`);
        }}
        theme={theme}
        toggleTheme={toggleTheme}
        lowStockCount={lowStockCount}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onNavigateToLowStock={() => setActiveTab('inventory')}
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
          setActiveTab={setActiveTab}
          currentRole={currentRole}
          onLogout={handleLogout}
        />

        {/* Main Content Area */}
        <main style={{ flex: 1, padding: '24px', maxWidth: '1400px' }}>
          <Suspense fallback={
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3">
              <div className="w-8 h-8 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div>
              <p className="text-sm font-semibold tracking-wide">Loading module bundle...</p>
            </div>
          }>
            {activeTab === 'dashboard' && (
              <DashboardView
                products={products}
                transactions={transactions}
                sales={sales}
                purchases={purchases}
                users={users}
                currentRole={currentRole}
                onNavigate={setActiveTab}
                salesPolicy={salesPolicy}
              />
            )}

            {activeTab === 'attention' && (
              <AttentionCenterView
                currentRole={currentRole}
                onShowToast={handleShowToast}
                onNavigate={setActiveTab}
              />
            )}

            {activeTab === 'stores' && (
              <StoresView
                currentRole={currentRole}
                onShowToast={handleShowToast}
              />
            )}

            {activeTab === 'shifts' && (
              <ShiftManagementView
                currentRole={currentRole}
                onShowToast={handleShowToast}
                salesPolicy={salesPolicy}
              />
            )}

            {activeTab === 'data_intake' && (
              <DataIntakeView
                currentRole={currentRole}
                onShowToast={handleShowToast}
              />
            )}

            {activeTab === 'integrity' && (
              <IntegrityIntelligenceView
                currentRole={currentRole}
                onShowToast={handleShowToast}
              />
            )}

            {activeTab === 'planning' && (
              <PlanningView
                currentRole={currentRole}
                onShowToast={handleShowToast}
              />
            )}


            {activeTab === 'returns' && (
              <ReturnsView
                products={products}
                onShowToast={handleShowToast}
              />
            )}

            {activeTab === 'transfers' && (
              <TransfersView
                products={products}
                onShowToast={handleShowToast}
              />
            )}

            {activeTab === 'stocktake' && (
              <StocktakeView
                products={products}
                onShowToast={handleShowToast}
              />
            )}

            {activeTab === 'promotions' && (
              <PromotionsView
                products={products}
                onShowToast={handleShowToast}
              />
            )}

            {activeTab === 'employees' && (
              <EmployeesView
                currentRole={currentRole}
                onShowToast={handleShowToast}
              />
            )}

            {activeTab === 'products' && (
              <ProductsView
                products={products}
                categories={categories}
                suppliers={suppliers}
                onAddProduct={handleAddProduct}
                onUpdateProduct={handleUpdateProduct}
                onDeleteProduct={handleDeleteProduct}
                currentRole={currentRole}
                onShowToast={handleShowToast}
              />
            )}

            {activeTab === 'inventory' && (
              <InventoryView
                products={products}
                transactions={transactions}
                onAdjustStock={handleStockAdjustment}
                onExportCSV={(data, filename) => handleShowToast('info', 'Export Started', `Downloading ${filename}`)}
                onShowToast={handleShowToast}
                currentRole={currentRole}
              />
            )}

            {activeTab === 'pos' && (
              <POSTerminalView
                products={products}
                sales={sales}
                customers={customers}
                onProcessSale={handleProcessSale}
                currentRole={currentRole}
                onShowToast={handleShowToast}
                salesPolicy={salesPolicy}
                gateways={gateways}
              />
            )}

            {activeTab === 'sales' && (
              <SalesGovernanceView
                products={products}
                sales={sales}
                customers={customers}
                onProcessSale={handleProcessSale}
                currentRole={currentRole}
                onShowToast={handleShowToast}
                salesPolicy={salesPolicy}
                setSalesPolicy={setSalesPolicy}
                gateways={gateways}
                setGateways={setGateways}
              />
            )}

            {activeTab === 'purchases' && (
              <PurchasesView
                products={products}
                purchases={purchases}
                suppliers={suppliers}
                onAddPurchase={handleCreatePurchase}
                onReceivePurchase={handleReceivePurchase}
              />
            )}

            {activeTab === 'suppliers' && (
              <SuppliersView
                suppliers={suppliers}
                onAddSupplier={handleAddSupplier}
              />
            )}

            {activeTab === 'customers' && (
              <CustomersView
                customers={customers}
                onAddCustomer={handleAddCustomer}
                onShowToast={handleShowToast}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsView
                products={products}
                sales={sales}
                purchases={purchases}
                categories={categories}
                onShowToast={handleShowToast}
              />
            )}

            {activeTab === 'users' && (
              <UsersView
                users={users}
                currentRole={currentRole}
              />
            )}

            {activeTab === 'audit' && (
              <AuditLogsView
                transactions={transactions}
                onShowToast={handleShowToast}
              />
            )}
          </Suspense>
        </main>
      </div>

      {/* Global ⌘K Command Palette Overlay */}
      <GlobalCommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        products={products}
        onNavigate={setActiveTab}
        toggleTheme={toggleTheme}
        theme={theme}
        currentRole={currentRole}
        setCurrentRole={(newRole) => {
          setCurrentRole(newRole);
          handleShowToast('info', 'Role Switched', `Active access role changed to ${newRole}.`);
        }}
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
