export type RuleCategory =
  | 'tone'
  | 'messaging'
  | 'terminology'
  | 'grammar'
  | 'visual identity'
  | 'colour'
  | 'logo'
  | 'typography'
  | 'disclaimers'
  | 'prohibited statements';

export type RuleStatus = 'pending' | 'approved' | 'rejected';

export interface ConstitutionRule {
  id: string;
  organizationId: string;
  guidelineId: string;
  version: number;
  title: string;
  category: RuleCategory;
  ruleText: string;
  sourcePage: string;
  confidence: number;
  status: RuleStatus;
  createdAt: string;
  updatedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  feedbackNote?: string;
}

export interface GuidelineVersion {
  id: string;
  organizationId: string;
  filename: string;
  fileType: 'pdf' | 'docx';
  fileSize: number;
  version: number;
  uploadedBy: string;
  uploadedByEmail?: string;
  uploadedAt: string;
  extractedRuleCount: number;
  status: 'processing' | 'completed' | 'error';
}

export const CATEGORY_METADATA: Record<RuleCategory, { label: string; color: string; bg: string; border: string }> = {
  'tone': {
    label: 'Tone & Voice',
    color: 'text-[#652B39]',
    bg: 'bg-[#652B39]/10',
    border: 'border-[#652B39]/20'
  },
  'messaging': {
    label: 'Brand Messaging',
    color: 'text-[#512331]',
    bg: 'bg-[#512331]/10',
    border: 'border-[#512331]/20'
  },
  'terminology': {
    label: 'Terminology & Lexicon',
    color: 'text-[#A3282C]',
    bg: 'bg-[#A3282C]/10',
    border: 'border-[#A3282C]/20'
  },
  'grammar': {
    label: 'Grammar & Style',
    color: 'text-[#35252A]',
    bg: 'bg-[#E8DED5]',
    border: 'border-[#E4D8D1]'
  },
  'visual identity': {
    label: 'Visual Identity',
    color: 'text-[#2D6A4F]',
    bg: 'bg-[#2D6A4F]/10',
    border: 'border-[#2D6A4F]/20'
  },
  'colour': {
    label: 'Colour Palette',
    color: 'text-[#652B39]',
    bg: 'bg-[#652B39]/15',
    border: 'border-[#652B39]/30'
  },
  'logo': {
    label: 'Logo & Lockups',
    color: 'text-[#3D1B26]',
    bg: 'bg-[#3D1B26]/10',
    border: 'border-[#3D1B26]/20'
  },
  'typography': {
    label: 'Typography Hierarchy',
    color: 'text-[#4A3B32]',
    bg: 'bg-[#E8DED5]/80',
    border: 'border-[#E4D8D1]'
  },
  'disclaimers': {
    label: 'Regulatory Disclaimers',
    color: 'text-[#B7791F]',
    bg: 'bg-[#B7791F]/10',
    border: 'border-[#B7791F]/20'
  },
  'prohibited statements': {
    label: 'Prohibited Statements',
    color: 'text-[#A3282C]',
    bg: 'bg-[#A3282C]/15',
    border: 'border-[#A3282C]/30'
  }
};
