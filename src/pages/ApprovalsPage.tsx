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
  ApprovalRequest,
  ApprovalAction,
  AuditLogEntry,
  ApprovalStatus,
  RiskLevel
} from '../types/approvals';
import {
  GitPullRequestDraft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ShieldAlert,
  ShieldCheck,
  Send,
  MessageSquare,
  Search,
  Filter,
  Check,
  X,
  RotateCcw,
  User,
  ArrowRight,
  Eye,
  FileText,
  History,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Copy,
  AlertOctagon,
  Lock
} from 'lucide-react';
import { EmptyState } from '../components/common/EmptyState';

export const ApprovalsPage: React.FC = () => {
  const { currentOrg, userProfile } = useAuth();
  const orgId = currentOrg?.id || '';

  const userRole = userProfile?.role || 'creator';
  const isSuperAdmin = userRole === 'super_admin';
  const isOrgAdmin = userRole === 'org_admin' || isSuperAdmin;
  const isReviewerOrAdmin = userRole === 'reviewer' || isOrgAdmin;

  // View Tabs: 'queue' (pending) | 'approved' | 'changes_requested' | 'rejected' | 'audit_log'
  const [activeTab, setActiveTab] = useState<'queue' | 'approved' | 'changes_requested' | 'rejected' | 'audit_log'>('queue');

  // Approvals & Audit Data State
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Risk Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<'all' | 'low' | 'medium' | 'high' | 'critical'>('all');

  // Active Selected Request for Review Drawer / Modal
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null);
  const [approvalActions, setApprovalActions] = useState<ApprovalAction[]>([]);
  const [loadingActions, setLoadingActions] = useState(false);

  // Review Decision Form State
  const [decisionComment, setDecisionComment] = useState('');
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);

  // New Submission Modal State (For creators to submit custom copy)
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContentType, setNewContentType] = useState<'caption' | 'ad' | 'email' | 'blog'>('caption');
  const [newContent, setNewContent] = useState('');
  const [newBrandScore, setNewBrandScore] = useState(88);
  const [newRiskLevel, setNewRiskLevel] = useState<RiskLevel>('low');

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Fetch Approvals from Firestore
  const loadApprovals = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const approvalsRef = collection(db, 'organizations', orgId, 'approvals');
      const snap = await getDocs(approvalsRef);
      const list: ApprovalRequest[] = [];
      snap.forEach((d) => {
        list.push(d.data() as ApprovalRequest);
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setApprovals(list);

      // Fetch Audit Logs
      const auditRef = collection(db, 'organizations', orgId, 'auditLogs');
      const auditSnap = await getDocs(auditRef);
      const auditList: AuditLogEntry[] = [];
      auditSnap.forEach((d) => {
        auditList.push(d.data() as AuditLogEntry);
      });
      auditList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setAuditLogs(auditList);
    } catch (err) {
      console.warn('Approvals fetch fallback:', err);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);

  // 2. Fetch Review History Actions when an approval is selected
  useEffect(() => {
    if (!orgId || !selectedApproval) {
      setApprovalActions([]);
      return;
    }
    const loadActions = async () => {
      setLoadingActions(true);
      try {
        const actionsRef = collection(db, 'organizations', orgId, 'approvals', selectedApproval.id, 'actions');
        const snap = await getDocs(actionsRef);
        const list: ApprovalAction[] = [];
        snap.forEach((d) => {
          list.push(d.data() as ApprovalAction);
        });
        list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        setApprovalActions(list);
      } catch (err) {
        console.warn('Approval actions fetch fallback:', err);
      } finally {
        setLoadingActions(false);
      }
    };
    loadActions();
  }, [orgId, selectedApproval]);

  // Helper: Append an Audit Log Entry
  const appendAuditLog = async (
    entityType: 'approval' | 'guideline' | 'claim' | 'rule' | 'content',
    entityId: string,
    action: string,
    details: string
  ) => {
    if (!orgId) return;
    const logId = `log_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();
    const logEntry: AuditLogEntry = {
      id: logId,
      organizationId: orgId,
      entityType,
      entityId,
      action,
      actorId: userProfile?.id || 'anonymous_user',
      actorEmail: userProfile?.email || '',
      actorName: userProfile?.displayName || 'BrandLint Reviewer',
      actorRole: userRole,
      details,
      timestamp: nowIso
    };

    try {
      await setDoc(doc(db, 'organizations', orgId, 'auditLogs', logId), logEntry);
      setAuditLogs((prev) => [logEntry, ...prev]);
    } catch (err) {
      console.warn('Audit log write error:', err);
    }
  };

  // Helper: Determine Risk-based Reviewer Routing
  const canUserReview = (req: ApprovalRequest) => {
    if (isSuperAdmin) return true;
    if (req.assignedReviewerRole === 'org_admin' || req.riskLevel === 'high' || req.riskLevel === 'critical') {
      return isOrgAdmin;
    }
    return isReviewerOrAdmin;
  };

  // 3. Process Review Decision (Approve / Request Changes / Reject)
  const handleDecision = async (decision: 'approved' | 'changes_requested' | 'rejected') => {
    if (!selectedApproval || !orgId) return;

    if ((decision === 'changes_requested' || decision === 'rejected') && !decisionComment.trim()) {
      alert(`Please provide explanatory feedback when choosing "${decision.replace('_', ' ')}".`);
      return;
    }

    setIsSubmittingDecision(true);
    const nowIso = new Date().toISOString();
    const actionId = `act_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

    const actionRecord: ApprovalAction = {
      id: actionId,
      approvalId: selectedApproval.id,
      organizationId: orgId,
      actorId: userProfile?.id || 'user',
      actorEmail: userProfile?.email || '',
      actorName: userProfile?.displayName || 'Reviewer',
      actorRole: userRole,
      action: decision,
      comment: decisionComment.trim() || (decision === 'approved' ? 'Signed off and approved for publication.' : ''),
      timestamp: nowIso
    };

    const updatedApproval: ApprovalRequest = {
      ...selectedApproval,
      status: decision,
      updatedAt: nowIso,
      ...(decision === 'approved' ? { approvedBy: userProfile?.displayName, approvedAt: nowIso } : {}),
      ...(decision === 'rejected' ? { rejectedBy: userProfile?.displayName, rejectedAt: nowIso, rejectionReason: decisionComment.trim() } : {})
    };

    try {
      // 1. Update Approval Document in Firestore
      await updateDoc(doc(db, 'organizations', orgId, 'approvals', selectedApproval.id), {
        status: decision,
        updatedAt: nowIso,
        ...(decision === 'approved' ? { approvedBy: userProfile?.displayName, approvedAt: nowIso } : {}),
        ...(decision === 'rejected' ? { rejectedBy: userProfile?.displayName, rejectedAt: nowIso, rejectionReason: decisionComment.trim() } : {})
      });

      // 2. Add Action Event Subdocument
      await setDoc(doc(db, 'organizations', orgId, 'approvals', selectedApproval.id, 'actions', actionId), actionRecord);

      // 3. Record in Audit Log
      const actionName = decision === 'approved' ? 'CONTENT_APPROVED' : decision === 'rejected' ? 'CONTENT_REJECTED' : 'CHANGES_REQUESTED';
      await appendAuditLog(
        'approval',
        selectedApproval.id,
        actionName,
        `Content draft "${selectedApproval.title}" marked as ${decision.toUpperCase()} by ${userProfile?.displayName} (${userRole}). Comment: "${decisionComment.trim() || 'No additional note'}"`
      );

      // Update Local State
      setApprovals((prev) => prev.map((a) => (a.id === selectedApproval.id ? updatedApproval : a)));
      setSelectedApproval(updatedApproval);
      setApprovalActions((prev) => [...prev, actionRecord]);
      setDecisionComment('');

      showToast(`Draft ${decision === 'approved' ? 'Approved & Certified' : decision.replace('_', ' ')}.`);
    } catch (err) {
      console.error('Decision error:', err);
      handleFirestoreError(err, OperationType.WRITE, `organizations/${orgId}/approvals/${selectedApproval.id}`);
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  // Add Comment Without Changing State
  const handleAddCommentOnly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApproval || !decisionComment.trim() || !orgId) return;

    setIsSubmittingDecision(true);
    const nowIso = new Date().toISOString();
    const actionId = `act_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

    const actionRecord: ApprovalAction = {
      id: actionId,
      approvalId: selectedApproval.id,
      organizationId: orgId,
      actorId: userProfile?.id || 'user',
      actorEmail: userProfile?.email || '',
      actorName: userProfile?.displayName || 'Reviewer',
      actorRole: userRole,
      action: 'commented',
      comment: decisionComment.trim(),
      timestamp: nowIso
    };

    try {
      await setDoc(doc(db, 'organizations', orgId, 'approvals', selectedApproval.id, 'actions', actionId), actionRecord);
      await appendAuditLog(
        'approval',
        selectedApproval.id,
        'COMMENT_POSTED',
        `Review comment added by ${userProfile?.displayName} on "${selectedApproval.title}"`
      );
      setApprovalActions((prev) => [...prev, actionRecord]);
      setDecisionComment('');
      showToast('Comment added to review history.');
    } catch (err) {
      console.warn('Add comment error:', err);
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  // 4. Create New Submission (Creator action)
  const handleCreateSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim() || !orgId) return;

    const nowIso = new Date().toISOString();
    const approvalId = `appr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

    // Risk-based routing calculation:
    // High / Critical requires Org Admin sign-off
    const assignedRole = newRiskLevel === 'high' || newRiskLevel === 'critical' ? 'org_admin' : 'reviewer';

    const newRecord: ApprovalRequest = {
      id: approvalId,
      organizationId: orgId,
      title: newTitle.trim(),
      contentType: newContentType,
      content: newContent.trim(),
      authorId: userProfile?.id || 'user',
      authorEmail: userProfile?.email || '',
      authorName: userProfile?.displayName || 'Content Creator',
      riskLevel: newRiskLevel,
      brandScore: newBrandScore,
      violationsCount: newRiskLevel === 'critical' ? 3 : newRiskLevel === 'high' ? 2 : newRiskLevel === 'medium' ? 1 : 0,
      claimsStatus: newRiskLevel === 'low' ? 'all_verified' : newRiskLevel === 'medium' ? 'none' : 'contains_unsupported',
      status: 'pending',
      assignedReviewerRole: assignedRole,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    const actionId = `act_sub_${Date.now().toString(36)}`;
    const actionRecord: ApprovalAction = {
      id: actionId,
      approvalId,
      organizationId: orgId,
      actorId: userProfile?.id || 'user',
      actorEmail: userProfile?.email || '',
      actorName: userProfile?.displayName || 'Content Creator',
      actorRole: userRole,
      action: 'submitted',
      comment: 'Initial draft submitted to brand governance queue.',
      timestamp: nowIso
    };

    try {
      await setDoc(doc(db, 'organizations', orgId, 'approvals', approvalId), newRecord);
      await setDoc(doc(db, 'organizations', orgId, 'approvals', approvalId, 'actions', actionId), actionRecord);
      await appendAuditLog(
        'approval',
        approvalId,
        'APPROVAL_SUBMITTED',
        `Draft "${newRecord.title}" (${newRecord.contentType}) submitted by ${newRecord.authorName}. Risk Level: ${newRecord.riskLevel.toUpperCase()}. Routed to: ${newRecord.assignedReviewerRole}.`
      );

      setApprovals((prev) => [newRecord, ...prev]);
      setSubmitModalOpen(false);
      setNewTitle('');
      setNewContent('');
      showToast('Draft submitted to Reviewer Queue.');
    } catch (err) {
      console.error('Submit error:', err);
      handleFirestoreError(err, OperationType.WRITE, `organizations/${orgId}/approvals/${approvalId}`);
    }
  };

  // 5. Seed Demonstration Workflow Data (3 items with realistic history)
  const handleSeedWorkflowData = async () => {
    if (!orgId) return;
    const now = Date.now();
    const nowIso = new Date().toISOString();
    const twoDaysAgoIso = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString();
    const oneDayAgoIso = new Date(now - 24 * 60 * 60 * 1000).toISOString();

    const seeds: ApprovalRequest[] = [
      {
        id: `appr_seed_1`,
        organizationId: orgId,
        title: 'Q4 Enterprise Product Launch Campaign',
        contentType: 'email',
        content: `Discover how BrandLint accelerates brand consistency across multi-channel publications. Our certified platform reduces governance turnaround time by 78% while maintaining uncompromised quality. Explore our enterprise solutions today.\n\n*Based on certified benchmark studies across pilot deployments.`,
        authorId: userProfile?.id || 'creator_seed',
        authorEmail: 'marketing.lead@brandlint.io',
        authorName: 'Alex Mercer (Campaign Lead)',
        riskLevel: 'low',
        brandScore: 92,
        violationsCount: 0,
        claimsStatus: 'all_verified',
        status: 'pending',
        assignedReviewerRole: 'reviewer',
        createdAt: oneDayAgoIso,
        updatedAt: oneDayAgoIso
      },
      {
        id: `appr_seed_2`,
        organizationId: orgId,
        title: 'Aggressive Social Ad Pitch with ROI Claims',
        contentType: 'ad',
        content: `Get our cheap platform now before slots run out! Guaranteed 10x ROI and 100% uptime with zero risk.`,
        authorId: 'creator_2',
        authorEmail: 'growth.specialist@brandlint.io',
        authorName: 'Elena Rostova (Growth Team)',
        riskLevel: 'critical',
        brandScore: 48,
        violationsCount: 4,
        claimsStatus: 'contains_unsupported',
        status: 'pending',
        assignedReviewerRole: 'org_admin', // Escalated!
        createdAt: twoDaysAgoIso,
        updatedAt: twoDaysAgoIso
      },
      {
        id: `appr_seed_3`,
        organizationId: orgId,
        title: 'SOC 2 Type II Security Whitepaper Announcement',
        contentType: 'blog',
        content: `We are pleased to announce the completion of our SOC 2 Type II certification, affirming our enterprise commitments to 99.98% platform reliability and zero-trust backend isolation.`,
        authorId: userProfile?.id || 'creator_seed',
        authorEmail: 'compliance.officer@brandlint.io',
        authorName: 'Marcus Vance (Chief Compliance Officer)',
        riskLevel: 'low',
        brandScore: 96,
        violationsCount: 0,
        claimsStatus: 'all_verified',
        status: 'approved',
        assignedReviewerRole: 'reviewer',
        approvedBy: 'Sarah Jenkins (Org Admin)',
        approvedAt: oneDayAgoIso,
        createdAt: twoDaysAgoIso,
        updatedAt: oneDayAgoIso
      }
    ];

    for (const seed of seeds) {
      try {
        await setDoc(doc(db, 'organizations', orgId, 'approvals', seed.id), seed);

        // Seed Submission Action
        const action1: ApprovalAction = {
          id: `act_${seed.id}_1`,
          approvalId: seed.id,
          organizationId: orgId,
          actorId: seed.authorId,
          actorEmail: seed.authorEmail,
          actorName: seed.authorName,
          actorRole: 'creator',
          action: 'submitted',
          comment: `Submitted "${seed.title}" for publication review.`,
          timestamp: seed.createdAt
        };
        await setDoc(doc(db, 'organizations', orgId, 'approvals', seed.id, 'actions', action1.id), action1);

        if (seed.status === 'approved') {
          const action2: ApprovalAction = {
            id: `act_${seed.id}_2`,
            approvalId: seed.id,
            organizationId: orgId,
            actorId: 'admin_reviewer',
            actorEmail: 'admin@brandlint.io',
            actorName: 'Sarah Jenkins',
            actorRole: 'org_admin',
            action: 'approved',
            comment: 'Fully aligned with Brand Constitution and active SOC 2 claim proofs. Certified for publication release.',
            timestamp: seed.approvedAt || nowIso
          };
          await setDoc(doc(db, 'organizations', orgId, 'approvals', seed.id, 'actions', action2.id), action2);
        }

        await appendAuditLog(
          'approval',
          seed.id,
          seed.status === 'approved' ? 'CONTENT_APPROVED' : 'APPROVAL_SUBMITTED',
          `Workflow record seeded for "${seed.title}". Status: ${seed.status.toUpperCase()}.`
        );
      } catch (err) {
        console.warn('Seed workflow fallback:', err);
      }
    }

    setApprovals((prev) => [...seeds, ...prev]);
    showToast('Seeded 3 workflow demonstrations into queue.');
  };

  // Filtered Approvals based on Tab & Search
  const filteredApprovals = useMemo(() => {
    return approvals.filter((a) => {
      // Tab Filter
      if (activeTab === 'queue' && a.status !== 'pending') return false;
      if (activeTab === 'approved' && a.status !== 'approved') return false;
      if (activeTab === 'changes_requested' && a.status !== 'changes_requested') return false;
      if (activeTab === 'rejected' && a.status !== 'rejected') return false;

      // Risk Filter
      if (riskFilter !== 'all' && a.riskLevel !== riskFilter) return false;

      // Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = a.title.toLowerCase().includes(q);
        const matchesAuthor = a.authorName.toLowerCase().includes(q);
        const matchesContent = a.content.toLowerCase().includes(q);
        if (!matchesTitle && !matchesAuthor && !matchesContent) return false;
      }

      return true;
    });
  }, [approvals, activeTab, riskFilter, searchQuery]);

  // Counts for Badges
  const pendingCount = approvals.filter((a) => a.status === 'pending').length;
  const approvedCount = approvals.filter((a) => a.status === 'approved').length;
  const changesCount = approvals.filter((a) => a.status === 'changes_requested').length;
  const rejectedCount = approvals.filter((a) => a.status === 'rejected').length;

  // Risk Badge Styling
  const getRiskBadge = (risk: RiskLevel) => {
    switch (risk) {
      case 'critical':
        return 'bg-[#3D1B26] text-white border-[#3D1B26]';
      case 'high':
        return 'bg-[#A3282C]/10 text-[#A3282C] border-[#A3282C]/30';
      case 'medium':
        return 'bg-[#B7791F]/15 text-[#975A16] border-[#B7791F]/30';
      default:
        return 'bg-[#2E6F40]/10 text-[#2E6F40] border-[#2E6F40]/30';
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
              Publication Approval Gate
            </h1>
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#652B39]/10 text-[#652B39] border border-[#652B39]/20">
              Risk-Based Routing
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#806C68]">
            Governed human sign-off pipeline for <strong className="text-[#35252A]">{currentOrg?.name}</strong>. Escalates high-risk copy directly to Organisation Admins.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {/* Submit New Draft for Review */}
          <button
            onClick={() => setSubmitModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#652B39] hover:bg-[#512331] text-white text-xs font-semibold shadow-xs hover:shadow transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Submit Copy for Approval</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#E4D8D1] pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'queue'
                ? 'bg-[#652B39] text-white shadow-xs'
                : 'text-[#806C68] hover:text-[#35252A] hover:bg-[#FFFAF5]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Reviewer Queue</span>
            {pendingCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${activeTab === 'queue' ? 'bg-white/20 text-white' : 'bg-[#652B39]/10 text-[#652B39]'}`}>
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
            <CheckCircle2 className="w-3.5 h-3.5 text-[#2E6F40]" />
            <span>Approved ({approvedCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('changes_requested')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'changes_requested'
                ? 'bg-[#652B39] text-white shadow-xs'
                : 'text-[#806C68] hover:text-[#35252A] hover:bg-[#FFFAF5]'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#975A16]" />
            <span>Changes Requested ({changesCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('rejected')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'rejected'
                ? 'bg-[#652B39] text-white shadow-xs'
                : 'text-[#806C68] hover:text-[#35252A] hover:bg-[#FFFAF5]'
            }`}
          >
            <XCircle className="w-3.5 h-3.5 text-[#A3282C]" />
            <span>Rejected ({rejectedCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('audit_log')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'audit_log'
                ? 'bg-[#652B39] text-white shadow-xs'
                : 'text-[#806C68] hover:text-[#35252A] hover:bg-[#FFFAF5]'
            }`}
          >
            <History className="w-3.5 h-3.5 text-[#652B39]" />
            <span>Governance Audit Log ({auditLogs.length})</span>
          </button>
        </div>

        {approvals.length === 0 && (
          <button
            onClick={handleSeedWorkflowData}
            className="text-xs font-bold text-[#652B39] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Seed 3 Workflow Demonstrations</span>
          </button>
        )}
      </div>

      {/* Main Content Area */}
      {activeTab === 'audit_log' ? (
        /* View: Organization Governance Audit Log */
        <div className="bg-[#FFFAF5] rounded-3xl border border-[#E4D8D1] p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#35252A]">
                Immutable Governance Audit Log
              </h2>
              <p className="text-xs text-[#806C68] mt-0.5">
                Cryptographically recorded audit trail of all approvals, rejections, claim certifications, and constitutional updates.
              </p>
            </div>
            <span className="text-xs font-mono font-semibold px-3 py-1 rounded-full bg-[#2E6F40]/10 text-[#2E6F40] border border-[#2E6F40]/20 flex items-center gap-1.5 self-start sm:self-auto">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Tamper-Resistant Log</span>
            </span>
          </div>

          {auditLogs.length === 0 ? (
            <div className="py-16 text-center text-xs text-[#806C68]">
              <History className="w-8 h-8 text-[#652B39] mx-auto mb-2" />
              <span>No governance actions recorded yet. Sign-offs and decisions will appear here automatically.</span>
            </div>
          ) : (
            <div className="divide-y divide-[#E4D8D1]/70">
              {auditLogs.map((log) => (
                <div key={log.id} className="py-3.5 flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#652B39]/10 text-[#652B39]">
                        {log.action}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-[#E8DED5] text-[#35252A]">
                        {log.entityType}
                      </span>
                      <span className="text-[11px] font-medium text-[#35252A]">
                        by <strong>{log.actorName}</strong> ({log.actorRole.replace('_', ' ')})
                      </span>
                    </div>
                    <p className="text-[#35252A] leading-relaxed font-mono text-[11px]">
                      {log.details}
                    </p>
                  </div>

                  <span className="text-[10px] text-[#806C68] font-mono shrink-0">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* View: Approval Queue / Filtered Lists */
        <div className="space-y-4">
          {/* Search & Filter Strip */}
          <div className="bg-[#FFFAF5] p-4 rounded-2xl border border-[#E4D8D1] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#806C68] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search draft copy, title, or author name..."
                className="w-full pl-10 pr-4 py-2 bg-[#F4EEE8] border border-[#E4D8D1] rounded-xl text-xs sm:text-sm text-[#35252A] placeholder-[#806C68]/60 focus:outline-none focus:ring-2 focus:ring-[#652B39]/30 focus:border-[#652B39]"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#806C68] uppercase">Risk Tier:</span>
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value as any)}
                className="px-3 py-1.5 bg-[#F4EEE8] border border-[#E4D8D1] rounded-xl text-xs text-[#35252A] focus:outline-none focus:ring-2 focus:ring-[#652B39]/30 cursor-pointer"
              >
                <option value="all">All Risk Levels</option>
                <option value="low">Low Risk (Score &ge; 85)</option>
                <option value="medium">Medium Risk (Score 70-84)</option>
                <option value="high">High Risk (Score 55-69)</option>
                <option value="critical">Critical Risk (Score &lt; 55)</option>
              </select>
            </div>
          </div>

          {filteredApprovals.length === 0 ? (
            <div className="bg-[#FFFAF5] rounded-3xl border border-[#E4D8D1] p-8 shadow-xs">
              <EmptyState
                icon={GitPullRequestDraft}
                badge={activeTab === 'queue' ? 'Queue Empty' : `${activeTab.replace('_', ' ').toUpperCase()} Empty`}
                title={
                  activeTab === 'queue'
                    ? 'No Content Awaiting Review'
                    : `No ${activeTab.replace('_', ' ')} Drafts Found`
                }
                description="The approval gate ensures every marketing piece is vetted against your Brand Constitution and ClaimShield proofs before public release."
                actionLabel="Submit Draft for Approval"
                onAction={() => setSubmitModalOpen(true)}
                secondaryActionLabel="Seed 3 Workflow Demonstrations"
                onSecondaryAction={handleSeedWorkflowData}
                tips={[
                  {
                    title: 'Risk-Based Escalation',
                    desc: 'Low-risk copy can be signed off by any designated Reviewer. High or Critical risk triggers an mandatory escalation to Organisation Admins.'
                  },
                  {
                    title: 'Actionable Revisions',
                    desc: 'Reviewers can return drafts with constructive comments instead of outright rejection.'
                  },
                  {
                    title: 'ClaimShield Certification',
                    desc: 'Submissions containing unverified claims cannot be certified without legal proof documentation.'
                  }
                ]}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredApprovals.map((req) => {
                const isEscalation = req.riskLevel === 'high' || req.riskLevel === 'critical';
                const userCanReview = canUserReview(req);

                return (
                  <div
                    key={req.id}
                    className={`p-5 rounded-3xl border transition-all flex flex-col justify-between ${
                      isEscalation && req.status === 'pending'
                        ? 'bg-[#FFFAF5] border-[#3D1B26] shadow-sm hover:border-[#652B39]'
                        : 'bg-[#FFFAF5] border-[#E4D8D1] shadow-xs hover:border-[#652B39]/40'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Top Meta Bar */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#652B39]/10 text-[#652B39]">
                          {req.contentType}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getRiskBadge(req.riskLevel)}`}>
                            {req.riskLevel} Risk
                          </span>

                          <span className="text-xs font-mono font-bold text-[#35252A] bg-[#F4EEE8] px-2 py-0.5 rounded">
                            {req.brandScore}/100
                          </span>
                        </div>
                      </div>

                      {/* Escalation Pill if High/Critical */}
                      {isEscalation && req.status === 'pending' && (
                        <div className="p-2 rounded-xl bg-[#3D1B26] text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <Lock className="w-3 h-3 shrink-0" />
                          <span>Escalated to Org Admin</span>
                        </div>
                      )}

                      {/* Title & Author */}
                      <div>
                        <h3 className="text-sm font-bold text-[#35252A] leading-snug line-clamp-2">
                          {req.title}
                        </h3>
                        <span className="text-[11px] text-[#806C68] block mt-0.5">
                          Submitted by <strong>{req.authorName}</strong>
                        </span>
                      </div>

                      {/* Excerpt */}
                      <p className="text-xs text-[#806C68] font-serif leading-relaxed line-clamp-3 bg-[#F4EEE8]/60 p-3 rounded-xl border border-[#E4D8D1]/70">
                        "{req.content}"
                      </p>

                      {/* ClaimShield Verification Tag */}
                      <div className="flex items-center justify-between text-[11px] text-[#806C68] pt-1">
                        <span className="flex items-center gap-1">
                          {req.claimsStatus === 'all_verified' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#2E6F40]" />
                          ) : req.claimsStatus === 'contains_unsupported' ? (
                            <AlertOctagon className="w-3.5 h-3.5 text-[#A3282C]" />
                          ) : (
                            <ShieldCheck className="w-3.5 h-3.5 text-[#806C68]" />
                          )}
                          <span>
                            {req.claimsStatus === 'all_verified'
                              ? 'ClaimShield Verified'
                              : req.claimsStatus === 'contains_unsupported'
                              ? 'Unverified Claims'
                              : 'Standard Copy'}
                          </span>
                        </span>

                        <span className="font-mono text-[10px]">
                          {new Date(req.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Card Footer Button */}
                    <div className="pt-4 mt-3 border-t border-[#E4D8D1]/70 flex items-center justify-between">
                      <span className="text-[11px] font-medium capitalize text-[#806C68]">
                        Status: <strong className={req.status === 'approved' ? 'text-[#2E6F40]' : req.status === 'rejected' ? 'text-[#A3282C]' : 'text-[#652B39]'}>
                          {req.status.replace('_', ' ')}
                        </strong>
                      </span>

                      <button
                        onClick={() => setSelectedApproval(req)}
                        className="px-3.5 py-1.5 rounded-xl bg-[#652B39] hover:bg-[#512331] text-white text-xs font-semibold shadow-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Review Console</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Review Console Modal / Drawer */}
      {selectedApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3D1B26]/40 backdrop-blur-xs">
          <div className="bg-[#FFFAF5] border border-[#E4D8D1] rounded-3xl p-6 sm:p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-150 space-y-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-[#E4D8D1] pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#652B39]/10 text-[#652B39]">
                    {selectedApproval.contentType}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getRiskBadge(selectedApproval.riskLevel)}`}>
                    {selectedApproval.riskLevel} Risk
                  </span>
                  <span className="text-xs font-mono font-bold text-[#35252A] bg-[#F4EEE8] px-2 py-0.5 rounded">
                    Score: {selectedApproval.brandScore}/100
                  </span>
                </div>
                <h2 className="text-lg font-extrabold text-[#35252A]">
                  {selectedApproval.title}
                </h2>
                <span className="text-xs text-[#806C68]">
                  Submitted by {selectedApproval.authorName} ({selectedApproval.authorEmail}) on{' '}
                  {new Date(selectedApproval.createdAt).toLocaleString()}
                </span>
              </div>

              <button
                onClick={() => setSelectedApproval(null)}
                className="p-1.5 rounded-lg text-[#806C68] hover:text-[#35252A] hover:bg-[#E8DED5]/60 cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Risk-Routing Advisory */}
            {(selectedApproval.riskLevel === 'high' || selectedApproval.riskLevel === 'critical') && (
              <div className="p-3.5 rounded-2xl bg-[#3D1B26] text-white text-xs flex items-center gap-3">
                <ShieldAlert className="w-5 h-5 text-[#FFFAF5] shrink-0" />
                <div>
                  <span className="font-bold block">
                    Escalated Governance Routing: Organisation Admin Signature Required
                  </span>
                  <span className="text-[11px] opacity-80">
                    This draft triggered severe tone violations or unverified claims. Standard Reviewers cannot approve this item.
                  </span>
                </div>
              </div>
            )}

            {/* Content Inspection Pane */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-[#35252A] uppercase tracking-wider block">
                Submitted Marketing Copy
              </span>
              <div className="p-4 rounded-2xl bg-[#F4EEE8]/80 border border-[#E4D8D1] text-xs font-serif text-[#35252A] leading-relaxed whitespace-pre-wrap">
                {selectedApproval.content}
              </div>
            </div>

            {/* Review History Timeline */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-bold text-[#35252A] uppercase tracking-wider block">
                Review History & Audit Trail
              </span>

              {loadingActions ? (
                <div className="py-6 text-center text-xs text-[#806C68]">Loading review actions...</div>
              ) : approvalActions.length === 0 ? (
                <div className="p-3 rounded-xl bg-[#F4EEE8]/60 text-xs text-[#806C68]">No comments or actions logged yet.</div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {approvalActions.map((act) => (
                    <div key={act.id} className="p-3 rounded-xl bg-[#F4EEE8]/70 border border-[#E4D8D1] text-xs space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-[#35252A]">
                          {act.actorName} ({act.actorRole.replace('_', ' ')})
                        </span>
                        <span className="text-[10px] text-[#806C68]">
                          {new Date(act.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          act.action === 'approved' ? 'bg-[#2E6F40]/15 text-[#2E6F40]' :
                          act.action === 'rejected' ? 'bg-[#A3282C]/15 text-[#A3282C]' :
                          act.action === 'requested_changes' ? 'bg-[#B7791F]/15 text-[#975A16]' :
                          'bg-[#652B39]/10 text-[#652B39]'
                        }`}>
                          {act.action.replace('_', ' ')}
                        </span>
                        <p className="text-[#35252A] text-[11px] leading-relaxed">
                          {act.comment}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reviewer Action Console */}
            {selectedApproval.status === 'pending' ? (
              <div className="space-y-4 pt-4 border-t border-[#E4D8D1]">
                <div>
                  <label className="block text-xs font-bold text-[#35252A] uppercase tracking-wider mb-1.5">
                    Reviewer Notes / Feedback Comment
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide constructive feedback, approval rationale, or requested edits..."
                    value={decisionComment}
                    onChange={(e) => setDecisionComment(e.target.value)}
                    className="w-full p-3 bg-[#F4EEE8] border border-[#E4D8D1] rounded-xl text-xs text-[#35252A] focus:outline-none focus:ring-2 focus:ring-[#652B39]/30 focus:border-[#652B39] resize-none"
                  />
                </div>

                <div className="flex items-center justify-between flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleAddCommentOnly}
                    disabled={isSubmittingDecision || !decisionComment.trim()}
                    className="px-3.5 py-2 rounded-xl bg-[#F4EEE8] hover:bg-[#E8DED5] text-xs font-semibold text-[#35252A] transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Post Comment Only</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {/* Request Changes */}
                    <button
                      type="button"
                      onClick={() => handleDecision('changes_requested')}
                      disabled={isSubmittingDecision}
                      className="px-3.5 py-2 rounded-xl bg-[#B7791F]/15 hover:bg-[#B7791F]/25 text-[#975A16] text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Request Changes</span>
                    </button>

                    {/* Reject */}
                    <button
                      type="button"
                      onClick={() => handleDecision('rejected')}
                      disabled={isSubmittingDecision}
                      className="px-3.5 py-2 rounded-xl bg-[#A3282C]/15 hover:bg-[#A3282C]/25 text-[#A3282C] text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>

                    {/* Approve */}
                    <button
                      type="button"
                      onClick={() => handleDecision('approved')}
                      disabled={isSubmittingDecision || !canUserReview(selectedApproval)}
                      className={`px-4 py-2 rounded-xl text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 ${
                        canUserReview(selectedApproval)
                          ? 'bg-[#2E6F40] hover:bg-[#255733] cursor-pointer'
                          : 'bg-gray-400 cursor-not-allowed opacity-60'
                      }`}
                      title={!canUserReview(selectedApproval) ? 'Requires Org Admin role' : undefined}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve & Certify</span>
                    </button>
                  </div>
                </div>

                {!canUserReview(selectedApproval) && (
                  <p className="text-[11px] text-[#A3282C] font-semibold text-right">
                    * Escalated copy requires Organisation Admin or Super Admin privileges to certify.
                  </p>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-[#F4EEE8]/70 border border-[#E4D8D1] flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#35252A] block capitalize">
                    Decision: {selectedApproval.status.replace('_', ' ')}
                  </span>
                  <span className="text-[11px] text-[#806C68]">
                    {selectedApproval.status === 'approved'
                      ? `Certified by ${selectedApproval.approvedBy} on ${new Date(selectedApproval.approvedAt || '').toLocaleDateString()}`
                      : `Reviewed on ${new Date(selectedApproval.updatedAt).toLocaleDateString()}`}
                  </span>
                </div>

                <span className="px-3 py-1 rounded-full text-xs font-bold capitalize bg-[#652B39]/10 text-[#652B39]">
                  {selectedApproval.status}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Submit Copy for Approval */}
      {submitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3D1B26]/40 backdrop-blur-xs">
          <div className="bg-[#FFFAF5] border border-[#E4D8D1] rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#652B39]/10 text-[#652B39] flex items-center justify-center">
                  <Send className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-[#35252A]">
                  Submit Marketing Copy for Approval
                </h3>
              </div>
              <button
                onClick={() => setSubmitModalOpen(false)}
                className="p-1 rounded-lg text-[#806C68] hover:text-[#35252A] hover:bg-[#E8DED5]/50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmission} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#35252A] uppercase tracking-wider mb-1.5">
                  Campaign / Publication Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q4 Growth - LinkedIn Enterprise Announcement"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#F4EEE8] border border-[#E4D8D1] rounded-xl text-xs sm:text-sm text-[#35252A] focus:outline-none focus:ring-2 focus:ring-[#652B39]/30 focus:border-[#652B39]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#35252A] uppercase tracking-wider mb-1.5">
                    Format
                  </label>
                  <select
                    value={newContentType}
                    onChange={(e) => setNewContentType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#F4EEE8] border border-[#E4D8D1] rounded-xl text-xs text-[#35252A] focus:outline-none focus:ring-2 focus:ring-[#652B39]/30"
                  >
                    <option value="caption">Social Caption</option>
                    <option value="ad">Ad Headline</option>
                    <option value="email">Email Newsletter</option>
                    <option value="blog">Blog Article</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#35252A] uppercase tracking-wider mb-1.5">
                    Assessed Risk Level
                  </label>
                  <select
                    value={newRiskLevel}
                    onChange={(e) => setNewRiskLevel(e.target.value as RiskLevel)}
                    className="w-full px-3 py-2 bg-[#F4EEE8] border border-[#E4D8D1] rounded-xl text-xs text-[#35252A] focus:outline-none focus:ring-2 focus:ring-[#652B39]/30"
                  >
                    <option value="low">Low Risk (Standard Review)</option>
                    <option value="medium">Medium Risk</option>
                    <option value="high">High Risk (Escalate to Admin)</option>
                    <option value="critical">Critical Risk (Escalate to Admin)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#35252A] uppercase tracking-wider mb-1.5">
                  Draft Copy Content
                </label>
                <textarea
                  rows={5}
                  required
                  placeholder="Paste marketing copy for publication review..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full p-3.5 bg-[#F4EEE8] border border-[#E4D8D1] rounded-xl text-xs sm:text-sm text-[#35252A] focus:outline-none focus:ring-2 focus:ring-[#652B39]/30 focus:border-[#652B39] resize-none leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-[#806C68] p-3 rounded-xl bg-[#F4EEE8]/70 border border-[#E4D8D1]">
                <span>Routing:</span>
                <strong className="text-[#652B39]">
                  {newRiskLevel === 'high' || newRiskLevel === 'critical'
                    ? 'Escalated to Org Admin'
                    : 'Designated Reviewers'}
                </strong>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E4D8D1]">
                <button
                  type="button"
                  onClick={() => setSubmitModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#806C68] hover:text-[#35252A] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newTitle.trim() || !newContent.trim()}
                  className="px-5 py-2.5 rounded-xl bg-[#652B39] hover:bg-[#512331] text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  Submit to Queue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
