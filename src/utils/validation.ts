export interface CountryCodeOption {
  code: string;
  name: string;
  country: string; // alias for name
  flag: string;
  digits: number;
}

export const COUNTRY_CODES: CountryCodeOption[] = [
  { code: '+91', name: 'India', country: 'India', flag: '🇮🇳', digits: 10 },
  { code: '+1', name: 'USA / Canada', country: 'USA / Canada', flag: '🇺🇸', digits: 10 },
  { code: '+44', name: 'United Kingdom', country: 'United Kingdom', flag: '🇬🇧', digits: 10 },
  { code: '+971', name: 'United Arab Emirates', country: 'United Arab Emirates', flag: '🇦🇪', digits: 9 },
  { code: '+65', name: 'Singapore', country: 'Singapore', flag: '🇸🇬', digits: 8 },
  { code: '+61', name: 'Australia', country: 'Australia', flag: '🇦🇺', digits: 9 },
  { code: '+49', name: 'Germany', country: 'Germany', flag: '🇩🇪', digits: 10 },
  { code: '+33', name: 'France', country: 'France', flag: '🇫🇷', digits: 9 },
  { code: '+81', name: 'Japan', country: 'Japan', flag: '🇯🇵', digits: 10 },
  { code: '+60', name: 'Malaysia', country: 'Malaysia', flag: '🇲🇾', digits: 10 },
  { code: '+966', name: 'Saudi Arabia', country: 'Saudi Arabia', flag: '🇸🇦', digits: 9 }
];

export function validateEmail(email: string): { isValid: boolean; error?: string; message?: string } {
  const trimmed = (email || '').trim();
  if (!trimmed) {
    const error = 'Email address is required.';
    return { isValid: false, error, message: error };
  }
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;
  if (!emailRegex.test(trimmed)) {
    const error = 'Please enter a valid email address (e.g. name@company.com).';
    return { isValid: false, error, message: error };
  }
  return { isValid: true };
}

export function validatePassword(password: string): {
  isValid: boolean;
  error?: string;
  message?: string;
  strength: 'weak' | 'medium' | 'strong';
  score: number;
  hints: string[];
} {
  const pwd = password || '';
  const hints: string[] = [];
  if (!pwd || pwd.length < 8) {
    hints.push('Must be at least 8 characters long');
  }
  if (!/[A-Za-z]/.test(pwd)) {
    hints.push('Must contain at least one letter');
  }
  if (!/[0-9]/.test(pwd)) {
    hints.push('Must contain at least one number');
  }

  const isValid = hints.length === 0;

  let score = 1;
  if (pwd.length >= 8) score = 2;
  if (pwd.length >= 8 && /[A-Za-z]/.test(pwd) && /[0-9]/.test(pwd)) score = 3;
  if (pwd.length >= 10 && /[A-Z]/.test(pwd) && /[a-z]/.test(pwd) && /[0-9]/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) {
    score = 4;
  }

  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  if (score >= 4) {
    strength = 'strong';
  } else if (score >= 3) {
    strength = 'medium';
  }

  const error = hints.length > 0 ? hints[0] : undefined;

  return {
    isValid,
    error,
    message: error,
    strength,
    score,
    hints
  };
}

/**
 * Flexible phone validator supporting both (rawNumber, countryCode) and (countryCode, rawNumber)
 */
export function validatePhoneNumber(
  arg1: string,
  arg2?: string
): { isValid: boolean; error?: string; message?: string; formatted: string; cleanDigits: string } {
  let countryCode = '+91';
  let rawNumber = '';

  // Determine which argument is the country code vs raw phone
  if (typeof arg1 === 'string' && arg1.startsWith('+')) {
    countryCode = arg1;
    rawNumber = arg2 || '';
  } else if (typeof arg2 === 'string' && arg2.startsWith('+')) {
    countryCode = arg2;
    rawNumber = arg1 || '';
  } else {
    rawNumber = arg1 || '';
    if (arg2) countryCode = arg2;
  }

  const cleanDigits = (rawNumber || '').replace(/\D/g, '');
  const config = COUNTRY_CODES.find((c) => c.code === countryCode) || COUNTRY_CODES[0];

  if (!cleanDigits) {
    const error = 'Phone number is required.';
    return {
      isValid: false,
      error,
      message: error,
      formatted: '',
      cleanDigits: ''
    };
  }

  if (cleanDigits.length !== config.digits) {
    const error = `${config.name} (${config.code}) phone number must have exactly ${config.digits} digits. (Entered ${cleanDigits.length})`;
    return {
      isValid: false,
      error,
      message: error,
      formatted: `${config.code} ${cleanDigits}`,
      cleanDigits
    };
  }

  return {
    isValid: true,
    formatted: `${config.code} ${cleanDigits}`,
    cleanDigits
  };
}
