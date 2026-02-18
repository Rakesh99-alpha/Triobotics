/**
 * Batch Tracking View Component
 * View, create, and manage material batches with expiry tracking
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Boxes,
  Plus,
  Search,
  CalendarClock,
  AlertTriangle,
  CheckCircle2,
  Clock,
  X,
  Save,
  RefreshCw,
  MapPin
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { STORE_COLLECTIONS, createBatch } from '@/lib/services/storeEnhanced';
import type { BatchInfo, QualityStatus } from '@/types/store-enhanced';

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
  [key: string]: unknown;
}

interface BatchViewProps {
  materials: MaterialData[];
  userName: string;
}

type BatchFilter = 'all' | 'fresh' | 'expiring' | 'expired';

// ==========================================
// BATCH VIEW
// ==========================================

export default function BatchView({ materials }: BatchViewProps) {
  const [batches, setBatches] = useState<BatchInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<BatchFilter>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    materialId: '',
    batchNumber: '',
    quantity: 0,
    manufactureDate: '',
    expiryDate: '',
    supplier: '',
    location: '',
    qualityStatus: 'pending' as QualityStatus,
  });

  // Subscribe to batches
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, STORE_COLLECTIONS.BATCHES),
      (snap) => {
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() })) as BatchInfo[];
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setBatches(items);
        setLoading(false);
      },
      (err) => { console.error('Batch listener error:', err); setLoading(false); }
    );
    return () => unsub();
  }, []);

  // Filter & search
  const filtered = useMemo(() => {
    let result = [...batches];
    const today = new Date();

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(b =>
        b.batchNumber.toLowerCase().includes(q) ||
        b.supplier.toLowerCase().includes(q) ||
        b.location.toLowerCase().includes(q) ||
        materials.find(m => m.id === b.materialId)?.name?.toLowerCase().includes(q)
      );
    }

    if (filter === 'expired') {
      result = result.filter(b => b.expiryDate && new Date(b.expiryDate) < today);
    } else if (filter === 'expiring') {
      const thirtyDays = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      result = result.filter(b => b.expiryDate && new Date(b.expiryDate) >= today && new Date(b.expiryDate) <= thirtyDays);
    } else if (filter === 'fresh') {
      const thirtyDays = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      result = result.filter(b => !b.expiryDate || new Date(b.expiryDate) > thirtyDays);
    }

    return result;
  }, [batches, search, filter, materials]);

  const handleCreate = async () => {
    if (!form.materialId || !form.batchNumber || form.quantity <= 0) return;
    setSaving(true);
    try {
      await createBatch({
        batchNumber: form.batchNumber,
        materialId: form.materialId,
        quantity: form.quantity,
        manufactureDate: form.manufactureDate || undefined,
        expiryDate: form.expiryDate || undefined,
        supplier: form.supplier,
        location: form.location,
        qualityStatus: form.qualityStatus,
      });
      setShowCreate(false);
      setForm({ materialId: '', batchNumber: '', quantity: 0, manufactureDate: '', expiryDate: '', supplier: '', location: '', qualityStatus: 'pending' });
    } catch (err) {
      console.error('Create batch error:', err);
    } finally {
      setSaving(false);
    }
  };

  const getMaterialName = (materialId: string) => {
    return materials.find(m => m.id === materialId)?.name || 'Unknown Material';
  };

  const getExpiryInfo = (expiryDate?: string) => {
    if (!expiryDate) return { label: 'No Expiry', color: 'text-zinc-500', bg: 'bg-zinc-800' };
    const today = new Date();
    const expiry = new Date(expiryDate);
    const days = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (days < 0) return { label: `Expired ${Math.abs(days)}d ago`, color: 'text-red-400', bg: 'bg-red-500/10' };
    if (days <= 30) return { label: `${days}d left`, color: 'text-yellow-400', bg: 'bg-yellow-500/10' };
    return { label: `${days}d left`, color: 'text-green-400', bg: 'bg-green-500/10' };
  };

  const getQualityBadge = (status: QualityStatus) => {
    const map = {
      pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: Clock },
      passed: { bg: 'bg-green-500/20', text: 'text-green-400', icon: CheckCircle2 },
      failed: { bg: 'bg-red-500/20', text: 'text-red-400', icon: AlertTriangle },
      under_review: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: Clock },
      conditional: { bg: 'bg-orange-500/20', text: 'text-orange-400', icon: AlertTriangle },
    };
    return map[status] || map.pending;
  };

  // Stats
  const today = new Date();
  const totalBatches = batches.length;
  const expiredCount = batches.filter(b => b.expiryDate && new Date(b.expiryDate) < today).length;
  const expiringCount = batches.filter(b => {
    if (!b.expiryDate) return false;
    const exp = new Date(b.expiryDate);
    return exp >= today && exp <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  }).length;
  const pendingQC = batches.filter(b => b.qualityStatus === 'pending').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-white/5 to-white/[0.02] rounded-xl p-4 border border-white/10">
          <Boxes className="w-5 h-5 text-blue-400 mb-2" />
          <p className="text-2xl font-bold">{totalBatches}</p>
          <p className="text-xs text-zinc-400">Total Batches</p>
        </div>
        <div className="bg-gradient-to-br from-red-500/5 to-red-600/5 rounded-xl p-4 border border-red-500/10">
          <AlertTriangle className="w-5 h-5 text-red-400 mb-2" />
          <p className="text-2xl font-bold text-red-400">{expiredCount}</p>
          <p className="text-xs text-red-400/70">Expired</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-500/5 to-yellow-600/5 rounded-xl p-4 border border-yellow-500/10">
          <CalendarClock className="w-5 h-5 text-yellow-400 mb-2" />
          <p className="text-2xl font-bold text-yellow-400">{expiringCount}</p>
          <p className="text-xs text-yellow-400/70">Expiring Soon</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500/5 to-blue-600/5 rounded-xl p-4 border border-blue-500/10">
          <Clock className="w-5 h-5 text-blue-400 mb-2" />
          <p className="text-2xl font-bold text-blue-400">{pendingQC}</p>
          <p className="text-xs text-blue-400/70">Pending QC</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="relative flex-1 w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input type="text" placeholder="Search batches..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-xl overflow-hidden border border-white/10">
            {(['all', 'fresh', 'expiring', 'expired'] as BatchFilter[]).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-2 text-xs font-medium transition-all capitalize ${filter === f ? 'bg-blue-600 text-white' : 'bg-white/5 text-zinc-400 hover:text-white'}`}>
                {f}
              </button>
            ))}
          </div>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> New Batch
          </button>
        </div>
      </div>

      {/* Batches Grid */}
      {loading ? (
        <div className="text-center py-16">
          <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-3" />
          <p className="text-zinc-400">Loading batches...</p>
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((batch) => {
            const expiry = getExpiryInfo(batch.expiryDate);
            const qcBadge = getQualityBadge(batch.qualityStatus);
            const QCIcon = qcBadge.icon;
            return (
              <motion.div key={batch.id} whileHover={{ scale: 1.01 }}
                className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl rounded-2xl p-5 border border-white/10 hover:border-white/20 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-mono font-bold text-sm text-white">{batch.batchNumber}</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">{getMaterialName(batch.materialId)}</p>
                  </div>
                  <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${qcBadge.bg} ${qcBadge.text}`}>
                    <QCIcon className="w-3 h-3" />
                    {batch.qualityStatus}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Quantity</span>
                    <span className="font-medium">{batch.quantity}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Supplier</span>
                    <span className="text-zinc-300 text-xs">{batch.supplier || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Location</span>
                    <span className="flex items-center gap-1 text-xs text-zinc-300">
                      <MapPin className="w-3 h-3" /> {batch.location || '-'}
                    </span>
                  </div>
                </div>

                {/* Expiry Bar */}
                <div className={`p-2.5 rounded-lg ${expiry.bg} flex items-center justify-between`}>
                  <div className="flex items-center gap-1.5">
                    <CalendarClock className={`w-3.5 h-3.5 ${expiry.color}`} />
                    <span className={`text-xs font-medium ${expiry.color}`}>{expiry.label}</span>
                  </div>
                  {batch.expiryDate && (
                    <span className="text-xs text-zinc-500">{new Date(batch.expiryDate).toLocaleDateString()}</span>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-white/5 text-xs text-zinc-500">
                  Created: {new Date(batch.createdAt).toLocaleDateString()}
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <Boxes className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400">No batches found</p>
          <p className="text-xs text-zinc-500 mt-1">Create a new batch to start tracking</p>
        </div>
      )}

      {/* Create Batch Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-4"
            onClick={() => setShowCreate(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-500/10"><Boxes className="w-5 h-5 text-blue-400" /></div>
                  <h2 className="text-lg font-bold">Create New Batch</h2>
                </div>
                <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-white/5 rounded-xl text-zinc-400 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs text-zinc-400 mb-1">Material *</label>
                    <select value={form.materialId} onChange={e => {
                      const mat = materials.find(m => m.id === e.target.value);
                      setForm({ ...form, materialId: e.target.value, supplier: mat?.supplier || '', location: mat?.location || '' });
                    }}
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-blue-500">
                      <option value="">Select material</option>
                      {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.code})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Batch Number *</label>
                    <input value={form.batchNumber} onChange={e => setForm({ ...form, batchNumber: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                      placeholder="e.g. BTH-2026-001" />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Quantity *</label>
                    <input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: Number(e.target.value) })}
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Manufacture Date</label>
                    <input type="date" value={form.manufactureDate} onChange={e => setForm({ ...form, manufactureDate: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Expiry Date</label>
                    <input type="date" value={form.expiryDate} onChange={e => setForm({ ...form, expiryDate: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Supplier</label>
                    <input value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Location</label>
                    <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-zinc-400 mb-1">Quality Status</label>
                    <select value={form.qualityStatus} onChange={e => setForm({ ...form, qualityStatus: e.target.value as QualityStatus })}
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-blue-500">
                      <option value="pending">Pending</option>
                      <option value="passed">Passed</option>
                      <option value="failed">Failed</option>
                      <option value="under_review">Under Review</option>
                      <option value="conditional">Conditional</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-sm transition-all">
                    Cancel
                  </button>
                  <button onClick={handleCreate} disabled={saving || !form.materialId || !form.batchNumber || form.quantity <= 0}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-medium transition-all disabled:opacity-50">
                    {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? 'Creating...' : 'Create Batch'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
