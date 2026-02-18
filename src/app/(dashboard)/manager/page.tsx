'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, TrendingUp, Package, CheckCircle, 
  Search, Eye, Award, BarChart3, RefreshCw
} from 'lucide-react';
import { db } from '@/lib/firebase/client';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';

interface DailyLog {
  id: string;
  supervisor?: string;
  jobId?: string;
  projectId?: string;
  partType?: string;
  partName?: string;
  process?: string;
  quantity?: number;
  tei?: number;
  status?: string;
  time?: string;
  timestamp?: string;
  date?: string;
  materials?: { resin?: number; fiber?: number; gelcoat?: number };
}

interface SupervisorSummary {
  name: string;
  tasksToday: number;
  avgTEI: number;
  status: 'active' | 'break';
}

export default function ManagerDashboard() {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);

  // ════════ FIREBASE LISTENERS ════════
  useEffect(() => {
    const q = query(collection(db, 'daily_logs'), orderBy('timestamp', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const items: DailyLog[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as DailyLog));
      setLogs(items);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  // ════════ COMPUTED DATA ════════
  const dayLogs = useMemo(() => {
    return logs.filter(l => {
      const logDate = l.date || l.timestamp?.split('T')[0] || '';
      return logDate === selectedDate;
    });
  }, [logs, selectedDate]);

  const supervisors = useMemo<SupervisorSummary[]>(() => {
    const map = new Map<string, { tasks: number; totalTEI: number; count: number }>();
    dayLogs.forEach(l => {
      const name = l.supervisor || 'Unknown';
      const cur = map.get(name) || { tasks: 0, totalTEI: 0, count: 0 };
      cur.tasks++;
      if (l.tei) { cur.totalTEI += l.tei; cur.count++; }
      map.set(name, cur);
    });
    return Array.from(map.entries()).map(([name, d]) => ({
      name,
      tasksToday: d.tasks,
      avgTEI: d.count > 0 ? Math.round((d.totalTEI / d.count) * 10) / 10 : 0,
      status: 'active' as const
    }));
  }, [dayLogs]);

  const totalTasks = dayLogs.length;
  const completedTasks = dayLogs.filter(t => t.status === 'Completed' || t.status === 'completed').length;
  const avgTEI = totalTasks > 0 ? (dayLogs.reduce((sum, t) => sum + (t.tei || 0), 0) / totalTasks).toFixed(1) : '0';
  const totalProduction = dayLogs.reduce((sum, t) => sum + (t.quantity || 0), 0);
  const activeSupervisors = supervisors.length;

  const filteredTasks = useMemo(() => {
    return dayLogs.filter(task => {
      const matchesSearch = !searchTerm || 
        (task.partName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (task.supervisor || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (task.projectId || task.jobId || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const tei = task.tei || 0;
      const matchesFilter = selectedFilter === 'all' ? true :
        selectedFilter === 'high' ? tei >= 85 :
        selectedFilter === 'medium' ? tei >= 70 && tei < 85 :
        selectedFilter === 'low' ? tei < 70 : true;
      
      return matchesSearch && matchesFilter;
    });
  }, [dayLogs, searchTerm, selectedFilter]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-slate-800/50 border-b border-slate-700 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-7 h-7" />
                Production Manager Dashboard
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Monitor & Analyze Factory Production Performance
              </p>
            </div>
            <div className="text-right">
              <p className="text-slate-400 text-sm">Logged in as:</p>
              <p className="text-white font-semibold">manager@triovisioninternational.com</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* KPI Cards - Top Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 text-white shadow-xl"
          >
            <div className="flex justify-between items-start mb-2">
              <Users className="w-8 h-8 text-blue-200 opacity-50" />
            </div>
            <h3 className="text-3xl font-bold">{activeSupervisors}/{supervisors.length}</h3>
            <p className="text-blue-100 text-sm mt-1">Active Supervisors</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-6 text-white shadow-xl"
          >
            <div className="flex justify-between items-start mb-2">
              <Package className="w-8 h-8 text-green-200 opacity-50" />
            </div>
            <h3 className="text-3xl font-bold">{totalTasks}</h3>
            <p className="text-green-100 text-sm mt-1">Total Tasks Today</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-6 text-white shadow-xl"
          >
            <div className="flex justify-between items-start mb-2">
              <TrendingUp className="w-8 h-8 text-purple-200 opacity-50" />
            </div>
            <h3 className="text-3xl font-bold">{avgTEI}%</h3>
            <p className="text-purple-100 text-sm mt-1">Average TEI</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl p-6 text-white shadow-xl"
          >
            <div className="flex justify-between items-start mb-2">
              <CheckCircle className="w-8 h-8 text-orange-200 opacity-50" />
            </div>
            <h3 className="text-3xl font-bold">{completedTasks}/{totalTasks}</h3>
            <p className="text-orange-100 text-sm mt-1">Tasks Completed</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-cyan-600 to-cyan-700 rounded-xl p-6 text-white shadow-xl"
          >
            <div className="flex justify-between items-start mb-2">
              <Package className="w-8 h-8 text-cyan-200 opacity-50" />
            </div>
            <h3 className="text-3xl font-bold">{totalProduction}</h3>
            <p className="text-cyan-100 text-sm mt-1">Units Produced</p>
          </motion.div>
        </div>

        {/* Supervisor Performance Cards */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Users className="w-6 h-6" />
            Supervisor Performance
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {supervisors.map((supervisor, idx) => (
              <motion.div
                key={supervisor.name}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 hover:border-blue-500/50 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-white text-lg">{supervisor.name}</h3>
                    <p className="text-slate-400 text-xs">{supervisor.tasksToday} tasks today</p>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${
                    supervisor.status === 'active' ? 'bg-green-400' : 'bg-yellow-400'
                  }`}></div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-sm">Tasks Today</span>
                    <span className="text-white font-bold">{supervisor.tasksToday}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-sm">Avg TEI</span>
                    <span className={`font-bold ${
                      supervisor.avgTEI >= 85 ? 'text-green-400' :
                      supervisor.avgTEI >= 70 ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {supervisor.avgTEI}%
                    </span>
                  </div>
                </div>

                {supervisor.avgTEI >= 90 && (
                  <div className="mt-3 flex items-center gap-2 text-yellow-400 text-xs">
                    <Award className="w-4 h-4" />
                    <span className="font-semibold">Top Performer</span>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Filters & Search */}
        <div className="mb-6 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-3 items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search tasks, supervisor, project..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none w-80"
              />
            </div>

            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="px-4 py-2 bg-slate-800 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="all">All TEI Levels</option>
              <option value="high">High (≥85%)</option>
              <option value="medium">Medium (70-85%)</option>
              <option value="low">Low (&lt;70%)</option>
            </select>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 bg-slate-800 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="text-slate-400 text-sm">
            Showing {filteredTasks.length} of {totalTasks} tasks
          </div>
        </div>

        {/* Production Tasks Table */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="text-left px-6 py-4 text-slate-300 font-semibold text-sm">Project ID</th>
                  <th className="text-left px-6 py-4 text-slate-300 font-semibold text-sm">Supervisor</th>
                  <th className="text-left px-6 py-4 text-slate-300 font-semibold text-sm">Part Details</th>
                  <th className="text-left px-6 py-4 text-slate-300 font-semibold text-sm">Process</th>
                  <th className="text-left px-6 py-4 text-slate-300 font-semibold text-sm">Quantity</th>
                  <th className="text-left px-6 py-4 text-slate-300 font-semibold text-sm">Time</th>
                  <th className="text-left px-6 py-4 text-slate-300 font-semibold text-sm">TEI</th>
                  <th className="text-left px-6 py-4 text-slate-300 font-semibold text-sm">Status</th>
                  <th className="text-left px-6 py-4 text-slate-300 font-semibold text-sm">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.length === 0 ? (
                  <tr><td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                    {loading ? <span className="flex items-center justify-center gap-2"><RefreshCw className="w-5 h-5 animate-spin" /> Loading...</span> : 'No tasks found for this date'}
                  </td></tr>
                ) : filteredTasks.map((task, index) => (
                  <motion.tr 
                    key={task.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-t border-slate-700 hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-sm font-semibold">
                        {task.projectId || task.jobId || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-white font-medium">{task.supervisor || '-'}</td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-white font-medium">{task.partType || '-'}</p>
                        <p className="text-slate-400 text-sm">{task.partName || ''}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-semibold">
                        {task.process || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-white">{task.quantity || 0} units</td>
                    <td className="px-6 py-4 text-slate-300 text-sm">{task.time || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-lg text-sm font-bold ${
                        (task.tei || 0) >= 85 ? 'bg-green-500/20 text-green-400' :
                        (task.tei || 0) >= 70 ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {task.tei ? `${task.tei}%` : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                        (task.status || '').toLowerCase() === 'completed' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                        (task.status || '').toLowerCase() === 'in progress' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                        'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                      }`}>
                        {task.status || 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Material Consumption Summary */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h3 className="text-slate-300 font-semibold mb-4 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Resin Consumption
            </h3>
            <p className="text-3xl font-bold text-orange-400">
              {dayLogs.reduce((sum, t) => sum + (t.materials?.resin || 0), 0).toFixed(1)} kg
            </p>
            <p className="text-slate-400 text-sm mt-2">Total used on {selectedDate}</p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h3 className="text-slate-300 font-semibold mb-4 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Fiber Consumption
            </h3>
            <p className="text-3xl font-bold text-blue-400">
              {dayLogs.reduce((sum, t) => sum + (t.materials?.fiber || 0), 0).toFixed(1)} kg
            </p>
            <p className="text-slate-400 text-sm mt-2">Total used on {selectedDate}</p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h3 className="text-slate-300 font-semibold mb-4 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Gelcoat Consumption
            </h3>
            <p className="text-3xl font-bold text-purple-400">
              {dayLogs.reduce((sum, t) => sum + (t.materials?.gelcoat || 0), 0).toFixed(1)} kg
            </p>
            <p className="text-slate-400 text-sm mt-2">Total used on {selectedDate}</p>
          </div>
        </div>
      </div>
    </div>
  );
}