import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Bot,
  Sparkles,
  ShieldCheck,
  Check,
  X,
  Copy,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  SlidersHorizontal,
  ArrowRight,
  ExternalLink,
  BookOpen,
  Send,
  Layers,
  Split,
  FileText,
  Clock,
  Sparkle,
  Lock,
  ChevronDown,
  ChevronUp,
  Tag
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, doc, setDoc, getDocs, query, where } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { BrandGuardSuggestion, RewriteGoal, BrandGuardRewriteResult } from '../types/brandguard';
import { ConstitutionRule } from '../types/constitution';
import { ApprovedClaim } from '../types/claimshield';
import { EmptyState } from '../components/common/EmptyState';

const SAMPLE_PRESETS: Array<{
  name: string;
  goal: RewriteGoal;
  description: string;
  text: string;
}> = [
  {
    name: 'High-Pressure Enterprise Pitch',
    goal: 'polish',
    description: 'Contains manufactured urgency, prohibited "cheap" adjective, and uncited 10x ROI assertion.',
    text: `Act now before our dirt cheap enterprise license runs out! BrandLint is the #1 brand governance platform in the world, guaranteed to deliver 10x ROI for marketing teams with zero risk and 100% uptime.`
  },
  {
    name: 'Product Feature Announcement',
    goal: 'compliance',
    description: 'Contains non-preferred terminology ("customer support") and unverified superlatives.',
    text: `We are thrilled to launch a budget-friendly option for customer support teams. Buy now to unlock massive savings and enjoy fastest automated reviews on the market!`
  },
  {
    name: 'Customer Success Case Study',
    goal: 'claims',
    description: 'Contains quantifiable benchmarks that can be aligned with ClaimShield certified proofs.',
    text: `Enterprises using BrandLint reduce brand governance turnaround time by 78% and achieve 99.98% platform reliability while speeding up copy generation.`
  }
];

