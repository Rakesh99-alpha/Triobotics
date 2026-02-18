'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardCheck, Package, AlertTriangle, CheckCircle, XCircle,
  Search, Filter, RefreshCw, Plus, Calendar, Users, BarChart3,
  Clock, Eye, Edit3, ChevronDown, Calculator, FileText, Save,
  Loader2, Check, X, TrendingUp, TrendingDown
} from 'lucide-react';
import { db } from '@/lib/firebase/client';
import { collection, onSnapshot, getDocs, query, orderBy } from 'firebase/firestore';
import { auditService } from '@/lib/services/erp-services';
import type { InventoryAudit, AuditItem, AuditType, AuditStatus, StockAdjustment } from '@/types/erp-extended';
import { DEPARTMENTS, LOCATIONS, VARIANCE_THRESHOLDS } from '@/types/erp-extended';

// ==========================================
// STATUS CONFIG
// ==========================================
const STATUS_CONFIG: Record<AuditStatus, { color: string; bgColor: string; label: string }> = {
  scheduled: { color: 'text-blue-400', bgColor: 'bg-blue-500/20', label: 'Scheduled' },
  in_progress: { color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', label: 'In Progress' },
  pending_review: { color: 'text-orange-400', bgColor: 'bg-orange-500/20', label: 'Pending Review' },
  completed: { color: 'text-emerald-400', bgColor: 'bg-emerald-500/20', label: 'Completed' },
  cancelled: { color: 'text-zinc-500', bgColor: 'bg-zinc-500/20', label: 'Cancelled' }
};

const AUDIT_TYPE_CONFIG: Record<AuditType, { label: string; description: string }> = {
  full: { label: 'Full Audit', description: 'Complete inventory count of all materials' },
  cycle: { label: 'Cycle Count', description: 'Periodic count of selected materials' },
  spot: { label: 'Spot Check', description: 'Random verification of specific items' },
  annual: { label: 'Annual Audit', description: 'Yearly comprehensive inventory review' }
};

// ==========================================
// VARIANCE INDICATOR
// ==========================================
function VarianceIndicator({ variance, percent }: { variance: number; percent: number }) {
  const absPercent = Math.abs(percent);

  if (variance === 0) {
    return <span className="text-emerald-400 text-sm">Match ✓</span>;
  }

  let color = 'text-emerald-400';
  let icon = <Check className="w-4 h-4" />;

  if (absPercent >= VARIANCE_THRESHOLDS.critical) {
    color = 'text-red-400';
    icon = <XCircle className="w-4 h-4" />;
  } else if (absPercent >= VARIANCE_THRESHOLDS.review) {
    color = 'text-orange-400';
    icon = <AlertTriangle className="w-4 h-4" />;
  } else if (absPercent >= VARIANCE_THRESHOLDS.acceptable) {
    color = 'text-yellow-400';
    icon = <AlertTriangle className="w-4 h-4" />;
  }

  return (
    <div className={`flex items-center gap-1.5 ${color}`}>
      {icon}
      <span className="text-sm">
        {variance > 0 ? '+' : ''}{variance} ({percent.toFixed(1)}%)
      </span>
    </div>
  );
}

// ==========================================
// AUDIT CARD COMPONENT
// ==========================================
interface AuditCardProps {
  audit: InventoryAudit;
  onStart: (id: string) => void;
  onView: (audit: InventoryAudit) => void;
  onComplete: (id: string) => void;
}

function AuditCard({ audit, onStart, onView, onComplete }: AuditCardProps) {
  const statusConfig = STATUS_CONFIG[audit.status];
  const typeConfig = AUDIT_TYPE_CONFIG[audit.auditType];
  const progress = audit.totalItems > 0 ? (audit.countedItems / audit.totalItems) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-white font-semibold">{audit.auditNumber}</h3>
            <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${statusConfig.bgColor} ${statusConfig.color}`}>
              {statusConfig.label}
            </span>
          </div>
          <p className="text-zinc-400 text-sm mt-1">{audit.title}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-zinc-500">{typeConfig.label}</p>
          <p className="text-sm text-zinc-400">{new Date(audit.scheduledDate).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-zinc-400 mb-1">
          <span>{audit.countedItems} of {audit.totalItems} items counted</span>
          <span>{progress.toFixed(0)}%</span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-blue-500 rounded-full"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-4 text-center">
        <div className="bg-zinc-800/50 rounded-lg p-2">
          <p className="text-xl font-bold text-white">{audit.totalItems}</p>
          <p className="text-xs text-zinc-500">Total Items</p>
        </div>
        <div className="bg-zinc-800/50 rounded-lg p-2">
          <p className="text-xl font-bold text-emerald-400">{audit.countedItems}</p>
          <p className="text-xs text-zinc-500">Counted</p>
        </div>
        <div className="bg-zinc-800/50 rounded-lg p-2">
          <p className="text-xl font-bold text-orange-400">{audit.varianceItems}</p>
          <p className="text-xs text-zinc-500">Variances</p>
        </div>
        <div className="bg-zinc-800/50 rounded-lg p-2">
          <p className={`text-xl font-bold ${audit.totalVarianceValue < 0 ? 'text-red-400' : audit.totalVarianceValue > 0 ? 'text-emerald-400' : 'text-white'}`}>
            ₹{Math.abs(audit.totalVarianceValue).toLocaleString()}
          </p>
          <p className="text-xs text-zinc-500">Variance Value</p>
        </div>
      </div>

      {/* Assigned To */}
      <div className="flex items-center gap-2 text-sm text-zinc-400 mb-4">
        <Users className="w-4 h-4" />
        <span>Assigned to: {audit.assignedToNames.join(', ') || 'Unassigned'}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
        <button
          onClick={() => onView(audit)}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm"
        >
          <Eye className="w-4 h-4" />
          View Details
        </button>
        <div className="flex items-center gap-2">
          {audit.status === 'scheduled' && (
            <button
              onClick={() => onStart(audit.id)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
            >
              Start Audit
            </button>
          )}
          {audit.status === 'in_progress' && (
            <button
              onClick={() => onView(audit)}
              className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm transition-colors"
            >
              Continue Counting
            </button>
          )}
          {audit.status === 'pending_review' && (
            <button
              onClick={() => onComplete(audit.id)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm transition-colors"
            >
              Complete Review
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ==========================================
// CREATE AUDIT MODAL
// ==========================================
interface CreateAuditModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  materials: any[];
}

function CreateAuditModal({ open, onClose, onSubmit, materials }: CreateAuditModalProps) {
  const [title, setTitle] = useState('');
  const [auditType, setAuditType] = useState<AuditType>('cycle');
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedMaterials([]);
    } else {
      setSelectedMaterials(materials.map(m => m.id));
    }
    setSelectAll(!selectAll);
  };

  const handleSubmit = () => {
    if (!title || selectedMaterials.length === 0) return;

    const items: AuditItem[] = selectedMaterials.map(matId => {
      const mat = materials.find(m => m.id === matId);
      return {
        materialId: matId,
        materialCode: mat?.code || '',
        materialName: mat?.name || '',
        location: 'Main Store',
        systemQty: mat?.current_stock || 0,
        countedQty: null,
        variance: 0,
        variancePercent: 0,
        varianceValue: 0,
        unitCost: mat?.purchase_price || 0,
        unit: mat?.unit || 'units',
        status: 'pending'
      };
    });

    onSubmit({
      auditType,
      title,
      scheduledDate,
      status: 'scheduled',
      assignedTo,
      assignedToNames: assignedTo, // Would be resolved to actual names
      items,
      totalItems: items.length,
      countedItems: 0,
      varianceItems: 0,
      totalSystemValue: items.reduce((sum, i) => sum + i.systemQty * i.unitCost, 0),
      totalCountedValue: 0,
      totalVarianceValue: 0,
      createdBy: 'current-user',
      createdByName: 'Current User'
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
        className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-auto"
      >
        <div className="p-6 border-b border-zinc-800">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-blue-400" />
            Create Inventory Audit
          </h2>
        </div>

        <div className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Audit Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Q1 2026 Cycle Count"
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Type & Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Audit Type</label>
              <select
                value={auditType}
                onChange={(e) => setAuditType(e.target.value as AuditType)}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                {Object.entries(AUDIT_TYPE_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Scheduled Date</label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Materials Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-zinc-400">Select Materials ({selectedMaterials.length} selected)</label>
              <button
                onClick={handleSelectAll}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                {selectAll ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="max-h-48 overflow-auto border border-zinc-700 rounded-lg">
              {materials.map(mat => (
                <label
                  key={mat.id}
                  className="flex items-center gap-3 p-3 hover:bg-zinc-800/50 cursor-pointer border-b border-zinc-800 last:border-0"
                >
                  <input
                    type="checkbox"
                    checked={selectedMaterials.includes(mat.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedMaterials([...selectedMaterials, mat.id]);
                      } else {
                        setSelectedMaterials(selectedMaterials.filter(id => id !== mat.id));
                      }
                    }}
                    className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <p className="text-white text-sm">{mat.name}</p>
                    <p className="text-zinc-500 text-xs">{mat.code} • Stock: {mat.current_stock}</p>
                  </div>
                </label>
              ))}
            </div>
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
            disabled={!title || selectedMaterials.length === 0}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg transition-colors"
          >
            Create Audit
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ==========================================
// AUDIT DETAIL MODAL (COUNTING)
// ==========================================
interface AuditDetailModalProps {
  audit: InventoryAudit | null;
  open: boolean;
  onClose: () => void;
  onUpdateCount: (auditId: string, itemIndex: number, countedQty: number) => void;
}

function AuditDetailModal({ audit, open, onClose, onUpdateCount }: AuditDetailModalProps) {
  const [counts, setCounts] = useState<Record<number, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'counted'>('all');

  useEffect(() => {
    if (audit) {
      const initialCounts: Record<number, string> = {};
      audit.items.forEach((item, index) => {
        if (item.countedQty !== null) {
          initialCounts[index] = item.countedQty.toString();
        }
      });
      setCounts(initialCounts);
    }
  }, [audit]);

  if (!open || !audit) return null;

  const filteredItems = audit.items.filter((item, index) => {
    const matchesSearch = searchTerm === '' ||
      item.materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.materialCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'pending' && item.status === 'pending') ||
      (filterStatus === 'counted' && item.status === 'counted');
    return matchesSearch && matchesStatus;
  });

  const handleSaveCount = (itemIndex: number) => {
    const countValue = parseFloat(counts[itemIndex] || '0');
    if (!isNaN(countValue)) {
      onUpdateCount(audit.id, itemIndex, countValue);
    }
  };

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
        className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">{audit.auditNumber}</h2>
              <p className="text-zinc-400 text-sm">{audit.title}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-zinc-400">Progress</p>
              <p className="text-xl font-bold text-white">
                {audit.countedItems}/{audit.totalItems}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-zinc-800 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search materials..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Items</option>
            <option value="pending">Pending</option>
            <option value="counted">Counted</option>
          </select>
        </div>

        {/* Items Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="bg-zinc-800/50 sticky top-0">
              <tr className="text-zinc-400 text-sm text-left">
                <th className="p-4">Material</th>
                <th className="p-4 text-right">System Qty</th>
                <th className="p-4 text-center">Counted Qty</th>
                <th className="p-4 text-center">Variance</th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item, index) => {
                const originalIndex = audit.items.indexOf(item);
                const currentCount = counts[originalIndex] || '';
                const countedQty = parseFloat(currentCount) || 0;
                const variance = countedQty - item.systemQty;
                const variancePercent = item.systemQty > 0 ? (variance / item.systemQty) * 100 : 0;

                return (
                  <tr key={originalIndex} className="border-t border-zinc-800 hover:bg-zinc-800/30">
                    <td className="p-4">
                      <p className="text-white font-medium">{item.materialName}</p>
                      <p className="text-zinc-500 text-xs">{item.materialCode} • {item.location}</p>
                    </td>
                    <td className="p-4 text-right">
                      <p className="text-white">{item.systemQty}</p>
                      <p className="text-zinc-500 text-xs">{item.unit}</p>
                    </td>
                    <td className="p-4">
                      <input
                        type="number"
                        value={currentCount}
                        onChange={(e) => setCounts({ ...counts, [originalIndex]: e.target.value })}
                        placeholder="0"
                        className="w-24 mx-auto block px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-center focus:outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="p-4 text-center">
                      {currentCount && (
                        <VarianceIndicator variance={variance} percent={variancePercent} />
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleSaveCount(originalIndex)}
                        disabled={!currentCount}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg text-sm transition-colors"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-800 flex justify-between items-center">
          <div className="text-sm">
            <span className="text-zinc-400">Total Variance: </span>
            <span className={audit.totalVarianceValue < 0 ? 'text-red-400' : 'text-emerald-400'}>
              ₹{Math.abs(audit.totalVarianceValue).toLocaleString()}
            </span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
            >
              Close
            </button>
            <button
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
            >
              Submit for Review
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ==========================================
// MAIN AUDIT PAGE
// ==========================================
export default function InventoryAuditPage() {
  const [audits, setAudits] = useState<InventoryAudit[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<AuditStatus | 'all'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState<InventoryAudit | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Load audits
  useEffect(() => {
    const unsubscribe = auditService.subscribeToAudits((data) => {
      setAudits(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Load materials
  useEffect(() => {
    const loadMaterials = async () => {
      const snapshot = await getDocs(collection(db, 'inventory_materials'));
      setMaterials(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    loadMaterials();
  }, []);

  // Filter audits
  const filteredAudits = useMemo(() => {
    return audits.filter(audit => {
      const matchesSearch = searchTerm === '' ||
        audit.auditNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        audit.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || audit.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [audits, searchTerm, filterStatus]);

  // Stats
  const stats = useMemo(() => ({
    total: audits.length,
    scheduled: audits.filter(a => a.status === 'scheduled').length,
    inProgress: audits.filter(a => a.status === 'in_progress').length,
    completed: audits.filter(a => a.status === 'completed').length
  }), [audits]);

  const handleCreateAudit = async (data: any) => {
    try {
      await auditService.createAudit(data);
    } catch (error) {
      console.error('Error creating audit:', error);
    }
  };

  const handleStartAudit = async (id: string) => {
    try {
      await auditService.startAudit(id, 'current-user', 'Current User');
    } catch (error) {
      console.error('Error starting audit:', error);
    }
  };

  const handleViewAudit = (audit: InventoryAudit) => {
    setSelectedAudit(audit);
    setShowDetailModal(true);
  };

  const handleCompleteAudit = async (id: string) => {
    try {
      await auditService.completeAudit(id, 'current-user', 'Current User');
    } catch (error) {
      console.error('Error completing audit:', error);
    }
  };

  const handleUpdateCount = async (auditId: string, itemIndex: number, countedQty: number) => {
    try {
      await auditService.updateItemCount(auditId, itemIndex, countedQty, 'current-user');
    } catch (error) {
      console.error('Error updating count:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-zinc-400">Loading audits...</p>
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
              <ClipboardCheck className="w-7 h-7 text-blue-400" />
              Inventory Audits
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              Manage cycle counts and stock reconciliation
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Audit
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <p className="text-zinc-400 text-sm">Total Audits</p>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
            <p className="text-blue-400 text-sm">Scheduled</p>
            <p className="text-2xl font-bold text-blue-400">{stats.scheduled}</p>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
            <p className="text-yellow-400 text-sm">In Progress</p>
            <p className="text-2xl font-bold text-yellow-400">{stats.inProgress}</p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
            <p className="text-emerald-400 text-sm">Completed</p>
            <p className="text-2xl font-bold text-emerald-400">{stats.completed}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search audits..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2.5 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Status</option>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
        </div>

        {/* Audits Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredAudits.length > 0 ? (
            filteredAudits.map(audit => (
              <AuditCard
                key={audit.id}
                audit={audit}
                onStart={handleStartAudit}
                onView={handleViewAudit}
                onComplete={handleCompleteAudit}
              />
            ))
          ) : (
            <div className="col-span-2 text-center py-16">
              <ClipboardCheck className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-zinc-400 mb-2">No Audits Found</h3>
              <p className="text-zinc-500">
                {searchTerm || filterStatus !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Create your first inventory audit'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateAuditModal
            open={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onSubmit={handleCreateAudit}
            materials={materials}
          />
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetailModal && (
          <AuditDetailModal
            audit={selectedAudit}
            open={showDetailModal}
            onClose={() => {
              setShowDetailModal(false);
              setSelectedAudit(null);
            }}
            onUpdateCount={handleUpdateCount}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
