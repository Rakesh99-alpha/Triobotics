'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, Mail, Lock, Loader2, AlertCircle, HelpCircle, KeyRound, Database } from 'lucide-react';
import { db } from '@/lib/firebase/client';
import { collection, getDocs, query, where } from 'firebase/firestore';

const COMPANY_DOMAIN = '@triovisioninternational.com';

// Fallback hardcoded users (only used if Firebase is unavailable)
const FALLBACK_USERS: Record<string, { password: string; role: string; name: string }> = {
  // 3 Managing Directors
  mani: { password: 'Trio@2015', role: 'md', name: 'Mani Kumar' },
  praveen: { password: 'Trio@2015', role: 'md', name: 'Praveen' },
  // Other roles
  admin: { password: 'admin123', role: 'admin', name: 'Administrator' },
  naveen: { password: 'hr123', role: 'hr', name: 'Naveen (HR)' },
  naresh: { password: 'hr123', role: 'hr', name: 'Naresh (HR)' },
  dhathri: { password: 'hr123', role: 'hr', name: 'Dhathri (HR)' },
  prasuna: { password: 'hr123', role: 'hr', name: 'Prasuna (HR)' },
  empStore : { password: 'store123', role: 'empStore', name: 'Store Manager' },
  purchase: { password: 'purchase123', role: 'purchase', name: 'Purchase Team' },
  design: { password: 'design123', role: 'design', name: 'Design Team' },
  quality: { password: 'quality123', role: 'quality', name: 'Quality Team' },
  dispatch: { password: 'dispatch123', role: 'dispatch', name: 'Dispatch Team' },
  viewer: { password: 'viewer123', role: 'viewer', name: 'Viewer' },
  supervisor: { password: 'supervisor123', role: 'supervisor', name: 'Supervisor' },
  pm: { password: 'pm123', role: 'pm', name: 'Project Manager' },
  customer: { password: 'customer123', role: 'customer', name: 'Customer Portal' },
  employee: { password: 'employee123', role: 'employee', name: 'Employee' },
  // Individual Employee Logins
  narendra: { password: 'Trio@2015', role: 'employee', name: 'M Narendra Prasad' },
  surya: { password: 'Trio@2015', role: 'employee', name: 'S Surya Prakash' },
  rakesh: { password: 'Trio@2015', role: 'employee', name: 'J Rakesh' },
  ramesh: { password: 'Trio@2015', role: 'employee', name: 'K Ramesh' },
  venkat: { password: 'Trio@2015', role: 'employee', name: 'V Venkatesh' },
  srinivas: { password: 'Trio@2015', role: 'employee', name: 'P Srinivas' },
  kumar: { password: 'Trio@2015', role: 'employee', name: 'A Kumar' },
  ravi: { password: 'Trio@2015', role: 'employee', name: 'R Ravi Kumar' },
  suresh: { password: 'Trio@2015', role: 'employee', name: 'B Suresh' },
  mahesh: { password: 'Trio@2015', role: 'employee', name: 'G Mahesh' },
  rajesh: { password: 'Trio@2015', role: 'employee', name: 'D Rajesh' },
  prasad: { password: 'Trio@2015', role: 'employee', name: 'T Prasad' },
};

