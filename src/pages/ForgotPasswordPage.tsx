import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail, auth } from '../lib/firebase';
import { BrandLogo } from '../components/common/BrandLogo';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4EEE8] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-block mb-6">
          <BrandLogo size="lg" showTagline={true} className="justify-center" />
        </Link>
        <h2 className="text-2xl font-bold tracking-tight text-[#35252A]">
          Reset your password
        </h2>
        <p className="mt-1 text-sm text-[#806C68]">
          Enter your organization email to receive secure recovery instructions.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#FFFAF5] py-8 px-6 sm:px-10 border border-[#E4D8D1] rounded-2xl shadow-xl">
          {submitted ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-[#2E6F40]/10 text-[#2E6F40] flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#35252A] mb-2">Check your email</h3>
              <p className="text-xs text-[#806C68] leading-relaxed mb-6">
                We sent password recovery instructions to <strong className="text-[#35252A]">{email}</strong>. Follow the link to reset your password.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#652B39] text-white text-xs font-semibold hover:bg-[#512331] transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Sign In</span>
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-5 p-3.5 rounded-xl bg-[#FFF5F5] border border-[#A3282C]/20 text-[#A3282C] text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{error}</span>
                </div>
              )}

              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#35252A] uppercase tracking-wider mb-1.5">
                    Registered Work Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#806C68] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="alex@acmebrand.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#F4EEE8] border border-[#E4D8D1] rounded-xl text-sm text-[#35252A] placeholder-[#806C68]/60 focus:outline-none focus:ring-2 focus:ring-[#652B39]/30 focus:border-[#652B39]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#652B39] hover:bg-[#512331] text-white text-sm font-semibold transition-all shadow-sm hover:shadow active:scale-98 cursor-pointer disabled:opacity-50 mt-2"
                >
                  <span>{isLoading ? 'Sending Instructions...' : 'Send Recovery Link'}</span>
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-[#E4D8D1] text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#806C68] hover:text-[#35252A]"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
