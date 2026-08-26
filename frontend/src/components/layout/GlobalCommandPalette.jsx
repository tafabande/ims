import React, { useState, useEffect } from 'react';
import { Search, X, Package, ShoppingCart, Boxes, BarChart3, Sun, Moon, ShieldCheck, ArrowRight, Sliders } from 'lucide-react';

export default function GlobalCommandPalette({ 
  isOpen, 
  onClose, 
  products, 
  onNavigate, 
  onSelectProduct,
  toggleTheme,
  theme,
  currentRole,
  setCurrentRole
}) {
  const [query, setQuery] = useState('');

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(query.toLowerCase()) || 
    p.sku.toLowerCase().includes(query.toLowerCase()) ||
    p.barcode.includes(query)
  ).slice(0, 5);

  const navigationCommands = [
    { label: 'Go to Dashboard Overview', tab: 'dashboard', icon: BarChart3, shortcut: 'Alt+D' },
    { label: 'Go to POS Checkout Register', tab: 'pos', icon: ShoppingCart, shortcut: 'Alt+S' },
    { label: 'Go to Sales Policy & Rates', tab: 'sales', icon: Sliders },
    { label: 'Go to Products Catalog', tab: 'products', icon: Package, shortcut: 'Alt+P' },
    { label: 'Go to Stock & Audit Ledger', tab: 'inventory', icon: Boxes, shortcut: 'Alt+I' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 200, alignItems: 'flex-start', paddingTop: '10vh' }}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()} 
        style={{ maxWidth: '640px', padding: '0px', overflow: 'hidden', border: '1px solid var(--color-accent)' }}
      >
        {/* Search Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '1px solid var(--color-rule)' }}>
          <Search size={20} color="var(--color-accent)" />
          <input
            type="text"
            autoFocus
            placeholder="Type a command, search products, SKUs, or jump to view..."
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--color-ink)',
              fontSize: '1rem',
              fontFamily: 'var(--font-body)'
            }}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <span style={{ fontSize: '0.7rem', color: 'var(--color-ink-dim)', fontFamily: 'var(--font-mono)', background: 'var(--color-paper-2)', padding: '2px 6px', borderRadius: '4px' }}>
            ESC
          </span>
        </div>

        {/* Command Search Results */}
        <div style={{ padding: '12px 16px', maxHeight: '380px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Products Match */}
          {query.trim() && (
            <div>
              <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)', uppercase: 'true', marginBottom: '8px', letterSpacing: '0.05em' }}>
                MATCHING PRODUCT SKUs ({filteredProducts.length})
              </div>
              {filteredProducts.length === 0 ? (
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-ink-dim)', padding: '8px 0' }}>No matching products found.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {filteredProducts.map(p => (
                    <div 
                      key={p.id}
                      onClick={() => { onNavigate('products'); onClose(); }}
                      style={{
                        padding: '10px 12px',
                        background: 'var(--color-paper-2)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Package size={16} color="var(--color-accent)" />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{p.name}</div>
                          <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-dim)' }}>SKU: {p.sku} • Stock: {p.stock_quantity}</div>
                        </div>
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-signal-green)' }}>
                        ${p.selling_price.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quick Navigation Commands */}
          <div>
            <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)', marginBottom: '8px', letterSpacing: '0.05em' }}>
              NAVIGATION COMMANDS
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {navigationCommands.map(cmd => {
                const Icon = cmd.icon;
                return (
                  <div
                    key={cmd.tab}
                    onClick={() => { onNavigate(cmd.tab); onClose(); }}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      justify: 'space-between',
                      cursor: 'pointer',
                      background: 'transparent',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-paper-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem' }}>
                      <Icon size={16} color="var(--color-ink-muted)" />
                      <span>{cmd.label}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-dim)', background: 'var(--color-paper-2)', padding: '2px 6px', borderRadius: '4px' }}>
                        {cmd.shortcut}
                      </span>
                      <ArrowRight size={14} color="var(--color-ink-dim)" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Controls & Quick Actions */}
          <div>
            <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)', marginBottom: '8px', letterSpacing: '0.05em' }}>
              SYSTEM CONTROLS
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="btn btn-secondary btn-sm" 
                style={{ flex: 1 }}
                onClick={() => { toggleTheme(); onClose(); }}
              >
                {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />} Switch Theme ({theme})
              </button>
              <button 
                className="btn btn-secondary btn-sm" 
                style={{ flex: 1 }}
                onClick={() => { 
                  setCurrentRole(currentRole === 'ADMIN' ? 'MANAGER' : currentRole === 'MANAGER' ? 'STAFF' : 'ADMIN');
                  onClose();
                }}
              >
                <ShieldCheck size={14} /> Toggle Role ({currentRole})
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
