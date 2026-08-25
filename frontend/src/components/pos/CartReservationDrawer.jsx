import React, { useState, useEffect } from 'react';
import { X, Clock, ShoppingCart, Store, Truck, CheckCircle, AlertTriangle } from 'lucide-react';

export default function CartReservationDrawer({
  isOpen,
  onClose,
  cartData,
  onCheckout,
  onCancelReservation,
  onShowToast
}) {
  const [fulfillmentType, setFulfillmentType] = useState('DELIVERY'); // DELIVERY or STORE_PICKUP
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [remainingSeconds, setRemainingSeconds] = useState(cartData?.ttl_remaining_seconds || 900);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!cartData) return;
    setRemainingSeconds(cartData.ttl_remaining_seconds || 900);
  }, [cartData]);

  // Live countdown timer
  useEffect(() => {
    if (!isOpen || remainingSeconds <= 0) return;
    const interval = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onShowToast?.('Cart Reservation Expired. Stock released.', 'error');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, remainingSeconds]);

  if (!isOpen || !cartData) return null;

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onCheckout({
        cart_id: cartData.id,
        payment_method: paymentMethod,
        fulfillment_type: fulfillmentType,
        customer_name: customerName
      });
    } catch (err) {
      onShowToast?.(err.message || 'Checkout failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const totalAmount = cartData.items?.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0) || 0;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 text-slate-100 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Active Cart Reservation</h2>
              <p className="text-xs text-slate-400 font-mono">{cartData.cart_code}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TTL Countdown Banner */}
        <div className={`p-4 border-b flex items-center justify-between ${
          remainingSeconds > 180 
            ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' 
            : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
        }`}>
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 animate-pulse" />
            <span className="text-xs font-semibold">Stock Reserved Commitment</span>
          </div>
          <div className="font-mono text-base font-bold tracking-wider">
            {remainingSeconds > 0 ? formatTimer(remainingSeconds) : 'EXPIRED'}
          </div>
        </div>

        {/* Scrollable Items List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Reserved Line Items</div>
          {cartData.items?.length === 0 ? (
            <p className="text-sm text-slate-500">No items reserved in cart.</p>
          ) : (
            <div className="space-y-2">
              {cartData.items?.map(item => (
                <div key={item.id} className="p-3 rounded-lg bg-slate-800/60 border border-slate-800 flex justify-between items-center">
                  <div>
                    <div className="text-sm font-semibold text-slate-200">Product #{item.product_id}</div>
                    <div className="text-xs text-slate-400">${item.unit_price?.toFixed(2)} × {item.quantity} units</div>
                  </div>
                  <div className="text-sm font-mono font-bold text-emerald-400">
                    ${(item.unit_price * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Fulfillment Selection */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Fulfilment Method</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFulfillmentType('DELIVERY')}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center space-y-1 transition ${
                  fulfillmentType === 'DELIVERY'
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                    : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Truck className="w-5 h-5" />
                <span className="text-xs font-semibold">Delivery</span>
              </button>

              <button
                type="button"
                onClick={() => setFulfillmentType('STORE_PICKUP')}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center space-y-1 transition ${
                  fulfillmentType === 'STORE_PICKUP'
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                    : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Store className="w-5 h-5" />
                <span className="text-xs font-semibold">Store Pickup</span>
              </button>
            </div>
          </div>

          {/* Customer & Payment Form */}
          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Customer Name</label>
              <input
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="CASH">Cash</option>
                <option value="CARD">Credit / Debit Card</option>
                <option value="MOBILE_MONEY">Mobile Money (EcoCash)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer Checkout Action */}
        <div className="p-6 border-t border-slate-800 bg-slate-950/60 space-y-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400">Total Payable:</span>
            <span className="text-xl font-bold font-mono text-emerald-400">${totalAmount.toFixed(2)}</span>
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={() => onCancelReservation(cartData.id)}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-xs font-semibold transition"
            >
              Cancel Reservation
            </button>

            <button
              type="button"
              disabled={submitting || remainingSeconds <= 0}
              onClick={handleCheckoutSubmit}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{submitting ? 'Processing Checkout...' : 'Confirm Checkout'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
