/**
 * Employee Dashboard — Personal Workspace
 * Auto-detects logged-in employee and shows their personal dashboard
 * Features: Tasks, PO Creation, PO History, Work Summary
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, CheckCircle, Clock, AlertTriangle, TrendingUp,
  Calendar, Briefcase, Target, Award, Activity,
  Plus, Edit, Trash2, CheckCheck, X, Send, FileText,
  Package, Building2, Search, Truck, Eye, IndianRupee,
  ChevronDown, Printer, BarChart3, ArrowRight
} from 'lucide-react';
import { db } from '@/lib/firebase/client';
import MaterialRequestForm from '@/components/store/MaterialRequestForm';
import {
  collection, addDoc, onSnapshot, updateDoc, deleteDoc,
  doc, query, where, orderBy
} from 'firebase/firestore';

// ==========================================
// EMPLOYEE DATA
// ==========================================
const EMPLOYEES = [
  {
    id: 'Trio_1384', name: 'M Narendra Prasad', role: 'Asst. Manager',
    avatar: 'MNP', color: 'from-blue-600 to-blue-700', loginName: 'narendra',
    email: 'narendra@triovisioninternational.com'
  },
  {
    id: 'Trio_1006', name: 'S Surya Prakash', role: 'Engineer',
    avatar: 'SP', color: 'from-green-600 to-green-700', loginName: 'surya',
    email: 'surya@triovisioninternational.com'
  },
  {
    id: 'Trio_1268', name: 'J Rakesh', role: 'Engineer',
    avatar: 'JR', color: 'from-purple-600 to-purple-700', loginName: 'rakesh',
    email: 'rakesh@triovisioninternational.com'
  },
  {
    id: 'Trio_1401', name: 'K Ramesh', role: 'Technician',
    avatar: 'KR', color: 'from-orange-600 to-orange-700', loginName: 'ramesh',
    email: 'ramesh@triovisioninternational.com'
  },
  {
    id: 'Trio_1402', name: 'V Venkatesh', role: 'Technician',
    avatar: 'VV', color: 'from-cyan-600 to-cyan-700', loginName: 'venkat',
    email: 'venkat@triovisioninternational.com'
  },
  {
    id: 'Trio_1403', name: 'P Srinivas', role: 'Sr. Technician',
    avatar: 'PS', color: 'from-teal-600 to-teal-700', loginName: 'srinivas',
    email: 'srinivas@triovisioninternational.com'
  },
  {
    id: 'Trio_1404', name: 'A Kumar', role: 'Technician',
    avatar: 'AK', color: 'from-rose-600 to-rose-700', loginName: 'kumar',
    email: 'kumar@triovisioninternational.com'
  },
  {
    id: 'Trio_1405', name: 'R Ravi Kumar', role: 'Operator',
    avatar: 'RK', color: 'from-amber-600 to-amber-700', loginName: 'ravi',
    email: 'ravi@triovisioninternational.com'
  },
  {
    id: 'Trio_1406', name: 'B Suresh', role: 'Operator',
    avatar: 'BS', color: 'from-indigo-600 to-indigo-700', loginName: 'suresh',
    email: 'suresh@triovisioninternational.com'
  },
  {
    id: 'Trio_1407', name: 'G Mahesh', role: 'Technician',
    avatar: 'GM', color: 'from-pink-600 to-pink-700', loginName: 'mahesh',
    email: 'mahesh@triovisioninternational.com'
  },
  {
    id: 'Trio_1408', name: 'D Rajesh', role: 'Operator',
    avatar: 'DR', color: 'from-lime-600 to-lime-700', loginName: 'rajesh',
    email: 'rajesh@triovisioninternational.com'
  },
  {
    id: 'Trio_1409', name: 'T Prasad', role: 'Sr. Technician',
    avatar: 'TP', color: 'from-sky-600 to-sky-700', loginName: 'prasad',
    email: 'prasad@triovisioninternational.com'
  },
];

// ==========================================
// TYPES
// ==========================================
interface Task {
  id: string;
  employeeId: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

interface EmpActivity {
  id: string;
  employeeId: string;
  action: string;
  timestamp: string;
  type: 'task_created' | 'task_updated' | 'task_completed' | 'status_change' | 'po_created';
}

interface EmployeePO {
  id: string;
  poNumber: string;
  vendorName: string;
  vendorContact?: string;
  vendorGST?: string;
  vendorAddress?: string;
  items: {
    materialName: string;
    materialCode?: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
    taxPercent?: number;
    receivedQty?: number;
    pendingQty?: number;
  }[];
  subtotal: number;
  totalAmount: number;
  status: string;
  paymentTerms?: string;
  deliveryTerms?: string;
  expectedDelivery?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  notes?: string;
}

// PO Line Item for creation
interface POLineItem {
  id: string;
  materialName: string;
  materialCode: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxPercent: number;
}

type ActiveView = 'dashboard' | 'tasks' | 'create-po' | 'my-pos' | 'activity' | 'material-request' | 'my-requests';

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function EmployeeDashboards() {
  const [currentEmployee, setCurrentEmployee] = useState(EMPLOYEES[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<EmpActivity[]>([]);
  const [myPOs, setMyPOs] = useState<EmployeePO[]>([]);
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [expandedPO, setExpandedPO] = useState<string | null>(null);

  // Task form
  const [taskForm, setTaskForm] = useState({
    title: '', description: '', priority: 'medium' as Task['priority'], dueDate: ''
  });

  // PO creation form
  const [showPOModal, setShowPOModal] = useState(false);
  const [poStep, setPOStep] = useState(1);
  const [poVendor, setPOVendor] = useState({ name: '', contact: '', phone: '', email: '', gst: '', address: '' });
  const [poItems, setPOItems] = useState<POLineItem[]>([]);
  const [poTerms, setPOTerms] = useState({ payment: 'Net 30 Days', delivery: 'Ex-Works', expectedDate: '', notes: '' });
  const [savingPO, setSavingPO] = useState(false);
  const [showMRFModal, setShowMRFModal] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [myRequests, setMyRequests] = useState<any[]>([]);

  // ==========================================
  // AUTO-DETECT EMPLOYEE FROM LOGIN
  // ==========================================
  useEffect(() => {
    try {
      const savedName = localStorage.getItem('currentUserName') || '';
      const match = EMPLOYEES.find(e =>
        e.name.toLowerCase() === savedName.toLowerCase() ||
        e.loginName === savedName.toLowerCase() ||
        savedName.toLowerCase().includes(e.loginName)
      );
      if (match) setCurrentEmployee(match);
    } catch { /* fallback to default */ }
    setIsLoading(false);
  }, []);

  // Time update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ==========================================
  // FIREBASE LISTENERS
  // ==========================================
  useEffect(() => {
    // Tasks
    const tasksQ = query(collection(db, 'employee_tasks'), where('employeeId', '==', currentEmployee.id));
    const unsubTasks = onSnapshot(tasksQ, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Task));
      data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setTasks(data);
    }, (err) => console.error('Tasks error:', err));

    // Activities
    const actQ = query(collection(db, 'employee_activities'), where('employeeId', '==', currentEmployee.id));
    const unsubAct = onSnapshot(actQ, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as EmpActivity));
      data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setActivities(data.slice(0, 20));
    }, (err) => console.error('Activities error:', err));

    // My POs
    const poQ = query(collection(db, 'purchase_orders'), where('createdBy', '==', currentEmployee.name));
    const unsubPO = onSnapshot(poQ, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as EmployeePO));
      data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setMyPOs(data);
    }, (err) => console.warn('PO listener:', err.message));

    // My Material Requests
    const mrQ = query(collection(db, 'material_requests'), where('requestedById', '==', currentEmployee.id));
    const unsubMR = onSnapshot(mrQ, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a: { createdAt?: string }, b: { createdAt?: string }) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
      setMyRequests(data);
    }, (err) => console.warn('MR listener:', err.message));

    return () => { unsubTasks(); unsubAct(); unsubPO(); unsubMR(); };
  }, [currentEmployee]);

  // ==========================================
  // TASK CRUD
  // ==========================================
  const handleSaveTask = async () => {
    if (!taskForm.title.trim()) return;
    const ts = new Date().toISOString();
    if (editingTask) {
      await updateDoc(doc(db, 'employee_tasks', editingTask.id), { ...taskForm, updatedAt: ts });
      await addDoc(collection(db, 'employee_activities'), {
        employeeId: currentEmployee.id, action: `Updated task: ${taskForm.title}`, timestamp: ts, type: 'task_updated'
      });
    } else {
      await addDoc(collection(db, 'employee_tasks'), {
        employeeId: currentEmployee.id, ...taskForm, status: 'pending', createdAt: ts, updatedAt: ts
      });
      await addDoc(collection(db, 'employee_activities'), {
        employeeId: currentEmployee.id, action: `Created task: ${taskForm.title}`, timestamp: ts, type: 'task_created'
      });
    }
    setTaskForm({ title: '', description: '', priority: 'medium', dueDate: '' });
    setEditingTask(null);
    setShowTaskModal(false);
  };

  const handleStatusChange = async (task: Task, newStatus: Task['status']) => {
    const ts = new Date().toISOString();
    const updates: Partial<Task> = { status: newStatus, updatedAt: ts };
    if (newStatus === 'completed') updates.completedAt = ts;
    await updateDoc(doc(db, 'employee_tasks', task.id), updates);
    await addDoc(collection(db, 'employee_activities'), {
      employeeId: currentEmployee.id,
      action: `${newStatus === 'completed' ? 'Completed' : 'Updated'} task: ${task.title}`,
      timestamp: ts, type: newStatus === 'completed' ? 'task_completed' : 'status_change'
    });
  };

  const handleDeleteTask = async (task: Task) => {
    if (!confirm(`Delete: ${task.title}?`)) return;
    await deleteDoc(doc(db, 'employee_tasks', task.id));
    await addDoc(collection(db, 'employee_activities'), {
      employeeId: currentEmployee.id, action: `Deleted task: ${task.title}`,
      timestamp: new Date().toISOString(), type: 'task_updated'
    });
  };

  // ==========================================
  // PO CREATION
  // ==========================================
  const addPOItem = () => {
    setPOItems(prev => [...prev, {
      id: Date.now().toString(), materialName: '', materialCode: '',
      quantity: 1, unit: 'Nos', unitPrice: 0, taxPercent: 18
    }]);
  };

  const updatePOItem = (id: string, field: keyof POLineItem, value: string | number) => {
    setPOItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const removePOItem = (id: string) => setPOItems(prev => prev.filter(i => i.id !== id));

  const poSubtotal = poItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const poTax = poItems.reduce((s, i) => s + (i.quantity * i.unitPrice * i.taxPercent) / 100, 0);
  const poTotal = poSubtotal + poTax;

  const handleSubmitPO = async () => {
    if (savingPO || poItems.length === 0 || !poVendor.name.trim()) return;
    setSavingPO(true);
    try {
      const now = new Date();
      const poNumber = `PO/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(Math.floor(Math.random() * 99999) + 1).padStart(5, '0')}`;
      
      await addDoc(collection(db, 'purchase_orders'), {
        poNumber,
        vendorId: `emp_${currentEmployee.id}_${Date.now()}`,
        vendorName: poVendor.name,
        vendorContact: poVendor.contact,
        vendorPhone: poVendor.phone,
        vendorEmail: poVendor.email,
        vendorGST: poVendor.gst,
        vendorAddress: poVendor.address,
        items: poItems.map(i => ({
          materialId: `manual_${i.id}`,
          materialCode: i.materialCode,
          materialName: i.materialName,
          quantity: i.quantity,
          unit: i.unit,
          unitPrice: i.unitPrice,
          totalPrice: i.quantity * i.unitPrice,
          taxPercent: i.taxPercent,
          taxAmount: (i.quantity * i.unitPrice * i.taxPercent) / 100,
          receivedQty: 0,
          pendingQty: i.quantity,
        })),
        subtotal: poSubtotal,
        taxPercent: 18,
        taxAmount: poTax,
        otherCharges: 0,
        totalAmount: poTotal,
        status: 'pending_md_approval',
        requiresMDApproval: true,
        mdApprovalThreshold: 0,
        approvalSteps: [{ step: 1, approverRole: 'MD', status: 'pending' }],
        paymentTerms: poTerms.payment,
        deliveryTerms: poTerms.delivery,
        expectedDelivery: poTerms.expectedDate || null,
        notes: poTerms.notes || null,
        createdBy: currentEmployee.name,
        createdByName: currentEmployee.name,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        receivedItems: [],
        totalReceivedQty: 0,
        source: `Employee-${currentEmployee.loginName}`,
      });

      // Log activity
      await addDoc(collection(db, 'employee_activities'), {
        employeeId: currentEmployee.id,
        action: `Created PO ${poNumber} for ${poVendor.name} — ${formatCurrency(poTotal)}`,
        timestamp: now.toISOString(),
        type: 'po_created'
      });

      // Notification for MD
      try {
        await addDoc(collection(db, 'notifications'), {
          type: 'po_approval', title: 'PO from Employee',
          message: `${currentEmployee.name} created PO ${poNumber} for ${formatCurrency(poTotal)}`,
          documentType: 'purchase_order', forRole: ['md', 'admin'],
          priority: 'high', read: false, createdAt: now.toISOString(), createdBy: currentEmployee.name,
        });
      } catch { /* */ }

      // Reset
      setPOStep(1);
      setPOVendor({ name: '', contact: '', phone: '', email: '', gst: '', address: '' });
      setPOItems([]);
      setPOTerms({ payment: 'Net 30 Days', delivery: 'Ex-Works', expectedDate: '', notes: '' });
      setShowPOModal(false);
      setActiveView('my-pos');
    } catch (err) {
      console.error('PO creation failed:', err);
      alert('Failed to create PO. Please try again.');
    } finally {
      setSavingPO(false);
    }
  };

  // ==========================================
  // STATS
  // ==========================================
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const pending = tasks.filter(t => t.status === 'pending').length;
    const overdue = tasks.filter(t => t.status !== 'completed' && t.dueDate && new Date(t.dueDate) < new Date()).length;
    const totalPOs = myPOs.length;
    const pendingPOs = myPOs.filter(p => p.status === 'pending_md_approval').length;
    const approvedPOs = myPOs.filter(p => ['approved', 'ordered', 'partially_received', 'received'].includes(p.status)).length;
    const poValue = myPOs.reduce((s, p) => s + (p.totalAmount || 0), 0);
    const totalMRF = myRequests.length;
    const pendingMRF = myRequests.filter((r: { status: string }) => r.status === 'sent_to_store' || r.status === 'processing').length;
    const fulfilledMRF = myRequests.filter((r: { status: string }) => r.status === 'fulfilled').length;
    return { total, completed, inProgress, pending, overdue, totalPOs, pendingPOs, approvedPOs, poValue, totalMRF, pendingMRF, fulfilledMRF };
  }, [tasks, myPOs, myRequests]);

  const completionRate = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;

  // ==========================================
  // NAV ITEMS
  // ==========================================
  const NAV_ITEMS: { key: ActiveView; label: string; icon: React.ElementType; badge?: number }[] = [
    { key: 'dashboard', label: 'Overview', icon: BarChart3 },
    { key: 'tasks', label: 'My Tasks', icon: Briefcase, badge: stats.pending },
    { key: 'material-request', label: 'Material Request', icon: Package },
    { key: 'my-requests', label: 'My Requests', icon: FileText, badge: myRequests.filter(r => r.status !== 'fulfilled' && r.status !== 'rejected').length },
    { key: 'create-po', label: 'Create PO', icon: Send },
    { key: 'my-pos', label: 'My POs', icon: FileText, badge: stats.totalPOs },
    { key: 'activity', label: 'Activity', icon: Activity },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400 animate-pulse">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 pb-20">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.05),transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      <div className="relative">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="border-b border-white/10 backdrop-blur-xl bg-zinc-900/50 sticky top-0 z-40">
          <div className="max-w-[1800px] mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 bg-gradient-to-br ${currentEmployee.color} rounded-xl flex items-center justify-center shadow-lg text-white font-bold text-sm`}>
                  {currentEmployee.avatar}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">{currentEmployee.name}</h1>
                  <p className="text-sm text-zinc-400">{currentEmployee.role} · {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Employee switcher (for admins or testing) */}
                <select value={currentEmployee.id}
                  onChange={e => { const emp = EMPLOYEES.find(x => x.id === e.target.value); if (emp) setCurrentEmployee(emp); }}
                  className="bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none">
                  {EMPLOYEES.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
                <button onClick={() => setShowMRFModal(true)}
                  className="px-4 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 rounded-xl text-sm font-medium flex items-center gap-2 text-white shadow-lg shadow-orange-500/20">
                  <Package className="w-4 h-4" /> Material Request
                </button>
                <button onClick={() => { setShowPOModal(true); setPOStep(1); }}
                  className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-xl text-sm font-medium flex items-center gap-2 text-white shadow-lg shadow-blue-500/20">
                  <Send className="w-4 h-4" /> Create PO
                </button>
                <button onClick={() => { setEditingTask(null); setTaskForm({ title: '', description: '', priority: 'medium', dueDate: '' }); setShowTaskModal(true); }}
                  className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-sm font-medium flex items-center gap-2 text-zinc-300">
                  <Plus className="w-4 h-4" /> Add Task
                </button>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-1 mt-4 -mb-[1px]">
              {NAV_ITEMS.map(item => {
                const Icon = item.icon;
                const isActive = activeView === item.key;
                return (
                  <button key={item.key} onClick={() => { if (item.key === 'create-po') { setShowPOModal(true); setPOStep(1); } else if (item.key === 'material-request') { setShowMRFModal(true); } else setActiveView(item.key); }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition-all ${isActive ? 'bg-zinc-800 text-white border border-zinc-700 border-b-zinc-800' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}>
                    <Icon className="w-4 h-4" />
                    {item.label}
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="px-1.5 py-0.5 bg-blue-600/30 text-blue-400 text-[10px] font-bold rounded-full">{item.badge}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Content */}
        <div className="max-w-[1800px] mx-auto px-6 py-6">
          <AnimatePresence mode="wait">

            {/* ═══ OVERVIEW DASHBOARD ═══ */}
            {activeView === 'dashboard' && (
              <motion.div key="dash" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                  {[
                    { label: 'Tasks', value: stats.total, icon: Briefcase, c: 'text-blue-400 bg-blue-500/10' },
                    { label: 'Completed', value: stats.completed, icon: CheckCircle, c: 'text-emerald-400 bg-emerald-500/10' },
                    { label: 'In Progress', value: stats.inProgress, icon: Clock, c: 'text-purple-400 bg-purple-500/10' },
                    { label: 'Pending', value: stats.pending, icon: Target, c: 'text-orange-400 bg-orange-500/10' },
                    { label: 'My POs', value: stats.totalPOs, icon: FileText, c: 'text-cyan-400 bg-cyan-500/10' },
                    { label: 'MRF Total', value: stats.totalMRF, icon: Package, c: 'text-amber-400 bg-amber-500/10' },
                    { label: 'MRF Pending', value: stats.pendingMRF, icon: Clock, c: 'text-orange-400 bg-orange-500/10' },
                    { label: 'MRF Done', value: stats.fulfilledMRF, icon: CheckCircle, c: 'text-green-400 bg-green-500/10' },
                  ].map(s => (
                    <div key={s.label} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                      <div className={`w-8 h-8 rounded-lg ${s.c} flex items-center justify-center mb-2`}>
                        <s.icon className="w-4 h-4" />
                      </div>
                      <div className="text-2xl font-bold text-white">{s.value}</div>
                      <div className="text-xs text-zinc-500">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Two column layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Work Summary */}
                  <div className="lg:col-span-2 space-y-4">
                    {/* Performance */}
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                          <Award className="w-5 h-5 text-yellow-400" /> Work Summary
                        </h3>
                        <span className="text-sm text-zinc-400">{completionRate.toFixed(0)}% completion rate</span>
                      </div>
                      <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden mb-4">
                        <div className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full transition-all" style={{ width: `${completionRate}%` }} />
                      </div>
                      {stats.poValue > 0 && (
                        <div className="bg-blue-900/10 border border-blue-500/20 rounded-lg p-3 mt-3">
                          <span className="text-xs text-zinc-400">Total PO Value Created:</span>
                          <span className="text-lg font-bold text-blue-400 ml-2">{formatCurrency(stats.poValue)}</span>
                        </div>
                      )}
                    </div>

                    {/* Recent Tasks */}
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-white flex items-center gap-2"><Briefcase className="w-4 h-4 text-blue-400" /> Recent Tasks</h3>
                        <button onClick={() => setActiveView('tasks')} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">View All <ArrowRight className="w-3 h-3" /></button>
                      </div>
                      <div className="space-y-2">
                        {tasks.slice(0, 5).map(t => (
                          <div key={t.id} className="flex items-center justify-between px-3 py-2.5 bg-zinc-800/30 rounded-lg">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${t.status === 'completed' ? 'bg-emerald-400' : t.status === 'in_progress' ? 'bg-purple-400' : 'bg-orange-400'}`} />
                              <span className={`text-sm ${t.status === 'completed' ? 'text-zinc-500 line-through' : 'text-white'}`}>{t.title}</span>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded border ${
                              t.priority === 'urgent' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                              t.priority === 'high' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                              t.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                              'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            }`}>{t.priority}</span>
                          </div>
                        ))}
                        {tasks.length === 0 && <p className="text-zinc-500 text-sm text-center py-4">No tasks yet</p>}
                      </div>
                    </div>

                    {/* Recent POs */}
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-white flex items-center gap-2"><FileText className="w-4 h-4 text-cyan-400" /> My Purchase Orders</h3>
                        <button onClick={() => setActiveView('my-pos')} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">View All <ArrowRight className="w-3 h-3" /></button>
                      </div>
                      <div className="space-y-2">
                        {myPOs.slice(0, 4).map(po => {
                          const sc: Record<string, string> = {
                            pending_md_approval: 'bg-amber-500/20 text-amber-400',
                            approved: 'bg-emerald-500/20 text-emerald-400',
                            rejected: 'bg-red-500/20 text-red-400',
                            ordered: 'bg-blue-500/20 text-blue-400',
                            partially_received: 'bg-cyan-500/20 text-cyan-400',
                            received: 'bg-green-500/20 text-green-400',
                          };
                          return (
                            <div key={po.id} className="flex items-center justify-between px-3 py-2.5 bg-zinc-800/30 rounded-lg">
                              <div>
                                <span className="text-white text-sm font-medium">{po.poNumber}</span>
                                <span className="text-zinc-500 text-xs ml-2">{po.vendorName}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-zinc-400 text-xs">{formatCurrency(po.totalAmount || 0)}</span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${sc[po.status] || 'bg-zinc-700 text-zinc-400'}`}>
                                  {po.status?.replace(/_/g, ' ').toUpperCase()}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                        {myPOs.length === 0 && <p className="text-zinc-500 text-sm text-center py-4">No POs created yet</p>}
                      </div>
                    </div>
                  </div>

                  {/* Activity Feed */}
                  <div>
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
                      <h3 className="font-semibold text-white flex items-center gap-2 mb-4"><Activity className="w-4 h-4 text-purple-400" /> Recent Activity</h3>
                      {activities.length === 0 ? (
                        <p className="text-zinc-500 text-sm text-center py-8">No activity yet</p>
                      ) : (
                        <div className="space-y-3 max-h-[500px] overflow-y-auto">
                          {activities.map(a => (
                            <div key={a.id} className="flex items-start gap-3">
                              <div className={`p-1.5 rounded-lg ${
                                a.type === 'po_created' ? 'bg-cyan-500/10 text-cyan-400' :
                                a.type === 'task_completed' ? 'bg-emerald-500/10 text-emerald-400' :
                                a.type === 'task_created' ? 'bg-blue-500/10 text-blue-400' :
                                'bg-purple-500/10 text-purple-400'
                              }`}>
                                {a.type === 'po_created' ? <Send className="w-3.5 h-3.5" /> :
                                 a.type === 'task_completed' ? <CheckCheck className="w-3.5 h-3.5" /> :
                                 a.type === 'task_created' ? <Plus className="w-3.5 h-3.5" /> :
                                 <Edit className="w-3.5 h-3.5" />}
                              </div>
                              <div>
                                <p className="text-sm text-white">{a.action}</p>
                                <p className="text-[11px] text-zinc-600">{new Date(a.timestamp).toLocaleString('en-IN')}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ═══ TASKS VIEW ═══ */}
            {activeView === 'tasks' && (
              <motion.div key="tasks" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-blue-400" /> My Tasks
                    <span className="text-sm font-normal text-zinc-500">({tasks.length} total · {completionRate.toFixed(0)}% complete)</span>
                  </h2>
                </div>
                <TaskList tasks={tasks} onStatusChange={handleStatusChange}
                  onEdit={(t) => { setEditingTask(t); setTaskForm({ title: t.title, description: t.description, priority: t.priority, dueDate: t.dueDate }); setShowTaskModal(true); }}
                  onDelete={handleDeleteTask} />
              </motion.div>
            )}

            {/* ═══ MY POs VIEW ═══ */}
            {activeView === 'my-pos' && (
              <motion.div key="mypos" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-cyan-400" /> My Purchase Orders
                    <span className="text-sm font-normal text-zinc-500">({myPOs.length} total · {formatCurrency(stats.poValue)})</span>
                  </h2>
                  <button onClick={() => { setShowPOModal(true); setPOStep(1); }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm flex items-center gap-2">
                    <Send className="w-4 h-4" /> New PO
                  </button>
                </div>

                {/* PO Status filter badges */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { status: 'pending_md_approval', label: 'Pending Approval', c: 'amber' },
                    { status: 'approved', label: 'Approved', c: 'emerald' },
                    { status: 'ordered', label: 'Ordered', c: 'blue' },
                    { status: 'partially_received', label: 'Partially Received', c: 'cyan' },
                    { status: 'received', label: 'Received', c: 'green' },
                    { status: 'rejected', label: 'Rejected', c: 'red' },
                  ].map(s => {
                    const count = myPOs.filter(p => p.status === s.status).length;
                    if (count === 0) return null;
                    return (
                      <span key={s.status} className={`px-3 py-1.5 rounded-lg bg-${s.c}-500/10 border border-${s.c}-500/20 text-${s.c}-400 text-xs font-medium`}>
                        {count} {s.label}
                      </span>
                    );
                  })}
                </div>

                {myPOs.length === 0 ? (
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-12 text-center">
                    <FileText className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                    <p className="text-zinc-400 mb-3">No purchase orders created yet</p>
                    <button onClick={() => { setShowPOModal(true); setPOStep(1); }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm">Create Your First PO</button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myPOs.map(po => {
                      const isExpanded = expandedPO === po.id;
                      const sc: Record<string, { bg: string; text: string }> = {
                        pending_md_approval: { bg: 'bg-amber-500/20 border-amber-500/30', text: 'text-amber-400' },
                        approved: { bg: 'bg-emerald-500/20 border-emerald-500/30', text: 'text-emerald-400' },
                        rejected: { bg: 'bg-red-500/20 border-red-500/30', text: 'text-red-400' },
                        ordered: { bg: 'bg-blue-500/20 border-blue-500/30', text: 'text-blue-400' },
                        partially_received: { bg: 'bg-cyan-500/20 border-cyan-500/30', text: 'text-cyan-400' },
                        received: { bg: 'bg-green-500/20 border-green-500/30', text: 'text-green-400' },
                      };
                      const st = sc[po.status] || { bg: 'bg-zinc-700', text: 'text-zinc-400' };
                      const totalRecv = (po.items || []).reduce((s, i) => s + (i.receivedQty || 0), 0);
                      const totalOrd = (po.items || []).reduce((s, i) => s + i.quantity, 0);
                      
                      return (
                        <div key={po.id} className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-colors">
                          <button onClick={() => setExpandedPO(isExpanded ? null : po.id)}
                            className="w-full text-left p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-cyan-600/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 text-xs font-bold">PO</div>
                                <div>
                                  <span className="text-white font-semibold">{po.poNumber}</span>
                                  <span className="text-zinc-400 text-sm ml-2">{po.vendorName}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-white font-medium text-sm">{formatCurrency(po.totalAmount || 0)}</span>
                                <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${st.bg} ${st.text}`}>
                                  {po.status?.replace(/_/g, ' ').toUpperCase()}
                                </span>
                                <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                              </div>
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                              <span>{(po.items || []).length} items</span>
                              <span>{new Date(po.createdAt).toLocaleDateString('en-IN')}</span>
                              {po.paymentTerms && <span>{po.paymentTerms}</span>}
                              {totalOrd > 0 && <span>Received: {totalRecv}/{totalOrd}</span>}
                            </div>
                          </button>
                          
                          {/* Expanded details */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                className="border-t border-zinc-800 overflow-hidden">
                                <div className="p-4 space-y-3">
                                  {/* Vendor info */}
                                  <div className="bg-zinc-800/30 rounded-lg p-3">
                                    <div className="text-xs text-zinc-500 mb-1">Vendor</div>
                                    <div className="text-white text-sm">{po.vendorName}</div>
                                    {po.vendorAddress && <div className="text-zinc-500 text-xs">{po.vendorAddress}</div>}
                                    {po.vendorGST && <div className="text-zinc-600 text-xs">GST: {po.vendorGST}</div>}
                                  </div>
                                  {/* Items */}
                                  <div className="space-y-1.5">
                                    {(po.items || []).map((item, idx) => (
                                      <div key={idx} className="flex items-center justify-between px-3 py-2 bg-zinc-800/20 rounded-lg text-sm">
                                        <div>
                                          <span className="text-zinc-500 text-xs mr-2">{idx + 1}.</span>
                                          <span className="text-white">{item.materialName}</span>
                                          {item.materialCode && <span className="text-zinc-600 text-xs ml-1">{item.materialCode}</span>}
                                        </div>
                                        <div className="flex items-center gap-3 text-xs">
                                          <span className="text-zinc-400">{item.quantity} {item.unit}</span>
                                          <span className="text-zinc-400">₹{item.unitPrice}</span>
                                          {(item.receivedQty || 0) > 0 && <span className="text-cyan-400">recv: {item.receivedQty}</span>}
                                          <span className="text-white font-medium">₹{((item.unitPrice || 0) * (item.quantity || 0)).toFixed(0)}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  {/* Totals */}
                                  <div className="bg-zinc-800/30 rounded-lg p-3 text-right space-y-1">
                                    <div className="text-xs text-zinc-500">Subtotal: ₹{(po.subtotal || 0).toFixed(2)}</div>
                                    <div className="text-sm font-bold text-white">Total: {formatCurrency(po.totalAmount || 0)}</div>
                                  </div>
                                  {po.notes && <div className="text-xs text-zinc-500 bg-zinc-800/20 rounded-lg p-2">Notes: {po.notes}</div>}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* ═══ ACTIVITY VIEW ═══ */}
            {activeView === 'activity' && (
              <motion.div key="activity" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-purple-400" /> Activity Log
                </h2>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 space-y-3">
                  {activities.length === 0 ? (
                    <p className="text-zinc-500 text-sm text-center py-8">No activity yet</p>
                  ) : activities.map(a => (
                    <div key={a.id} className="flex items-start gap-3 px-3 py-2.5 hover:bg-zinc-800/30 rounded-lg">
                      <div className={`p-2 rounded-lg ${
                        a.type === 'po_created' ? 'bg-cyan-500/10 text-cyan-400' :
                        a.type === 'task_completed' ? 'bg-emerald-500/10 text-emerald-400' :
                        a.type === 'task_created' ? 'bg-blue-500/10 text-blue-400' :
                        'bg-purple-500/10 text-purple-400'
                      }`}>
                        {a.type === 'po_created' ? <Send className="w-4 h-4" /> :
                         a.type === 'task_completed' ? <CheckCheck className="w-4 h-4" /> :
                         a.type === 'task_created' ? <Plus className="w-4 h-4" /> :
                         <Edit className="w-4 h-4" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-white">{a.action}</p>
                        <p className="text-xs text-zinc-600">{new Date(a.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ═══ MY MATERIAL REQUESTS TRACKING ═══ */}
            {activeView === 'my-requests' && (
              <motion.div key="myrequests" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Package className="w-5 h-5 text-orange-400" /> My Material Requests
                    <span className="text-sm font-normal text-zinc-500">({myRequests.length} total)</span>
                  </h2>
                  <button onClick={() => setShowMRFModal(true)}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg text-white text-sm flex items-center gap-2">
                    <Plus className="w-4 h-4" /> New Request
                  </button>
                </div>

                {/* Status summary */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { status: 'draft', label: 'Draft', c: 'zinc' },
                    { status: 'sent_to_store', label: 'Sent to Store', c: 'amber' },
                    { status: 'processing', label: 'Processing', c: 'blue' },
                    { status: 'fulfilled', label: 'Fulfilled', c: 'emerald' },
                    { status: 'rejected', label: 'Rejected', c: 'red' },
                  ].map(s => {
                    const count = myRequests.filter((r: { status: string }) => r.status === s.status).length;
                    if (count === 0) return null;
                    return (
                      <span key={s.status} className={`px-3 py-1.5 rounded-lg bg-${s.c}-500/10 border border-${s.c}-500/20 text-${s.c}-400 text-xs font-medium`}>
                        {count} {s.label}
                      </span>
                    );
                  })}
                </div>

                {/* Workflow explanation */}
                <div className="bg-gradient-to-r from-orange-900/10 to-amber-900/10 border border-orange-500/15 rounded-xl p-4">
                  <h3 className="text-sm font-medium text-orange-400 mb-2">Material Request Workflow</h3>
                  <div className="flex items-center gap-2 text-xs text-zinc-400 flex-wrap">
                    <span className="px-2 py-1 bg-zinc-500/20 rounded">1. Submit Request</span>
                    <ArrowRight className="w-3 h-3 text-zinc-600" />
                    <span className="px-2 py-1 bg-amber-500/20 rounded text-amber-400">2. Store Reviews</span>
                    <ArrowRight className="w-3 h-3 text-zinc-600" />
                    <span className="px-2 py-1 bg-blue-500/20 rounded text-blue-400">3. Processing</span>
                    <ArrowRight className="w-3 h-3 text-zinc-600" />
                    <span className="px-2 py-1 bg-emerald-500/20 rounded text-emerald-400">4. Fulfilled (Stock Deducted)</span>
                    <ArrowRight className="w-3 h-3 text-zinc-600" />
                    <span className="px-2 py-1 bg-purple-500/20 rounded text-purple-400">5. Manager Notified</span>
                  </div>
                </div>

                {myRequests.length === 0 ? (
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-12 text-center">
                    <Package className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                    <p className="text-zinc-400 mb-3">No material requests submitted yet</p>
                    <button onClick={() => setShowMRFModal(true)}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg text-white text-sm">Submit Your First Request</button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myRequests.map((req: {
                      id: string; requestNumber?: string; department?: string;
                      date?: string; materialRequiredTime?: string; status: string;
                      createdAt?: string; instructions?: string;
                      fulfilledBy?: string; fulfilledAt?: string; rejectedBy?: string;
                      processedBy?: string;
                      items?: { sno: number; materialName: string; quantity: number; uom: string; patternMould?: string; projectName?: string; takenBy?: string; remarks?: string }[];
                    }) => {
                      const statusConfig: Record<string, { bg: string; text: string; label: string; icon: React.ElementType }> = {
                        draft: { bg: 'bg-zinc-500/20 border-zinc-500/30', text: 'text-zinc-400', label: 'DRAFT', icon: FileText },
                        sent_to_store: { bg: 'bg-amber-500/20 border-amber-500/30', text: 'text-amber-400', label: 'SENT TO STORE', icon: Send },
                        processing: { bg: 'bg-blue-500/20 border-blue-500/30', text: 'text-blue-400', label: 'PROCESSING', icon: Clock },
                        fulfilled: { bg: 'bg-emerald-500/20 border-emerald-500/30', text: 'text-emerald-400', label: 'FULFILLED', icon: CheckCircle },
                        rejected: { bg: 'bg-red-500/20 border-red-500/30', text: 'text-red-400', label: 'REJECTED', icon: AlertTriangle },
                      };
                      const sc = statusConfig[req.status] || statusConfig.draft;
                      const StatusIcon = sc.icon;

                      return (
                        <div key={req.id} className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-colors">
                          <div className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-orange-600/10 border border-orange-500/20 flex items-center justify-center text-orange-400 text-xs font-bold">MR</div>
                                <div>
                                  <span className="text-white font-semibold">{req.requestNumber || req.id.slice(0, 8)}</span>
                                  {req.department && <span className="ml-2 px-1.5 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded text-purple-400 text-[10px]">{req.department}</span>}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 ${sc.bg} ${sc.text}`}>
                                  <StatusIcon className="w-3 h-3" /> {sc.label}
                                </span>
                              </div>
                            </div>

                            {/* Items list */}
                            <div className="mt-3 space-y-1">
                              {(req.items || []).map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs px-2 py-1.5 bg-zinc-800/30 rounded-lg">
                                  <div className="flex items-center gap-2">
                                    <span className="text-zinc-500">{item.sno || idx + 1}.</span>
                                    <span className="text-white">{item.materialName}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-zinc-400">{item.quantity} {item.uom}</span>
                                    {item.projectName && <span className="text-zinc-500">{item.projectName}</span>}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Meta info */}
                            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-zinc-500">
                              {req.date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(req.date).toLocaleDateString('en-IN')}</span>}
                              {req.materialRequiredTime && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Need by: {req.materialRequiredTime}</span>}
                              {req.createdAt && <span>Submitted: {new Date(req.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</span>}
                            </div>

                            {/* Status details */}
                            {req.status === 'fulfilled' && (
                              <div className="mt-2 bg-emerald-900/10 border border-emerald-500/15 rounded-lg px-3 py-2 flex items-center gap-2 text-xs">
                                <CheckCircle className="w-4 h-4 text-emerald-400" />
                                <span className="text-emerald-400 font-medium">Fulfilled</span>
                                {req.fulfilledBy && <span className="text-zinc-400">by {req.fulfilledBy}</span>}
                                {req.fulfilledAt && <span className="text-zinc-500">{new Date(req.fulfilledAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</span>}
                                <span className="text-emerald-500/70 ml-auto">Stock deducted automatically</span>
                              </div>
                            )}
                            {req.status === 'processing' && (
                              <div className="mt-2 bg-blue-900/10 border border-blue-500/15 rounded-lg px-3 py-2 flex items-center gap-2 text-xs">
                                <Clock className="w-4 h-4 text-blue-400" />
                                <span className="text-blue-400 font-medium">Being processed by Store</span>
                                {req.processedBy && <span className="text-zinc-400">by {req.processedBy}</span>}
                              </div>
                            )}
                            {req.status === 'rejected' && (
                              <div className="mt-2 bg-red-900/10 border border-red-500/15 rounded-lg px-3 py-2 flex items-center gap-2 text-xs">
                                <AlertTriangle className="w-4 h-4 text-red-400" />
                                <span className="text-red-400 font-medium">Rejected</span>
                                {req.rejectedBy && <span className="text-zinc-400">by {req.rejectedBy}</span>}
                              </div>
                            )}
                            {req.status === 'sent_to_store' && (
                              <div className="mt-2 bg-amber-900/10 border border-amber-500/15 rounded-lg px-3 py-2 flex items-center gap-2 text-xs">
                                <Send className="w-4 h-4 text-amber-400" />
                                <span className="text-amber-400 font-medium">Waiting for Store to review</span>
                              </div>
                            )}

                            {req.instructions && (
                              <div className="mt-2 text-xs text-zinc-500 bg-zinc-800/20 rounded-lg px-2.5 py-1.5">Instructions: {req.instructions}</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* ═══ MATERIAL REQUEST FORM MODAL ═══ */}
      <AnimatePresence>
        {showMRFModal && (
          <MaterialRequestForm
            employeeName={currentEmployee.name}
            employeeId={currentEmployee.id}
            onClose={() => setShowMRFModal(false)}
            onSuccess={() => {}}
          />
        )}
      </AnimatePresence>

      {/* ═══ ADD/EDIT TASK MODAL ═══ */}
      <AnimatePresence>
        {showTaskModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => { setShowTaskModal(false); setEditingTask(null); }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-white">{editingTask ? 'Edit Task' : 'New Task'}</h3>
                <button onClick={() => { setShowTaskModal(false); setEditingTask(null); }} className="p-2 hover:bg-zinc-800 rounded-lg"><X className="w-5 h-5 text-zinc-400" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Title *</label>
                  <input type="text" value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                    placeholder="Task title..." className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500/50" />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Description</label>
                  <textarea value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })}
                    placeholder="Details..." rows={3} className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500/50 resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Priority</label>
                    <select value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value as Task['priority'] })}
                      className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm outline-none">
                      <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Due Date</label>
                    <input type="date" value={taskForm.dueDate} onChange={e => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                      className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm outline-none" style={{ colorScheme: 'dark' }} />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => { setShowTaskModal(false); setEditingTask(null); }}
                    className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 text-sm">Cancel</button>
                  <button onClick={handleSaveTask}
                    className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4" /> {editingTask ? 'Update' : 'Create'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ CREATE PO MODAL ═══ */}
      <AnimatePresence>
        {showPOModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowPOModal(false)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
              
              {/* PO Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-gradient-to-r from-blue-900/20 to-cyan-900/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                    <Send className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Create Purchase Order</h2>
                    <p className="text-xs text-zinc-400">Step {poStep} of 3 · {currentEmployee.name}</p>
                  </div>
                </div>
                <button onClick={() => setShowPOModal(false)} className="p-2 hover:bg-zinc-800 rounded-lg"><X className="w-5 h-5 text-zinc-400" /></button>
              </div>

              {/* Step indicator */}
              <div className="flex items-center gap-1 px-6 py-3 bg-zinc-900/50 border-b border-zinc-800">
                {[{ n: 1, l: 'Vendor' }, { n: 2, l: 'Items' }, { n: 3, l: 'Review' }].map((s, i) => (
                  <React.Fragment key={s.n}>
                    {i > 0 && <div className={`flex-1 h-0.5 mx-1 rounded ${poStep > s.n - 1 ? 'bg-blue-500' : 'bg-zinc-700'}`} />}
                    <div className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                      poStep === s.n ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' :
                      poStep > s.n ? 'bg-emerald-600/10 text-emerald-400' : 'text-zinc-500'
                    }`}>{s.n}. {s.l}</div>
                  </React.Fragment>
                ))}
              </div>

              {/* PO Body */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

                {/* Step 1: Vendor */}
                {poStep === 1 && (
                  <div className="space-y-4">
                    <h3 className="text-white font-medium flex items-center gap-2"><Building2 className="w-4 h-4 text-blue-400" /> Vendor Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        { key: 'name', label: 'Company Name *', ph: 'Vendor company' },
                        { key: 'contact', label: 'Contact Person', ph: 'Name' },
                        { key: 'phone', label: 'Phone', ph: '+91...' },
                        { key: 'email', label: 'Email', ph: 'vendor@co.com' },
                        { key: 'gst', label: 'GSTIN', ph: '22AAAAA0000A1Z5' },
                        { key: 'address', label: 'Address', ph: 'Full address' },
                      ].map(f => (
                        <div key={f.key}>
                          <label className="text-xs text-zinc-400 mb-1 block">{f.label}</label>
                          <input type="text" value={(poVendor as Record<string, string>)[f.key]}
                            onChange={e => setPOVendor(p => ({ ...p, [f.key]: e.target.value }))}
                            placeholder={f.ph}
                            className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500/50" />
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-zinc-400 mb-1 block">Payment Terms</label>
                        <select value={poTerms.payment} onChange={e => setPOTerms(p => ({ ...p, payment: e.target.value }))}
                          className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none">
                          <option>Advance Payment</option><option>Net 15 Days</option><option>Net 30 Days</option><option>Net 45 Days</option><option>Net 60 Days</option><option>COD</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-zinc-400 mb-1 block">Expected Delivery</label>
                        <input type="date" value={poTerms.expectedDate} onChange={e => setPOTerms(p => ({ ...p, expectedDate: e.target.value }))}
                          className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none" style={{ colorScheme: 'dark' }} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Items */}
                {poStep === 2 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-white font-medium flex items-center gap-2"><Package className="w-4 h-4 text-emerald-400" /> Order Items ({poItems.length})</h3>
                      <button onClick={addPOItem} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Add Item
                      </button>
                    </div>

                    {poItems.length === 0 ? (
                      <div className="bg-zinc-800/30 border border-zinc-700/50 border-dashed rounded-xl p-12 text-center">
                        <Package className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                        <p className="text-zinc-400 text-sm">Click &ldquo;Add Item&rdquo; to add materials</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {poItems.map((item, idx) => (
                          <div key={item.id} className="bg-zinc-800/30 border border-zinc-700/50 rounded-xl p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs text-zinc-500 w-6">{idx + 1}.</span>
                              <input type="text" value={item.materialName} onChange={e => updatePOItem(item.id, 'materialName', e.target.value)}
                                placeholder="Material name *" className="flex-1 bg-transparent border-b border-zinc-700 focus:border-blue-500 px-1 py-1 text-sm text-white outline-none" />
                              <input type="text" value={item.materialCode} onChange={e => updatePOItem(item.id, 'materialCode', e.target.value)}
                                placeholder="Code" className="w-24 bg-transparent border-b border-zinc-700 focus:border-blue-500 px-1 py-1 text-sm text-zinc-400 outline-none" />
                              <button onClick={() => removePOItem(item.id)} className="p-1 hover:bg-red-500/20 rounded text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                            <div className="flex items-center gap-3 ml-6">
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-zinc-500">Qty</span>
                                <input type="number" value={item.quantity} min={1} onChange={e => updatePOItem(item.id, 'quantity', Number(e.target.value))}
                                  className="w-16 bg-zinc-800/50 border border-zinc-700 rounded px-2 py-1 text-sm text-white text-center outline-none" />
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-zinc-500">Unit</span>
                                <input type="text" value={item.unit} onChange={e => updatePOItem(item.id, 'unit', e.target.value)}
                                  className="w-14 bg-zinc-800/50 border border-zinc-700 rounded px-2 py-1 text-sm text-white text-center outline-none" />
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-zinc-500">Rate ₹</span>
                                <input type="number" value={item.unitPrice} min={0} step={0.01} onChange={e => updatePOItem(item.id, 'unitPrice', Number(e.target.value))}
                                  className="w-24 bg-zinc-800/50 border border-zinc-700 rounded px-2 py-1 text-sm text-white text-right outline-none" />
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-zinc-500">Tax</span>
                                <select value={item.taxPercent} onChange={e => updatePOItem(item.id, 'taxPercent', Number(e.target.value))}
                                  className="bg-zinc-800/50 border border-zinc-700 rounded px-1.5 py-1 text-sm text-white outline-none">
                                  <option value={0}>0%</option><option value={5}>5%</option><option value={12}>12%</option><option value={18}>18%</option><option value={28}>28%</option>
                                </select>
                              </div>
                              <span className="text-sm text-white font-medium ml-auto">
                                ₹{(item.quantity * item.unitPrice * (1 + item.taxPercent / 100)).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ))}
                        {/* Totals */}
                        <div className="bg-zinc-800/50 rounded-xl p-4 text-right space-y-1 border border-zinc-700/50">
                          <div className="text-xs text-zinc-400">Subtotal: ₹{poSubtotal.toFixed(2)}</div>
                          <div className="text-xs text-zinc-400">GST: ₹{poTax.toFixed(2)}</div>
                          <div className="text-sm font-bold text-blue-400">Total: {formatCurrency(poTotal)}</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 3: Review */}
                {poStep === 3 && (
                  <div className="space-y-4">
                    <h3 className="text-white font-medium flex items-center gap-2"><Eye className="w-4 h-4 text-indigo-400" /> Review & Submit</h3>
                    
                    {/* Summary card */}
                    <div className="bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border border-blue-500/20 rounded-xl p-4">
                      <div className="flex justify-between">
                        <div>
                          <div className="text-xs text-zinc-400">VENDOR</div>
                          <div className="text-white font-semibold">{poVendor.name}</div>
                          {poVendor.address && <div className="text-zinc-500 text-sm">{poVendor.address}</div>}
                          {poVendor.gst && <div className="text-zinc-600 text-xs">GST: {poVendor.gst}</div>}
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-400">{formatCurrency(poTotal)}</div>
                          <div className="text-xs text-zinc-400">{poItems.length} items · {poTerms.payment}</div>
                        </div>
                      </div>
                    </div>

                    {/* Items list */}
                    <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-xl overflow-hidden">
                      <div className="px-4 py-2 bg-zinc-800/50 border-b border-zinc-700 text-xs text-zinc-400 font-medium">ITEMS</div>
                      <div className="divide-y divide-zinc-800/50">
                        {poItems.map((item, idx) => (
                          <div key={item.id} className="px-4 py-2.5 flex items-center justify-between">
                            <span className="text-white text-sm"><span className="text-zinc-500 mr-2">{idx + 1}.</span>{item.materialName}</span>
                            <span className="text-zinc-400 text-sm">{item.quantity} {item.unit} × ₹{item.unitPrice} + {item.taxPercent}% = <span className="text-white font-medium">₹{(item.quantity * item.unitPrice * (1 + item.taxPercent / 100)).toFixed(2)}</span></span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block">Notes (optional)</label>
                      <textarea value={poTerms.notes} onChange={e => setPOTerms(p => ({ ...p, notes: e.target.value }))}
                        rows={2} placeholder="Any special instructions..."
                        className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none resize-none" />
                    </div>

                    {/* Approval notice */}
                    <div className="bg-amber-900/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-amber-400 text-sm font-medium">MD Approval Required</div>
                        <div className="text-zinc-400 text-xs">This PO will be sent to MD for approval. You can track its status in &ldquo;My POs&rdquo;.</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* PO Footer */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800">
                <div className="text-xs text-zinc-500">Step {poStep} of 3</div>
                <div className="flex items-center gap-3">
                  {poStep > 1 && (
                    <button onClick={() => setPOStep(poStep - 1)} className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-zinc-300 text-sm">Back</button>
                  )}
                  {poStep < 3 ? (
                    <button onClick={() => {
                      if (poStep === 1 && !poVendor.name.trim()) return;
                      if (poStep === 2 && poItems.length === 0) return;
                      setPOStep(poStep + 1);
                    }} disabled={(poStep === 1 && !poVendor.name.trim()) || (poStep === 2 && poItems.length === 0)}
                      className={`px-5 py-2.5 rounded-xl text-sm font-medium ${
                        (poStep === 1 && !poVendor.name.trim()) || (poStep === 2 && poItems.length === 0)
                          ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}>Next</button>
                  ) : (
                    <button onClick={handleSubmitPO} disabled={savingPO}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl text-white text-sm font-medium flex items-center gap-2">
                      <Send className="w-4 h-4" /> {savingPO ? 'Creating...' : 'Submit for Approval'}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ==========================================
// TASK LIST SUB-COMPONENT
// ==========================================
function TaskList({ tasks, onStatusChange, onEdit, onDelete }: {
  tasks: Task[];
  onStatusChange: (task: Task, status: Task['status']) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}) {
  const [filter, setFilter] = useState<'all' | Task['status']>('all');
  const filteredTasks = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {(['all', 'pending', 'in_progress', 'completed'] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === s ? 'bg-blue-600 text-white' : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50'
            }`}>
            {s.replace('_', ' ')} ({s === 'all' ? tasks.length : tasks.filter(t => t.status === s).length})
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12 text-zinc-500"><Briefcase className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>No tasks found</p></div>
        ) : filteredTasks.map((task, i) => (
          <motion.div key={task.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
            className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-all">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h3 className="text-white font-semibold">{task.title}</h3>
                {task.description && <p className="text-sm text-zinc-400 mt-0.5">{task.description}</p>}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => onEdit(task)} className="p-2 hover:bg-zinc-800 rounded-lg"><Edit className="w-4 h-4 text-zinc-400" /></button>
                <button onClick={() => onDelete(task)} className="p-2 hover:bg-zinc-800 rounded-lg"><Trash2 className="w-4 h-4 text-zinc-400 hover:text-red-400" /></button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${
                  task.priority === 'urgent' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                  task.priority === 'high' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                  task.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                  'bg-blue-500/10 text-blue-400 border-blue-500/20'
                }`}>{task.priority}</span>
                {task.dueDate && <span className="text-xs text-zinc-400 flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(task.dueDate).toLocaleDateString()}</span>}
              </div>
              <select value={task.status} onChange={e => onStatusChange(task, e.target.value as Task['status'])}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                  task.status === 'completed' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                  task.status === 'in_progress' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                  'bg-orange-500/10 text-orange-400 border-orange-500/20'
                }`} style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
                <option value="pending">Pending</option><option value="in_progress">In Progress</option><option value="completed">Completed</option>
              </select>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
