'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  CheckCircle, 
  RefreshCw,
  Shield,
  AlertTriangle,
  Eye,
  EyeOff,
  UserPlus,
  Copy,
  Check,
  Loader2
} from 'lucide-react';
import { db, auth } from '@/lib/firebase/client';
import { 
  collection, 
  doc,
  getDocs,
  setDoc
} from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { USER_COLLECTIONS, UserRole, ROLE_CONFIGS, UserProfile } from '@/types/user';

// Default Users to Seed - Each with role and department
const DEFAULT_USERS: Array<{
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
  department: string;
  phone: string;
}> = [
  // Management - 3 Managing Directors
  { email: 'sunil@triovisioninternational.com', password: 'Trio@2025', displayName: 'Sunil Kumar', role: 'md', department: 'Management', phone: '+91 9876543210' },
  { email: 'rajesh@triovisioninternational.com', password: 'Trio@2025', displayName: 'Rajesh Reddy', role: 'md', department: 'Management', phone: '+91 9876543201' },
  { email: 'venkat@triovisioninternational.com', password: 'Trio@2025', displayName: 'Venkat Rao', role: 'md', department: 'Management', phone: '+91 9876543202' },
  { email: 'admin@triovisioninternational.com', password: 'Trio@2025', displayName: 'System Admin', role: 'admin', department: 'IT', phone: '+91 9876543211' },
  
  // HR Department
  { email: 'naveen@triovisioninternational.com', password: 'Trio@2025', displayName: 'Naveen Kumar', role: 'hr', department: 'HR', phone: '+91 9876543212' },
  { email: 'naresh@triovisioninternational.com', password: 'Trio@2025', displayName: 'Naresh Reddy', role: 'hr', department: 'HR', phone: '+91 9876543213' },
  { email: 'dhathri@triovisioninternational.com', password: 'Trio@2025', displayName: 'Dhathri S', role: 'hr', department: 'HR', phone: '+91 9876543214' },
  { email: 'prasuna@triovisioninternational.com', password: 'Trio@2025', displayName: 'Prasuna K', role: 'hr', department: 'HR', phone: '+91 9876543215' },
  
  // Store Department
  { email: 'store1@triovisioninternational.com', password: 'Trio@2025', displayName: 'Store Manager 1', role: 'store', department: 'Store', phone: '+91 9876543216' },
  { email: 'store2@triovisioninternational.com', password: 'Trio@2025', displayName: 'Store Manager 2', role: 'store', department: 'Store', phone: '+91 9876543217' },
  
  // Supervisors
  { email: 'supervisor@triovisioninternational.com', password: 'Trio@2025', displayName: 'Production Supervisor', role: 'supervisor', department: 'Production', phone: '+91 9876543218' },
  
  // Project Manager
  { email: 'pm@triovisioninternational.com', password: 'Trio@2025', displayName: 'Project Manager', role: 'pm', department: 'Projects', phone: '+91 9876543219' },
  
  // Purchase Team
  { email: 'purchase@triovisioninternational.com', password: 'Trio@2025', displayName: 'Purchase Manager', role: 'purchase', department: 'Purchase', phone: '+91 9876543220' },
  
  // Design Team
  { email: 'design@triovisioninternational.com', password: 'Trio@2025', displayName: 'Design Engineer', role: 'design', department: 'Design', phone: '+91 9876543221' },
  
  // Quality Team
  { email: 'quality@triovisioninternational.com', password: 'Trio@2025', displayName: 'Quality Inspector', role: 'quality', department: 'Quality', phone: '+91 9876543222' },
];

