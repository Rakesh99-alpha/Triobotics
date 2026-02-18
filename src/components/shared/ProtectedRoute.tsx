'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/useAuthStore';
import type { UserRole } from '@/types/user';
import { ROLE_CONFIGS } from '@/types/user';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

// Get user from localStorage (for simple auth)
const getLocalUser = () => {
  if (typeof window === 'undefined') return null;
  try {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      return JSON.parse(storedUser);
    }
  } catch {
    return null;
  }
  return null;
};

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const router = useRouter();
  const { user, loading: storeLoading } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // Check localStorage first for simple auth
    const localUser = getLocalUser();
    const currentUser = user || localUser;

    if (!storeLoading || localUser) {
      if (!currentUser) {
        // Not logged in - redirect to login
        router.push('/login');
        return;
      }

      // Get role (handle both uppercase and lowercase roles)
      const role = (currentUser.role || '').toLowerCase() as UserRole;

      // Check role restrictions
      if (allowedRoles && allowedRoles.length > 0) {
        // Check if user's role is in allowed list (case-insensitive)
        const isAllowed = allowedRoles.some(
          allowedRole => allowedRole.toLowerCase() === role
        );

        if (isAllowed) {
          setAuthorized(true);
        } else {
          // Logged in but wrong role - redirect to their dashboard
          const roleConfig = ROLE_CONFIGS.find(r => r.id === role);
          router.push(roleConfig?.dashboardPath || '/login');
          return;
        }
      } else {
        // No role restrictions - allow access
        setAuthorized(true);
      }

      setLoading(false);
    }
  }, [user, storeLoading, allowedRoles, router]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-400">Checking authorization...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authorized
  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-center p-8">
          <div className="text-red-500 text-6xl mb-4">🚫</div>
          <h2 className="text-white text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-zinc-400 mb-4">You don&apos;t have permission to view this page.</p>
          <button 
            onClick={() => router.back()}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Render children if authorized
  return <>{children}</>;
}

// Default export for compatibility
export default ProtectedRoute;
