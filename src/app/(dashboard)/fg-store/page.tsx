'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PackageCheck, Box, TrendingUp, AlertTriangle, Search, Plus, X,
  Save, RefreshCw, Truck, ClipboardCheck, Eye, Calendar, Filter,
  ArrowUpRight, CheckCircle2, Clock, Package
} from 'lucide-react';
import { db } from '@/lib/firebase/client';
import { collection, onSnapshot, addDoc, updateDoc, doc, query, orderBy } from 'firebase/firestore';

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════
interface FinishedGood {
  id: string;
  productName: string;
  projectName: string;
  batchNumber: string;
  quantity: number;
  unit: string;
  completedDate: string;
  status: 'pending_qc' | 'qc_passed' | 'in_stock' | 'dispatched' | 'qc_failed';
  qcInspector?: string;
  qcDate?: string;
  qcNotes?: string;
  dispatchDate?: string;
  dispatchTo?: string;
  dcNumber?: string;
  dimensions?: string;
  weight?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

type TabView = 'all' | 'pending_qc' | 'in_stock' | 'dispatched';

// ═══════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════
export default function FGStorePage() {
  const [goods, setGoods] = useState<FinishedGood[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabView>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDetail, setShowDetail] = useState<FinishedGood | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    productName: '',
    projectName: '',
    batchNumber: '',
    quantity: 1,
    unit: 'Pcs',
    dimensions: '',
    weight: '',
    notes: ''
  });

  // ════════ FIREBASE LISTENER ════════
  useEffect(() => {
    const q = query(collection(db, 'finished_goods'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const items: FinishedGood[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as FinishedGood));
      setGoods(items);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  // ════════ COMPUTED ════════
  const stats = useMemo(() => {
    const total = goods.length;
    const pendingQC = goods.filter(g => g.status === 'pending_qc').length;
    const inStock = goods.filter(g => g.status === 'in_stock' || g.status === 'qc_passed').length;
    const dispatched = goods.filter(g => g.status === 'dispatched').length;
    return { total, pendingQC, inStock, dispatched };
  }, [goods]);

  const filtered = useMemo(() => {
    let list = goods;
    if (activeTab !== 'all') {
      if (activeTab === 'in_stock') list = list.filter(g => g.status === 'in_stock' || g.status === 'qc_passed');
      else list = list.filter(g => g.status === activeTab);
    }
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(g =>
        g.productName.toLowerCase().includes(s) ||
        g.projectName.toLowerCase().includes(s) ||
        g.batchNumber.toLowerCase().includes(s)
      );
    }
    return list;
  }, [goods, activeTab, search]);

  // ════════ ADD FINISHED GOOD ════════
  const handleAdd = async () => {
    if (!form.productName || !form.projectName || form.quantity <= 0) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'finished_goods'), {
        ...form,
        status: 'pending_qc',
        createdBy: localStorage.getItem('currentUserName') || 'Store',
        createdAt: new Date().toISOString(),
        completedDate: new Date().toISOString().split('T')[0]
      });
      setForm({ productName: '', projectName: '', batchNumber: '', quantity: 1, unit: 'Pcs', dimensions: '', weight: '', notes: '' });
      setShowAddForm(false);
    } catch (err) {
      console.error('Error adding finished good:', err);
    } finally {
      setSaving(false);
    }
  };

  // ════════ UPDATE STATUS ════════
  const updateStatus = async (id: string, newStatus: FinishedGood['status'], extra?: Record<string, string>) => {
    try {
      await updateDoc(doc(db, 'finished_goods', id), {
        status: newStatus,
        ...(extra || {})
      });
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleQCPass = (item: FinishedGood) => {
    const inspector = prompt('QC Inspector Name:');
    if (!inspector) return;
    updateStatus(item.id, 'qc_passed', {
      qcInspector: inspector,
      qcDate: new Date().toISOString().split('T')[0],
      qcNotes: 'QC Passed'
    });
  };

  const handleQCFail = (item: FinishedGood) => {
    const reason = prompt('Reason for QC failure:');
    if (!reason) return;
    updateStatus(item.id, 'qc_failed', {
      qcNotes: reason,
      qcDate: new Date().toISOString().split('T')[0]
    });
  };

  const handleMoveToStock = (item: FinishedGood) => {
    updateStatus(item.id, 'in_stock');
  };

  const handleDispatch = (item: FinishedGood) => {
    const dispatchTo = prompt('Dispatch To (Customer/Location):');
    if (!dispatchTo) return;
    const dcNumber = prompt('DC Number:');
    updateStatus(item.id, 'dispatched', {
      dispatchTo,
      dcNumber: dcNumber || '',
      dispatchDate: new Date().toISOString().split('T')[0]
    });
  };

  // ════════ STATUS BADGE ════════
  const getStatusBadge = (status: FinishedGood['status']) => {
    const map = {
      pending_qc: { label: 'Pending QC', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
      qc_passed: { label: 'QC Passed', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
      qc_failed: { label: 'QC Failed', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
      in_stock: { label: 'In Stock', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
      dispatched: { label: 'Dispatched', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' }
    };
    const s = map[status];
    return <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${s.color}`}>{s.label}</span>;
  };

  const tabs: { key: TabView; label: string; count: number }[] = [
    { key: 'all', label: 'All Items', count: stats.total },
    { key: 'pending_qc', label: 'Pending QC', count: stats.pendingQC },
    { key: 'in_stock', label: 'In Stock', count: stats.inStock },
    { key: 'dispatched', label: 'Dispatched', count: stats.dispatched }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/20 rounded-2xl">
              <PackageCheck className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Finished Goods Store</h1>
              <p className="text-zinc-500">Track completed products &bull; QC &bull; Dispatch</p>
            </div>
          </div>
          <button onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-medium text-white transition-all">
            <Plus className="w-4 h-4" /> Add Finished Good
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: PackageCheck, label: 'Total Items', value: stats.total, color: 'emerald' },
            { icon: Box, label: 'In Stock', value: stats.inStock, color: 'blue' },
            { icon: TrendingUp, label: 'Dispatched', value: stats.dispatched, color: 'purple' },
            { icon: AlertTriangle, label: 'Pending QC', value: stats.pendingQC, color: 'yellow' }
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:border-white/20 transition-all">
              <div className="flex items-center gap-3">
                <div className={`p-2 bg-${s.color}-500/20 rounded-xl`}>
                  <s.icon className={`w-5 h-5 text-${s.color}-400`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{s.value}</p>
                  <p className="text-xs text-zinc-500">{s.label}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Tabs & Search */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div className="flex gap-2">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === t.key ? 'bg-emerald-600 text-white' : 'bg-white/5 text-zinc-400 hover:bg-white/10'}`}>
                {t.label} <span className="ml-1 text-xs opacity-70">({t.count})</span>
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..."
              className="pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/50 w-64" />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin" />
              <span className="ml-3 text-zinc-400">Loading...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <Package className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-500">No finished goods found</p>
              <button onClick={() => setShowAddForm(true)} className="mt-3 text-emerald-400 text-sm hover:underline">Add your first item</button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Product</th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Project</th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Batch</th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Qty</th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-all">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-white">{item.productName}</p>
                      {item.dimensions && <p className="text-xs text-zinc-500">{item.dimensions}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-400">{item.projectName}</td>
                    <td className="px-4 py-3 text-sm text-zinc-400 font-mono">{item.batchNumber || '-'}</td>
                    <td className="px-4 py-3 text-sm text-white font-medium">{item.quantity} {item.unit}</td>
                    <td className="px-4 py-3 text-sm text-zinc-400">{item.completedDate}</td>
                    <td className="px-4 py-3">{getStatusBadge(item.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setShowDetail(item)} className="p-1.5 hover:bg-white/10 rounded-lg transition-all" title="View Details">
                          <Eye className="w-4 h-4 text-zinc-400" />
                        </button>
                        {item.status === 'pending_qc' && (
                          <>
                            <button onClick={() => handleQCPass(item)} className="p-1.5 hover:bg-emerald-500/20 rounded-lg transition-all" title="QC Pass">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            </button>
                            <button onClick={() => handleQCFail(item)} className="p-1.5 hover:bg-red-500/20 rounded-lg transition-all" title="QC Fail">
                              <X className="w-4 h-4 text-red-400" />
                            </button>
                          </>
                        )}
                        {item.status === 'qc_passed' && (
                          <button onClick={() => handleMoveToStock(item)} className="p-1.5 hover:bg-blue-500/20 rounded-lg transition-all" title="Move to Stock">
                            <ArrowUpRight className="w-4 h-4 text-blue-400" />
                          </button>
                        )}
                        {item.status === 'in_stock' && (
                          <button onClick={() => handleDispatch(item)} className="p-1.5 hover:bg-purple-500/20 rounded-lg transition-all" title="Dispatch">
                            <Truck className="w-4 h-4 text-purple-400" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>

      {/* ═══════ ADD FORM MODAL ═══════ */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAddForm(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Add Finished Good</h3>
                <button onClick={() => setShowAddForm(false)} className="p-1.5 hover:bg-white/10 rounded-lg"><X className="w-5 h-5 text-zinc-400" /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Product Name *</label>
                  <input value={form.productName} onChange={e => setForm({ ...form, productName: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500" placeholder="e.g. FRP Panel A" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">Project Name *</label>
                    <select value={form.projectName} onChange={e => setForm({ ...form, projectName: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500">
                      <option value="">Select Project</option>
                      <option value="Project Alpha">Project Alpha</option>
                      <option value="Project Beta">Project Beta</option>
                      <option value="Project Gamma">Project Gamma</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="General">General</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">Batch Number</label>
                    <input value={form.batchNumber} onChange={e => setForm({ ...form, batchNumber: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500" placeholder="e.g. B-2026-001" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">Quantity *</label>
                    <input type="number" min={1} value={form.quantity} onChange={e => setForm({ ...form, quantity: Number(e.target.value) })}
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">Unit</label>
                    <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500">
                      <option value="Pcs">Pcs</option>
                      <option value="Kg">Kg</option>
                      <option value="Sets">Sets</option>
                      <option value="Meters">Meters</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">Weight</label>
                    <input value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500" placeholder="e.g. 5.2 Kg" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Dimensions</label>
                  <input value={form.dimensions} onChange={e => setForm({ ...form, dimensions: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500" placeholder="e.g. 1200 x 800 x 50 mm" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Notes</label>
                  <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 resize-none" placeholder="Additional notes..." />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowAddForm(false)} className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-sm text-zinc-400 transition-all">Cancel</button>
                <button onClick={handleAdd} disabled={saving || !form.productName || !form.projectName}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50">
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Saving...' : 'Add to FG Store'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════ DETAIL MODAL ═══════ */}
      <AnimatePresence>
        {showDetail && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowDetail(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">{showDetail.productName}</h3>
                <button onClick={() => setShowDetail(null)} className="p-1.5 hover:bg-white/10 rounded-lg"><X className="w-5 h-5 text-zinc-400" /></button>
              </div>

              <div className="space-y-3">
                {[
                  ['Project', showDetail.projectName],
                  ['Batch', showDetail.batchNumber || '-'],
                  ['Quantity', `${showDetail.quantity} ${showDetail.unit}`],
                  ['Dimensions', showDetail.dimensions || '-'],
                  ['Weight', showDetail.weight || '-'],
                  ['Completed', showDetail.completedDate],
                  ['Status', null],
                  ['QC Inspector', showDetail.qcInspector || '-'],
                  ['QC Date', showDetail.qcDate || '-'],
                  ['QC Notes', showDetail.qcNotes || '-'],
                  ['Dispatch To', showDetail.dispatchTo || '-'],
                  ['DC Number', showDetail.dcNumber || '-'],
                  ['Dispatch Date', showDetail.dispatchDate || '-'],
                  ['Created By', showDetail.createdBy],
                  ['Notes', showDetail.notes || '-']
                ].map(([label, val], i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-white/5">
                    <span className="text-sm text-zinc-500">{label}</span>
                    {label === 'Status' ? getStatusBadge(showDetail.status) : <span className="text-sm text-white">{val}</span>}
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mt-6">
                {showDetail.status === 'pending_qc' && (
                  <>
                    <button onClick={() => { handleQCPass(showDetail); setShowDetail(null); }}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-medium text-white transition-all">
                      <CheckCircle2 className="w-4 h-4" /> QC Pass
                    </button>
                    <button onClick={() => { handleQCFail(showDetail); setShowDetail(null); }}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-500 rounded-xl text-sm font-medium text-white transition-all">
                      <X className="w-4 h-4" /> QC Fail
                    </button>
                  </>
                )}
                {showDetail.status === 'qc_passed' && (
                  <button onClick={() => { handleMoveToStock(showDetail); setShowDetail(null); }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-medium text-white transition-all">
                    <ArrowUpRight className="w-4 h-4" /> Move to Stock
                  </button>
                )}
                {showDetail.status === 'in_stock' && (
                  <button onClick={() => { handleDispatch(showDetail); setShowDetail(null); }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-purple-600 hover:bg-purple-500 rounded-xl text-sm font-medium text-white transition-all">
                    <Truck className="w-4 h-4" /> Dispatch
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
