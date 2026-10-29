import React, { useState } from 'react';
import { ShopProfile, UserAccount } from '../../types';
import { apiLogin } from '../../services/api';
import { COUNTRY_CODES, validateEmail, validatePassword, validatePhoneNumber } from '../../utils/validation';

interface LoginGatewayScreenProps {
  currentShop: ShopProfile | null;
  users: UserAccount[];
  onRegisterShop: (shop: ShopProfile, owner: UserAccount) => void;
  onLoginSuccess: (user: UserAccount, shop?: ShopProfile) => void;
  onShowToast: (msg: string) => void;
  isSyncingWithServer?: boolean;
}

export const LoginGatewayScreen: React.FC<LoginGatewayScreenProps> = ({
  currentShop,
  users,
  onRegisterShop,
  onLoginSuccess,
  onShowToast,
  isSyncingWithServer = false
}) => {
  // Default to login mode
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Register Form
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // Login Form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Password analysis
  const passwordAnalysis = validatePassword(password);
  const selectedCountry = COUNTRY_CODES.find((c) => c.code === countryCode) || COUNTRY_CODES[0];

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!shopName.trim()) {
      setErrorMessage('Please enter the store name.');
      return;
    }
    if (!ownerName.trim()) {
      setErrorMessage('Please enter the owner full name.');
      return;
    }

    // Email validation
    const emailCheck = validateEmail(email);
    if (!emailCheck.isValid) {
      setErrorMessage(emailCheck.error || 'Please enter a valid email address.');
      return;
    }

    // Phone validation
    const phoneCheck = validatePhoneNumber(phone, countryCode);
    if (!phoneCheck.isValid) {
      setErrorMessage(phoneCheck.error || 'Please enter a valid phone number.');
      return;
    }

    // Password validation (min 8 chars, letter + number)
    const passCheck = validatePassword(password);
    if (!passCheck.isValid) {
      setErrorMessage(passCheck.error || 'Password must be at least 8 characters long and contain letters and numbers.');
      return;
    }

    setIsRegistering(true);

    const shop: ShopProfile = {
      id: `shop-${Date.now()}`,
      name: shopName.trim(),
      ownerName: ownerName.trim(),
      countryCode,
      phone: phoneCheck.formatted,
      email: email.trim().toLowerCase(),
      createdAt: new Date().toISOString()
    };

    const owner: UserAccount = {
      id: `user-${Date.now()}`,
      shopId: shop.id,
      name: ownerName.trim(),
      email: email.trim().toLowerCase(),
      password: password.trim(),
      role: 'Owner',
      countryCode,
      phone: phoneCheck.formatted,
      createdAt: new Date().toISOString()
    };

    try {
      onRegisterShop(shop, owner);
      onLoginSuccess(owner, shop);
      onShowToast(`Store "${shop.name}" registered successfully! Welcome, ${owner.name}.`);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const cleanEmail = loginEmail.trim().toLowerCase();
    const cleanPassword = loginPassword.trim();

    if (!cleanEmail || !cleanPassword) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsLoggingIn(true);

    try {
      // 1. Direct Server Authentication (Ensures multi-browser / multi-device synchronization)
      const res = await apiLogin(cleanEmail, cleanPassword);
      if (res.success && res.user) {
        onLoginSuccess(res.user, res.shop);
        onShowToast(`Welcome back, ${res.user.name} (${res.user.role})!`);
        return;
      }

      // 2. Local Database Authentication: Check local accounts
      const matchedUser = users.find(
        (u) =>
          (u.email || '').toLowerCase() === cleanEmail &&
          (u.password || '').trim() === cleanPassword
      );

      if (matchedUser) {
        onLoginSuccess(matchedUser, currentShop || undefined);
        onShowToast(`Welcome back, ${matchedUser.name} (${matchedUser.role})!`);
        return;
      }

      // If user not found, give clear, helpful message
      if (res.message && res.message !== 'Server verification error') {
        setErrorMessage(res.message);
      } else {
        setErrorMessage(
          'Invalid email address or password. If you are registering an account, switch to "Register Shop" or ask your Store Owner to add your email in Team Members.'
        );
      }
    } catch {
      // Check local database array
      const matchedUser = users.find(
        (u) =>
          (u.email || '').toLowerCase() === cleanEmail &&
          (u.password || '').trim() === cleanPassword
      );
      if (matchedUser) {
        onLoginSuccess(matchedUser);
        onShowToast(`Welcome back, ${matchedUser.name} (${matchedUser.role})!`);
      } else {
        setErrorMessage('Invalid email or password. Please verify your credentials or register your account.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] flex flex-col justify-center items-center p-4 selection:bg-[#dce1ff] selection:text-[#001551]">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-[#e5eeff] p-6 space-y-5">
        {/* Header Icon & Brand */}
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 rounded-xl bg-[#0037b0] text-white flex items-center justify-center mx-auto shadow-md">
            <span className="material-symbols-outlined text-[28px]">storefront</span>
          </div>
          <h1 className="font-headline font-bold text-[22px] text-[#0b1c30]">
            Smart Inventory Assistant
          </h1>
          <div className="flex items-center justify-center gap-1.5 text-[12px] text-[#565e74] min-h-[20px]">
            {currentShop ? (
              <span className="inline-flex items-center gap-1 font-semibold text-[#0037b0] bg-[#eff4ff] px-2.5 py-0.5 rounded-full border border-[#dae2fd]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#004f35]"></span>
                Store: {currentShop.name}
              </span>
            ) : (
              <span>Offline Inventory & Retail Point-of-Sale System</span>
            )}
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="bg-[#eff4ff] p-1 rounded-xl grid grid-cols-2 gap-1 border border-[#dae2fd]">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMessage('');
            }}
            className={`py-2 rounded-lg text-[13px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'login'
                ? 'bg-white text-[#0037b0] shadow-xs'
                : 'text-[#565e74] hover:text-[#0b1c30]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">login</span>
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMessage('');
            }}
            className={`py-2 rounded-lg text-[13px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'register'
                ? 'bg-white text-[#0037b0] shadow-xs'
                : 'text-[#565e74] hover:text-[#0b1c30]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">app_registration</span>
            <span>Register Shop</span>
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 bg-[#ffdad6] border border-[#ffb4ab] rounded-xl text-[12px] text-[#93000a] flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Mode: Login */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-[#565e74] uppercase tracking-wider mb-1">
                  Registered Email Address
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#565e74] text-[18px]">
                    mail
                  </span>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="e.g. owner@shop.com or cashier@shop.com"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-[#c3cadb] rounded-lg text-[13px] text-[#0b1c30] placeholder-[#8e909a] focus:outline-none focus:border-[#0037b0] focus:ring-1 focus:ring-[#0037b0]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#565e74] uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#565e74] text-[18px]">
                    lock
                  </span>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your account password"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-[#c3cadb] rounded-lg text-[13px] text-[#0b1c30] placeholder-[#8e909a] focus:outline-none focus:border-[#0037b0] focus:ring-1 focus:ring-[#0037b0]"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-2.5 bg-[#0037b0] hover:bg-[#1d4ed8] disabled:opacity-60 text-white rounded-lg text-[13px] font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoggingIn ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">lock_open</span>
                  <span>Sign In to Shop</span>
                </>
              )}
            </button>

            <div className="pt-2 border-t border-[#eff4ff] text-center">
              <span className="text-[11px] text-[#565e74]">
                New Shop Owner?{' '}
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="text-[#0037b0] font-bold hover:underline cursor-pointer"
                >
                  Register your shop here
                </button>
              </span>
            </div>
          </form>
        )}

        {/* Mode: Register Shop */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-[#565e74] uppercase tracking-wider mb-1">
                Shop / Store Name *
              </label>
              <input
                type="text"
                required
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="e.g. Metro Mart & Provisions"
                className="w-full px-3 py-2 bg-white border border-[#c3cadb] rounded-lg text-[13px] text-[#0b1c30] placeholder-[#8e909a] focus:outline-none focus:border-[#0037b0] focus:ring-1 focus:ring-[#0037b0]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#565e74] uppercase tracking-wider mb-1">
                Owner Full Name *
              </label>
              <input
                type="text"
                required
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                className="w-full px-3 py-2 bg-white border border-[#c3cadb] rounded-lg text-[13px] text-[#0b1c30] placeholder-[#8e909a] focus:outline-none focus:border-[#0037b0] focus:ring-1 focus:ring-[#0037b0]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#565e74] uppercase tracking-wider mb-1">
                Contact Mobile Number *
              </label>
              <div className="flex gap-1.5">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-32 px-2 py-2 bg-white border border-[#c3cadb] rounded-lg text-[12px] text-[#0b1c30] focus:outline-none focus:border-[#0037b0] shrink-0 font-medium"
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code} ({c.digits}d)
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={`Enter ${selectedCountry.digits}-digit number`}
                  className="w-full px-3 py-2 bg-white border border-[#c3cadb] rounded-lg text-[13px] text-[#0b1c30] placeholder-[#8e909a] focus:outline-none focus:border-[#0037b0] focus:ring-1 focus:ring-[#0037b0]"
                />
              </div>
              <p className="text-[10px] text-[#565e74] mt-0.5">
                {selectedCountry.name}: exactly {selectedCountry.digits} digits required ({phone.replace(/\D/g, '').length}/{selectedCountry.digits})
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#565e74] uppercase tracking-wider mb-1">
                Owner Login Email *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@yourshop.com"
                className="w-full px-3 py-2 bg-white border border-[#c3cadb] rounded-lg text-[13px] text-[#0b1c30] placeholder-[#8e909a] focus:outline-none focus:border-[#0037b0] focus:ring-1 focus:ring-[#0037b0]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-[#565e74] uppercase tracking-wider">
                  Owner Password *
                </label>
                {password && (
                  <span
                    className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded ${
                      passwordAnalysis.strength === 'strong'
                        ? 'bg-[#dcfce7] text-[#166534]'
                        : passwordAnalysis.strength === 'medium'
                        ? 'bg-[#fef9c3] text-[#854d0e]'
                        : 'bg-[#fee2e2] text-[#991b1b]'
                    }`}
                  >
                    {passwordAnalysis.strength} security
                  </span>
                )}
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters (letters + numbers)"
                className="w-full px-3 py-2 bg-white border border-[#c3cadb] rounded-lg text-[13px] text-[#0b1c30] placeholder-[#8e909a] focus:outline-none focus:border-[#0037b0] focus:ring-1 focus:ring-[#0037b0]"
              />
              <div className="mt-1 space-y-0.5 text-[10px] text-[#565e74]">
                <div className="flex items-center gap-1.5">
                  <span className={`material-symbols-outlined text-[13px] ${password.length >= 8 ? 'text-[#16a34a]' : 'text-[#8e909a]'}`}>
                    {password.length >= 8 ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                  <span>Minimum 8 characters ({password.length}/8)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`material-symbols-outlined text-[13px] ${/[A-Za-z]/.test(password) && /[0-9]/.test(password) ? 'text-[#16a34a]' : 'text-[#8e909a]'}`}>
                    {/[A-Za-z]/.test(password) && /[0-9]/.test(password) ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                  <span>Includes both letters and numbers</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-[#565e74] italic">
              After registration, the Owner can create accounts for Managers, Cashiers, and Helpers with role-specific privileges.
            </p>

            <button
              type="submit"
              disabled={isRegistering}
              className="w-full py-2.5 bg-[#0037b0] hover:bg-[#1d4ed8] disabled:opacity-60 text-white rounded-lg text-[13px] font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {isRegistering ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Registering Shop...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  <span>Complete Shop Registration</span>
                </>
              )}
            </button>

            <div className="pt-2 border-t border-[#eff4ff] text-center">
              <span className="text-[11px] text-[#565e74]">
                Already have a shop account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-[#0037b0] font-bold hover:underline cursor-pointer"
                >
                  Sign in here
                </button>
              </span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
