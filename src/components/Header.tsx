import React, { useState } from 'react';
import { RoleType, UserAccount, ShopProfile } from '../types';

interface HeaderProps {
  currentTab: string;
  activeRole: RoleType;
  currentUser: UserAccount;
  currentShop: ShopProfile;
  onOpenNotifications: () => void;
  onLogout: () => void;
  notificationCount: number;
  onOpenMongoSync?: () => void;
  isMongoConnected?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  activeRole,
  currentUser,
  currentShop,
  onOpenNotifications,
  onLogout,
  notificationCount,
  onOpenMongoSync,
  isMongoConnected = false
}) => {
  const [showProfileModal, setShowProfileModal] = useState(false);

  return (
    <header className="fixed top-0 inset-x-0 z-40 bg-white/95 backdrop-blur-xl pt-safe shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-[#e5eeff]">
      <div className="max-w-4xl mx-auto h-16 px-4 flex flex-col justify-center">
        <div className="flex items-center justify-between gap-2">
          {/* Brand lockup */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#0037b0] flex items-center justify-center shrink-0 shadow-sm text-white">
              <span className="material-symbols-outlined text-[20px]">
                storefront
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline font-semibold text-[15px] text-[#0b1c30] leading-none tracking-tight">
                {currentShop.name}
              </span>
              <span className="text-[11px] text-[#565e74] leading-tight mt-1 font-medium truncate max-w-[200px]">
                {currentUser.name} • <strong className="text-[#0037b0]">{currentUser.role}</strong>
              </span>
            </div>
          </div>

          {/* User controls (Strictly no role switching allowed!) */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* MongoDB Compass Live Sync Button */}
            {onOpenMongoSync && (
              <button
                onClick={onOpenMongoSync}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-[#f0fdf4] hover:bg-[#dcfce7] text-[#166534] border border-[#bbf7d0] transition-colors cursor-pointer shadow-2xs"
                title="MongoDB Compass Synchronization Manager"
              >
                <span className="w-2 h-2 rounded-full bg-[#16a34a] animate-pulse"></span>
                <span className="hidden sm:inline">MongoDB Compass</span>
                <span className="sm:hidden">DB</span>
              </button>
            )}

            {/* Logged in User Profile Chip */}
            <div className="relative">
              <button
                onClick={() => setShowProfileModal(!showProfileModal)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#eff4ff] text-[#0037b0] text-[11px] font-bold hover:bg-[#dce1ff] transition-colors cursor-pointer border border-[#dae2fd]"
                title="View My Profile"
              >
                <span className="w-2 h-2 rounded-full bg-[#0037b0]"></span>
                <span>{currentUser.role}</span>
                <span className="material-symbols-outlined text-[15px]">account_circle</span>
              </button>

              {showProfileModal && (
                <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-xl shadow-2xl border border-[#dae2fd] p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-1 pb-1.5 text-[10px] font-bold text-[#747686] uppercase tracking-wider">
                    My Account Profile
                  </div>
                  <div className="p-2.5 bg-[#f8f9ff] rounded-lg border border-[#dae2fd] space-y-1 mb-2">
                    <p className="text-[13px] font-bold text-[#0b1c30]">{currentUser.name}</p>
                    <p className="text-[11px] text-[#565e74] truncate">{currentUser.email}</p>
                    {currentUser.phone && (
                      <p className="text-[11px] text-[#565e74]">{currentUser.phone}</p>
                    )}
                    <div className="pt-1">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-[#dce1ff] text-[#0039b5]">
                        Assigned Role: {currentUser.role}
                      </span>
                    </div>
                  </div>

                  <p className="text-[10px] text-[#565e74] px-1 pb-2">
                    Role switching is restricted. To switch accounts, sign out and enter the credentials for that account.
                  </p>

                  <div className="pt-2 border-t border-[#eff4ff]">
                    <button
                      onClick={() => {
                        setShowProfileModal(false);
                        onLogout();
                      }}
                      className="w-full text-center py-2 px-3 text-[12px] text-white bg-[#ba1a1a] hover:bg-[#93000a] rounded-lg font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">logout</span>
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Notification bell */}
            <button
              onClick={onOpenNotifications}
              className="w-8 h-8 flex items-center justify-center text-[#434655] hover:text-[#0b1c30] hover:bg-[#eff4ff] rounded-lg transition-colors relative cursor-pointer"
              aria-label="Restock Alerts"
              title="Restock Alerts"
            >
              <span className="material-symbols-outlined text-[19px]">
                notifications
              </span>
              {notificationCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#ba1a1a] ring-2 ring-white"></span>
              )}
            </button>

            {/* Direct Sign Out Button */}
            <button
              onClick={onLogout}
              className="w-8 h-8 flex items-center justify-center text-[#565e74] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/40 rounded-lg transition-colors cursor-pointer"
              title="Sign Out"
            >
              <span className="material-symbols-outlined text-[19px]">logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
