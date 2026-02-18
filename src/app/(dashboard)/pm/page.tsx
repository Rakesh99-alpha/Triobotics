'use client';

import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx'; 
import { 
  Save, Upload, Download, Trash2, Plus, RefreshCw, 
  Search, ExternalLink, TrendingUp, Clock, CheckCircle, 
  Activity, Package, FileText, ClipboardList, Filter,
  AlertTriangle, Calendar, Target, Users, BarChart3,
  Eye, Edit, MoreVertical, Bell, Flag, ArrowUpRight,
  ArrowDownRight, Layers, Timer, Zap, Box, X, Grid, List
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import BOMCreator from './BOMCreator';

// ==========================================
// TYPES
// ==========================================
interface Project {
  id: string | number;
  projectCode: string;
  projectDescription: string;
  destination: string;
  poReference: string;
  targetCompletionDate: string;
  totalParts: number;
  totalPartsProduced: number;
  totalPartsToBeProduced: number;
  percentCompleted: number;
  status: 'Pending' | 'In Progress' | 'Completed' | 'On Hold' | 'Delayed';
  containerNumber: string;
  dispatchDate: string;
  remarks: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTeam: string;
}

// ==========================================
// CONSTANTS
// ==========================================
const TEAMS = ['Team A', 'Team B', 'Team C', 'Assembly', 'Finishing', 'Quality', 'Machining', 'Welding'];

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-zinc-500',
  medium: 'bg-blue-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500',
};

const STATUS_COLORS: Record<string, string> = {
  'Pending': 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  'In Progress': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Completed': 'bg-green-500/20 text-green-400 border-green-500/30',
  'On Hold': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'Delayed': 'bg-red-500/20 text-red-400 border-red-500/30',
};

// --- EXACT COLUMNS (From your Data Entry HTML) ---
const COLUMNS = [
  { id: 'projectCode', name: 'Project Code', type: 'text', width: 120 },
  { id: 'projectDescription', name: 'Project Description', type: 'text', width: 220 },
  { id: 'destination', name: 'Destination', type: 'text', width: 140 },
  { id: 'poReference', name: 'PO Reference', type: 'text', width: 130 },
  { id: 'targetCompletionDate', name: 'Target Date', type: 'date', width: 140 },
  { id: 'totalParts', name: 'Total Parts', type: 'number', width: 100 },
  { id: 'totalPartsProduced', name: 'Produced', type: 'number', width: 100 },
  { id: 'totalPartsToBeProduced', name: 'Remaining', type: 'number', width: 100, readOnly: true },
  { id: 'percentCompleted', name: '% Done', type: 'number', width: 100, readOnly: true },
  { id: 'status', name: 'Status', type: 'text', width: 120 },
  { id: 'containerNumber', name: 'Container #', type: 'text', width: 140 },
  { id: 'dispatchDate', name: 'Dispatch', type: 'date', width: 140 },
  { id: 'remarks', name: 'Remarks', type: 'text', width: 200 },
  { id: 'priority', name: 'Priority', type: 'select', width: 100 },
  { id: 'assignedTeam', name: 'Team', type: 'select', width: 120 }
];

