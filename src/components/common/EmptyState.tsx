import React, { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  badge?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  tips?: Array<{ title: string; desc: string }>;
  children?: ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  badge,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  tips,
  children
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center max-w-2xl mx-auto">
      {/* Icon surface */}
      <div className="w-16 h-16 rounded-2xl bg-[#FFFAF5] border border-[#E4D8D1] shadow-sm flex items-center justify-center text-[#652B39] mb-5 relative group transition-transform hover:scale-105">
        <Icon className="w-8 h-8 stroke-[1.6]" />
        <div className="absolute inset-0 rounded-2xl bg-[#652B39]/5 pointer-events-none" />
      </div>

      {badge && (
        <span className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-[#652B39] bg-[#E8DED5]/60 rounded-full mb-3">
          {badge}
        </span>
      )}

      <h3 className="text-xl sm:text-2xl font-bold text-[#35252A] mb-2 tracking-tight">
        {title}
      </h3>

      <p className="text-sm sm:text-base text-[#806C68] max-w-lg mb-6 leading-relaxed">
        {description}
      </p>

      {/* Action buttons */}
      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
          {actionLabel && onAction && (
            <button
              onClick={onAction}
              className="px-5 py-2.5 rounded-xl bg-[#652B39] hover:bg-[#512331] text-white font-medium text-sm transition-all shadow-sm hover:shadow active:scale-95 cursor-pointer"
            >
              {actionLabel}
            </button>
          )}

          {secondaryActionLabel && onSecondaryAction && (
            <button
              onClick={onSecondaryAction}
              className="px-5 py-2.5 rounded-xl bg-[#FFFAF5] hover:bg-[#E8DED5]/50 border border-[#E4D8D1] text-[#35252A] font-medium text-sm transition-all hover:border-[#652B39]/40 active:scale-95 cursor-pointer"
            >
              {secondaryActionLabel}
            </button>
          )}
        </div>
      )}

      {children}

      {/* Helpful context tips */}
      {tips && tips.length > 0 && (
        <div className="w-full mt-6 pt-6 border-t border-[#E4D8D1]/70 grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
          {tips.map((tip, idx) => (
            <div key={idx} className="p-3.5 rounded-xl bg-[#FFFAF5]/70 border border-[#E4D8D1]/80 text-xs">
              <span className="font-semibold text-[#35252A] block mb-1">{tip.title}</span>
              <span className="text-[#806C68] leading-relaxed block">{tip.desc}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
