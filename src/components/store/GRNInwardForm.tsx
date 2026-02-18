/**
 * GRN (Goods Receipt Note) Inward Form - Store Employee SOP
 *
 * Step-by-step: Receive → Check PO → Inspect → QC → Weigh/Count →
 *               Create GRN → Label → Assign Location → Update ERP
 *
 * ❌ Material cannot enter store without GRN
 */

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ArrowLeft,
  Package,
  ClipboardCheck,
  Scale,
  FileText,
  Tag,
  CheckCircle2,
  AlertTriangle,
  X,
  Save,
  RefreshCw,
  Truck
} from 'lucide-react';
import { collection, addDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

// ==========================================
// TYPES
// ==========================================

interface GRNItem {
  materialId: string;
  materialName: string;
  code: string;
  orderedQty: number;
  receivedQty: number;
  unit: string;
  unitPrice: number;
  qualityStatus: 'pending' | 'passed' | 'failed' | 'partial';
  batchNumber: string;
  expiryDate: string;
  binLocation: string;
  remarks: string;
}

interface MaterialData {
  id: string;
  name?: string;
  code?: string;
  unit?: string;
  purchase_price?: number;
  supplier?: string;
  location?: string;
  bin_location?: string;
  [key: string]: unknown;
}

export interface GRNSuccessItem {
  materialName: string;
  code: string;
  receivedQty: number;
  unit: string;
  unitPrice: number;
  binLocation: string;
}

interface GRNFormProps {
  materials: MaterialData[];
  userName: string;
  onClose: () => void;
  onSuccess?: (acceptedItems: GRNSuccessItem[]) => void;
}

// ==========================================
// GRN FORM STEPS
// ==========================================

const STEPS = [
  { id: 1, label: 'Supplier & PO', icon: Truck, desc: 'Receive material at gate' },
  { id: 2, label: 'Items & Inspect', icon: ClipboardCheck, desc: 'Check against PO & inspect' },
  { id: 3, label: 'QC & Weigh', icon: Scale, desc: 'Quality verification & count' },
  { id: 4, label: 'Label & Locate', icon: Tag, desc: 'Label & assign bin location' },
  { id: 5, label: 'Review & Save', icon: FileText, desc: 'Create GRN & update ERP' },
];

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function GRNInwardForm({ materials, userName, onClose, onSuccess }: GRNFormProps) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Form state
  const [supplierName, setSupplierName] = useState('');
  const [poNumber, setPONumber] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [inspectorName, setInspectorName] = useState(userName);
  const [items, setItems] = useState<GRNItem[]>([]);
  const [remarks, setRemarks] = useState('');

  // Generate GRN number
  const grnNumber = `GRN-${Date.now().toString(36).toUpperCase()}`;

  const addItem = () => {
    setItems([...items, {
      materialId: '', materialName: '', code: '', orderedQty: 0,
      receivedQty: 0, unit: '', unitPrice: 0,
      qualityStatus: 'pending', batchNumber: '', expiryDate: '',
      binLocation: '', remarks: ''
    }]);
  };

  const updateItem = (idx: number, updates: Partial<GRNItem>) => {
    setItems(items.map((item, i) => i === idx ? { ...item, ...updates } : item));
  };

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const selectMaterial = (idx: number, matId: string) => {
    const mat = materials.find(m => m.id === matId);
    if (mat) {
      updateItem(idx, {
        materialId: mat.id,
        materialName: mat.name || '',
        code: mat.code || '',
        unit: mat.unit || 'Pcs',
        unitPrice: mat.purchase_price || 0,
        binLocation: (mat.bin_location as string) || (mat.location as string) || '',
      });
    }
  };

  const canProceed = () => {
    if (step === 1) return supplierName && poNumber;
    if (step === 2) return items.length > 0 && items.every(i => i.materialId && i.receivedQty > 0);
    if (step === 3) return items.every(i => i.qualityStatus !== 'pending' || i.qualityStatus === 'pending');
    if (step === 4) return items.every(i => i.binLocation);
    return true;
  };

  const totalValue = items.reduce((s, i) => s + (i.receivedQty * i.unitPrice), 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Create GRN document
      const grnData = {
        grnNumber,
        supplierName,
        poNumber,
        invoiceNumber,
        invoiceDate,
        vehicleNumber,
        inspectorName,
        items: items.map(i => ({
          materialId: i.materialId,
          materialName: i.materialName,
          code: i.code,
          orderedQty: i.orderedQty,
          receivedQty: i.receivedQty,
          unit: i.unit,
          unitPrice: i.unitPrice,
          totalValue: i.receivedQty * i.unitPrice,
          qualityStatus: i.qualityStatus,
          batchNumber: i.batchNumber,
          expiryDate: i.expiryDate,
          binLocation: i.binLocation,
          remarks: i.remarks,
        })),
        totalItems: items.length,
        totalValue,
        receivedBy: userName,
        status: items.some(i => i.qualityStatus === 'failed') ? 'partial' : 'completed',
        remarks,
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'goods_receipts'), grnData);

      // 2. Update stock for each accepted item
      for (const item of items) {
        if (item.qualityStatus !== 'failed' && item.receivedQty > 0) {
          // Update material: increment current_stock
          const matRef = doc(db, 'inventory_materials', item.materialId);
          await updateDoc(matRef, {
            current_stock: increment(item.receivedQty),
            bin_location: item.binLocation,
            updated_at: new Date().toISOString(),
          });

          // Record purchase entry  
          await addDoc(collection(db, 'inventory_purchase_entries'), {
            material_id: item.materialId,
            material_name: item.materialName,
            material_code: item.code,
            quantity: item.receivedQty,
            unit: item.unit,
            unit_price: item.unitPrice,
            total_value: item.receivedQty * item.unitPrice,
            supplier: supplierName,
            grn_number: grnNumber,
            po_number: poNumber,
            batch_number: item.batchNumber,
            quality_status: item.qualityStatus,
            bin_location: item.binLocation,
            entered_by: userName,
            date: new Date().toISOString(),
          });

          // 3. Create batch entry if batch number provided
          if (item.batchNumber) {
            await addDoc(collection(db, 'inventory_batches'), {
              batchNumber: item.batchNumber,
              materialId: item.materialId,
              quantity: item.receivedQty,
              expiryDate: item.expiryDate || null,
              supplier: supplierName,
              location: item.binLocation,
              qualityStatus: item.qualityStatus === 'passed' ? 'passed' : 'pending',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }

          // 4. Record stock movement
          await addDoc(collection(db, 'stock_movements'), {
            date: new Date().toISOString(),
            materialId: item.materialId,
            materialName: item.materialName,
            type: 'purchase',
            quantity: item.receivedQty,
            unit: item.unit,
            reference: grnNumber,
            value: item.receivedQty * item.unitPrice,
          });
        }
      }

      setSaved(true);
      // Pass accepted items data back to parent for auto-stock-update
      const acceptedItems: GRNSuccessItem[] = items
        .filter(i => i.qualityStatus !== 'failed' && i.receivedQty > 0)
        .map(i => ({
          materialName: i.materialName,
          code: i.code,
          receivedQty: i.receivedQty,
          unit: i.unit,
          unitPrice: i.unitPrice,
          binLocation: i.binLocation,
        }));
      onSuccess?.(acceptedItems);
    } catch (err) {
      console.error('GRN save error:', err);
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
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-green-500/10"><Package className="w-5 h-5 text-green-400" /></div>
            <div>
              <h2 className="text-lg font-bold">GRN — Material Inward</h2>
              <p className="text-xs text-zinc-500">{grnNumber}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {/* Step Indicators */}
        <div className="px-5 py-3 border-b border-white/5 flex gap-1 shrink-0 overflow-x-auto">
          {STEPS.map(s => {
            const active = s.id === step;
            const done = s.id < step || saved;
            return (
              <button key={s.id} onClick={() => !saved && s.id <= step && setStep(s.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  done ? 'bg-green-500/15 text-green-400' : active ? 'bg-blue-500/15 text-blue-400' : 'bg-white/5 text-zinc-500'
                }`}>
                {done && !active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <s.icon className="w-3.5 h-3.5" />}
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          <AnimatePresence mode="wait">
            {saved ? (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12 space-y-3">
                <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto" />
                <h3 className="text-xl font-bold">GRN Created Successfully!</h3>
                <p className="text-sm text-zinc-400">{grnNumber} — {items.length} items received</p>
                <p className="text-xs text-zinc-500">Stock updated • Batch entries created • Movement logged</p>
                <button onClick={onClose} className="mt-4 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-medium">Close</button>
              </motion.div>
            ) : step === 1 ? (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <p className="text-xs text-zinc-400 mb-2">Step 1: Enter supplier & PO details. Material cannot enter store without GRN.</p>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs text-zinc-400 mb-1">Supplier Name *</label>
                    <input value={supplierName} onChange={e => setSupplierName(e.target.value)} className="input-style" placeholder="e.g. Huntsman Chemicals" /></div>
                  <div><label className="block text-xs text-zinc-400 mb-1">PO Number *</label>
                    <input value={poNumber} onChange={e => setPONumber(e.target.value)} className="input-style" placeholder="e.g. PO-2026-001" /></div>
                  <div><label className="block text-xs text-zinc-400 mb-1">Invoice Number</label>
                    <input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} className="input-style" /></div>
                  <div><label className="block text-xs text-zinc-400 mb-1">Invoice Date</label>
                    <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className="input-style" /></div>
                  <div><label className="block text-xs text-zinc-400 mb-1">Vehicle Number</label>
                    <input value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value)} className="input-style" placeholder="e.g. TN-01-AB-1234" /></div>
                  <div><label className="block text-xs text-zinc-400 mb-1">Inspector Name</label>
                    <input value={inspectorName} onChange={e => setInspectorName(e.target.value)} className="input-style" /></div>
                </div>
              </motion.div>
            ) : step === 2 ? (
              <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-zinc-400">Step 2: Add items — check against PO & physical inspection</p>
                  <button onClick={addItem} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-medium">+ Add Item</button>
                </div>
                {items.map((item, idx) => (
                  <div key={idx} className="bg-white/[0.03] rounded-xl p-4 border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-400 font-medium">Item {idx + 1}</span>
                      <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-300"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="block text-[10px] text-zinc-500 mb-0.5">Material *</label>
                        <select value={item.materialId} onChange={e => selectMaterial(idx, e.target.value)} className="input-style text-xs">
                          <option value="">Select material</option>
                          {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.code})</option>)}
                        </select>
                      </div>
                      <div><label className="block text-[10px] text-zinc-500 mb-0.5">Ordered Qty</label>
                        <input type="number" value={item.orderedQty} onChange={e => updateItem(idx, { orderedQty: Number(e.target.value) })} className="input-style text-xs" /></div>
                      <div><label className="block text-[10px] text-zinc-500 mb-0.5">Received Qty *</label>
                        <input type="number" value={item.receivedQty} onChange={e => updateItem(idx, { receivedQty: Number(e.target.value) })} className="input-style text-xs" /></div>
                      <div><label className="block text-[10px] text-zinc-500 mb-0.5">Unit Price</label>
                        <input type="number" value={item.unitPrice} onChange={e => updateItem(idx, { unitPrice: Number(e.target.value) })} className="input-style text-xs" /></div>
                      <div><label className="block text-[10px] text-zinc-500 mb-0.5">Batch Number</label>
                        <input value={item.batchNumber} onChange={e => updateItem(idx, { batchNumber: e.target.value })} className="input-style text-xs" placeholder="e.g. BTH-2026-001" /></div>
                    </div>
                  </div>
                ))}
                {items.length === 0 && <p className="text-center text-xs text-zinc-500 py-8">Click &quot;+ Add Item&quot; to add materials for this GRN</p>}
              </motion.div>
            ) : step === 3 ? (
              <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <p className="text-xs text-zinc-400">Step 3: Quality verification — set status for each item. Expiry date if applicable.</p>
                {items.map((item, idx) => (
                  <div key={idx} className="bg-white/[0.03] rounded-xl p-4 border border-white/5 space-y-3">
                    <p className="text-xs text-zinc-300 font-medium">{item.materialName} ({item.code}) — {item.receivedQty} {item.unit}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-zinc-500 mb-0.5">Quality Status *</label>
                        <div className="grid grid-cols-2 gap-1.5">
                          {(['passed', 'failed', 'partial', 'pending'] as const).map(qs => (
                            <button key={qs} onClick={() => updateItem(idx, { qualityStatus: qs })}
                              className={`py-1.5 rounded-lg text-[10px] font-medium border capitalize transition-all ${
                                item.qualityStatus === qs
                                  ? qs === 'passed' ? 'bg-green-500/20 border-green-500/30 text-green-400'
                                    : qs === 'failed' ? 'bg-red-500/20 border-red-500/30 text-red-400'
                                    : qs === 'partial' ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400'
                                    : 'bg-blue-500/20 border-blue-500/30 text-blue-400'
                                  : 'bg-white/5 border-white/10 text-zinc-500 hover:bg-white/10'
                              }`}>{qs}</button>
                          ))}
                        </div>
                      </div>
                      <div><label className="block text-[10px] text-zinc-500 mb-0.5">Expiry Date</label>
                        <input type="date" value={item.expiryDate} onChange={e => updateItem(idx, { expiryDate: e.target.value })} className="input-style text-xs" /></div>
                    </div>
                    {item.qualityStatus === 'failed' && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        <p className="text-[10px] text-red-400">This item will NOT be added to stock. Consider vendor return.</p>
                      </div>
                    )}
                  </div>
                ))}
              </motion.div>
            ) : step === 4 ? (
              <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <p className="text-xs text-zinc-400 mb-1">Step 4: Assign bin location (ZONE-RACK-SHELF-POS). e.g. RM-A-02-03, CHEM-C-01-01</p>
                {items.filter(i => i.qualityStatus !== 'failed').map((item) => {
                  const realIdx = items.indexOf(item);
                  return (
                    <div key={realIdx} className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
                      <p className="text-xs text-zinc-300 font-medium mb-2">{item.materialName} — {item.receivedQty} {item.unit}</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="block text-[10px] text-zinc-500 mb-0.5">Bin Location *</label>
                          <input value={item.binLocation} onChange={e => updateItem(realIdx, { binLocation: e.target.value.toUpperCase() })}
                            className="input-style text-xs font-mono" placeholder="ZONE-RACK-SHELF-POS" /></div>
                        <div><label className="block text-[10px] text-zinc-500 mb-0.5">Remarks</label>
                          <input value={item.remarks} onChange={e => updateItem(realIdx, { remarks: e.target.value })}
                            className="input-style text-xs" placeholder="Optional notes" /></div>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            ) : step === 5 ? (
              <motion.div key="s5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <p className="text-xs text-zinc-400 mb-1">Step 5: Review GRN details before saving to ERP</p>
                {/* Summary */}
                <div className="bg-gradient-to-br from-white/5 to-white/[0.02] rounded-xl p-4 border border-white/10 space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-zinc-500">GRN #:</span> <span className="text-white font-mono">{grnNumber}</span></div>
                    <div><span className="text-zinc-500">Supplier:</span> <span className="text-zinc-300">{supplierName}</span></div>
                    <div><span className="text-zinc-500">PO #:</span> <span className="text-zinc-300">{poNumber}</span></div>
                    <div><span className="text-zinc-500">Invoice:</span> <span className="text-zinc-300">{invoiceNumber || '-'}</span></div>
                    <div><span className="text-zinc-500">Inspector:</span> <span className="text-zinc-300">{inspectorName}</span></div>
                    <div><span className="text-zinc-500">Total Value:</span> <span className="text-green-400 font-bold">₹{totalValue.toLocaleString()}</span></div>
                  </div>
                </div>
                {/* Items table */}
                <div className="bg-white/[0.03] rounded-xl border border-white/5 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-white/5">
                      <tr>
                        <th className="text-left px-3 py-2 text-zinc-400">Material</th>
                        <th className="text-right px-3 py-2 text-zinc-400">Qty</th>
                        <th className="text-center px-3 py-2 text-zinc-400">QC</th>
                        <th className="text-left px-3 py-2 text-zinc-400">Batch</th>
                        <th className="text-left px-3 py-2 text-zinc-400">Location</th>
                        <th className="text-right px-3 py-2 text-zinc-400">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {items.map((item, idx) => (
                        <tr key={idx} className={item.qualityStatus === 'failed' ? 'opacity-40 line-through' : ''}>
                          <td className="px-3 py-2 text-zinc-300">{item.materialName}</td>
                          <td className="px-3 py-2 text-right text-zinc-300">{item.receivedQty} {item.unit}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              item.qualityStatus === 'passed' ? 'bg-green-500/20 text-green-400'
                                : item.qualityStatus === 'failed' ? 'bg-red-500/20 text-red-400'
                                : 'bg-yellow-500/20 text-yellow-400'
                            }`}>{item.qualityStatus}</span>
                          </td>
                          <td className="px-3 py-2 text-zinc-400 font-mono">{item.batchNumber || '-'}</td>
                          <td className="px-3 py-2 text-zinc-400 font-mono">{item.binLocation}</td>
                          <td className="px-3 py-2 text-right text-zinc-300">₹{(item.receivedQty * item.unitPrice).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div><label className="block text-xs text-zinc-400 mb-1">GRN Remarks</label>
                  <textarea value={remarks} onChange={e => setRemarks(e.target.value)} className="input-style min-h-[60px] resize-none text-xs" placeholder="Overall GRN notes..." /></div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        {!saved && (
          <div className="p-5 border-t border-white/10 flex items-center justify-between shrink-0">
            <button onClick={() => step > 1 ? setStep(step - 1) : onClose()}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm transition-all">
              <ArrowLeft className="w-4 h-4" /> {step === 1 ? 'Cancel' : 'Back'}
            </button>
            {step < 5 ? (
              <button onClick={() => setStep(step + 1)} disabled={!canProceed()}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-medium transition-all disabled:opacity-40">
                Next <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-500 rounded-xl text-sm font-medium transition-all disabled:opacity-50">
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Create GRN & Update Stock'}
              </button>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
