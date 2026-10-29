import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';

interface QRCodeSVGProps {
  value: string;
  size?: number;
  className?: string;
}

/**
 * Standard ISO-compliant QR Code generator using 'qrcode' library.
 * Generates an authentic, high-contrast QR code readable by any smartphone camera.
 */
export const QRCodeSVG: React.FC<QRCodeSVGProps> = ({ value, size = 150, className = '' }) => {
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    if (!value) return;
    QRCode.toDataURL(value, {
      width: size * 2, // 2x density for crisp scanning on high-DPI screens
      margin: 1,
      color: {
        dark: '#0b1c30',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    })
      .then((url) => setDataUrl(url))
      .catch((err) => console.error('QR code generation failed:', err));
  }, [value, size]);

  if (!dataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className="bg-white border border-[#dae2fd] rounded-xl flex items-center justify-center text-[#565e74] text-[10px]"
      >
        Generating QR...
      </div>
    );
  }

  return (
    <img
      src={dataUrl}
      alt={`QR code for ${value}`}
      width={size}
      height={size}
      className={`bg-white p-1 rounded-xl shadow-xs border border-[#dae2fd] select-none ${className}`}
    />
  );
};
