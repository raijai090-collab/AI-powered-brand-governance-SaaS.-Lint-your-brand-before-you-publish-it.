import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
  auth,
  googleProvider
} from '../lib/firebase';
import { BrandLogo } from '../components/common/BrandLogo';
import { Mail, Lock, Building2, User, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [orgName, setOrgName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!orgName.trim()) {
      setError('Please provide an organisation or brand name.');
      return;
    }

    setIsLoading(true);
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (name.trim()) {
        await updateProfile(userCred.user, { displayName: name.trim() });
      }

      // The AuthProvider will detect the user state and automatically provision the
      // initial organization and assign this first user as 'org_admin'!
      navigate('/app');
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/email-already-in-use') {
        setError('This email is already associated with an account. Try signing in instead.');
      } else if (code === 'auth/operation-not-allowed') {
        setError('Email registration is disabled in Firebase console. Please use Google Workspace Sign-In.');
      } else {
        setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError(null);
    setIsGoogleLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/app');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google sign-up failed.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4EEE8] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-block mb-6">
          <BrandLogo size="lg" showTagline={true} className="justify-center" />
        </Link>
        <h2 className="text-2xl font-bold tracking-tight text-[#35252A]">
          Create your brand workspace
        </h2>
        <p className="mt-1 text-sm text-[#806C68]">
          As the first registrant, you will be designated as <span className="font-semibold text-[#652B39]">Organisation Admin</span>.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#FFFAF5] py-8 px-6 sm:px-10 border border-[#E4D8D1] rounded-2xl shadow-xl">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-[#FFF5F5] border border-[#A3282C]/20 text-[#A3282C] text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* Google Sign-up */}
          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={isGoogleLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-[#E4D8D1] rounded-xl bg-white hover:bg-[#F4EEE8] text-sm font-semibold text-[#35252A] shadow-xs hover:border-[#652B39]/30 transition-all cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{isGoogleLoading ? 'Connecting...' : 'Sign up with Google Workspace'}</span>
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E4D8D1]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wider">
              <span className="bg-[#FFFAF5] px-3 text-[#806C68]">Or register with email</span>
            </div>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#35252A] uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#806C68] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Taylor Sterling"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#F4EEE8] border border-[#E4D8D1] rounded-xl text-sm text-[#35252A] placeholder-[#806C68]/60 focus:outline-none focus:ring-2 focus:ring-[#652B39]/30 focus:border-[#652B39]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#35252A] uppercase tracking-wider mb-1.5">
                Organisation / Brand Name
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-[#806C68] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Luminary Global"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#F4EEE8] border border-[#E4D8D1] rounded-xl text-sm text-[#35252A] placeholder-[#806C68]/60 focus:outline-none focus:ring-2 focus:ring-[#652B39]/30 focus:border-[#652B39]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#35252A] uppercase tracking-wider mb-1.5">
                Work Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#806C68] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="taylor@luminary.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#F4EEE8] border border-[#E4D8D1] rounded-xl text-sm text-[#35252A] placeholder-[#806C68]/60 focus:outline-none focus:ring-2 focus:ring-[#652B39]/30 focus:border-[#652B39]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#35252A] uppercase tracking-wider mb-1.5">
                Password (min. 6 characters)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#806C68] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#F4EEE8] border border-[#E4D8D1] rounded-xl text-sm text-[#35252A] placeholder-[#806C68]/60 focus:outline-none focus:ring-2 focus:ring-[#652B39]/30 focus:border-[#652B39]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#35252A] uppercase tracking-wider mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#806C68] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#F4EEE8] border border-[#E4D8D1] rounded-xl text-sm text-[#35252A] placeholder-[#806C68]/60 focus:outline-none focus:ring-2 focus:ring-[#652B39]/30 focus:border-[#652B39]"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#E8DED5]/40 text-[11px] text-[#806C68] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#652B39] shrink-0" />
              <span>Multi-tenant data isolation and role security automatically configured.</span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#652B39] hover:bg-[#512331] text-white text-sm font-semibold transition-all shadow-sm hover:shadow active:scale-98 cursor-pointer disabled:opacity-50 mt-2"
            >
              <span>{isLoading ? 'Creating Workspace...' : 'Register Workspace'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[#E4D8D1] text-center text-xs text-[#806C68]">
            Already have an organization account?{' '}
            <Link to="/login" className="font-bold text-[#652B39] hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
