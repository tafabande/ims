import React, { useState, useEffect } from 'react';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import GlobalCommandPalette from './components/layout/GlobalCommandPalette';
import ToastNotification from './components/common/ToastNotification';
import LoginView from './components/auth/LoginView';

import DashboardView from './components/dashboard/DashboardView';
import ProductsView from './components/products/ProductsView';
import InventoryView from './components/inventory/InventoryView';
import SalesView from './components/sales/SalesView';
import PurchasesView from './components/purchases/PurchasesView';
import SuppliersView from './components/suppliers/SuppliersView';
import CustomersView from './components/customers/CustomersView';
import ReportsView from './components/reports/ReportsView';
import UsersView from './components/users/UsersView';
import AuditLogsView from './components/audit/AuditLogsView';

import StoresView from './components/stores/StoresView';
import ShiftManagementView from './components/shifts/ShiftManagementView';
import ReturnsView from './components/returns/ReturnsView';
import TransfersView from './components/transfers/TransfersView';
import StocktakeView from './components/stocktake/StocktakeView';
import PromotionsView from './components/promotions/PromotionsView';
import EmployeesView from './components/employees/EmployeesView';

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
          {activeTab === 'dashboard' && (
            <DashboardView
              products={products}
              transactions={transactions}
              sales={sales}
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
              onShowToast={handleShowToast}
            />
          )}

          {activeTab === 'returns' && (
            <ReturnsView
              onShowToast={handleShowToast}
            />
          )}

          {activeTab === 'transfers' && (
            <TransfersView
              onShowToast={handleShowToast}
            />
          )}

          {activeTab === 'stocktake' && (
            <StocktakeView
              onShowToast={handleShowToast}
            />
          )}

          {activeTab === 'promotions' && (
            <PromotionsView
              currentRole={currentRole}
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
              onStockAdjustment={handleStockAdjustment}
              currentRole={currentRole}
              onShowToast={handleShowToast}
            />
          )}

          {activeTab === 'sales' && (
            <SalesView
              sales={sales}
              products={products}
              customers={customers}
              onProcessSale={handleProcessSale}
              currentRole={currentRole}
              onShowToast={handleShowToast}
            />
          )}

          {activeTab === 'purchases' && (
            <PurchasesView
              purchases={purchases}
              suppliers={suppliers}
              products={products}
              onCreatePurchase={handleCreatePurchase}
              onReceivePurchase={handleReceivePurchase}
              currentRole={currentRole}
              onShowToast={handleShowToast}
            />
          )}

          {activeTab === 'suppliers' && (
            <SuppliersView
              suppliers={suppliers}
              onAddSupplier={handleAddSupplier}
              currentRole={currentRole}
              onShowToast={handleShowToast}
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

      {/* Global Toast Notification Overlay */}
      <ToastNotification toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
}