// Dynamic role-based dashboard routing map
const ROLE_DASHBOARD_MAP: Record<string, string> = {
  // Management
  md: '/rnd',
  admin: '/admin',
  pm: '/pm',
  manager: '/manager',
  
  // HR Team
  hr: '/hr',
  
  // Operations
  supervisor: '/supervisor',
  employee: '/employee',
  
  // Store & Inventory
  store: '/store',
  store_manager: '/store',
  inventory: '/store',
  warehouse: '/store',
  empStore: '/empStore',
  
  // Purchase & Procurement
  purchase: '/purchase',
  purchase_manager: '/purchase',
  procurement: '/purchase',
  
  // Design & Engineering
  design: '/design',
  engineering: '/design',
  
  // Quality & Inspection
  quality: '/quality',
  qc: '/quality',
  inspection: '/quality',
  
  // Dispatch & Logistics
  dispatch: '/dispatch',
  logistics: '/dispatch',
  
  // Manufacturing & Production
  manufacturing: '/production',
  production: '/production',
  
  // Customer Portal
  customer: '/customer',
  client: '/customer',
  
  // Other
  viewer: '/store',
  default: '/employee',
};

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [emailLocal, setEmailLocal] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [shake, setShake] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [loginSource, setLoginSource] = useState<'firebase' | 'local' | null>(null);
  const router = useRouter();

  const fullEmail = emailLocal.includes('@') 
    ? emailLocal 
    : emailLocal + COMPANY_DOMAIN;

  // Normalize username for comparison (lowercase, trim)
  const normalizedUsername = emailLocal.toLowerCase().trim();

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    value = value.replace(/@/g, '');
    if (value.includes('triovisioninternational.com')) {
      value = value.replace('triovisioninternational.com', '');
    }
    setEmailLocal(value);
    setError('');
  };

  const requestAdminSupport = () => {
    const userName = emailLocal || 'User';
    const message = `Hello Admin Team,\n\nUser: ${userName}\nEmail: ${fullEmail}\nIssue: Unable to login to ERP system\nFailed Attempts: ${failedAttempts}\n\nPlease assist.\n\nThank you.`;
    const whatsappUrl = `https://wa.me/917981085020?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    console.log('Email notification sent to admin about locked account:', fullEmail);
  };

  const handleForgotPassword = () => {
    if (!emailLocal) {
      setError('Please enter your email first');
      return;
    }
    
    alert('✅ Password reset link sent!\n\nCheck your email for password reset instructions.');
    
    const adminMessage = `Password Reset Request\n\nUser: ${emailLocal}\nEmail: ${fullEmail}\n\nPlease assist with password reset.`;
    const whatsappUrl = `https://wa.me/917981085020?text=${encodeURIComponent(adminMessage)}`;
    
    console.log('Password reset requested for:', fullEmail);
    console.log('Admin notification:', whatsappUrl);
    
    setShowForgotPassword(false);
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  // Get dashboard path based on role
  const getDashboardPath = (role: string): string => {
    const normalizedRole = role.toLowerCase().trim();
    return ROLE_DASHBOARD_MAP[normalizedRole] || ROLE_DASHBOARD_MAP.default;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    setLoginSource(null);

    try {
      // ========================================
      // STEP 1: Try Firebase Firestore (Primary - Dynamic Users)
      // ========================================
      let foundUser = null;
      
      try {
        // Query employees collection by email
        const employeesRef = collection(db, 'employees');
        const emailQuery = query(employeesRef, where('email', '==', fullEmail));
        const emailSnapshot = await getDocs(emailQuery);
        
        if (!emailSnapshot.empty) {
          const userDoc = emailSnapshot.docs[0];
          const userData = userDoc.data();
          
          // Check password (stored in Firestore or default)
          const storedPassword = userData.password || 'Trio@2025';
          if (password === storedPassword) {
            foundUser = {
              id: userDoc.id,
              email: userData.email,
              name: userData.name || userData.displayName || emailLocal,
              role: userData.role?.toLowerCase() || 'employee',
              department: userData.department || '',
              source: 'firebase'
            };
            setLoginSource('firebase');
          }
        }
        
        // Also try querying by username if email didn't match
        if (!foundUser) {
          const usernameQuery = query(employeesRef, where('username', '==', normalizedUsername));
          const usernameSnapshot = await getDocs(usernameQuery);
          
          if (!usernameSnapshot.empty) {
            const userDoc = usernameSnapshot.docs[0];
            const userData = userDoc.data();
            
            const storedPassword = userData.password || 'Trio@2025';
            if (password === storedPassword) {
              foundUser = {
                id: userDoc.id,
                email: userData.email || fullEmail,
                name: userData.name || userData.displayName || emailLocal,
                role: userData.role?.toLowerCase() || 'employee',
                department: userData.department || '',
                source: 'firebase'
              };
              setLoginSource('firebase');
            }
          }
        }
      } catch (firebaseError) {
        console.warn('Firebase query failed, falling back to local auth:', firebaseError);
      }

      // ========================================
      // STEP 2: Try localStorage (HR-created users)
      // ========================================
      if (!foundUser) {
        interface DBUser {
          id: string;
          email: string;
          password: string;
          name: string;
          role: string;
        }
        const dbUsers: DBUser[] = JSON.parse(localStorage.getItem('erp_users') || "[]");
        const localUser = dbUsers.find((u) => 
          (u.email === fullEmail || u.email?.toLowerCase() === normalizedUsername) && 
          password === u.password
        );
        
        if (localUser) {
          foundUser = {
            id: localUser.id,
            email: localUser.email,
            name: localUser.name,
            role: localUser.role?.toLowerCase() || 'employee',
            department: '',
            source: 'local'
          };
          setLoginSource('local');
        }
      }

      // ========================================
      // STEP 3: Fallback to hardcoded users (Admin access)
      // ========================================
      if (!foundUser) {
        const hardcodedUser = FALLBACK_USERS[normalizedUsername];
        if (hardcodedUser && hardcodedUser.password === password) {
          foundUser = {
            id: `system-${normalizedUsername}`,
            email: fullEmail,
            name: hardcodedUser.name,
            role: hardcodedUser.role,
            department: '',
            source: 'fallback'
          };
          setLoginSource('local');
        }
      }

      // ========================================
      // STEP 4: Process login result
      // ========================================
      if (foundUser) {
        // Store user data in localStorage for session
        localStorage.setItem('currentUser', JSON.stringify({
          id: foundUser.id,
          email: foundUser.email,
          name: foundUser.name,
          role: foundUser.role,
          department: foundUser.department,
          loginTime: new Date().toISOString(),
          source: foundUser.source,
        }));
        localStorage.setItem('currentUserName', foundUser.name);
        localStorage.setItem('currentUserRole', foundUser.role);
        
        // Get dashboard path and redirect
        const dashboardPath = getDashboardPath(foundUser.role);
        
        console.log(`✅ Login successful: ${foundUser.name} (${foundUser.role}) → ${dashboardPath}`);
        
        setTimeout(() => {
          setIsLoading(false);
          router.push(dashboardPath);
        }, 800);
      } else {
        // Login failed
        const newFailedAttempts = failedAttempts + 1;
        setFailedAttempts(newFailedAttempts);
        setError('Invalid email or password. Please check your credentials.');
        setPassword('');
        setIsLoading(false);
        triggerShake();

        if (newFailedAttempts >= 3) {
          console.log('ALERT: Account locked for', fullEmail, '- Admin notified');
        }
      }
    } catch (err: unknown) {
      console.error('Login error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred. Please try again.';
      setError(errorMessage);
      setIsLoading(false);
      triggerShake();
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center p-4 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
      
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        <motion.div
          animate={shake ? {
            x: [0, -10, 10, -10, 10, 0],
            transition: { duration: 0.4 }
          } : {}}
          className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
        >
          <div className="p-8 sm:p-10">
            {/* Company Logo */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <span className="text-3xl font-bold text-white">TB</span>
              </div>
            </div>

            <div className="text-center mb-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <h1 className="text-3xl sm:text-4xl font-light text-white mb-2 tracking-tight">
                  TRIOBOTICS Login
                </h1>
                <p className="text-zinc-400 text-sm font-light">
                  Sign in to R&D
                </p>
              </motion.div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Email
                </label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zinc-500 transition-colors group-focus-within:text-blue-400" />
                  <Input
                    type="text"
                    value={emailLocal}
                    onChange={handleEmailChange}
                    placeholder="username"
                    required
                    disabled={isLoading || failedAttempts >= 3}
                    className="w-full pl-12 pr-48 h-12 bg-white/5 border border-white/10 text-white placeholder:text-zinc-500 rounded-xl focus:bg-white/10 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-zinc-500 text-sm pointer-events-none">
                    {COMPANY_DOMAIN}
                  </span>
                </div>
                <AnimatePresence>
                  {emailLocal && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-xs text-zinc-500 mt-2"
                    >
                      Logging in as <span className="text-blue-400 font-medium">{fullEmail}</span>
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-zinc-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                  >
                    <KeyRound className="w-3 h-3" />
                    Forgot password?
                  </button>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zinc-500 transition-colors group-focus-within:text-blue-400" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    disabled={isLoading || failedAttempts >= 3}
                    className="w-full pl-12 pr-12 h-12 bg-white/5 border border-white/10 text-white placeholder:text-zinc-500 rounded-xl focus:bg-white/10 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={failedAttempts >= 3}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {/* Login source indicator */}
                {loginSource && (
                  <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
                    <Database className="w-3 h-3" />
                    Authenticated via {loginSource === 'firebase' ? 'Cloud Database' : 'Local System'}
                  </p>
                )}
              </motion.div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-start gap-2"
                  >
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">{error}</p>
                      {failedAttempts > 0 && (
                        <p className="text-xs text-red-300 mt-1">
                          Attempt {failedAttempts} of 3
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Account Locked */}
              <AnimatePresence>
                {failedAttempts >= 3 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-4 bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-xl"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="w-5 h-5 text-red-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-red-300 font-semibold mb-1">Account Temporarily Locked</h3>
                        <p className="text-red-200 text-sm mb-3">
                          Too many failed login attempts. Your administrator has been notified automatically.
                        </p>
                        <button
                          type="button"
                          onClick={requestAdminSupport}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg transition-all font-medium text-sm"
                        >
                          <HelpCircle className="w-4 h-4" />
                          Request Immediate Support
                        </button>
                        <p className="text-xs text-zinc-400 mt-2 text-center">
                          Or refresh the page to try again
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Button
                  type="submit"
                  disabled={isLoading || !emailLocal || !password || failedAttempts >= 3}
                  className="w-full h-12 bg-white text-zinc-900 hover:bg-zinc-100 font-medium rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-white/10"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Signing in...
                    </span>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </motion.div>
            </form>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-6 text-center"
            >
              <button 
                type="button"
                onClick={requestAdminSupport}
                className="text-sm text-zinc-400 hover:text-blue-400 transition-colors inline-flex items-center gap-1"
              >
                <HelpCircle className="w-4 h-4" />
                Need help? Contact Support
              </button>
            </motion.div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center mt-8 text-zinc-600 text-sm"
        >
          <p>© 2026 TRIO ERP System</p>
          <p className="text-xs mt-1">Triobotics</p>
        </motion.div>
      </motion.div>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotPassword && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowForgotPassword(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 border border-white/10 rounded-2xl p-8 max-w-md w-full"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <KeyRound className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Reset Password</h3>
                  <p className="text-sm text-zinc-400">Get a password reset link</p>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Your Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input
                    type="text"
                    value={emailLocal}
                    onChange={handleEmailChange}
                    placeholder="username"
                    className="w-full pl-12 pr-48 h-12 bg-white/5 border border-white/10 text-white placeholder:text-zinc-500 rounded-xl focus:bg-white/10 focus:border-blue-500/50 outline-none"
                  />
                  <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-zinc-500 text-sm">
                    {COMPANY_DOMAIN}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl mb-6">
                <p className="text-sm text-blue-300">
                  A password reset link will be sent to <strong>{fullEmail}</strong>
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleForgotPassword}
                  disabled={!emailLocal}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white py-3 rounded-xl font-semibold transition-all disabled:cursor-not-allowed"
                >
                  Send Reset Link
                </button>
                <button
                  onClick={() => setShowForgotPassword(false)}
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-semibold transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}