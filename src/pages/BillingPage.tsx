import React from 'react';
import { CreditCard, Check, Zap, Shield, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const BillingPage: React.FC = () => {
  const { currentOrg } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#35252A] tracking-tight">
            Subscription & Billing
          </h1>
          <p className="text-xs sm:text-sm text-[#806C68] mt-1">
            Subscription tiers, usage allowances, and enterprise invoicing for {currentOrg?.name}.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Active Plan Card */}
        <div className="lg:col-span-8 bg-[#FFFAF5] rounded-3xl border border-[#E4D8D1] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#E4D8D1]">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#806C68] block">
                Active Tier
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#35252A] capitalize">
                {currentOrg?.plan || 'Professional'} Plan
              </h2>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#2E6F40]/10 text-[#2E6F40] border border-[#2E6F40]/20">
              Active Subscription
            </span>
          </div>

          {/* Usage Meters */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#35252A]">
              Monthly Governance Quotas
            </h3>

            <div className="p-4 rounded-2xl bg-[#F4EEE8]/70 border border-[#E4D8D1] space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-[#35252A]">
                <span>Content Analyses Conducted</span>
                <span>0 / 500 (0% used)</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#E8DED5] overflow-hidden">
                <div className="h-full bg-[#652B39] w-0" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#F4EEE8]/70 border border-[#E4D8D1] space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-[#35252A]">
                <span>Certified ClaimShield™ Records</span>
                <span>0 / 100 (0% used)</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#E8DED5] overflow-hidden">
                <div className="h-full bg-[#652B39] w-0" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#F4EEE8]/70 border border-[#E4D8D1] space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-[#35252A]">
                <span>Active Brand Constitutions</span>
                <span>1 / 5 Workspaces</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#E8DED5] overflow-hidden">
                <div className="h-full bg-[#652B39] w-1/5" />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E4D8D1] flex flex-wrap items-center justify-between gap-3 text-xs text-[#806C68]">
            <span>Next billing cycle renewal: 1st of next month</span>
            <button
              onClick={() => alert('Plan configuration is managed via your enterprise contract representative.')}
              className="px-4 py-2 rounded-xl bg-[#652B39] hover:bg-[#512331] text-white font-semibold transition-all cursor-pointer"
            >
              Modify Plan Tier
            </button>
          </div>
        </div>

        {/* Enterprise Invoicing Card */}
        <div className="lg:col-span-4 bg-[#FFFAF5] rounded-3xl border border-[#E4D8D1] p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-2xl bg-[#652B39]/10 text-[#652B39] flex items-center justify-center mb-3">
              <CreditCard className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#35252A] mb-1">
              Enterprise Billing Desk
            </h3>
            <p className="text-xs text-[#806C68] leading-relaxed mb-4">
              Need custom volume quotas, multi-subsidiary billing, or dedicated purchase order terms?
            </p>

            <ul className="text-xs text-[#35252A] space-y-2 mb-6">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#2E6F40]" />
                <span>Consolidated multi-tenant invoicing</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#2E6F40]" />
                <span>Custom SLA & uptime guarantees</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#2E6F40]" />
                <span>Dedicated legal compliance officer review</span>
              </li>
            </ul>
          </div>

          <button
            onClick={() => alert('Contacting BrandLint Enterprise Sales support desk.')}
            className="w-full py-2.5 rounded-xl bg-[#F4EEE8] hover:bg-[#E8DED5] border border-[#E4D8D1] text-xs font-semibold text-[#35252A] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Request Invoicing Support</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
