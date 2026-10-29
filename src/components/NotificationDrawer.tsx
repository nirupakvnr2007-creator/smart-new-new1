import React from 'react';
import { RestockRequest, ProductItem } from '../types';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  restockRequests: RestockRequest[];
  products: ProductItem[];
  onNavigateToRestock: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  restockRequests,
  products,
  onNavigateToRestock
}) => {
  if (!isOpen) return null;

  const lowStockProducts = products.filter((p) => p.availableStock <= p.minThreshold);
  const pendingRequests = restockRequests.filter((r) => r.status === 'Pending');

  return (
    <div className="fixed inset-0 z-50 bg-[#213145]/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        <div className="p-4 border-b border-[#e5eeff] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#dce1ff] text-[#0037b0] flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">notifications_active</span>
            </div>
            <div>
              <h3 className="font-headline font-bold text-[16px] text-[#0b1c30]">
                Shop Alerts
              </h3>
              <span className="text-[11px] text-[#565e74]">
                {lowStockProducts.length} low stock notification{lowStockProducts.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#f8f9ff] hover:bg-[#eff4ff] flex items-center justify-center text-[#434655] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto space-y-3">
          {lowStockProducts.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <span className="material-symbols-outlined text-[32px] text-[#004f35]">
                check_circle
              </span>
              <p className="text-[13px] font-bold text-[#0b1c30]">All Stocks Healthy</p>
              <p className="text-[11px] text-[#565e74]">
                No items are currently below their minimum threshold.
              </p>
            </div>
          ) : (
            lowStockProducts.map((p) => (
              <div
                key={p.id}
                onClick={() => {
                  onNavigateToRestock();
                  onClose();
                }}
                className="p-3 bg-[#ffdad6] rounded-xl border border-[#ffb4ab] cursor-pointer hover:shadow-sm transition-all space-y-1"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[#93000a] font-bold text-[12px]">
                    <span className="material-symbols-outlined text-[16px]">warning</span>
                    <span>Stock Below Threshold</span>
                  </div>
                  <span className="font-mono text-[10px] text-[#93000a] font-bold">{p.sku}</span>
                </div>
                <p className="text-[12px] text-[#0b1c30] font-semibold">
                  {p.name} ({p.brand})
                </p>
                <p className="text-[11px] text-[#565e74]">
                  Stock: <strong className="text-[#93000a]">{p.availableStock}</strong> • Min Threshold:{' '}
                  <strong>{p.minThreshold}</strong>
                </p>
                <span className="text-[10px] text-[#0037b0] font-bold block pt-1">
                  Tap to review supplier restock →
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
