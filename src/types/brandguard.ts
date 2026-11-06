export type RewriteGoal = 'polish' | 'compliance' | 'brevity' | 'claims';

export interface BrandGuardSuggestion {
  id: string;
  originalSnippet: string;
  suggestedSnippet: string;
  explanation: string;
  ruleCited: string;
  category: 'tone' | 'terminology' | 'claim' | 'disclaimer' | 'grammar' | 'format';
  status: 'pending' | 'accepted' | 'rejected';
}

export interface BrandGuardRewriteResult {
  originalText: string;
  rewrittenPreview: string;
  suggestions: BrandGuardSuggestion[];
  overallSummary: string;
  rulesEnforcedCount: number;
}
