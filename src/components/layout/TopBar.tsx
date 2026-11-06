import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  Building2,
  ChevronDown,
  Plus,
  Check,
  LogOut,
  User,
  Shield,
  Menu,
  X,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface TopBarProps {
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({ onToggleSidebar }) => {
  const { userProfile, currentOrg, userOrgs, switchOrganization, createOrganization, logout } = useAuth();
  const navigate = useNavigate();

  // Dropdown states
  const [orgMenuOpen, setOrgMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [createOrgModalOpen, setCreateOrgModalOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Notifications mock data (contextual governance alerts)
  const [notifications, setNotifications] = useState([
    {
      id: 'notif_1',
      title: 'Brand Constitution Initialized',
      message: 'Default enterprise brand tone rules loaded for your workspace.',
      time: '10m ago',
      unread: true,
      category: 'constitution'
    },
    {
      id: 'notif_2',
      title: 'ClaimShield Guard Active',
      message: 'Automated claim citation and disclaimer engine is running.',
      time: '1h ago',
      unread: true,
      category: 'security'
    }
  ]);

  const orgMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (orgMenuRef.current && !orgMenuRef.current.contains(event.target as Node)) {
        setOrgMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    setIsCreatingOrg(true);
    try {
      await createOrganization(newOrgName.trim());
      setNewOrgName('');
      setCreateOrgModalOpen(false);
      setOrgMenuOpen(false);
    } catch (err) {
      console.error('Error creating organization:', err);
    } finally {
      setIsCreatingOrg(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <>
      <header className="sticky top-0 z-30 h-16 bg-[#FFFAF5]/95 backdrop-blur-md border-b border-[#E4D8D1] px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Left: Mobile hamburger + Org Switcher */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            aria-label="Toggle sidebar navigation"
            className="p-2 rounded-xl text-[#806C68] hover:text-[#35252A] hover:bg-[#E8DED5]/60 transition-colors lg:hidden cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Organisation Switcher */}
          <div className="relative" ref={orgMenuRef}>
            <button
              onClick={() => setOrgMenuOpen(!orgMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F4EEE8] hover:bg-[#E8DED5]/60 border border-[#E4D8D1] transition-all text-sm font-medium text-[#35252A] cursor-pointer"
            >
              <div className="w-5 h-5 rounded-md bg-[#652B39]/10 text-[#652B39] flex items-center justify-center">
                <Building2 className="w-3.5 h-3.5" />
              </div>
              <span className="font-semibold max-w-[140px] sm:max-w-[180px] truncate">
                {currentOrg?.name || 'Workspace'}
              </span>
              <ChevronDown className="w-4 h-4 text-[#806C68]" />
            </button>

            {/* Org Switcher Dropdown */}
            {orgMenuOpen && (
              <div className="absolute left-0 mt-2 w-64 bg-[#FFFAF5] border border-[#E4D8D1] rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#806C68] border-b border-[#E4D8D1]">
                  Switch Organisation
                </div>

                <div className="max-h-56 overflow-y-auto py-1">
                  {userOrgs.map((org) => {
                    const isSelected = org.id === currentOrg?.id;
                    return (
                      <button
                        key={org.id}
                        onClick={() => {
                          switchOrganization(org.id);
                          setOrgMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs sm:text-sm hover:bg-[#E8DED5]/40 transition-colors cursor-pointer ${
                          isSelected ? 'font-semibold text-[#652B39] bg-[#652B39]/5' : 'text-[#35252A]'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <span className="block truncate">{org.name}</span>
                          <span className="text-[10px] text-[#806C68] capitalize">{org.plan} Plan</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-[#652B39] shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-1 mt-1 border-t border-[#E4D8D1] px-2">
                  <button
                    onClick={() => {
                      setOrgMenuOpen(false);
                      setCreateOrgModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold text-[#652B39] hover:bg-[#652B39]/10 rounded-xl transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create New Organisation</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center: Global Search Bar */}
        <div className="flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#806C68]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search claims, constitution rules, content audits... (Press ⌘K)"
              className="w-full pl-10 pr-4 py-2 bg-[#F4EEE8] border border-[#E4D8D1] rounded-xl text-xs sm:text-sm text-[#35252A] placeholder-[#806C68]/70 focus:outline-none focus:ring-2 focus:ring-[#652B39]/30 focus:border-[#652B39] transition-all"
            />
          </div>
        </div>

        {/* Right: Notifications & User Menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Notifications Dropdown */}
          <div className="relative" ref={notifMenuRef}>
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              aria-label="View notifications"
              className="relative p-2 rounded-xl text-[#806C68] hover:text-[#35252A] hover:bg-[#E8DED5]/60 transition-colors cursor-pointer"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#A3282C] ring-2 ring-[#FFFAF5]" />
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-[#FFFAF5] border border-[#E4D8D1] rounded-2xl shadow-xl py-2 z-50">
                <div className="px-4 py-2 flex items-center justify-between border-b border-[#E4D8D1]">
                  <span className="text-xs font-bold text-[#35252A] uppercase tracking-wider">
                    Notifications ({unreadCount})
                  </span>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-[11px] font-medium text-[#652B39] hover:underline cursor-pointer"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-[#E4D8D1]/50">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`px-4 py-3 text-left transition-colors hover:bg-[#E8DED5]/30 ${
                        n.unread ? 'bg-[#652B39]/5' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-[#35252A]">{n.title}</span>
                        <span className="text-[10px] text-[#806C68]">{n.time}</span>
                      </div>
                      <p className="text-[11px] text-[#806C68] leading-relaxed">{n.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-[#E8DED5]/60 transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-[#652B39] text-white font-semibold text-xs flex items-center justify-center shadow-sm">
                {userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : 'U'}
              </div>
              <ChevronDown className="w-4 h-4 text-[#806C68] hidden sm:block" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-[#FFFAF5] border border-[#E4D8D1] rounded-2xl shadow-xl py-2 z-50">
                <div className="px-4 py-3 border-b border-[#E4D8D1]">
                  <p className="text-xs font-bold text-[#35252A] truncate">
                    {userProfile?.displayName || 'Brand Administrator'}
                  </p>
                  <p className="text-[11px] text-[#806C68] truncate mb-1">
                    {userProfile?.email}
                  </p>
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#652B39]/10 text-[#652B39] text-[10px] font-semibold uppercase tracking-wider">
                    <Shield className="w-3 h-3" />
                    {userProfile?.role?.replace('_', ' ')}
                  </div>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate('/app/settings');
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs text-[#35252A] hover:bg-[#E8DED5]/40 transition-colors cursor-pointer"
                  >
                    <User className="w-4 h-4 text-[#806C68]" />
                    <span>Workspace Settings</span>
                  </button>

                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate('/');
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs text-[#35252A] hover:bg-[#E8DED5]/40 transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4 text-[#806C68]" />
                    <span>View Public Landing Page</span>
                  </button>
                </div>

                <div className="pt-1 border-t border-[#E4D8D1]">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#A3282C] hover:bg-[#A3282C]/10 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Modal: Create New Organisation */}
      {createOrgModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3D1B26]/40 backdrop-blur-xs">
          <div className="bg-[#FFFAF5] border border-[#E4D8D1] rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#35252A]">Create New Organisation</h3>
              <button
                onClick={() => setCreateOrgModalOpen(false)}
                className="p-1 rounded-lg text-[#806C68] hover:text-[#35252A] hover:bg-[#E8DED5]/50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-[#806C68] mb-5 leading-relaxed">
              Organisations act as isolated multi-tenant workspaces with their own brand constitution, team roles, and governance policies.
            </p>

            <form onSubmit={handleCreateOrg}>
              <div className="mb-5">
                <label className="block text-xs font-bold text-[#35252A] uppercase tracking-wider mb-2">
                  Organisation / Brand Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Global Labs, Horizon Media"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#F4EEE8] border border-[#E4D8D1] rounded-xl text-sm text-[#35252A] focus:outline-none focus:ring-2 focus:ring-[#652B39]/30 focus:border-[#652B39]"
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCreateOrgModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#806C68] hover:text-[#35252A] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingOrg || !newOrgName.trim()}
                  className="px-5 py-2 rounded-xl bg-[#652B39] hover:bg-[#512331] text-white text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isCreatingOrg ? 'Creating...' : 'Create Organisation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
