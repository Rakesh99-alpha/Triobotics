/**
 * Material Return Form & Expiry Control Panel
 *
 * Return SOP: Unused material returns with Job#, Batch, Qty, Condition → stock updates
 * Expiry SOP: 30 days → inform production, 7 days → priority usage, Expired → block issue
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  X,
  Save,
  RefreshCw,
  Ban,
  Zap,
  Info,
  CalendarClock
} from 'lucide-react';
import { collection, addDoc, doc, updateDoc, increment, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

// ==========================================
// TYPES
// ==========================================

interface MaterialData {
  id: string;
  name?: string;
  code?: string;
  unit?: string;
  current_stock?: number;
  purchase_price?: number;
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

// ==========================================
// MATERIAL RETURN FORM
// ==========================================

export interface ReturnSuccessData {
  materialName: string;
  materialCode: string;
  quantity: number;
  unit: string;
  condition: 'good' | 'damaged' | 'partial';
}

interface ReturnFormProps {
  materials: MaterialData[];
  userName: string;
  onClose: () => void;
  onSuccess?: (data: ReturnSuccessData) => void;
}

export function MaterialReturnForm({ materials, userName, onClose, onSuccess }: ReturnFormProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [materialId, setMaterialId] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [jobNumber, setJobNumber] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [condition, setCondition] = useState<'good' | 'damaged' | 'partial'>('good');
  const [remarks, setRemarks] = useState('');

  const selectedMat = materials.find(m => m.id === materialId);

  const handleSave = async () => {
    if (!materialId || quantity <= 0 || !jobNumber) return;
    setSaving(true);
    try {
      const returnNumber = `RET-${Date.now().toString(36).toUpperCase()}`;

      // 1. Create return record
      await addDoc(collection(db, 'material_returns'), {
        return_number: returnNumber,
        material_id: materialId,
        material_name: selectedMat?.name || '',
        material_code: selectedMat?.code || '',
        quantity,
        unit: selectedMat?.unit || '',
        job_number: jobNumber,
        batch_number: batchNumber,
        condition,
        remarks,
        returned_by: userName,
        returned_at: new Date().toISOString(),
      });

      // 2. Increment stock if condition is good
      if (condition === 'good') {
        await updateDoc(doc(db, 'inventory_materials', materialId), {
          current_stock: increment(quantity),
          updated_at: new Date().toISOString(),
        });
      }

      // 3. Record movement
      await addDoc(collection(db, 'stock_movements'), {
        date: new Date().toISOString(),
        materialId,
        materialName: selectedMat?.name || '',
        type: 'return',
        quantity: condition === 'good' ? quantity : 0,
        unit: selectedMat?.unit || '',
        reference: returnNumber,
        value: quantity * (selectedMat?.purchase_price || 0),
      });

      setSaved(true);
      // Pass return data back to parent for auto-stock-update
      onSuccess?.({
        materialName: selectedMat?.name || '',
        materialCode: selectedMat?.code || '',
        quantity,
        unit: selectedMat?.unit || '',
        condition,
      });
    } catch (err) {
      console.error('Return error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}>

        <div className="p-5 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10"><RotateCcw className="w-5 h-5 text-cyan-400" /></div>
            <div>
              <h2 className="text-lg font-bold">Return Material</h2>
              <p className="text-[10px] text-zinc-500">Unused material → Job# · Batch · Qty · Condition → Stock updated</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {saved ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 space-y-3">
              <CheckCircle2 className="w-14 h-14 text-green-400 mx-auto" />
              <h3 className="text-lg font-bold">Material Returned!</h3>
              <p className="text-sm text-zinc-400">{quantity} {selectedMat?.unit} of {selectedMat?.name}</p>
              {condition === 'good' ? <p className="text-xs text-green-400">Stock updated (+{quantity})</p> : <p className="text-xs text-yellow-400">Condition: {condition} — stock not updated</p>}
              <button onClick={onClose} className="mt-4 px-6 py-2.5 bg-blue-600 rounded-xl text-sm font-medium">Close</button>
            </motion.div>
          ) : (
            <>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Material *</label>
                <select value={materialId} onChange={e => setMaterialId(e.target.value)} className="input-style">
                  <option value="">Select material</option>
                  {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.code})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs text-zinc-400 mb-1">Job Number *</label>
                  <input value={jobNumber} onChange={e => setJobNumber(e.target.value)} className="input-style" placeholder="JC-2026-001" /></div>
                <div><label className="block text-xs text-zinc-400 mb-1">Batch Number</label>
                  <input value={batchNumber} onChange={e => setBatchNumber(e.target.value)} className="input-style" placeholder="BTH-xxx" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs text-zinc-400 mb-1">Quantity *</label>
                  <input type="number" value={quantity} onChange={e => setQuantity(Number(e.target.value))} className="input-style" min={0} /></div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Condition *</label>
                  <div className="flex gap-2">
                    {(['good', 'damaged', 'partial'] as const).map(c => (
                      <button key={c} onClick={() => setCondition(c)}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium border capitalize transition-all ${
                          condition === c
                            ? c === 'good' ? 'bg-green-500/20 border-green-500/30 text-green-400'
                              : c === 'damaged' ? 'bg-red-500/20 border-red-500/30 text-red-400'
                              : 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400'
                            : 'bg-white/5 border-white/10 text-zinc-500'
                        }`}>{c}</button>
                    ))}
                  </div>
                </div>
              </div>
              {condition === 'damaged' && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/15">
                  <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                  <p className="text-[10px] text-yellow-300">Damaged material will NOT be added back to stock. Consider scrap entry.</p>
                </div>
              )}
              <div><label className="block text-xs text-zinc-400 mb-1">Remarks</label>
                <textarea value={remarks} onChange={e => setRemarks(e.target.value)} className="input-style min-h-[60px] resize-none text-xs" /></div>
            </>
          )}
        </div>

        {!saved && (
          <div className="p-5 border-t border-white/10 flex justify-between shrink-0">
            <button onClick={onClose} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm">Cancel</button>
            <button onClick={handleSave} disabled={saving || !materialId || !jobNumber || quantity <= 0}
              className="flex items-center gap-2 px-5 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-sm font-medium disabled:opacity-40">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Return Material'}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ==========================================
// EXPIRY CONTROL PANEL (Inline component)
// ==========================================

interface ExpiryControlProps {
  materials: MaterialData[];
}

export function ExpiryControlPanel({ materials }: ExpiryControlProps) {
  const [batches, setBatches] = useState<BatchData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'inventory_batches'), (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as BatchData)).filter(b => b.expiryDate);
      items.sort((a, b) => new Date(a.expiryDate!).getTime() - new Date(b.expiryDate!).getTime());
      setBatches(items);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const today = new Date();

  const expired = batches.filter(b => new Date(b.expiryDate!) < today);
  const within7 = batches.filter(b => {
    const exp = new Date(b.expiryDate!);
    const diff = (exp.getTime() - today.getTime()) / 86400000;
    return diff >= 0 && diff <= 7;
  });
  const within30 = batches.filter(b => {
    const exp = new Date(b.expiryDate!);
    const diff = (exp.getTime() - today.getTime()) / 86400000;
    return diff > 7 && diff <= 30;
  });

  const getMaterialName = (id: string) => materials.find(m => m.id === id)?.name || 'Unknown';

  if (loading) return <div className="text-center py-6"><RefreshCw className="w-6 h-6 animate-spin text-blue-400 mx-auto" /></div>;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Alert Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/15 text-center">
          <Ban className="w-5 h-5 text-red-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-red-400">{expired.length}</p>
          <p className="text-[10px] text-red-400/70">EXPIRED — Block Issue</p>
        </div>
        <div className="bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/15 text-center">
          <Zap className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-yellow-400">{within7.length}</p>
          <p className="text-[10px] text-yellow-400/70">≤ 7 Days — Priority Usage</p>
        </div>
        <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/15 text-center">
          <Info className="w-5 h-5 text-blue-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-blue-400">{within30.length}</p>
          <p className="text-[10px] text-blue-400/70">≤ 30 Days — Inform Production</p>
        </div>
      </div>

      {/* Expired Items */}
      {expired.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-red-400 mb-2 flex items-center gap-1"><Ban className="w-3 h-3" /> Expired — Issue Blocked</h4>
          <div className="space-y-1.5">
            {expired.map(b => (
              <div key={b.id} className="flex items-center justify-between p-3 bg-red-500/5 rounded-lg border border-red-500/10 text-xs">
                <div>
                  <span className="text-zinc-300 font-medium">{getMaterialName(b.materialId)}</span>
                  <span className="text-zinc-500 ml-2 font-mono">{b.batchNumber}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-zinc-400">Qty: {b.quantity}</span>
                  <span className="text-red-400 font-medium">Exp: {new Date(b.expiryDate!).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Within 7 Days */}
      {within7.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-yellow-400 mb-2 flex items-center gap-1"><Zap className="w-3 h-3" /> Expiring ≤ 7 Days — Priority Usage</h4>
          <div className="space-y-1.5">
            {within7.map(b => {
              const diff = Math.ceil((new Date(b.expiryDate!).getTime() - today.getTime()) / 86400000);
              return (
                <div key={b.id} className="flex items-center justify-between p-3 bg-yellow-500/5 rounded-lg border border-yellow-500/10 text-xs">
                  <div>
                    <span className="text-zinc-300 font-medium">{getMaterialName(b.materialId)}</span>
                    <span className="text-zinc-500 ml-2 font-mono">{b.batchNumber}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-400">Qty: {b.quantity}</span>
                    <span className="text-yellow-400 font-medium">{diff}d left</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Within 30 Days */}
      {within30.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-blue-400 mb-2 flex items-center gap-1"><CalendarClock className="w-3 h-3" /> Expiring ≤ 30 Days — Inform Production</h4>
          <div className="space-y-1.5">
            {within30.map(b => {
              const diff = Math.ceil((new Date(b.expiryDate!).getTime() - today.getTime()) / 86400000);
              return (
                <div key={b.id} className="flex items-center justify-between p-3 bg-blue-500/5 rounded-lg border border-blue-500/10 text-xs">
                  <div>
                    <span className="text-zinc-300 font-medium">{getMaterialName(b.materialId)}</span>
                    <span className="text-zinc-500 ml-2 font-mono">{b.batchNumber}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-400">Qty: {b.quantity}</span>
                    <span className="text-blue-400">{diff}d left</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {expired.length === 0 && within7.length === 0 && within30.length === 0 && (
        <div className="text-center py-8">
          <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-2" />
          <p className="text-sm text-zinc-400">All batches are within safe expiry range</p>
        </div>
      )}
    </motion.div>
  );
}
