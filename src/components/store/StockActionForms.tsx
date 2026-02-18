/**
 * Stock Action Forms
 * Modal forms for: Stock Transfer, QC Inspection, Vendor Return
 */

'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRightLeft,
  FileCheck,
  RotateCcw,
  X,
  Save,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import {
  createStockTransfer,
  createQCInspection,
  createVendorReturn
} from '@/lib/services/storeEnhanced';
import type { QualityStatus } from '@/types/store-enhanced';

// ==========================================
// TYPES
// ==========================================

interface MaterialData {
  id: string;
  name?: string;
  code?: string;
  unit?: string;
  supplier?: string;
  location?: string;
  current_stock?: number;
  [key: string]: unknown;
}

interface FormModalProps {
  materials: MaterialData[];
  userName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

// ==========================================
// STOCK TRANSFER FORM
// ==========================================

export function StockTransferForm({ materials, userName, onClose, onSuccess }: FormModalProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    materialId: '',
    quantity: 0,
    fromLocation: '',
    toLocation: '',
    fromDepartment: '',
    toDepartment: '',
    reason: ''
  });

  const selectedMat = materials.find(m => m.id === form.materialId);
  const departments = ['Store', 'Production', 'Assembly', 'Tooling', 'Quality', 'Maintenance', 'R&D', 'Machining', 'Welding'];

  const handleSubmit = async () => {
    if (!form.materialId || form.quantity <= 0 || !form.fromLocation || !form.toLocation) return;
    setSaving(true);
    try {
      await createStockTransfer({
        transferNumber: `TRF-${Date.now().toString(36).toUpperCase()}`,
        materialId: form.materialId,
        materialName: selectedMat?.name || '',
        quantity: form.quantity,
        unit: selectedMat?.unit || 'Pcs',
        fromLocation: form.fromLocation,
        toLocation: form.toLocation,
        fromDepartment: form.fromDepartment,
        toDepartment: form.toDepartment,
        requestedBy: userName,
        status: 'pending',
        reason: form.reason
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Transfer error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalWrapper title="New Stock Transfer" icon={<ArrowRightLeft className="w-5 h-5 text-blue-400" />} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Material *</label>
          <select value={form.materialId} onChange={e => {
            const mat = materials.find(m => m.id === e.target.value);
            setForm({ ...form, materialId: e.target.value, fromLocation: mat?.location || '' });
          }} className="input-style">
            <option value="">Select material</option>
            {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.code}) — Stock: {m.current_stock} {m.unit}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Quantity *</label>
            <input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: Number(e.target.value) })}
              className="input-style" max={selectedMat?.current_stock ?? undefined} />
            {selectedMat && form.quantity > (selectedMat.current_stock || 0) && (
              <p className="text-xs text-red-400 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Exceeds stock ({selectedMat.current_stock})</p>
            )}
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Unit</label>
            <input value={selectedMat?.unit || 'Pcs'} readOnly className="input-style opacity-60" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">From Location *</label>
            <input value={form.fromLocation} onChange={e => setForm({ ...form, fromLocation: e.target.value })}
              className="input-style" placeholder="e.g. Rack A-1" />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">To Location *</label>
            <input value={form.toLocation} onChange={e => setForm({ ...form, toLocation: e.target.value })}
              className="input-style" placeholder="e.g. Production Floor" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">From Department</label>
            <select value={form.fromDepartment} onChange={e => setForm({ ...form, fromDepartment: e.target.value })} className="input-style">
              <option value="">Select dept</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">To Department</label>
            <select value={form.toDepartment} onChange={e => setForm({ ...form, toDepartment: e.target.value })} className="input-style">
              <option value="">Select dept</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs text-zinc-400 mb-1">Reason / Notes</label>
          <textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}
            className="input-style min-h-[80px] resize-none" placeholder="Reason for this stock transfer..." />
        </div>
      </div>

      <FormActions onClose={onClose} onSave={handleSubmit} saving={saving}
        disabled={!form.materialId || form.quantity <= 0 || !form.fromLocation || !form.toLocation} />
    </ModalWrapper>
  );
}

// ==========================================
// QC INSPECTION FORM
// ==========================================

