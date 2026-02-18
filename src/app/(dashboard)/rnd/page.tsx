"use client";

import React, { useState, useEffect } from "react";
import { 
  LayoutDashboard, TrendingUp, Users,
  Zap, CheckCircle2, AlertCircle, Activity,
  FlaskConical, TestTube,
  BarChart3, PieChart, Calendar, Bell, X,
  Plus, Search, Filter, Download, Upload,
  Settings, Eye, Edit, Trash2, Share2, Archive, Star,
  ArrowUpRight, ArrowDownRight, Briefcase, Award, Flag,
  Package, DollarSign, ShoppingCart
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart as RePieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadialBarChart, RadialBar
} from "recharts";
import { db } from "@/lib/firebase/client";
import { collection, query, where, onSnapshot, getDocs } from "firebase/firestore";
import { COLLECTIONS } from "@/types/purchase";

// ═══════════════════════════════════════════════════════════════
// ANIMATION VARIANTS
// ═══════════════════════════════════════════════════════════════
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1, 
    transition: { 
      staggerChildren: 0.05,
      delayChildren: 0.1 
    } 
  }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } }
};

const slideIn = {
  hidden: { x: -20, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { duration: 0.4 } }
};

// ═══════════════════════════════════════════════════════════════
// INTERFACES & DATA TYPES
// ═══════════════════════════════════════════════════════════════
interface ResearchProject {
  id: string;
  name: string;
  code: string;
  type: "Research" | "Development" | "Prototype" | "Testing" | "Innovation";
  lead: string;
  team: string[];
  progress: number;
  status: "Active" | "On-Hold" | "Review" | "Completed" | "Cancelled";
  phase: "Concept" | "Design" | "Development" | "Testing" | "Validation" | "Deployment";
  priority: "Critical" | "High" | "Medium" | "Low";
  deadline: string;
  budget: number;
  spent: number;
  roi: number;
  impact: "High" | "Medium" | "Low";
  description: string;
  milestones: number;
  completedMilestones: number;
}

interface Experiment {
  id: string;
  name: string;
  projectCode: string;
  status: "Running" | "Completed" | "Failed" | "Pending";
  startDate: string;
  endDate?: string;
  researcher: string;
  success: boolean | null;
  results?: string;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  specialization: string;
  projects: number;
  publications: number;
  patents: number;
  status: "Available" | "Busy" | "Leave";
  efficiency: number;
}

interface PurchaseApproval {
  id: string;
  poNumber: string;
  vendor: string;
  amount: number;
  items: number;
  requestedBy: string;
  date: string;
  priority: "Urgent" | "High" | "Normal";
}

// ═══════════════════════════════════════════════════════════════
// R&D TEAM DATA — Actual Triovision R&D Department
// Team: 1 Asst. Manager + 2 Engineers
// ═══════════════════════════════════════════════════════════════
const RESEARCH_PROJECTS: ResearchProject[] = [
  {
    id: "rnd1",
    name: "Carbon Fiber Composite Mould Development",
    code: "RND-2026-001",
    type: "Development",
    lead: "M Narendra Prasad",
    team: ["M Narendra Prasad", "S Surya Prakash", "J Rakesh"],
    progress: 72,
    status: "Active",
    phase: "Testing",
    priority: "High",
    deadline: "2026-03-31",
    budget: 450000,
    spent: 324000,
    roi: 0,
    impact: "High",
    description: "New composite mould tooling design for improved surface finish and cycle time reduction",
    milestones: 5,
    completedMilestones: 3
  },
  {
    id: "rnd2",
    name: "Pattern Finishing Process Improvement",
    code: "RND-2026-002",
    type: "Research",
    lead: "S Surya Prakash",
    team: ["S Surya Prakash", "J Rakesh"],
    progress: 45,
    status: "Active",
    phase: "Development",
    priority: "High",
    deadline: "2026-04-15",
    budget: 180000,
    spent: 81000,
    roi: 0,
    impact: "Medium",
    description: "Evaluate new resin systems and gelcoat application methods for better finish quality",
    milestones: 4,
    completedMilestones: 2
  },
  {
    id: "rnd3",
    name: "Lamination Layup Optimization",
    code: "RND-2026-003",
    type: "Prototype",
    lead: "J Rakesh",
    team: ["J Rakesh", "M Narendra Prasad"],
    progress: 30,
    status: "Active",
    phase: "Design",
    priority: "Medium",
    deadline: "2026-05-30",
    budget: 120000,
    spent: 36000,
    roi: 0,
    impact: "Medium",
    description: "Optimize fiber layup sequence and resin infusion parameters to reduce material waste",
    milestones: 4,
    completedMilestones: 1
  },
];

