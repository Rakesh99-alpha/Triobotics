'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/client';
import { doc, getDoc } from 'firebase/firestore';
import type { UserRole } from '@/types/user';
import { ROLE_CONFIGS, canAccessRoute } from '@/types/user';

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

export default function ProtectedRoute({ 
  children,
  allowedRoles 
}: ProtectedRouteProps) {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const router = useRouter();

  useEffect(() => {
    // First check localStorage for simple auth
    const localUser = getLocalUser();
    
    if (localUser && localUser.role) {
      const role = localUser.role.toLowerCase() as UserRole;
      setUserRole(role);
      
      // Check if user role is allowed
      if (allowedRoles && allowedRoles.length > 0) {
        if (allowedRoles.includes(role)) {
          setAuthorized(true);
        } else {
          // Redirect to user's dashboard
          const roleConfig = ROLE_CONFIGS.find(r => r.id === role);
          router.push(roleConfig?.dashboardPath || '/login');
          return;
        }
      } else {
        // No role restrictions
        setAuthorized(true);
      }
      setLoading(false);
      return;
    }

    // Fall back to Firebase Auth
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }

      try {
        // Fetch user profile from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (userDoc.exists()) {
          const profile = userDoc.data();
          const role = (profile.role || 'viewer').toLowerCase() as UserRole;
          setUserRole(role);

          // Check if user is active
          if (profile.isActive === false) {
            router.push('/login');
            return;
          }

          // Check if user role is allowed
          if (allowedRoles && allowedRoles.length > 0) {
            if (allowedRoles.includes(role)) {
              setAuthorized(true);
            } else {
              // Redirect to user's dashboard
              const roleConfig = ROLE_CONFIGS.find(r => r.id === role);
              router.push(roleConfig?.dashboardPath || '/login');
              return;
            }
          } else {
            // No role restrictions
            setAuthorized(true);
          }
        } else {
          // No profile found - redirect to login
          router.push('/login');
          return;
        }
      } catch (error) {
        console.error('Error checking user authorization:', error);
        router.push('/login');
        return;
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [router, allowedRoles]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-zinc-400 text-sm">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-white text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-zinc-400 mb-4">You don&apos;t have permission to access this page.</p>
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

  return <>{children}</>;
}

// Named export for compatibility with shared/ProtectedRoute
export { ProtectedRoute };