export default function ProjectManagerDashboard() {
  // ==========================================
  // STATE
  // ==========================================
  const [data, setData] = useState<Project[]>([]);
  const [stats, setStats] = useState({ 
    total: 0, completed: 0, inProgress: 0, efficiency: 0,
    delayed: 0, onHold: 0, pending: 0, critical: 0, producedParts: 0, totalParts: 0
  });
  const [chartData, setChartData] = useState<{ name: string; Target: number; Actual: number; completion: number }[]>([]);
  const [statusChart, setStatusChart] = useState<{ name: string; value: number; color: string }[]>([]);
  const [weeklyData, setWeeklyData] = useState<{ day: string; completed: number }[]>([]);
  
  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [teamFilter, setTeamFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'table' | 'cards' | 'timeline'>('overview');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Modals
  const [showBOMCreator, setShowBOMCreator] = useState(false);
  const [selectedProject, setSelectedProject] = useState<{ id: string; name: string } | null>(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showQuickView, setShowQuickView] = useState<Project | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ==========================================
  // ANALYTICS - defined before useEffect
  // ==========================================
  const runAnalytics = (dataset: Project[]) => {
    const valid = dataset.filter(p => p.projectCode);
    
    const total = valid.length;
    const completed = valid.filter(p => p.status === 'Completed' || (p.percentCompleted || 0) >= 100).length;
    const inProgress = valid.filter(p => p.status === 'In Progress' || ((p.percentCompleted || 0) > 0 && (p.percentCompleted || 0) < 100)).length;
    const delayed = valid.filter(p => p.status === 'Delayed').length;
    const onHold = valid.filter(p => p.status === 'On Hold').length;
    const pending = valid.filter(p => p.status === 'Pending' || (!p.status && (p.percentCompleted || 0) === 0)).length;
    const critical = valid.filter(p => p.priority === 'critical').length;
    
    const totalPercent = valid.reduce((acc, curr) => acc + (curr.percentCompleted || 0), 0);
    const efficiency = total > 0 ? Math.round(totalPercent / total) : 0;
    
    const producedParts = valid.reduce((acc, curr) => acc + (parseInt(String(curr.totalPartsProduced)) || 0), 0);
    const totalPartsCount = valid.reduce((acc, curr) => acc + (parseInt(String(curr.totalParts)) || 0), 0);

    setStats({ total, completed, inProgress, efficiency, delayed, onHold, pending, critical, producedParts, totalParts: totalPartsCount });

    // Bar Chart Data
    const barData = valid.slice(0, 8).map(p => ({
      name: p.projectCode || '',
      Target: parseFloat(String(p.totalParts)) || 0,
      Actual: parseFloat(String(p.totalPartsProduced)) || 0,
      completion: p.percentCompleted || 0
    }));
    setChartData(barData);

    // Pie Chart Data
    setStatusChart([
      { name: 'Completed', value: completed, color: '#10b981' },
      { name: 'In Progress', value: inProgress, color: '#3b82f6' },
      { name: 'Pending', value: pending, color: '#f59e0b' },
      { name: 'Delayed', value: delayed, color: '#ef4444' },
      { name: 'On Hold', value: onHold, color: '#8b5cf6' }
    ]);

    // Weekly Progress (fixed values to avoid impure Math.random)
    setWeeklyData([
      { day: 'Mon', completed: 12 },
      { day: 'Tue', completed: 18 },
      { day: 'Wed', completed: 15 },
      { day: 'Thu', completed: 22 },
      { day: 'Fri', completed: 25 },
      { day: 'Sat', completed: 8 },
      { day: 'Sun', completed: 5 },
    ]);
  };

  // ==========================================
  // DATA LOADING
  // ==========================================
  useEffect(() => {
    const saved = localStorage.getItem('erpProjectData');
    if (saved) {
      const parsed = JSON.parse(saved);
      setData(parsed);
      runAnalytics(parsed);
    } else {
      const initial = Array(3).fill({}).map((_, i) => ({ 
        id: Date.now() + i, 
        status: 'Pending',
        priority: 'medium',
        assignedTeam: ''
      }));
      setData(initial as Project[]);
      runAnalytics(initial as Project[]);
    }
  }, []);

  // ==========================================
  // DATA OPERATIONS
  // ==========================================
  const handleCellChange = (index: number, field: string, value: string | number) => {
    const updated = [...data];
    if (!updated[index]) updated[index] = { id: Date.now() } as Project;
    (updated[index] as Record<string, unknown>)[field] = value;

    if (field === 'totalParts' || field === 'totalPartsProduced') {
      const total = parseFloat(String(updated[index].totalParts)) || 0;
      const produced = parseFloat(String(updated[index].totalPartsProduced)) || 0;
      const percent = total > 0 ? Math.round((produced / total) * 100) : 0;
      
      updated[index].percentCompleted = percent;
      updated[index].totalPartsToBeProduced = Math.max(0, total - produced);
      
      if (percent >= 100) updated[index].status = 'Completed';
      else if (percent > 0) updated[index].status = 'In Progress';
      else if (!updated[index].status) updated[index].status = 'Pending';
    }

    setData(updated);
    
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      localStorage.setItem('erpProjectData', JSON.stringify(updated));
      localStorage.setItem('boms', JSON.stringify(updated));
      runAnalytics(updated);
    }, 500);
  };

  const addNewRow = () => {
    const newProject: Project = {
      id: Date.now(),
      projectCode: '',
      projectDescription: '',
      destination: '',
      poReference: '',
      targetCompletionDate: '',
      totalParts: 0,
      totalPartsProduced: 0,
      totalPartsToBeProduced: 0,
      percentCompleted: 0,
      status: 'Pending',
      containerNumber: '',
      dispatchDate: '',
      remarks: '',
      priority: 'medium',
      assignedTeam: ''
    };
    setData([...data, newProject]);
  };

  const deleteProject = (id: string | number) => {
    if (confirm('Delete this project?')) {
      const updated = data.filter(p => p.id !== id);
      setData(updated);
      localStorage.setItem('erpProjectData', JSON.stringify(updated));
      runAnalytics(updated);
    }
  };

  const addProject = (project: Partial<Project>) => {
    const newProject: Project = {
      id: `proj_${Date.now()}`,
      projectCode: project.projectCode || '',
      projectDescription: project.projectDescription || '',
      destination: project.destination || '',
      poReference: project.poReference || '',
      targetCompletionDate: project.targetCompletionDate || '',
      totalParts: project.totalParts || 0,
      totalPartsProduced: project.totalPartsProduced || 0,
      totalPartsToBeProduced: (project.totalParts || 0) - (project.totalPartsProduced || 0),
      percentCompleted: project.totalParts ? Math.round(((project.totalPartsProduced || 0) / project.totalParts) * 100) : 0,
      status: project.status || 'Pending',
      containerNumber: project.containerNumber || '',
      dispatchDate: project.dispatchDate || '',
      remarks: project.remarks || '',
      priority: project.priority || 'medium',
      assignedTeam: project.assignedTeam || '',
    };
    const updated = [newProject, ...data];
    setData(updated);
    localStorage.setItem('erpProjectData', JSON.stringify(updated));
    runAnalytics(updated);
    setShowProjectModal(false);
    setEditingProject(null);
  };

  const updateProject = (id: string | number, updates: Partial<Project>) => {
    const updated = data.map(p => {
      if (p.id === id) {
        const newData = { ...p, ...updates };
        if (updates.totalParts !== undefined || updates.totalPartsProduced !== undefined) {
          const total = updates.totalParts ?? p.totalParts;
          const produced = updates.totalPartsProduced ?? p.totalPartsProduced;
          newData.totalPartsToBeProduced = Math.max(0, total - produced);
          newData.percentCompleted = total > 0 ? Math.round((produced / total) * 100) : 0;
          if (newData.percentCompleted >= 100) newData.status = 'Completed';
        }
        return newData;
      }
      return p;
    });
    setData(updated);
    localStorage.setItem('erpProjectData', JSON.stringify(updated));
    runAnalytics(updated);
    setShowProjectModal(false);
    setEditingProject(null);
  };

  // ==========================================
  // IMPORT/EXPORT
  // ==========================================
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

        const mapped = json.map((row: any) => ({
          id: Date.now() + Math.random(),
          projectCode: row['Project Code'] || row['Code'] || '',
          projectDescription: row['Project Description'] || row['Description'] || '',
          destination: row['Destination'] || '',
          poReference: row['PO Reference'] || '',
          totalParts: row['Total No. of parts'] || row['Total'] || row['Total Parts'] || 0,
          totalPartsProduced: row['Total parts produced'] || row['Produced'] || 0,
          status: row['Status'] || 'Pending',
          priority: row['Priority'] || 'medium',
          assignedTeam: row['Team'] || row['Assigned Team'] || '',
          targetCompletionDate: row['Target Date'] || '',
          remarks: row['Remarks'] || ''
        }));

        const processed = mapped.map(row => {
          const total = parseFloat(row.totalParts as any) || 0;
          const produced = parseFloat(row.totalPartsProduced as any) || 0;
          return {
            ...row,
            percentCompleted: total > 0 ? Math.round((produced / total) * 100) : 0,
            totalPartsToBeProduced: Math.max(0, total - produced)
          };
        });

        const finalData = [...processed, ...data] as Project[];
        setData(finalData);
        runAnalytics(finalData);
        localStorage.setItem('erpProjectData', JSON.stringify(finalData));
        alert(`Imported ${processed.length} projects.`);
      } catch (e) { alert("Excel Import Error"); }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Projects");
    XLSX.writeFile(wb, `Projects_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const clearAll = () => {
    if (!confirm('Clear all project data? This cannot be undone.')) return;
    localStorage.removeItem('erpProjectData');
    localStorage.removeItem('boms');
    setData([]);
    setStats({ total: 0, completed: 0, inProgress: 0, efficiency: 0, delayed: 0, onHold: 0, pending: 0, critical: 0, producedParts: 0, totalParts: 0 });
    setChartData([]);
    setStatusChart([]);
  };

  // ==========================================
  // FILTERING
  // ==========================================
  const filteredData = data.filter(p => {
    const matchesSearch = !searchTerm || 
      p.projectCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.projectDescription?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.destination?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || p.priority === priorityFilter;
    const matchesTeam = teamFilter === 'all' || p.assignedTeam === teamFilter;
    return matchesSearch && matchesStatus && matchesPriority && matchesTeam;
  });

  // Days until deadline
  const getDaysUntil = (date: string) => {
    if (!date) return null;
    const target = new Date(date);
    const today = new Date();
    return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Get unique teams from data
  const usedTeams = [...new Set(data.filter(p => p.assignedTeam).map(p => p.assignedTeam))];

  // Tabs
  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'table', label: 'Data Table', icon: List },
    { id: 'cards', label: 'Card View', icon: Grid },
    { id: 'timeline', label: 'Timeline', icon: Calendar },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans pb-20 relative overflow-hidden">
      
      {/* Background Glows */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none"></div>
      <div className="fixed top-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 space-y-6 p-4 lg:p-6">
      
        {/* ==========================================
            HEADER
        ========================================== */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Project Manager Dashboard</h1>
            <p className="text-zinc-400 mt-1">Master Production Control & Planning</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => {
                setEditingProject(null);
                setShowProjectModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 text-white rounded-xl hover:bg-zinc-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Project
            </button>
            <button
              onClick={() => {
                const projectCode = data.find(d => d.projectCode)?.projectCode || 'NEW-PROJECT';
                const projectName = data.find(d => d.projectDescription)?.projectDescription || 'New Project';
                setSelectedProject({ id: projectCode, name: projectName });
                setShowBOMCreator(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
            >
              <ClipboardList className="w-4 h-4" />
              Create BOM
            </button>
            <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm">
              <Activity className="w-4 h-4 animate-pulse" />
              Live Sync
            </div>
          </div>
        </div>

        {/* ==========================================
            ALERTS
        ========================================== */}
        {stats.delayed > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <div>
                <p className="font-semibold text-red-400">{stats.delayed} Delayed Project{stats.delayed !== 1 ? 's' : ''}</p>
                <p className="text-sm text-zinc-400">Immediate attention required</p>
              </div>
            </div>
            <button 
              onClick={() => setStatusFilter('Delayed')}
              className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
            >
              View All
            </button>
          </motion.div>
        )}

        {stats.critical > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Flag className="w-5 h-5 text-orange-400" />
              <div>
                <p className="font-semibold text-orange-400">{stats.critical} Critical Priority Project{stats.critical !== 1 ? 's' : ''}</p>
                <p className="text-sm text-zinc-400">High priority items need focus</p>
              </div>
            </div>
            <button 
              onClick={() => setPriorityFilter('critical')}
              className="px-3 py-1.5 bg-orange-500/20 text-orange-400 rounded-lg text-sm hover:bg-orange-500/30 transition-colors"
            >
              View All
            </button>
          </motion.div>
        )}

        {/* ==========================================
            STATS CARDS
        ========================================== */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900/50 border border-white/10 rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <Layers className="w-5 h-5 text-blue-400" />
              <span className="text-xs text-green-400 flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" /> +{Math.floor(Math.random() * 15)}%
              </span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
            <p className="text-xs text-zinc-500">Total Projects</p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-zinc-900/50 border border-white/10 rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-2xl font-bold text-green-400">{stats.completed}</p>
            <p className="text-xs text-zinc-500">Completed</p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-zinc-900/50 border border-white/10 rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <Timer className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-blue-400">{stats.inProgress}</p>
            <p className="text-xs text-zinc-500">In Progress</p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-zinc-900/50 border border-white/10 rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-5 h-5 text-yellow-400" />
            </div>
            <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
            <p className="text-xs text-zinc-500">Pending</p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-zinc-900/50 border border-white/10 rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <Target className="w-5 h-5 text-cyan-400" />
            </div>
            <p className="text-2xl font-bold text-cyan-400">{stats.efficiency}%</p>
            <p className="text-xs text-zinc-500">Avg Completion</p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-zinc-900/50 border border-white/10 rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <Box className="w-5 h-5 text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-purple-400">{stats.producedParts.toLocaleString()}</p>
            <p className="text-xs text-zinc-500">Parts Produced</p>
          </motion.div>
        </div>

        {/* ==========================================
            TABS
        ========================================== */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white'
                  : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ==========================================
            OVERVIEW TAB
        ========================================== */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Status Distribution */}
            <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Project Status</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusChart.filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusChart.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Production Progress */}
            <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Production Progress</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="name" stroke="#888" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#888" />
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                    <Bar dataKey="Actual" name="Produced" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Target" name="Target" fill="#3f3f46" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Weekly Trend */}
            <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Weekly Output</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyData}>
                    <defs>
                      <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="day" stroke="#888" />
                    <YAxis stroke="#888" />
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                    <Area type="monotone" dataKey="completed" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorCompleted)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Projects */}
            <div className="lg:col-span-2 bg-zinc-900/50 border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Recent Projects</h3>
                <button onClick={() => setActiveTab('table')} className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
                  View All →
                </button>
              </div>
              <div className="space-y-3">
                {data.filter(p => p.projectCode).slice(0, 5).map(project => (
                  <div 
                    key={project.id} 
                    className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
                    onClick={() => setShowQuickView(project)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${PRIORITY_COLORS[project.priority] || 'bg-zinc-500'}`} />
                      <div>
                        <p className="font-medium text-white">{project.projectCode}</p>
                        <p className="text-xs text-zinc-500">{project.projectDescription || 'No Description'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-zinc-300">{project.percentCompleted || 0}%</p>
                        <div className="w-24 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 rounded-full transition-all"
                            style={{ width: `${project.percentCompleted || 0}%` }}
                          />
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs border ${STATUS_COLORS[project.status] || 'bg-zinc-500/20 text-zinc-400'}`}>
                        {project.status}
                      </span>
                    </div>
                  </div>
                ))}
                {data.filter(p => p.projectCode).length === 0 && (
                  <div className="text-center py-8 text-zinc-500">
                    No projects yet. Create your first project!
                  </div>
                )}
              </div>
            </div>

            {/* Upcoming Deadlines */}
            <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Upcoming Deadlines</h3>
              <div className="space-y-3">
                {data
                  .filter(p => p.targetCompletionDate && getDaysUntil(p.targetCompletionDate) !== null && getDaysUntil(p.targetCompletionDate)! > 0)
                  .sort((a, b) => new Date(a.targetCompletionDate).getTime() - new Date(b.targetCompletionDate).getTime())
                  .slice(0, 5)
                  .map(project => {
                    const days = getDaysUntil(project.targetCompletionDate);
                    return (
                      <div key={project.id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                        <div>
                          <p className="font-medium text-white text-sm">{project.projectCode}</p>
                          <p className="text-xs text-zinc-500">{project.destination || 'No destination'}</p>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs ${
                          days! <= 3 ? 'bg-red-500/20 text-red-400' :
                          days! <= 7 ? 'bg-orange-500/20 text-orange-400' :
                          'bg-green-500/20 text-green-400'
                        }`}>
                          {days} day{days !== 1 ? 's' : ''}
                        </div>
                      </div>
                    );
                  })}
                {data.filter(p => p.targetCompletionDate).length === 0 && (
                  <div className="text-center py-4 text-zinc-500 text-sm">
                    No upcoming deadlines
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            TABLE TAB
        ========================================== */}
        {activeTab === 'table' && (
          <div className="bg-zinc-900/60 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl">
            
            {/* Toolbar */}
            <div className="p-4 border-b border-white/10 flex flex-wrap justify-between items-center gap-4 bg-white/5">
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => window.location.reload()} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all">
                  <RefreshCw className="w-3 h-3"/> Sync
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="bg-green-600 hover:bg-green-500 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all">
                  <Upload className="w-3 h-3"/> Import
                  <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".xlsx" />
                </button>
                <button onClick={handleExport} className="bg-zinc-700 hover:bg-zinc-600 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all">
                  <Download className="w-3 h-3"/> Export
                </button>
                <button onClick={clearAll} className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all">
                  <Trash2 className="w-3 h-3"/> Clear
                </button>
              </div>
              
              <div className="flex items-center gap-3">
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-zinc-800 border border-white/10 rounded-xl text-sm text-white"
                >
                  <option value="all">All Status</option>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Delayed">Delayed</option>
                </select>
                
                <select
                  value={priorityFilter}
                  onChange={e => setPriorityFilter(e.target.value)}
                  className="px-3 py-2 bg-zinc-800 border border-white/10 rounded-xl text-sm text-white"
                >
                  <option value="all">All Priority</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
                
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                  <input 
                    className="pl-9 pr-4 py-2 bg-zinc-800 border border-white/10 rounded-xl text-sm text-white outline-none focus:border-purple-500 transition-all w-48" 
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto max-h-[600px] scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-zinc-950 sticky top-0 z-10 shadow-lg">
                  <tr>
                    <th className="p-3 border-b border-r border-white/10 text-center w-10 text-zinc-500 text-xs">#</th>
                    {COLUMNS.map(col => (
                      <th key={col.id} className="p-3 border-b border-r border-white/10 text-zinc-400 font-bold text-xs uppercase tracking-wider whitespace-nowrap" style={{minWidth: col.width}}>
                        {col.name}
                      </th>
                    ))}
                    <th className="p-3 border-b border-white/10 text-zinc-500 text-center text-xs uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredData.map((row, i) => (
                    <tr key={row.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="p-2 border-r border-white/5 text-center text-zinc-600 font-mono text-xs bg-black/20">{i + 1}</td>
                      
                      {COLUMNS.map(col => (
                        <td key={col.id} className="p-0 border-r border-white/5 relative h-10">
                          {col.id === 'percentCompleted' ? (
                            <div className="w-full h-full flex items-center px-3 relative">
                              <div className="absolute inset-0 bg-purple-500/10" style={{ width: `${Math.min(100, row.percentCompleted || 0)}%` }}></div>
                              <span className={`relative z-10 font-bold text-xs ${(row.percentCompleted || 0) >= 100 ? 'text-green-400' : 'text-purple-400'}`}>
                                {row.percentCompleted || 0}%
                              </span>
                            </div>
                          ) : col.id === 'status' ? (
                            <select
                              value={row.status || 'Pending'}
                              onChange={(e) => handleCellChange(data.indexOf(row), 'status', e.target.value)}
                              className="w-full h-full bg-transparent px-2 text-xs text-white outline-none focus:bg-purple-500/10"
                            >
                              <option value="Pending">Pending</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Completed">Completed</option>
                              <option value="On Hold">On Hold</option>
                              <option value="Delayed">Delayed</option>
                            </select>
                          ) : col.id === 'priority' ? (
                            <select
                              value={row.priority || 'medium'}
                              onChange={(e) => handleCellChange(data.indexOf(row), 'priority', e.target.value)}
                              className="w-full h-full bg-transparent px-2 text-xs text-white outline-none focus:bg-purple-500/10"
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                              <option value="critical">Critical</option>
                            </select>
                          ) : col.id === 'assignedTeam' ? (
                            <select
                              value={row.assignedTeam || ''}
                              onChange={(e) => handleCellChange(data.indexOf(row), 'assignedTeam', e.target.value)}
                              className="w-full h-full bg-transparent px-2 text-xs text-white outline-none focus:bg-purple-500/10"
                            >
                              <option value="">Select Team</option>
                              {TEAMS.map(team => (
                                <option key={team} value={team}>{team}</option>
                              ))}
                            </select>
                          ) : (
                            <input 
                              type={col.type || 'text'}
                              readOnly={col.readOnly}
                              className={`w-full h-full bg-transparent px-3 text-xs text-white outline-none focus:bg-purple-500/10 focus:shadow-[inset_2px_0_0_#8b5cf6] transition-all placeholder-zinc-700 ${col.readOnly ? 'text-zinc-500 cursor-not-allowed' : ''}`}
                              value={(row as any)[col.id] || ''}
                              onChange={(e) => handleCellChange(data.indexOf(row), col.id, e.target.value)}
                            />
                          )}
                        </td>
                      ))}

                      <td className="p-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button 
                            onClick={() => setShowQuickView(row)}
                            className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors"
                            title="Quick View"
                          >
                            <Eye className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedProject({ id: row.projectCode || 'NEW', name: row.projectDescription || 'Project' });
                              setShowBOMCreator(true);
                            }}
                            className="p-1.5 bg-purple-500/10 hover:bg-purple-500/20 rounded-lg text-purple-400 hover:text-purple-300 transition-colors"
                            title="Create BOM"
                          >
                            <ClipboardList className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={() => deleteProject(row.id)}
                            className="p-1.5 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 hover:text-red-300 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {filteredData.length === 0 && (
              <div className="p-12 text-center">
                <Layers className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                <p className="text-zinc-500">No projects match your filters</p>
              </div>
            )}
          </div>
        )}

        {/* ==========================================
            CARDS TAB
        ========================================== */}
        {activeTab === 'cards' && (
          <div>
            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-zinc-900/50 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-4 py-3 bg-zinc-900/50 border border-white/10 rounded-xl text-white"
              >
                <option value="all">All Status</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="On Hold">On Hold</option>
                <option value="Delayed">Delayed</option>
              </select>
              <select
                value={priorityFilter}
                onChange={e => setPriorityFilter(e.target.value)}
                className="px-4 py-3 bg-zinc-900/50 border border-white/10 rounded-xl text-white"
              >
                <option value="all">All Priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredData.filter(p => p.projectCode).map(project => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-zinc-900/50 border border-white/10 rounded-xl p-5 hover:border-purple-500/30 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${PRIORITY_COLORS[project.priority] || 'bg-zinc-500'}`} />
                      <h3 className="font-semibold text-white">{project.projectCode}</h3>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs border ${STATUS_COLORS[project.status] || 'bg-zinc-500/20 text-zinc-400'}`}>
                      {project.status}
                    </span>
                  </div>

                  <p className="text-sm text-zinc-400 mb-4 line-clamp-2">{project.projectDescription || 'No description'}</p>

                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Progress</span>
                      <span className="text-white font-medium">{project.percentCompleted || 0}%</span>
                    </div>
                    <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          (project.percentCompleted || 0) >= 100 ? 'bg-green-500' :
                          (project.percentCompleted || 0) >= 50 ? 'bg-blue-500' :
                          'bg-purple-500'
                        }`}
                        style={{ width: `${project.percentCompleted || 0}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-zinc-500">
                      <span>{project.totalPartsProduced || 0} produced</span>
                      <span>{project.totalParts || 0} total</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                    <div className="bg-zinc-800/50 rounded-lg p-2">
                      <p className="text-zinc-500">Destination</p>
                      <p className="text-white truncate">{project.destination || '-'}</p>
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg p-2">
                      <p className="text-zinc-500">Target Date</p>
                      <p className="text-white">{project.targetCompletionDate ? new Date(project.targetCompletionDate).toLocaleDateString() : '-'}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <span className="text-xs text-zinc-500">{project.assignedTeam || 'No team'}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingProject(project);
                          setShowProjectModal(true);
                        }}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4 text-zinc-400" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedProject({ id: project.projectCode, name: project.projectDescription || 'Project' });
                          setShowBOMCreator(true);
                        }}
                        className="p-2 hover:bg-purple-500/20 rounded-lg transition-colors"
                        title="Create BOM"
                      >
                        <ClipboardList className="w-4 h-4 text-purple-400" />
                      </button>
                      <button
                        onClick={() => deleteProject(project.id)}
                        className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {filteredData.filter(p => p.projectCode).length === 0 && (
              <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-12 text-center">
                <Layers className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-zinc-400 mb-2">No Projects Found</h3>
                <p className="text-zinc-500 mb-4">Create your first project or adjust filters</p>
                <button
                  onClick={() => setShowProjectModal(true)}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                >
                  Create Project
                </button>
              </div>
            )}
          </div>
        )}

        {/* ==========================================
            TIMELINE TAB
        ========================================== */}
        {activeTab === 'timeline' && (
          <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Project Timeline</h3>
            <div className="space-y-4">
              {data
                .filter(p => p.projectCode && p.targetCompletionDate)
                .sort((a, b) => new Date(a.targetCompletionDate).getTime() - new Date(b.targetCompletionDate).getTime())
                .map((project, index, arr) => {
                  const days = getDaysUntil(project.targetCompletionDate);
                  const isOverdue = days !== null && days < 0;
                  return (
                    <div key={project.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-4 h-4 rounded-full ${
                          project.status === 'Completed' ? 'bg-green-500' :
                          isOverdue ? 'bg-red-500' :
                          'bg-purple-500'
                        }`} />
                        {index < arr.length - 1 && <div className="w-0.5 flex-1 bg-zinc-700 mt-2" />}
                      </div>
                      <div className="flex-1 pb-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-white">{project.projectCode}</h4>
                            <p className="text-sm text-zinc-400">{project.projectDescription}</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-medium ${isOverdue ? 'text-red-400' : 'text-zinc-300'}`}>
                              {new Date(project.targetCompletionDate).toLocaleDateString()}
                            </p>
                            <p className={`text-xs ${
                              isOverdue ? 'text-red-400' :
                              days! <= 7 ? 'text-orange-400' :
                              'text-zinc-500'
                            }`}>
                              {isOverdue ? `${Math.abs(days!)} days overdue` : `${days} days left`}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-4">
                          <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                project.status === 'Completed' ? 'bg-green-500' : 'bg-purple-500'
                              }`}
                              style={{ width: `${project.percentCompleted || 0}%` }}
                            />
                          </div>
                          <span className="text-sm text-zinc-400">{project.percentCompleted || 0}%</span>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" /> {project.assignedTeam || 'No team'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Box className="w-3 h-3" /> {project.totalPartsProduced || 0}/{project.totalParts || 0} parts
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              {data.filter(p => p.projectCode && p.targetCompletionDate).length === 0 && (
                <div className="text-center py-8 text-zinc-500">
                  No projects with deadlines. Add target dates to see timeline.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Floating Add Button */}
        <button 
          onClick={addNewRow}
          className="fixed bottom-10 right-10 w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-600 hover:opacity-90 rounded-full shadow-2xl shadow-purple-900/50 flex items-center justify-center text-white transition-transform hover:scale-110 z-50"
        >
          <Plus className="w-6 h-6" />
        </button>

      </div>

      {/* ==========================================
          BOM CREATOR MODAL
      ========================================== */}
      {selectedProject && (
        <BOMCreator
          isOpen={showBOMCreator}
          onClose={() => {
            setShowBOMCreator(false);
            setSelectedProject(null);
          }}
          projectId={selectedProject.id}
          projectName={selectedProject.name}
        />
      )}

      {/* ==========================================
          QUICK VIEW MODAL
      ========================================== */}
      <AnimatePresence>
        {showQuickView && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowQuickView(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <div>
                  <h2 className="text-xl font-bold text-white">{showQuickView.projectCode}</h2>
                  <p className="text-sm text-zinc-400">{showQuickView.projectDescription}</p>
                </div>
                <button onClick={() => setShowQuickView(null)} className="p-2 hover:bg-white/10 rounded-lg">
                  <X className="w-5 h-5 text-zinc-400" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Status</span>
                  <span className={`px-3 py-1 rounded-full text-sm border ${STATUS_COLORS[showQuickView.status]}`}>
                    {showQuickView.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Priority</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${PRIORITY_COLORS[showQuickView.priority]}`} />
                    <span className="text-white capitalize">{showQuickView.priority}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Progress</span>
                  <span className="text-white font-bold">{showQuickView.percentCompleted || 0}%</span>
                </div>
                <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                    style={{ width: `${showQuickView.percentCompleted || 0}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="bg-zinc-800/50 rounded-lg p-3">
                    <p className="text-xs text-zinc-500">Total Parts</p>
                    <p className="text-lg font-bold text-white">{showQuickView.totalParts || 0}</p>
                  </div>
                  <div className="bg-zinc-800/50 rounded-lg p-3">
                    <p className="text-xs text-zinc-500">Produced</p>
                    <p className="text-lg font-bold text-green-400">{showQuickView.totalPartsProduced || 0}</p>
                  </div>
                  <div className="bg-zinc-800/50 rounded-lg p-3">
                    <p className="text-xs text-zinc-500">Destination</p>
                    <p className="text-sm text-white">{showQuickView.destination || '-'}</p>
                  </div>
                  <div className="bg-zinc-800/50 rounded-lg p-3">
                    <p className="text-xs text-zinc-500">Target Date</p>
                    <p className="text-sm text-white">
                      {showQuickView.targetCompletionDate 
                        ? new Date(showQuickView.targetCompletionDate).toLocaleDateString() 
                        : '-'}
                    </p>
                  </div>
                </div>
                {showQuickView.remarks && (
                  <div className="bg-zinc-800/50 rounded-lg p-3">
                    <p className="text-xs text-zinc-500 mb-1">Remarks</p>
                    <p className="text-sm text-white">{showQuickView.remarks}</p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 p-6 border-t border-white/10">
                <button
                  onClick={() => {
                    setEditingProject(showQuickView);
                    setShowQuickView(null);
                    setShowProjectModal(true);
                  }}
                  className="flex-1 px-4 py-2.5 bg-zinc-800 text-white rounded-xl hover:bg-zinc-700 transition-colors"
                >
                  Edit Project
                </button>
                <button
                  onClick={() => {
                    setSelectedProject({ id: showQuickView.projectCode, name: showQuickView.projectDescription || 'Project' });
                    setShowQuickView(null);
                    setShowBOMCreator(true);
                  }}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
                >
                  Create BOM
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==========================================
          PROJECT MODAL
      ========================================== */}
      <AnimatePresence>
        {showProjectModal && (
          <ProjectModal
            project={editingProject}
            onClose={() => {
              setShowProjectModal(false);
              setEditingProject(null);
            }}
            onSave={(data) => {
              if (editingProject) {
                updateProject(editingProject.id, data);
              } else {
                addProject(data);
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ==========================================
// PROJECT MODAL COMPONENT
// ==========================================
function ProjectModal({
  project,
  onClose,
  onSave
}: {
  project: Project | null;
  onClose: () => void;
  onSave: (data: Partial<Project>) => void;
}) {
  const [formData, setFormData] = useState<Partial<Project>>(project || {
    projectCode: '',
    projectDescription: '',
    destination: '',
    poReference: '',
    targetCompletionDate: '',
    totalParts: 0,
    totalPartsProduced: 0,
    status: 'Pending',
    priority: 'medium',
    assignedTeam: '',
    remarks: '',
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">{project ? 'Edit Project' : 'New Project'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-150px)] space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Project Code *</label>
              <input
                type="text"
                value={formData.projectCode || ''}
                onChange={e => setFormData({ ...formData, projectCode: e.target.value })}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                placeholder="e.g., PRJ-001"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">PO Reference</label>
              <input
                type="text"
                value={formData.poReference || ''}
                onChange={e => setFormData({ ...formData, poReference: e.target.value })}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                placeholder="PO Number"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">Project Description</label>
            <textarea
              value={formData.projectDescription || ''}
              onChange={e => setFormData({ ...formData, projectDescription: e.target.value })}
              className="w-full px-4 py-2.5 bg-zinc-800 border border-white/10 rounded-xl text-white resize-none h-20 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              placeholder="Describe the project..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Destination</label>
              <input
                type="text"
                value={formData.destination || ''}
                onChange={e => setFormData({ ...formData, destination: e.target.value })}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                placeholder="Delivery destination"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Target Date</label>
              <input
                type="date"
                value={formData.targetCompletionDate || ''}
                onChange={e => setFormData({ ...formData, targetCompletionDate: e.target.value })}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Total Parts</label>
              <input
                type="number"
                value={formData.totalParts || ''}
                onChange={e => setFormData({ ...formData, totalParts: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Produced</label>
              <input
                type="number"
                value={formData.totalPartsProduced || ''}
                onChange={e => setFormData({ ...formData, totalPartsProduced: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Assigned Team</label>
              <select
                value={formData.assignedTeam || ''}
                onChange={e => setFormData({ ...formData, assignedTeam: e.target.value })}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              >
                <option value="">Select Team</option>
                {TEAMS.map(team => (
                  <option key={team} value={team}>{team}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Priority</label>
              <select
                value={formData.priority || 'medium'}
                onChange={e => setFormData({ ...formData, priority: e.target.value as any })}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Status</label>
              <select
                value={formData.status || 'Pending'}
                onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="On Hold">On Hold</option>
                <option value="Delayed">Delayed</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">Remarks</label>
            <textarea
              value={formData.remarks || ''}
              onChange={e => setFormData({ ...formData, remarks: e.target.value })}
              className="w-full px-4 py-2.5 bg-zinc-800 border border-white/10 rounded-xl text-white resize-none h-16 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              placeholder="Additional notes..."
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
          <button onClick={onClose} className="px-4 py-2 text-zinc-400 hover:text-white transition-colors">
            Cancel
          </button>
          <button
            onClick={() => onSave(formData)}
            className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
          >
            {project ? 'Update Project' : 'Create Project'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}