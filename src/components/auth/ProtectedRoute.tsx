import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ShieldCheck } from 'lucide-react';

export const ProtectedRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4EEE8] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-[#652B39] flex items-center justify-center text-white mb-4 shadow-lg animate-pulse">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-[#35252A] mb-1">Verifying Organization Session...</p>
        <p className="text-xs text-[#806C68]">Establishing zero-trust tenant credentials</p>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
