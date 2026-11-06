import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  query,
  orderBy
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import {
  ContentType,
  RiskLevel,
  ViolationSeverity,
  AnalysisViolation,
  ContentAnalysisRecord
} from '../types/analysis';
import { ConstitutionRule } from '../types/constitution';
import {
  FileSearch,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  AlertCircle,
  ShieldCheck,
  Send,
  History,
  ArrowRight,
  Filter,
  Check,
  Copy,
  ChevronRight,
  ExternalLink,
  BookOpen,
  Sliders,
  Type,
  FileText,
  Bot
} from 'lucide-react';
import { EmptyState } from '../components/common/EmptyState';

export const AnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentOrg, userProfile } = useAuth();
  const orgId = currentOrg?.id || '';

  // Mode: 'new' (inspecting or viewing active draft) vs 'history' (viewing past audits)
  const [activeTab, setActiveTab] = useState<'editor' | 'history'>('editor');

  // Form State
  const [title, setTitle] = useState('');
  const [contentType, setContentType] = useState<ContentType>('caption');
  const [content, setContent] = useState('');
  const [customCharLimit, setCustomCharLimit] = useState<number | undefined>(undefined);

  // Approved rules from organization constitution
  const [approvedRules, setApprovedRules] = useState<ConstitutionRule[]>([]);
  const [analysesHistory, setAnalysesHistory] = useState<ContentAnalysisRecord[]>([]);

  // Execution states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentResult, setCurrentResult] = useState<ContentAnalysisRecord | null>(null);
  const [selectedSeverityFilter, setSelectedSeverityFilter] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sample Presets for Fast Testing
  const samplePresets: Array<{
    label: string;
    type: ContentType;
    title: string;
    text: string;
  }> = [
    {
      label: 'Fintech Promo (Missing Disclaimer)',
      type: 'ad',
      title: 'Q4 High-Yield Enterprise Treasury Campaign',
      text: 'Our #1 platform is 100% guaranteed to deliver 10x ROI for enterprise treasuries. Deploy this cheap and budget-friendly solution today. Act now before promotional rates expire!'
    },
    {
      label: 'SaaS Launch Email (Off-Brand Urgency)',
      type: 'email',
      title: 'Product Launch Announcement Email',
      text: 'Urgent notice! Buy now before seats sell out. Our customer support team is ready to help you save 50% with zero risk. Do not let system glitches hold your marketing back.'
    },
    {
      label: 'Compliant Enterprise Blog',
      type: 'blog',
      title: 'Modern Brand Governance Frameworks',
      text: 'Enterprise marketing organizations face significant reputational risk when unvetted copy goes live. BrandLint provides automated pre-publication linting to substantiate claim citations, verify tone attributes, and enforce mandatory compliance footnotes.\n\n*Results based on internal customer benchmark audits; individual performance varies by publication volume.'
    }
  ];

  // Default character limits by type
  const defaultLimits: Record<ContentType, number> = {
    caption: 280,
    ad: 150,
    email: 3000,
    blog: 15000
  };

  const activeCharLimit = customCharLimit || defaultLimits[contentType];
  const charCount = content.length;
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const isOverLimit = charCount > activeCharLimit;

  // Fetch approved rules and past analyses from Firestore
  const loadData = useCallback(async () => {
    if (!orgId) return;
    try {
      // 1. Fetch Approved Rules
      const rulesRef = collection(db, 'organizations', orgId, 'rules');
      const rulesSnap = await getDocs(rulesRef);
      const loaded: ConstitutionRule[] = [];
      rulesSnap.forEach((doc) => {
        const r = doc.data() as ConstitutionRule;
        if (r.status === 'approved') {
          loaded.push(r);
        }
      });
      setApprovedRules(loaded);

      // 2. Fetch Past Analyses
      const ansRef = collection(db, 'organizations', orgId, 'analyses');
      const ansSnap = await getDocs(ansRef);
      const loadedAns: ContentAnalysisRecord[] = [];
      ansSnap.forEach((doc) => {
        loadedAns.push(doc.data() as ContentAnalysisRecord);
      });
      loadedAns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAnalysesHistory(loadedAns);
    } catch (err) {
      console.warn('Firestore load fallback:', err);
    }
  }, [orgId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Execute Inspection Pipeline
  const handleRunInspection = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!content.trim() || !orgId) return;

    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/analysis/inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: orgId,
          authorId: userProfile?.id || 'anonymous_user',
          authorEmail: userProfile?.email || '',
          title: title.trim() || `${contentType.toUpperCase()} Draft - ${new Date().toLocaleDateString()}`,
          contentType,
          content: content.trim(),
          characterLimit: customCharLimit,
          approvedRules: approvedRules.map(r => ({
            id: r.id,
            title: r.title,
            category: r.category,
            ruleText: r.ruleText
          }))
        })
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || 'Inspection failed on server.');
      }

      const json = await response.json();
      const record: ContentAnalysisRecord = json.data;

      // Save record to Firestore under tenant collection
      try {
        await setDoc(doc(db, 'organizations', orgId, 'analyses', record.id), record);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `organizations/${orgId}/analyses/${record.id}`);
      }

      setCurrentResult(record);
      setAnalysesHistory(prev => [record, ...prev]);
      showToast(`Analysis complete! Brand Score: ${record.score}/100 (${record.riskLevel.toUpperCase()} RISK)`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error conducting analysis.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 1-Click Fix Application
  const handleApplyFix = (violation: AnalysisViolation) => {
    if (!violation.recommendedFix) return;

    let updatedContent = content;
    // Extract cleaner replacement phrase if fix is wrapped in quotes
    const quoteMatch = violation.recommendedFix.match(/"([^"]+)"/);
    const replacement = quoteMatch ? quoteMatch[1] : violation.recommendedFix;

    if (violation.type === 'disclaimer') {
      // Append disclaimer if missing
      if (!updatedContent.includes('*')) {
        updatedContent = `${updatedContent.trim()}\n\n*Based on customer benchmark data; actual results depend on operational volume.`;
      }
    } else if (violation.evidenceQuote && updatedContent.includes(violation.evidenceQuote)) {
      // Replace sentence or phrase
      updatedContent = updatedContent.replace(violation.evidenceQuote, replacement);
    }

    setContent(updatedContent);
    showToast('Applied recommended correction to draft content.');
  };

  // Submit to Publication Approval Queue
  const handleSubmitToApproval = async () => {
    if (!currentResult || !orgId) return;
    const nowIso = new Date().toISOString();
    const approvalId = `appr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const assignedRole = currentResult.riskLevel === 'high' || currentResult.riskLevel === 'critical' ? 'org_admin' : 'reviewer';

    const newRecord = {
      id: approvalId,
      organizationId: orgId,
      analysisId: currentResult.id,
      title: currentResult.title,
      contentType: currentResult.contentType,
      content: currentResult.content,
      authorId: userProfile?.id || currentResult.authorId,
      authorEmail: userProfile?.email || currentResult.authorEmail,
      authorName: userProfile?.displayName || 'Author',
      riskLevel: currentResult.riskLevel,
      brandScore: currentResult.score,
      violationsCount: currentResult.violationCount,
      claimsStatus: currentResult.violations.some(v => v.type === 'claim') ? 'contains_unsupported' as const : 'all_verified' as const,
      status: 'pending' as const,
      assignedReviewerRole: assignedRole as 'org_admin' | 'reviewer',
      createdAt: nowIso,
      updatedAt: nowIso
    };

    try {
      await setDoc(doc(db, 'organizations', orgId, 'approvals', approvalId), newRecord);
      showToast('Draft submitted to Publication Approval Queue!');
      setTimeout(() => navigate('/app/approvals'), 1000);
    } catch (err) {
      console.warn('Approvals submission fallback:', err);
      navigate('/app/approvals');
    }
  };

  // Filtered Violations in Current Result
  const filteredViolations = useMemo(() => {
    if (!currentResult) return [];
    if (selectedSeverityFilter === 'all') return currentResult.violations;
    return currentResult.violations.filter(v => v.severity === selectedSeverityFilter);
  }, [currentResult, selectedSeverityFilter]);

  // Risk styling helpers
  const riskBadgeStyles: Record<RiskLevel, { text: string; bg: string; border: string }> = {
    low: { text: 'text-[#2E6F40]', bg: 'bg-[#2E6F40]/10', border: 'border-[#2E6F40]/20' },
    medium: { text: 'text-[#B7791F]', bg: 'bg-[#B7791F]/10', border: 'border-[#B7791F]/20' },
    high: { text: 'text-[#A3282C]', bg: 'bg-[#A3282C]/10', border: 'border-[#A3282C]/20' },
    critical: { text: 'text-[#3D1B26]', bg: 'bg-[#652B39]/20', border: 'border-[#652B39]/40' }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
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
              Content Analysis & Linter
            </h1>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#652B39]/10 text-[#652B39]">
              Deterministic & Gemini Engine
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#806C68]">
            Pre-publication governance for <strong className="text-[#35252A]">{currentOrg?.name}</strong>. Inspect draft copy against {approvedRules.length} approved brand rules.
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2 border border-[#E4D8D1] rounded-xl p-1 bg-[#FFFAF5] self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('editor')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'editor'
                ? 'bg-[#652B39] text-white shadow-xs'
                : 'text-[#806C68] hover:text-[#35252A]'
            }`}
          >
            <FileSearch className="w-3.5 h-3.5" />
            <span>Lint Inspector</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-[#652B39] text-white shadow-xs'
                : 'text-[#806C68] hover:text-[#35252A]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Audit History ({analysesHistory.length})</span>
          </button>
        </div>
      </div>

      {activeTab === 'history' ? (
        /* Historical Analyses View */
        <div className="bg-[#FFFAF5] rounded-3xl border border-[#E4D8D1] p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E4D8D1]">
            <div>
              <h3 className="text-base font-bold text-[#35252A]">
                Historical Content Audits for {currentOrg?.name}
              </h3>
              <p className="text-xs text-[#806C68] mt-0.5">
                Every checked publication is stored per organization with full evidence trails and risk scores.
              </p>
            </div>
          </div>

          {analysesHistory.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#806C68]">
              No content analyses on record yet. Use the Lint Inspector to audit your first draft.
            </div>
          ) : (
            <div className="divide-y divide-[#E4D8D1]/60">
              {analysesHistory.map((item) => (
                <div key={item.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#35252A]">{item.title}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-[#E8DED5] text-[#35252A]">
                        {item.contentType}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          riskBadgeStyles[item.riskLevel].bg
                        } ${riskBadgeStyles[item.riskLevel].text}`}
                      >
                        {item.riskLevel} Risk
                      </span>
                    </div>

                    <p className="text-xs text-[#806C68] line-clamp-1 italic">
                      "{item.content}"
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-[#806C68]/80">
                      <span>{item.wordCount} words</span>
                      <span>•</span>
                      <span>{item.violationCount} violations</span>
                      <span>•</span>
                      <span>{new Date(item.createdAt).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-xl font-mono font-extrabold text-[#35252A]">
                        {item.score}
                      </span>
                      <span className="text-[10px] text-[#806C68] block">/ 100 Score</span>
                    </div>

                    <button
                      onClick={() => {
                        setTitle(item.title);
                        setContentType(item.contentType);
                        setContent(item.content);
                        setCurrentResult(item);
                        setActiveTab('editor');
                      }}
                      className="px-3.5 py-2 rounded-xl bg-[#F4EEE8] hover:bg-[#E8DED5] border border-[#E4D8D1] text-xs font-semibold text-[#35252A] transition-colors cursor-pointer"
                    >
                      Re-Inspect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Workspace Editor & Linting Inspector */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Draft Form & Preset Selectors */}
          <div className="lg:col-span-6 bg-[#FFFAF5] rounded-3xl border border-[#E4D8D1] p-6 shadow-xs space-y-5">
            {/* Presets Strip */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#806C68] block mb-2">
                Quick Test Templates
              </span>
              <div className="flex flex-wrap gap-2">
                {samplePresets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setTitle(preset.title);
                      setContentType(preset.type);
                      setContent(preset.text);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#F4EEE8] hover:bg-[#E8DED5]/80 border border-[#E4D8D1] text-xs font-medium text-[#35252A] transition-all cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleRunInspection} className="space-y-4">
              {/* Title & Content Type Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-8">
                  <label className="block text-xs font-bold text-[#35252A] uppercase tracking-wider mb-1.5">
                    Campaign / Content Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Q4 Launch - LinkedIn Copy"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#F4EEE8] border border-[#E4D8D1] rounded-xl text-xs sm:text-sm text-[#35252A] focus:outline-none focus:ring-2 focus:ring-[#652B39]/30 focus:border-[#652B39]"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-xs font-bold text-[#35252A] uppercase tracking-wider mb-1.5">
                    Format
                  </label>
                  <select
                    value={contentType}
                    onChange={(e) => setContentType(e.target.value as ContentType)}
                    className="w-full px-3 py-2 bg-[#F4EEE8] border border-[#E4D8D1] rounded-xl text-xs sm:text-sm text-[#35252A] focus:outline-none focus:ring-2 focus:ring-[#652B39]/30 focus:border-[#652B39]"
                  >
                    <option value="caption">Social Caption (280 chars)</option>
                    <option value="ad">Ad Headline (150 chars)</option>
                    <option value="email">Email Campaign</option>
                    <option value="blog">Blog Article</option>
                  </select>
                </div>
              </div>

              {/* Textarea for Marketing Copy */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-[#35252A] uppercase tracking-wider">
                    Draft Marketing Copy
                  </label>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`${isOverLimit ? 'font-bold text-[#A3282C]' : 'text-[#806C68]'}`}>
                      {charCount} / {activeCharLimit} chars
                    </span>
                    <span className="text-[#806C68]">({wordCount} words)</span>
                  </div>
                </div>

                <textarea
                  rows={8}
                  required
                  placeholder="Paste marketing copy, press release snippet, or ad draft..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className={`w-full p-4 bg-[#F4EEE8] border rounded-2xl text-xs sm:text-sm text-[#35252A] focus:outline-none focus:ring-2 focus:ring-[#652B39]/30 resize-none leading-relaxed transition-all ${
                    isOverLimit ? 'border-[#A3282C]' : 'border-[#E4D8D1] focus:border-[#652B39]'
                  }`}
                />

                {isOverLimit && (
                  <p className="text-[11px] text-[#A3282C] mt-1 flex items-center gap-1 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Exceeds {contentType} character limit by {charCount - activeCharLimit} characters.</span>
                  </p>
                )}
              </div>

              {/* Active Rules Context Footnote */}
              <div className="p-3 rounded-xl bg-[#E8DED5]/40 border border-[#E4D8D1] flex items-center justify-between text-xs text-[#806C68]">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#652B39]" />
                  <span>
                    Auditing against <strong>{approvedRules.length} approved rules</strong> in Brand Constitution
                  </span>
                </div>
                <span className="text-[11px] font-mono font-semibold text-[#652B39]">
                  v1.0 Rules Active
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setContent('');
                    setTitle('');
                    setCurrentResult(null);
                  }}
                  className="px-3.5 py-2 text-xs font-semibold text-[#806C68] hover:text-[#35252A] cursor-pointer"
                >
                  Clear Draft
                </button>

                <button
                  type="submit"
                  disabled={isAnalyzing || !content.trim()}
                  className="px-6 py-2.5 rounded-xl bg-[#652B39] hover:bg-[#512331] text-white text-xs font-bold shadow-xs hover:shadow transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                  <span>{isAnalyzing ? 'Executing Pipeline...' : 'Run Linter Analysis'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Interactive Results Inspection & Fix Application */}
          <div className="lg:col-span-6 bg-[#FFFAF5] rounded-3xl border border-[#E4D8D1] p-6 shadow-xs min-h-[500px]">
            {!currentResult ? (
              <div className="py-16 text-center text-xs text-[#806C68] space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#F4EEE8] border border-[#E4D8D1] flex items-center justify-center text-[#652B39] mx-auto">
                  <FileSearch className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-[#35252A]">
                  Linter Output Awaiting Draft
                </h4>
                <p className="max-w-xs mx-auto leading-relaxed">
                  Enter draft copy on the left and run the linter to inspect banned words, missing footnotes, character limits, and tone attributes.
                </p>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Result Top Summary Banner */}
                <div className="p-5 rounded-2xl bg-[#F4EEE8]/70 border border-[#E4D8D1] flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#806C68] block">
                      Brand Governance Score
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-3xl font-extrabold font-mono text-[#35252A]">
                        {currentResult.score}
                      </span>
                      <span className="text-xs text-[#806C68]">/ 100</span>

                      {/* Risk Badge */}
                      <span
                        className={`ml-2 px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider border ${
                          riskBadgeStyles[currentResult.riskLevel].bg
                        } ${riskBadgeStyles[currentResult.riskLevel].text} ${
                          riskBadgeStyles[currentResult.riskLevel].border
                        }`}
                      >
                        {currentResult.riskLevel} Risk
                      </span>
                    </div>

                    <span className="text-xs font-semibold text-[#35252A] block pt-1">
                      {currentResult.verdict}
                    </span>
                  </div>

                  {/* 3D Score Orb (Allowed 3D Surface) */}
                  <div className="score-orb-3d w-16 h-16 rounded-full flex flex-col items-center justify-center border border-[#E4D8D1] shrink-0">
                    <span className="text-[10px] font-mono font-bold text-[#806C68]">STATUS</span>
                    <span className={`text-xs font-bold uppercase ${currentResult.score >= 85 ? 'text-[#2E6F40]' : 'text-[#A3282C]'}`}>
                      {currentResult.score >= 85 ? 'PASS' : 'WARN'}
                    </span>
                  </div>
                </div>

                {/* BrandGuard AI Rewrite Shortcut */}
                {currentResult.violationCount > 0 && (
                  <div className="p-3.5 rounded-2xl bg-[#652B39]/5 border border-[#652B39]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#652B39] text-white flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-[#35252A] block">
                          BrandGuard AI Suggested Rewrites
                        </span>
                        <span className="text-[11px] text-[#806C68]">
                          Generate an on-brand revision with before/after visual diffs and 1-click approvals.
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                      <button
                        type="button"
                        onClick={handleSubmitToApproval}
                        className="px-3.5 py-2 rounded-xl bg-[#F4EEE8] hover:bg-[#E8DED5] text-[#35252A] text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Submit for Approval</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          localStorage.setItem('brandguard_import_content', content);
                          navigate('/app/brandguard');
                        }}
                        className="px-3.5 py-2 rounded-xl bg-[#652B39] hover:bg-[#512331] text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                      >
                        <span>Open in BrandGuard</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Severity Filter Strip */}
                <div className="flex items-center justify-between border-b border-[#E4D8D1] pb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#35252A]">
                    Violations & Citations ({currentResult.violationCount})
                  </span>

                  <div className="flex items-center gap-1 text-[11px]">
                    {(['all', 'critical', 'high', 'medium', 'low'] as const).map((sev) => (
                      <button
                        key={sev}
                        onClick={() => setSelectedSeverityFilter(sev)}
                        className={`px-2 py-0.5 rounded-md font-semibold capitalize transition-colors cursor-pointer ${
                          selectedSeverityFilter === sev
                            ? 'bg-[#652B39] text-white'
                            : 'text-[#806C68] hover:text-[#35252A]'
                        }`}
                      >
                        {sev}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Violations Feed */}
                {filteredViolations.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#2E6F40] bg-[#2E6F40]/5 rounded-2xl border border-[#2E6F40]/20">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2" />
                    <span className="font-bold block text-sm mb-1">Clean Compliance Rating</span>
                    No violations detected for the selected filter. Draft satisfies Brand Constitution requirements.
                  </div>
                ) : (
                  <div className="space-y-3.5 max-h-[460px] overflow-y-auto pr-1">
                    {filteredViolations.map((v) => (
                      <div
                        key={v.id}
                        className="p-4 rounded-2xl bg-[#F4EEE8]/70 border border-[#E4D8D1] text-xs space-y-2.5 transition-all hover:border-[#652B39]/40"
                      >
                        {/* Violation Header */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                v.severity === 'critical'
                                  ? 'bg-[#3D1B26] text-white'
                                  : v.severity === 'high'
                                  ? 'bg-[#A3282C]/15 text-[#A3282C]'
                                  : v.severity === 'medium'
                                  ? 'bg-[#B7791F]/15 text-[#975A16]'
                                  : 'bg-[#806C68]/15 text-[#35252A]'
                              }`}
                            >
                              {v.severity}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-[#E8DED5] text-[#35252A]">
                              {v.type.replace('_', ' ')}
                            </span>
                          </div>

                          <span className="text-[10px] font-mono text-[#806C68]">
                            {v.sourceRule}
                          </span>
                        </div>

                        {/* Explanation */}
                        <p className="text-[#35252A] font-medium leading-relaxed">
                          {v.explanation}
                        </p>

                        {/* Verbatim Evidence Quote (Never fabricated) */}
                        <div className="p-2.5 rounded-xl bg-[#FFFAF5] border border-[#E4D8D1] text-[11px] text-[#35252A]">
                          <span className="font-bold text-[#806C68] block text-[10px] uppercase mb-0.5">
                            Evidence Snippet from Text:
                          </span>
                          <span className="italic text-[#652B39]">"{v.evidenceQuote}"</span>
                        </div>

                        {/* Recommended Fix with 1-Click Apply */}
                        <div className="p-3 rounded-xl bg-[#2E6F40]/5 border border-[#2E6F40]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="text-[11px] text-[#2E6F40] leading-snug">
                            <strong>Recommended Fix:</strong> {v.recommendedFix}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleApplyFix(v)}
                            className="px-2.5 py-1 rounded-lg bg-[#2E6F40] hover:bg-[#22543D] text-white text-[11px] font-semibold shrink-0 transition-colors cursor-pointer self-start sm:self-auto"
                          >
                            Apply Fix
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
