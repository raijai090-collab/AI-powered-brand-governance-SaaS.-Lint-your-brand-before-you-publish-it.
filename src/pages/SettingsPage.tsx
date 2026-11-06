import React, { useState } from 'react';
import { Settings2, Building2, User, Shield, CheckCircle2, Copy, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const SettingsPage: React.FC = () => {
  const { currentOrg, userProfile } = useAuth();
  const [orgName, setOrgName] = useState(currentOrg?.name || '');
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleCopyTenantId = () => {
    if (currentOrg?.id) {
      navigator.clipboard.writeText(currentOrg.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#35252A] tracking-tight">
            Workspace Settings
          </h1>
          <p className="text-xs sm:text-sm text-[#806C68] mt-1">
            Tenant configuration, identifier metadata, and governance profiles for {currentOrg?.name}.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Organization Configuration Form */}
        <div className="lg:col-span-8 bg-[#FFFAF5] rounded-3xl border border-[#E4D8D1] p-6 sm:p-8 shadow-xs space-y-6">
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <h3 className="text-base font-bold text-[#35252A] pb-3 border-b border-[#E4D8D1]">
              Organisation Profile
            </h3>

            <div>
              <label className="block text-xs font-bold text-[#35252A] uppercase tracking-wider mb-1.5">
                Organisation Name
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F4EEE8] border border-[#E4D8D1] rounded-xl text-xs sm:text-sm text-[#35252A] focus:outline-none focus:ring-2 focus:ring-[#652B39]/30 focus:border-[#652B39]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#35252A] uppercase tracking-wider mb-1.5">
                Tenant Slug
              </label>
              <input
                type="text"
                disabled
                value={currentOrg?.slug || 'default-workspace'}
                className="w-full px-3.5 py-2.5 bg-[#E8DED5]/40 border border-[#E4D8D1] rounded-xl text-xs sm:text-sm text-[#806C68] cursor-not-allowed font-mono"
              />
              <span className="text-[11px] text-[#806C68] mt-1 block">
                Tenant slugs are fixed identifiers used for API routing and isolated records.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#35252A] uppercase tracking-wider mb-1.5">
                Unique Tenant ID (Firestore Document ID)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  disabled
                  value={currentOrg?.id || ''}
                  className="flex-1 px-3.5 py-2.5 bg-[#E8DED5]/40 border border-[#E4D8D1] rounded-xl text-xs font-mono text-[#806C68] cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={handleCopyTenantId}
                  className="px-3.5 py-2.5 bg-[#F4EEE8] hover:bg-[#E8DED5] border border-[#E4D8D1] rounded-xl text-xs font-semibold text-[#35252A] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#2E6F40]" /> : <Copy className="w-3.5 h-3.5 text-[#806C68]" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-[#E4D8D1]">
              {saved && (
                <span className="text-xs font-bold text-[#2E6F40] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Workspace metadata saved
                </span>
              )}

              <button
                type="submit"
                className="ml-auto px-5 py-2.5 rounded-xl bg-[#652B39] hover:bg-[#512331] text-white text-xs font-semibold shadow-xs hover:shadow transition-all cursor-pointer"
              >
                Save Organization Settings
              </button>
            </div>
          </form>
        </div>

        {/* User Identity Card */}
        <div className="lg:col-span-4 bg-[#FFFAF5] rounded-3xl border border-[#E4D8D1] p-6 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-[#35252A] pb-3 border-b border-[#E4D8D1]">
            Your User Identity
          </h3>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#652B39] text-white font-bold text-base flex items-center justify-center shrink-0">
              {userProfile?.displayName?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="overflow-hidden">
              <span className="text-sm font-bold text-[#35252A] block truncate">
                {userProfile?.displayName || 'User'}
              </span>
              <span className="text-xs text-[#806C68] block truncate">
                {userProfile?.email}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#F4EEE8]/70 border border-[#E4D8D1] space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-[#806C68]">Role</span>
              <span className="font-semibold text-[#652B39] capitalize">
                {userProfile?.role?.replace('_', ' ')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#806C68]">Auth UID</span>
              <span className="font-mono text-[10px] text-[#35252A] truncate max-w-[140px]">
                {userProfile?.id}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#806C68]">Tenant Member Since</span>
              <span className="text-[11px] text-[#35252A]">
                {userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString() : 'Active'}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-[#806C68] leading-relaxed pt-2">
            Role elevation and permissions are strictly enforced on the server and verified by your organization administrator.
          </p>
        </div>
      </div>
    </div>
  );
};
