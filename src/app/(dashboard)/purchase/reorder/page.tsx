'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw, Package, Settings, Plus, Trash2, Edit2, Play, Pause,
  AlertTriangle, CheckCircle, Clock, ShoppingCart, TrendingDown,
  Search, Filter, Zap, Bell, ToggleLeft, ToggleRight, Truck
} from 'lucide-react';
import { db } from '@/lib/firebase/client';
import { collection, onSnapshot, getDocs, query, orderBy, where } from 'firebase/firestore';
import { reorderService } from '@/lib/services/erp-services';
import type { ReorderRule, AutoReorderLog, ReorderRuleStatus } from '@/types/erp-extended';

// ==========================================
// RULE CARD COMPONENT
// ==========================================
interface RuleCardProps {
  rule: ReorderRule;
  material: any;
  onEdit: (rule: ReorderRule) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, status: ReorderRuleStatus) => void;
}

function RuleCard({ rule, material, onEdit, onDelete, onToggle }: RuleCardProps) {
  const isActive = rule.status === 'active';
  const currentStock = material?.current_stock || 0;
  const isTriggered = currentStock <= rule.triggerPoint;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-zinc-900/50 border rounded-xl p-5 transition-all ${
        isTriggered && isActive
          ? 'border-orange-500/50 bg-orange-500/5'
          : 'border-zinc-800 hover:border-zinc-700'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-white font-semibold">{rule.materialName}</h3>
          <p className="text-zinc-500 text-sm">{rule.materialCode}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggle(rule.id, isActive ? 'paused' : 'active')}
            className={`p-2 rounded-lg transition-colors ${
              isActive
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-zinc-700/50 text-zinc-400'
            }`}
            title={isActive ? 'Pause Rule' : 'Activate Rule'}
          >
            {isActive ? <Zap className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
          <button
            onClick={() => onEdit(rule)}
            className="p-2 bg-zinc-700/50 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(rule.id)}
            className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Status Indicator */}
      {isTriggered && isActive && (
        <div className="flex items-center gap-2 p-2 bg-orange-500/20 border border-orange-500/30 rounded-lg mb-4">
          <AlertTriangle className="w-4 h-4 text-orange-400" />
          <span className="text-orange-400 text-sm">Reorder triggered! Stock below threshold.</span>
        </div>
      )}

      {/* Stock Visual */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-zinc-400 mb-1">
          <span>Current: {currentStock}</span>
          <span>Trigger: {rule.triggerPoint}</span>
          <span>Max: {rule.maxStock}</span>
        </div>
        <div className="relative h-3 bg-zinc-800 rounded-full overflow-hidden">
          {/* Max Stock marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-zinc-500"
            style={{ left: '100%' }}
          />
          {/* Trigger point marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-orange-500"
            style={{ left: `${(rule.triggerPoint / rule.maxStock) * 100}%` }}
          />
          {/* Current stock bar */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min((currentStock / rule.maxStock) * 100, 100)}%` }}
            className={`h-full rounded-full ${
              isTriggered ? 'bg-red-500' : 'bg-emerald-500'
            }`}
          />
        </div>
      </div>

      {/* Settings */}
      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
        <div>
          <p className="text-zinc-500">Reorder Quantity</p>
          <p className="text-white font-semibold">{rule.reorderQty} units</p>
        </div>
        <div>
          <p className="text-zinc-500">Lead Time</p>
          <p className="text-white font-semibold">{rule.leadTimeDays} days</p>
        </div>
        <div>
          <p className="text-zinc-500">Preferred Supplier</p>
          <p className="text-white font-semibold truncate">{rule.preferredSupplierName || 'Any'}</p>
        </div>
        <div>
          <p className="text-zinc-500">Auto Approve</p>
          <p className={`font-semibold ${rule.autoApprove ? 'text-emerald-400' : 'text-zinc-400'}`}>
            {rule.autoApprove ? `Up to ₹${rule.autoApproveThreshold.toLocaleString()}` : 'No'}
          </p>
        </div>
      </div>

      {/* Last Triggered */}
      {rule.lastTriggered && (
        <div className="text-xs text-zinc-500 pt-3 border-t border-zinc-800">
          Last triggered: {new Date(rule.lastTriggered).toLocaleString()}
        </div>
      )}
    </motion.div>
  );
}

// ==========================================
// REORDER LOG CARD
// ==========================================
function LogCard({ log }: { log: AutoReorderLog }) {
  const statusConfig = {
    triggered: { color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Triggered' },
    po_created: { color: 'text-emerald-400', bg: 'bg-emerald-500/20', label: 'PO Created' },
    manual_required: { color: 'text-orange-400', bg: 'bg-orange-500/20', label: 'Manual Required' },
    failed: { color: 'text-red-400', bg: 'bg-red-500/20', label: 'Failed' }
  }[log.status];

  return (
    <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
      <div className="flex items-center gap-4">
        <div className={`p-2 rounded-lg ${statusConfig.bg}`}>
          {log.status === 'po_created' ? (
            <CheckCircle className={`w-5 h-5 ${statusConfig.color}`} />
          ) : log.status === 'failed' ? (
            <AlertTriangle className={`w-5 h-5 ${statusConfig.color}`} />
          ) : (
            <Bell className={`w-5 h-5 ${statusConfig.color}`} />
          )}
        </div>
        <div>
          <p className="text-white font-medium">{log.materialName}</p>
          <p className="text-zinc-500 text-sm">{log.triggerReason}</p>
        </div>
      </div>
      <div className="text-right">
        <span className={`px-2 py-1 text-xs rounded-full ${statusConfig.bg} ${statusConfig.color}`}>
          {statusConfig.label}
        </span>
        <p className="text-zinc-500 text-xs mt-1">
          {new Date(log.triggeredAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

// ==========================================
// CREATE/EDIT RULE MODAL
// ==========================================
interface RuleModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<ReorderRule, 'id'>) => void;
  materials: any[];
  suppliers: any[];
  editRule?: ReorderRule | null;
}

function RuleModal({ open, onClose, onSubmit, materials, suppliers, editRule }: RuleModalProps) {
  const [materialId, setMaterialId] = useState(editRule?.materialId || '');
  const [triggerPoint, setTriggerPoint] = useState(editRule?.triggerPoint || 10);
  const [reorderQty, setReorderQty] = useState(editRule?.reorderQty || 50);
  const [maxStock, setMaxStock] = useState(editRule?.maxStock || 100);
  const [leadTimeDays, setLeadTimeDays] = useState(editRule?.leadTimeDays || 7);
  const [preferredSupplierId, setPreferredSupplierId] = useState(editRule?.preferredSupplierId || '');
  const [autoApprove, setAutoApprove] = useState(editRule?.autoApprove || false);
  const [autoApproveThreshold, setAutoApproveThreshold] = useState(editRule?.autoApproveThreshold || 10000);

  const selectedMaterial = materials.find(m => m.id === materialId);

  const handleSubmit = () => {
    if (!materialId) return;

    const material = materials.find(m => m.id === materialId);
    const supplier = suppliers.find(s => s.id === preferredSupplierId);

    onSubmit({
      materialId,
      materialCode: material?.code || '',
      materialName: material?.name || '',
      triggerPoint,
      reorderQty,
      maxStock,
      preferredSupplierId: preferredSupplierId || undefined,
      preferredSupplierName: supplier?.name,
      leadTimeDays,
      autoApprove,
      autoApproveThreshold,
      status: 'active',
      createdBy: 'current-user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    onClose();
  };

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg"
      >
        <div className="p-6 border-b border-zinc-800">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-400" />
            {editRule ? 'Edit Reorder Rule' : 'Create Reorder Rule'}
          </h2>
        </div>

        <div className="p-6 space-y-5">
          {/* Material Selection */}
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Material</label>
            <select
              value={materialId}
              onChange={(e) => setMaterialId(e.target.value)}
              disabled={!!editRule}
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
            >
              <option value="">Select Material</option>
              {materials.map(mat => (
                <option key={mat.id} value={mat.id}>
                  {mat.name} (Current: {mat.current_stock})
                </option>
              ))}
            </select>
          </div>

          {/* Stock Thresholds */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Trigger Point</label>
              <input
                type="number"
                value={triggerPoint}
                onChange={(e) => setTriggerPoint(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Reorder Qty</label>
              <input
                type="number"
                value={reorderQty}
                onChange={(e) => setReorderQty(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Max Stock</label>
              <input
                type="number"
                value={maxStock}
                onChange={(e) => setMaxStock(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Supplier & Lead Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Preferred Supplier</label>
              <select
                value={preferredSupplierId}
                onChange={(e) => setPreferredSupplierId(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Any Supplier</option>
                {suppliers.map(sup => (
                  <option key={sup.id} value={sup.id}>{sup.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Lead Time (days)</label>
              <input
                type="number"
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Auto Approve */}
          <div className="p-4 bg-zinc-800/50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-white font-medium">Auto Approve</p>
                <p className="text-zinc-500 text-xs">Automatically create POs for small orders</p>
              </div>
              <button
                onClick={() => setAutoApprove(!autoApprove)}
                className={`w-12 h-6 rounded-full transition-colors ${autoApprove ? 'bg-blue-600' : 'bg-zinc-700'}`}
              >
                <motion.div
                  animate={{ x: autoApprove ? 24 : 2 }}
                  className="w-5 h-5 bg-white rounded-full"
                />
              </button>
            </div>
            {autoApprove && (
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Max Amount (₹)</label>
                <input
                  type="number"
                  value={autoApproveThreshold}
                  onChange={(e) => setAutoApproveThreshold(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-zinc-800 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!materialId}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg transition-colors"
          >
            {editRule ? 'Update Rule' : 'Create Rule'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ==========================================
// MAIN REORDER PAGE
// ==========================================
export default function ReorderAutomationPage() {
  const [rules, setRules] = useState<ReorderRule[]>([]);
  const [logs, setLogs] = useState<AutoReorderLog[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingTriggers, setCheckingTriggers] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editRule, setEditRule] = useState<ReorderRule | null>(null);
  const [activeTab, setActiveTab] = useState<'rules' | 'logs'>('rules');

  // Load rules
  useEffect(() => {
    const unsubscribe = reorderService.subscribeToRules((data) => {
      setRules(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Load materials and suppliers
  useEffect(() => {
    const load = async () => {
      const [matSnap, supSnap, logsSnap] = await Promise.all([
        getDocs(collection(db, 'inventory_materials')),
        getDocs(collection(db, 'inventory_suppliers')),
        getDocs(query(collection(db, 'auto_reorder_logs'), orderBy('triggeredAt', 'desc')))
      ]);

      setMaterials(matSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setSuppliers(supSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLogs(logsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as AutoReorderLog[]);
    };
    load();
  }, []);

  // Filter rules
  const filteredRules = useMemo(() => {
    return rules.filter(rule =>
      searchTerm === '' ||
      rule.materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.materialCode.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [rules, searchTerm]);

  // Stats
  const stats = useMemo(() => {
    const activeRules = rules.filter(r => r.status === 'active');
    const triggeredCount = activeRules.filter(r => {
      const mat = materials.find(m => m.id === r.materialId);
      return mat && mat.current_stock <= r.triggerPoint;
    }).length;

    return {
      total: rules.length,
      active: activeRules.length,
      triggered: triggeredCount,
      recentLogs: logs.filter(l => {
        const logDate = new Date(l.triggeredAt);
        const now = new Date();
        return (now.getTime() - logDate.getTime()) < 24 * 60 * 60 * 1000;
      }).length
    };
  }, [rules, materials, logs]);

  const handleCreateRule = async (data: Omit<ReorderRule, 'id'>) => {
    try {
      await reorderService.createRule(data);
    } catch (error) {
      console.error('Error creating rule:', error);
    }
  };

  const handleToggleRule = async (id: string, status: ReorderRuleStatus) => {
    try {
      await reorderService.updateRule(id, { status });
    } catch (error) {
      console.error('Error toggling rule:', error);
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;
    try {
      await reorderService.deleteRule(id);
    } catch (error) {
      console.error('Error deleting rule:', error);
    }
  };

  const handleCheckTriggers = async () => {
    setCheckingTriggers(true);
    try {
      const newLogs = await reorderService.checkReorderTriggers();
      setLogs(prev => [...newLogs, ...prev]);
    } catch (error) {
      console.error('Error checking triggers:', error);
    }
    setCheckingTriggers(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-zinc-400">Loading reorder rules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Zap className="w-7 h-7 text-yellow-400" />
              Reorder Automation
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              Automatic purchase order generation based on stock levels
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCheckTriggers}
              disabled={checkingTriggers}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${checkingTriggers ? 'animate-spin' : ''}`} />
              Check Now
            </button>
            <button
              onClick={() => {
                setEditRule(null);
                setShowRuleModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              New Rule
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <p className="text-zinc-400 text-sm">Total Rules</p>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
            <p className="text-emerald-400 text-sm">Active Rules</p>
            <p className="text-2xl font-bold text-emerald-400">{stats.active}</p>
          </div>
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
            <p className="text-orange-400 text-sm">Triggered Now</p>
            <p className="text-2xl font-bold text-orange-400">{stats.triggered}</p>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
            <p className="text-blue-400 text-sm">Logs (24h)</p>
            <p className="text-2xl font-bold text-blue-400">{stats.recentLogs}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800">
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'rules'
                ? 'text-white border-b-2 border-blue-500'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4 inline mr-2" />
            Reorder Rules
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'logs'
                ? 'text-white border-b-2 border-blue-500'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4 inline mr-2" />
            Activity Log
          </button>
        </div>

        {/* Content */}
        {activeTab === 'rules' ? (
          <>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search rules..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Rules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRules.length > 0 ? (
                filteredRules.map(rule => (
                  <RuleCard
                    key={rule.id}
                    rule={rule}
                    material={materials.find(m => m.id === rule.materialId)}
                    onEdit={(r) => {
                      setEditRule(r);
                      setShowRuleModal(true);
                    }}
                    onDelete={handleDeleteRule}
                    onToggle={handleToggleRule}
                  />
                ))
              ) : (
                <div className="col-span-full text-center py-16">
                  <Settings className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-zinc-400 mb-2">No Rules Found</h3>
                  <p className="text-zinc-500">
                    Create reorder rules to automate your purchasing
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Activity Logs */
          <div className="space-y-3">
            {logs.length > 0 ? (
              logs.map(log => (
                <LogCard key={log.id} log={log} />
              ))
            ) : (
              <div className="text-center py-16">
                <Clock className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-zinc-400 mb-2">No Activity Yet</h3>
                <p className="text-zinc-500">
                  Reorder triggers will appear here
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Rule Modal */}
      <AnimatePresence>
        {showRuleModal && (
          <RuleModal
            open={showRuleModal}
            onClose={() => {
              setShowRuleModal(false);
              setEditRule(null);
            }}
            onSubmit={handleCreateRule}
            materials={materials}
            suppliers={suppliers}
            editRule={editRule}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
