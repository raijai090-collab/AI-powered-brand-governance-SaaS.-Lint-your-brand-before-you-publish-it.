import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BrandLogo } from '../components/common/BrandLogo';
import {
  ShieldCheck,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock,
  Layers,
  Search,
  Scale,
  Users2,
  Lock,
  ChevronDown,
  Check,
  RefreshCw,
  HelpCircle,
  Zap,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

interface PricingPlan {
  id: string;
  name: string;
  badge?: string;
  price: {
    monthly: string;
    annual: string;
  };
  description: string;
  features: string[];
  highlighted?: boolean;
  ctaText: string;
}

export const LandingPage: React.FC = () => {
  // Pricing plans state loaded from backend configuration
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [pricingLoading, setPricingLoading] = useState(true);

  // Demo interactive state
  const demoSamples = [
    {
      label: 'SaaS Launch Copy (High Risk)',
      text: 'Our #1 platform is 100% guaranteed to give you 10x ROI in 30 days. It is cheap, budget-friendly and easy. Act now before prices increase!'
    },
    {
      label: 'Enterprise Solution (Medium Risk)',
      text: 'Deploy the best in the world brand safety solution. We guarantee 10x productivity gains for every enterprise marketer.'
    },
    {
      label: 'Approved Brand Compliant Copy',
      text: 'Accelerate content velocity with BrandLint. Our automated brand governance platform helps enterprise marketing teams review messaging, verify claim citations, and protect brand identity before publication.'
    }
  ];

  const [demoInput, setDemoInput] = useState(demoSamples[0].text);
  const [demoResult, setDemoResult] = useState<{
    score: number;
    verdict: string;
    issueCount: number;
    issues: Array<{
      type: string;
      severity: string;
      snippet: string;
      issue: string;
      suggestion: string;
      evidence: string;
    }>;
  } | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);

  // FAQ Accordion state
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Fetch Pricing configuration from backend
  useEffect(() => {
    async function loadPricing() {
      try {
        const res = await fetch('/api/config/pricing');
        if (res.ok) {
          const data = await res.json();
          if (data?.data?.plans) {
            setPlans(data.data.plans);
          }
        }
      } catch (err) {
        console.warn('Unable to load remote pricing config:', err);
      } finally {
        setPricingLoading(false);
      }
    }
    loadPricing();
  }, []);

  // Run initial demo check on mount
  useEffect(() => {
    handleRunDemo(demoSamples[0].text);
  }, []);

  const handleRunDemo = async (textToLint: string) => {
    setDemoLoading(true);
    try {
      const res = await fetch('/api/lint/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: textToLint })
      });
      if (res.ok) {
        const json = await res.json();
        setDemoResult(json.data);
      }
    } catch (err) {
      console.error('Demo lint error:', err);
    } finally {
      setDemoLoading(false);
    }
  };

  const faqs = [
    {
      q: 'How does BrandLint differ from conventional grammar checkers?',
      a: 'Grammar tools only verify spelling and punctuation. BrandLint is an enterprise brand governance compiler: it checks copy against your organization\'s specific Brand Constitution, tests claims for evidentiary citations via ClaimShield, enforces mandatory legal disclaimers, and gates publishing through verified human-in-the-loop workflows.'
    },
    {
      q: 'How are multi-tenant permissions and roles enforced?',
      a: 'Every organization is an isolated tenant. Permissions are strictly checked on both the Node backend and hardened Firestore security rules. Roles include Super Admin, Organisation Admin, Content Creator, and Reviewer. First registered user in an organization automatically receives Organisation Admin privileges.'
    },
    {
      q: 'Can we define custom claim rules and disclaimer formulas?',
      a: 'Yes. In the Brand Constitution, administrators define custom prohibited terms, voice dimensions, and required footnote disclaimers triggered whenever specific words or financial projections (e.g., "10x ROI", "save 50%") appear.'
    },
    {
      q: 'Is our unreleased marketing copy private and secure?',
      a: 'Absolutely. We enforce zero-trust tenant boundaries. Your draft copy is never used to train public foundation models, and tenant data is isolated strictly by organizationId with server-side validation.'
    },
    {
      q: 'How does human approval integration work?',
      a: 'Once copy is analyzed and achieves the minimum required brand score threshold, it automatically routes to assigned reviewers for sign-off. Any flagged critical claim blocks publication until certified.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#F4EEE8] text-[#35252A] flex flex-col selection:bg-[#652B39] selection:text-white">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-[#FFFAF5]/90 backdrop-blur-md border-b border-[#E4D8D1] px-4 sm:px-8 py-3.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/">
            <BrandLogo size="md" showTagline={false} />
          </Link>

          <nav className="hidden lg:flex items-center gap-7 text-xs font-semibold text-[#806C68]">
            <a href="#problem" className="hover:text-[#35252A] transition-colors">Problem</a>
            <a href="#solution" className="hover:text-[#35252A] transition-colors">Solution</a>
            <a href="#how-it-works" className="hover:text-[#35252A] transition-colors">How It Works</a>
            <a href="#features" className="hover:text-[#35252A] transition-colors">Features</a>
            <a href="#demo" className="hover:text-[#35252A] transition-colors">Live Demo</a>
            <a href="#pricing" className="hover:text-[#35252A] transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-[#35252A] transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 text-xs font-semibold text-[#35252A] hover:text-[#652B39] transition-colors cursor-pointer"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 rounded-xl bg-[#652B39] hover:bg-[#512331] text-white text-xs font-semibold shadow-xs hover:shadow transition-all cursor-pointer"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 sm:pt-24 sm:pb-28 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Hero Left Column */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FFFAF5] border border-[#E4D8D1] shadow-xs">
                <span className="w-2 h-2 rounded-full bg-[#2E6F40] animate-pulse" />
                <span className="text-xs font-semibold text-[#652B39] tracking-wide uppercase">
                  Pre-Publication Brand Governance Platform
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#35252A] leading-[1.12]">
                Your brand deserves <span className="text-[#652B39]">consistency.</span>
              </h1>

              <p className="text-base sm:text-lg text-[#806C68] max-w-xl leading-relaxed">
                Review every message, verify every claim and protect your brand identity before content goes live.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  to="/register"
                  className="px-6 py-3.5 rounded-xl bg-[#652B39] hover:bg-[#512331] text-white text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-98"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <a
                  href="#demo"
                  className="px-6 py-3.5 rounded-xl bg-[#FFFAF5] hover:bg-[#E8DED5]/60 border border-[#E4D8D1] text-[#35252A] text-sm font-bold shadow-xs hover:border-[#652B39]/40 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-[#652B39]" />
                  <span>Explore Platform</span>
                </a>
              </div>

              <div className="pt-4 flex flex-wrap items-center gap-6 text-xs text-[#806C68]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#2E6F40]" />
                  <span>Zero-Trust Multi-Tenant</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#2E6F40]" />
                  <span>ClaimShield™ Evidence Engine</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#2E6F40]" />
                  <span>Strict RBAC Governance</span>
                </div>
              </div>
            </div>

            {/* Hero Right Column: Subtle 3D Hero Visual (Allowed 3D Surface) */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md">
                {/* Layered 3D Shadow Backdrop */}
                <div className="absolute -inset-2 rounded-3xl bg-gradient-to-tr from-[#652B39]/15 to-[#806C68]/10 blur-xl -z-10" />

                {/* 3D Main Surface Card */}
                <div className="surface-3d rounded-3xl p-6 sm:p-7 relative border border-[#E4D8D1] shadow-2xl">
                  {/* Visual Header */}
                  <div className="flex items-center justify-between border-b border-[#E4D8D1] pb-4 mb-5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-3 h-3 rounded-full bg-[#A3282C]/70" />
                      <div className="w-3 h-3 rounded-full bg-[#B7791F]/70" />
                      <div className="w-3 h-3 rounded-full bg-[#2E6F40]/70" />
                      <span className="text-xs font-mono font-medium text-[#806C68] ml-2">
                        brandlint-audit.spec
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#2E6F40]/10 text-[#2E6F40]">
                      Protected
                    </span>
                  </div>

                  {/* 3D Brand Score Visual Accent (Allowed 3D element) */}
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-[#FFFAF5] border border-[#E4D8D1] shadow-inner mb-5">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#806C68] block">
                        Brand Integrity Score
                      </span>
                      <span className="text-2xl font-extrabold text-[#35252A] tracking-tight">
                        96.4 <span className="text-sm font-semibold text-[#2E6F40]">/ 100</span>
                      </span>
                    </div>

                    <div className="score-orb-3d w-14 h-14 rounded-full flex items-center justify-center border border-[#E4D8D1]">
                      <span className="text-xs font-mono font-bold text-[#652B39]">PASS</span>
                    </div>
                  </div>

                  {/* Inspection Findings Simulation */}
                  <div className="space-y-2.5 text-xs">
                    <div className="p-3 rounded-xl bg-[#F4EEE8]/70 border border-[#E4D8D1] flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#2E6F40] shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-[#35252A] block">Tone Alignment Verified</span>
                        <span className="text-[11px] text-[#806C68]">Voice: Authoritative & consultative; zero panic framing.</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#F4EEE8]/70 border border-[#E4D8D1] flex items-start gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-[#652B39] shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-[#35252A] block">ClaimShield™ Substantiated</span>
                        <span className="text-[11px] text-[#806C68]">All benchmarks corroborated by third-party audit.</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#F4EEE8]/70 border border-[#E4D8D1] flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#2E6F40] shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-[#35252A] block">Regulatory Footnote Attached</span>
                        <span className="text-[11px] text-[#806C68]">Required compliance footnote disclaimer present.</span>
                      </div>
                    </div>
                  </div>

                  {/* Sign-off badge */}
                  <div className="mt-5 pt-4 border-t border-[#E4D8D1] flex items-center justify-between text-[11px] text-[#806C68]">
                    <span>Human Approval Gate:</span>
                    <span className="font-semibold text-[#652B39] flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Signed off by Org Admin
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section id="problem" className="py-20 bg-[#FFFAF5] border-y border-[#E4D8D1]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="max-w-2xl mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-[#652B39]">
              The Problem
            </span>
            <h2 className="text-3xl font-extrabold text-[#35252A] tracking-tight mt-2">
              Unchecked marketing copy damages brand equity and invites liability.
            </h2>
            <p className="text-sm sm:text-base text-[#806C68] mt-3 leading-relaxed">
              When fast-moving teams publish content without strict governance, preventable mistakes bypass manual review and erode enterprise credibility.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-[#F4EEE8]/80 border border-[#E4D8D1] transition-transform hover:-translate-y-1">
              <div className="w-10 h-10 rounded-xl bg-[#A3282C]/10 text-[#A3282C] flex items-center justify-center mb-4">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#35252A] mb-2">Off-Brand Tone Drift</h3>
              <p className="text-xs text-[#806C68] leading-relaxed">
                Writers and contractors unintentionally introduce cheapening urgency, hyperbolic hype, or colloquial language that violates your brand voice.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#F4EEE8]/80 border border-[#E4D8D1] transition-transform hover:-translate-y-1">
              <div className="w-10 h-10 rounded-xl bg-[#B7791F]/10 text-[#B7791F] flex items-center justify-center mb-4">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#35252A] mb-2">Unsubstantiated Claims</h3>
              <p className="text-xs text-[#806C68] leading-relaxed">
                Superlatives like "#1 rated" or "100% guaranteed" slip through without verification citations, exposing the firm to regulatory scrutiny.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#F4EEE8]/80 border border-[#E4D8D1] transition-transform hover:-translate-y-1">
              <div className="w-10 h-10 rounded-xl bg-[#652B39]/10 text-[#652B39] flex items-center justify-center mb-4">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#35252A] mb-2">Missing Legal Disclaimers</h3>
              <p className="text-xs text-[#806C68] leading-relaxed">
                Financial multipliers, performance projections, and benchmark results published without mandatory compliance footnotes.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#F4EEE8]/80 border border-[#E4D8D1] transition-transform hover:-translate-y-1">
              <div className="w-10 h-10 rounded-xl bg-[#3D1B26]/10 text-[#3D1B26] flex items-center justify-center mb-4">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#35252A] mb-2">Review Bottlenecks</h3>
              <p className="text-xs text-[#806C68] leading-relaxed">
                Senior brand leaders spend hours proofreading repetitive terminology guidelines instead of focusing on strategic campaign messaging.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section id="solution" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5 space-y-5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#652B39]">
                The Solution
              </span>
              <h2 className="text-3xl font-extrabold text-[#35252A] tracking-tight">
                Autonomous pre-publication linting with evidence-based guardrails.
              </h2>
              <p className="text-sm text-[#806C68] leading-relaxed">
                BrandLint operates like a software linter for marketing language. It inspects draft copy against codified brand rules, flags non-compliant sentences, explains precisely why with citations, and suggests on-brand corrections.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#652B39]/10 text-[#652B39] flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3" />
                  </div>
                  <span className="text-xs text-[#35252A] font-medium">
                    Codified Brand Constitution storing voice, prohibited words, and required footnotes.
                  </span>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#652B39]/10 text-[#652B39] flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3" />
                  </div>
                  <span className="text-xs text-[#35252A] font-medium">
                    ClaimShield™ verification engine requiring evidence links for any performance claim.
                  </span>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#652B39]/10 text-[#652B39] flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3" />
                  </div>
                  <span className="text-xs text-[#35252A] font-medium">
                    Enforced multi-tier human sign-off before content can be tagged as publication-ready.
                  </span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-[#FFFAF5] border border-[#E4D8D1] shadow-xs">
                  <div className="text-xs font-bold uppercase text-[#652B39] mb-1">Feature 01</div>
                  <h4 className="text-sm font-bold text-[#35252A] mb-1.5">Evidence-Backed Explanations</h4>
                  <p className="text-xs text-[#806C68] leading-relaxed">
                    Every flagged issue links directly to a specific section of your organization's Brand Constitution.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-[#FFFAF5] border border-[#E4D8D1] shadow-xs">
                  <div className="text-xs font-bold uppercase text-[#652B39] mb-1">Feature 02</div>
                  <h4 className="text-sm font-bold text-[#35252A] mb-1.5">Context-Aware Suggestions</h4>
                  <p className="text-xs text-[#806C68] leading-relaxed">
                    Provides compliant replacement phrasing that maintains high conversion without diluting brand authority.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-[#FFFAF5] border border-[#E4D8D1] shadow-xs">
                  <div className="text-xs font-bold uppercase text-[#652B39] mb-1">Feature 03</div>
                  <h4 className="text-sm font-bold text-[#35252A] mb-1.5">Tenant Role Hierarchy</h4>
                  <p className="text-xs text-[#806C68] leading-relaxed">
                    Super Admins manage policies, Org Admins configure team rights, and Creators submit copy safely.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-[#FFFAF5] border border-[#E4D8D1] shadow-xs">
                  <div className="text-xs font-bold uppercase text-[#652B39] mb-1">Feature 04</div>
                  <h4 className="text-sm font-bold text-[#35252A] mb-1.5">Audit-Grade Traceability</h4>
                  <p className="text-xs text-[#806C68] leading-relaxed">
                    Exportable verification certificates proving every published sentence passed governance check.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-[#FFFAF5] border-y border-[#E4D8D1]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="text-center max-w-xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-[#652B39]">
              How It Works
            </span>
            <h2 className="text-3xl font-extrabold text-[#35252A] tracking-tight mt-2">
              Three steps to publication confidence
            </h2>
            <p className="text-sm text-[#806C68] mt-2">
              Seamlessly embedded into your existing copy review workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="relative p-6 rounded-2xl bg-[#F4EEE8]/70 border border-[#E4D8D1] flex flex-col justify-between">
              <div>
                <span className="text-3xl font-extrabold font-mono text-[#652B39]/20 block mb-3">01</span>
                <h3 className="text-lg font-bold text-[#35252A] mb-2">Ingest Constitution</h3>
                <p className="text-xs text-[#806C68] leading-relaxed">
                  Upload or configure your brand's voice parameters, prohibited vocabulary, substantiated claim database, and required legal disclaimers.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#E4D8D1]/80 text-[11px] font-semibold text-[#652B39] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" /> Single Source of Truth
              </div>
            </div>

            <div className="relative p-6 rounded-2xl bg-[#F4EEE8]/70 border border-[#E4D8D1] flex flex-col justify-between">
              <div>
                <span className="text-3xl font-extrabold font-mono text-[#652B39]/20 block mb-3">02</span>
                <h3 className="text-lg font-bold text-[#35252A] mb-2">Real-Time Lint & Citation</h3>
                <p className="text-xs text-[#806C68] leading-relaxed">
                  BrandLint audits copy against your constitution, flags tone drift, tests claims via ClaimShield, and calculates an objective Brand Score.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#E4D8D1]/80 text-[11px] font-semibold text-[#652B39] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Instant Evidence Feedback
              </div>
            </div>

            <div className="relative p-6 rounded-2xl bg-[#F4EEE8]/70 border border-[#E4D8D1] flex flex-col justify-between">
              <div>
                <span className="text-3xl font-extrabold font-mono text-[#652B39]/20 block mb-3">03</span>
                <h3 className="text-lg font-bold text-[#35252A] mb-2">Human Approval Gate</h3>
                <p className="text-xs text-[#806C68] leading-relaxed">
                  Designated Reviewers and Org Admins approve or request revisions with one click, producing an immutable publication certification.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#E4D8D1]/80 text-[11px] font-semibold text-[#652B39] flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Certified for Release
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="max-w-xl mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-[#652B39]">
              Enterprise Platform
            </span>
            <h2 className="text-3xl font-extrabold text-[#35252A] tracking-tight mt-2">
              Everything required to protect enterprise brand standards.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-[#FFFAF5] border border-[#E4D8D1] shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-[#652B39]/10 text-[#652B39] flex items-center justify-center mb-4">
                <Scale className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#35252A] mb-1.5">Brand Constitution</h3>
              <p className="text-xs text-[#806C68] leading-relaxed">
                Centralized rules defining company voice dimensions, forbidden adjectives, trademark rules, and formatting standards.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#FFFAF5] border border-[#E4D8D1] shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-[#652B39]/10 text-[#652B39] flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#35252A] mb-1.5">ClaimShield™ Verification</h3>
              <p className="text-xs text-[#806C68] leading-relaxed">
                Connects performance claims to audited citations, flagging unverified superlatives and unsubstantiated percentage assertions.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#FFFAF5] border border-[#E4D8D1] shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-[#652B39]/10 text-[#652B39] flex items-center justify-center mb-4">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#35252A] mb-1.5">Disclaimer Sentry</h3>
              <p className="text-xs text-[#806C68] leading-relaxed">
                Automatically detects when financial metrics or performance promises require footnotes, injecting compliant disclaimers.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#FFFAF5] border border-[#E4D8D1] shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-[#652B39]/10 text-[#652B39] flex items-center justify-center mb-4">
                <Users2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#35252A] mb-1.5">Multi-Tenant RBAC</h3>
              <p className="text-xs text-[#806C68] leading-relaxed">
                Strict organization isolation. Role assignments for Super Admins, Org Admins, Content Creators, and Reviewers.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#FFFAF5] border border-[#E4D8D1] shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-[#652B39]/10 text-[#652B39] flex items-center justify-center mb-4">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#35252A] mb-1.5">BrandGuard AI Integration</h3>
              <p className="text-xs text-[#806C68] leading-relaxed">
                High-speed server-side AI evaluation executing strictly in protected backend environments with zero key exposure.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#FFFAF5] border border-[#E4D8D1] shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-[#652B39]/10 text-[#652B39] flex items-center justify-center mb-4">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#35252A] mb-1.5">Governance Analytics</h3>
              <p className="text-xs text-[#806C68] leading-relaxed">
                Track recurring brand infractions across teams, identify training opportunities, and verify organization-wide score trends.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Content-Check Demo Section (Interactive Live Lint Engine) */}
      <section id="demo" className="py-20 bg-[#FFFAF5] border-y border-[#E4D8D1]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-[#652B39]">
              Live Interactive Demo
            </span>
            <h2 className="text-3xl font-extrabold text-[#35252A] tracking-tight mt-2">
              Test BrandLint in real-time
            </h2>
            <p className="text-sm text-[#806C68] mt-2">
              Select a sample marketing copy or type your own to see tone linting, ClaimShield verification, and evidence detection.
            </p>
          </div>

          {/* Sample Selectors */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
            {demoSamples.map((sample, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setDemoInput(sample.text);
                  handleRunDemo(sample.text);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                  demoInput === sample.text
                    ? 'bg-[#652B39] text-white border-[#652B39]'
                    : 'bg-[#F4EEE8] text-[#35252A] border-[#E4D8D1] hover:bg-[#E8DED5]/60'
                }`}
              >
                {sample.label}
              </button>
            ))}
          </div>

          {/* Lint Interactive Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-5xl mx-auto">
            {/* Input Box */}
            <div className="lg:col-span-6 bg-[#F4EEE8] p-5 rounded-2xl border border-[#E4D8D1]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#35252A]">
                  Draft Marketing Copy
                </span>
                <span className="text-[11px] text-[#806C68]">
                  {demoInput.length} characters
                </span>
              </div>

              <textarea
                rows={6}
                value={demoInput}
                onChange={(e) => setDemoInput(e.target.value)}
                placeholder="Paste marketing copy, press release snippet, or campaign headline..."
                className="w-full p-3.5 bg-[#FFFAF5] border border-[#E4D8D1] rounded-xl text-sm text-[#35252A] focus:outline-none focus:ring-2 focus:ring-[#652B39]/30 focus:border-[#652B39] resize-none leading-relaxed"
              />

              <div className="mt-4 flex items-center justify-between">
                <span className="text-[11px] text-[#806C68]">
                  Brand Constitution active: Standard Enterprise
                </span>
                <button
                  onClick={() => handleRunDemo(demoInput)}
                  disabled={demoLoading || !demoInput.trim()}
                  className="px-4 py-2 rounded-xl bg-[#652B39] hover:bg-[#512331] text-white text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${demoLoading ? 'animate-spin' : ''}`} />
                  <span>{demoLoading ? 'Analyzing...' : 'Run Linter'}</span>
                </button>
              </div>
            </div>

            {/* Results Output */}
            <div className="lg:col-span-6 bg-[#FFFAF5] p-5 rounded-2xl border border-[#E4D8D1] shadow-xs">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E4D8D1]">
                <span className="text-xs font-bold uppercase tracking-wider text-[#35252A]">
                  Linter Findings
                </span>

                {demoResult && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#35252A]">Score:</span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-xs font-mono font-bold ${
                        demoResult.score >= 85
                          ? 'bg-[#2E6F40]/10 text-[#2E6F40]'
                          : demoResult.score >= 60
                          ? 'bg-[#B7791F]/10 text-[#B7791F]'
                          : 'bg-[#A3282C]/10 text-[#A3282C]'
                      }`}
                    >
                      {demoResult.score} / 100
                    </span>
                  </div>
                )}
              </div>

              {demoLoading ? (
                <div className="py-12 text-center text-xs text-[#806C68]">
                  <RefreshCw className="w-6 h-6 text-[#652B39] animate-spin mx-auto mb-2" />
                  Scanning terminology, claims, and disclaimers...
                </div>
              ) : demoResult ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-[#F4EEE8]/70 border border-[#E4D8D1] flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#35252A]">Publication Gate:</span>
                    <span
                      className={`font-bold ${
                        demoResult.score >= 85
                          ? 'text-[#2E6F40]'
                          : demoResult.score >= 60
                          ? 'text-[#B7791F]'
                          : 'text-[#A3282C]'
                      }`}
                    >
                      {demoResult.verdict}
                    </span>
                  </div>

                  {demoResult.issues.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[#2E6F40] bg-[#2E6F40]/5 rounded-xl border border-[#2E6F40]/20">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2" />
                      <span className="font-bold block text-sm mb-1">Brand Compliant</span>
                      No tone violations, unsupported claims, or missing disclaimers detected.
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto space-y-2.5 pr-1">
                      {demoResult.issues.map((issue, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-xl bg-[#F4EEE8]/60 border border-[#E4D8D1] text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-[#35252A] flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-[#A3282C]/10 text-[#A3282C]">
                                {issue.type}
                              </span>
                              <span>Flagged: "{issue.snippet}"</span>
                            </span>
                            <span className="text-[10px] font-bold uppercase text-[#806C68]">
                              {issue.severity} priority
                            </span>
                          </div>

                          <p className="text-[11px] text-[#806C68]">
                            <strong>Issue:</strong> {issue.issue}
                          </p>

                          <p className="text-[11px] text-[#2E6F40] bg-[#2E6F40]/5 p-2 rounded-lg border border-[#2E6F40]/10">
                            <strong>Recommended Fix:</strong> {issue.suggestion}
                          </p>

                          <p className="text-[10px] text-[#806C68]/80 italic">
                            Evidence: {issue.evidence}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-center sm:text-left">
            <div className="p-8 rounded-2xl bg-[#FFFAF5] border border-[#E4D8D1] shadow-xs">
              <span className="text-4xl font-extrabold text-[#652B39] tracking-tight block mb-2">
                78%
              </span>
              <h3 className="text-base font-bold text-[#35252A] mb-1">Faster Review Turnaround</h3>
              <p className="text-xs text-[#806C68] leading-relaxed">
                Eliminates repetitive manual back-and-forth between copywriters and legal compliance officers.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-[#FFFAF5] border border-[#E4D8D1] shadow-xs">
              <span className="text-4xl font-extrabold text-[#652B39] tracking-tight block mb-2">
                0
              </span>
              <h3 className="text-base font-bold text-[#35252A] mb-1">Unsubstantiated Claims</h3>
              <p className="text-xs text-[#806C68] leading-relaxed">
                ClaimShield verifies every performance superlative before assets receive publication approval.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-[#FFFAF5] border border-[#E4D8D1] shadow-xs">
              <span className="text-4xl font-extrabold text-[#652B39] tracking-tight block mb-2">
                100%
              </span>
              <h3 className="text-base font-bold text-[#35252A] mb-1">Constitution Adherence</h3>
              <p className="text-xs text-[#806C68] leading-relaxed">
                Enforces unified terminology across social channels, customer emails, press releases, and websites.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section (Loaded strictly from configuration) */}
      <section id="pricing" className="py-20 bg-[#FFFAF5] border-y border-[#E4D8D1]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-[#652B39]">
              Configuration-Backed Plans
            </span>
            <h2 className="text-3xl font-extrabold text-[#35252A] tracking-tight mt-2">
              Predictable enterprise governance
            </h2>
            <p className="text-sm text-[#806C68] mt-2">
              Plan tiers configured dynamically from backend environment specifications.
            </p>

            {/* Monthly / Annual Toggle */}
            <div className="mt-6 inline-flex items-center p-1 rounded-xl bg-[#F4EEE8] border border-[#E4D8D1]">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  billingCycle === 'monthly'
                    ? 'bg-[#652B39] text-white shadow-xs'
                    : 'text-[#806C68] hover:text-[#35252A]'
                }`}
              >
                Monthly Billing
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  billingCycle === 'annual'
                    ? 'bg-[#652B39] text-white shadow-xs'
                    : 'text-[#806C68] hover:text-[#35252A]'
                }`}
              >
                Annual Billing (Save 20%)
              </button>
            </div>
          </div>

          {pricingLoading ? (
            <div className="py-12 text-center text-xs text-[#806C68]">
              Loading configured plan tiers...
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`p-7 rounded-2xl flex flex-col justify-between transition-all ${
                    plan.highlighted
                      ? 'surface-3d border-2 border-[#652B39] shadow-xl relative'
                      : 'bg-[#F4EEE8]/70 border border-[#E4D8D1] shadow-xs'
                  }`}
                >
                  {plan.badge && (
                    <div className="mb-4">
                      <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-[#652B39] text-white rounded-md">
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  <div>
                    <h3 className="text-xl font-bold text-[#35252A] mb-1">{plan.name}</h3>
                    <p className="text-xs text-[#806C68] mb-4 min-h-[36px]">
                      {plan.description}
                    </p>

                    <div className="mb-6 pb-6 border-b border-[#E4D8D1]">
                      <span className="text-xs uppercase tracking-wider text-[#806C68] block mb-1">
                        Deployment Cost
                      </span>
                      <span className="text-2xl font-extrabold text-[#35252A]">
                        {billingCycle === 'monthly' ? plan.price.monthly : plan.price.annual}
                      </span>
                    </div>

                    <ul className="space-y-2.5 mb-8 text-xs text-[#35252A]">
                      {plan.features.map((feat, fidx) => (
                        <li key={fidx} className="flex items-start gap-2.5">
                          <Check className="w-4 h-4 text-[#2E6F40] shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Link
                    to="/register"
                    className={`w-full py-3 rounded-xl text-center text-xs font-bold transition-all cursor-pointer ${
                      plan.highlighted
                        ? 'bg-[#652B39] hover:bg-[#512331] text-white shadow-sm'
                        : 'bg-[#FFFAF5] hover:bg-[#E8DED5] border border-[#E4D8D1] text-[#35252A]'
                    }`}
                  >
                    {plan.ctaText}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-[#652B39]">
              Frequently Asked Questions
            </span>
            <h2 className="text-3xl font-extrabold text-[#35252A] tracking-tight mt-2">
              Everything you need to know about BrandLint
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-[#FFFAF5] border border-[#E4D8D1] overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-5 text-left flex items-center justify-between text-sm font-bold text-[#35252A] hover:bg-[#F4EEE8]/50 transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-[#806C68] transition-transform duration-200 shrink-0 ml-4 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs text-[#806C68] leading-relaxed border-t border-[#E4D8D1]/60">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-[#FFFAF5] border-t border-[#E4D8D1] py-12 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-[#806C68]">
          <div className="flex flex-col items-center md:items-start gap-1">
            <BrandLogo size="sm" showTagline={true} />
            <span className="text-[11px] text-[#806C68]/70 mt-2">
              Enterprise Brand Governance, Terminology Linting & ClaimShield™ Verification.
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <a href="#problem" className="hover:text-[#35252A]">Problem</a>
            <a href="#solution" className="hover:text-[#35252A]">Solution</a>
            <a href="#how-it-works" className="hover:text-[#35252A]">How It Works</a>
            <a href="#pricing" className="hover:text-[#35252A]">Pricing</a>
            <Link to="/login" className="hover:text-[#35252A]">Sign In</Link>
            <Link to="/register" className="font-semibold text-[#652B39]">Register</Link>
          </div>

          <div className="text-[11px] text-[#806C68]/70">
            © {new Date().getFullYear()} BrandLint. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};
