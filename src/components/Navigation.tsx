import React from 'react';
import { RoleType } from '../types';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  role: RoleType;
  criticalCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  role,
  criticalCount = 0
}) => {
  // Determine tabs dynamically based on user role
  const getTabsForRole = () => {
    switch (role) {
      case 'Helper':
        return [
          { id: 'dashboard', label: 'Sales Trends', icon: 'trending_up' },
          { id: 'forum', label: 'Discussion', icon: 'forum' }
        ];

      case 'Cashier':
        return [
          { id: 'billing', label: 'POS Billing', icon: 'point_of_sale' },
          { id: 'dashboard', label: 'Sales Trends', icon: 'trending_up' },
          { id: 'forum', label: 'Discussion', icon: 'forum' }
        ];

      case 'Manager':
        return [
          { id: 'inventory', label: 'Products', icon: 'inventory_2' },
          {
            id: 'restock',
            label: 'Restock',
            icon: 'local_shipping',
            badge: criticalCount > 0 ? criticalCount : undefined
          },
          { id: 'dashboard', label: 'Sales Trends', icon: 'trending_up' },
          { id: 'forum', label: 'Discussion', icon: 'forum' }
        ];

      case 'Owner':
      default:
        return [
          { id: 'members', label: 'Members', icon: 'manage_accounts' },
          { id: 'inventory', label: 'Products', icon: 'inventory_2' },
          {
            id: 'restock',
            label: 'Restock',
            icon: 'local_shipping',
            badge: criticalCount > 0 ? criticalCount : undefined
          },
          { id: 'billing', label: 'Billing', icon: 'point_of_sale' },
          { id: 'dashboard', label: 'Sales Trends', icon: 'trending_up' },
          { id: 'forum', label: 'Discussion', icon: 'forum' }
        ];
    }
  };

  const tabs = getTabsForRole();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 pb-safe bg-[#ffffff]/95 backdrop-blur-xl border-t border-[#e5eeff] shadow-[0_-2px_10px_rgba(0,0,0,0.04)]">
      <div
        className={`max-w-4xl mx-auto grid h-16 items-center px-2`}
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] transition-all relative ${
                isActive
                  ? 'text-[#0037b0] font-bold'
                  : 'text-[#565e74] hover:text-[#0b1c30]'
              }`}
            >
              <div className="relative">
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {tab.icon}
                </span>
                {tab.badge && (
                  <span className="absolute -top-1 -right-2 bg-[#ba1a1a] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] leading-tight text-center truncate max-w-[64px]">
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-1 w-4 h-0.5 bg-[#0037b0] rounded-full"></span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