export default function UserSetupPage() {
  const [status, setStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [existingUsers, setExistingUsers] = useState<UserProfile[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [seedProgress, setSeedProgress] = useState<{current: number; total: number; email: string} | null>(null);
  const [mounted, setMounted] = useState(false);

  // Define function before useEffect to avoid "accessed before declaration" error
  const fetchExistingUsers = async () => {
    try {
      const usersRef = collection(db, USER_COLLECTIONS.USERS);
      const snapshot = await getDocs(usersRef);
      const users: UserProfile[] = [];
      snapshot.forEach((doc) => {
        users.push({ ...doc.data(), uid: doc.id } as UserProfile);
      });
      setExistingUsers(users);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  // Handle client-side mounting
  useEffect(() => {
    setMounted(true);
    fetchExistingUsers();
  }, []);

  const createSingleUser = async (userData: typeof DEFAULT_USERS[0]): Promise<{ success: boolean; uid?: string; error?: string }> => {
    try {
      // 1. Create Firebase Auth user
      const credential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
      const uid = credential.user.uid;
      
      // 2. Create Firestore user profile
      const roleConfig = ROLE_CONFIGS.find(r => r.id === userData.role);
      const profile: UserProfile = {
        uid,
        email: userData.email.toLowerCase(),
        displayName: userData.displayName,
        role: userData.role,
        department: userData.department,
        phone: userData.phone,
        isActive: true,
        permissions: roleConfig?.defaultPermissions || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system-setup',
      };
      
      await setDoc(doc(db, USER_COLLECTIONS.USERS, uid), profile);
      
      return { success: true, uid };
    } catch (error: unknown) {
      // Check if user already exists
      const firebaseError = error as { code?: string; message?: string };
      if (firebaseError.code === 'auth/email-already-in-use') {
        return { success: false, error: 'Email already exists' };
      }
      return { success: false, error: firebaseError.message || 'Unknown error' };
    }
  };

  const seedAllUsers = async () => {
    setIsLoading(true);
    setStatus('Starting user seeding...');
    setSeedProgress({ current: 0, total: DEFAULT_USERS.length, email: '' });
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < DEFAULT_USERS.length; i++) {
      const user = DEFAULT_USERS[i];
      setSeedProgress({ current: i + 1, total: DEFAULT_USERS.length, email: user.email });
      
      const result = await createSingleUser(user);
      
      if (result.success) {
        successCount++;
      } else if (result.error === 'Email already exists') {
        skipCount++;
      } else {
        errorCount++;
        console.error(`Failed to create ${user.email}:`, result.error);
      }
      
      // Small delay between users to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setSeedProgress(null);
    setStatus(`✅ Completed: ${successCount} created, ${skipCount} already existed, ${errorCount} errors`);
    setIsLoading(false);
    
    // Refresh existing users list
    await fetchExistingUsers();
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const getRoleBadgeColor = (role: UserRole) => {
    const colors: Record<UserRole, string> = {
      md: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      admin: 'bg-red-500/20 text-red-400 border-red-500/30',
      hr: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      pm: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      supervisor: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      store: 'bg-green-500/20 text-green-400 border-green-500/30',
      purchase: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      design: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
      quality: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      dispatch: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
      viewer: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
    };
    return colors[role] || colors.viewer;
  };

  // Show loading state until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#020202] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
          <p className="text-zinc-400 text-sm">Loading setup page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020202] text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Users className="w-8 h-8 text-blue-400" />
          User Setup & Management
        </h1>
        <p className="text-zinc-400 mt-1">Seed initial Firebase Auth users for the ERP system</p>
      </div>

      {/* Warning */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-8">
        <div className="flex items-center gap-2 text-yellow-400 mb-2">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-medium">First-Time Setup</span>
        </div>
        <p className="text-sm text-zinc-400">
          This will create Firebase Auth users and Firestore profiles. Users that already exist will be skipped.
          Default password for all users is <code className="bg-zinc-800 px-2 py-0.5 rounded">Trio@2025</code>
        </p>
      </div>

      {/* Main Action */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={seedAllUsers}
          disabled={isLoading}
          className="p-6 rounded-xl border bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/30 hover:border-blue-500/50 transition-colors disabled:opacity-50"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <UserPlus className="w-6 h-6 text-blue-400" />
            </div>
            <div className="text-left">
              <span className="font-semibold text-lg">Seed All Users</span>
              <p className="text-sm text-zinc-400">{DEFAULT_USERS.length} users will be created</p>
            </div>
          </div>
          {isLoading && seedProgress && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-zinc-400">Creating: {seedProgress.email.split('@')[0]}</span>
                <span className="text-blue-400">{seedProgress.current}/{seedProgress.total}</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(seedProgress.current / seedProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </motion.button>

        <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-400" />
              Existing Users
            </h3>
            <button
              onClick={fetchExistingUsers}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4 text-zinc-400" />
            </button>
          </div>
          <div className="text-3xl font-bold text-green-400">{existingUsers.length}</div>
          <p className="text-sm text-zinc-400">users in Firestore</p>
        </div>
      </div>

      {/* Status */}
      <AnimatePresence>
        {status && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 mb-8"
          >
            <div className="flex items-center gap-2">
              {isLoading && <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />}
              <span>{status}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Users to be Created */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden mb-8">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            Default Users ({DEFAULT_USERS.length})
          </h3>
          <button
            onClick={() => setShowPasswords(!showPasswords)}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showPasswords ? 'Hide' : 'Show'} Passwords
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-zinc-500 text-xs bg-zinc-900/50">
              <tr>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Role</th>
                <th className="text-left p-3">Department</th>
                <th className="text-left p-3">Password</th>
                <th className="text-center p-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {DEFAULT_USERS.map((user, idx) => (
                <tr key={idx} className="hover:bg-zinc-800/50 transition-colors">
                  <td className="p-3">
                    <span className="text-blue-400">{user.email.split('@')[0]}</span>
                    <span className="text-zinc-500">@triovision...</span>
                  </td>
                  <td className="p-3">{user.displayName}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs border ${getRoleBadgeColor(user.role)}`}>
                      {user.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-3 text-zinc-400">{user.department}</td>
                  <td className="p-3">
                    <span className="font-mono text-zinc-400">
                      {showPasswords ? user.password : '••••••••'}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => copyToClipboard(`${user.email}\n${user.password}`, user.email)}
                      className="p-2 hover:bg-zinc-700 rounded-lg transition-colors"
                      title="Copy credentials"
                    >
                      {copied === user.email ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-zinc-400" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Permissions Info */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800">
          <h3 className="font-semibold flex items-center gap-2">
            <Shield className="w-4 h-4 text-purple-400" />
            Role Permissions
          </h3>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ROLE_CONFIGS.map((config) => (
            <div key={config.id} className={`p-4 rounded-lg border ${getRoleBadgeColor(config.id)}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold">{config.name}</span>
              </div>
              <p className="text-xs text-zinc-400 mb-2">{config.description}</p>
              <div className="text-xs">
                <span className="text-zinc-500">Dashboard: </span>
                <span className="text-zinc-300">{config.dashboardPath}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {config.defaultPermissions.slice(0, 3).map((perm) => (
                  <span key={perm} className="px-1.5 py-0.5 bg-zinc-800 rounded text-xs text-zinc-400">
                    {perm}
                  </span>
                ))}
                {config.defaultPermissions.length > 3 && (
                  <span className="px-1.5 py-0.5 bg-zinc-800 rounded text-xs text-zinc-500">
                    +{config.defaultPermissions.length - 3} more
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Existing Users Table */}
      {existingUsers.length > 0 && (
        <div className="mt-8 bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-zinc-800">
            <h3 className="font-semibold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              Active Users in Database ({existingUsers.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-zinc-500 text-xs bg-zinc-900/50">
                <tr>
                  <th className="text-left p-3">Email</th>
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Role</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {existingUsers.map((user) => (
                  <tr key={user.uid} className="hover:bg-zinc-800/50 transition-colors">
                    <td className="p-3 text-blue-400">{user.email}</td>
                    <td className="p-3">{user.displayName}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs border ${getRoleBadgeColor(user.role)}`}>
                        {user.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3">
                      {user.isActive ? (
                        <span className="text-green-400 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="text-red-400">Inactive</span>
                      )}
                    </td>
                    <td className="p-3 text-zinc-400 text-xs">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
