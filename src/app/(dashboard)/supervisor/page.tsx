'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HardHat, Save, Users, Clock, ChevronRight, Sparkles,
  Target, X, Package, ClipboardList, RefreshCw, Plus,
  CheckCircle, AlertCircle, UserCheck
} from 'lucide-react';
import SupervisorMaterialRequest from './SupervisorMaterialRequest';
import { db } from '@/lib/firebase/client';
import {
  collection, onSnapshot, addDoc, updateDoc, doc,
  query, where
} from 'firebase/firestore';

// ── Animation variants ──────────────────────────────────────────────
const fadeInUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };
const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

// ── Types ────────────────────────────────────────────────────────────
interface Technician {
  id: string;
  name: string;
  role: string;
  department: string;
  status: 'active' | 'on_leave' | 'idle';
  shift: string;
  phone?: string;
}

interface DailyLog {
  id: string;
  technicianId: string;
  technicianName: string;
  department: string;
  task: string;
  hoursWorked: number;
  output: string;
  remarks: string;
  date: string;
  supervisor: string;
  createdAt: string;
}

type TabType = 'technicians' | 'daily-log' | 'materials';

// ── Component ────────────────────────────────────────────────────────
export default function SupervisorPage() {
  const [currentUser, setCurrentUser] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('technicians');
  const [loading, setLoading] = useState(true);

  // Technicians
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [showAddTech, setShowAddTech] = useState(false);
  const [newTech, setNewTech] = useState({ name: '', role: '', department: '', shift: 'Day', phone: '' });

  // Daily Log
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [showLogEntry, setShowLogEntry] = useState(false);
  const [logForm, setLogForm] = useState({
    technicianId: '', technicianName: '', task: '', hoursWorked: 8, output: '', remarks: '',
  });

  // ── Load Data ──────────────────────────────────────────────────────
  useEffect(() => {
    const user = localStorage.getItem('currentUserName') || 'Rajesh Kumar';
    setCurrentUser(user);

    // 1. Technicians
    const unsubTech = onSnapshot(collection(db, 'technicians'), (snap) => {
      setTechnicians(snap.docs.map(d => ({ id: d.id, ...d.data() } as Technician)));
      setLoading(false);
    }, () => setLoading(false));

    // 2. Daily logs (today)
    const todayStr = new Date().toISOString().split('T')[0];
    const logQ = query(collection(db, 'daily_logs'), where('date', '==', todayStr));
    const unsubLogs = onSnapshot(logQ, (snap) => {
      setDailyLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as DailyLog)));
    });

    return () => { unsubTech(); unsubLogs(); };
  }, []);

  // ── Stats ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const active = technicians.filter(t => t.status === 'active').length;
    const onLeave = technicians.filter(t => t.status === 'on_leave').length;
    const idle = technicians.filter(t => t.status === 'idle').length;
    const totalHoursToday = dailyLogs.reduce((s, l) => s + (l.hoursWorked || 0), 0);
    return { total: technicians.length, active, onLeave, idle, totalHoursToday, logsToday: dailyLogs.length };
  }, [technicians, dailyLogs]);

  // ── Add Technician ─────────────────────────────────────────────────
  const handleAddTechnician = async () => {
    if (!newTech.name || !newTech.role) return;
    try {
      await addDoc(collection(db, 'technicians'), {
        ...newTech,
        status: 'active',
        createdAt: new Date().toISOString(),
        addedBy: currentUser,
      });
      setNewTech({ name: '', role: '', department: '', shift: 'Day', phone: '' });
      setShowAddTech(false);
    } catch (err) {
      console.error('Add technician error:', err);
      alert('Failed to add technician.');
    }
  };

  // ── Toggle Status ──────────────────────────────────────────────────
  const toggleStatus = async (tech: Technician) => {
    const next: Record<string, string> = { active: 'idle', idle: 'on_leave', on_leave: 'active' };
    try {
      await updateDoc(doc(db, 'technicians', tech.id), { status: next[tech.status] });
    } catch (err) {
      console.error('Status update error:', err);
    }
  };

  // ── Submit Daily Log ───────────────────────────────────────────────
  const handleSubmitLog = async () => {
    if (!logForm.technicianName || !logForm.task) return;
    try {
      await addDoc(collection(db, 'daily_logs'), {
        ...logForm,
        department: technicians.find(t => t.id === logForm.technicianId)?.department || '',
        supervisor: currentUser,
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
      });
      setLogForm({ technicianId: '', technicianName: '', task: '', hoursWorked: 8, output: '', remarks: '' });
      setShowLogEntry(false);
    } catch (err) {
      console.error('Log submit error:', err);
      alert('Failed to submit log.');
    }
  };

  // ── Status badge helper ────────────────────────────────────────────
  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      active: 'bg-green-500/20 text-green-400 border-green-500/30',
      idle: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      on_leave: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    return map[s] || 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
  };

  // ══════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-8 font-sans text-white">

      {/* ── Header ────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex justify-between items-end">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
            <HardHat className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Supervisor Dashboard</h1>
            <p className="text-zinc-400">Technicians, Daily Logs & Material Requests</p>
          </div>
        </div>
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-zinc-500 uppercase font-bold">Logged In</p>
            <p className="text-white font-bold">{currentUser}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center font-bold shadow-lg shadow-purple-500/20">
            {currentUser.charAt(0)}
          </div>
        </motion.div>
      </motion.div>

      {/* ── Stat Cards ────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Technicians', value: stats.total, icon: Users, cls: 'text-blue-400' },
          { label: 'Active Today', value: stats.active, icon: UserCheck, cls: 'text-green-400' },
          { label: 'On Leave', value: stats.onLeave, icon: AlertCircle, cls: 'text-red-400' },
          { label: 'Logs Today', value: stats.logsToday, icon: ClipboardList, cls: 'text-purple-400' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}
            className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-500 uppercase font-bold">{s.label}</span>
              <s.icon className={`w-4 h-4 ${s.cls}`} />
            </div>
            <p className="text-3xl font-bold">{s.value}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Tabs ──────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="flex gap-2 bg-zinc-900/50 p-2 rounded-2xl border border-zinc-800">
        {([
          { key: 'technicians' as TabType, label: 'Technicians', icon: Users, activeBg: 'bg-gradient-to-r from-purple-600 to-purple-700', count: stats.total },
          { key: 'daily-log' as TabType, label: 'Daily Log', icon: ClipboardList, activeBg: 'bg-gradient-to-r from-green-600 to-green-700', count: stats.logsToday },
          { key: 'materials' as TabType, label: 'Material Requests', icon: Package, activeBg: 'bg-gradient-to-r from-orange-600 to-orange-700', count: undefined },
        ]).map(tab => (
          <motion.button key={tab.key} onClick={() => setActiveTab(tab.key)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all ${
              activeTab === tab.key
                ? `${tab.activeBg} text-white shadow-lg`
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}>
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === tab.key ? 'bg-white/20' : 'bg-zinc-700'}`}>
                {tab.count}
              </span>
            )}
          </motion.button>
        ))}
      </motion.div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* TAB CONTENT                                               */}
      {/* ══════════════════════════════════════════════════════════ */}

      {activeTab === 'materials' ? (
        <SupervisorMaterialRequest />

      ) : activeTab === 'daily-log' ? (
        /* ── Daily Log Tab ─────────────────────────────────────── */
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Today&apos;s Production Logs</h2>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => setShowLogEntry(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-600 to-green-500 rounded-xl font-bold text-sm shadow-lg shadow-green-500/20">
              <Plus className="w-4 h-4" /> New Entry
            </motion.button>
          </div>

          {dailyLogs.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-center py-20 bg-white/5 rounded-3xl border border-white/10 border-dashed">
              <ClipboardList className="w-12 h-12 mx-auto mb-3 text-zinc-600" />
              <p className="text-zinc-500">No logs submitted today. Click &quot;New Entry&quot; to start.</p>
            </motion.div>
          ) : (
            <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-3">
              {dailyLogs.map((log, i) => (
                <motion.div key={log.id} variants={fadeInUp} transition={{ delay: i * 0.04 }}
                  className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-bold text-white">{log.technicianName}</span>
                      <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-xs font-bold border border-blue-500/30">
                        {log.department || 'General'}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-400">{log.task}</p>
                    {log.output && <p className="text-xs text-zinc-500 mt-1">Output: {log.output}</p>}
                    {log.remarks && <p className="text-xs text-zinc-600 mt-0.5 italic">{log.remarks}</p>}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-zinc-500 uppercase">Hours</p>
                      <p className="text-lg font-bold text-green-400">{log.hoursWorked}h</p>
                    </div>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>

      ) : (
        /* ── Technicians Tab ───────────────────────────────────── */
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Technician Roster</h2>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => setShowAddTech(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-purple-500 rounded-xl font-bold text-sm shadow-lg shadow-purple-500/20">
              <Plus className="w-4 h-4" /> Add Technician
            </motion.button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-8 h-8 animate-spin text-purple-500" />
            </div>
          ) : technicians.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-center py-20 bg-white/5 rounded-3xl border border-white/10 border-dashed">
              <Users className="w-12 h-12 mx-auto mb-3 text-zinc-600" />
              <p className="text-zinc-500">No technicians added yet. Click &quot;Add Technician&quot; to get started.</p>
            </motion.div>
          ) : (
            <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {technicians.map((tech, i) => (
                <motion.div key={tech.id} variants={fadeInUp} transition={{ delay: i * 0.04 }}
                  whileHover={{ scale: 1.01, y: -2 }}
                  className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-xl hover:bg-white/[0.07] transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center font-bold text-lg shadow-lg">
                        {tech.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-white">{tech.name}</h3>
                        <p className="text-sm text-zinc-400">{tech.role}</p>
                      </div>
                    </div>
                    <button onClick={() => toggleStatus(tech)}
                      className={`px-3 py-1 rounded-full text-xs font-bold border cursor-pointer ${statusBadge(tech.status)}`}>
                      {tech.status === 'active' ? 'Active' : tech.status === 'idle' ? 'Idle' : 'On Leave'}
                    </button>
                  </div>
                  <div className="flex items-center gap-4 mt-4 text-xs text-zinc-500">
                    {tech.department && (
                      <span className="flex items-center gap-1">
                        <HardHat className="w-3 h-3" /> {tech.department}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {tech.shift || 'Day'} Shift
                    </span>
                    {tech.phone && (
                      <span>{tech.phone}</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* MODALS                                                    */}
      {/* ══════════════════════════════════════════════════════════ */}

      {/* ── Add Technician Modal ──────────────────────────────── */}
      <AnimatePresence>
        {showAddTech && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-zinc-900 border border-white/10 w-full max-w-md rounded-3xl p-8 shadow-2xl relative">

              <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Add Technician</h2>
                </div>
                <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={() => setShowAddTech(false)}
                  className="p-2 text-zinc-500 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-zinc-400 uppercase font-bold mb-1.5">Full Name *</label>
                  <input value={newTech.name} onChange={e => setNewTech({ ...newTech, name: e.target.value })}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-purple-500 transition-colors" placeholder="e.g. Suresh Kumar" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 uppercase font-bold mb-1.5">Role / Skill *</label>
                  <input value={newTech.role} onChange={e => setNewTech({ ...newTech, role: e.target.value })}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-purple-500 transition-colors" placeholder="e.g. Lamination Operator" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-zinc-400 uppercase font-bold mb-1.5">Department</label>
                    <select value={newTech.department} onChange={e => setNewTech({ ...newTech, department: e.target.value })}
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-purple-500 transition-colors">
                      <option value="">Select</option>
                      <option value="Stock Building">Stock Building</option>
                      <option value="Machining">Machining</option>
                      <option value="Pattern Finishing">Pattern Finishing</option>
                      <option value="Lamination">Lamination</option>
                      <option value="Mold Finishing">Mold Finishing</option>
                      <option value="Welding">Welding</option>
                      <option value="Assembly">Assembly</option>
                      <option value="CMM">CMM</option>
                      <option value="Trimline">Trimline</option>
                      <option value="Quality">Quality</option>
                      <option value="Maintenance">Maintenance</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 uppercase font-bold mb-1.5">Shift</label>
                    <select value={newTech.shift} onChange={e => setNewTech({ ...newTech, shift: e.target.value })}
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-purple-500 transition-colors">
                      <option value="Day">Day</option>
                      <option value="Night">Night</option>
                      <option value="General">General</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 uppercase font-bold mb-1.5">Phone</label>
                  <input value={newTech.phone} onChange={e => setNewTech({ ...newTech, phone: e.target.value })}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-purple-500 transition-colors" placeholder="Optional" />
                </div>
              </div>

              <div className="flex gap-3 mt-8 pt-4 border-t border-white/10">
                <button onClick={() => setShowAddTech(false)}
                  className="flex-1 py-3 text-zinc-400 hover:text-white bg-white/5 rounded-xl border border-white/10 font-medium transition-all hover:bg-white/10">
                  Cancel
                </button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleAddTechnician}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-purple-500 text-white font-bold rounded-xl shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 py-3 transition-all">
                  <Save className="w-4 h-4" /> Add
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Daily Log Entry Modal ─────────────────────────────── */}
      <AnimatePresence>
        {showLogEntry && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-zinc-900 border border-white/10 w-full max-w-lg rounded-3xl p-8 shadow-2xl relative overflow-hidden">

              {/* Glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

              <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-green-700 rounded-lg flex items-center justify-center shadow-lg shadow-green-500/20">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Daily Production Log</h2>
                    <p className="text-zinc-400 text-sm">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                </div>
                <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={() => setShowLogEntry(false)}
                  className="p-2 text-zinc-500 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              <div className="space-y-4 relative z-10">
                <div>
                  <label className="block text-xs text-zinc-400 uppercase font-bold mb-1.5">Technician *</label>
                  <select value={logForm.technicianId}
                    onChange={e => {
                      const tech = technicians.find(t => t.id === e.target.value);
                      setLogForm({ ...logForm, technicianId: e.target.value, technicianName: tech?.name || '' });
                    }}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-green-500 transition-colors">
                    <option value="">Select technician</option>
                    {technicians.filter(t => t.status === 'active').map(t => (
                      <option key={t.id} value={t.id}>{t.name} — {t.role}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 uppercase font-bold mb-1.5">Task / Work Done *</label>
                  <input value={logForm.task} onChange={e => setLogForm({ ...logForm, task: e.target.value })}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-green-500 transition-colors"
                    placeholder="e.g. Gelcoat Application on Mold M-12" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-zinc-400 uppercase font-bold mb-1.5">Hours Worked</label>
                    <input type="number" value={logForm.hoursWorked} onChange={e => setLogForm({ ...logForm, hoursWorked: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-green-500 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 uppercase font-bold mb-1.5">Output</label>
                    <input value={logForm.output} onChange={e => setLogForm({ ...logForm, output: e.target.value })}
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-green-500 transition-colors"
                      placeholder="e.g. 4.5 SQM" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 uppercase font-bold mb-1.5">Remarks</label>
                  <textarea value={logForm.remarks} onChange={e => setLogForm({ ...logForm, remarks: e.target.value })} rows={2}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-green-500 transition-colors resize-none"
                    placeholder="Any notes..." />
                </div>
              </div>

              <div className="flex gap-3 mt-8 pt-4 border-t border-white/10 relative z-10">
                <button onClick={() => setShowLogEntry(false)}
                  className="flex-1 py-3 text-zinc-400 hover:text-white bg-white/5 rounded-xl border border-white/10 font-medium transition-all hover:bg-white/10">
                  Cancel
                </button>
                <motion.button whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }} onClick={handleSubmitLog}
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-500 text-white font-bold rounded-xl shadow-lg shadow-green-500/25 flex items-center justify-center gap-2 py-3 transition-all">
                  <Save className="w-4 h-4" /> Submit Log
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
