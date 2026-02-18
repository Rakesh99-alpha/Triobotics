'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Factory,
  PackageCheck,
  Truck,
  LogOut,
  Warehouse,
  ClipboardList,
  Users,
  FileText,
  HardHat,
  Palette,
  UserCircle,
  Briefcase,
  ChevronDown,
  Shield,
  BarChart3,
} from 'lucide-react';
import { auth, db } from '@/lib/firebase/client';
import { signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { COLLECTIONS } from '@/types/purchase';

// ==========================================
// GROUPED ROLE-BASED MENU CONFIGURATION
// ==========================================

type MenuItem = {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: 'notification';
  roles: string[];
};

type MenuSection = {
  title: string;
  items: MenuItem[];
};

const MENU_SECTIONS: MenuSection[] = [
  {
    title: 'Overview',
    items: [
      { name: 'R&D Dashboard', path: '/rnd', icon: LayoutDashboard, badge: 'notification', roles: ['md'] },
      { name: 'Manager', path: '/manager', icon: BarChart3, roles: ['md', 'manager'] },
      { name: 'PM Dashboard', path: '/pm', icon: ClipboardList, roles: ['md', 'pm', 'project_manager'] },
    ],
  },
  {
    title: 'Operations',
    items: [
      { name: 'Production', path: '/production', icon: Factory, roles: ['md', 'production', 'supervisor', 'manufacturing'] },
      { name: 'Supervisor', path: '/supervisor', icon: HardHat, roles: ['md', 'supervisor'] },
      { name: 'Design & Tooling', path: '/design', icon: Palette, roles: ['md', 'design', 'tooling', 'tool_room'] },
      { name: 'Customer Specs', path: '/customer', icon: UserCircle, roles: ['md', 'customer', 'sales'] },
    ],
  },
  {
    title: 'Inventory',
    items: [
      { name: 'Store Dashboard', path: '/store', icon: Warehouse, roles: ['md', 'store', 'store_manager', 'inventory', 'empStore'] },
      { name: 'Data Entry', path: '/empStore', icon: FileText, roles: ['store', 'store_manager', 'inventory', 'data_entry', 'empStore'] },
      { name: 'Purchase', path: '/purchase', icon: ShoppingCart, roles: ['md', 'purchase', 'purchase_manager', 'purchase_team'] },
    ],
  },
  {
    title: 'Dispatch & FG',
    items: [
      { name: 'Finished Goods', path: '/fg-store', icon: PackageCheck, roles: ['md', 'fg_store', 'dispatch', 'store_manager'] },
      { name: 'Dispatch', path: '/dispatch', icon: Truck, roles: ['md', 'dispatch', 'logistics'] },
    ],
  },
  {
    title: 'People',
    items: [
      { name: 'HR Dashboard', path: '/hr', icon: Briefcase, roles: ['md', 'hr', 'admin'] },
      { name: 'Employees', path: '/employees', icon: Users, roles: ['md', 'hr', 'admin'] },
    ],
  },
];

// ==========================================
// HELPERS
// ==========================================

function getUserRole(): string {
  if (typeof window === 'undefined') return '';
  const storedUser = localStorage.getItem('currentUser');
  if (storedUser) {
    try {
      const user = JSON.parse(storedUser);
      return user.role?.toLowerCase()?.trim() || '';
    } catch {
      return '';
    }
  }
  return '';
}

function getUserName(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('currentUserName') || '';
}

// ==========================================
// COMPONENT
// ==========================================

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [userRole, setUserRole] = useState('');
  const [userName, setUserName] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setUserRole(getUserRole());
    setUserName(getUserName());
  }, []);

  // Build visible sections filtered by role
  const visibleSections = useMemo(() => {
    if (!userRole) return [];
    return MENU_SECTIONS
      .map(section => ({
        ...section,
        items: section.items.filter(item => item.roles.includes(userRole)),
      }))
      .filter(section => section.items.length > 0);
  }, [userRole]);

  // Pending MD approval badge count
  useEffect(() => {
    const q = query(
      collection(db, COLLECTIONS.PURCHASE_ORDERS),
      where('status', '==', 'pending_md_approval')
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setPendingApprovals(snap.docs.length);
    }, (err) => console.error('Approval listener error:', err));
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  const isActivePath = (path: string) => {
    if (path === '/rnd') return pathname === '/rnd';
    return pathname === path || pathname.startsWith(path + '/');
  };

  const toggleSection = (title: string) => {
    setCollapsed(prev => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <div className="w-64 h-screen flex flex-col fixed left-0 top-0 z-50 bg-zinc-950/80 backdrop-blur-xl border-r border-white/10">
      {/* Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:2rem_2rem] pointer-events-none" />
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

      {/* Menu - Grouped Sections */}
      <nav className="relative flex-1 px-3 py-4 overflow-y-auto space-y-1 scrollbar-thin">
        {visibleSections.length === 0 ? (
          <div className="text-zinc-500 text-sm px-4 py-2">No menu items for your role</div>
        ) : (
          visibleSections.map((section) => {
            const isCollapsed = collapsed[section.title];
            const hasActiveItem = section.items.some(i => isActivePath(i.path));

            return (
              <div key={section.title} className="mb-1">
                {/* Section Header */}
                <button
                  onClick={() => toggleSection(section.title)}
                  className="w-full flex items-center justify-between px-3 py-2 text-[10px] uppercase tracking-widest font-bold text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <span>{section.title}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
                </button>

                {/* Section Items */}
                {!isCollapsed && (
                  <div className="space-y-0.5">
                    {section.items.map((item) => {
                      const isActive = isActivePath(item.path);
                      const showBadge = item.badge === 'notification' && pendingApprovals > 0;

                      return (
                        <Link key={item.path} href={item.path}>
                          <div
                            className={`relative flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                              isActive
                                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
                                : 'text-zinc-400 hover:bg-white/5 hover:text-white border border-transparent'
                            }`}
                          >
                            <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : ''}`} />
                            <span className="truncate">{item.name}</span>

                            {showBadge && (
                              <span className="absolute right-3 flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                              </span>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </nav>

      {/* Footer - User + Logout */}
      <div className="relative p-3 border-t border-white/10 space-y-2">
        {/* User Info */}
        {userName && (
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-xs font-bold text-white shadow-lg">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{userName}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                <Shield className="w-2.5 h-2.5" /> {userRole || 'user'}
              </p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2.5 w-full rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 border border-transparent hover:border-red-500/20 transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}