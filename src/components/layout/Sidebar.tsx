import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Scroll,
  FileSearch,
  ShieldCheck,
  Bot,
  GitPullRequestDraft,
  BarChart3,
  Users2,
  CreditCard,
  Settings2,
  ChevronLeft,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const { userProfile, currentOrg } = useAuth();

  const navigation = [
    { name: 'Dashboard', to: '/app', icon: LayoutDashboard },
    { name: 'Brand Constitution', to: '/app/constitution', icon: Scroll },
    { name: 'Content Analysis', to: '/app/analysis', icon: FileSearch },
    { name: 'ClaimShield', to: '/app/claimshield', icon: ShieldCheck },
    { name: 'BrandGuard AI', to: '/app/brandguard', icon: Bot },
    { name: 'Approval Flow', to: '/app/approvals', icon: GitPullRequestDraft },
    { name: 'Reports', to: '/app/reports', icon: BarChart3 },
    { name: 'Team', to: '/app/team', icon: Users2 },
    { name: 'Billing', to: '/app/billing', icon: CreditCard },
    { name: 'Settings', to: '/app/settings', icon: Settings2 },
  ];

  const roleLabelMap: Record<string, string> = {
    super_admin: 'Super Admin',
    org_admin: 'Org Admin',
    reviewer: 'Reviewer',
    creator: 'Creator'
  };

  return (
    <aside
      className={`fixed lg:sticky top-0 left-0 z-40 h-screen transition-all duration-300 ease-in-out flex flex-col bg-[#FFFAF5] border-r border-[#E4D8D1] shadow-sm select-none ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Sidebar Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-[#E4D8D1]">
        {!collapsed ? (
          <BrandLogo size="sm" showTagline={false} />
        ) : (
          <div className="mx-auto">
            <BrandLogo size="sm" showTagline={false} className="gap-0" />
          </div>
        )}
        <button
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="p-1.5 rounded-lg text-[#806C68] hover:text-[#35252A] hover:bg-[#E8DED5]/60 transition-colors hidden lg:flex items-center justify-center cursor-pointer"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Tenant Context Pill (when expanded) */}
      {!collapsed && currentOrg && (
        <div className="px-3 pt-3 pb-1">
          <div className="p-2.5 rounded-xl bg-[#F4EEE8]/70 border border-[#E4D8D1]/80 flex items-center justify-between">
            <div className="overflow-hidden">
              <span className="text-[10px] uppercase tracking-wider font-bold text-[#806C68] block">
                Active Tenant
              </span>
              <span className="text-xs font-semibold text-[#35252A] truncate block">
                {currentOrg.name}
              </span>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-semibold uppercase bg-[#652B39]/10 text-[#652B39] rounded-md">
              {currentOrg.plan}
            </span>
          </div>
        </div>
      )}

      {/* Nav Items */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto scrollbar-thin">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.to}
              end={item.to === '/app'}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-[#652B39] text-white shadow-sm'
                    : 'text-[#806C68] hover:text-[#35252A] hover:bg-[#E8DED5]/50'
                } ${collapsed ? 'justify-center px-0' : ''}`
              }
              title={collapsed ? item.name : undefined}
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-105 ${
                      isActive ? 'text-white' : 'text-[#806C68] group-hover:text-[#652B39]'
                    }`}
                  />
                  {!collapsed && (
                    <span className="truncate">{item.name}</span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Sidebar Footer with Role Indicator */}
      <div className="p-3 border-t border-[#E4D8D1] bg-[#FFFAF5]">
        {!collapsed ? (
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-[#F4EEE8]/60">
            <div className="w-8 h-8 rounded-full bg-[#652B39] text-white font-semibold text-xs flex items-center justify-center shrink-0">
              {userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="overflow-hidden flex-1">
              <span className="text-xs font-medium text-[#35252A] truncate block">
                {userProfile?.displayName || 'Brand Officer'}
              </span>
              <span className="text-[11px] text-[#806C68] block capitalize">
                {roleLabelMap[userProfile?.role || 'creator'] || userProfile?.role}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div
              className="w-8 h-8 rounded-full bg-[#652B39] text-white font-semibold text-xs flex items-center justify-center"
              title={`${userProfile?.displayName} (${userProfile?.role})`}
            >
              {userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : 'U'}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
