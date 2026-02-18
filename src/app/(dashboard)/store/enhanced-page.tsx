/**
 * Enhanced Store Management Page
 * Complete inventory system with analytics, QC, batch tracking, and alerts
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Package,
  FileCheck,
  Settings,
  Download,
  BarChart3,
  Bell,
  Boxes,
  ArrowRightLeft
} from 'lucide-react';
import { db } from '@/lib/firebase/client';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

// Enhanced components
import {
  QuickStats,
  CategoryBreakdown,
  TopIssuedMaterials,
  MonthlyTrendChart,
  StockHealth
} from '@/components/store/AnalyticsDashboard';
import {
  QuickScanButton,
  LabelPrintDialog
} from '@/components/store/BarcodeComponents';
import {
  QCInspectionCard,
  VendorReturnCard,
  StockAlertCard,
  AlertSummary
} from '@/components/store/QualityAndAlerts';

// Services
import {
  subscribeToAlerts,
  subscribeToQCInspections,
  subscribeToVendorReturns,
  subscribeToTransfers,
  calculateInventoryAnalytics,
  acknowledgeAlert,
  resolveAlert
} from '@/lib/services/storeEnhanced';

// Types
import type {
  StockAlert,
  QualityInspection,
  VendorReturn,
  StockTransfer,
  InventoryAnalytics,
  BarcodeData,
  LabelItem
} from '@/types/store-enhanced';

// ==========================================
// MAIN TAB OPTIONS
// ==========================================

type MainTab = 
  | 'dashboard' 
  | 'inventory' 
  | 'analytics' 
  | 'quality' 
  | 'alerts' 
  | 'transfers' 
  | 'batches';

interface MaterialData {
  id: string;
  name?: string;
  category?: string;
  current_stock: number;
  purchase_price: number;
  min_stock: number;
  [key: string]: unknown;
}

interface IssueData {
  id: string;
  material?: string;
  quantity?: number;
  [key: string]: unknown;
}

// ==========================================
// ENHANCED STORE PAGE
// ==========================================

export default function EnhancedStorePage() {
  // Tab State
  const [activeTab, setActiveTab] = useState<MainTab>('dashboard');

  // Data State
  const [materials, setMaterials] = useState<MaterialData[]>([]);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [qcInspections, setQCInspections] = useState<QualityInspection[]>([]);
  const [vendorReturns, setVendorReturns] = useState<VendorReturn[]>([]);
  const [stockTransfers, setStockTransfers] = useState<StockTransfer[]>([]);
  const [materialIssues, setMaterialIssues] = useState<IssueData[]>([]);
  const [analytics, setAnalytics] = useState<Partial<InventoryAnalytics>>({});

  // UI State
  const [showPrintLabels, setShowPrintLabels] = useState(false);
  const [selectedLabels] = useState<LabelItem[]>([]);

  // User State
  const [userName] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        try {
          const user = JSON.parse(stored);
          return user.displayName || user.name || 'Store Manager';
        } catch {
          return 'Store Manager';
        }
      }
    }
    return 'Store Manager';
  });
  const [currentTime, setCurrentTime] = useState(new Date());

  // ==========================================
  // TIME UPDATE
  // ==========================================

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ==========================================
  // FIREBASE LISTENERS
  // ==========================================

  useEffect(() => {
    // Materials
    const unsubMaterials = onSnapshot(
      query(collection(db, 'inventory_materials')),
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          name: '',
          category: '',
          current_stock: 0,
          purchase_price: 0,
          min_stock: 0,
          ...doc.data()
        })) as MaterialData[];
        items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setMaterials(items);
        
        // Calculate analytics with proper single parameter
        const analyticsData = calculateInventoryAnalytics(items);
        setAnalytics(analyticsData);
      },
      (error) => {
        console.error('Error listening to materials:', error);
      }
    );

    // Material Issues
    const unsubIssues = onSnapshot(
      query(collection(db, 'inventory_issue_records'), orderBy('issued_at', 'desc')),
      (snapshot) => {
        const issues = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as IssueData[];
        setMaterialIssues(issues);
      }
    );

    // Stock Alerts
    const unsubAlerts = subscribeToAlerts(false, setAlerts);

    // QC Inspections
    const unsubQC = subscribeToQCInspections(setQCInspections);

    // Vendor Returns
    const unsubReturns = subscribeToVendorReturns(setVendorReturns);

    // Stock Transfers
    const unsubTransfers = subscribeToTransfers('all', setStockTransfers);

    return () => {
      unsubMaterials();
      unsubIssues();
      unsubAlerts();
      unsubQC();
      unsubReturns();
      unsubTransfers();
    };
  }, [materialIssues]);

  // ==========================================
  // HANDLERS
  // ==========================================

  const handleQRScan = (data: BarcodeData) => {
    console.log('Scanned:', data);
    // Handle scanned data - navigate to material detail, etc.
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    const userId = 'current_user'; // Get from auth
    await acknowledgeAlert(alertId, userId);
  };

  const handleResolveAlert = async (alertId: string) => {
    await resolveAlert(alertId);
  };



  // ==========================================
  // STATS
  // ==========================================

  const stats = {
    totalItems: materials.length,
    lowStockItems: materials.filter(m => m.current_stock <= m.min_stock).length,
    outOfStock: materials.filter(m => m.current_stock === 0).length,
    activeAlerts: alerts.filter(a => !a.resolved).length,
    pendingQC: qcInspections.filter(q => q.status === 'pending').length,
    activeTransfers: stockTransfers.filter(t => t.status === 'pending' || t.status === 'approved').length
  };

  // ==========================================
  // GREETING
  // ==========================================

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour >= 5 && hour < 12) return { text: 'Good Morning', emoji: '☀️' };
    if (hour >= 12 && hour < 17) return { text: 'Good Afternoon', emoji: '🌤️' };
    if (hour >= 17 && hour < 21) return { text: 'Good Evening', emoji: '🌅' };
    return { text: 'Good Night', emoji: '🌙' };
  };

  const greeting = getGreeting();

  // ==========================================
  // RENDER TABS
  // ==========================================

  const tabs = [
    { id: 'dashboard' as MainTab, label: 'Dashboard', icon: LayoutDashboard, count: null },
    { id: 'inventory' as MainTab, label: 'Inventory', icon: Package, count: stats.totalItems },
    { id: 'analytics' as MainTab, label: 'Analytics', icon: BarChart3, count: null },
    { id: 'quality' as MainTab, label: 'Quality', icon: FileCheck, count: stats.pendingQC },
    { id: 'alerts' as MainTab, label: 'Alerts', icon: Bell, count: stats.activeAlerts },
    { id: 'transfers' as MainTab, label: 'Transfers', icon: ArrowRightLeft, count: stats.activeTransfers },
    { id: 'batches' as MainTab, label: 'Batches', icon: Boxes, count: null }
  ];

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.05),transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      {/* Main Content */}
      <div className="relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-b border-white/10 backdrop-blur-xl bg-zinc-900/50 sticky top-0 z-40"
        >
          <div className="max-w-[1800px] mx-auto px-8 py-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <motion.div
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <span className="text-3xl">{greeting.emoji}</span>
                  </motion.div>
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                      {greeting.text}, {userName}!
                    </h1>
                    <p className="text-sm text-zinc-400">
                      {currentTime.toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })} · {currentTime.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-3">
                <QuickScanButton onScan={handleQRScan} />
                <button className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 hover:border-white/20 transition-all">
                  <Download className="w-4 h-4" />
                  Export
                </button>
                <button className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 hover:border-white/20 transition-all">
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all relative ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/20'
                      : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {tab.count !== null && tab.count > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-white/20 text-xs font-bold">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Content Area */}
        <div className="max-w-[1800px] mx-auto px-8 py-8">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <DashboardView
                analytics={analytics}
                stats={stats}
                alerts={alerts}
                materials={materials}
                onAcknowledgeAlert={handleAcknowledgeAlert}
                onResolveAlert={handleResolveAlert}
              />
            )}
            {activeTab === 'analytics' && (
              <AnalyticsView
                analytics={analytics}
                materials={materials}
                issues={materialIssues}
              />
            )}
            {activeTab === 'quality' && (
              <QualityView
                inspections={qcInspections}
                vendorReturns={vendorReturns}
              />
            )}
            {activeTab === 'alerts' && (
              <AlertsView
                alerts={alerts}
                onAcknowledge={handleAcknowledgeAlert}
                onResolve={handleResolveAlert}
              />
            )}
            {activeTab === 'transfers' && (
              <TransfersView transfers={stockTransfers} />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showPrintLabels && (
          <LabelPrintDialog
            items={selectedLabels}
            onClose={() => setShowPrintLabels(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ==========================================
// DASHBOARD VIEW
// ==========================================

interface DashboardViewProps {
  analytics: Partial<InventoryAnalytics>;
  stats: {
    totalItems: number;
    lowStockItems: number;
    outOfStock: number;
    activeAlerts: number;
    pendingQC: number;
  };
  alerts: StockAlert[];
  materials: MaterialData[];
  onAcknowledgeAlert: (id: string) => void;
  onResolveAlert: (id: string) => void;
}

function DashboardView({
  analytics,
  stats,
  alerts,
  onAcknowledgeAlert,
  onResolveAlert
}: DashboardViewProps) {
  const unresolvedAlerts = alerts.filter(a => !a.resolved);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Quick Stats */}
      <QuickStats analytics={analytics} />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stock Health */}
        <StockHealth
          totalItems={stats.totalItems}
          lowStock={stats.lowStockItems}
          outOfStock={stats.outOfStock}
          expiringSoon={0}
        />

        {/* Alert Summary */}
        <AlertSummary alerts={alerts} />

        {/* Category Breakdown */}
        {analytics.categoryBreakdown && (
          <CategoryBreakdown data={analytics.categoryBreakdown} />
        )}
      </div>

      {/* Recent Alerts */}
      {unresolvedAlerts.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-white mb-4">Recent Alerts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {unresolvedAlerts.slice(0, 4).map((alert) => (
              <StockAlertCard
                key={alert.id}
                alert={alert}
                onAcknowledge={() => onAcknowledgeAlert(alert.id)}
                onResolve={() => onResolveAlert(alert.id)}
              />
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ==========================================
// ANALYTICS VIEW
// ==========================================

interface AnalyticsViewProps {
  analytics: Partial<InventoryAnalytics>;
  materials: MaterialData[];
  issues: IssueData[];
}

function AnalyticsView({ analytics, materials, issues }: AnalyticsViewProps) {
  // Calculate top issued materials
  const topIssued = [...materials]
    .map(m => {
      const materialIssues = issues.filter(i => i.material_id === m.id);
      const totalIssued = materialIssues.reduce((sum, i) => sum + (i.quantity || 0), 0);
      return {
        materialId: m.id,
        materialName: m.name || 'Unknown Material',
        totalIssued,
        unit: (m.unit || 'units') as string,
        frequency: materialIssues.length,
        value: totalIssued * (m.purchase_price || 0)
      };
    })
    .filter(m => m.totalIssued > 0)
    .sort((a, b) => b.totalIssued - a.totalIssued)
    .slice(0, 10);

  // Mock monthly trends
  const monthlyTrends = [
    { month: 'Jan', purchases: 45, issues: 38, value: 125000, stockValue: 450000 },
    { month: 'Feb', purchases: 52, issues: 42, value: 142000, stockValue: 468000 },
    { month: 'Mar', purchases: 48, issues: 45, value: 138000, stockValue: 461000 },
    { month: 'Apr', purchases: 55, issues: 49, value: 156000, stockValue: 467000 },
    { month: 'May', purchases: 60, issues: 52, value: 168000, stockValue: 475000 },
    { month: 'Jun', purchases: 58, issues: 55, value: 162000, stockValue: 478000 }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {analytics.categoryBreakdown && (
          <CategoryBreakdown data={analytics.categoryBreakdown} />
        )}
        <TopIssuedMaterials data={topIssued} />
      </div>

      <MonthlyTrendChart data={monthlyTrends} />
    </motion.div>
  );
}

// ==========================================
// QUALITY VIEW
// ==========================================

interface QualityViewProps {
  inspections: QualityInspection[];
  vendorReturns: VendorReturn[];
}

function QualityView({ inspections, vendorReturns }: QualityViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-xl font-bold text-white mb-4">QC Inspections</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {inspections.slice(0, 6).map((inspection) => (
            <QCInspectionCard key={inspection.id} inspection={inspection} />
          ))}
        </div>
      </div>

      {vendorReturns.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-white mb-4">Vendor Returns</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vendorReturns.slice(0, 6).map((vendorReturn) => (
              <VendorReturnCard key={vendorReturn.id} vendorReturn={vendorReturn} />
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ==========================================
// ALERTS VIEW
// ==========================================

interface AlertsViewProps {
  alerts: StockAlert[];
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
}

function AlertsView({ alerts, onAcknowledge, onResolve }: AlertsViewProps) {
  const [filter, setFilter] = useState<'all' | 'unresolved'>('unresolved');
  
  const filteredAlerts = filter === 'unresolved' 
    ? alerts.filter(a => !a.resolved)
    : alerts;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Stock Alerts</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('unresolved')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === 'unresolved'
                ? 'bg-blue-600 text-white'
                : 'bg-white/5 text-zinc-400 hover:bg-white/10'
            }`}
          >
            Unresolved ({alerts.filter(a => !a.resolved).length})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white/5 text-zinc-400 hover:bg-white/10'
            }`}
          >
            All ({alerts.length})
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {filteredAlerts.map((alert) => (
          <StockAlertCard
            key={alert.id}
            alert={alert}
            onAcknowledge={() => onAcknowledge(alert.id)}
            onResolve={() => onResolve(alert.id)}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ==========================================
// TRANSFERS VIEW
// ==========================================

interface TransfersViewProps {
  transfers: StockTransfer[];
}

function TransfersView({ transfers }: TransfersViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <h2 className="text-xl font-bold text-white">Stock Transfers</h2>
      
      <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
        <table className="w-full">
          <thead className="bg-white/5">
            <tr>
              <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">Transfer #</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">Material</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">From → To</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">Quantity</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">Status</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {transfers.slice(0, 20).map((transfer) => (
              <tr key={transfer.id} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-white">
                  {transfer.transferNumber}
                </td>
                <td className="px-6 py-4 text-sm text-zinc-300">
                  {transfer.materialName}
                </td>
                <td className="px-6 py-4 text-sm text-zinc-400">
                  {transfer.fromLocation} → {transfer.toLocation}
                </td>
                <td className="px-6 py-4 text-sm text-zinc-300">
                  {transfer.quantity} {transfer.unit}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    transfer.status === 'completed'
                      ? 'bg-green-500/20 text-green-400'
                      : transfer.status === 'approved'
                      ? 'bg-blue-500/20 text-blue-400'
                      : transfer.status === 'pending'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {transfer.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-zinc-500">
                  {new Date(transfer.requestedAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