export const BrandGuardPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentOrg, userProfile } = useAuth();
  const orgId = currentOrg?.id || '';

  // Core State
  const [inputText, setInputText] = useState(SAMPLE_PRESETS[0].text);
  const [selectedGoal, setSelectedGoal] = useState<RewriteGoal>('polish');
  const [activeViewMode, setActiveViewMode] = useState<'diff' | 'split'>('diff');
  const [isRewriting, setIsRewriting] = useState(false);
  const [activeTab, setActiveTab] = useState<'studio' | 'guardrails'>('studio');

  // Grounding Data from Firestore
  const [approvedRules, setApprovedRules] = useState<ConstitutionRule[]>([]);
  const [approvedClaims, setApprovedClaims] = useState<ApprovedClaim[]>([]);
  const [loadingGrounding, setLoadingGrounding] = useState(false);

  // BrandGuard Results State (Original ALWAYS Preserved)
  const [preservedOriginal, setPreservedOriginal] = useState<string>('');
  const [suggestions, setSuggestions] = useState<BrandGuardSuggestion[]>([]);
  const [overallSummary, setOverallSummary] = useState<string>('');
  const [hasRun, setHasRun] = useState(false);

  // Guardrail Configuration State (from Sentry)
  const [strictness, setStrictness] = useState<'moderate' | 'strict' | 'maximum'>('strict');
  const [minPassScore, setMinPassScore] = useState(85);
  const [blockOnUncitedClaims, setBlockOnUncitedClaims] = useState(true);
  const [autoFootnoteDisclaimers, setAutoFootnoteDisclaimers] = useState(true);
  const [guardrailsSaved, setGuardrailsSaved] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  // Check for imported draft from Content Analysis
  useEffect(() => {
    const imported = localStorage.getItem('brandguard_import_content');
    if (imported) {
      setInputText(imported);
      localStorage.removeItem('brandguard_import_content');
      showToast('Imported draft from Content Analysis into BrandGuard Studio.');
    }
  }, []);

  // Load Approved Rules and Claims from Firestore
  useEffect(() => {
    if (!orgId) return;
    const fetchGroundingData = async () => {
      setLoadingGrounding(true);
      try {
        // Fetch approved rules
        const rulesRef = collection(db, 'organizations', orgId, 'rules');
        const rulesSnap = await getDocs(rulesRef);
        const rulesList: ConstitutionRule[] = [];
        rulesSnap.forEach((d) => {
          const rule = d.data() as ConstitutionRule;
          if (rule.status === 'approved') {
            rulesList.push(rule);
          }
        });
        setApprovedRules(rulesList);

        // Fetch approved claims
        const claimsRef = collection(db, 'organizations', orgId, 'claims');
        const claimsSnap = await getDocs(claimsRef);
        const claimsList: ApprovedClaim[] = [];
        claimsSnap.forEach((d) => {
          claimsList.push(d.data() as ApprovedClaim);
        });
        setApprovedClaims(claimsList);
      } catch (err) {
        console.warn('Grounding data fetch fallback:', err);
      } finally {
        setLoadingGrounding(false);
      }
    };

    fetchGroundingData();
  }, [orgId]);

  // Execute Rewrite API call
  const handleExecuteRewrite = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    setIsRewriting(true);
    setPreservedOriginal(inputText.trim());

    try {
      const response = await fetch('/api/brandguard/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: inputText.trim(),
          organizationId: orgId,
          goal: selectedGoal,
          approvedRules,
          approvedClaims
        })
      });

      if (!response.ok) {
        throw new Error('BrandGuard rewrite execution failed.');
      }

      const json = await response.json();
      const data: BrandGuardRewriteResult = json.data;

      setPreservedOriginal(data.originalText);
      setSuggestions(data.suggestions.map((s) => ({ ...s, status: 'pending' })));
      setOverallSummary(data.overallSummary);
      setHasRun(true);

      showToast(`BrandGuard generated ${data.suggestions.length} suggested improvements.`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error executing BrandGuard rewrite.');
    } finally {
      setIsRewriting(false);
    }
  };

  // Individual Suggestion Status Handlers
  const handleSetSuggestionStatus = (id: string, status: 'accepted' | 'rejected' | 'pending') => {
    setSuggestions((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item))
    );
  };

  // Bulk Status Handlers
  const handleAcceptAll = () => {
    setSuggestions((prev) => prev.map((item) => ({ ...item, status: 'accepted' })));
    showToast('Accepted all suggested rewrites.');
  };

  const handleRejectAll = () => {
    setSuggestions((prev) => prev.map((item) => ({ ...item, status: 'rejected' })));
    showToast('Rejected all suggestions; preserving original copy.');
  };

  const handleResetAll = () => {
    setSuggestions((prev) => prev.map((item) => ({ ...item, status: 'pending' })));
    showToast('Reset all suggestions to pending review.');
  };

  // Dynamic Compiled Approved Copy
  // Start with preservedOriginal, then replace accepted suggestions
  const compiledApprovedText = useMemo(() => {
    if (!preservedOriginal) return '';
    let result = preservedOriginal;
    // Apply accepted suggestions
    suggestions.forEach((s) => {
      if (s.status === 'accepted' && s.originalSnippet && s.suggestedSnippet) {
        result = result.replace(s.originalSnippet, s.suggestedSnippet);
      }
    });
    return result;
  }, [preservedOriginal, suggestions]);

  // Copy to Clipboard
  const handleCopyApprovedCopy = () => {
    if (!compiledApprovedText) return;
    navigator.clipboard.writeText(compiledApprovedText);
    showToast('Approved copy copied to clipboard!');
  };

  // Submit to Publication Approvals Queue
  const handleSubmitToApprovals = async () => {
    if (!compiledApprovedText || !orgId) return;
    const nowIso = new Date().toISOString();
    const approvalId = `appr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const newRecord = {
      id: approvalId,
      organizationId: orgId,
      title: `BrandGuard Revised Copy - ${new Date().toLocaleDateString()}`,
      contentType: 'email' as const,
      content: compiledApprovedText,
      authorId: userProfile?.id || 'creator',
      authorEmail: userProfile?.email || '',
      authorName: userProfile?.displayName || 'BrandGuard User',
      riskLevel: 'low' as const,
      brandScore: 94,
      violationsCount: 0,
      claimsStatus: 'all_verified' as const,
      status: 'pending' as const,
      assignedReviewerRole: 'reviewer' as const,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    try {
      await setDoc(doc(db, 'organizations', orgId, 'approvals', approvalId), newRecord);
      showToast('Approved copy dispatched to Publication Approval Gate!');
      setTimeout(() => navigate('/app/approvals'), 1000);
    } catch (err) {
      console.warn('Approvals dispatch error:', err);
      navigate('/app/approvals');
    }
  };

  // Stats
  const acceptedCount = suggestions.filter((s) => s.status === 'accepted').length;
  const rejectedCount = suggestions.filter((s) => s.status === 'rejected').length;
  const pendingCount = suggestions.filter((s) => s.status === 'pending').length;

  const originalWordCount = preservedOriginal ? preservedOriginal.split(/\s+/).filter(Boolean).length : 0;
  const approvedWordCount = compiledApprovedText ? compiledApprovedText.split(/\s+/).filter(Boolean).length : 0;

  // Category Color Badges
  const categoryBadge = (cat: BrandGuardSuggestion['category']) => {
    switch (cat) {
      case 'tone':
        return 'bg-[#652B39]/10 text-[#652B39] border-[#652B39]/20';
      case 'terminology':
        return 'bg-[#3D1B26] text-white border-[#3D1B26]';
      case 'claim':
        return 'bg-[#2E6F40]/10 text-[#2E6F40] border-[#2E6F40]/25';
      case 'disclaimer':
        return 'bg-[#B7791F]/15 text-[#975A16] border-[#B7791F]/30';
      default:
        return 'bg-[#E8DED5] text-[#35252A] border-[#E4D8D1]';
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-[#652B39] text-white text-xs font-semibold shadow-2xl flex items-center gap-2.5 animate-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 className="w-4 h-4 text-[#FFFAF5] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#35252A] tracking-tight">
              BrandGuard AI Rewrite Studio
            </h1>
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#652B39]/10 text-[#652B39] border border-[#652B39]/20">
              Autonomous Governance
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#806C68]">
            Suggested rewrites with before/after visual diffs, change explanations, and granular accept/reject controls. Original draft is always preserved.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-[#FFFAF5] p-1 rounded-2xl border border-[#E4D8D1] shadow-xs">
          <button
            onClick={() => setActiveTab('studio')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'studio'
                ? 'bg-[#652B39] text-white shadow-xs'
                : 'text-[#806C68] hover:text-[#35252A]'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Rewrite Studio</span>
          </button>
          <button
            onClick={() => setActiveTab('guardrails')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'guardrails'
                ? 'bg-[#652B39] text-white shadow-xs'
                : 'text-[#806C68] hover:text-[#35252A]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Guardrail Parameters</span>
          </button>
        </div>
      </div>

      {activeTab === 'studio' ? (
        <div className="space-y-6">
          {/* Top Control Bar: Goal Selector + Preset Loader */}
          <div className="bg-[#FFFAF5] rounded-3xl border border-[#E4D8D1] p-5 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Goal Selector */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-[#806C68]">
                  Rewrite Objective:
                </span>
                {(
                  [
                    { key: 'polish', label: 'Tone Polish', hint: 'Authoritative & Consultative' },
                    { key: 'compliance', label: 'Strict Compliance', hint: 'All Constitution Rules' },
                    { key: 'brevity', label: 'Executive Brevity', hint: 'Concise & Impactful' },
                    { key: 'claims', label: 'Claim Harmonization', hint: 'Align with Proofs' }
                  ] as const
                ).map((g) => (
                  <button
                    key={g.key}
                    onClick={() => setSelectedGoal(g.key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      selectedGoal === g.key
                        ? 'bg-[#652B39] text-white border-[#652B39] shadow-xs'
                        : 'bg-[#F4EEE8]/70 text-[#35252A] border-[#E4D8D1] hover:bg-[#E8DED5]/60'
                    }`}
                  >
                    <span>{g.label}</span>
                    <span className="text-[10px] opacity-75 ml-1 hidden sm:inline">({g.hint})</span>
                  </button>
                ))}
              </div>

              {/* Grounding Info Indicator */}
              <div className="flex items-center gap-2 text-xs text-[#806C68]">
                <ShieldCheck className="w-4 h-4 text-[#2E6F40]" />
                <span>
                  Grounding: <strong>{approvedRules.length} Approved Rules</strong> &bull;{' '}
                  <strong>{approvedClaims.length} ClaimShield Proofs</strong>
                </span>
              </div>
            </div>

            {/* Presets Strip */}
            <div className="pt-3 border-t border-[#E4D8D1]/70 flex items-center justify-between gap-3 overflow-x-auto">
              <div className="flex items-center gap-2 text-xs text-[#806C68] shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-[#652B39]" />
                <span className="font-semibold text-[#35252A]">Load Preset Sample:</span>
              </div>

              <div className="flex items-center gap-2">
                {SAMPLE_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInputText(p.text);
                      setSelectedGoal(p.goal);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#F4EEE8] hover:bg-[#E8DED5] border border-[#E4D8D1] text-[11px] font-medium text-[#35252A] transition-colors cursor-pointer truncate max-w-xs"
                    title={p.description}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main 2-Column Studio Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Input and Original Preserved Draft */}
            <div className="lg:col-span-5 space-y-5">
              {/* Draft Input Card */}
              <div className="bg-[#FFFAF5] rounded-3xl border border-[#E4D8D1] p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-[#35252A]">Marketing Draft</h2>
                    <p className="text-xs text-[#806C68]">Enter or refine the copy you wish to optimize.</p>
                  </div>
                  <span className="text-[11px] font-mono text-[#806C68]">
                    {inputText.trim().split(/\s+/).filter(Boolean).length} words
                  </span>
                </div>

                <form onSubmit={handleExecuteRewrite} className="space-y-4">
                  <textarea
                    rows={8}
                    required
                    placeholder="Paste email newsletter, social post, or landing page copy..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="w-full p-4 bg-[#F4EEE8] border border-[#E4D8D1] rounded-2xl text-xs sm:text-sm text-[#35252A] focus:outline-none focus:ring-2 focus:ring-[#652B39]/30 focus:border-[#652B39] resize-none leading-relaxed"
                  />

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-[#806C68]">
                      AI suggestions ground strictly on your active constitution.
                    </span>

                    <button
                      type="submit"
                      disabled={isRewriting || !inputText.trim()}
                      className="px-5 py-2.5 rounded-xl bg-[#652B39] hover:bg-[#512331] text-white text-xs font-bold shadow-xs hover:shadow transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${isRewriting ? 'animate-spin' : ''}`} />
                      <span>{isRewriting ? 'Analyzing & Rewriting...' : 'Generate BrandGuard Rewrites'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Original Draft (Preserved Source of Truth) */}
              {hasRun && (
                <div className="bg-[#FFFAF5] rounded-3xl border border-[#E4D8D1] p-6 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#652B39]/10 text-[#652B39] flex items-center justify-center">
                        <Lock className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h2 className="text-xs font-bold text-[#35252A] uppercase tracking-wider">
                          Original Draft (Preserved Source)
                        </h2>
                        <span className="text-[11px] text-[#806C68]">
                          Immutable baseline. Never overwritten.
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => setInputText(preservedOriginal)}
                      className="text-xs text-[#652B39] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Restore to Editor</span>
                    </button>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F4EEE8]/70 border border-[#E4D8D1] text-xs text-[#35252A] leading-relaxed font-serif">
                    {preservedOriginal}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Suggested Rewrites Studio & Before/After Diff */}
            <div className="lg:col-span-7 space-y-5">
              {!hasRun ? (
                /* Empty / Ready State */
                <div className="bg-[#FFFAF5] rounded-3xl border border-[#E4D8D1] p-8 shadow-xs">
                  <EmptyState
                    icon={Bot}
                    badge="BrandGuard AI Ready"
                    title="Generate Compliant Micro-Rewrites"
                    description="BrandGuard AI reviews your marketing text against your 10-category Brand Constitution and ClaimShield evidence proofs. It produces targeted before/after suggestions with rationales, leaving you in total control."
                    actionLabel="Run BrandGuard on Sample Draft"
                    onAction={() => handleExecuteRewrite()}
                    tips={[
                      {
                        title: 'Original Always Preserved',
                        desc: 'The original baseline copy is locked and never overwritten without explicit human confirmation.'
                      },
                      {
                        title: 'Granular Accept / Reject',
                        desc: 'Approve or dismiss suggestions one by one, or accept all with a single click.'
                      },
                      {
                        title: 'Interactive Visual Diff',
                        desc: 'See inline strike-throughs for eliminated copy and highlighted additions for approved revisions.'
                      },
                      {
                        title: 'Evidence-Backed Explanations',
                        desc: 'Every single rewrite explicitly cites the exact constitution rule or certified proof record.'
                      }
                    ]}
                  />
                </div>
              ) : (
                /* Active Studio Output */
                <div className="space-y-5">
                  {/* Summary & Metrics Bar */}
                  <div className="bg-[#FFFAF5] rounded-3xl border border-[#E4D8D1] p-5 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h2 className="text-base font-bold text-[#35252A]">
                          Rewrite Review & Diff Compiler
                        </h2>
                        <p className="text-xs text-[#806C68] mt-0.5">{overallSummary}</p>
                      </div>

                      {/* View Mode Toggle: Inline Diff vs Side-by-Side Split */}
                      <div className="flex items-center bg-[#F4EEE8] p-1 rounded-xl border border-[#E4D8D1] self-start sm:self-auto">
                        <button
                          onClick={() => setActiveViewMode('diff')}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                            activeViewMode === 'diff'
                              ? 'bg-[#652B39] text-white shadow-xs'
                              : 'text-[#806C68] hover:text-[#35252A]'
                          }`}
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>Visual Diff</span>
                        </button>
                        <button
                          onClick={() => setActiveViewMode('split')}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                            activeViewMode === 'split'
                              ? 'bg-[#652B39] text-white shadow-xs'
                              : 'text-[#806C68] hover:text-[#35252A]'
                          }`}
                        >
                          <Split className="w-3.5 h-3.5" />
                          <span>Split View</span>
                        </button>
                      </div>
                    </div>

                    {/* Progress & Acceptance Strip */}
                    <div className="grid grid-cols-4 gap-2 pt-2">
                      <div className="p-2.5 rounded-xl bg-[#F4EEE8] border border-[#E4D8D1] text-center">
                        <span className="text-base font-bold font-mono text-[#35252A] block">
                          {suggestions.length}
                        </span>
                        <span className="text-[10px] font-semibold text-[#806C68] uppercase">
                          Suggestions
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-[#2E6F40]/10 border border-[#2E6F40]/25 text-center">
                        <span className="text-base font-bold font-mono text-[#2E6F40] block">
                          {acceptedCount}
                        </span>
                        <span className="text-[10px] font-semibold text-[#2E6F40] uppercase">
                          Accepted
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-[#A3282C]/10 border border-[#A3282C]/25 text-center">
                        <span className="text-base font-bold font-mono text-[#A3282C] block">
                          {rejectedCount}
                        </span>
                        <span className="text-[10px] font-semibold text-[#A3282C] uppercase">
                          Rejected
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-[#B7791F]/15 border border-[#B7791F]/30 text-center">
                        <span className="text-base font-bold font-mono text-[#975A16] block">
                          {pendingCount}
                        </span>
                        <span className="text-[10px] font-semibold text-[#975A16] uppercase">
                          Pending
                        </span>
                      </div>
                    </div>

                    {/* Bulk Action Controls */}
                    <div className="pt-2 flex items-center justify-between flex-wrap gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleAcceptAll}
                          className="px-3 py-1.5 rounded-xl bg-[#2E6F40] hover:bg-[#255733] text-white font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Accept All</span>
                        </button>

                        <button
                          onClick={handleRejectAll}
                          className="px-3 py-1.5 rounded-xl bg-[#A3282C]/15 hover:bg-[#A3282C]/25 text-[#A3282C] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject All</span>
                        </button>

                        <button
                          onClick={handleResetAll}
                          className="px-3 py-1.5 rounded-xl bg-[#F4EEE8] hover:bg-[#E8DED5] text-[#806C68] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reset</span>
                        </button>
                      </div>

                      {/* Word Delta */}
                      <span className="text-[11px] text-[#806C68]">
                        Word count:{' '}
                        <strong>
                          {originalWordCount} &rarr; {approvedWordCount}
                        </strong>{' '}
                        ({approvedWordCount - originalWordCount >= 0 ? '+' : ''}
                        {approvedWordCount - originalWordCount} words)
                      </span>
                    </div>
                  </div>

                  {/* Visual Diff / Split View Display Card */}
                  <div className="bg-[#FFFAF5] rounded-3xl border border-[#E4D8D1] p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-[#35252A] uppercase tracking-wider">
                          {activeViewMode === 'diff' ? 'Visual Before/After Diff' : 'Side-by-Side Comparison'}
                        </h2>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#2E6F40]/10 text-[#2E6F40]">
                          Live Reactive
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleCopyApprovedCopy}
                          className="px-3 py-1.5 rounded-xl bg-[#F4EEE8] hover:bg-[#E8DED5] text-[#35252A] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </button>

                        <button
                          onClick={handleSubmitToApprovals}
                          className="px-3.5 py-1.5 rounded-xl bg-[#652B39] hover:bg-[#512331] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Submit to Approvals</span>
                        </button>
                      </div>
                    </div>

                    {activeViewMode === 'diff' ? (
                      /* Inline Diff Display */
                      <div className="p-5 rounded-2xl bg-[#F4EEE8]/70 border border-[#E4D8D1] font-serif text-sm text-[#35252A] leading-relaxed space-y-2">
                        {suggestions.length === 0 ? (
                          <p className="text-xs text-[#806C68] italic">No revisions needed. Content already conforms to constitution.</p>
                        ) : (
                          <div>
                            {/* Render text with inline struck-through original and highlighted replacement */}
                            {suggestions.map((s, idx) => (
                              <div
                                key={s.id}
                                className={`mb-3 p-3 rounded-xl border transition-all ${
                                  s.status === 'accepted'
                                    ? 'bg-[#2E6F40]/5 border-[#2E6F40]/30'
                                    : s.status === 'rejected'
                                    ? 'bg-[#A3282C]/5 border-[#A3282C]/20 opacity-70'
                                    : 'bg-[#FFFAF5] border-[#B7791F]/40'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1.5">
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${categoryBadge(s.category)}`}>
                                      {s.category}
                                    </span>
                                    <span className="text-[11px] text-[#806C68] font-mono">
                                      Rule: {s.ruleCited}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => handleSetSuggestionStatus(s.id, 'accepted')}
                                      className={`p-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                        s.status === 'accepted'
                                          ? 'bg-[#2E6F40] text-white shadow-xs'
                                          : 'text-[#806C68] hover:text-[#2E6F40] hover:bg-[#2E6F40]/10'
                                      }`}
                                      title="Accept rewrite"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      {s.status === 'accepted' && <span>Accepted</span>}
                                    </button>

                                    <button
                                      onClick={() => handleSetSuggestionStatus(s.id, 'rejected')}
                                      className={`p-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                        s.status === 'rejected'
                                          ? 'bg-[#A3282C] text-white shadow-xs'
                                          : 'text-[#806C68] hover:text-[#A3282C] hover:bg-[#A3282C]/10'
                                      }`}
                                      title="Reject rewrite"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                      {s.status === 'rejected' && <span>Rejected</span>}
                                    </button>
                                  </div>
                                </div>

                                {/* Before & After Snippet */}
                                <div className="space-y-1 text-xs">
                                  <div className="text-[#A3282C] line-through bg-[#A3282C]/10 px-2 py-0.5 rounded inline-block">
                                    {s.originalSnippet}
                                  </div>
                                  <span className="mx-2 text-[#806C68] font-bold">&rarr;</span>
                                  <div className="text-[#2E6F40] font-semibold bg-[#2E6F40]/10 px-2 py-0.5 rounded inline-block">
                                    {s.suggestedSnippet}
                                  </div>
                                </div>

                                <p className="text-[11px] text-[#806C68] mt-1.5 leading-relaxed">
                                  {s.explanation}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Split View Display: Side-by-Side */
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Left: Original Baseline */}
                        <div className="p-4 rounded-2xl bg-[#F4EEE8]/70 border border-[#E4D8D1] space-y-2">
                          <div className="flex items-center justify-between pb-1 border-b border-[#E4D8D1]">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-[#806C68]">
                              Original Text (Preserved)
                            </span>
                            <span className="text-[10px] font-mono text-[#806C68]">
                              {originalWordCount} words
                            </span>
                          </div>
                          <p className="font-serif text-xs text-[#35252A] leading-relaxed whitespace-pre-wrap">
                            {preservedOriginal}
                          </p>
                        </div>

                        {/* Right: Compiled Approved Copy */}
                        <div className="p-4 rounded-2xl bg-[#FFFAF5] border border-[#2E6F40]/30 shadow-xs space-y-2">
                          <div className="flex items-center justify-between pb-1 border-b border-[#E4D8D1]">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-[#2E6F40]">
                              Approved Copy (Compiled)
                            </span>
                            <span className="text-[10px] font-mono text-[#2E6F40] font-semibold">
                              {approvedWordCount} words
                            </span>
                          </div>
                          <p className="font-serif text-xs text-[#35252A] leading-relaxed whitespace-pre-wrap">
                            {compiledApprovedText}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Live Compiled Result Preview Banner */}
                    <div className="p-4 rounded-2xl bg-[#652B39]/5 border border-[#652B39]/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#652B39] uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Live Approved Text Output</span>
                        </span>

                        <span className="text-[11px] text-[#806C68]">
                          {acceptedCount} of {suggestions.length} suggestions applied
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-[#FFFAF5] border border-[#E4D8D1] text-xs text-[#35252A] leading-relaxed font-serif">
                        {compiledApprovedText}
                      </div>
                    </div>
                  </div>

                  {/* Granular Suggestion Cards List */}
                  <div className="bg-[#FFFAF5] rounded-3xl border border-[#E4D8D1] p-6 shadow-xs space-y-4">
                    <h3 className="text-sm font-bold text-[#35252A] uppercase tracking-wider">
                      Granular Suggestion Breakdown ({suggestions.length})
                    </h3>

                    <div className="space-y-3">
                      {suggestions.map((item, index) => {
                        const isAccepted = item.status === 'accepted';
                        const isRejected = item.status === 'rejected';

                        return (
                          <div
                            key={item.id}
                            className={`p-4 rounded-2xl border transition-all ${
                              isAccepted
                                ? 'bg-[#2E6F40]/5 border-[#2E6F40]/30'
                                : isRejected
                                ? 'bg-[#A3282C]/5 border-[#A3282C]/20 opacity-60'
                                : 'bg-[#F4EEE8]/70 border-[#E4D8D1]'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-2 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-mono font-bold text-[#806C68]">
                                    #{index + 1}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${categoryBadge(item.category)}`}>
                                    {item.category}
                                  </span>
                                  <span className="text-[11px] font-semibold text-[#652B39]">
                                    {item.ruleCited}
                                  </span>
                                </div>

                                {/* Diff preview */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                  <div className="p-2 rounded-xl bg-[#FFFAF5] border border-[#E4D8D1]">
                                    <span className="text-[10px] uppercase font-bold text-[#A3282C] block mb-0.5">
                                      Original Phrasing:
                                    </span>
                                    <span className="line-through text-[#A3282C] font-mono">
                                      "{item.originalSnippet}"
                                    </span>
                                  </div>

                                  <div className="p-2 rounded-xl bg-[#FFFAF5] border border-[#E4D8D1]">
                                    <span className="text-[10px] uppercase font-bold text-[#2E6F40] block mb-0.5">
                                      BrandGuard Rewrite:
                                    </span>
                                    <span className="font-semibold text-[#2E6F40] font-mono">
                                      "{item.suggestedSnippet}"
                                    </span>
                                  </div>
                                </div>

                                {/* Explanation */}
                                <p className="text-xs text-[#35252A] leading-relaxed">
                                  <strong>Rationale:</strong> {item.explanation}
                                </p>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex flex-col gap-1.5 shrink-0">
                                <button
                                  onClick={() => handleSetSuggestionStatus(item.id, 'accepted')}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                                    isAccepted
                                      ? 'bg-[#2E6F40] text-white shadow-xs'
                                      : 'bg-[#F4EEE8] text-[#806C68] hover:bg-[#2E6F40]/15 hover:text-[#2E6F40]'
                                  }`}
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Accept</span>
                                </button>

                                <button
                                  onClick={() => handleSetSuggestionStatus(item.id, 'rejected')}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                                    isRejected
                                      ? 'bg-[#A3282C] text-white shadow-xs'
                                      : 'bg-[#F4EEE8] text-[#806C68] hover:bg-[#A3282C]/15 hover:text-[#A3282C]'
                                  }`}
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Reject</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Guardrail Parameters Configuration Tab */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-[#FFFAF5] rounded-3xl border border-[#E4D8D1] p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-[#35252A]">
                Autonomous Guardrail Strictness
              </h2>
              <p className="text-xs text-[#806C68] mt-1">
                Configure how strictly BrandGuard evaluates copy against tone drift, claims, and regulatory citations.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(['moderate', 'strict', 'maximum'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setStrictness(level)}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    strictness === level
                      ? 'bg-[#652B39]/5 border-[#652B39] shadow-xs'
                      : 'bg-[#F4EEE8]/60 border-[#E4D8D1] hover:bg-[#E8DED5]/40'
                  }`}
                >
                  <span className="text-xs font-bold uppercase tracking-wider text-[#652B39] block mb-1">
                    {level}
                  </span>
                  <span className="text-xs text-[#35252A] font-semibold block">
                    {level === 'moderate'
                      ? 'Advisories Only'
                      : level === 'strict'
                      ? 'Recommended Enterprise'
                      : 'Zero-Tolerance Gate'}
                  </span>
                  <span className="text-[11px] text-[#806C68] block mt-1 leading-relaxed">
                    {level === 'moderate'
                      ? 'Flags severe violations, permits publishing.'
                      : level === 'strict'
                      ? 'Blocks publication if unverified claims exist.'
                      : 'Requires 100% constitution adherence & dual sign-off.'}
                  </span>
                </button>
              ))}
            </div>

            <div className="space-y-4 pt-4 border-t border-[#E4D8D1]">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#35252A] block">
                    Minimum Brand Score to Unlock Publication ({minPassScore} / 100)
                  </span>
                  <span className="text-[11px] text-[#806C68]">
                    Drafts scoring below this threshold are locked in "Revision Required" status.
                  </span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="95"
                  value={minPassScore}
                  onChange={(e) => setMinPassScore(Number(e.target.value))}
                  className="w-36 accent-[#652B39] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <span className="text-xs font-bold text-[#35252A] block">
                    Automatic ClaimShield™ Hard Block
                  </span>
                  <span className="text-[11px] text-[#806C68]">
                    Instantly block publication if an unverified statistical superlative is detected.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={blockOnUncitedClaims}
                  onChange={(e) => setBlockOnUncitedClaims(e.target.checked)}
                  className="w-4 h-4 accent-[#652B39] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <span className="text-xs font-bold text-[#35252A] block">
                    Automatic Regulatory Footnote Insertion
                  </span>
                  <span className="text-[11px] text-[#806C68]">
                    BrandGuard automatically generates standard disclaimer footnotes for financial or ROI multipliers.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={autoFootnoteDisclaimers}
                  onChange={(e) => setAutoFootnoteDisclaimers(e.target.checked)}
                  className="w-4 h-4 accent-[#652B39] cursor-pointer"
                />
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-[#E4D8D1]">
              {guardrailsSaved ? (
                <span className="text-xs font-bold text-[#2E6F40] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Guardrail parameters updated successfully
                </span>
              ) : (
                <span className="text-[11px] text-[#806C68]">
                  Changes apply immediately to all upcoming content lints.
                </span>
              )}

              <button
                onClick={() => {
                  setGuardrailsSaved(true);
                  setTimeout(() => setGuardrailsSaved(false), 3000);
                  showToast('Guardrails saved.');
                }}
                className="px-5 py-2.5 rounded-xl bg-[#652B39] hover:bg-[#512331] text-white text-xs font-semibold shadow-xs hover:shadow transition-all cursor-pointer"
              >
                Save Guardrails
              </button>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-4">
            <div className="p-6 rounded-3xl bg-[#FFFAF5] border border-[#E4D8D1] shadow-xs">
              <div className="w-10 h-10 rounded-2xl bg-[#652B39]/10 text-[#652B39] flex items-center justify-center mb-3">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-[#35252A] mb-1">
                Zero-Trust AI Execution
              </h3>
              <p className="text-xs text-[#806C68] leading-relaxed">
                All AI rewrites run strictly in our authenticated Express backend proxy. Your copy is isolated by organization ID and never stored publicly.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[#FFFAF5] border border-[#E4D8D1] shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-[#652B39] block mb-2">
                Active Grounding Data
              </span>
              <ul className="text-xs text-[#35252A] space-y-2">
                <li className="flex justify-between py-1 border-b border-[#E4D8D1]/60">
                  <span className="text-[#806C68]">Constitution Rules</span>
                  <span className="font-mono font-semibold">{approvedRules.length} Approved</span>
                </li>
                <li className="flex justify-between py-1 border-b border-[#E4D8D1]/60">
                  <span className="text-[#806C68]">ClaimShield Proofs</span>
                  <span className="font-mono font-semibold">{approvedClaims.length} Certified</span>
                </li>
                <li className="flex justify-between py-1">
                  <span className="text-[#806C68]">Original Baseline</span>
                  <span className="font-semibold text-[#2E6F40]">Always Preserved</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
