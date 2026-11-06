import React, { useState } from 'react';
import { Users2, UserPlus, Shield, Check, X, Mail, Crown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/auth';

export const TeamPage: React.FC = () => {
  const { currentOrg, userProfile } = useAuth();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('reviewer');
  const [teamMembers, setTeamMembers] = useState<Array<{
    name: string;
    email: string;
    role: UserRole;
    isCurrent?: boolean;
    joined: string;
  }>>([
    {
      name: userProfile?.displayName || 'Brand Administrator',
      email: userProfile?.email || 'admin@brandlint.io',
      role: userProfile?.role || 'org_admin',
      isCurrent: true,
      joined: 'Active'
    }
  ]);

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setTeamMembers(prev => [
      ...prev,
      {
        name: inviteEmail.split('@')[0],
        email: inviteEmail.trim(),
        role: inviteRole,
        joined: 'Pending Acceptance'
      }
    ]);

    setInviteEmail('');
    setInviteModalOpen(false);
  };

  const roleLabels: Record<UserRole, { title: string; color: string; desc: string }> = {
    super_admin: {
      title: 'Super Admin',
      color: 'bg-[#652B39] text-white',
      desc: 'Platform-wide authority and cross-tenant policy control.'
    },
    org_admin: {
      title: 'Organisation Admin',
      color: 'bg-[#652B39]/10 text-[#652B39]',
      desc: 'Full workspace administration, constitution editing, and team role management.'
    },
    reviewer: {
      title: 'Reviewer',
      color: 'bg-[#2E6F40]/10 text-[#2E6F40]',
      desc: 'Can certify claims, audit content, and authorize publications.'
    },
    creator: {
      title: 'Content Creator',
      color: 'bg-[#806C68]/15 text-[#35252A]',
      desc: 'Can submit marketing drafts for automated linting and request review.'
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#35252A] tracking-tight">
            Team & Role Governance
          </h1>
          <p className="text-xs sm:text-sm text-[#806C68] mt-1">
            Manage multi-tenant access control and approval permissions for {currentOrg?.name}.
          </p>
        </div>

        <button
          onClick={() => setInviteModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-[#652B39] hover:bg-[#512331] text-white text-xs font-semibold shadow-xs hover:shadow transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Invite Member</span>
        </button>
      </div>

      {/* Team Roster Card */}
      <div className="bg-[#FFFAF5] rounded-3xl border border-[#E4D8D1] p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E4D8D1]">
          <span className="text-xs font-bold uppercase tracking-wider text-[#35252A]">
            Organization Members ({teamMembers.length})
          </span>
          <span className="text-xs text-[#806C68]">
            Plan limit: Unlimited in current tier
          </span>
        </div>

        <div className="divide-y divide-[#E4D8D1]/60">
          {teamMembers.map((member, i) => (
            <div key={i} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#652B39] text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-[#35252A]">{member.name}</span>
                    {member.isCurrent && (
                      <span className="text-[10px] font-semibold text-[#652B39] bg-[#652B39]/10 px-1.5 py-0.5 rounded">
                        You
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[#806C68]">{member.email}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider ${roleLabels[member.role].color}`}>
                  {roleLabels[member.role].title}
                </span>
                <span className="text-[11px] text-[#806C68]">{member.joined}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Role Hierarchy Matrix */}
      <div className="bg-[#FFFAF5] rounded-3xl border border-[#E4D8D1] p-6 sm:p-8 shadow-xs">
        <h3 className="text-base font-bold text-[#35252A] mb-1">
          Role Permission Hierarchy
        </h3>
        <p className="text-xs text-[#806C68] mb-6">
          Strictly enforced across both client routes and Firestore backend security rules.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(['super_admin', 'org_admin', 'reviewer', 'creator'] as UserRole[]).map((r) => (
            <div key={r} className="p-4 rounded-2xl bg-[#F4EEE8]/70 border border-[#E4D8D1] space-y-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider inline-block ${roleLabels[r].color}`}>
                {roleLabels[r].title}
              </span>
              <p className="text-xs text-[#806C68] leading-relaxed">
                {roleLabels[r].desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Invite Member */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3D1B26]/40 backdrop-blur-xs">
          <div className="bg-[#FFFAF5] border border-[#E4D8D1] rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#35252A]">Invite Team Member</h3>
              <button
                onClick={() => setInviteModalOpen(false)}
                className="p-1 rounded-lg text-[#806C68] hover:text-[#35252A] hover:bg-[#E8DED5]/50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#35252A] uppercase tracking-wider mb-1.5">
                  Member Work Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="colleague@yourcompany.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F4EEE8] border border-[#E4D8D1] rounded-xl text-xs sm:text-sm text-[#35252A] focus:outline-none focus:ring-2 focus:ring-[#652B39]/30 focus:border-[#652B39]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#35252A] uppercase tracking-wider mb-1.5">
                  Assigned Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2.5 bg-[#F4EEE8] border border-[#E4D8D1] rounded-xl text-xs sm:text-sm text-[#35252A] focus:outline-none focus:ring-2 focus:ring-[#652B39]/30 focus:border-[#652B39]"
                >
                  <option value="reviewer">Reviewer (Can approve content)</option>
                  <option value="creator">Content Creator (Can submit copy)</option>
                  <option value="org_admin">Organisation Admin (Full rights)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#806C68] hover:text-[#35252A] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!inviteEmail.trim()}
                  className="px-5 py-2 rounded-xl bg-[#652B39] hover:bg-[#512331] text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
