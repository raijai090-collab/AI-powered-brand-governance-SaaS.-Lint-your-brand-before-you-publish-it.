export type ContentType = 'caption' | 'ad' | 'email' | 'blog';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type ViolationSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ViolationType =
  | 'banned_word'
  | 'preferred_term'
  | 'required_phrase'
  | 'disclaimer'
  | 'character_limit'
  | 'tone'
  | 'contextual'
  | 'claim';

export interface AnalysisViolation {
  id: string;
  type: ViolationType;
  severity: ViolationSeverity;
  explanation: string;
  evidenceQuote: string;
  sourceRule: string;
  recommendedFix: string;
  startOffset?: number;
  endOffset?: number;
}

export interface ContentAnalysisRecord {
  id: string;
  organizationId: string;
  authorId: string;
  authorEmail?: string;
  title: string;
  contentType: ContentType;
  content: string;
  characterCount: number;
  wordCount: number;
  score: number;
  riskLevel: RiskLevel;
  status: 'draft' | 'flagged' | 'pending_review' | 'approved' | 'rejected';
  violationCount: number;
  violations: AnalysisViolation[];
  verdict: string;
  createdAt: string;
  updatedAt: string;
}
