'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/client';
import { UserProfile, UserRole, canAccessRoute, USER_COLLECTIONS } from '@/types/user';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  createUser: (email: string, password: string, profile: Partial<UserProfile>) => Promise<{ success: boolean; error?: string }>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  hasPermission: (permission: string) => boolean;
  canAccess: (route: string) => boolean;
  isRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password'];

// Check if user is authenticated via localStorage (simple auth)
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localUser, setLocalUser] = useState<{ role: string; name: string; email: string } | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Check localStorage on mount
  useEffect(() => {
    const storedUser = getLocalUser();
    if (storedUser) {
      Promise.resolve().then(() => setLocalUser(storedUser));
    }
  }, []);

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Fetch user profile from Firestore
        try {
          const userDoc = await getDoc(doc(db, USER_COLLECTIONS.USERS, firebaseUser.uid));
          
          if (userDoc.exists()) {
            const profile = userDoc.data() as UserProfile;
            
            // Check if user is active
            if (!profile.isActive) {
              setError('Your account has been deactivated. Please contact admin.');
              await firebaseSignOut(auth);
              setUserProfile(null);
              router.push('/login');
            } else {
              setUserProfile(profile);
              
              // Update last login
              await updateDoc(doc(db, USER_COLLECTIONS.USERS, firebaseUser.uid), {
                lastLogin: new Date().toISOString(),
              });
            }
          } else {
            // No profile found - create a basic one
            console.warn('No user profile found for:', firebaseUser.uid);
            setUserProfile(null);
          }
        } catch (err) {
          console.error('Error fetching user profile:', err);
          setError('Failed to load user profile');
        }
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // Route protection - Modified to support localStorage auth
  useEffect(() => {
    if (loading) return;

    const isPublicRoute = PUBLIC_ROUTES.some(route => pathname?.startsWith(route));
    const currentLocalUser = getLocalUser();
    
    // If user is authenticated via localStorage OR Firebase, allow access
    const isAuthenticated = user || currentLocalUser;
    
    if (!isAuthenticated && !isPublicRoute) {
      // Not logged in and trying to access protected route
      router.push('/login');
    }
    // Remove auto-redirect from login page - let user stay on login if they want
    // The login page handles its own redirect after successful login
  }, [user, userProfile, loading, pathname, router, localUser]);

  // Sign in with email/password
  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setError(null);
    setLoading(true);
    
    try {
      // First check if user exists in Firestore by email
      const usersRef = collection(db, USER_COLLECTIONS.USERS);
      const q = query(usersRef, where('email', '==', email.toLowerCase()));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setLoading(false);
        return { success: false, error: 'User not found. Please contact admin.' };
      }
      
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data() as UserProfile;
      
      if (!userData.isActive) {
        setLoading(false);
        return { success: false, error: 'Account is deactivated. Please contact admin.' };
      }
      
      // Sign in with Firebase Auth
      await signInWithEmailAndPassword(auth, email, password);
      
      setLoading(false);
      return { success: true };
    } catch (err: unknown) {
      setLoading(false);
      const firebaseError = err as { code?: string; message?: string };
      const errorMessage = firebaseError.code === 'auth/wrong-password' 
        ? 'Invalid password'
        : firebaseError.code === 'auth/user-not-found'
        ? 'User not found'
        : firebaseError.code === 'auth/invalid-credential'
        ? 'Invalid credentials'
        : firebaseError.message || 'Login failed';
      
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUserProfile(null);
      router.push('/login');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  // Create new user (admin only)
  const createUser = async (
    email: string, 
    password: string, 
    profile: Partial<UserProfile>
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // Create Firebase Auth user
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create user profile in Firestore
      const newProfile: UserProfile = {
        uid: credential.user.uid,
        email: email.toLowerCase(),
        displayName: profile.displayName || email.split('@')[0],
        role: profile.role || 'viewer',
        department: profile.department || '',
        phone: profile.phone || '',
        isActive: true,
        permissions: profile.permissions || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: userProfile?.uid || 'system',
      };
      
      await setDoc(doc(db, USER_COLLECTIONS.USERS, credential.user.uid), newProfile);
      
      return { success: true };
    } catch (err: unknown) {
      const firebaseError = err as { message?: string };
      return { success: false, error: firebaseError.message || 'Failed to create user' };
    }
  };

  // Update user profile
  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    
    try {
      await updateDoc(doc(db, USER_COLLECTIONS.USERS, user.uid), {
        ...updates,
        updatedAt: new Date().toISOString(),
      });
      
      setUserProfile(prev => prev ? { ...prev, ...updates } : null);
    } catch (err) {
      console.error('Error updating profile:', err);
    }
  };

  // Check if user has specific permission
  const hasPermission = (permission: string): boolean => {
    if (!userProfile) return false;
    if (userProfile.permissions.includes('*')) return true;
    return userProfile.permissions.includes(permission);
  };

  // Check if user can access route
  const canAccess = (route: string): boolean => {
    if (!userProfile) return false;
    return canAccessRoute(userProfile.role, route);
  };

  // Check if user has specific role(s)
  const isRole = (...roles: UserRole[]): boolean => {
    if (!userProfile) return false;
    return roles.includes(userProfile.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        error,
        signIn,
        signOut,
        createUser,
        updateUserProfile,
        hasPermission,
        canAccess,
        isRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// HOC for protecting pages
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  requiredPermissions?: string[],
  allowedRoles?: UserRole[]
) {
  return function ProtectedComponent(props: P) {
    const { user, userProfile, loading, hasPermission, isRole } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!loading) {
        if (!user || !userProfile) {
          router.push('/login');
          return;
        }

        if (allowedRoles && !isRole(...allowedRoles)) {
          router.push('/unauthorized');
          return;
        }

        if (requiredPermissions) {
          const hasAll = requiredPermissions.every(p => hasPermission(p));
          if (!hasAll) {
            router.push('/unauthorized');
            return;
          }
        }
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading, user, userProfile, router]);

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950">
          <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
        </div>
      );
    }

    if (!user || !userProfile) {
      return null;
    }

    return <Component {...props} />;
  };
}
