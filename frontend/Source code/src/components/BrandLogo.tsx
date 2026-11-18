import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';

export const UNIFIX_LOGO_URL =
  '/assets/aistudio/WhatsApp_Image_2026-11-18_at_11.48.06_AM_c43d8de7.jpeg';

export function BrandLogo({
  size = 'md',
  className = '',
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  const dims =
    size === 'sm'
      ? 'w-7 h-7 rounded-lg'
      : size === 'lg'
      ? 'w-10 h-10 rounded-xl'
      : 'w-8 h-8 rounded-xl';

  if (imgFailed) {
    return (
      <span
        className={`${dims} bg-gradient-to-br from-[#064E3B] to-[#059669] text-white flex items-center justify-center shrink-0 shadow-xs ${className}`}
      >
        <ShieldCheck className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      </span>
    );
  }

  return (
    <span
      className={`${dims} overflow-hidden bg-white flex items-center justify-center shrink-0 shadow-xs ${className}`}
    >
      <img
        src={UNIFIX_LOGO_URL}
        alt="UniFix logo"
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
        className="w-full h-full object-cover scale-[1.32]"
      />
    </span>
  );
}
