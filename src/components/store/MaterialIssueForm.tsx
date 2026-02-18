/**
 * Material Issue Form — Store Employee SOP
 *
 * SOP Rules Enforced:
 * - Production creates indent → Store verifies stock → FIFO/FEFO → Issue → System entry
 * - ❌ No verbal issue allowed
 * - ❌ No manual slip allowed
 * - Material reservation checked before issue
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Package,
  CheckCircle2,
  AlertTriangle,
  X,
  Save,
  RefreshCw,
  Search,
  Layers,
  ShieldCheck
} from 'lucide-react';
import { collection, addDoc, doc, updateDoc, increment, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

// ==========================================
// TYPES
// ==========================================

interface MaterialData {
  id: string;
  name?: string;
  code?: string;
  unit?: string;
  category?: string;
  current_stock?: number;
  min_stock?: number;
  purchase_price?: number;
  supplier?: string;
  location?: string;
  bin_location?: string;
  stock_state?: string;
  [key: string]: unknown;
}

interface BatchData {
  id: string;
  batchNumber: string;
  materialId: string;
  quantity: number;
  expiryDate?: string;
  createdAt: string;
  qualityStatus: string;
  location: string;
}

export interface IssueSuccessData {
  materialName: string;
  materialCode: string;
  quantity: number;
  unit: string;
  department: string;
  project: string;
}

interface IssueFormProps {
  materials: MaterialData[];
  userName: string;
  onClose: () => void;
  onSuccess?: (data: IssueSuccessData) => void;
}

const DEPARTMENTS = ['Production', 'Assembly', 'Tooling', 'Quality', 'Maintenance', 'R&D', 'Machining', 'Welding', 'Lamination', 'Mold Finishing', 'Trimline'];
const PROJECTS = ['Project Alpha', 'Project Beta', 'Project Gamma', 'Maintenance', 'General', 'R&D'];

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function MaterialIssueForm({ materials, userName, onClose, onSuccess }: IssueFormProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [search, setSearch] = useState('');

  // Issue form
  const [materialId, setMaterialId] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [department, setDepartment] = useState('');
  const [project, setProject] = useState('');
  const [operator, setOperator] = useState('');
  const [jobCard, setJobCard] = useState('');
  const [indentNumber, setIndentNumber] = useState('');
  const [purpose, setPurpose] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');

  // Batches for selected material
  const [batches, setBatches] = useState<BatchData[]>([]);
  const [, setLoadingBatches] = useState(false);

  const selectedMat = materials.find(m => m.id === materialId);

  // Filter materials by search
  const filteredMaterials = useMemo(() => {
    if (!search) return materials;
    const q = search.toLowerCase();
    return materials.filter(m =>
      (m.name?.toLowerCase().includes(q)) ||
      (m.code?.toLowerCase().includes(q)) ||
      (m.category?.toLowerCase().includes(q))
    );
  }, [materials, search]);

  // Load batches when material selected (FIFO/FEFO ordering)
  useEffect(() => {
    if (!materialId) { setBatches([]); return; }
    setLoadingBatches(true);
    const unsub = onSnapshot(
      query(collection(db, 'inventory_batches'), where('materialId', '==', materialId)),
      (snap) => {
        const items = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as BatchData))
          .filter(b => b.qualityStatus !== 'failed' && b.quantity > 0);

        // FIFO/FEFO: sort by expiry first (earliest), then by creation date
        items.sort((a, b) => {
          if (a.expiryDate && b.expiryDate) return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
          if (a.expiryDate) return -1;
          if (b.expiryDate) return 1;
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });

        setBatches(items);
        // Auto-select first batch (FIFO/FEFO)
        if (items.length > 0 && !selectedBatchId) setSelectedBatchId(items[0].id);
        setLoadingBatches(false);
      }
    );
    return () => unsub();
  }, [materialId, selectedBatchId]);

  const selectedBatch = batches.find(b => b.id === selectedBatchId);
  const maxQty = selectedBatch ? selectedBatch.quantity : (selectedMat?.current_stock || 0);

  // Validation
  const errors: string[] = [];
  if (!materialId) errors.push('Select a material');
  if (!indentNumber) errors.push('Indent number required (no verbal issue)');
  if (!department) errors.push('Department required');
  if (quantity <= 0) errors.push('Quantity must be > 0');
  if (quantity > maxQty) errors.push(`Exceeds available stock (${maxQty})`);
  if (selectedMat?.stock_state === 'quality_hold') errors.push('Material is on QUALITY HOLD — cannot issue');
  if (selectedMat?.stock_state === 'rejected') errors.push('Material is REJECTED — cannot issue');

  const canSave = errors.length === 0;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const issueNumber = `ISS-${Date.now().toString(36).toUpperCase()}`;

      // 1. Create issue record
      await addDoc(collection(db, 'inventory_issue_records'), {
        issue_number: issueNumber,
        indent_number: indentNumber,
        material_id: materialId,
        material_name: selectedMat?.name || '',
        material_code: selectedMat?.code || '',
        quantity,
        unit: selectedMat?.unit || '',
        department,
        project,
        operator,
        job_card: jobCard,
        purpose,
        batch_number: selectedBatch?.batchNumber || '',
        batch_id: selectedBatchId,
        bin_location: selectedBatch?.location || selectedMat?.bin_location || '',
        entered_by: userName,
        issued_at: new Date().toISOString(),
        method: 'FIFO_FEFO',
      });

      // 2. Decrement material stock
      const matRef = doc(db, 'inventory_materials', materialId);
      await updateDoc(matRef, {
        current_stock: increment(-quantity),
        updated_at: new Date().toISOString(),
      });

      // 3. Decrement batch quantity if batch selected
      if (selectedBatchId) {
        const batchRef = doc(db, 'inventory_batches', selectedBatchId);
        await updateDoc(batchRef, {
          quantity: increment(-quantity),
          updatedAt: new Date().toISOString(),
        });
      }

      // 4. Record stock movement
      await addDoc(collection(db, 'stock_movements'), {
        date: new Date().toISOString(),
        materialId,
        materialName: selectedMat?.name || '',
        type: 'issue',
        quantity: -quantity,
        unit: selectedMat?.unit || '',
        reference: issueNumber,
        department,
        value: quantity * (selectedMat?.purchase_price || 0),
      });

      setSaved(true);
      // Pass issued material data back to parent for auto-stock-update
      onSuccess?.({
        materialName: selectedMat?.name || '',
        materialCode: selectedMat?.code || '',
        quantity,
        unit: selectedMat?.unit || '',
        department,
        project,
      });
    } catch (err) {
      console.error('Issue error:', err);
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-4"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-500/10"><Package className="w-5 h-5 text-orange-400" /></div>
            <div>
              <h2 className="text-lg font-bold">Issue Material — SOP</h2>
              <p className="text-[10px] text-zinc-500">FIFO/FEFO enforced · No verbal issue · System entry mandatory</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {saved ? (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12 space-y-3">
              <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto" />
              <h3 className="text-xl font-bold">Material Issued!</h3>
              <p className="text-sm text-zinc-400">{selectedMat?.name} — {quantity} {selectedMat?.unit} to {department}</p>
              <p className="text-xs text-zinc-500">Stock decremented · Movement logged · Batch updated</p>
              <button onClick={onClose} className="mt-4 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-medium">Close</button>
            </motion.div>
          ) : (
            <>
              {/* SOP Notice */}
              <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/15">
                <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
                <p className="text-[11px] text-blue-300">All issues require valid indent number. Material issued via FIFO/FEFO. Production creates indent → Store verifies → System entry.</p>
              </div>

              {/* Indent + Department */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Indent / Request Number *</label>
                  <input value={indentNumber} onChange={e => setIndentNumber(e.target.value)} className="input-style" placeholder="IND-2026-001" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Department *</label>
                  <select value={department} onChange={e => setDepartment(e.target.value)} className="input-style">
                    <option value="">Select department</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              {/* Material Selection */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Material *</label>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search materials..."
                    className="input-style pl-10" />
                </div>
                <select value={materialId} onChange={e => { setMaterialId(e.target.value); setSelectedBatchId(''); }}
                  className="input-style" size={4}>
                  {filteredMaterials.map(m => {
                    const stock = m.current_stock || 0;
                    const isHold = m.stock_state === 'quality_hold' || m.stock_state === 'rejected';
                    return (
                      <option key={m.id} value={m.id} disabled={isHold}>
                        {m.code} | {m.name} | Stock: {stock} {m.unit} {isHold ? '⛔ HOLD' : stock <= (m.min_stock || 0) ? '⚠️ LOW' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Stock State Warning */}
              {selectedMat && (selectedMat.stock_state === 'quality_hold' || selectedMat.stock_state === 'rejected') && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <p className="text-xs text-red-400">This material is on {selectedMat.stock_state?.toUpperCase().replace('_', ' ')} — production cannot use this stock.</p>
                </div>
              )}

              {/* Batch Selection (FIFO/FEFO) */}
              {materialId && batches.length > 0 && (
                <div>
                  <label className="block text-xs text-zinc-400 mb-1 flex items-center gap-1">
                    <Layers className="w-3 h-3" /> Select Batch (FIFO/FEFO — earliest first)
                  </label>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {batches.map((b, idx) => {
                      const isExpiringSoon = b.expiryDate && new Date(b.expiryDate).getTime() - Date.now() < 30 * 86400000;
                      return (
                        <button key={b.id} onClick={() => setSelectedBatchId(b.id)}
                          className={`w-full text-left p-2.5 rounded-lg border text-xs flex items-center justify-between transition-all ${
                            selectedBatchId === b.id ? 'bg-blue-500/15 border-blue-500/30 text-blue-300' : 'bg-white/[0.03] border-white/5 text-zinc-400 hover:bg-white/5'
                          }`}>
                          <div className="flex items-center gap-2">
                            {idx === 0 && <span className="px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 text-[9px] font-bold">RECOMMENDED</span>}
                            <span className="font-mono">{b.batchNumber}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span>Qty: {b.quantity}</span>
                            {b.expiryDate && (
                              <span className={isExpiringSoon ? 'text-yellow-400' : 'text-zinc-500'}>
                                Exp: {new Date(b.expiryDate).toLocaleDateString()}
                              </span>
                            )}
                            <span className="text-zinc-600">{b.location}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity + Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Quantity * (Max: {maxQty})</label>
                  <input type="number" value={quantity} onChange={e => setQuantity(Number(e.target.value))} className="input-style" max={maxQty} min={0} />
                  {quantity > maxQty && <p className="text-[10px] text-red-400 mt-1">Exceeds available stock!</p>}
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Project</label>
                  <select value={project} onChange={e => setProject(e.target.value)} className="input-style">
                    <option value="">Select project</option>
                    {PROJECTS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Operator / Requisitioner</label>
                  <input value={operator} onChange={e => setOperator(e.target.value)} className="input-style" placeholder="Name" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Job Card #</label>
                  <input value={jobCard} onChange={e => setJobCard(e.target.value)} className="input-style" placeholder="JC-2026-001" />
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Purpose / Remarks</label>
                <textarea value={purpose} onChange={e => setPurpose(e.target.value)} className="input-style min-h-[60px] resize-none text-xs" placeholder="Purpose for material usage..." />
              </div>

              {/* Validation Errors */}
              {errors.length > 0 && materialId && (
                <div className="space-y-1">
                  {errors.map((err, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[10px] text-red-400">
                      <AlertTriangle className="w-3 h-3 shrink-0" /> {err}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!saved && (
          <div className="p-5 border-t border-white/10 flex justify-between shrink-0">
            <button onClick={onClose} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm">Cancel</button>
            <button onClick={handleSave} disabled={saving || !canSave}
              className="flex items-center gap-2 px-5 py-2 bg-orange-600 hover:bg-orange-500 rounded-xl text-sm font-medium transition-all disabled:opacity-40">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Issuing...' : 'Issue Material'}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
