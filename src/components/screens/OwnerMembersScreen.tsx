import React, { useState } from 'react';
import { ShopProfile, UserAccount, RoleType } from '../../types';
import { COUNTRY_CODES, validateEmail, validatePassword, validatePhoneNumber } from '../../utils/validation';

interface OwnerMembersScreenProps {
  currentShop: ShopProfile;
  users: UserAccount[];
  currentUser: UserAccount;
  onAddMember: (member: UserAccount) => void;
  onTerminateMember: (memberId: string) => void;
  onShowToast: (msg: string) => void;
}

export const OwnerMembersScreen: React.FC<OwnerMembersScreenProps> = ({
  currentShop,
  users,
  currentUser,
  onAddMember,
  onTerminateMember,
  onShowToast
}) => {
  const [showAddModal, setShowAddModal] = useState(false);

  // New member form with country code & validation
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<RoleType>('Cashier');
  const [formError, setFormError] = useState<string | null>(null);

  const handleCreateMember = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Please enter member full name.');
      return;
    }

    // Validate email format
    if (!validateEmail(email.trim())) {
      setFormError('Please enter a valid email address (e.g. employee@store.com).');
      return;
    }

    // Check if email already exists
    if (users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) {
      setFormError(`An account with email "${email}" already exists.`);
      return;
    }

    // Validate password length and strength
    const pwdValidation = validatePassword(password);
    if (!pwdValidation.isValid) {
      setFormError(pwdValidation.message || 'Invalid password length or format.');
      return;
    }

    // Validate phone number if provided
    let formattedPhone = '';
    if (phone.trim()) {
      const phoneValidation = validatePhoneNumber(countryCode, phone);
      if (!phoneValidation.isValid) {
        setFormError(phoneValidation.message || 'Invalid phone number format.');
        return;
      }
      formattedPhone = `${countryCode} ${phone.trim().replace(/\D/g, '')}`;
    }

    const newMember: UserAccount = {
      id: `user-${Date.now()}`,
      shopId: currentShop.id,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: password.trim(),
      phone: formattedPhone,
      countryCode,
      role,
      createdAt: new Date().toISOString()
    };

    onAddMember(newMember);
    setShowAddModal(false);
    setName('');
    setEmail('');
    setPassword('');
    setPhone('');
    setRole('Cashier');
    setFormError(null);
    onShowToast(`Member "${newMember.name}" created with role ${newMember.role}!`);
  };

  const handleTerminate = (member: UserAccount) => {
    if (member.id === currentUser.id) {
      onShowToast('You cannot terminate your own Owner account.');
      return;
    }

    if (window.confirm(`Are you sure you want to terminate ${member.name} (${member.role})? Access will be revoked immediately.`)) {
      onTerminateMember(member.id);
      onShowToast(`Member ${member.name} has been terminated.`);
    }
  };

  const isOwner = currentUser.role === 'Owner';
  const shopUsers = users.filter((u) => !u.shopId || u.shopId === currentShop.id);

  return (
    <div className="flex flex-col w-full space-y-4">
      {/* Shop Profile Header */}
      <div className="bg-white rounded-xl p-4 shadow-xs border border-[#e5eeff] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#0037b0] text-white flex items-center justify-center font-headline font-bold text-[20px] shadow-xs">
            {currentShop.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-headline font-bold text-[18px] text-[#0b1c30]">
                {currentShop.name}
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-[#dce1ff] text-[#0039b5] text-[10px] font-bold">
                Active Store
              </span>
            </div>
            <p className="text-[12px] text-[#565e74]">
              Owner: <strong>{currentShop.ownerName}</strong> • {currentShop.email} {currentShop.phone ? `• ${currentShop.phone}` : ''}
            </p>
          </div>
        </div>

        {isOwner && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 rounded-lg bg-[#0037b0] hover:bg-[#1d4ed8] text-white text-[12px] font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            <span>Add Shop Member</span>
          </button>
        )}
      </div>

      {/* Roster & Member Management Section */}
      <div className="bg-white rounded-xl p-4 shadow-xs border border-[#e5eeff] space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-headline font-bold text-[16px] text-[#0b1c30]">
              Shop Members &amp; Credentials ({shopUsers.length})
            </h3>
            <p className="text-[12px] text-[#565e74]">
              {isOwner
                ? 'Create credentials, assign roles, and manage permissions for employees.'
                : 'View registered shop members.'}
            </p>
          </div>
        </div>

        {shopUsers.length === 0 ? (
          <div className="text-center py-8 text-[#565e74] text-[13px]">
            No members registered yet.
          </div>
        ) : (
          <div className="divide-y divide-[#eff4ff]">
            {shopUsers.map((member) => {
              let badgeColor = 'bg-[#dae2fd] text-[#131b2e]';
              if (member.role === 'Owner') badgeColor = 'bg-[#001551] text-white';
              if (member.role === 'Manager') badgeColor = 'bg-[#dce1ff] text-[#0039b5]';
              if (member.role === 'Helper') badgeColor = 'bg-[#85f8c4] text-[#002114]';

              return (
                <div key={member.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[#eff4ff] border border-[#dae2fd] text-[#0037b0] flex items-center justify-center font-bold text-[13px] shrink-0">
                      {member.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-bold text-[#0b1c30] truncate">
                          {member.name}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeColor}`}>
                          {member.role}
                        </span>
                        {member.id === currentUser.id && (
                          <span className="text-[10px] text-[#565e74] italic">(You)</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[#565e74] mt-0.5">
                        <span className="truncate">{member.email}</span>
                        {member.phone && <span>• {member.phone}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {isOwner && member.role !== 'Owner' && (
                    <button
                      onClick={() => handleTerminate(member)}
                      className="px-2.5 py-1 rounded-md text-[11px] font-bold text-[#ba1a1a] hover:bg-[#ffdad6] border border-[#ffdad6] transition-colors cursor-pointer flex items-center gap-1"
                      title="Terminate member access"
                    >
                      <span className="material-symbols-outlined text-[15px]">person_remove</span>
                      <span className="hidden sm:inline">Terminate</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-[#213145]/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-md border border-[#e5eeff] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#eff4ff]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0037b0] text-[22px]">person_add</span>
                <h3 className="font-headline font-bold text-[16px] text-[#0b1c30]">
                  Create Employee Account
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-full bg-[#eff4ff] flex items-center justify-center text-[#565e74] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateMember} className="space-y-3">
              {formError && (
                <div className="p-2.5 bg-[#ffdad6] border border-[#ffb4ab] rounded-xl text-[12px] text-[#93000a] flex items-start gap-2">
                  <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">error</span>
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[12px] font-semibold text-[#0b1c30]">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setFormError(null);
                  }}
                  className="w-full bg-[#eff4ff] border border-[#dae2fd] p-2.5 rounded-lg text-[13px] text-[#0b1c30] outline-none focus:bg-white focus:border-[#0037b0]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[12px] font-semibold text-[#0b1c30]">Assigned Role *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as RoleType)}
                  className="w-full bg-[#eff4ff] border border-[#dae2fd] p-2.5 rounded-lg text-[13px] text-[#0b1c30] outline-none focus:bg-white focus:border-[#0037b0] cursor-pointer"
                >
                  <option value="Manager">Manager (Add/Remove Products, Restock Approvals)</option>
                  <option value="Cashier">Cashier (Billing Facility &amp; Automatic Stock Updates)</option>
                  <option value="Helper">Helper (Sales Dashboard &amp; Discussion Forum)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[12px] font-semibold text-[#0b1c30]">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. employee@store.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setFormError(null);
                  }}
                  className="w-full bg-[#eff4ff] border border-[#dae2fd] p-2.5 rounded-lg text-[13px] text-[#0b1c30] outline-none focus:bg-white focus:border-[#0037b0]"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] font-semibold text-[#0b1c30]">Login Password *</label>
                  <span className="text-[10px] text-[#565e74]">Min. 8 chars (letters &amp; numbers)</span>
                </div>
                <input
                  type="password"
                  required
                  placeholder="At least 8 characters..."
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setFormError(null);
                  }}
                  className="w-full bg-[#eff4ff] border border-[#dae2fd] p-2.5 rounded-lg text-[13px] text-[#0b1c30] outline-none focus:bg-white focus:border-[#0037b0]"
                />
                {password && (
                  <div className="pt-1">
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className="text-[#565e74]">Security Strength:</span>
                      <span className={`font-bold ${
                        validatePassword(password).score >= 4
                          ? 'text-[#047857]'
                          : validatePassword(password).score >= 2
                          ? 'text-[#d97706]'
                          : 'text-[#dc2626]'
                      }`}>
                        {validatePassword(password).score >= 4
                          ? 'Strong'
                          : validatePassword(password).score >= 2
                          ? 'Medium'
                          : 'Too Weak'}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-[#e2e8f0] rounded-full overflow-hidden flex">
                      <div
                        className={`h-full transition-all duration-200 ${
                          validatePassword(password).score >= 4
                            ? 'bg-[#10b981] w-full'
                            : validatePassword(password).score >= 2
                            ? 'bg-[#f59e0b] w-2/3'
                            : 'bg-[#ef4444] w-1/3'
                        }`}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[12px] font-semibold text-[#0b1c30]">Contact Mobile (Optional)</label>
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => {
                      setCountryCode(e.target.value);
                      setFormError(null);
                    }}
                    className="w-32 bg-[#eff4ff] border border-[#dae2fd] p-2 rounded-lg text-[12px] text-[#0b1c30] outline-none focus:bg-white focus:border-[#0037b0] cursor-pointer"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.code}
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    placeholder="Digits only (e.g. 9840123456)"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setFormError(null);
                    }}
                    className="flex-1 bg-[#eff4ff] border border-[#dae2fd] p-2 rounded-lg text-[13px] text-[#0b1c30] outline-none focus:bg-white focus:border-[#0037b0]"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 rounded-lg bg-[#eff4ff] text-[#0b1c30] text-[12px] font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#0037b0] text-white text-[12px] font-bold shadow-xs hover:bg-[#1d4ed8] cursor-pointer"
                >
                  Create Member Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
