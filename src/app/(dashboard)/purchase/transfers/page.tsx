'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, ArrowLeftRight, Package, Building2, Plus, Minus,
  Search, Filter, RefreshCw, Check, X, Clock, Truck, Send,
  CheckCircle, AlertCircle, XCircle, ChevronDown, Trash2, Edit2
} from 'lucide-react';
import { db } from '@/lib/firebase/client';
import { collection, onSnapshot, getDocs, query, orderBy, where } from 'firebase/firestore';
import { transferService } from '@/lib/services/erp-services';
import type { MaterialTransfer, TransferItem, TransferStatus } from '@/types/erp-extended';
import { DEPARTMENTS } from '@/types/erp-extended';

// ==========================================
// STATUS CONFIG
// ==========================================
const STATUS_CONFIG: Record<TransferStatus, { color: string; bgColor: string; label: string; icon: React.FC<any> }> = {
  draft: { color: 'text-zinc-400', bgColor: 'bg-zinc-500/20', label: 'Draft', icon: Edit2 },
  pending_approval: { color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', label: 'Pending Approval', icon: Clock },
  approved: { color: 'text-emerald-400', bgColor: 'bg-emerald-500/20', label: 'Approved', icon: CheckCircle },
  rejected: { color: 'text-red-400', bgColor: 'bg-red-500/20', label: 'Rejected', icon: XCircle },
  in_transit: { color: 'text-blue-400', bgColor: 'bg-blue-500/20', label: 'In Transit', icon: Truck },
  received: { color: 'text-purple-400', bgColor: 'bg-purple-500/20', label: 'Received', icon: Package },
  completed: { color: 'text-emerald-400', bgColor: 'bg-emerald-500/20', label: 'Completed', icon: Check },
  cancelled: { color: 'text-zinc-500', bgColor: 'bg-zinc-500/20', label: 'Cancelled', icon: X }
};

// ==========================================
// TRANSFER CARD COMPONENT
// ==========================================
interface TransferCardProps {
  transfer: MaterialTransfer;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  onDispatch: (id: string) => void;
  onReceive: (id: string) => void;
}

function TransferCard({ transfer, onApprove, onReject, onDispatch, onReceive }: TransferCardProps) {
  const [expanded, setExpanded] = useState(false);
  const statusConfig = STATUS_CONFIG[transfer.status];
  const StatusIcon = statusConfig.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-all"
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-white font-semibold">{transfer.transferNumber}</h3>
              <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${statusConfig.bgColor} ${statusConfig.color}`}>
                <StatusIcon className="w-3 h-3 inline mr-1" />
                {statusConfig.label}
              </span>
            </div>
            <p className="text-zinc-500 text-sm mt-1">
              Requested by {transfer.requestedByName} • {new Date(transfer.requestedAt).toLocaleDateString()}
            </p>
          </div>
          <div className={`px-3 py-1.5 rounded-lg text-xs font-medium ${transfer.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
            transfer.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
              transfer.priority === 'normal' ? 'bg-blue-500/20 text-blue-400' :
                'bg-zinc-500/20 text-zinc-400'
            }`}>
            {transfer.priority.charAt(0).toUpperCase() + transfer.priority.slice(1)} Priority
          </div>
        </div>

        {/* Transfer Flow */}
        <div className="flex items-center justify-center gap-4 p-4 bg-zinc-800/30 rounded-lg mb-4">
          <div className="text-center">
            <Building2 className="w-8 h-8 text-orange-400 mx-auto mb-2" />
            <p className="text-white font-medium">{transfer.fromDepartment}</p>
            <p className="text-zinc-500 text-xs">{transfer.fromLocation}</p>
          </div>
          <div className="flex flex-col items-center">
            <ArrowRight className="w-8 h-8 text-blue-400" />
            <p className="text-zinc-500 text-xs mt-1">{transfer.totalItems} items</p>
          </div>
          <div className="text-center">
            <Building2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-white font-medium">{transfer.toDepartment}</p>
            <p className="text-zinc-500 text-xs">{transfer.toLocation}</p>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 text-sm mb-4">
          <div>
            <p className="text-zinc-500">Total Items</p>
            <p className="text-white font-semibold">{transfer.totalItems}</p>
          </div>
          <div>
            <p className="text-zinc-500">Total Value</p>
            <p className="text-white font-semibold">₹{transfer.totalValue.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-zinc-500">Reason</p>
            <p className="text-white font-semibold truncate">{transfer.reason}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            View Items
          </button>
          <div className="flex items-center gap-2">
            {transfer.status === 'pending_approval' && (
              <>
                <button
                  onClick={() => onReject(transfer.id, 'Rejected by manager')}
                  className="px-3 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-sm transition-colors"
                >
                  Reject
                </button>
                <button
                  onClick={() => onApprove(transfer.id)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm transition-colors"
                >
                  Approve
                </button>
              </>
            )}
            {transfer.status === 'approved' && (
              <button
                onClick={() => onDispatch(transfer.id)}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
              >
                <Truck className="w-4 h-4" />
                Dispatch
              </button>
            )}
            {transfer.status === 'in_transit' && (
              <button
                onClick={() => onReceive(transfer.id)}
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm transition-colors"
              >
                <Package className="w-4 h-4" />
                Receive
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Items */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-zinc-800 bg-zinc-800/30"
          >
            <div className="p-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-zinc-500 text-left">
                    <th className="pb-2">Material</th>
                    <th className="pb-2">Code</th>
                    <th className="pb-2 text-right">Quantity</th>
                    <th className="pb-2 text-right">Unit Cost</th>
                    <th className="pb-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {transfer.items.map((item, index) => (
                    <tr key={index} className="border-t border-zinc-700/50">
                      <td className="py-2 text-white">{item.materialName}</td>
                      <td className="py-2 text-zinc-400">{item.materialCode}</td>
                      <td className="py-2 text-right text-white">{item.quantity} {item.unit}</td>
                      <td className="py-2 text-right text-zinc-400">₹{item.unitCost}</td>
                      <td className="py-2 text-right text-white">₹{item.totalCost.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ==========================================
// CREATE TRANSFER MODAL
// ==========================================
interface CreateTransferModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<MaterialTransfer, 'id' | 'transferNumber' | 'createdAt' | 'updatedAt'>) => void;
  materials: any[];
}

function CreateTransferModal({ open, onClose, onSubmit, materials }: CreateTransferModalProps) {
  const [fromDepartment, setFromDepartment] = useState('');
  const [toDepartment, setToDepartment] = useState('');
  const [fromLocation, setFromLocation] = useState('Main Store');
  const [toLocation, setToLocation] = useState('Production Floor');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [reason, setReason] = useState('');
  const [items, setItems] = useState<TransferItem[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [quantity, setQuantity] = useState(1);

  const locations = [
    'Main Store', 'Production Floor', 'Assembly Area', 'Quality Lab',
    'R&D Lab', 'Tooling Store', 'Maintenance Store', 'New Factory'
  ];

  const addItem = () => {
    if (!selectedMaterial || quantity <= 0) return;

    const material = materials.find(m => m.id === selectedMaterial);
    if (!material) return;

    const newItem: TransferItem = {
      materialId: material.id,
      materialCode: material.code || '',
      materialName: material.name,
      quantity,
      unit: material.unit || 'units',
      unitCost: material.purchase_price || 0,
      totalCost: quantity * (material.purchase_price || 0)
    };

    setItems([...items, newItem]);
    setSelectedMaterial('');
    setQuantity(1);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!fromDepartment || !toDepartment || items.length === 0) return;

    onSubmit({
      fromDepartment,
      toDepartment,
      fromLocation,
      toLocation,
      requestedBy: 'current-user',
      requestedByName: 'Current User',
      requestedAt: new Date().toISOString(),
      items,
      totalItems: items.length,
      totalValue: items.reduce((sum, item) => sum + item.totalCost, 0),
      status: 'pending_approval',
      priority,
      reason,
      approvalRequired: true
    });

    onClose();
  };

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-auto"
      >
        <div className="p-6 border-b border-zinc-800">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-blue-400" />
            Create Material Transfer
          </h2>
        </div>

        <div className="p-6 space-y-6">
          {/* Departments */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-2">From Department</label>
              <select
                value={fromDepartment}
                onChange={(e) => setFromDepartment(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Select Department</option>
                {DEPARTMENTS.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-2">To Department</label>
              <select
                value={toDepartment}
                onChange={(e) => setToDepartment(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Select Department</option>
                {DEPARTMENTS.filter(d => d !== fromDepartment).map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Locations */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-2">From Location</label>
              <select
                value={fromLocation}
                onChange={(e) => setFromLocation(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                {locations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-2">To Location</label>
              <select
                value={toLocation}
                onChange={(e) => setToLocation(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                {locations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Priority & Reason */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Reason</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Production requirement..."
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Add Items */}
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Add Materials</label>
            <div className="flex gap-2">
              <select
                value={selectedMaterial}
                onChange={(e) => setSelectedMaterial(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Select Material</option>
                {materials.map(mat => (
                  <option key={mat.id} value={mat.id}>{mat.name} ({mat.current_stock} available)</option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-24 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={addItem}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Items List */}
          {items.length > 0 && (
            <div className="border border-zinc-800 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-zinc-800/50">
                  <tr className="text-zinc-400 text-left">
                    <th className="p-3">Material</th>
                    <th className="p-3 text-right">Qty</th>
                    <th className="p-3 text-right">Cost</th>
                    <th className="p-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index} className="border-t border-zinc-800">
                      <td className="p-3 text-white">{item.materialName}</td>
                      <td className="p-3 text-right text-white">{item.quantity} {item.unit}</td>
                      <td className="p-3 text-right text-white">₹{item.totalCost.toLocaleString()}</td>
                      <td className="p-3">
                        <button
                          onClick={() => removeItem(index)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-zinc-800/30">
                  <tr>
                    <td className="p-3 text-zinc-400" colSpan={2}>Total ({items.length} items)</td>
                    <td className="p-3 text-right text-white font-semibold">
                      ₹{items.reduce((sum, i) => sum + i.totalCost, 0).toLocaleString()}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-800 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!fromDepartment || !toDepartment || items.length === 0}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg transition-colors"
          >
            Create Transfer Request
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ==========================================
// MAIN TRANSFERS PAGE
// ==========================================
export default function MaterialTransfersPage() {
  const [transfers, setTransfers] = useState<MaterialTransfer[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<TransferStatus | 'all'>('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Load transfers
  useEffect(() => {
    const unsubscribe = transferService.subscribeToTransfers((data) => {
      setTransfers(data);
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

  // Filter transfers
  const filteredTransfers = useMemo(() => {
    return transfers.filter(transfer => {
      const matchesSearch = searchTerm === '' ||
        transfer.transferNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transfer.fromDepartment.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transfer.toDepartment.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || transfer.status === filterStatus;
      const matchesDept = filterDepartment === 'all' ||
        transfer.fromDepartment === filterDepartment ||
        transfer.toDepartment === filterDepartment;
      return matchesSearch && matchesStatus && matchesDept;
    });
  }, [transfers, searchTerm, filterStatus, filterDepartment]);

  // Stats
  const stats = useMemo(() => ({
    total: transfers.length,
    pending: transfers.filter(t => t.status === 'pending_approval').length,
    inTransit: transfers.filter(t => t.status === 'in_transit').length,
    completed: transfers.filter(t => t.status === 'completed').length
  }), [transfers]);

  const handleCreateTransfer = async (data: Omit<MaterialTransfer, 'id' | 'transferNumber' | 'createdAt' | 'updatedAt'>) => {
    try {
      await transferService.createTransfer(data);
    } catch (error) {
      console.error('Error creating transfer:', error);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await transferService.approveTransfer(id, 'current-user', 'Current User');
    } catch (error) {
      console.error('Error approving transfer:', error);
    }
  };

  const handleReject = async (id: string, reason: string) => {
    try {
      await transferService.rejectTransfer(id, reason);
    } catch (error) {
      console.error('Error rejecting transfer:', error);
    }
  };

  const handleDispatch = async (id: string) => {
    try {
      await transferService.dispatchTransfer(id, 'current-user');
    } catch (error) {
      console.error('Error dispatching transfer:', error);
    }
  };

  const handleReceive = async (id: string) => {
    try {
      await transferService.receiveTransfer(id, 'current-user', 'Current User');
    } catch (error) {
      console.error('Error receiving transfer:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-zinc-400">Loading transfers...</p>
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
              <ArrowLeftRight className="w-7 h-7 text-blue-400" />
              Material Transfers
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              Manage inter-department material movements
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Transfer
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <p className="text-zinc-400 text-sm">Total Transfers</p>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
            <p className="text-yellow-400 text-sm">Pending Approval</p>
            <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
            <p className="text-blue-400 text-sm">In Transit</p>
            <p className="text-2xl font-bold text-blue-400">{stats.inTransit}</p>
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
              placeholder="Search transfers..."
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
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="px-4 py-2.5 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Departments</option>
            {DEPARTMENTS.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>

        {/* Transfers List */}
        <div className="space-y-4">
          {filteredTransfers.length > 0 ? (
            filteredTransfers.map(transfer => (
              <TransferCard
                key={transfer.id}
                transfer={transfer}
                onApprove={handleApprove}
                onReject={handleReject}
                onDispatch={handleDispatch}
                onReceive={handleReceive}
              />
            ))
          ) : (
            <div className="text-center py-16">
              <ArrowLeftRight className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-zinc-400 mb-2">No Transfers Found</h3>
              <p className="text-zinc-500">
                {searchTerm || filterStatus !== 'all' || filterDepartment !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Create your first transfer request'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateTransferModal
            open={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onSubmit={handleCreateTransfer}
            materials={materials}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
