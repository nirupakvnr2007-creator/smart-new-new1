import React, { useState } from 'react';
import { ProductItem, SalesTransaction, SalesItem, UserAccount } from '../../types';
import { QRCodeSVG } from '../../utils/qrGenerator';
import { COUNTRY_CODES, validatePhoneNumber } from '../../utils/validation';

interface PosBillingScreenProps {
  products: ProductItem[];
  currentUser: UserAccount;
  transactions: SalesTransaction[];
  onCompleteSale: (
    items: SalesItem[],
    subtotal: number,
    tax: number,
    total: number,
    paymentMethod: 'Cash' | 'UPI' | 'Card',
    customerPhone: string,
    cashierName: string,
    cashierEmail: string
  ) => void;
  onShowToast: (msg: string) => void;
  onShowFeedbackPage: (product: ProductItem) => void;
}

export const PosBillingScreen: React.FC<PosBillingScreenProps> = ({
  products,
  currentUser,
  transactions,
  onCompleteSale,
  onShowToast,
  onShowFeedbackPage
}) => {
  const [activeTab, setActiveTab] = useState<'checkout' | 'history'>('checkout');
  const [cart, setCart] = useState<Array<{ product: ProductItem; quantity: number }>>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [customerPhone, setCustomerPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Cash' | 'Card'>('UPI');
  const [lastReceipt, setLastReceipt] = useState<SalesTransaction | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [qrModalProduct, setQrModalProduct] = useState<ProductItem | null>(null);

  // Automatic addition: add product to cart by product or SKU
  const addToCart = (product: ProductItem) => {
    if (product.availableStock <= 0) {
      onShowToast(`Out of stock: ${product.name} has 0 available units.`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.availableStock) {
          onShowToast(
            `Stock Limit Reached: Only ${product.availableStock} units of "${product.name}" in stock.`
          );
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateCartQty = (productId: string, delta: number) => {
    const item = cart.find((i) => i.product.id === productId);
    if (!item) return;

    if (delta > 0 && item.quantity >= item.product.availableStock) {
      onShowToast(
        `Cannot add more than available inventory (${item.product.availableStock} units).`
      );
      return;
    }

    setCart((prev) =>
      prev
        .map((i) => {
          if (i.product.id === productId) {
            const nextQty = i.quantity + delta;
            return nextQty > 0 ? { ...i, quantity: nextQty } : null;
          }
          return i;
        })
        .filter(Boolean) as Array<{ product: ProductItem; quantity: number }>
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const clearCart = () => setCart([]);

  // Barcode / Name search instant add
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const query = searchQuery.trim().toLowerCase();
    const matched = products.find(
      (p) =>
        p.sku.toLowerCase() === query ||
        p.name.toLowerCase().includes(query) ||
        (p.qrCode && p.qrCode.toLowerCase().includes(query))
    );

    if (matched) {
      addToCart(matched);
      setSearchQuery('');
      onShowToast(`Added "${matched.name}" to billing slip.`);
    } else {
      onShowToast(`No matching product found for "${searchQuery}".`);
    }
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const tax = Math.round(subtotal * 0.05); // 5% GST
  const total = subtotal + tax;

  const handleCheckout = () => {
    if (cart.length === 0) {
      onShowToast('Cart is empty. Add products to bill.');
      return;
    }

    setPhoneError(null);
    const phoneValidation = validatePhoneNumber(countryCode, customerPhone);
    if (!phoneValidation.isValid) {
      const errMsg = phoneValidation.message || 'Invalid phone number format.';
      setPhoneError(errMsg);
      onShowToast(`Phone Validation: ${errMsg}`);
      return;
    }

    const cleanDigits = customerPhone.replace(/\D/g, '');
    const cleanPhone = `${countryCode} ${cleanDigits}`;

    // Verify stock availability
    for (const item of cart) {
      const current = products.find((p) => p.id === item.product.id);
      if (!current || item.quantity > current.availableStock) {
        onShowToast(
          `Insufficient stock for "${item.product.name}". Available: ${current?.availableStock || 0}`
        );
        return;
      }
    }

    const salesItems: SalesItem[] = cart.map((c) => ({
      productId: c.product.id,
      sku: c.product.sku,
      name: c.product.name,
      brand: c.product.brand,
      price: c.product.price,
      quantity: c.quantity,
      qrCode: c.product.qrCode
    }));

    const receiptNum = `REC-${Math.floor(100000 + Math.random() * 900000)}`;

    const newTxn: SalesTransaction = {
      id: `txn-${Date.now()}`,
      shopId: currentUser.shopId,
      receiptNumber: receiptNum,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      cashierName: currentUser.name,
      cashierEmail: currentUser.email,
      customerPhone: cleanPhone,
      items: salesItems,
      subtotal,
      tax,
      total,
      paymentMethod
    };

    onCompleteSale(
      salesItems,
      subtotal,
      tax,
      total,
      paymentMethod,
      cleanPhone,
      currentUser.name,
      currentUser.email
    );

    setLastReceipt(newTxn);
    setShowReceiptModal(true);
    setCart([]);
    setCustomerPhone('');
    onShowToast(`Receipt ${receiptNum} completed for phone ${cleanPhone}! Recorded in database.`);
  };

  const shopProducts = currentUser.shopId
    ? products.filter((p) => !p.shopId || p.shopId === currentUser.shopId)
    : products;
  const shopTransactions = currentUser.shopId
    ? transactions.filter((t) => !t.shopId || t.shopId === currentUser.shopId)
    : transactions;

  // Filter products for quick shelf
  const filteredProducts = shopProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col w-full space-y-4">
      {/* Top Banner */}
      <div className="bg-white rounded-xl p-3.5 shadow-xs border border-[#e5eeff] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-[#0037b0] text-white flex items-center justify-center shadow-xs">
            <span className="material-symbols-outlined text-[20px]">point_of_sale</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-headline font-bold text-[15px] text-[#0b1c30]">
                Cashier Billing Counter
              </span>
              <span className="text-[10px] bg-[#85f8c4] text-[#002114] px-1.5 py-0.2 rounded font-bold">
                READY
              </span>
            </div>
            <span className="text-[11px] text-[#565e74]">
              Active Cashier: <strong>{currentUser.name}</strong> • Records customer phone for QR verification
            </span>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-[#eff4ff] p-1 rounded-lg border border-[#dae2fd]">
          <button
            onClick={() => setActiveTab('checkout')}
            className={`px-3 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
              activeTab === 'checkout'
                ? 'bg-white text-[#0037b0] shadow-xs'
                : 'text-[#565e74]'
            }`}
          >
            Billing Counter
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
              activeTab === 'history'
                ? 'bg-white text-[#0037b0] shadow-xs'
                : 'text-[#565e74]'
            }`}
          >
            Sales Log ({transactions.length})
          </button>
        </div>
      </div>

      {activeTab === 'checkout' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* LEFT: Products selection & Quick Barcode Add */}
          <div className="lg:col-span-7 flex flex-col space-y-3">
            {/* Automatic Product Addition / Search bar */}
            <form onSubmit={handleBarcodeSubmit} className="relative">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#565e74] text-[18px]">
                barcode_scanner
              </span>
              <input
                type="text"
                placeholder="Scan barcode or type Product Name / SKU to auto-add..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-[#dae2fd] pl-9 pr-24 py-2.5 rounded-xl text-[13px] outline-none focus:border-[#0037b0] focus:ring-2 focus:ring-[#0037b0]/20 shadow-xs"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1.5 px-3 py-1.5 bg-[#0037b0] text-white rounded-lg text-[11px] font-bold cursor-pointer hover:bg-[#1d4ed8]"
              >
                Auto-Add +
              </button>
            </form>

            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-[#565e74] uppercase tracking-wider">
                Store Catalog ({products.length} Products)
              </span>
              <span className="text-[11px] text-[#565e74]">
                Tap product to add to billing slip
              </span>
            </div>

            {/* Catalog Grid */}
            {products.length === 0 ? (
              <div className="bg-white rounded-xl p-8 border border-[#e5eeff] text-center space-y-2">
                <span className="material-symbols-outlined text-[32px] text-[#565e74]">
                  inventory_2
                </span>
                <h4 className="font-headline font-bold text-[15px] text-[#0b1c30]">
                  No Products in Store Database
                </h4>
                <p className="text-[12px] text-[#565e74] max-w-sm mx-auto">
                  Ask the Manager to add products with supplier info, stock counts, and packaging QR codes.
                </p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="bg-white rounded-xl p-6 border border-[#e5eeff] text-center text-[#565e74] text-[12px]">
                No products match &quot;{searchQuery}&quot;.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {filteredProducts.map((p) => {
                  const isOutOfStock = p.availableStock <= 0;
                  const isLow = p.availableStock <= p.minThreshold;

                  return (
                    <div
                      key={p.id}
                      className="bg-white rounded-xl border border-[#dae2fd] p-2.5 flex flex-col justify-between h-36 shadow-xs hover:border-[#0037b0] transition-all"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[9px] font-bold text-[#565e74]">
                            {p.sku}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                              isOutOfStock
                                ? 'bg-[#ffdad6] text-[#ba1a1a]'
                                : isLow
                                ? 'bg-[#fff0db] text-[#ba7000]'
                                : 'bg-[#e5eeff] text-[#0037b0]'
                            }`}
                          >
                            {isOutOfStock ? '0 stock' : `${p.availableStock} in stock`}
                          </span>
                        </div>
                        <h4 className="font-bold text-[13px] text-[#0b1c30] line-clamp-1 mt-1">
                          {p.name}
                        </h4>
                        <span className="text-[10px] text-[#565e74] block truncate">
                          {p.brand}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-[#eff4ff] flex items-center justify-between">
                        <div>
                          <span className="font-headline font-bold text-[14px] text-[#0037b0]">
                            ₹{p.price}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          {/* Show QR button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setQrModalProduct(p);
                            }}
                            className="w-7 h-7 rounded-md bg-[#eff4ff] hover:bg-[#dce1ff] text-[#0037b0] flex items-center justify-center cursor-pointer"
                            title="Show Product QR Code"
                          >
                            <span className="material-symbols-outlined text-[15px]">qr_code</span>
                          </button>

                          {/* Add to Bill */}
                          <button
                            type="button"
                            onClick={() => addToCart(p)}
                            disabled={isOutOfStock}
                            className="px-2 py-1 bg-[#0037b0] hover:bg-[#1d4ed8] disabled:opacity-40 text-white rounded-md text-[11px] font-bold flex items-center gap-0.5 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[14px]">add</span>
                            <span>Add</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT: Current Billing Register Slip */}
          <div className="lg:col-span-5 bg-white rounded-xl p-4 shadow-xs border border-[#e5eeff] flex flex-col justify-between space-y-3">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#eff4ff]">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-[#0037b0]">
                    receipt_long
                  </span>
                  <h3 className="font-headline font-bold text-[15px] text-[#0b1c30]">
                    Billing Slip ({cart.length} item{cart.length === 1 ? '' : 's'})
                  </h3>
                </div>
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-[11px] text-[#ba1a1a] font-bold hover:underline cursor-pointer"
                  >
                    Clear Bill
                  </button>
                )}
              </div>

              {/* Customer Mobile Number Input (Mandatory for feedback verification!) */}
              <div className="p-3 bg-[#f8f9ff] rounded-xl border border-[#dae2fd] space-y-1.5">
                <label className="text-[11px] font-bold text-[#0b1c30] flex items-center justify-between">
                  <span>Customer Phone Number *</span>
                  <span className="text-[10px] text-[#0037b0] font-normal">
                    Stored for QR Buyer Verification
                  </span>
                </label>
                <div className="flex flex-col sm:flex-row gap-1.5">
                  <select
                    value={countryCode}
                    onChange={(e) => {
                      setCountryCode(e.target.value);
                      setPhoneError(null);
                    }}
                    className="bg-white border border-[#dae2fd] rounded-lg px-2 py-1.5 text-[12px] text-[#0b1c30] font-medium outline-none focus:border-[#0037b0] cursor-pointer sm:w-36"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.code} ({c.country})
                      </option>
                    ))}
                  </select>
                  <div className="flex-1 flex items-center gap-2 bg-white border border-[#dae2fd] rounded-lg px-2.5 py-1.5 focus-within:border-[#0037b0]">
                    <span className="material-symbols-outlined text-[#747686] text-[16px]">call</span>
                    <input
                      type="tel"
                      required
                      placeholder="Mobile number digits..."
                      value={customerPhone}
                      onChange={(e) => {
                        setCustomerPhone(e.target.value);
                        setPhoneError(null);
                      }}
                      className="w-full bg-transparent text-[13px] text-[#0b1c30] outline-none"
                    />
                  </div>
                </div>
                {phoneError && (
                  <p className="text-[11px] text-[#ba1a1a] font-medium">{phoneError}</p>
                )}
              </div>

              {/* Items in Slip */}
              {cart.length === 0 ? (
                <div className="py-10 text-center space-y-2">
                  <span className="material-symbols-outlined text-[32px] text-[#dae2fd]">
                    shopping_basket
                  </span>
                  <p className="text-[12px] text-[#565e74]">
                    Scan or tap products from the catalog to populate the counter bill.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#eff4ff] max-h-60 overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="py-2.5 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[13px] font-bold text-[#0b1c30] truncate">
                            {item.product.name}
                          </span>
                          <button
                            onClick={() => setQrModalProduct(item.product)}
                            className="text-[#0037b0] hover:text-[#1d4ed8] cursor-pointer"
                            title="View Packaging QR Code"
                          >
                            <span className="material-symbols-outlined text-[14px]">qr_code</span>
                          </button>
                        </div>
                        <span className="text-[11px] text-[#565e74] block">
                          ₹{item.product.price} × {item.quantity} = ₹
                          {item.product.price * item.quantity}
                        </span>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => updateCartQty(item.product.id, -1)}
                          className="w-6 h-6 rounded bg-[#eff4ff] text-[#0b1c30] flex items-center justify-center font-bold text-[14px] hover:bg-[#dae2fd] cursor-pointer"
                        >
                          -
                        </button>
                        <span className="w-7 text-center font-bold text-[13px] tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateCartQty(item.product.id, 1)}
                          className="w-6 h-6 rounded bg-[#eff4ff] text-[#0b1c30] flex items-center justify-center font-bold text-[14px] hover:bg-[#dae2fd] cursor-pointer"
                        >
                          +
                        </button>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="text-[#ba1a1a] hover:text-[#93000a] ml-1 cursor-pointer"
                          title="Remove item"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Billing Summary & Payment */}
            {cart.length > 0 && (
              <div className="pt-3 border-t border-[#dae2fd] space-y-3">
                <div className="space-y-1 text-[12px]">
                  <div className="flex justify-between text-[#565e74]">
                    <span>Subtotal</span>
                    <span className="tabular-nums font-semibold">₹{subtotal}</span>
                  </div>
                  <div className="flex justify-between text-[#565e74]">
                    <span>Estimated Tax (5% GST)</span>
                    <span className="tabular-nums font-semibold">₹{tax}</span>
                  </div>
                  <div className="flex justify-between text-[#0b1c30] font-headline font-bold text-[16px] pt-1 border-t border-[#eff4ff]">
                    <span>Grand Total</span>
                    <span className="text-[#0037b0] tabular-nums">₹{total}</span>
                  </div>
                </div>

                {/* Tender Method */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#565e74] uppercase">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['UPI', 'Cash', 'Card'] as const).map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`py-2 rounded-lg text-[12px] font-bold cursor-pointer transition-colors ${
                          paymentMethod === method
                            ? 'bg-[#0037b0] text-white shadow-xs'
                            : 'bg-[#eff4ff] text-[#565e74] hover:bg-[#dae2fd]'
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Checkout Trigger */}
                <button
                  type="button"
                  onClick={handleCheckout}
                  className="w-full py-3 bg-[#0037b0] hover:bg-[#1d4ed8] text-white rounded-xl text-[13px] font-bold shadow-md cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.99] transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  <span>Complete Bill &amp; Update DB (₹{total})</span>
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* TAB: SALES LOG / TRANSACTIONS */
        <div className="bg-white rounded-xl p-4 shadow-xs border border-[#e5eeff] space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#eff4ff]">
            <h3 className="font-headline font-bold text-[15px] text-[#0b1c30]">
              Completed Sales Log ({shopTransactions.length})
            </h3>
            <span className="text-[11px] text-[#565e74]">
              Recorded in store database with customer phone numbers
            </span>
          </div>

          {shopTransactions.length === 0 ? (
            <div className="text-center py-10 text-[#565e74] text-[13px]">
              No transactions completed yet.
            </div>
          ) : (
            <div className="divide-y divide-[#eff4ff]">
              {shopTransactions.map((txn) => (
                <div key={txn.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-headline font-bold text-[14px] text-[#0b1c30]">
                        {txn.receiptNumber}
                      </span>
                      <span className="px-2 py-0.2 rounded-full bg-[#85f8c4] text-[#002114] text-[10px] font-bold">
                        {txn.paymentMethod}
                      </span>
                      {txn.customerPhone && (
                        <span className="px-2 py-0.2 rounded-full bg-[#eff4ff] text-[#0037b0] text-[10px] font-bold border border-[#dae2fd] flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">call</span>
                          <span>{txn.customerPhone}</span>
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#565e74] mt-0.5">
                      Cashier: <strong>{txn.cashierName}</strong> • {txn.timestamp} •{' '}
                      {txn.items.length} item{txn.items.length > 1 ? 's' : ''}
                    </div>
                    <div className="text-[11px] text-[#565e74] mt-1">
                      {txn.items.map((i) => `${i.name} (${i.quantity}x)`).join(', ')}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-headline font-bold text-[16px] text-[#0037b0] tabular-nums block">
                      ₹{txn.total}
                    </span>
                    <button
                      onClick={() => {
                        setLastReceipt(txn);
                        setShowReceiptModal(true);
                      }}
                      className="text-[11px] font-bold text-[#0037b0] hover:underline cursor-pointer"
                    >
                      View Receipt
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Product QR Modal (shows the genuine QR of the product as requested) */}
      {qrModalProduct && (
        <div className="fixed inset-0 z-50 bg-[#213145]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-sm border border-[#e5eeff] space-y-3 text-center">
            <div className="flex items-center justify-between pb-2 border-b border-[#eff4ff]">
              <h3 className="font-headline font-bold text-[15px] text-[#0b1c30]">
                Product Packaging QR Code
              </h3>
              <button
                onClick={() => setQrModalProduct(null)}
                className="w-7 h-7 rounded-full bg-[#eff4ff] flex items-center justify-center text-[#565e74] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            <div className="p-3 bg-[#f8f9ff] rounded-xl border border-[#dae2fd] flex flex-col items-center">
              <QRCodeSVG
                value={`${window.location.origin}/?feedback=${qrModalProduct.id}`}
                size={160}
              />
              <h4 className="font-bold text-[14px] text-[#0b1c30] mt-2">
                {qrModalProduct.name}
              </h4>
              <p className="text-[11px] text-[#565e74]">
                Brand: {qrModalProduct.brand} • Price: ₹{qrModalProduct.price}
              </p>
              <p className="font-mono text-[10px] text-[#0037b0] mt-1 break-all px-1">
                {window.location.origin}/?feedback={qrModalProduct.id}
              </p>
            </div>

            <p className="text-[11px] text-[#565e74]">
              Customers can scan this QR code with any mobile camera to verify their purchase and rate the product.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => {
                  window.print();
                  setQrModalProduct(null);
                }}
                className="py-2 bg-[#0037b0] text-white text-[12px] font-bold rounded-lg cursor-pointer"
              >
                Print Label
              </button>
              <button
                onClick={() => {
                  const p = qrModalProduct;
                  setQrModalProduct(null);
                  onShowFeedbackPage(p);
                }}
                className="py-2 bg-[#eff4ff] text-[#0037b0] border border-[#dae2fd] text-[12px] font-bold rounded-lg cursor-pointer"
              >
                Open Feedback Page
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completed Receipt Modal */}
      {showReceiptModal && lastReceipt && (
        <div className="fixed inset-0 z-50 bg-[#213145]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-sm border border-[#e5eeff] space-y-3">
            <div className="text-center space-y-1 pb-2 border-b border-[#eff4ff]">
              <div className="w-10 h-10 rounded-full bg-[#85f8c4] text-[#002114] flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-[20px]">check</span>
              </div>
              <h3 className="font-headline font-bold text-[16px] text-[#0b1c30]">
                Payment Successful
              </h3>
              <p className="text-[11px] text-[#565e74]">
                Receipt {lastReceipt.receiptNumber} • {lastReceipt.timestamp}
              </p>
              {lastReceipt.customerPhone && (
                <div className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-[#eff4ff] text-[#0037b0] text-[11px] font-bold border border-[#dae2fd]">
                  Customer: {lastReceipt.customerPhone}
                </div>
              )}
            </div>

            <div className="space-y-1.5 text-[12px] max-h-44 overflow-y-auto">
              {lastReceipt.items.map((i, idx) => (
                <div key={idx} className="flex justify-between text-[#0b1c30]">
                  <span>
                    {i.name} (x{i.quantity})
                  </span>
                  <span className="font-mono font-bold">₹{i.price * i.quantity}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-[#dae2fd] space-y-1 text-[12px]">
              <div className="flex justify-between text-[#565e74]">
                <span>Tax (5% GST)</span>
                <span>₹{lastReceipt.tax}</span>
              </div>
              <div className="flex justify-between font-bold text-[14px] text-[#0b1c30]">
                <span>Total Paid ({lastReceipt.paymentMethod})</span>
                <span className="text-[#0037b0]">₹{lastReceipt.total}</span>
              </div>
              <div className="text-[11px] text-[#565e74] text-center pt-1">
                Cashier: {lastReceipt.cashierName}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="py-2 rounded-lg bg-[#eff4ff] border border-[#dae2fd] text-[#0037b0] text-[12px] font-bold cursor-pointer"
              >
                Print Receipt
              </button>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="py-2 rounded-lg bg-[#0037b0] text-white text-[12px] font-bold cursor-pointer"
              >
                Done / Next Bill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
