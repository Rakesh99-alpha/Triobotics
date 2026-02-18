'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingCart, 
  Package, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  FileText,
  IndianRupee,
  Building2,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Box,
  RefreshCw,
  Layers,
  ClipboardList,
  X
} from 'lucide-react';
import { db } from '@/lib/firebase/client';
import { 
  collection, 
  onSnapshot
} from 'firebase/firestore';
import { 
  PurchaseOrder, 
  COLLECTIONS,
  POStatus
} from '@/types/purchase';
import {
  AreaChart, Area, PieChart as RechartsPie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

// Firebase collection for materials
const FB_MATERIALS = 'inventory_materials';
const FB_SUPPLIERS = 'inventory_suppliers';

// Material interface
interface MaterialItem {
  id: string;
  code: string;
  name: string;
  category: string;
  supplier_id?: string;
  supplier_name: string;
  current_stock: number;
  min_stock: number;
  purchase_price: number;
  unit: string;
}

// Supplier interface
interface SupplierItem {
  id: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
  gst: string;
  address: string;
  city: string;
}

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 }
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.1 } }
};

// Chart colors
const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899'];

// ==========================================
// MD PURCHASE OVERVIEW COMPONENT
// ==========================================

export default function MDPurchaseOverview() {
  // State for data
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [loading, setLoading] = useState(true);

  // UI State
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<POStatus | 'all'>('all');

  // ==========================================
  // FIREBASE LISTENERS
  // ==========================================

  useEffect(() => {
    // Listen to Purchase Orders
    const unsubPO = onSnapshot(
      collection(db, COLLECTIONS.PURCHASE_ORDERS),
      (snapshot) => {
        const orders: PurchaseOrder[] = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        })) as PurchaseOrder[];
        orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setPurchaseOrders(orders);
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to purchase orders:', error);
        setLoading(false);
      }
    );

    // Listen to Materials
    const unsubMaterials = onSnapshot(
      collection(db, FB_MATERIALS),
      (snapshot) => {
        const items: MaterialItem[] = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        })) as MaterialItem[];
        setMaterials(items);
      }
    );

    // Listen to Suppliers
    const unsubSuppliers = onSnapshot(
      collection(db, FB_SUPPLIERS),
      (snapshot) => {
        const sups: SupplierItem[] = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        })) as SupplierItem[];
        setSuppliers(sups);
      }
    );

    return () => {
      unsubPO();
      unsubMaterials();
      unsubSuppliers();
    };
  }, []);

  // ==========================================
  // COMPUTED VALUES & STATISTICS
  // ==========================================

  // Filter orders based on time
  const filteredOrders = useMemo(() => {
    let filtered = purchaseOrders;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    if (timeFilter === 'today') {
      filtered = filtered.filter(po => new Date(po.createdAt) >= today);
    } else if (timeFilter === 'week') {
      filtered = filtered.filter(po => new Date(po.createdAt) >= weekAgo);
    } else if (timeFilter === 'month') {
      filtered = filtered.filter(po => new Date(po.createdAt) >= monthAgo);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(po => po.status === statusFilter);
    }

    return filtered;
  }, [purchaseOrders, timeFilter, statusFilter]);

  // Low stock items that need purchase
  const lowStockItems = useMemo(() => {
    return materials.filter(item => (item.current_stock || 0) <= (item.min_stock || 0));
  }, [materials]);

  // Critical items (zero stock)
  const criticalItems = useMemo(() => {
    return materials.filter(item => (item.current_stock || 0) === 0);
  }, [materials]);

  // Statistics
  const stats = useMemo(() => {
    const total = filteredOrders.length;
    const pending = filteredOrders.filter(po => po.status === 'pending_md_approval').length;
    const approved = filteredOrders.filter(po => po.status === 'approved').length;
    const rejected = filteredOrders.filter(po => po.status === 'rejected').length;
    const received = filteredOrders.filter(po => po.status === 'received').length;
    const draft = filteredOrders.filter(po => po.status === 'draft').length;

    const totalValue = filteredOrders.reduce((sum, po) => sum + (po.totalAmount || 0), 0);
    const approvedValue = filteredOrders
      .filter(po => po.status === 'approved' || po.status === 'received')
      .reduce((sum, po) => sum + (po.totalAmount || 0), 0);
    const pendingValue = filteredOrders
      .filter(po => po.status === 'pending_md_approval')
      .reduce((sum, po) => sum + (po.totalAmount || 0), 0);

    // Calculate month-over-month change
    const lastMonthOrders = purchaseOrders.filter(po => {
      const date = new Date(po.createdAt);
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return date >= lastMonth && date < thisMonth;
    });

    const thisMonthOrders = purchaseOrders.filter(po => {
      const date = new Date(po.createdAt);
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return date >= thisMonth;
    });

    const lastMonthValue = lastMonthOrders.reduce((sum, po) => sum + (po.totalAmount || 0), 0);
    const thisMonthValue = thisMonthOrders.reduce((sum, po) => sum + (po.totalAmount || 0), 0);
    const valueChange = lastMonthValue > 0 ? ((thisMonthValue - lastMonthValue) / lastMonthValue * 100).toFixed(1) : 0;

    return {
      total, pending, approved, rejected, received, draft,
      totalValue, approvedValue, pendingValue,
      valueChange: Number(valueChange),
      lowStock: lowStockItems.length,
      critical: criticalItems.length,
      activeSuppliers: new Set(filteredOrders.map(po => po.vendorDetails?.id)).size
    };
  }, [filteredOrders, purchaseOrders, lowStockItems, criticalItems]);

  // Chart data - PO by status
  const statusChartData = useMemo(() => [
    { name: 'Pending', value: stats.pending, color: '#f59e0b' },
    { name: 'Approved', value: stats.approved, color: '#10b981' },
    { name: 'Rejected', value: stats.rejected, color: '#ef4444' },
    { name: 'Received', value: stats.received, color: '#06b6d4' },
    { name: 'Draft', value: stats.draft, color: '#6b7280' }
  ].filter(d => d.value > 0), [stats]);

  // Chart data - Daily PO trend (last 7 days)
  const trendChartData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStr = date.toLocaleDateString('en-US', { weekday: 'short' });
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      
      const dayOrders = purchaseOrders.filter(po => {
        const poDate = new Date(po.createdAt);
        return poDate >= dayStart && poDate < dayEnd;
      });

      days.push({
        day: dayStr,
        count: dayOrders.length,
        value: dayOrders.reduce((sum, po) => sum + (po.totalAmount || 0), 0) / 1000
      });
    }
    return days;
  }, [purchaseOrders]);

  // Top vendors by value
  const topVendors = useMemo(() => {
    const vendorMap = new Map<string, { name: string; value: number; count: number }>();
    
    filteredOrders.forEach(po => {
      const vendorId = po.vendorDetails?.id || 'unknown';
      const vendorName = po.vendorDetails?.name || 'Unknown Vendor';
      const existing = vendorMap.get(vendorId) || { name: vendorName, value: 0, count: 0 };
      vendorMap.set(vendorId, {
        name: vendorName,
        value: existing.value + (po.totalAmount || 0),
        count: existing.count + 1
      });
    });

    return Array.from(vendorMap.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filteredOrders]);

  // Category-wise purchase breakdown
  const categoryBreakdown = useMemo(() => {
    const categoryMap = new Map<string, number>();
    
    filteredOrders.forEach(po => {
      po.items?.forEach(item => {
        // Try to find material category
        const material = materials.find(m => m.name === item.itemName || m.code === item.itemCode);
        const category = material?.category || 'Other';
        categoryMap.set(category, (categoryMap.get(category) || 0) + item.totalPrice);
      });
    });

    return Array.from(categoryMap.entries())
      .map(([name, value], index) => ({
        name,
        value,
        color: COLORS[index % COLORS.length]
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredOrders, materials]);

  // ==========================================
  // HANDLE PO DETAIL VIEW
  // ==========================================

  const handleViewPO = (po: PurchaseOrder) => {
    setSelectedPO(po);
    setShowDetailModal(true);
  };

  // ==========================================
  // FORMAT HELPERS
  // ==========================================

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusConfig = (status: POStatus) => {
    const configs: Record<POStatus, { bg: string; text: string; border: string; icon: React.ElementType; label: string }> = {
      'draft': { bg: 'bg-zinc-500/20', text: 'text-zinc-400', border: 'border-zinc-500/30', icon: FileText, label: 'Draft' },
      'pending_md_approval': { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30', icon: Clock, label: 'Pending Approval' },
      'approved': { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30', icon: CheckCircle, label: 'Approved' },
      'rejected': { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', icon: XCircle, label: 'Rejected' },
      'partially_received': { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30', icon: Package, label: 'Partial' },
      'received': { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30', icon: CheckCircle, label: 'Received' },
      'cancelled': { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30', icon: XCircle, label: 'Cancelled' }
    };
    return configs[status] || configs['draft'];
  };

  // ==========================================
  // RENDER
  // ==========================================

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020202] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <RefreshCw className="w-8 h-8 text-indigo-400" />
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={staggerContainer}
      className="space-y-6"
    >
      {/* ════════════════════ HEADER ════════════════════ */}
      <motion.div variants={fadeInUp} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            Purchase Overview
          </h1>
          <p className="text-zinc-500 mt-1 text-sm">Complete overview of all purchase activities</p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/10">
            {(['today', 'week', 'month', 'all'] as const).map(period => (
              <button
                key={period}
                onClick={() => setTimeFilter(period)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  timeFilter === period
                    ? 'bg-indigo-500 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {period === 'all' ? 'All Time' : period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as POStatus | 'all')}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            <option value="all">All Status</option>
            <option value="pending_md_approval">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="received">Received</option>
          </select>
        </div>
      </motion.div>

      {/* ════════════════════ KEY METRICS CARDS ════════════════════ */}
      <motion.div variants={fadeInUp}>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {/* Total POs */}
          <div className="rounded-2xl bg-gradient-to-br from-indigo-900/30 to-indigo-800/10 border border-indigo-500/20 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-indigo-400" />
              </div>
              <span className="text-xs text-zinc-500">{filteredOrders.length} orders</span>
            </div>
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-xs text-zinc-500 mt-1">Total POs</div>
          </div>

          {/* Pending Approval */}
          <div className="rounded-2xl bg-gradient-to-br from-amber-900/30 to-amber-800/10 border border-amber-500/20 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              {stats.pending > 0 && (
                <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              )}
            </div>
            <div className="text-2xl font-bold text-amber-400">{stats.pending}</div>
            <div className="text-xs text-amber-500/70 mt-1">Awaiting Approval</div>
          </div>

          {/* Total Value */}
          <div className="rounded-2xl bg-gradient-to-br from-emerald-900/30 to-emerald-800/10 border border-emerald-500/20 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <IndianRupee className="w-5 h-5 text-emerald-400" />
              </div>
              <span className={`flex items-center gap-1 text-xs ${stats.valueChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {stats.valueChange >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {Math.abs(stats.valueChange)}%
              </span>
            </div>
            <div className="text-2xl font-bold text-emerald-400">{formatCurrency(stats.totalValue)}</div>
            <div className="text-xs text-emerald-500/70 mt-1">Total Value</div>
          </div>

          {/* Approved Value */}
          <div className="rounded-2xl bg-gradient-to-br from-cyan-900/30 to-cyan-800/10 border border-cyan-500/20 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div className="text-2xl font-bold text-cyan-400">{formatCurrency(stats.approvedValue)}</div>
            <div className="text-xs text-cyan-500/70 mt-1">Approved Value</div>
          </div>

          {/* Low Stock Alert */}
          <div className="rounded-2xl bg-gradient-to-br from-orange-900/30 to-orange-800/10 border border-orange-500/20 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-orange-400" />
              </div>
              {stats.critical > 0 && (
                <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-[10px] rounded-full">
                  {stats.critical} critical
                </span>
              )}
            </div>
            <div className="text-2xl font-bold text-orange-400">{stats.lowStock}</div>
            <div className="text-xs text-orange-500/70 mt-1">Low Stock Items</div>
          </div>

          {/* Active Suppliers */}
          <div className="rounded-2xl bg-gradient-to-br from-purple-900/30 to-purple-800/10 border border-purple-500/20 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-purple-400" />
              </div>
            </div>
            <div className="text-2xl font-bold text-purple-400">{stats.activeSuppliers}</div>
            <div className="text-xs text-purple-500/70 mt-1">Active Vendors</div>
          </div>
        </div>
      </motion.div>

      {/* ════════════════════ CHARTS ROW ════════════════════ */}
      <motion.div variants={fadeInUp} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PO Trend Chart */}
        <div className="lg:col-span-2 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-medium text-white">Purchase Order Trend</h3>
              <p className="text-xs text-zinc-500 mt-0.5">Last 7 days activity</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-indigo-500 rounded-full" />
                <span className="text-zinc-400">Count</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                <span className="text-zinc-400">Value (K)</span>
              </span>
            </div>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendChartData}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                <XAxis dataKey="day" stroke="#6b7280" fontSize={11} />
                <YAxis stroke="#6b7280" fontSize={11} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Area type="monotone" dataKey="count" stroke="#6366f1" fillOpacity={1} fill="url(#colorCount)" strokeWidth={2} />
                <Area type="monotone" dataKey="value" stroke="#10b981" fillOpacity={1} fill="url(#colorValue)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] p-5">
          <div className="mb-4">
            <h3 className="text-sm font-medium text-white">Status Distribution</h3>
            <p className="text-xs text-zinc-500 mt-0.5">PO breakdown by status</p>
          </div>
          <div className="h-[200px]">
            {statusChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '11px' }}
                    formatter={(value) => <span className="text-zinc-400">{value}</span>}
                  />
                </RechartsPie>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-500 text-sm">
                No data available
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ════════════════════ LOW STOCK ALERT + TOP VENDORS ════════════════════ */}
      <motion.div variants={fadeInUp} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Items Needing Purchase (Low Stock) */}
        <div className="rounded-2xl bg-gradient-to-br from-orange-900/10 to-red-900/10 border border-orange-500/20 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-400" />
                Items Needing Purchase
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">Stock below minimum level</p>
            </div>
            <span className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded-lg">
              {lowStockItems.length} items
            </span>
          </div>
          <div className="p-4 space-y-2 max-h-[280px] overflow-y-auto custom-scrollbar">
            {lowStockItems.slice(0, 10).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    (item.current_stock || 0) === 0 ? 'bg-red-500 animate-pulse' : 'bg-orange-500'
                  }`} />
                  <div>
                    <div className="text-sm font-medium text-white">{item.name}</div>
                    <div className="text-xs text-zinc-500">{item.code} • {item.supplier_name || 'No supplier'}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-medium ${
                    (item.current_stock || 0) === 0 ? 'text-red-400' : 'text-orange-400'
                  }`}>
                    {item.current_stock || 0} {item.unit}
                  </div>
                  <div className="text-xs text-zinc-500">Min: {item.min_stock} {item.unit}</div>
                </div>
              </div>
            ))}
            {lowStockItems.length === 0 && (
              <div className="text-center py-8 text-zinc-500">
                <CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">All items are well stocked!</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Vendors */}
        <div className="rounded-2xl bg-gradient-to-br from-purple-900/10 to-indigo-900/10 border border-purple-500/20 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-purple-400" />
                Top Vendors by Value
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">Based on purchase order amounts</p>
            </div>
          </div>
          <div className="p-4 space-y-2">
            {topVendors.map((vendor, index) => (
              <div
                key={vendor.name}
                className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400 text-sm font-bold">
                    #{index + 1}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">{vendor.name}</div>
                    <div className="text-xs text-zinc-500">{vendor.count} orders</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-purple-400">{formatCurrency(vendor.value)}</div>
                </div>
              </div>
            ))}
            {topVendors.length === 0 && (
              <div className="text-center py-8 text-zinc-500">
                <Building2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No vendor data available</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ════════════════════ RECENT PURCHASE ORDERS LIST ════════════════════ */}
      <motion.div variants={fadeInUp}>
        <div className="rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-indigo-400" />
                Recent Purchase Orders
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">Click to view details</p>
            </div>
            <span className="text-xs text-zinc-500">{filteredOrders.length} total</span>
          </div>
          
          {/* Table Header */}
          <div className="px-5 py-3 bg-white/[0.02] border-b border-white/[0.06] grid grid-cols-12 gap-4 text-xs font-medium text-zinc-500">
            <div className="col-span-2">PO Number</div>
            <div className="col-span-3">Vendor</div>
            <div className="col-span-2">Items</div>
            <div className="col-span-2 text-right">Amount</div>
            <div className="col-span-2 text-center">Status</div>
            <div className="col-span-1 text-center">Action</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-white/[0.04] max-h-[400px] overflow-y-auto custom-scrollbar">
            {filteredOrders.slice(0, 20).map((po) => {
              const statusConfig = getStatusConfig(po.status);
              const StatusIcon = statusConfig.icon;
              
              return (
                <div
                  key={po.id}
                  className="px-5 py-4 grid grid-cols-12 gap-4 items-center hover:bg-white/[0.02] transition-colors"
                >
                  <div className="col-span-2">
                    <div className="font-medium text-white text-sm">{po.poNumber}</div>
                    <div className="text-xs text-zinc-500">{formatDate(po.createdAt)}</div>
                  </div>
                  <div className="col-span-3">
                    <div className="text-sm text-white">{po.vendorDetails?.name || 'Unknown'}</div>
                    <div className="text-xs text-zinc-500">{po.vendorDetails?.city || ''}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-sm text-zinc-300">{po.items?.length || 0} items</div>
                  </div>
                  <div className="col-span-2 text-right">
                    <div className="text-sm font-medium text-emerald-400">{formatCurrency(po.totalAmount || 0)}</div>
                    {po.requiresMDApproval && (
                      <div className="text-[10px] text-amber-400/70">Requires MD Approval</div>
                    )}
                  </div>
                  <div className="col-span-2 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border} border`}>
                      <StatusIcon className="w-3 h-3" />
                      {statusConfig.label}
                    </span>
                  </div>
                  <div className="col-span-1 text-center">
                    <button
                      onClick={() => handleViewPO(po)}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
            {filteredOrders.length === 0 && (
              <div className="text-center py-12 text-zinc-500">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No purchase orders found</p>
                <p className="text-xs mt-1">Adjust filters or create a new PO</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ════════════════════ CATEGORY BREAKDOWN ════════════════════ */}
      {categoryBreakdown.length > 0 && (
        <motion.div variants={fadeInUp}>
          <div className="rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] p-5">
            <div className="mb-4">
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Purchase by Category
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">Material category breakdown</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {categoryBreakdown.map((cat) => (
                <div
                  key={cat.name}
                  className="p-4 rounded-xl bg-white/5 border border-white/10 text-center"
                >
                  <div 
                    className="w-8 h-8 rounded-lg mx-auto mb-2 flex items-center justify-center"
                    style={{ backgroundColor: `${cat.color}20` }}
                  >
                    <Box className="w-4 h-4" style={{ color: cat.color }} />
                  </div>
                  <div className="text-sm font-medium text-white">{formatCurrency(cat.value)}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">{cat.name}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* ════════════════════ PO DETAIL MODAL ════════════════════ */}
      <AnimatePresence>
        {showDetailModal && selectedPO && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowDetailModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 rounded-2xl border border-white/10 w-full max-w-3xl max-h-[85vh] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">{selectedPO.poNumber}</h3>
                  <p className="text-xs text-zinc-500">Created: {formatDate(selectedPO.createdAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${getStatusConfig(selectedPO.status).bg} ${getStatusConfig(selectedPO.status).text}`}>
                    {getStatusConfig(selectedPO.status).label}
                  </span>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="p-2 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
                {/* Vendor Info */}
                <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-400" />
                    Vendor Details
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-zinc-500">Name:</span>
                      <span className="text-white ml-2">{selectedPO.vendorDetails?.name}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Contact:</span>
                      <span className="text-white ml-2">{selectedPO.vendorDetails?.contact}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Phone:</span>
                      <span className="text-white ml-2">{selectedPO.vendorDetails?.phone}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Email:</span>
                      <span className="text-white ml-2">{selectedPO.vendorDetails?.email}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">GSTIN:</span>
                      <span className="text-white ml-2">{selectedPO.vendorDetails?.gstin || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">City:</span>
                      <span className="text-white ml-2">{selectedPO.vendorDetails?.city}</span>
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4 text-cyan-400" />
                    Order Items
                  </h4>
                  <div className="rounded-xl border border-white/10 overflow-hidden">
                    <div className="bg-white/5 px-4 py-2 grid grid-cols-12 gap-4 text-xs font-medium text-zinc-500">
                      <div className="col-span-5">Item</div>
                      <div className="col-span-2 text-right">Qty</div>
                      <div className="col-span-2 text-right">Unit Price</div>
                      <div className="col-span-3 text-right">Total</div>
                    </div>
                    <div className="divide-y divide-white/[0.04]">
                      {selectedPO.items?.map((item, index) => (
                        <div key={index} className="px-4 py-3 grid grid-cols-12 gap-4 text-sm">
                          <div className="col-span-5">
                            <div className="text-white">{item.itemName}</div>
                            <div className="text-xs text-zinc-500">{item.itemCode}</div>
                          </div>
                          <div className="col-span-2 text-right text-zinc-300">{item.quantity} {item.unit}</div>
                          <div className="col-span-2 text-right text-zinc-300">{formatCurrency(item.unitPrice)}</div>
                          <div className="col-span-3 text-right text-emerald-400 font-medium">{formatCurrency(item.totalPrice)}</div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-white/5 px-4 py-3 flex justify-between items-center">
                      <span className="text-sm font-medium text-zinc-400">Total Amount</span>
                      <span className="text-lg font-bold text-emerald-400">{formatCurrency(selectedPO.totalAmount || 0)}</span>
                    </div>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {selectedPO.expectedDelivery && (
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <span className="text-zinc-500 text-xs">Expected Delivery</span>
                      <div className="text-white mt-1">{formatDate(selectedPO.expectedDelivery)}</div>
                    </div>
                  )}
                  {selectedPO.createdBy && (
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <span className="text-zinc-500 text-xs">Created By</span>
                      <div className="text-white mt-1">{selectedPO.createdBy}</div>
                    </div>
                  )}
                  {selectedPO.approvedBy && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                      <span className="text-emerald-500 text-xs">Approved By</span>
                      <div className="text-emerald-400 mt-1">{selectedPO.approvedBy}</div>
                    </div>
                  )}
                  {selectedPO.rejectedReason && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 col-span-2">
                      <span className="text-red-500 text-xs">Rejection Reason</span>
                      <div className="text-red-400 mt-1">{selectedPO.rejectedReason}</div>
                    </div>
                  )}
                </div>

                {selectedPO.notes && (
                  <div className="mt-4 p-3 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-zinc-500 text-xs">Notes</span>
                    <div className="text-zinc-300 mt-1 text-sm">{selectedPO.notes}</div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Scrollbar Styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </motion.div>
  );
}
