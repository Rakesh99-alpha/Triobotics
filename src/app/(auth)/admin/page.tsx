'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, Users, Activity, Server, 
  Search, Trash2, RotateCcw, UserPlus, 
  BarChart3, LogOut, Settings,
  TrendingUp, Clock, HardDrive, RefreshCw,
  Download, X,
  LucideIcon
} from 'lucide-react';

// KPI Card Component - defined outside component to avoid recreation on each render
interface KPICardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  trend?: string;
}

const KPICard = ({ label, value, icon: Icon, color, trend }: KPICardProps) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }} 
    animate={{ opacity: 1, y: 0 }} 
    className="backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden group hover:border-white/20 transition-all"
  >
    <div className={`absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl -mr-20 -mt-20 opacity-10 group-hover:opacity-20 transition-opacity ${color}`} />
    <div className="relative z-10">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color.replace('bg', 'bg')} bg-opacity-20 border border-white/10`}>
          <Icon className={`w-6 h-6 ${color.replace('bg', 'text')}`} />
        </div>
        {trend && <span className="text-green-400 text-xs font-bold flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {trend}</span>}
      </div>
      <h3 className="text-zinc-400 text-sm font-medium mb-2">{label}</h3>
      <div className="text-3xl font-black text-white">{value}</div>
    </div>
  </motion.div>
);

// User interface for proper typing
interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
}

interface LogEntry {
  id: number;
  action: string;
  user: string;
  timestamp: string;
  status: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, admins: 0, inactive: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [systemStats, setSystemStats] = useState({
    uptime: '45d 12h',
    memoryUsage: 65,
    storageUsage: 42,
    cpuUsage: 28,
    lastBackup: '2 hours ago',
    apiRequests: 15420,
    errorRate: 0.2
  });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showConfirm, setShowConfirm] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Load Users from localStorage
    try {
      const savedUsers = JSON.parse(localStorage.getItem('erp_users') || "[]");
      setUsers(savedUsers);
      
      // Calculate Stats
      setStats({
        total: savedUsers.length,
        active: savedUsers.filter((u: User) => u.status === 'Active').length,
        admins: savedUsers.filter((u: User) => u.role === 'admin' || u.role === 'md').length,
        inactive: savedUsers.filter((u: User) => u.status !== 'Active').length
      });

      // Load logs
      const savedLogs = JSON.parse(localStorage.getItem('admin_logs') || "[]").slice(-10);
      setLogs(savedLogs);
    } catch (e) {
      console.error('Error loading data:', e);
    }
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const handleExportUsers = () => {
    const dataStr = JSON.stringify(users, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `users-export-${new Date().getTime()}.json`;
    link.click();
    
    const newLog = {
      id: Date.now(),
      action: 'EXPORT_DATA',
      user: 'System',
      timestamp: new Date().toLocaleTimeString(),
      status: 'success'
    };
    const updatedLogs = [newLog, ...logs].slice(0, 10);
    setLogs(updatedLogs);
    localStorage.setItem('admin_logs', JSON.stringify(updatedLogs));
  };

  const handleDeleteUser = (id: number, name: string) => {
    setShowConfirm(null);
    const updated = users.filter(u => u.id !== id);
    setUsers(updated);
    localStorage.setItem('erp_users', JSON.stringify(updated));
    
    // Log the action
    const newLog = {
      id: Date.now(),
      action: 'DELETE_USER',
      user: name,
      timestamp: new Date().toLocaleTimeString(),
      status: 'success'
    };
    const updatedLogs = [newLog, ...logs].slice(0, 10);
    setLogs(updatedLogs);
    localStorage.setItem('admin_logs', JSON.stringify(updatedLogs));
  };

  const handleResetPassword = (userId: number, userName: string) => {
    setShowConfirm(null);
    const newLog = {
      id: Date.now(),
      action: 'RESET_PASSWORD',
      user: userName,
      timestamp: new Date().toLocaleTimeString(),
      status: 'success'
    };
    const updatedLogs = [newLog, ...logs].slice(0, 10);
    setLogs(updatedLogs);
    localStorage.setItem('admin_logs', JSON.stringify(updatedLogs));
  };

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6 md:p-8">
      
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8"
      >
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white">System Administration</h1>
          <p className="text-zinc-400 mt-2">Platform Health & Security Management</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-bold text-green-400">SYSTEM ONLINE</span>
          </div>
          <button 
            onClick={handleRefresh}
            className="p-2 hover:bg-white/10 rounded-lg transition-all" 
            title="Refresh"
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-5 h-5 text-zinc-400 hover:text-white ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={handleExportUsers}
            className="p-2 hover:bg-white/10 rounded-lg transition-all" 
            title="Export Data"
          >
            <Download className="w-5 h-5 text-zinc-400 hover:text-white" />
          </button>
          <button className="p-2 hover:bg-white/10 rounded-lg transition-all" title="Settings">
            <Settings className="w-5 h-5 text-zinc-400 hover:text-white" />
          </button>
          <button onClick={() => router.push('/login')} className="p-2 hover:bg-white/10 rounded-lg transition-all" title="Logout">
            <LogOut className="w-5 h-5 text-zinc-400 hover:text-white" />
          </button>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <KPICard label="Total Users" value={stats.total} icon={Users} color="bg-blue-500" trend="+2 this week" />
        <KPICard label="Active Sessions" value={stats.active} icon={Activity} color="bg-green-500" trend="+1 today" />
        <KPICard label="Admin Users" value={stats.admins} icon={Shield} color="bg-purple-500" />
        <KPICard label="System Health" value="99.8%" icon={Server} color="bg-emerald-500" trend="Optimal" />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        
        {/* User Management Panel - Spans 2 columns */}
        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-400" /> User Management
            </h2>
            <button 
              onClick={() => router.push('/register')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-900/20"
            >
              <UserPlus className="w-4 h-4" /> Add User
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-6 flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
              <input 
                placeholder="Search users..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-900/50 border border-white/10 rounded-lg text-sm text-white outline-none focus:border-blue-500 transition-all"
              />
            </div>
            <select 
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-4 py-2.5 bg-zinc-900/50 border border-white/10 rounded-lg text-sm text-white outline-none focus:border-blue-500 transition-all"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="md">MD</option>
              <option value="manager">Manager</option>
              <option value="employee">Employee</option>
            </select>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/5 text-zinc-400 text-xs font-bold uppercase">
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users
                  .filter(u => 
                    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) &&
                    (filterRole === 'all' || u.role === filterRole)
                  )
                  .map((user) => (
                  <motion.tr 
                    key={user.id} 
                    className="hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => setSelectedUser(user)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <td className="px-4 py-4 font-bold flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold">
                        {user.name?.charAt(0).toUpperCase()}
                      </div>
                      {user.name}
                    </td>
                    <td className="px-4 py-4">
                      <span className="px-2 py-1 rounded text-xs font-bold uppercase bg-white/5 border border-white/10 text-zinc-300">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-zinc-400 text-xs font-mono">{user.email}</td>
                    <td className="px-4 py-4 text-center">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                        Active
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right flex justify-end gap-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowConfirm(`reset-${user.id}`);
                        }}
                        className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-all" 
                        title="Reset Password"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowConfirm(`delete-${user.id}`);
                        }}
                        className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all" 
                        title="Delete User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <div className="text-center py-12 text-zinc-500">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No users in database</p>
              </div>
            )}
          </div>
        </div>

        {/* System Status - Sidebar */}
        <div className="space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-purple-400" /> Resources
            </h3>
            <div className="space-y-4">
              <StatBar label="Memory" value={systemStats.memoryUsage} color="bg-blue-500" />
              <StatBar label="Storage" value={systemStats.storageUsage} color="bg-amber-500" />
              <StatBar label="CPU" value={systemStats.cpuUsage} color="bg-green-500" />
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-400" /> System Info
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400">Uptime</span>
                <span className="text-white font-bold">{systemStats.uptime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Last Backup</span>
                <span className="text-white font-bold">{systemStats.lastBackup}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Version</span>
                <span className="text-white font-bold">2.1.0</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-white/5">
                <span className="text-zinc-400">API Requests</span>
                <span className="text-white font-bold">{systemStats.apiRequests.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Error Rate</span>
                <span className={`font-bold ${systemStats.errorRate < 1 ? 'text-green-400' : 'text-red-400'}`}>{systemStats.errorRate}%</span>
              </div>
            </div>
          </div>

          {selectedUser && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-6 backdrop-blur-xl"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-white">Selected User</h3>
                <button 
                  onClick={() => setSelectedUser(null)}
                  className="text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Name</span>
                  <span className="text-white font-bold">{selectedUser.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Email</span>
                  <span className="text-white font-bold text-xs">{selectedUser.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Role</span>
                  <span className="text-white font-bold capitalize">{selectedUser.role}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Status</span>
                  <span className="text-green-400 font-bold">Active</span>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Activity Logs */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-green-400" /> Activity Logs
        </h3>
        <div className="space-y-2">
          {logs.length === 0 ? (
            <p className="text-zinc-500 text-sm">No recent activity</p>
          ) : (
            logs.map(log => (
              <div key={log.id} className="flex items-center justify-between px-4 py-3 bg-zinc-900/30 rounded-lg border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-bold text-white">{log.action}</p>
                    <p className="text-xs text-zinc-500">{log.user} • {log.timestamp}</p>
                  </div>
                </div>
                <span className="px-2 py-1 bg-green-500/10 border border-green-500/20 rounded text-xs font-bold text-green-400">
                  {log.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-sm"
            >
              <h3 className="text-xl font-bold mb-2 text-white">
                {showConfirm.startsWith('delete') ? 'Delete User?' : 'Reset Password?'}
              </h3>
              <p className="text-zinc-400 mb-6 text-sm">
                {showConfirm.startsWith('delete') 
                  ? 'This action cannot be undone.' 
                  : 'The user will receive a new temporary password.'}
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowConfirm(null)}
                  className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    const userId = parseInt(showConfirm.split('-')[1]);
                    const user = users.find(u => u.id === userId);
                    if (showConfirm.startsWith('delete')) {
                      handleDeleteUser(userId, user?.name || 'Unknown');
                    } else {
                      handleResetPassword(userId, user?.name || 'Unknown');
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition-all"
                >
                  {showConfirm.startsWith('delete') ? 'Delete' : 'Reset'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper Component
interface StatBarProps {
  label: string;
  value: number;
  color: string;
}

const StatBar = ({ label, value, color }: StatBarProps) => (
  <div>
    <div className="flex justify-between mb-2">
      <span className="text-xs font-bold text-zinc-400">{label}</span>
      <span className="text-xs font-bold text-white">{value}%</span>
    </div>
    <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
      <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${value}%` }}></div>
    </div>
  </div>
);