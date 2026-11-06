export type ClaimVerificationStatus =
  | 'Verified'
  | 'Unsupported'
  | 'Contradictory'
  | 'Expired'
  | 'Needs manual review';

export type ClaimCategory =
  | 'performance'
  | 'financial'
  | 'compliance'
  | 'security'
  | 'customer'
  | 'award';

export interface ApprovedClaim {
  id: string;
  organizationId: string;
  claim: string;
  sourceUrl?: string;
  sourceDocument?: string;
  approvalDate: string;
  expiryDate: string;
  owner: string;
  category: ClaimCategory;
  status: 'active' | 'expired';
  createdAt: string;
  updatedAt: string;
}

export interface ClaimVerificationFinding {
  id: string;
  detectedClaimSnippet: string;
  label: ClaimVerificationStatus;
  matchedApprovedClaimId?: string;
  matchedClaimText?: string;
  sourceProof?: string;
  explanation: string;
  recommendedAction: string;
  confidence: number;
}
