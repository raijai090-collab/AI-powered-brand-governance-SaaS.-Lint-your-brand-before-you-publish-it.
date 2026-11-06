import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import {
  ApprovedClaim,
  ClaimVerificationFinding,
  ClaimVerificationStatus,
  ClaimCategory
} from '../types/claimshield';
import {
  ShieldCheck,
  Plus,
  Link as LinkIcon,
  Check,
  X,
  FileCheck2,
  Calendar,
  AlertTriangle,
  AlertOctagon,
  Clock,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { EmptyState } from '../components/common/EmptyState';

export const ClaimShieldPage: React.FC = () => {
  const { currentOrg, userProfile } = useAuth();
  const orgId = currentOrg?.id || '';

  const isOrgAdminOrReviewer =
    userProfile?.role === 'org_admin' ||
    userProfile?.role === 'super_admin' ||
    userProfile?.role === 'reviewer';

  // Navigation tab: 'database' (Manage Approved Claims) vs 'verifier' (Live Verification Sentry)
  const [activeTab, setActiveTab] = useState<'database' | 'verifier'>('database');

  // Claims Data State
  const [claims, setClaims] = useState<ApprovedClaim[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'active' | 'expired'>('all');

  // Add / Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClaim, setEditingClaim] = useState<ApprovedClaim | null>(null);
  const [claimText, setClaimText] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceDocument, setSourceDocument] = useState('');
  const [approvalDate, setApprovalDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [owner, setOwner] = useState(userProfile?.displayName || 'Legal & Compliance');
  const [category, setCategory] = useState<ClaimCategory>('performance');

  // Live Verifier State
  const [verifierInput, setVerifierInput] = useState(
    'Our #1 platform is 100% guaranteed to deliver 10x ROI for enterprise treasuries with 99.98% platform reliability.'
  );
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationFindings, setVerificationFindings] = useState<ClaimVerificationFinding[]>([]);
  const [verificationStats, setVerificationStats] = useState<{
    verified: number;
    unsupported: number;
    contradictory: number;
    expired: number;
    needsReview: number;
  } | null>(null);

  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load claims from Firestore
  const loadClaims = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const claimsRef = collection(db, 'organizations', orgId, 'claims');
      const snap = await getDocs(claimsRef);
      const loaded: ApprovedClaim[] = [];
      const now = new Date();

      snap.forEach((docSnap) => {
        const item = docSnap.data() as ApprovedClaim;
        // Re-evaluate active vs expired based on current timestamp
        const isExpired = item.expiryDate && new Date(item.expiryDate) < now;
        loaded.push({
          ...item,
          status: isExpired ? 'expired' : 'active'
        });
      });

      loaded.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setClaims(loaded);
    } catch (err) {
      console.warn('Firestore claims load fallback:', err);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    loadClaims();
  }, [loadClaims]);

  // Save (Create or Update) Approved Claim
  const handleSaveClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimText.trim() || !orgId) return;

    const nowIso = new Date().toISOString();
    const expiryIso = new Date(expiryDate).toISOString();
    const isExpired = new Date(expiryDate) < new Date();

    const claimId = editingClaim ? editingClaim.id : `claim_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

    const claimRecord: ApprovedClaim = {
      id: claimId,
      organizationId: orgId,
      claim: claimText.trim(),
      sourceUrl: sourceUrl.trim() || undefined,
      sourceDocument: sourceDocument.trim() || undefined,
      approvalDate: new Date(approvalDate).toISOString(),
      expiryDate: expiryIso,
      owner: owner.trim() || 'Compliance Lead',
      category,
      status: isExpired ? 'expired' : 'active',
      createdAt: editingClaim ? editingClaim.createdAt : nowIso,
      updatedAt: nowIso
    };

    try {
      await setDoc(doc(db, 'organizations', orgId, 'claims', claimId), claimRecord);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `organizations/${orgId}/claims/${claimId}`);
    }

    if (editingClaim) {
      setClaims(prev => prev.map(c => (c.id === claimId ? claimRecord : c)));
      showToast('Approved claim record updated.');
    } else {
      setClaims(prev => [claimRecord, ...prev]);
      showToast('New approved claim certified in ClaimShield.');
    }

    resetForm();
  };

  // Delete Claim
  const handleDeleteClaim = async (claimId: string) => {
    if (!isOrgAdminOrReviewer) return;
    if (!confirm('Are you sure you want to remove this claim from the certified database?')) return;

    try {
      await deleteDoc(doc(db, 'organizations', orgId, 'claims', claimId));
    } catch (err) {
      console.warn('Delete claim fallback:', err);
    }

    setClaims(prev => prev.filter(c => c.id !== claimId));
    showToast('Claim removed from proof database.');
  };

  // Seed Enterprise Claims
  const handleSeedClaims = async () => {
    if (!orgId) return;
    const nowIso = new Date().toISOString();
    const oneYearFuture = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    const pastDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // Expired proof demo

    const seeds: ApprovedClaim[] = [
      {
        id: `claim_seed_1`,
        organizationId: orgId,
        claim: 'Reduces brand governance turnaround time by 78%',
        sourceDocument: 'Q3 Enterprise Benchmark Study (N=45 brands)',
        approvalDate: nowIso,
        expiryDate: oneYearFuture,
        owner: 'Product Analytics Team',
        category: 'performance',
        status: 'active',
        createdAt: nowIso,
        updatedAt: nowIso
      },
      {
        id: `claim_seed_2`,
        organizationId: orgId,
        claim: '99.98% platform reliability and sub-50ms latency',
        sourceUrl: 'https://status.brandlint.io/sla-audit-2026',
        sourceDocument: 'SOC 2 Type II Independent Audit Report',
        approvalDate: nowIso,
        expiryDate: oneYearFuture,
        owner: 'Infrastructure Compliance Lead',
        category: 'security',
        status: 'active',
        createdAt: nowIso,
        updatedAt: nowIso
      },
      {
        id: `claim_seed_3`,
        organizationId: orgId,
        claim: 'Accelerates marketing copy production by 30%',
        sourceDocument: '2025 Customer Pilot Study Report',
        approvalDate: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(),
        expiryDate: pastDate, // Expired certification demonstration
        owner: 'Growth Research Desk',
        category: 'financial',
        status: 'expired',
        createdAt: nowIso,
        updatedAt: nowIso
      }
    ];

    for (const seed of seeds) {
      try {
        await setDoc(doc(db, 'organizations', orgId, 'claims', seed.id), seed);
      } catch (e) {
        console.warn('Seed write fallback:', e);
      }
    }

    setClaims(prev => [...seeds, ...prev]);
    showToast('Seeded 3 enterprise approved claim proofs into ClaimShield.');
  };

  const resetForm = () => {
    setClaimText('');
    setSourceUrl('');
    setSourceDocument('');
    setApprovalDate(new Date().toISOString().split('T')[0]);
    setExpiryDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setOwner(userProfile?.displayName || 'Legal & Compliance');
    setCategory('performance');
    setEditingClaim(null);
    setModalOpen(false);
  };

  const openEditModal = (c: ApprovedClaim) => {
    setEditingClaim(c);
    setClaimText(c.claim);
    setSourceUrl(c.sourceUrl || '');
    setSourceDocument(c.sourceDocument || '');
    setApprovalDate(c.approvalDate.split('T')[0]);
    setExpiryDate(c.expiryDate.split('T')[0]);
    setOwner(c.owner);
    setCategory(c.category);
    setModalOpen(true);
  };

  // Run Live Verification Sentry
  const handleVerifyClaims = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!verifierInput.trim() || !orgId) return;

    setIsVerifying(true);
    try {
      const response = await fetch('/api/claimshield/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: orgId,
          content: verifierInput.trim(),
          approvedClaims: claims
        })
      });

      if (!response.ok) {
        throw new Error('Claim verification failed.');
      }

      const json = await response.json();
      setVerificationFindings(json.data.findings || []);
      setVerificationStats({
        verified: json.data.verifiedCount,
        unsupported: json.data.unsupportedCount,
        contradictory: json.data.contradictoryCount,
        expired: json.data.expiredCount,
        needsReview: json.data.needsReviewCount
      });
      showToast(`Verification complete: ${json.data.claimCount} statements inspected.`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error executing ClaimShield.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Filtered Claims
  const filteredClaims = useMemo(() => {
    return claims.filter(c => {
      if (selectedStatusFilter !== 'all' && c.status !== selectedStatusFilter) return false;
      if (selectedCategory !== 'all' && c.category !== selectedCategory) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesClaim = c.claim.toLowerCase().includes(q);
        const matchesOwner = c.owner.toLowerCase().includes(q);
        const matchesDoc = (c.sourceDocument || '').toLowerCase().includes(q);
        const matchesUrl = (c.sourceUrl || '').toLowerCase().includes(q);
        if (!matchesClaim && !matchesOwner && !matchesDoc && !matchesUrl) return false;
      }

      return true;
    });
  }, [claims, selectedStatusFilter, selectedCategory, searchQuery]);

  // Label Badge Styles for the 5 mandated states
  const labelStyles: Record<ClaimVerificationStatus, { text: string; bg: string; border: string; icon: any }> = {
    Verified: { text: 'text-[#2E6F40]', bg: 'bg-[#2E6F40]/10', border: 'border-[#2E6F40]/30', icon: CheckCircle2 },
    Unsupported: { text: 'text-[#A3282C]', bg: 'bg-[#A3282C]/10', border: 'border-[#A3282C]/30', icon: AlertOctagon },
    Contradictory: { text: 'text-white', bg: 'bg-[#3D1B26]', border: 'border-[#3D1B26]', icon: XCircle },
    Expired: { text: 'text-[#975A16]', bg: 'bg-[#B7791F]/15', border: 'border-[#B7791F]/40', icon: Clock },
    'Needs manual review': { text: 'text-[#35252A]', bg: 'bg-[#E8DED5]', border: 'border-[#E4D8D1]', icon: AlertTriangle }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
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
              ClaimShield™ Evidence Vault
            </h1>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#2E6F40]/10 text-[#2E6F40]">
              Certified Proof Engine
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#806C68]">
            Approved claims database for <strong className="text-[#35252A]">{currentOrg?.name}</strong>. Statements are verified strictly against certified proof documents. AI statements are never proof.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {/* Add Claim Button */}
          {isOrgAdminOrReviewer && (
            <button
              onClick={() => {
                resetForm();
                setModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-[#652B39] hover:bg-[#512331] text-white text-xs font-semibold shadow-xs hover:shadow transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Register Approved Claim</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center justify-between border-b border-[#E4D8D1] pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('database')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'database'
                ? 'bg-[#652B39] text-white shadow-xs'
                : 'text-[#806C68] hover:text-[#35252A] hover:bg-[#FFFAF5]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Approved Claims Database ({claims.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('verifier')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'verifier'
                ? 'bg-[#652B39] text-white shadow-xs'
                : 'text-[#806C68] hover:text-[#35252A] hover:bg-[#FFFAF5]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Live Verification Sentry</span>
          </button>
        </div>

        {activeTab === 'database' && claims.length === 0 && (
          <button
            onClick={handleSeedClaims}
            className="text-xs font-bold text-[#652B39] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Seed 3 Enterprise Proofs</span>
          </button>
        )}
      </div>

      {/* View: Approved Claims Database */}
      {activeTab === 'database' ? (
        <div className="space-y-4">
          {claims.length === 0 ? (
            <div className="bg-[#FFFAF5] rounded-3xl border border-[#E4D8D1] p-6 sm:p-8 shadow-xs">
              <EmptyState
                icon={ShieldCheck}
                badge="ClaimShield Vault Empty"
                title="No Approved Claims Registered"
                description="ClaimShield ensures every marketing assertion, statistic, or comparative superlative is backed by verified legal proof. Register your audited metrics, SOC 2 reports, and customer case study benchmarks."
                actionLabel="Register First Approved Claim"
                onAction={() => setModalOpen(true)}
                secondaryActionLabel="Seed Enterprise Benchmark Proofs"
                onSecondaryAction={handleSeedClaims}
                tips={[
                  {
                    title: 'The 5 Verification States',
                    desc: 'Claims in copy are labelled Verified, Unsupported, Contradictory, Expired, or Needs manual review.'
                  },
                  {
                    title: 'Proof Requirement',
                    desc: 'Every registered claim specifies an owner, an approval date, an expiry date, and an audit document or URL.'
                  },
                  {
                    title: 'Zero-AI Proof Guarantee',
                    desc: 'AI statements are never proof. Only certified documents in this database can substantiate claims.'
                  },
                  {
                    title: 'Expiration Sentry',
                    desc: 'When an evidentiary audit expires, ClaimShield automatically flags corresponding marketing copy.'
                  }
                ]}
              />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Search & Filter Strip */}
              <div className="bg-[#FFFAF5] p-4 rounded-2xl border border-[#E4D8D1] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-[#806C68] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search claims by text, owner, citation document..."
                    className="w-full pl-10 pr-4 py-2 bg-[#F4EEE8] border border-[#E4D8D1] rounded-xl text-xs sm:text-sm text-[#35252A] placeholder-[#806C68]/60 focus:outline-none focus:ring-2 focus:ring-[#652B39]/30 focus:border-[#652B39]"
                  />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                  <div className="flex items-center bg-[#F4EEE8] rounded-xl p-1 border border-[#E4D8D1]">
                    {(['all', 'active', 'expired'] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => setSelectedStatusFilter(st)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer ${
                          selectedStatusFilter === st
                            ? 'bg-[#652B39] text-white shadow-xs'
                            : 'text-[#806C68] hover:text-[#35252A]'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>

                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-3 py-1.5 bg-[#F4EEE8] border border-[#E4D8D1] rounded-xl text-xs text-[#35252A] focus:outline-none focus:ring-2 focus:ring-[#652B39]/30 cursor-pointer"
                  >
                    <option value="all">All Domains</option>
                    <option value="performance">Performance</option>
                    <option value="financial">Financial / ROI</option>
                    <option value="compliance">Compliance</option>
                    <option value="security">Security & SLA</option>
                    <option value="customer">Customer Count</option>
                    <option value="award">Awards & Badges</option>
                  </select>
                </div>
              </div>

              {/* Claims List */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredClaims.map((item) => {
                  const isExpired = item.status === 'expired';

                  return (
                    <div
                      key={item.id}
                      className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                        isExpired
                          ? 'bg-[#FFFAF5] border-dashed border-[#B7791F]/60'
                          : 'bg-[#FFFAF5] border-[#E4D8D1] shadow-xs hover:border-[#652B39]/40'
                      }`}
                    >
                      <div className="space-y-3">
                        {/* Meta Badge Bar */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#652B39]/10 text-[#652B39]">
                            {item.category}
                          </span>

                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1 ${
                              isExpired
                                ? 'bg-[#B7791F]/15 text-[#975A16]'
                                : 'bg-[#2E6F40]/10 text-[#2E6F40]'
                            }`}
                          >
                            {isExpired ? <Clock className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                            <span>{item.status}</span>
                          </span>
                        </div>

                        {/* Statement */}
                        <h3 className="text-sm font-bold text-[#35252A] leading-snug">
                          "{item.claim}"
                        </h3>

                        {/* Evidentiary Proof Reference */}
                        <div className="p-3 rounded-xl bg-[#F4EEE8]/70 border border-[#E4D8D1] space-y-1 text-xs">
                          <span className="text-[10px] uppercase font-bold text-[#806C68] block">
                            Certified Proof Source:
                          </span>
                          {item.sourceDocument && (
                            <div className="font-medium text-[#35252A] flex items-center gap-1.5 truncate">
                              <FileCheck2 className="w-3.5 h-3.5 text-[#652B39] shrink-0" />
                              <span className="truncate">{item.sourceDocument}</span>
                            </div>
                          )}
                          {item.sourceUrl && (
                            <a
                              href={item.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#652B39] font-medium hover:underline flex items-center gap-1 truncate"
                            >
                              <ExternalLink className="w-3 h-3 shrink-0" />
                              <span className="truncate">{item.sourceUrl}</span>
                            </a>
                          )}
                        </div>

                        {/* Expiry & Owner Details */}
                        <div className="space-y-1 text-[11px] text-[#806C68]">
                          <div className="flex justify-between">
                            <span>Certified:</span>
                            <span className="font-medium text-[#35252A]">
                              {new Date(item.approvalDate).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Expires:</span>
                            <span className={`font-medium ${isExpired ? 'text-[#A3282C] font-bold' : 'text-[#35252A]'}`}>
                              {new Date(item.expiryDate).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Owner:</span>
                            <span className="font-semibold text-[#652B39]">{item.owner}</span>
                          </div>
                        </div>
                      </div>

                      {/* Admin Controls */}
                      {isOrgAdminOrReviewer && (
                        <div className="pt-3 mt-3 border-t border-[#E4D8D1]/70 flex items-center justify-end gap-2 text-xs">
                          <button
                            onClick={() => openEditModal(item)}
                            className="px-2.5 py-1 rounded-lg text-[#806C68] hover:text-[#35252A] hover:bg-[#E8DED5]/60 transition-colors cursor-pointer"
                          >
                            Edit Proof
                          </button>
                          <button
                            onClick={() => handleDeleteClaim(item.id)}
                            className="px-2.5 py-1 rounded-lg text-[#A3282C] hover:bg-[#A3282C]/10 transition-colors cursor-pointer"
                          >
                            Revoke
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* View: Live Verification Sentry */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Input Box */}
          <div className="lg:col-span-5 bg-[#FFFAF5] rounded-3xl border border-[#E4D8D1] p-6 shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-bold text-[#35252A]">
                Claim Verification Sentry
              </h3>
              <p className="text-xs text-[#806C68] mt-0.5">
                Paste draft copy to identify and categorize all factual, statistical, and superlative claims.
              </p>
            </div>

            <form onSubmit={handleVerifyClaims} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#35252A] uppercase tracking-wider mb-1.5">
                  Content to Inspect
                </label>
                <textarea
                  rows={7}
                  required
                  placeholder="Paste marketing copy containing performance or metric claims..."
                  value={verifierInput}
                  onChange={(e) => setVerifierInput(e.target.value)}
                  className="w-full p-3.5 bg-[#F4EEE8] border border-[#E4D8D1] rounded-2xl text-xs sm:text-sm text-[#35252A] focus:outline-none focus:ring-2 focus:ring-[#652B39]/30 focus:border-[#652B39] resize-none leading-relaxed"
                />
              </div>

              <div className="p-3 rounded-xl bg-[#E8DED5]/40 text-xs text-[#806C68] space-y-1">
                <span className="font-semibold text-[#35252A] block">Proof Rule Invariant:</span>
                <p className="text-[11px] leading-relaxed">
                  Only the <strong>{claims.length} approved claims</strong> in your organization's ClaimShield vault are accepted as proof. AI statements are never considered proof.
                </p>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-[#806C68]">
                  Active vault: {claims.filter(c => c.status === 'active').length} active proofs
                </span>

                <button
                  type="submit"
                  disabled={isVerifying || !verifierInput.trim()}
                  className="px-5 py-2.5 rounded-xl bg-[#652B39] hover:bg-[#512331] text-white text-xs font-bold shadow-xs hover:shadow transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
                  <span>{isVerifying ? 'Verifying Claims...' : 'Run ClaimShield'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Results Box */}
          <div className="lg:col-span-7 bg-[#FFFAF5] rounded-3xl border border-[#E4D8D1] p-6 shadow-xs min-h-[460px] space-y-5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-bold text-[#35252A]">
                  Verification Findings
                </h3>
                {verificationStats && (
                  <span className="text-xs font-semibold text-[#806C68]">
                    {verificationFindings.length} Claims Detected
                  </span>
                )}
              </div>
              <p className="text-xs text-[#806C68]">
                Categorized strictly as Verified, Unsupported, Contradictory, Expired, or Needs manual review.
              </p>
            </div>

            {verificationStats && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
                <div className="p-2.5 rounded-xl bg-[#2E6F40]/10 border border-[#2E6F40]/20 text-center">
                  <span className="text-lg font-bold font-mono text-[#2E6F40] block">
                    {verificationStats.verified}
                  </span>
                  <span className="text-[10px] font-semibold text-[#2E6F40] uppercase">Verified</span>
                </div>

                <div className="p-2.5 rounded-xl bg-[#A3282C]/10 border border-[#A3282C]/20 text-center">
                  <span className="text-lg font-bold font-mono text-[#A3282C] block">
                    {verificationStats.unsupported}
                  </span>
                  <span className="text-[10px] font-semibold text-[#A3282C] uppercase">Unsupported</span>
                </div>

                <div className="p-2.5 rounded-xl bg-[#3D1B26] text-white border border-[#3D1B26] text-center">
                  <span className="text-lg font-bold font-mono block">
                    {verificationStats.contradictory}
                  </span>
                  <span className="text-[10px] font-semibold uppercase">Contradictory</span>
                </div>

                <div className="p-2.5 rounded-xl bg-[#B7791F]/15 border border-[#B7791F]/30 text-center">
                  <span className="text-lg font-bold font-mono text-[#975A16] block">
                    {verificationStats.expired}
                  </span>
                  <span className="text-[10px] font-semibold text-[#975A16] uppercase">Expired</span>
                </div>

                <div className="p-2.5 rounded-xl bg-[#E8DED5] border border-[#E4D8D1] text-center col-span-2 sm:col-span-1">
                  <span className="text-lg font-bold font-mono text-[#35252A] block">
                    {verificationStats.needsReview}
                  </span>
                  <span className="text-[10px] font-semibold text-[#35252A] uppercase">Review</span>
                </div>
              </div>
            )}

            {isVerifying ? (
              <div className="py-16 text-center text-xs text-[#806C68]">
                <RefreshCw className="w-8 h-8 text-[#652B39] animate-spin mx-auto mb-2" />
                <span>Cross-referencing assertions against certified ClaimShield database...</span>
              </div>
            ) : verificationFindings.length === 0 ? (
              <div className="py-16 text-center text-xs text-[#806C68] space-y-2">
                <ShieldCheck className="w-8 h-8 text-[#652B39] mx-auto" />
                <p>Run ClaimShield on the left to verify marketing assertions against certified proof documents.</p>
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[460px] overflow-y-auto pr-1">
                {verificationFindings.map((f) => {
                  const style = labelStyles[f.label] || labelStyles['Needs manual review'];
                  const Icon = style.icon;

                  return (
                    <div
                      key={f.id}
                      className="p-4 rounded-2xl bg-[#F4EEE8]/70 border border-[#E4D8D1] text-xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 border ${style.bg} ${style.text} ${style.border}`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{f.label}</span>
                        </span>

                        <span className="text-[10px] text-[#806C68] font-mono">
                          {f.confidence}% Certainty
                        </span>
                      </div>

                      {/* Snippet */}
                      <div className="p-2.5 rounded-xl bg-[#FFFAF5] border border-[#E4D8D1] text-[11px] text-[#35252A]">
                        <span className="text-[10px] uppercase font-bold text-[#806C68] block mb-0.5">
                          Detected Assertion:
                        </span>
                        <span className="font-semibold italic text-[#652B39]">
                          "{f.detectedClaimSnippet}"
                        </span>
                      </div>

                      {/* Explanation */}
                      <p className="text-[#35252A] leading-relaxed">
                        {f.explanation}
                      </p>

                      {/* Proof Document Citation */}
                      {f.sourceProof && (
                        <div className="flex items-center gap-1.5 text-[11px] text-[#2E6F40] bg-[#2E6F40]/5 p-2 rounded-lg border border-[#2E6F40]/15">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span><strong>Substantiation:</strong> {f.sourceProof}</span>
                        </div>
                      )}

                      {/* Action */}
                      <div className="text-[11px] text-[#806C68] pt-1 border-t border-[#E4D8D1]/60">
                        <strong>Action:</strong> {f.recommendedAction}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Add or Edit Approved Claim */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3D1B26]/40 backdrop-blur-xs">
          <div className="bg-[#FFFAF5] border border-[#E4D8D1] rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#652B39]/10 text-[#652B39] flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-[#35252A]">
                  {editingClaim ? 'Edit Approved Claim' : 'Register Approved Claim'}
                </h3>
              </div>
              <button
                onClick={resetForm}
                className="p-1 rounded-lg text-[#806C68] hover:text-[#35252A] hover:bg-[#E8DED5]/50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClaim} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#35252A] uppercase tracking-wider mb-1.5">
                  Certified Claim Statement
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. 99.98% platform reliability and sub-50ms latency across global clusters"
                  value={claimText}
                  onChange={(e) => setClaimText(e.target.value)}
                  className="w-full p-3.5 bg-[#F4EEE8] border border-[#E4D8D1] rounded-xl text-xs sm:text-sm text-[#35252A] focus:outline-none focus:ring-2 focus:ring-[#652B39]/30 focus:border-[#652B39] resize-none leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#35252A] uppercase tracking-wider mb-1.5">
                    Category Domain
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ClaimCategory)}
                    className="w-full px-3 py-2 bg-[#F4EEE8] border border-[#E4D8D1] rounded-xl text-xs text-[#35252A] focus:outline-none focus:ring-2 focus:ring-[#652B39]/30"
                  >
                    <option value="performance">Performance & Velocity</option>
                    <option value="financial">Financial / ROI Multiplier</option>
                    <option value="compliance">Compliance & Certifications</option>
                    <option value="security">Security & SLA</option>
                    <option value="customer">Customer Count / Scale</option>
                    <option value="award">Industry Award / Superlative</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#35252A] uppercase tracking-wider mb-1.5">
                    Proof Owner / Department
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Infrastructure Lead, Legal Counsel"
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#F4EEE8] border border-[#E4D8D1] rounded-xl text-xs text-[#35252A] focus:outline-none focus:ring-2 focus:ring-[#652B39]/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#35252A] uppercase tracking-wider mb-1.5">
                  Source Document Proof (Whitepaper, Audit, SOC 2)
                </label>
                <input
                  type="text"
                  placeholder="e.g. SOC 2 Type II Independent Audit Report dated Aug 2026, §4.3"
                  value={sourceDocument}
                  onChange={(e) => setSourceDocument(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#F4EEE8] border border-[#E4D8D1] rounded-xl text-xs text-[#35252A] focus:outline-none focus:ring-2 focus:ring-[#652B39]/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#35252A] uppercase tracking-wider mb-1.5">
                  Source Audit URL (Optional External Link)
                </label>
                <input
                  type="url"
                  placeholder="https://trust.company.com/sla-audit"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#F4EEE8] border border-[#E4D8D1] rounded-xl text-xs text-[#35252A] focus:outline-none focus:ring-2 focus:ring-[#652B39]/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#35252A] uppercase tracking-wider mb-1.5">
                    Certification Date
                  </label>
                  <input
                    type="date"
                    required
                    value={approvalDate}
                    onChange={(e) => setApprovalDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F4EEE8] border border-[#E4D8D1] rounded-xl text-xs text-[#35252A] focus:outline-none focus:ring-2 focus:ring-[#652B39]/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#35252A] uppercase tracking-wider mb-1.5">
                    Audit Expiry Date
                  </label>
                  <input
                    type="date"
                    required
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F4EEE8] border border-[#E4D8D1] rounded-xl text-xs text-[#35252A] focus:outline-none focus:ring-2 focus:ring-[#652B39]/30"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E4D8D1]">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-xs font-semibold text-[#806C68] hover:text-[#35252A] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!claimText.trim()}
                  className="px-5 py-2.5 rounded-xl bg-[#652B39] hover:bg-[#512331] text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {editingClaim ? 'Save Changes' : 'Certify Claim Proof'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
