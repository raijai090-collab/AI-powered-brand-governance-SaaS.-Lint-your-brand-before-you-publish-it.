import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showTagline = false,
  className = ''
}) => {
  const iconSizes = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base'
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl'
  };

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* 3D-accented Logo Mark (One of the strictly allowed 3D surfaces) */}
      <div
        className={`${iconSizes[size]} relative rounded-xl flex items-center justify-center font-bold text-white shrink-0 shadow-md`}
        style={{
          background: 'linear-gradient(135deg, #7E3647 0%, #652B39 45%, #3D1B26 100%)',
          boxShadow: '0 6px 14px -2px rgba(61, 27, 38, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.4), inset 0 -2px 4px rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(255, 255, 255, 0.15)'
        }}
      >
        <span className="font-mono tracking-tighter text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">BL</span>
        <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#E8DED5] opacity-80" />
      </div>

      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className={`font-extrabold tracking-tight text-[#35252A] ${textSizes[size]}`}>
            Brand<span className="text-[#652B39]">Lint</span>
          </span>
          <span className="px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase bg-[#E8DED5]/80 text-[#512331] rounded">
            Gov
          </span>
        </div>
        {showTagline && (
          <span className="text-xs text-[#806C68] font-normal tracking-normal -mt-0.5">
            Lint your brand before you publish it.
          </span>
        )}
      </div>
    </div>
  );
};
