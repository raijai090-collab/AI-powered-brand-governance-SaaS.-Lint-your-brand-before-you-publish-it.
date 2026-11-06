import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import {
  ConstitutionRule,
  GuidelineVersion,
  RuleCategory,
  RuleStatus,
  CATEGORY_METADATA
} from '../types/constitution';
import {
  Scroll,
  UploadCloud,
  FileText,
  CheckCircle2,
  XCircle,
  Edit3,
  Clock,
  Sparkles,
  Layers,
  Search,
  Filter,
  AlertTriangle,
  History,
  Check,
  X,
  FileCheck,
  Shield,
  HelpCircle,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { EmptyState } from '../components/common/EmptyState';

export const ConstitutionPage: React.FC = () => {
  const { currentOrg, userProfile } = useAuth();
  const orgId = currentOrg?.id || '';

  // Role gate: only org_admin and super_admin can approve, edit, or upload guidelines
  const isOrgAdmin = userProfile?.role === 'org_admin' || userProfile?.role === 'super_admin';

  // Data states
  const [rules, setRules] = useState<ConstitutionRule[]>([]);
  const [guidelines, setGuidelines] = useState<GuidelineVersion[]>([]);
  const [activeVersion, setActiveVersion] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'all' | 'history'>('pending');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals & Upload State
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');

  // Edit Rule Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ConstitutionRule | null>(null);

  // Banner notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch guidelines and rules from Firestore for active organization
  const fetchConstitutionData = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      // 1. Fetch Guideline Versions
      const gldRef = collection(db, 'organizations', orgId, 'guidelines');
      const gldSnap = await getDocs(gldRef);
      const loadedGuidelines: GuidelineVersion[] = [];
      gldSnap.forEach((doc) => {
        loadedGuidelines.push(doc.data() as GuidelineVersion);
      });
      loadedGuidelines.sort((a, b) => b.version - a.version);
      setGuidelines(loadedGuidelines);

      if (loadedGuidelines.length > 0 && activeVersion === 1) {
        setActiveVersion(loadedGuidelines[0].version);
      }

      // 2. Fetch Rules
      const rulesRef = collection(db, 'organizations', orgId, 'rules');
      const rulesSnap = await getDocs(rulesRef);
      const loadedRules: ConstitutionRule[] = [];
      rulesSnap.forEach((doc) => {
        loadedRules.push(doc.data() as ConstitutionRule);
      });
      setRules(loadedRules);

      // If no rules exist and pending tab is selected, default to tab with content
      if (loadedRules.length > 0) {
        const hasPending = loadedRules.some(r => r.status === 'pending');
        if (!hasPending) {
          setActiveTab('approved');
        }
      }
    } catch (err) {
      console.warn('Firestore load fallback:', err);
    } finally {
      setLoading(false);
    }
  }, [orgId, activeVersion]);

  useEffect(() => {
    fetchConstitutionData();
  }, [fetchConstitutionData]);

  // Handle File Selection with strict Type and Size Validation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isDocx = file.name.toLowerCase().endsWith('.docx') ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    if (!isPdf && !isDocx) {
      setUploadError('Invalid document format. Only PDF (.pdf) and Microsoft Word (.docx) files are supported.');
      setSelectedFile(null);
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setUploadError(`File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the 15MB limit.`);
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  // Submit Brand Guideline to Backend for Text & Gemini Rule Extraction
  const handleUploadGuideline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !orgId) return;

    setIsProcessing(true);
    setUploadError(null);
    setProcessingStep('Validating document integrity...');

    try {
      const nextVersion = guidelines.length > 0
        ? Math.max(...guidelines.map(g => g.version)) + 1
        : 1;

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('organizationId', orgId);
      formData.append('version', String(nextVersion));

      setProcessingStep('Extracting document sections & running Gemini 3.8 Flash...');

      const response = await fetch('/api/guidelines/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || 'Extraction failed on server.');
      }

      setProcessingStep('Cataloguing 10-category constitution rules...');

      const result = await response.json();
      const newGuideline: GuidelineVersion = result.data.guideline;
      const extractedRules: ConstitutionRule[] = result.data.rules;

      // Save guideline record to Firestore
      try {
        await setDoc(doc(db, 'organizations', orgId, 'guidelines', newGuideline.id), newGuideline);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `organizations/${orgId}/guidelines/${newGuideline.id}`);
      }

      // Save extracted rules (all pending) to Firestore
      for (const rule of extractedRules) {
        try {
          await setDoc(doc(db, 'organizations', orgId, 'rules', rule.id), rule);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `organizations/${orgId}/rules/${rule.id}`);
        }
      }

      setGuidelines(prev => [newGuideline, ...prev]);
      setRules(prev => [...extractedRules, ...prev]);
      setActiveVersion(nextVersion);
      setActiveTab('pending');
      setSelectedFile(null);
      setUploadModalOpen(false);

      showToast(`Guideline v${nextVersion} ingested! ${extractedRules.length} rules proposed across 10 categories.`);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Error extracting brand guidelines.');
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  // Quick Instant Extraction using Sample Guideline
  const handleExtractSample = async () => {
    if (!orgId) return;
    setIsProcessing(true);
    setUploadError(null);
    setProcessingStep('Analyzing TechCorp Brand Guidelines v2.4 with Gemini 3.8 Flash...');

    try {
      const nextVersion = guidelines.length > 0
        ? Math.max(...guidelines.map(g => g.version)) + 1
        : 1;

      const response = await fetch('/api/guidelines/sample-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: orgId,
          version: nextVersion
        })
      });

      if (!response.ok) {
        throw new Error('Sample extraction failed.');
      }

      const result = await response.json();
      const newGuideline: GuidelineVersion = result.data.guideline;
      const extractedRules: ConstitutionRule[] = result.data.rules;

      // Persist to Firestore
      try {
        await setDoc(doc(db, 'organizations', orgId, 'guidelines', newGuideline.id), newGuideline);
        for (const rule of extractedRules) {
          await setDoc(doc(db, 'organizations', orgId, 'rules', rule.id), rule);
        }
      } catch (e) {
        console.warn('Firestore write fallback:', e);
      }

      setGuidelines(prev => [newGuideline, ...prev]);
      setRules(prev => [...extractedRules, ...prev]);
      setActiveVersion(nextVersion);
      setActiveTab('pending');
      setUploadModalOpen(false);

      showToast(`Guideline v${nextVersion} ingested! ${extractedRules.length} rules proposed across 10 categories.`);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Sample extraction failed.');
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  // Rule Action: Approve Single Rule
  const handleApproveRule = async (ruleId: string) => {
    if (!isOrgAdmin) {
      alert('Only an Organisation Admin can approve constitution rules.');
      return;
    }

    const nowIso = new Date().toISOString();
    try {
      await updateDoc(doc(db, 'organizations', orgId, 'rules', ruleId), {
        status: 'approved',
        updatedAt: nowIso,
        reviewedBy: userProfile?.id || 'admin',
        reviewedAt: nowIso
      });
    } catch (e) {
      console.warn('Firestore update fallback:', e);
    }

    setRules(prev =>
      prev.map(r => (r.id === ruleId ? { ...r, status: 'approved', updatedAt: nowIso } : r))
    );
    showToast('Rule approved and activated in Brand Constitution.');
  };

  // Rule Action: Reject Single Rule
  const handleRejectRule = async (ruleId: string) => {
    if (!isOrgAdmin) {
      alert('Only an Organisation Admin can reject constitution rules.');
      return;
    }

    const nowIso = new Date().toISOString();
    try {
      await updateDoc(doc(db, 'organizations', orgId, 'rules', ruleId), {
        status: 'rejected',
        updatedAt: nowIso,
        reviewedBy: userProfile?.id || 'admin',
        reviewedAt: nowIso
      });
    } catch (e) {
      console.warn('Firestore update fallback:', e);
    }

    setRules(prev =>
      prev.map(r => (r.id === ruleId ? { ...r, status: 'rejected', updatedAt: nowIso } : r))
    );
    showToast('Rule marked as rejected.');
  };

  // Rule Action: Bulk Approve All Pending
  const handleApproveAllPending = async () => {
    if (!isOrgAdmin) {
      alert('Only an Organisation Admin can approve constitution rules.');
      return;
    }

    const pendingRules = rules.filter(r => r.status === 'pending');
    if (pendingRules.length === 0) return;

    const nowIso = new Date().toISOString();
    for (const r of pendingRules) {
      try {
        await updateDoc(doc(db, 'organizations', orgId, 'rules', r.id), {
          status: 'approved',
          updatedAt: nowIso,
          reviewedBy: userProfile?.id || 'admin',
          reviewedAt: nowIso
        });
      } catch (e) {
        console.warn('Firestore bulk update fallback:', e);
      }
    }

    setRules(prev =>
      prev.map(r => (r.status === 'pending' ? { ...r, status: 'approved', updatedAt: nowIso } : r))
    );
    showToast(`All ${pendingRules.length} proposed rules approved and activated!`);
  };

  // Save Rule Edits & Approve
  const handleSaveRuleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule || !isOrgAdmin) return;

    const nowIso = new Date().toISOString();
    const updated: ConstitutionRule = {
      ...editingRule,
      status: 'approved', // Editing by admin simultaneously approves the refined rule
      updatedAt: nowIso,
      reviewedBy: userProfile?.id || 'admin',
      reviewedAt: nowIso
    };

    try {
      await setDoc(doc(db, 'organizations', orgId, 'rules', updated.id), updated);
    } catch (e) {
      console.warn('Firestore edit fallback:', e);
    }

    setRules(prev => prev.map(r => (r.id === updated.id ? updated : r)));
    setEditModalOpen(false);
    setEditingRule(null);
    showToast('Rule updated and activated in Brand Constitution.');
  };

  // Filtered Rules Calculation
  const filteredRules = useMemo(() => {
    return rules.filter(r => {
      // Tab filter
      if (activeTab === 'pending' && r.status !== 'pending') return false;
      if (activeTab === 'approved' && r.status !== 'approved') return false;

      // Category filter
      if (selectedCategory !== 'all' && r.category !== selectedCategory) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = r.title.toLowerCase().includes(q);
        const matchesText = r.ruleText.toLowerCase().includes(q);
        const matchesCat = r.category.toLowerCase().includes(q);
        const matchesPage = r.sourcePage.toLowerCase().includes(q);
        if (!matchesTitle && !matchesText && !matchesCat && !matchesPage) return false;
      }

      return true;
    });
  }, [rules, activeTab, selectedCategory, searchQuery]);

  // Counts
  const pendingCount = rules.filter(r => r.status === 'pending').length;
  const approvedCount = rules.filter(r => r.status === 'approved').length;
  const totalCount = rules.length;

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-[#652B39] text-white text-xs font-semibold shadow-2xl flex items-center gap-2.5 animate-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 className="w-4 h-4 text-[#FFFAF5] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#35252A] tracking-tight">
              Brand Constitution
            </h1>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#652B39]/10 text-[#652B39]">
              Multi-Tenant Engine
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#806C68]">
            Codified governance rules for <strong className="text-[#35252A]">{currentOrg?.name}</strong>. Ingest brand guideline documents, extract policy directives with Gemini, and govern publications.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {/* Version Pill */}
          {guidelines.length > 0 && (
            <div className="px-3 py-1.5 rounded-xl bg-[#FFFAF5] border border-[#E4D8D1] text-xs font-bold text-[#35252A] flex items-center gap-1.5 shadow-xs">
              <History className="w-3.5 h-3.5 text-[#652B39]" />
              <span>v{activeVersion}.0 Active</span>
            </div>
          )}

          {/* Upload Button */}
          {isOrgAdmin ? (
            <button
              onClick={() => setUploadModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#652B39] hover:bg-[#512331] text-white text-xs font-semibold shadow-xs hover:shadow transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Guidelines</span>
            </button>
          ) : (
            <div className="px-3 py-1.5 rounded-xl bg-[#E8DED5]/50 border border-[#E4D8D1] text-[11px] text-[#806C68] flex items-center gap-1.5" title="Only Organisation Admins can upload guidelines">
              <Shield className="w-3.5 h-3.5 text-[#652B39]" />
              <span>Org Admin Sign-Off Required</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs & Bulk Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4D8D1] pb-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'pending'
                ? 'bg-[#652B39] text-white shadow-xs'
                : 'text-[#806C68] hover:text-[#35252A] hover:bg-[#FFFAF5]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Review</span>
            {pendingCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'pending' ? 'bg-white/20 text-white' : 'bg-[#A3282C]/10 text-[#A3282C]'}`}>
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('approved')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'approved'
                ? 'bg-[#652B39] text-white shadow-xs'
                : 'text-[#806C68] hover:text-[#35252A] hover:bg-[#FFFAF5]'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Active Constitution</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'approved' ? 'bg-white/20 text-white' : 'bg-[#2E6F40]/10 text-[#2E6F40]'}`}>
              {approvedCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-[#652B39] text-white shadow-xs'
                : 'text-[#806C68] hover:text-[#35252A] hover:bg-[#FFFAF5]'
            }`}
          >
            All Rules ({totalCount})
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-[#652B39] text-white shadow-xs'
                : 'text-[#806C68] hover:text-[#35252A] hover:bg-[#FFFAF5]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Guideline Versions ({guidelines.length})</span>
          </button>
        </div>

        {/* Bulk Action for Pending Tab */}
        {activeTab === 'pending' && pendingCount > 0 && isOrgAdmin && (
          <button
            onClick={handleApproveAllPending}
            className="px-3.5 py-1.5 rounded-xl bg-[#2E6F40] hover:bg-[#22543D] text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Approve All Pending ({pendingCount})</span>
          </button>
        )}
      </div>

      {/* Main Content Area */}
      {activeTab === 'history' ? (
        /* Guideline Version History View */
        <div className="bg-[#FFFAF5] rounded-3xl border border-[#E4D8D1] p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E4D8D1]">
            <div>
              <h3 className="text-base font-bold text-[#35252A]">
                Ingested Guideline Documents & Revision Trail
              </h3>
              <p className="text-xs text-[#806C68] mt-0.5">
                Every guideline version uploaded is archived with its original filename, size, and extracted rule set.
              </p>
            </div>
          </div>

          {guidelines.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#806C68]">
              No guideline versions archived yet. Upload a PDF or DOCX file to establish v1.
            </div>
          ) : (
            <div className="divide-y divide-[#E4D8D1]/60">
              {guidelines.map((gld) => (
                <div key={gld.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#652B39]/10 text-[#652B39] flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#35252A]">{gld.filename}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[#652B39] text-white">
                          v{gld.version}.0
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-[#E8DED5] text-[#35252A]">
                          {gld.fileType}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-[#806C68] mt-0.5">
                        <span>Size: {(gld.fileSize / 1024).toFixed(1)} KB</span>
                        <span>•</span>
                        <span>Uploaded: {new Date(gld.uploadedAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-[#2E6F40] bg-[#2E6F40]/10 px-2.5 py-1 rounded-xl">
                      {gld.extractedRuleCount} Rules Extracted
                    </span>
                    <button
                      onClick={() => {
                        setActiveVersion(gld.version);
                        setActiveTab('all');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#F4EEE8] hover:bg-[#E8DED5] border border-[#E4D8D1] text-xs font-semibold text-[#35252A] transition-colors cursor-pointer"
                    >
                      View Rules
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : rules.length === 0 ? (
        /* Empty State */
        <div className="bg-[#FFFAF5] rounded-3xl border border-[#E4D8D1] p-6 sm:p-8 shadow-xs">
          <EmptyState
            icon={Scroll}
            badge="Brand Constitution Empty"
            title="Ingest Your Brand Guidelines"
            description="Upload an existing PDF or DOCX brand guideline. Gemini AI will analyze the document, identify policy directives across 10 essential categories, and propose structured rules for Organisation Admin approval."
            actionLabel="Upload PDF / DOCX Guideline"
            onAction={() => setUploadModalOpen(true)}
            secondaryActionLabel="Try with Sample Guideline (Instant)"
            onSecondaryAction={handleExtractSample}
            tips={[
              {
                title: '10 Core Governance Categories',
                desc: 'Gemini proposes rules across tone, messaging, terminology, grammar, visual identity, colour, logo, typography, disclaimers, and prohibited statements.'
              },
              {
                title: 'Traceable Source Page Citations',
                desc: 'Every extracted rule cites its original page and section number for seamless verification.'
              },
              {
                title: 'Mandatory Admin Review Gate',
                desc: 'Extracted rules remain in "Pending Review" status until an Organisation Admin verifies, edits, or approves them.'
              },
              {
                title: 'Version History Retention',
                desc: 'Guidelines can be updated over time, maintaining historical versions under your tenant organization.'
              }
            ]}
          />
        </div>
      ) : (
        /* Filterable Rules Grid */
        <div className="space-y-4">
          {/* Search and Category Filter Strip */}
          <div className="bg-[#FFFAF5] p-4 rounded-2xl border border-[#E4D8D1] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#806C68] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search rules, source citations, prohibited terms..."
                className="w-full pl-10 pr-4 py-2 bg-[#F4EEE8] border border-[#E4D8D1] rounded-xl text-xs sm:text-sm text-[#35252A] placeholder-[#806C68]/60 focus:outline-none focus:ring-2 focus:ring-[#652B39]/30 focus:border-[#652B39]"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-thin">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-[#652B39] text-white'
                    : 'bg-[#F4EEE8] text-[#806C68] hover:text-[#35252A]'
                }`}
              >
                All Categories
              </button>

              {(Object.keys(CATEGORY_METADATA) as RuleCategory[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-colors cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#652B39] text-white'
                      : 'bg-[#F4EEE8] text-[#806C68] hover:text-[#35252A]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Pending Banner Alert if looking at approved or all */}
          {activeTab !== 'pending' && pendingCount > 0 && (
            <div className="p-3.5 rounded-2xl bg-[#B7791F]/10 border border-[#B7791F]/20 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-[#975A16]">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  You have <strong>{pendingCount} proposed rules</strong> awaiting Organisation Admin approval before publication enforcement.
                </span>
              </div>
              <button
                onClick={() => setActiveTab('pending')}
                className="text-xs font-bold text-[#652B39] hover:underline cursor-pointer"
              >
                Review Pending Rules →
              </button>
            </div>
          )}

          {/* Rules List */}
          {filteredRules.length === 0 ? (
            <div className="bg-[#FFFAF5] rounded-3xl border border-[#E4D8D1] p-12 text-center text-xs text-[#806C68]">
              No brand rules match the current filters or search query.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRules.map((rule) => {
                const catMeta = CATEGORY_METADATA[rule.category] || CATEGORY_METADATA['messaging'];
                const isPending = rule.status === 'pending';

                return (
                  <div
                    key={rule.id}
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                      isPending
                        ? 'bg-[#FFFAF5] border-dashed border-[#B7791F]/60 shadow-xs'
                        : 'bg-[#FFFAF5] border-[#E4D8D1] shadow-xs'
                    }`}
                  >
                    <div>
                      {/* Top Meta Bar */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${catMeta.bg} ${catMeta.color} border ${catMeta.border}`}
                        >
                          {catMeta.label}
                        </span>

                        <div className="flex items-center gap-2">
                          {/* Source Page Citation Pill */}
                          {rule.sourcePage && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#F4EEE8] text-[#806C68] border border-[#E4D8D1]">
                              {rule.sourcePage}
                            </span>
                          )}

                          {/* Confidence Score Pill */}
                          {rule.confidence && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#2E6F40]/10 text-[#2E6F40]">
                              {rule.confidence}% Conf.
                            </span>
                          )}

                          {/* Status Pill */}
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              rule.status === 'approved'
                                ? 'bg-[#2E6F40]/10 text-[#2E6F40]'
                                : rule.status === 'pending'
                                ? 'bg-[#B7791F]/15 text-[#975A16]'
                                : 'bg-[#A3282C]/10 text-[#A3282C]'
                            }`}
                          >
                            {rule.status}
                          </span>
                        </div>
                      </div>

                      {/* Rule Heading */}
                      <h3 className="text-sm font-bold text-[#35252A] mb-1.5 leading-snug">
                        {rule.title}
                      </h3>

                      {/* Rule Policy Text */}
                      <p className="text-xs text-[#806C68] leading-relaxed mb-4">
                        {rule.ruleText}
                      </p>
                    </div>

                    {/* Admin Action Bar */}
                    <div className="pt-3 border-t border-[#E4D8D1]/60 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-[#806C68]/70">
                        Version {rule.version || 1}
                      </span>

                      {isOrgAdmin ? (
                        <div className="flex items-center gap-2">
                          {/* Edit Rule Button */}
                          <button
                            onClick={() => {
                              setEditingRule(rule);
                              setEditModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-[#806C68] hover:text-[#35252A] hover:bg-[#E8DED5]/60 transition-colors cursor-pointer"
                            title="Edit rule before approving"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {isPending && (
                            <>
                              <button
                                onClick={() => handleRejectRule(rule.id)}
                                className="px-2.5 py-1 rounded-lg text-[#A3282C] hover:bg-[#A3282C]/10 text-[11px] font-semibold transition-colors cursor-pointer"
                              >
                                Reject
                              </button>

                              <button
                                onClick={() => handleApproveRule(rule.id)}
                                className="px-3 py-1 rounded-lg bg-[#652B39] hover:bg-[#512331] text-white text-[11px] font-semibold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                              >
                                <Check className="w-3 h-3" />
                                <span>Approve</span>
                              </button>
                            </>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-[#806C68] italic">
                          {rule.status === 'pending' ? 'Awaiting Org Admin' : 'Active Policy'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal: Upload Brand Guideline */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3D1B26]/40 backdrop-blur-xs">
          <div className="bg-[#FFFAF5] border border-[#E4D8D1] rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#652B39]/10 text-[#652B39] flex items-center justify-center">
                  <UploadCloud className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-[#35252A]">
                  Upload Brand Guideline
                </h3>
              </div>
              <button
                onClick={() => {
                  if (!isProcessing) {
                    setUploadModalOpen(false);
                    setSelectedFile(null);
                    setUploadError(null);
                  }
                }}
                disabled={isProcessing}
                className="p-1 rounded-lg text-[#806C68] hover:text-[#35252A] hover:bg-[#E8DED5]/50 cursor-pointer disabled:opacity-40"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#806C68] mb-5 leading-relaxed">
              Upload your company brand book, messaging guide, or tone manual (PDF or DOCX, max 15MB). Gemini AI will parse the document and extract proposed rules across 10 categories.
            </p>

            {uploadError && (
              <div className="mb-4 p-3 rounded-xl bg-[#FFF5F5] border border-[#A3282C]/20 text-[#A3282C] text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{uploadError}</span>
              </div>
            )}

            {isProcessing ? (
              <div className="py-8 text-center space-y-4">
                <RefreshCw className="w-8 h-8 text-[#652B39] animate-spin mx-auto" />
                <div className="space-y-1">
                  <span className="text-sm font-bold text-[#35252A] block">
                    {processingStep || 'Processing document with Gemini...'}
                  </span>
                  <span className="text-xs text-[#806C68] block">
                    Extracting tone, terminology, logo, typography, and disclaimers.
                  </span>
                </div>
              </div>
            ) : (
              <form onSubmit={handleUploadGuideline} className="space-y-4">
                {/* Drag and Drop Zone */}
                <div className="border-2 border-dashed border-[#E4D8D1] rounded-2xl p-6 text-center hover:border-[#652B39]/50 transition-colors bg-[#F4EEE8]/40">
                  <input
                    type="file"
                    id="guideline-file-input"
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="guideline-file-input" className="cursor-pointer block">
                    <FileText className="w-8 h-8 text-[#652B39] mx-auto mb-2" />
                    {selectedFile ? (
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-[#35252A] block truncate max-w-xs mx-auto">
                          {selectedFile.name}
                        </span>
                        <span className="text-[11px] text-[#806C68] block">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Click to change
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-[#35252A] block">
                          Click to browse or drop PDF / DOCX guideline
                        </span>
                        <span className="text-[11px] text-[#806C68] block">
                          Supports brand books up to 15MB
                        </span>
                      </div>
                    )}
                  </label>
                </div>

                {/* Instant Sample Guideline Button */}
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={handleExtractSample}
                    className="text-xs font-bold text-[#652B39] hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Don't have a PDF? Test with Sample Enterprise Brand Guidelines</span>
                  </button>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E4D8D1]">
                  <button
                    type="button"
                    onClick={() => setUploadModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-[#806C68] hover:text-[#35252A] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedFile}
                    className="px-5 py-2.5 rounded-xl bg-[#652B39] hover:bg-[#512331] text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                  >
                    Extract Rules with Gemini
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal: Edit Rule & Approve */}
      {editModalOpen && editingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3D1B26]/40 backdrop-blur-xs">
          <div className="bg-[#FFFAF5] border border-[#E4D8D1] rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#35252A]">
                Edit & Approve Rule
              </h3>
              <button
                onClick={() => {
                  setEditModalOpen(false);
                  setEditingRule(null);
                }}
                className="p-1 rounded-lg text-[#806C68] hover:text-[#35252A] hover:bg-[#E8DED5]/50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRuleEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#35252A] uppercase tracking-wider mb-1.5">
                  Rule Title
                </label>
                <input
                  type="text"
                  required
                  value={editingRule.title}
                  onChange={(e) => setEditingRule({ ...editingRule, title: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#F4EEE8] border border-[#E4D8D1] rounded-xl text-xs sm:text-sm text-[#35252A] focus:outline-none focus:ring-2 focus:ring-[#652B39]/30 focus:border-[#652B39]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#35252A] uppercase tracking-wider mb-1.5">
                    Category
                  </label>
                  <select
                    value={editingRule.category}
                    onChange={(e) => setEditingRule({ ...editingRule, category: e.target.value as RuleCategory })}
                    className="w-full px-3 py-2 bg-[#F4EEE8] border border-[#E4D8D1] rounded-xl text-xs text-[#35252A] focus:outline-none focus:ring-2 focus:ring-[#652B39]/30 focus:border-[#652B39]"
                  >
                    {(Object.keys(CATEGORY_METADATA) as RuleCategory[]).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#35252A] uppercase tracking-wider mb-1.5">
                    Source Page / Section
                  </label>
                  <input
                    type="text"
                    value={editingRule.sourcePage}
                    onChange={(e) => setEditingRule({ ...editingRule, sourcePage: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F4EEE8] border border-[#E4D8D1] rounded-xl text-xs text-[#35252A] focus:outline-none focus:ring-2 focus:ring-[#652B39]/30 focus:border-[#652B39]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#35252A] uppercase tracking-wider mb-1.5">
                  Policy Directive & Implementation
                </label>
                <textarea
                  rows={5}
                  required
                  value={editingRule.ruleText}
                  onChange={(e) => setEditingRule({ ...editingRule, ruleText: e.target.value })}
                  className="w-full p-3.5 bg-[#F4EEE8] border border-[#E4D8D1] rounded-xl text-xs sm:text-sm text-[#35252A] focus:outline-none focus:ring-2 focus:ring-[#652B39]/30 focus:border-[#652B39] resize-none leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E4D8D1]">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#806C68] hover:text-[#35252A] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#652B39] hover:bg-[#512331] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  Save & Approve Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
