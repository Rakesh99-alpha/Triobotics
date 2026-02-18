'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Layers, 
  Factory, 
  PackageCheck, 
  Truck, 
  LogOut,
  Cog,
  Warehouse,
  Users,
  FileText,
  Settings,
  Bell,
  ChevronDown,
  Wrench,
  ClipboardCheck,
  BarChart3,
  LucideIcon
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { db } from '@/lib/firebase/client';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { COLLECTIONS } from '@/types/purchase';
import { UserRole, getRoleConfig } from '@/types/user';

// Menu item interface
interface MenuItem {
  name: string;
  path: string;
  icon: LucideIcon;
  badge?: number;
  children?: MenuItem[];
  roles: UserRole[] | '*'; // Which roles can see this item
}

// Define all menu items with role permissions
const ALL_MENU_ITEMS: MenuItem[] = [
  { 
    name: 'R&D Dashboard', 
    path: '/rnd', 
    icon: LayoutDashboard, 
    roles: ['md', 'admin'] 
  },
  { 
    name: 'Store', 
    path: '/store', 
    icon: Warehouse, 
    roles: ['md', 'admin', 'store', 'purchase'] 
  },
  { 
    name: 'Purchase', 
    path: '/purchase', 
    icon: ShoppingCart, 
    roles: ['md', 'admin', 'purchase'] 
  },
  { 
    name: 'Data Entry', 
    path: '/empStore', 
    icon: Layers, 
    roles: ['md', 'admin', 'store'] 
  },
  { 
    name: 'Manufacturing', 
    path: '/production', 
    icon: Factory, 
    roles: ['admin', 'pm', 'supervisor'] 
  },
  { 
    name: 'My Tasks', 
    path: '/supervisor', 
    icon: ClipboardCheck, 
    roles: ['supervisor'] 
  },
  { 
    name: 'Project Manager', 
    path: '/pm', 
    icon: BarChart3, 
    roles: ['md', 'admin', 'pm'] 
  },
  { 
    name: 'Design', 
    path: '/design', 
    icon: Wrench, 
    roles: ['md', 'admin', 'design'] 
  },
  { 
    name: 'HR', 
    path: '/hr', 
    icon: Users, 
    roles: ['md', 'admin', 'hr'] 
  },
  { 
    name: 'Employees', 
    path: '/employee', 
    icon: Users, 
    roles: ['md', 'admin', 'hr'] 
  },
  { 
    name: 'Finished Goods', 
    path: '/fg-store', 
    icon: PackageCheck, 
    roles: ['md', 'admin', 'store', 'dispatch'] 
  },
  { 
    name: 'Dispatch', 
    path: '/dispatch', 
    icon: Truck, 
    roles: ['md', 'admin', 'dispatch'] 
  },
  { 
    name: 'Reports', 
    path: '/reports', 
    icon: FileText, 
    roles: '*' // All roles
  },
  { 
    name: 'Admin Panel', 
    path: '/admin', 
    icon: Settings, 
    roles: ['admin'] 
  },
];

export default function DynamicSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userProfile, signOut, loading } = useAuth();
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Filter menu items based on user role
  const menuItems = useMemo(() => {
    if (!userProfile) return [];
    
    return ALL_MENU_ITEMS.filter(item => {
      if (item.roles === '*') return true;
      return item.roles.includes(userProfile.role);
    });
  }, [userProfile]);

  // Listen for pending MD approvals
  useEffect(() => {
    if (!userProfile || !['md', 'admin'].includes(userProfile.role)) return;

    const q = query(
      collection(db, COLLECTIONS.PURCHASE_ORDERS),
      where('status', '==', 'pending_md_approval')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPendingApprovals(snapshot.docs.length);
    }, (error) => {
      console.error('Error listening to pending approvals:', error);
    });

    return () => unsubscribe();
  }, [userProfile]);

  const handleLogout = async () => {
    await signOut();
  };

  const isActivePath = (path: string) => {
    if (path === '/rnd') return pathname === '/rnd';
    return pathname === path || pathname?.startsWith(path + '/');
  };

  if (loading || !userProfile) {
    return (
      <div className="w-64 h-screen flex flex-col fixed left-0 top-0 z-50 bg-zinc-950/80 backdrop-blur-xl border-r border-white/10">
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  const roleConfig = getRoleConfig(userProfile.role);

  return (
    <motion.div 
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="w-64 h-screen flex flex-col fixed left-0 top-0 z-50 bg-zinc-950/80 backdrop-blur-xl border-r border-white/10"
    >
      {/* Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:2rem_2rem] pointer-events-none" />
      
      {/* Glow Effects */}
      <div className="absolute top-0 left-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      
      {/* Header */}
      <div className="relative h-16 flex items-center px-5 border-b border-white/10">
        <div className="flex items-center">
          <div className="w-9 h-9 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center font-bold text-white mr-3 shadow-lg shadow-cyan-500/20">
            TV
          </div>
          <span className="font-bold tracking-wider text-white">TRIOVISION</span>
        </div>
      </div>

      {/* User Info */}
      <div className="relative px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-${roleConfig?.color || 'blue'}-500 to-${roleConfig?.color || 'blue'}-600 flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
            {userProfile.displayName?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{userProfile.displayName}</p>
            <p className="text-xs text-zinc-400 truncate">{roleConfig?.name || userProfile.role}</p>
          </div>
          {pendingApprovals > 0 && (
            <div className="relative">
              <Bell className="w-5 h-5 text-zinc-400" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {pendingApprovals}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Menu */}
      <nav className="relative flex-1 p-4 space-y-1 overflow-y-auto">
        <AnimatePresence>
          {menuItems.map((item, index) => {
            const isActive = isActivePath(item.path);
            const Icon = item.icon;
            
            return (
              <motion.div
                key={item.path}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link href={item.path}>
                  <div className={`relative flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive 
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25' 
                      : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                  }`}>
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="truncate">{item.name}</span>
                    
                    {/* Badge for notifications */}
                    {item.path === '/rnd' && pendingApprovals > 0 && (
                      <span className="ml-auto px-2 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full">
                        {pendingApprovals}
                      </span>
                    )}
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </nav>

      {/* Footer */}
      <div className="relative p-4 border-t border-white/10">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </motion.button>
      </div>
    </motion.div>
  );
}
