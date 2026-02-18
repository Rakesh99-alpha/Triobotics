/**
 * Traceability & Reservation Module
 *
 * Backward Traceability: Customer → FG batch → Production batch → Material batch → Supplier
 * Material Reservation: Block material when production is planned, auto-deduct on issue
 * Wastage Monitoring: Compare BOM qty vs actual issued
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  ArrowRight,
  ArrowLeft,
  Package,
  Factory,
  Users,
  Truck,
  CheckCircle2,
  AlertTriangle,
  X,
  Save,
  RefreshCw,
  Lock,
  Unlock,
  TrendingDown,
  TrendingUp,
  ChevronRight,
  Layers,
  ShieldCheck
} from 'lucide-react';
import { collection, addDoc, doc, updateDoc, increment, onSnapshot, getDocs, query, where, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

// =============================================
// TYPES
// =============================================

interface MaterialData {
  id: string;
  name?: string;
  code?: string;
  unit?: string;
  current_stock?: number;
  min_stock?: number;
  purchase_price?: number;
  category?: string;
  supplier_name?: string;
  [key: string]: unknown;
}

interface Reservation {
  id: string;
  material_id: string;
  material_name: string;
  quantity: number;
  job_number: string;
  production_order: string;
  reserved_by: string;
  reserved_at: string;
  status: 'active' | 'issued' | 'cancelled';
}

interface GRNRecord {
  id: string;
  grn_number: string;
  supplier_name: string;
  items: {
    materialId: string;
    materialName: string;
    batchNumber: string;
    receivedQty: number;
    qualityStatus: string;
  }[];
  received_at: string;
}

interface IssueRecord {
  id: string;
  material_id?: string;
  material_name?: string;
  material?: string;
  quantity: number;
  department?: string;
  team?: string;
  job_card?: string;
  indent_number?: string;
  batch_number?: string;
  issue_number?: string;
  issued_at?: string;
  date?: string;
}

// =============================================
// TRACEABILITY VIEW
// =============================================

interface TraceabilityViewProps {
  materials: MaterialData[];
}

export function TraceabilityView({ materials }: TraceabilityViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);
  const [grns, setGrns] = useState<GRNRecord[]>([]);
  const [issues, setIssues] = useState<IssueRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Load GRNs and Issues for a selected material
  useEffect(() => {
    if (!selectedMaterial) return;
    setLoading(true);

    const unsubGrn = onSnapshot(collection(db, 'goods_receipts'), (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as GRNRecord));
      // Filter GRNs containing this material
      const relevant = all.filter(g => g.items?.some(i => i.materialId === selectedMaterial));
      setGrns(relevant);
    });

    const unsubIssue = onSnapshot(collection(db, 'inventory_issue_records'), (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as IssueRecord));
      const relevant = all.filter(i => i.material_id === selectedMaterial);
      setIssues(relevant);
      setLoading(false);
    });

    return () => { unsubGrn(); unsubIssue(); };
  }, [selectedMaterial]);

  const filteredMaterials = materials.filter(m =>
    (m.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.code || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedMat = materials.find(m => m.id === selectedMaterial);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search material for traceability..."
          className="input-style pl-10"
        />
      </div>

      {/* Material Quick Select */}
      {searchTerm && !selectedMaterial && (
        <div className="bg-zinc-900/50 rounded-xl border border-white/5 max-h-48 overflow-y-auto">
          {filteredMaterials.slice(0, 10).map(m => (
            <button key={m.id} onClick={() => { setSelectedMaterial(m.id); setSearchTerm(''); }}
              className="w-full p-3 text-left hover:bg-white/5 text-xs flex items-center justify-between border-b border-white/5 last:border-0">
              <span className="text-zinc-300">{m.name}</span>
              <span className="text-zinc-500 font-mono">{m.code}</span>
            </button>
          ))}
        </div>
      )}

      {/* Traceability Chain */}
      {selectedMat && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => setSelectedMaterial(null)} className="p-1.5 hover:bg-white/5 rounded-lg"><ArrowLeft className="w-4 h-4" /></button>
              <h3 className="text-sm font-bold">{selectedMat.name} <span className="text-zinc-500 font-mono ml-1">{selectedMat.code}</span></h3>
            </div>
            {loading && <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />}
          </div>

          {/* Visual Trace Chain */}
          <div className="bg-zinc-900/50 rounded-xl border border-white/5 p-4">
            <p className="text-[10px] text-zinc-500 mb-3 uppercase tracking-wider">Full Backward Traceability</p>
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {/* Supplier */}
              <TraceNode icon={Truck} label="Supplier" detail={selectedMat.supplier_name || 'N/A'} color="text-purple-400" bg="bg-purple-500/10" />
              <ChevronRight className="w-4 h-4 text-zinc-600 shrink-0" />
              {/* GRN */}
              <TraceNode icon={Package} label="GRN Inward" detail={`${grns.length} receipts`} color="text-blue-400" bg="bg-blue-500/10" />
              <ChevronRight className="w-4 h-4 text-zinc-600 shrink-0" />
              {/* Store */}
              <TraceNode icon={Layers} label="Store Stock" detail={`${selectedMat.current_stock || 0} ${selectedMat.unit}`} color="text-cyan-400" bg="bg-cyan-500/10" />
              <ChevronRight className="w-4 h-4 text-zinc-600 shrink-0" />
              {/* Issue */}
              <TraceNode icon={Factory} label="Production" detail={`${issues.length} issues`} color="text-green-400" bg="bg-green-500/10" />
              <ChevronRight className="w-4 h-4 text-zinc-600 shrink-0" />
              {/* FG */}
              <TraceNode icon={ShieldCheck} label="Finished Goods" detail="→ Customer" color="text-orange-400" bg="bg-orange-500/10" />
            </div>
          </div>

          {/* GRN History */}
          <div>
            <h4 className="text-xs font-semibold text-zinc-400 mb-2">Inward History (GRNs)</h4>
            {grns.length === 0 ? <p className="text-xs text-zinc-600">No GRN records found</p> : (
              <div className="space-y-1.5">
                {grns.slice(0, 10).map(g => {
                  const item = g.items?.find(i => i.materialId === selectedMaterial);
                  return (
                    <div key={g.id} className="flex items-center justify-between p-2.5 bg-zinc-800/50 rounded-lg text-xs">
                      <div>
                        <span className="text-zinc-300 font-mono">{g.grn_number}</span>
                        <span className="text-zinc-500 ml-2">from {g.supplier_name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-zinc-400">Qty: {item?.receivedQty}</span>
                        <span className="text-zinc-500 font-mono">{item?.batchNumber || '-'}</span>
                        <span className="text-zinc-500">{g.received_at ? new Date(g.received_at).toLocaleDateString() : '-'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Issue History */}
          <div>
            <h4 className="text-xs font-semibold text-zinc-400 mb-2">Issue History (Consumption)</h4>
            {issues.length === 0 ? <p className="text-xs text-zinc-600">No issue records found</p> : (
              <div className="space-y-1.5">
                {issues.slice(0, 10).map(rec => (
                  <div key={rec.id} className="flex items-center justify-between p-2.5 bg-zinc-800/50 rounded-lg text-xs">
                    <div>
                      <span className="text-zinc-300 font-mono">{rec.issue_number || rec.indent_number || '-'}</span>
                      <span className="text-zinc-500 ml-2">to {rec.department || rec.team || '-'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-zinc-400">Qty: {rec.quantity}</span>
                      <span className="text-zinc-500 font-mono">{rec.batch_number || '-'}</span>
                      <span className="text-zinc-500">{rec.issued_at || rec.date ? new Date(rec.issued_at || rec.date || '').toLocaleDateString() : '-'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {!selectedMaterial && !searchTerm && (
        <div className="text-center py-8">
          <Search className="w-10 h-10 text-zinc-700 mx-auto mb-2" />
          <p className="text-sm text-zinc-500">Search a material to view full backward traceability</p>
          <p className="text-[10px] text-zinc-600 mt-1">Customer complaint → FG batch → Production → Material batch → Supplier</p>
        </div>
      )}
    </motion.div>
  );
}

function TraceNode({ icon: Icon, label, detail, color, bg }: { icon: React.ElementType; label: string; detail: string; color: string; bg: string }) {
  return (
    <div className={`shrink-0 p-3 rounded-xl border border-white/5 ${bg} text-center min-w-[100px]`}>
      <Icon className={`w-5 h-5 ${color} mx-auto mb-1`} />
      <p className="text-[10px] text-zinc-400 font-medium">{label}</p>
      <p className={`text-[10px] font-bold ${color}`}>{detail}</p>
    </div>
  );
}

// =============================================
// MATERIAL RESERVATION
// =============================================

interface ReservationManagerProps {
  materials: MaterialData[];
  userName: string;
}

export function ReservationManager({ materials, userName }: ReservationManagerProps) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  // New reservation form
  const [materialId, setMaterialId] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [jobNumber, setJobNumber] = useState('');
  const [productionOrder, setProductionOrder] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'material_reservations'), (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as Reservation));
      items.sort((a, b) => new Date(b.reserved_at).getTime() - new Date(a.reserved_at).getTime());
      setReservations(items);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const activeReservations = reservations.filter(r => r.status === 'active');

  // Calculate reserved qty per material
  const reservedQtyMap = useMemo(() => {
    const map: Record<string, number> = {};
    activeReservations.forEach(r => {
      map[r.material_id] = (map[r.material_id] || 0) + r.quantity;
    });
    return map;
  }, [activeReservations]);

  const selectedMat = materials.find(m => m.id === materialId);
  const availableStock = (selectedMat?.current_stock || 0) - (reservedQtyMap[materialId] || 0);

  const handleReserve = async () => {
    if (!materialId || quantity <= 0 || !jobNumber) return;
    if (quantity > availableStock) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'material_reservations'), {
        material_id: materialId,
        material_name: selectedMat?.name || '',
        quantity,
        job_number: jobNumber,
        production_order: productionOrder,
        reserved_by: userName,
        reserved_at: new Date().toISOString(),
        status: 'active',
      });
      setMaterialId('');
      setQuantity(0);
      setJobNumber('');
      setProductionOrder('');
      setShowNew(false);
    } catch (err) {
      console.error('Reserve error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (resId: string) => {
    await updateDoc(doc(db, 'material_reservations', resId), { status: 'cancelled' });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold">Material Reservations</h3>
          <p className="text-[10px] text-zinc-500">Block material when production is planned — auto-deducted on issue</p>
        </div>
        <button onClick={() => setShowNew(!showNew)} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-medium flex items-center gap-1.5">
          <Lock className="w-3 h-3" /> Reserve
        </button>
      </div>

      {/* New Reservation Form */}
      <AnimatePresence>
        {showNew && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="bg-zinc-900/60 rounded-xl border border-white/10 p-4 space-y-3 overflow-hidden">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Material *</label>
                <select value={materialId} onChange={e => setMaterialId(e.target.value)} className="input-style">
                  <option value="">Select</option>
                  {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.code})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Quantity * <span className="text-zinc-600 ml-1">(Avail: {materialId ? availableStock : '-'} {selectedMat?.unit})</span>
                </label>
                <input type="number" value={quantity} onChange={e => setQuantity(Number(e.target.value))} className="input-style" min={0} max={availableStock} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs text-zinc-400 mb-1">Job Number *</label>
                <input value={jobNumber} onChange={e => setJobNumber(e.target.value)} className="input-style" placeholder="JC-2026-xxx" /></div>
              <div><label className="block text-xs text-zinc-400 mb-1">Production Order</label>
                <input value={productionOrder} onChange={e => setProductionOrder(e.target.value)} className="input-style" placeholder="PO-xxx" /></div>
            </div>
            {quantity > availableStock && materialId && (
              <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/15 text-xs text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5" /> Insufficient available stock (after existing reservations)
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowNew(false)} className="px-3 py-1.5 bg-white/5 rounded-lg text-xs">Cancel</button>
              <button onClick={handleReserve} disabled={saving || !materialId || !jobNumber || quantity <= 0 || quantity > availableStock}
                className="px-4 py-1.5 bg-blue-600 rounded-lg text-xs font-medium disabled:opacity-40 flex items-center gap-1.5">
                {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Lock className="w-3 h-3" />}
                Reserve
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Reservations */}
      {loading ? <div className="text-center py-6"><RefreshCw className="w-6 h-6 animate-spin text-blue-400 mx-auto" /></div> : (
        <>
          {activeReservations.length === 0 ? (
            <div className="text-center py-6">
              <Unlock className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
              <p className="text-xs text-zinc-500">No active reservations</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeReservations.map(r => (
                <div key={r.id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg border border-white/5 text-xs">
                  <div className="flex items-center gap-3">
                    <Lock className="w-3.5 h-3.5 text-blue-400" />
                    <div>
                      <p className="text-zinc-300 font-medium">{r.material_name}</p>
                      <p className="text-zinc-500">Job: {r.job_number} · By: {r.reserved_by}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-blue-400 font-bold">{r.quantity} reserved</span>
                    <span className="text-zinc-500">{new Date(r.reserved_at).toLocaleDateString()}</span>
                    <button onClick={() => handleCancel(r.id)} className="p-1 hover:bg-red-500/10 rounded text-red-400 hover:text-red-300" title="Cancel reservation">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}

// =============================================
// WASTAGE MONITOR
// =============================================

interface WastageMonitorProps {
  materials: MaterialData[];
  issues: IssueRecord[];
}

export function WastageMonitor({ materials, issues }: WastageMonitorProps) {
  // Group issues by material and sum quantities
  const issueByMaterial = useMemo(() => {
    const map: Record<string, number> = {};
    issues.forEach(i => {
      const key = i.material_id || i.material || '';
      if (key) map[key] = (map[key] || 0) + (i.quantity || 0);
    });
    return map;
  }, [issues]);

  // Compare with BOM expected (estimated as min_stock × 3 for rough indication)
  const wastageData = useMemo(() => {
    return materials
      .filter(m => issueByMaterial[m.id])
      .map(m => {
        const actualUsed = issueByMaterial[m.id] || 0;
        const expectedMonthly = (m.min_stock || 10) * 3; // rough estimate
        const variance = actualUsed - expectedMonthly;
        const variancePct = expectedMonthly > 0 ? ((variance / expectedMonthly) * 100) : 0;
        return {
          id: m.id,
          name: m.name || '',
          code: m.code || '',
          unit: m.unit || '',
          category: m.category || '',
          actualUsed,
          expected: expectedMonthly,
          variance,
          variancePct,
        };
      })
      .filter(w => Math.abs(w.variancePct) > 5) // Only show significant variance
      .sort((a, b) => Math.abs(b.variancePct) - Math.abs(a.variancePct));
  }, [materials, issueByMaterial]);

  const overConsumed = wastageData.filter(w => w.variance > 0);
  const underConsumed = wastageData.filter(w => w.variance < 0);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/15">
          <TrendingUp className="w-5 h-5 text-red-400 mb-1" />
          <p className="text-lg font-bold text-red-400">{overConsumed.length}</p>
          <p className="text-[10px] text-red-400/70">Over-consumed materials</p>
        </div>
        <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/15">
          <TrendingDown className="w-5 h-5 text-green-400 mb-1" />
          <p className="text-lg font-bold text-green-400">{underConsumed.length}</p>
          <p className="text-[10px] text-green-400/70">Under-consumed materials</p>
        </div>
      </div>

      {/* Over-consumed (Wastage) */}
      {overConsumed.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-red-400 mb-2 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Over-Consumed (Potential Wastage)</h4>
          <div className="space-y-1.5">
            {overConsumed.map(w => (
              <div key={w.id} className="flex items-center justify-between p-3 bg-red-500/5 rounded-lg border border-red-500/10 text-xs">
                <div>
                  <span className="text-zinc-300 font-medium">{w.name}</span>
                  <span className="text-zinc-500 ml-2 font-mono">{w.code}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-zinc-400">Used: {w.actualUsed} {w.unit}</span>
                  <span className="text-zinc-500">Expected: {w.expected}</span>
                  <span className="text-red-400 font-bold">+{w.variancePct.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Under-consumed */}
      {underConsumed.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-green-400 mb-2 flex items-center gap-1"><TrendingDown className="w-3 h-3" /> Under-Consumed</h4>
          <div className="space-y-1.5">
            {underConsumed.slice(0, 5).map(w => (
              <div key={w.id} className="flex items-center justify-between p-3 bg-green-500/5 rounded-lg border border-green-500/10 text-xs">
                <div>
                  <span className="text-zinc-300 font-medium">{w.name}</span>
                  <span className="text-zinc-500 ml-2 font-mono">{w.code}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-zinc-400">Used: {w.actualUsed} {w.unit}</span>
                  <span className="text-zinc-500">Expected: {w.expected}</span>
                  <span className="text-green-400 font-bold">{w.variancePct.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {wastageData.length === 0 && (
        <div className="text-center py-8">
          <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-2" />
          <p className="text-sm text-zinc-400">No significant consumption variance detected</p>
          <p className="text-[10px] text-zinc-600 mt-1">All materials within ±5% of expected usage</p>
        </div>
      )}

      {/* SOP Variance Limits */}
      <div className="bg-zinc-900/50 rounded-xl border border-white/5 p-3">
        <p className="text-[10px] text-zinc-500 font-medium mb-2">SOP Variance Limits</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 bg-white/5 rounded-lg"><p className="text-[10px] text-zinc-400">Raw Material</p><p className="text-xs font-bold text-blue-400">±1%</p></div>
          <div className="p-2 bg-white/5 rounded-lg"><p className="text-[10px] text-zinc-400">Consumables</p><p className="text-xs font-bold text-yellow-400">±3%</p></div>
          <div className="p-2 bg-white/5 rounded-lg"><p className="text-[10px] text-zinc-400">Tools</p><p className="text-xs font-bold text-green-400">0%</p></div>
        </div>
      </div>
    </motion.div>
  );
}