const EXPERIMENTS: Experiment[] = [
  { id: "e1", name: "Mould Release Agent Comparison Test", projectCode: "RND-2026-001", status: "Running", startDate: "2026-02-05", researcher: "S Surya Prakash", success: null },
  { id: "e2", name: "Gelcoat Thickness Measurement Trial", projectCode: "RND-2026-002", status: "Completed", startDate: "2026-01-27", endDate: "2026-02-03", researcher: "J Rakesh", success: true, results: "Optimal 0.5mm thickness confirmed" },
  { id: "e3", name: "Vacuum Bag Pressure Test #3", projectCode: "RND-2026-003", status: "Completed", startDate: "2026-01-20", endDate: "2026-01-24", researcher: "S Surya Prakash", success: true, results: "New vacuum parameters set" },
  { id: "e4", name: "Resin Infusion Flow Rate Analysis", projectCode: "RND-2026-003", status: "Pending", startDate: "2026-02-17", researcher: "J Rakesh", success: null },
  { id: "e5", name: "Surface Finish Quality Check — New Resin", projectCode: "RND-2026-002", status: "Running", startDate: "2026-02-10", researcher: "S Surya Prakash", success: null },
];

const TEAM_MEMBERS: TeamMember[] = [
  { id: "tm1", name: "M Narendra Prasad", role: "Asst. Manager", specialization: "Mould Design & Project Coordination", projects: 2, publications: 0, patents: 0, status: "Busy", efficiency: 88 },
  { id: "tm2", name: "S Surya Prakash", role: "Engineer", specialization: "Composite Materials & Testing", projects: 3, publications: 0, patents: 0, status: "Busy", efficiency: 85 },
  { id: "tm3", name: "J Rakesh", role: "Engineer", specialization: "Lamination & Resin Systems", projects: 3, publications: 0, patents: 0, status: "Busy", efficiency: 82 },
];

// WEEKLY WORK LOG — realistic for 3-person team
const WEEKLY_METRICS = [
  { day: "Mon", tasks: 6, trials: 1, issues: 0 },
  { day: "Tue", tasks: 8, trials: 2, issues: 1 },
  { day: "Wed", tasks: 7, trials: 1, issues: 0 },
  { day: "Thu", tasks: 9, trials: 2, issues: 0 },
  { day: "Fri", tasks: 5, trials: 1, issues: 1 },
  { day: "Sat", tasks: 3, trials: 0, issues: 0 },
  { day: "Sun", tasks: 0, trials: 0, issues: 0 },
];

// PROJECT TYPE DISTRIBUTION
const PROJECT_TYPE_DATA = [
  { name: "Development", value: 1, color: "#06b6d4" },
  { name: "Research", value: 1, color: "#8b5cf6" },
  { name: "Prototype", value: 1, color: "#10b981" },
];

// BUDGET ALLOCATION — realistic for small R&D team
const BUDGET_DATA = [
  { category: "Raw Materials", allocated: 300000, spent: 215000 },
  { category: "Tools & Equipment", allocated: 150000, spent: 98000 },
  { category: "Testing & Lab", allocated: 80000, spent: 52000 },
  { category: "Consumables", allocated: 120000, spent: 76000 },
];

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════
const formatCurrency = (amount: number): string => {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  return `₹${(amount / 1000).toFixed(0)}K`;
};

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  if (hour < 21) return "Good Evening";
  return "Good Night";
};

