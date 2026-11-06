export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'changes_requested';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type ClaimsStatus = 'all_verified' | 'contains_unsupported' | 'contains_expired' | 'none';

export type ReviewActionType = 'submitted' | 'approved' | 'rejected' | 'requested_changes' | 'changes_requested' | 'commented';

export interface ApprovalRequest {
  id: string;
  organizationId: string;
  analysisId?: string;
  title: string;
  contentType: 'caption' | 'ad' | 'email' | 'blog';
  content: string;
  authorId: string;
  authorEmail: string;
  authorName: string;
  riskLevel: RiskLevel;
  brandScore: number;
  violationsCount: number;
  claimsStatus: ClaimsStatus;
  status: ApprovalStatus;
  assignedReviewerRole: 'reviewer' | 'org_admin' | 'super_admin';
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalAction {
  id: string;
  approvalId: string;
  organizationId: string;
  actorId: string;
  actorEmail: string;
  actorName: string;
  actorRole: 'super_admin' | 'org_admin' | 'reviewer' | 'creator';
  action: ReviewActionType;
  comment?: string;
  timestamp: string;
}

export interface AuditLogEntry {
  id: string;
  organizationId: string;
  entityType: 'approval' | 'guideline' | 'claim' | 'rule' | 'content';
  entityId: string;
  action: string;
  actorId: string;
  actorEmail: string;
  actorName: string;
  actorRole: string;
  details: string;
  timestamp: string;
}