export function QCInspectionForm({ materials, userName, onClose, onSuccess }: FormModalProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    materialId: '',
    batchNumber: '',
    quantity: 0,
    inspectionType: 'incoming' as 'incoming' | 'in_process' | 'final' | 'periodic',
    notes: ''
  });
  const selectedMat = materials.find(m => m.id === form.materialId);

  const handleSubmit = async () => {
    if (!form.materialId || form.quantity <= 0) return;
    setSaving(true);
    try {
      await createQCInspection({
        inspectionNumber: `QC-${Date.now().toString(36).toUpperCase()}`,
        materialId: form.materialId,
        materialName: selectedMat?.name || '',
        batchNumber: form.batchNumber || undefined,
        quantity: form.quantity,
        unit: selectedMat?.unit || 'Pcs',
        inspectionType: form.inspectionType,
        inspector: userName,
        status: 'pending',
        tests: [],
        remarks: form.notes,
        acceptedQty: 0,
        rejectedQty: 0,
        reworkQty: 0
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('QC inspection error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalWrapper title="New QC Inspection" icon={<FileCheck className="w-5 h-5 text-emerald-400" />} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Material *</label>
          <select value={form.materialId} onChange={e => setForm({ ...form, materialId: e.target.value })} className="input-style">
            <option value="">Select material</option>
            {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.code})</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Batch Number</label>
            <input value={form.batchNumber} onChange={e => setForm({ ...form, batchNumber: e.target.value })}
              className="input-style" placeholder="Optional" />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Quantity *</label>
            <input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: Number(e.target.value) })}
              className="input-style" />
          </div>
        </div>

        <div>
          <label className="block text-xs text-zinc-400 mb-1">Inspection Type *</label>
          <div className="grid grid-cols-2 gap-2">
            {(['incoming', 'in_process', 'final', 'periodic'] as const).map(t => (
              <button key={t} onClick={() => setForm({ ...form, inspectionType: t })}
                className={`p-3 rounded-xl text-xs font-medium border transition-all capitalize ${
                  form.inspectionType === t
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                    : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10'
                }`}>
                {t.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-zinc-400 mb-1">Notes</label>
          <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
            className="input-style min-h-[80px] resize-none" placeholder="Additional inspection notes..." />
        </div>
      </div>

      <FormActions onClose={onClose} onSave={handleSubmit} saving={saving}
        disabled={!form.materialId || form.quantity <= 0} saveLabel="Create Inspection" />
    </ModalWrapper>
  );
}

// ==========================================
// VENDOR RETURN FORM
// ==========================================

export function VendorReturnForm({ materials, userName, onClose, onSuccess }: FormModalProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    materialId: '',
    supplierName: '',
    quantity: 0,
    returnReason: 'defective' as 'defective' | 'wrong_item' | 'excess' | 'expired' | 'damaged' | 'other',
    description: ''
  });
  const selectedMat = materials.find(m => m.id === form.materialId);

  const handleSubmit = async () => {
    if (!form.materialId || !form.supplierName || form.quantity <= 0) return;
    setSaving(true);
    try {
      await createVendorReturn({
        returnNumber: `VR-${Date.now().toString(36).toUpperCase()}`,
        grnId: '',
        vendorId: '',
        vendorName: form.supplierName,
        items: [{
          materialId: form.materialId,
          materialName: selectedMat?.name || '',
          returnQty: form.quantity,
          unit: selectedMat?.unit || 'Pcs',
          unitPrice: 0,
          totalValue: 0
        }],
        reason: form.returnReason === 'defective' ? 'quality_issue' : form.returnReason === 'wrong_item' ? 'wrong_item' : form.returnReason === 'damaged' ? 'damaged' : form.returnReason === 'excess' ? 'excess_quantity' : 'other',
        description: form.description,
        initiatedBy: userName,
        status: 'initiated'
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Vendor return error:', err);
    } finally {
      setSaving(false);
    }
  };

  const returnReasons = [
    { value: 'defective', label: 'Defective', icon: '🔴' },
    { value: 'wrong_item', label: 'Wrong Item', icon: '🔄' },
    { value: 'excess', label: 'Excess Supply', icon: '📦' },
    { value: 'expired', label: 'Expired', icon: '⏰' },
    { value: 'damaged', label: 'Damaged', icon: '💔' },
    { value: 'other', label: 'Other', icon: '📝' },
  ];

  return (
    <ModalWrapper title="New Vendor Return" icon={<RotateCcw className="w-5 h-5 text-orange-400" />} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Material *</label>
          <select value={form.materialId} onChange={e => {
            const mat = materials.find(m => m.id === e.target.value);
            setForm({ ...form, materialId: e.target.value, supplierName: (mat?.supplier as string) || '' });
          }} className="input-style">
            <option value="">Select material</option>
            {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.code})</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Supplier *</label>
            <input value={form.supplierName} onChange={e => setForm({ ...form, supplierName: e.target.value })}
              className="input-style" placeholder="Supplier name" />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Quantity *</label>
            <input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: Number(e.target.value) })}
              className="input-style" />
          </div>
        </div>

        <div>
          <label className="block text-xs text-zinc-400 mb-1">Return Reason *</label>
          <div className="grid grid-cols-3 gap-2">
            {returnReasons.map(r => (
              <button key={r.value} onClick={() => setForm({ ...form, returnReason: r.value as typeof form.returnReason })}
                className={`p-3 rounded-xl text-xs font-medium border transition-all text-center ${
                  form.returnReason === r.value
                    ? 'bg-orange-500/20 border-orange-500/40 text-orange-400'
                    : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10'
                }`}>
                <span className="text-base block mb-1">{r.icon}</span>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-zinc-400 mb-1">Description</label>
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            className="input-style min-h-[80px] resize-none" placeholder="Describe the issue in detail..." />
        </div>
      </div>

      <FormActions onClose={onClose} onSave={handleSubmit} saving={saving}
        disabled={!form.materialId || !form.supplierName || form.quantity <= 0} saveLabel="Initiate Return" />
    </ModalWrapper>
  );
}

// ==========================================
// SHARED COMPONENTS
// ==========================================

function ModalWrapper({ title, icon, onClose, children }: { title: string; icon: React.ReactNode; onClose: () => void; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-4"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/5">{icon}</div>
            <h2 className="text-lg font-bold">{title}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-zinc-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </motion.div>
    </motion.div>
  );
}

function FormActions({ onClose, onSave, saving, disabled, saveLabel = 'Save' }: {
  onClose: () => void; onSave: () => void; saving: boolean; disabled: boolean; saveLabel?: string;
}) {
  return (
    <div className="flex gap-2 pt-4 mt-4 border-t border-white/5">
      <button onClick={onClose} className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-sm transition-all">
        Cancel
      </button>
      <button onClick={onSave} disabled={saving || disabled}
        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-medium transition-all disabled:opacity-50">
        {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saving ? 'Saving...' : saveLabel}
      </button>
    </div>
  );
}

// ==========================================
// SHARED CSS CLASS (use in parent or globals.css)
// ==========================================
// .input-style => w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-blue-500