const getCurrentUserName = (): string => {
  if (typeof window === 'undefined') return 'Director';
  const stored = localStorage.getItem('currentUser');
  if (stored) {
    try {
      const user = JSON.parse(stored);
      return (user.displayName || user.name || 'Director').split(' ')[0];
    } catch {
      return 'Director';
    }
  }
  return 'Director';
};

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function RNDDashboard() {
  const [activeTab, setActiveTab] = useState<"overview" | "projects" | "experiments" | "team">("overview");
  const [showNotifications, setShowNotifications] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState<PurchaseApproval[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedProject, setSelectedProject] = useState<ResearchProject | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const userName = getCurrentUserName();

  // Time update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch pending purchase approvals
  useEffect(() => {
    const q = query(
      collection(db, COLLECTIONS.PURCHASE_ORDERS),
      where('status', '==', 'pending_md_approval')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const approvals: PurchaseApproval[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          poNumber: data.poNumber || 'N/A',
          vendor: data.vendorName || 'Unknown',
          amount: data.totalAmount || 0,
          items: data.items?.length || 0,
          requestedBy: data.createdBy || 'Unknown',
          date: data.createdAt || new Date().toISOString(),
          priority: data.totalAmount > 500000 ? 'Urgent' : data.totalAmount > 200000 ? 'High' : 'Normal'
        };
      });
      setPendingApprovals(approvals);
    }, (error) => {
      console.error('Error fetching approvals:', error);
    });

    return () => unsubscribe();
  }, []);

  // Calculate KPIs
  const totalBudget = RESEARCH_PROJECTS.reduce((sum, p) => sum + p.budget, 0);
  const totalSpent = RESEARCH_PROJECTS.reduce((sum, p) => sum + p.spent, 0);
  const avgProgress = Math.round(RESEARCH_PROJECTS.reduce((sum, p) => sum + p.progress, 0) / RESEARCH_PROJECTS.length);
  const activeProjects = RESEARCH_PROJECTS.filter(p => p.status === "Active").length;
  const completedMilestones = RESEARCH_PROJECTS.reduce((sum, p) => sum + p.completedMilestones, 0);
  const totalMilestones = RESEARCH_PROJECTS.reduce((sum, p) => sum + p.milestones, 0);
  const runningExperiments = EXPERIMENTS.filter(e => e.status === "Running").length;
  const successRate = EXPERIMENTS.filter(e => e.success !== null).length > 0 ? Math.round((EXPERIMENTS.filter(e => e.success === true).length / EXPERIMENTS.filter(e => e.success !== null).length) * 100) : 0;
  const busyTeam = TEAM_MEMBERS.filter(t => t.status === "Busy").length;
  const avgEfficiency = Math.round(TEAM_MEMBERS.reduce((sum, t) => sum + t.efficiency, 0) / TEAM_MEMBERS.length);

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: LayoutDashboard },
    { id: "projects" as const, label: "Projects", icon: FlaskConical, badge: activeProjects },
    { id: "experiments" as const, label: "Trials & Tests", icon: TestTube, badge: runningExperiments },
    { id: "team" as const, label: "R&D Team", icon: Users, badge: TEAM_MEMBERS.length },
  ];

  return (
    <div className="relative min-h-screen bg-[#020202] text-white overflow-x-hidden">
      {/* Enhanced Background */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />
      <div className="fixed top-0 left-1/4 w-[800px] h-[800px] bg-violet-500/[0.03] rounded-full blur-[150px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-[700px] h-[700px] bg-cyan-500/[0.03] rounded-full blur-[130px] pointer-events-none" />
      <div className="fixed top-1/2 right-0 w-[600px] h-[600px] bg-emerald-500/[0.02] rounded-full blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <motion.div 
        className="relative z-10 w-full px-6 lg:px-8 py-6"
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        {/* ════════════════════ EXECUTIVE HEADER ════════════════════ */}
        <motion.header variants={fadeInUp} className="mb-8">
          <div className="flex items-start justify-between">
            {/* Left: Greeting & Date */}
            <div className="flex-1">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <h1 className="text-4xl font-semibold text-white mb-1">
                  {getGreeting()}, <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">{userName}</span>
                </h1>
                <p className="text-zinc-500 flex items-center gap-3 text-sm">
                  <Calendar className="w-4 h-4" />
                  <span>{currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  <span className="text-zinc-700">•</span>
                  <span className="font-mono text-violet-400">{currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                </p>
              </motion.div>

              {/* Quick Stats Strip */}
              <motion.div 
                className="flex items-center gap-4 mt-5"
                variants={staggerContainer}
              >
                <motion.div variants={fadeInUp} className="flex items-center gap-2 px-4 py-2 bg-violet-500/10 rounded-xl border border-violet-500/20">
                  <FlaskConical className="w-4 h-4 text-violet-400" />
                  <span className="text-sm"><span className="font-bold text-white">{activeProjects}</span> <span className="text-zinc-400">Active</span></span>
                </motion.div>
                <motion.div variants={fadeInUp} className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
                  <TestTube className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm"><span className="font-bold text-white">{runningExperiments}</span> <span className="text-zinc-400">Running</span></span>
                </motion.div>
                <motion.div variants={fadeInUp} className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm"><span className="font-bold text-white">{successRate}%</span> <span className="text-zinc-400">Trial Success</span></span>
                </motion.div>
                <motion.div variants={fadeInUp} className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 rounded-xl border border-amber-500/20">
                  <Users className="w-4 h-4 text-amber-400" />
                  <span className="text-sm"><span className="font-bold text-white">{TEAM_MEMBERS.length}</span> <span className="text-zinc-400">Members</span></span>
                </motion.div>
              </motion.div>
            </div>

            {/* Right: Actions & Notifications */}
            <motion.div 
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              {/* Purchase Approvals Badge */}
              {pendingApprovals.length > 0 && (
                <motion.button
                  onClick={() => window.location.href = '/purchase'}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="relative px-4 py-2.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 rounded-xl flex items-center gap-2 transition-all hover:border-amber-500/60"
                >
                  <ShoppingCart className="w-5 h-5 text-amber-400" />
                  <span className="text-sm font-medium text-amber-300">Purchase Approvals</span>
                  <span className="absolute -top-1 -right-1 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center text-xs font-bold animate-pulse">
                    {pendingApprovals.length}
                  </span>
                </motion.button>
              )}

              {/* Notifications */}
              <motion.button
                onClick={() => setShowNotifications(!showNotifications)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`relative px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all ${
                  showNotifications 
                    ? 'bg-violet-500/20 border border-violet-500/40' 
                    : 'bg-white/5 border border-white/10 hover:border-white/20'
                }`}
              >
                <Bell className={`w-5 h-5 ${showNotifications ? 'text-violet-400' : 'text-zinc-400'}`} />
                <span className="text-sm font-medium text-zinc-300">Alerts</span>
                {RESEARCH_PROJECTS.filter(p => p.status === "Review").length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold">
                    {RESEARCH_PROJECTS.filter(p => p.status === "Review").length}
                  </span>
                )}
              </motion.button>

              {/* Settings */}
              <motion.button
                whileHover={{ scale: 1.02, rotate: 45 }}
                whileTap={{ scale: 0.98 }}
                className="p-2.5 bg-white/5 border border-white/10 rounded-xl hover:border-white/20 transition-all"
              >
                <Settings className="w-5 h-5 text-zinc-400" />
              </motion.button>
            </motion.div>
          </div>
        </motion.header>

        {/* ════════════════════ TAB NAVIGATION ════════════════════ */}
        <motion.div variants={fadeInUp} className="mb-6">
          <div className="flex items-center gap-2 p-1.5 bg-zinc-900/50 border border-white/5 rounded-2xl backdrop-blur-xl">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-violet-500 to-cyan-500 text-white shadow-lg shadow-violet-500/25'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.badge && (
                  <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                    activeTab === tab.id ? 'bg-white/20' : 'bg-violet-500/20 text-violet-300'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </motion.div>

        {/* ════════════════════ TAB CONTENT ════════════════════ */}
        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <OverviewTab
              avgProgress={avgProgress}
              totalBudget={totalBudget}
              totalSpent={totalSpent}
              activeProjects={activeProjects}
              runningExperiments={runningExperiments}
              busyTeam={busyTeam}
              totalTeam={TEAM_MEMBERS.length}
              avgEfficiency={avgEfficiency}
              completedMilestones={completedMilestones}
              totalMilestones={totalMilestones}
              projects={RESEARCH_PROJECTS}
              weeklyMetrics={WEEKLY_METRICS}
              projectTypeData={PROJECT_TYPE_DATA}
              budgetData={BUDGET_DATA}
            />
          )}
          {activeTab === "projects" && (
            <ProjectsTab projects={RESEARCH_PROJECTS} onSelectProject={setSelectedProject} />
          )}
          {activeTab === "experiments" && (
            <ExperimentsTab experiments={EXPERIMENTS} projects={RESEARCH_PROJECTS} />
          )}
          {activeTab === "team" && (
            <TeamTab members={TEAM_MEMBERS} />
          )}
        </AnimatePresence>

        {/* ════════════════════ NOTIFICATION PANEL ════════════════════ */}
        <AnimatePresence>
          {showNotifications && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowNotifications(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              />
              <motion.div
                initial={{ opacity: 0, x: 300 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 300 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed right-0 top-0 h-full w-[450px] bg-zinc-900/95 backdrop-blur-xl border-l border-white/10 z-50 overflow-y-auto"
              >
                <NotificationPanel onClose={() => setShowNotifications(false)} projects={RESEARCH_PROJECTS} />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// OVERVIEW TAB — Executive KPIs + Charts
// ═══════════════════════════════════════════════════════════════
const OverviewTab: React.FC<{
  avgProgress: number; totalBudget: number; totalSpent: number;
  activeProjects: number; runningExperiments: number; busyTeam: number; totalTeam: number;
  avgEfficiency: number; completedMilestones: number; totalMilestones: number;
  projects: ResearchProject[]; weeklyMetrics: typeof WEEKLY_METRICS;
  projectTypeData: typeof PROJECT_TYPE_DATA; budgetData: typeof BUDGET_DATA;
}> = ({ avgProgress, totalBudget, totalSpent, activeProjects, runningExperiments, busyTeam, totalTeam, avgEfficiency, completedMilestones, totalMilestones, projects, weeklyMetrics, projectTypeData, budgetData }) => (
  <motion.div key="overview" initial="hidden" animate="visible" exit="hidden" variants={staggerContainer} className="space-y-6">
    {/* KPI Cards */}
    <motion.div variants={fadeInUp} className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">
      {[
        { label: 'Total Budget', value: formatCurrency(totalBudget), sub: `${formatCurrency(totalSpent)} spent`, icon: DollarSign, color: 'violet' },
        { label: 'Avg Progress', value: `${avgProgress}%`, sub: `${completedMilestones}/${totalMilestones} milestones`, icon: TrendingUp, color: 'cyan' },
        { label: 'Active Projects', value: activeProjects.toString(), sub: `${projects.length} total`, icon: FlaskConical, color: 'emerald' },
        { label: 'Trials Running', value: runningExperiments.toString(), sub: 'active tests', icon: TestTube, color: 'cyan' },
        { label: 'Team Size', value: `${totalTeam}`, sub: `${busyTeam} busy · ${avgEfficiency}% eff.`, icon: Users, color: 'amber' },
        { label: 'Trial Success', value: `${Math.round((2/2)*100)}%`, sub: '2 of 2 completed OK', icon: CheckCircle2, color: 'emerald' },
      ].map((kpi, i) => (
        <motion.div key={i} variants={scaleIn} className={`bg-zinc-900/60 border border-${kpi.color}-500/10 rounded-2xl p-4 hover:border-${kpi.color}-500/30 transition-colors`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium">{kpi.label}</span>
            <kpi.icon className={`w-4 h-4 text-${kpi.color}-400`} />
          </div>
          <div className="text-2xl font-bold text-white">{kpi.value}</div>
          <div className="text-[11px] text-zinc-500 mt-1">{kpi.sub}</div>
        </motion.div>
      ))}
    </motion.div>

    {/* Charts Row */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Weekly Metrics Chart */}
      <motion.div variants={fadeInUp} className="lg:col-span-2 bg-zinc-900/50 border border-white/5 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-violet-400" /> Weekly R&D Activity</h3>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyMetrics} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="day" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} />
              <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="tasks" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Tasks" />
              <Bar dataKey="trials" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Trials" />
              <Bar dataKey="issues" fill="#ef4444" radius={[4, 4, 0, 0]} name="Issues" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Project Type Pie */}
      <motion.div variants={fadeInUp} className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><PieChart className="w-4 h-4 text-cyan-400" /> Project Distribution</h3>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <RePieChart>
              <Pie data={projectTypeData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" stroke="none">
                {projectTypeData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: 12, fontSize: 12 }} />
            </RePieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-4 mt-2">
          {projectTypeData.map((d, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-zinc-400">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} /> {d.name} ({d.value})
            </div>
          ))}
        </div>
      </motion.div>
    </div>

    {/* Budget Allocation */}
    <motion.div variants={fadeInUp} className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-400" /> Budget Allocation & Utilization</h3>
      <div className="space-y-3">
        {budgetData.map((b, i) => {
          const pct = Math.round((b.spent / b.allocated) * 100);
          return (
            <div key={i} className="flex items-center gap-4">
              <span className="text-sm text-zinc-400 w-24">{b.category}</span>
              <div className="flex-1 h-3 bg-zinc-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${pct > 90 ? 'bg-red-500' : pct > 75 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs text-zinc-500 w-20 text-right">{formatCurrency(b.spent)}/{formatCurrency(b.allocated)}</span>
              <span className={`text-xs font-bold w-10 text-right ${pct > 90 ? 'text-red-400' : pct > 75 ? 'text-amber-400' : 'text-emerald-400'}`}>{pct}%</span>
            </div>
          );
        })}
      </div>
    </motion.div>

    {/* Project Progress Summary */}
    <motion.div variants={fadeInUp} className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-violet-400" /> Active Projects Summary</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {projects.map(p => {
          const budgetPct = Math.round((p.spent / p.budget) * 100);
          return (
            <div key={p.id} className="bg-zinc-800/40 border border-zinc-700/30 rounded-xl p-4 hover:border-violet-500/20 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-violet-400 font-mono">{p.code}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  p.status === 'Active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' :
                  p.status === 'Review' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20' :
                  'bg-zinc-500/20 text-zinc-400 border border-zinc-500/20'
                }`}>{p.status}</span>
              </div>
              <h4 className="text-sm font-medium text-white mb-1 truncate">{p.name}</h4>
              <p className="text-[11px] text-zinc-500 mb-3">{p.lead} • {p.phase} • Priority: {p.priority}</p>
              <div className="flex items-center gap-2 mb-1">
                <div className="flex-1 h-2 bg-zinc-700 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full" style={{ width: `${p.progress}%` }} />
                </div>
                <span className="text-xs font-bold text-white">{p.progress}%</span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-zinc-500">
                <span>Budget: {formatCurrency(p.spent)}/{formatCurrency(p.budget)} ({budgetPct}%)</span>
                <span>Deadline: {new Date(p.deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  </motion.div>
);

// ═══════════════════════════════════════════════════════════════
// PROJECTS TAB — Research Portfolio Detail
// ═══════════════════════════════════════════════════════════════
const ProjectsTab: React.FC<{ projects: ResearchProject[]; onSelectProject: (p: ResearchProject) => void }> = ({ projects, onSelectProject }) => {
  const [filter, setFilter] = useState<string>('all');
  const filtered = filter === 'all' ? projects : projects.filter(p => p.status === filter);
  const phases = ['Concept', 'Design', 'Development', 'Testing', 'Validation', 'Deployment'];

  return (
    <motion.div key="projects" initial="hidden" animate="visible" exit="hidden" variants={staggerContainer} className="space-y-4">
      {/* Filters */}
      <motion.div variants={fadeInUp} className="flex items-center gap-2">
        {['all', 'Active', 'Review', 'On-Hold', 'Completed'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
            {f === 'all' ? 'All' : f} {f === 'all' && `(${projects.length})`}
          </button>
        ))}
      </motion.div>

      {/* Project Cards */}
      <div className="space-y-4">
        {filtered.map(p => {
          const budgetPct = Math.round((p.spent / p.budget) * 100);
          const phaseIdx = phases.indexOf(p.phase);
          const daysRemaining = Math.ceil((new Date(p.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          const isOverdue = daysRemaining < 0;

          return (
            <motion.div key={p.id} variants={fadeInUp} onClick={() => onSelectProject(p)}
              className="bg-zinc-900/60 border border-white/5 rounded-2xl overflow-hidden hover:border-violet-500/20 transition-all cursor-pointer group">
              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-violet-400 font-mono bg-violet-500/10 px-2 py-0.5 rounded">{p.code}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        p.type === 'Research' ? 'bg-violet-500/20 text-violet-400' :
                        p.type === 'Development' ? 'bg-cyan-500/20 text-cyan-400' :
                        'bg-emerald-500/20 text-emerald-400'
                      }`}>{p.type}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        p.priority === 'Critical' ? 'bg-red-500/20 text-red-400 border border-red-500/20' :
                        p.priority === 'High' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20' :
                        'bg-zinc-500/20 text-zinc-400 border border-zinc-500/20'
                      }`}>{p.priority}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-white group-hover:text-violet-300 transition-colors">{p.name}</h3>
                    <p className="text-sm text-zinc-500 mt-1">{p.description}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                    p.status === 'Active' ? 'bg-emerald-500/20 text-emerald-400' :
                    p.status === 'Review' ? 'bg-amber-500/20 text-amber-400' :
                    p.status === 'On-Hold' ? 'bg-zinc-500/20 text-zinc-400' :
                    'bg-cyan-500/20 text-cyan-400'
                  }`}>{p.status}</span>
                </div>

                {/* Phase Pipeline */}
                <div className="flex items-center gap-1 mb-4">
                  {phases.map((ph, i) => (
                    <div key={ph} className="flex items-center gap-1 flex-1">
                      <div className={`h-1.5 flex-1 rounded-full ${i <= phaseIdx ? 'bg-gradient-to-r from-violet-500 to-cyan-500' : 'bg-zinc-800'}`} />
                      {i === phaseIdx && <span className="text-[9px] text-cyan-400 font-medium whitespace-nowrap">{ph}</span>}
                    </div>
                  ))}
                </div>

                {/* Progress & Details Row */}
                <div className="grid grid-cols-5 gap-4">
                  <div>
                    <span className="text-[10px] uppercase text-zinc-500 block mb-1">Progress</span>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full" style={{ width: `${p.progress}%` }} /></div>
                      <span className="text-xs font-bold text-white">{p.progress}%</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-zinc-500 block mb-1">Budget</span>
                    <span className="text-sm text-white font-medium">{formatCurrency(p.spent)}</span>
                    <span className="text-[10px] text-zinc-500"> / {formatCurrency(p.budget)} ({budgetPct}%)</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-zinc-500 block mb-1">Team</span>
                    <span className="text-sm text-white font-medium">{p.lead}</span>
                    <span className="text-[10px] text-zinc-500"> +{p.team.length - 1}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-zinc-500 block mb-1">Milestones</span>
                    <span className="text-sm text-white font-medium">{p.completedMilestones}/{p.milestones}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-zinc-500 block mb-1">Deadline</span>
                    <span className={`text-sm font-medium ${isOverdue ? 'text-red-400' : daysRemaining < 14 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {isOverdue ? `${Math.abs(daysRemaining)}d overdue` : `${daysRemaining}d left`}
                    </span>
                  </div>
                </div>

                {/* Impact & Team */}
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-zinc-800/50">
                  <span className="text-[10px] text-zinc-500">Impact: <span className={`font-bold ${p.impact === 'High' ? 'text-emerald-400' : 'text-amber-400'}`}>{p.impact}</span></span>
                  <span className="text-[10px] text-zinc-500">Team: <span className="font-bold text-cyan-400">{p.team.join(', ')}</span></span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════
// EXPERIMENTS TAB
// ═══════════════════════════════════════════════════════════════
const ExperimentsTab: React.FC<{ experiments: Experiment[]; projects: ResearchProject[] }> = ({ experiments, projects }) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const filtered = statusFilter === 'all' ? experiments : experiments.filter(e => e.status === statusFilter);

  const statusColors: Record<string, { bg: string; text: string }> = {
    Running: { bg: 'bg-blue-500/20 border-blue-500/30', text: 'text-blue-400' },
    Completed: { bg: 'bg-emerald-500/20 border-emerald-500/30', text: 'text-emerald-400' },
    Failed: { bg: 'bg-red-500/20 border-red-500/30', text: 'text-red-400' },
    Pending: { bg: 'bg-amber-500/20 border-amber-500/30', text: 'text-amber-400' },
  };

  return (
    <motion.div key="experiments" initial="hidden" animate="visible" exit="hidden" variants={staggerContainer} className="space-y-4">
      {/* Summary Cards */}
      <motion.div variants={fadeInUp} className="grid grid-cols-4 gap-4">
        {['Running', 'Completed', 'Failed', 'Pending'].map(s => {
          const count = experiments.filter(e => e.status === s).length;
          const sc = statusColors[s];
          return (
            <button key={s} onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}
              className={`bg-zinc-900/60 border rounded-xl p-4 text-center transition-all ${statusFilter === s ? sc.bg + ' border' : 'border-white/5 hover:border-white/10'}`}>
              <div className={`text-2xl font-bold ${sc.text}`}>{count}</div>
              <div className="text-xs text-zinc-400 mt-1">{s}</div>
            </button>
          );
        })}
      </motion.div>

      {/* Filter info */}
      {statusFilter !== 'all' && (
        <motion.div variants={fadeInUp} className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Showing: {statusFilter}</span>
          <button onClick={() => setStatusFilter('all')} className="text-xs text-violet-400 hover:underline">Clear filter</button>
        </motion.div>
      )}

      {/* Experiments Table */}
      <motion.div variants={fadeInUp} className="bg-zinc-900/50 border border-white/5 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[1fr_120px_100px_130px_130px_1fr] gap-0 bg-zinc-800/50 px-5 py-3 text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
          <div>Experiment</div><div>Project</div><div className="text-center">Status</div><div>Researcher</div><div>Started</div><div>Results</div>
        </div>
        {filtered.map((exp, i) => {
          const sc = statusColors[exp.status] || statusColors.Pending;
          const project = projects.find(p => p.code === exp.projectCode);
          return (
            <motion.div key={exp.id} variants={slideIn} className={`grid grid-cols-[1fr_120px_100px_130px_130px_1fr] gap-0 px-5 py-3.5 border-t border-zinc-800/30 hover:bg-zinc-800/20 transition-colors ${i % 2 === 0 ? 'bg-zinc-900/20' : ''}`}>
              <div>
                <span className="text-sm text-white font-medium">{exp.name}</span>
              </div>
              <div className="text-xs text-violet-400 font-mono">{exp.projectCode}</div>
              <div className="text-center">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${sc.bg} ${sc.text}`}>{exp.status}</span>
              </div>
              <div className="text-xs text-zinc-400">{exp.researcher}</div>
              <div className="text-xs text-zinc-500">{new Date(exp.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}{exp.endDate ? ` → ${new Date(exp.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : ''}</div>
              <div className="text-xs">{exp.results ? <span className={exp.success ? 'text-emerald-400' : 'text-red-400'}>{exp.results}</span> : <span className="text-zinc-600">{exp.status === 'Running' ? 'In progress...' : 'Awaiting'}</span>}</div>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════
// TEAM TAB
// ═══════════════════════════════════════════════════════════════
const TeamTab: React.FC<{ members: TeamMember[] }> = ({ members }) => {
  const totalProjects = members.reduce((s, m) => s + m.projects, 0);
  const avgEff = Math.round(members.reduce((s, m) => s + m.efficiency, 0) / members.length);

  return (
    <motion.div key="team" initial="hidden" animate="visible" exit="hidden" variants={staggerContainer} className="space-y-4">
      {/* Team Stats */}
      <motion.div variants={fadeInUp} className="grid grid-cols-3 gap-4">
        {[
          { label: 'Team Size', value: members.length, icon: Users, color: 'violet' },
          { label: 'Active Projects', value: totalProjects, icon: FlaskConical, color: 'cyan' },
          { label: 'Avg Efficiency', value: `${avgEff}%`, icon: Zap, color: 'emerald' },
        ].map((stat, i) => (
          <motion.div key={i} variants={scaleIn} className="bg-zinc-900/60 border border-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`w-4 h-4 text-${stat.color}-400`} />
              <span className="text-[10px] uppercase tracking-wider text-zinc-500">{stat.label}</span>
            </div>
            <div className="text-2xl font-bold text-white">{stat.value}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* Team Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {members.map(m => (
          <motion.div key={m.id} variants={fadeInUp} className="bg-zinc-900/60 border border-white/5 rounded-2xl p-5 hover:border-violet-500/20 transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                m.status === 'Available' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' :
                m.status === 'Leave' ? 'bg-red-500/20 text-red-400 border border-red-500/20' :
                'bg-violet-500/20 text-violet-400 border border-violet-500/20'
              }`}>
                {m.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white truncate">{m.name}</div>
                <div className="text-[11px] text-zinc-500">{m.role}</div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                m.status === 'Available' ? 'bg-emerald-500/20 text-emerald-400' :
                m.status === 'Leave' ? 'bg-red-500/20 text-red-400' :
                'bg-blue-500/20 text-blue-400'
              }`}>{m.status}</span>
            </div>

            <div className="text-[11px] text-zinc-500 mb-3 px-2.5 py-1.5 bg-zinc-800/30 rounded-lg">{m.specialization}</div>

            {/* Efficiency bar */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span className="text-zinc-500">Efficiency</span>
                <span className={`font-bold ${m.efficiency >= 95 ? 'text-emerald-400' : m.efficiency >= 85 ? 'text-cyan-400' : 'text-amber-400'}`}>{m.efficiency}%</span>
              </div>
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${m.efficiency >= 95 ? 'bg-emerald-500' : m.efficiency >= 85 ? 'bg-cyan-500' : 'bg-amber-500'}`} style={{ width: `${m.efficiency}%` }} />
              </div>
            </div>

            {/* Metrics */}
            <div className="flex items-center justify-between pt-3 border-t border-zinc-800/50">
              <div className="text-center">
                <div className="text-sm font-bold text-violet-400">{m.projects}</div>
                <div className="text-[9px] text-zinc-600">Projects</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-zinc-500">{m.role}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════
// NOTIFICATION PANEL (Sidebar)
// ═══════════════════════════════════════════════════════════════
const NotificationPanel: React.FC<{ onClose: () => void; projects: ResearchProject[] }> = ({ onClose, projects }) => {
  const reviewProjects = projects.filter(p => p.status === 'Review');
  const criticalProjects = projects.filter(p => p.priority === 'Critical');
  const overdue = projects.filter(p => new Date(p.deadline) < new Date() && p.status !== 'Completed');
  const highBudget = projects.filter(p => (p.spent / p.budget) > 0.9);

  const alerts = [
    ...reviewProjects.map(p => ({ type: 'review', title: `${p.code} Ready for Review`, message: `${p.name} — ${p.progress}% complete`, color: 'amber' })),
    ...overdue.map(p => ({ type: 'overdue', title: `${p.code} Overdue`, message: `${p.name} — deadline was ${new Date(p.deadline).toLocaleDateString('en-IN')}`, color: 'red' })),
    ...highBudget.map(p => ({ type: 'budget', title: `Budget Alert: ${p.code}`, message: `${p.name} — ${Math.round((p.spent / p.budget) * 100)}% budget used`, color: 'orange' })),
    ...criticalProjects.map(p => ({ type: 'critical', title: `Critical: ${p.code}`, message: `${p.name} — ${p.phase} phase`, color: 'violet' })),
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-5 border-b border-white/10">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2"><Bell className="w-5 h-5 text-violet-400" /> Alerts & Notifications</h3>
        <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"><X className="w-5 h-5 text-zinc-400" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {alerts.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <p className="text-zinc-400 text-sm">All clear! No pending alerts.</p>
          </div>
        ) : (
          alerts.map((alert, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className={`p-4 rounded-xl border bg-zinc-800/30 ${
                alert.color === 'red' ? 'border-red-500/20' :
                alert.color === 'amber' ? 'border-amber-500/20' :
                alert.color === 'orange' ? 'border-orange-500/20' :
                'border-violet-500/20'
              }`}>
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className={`w-3.5 h-3.5 ${
                  alert.color === 'red' ? 'text-red-400' :
                  alert.color === 'amber' ? 'text-amber-400' :
                  alert.color === 'orange' ? 'text-orange-400' :
                  'text-violet-400'
                }`} />
                <span className="text-sm font-medium text-white">{alert.title}</span>
              </div>
              <p className="text-xs text-zinc-400 ml-5">{alert.message}</p>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};
