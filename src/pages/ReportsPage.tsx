import React, { useState, useEffect, useMemo } from 'react';
import {
  collection,
  getDocs
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  BarChart3,
  Download,
  Calendar,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ShieldCheck,
  TrendingUp,
  FileText,
  Sparkles,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { EmptyState } from '../components/common/EmptyState';
import { ContentAnalysisRecord } from '../types/analysis';
import { ApprovalRequest } from '../types/approvals';

export const ReportsPage: React.FC = () => {
  const { currentOrg } = useAuth();
  const orgId = currentOrg?.id || '';

  // Data State from Firestore
  const [analyses, setAnalyses] = useState<ContentAnalysisRecord[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [claimsCount, setClaimsCount] = useState(0);
  const [rulesCount, setRulesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Time Range Filter
  const [timeRange, setTimeRange] = useState<'30d' | '90d' | 'all'>('all');
  const [exporting, setExporting] = useState(false);

  // Load Real Data from Firestore
  useEffect(() => {
    if (!orgId) return;
    const fetchReportData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Analyses
        const analysesRef = collection(db, 'organizations', orgId, 'analyses');
        const analysesSnap = await getDocs(analysesRef);
        const aList: ContentAnalysisRecord[] = [];
        analysesSnap.forEach((d) => aList.push(d.data() as ContentAnalysisRecord));
        setAnalyses(aList);

        // 2. Fetch Approvals
        const approvalsRef = collection(db, 'organizations', orgId, 'approvals');
        const approvalsSnap = await getDocs(approvalsRef);
        const apList: ApprovalRequest[] = [];
        approvalsSnap.forEach((d) => apList.push(d.data() as ApprovalRequest));
        setApprovals(apList);

        // 3. Fetch Claims count
        const claimsRef = collection(db, 'organizations', orgId, 'claims');
        const claimsSnap = await getDocs(claimsRef);
        setClaimsCount(claimsSnap.size);

        // 4. Fetch Rules count
        const rulesRef = collection(db, 'organizations', orgId, 'rules');
        const rulesSnap = await getDocs(rulesRef);
        setRulesCount(rulesSnap.size);
      } catch (err) {
        console.warn('Reports data fetch fallback:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [orgId]);

  // Aggregate Real Stored Metrics
  const metrics = useMemo(() => {
    const totalAnalyses = analyses.length;
    const totalApprovals = approvals.length;

    // Total distinct checked pieces of content
    const totalChecked = totalAnalyses + totalApprovals;

    // Counts
    const approved =
      analyses.filter((a) => a.status === 'approved').length +
      approvals.filter((a) => a.status === 'approved').length;

    const rejected =
      analyses.filter((a) => a.status === 'rejected').length +
      approvals.filter((a) => a.status === 'rejected').length;

    const pending =
      analyses.filter((a) => a.status === 'pending_review' || a.status === 'flagged').length +
      approvals.filter((a) => a.status === 'pending' || a.status === 'changes_requested').length;

    // Average Score
    const allScores: number[] = [
      ...analyses.map((a) => a.score),
      ...approvals.map((a) => a.brandScore)
    ];

    const averageScore =
      allScores.length > 0
        ? Math.round(allScores.reduce((acc, curr) => acc + curr, 0) / allScores.length)
        : 0;

    // Common Violations Map
    const violationMap: Record<string, number> = {
      'Tone & Voice': 0,
      'Prohibited Terminology': 0,
      'Missing Disclaimer': 0,
      'Character Limit': 0,
      'Unsupported Claim': 0,
      'Grammar & Format': 0
    };

    analyses.forEach((a) => {
      if (Array.isArray(a.violations)) {
        a.violations.forEach((v) => {
          if (v.type === 'tone') violationMap['Tone & Voice'] += 1;
          else if (v.type === 'banned_word' || v.type === 'preferred_term') violationMap['Prohibited Terminology'] += 1;
          else if (v.type === 'disclaimer') violationMap['Missing Disclaimer'] += 1;
          else if (v.type === 'character_limit') violationMap['Character Limit'] += 1;
          else if (v.type === 'claim') violationMap['Unsupported Claim'] += 1;
          else violationMap['Grammar & Format'] += 1;
        });
      }
    });

    approvals.forEach((a) => {
      if (a.claimsStatus === 'contains_unsupported') {
        violationMap['Unsupported Claim'] += 1;
      }
    });

    const commonViolations = Object.entries(violationMap).map(([category, count]) => ({
      category,
      count
    }));

    // Monthly Trend Aggregation based on real creation timestamps
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonthIdx = new Date().getMonth();

    // Generate past 6 months timeline
    const monthlyTrendData: Array<{
      month: string;
      checked: number;
      approved: number;
      rejected: number;
      pending: number;
    }> = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(currentMonthIdx - i);
      const mName = monthNames[d.getMonth()];
      const year = d.getFullYear();
      const monthNum = d.getMonth();

      // Filter real items created in this month and year
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
      const pendingCount =
        inMonthAnalyses.filter((a) => a.status === 'pending_review' || a.status === 'flagged').length +
        inMonthApprovals.filter((a) => a.status === 'pending' || a.status === 'changes_requested').length;

      monthlyTrendData.push({
        month: `${mName} ${year.toString().slice(-2)}`,
        checked: checkedCount,
        approved: approvedCount,
        rejected: rejectedCount,
        pending: pendingCount
      });
    }

    // Risk Breakdown
    const riskMap: Record<string, number> = {
      Low: analyses.filter((a) => a.riskLevel === 'low').length + approvals.filter((a) => a.riskLevel === 'low').length,
      Medium: analyses.filter((a) => a.riskLevel === 'medium').length + approvals.filter((a) => a.riskLevel === 'medium').length,
      High: analyses.filter((a) => a.riskLevel === 'high').length + approvals.filter((a) => a.riskLevel === 'high').length,
      Critical: analyses.filter((a) => a.riskLevel === 'critical').length + approvals.filter((a) => a.riskLevel === 'critical').length
    };

    const riskDistribution = [
      { name: 'Low Risk', value: riskMap['Low'], color: '#2E6F40' },
      { name: 'Medium Risk', value: riskMap['Medium'], color: '#B7791F' },
      { name: 'High Risk', value: riskMap['High'], color: '#A3282C' },
      { name: 'Critical Risk', value: riskMap['Critical'], color: '#3D1B26' }
    ].filter((item) => item.value > 0);

    return {
      totalChecked,
      approved,
      rejected,
      pending,
      averageScore,
      commonViolations,
      monthlyTrendData,
      riskDistribution
    };
  }, [analyses, approvals]);

  // Export Comprehensive Report CSV
  const handleExportCSV = () => {
    setExporting(true);
    const rows = [
      ['Report Type', 'BrandLint Governance & Compliance Summary'],
      ['Organization', currentOrg?.name || 'Workspace'],
      ['Export Date', new Date().toISOString()],
      ['Total Checked', metrics.totalChecked.toString()],
      ['Approved Publications', metrics.approved.toString()],
      ['Rejected Publications', metrics.rejected.toString()],
      ['Pending Review', metrics.pending.toString()],
      ['Average Brand Score', `${metrics.averageScore} / 100`],
      ['Registered Claims in Vault', claimsCount.toString()],
      ['Approved Constitution Rules', rulesCount.toString()],
      [],
      ['Monthly Trend Breakdown'],
      ['Month', 'Total Checked', 'Approved', 'Rejected', 'Pending']
    ];

    metrics.monthlyTrendData.forEach((m) => {
      rows.push([m.month, m.checked.toString(), m.approved.toString(), m.rejected.toString(), m.pending.toString()]);
    });

    rows.push([]);
    rows.push(['Common Brand Violations by Category']);
    rows.push(['Violation Category', 'Frequency Count']);
    metrics.commonViolations.forEach((v) => {
      rows.push([v.category, v.count.toString()]);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `brandlint_audit_report_${currentOrg?.slug || 'tenant'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => setExporting(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#35252A] tracking-tight">
              Governance & Compliance Reports
            </h1>
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#652B39]/10 text-[#652B39] border border-[#652B39]/20">
              Audit-Grade Analytics
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#806C68]">
            Aggregated governance metrics computed strictly from real stored checks in <strong className="text-[#35252A]">{currentOrg?.name}</strong>.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={exporting}
          className="px-4 py-2 rounded-xl bg-[#652B39] hover:bg-[#512331] text-white text-xs font-semibold shadow-xs hover:shadow transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>{exporting ? 'Generating CSV...' : 'Export Audit Report (CSV)'}</span>
        </button>
      </div>

      {/* KPI Cards Strip (Total checked, approved, rejected, pending, average score) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Checked */}
        <div className="p-4 rounded-2xl bg-[#FFFAF5] border border-[#E4D8D1] shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[#806C68] tracking-wider">
              Total Checked
            </span>
            <div className="w-6 h-6 rounded-lg bg-[#652B39]/10 text-[#652B39] flex items-center justify-center">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold font-mono text-[#35252A]">
            {metrics.totalChecked}
          </div>
          <span className="text-[11px] text-[#806C68] block">Audited publications</span>
        </div>

        {/* Approved */}
        <div className="p-4 rounded-2xl bg-[#FFFAF5] border border-[#E4D8D1] shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[#2E6F40] tracking-wider">
              Approved
            </span>
            <div className="w-6 h-6 rounded-lg bg-[#2E6F40]/10 text-[#2E6F40] flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold font-mono text-[#2E6F40]">
            {metrics.approved}
          </div>
          <span className="text-[11px] text-[#806C68] block">
            {metrics.totalChecked > 0
              ? `${Math.round((metrics.approved / metrics.totalChecked) * 100)}% approval rate`
              : 'Zero certified yet'}
          </span>
        </div>

        {/* Rejected */}
        <div className="p-4 rounded-2xl bg-[#FFFAF5] border border-[#E4D8D1] shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[#A3282C] tracking-wider">
              Rejected
            </span>
            <div className="w-6 h-6 rounded-lg bg-[#A3282C]/10 text-[#A3282C] flex items-center justify-center">
              <XCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold font-mono text-[#A3282C]">
            {metrics.rejected}
          </div>
          <span className="text-[11px] text-[#806C68] block">Blocked for policy</span>
        </div>

        {/* Pending */}
        <div className="p-4 rounded-2xl bg-[#FFFAF5] border border-[#E4D8D1] shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[#975A16] tracking-wider">
              Pending
            </span>
            <div className="w-6 h-6 rounded-lg bg-[#B7791F]/15 text-[#975A16] flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold font-mono text-[#975A16]">
            {metrics.pending}
          </div>
          <span className="text-[11px] text-[#806C68] block">Awaiting sign-off</span>
        </div>

        {/* Average Score */}
        <div className="p-4 rounded-2xl bg-[#FFFAF5] border border-[#E4D8D1] shadow-xs space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[#652B39] tracking-wider">
              Avg Score
            </span>
            <div className="w-6 h-6 rounded-lg bg-[#652B39]/10 text-[#652B39] flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold font-mono text-[#35252A]">
            {metrics.averageScore > 0 ? `${metrics.averageScore}` : '--'}
            <span className="text-xs font-normal text-[#806C68] ml-1">/ 100</span>
          </div>
          <span className="text-[11px] text-[#806C68] block">Organization health</span>
        </div>
      </div>

      {metrics.totalChecked === 0 ? (
        <div className="bg-[#FFFAF5] rounded-3xl border border-[#E4D8D1] p-8 shadow-xs">
          <EmptyState
            icon={BarChart3}
            badge="Real Analytics Engine"
            title="Awaiting Stored Publication Checks"
            description="BrandLint reports compute live from real stored checks in your organization's database. No synthetic numbers are displayed. Run content lints in Content Analysis or submit drafts in the Approval Gate to generate audit graphs."
            tips={[
              {
                title: 'Total Checked & Statuses',
                desc: 'Tracks every draft analyzed, certified, or rejected across all workspace users.'
              },
              {
                title: 'Common Violations Bar Chart',
                desc: 'Aggregates frequency counts across Tone, Terminology, Banned Words, Disclaimers, and Claims.'
              },
              {
                title: 'Monthly Volume & Pass Trend',
                desc: 'Recharts visual trend illustrating compliance improvement over time.'
              }
            ]}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Charts Row 1: Monthly Trend (Recharts AreaChart) */}
          <div className="bg-[#FFFAF5] rounded-3xl border border-[#E4D8D1] p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-[#35252A]">
                  Monthly Publication & Governance Trend
                </h3>
                <p className="text-xs text-[#806C68]">
                  Volume of content audited, certified, and rejected across calendar months.
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 font-medium text-[#652B39]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#652B39]" />
                  Total Checked
                </span>
                <span className="flex items-center gap-1.5 font-medium text-[#2E6F40]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2E6F40]" />
                  Approved
                </span>
                <span className="flex items-center gap-1.5 font-medium text-[#A3282C]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#A3282C]" />
                  Rejected
                </span>
              </div>
            </div>

            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={metrics.monthlyTrendData}
                  margin={{ top: 10, right: 20, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorChecked" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#652B39" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#652B39" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2E6F40" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#2E6F40" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E4D8D1" vertical={false} />
                  <XAxis
                    dataKey="month"
                    stroke="#806C68"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#806C68"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFAF5',
                      borderColor: '#E4D8D1',
                      borderRadius: '12px',
                      fontSize: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="checked"
                    name="Total Checked"
                    stroke="#652B39"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorChecked)"
                  />
                  <Area
                    type="monotone"
                    dataKey="approved"
                    name="Approved"
                    stroke="#2E6F40"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorApproved)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Charts Row 2: Common Violations (BarChart) + Risk Distribution (PieChart) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Common Violations BarChart */}
            <div className="lg:col-span-8 bg-[#FFFAF5] rounded-3xl border border-[#E4D8D1] p-6 shadow-xs space-y-4">
              <div>
                <h3 className="text-base font-bold text-[#35252A]">
                  Common Brand Policy Violations
                </h3>
                <p className="text-xs text-[#806C68]">
                  Aggregated infraction frequencies detected across all inspected marketing copy.
                </p>
              </div>

              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={metrics.commonViolations}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E4D8D1" horizontal={false} />
                    <XAxis type="number" stroke="#806C68" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis
                      dataKey="category"
                      type="category"
                      stroke="#35252A"
                      tick={{ fontSize: 11, fontWeight: 500 }}
                      tickLine={false}
                      width={140}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFAF5',
                        borderColor: '#E4D8D1',
                        borderRadius: '12px',
                        fontSize: '12px'
                      }}
                    />
                    <Bar
                      dataKey="count"
                      name="Occurrences"
                      fill="#652B39"
                      radius={[0, 8, 8, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Risk Distribution Donut */}
            <div className="lg:col-span-4 bg-[#FFFAF5] rounded-3xl border border-[#E4D8D1] p-6 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-[#35252A]">
                  Risk Distribution
                </h3>
                <p className="text-xs text-[#806C68]">
                  Content volume categorized by severity tier.
                </p>

                <div className="h-52 w-full pt-2 flex items-center justify-center">
                  {metrics.riskDistribution.length === 0 ? (
                    <div className="text-center text-xs text-[#806C68]">
                      No risk-classified items
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={metrics.riskDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {metrics.riskDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#FFFAF5',
                            borderColor: '#E4D8D1',
                            borderRadius: '10px',
                            fontSize: '12px'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Legend */}
              <div className="pt-2 border-t border-[#E4D8D1]/70 grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2E6F40]" />
                  <span className="text-[#35252A] font-medium">Low Risk</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#B7791F]" />
                  <span className="text-[#35252A] font-medium">Medium</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#A3282C]" />
                  <span className="text-[#35252A] font-medium">High Risk</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3D1B26]" />
                  <span className="text-[#35252A] font-medium">Critical</span>
                </div>
              </div>
            </div>
          </div>

          {/* Audit Summary Table: Recent Audited Records */}
          <div className="bg-[#FFFAF5] rounded-3xl border border-[#E4D8D1] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#35252A]">
                Recent Publication Audit Records
              </h3>
              <span className="text-xs text-[#806C68]">
                Displaying latest {Math.min(10, analyses.length + approvals.length)} entries
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E4D8D1] text-[#806C68] uppercase font-bold text-[10px]">
                    <th className="py-2.5 px-3">Title / Campaign</th>
                    <th className="py-2.5 px-3">Format</th>
                    <th className="py-2.5 px-3">Brand Score</th>
                    <th className="py-2.5 px-3">Risk Level</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Audit Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4D8D1]/60">
                  {[...approvals, ...analyses].slice(0, 10).map((item: any, idx) => {
                    const score = item.brandScore ?? item.score;
                    const status = item.status;
                    const risk = item.riskLevel;

                    return (
                      <tr key={idx} className="hover:bg-[#F4EEE8]/40 transition-colors">
                        <td className="py-3 px-3 font-semibold text-[#35252A] max-w-xs truncate">
                          {item.title}
                        </td>
                        <td className="py-3 px-3 uppercase text-[10px] font-bold text-[#652B39]">
                          {item.contentType}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-[#35252A]">
                          {score}/100
                        </td>
                        <td className="py-3 px-3 capitalize">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            risk === 'low' ? 'bg-[#2E6F40]/10 text-[#2E6F40]' :
                            risk === 'medium' ? 'bg-[#B7791F]/15 text-[#975A16]' :
                            risk === 'high' ? 'bg-[#A3282C]/10 text-[#A3282C]' :
                            'bg-[#3D1B26] text-white'
                          }`}>
                            {risk}
                          </span>
                        </td>
                        <td className="py-3 px-3 capitalize text-[#806C68] font-medium">
                          {status.replace('_', ' ')}
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-[#806C68]">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
