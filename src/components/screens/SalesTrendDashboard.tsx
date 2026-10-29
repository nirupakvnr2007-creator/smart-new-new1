import React, { useState } from 'react';
import { ProductItem, SalesTransaction, UserAccount } from '../../types';

interface SalesTrendDashboardProps {
  transactions: SalesTransaction[];
  products: ProductItem[];
  currentUser: UserAccount;
}

export const SalesTrendDashboard: React.FC<SalesTrendDashboardProps> = ({
  transactions,
  products: _products,
  currentUser
}) => {
  const shopTransactions = currentUser.shopId
    ? transactions.filter((t) => !t.shopId || t.shopId === currentUser.shopId)
    : transactions;

  // Key KPI calculations strictly from cashier entries
  const totalRevenue = shopTransactions.reduce((sum, t) => sum + t.total, 0);
  const totalOrders = shopTransactions.length;
  const totalUnitsSold = shopTransactions.reduce(
    (sum, t) => sum + t.items.reduce((iSum, item) => iSum + item.quantity, 0),
    0
  );
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  // Payment method breakdown
  const paymentBreakdown = shopTransactions.reduce(
    (acc, t) => {
      acc[t.paymentMethod] = (acc[t.paymentMethod] || 0) + t.total;
      return acc;
    },
    { Cash: 0, UPI: 0, Card: 0 } as Record<string, number>
  );

  // Top selling products calculated strictly from cashier billed items
  const productSalesMap: Record<
    string,
    { name: string; brand: string; quantity: number; revenue: number }
  > = {};

  shopTransactions.forEach((txn) => {
    txn.items.forEach((item) => {
      const key = item.productId || item.name;
      if (!productSalesMap[key]) {
        productSalesMap[key] = {
          name: item.name,
          brand: item.brand || '',
          quantity: 0,
          revenue: 0
        };
      }
      productSalesMap[key].quantity += item.quantity;
      productSalesMap[key].revenue += item.price * item.quantity;
    });
  });

  const topProducts = Object.values(productSalesMap).sort((a, b) => b.quantity - a.quantity);

  // Cashier performance breakdown
  const cashierStats: Record<string, { orders: number; revenue: number }> = {};
  shopTransactions.forEach((txn) => {
    const cName = txn.cashierName || 'Cashier';
    if (!cashierStats[cName]) {
      cashierStats[cName] = { orders: 0, revenue: 0 };
    }
    cashierStats[cName].orders += 1;
    cashierStats[cName].revenue += txn.total;
  });

  return (
    <div className="flex flex-col w-full space-y-4">
      {/* Top Banner */}
      <div className="bg-white rounded-xl p-4 shadow-xs border border-[#e5eeff] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#0037b0] text-[22px]">
              trending_up
            </span>
            <h2 className="font-headline font-bold text-[18px] text-[#0b1c30]">
              Shop Sales Trends &amp; Analytics
            </h2>
          </div>
          <p className="text-[12px] text-[#565e74] mt-0.5">
            Real-time business performance calculated strictly from cashier billing entries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-[#565e74] bg-[#eff4ff] px-2.5 py-1 rounded-md border border-[#dae2fd]">
            Active Role: <strong>{currentUser.role}</strong> ({currentUser.name})
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-3.5 border border-[#e5eeff] shadow-xs">
          <span className="text-[11px] font-semibold text-[#565e74] uppercase tracking-wider block">
            Gross Revenue
          </span>
          <span className="font-headline font-bold text-[22px] text-[#0037b0] tabular-nums mt-1 block">
            ₹{totalRevenue.toLocaleString()}
          </span>
          <span className="text-[10px] text-[#565e74]">From {totalOrders} completed billings</span>
        </div>

        <div className="bg-white rounded-xl p-3.5 border border-[#e5eeff] shadow-xs">
          <span className="text-[11px] font-semibold text-[#565e74] uppercase tracking-wider block">
            Total Invoices
          </span>
          <span className="font-headline font-bold text-[22px] text-[#0b1c30] tabular-nums mt-1 block">
            {totalOrders}
          </span>
          <span className="text-[10px] text-[#565e74]">Checkout counter receipts</span>
        </div>

        <div className="bg-white rounded-xl p-3.5 border border-[#e5eeff] shadow-xs">
          <span className="text-[11px] font-semibold text-[#565e74] uppercase tracking-wider block">
            Units Sold
          </span>
          <span className="font-headline font-bold text-[22px] text-[#004f35] tabular-nums mt-1 block">
            {totalUnitsSold}
          </span>
          <span className="text-[10px] text-[#565e74]">Items scanned &amp; shipped</span>
        </div>

        <div className="bg-white rounded-xl p-3.5 border border-[#e5eeff] shadow-xs">
          <span className="text-[11px] font-semibold text-[#565e74] uppercase tracking-wider block">
            Avg Order Value
          </span>
          <span className="font-headline font-bold text-[22px] text-[#0b1c30] tabular-nums mt-1 block">
            ₹{avgOrderValue.toLocaleString()}
          </span>
          <span className="text-[10px] text-[#565e74]">Per customer ticket</span>
        </div>
      </div>

      {/* If No Transactions Yet */}
      {totalOrders === 0 ? (
        <div className="bg-white rounded-xl p-10 border border-[#e5eeff] text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-[#eff4ff] text-[#0037b0] flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-[28px]">query_stats</span>
          </div>
          <h3 className="font-headline font-bold text-[16px] text-[#0b1c30]">
            No Cashier Sales Recorded Yet
          </h3>
          <p className="text-[12px] text-[#565e74] max-w-md mx-auto leading-relaxed">
            Sales trends, revenue velocity, payment method breakdown, and top products will populate automatically as soon as cashiers process counter billings.
          </p>
        </div>
      ) : (
        <>
          {/* Sales Trend Chart & Payment Methods */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Recent Billing Timeline */}
            <div className="lg:col-span-2 bg-white rounded-xl p-4 border border-[#e5eeff] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-headline font-bold text-[15px] text-[#0b1c30]">
                    Recent Sales Activity Trend
                  </h3>
                  <span className="text-[11px] text-[#565e74]">
                    Chronological sales values from cashier POS register
                  </span>
                </div>
              </div>

              {/* Bar visualization */}
              <div className="pt-4 pb-2">
                <div className="h-40 flex items-end gap-2 border-b border-[#dae2fd] pb-2 overflow-x-auto">
                  {transactions.slice(-10).map((t, idx) => {
                    const maxVal = Math.max(...transactions.map((x) => x.total), 1);
                    const barHeightPct = Math.max(15, Math.round((t.total / maxVal) * 100));
                    return (
                      <div
                        key={t.id || idx}
                        className="flex-1 min-w-[36px] flex flex-col items-center gap-1 group relative"
                      >
                        {/* Tooltip */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-[#0b1c30] text-white text-[10px] px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-10">
                          ₹{t.total} ({t.items.length} items)
                        </div>
                        <div
                          style={{ height: `${barHeightPct}%` }}
                          className="w-full bg-[#0037b0] hover:bg-[#1d4ed8] rounded-t-md transition-all cursor-pointer"
                        ></div>
                        <span className="text-[9px] text-[#565e74] truncate max-w-[40px]">
                          {t.timestamp ? t.timestamp.split(' ')[0] : `#${idx + 1}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#565e74] pt-2">
                  <span>Oldest recent invoice</span>
                  <span>Latest checkout</span>
                </div>
              </div>
            </div>

            {/* Payment Method Breakdown */}
            <div className="bg-white rounded-xl p-4 border border-[#e5eeff] shadow-xs space-y-3">
              <h3 className="font-headline font-bold text-[15px] text-[#0b1c30]">
                Payment Methods
              </h3>
              <p className="text-[11px] text-[#565e74]">Tender breakdown across all billings</p>

              <div className="space-y-3 pt-2">
                {[
                  { name: 'UPI', val: paymentBreakdown.UPI || 0, color: 'bg-[#0037b0]' },
                  { name: 'Cash', val: paymentBreakdown.Cash || 0, color: 'bg-[#004f35]' },
                  { name: 'Card', val: paymentBreakdown.Card || 0, color: 'bg-[#854f00]' }
                ].map((pm) => {
                  const pct = totalRevenue > 0 ? Math.round((pm.val / totalRevenue) * 100) : 0;
                  return (
                    <div key={pm.name} className="space-y-1">
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="font-semibold text-[#0b1c30]">{pm.name}</span>
                        <span className="tabular-nums font-bold text-[#0b1c30]">
                          ₹{pm.val.toLocaleString()} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-[#eff4ff] rounded-full overflow-hidden">
                        <div
                          className={`h-full ${pm.color} rounded-full transition-all`}
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Top Selling Products & Cashier Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top Products */}
            <div className="bg-white rounded-xl p-4 border border-[#e5eeff] shadow-xs space-y-3">
              <h3 className="font-headline font-bold text-[15px] text-[#0b1c30]">
                Top Selling Products
              </h3>
              <p className="text-[11px] text-[#565e74]">Ranked by units billed by cashier</p>

              {topProducts.length === 0 ? (
                <p className="text-[12px] text-[#565e74] py-4 text-center">No products billed yet.</p>
              ) : (
                <div className="divide-y divide-[#eff4ff]">
                  {topProducts.slice(0, 5).map((p, idx) => (
                    <div key={p.name + idx} className="py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-[#eff4ff] text-[#0037b0] text-[10px] font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div>
                          <span className="text-[13px] font-bold text-[#0b1c30] block">
                            {p.name}
                          </span>
                          {p.brand && (
                            <span className="text-[11px] text-[#565e74]">{p.brand}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[13px] font-bold text-[#004f35] tabular-nums block">
                          {p.quantity} sold
                        </span>
                        <span className="text-[11px] text-[#565e74] tabular-nums">
                          ₹{p.revenue.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cashier Activity */}
            <div className="bg-white rounded-xl p-4 border border-[#e5eeff] shadow-xs space-y-3">
              <h3 className="font-headline font-bold text-[15px] text-[#0b1c30]">
                Cashier Terminal Volume
              </h3>
              <p className="text-[11px] text-[#565e74]">Orders processed by staff members</p>

              <div className="divide-y divide-[#eff4ff]">
                {Object.entries(cashierStats).map(([name, stat]) => (
                  <div key={name} className="py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#0037b0] text-[18px]">
                        account_circle
                      </span>
                      <span className="text-[13px] font-bold text-[#0b1c30]">{name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[13px] font-bold text-[#0b1c30] tabular-nums block">
                        ₹{stat.revenue.toLocaleString()}
                      </span>
                      <span className="text-[11px] text-[#565e74]">
                        {stat.orders} receipt{stat.orders > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
