import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import {
  ShieldAlert,
  FileSearch,
  Scroll,
  Users2,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  XCircle,
  Layers,
  RotateCcw,
  Bot,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import { ContentAnalysisRecord } from '../types/analysis';
import { ApprovalRequest, AuditLogEntry } from '../types/approvals';

export const DashboardPage: React.FC = () => {
  const { userProfile, currentOrg } = useAuth();
  const orgId = currentOrg?.id || '';
  const navigate = useNavigate();

  // Real Database State
  const [analyses, setAnalyses] = useState<ContentAnalysisRecord[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [rulesCount, setRulesCount] = useState(0);
  const [claimsCount, setClaimsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch all real records for the tenant
  useEffect(() => {
    if (!orgId) return;
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Analyses
        const analysesRef = collection(db, 'organizations', orgId, 'analyses');
        const aSnap = await getDocs(analysesRef);
        const aList: ContentAnalysisRecord[] = [];
        aSnap.forEach((d) => aList.push(d.data() as ContentAnalysisRecord));
        setAnalyses(aList);

        // Approvals
        const approvalsRef = collection(db, 'organizations', orgId, 'approvals');
        const apSnap = await getDocs(approvalsRef);
        const apList: ApprovalRequest[] = [];
        apSnap.forEach((d) => apList.push(d.data() as ApprovalRequest));
        setApprovals(apList);

        // Audit Logs (recent 10)
        const logsRef = collection(db, 'organizations', orgId, 'auditLogs');
        const logSnap = await getDocs(logsRef);
        const logList: AuditLogEntry[] = [];
        logSnap.forEach((d) => logList.push(d.data() as AuditLogEntry));
        logList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setAuditLogs(logList.slice(0, 8));

        // Constitution Rules Count
        const rulesRef = collection(db, 'organizations', orgId, 'rules');
        const rSnap = await getDocs(rulesRef);
        setRulesCount(rSnap.size);

        // Approved Claims Count
        const claimsRef = collection(db, 'organizations', orgId, 'claims');
        const cSnap = await getDocs(claimsRef);
        setClaimsCount(cSnap.size);
      } catch (err) {
        console.warn('Dashboard data fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [orgId]);

  // Real Metrics Calculations
  const metrics = useMemo(() => {
    const totalChecked = analyses.length + approvals.length;

    const approved =
      analyses.filter((a) => a.status === 'approved').length +
      approvals.filter((a) => a.status === 'approved').length;

    const rejected =
      analyses.filter((a) => a.status === 'rejected').length +
      approvals.filter((a) => a.status === 'rejected').length;

    const pending =
      analyses.filter((a) => a.status === 'pending_review' || a.status === 'flagged').length +
      approvals.filter((a) => a.status === 'pending' || a.status === 'changes_requested').length;

    const allScores: number[] = [
      ...analyses.map((a) => a.score),
      ...approvals.map((a) => a.brandScore)
    ];

    const averageScore =
      allScores.length > 0
        ? Math.round(allScores.reduce((acc, curr) => acc + curr, 0) / allScores.length)
        : null;

    // Monthly Trend Chart based on real records
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonthIdx = new Date().getMonth();

    const monthlyTrendData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(currentMonthIdx - i);
      const mName = monthNames[d.getMonth()];
      const year = d.getFullYear();
      const monthNum = d.getMonth();

      const inMonthAnalyses = analyses.filter((a) => {
        const itemDate = new Date(a.createdAt);
        return itemDate.getMonth() === monthNum && itemDate.getFullYear() === year;
      });

      const inMonthApprovals = approvals.filter((a) => {
        const itemDate = new Date(a.createdAt);
        return itemDate.getMonth() === monthNum && itemDate.getFullYear() === year;
      });

      const checkedCount = inMonthAnalyses.length + inMonthApprovals.length;
      const approvedCount =
        inMonthAnalyses.filter((a) => a.status === 'approved').length +
        inMonthApprovals.filter((a) => a.status === 'approved').length;
      const rejectedCount =
        inMonthAnalyses.filter((a) => a.status === 'rejected').length +
        inMonthApprovals.filter((a) => a.status === 'rejected').length;

      monthlyTrendData.push({
        month: `${mName} ${year.toString().slice(-2)}`,
        checked: checkedCount,
        approved: approvedCount,
        rejected: rejectedCount
      });
    }

    // Common Violations Map
    const violationMap: Record<string, number> = {
      'Tone & Voice': 0,
      'Prohibited Terms': 0,
      'Disclaimers': 0,
      'Char Limits': 0,
      'Unsupported Claims': 0
    };

    analyses.forEach((a) => {
      if (Array.isArray(a.violations)) {
        a.violations.forEach((v) => {
          if (v.type === 'tone') violationMap['Tone & Voice'] += 1;
          else if (v.type === 'banned_word' || v.type === 'preferred_term') violationMap['Prohibited Terms'] += 1;
          else if (v.type === 'disclaimer') violationMap['Disclaimers'] += 1;
          else if (v.type === 'character_limit') violationMap['Char Limits'] += 1;
          else if (v.type === 'claim') violationMap['Unsupported Claims'] += 1;
        });
      }
    });

    approvals.forEach((a) => {
      if (a.claimsStatus === 'contains_unsupported') {
        violationMap['Unsupported Claims'] += 1;
      }
    });

    const commonViolations = Object.entries(violationMap).map(([category, count]) => ({
      category,
      count
    }));

    return {
      totalChecked,
      approved,
      rejected,
      pending,
      averageScore,
      monthlyTrendData,
      commonViolations
    };
  }, [analyses, approvals]);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#35252A] tracking-tight">
            Governance Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-[#806C68] mt-1">
            Real-time brand compliance stream for <strong className="text-[#35252A]">{currentOrg?.name}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => navigate('/app/constitution')}
            className="px-4 py-2 rounded-xl bg-[#FFFAF5] hover:bg-[#E8DED5]/60 border border-[#E4D8D1] text-xs font-semibold text-[#35252A] transition-all cursor-pointer"
          >
            Brand Constitution
          </button>
          <button
            onClick={() => navigate('/app/analysis')}
            className="px-4 py-2 rounded-xl bg-[#652B39] hover:bg-[#512331] text-white text-xs font-semibold shadow-xs hover:shadow transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <FileSearch className="w-4 h-4" />
            <span>Run Content Lint</span>
          </button>
        </div>
      </div>

      {/* Real Metrics Overview Cards Strip (Total checked, approved, rejected, pending) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Checked */}
        <div className="p-5 rounded-2xl bg-[#FFFAF5] border border-[#E4D8D1] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#806C68]">
              Total Checked
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#652B39]/10 text-[#652B39] flex items-center justify-center">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold font-mono text-[#35252A]">
            {metrics.totalChecked}
          </div>
          <span className="text-[11px] text-[#806C68]">
            {metrics.totalChecked > 0 ? 'Audited publications' : 'No content checked yet'}
          </span>
        </div>

        {/* Approved */}
        <div className="p-5 rounded-2xl bg-[#FFFAF5] border border-[#E4D8D1] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#2E6F40]">
              Approved
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#2E6F40]/10 text-[#2E6F40] flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold font-mono text-[#2E6F40]">
            {metrics.approved}
          </div>
          <span className="text-[11px] text-[#806C68]">
            {metrics.totalChecked > 0
              ? `${Math.round((metrics.approved / metrics.totalChecked) * 100)}% pass rate`
              : 'Zero certified yet'}
          </span>
        </div>

        {/* Rejected */}
        <div className="p-5 rounded-2xl bg-[#FFFAF5] border border-[#E4D8D1] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#A3282C]">
              Rejected
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#A3282C]/10 text-[#A3282C] flex items-center justify-center">
              <XCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold font-mono text-[#A3282C]">
            {metrics.rejected}
          </div>
          <span className="text-[11px] text-[#806C68]">
            {metrics.rejected > 0 ? 'Blocked for policy' : 'No rejections logged'}
          </span>
        </div>

        {/* Pending */}
        <div className="p-5 rounded-2xl bg-[#FFFAF5] border border-[#E4D8D1] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#975A16]">
              Pending
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#B7791F]/15 text-[#975A16] flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold font-mono text-[#975A16]">
            {metrics.pending}
          </div>
          <span className="text-[11px] text-[#806C68]">Awaiting reviewer action</span>
        </div>
      </div>

      {/* Allowed 3D Accent: Key Dashboard Brand Health Card */}
      <div className="surface-3d surface-3d-lift rounded-3xl p-6 sm:p-8 border border-[#E4D8D1] shadow-md relative overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-8 space-y-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#652B39]/10 text-[#652B39] text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Real Workspace Governance Status</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold text-[#35252A] tracking-tight">
              {metrics.totalChecked > 0
                ? `${currentOrg?.name} Brand Integrity Status`
                : "Initialize Your Organization's Governance Baseline"}
            </h2>

            <p className="text-xs sm:text-sm text-[#806C68] max-w-xl leading-relaxed">
              {metrics.totalChecked > 0
                ? `BrandLint is actively guarding ${currentOrg?.name}'s publications across all channels with ${rulesCount} active Brand Constitution rules and ${claimsCount} certified ClaimShield proofs.`
                : 'Your workspace is provisioned. Upload brand guidelines, register ClaimShield proofs, and run content lints to activate autonomous governance gates.'}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={() => navigate('/app/approvals')}
                className="px-4 py-2.5 rounded-xl bg-[#652B39] hover:bg-[#512331] text-white text-xs font-bold shadow-xs hover:shadow transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Open Approval Gate</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => navigate('/app/reports')}
                className="px-4 py-2.5 rounded-xl bg-[#FFFAF5] hover:bg-[#E8DED5]/60 border border-[#E4D8D1] text-[#35252A] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <TrendingUp className="w-3.5 h-3.5 text-[#652B39]" />
                <span>View Full Reports</span>
              </button>
            </div>
          </div>

          <div className="md:col-span-4 flex flex-col items-center justify-center p-6 bg-[#FFFAF5]/90 rounded-2xl border border-[#E4D8D1]/80 shadow-xs text-center">
            {/* 3D Score Orb Accent (Allowed 3D Surface) */}
            <div className="score-orb-3d w-20 h-20 rounded-full flex flex-col items-center justify-center border border-[#E4D8D1] mb-3">
              <span className="text-[10px] font-mono font-bold text-[#806C68]">AVG SCORE</span>
              <span className="text-xl font-extrabold text-[#35252A] font-mono">
                {metrics.averageScore !== null ? metrics.averageScore : '--'}
              </span>
            </div>

            <span className="text-xs font-bold text-[#35252A]">Brand Consistency Score</span>
            <span className="text-[11px] text-[#806C68] mt-0.5">
              {metrics.averageScore !== null
                ? `Calculated across ${metrics.totalChecked} stored publications`
                : 'Requires at least 1 content audit'}
            </span>
          </div>
        </div>
      </div>

      {/* Visual Analytics Row: Monthly Trend & Common Violations with Recharts */}
      {metrics.totalChecked > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Monthly Trend Recharts AreaChart */}
          <div className="lg:col-span-7 bg-[#FFFAF5] rounded-3xl border border-[#E4D8D1] p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#35252A] uppercase tracking-wider">
                  Monthly Publication Trend
                </h3>
                <p className="text-xs text-[#806C68]">Checked vs Approved publications.</p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1 text-[#652B39] font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#652B39]" />
                  Checked
                </span>
                <span className="flex items-center gap-1 text-[#2E6F40] font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#2E6F40]" />
                  Approved
                </span>
              </div>
            </div>

            <div className="h-56 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={metrics.monthlyTrendData}
                  margin={{ top: 5, right: 10, left: -25, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E4D8D1" vertical={false} />
                  <XAxis dataKey="month" stroke="#806C68" tick={{ fontSize: 10 }} tickLine={false} />
                  <YAxis stroke="#806C68" tick={{ fontSize: 10 }} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFAF5',
                      borderColor: '#E4D8D1',
                      borderRadius: '10px',
                      fontSize: '11px'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="checked"
                    name="Checked"
                    stroke="#652B39"
                    strokeWidth={2}
                    fill="#652B39"
                    fillOpacity={0.15}
                  />
                  <Area
                    type="monotone"
                    dataKey="approved"
                    name="Approved"
                    stroke="#2E6F40"
                    strokeWidth={2}
                    fill="#2E6F40"
                    fillOpacity={0.15}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Common Violations BarChart */}
          <div className="lg:col-span-5 bg-[#FFFAF5] rounded-3xl border border-[#E4D8D1] p-6 shadow-xs space-y-3">
            <div>
              <h3 className="text-sm font-bold text-[#35252A] uppercase tracking-wider">
                Common Policy Violations
              </h3>
              <p className="text-xs text-[#806C68]">Infractions detected in copy.</p>
            </div>

            <div className="h-56 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={metrics.commonViolations}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 25, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E4D8D1" horizontal={false} />
                  <XAxis type="number" stroke="#806C68" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <YAxis
                    dataKey="category"
                    type="category"
                    stroke="#35252A"
                    tick={{ fontSize: 10, fontWeight: 500 }}
                    tickLine={false}
                    width={110}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFAF5',
                      borderColor: '#E4D8D1',
                      borderRadius: '10px',
                      fontSize: '11px'
                    }}
                  />
                  <Bar dataKey="count" name="Violations" fill="#652B39" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Guided Onboarding Checklist & Real Audit Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Setup Checklist */}
        <div className="lg:col-span-7 bg-[#FFFAF5] rounded-3xl border border-[#E4D8D1] p-6 shadow-xs space-y-3">
          <div>
            <h3 className="text-base font-bold text-[#35252A]">
              Brand Governance Checklist
            </h3>
            <p className="text-xs text-[#806C68]">
              Status of your organization's automated pre-publication controls.
            </p>
          </div>

          <div className="space-y-3 pt-1">
            {/* 1. Constitution */}
            <div
              onClick={() => navigate('/app/constitution')}
              className="p-3.5 rounded-xl bg-[#F4EEE8]/70 border border-[#E4D8D1] hover:border-[#652B39]/40 transition-colors flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#652B39]/10 text-[#652B39] flex items-center justify-center shrink-0">
                  <Scroll className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#35252A]">Codify Brand Voice Attributes</h4>
                  <p className="text-[11px] text-[#806C68]">Establish authoritative tone dimensions and prohibited vocabulary.</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                rulesCount > 0 ? 'bg-[#2E6F40]/10 text-[#2E6F40]' : 'bg-[#B7791F]/10 text-[#B7791F]'
              }`}>
                {rulesCount > 0 ? `${rulesCount} Rules Active` : 'Pending'}
              </span>
            </div>

            {/* 2. ClaimShield */}
            <div
              onClick={() => navigate('/app/claimshield')}
              className="p-3.5 rounded-xl bg-[#F4EEE8]/70 border border-[#E4D8D1] hover:border-[#652B39]/40 transition-colors flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#652B39]/10 text-[#652B39] flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#35252A]">Register Substantiated Claims</h4>
                  <p className="text-[11px] text-[#806C68]">Attach benchmark citations to performance and ROI statistics.</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                claimsCount > 0 ? 'bg-[#2E6F40]/10 text-[#2E6F40]' : 'bg-[#B7791F]/10 text-[#B7791F]'
              }`}>
                {claimsCount > 0 ? `${claimsCount} Proofs Active` : 'Pending'}
              </span>
            </div>

            {/* 3. Analysis */}
            <div
              onClick={() => navigate('/app/analysis')}
              className="p-3.5 rounded-xl bg-[#F4EEE8]/70 border border-[#E4D8D1] hover:border-[#652B39]/40 transition-colors flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#652B39]/10 text-[#652B39] flex items-center justify-center shrink-0">
                  <FileSearch className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#35252A]">Content Analysis Linter</h4>
                  <p className="text-[11px] text-[#806C68]">Submit campaign copy for automated 4-stage lint inspection.</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                analyses.length > 0 ? 'bg-[#2E6F40]/10 text-[#2E6F40]' : 'bg-[#652B39]/10 text-[#652B39]'
              }`}>
                {analyses.length > 0 ? `${analyses.length} Audited` : 'Ready'}
              </span>
            </div>

            {/* 4. BrandGuard AI */}
            <div
              onClick={() => navigate('/app/brandguard')}
              className="p-3.5 rounded-xl bg-[#F4EEE8]/70 border border-[#E4D8D1] hover:border-[#652B39]/40 transition-colors flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#652B39]/10 text-[#652B39] flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#35252A]">BrandGuard AI Rewrite Studio</h4>
                  <p className="text-[11px] text-[#806C68]">Autonomous suggested rewrites with visual diffs and 1-click approvals.</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-[#652B39]/10 text-[#652B39]">
                Active
              </span>
            </div>
          </div>
        </div>

        {/* Real Audit Stream */}
        <div className="lg:col-span-5 bg-[#FFFAF5] rounded-3xl border border-[#E4D8D1] p-6 shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#35252A]">
                Audit & Sign-Off Stream
              </h3>
              <button
                onClick={() => navigate('/app/approvals')}
                className="text-xs text-[#652B39] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View Queue</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-[#806C68]">
              Real-time audit log of reviewed content and publication releases.
            </p>

            {auditLogs.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-[#F4EEE8]/60 border border-dashed border-[#E4D8D1]">
                <Clock className="w-8 h-8 text-[#806C68]/60 mx-auto mb-2" />
                <span className="text-xs font-bold text-[#35252A] block mb-1">
                  No Publications Audited Yet
                </span>
                <p className="text-[11px] text-[#806C68] leading-relaxed">
                  As creators submit drafts and reviewers approve copy, an immutable audit trail will generate here.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-xl bg-[#F4EEE8]/70 border border-[#E4D8D1] text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-[#652B39] uppercase">
                        {log.action}
                      </span>
                      <span className="text-[#806C68] font-mono">
                        {new Date(log.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-[#35252A] text-[11px] leading-snug truncate">
                      {log.details}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 mt-3 border-t border-[#E4D8D1] flex items-center justify-between text-xs text-[#806C68]">
            <span>Active Tenant Role:</span>
            <span className="font-semibold text-[#652B39] capitalize">
              {userProfile?.role?.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
