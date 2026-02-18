/**
 * Inventory Table View Component
 * Full inventory listing with search, filters, inline edit, stock adjustment
 */

'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Package,
  Edit2,
  Eye,
  ArrowUpDown,
  Plus,
  Minus,
  Save,
  X,
  MapPin,
  RefreshCw
} from 'lucide-react';
import { createStockAdjustment } from '@/lib/services/storeEnhanced';

// ==========================================
// TYPES
// ==========================================

interface MaterialData {
  id: string;
  name?: string;
  code?: string;
  category?: string;
  current_stock: number;
  min_stock: number;
  purchase_price: number;
  unit?: string;
  location?: string;
  supplier?: string;
  lastUpdated?: string;
  [key: string]: unknown;
}

type SortKey = 'name' | 'current_stock' | 'purchase_price' | 'category' | 'location';
type SortDir = 'asc' | 'desc';
type StockFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';

interface InventoryViewProps {
  materials: MaterialData[];
  userName: string;
}

// ==========================================
// INVENTORY VIEW
// ==========================================

export default function InventoryView({ materials, userName }: InventoryViewProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialData | null>(null);
  const [showAdjustment, setShowAdjustment] = useState<MaterialData | null>(null);
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustType, setAdjustType] = useState<'physical_count' | 'damage' | 'correction'>('physical_count');
  const [adjusting, setAdjusting] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(materials.map(m => m.category || 'Uncategorized'));
    return ['all', ...Array.from(cats)];
  }, [materials]);

  // Filter & sort
  const filtered = useMemo(() => {
    let result = [...materials];

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(m =>
        (m.name || '').toLowerCase().includes(q) ||
        (m.code || '').toLowerCase().includes(q) ||
        (m.supplier || '').toLowerCase().includes(q)
      );
    }

    // Category
    if (categoryFilter !== 'all') {
      result = result.filter(m => (m.category || 'Uncategorized') === categoryFilter);
    }

    // Stock
    if (stockFilter === 'in_stock') result = result.filter(m => m.current_stock > m.min_stock);
    if (stockFilter === 'low_stock') result = result.filter(m => m.current_stock > 0 && m.current_stock <= m.min_stock);
    if (stockFilter === 'out_of_stock') result = result.filter(m => m.current_stock <= 0);

    // Sort
    result.sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';
      if (sortKey === 'name') { valA = (a.name || '').toLowerCase(); valB = (b.name || '').toLowerCase(); }
      else if (sortKey === 'current_stock') { valA = a.current_stock; valB = b.current_stock; }
      else if (sortKey === 'purchase_price') { valA = a.purchase_price; valB = b.purchase_price; }
      else if (sortKey === 'category') { valA = (a.category || '').toLowerCase(); valB = (b.category || '').toLowerCase(); }
      else if (sortKey === 'location') { valA = (a.location || '').toLowerCase(); valB = (b.location || '').toLowerCase(); }

      if (typeof valA === 'string') {
        return sortDir === 'asc' ? valA.localeCompare(valB as string) : (valB as string).localeCompare(valA);
      }
      return sortDir === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });

    return result;
  }, [materials, search, categoryFilter, stockFilter, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const handleAdjustment = async () => {
    if (!showAdjustment || !adjustReason) return;
    setAdjusting(true);
    try {
      await createStockAdjustment({
        adjustmentNumber: `ADJ-${Date.now()}`,
        materialId: showAdjustment.id,
        materialName: showAdjustment.name || '',
        type: adjustType,
        currentStock: showAdjustment.current_stock,
        adjustedStock: adjustQty,
        difference: adjustQty - showAdjustment.current_stock,
        reason: adjustReason,
        adjustedBy: userName,
        cost: Math.abs(adjustQty - showAdjustment.current_stock) * (showAdjustment.purchase_price || 0),
      });
      setShowAdjustment(null);
      setAdjustQty(0);
      setAdjustReason('');
    } catch (err) {
      console.error('Adjustment error:', err);
    } finally {
      setAdjusting(false);
    }
  };

  // Stats
  const totalItems = materials.length;
  const totalValue = materials.reduce((s, m) => s + m.current_stock * (m.purchase_price || 0), 0);
  const lowStockCount = materials.filter(m => m.current_stock > 0 && m.current_stock <= m.min_stock).length;
  const outOfStockCount = materials.filter(m => m.current_stock <= 0).length;

  const getStockBadge = (m: MaterialData) => {
    if (m.current_stock <= 0) return { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Out of Stock' };
    if (m.current_stock <= m.min_stock) return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Low Stock' };
    return { bg: 'bg-green-500/20', text: 'text-green-400', label: 'In Stock' };
  };

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <button onClick={() => handleSort(field)} className="flex items-center gap-1 hover:text-white transition-colors">
      {label}
      <ArrowUpDown className={`w-3 h-3 ${sortKey === field ? 'text-blue-400' : ''}`} />
    </button>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-white/5 to-white/[0.02] rounded-xl p-4 border border-white/10">
          <p className="text-xs text-zinc-400">Total Items</p>
          <p className="text-2xl font-bold">{totalItems}</p>
        </div>
        <div className="bg-gradient-to-br from-white/5 to-white/[0.02] rounded-xl p-4 border border-white/10">
          <p className="text-xs text-zinc-400">Stock Value</p>
          <p className="text-2xl font-bold">&#8377;{totalValue.toLocaleString()}</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-500/5 to-yellow-600/5 rounded-xl p-4 border border-yellow-500/10">
          <p className="text-xs text-yellow-400">Low Stock</p>
          <p className="text-2xl font-bold text-yellow-400">{lowStockCount}</p>
        </div>
        <div className="bg-gradient-to-br from-red-500/5 to-red-600/5 rounded-xl p-4 border border-red-500/10">
          <p className="text-xs text-red-400">Out of Stock</p>
          <p className="text-2xl font-bold text-red-400">{outOfStockCount}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
        <div className="relative flex-1 w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input type="text" placeholder="Search by name, code, or supplier..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-blue-500 hover:border-white/20 transition-all" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-blue-500">
            {categories.map(c => <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>)}
          </select>
          <div className="flex rounded-xl overflow-hidden border border-white/10">
            {(['all', 'in_stock', 'low_stock', 'out_of_stock'] as StockFilter[]).map(f => (
              <button key={f} onClick={() => setStockFilter(f)}
                className={`px-3 py-2 text-xs font-medium transition-all ${stockFilter === f ? 'bg-blue-600 text-white' : 'bg-white/5 text-zinc-400 hover:text-white'}`}>
                {f === 'all' ? 'All' : f === 'in_stock' ? 'In Stock' : f === 'low_stock' ? 'Low' : 'Out'}
              </button>
            ))}
          </div>
          <div className="flex rounded-xl overflow-hidden border border-white/10">
            <button onClick={() => setViewMode('table')}
              className={`px-3 py-2 text-xs transition-all ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-white/5 text-zinc-400'}`}>
              Table
            </button>
            <button onClick={() => setViewMode('grid')}
              className={`px-3 py-2 text-xs transition-all ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white/5 text-zinc-400'}`}>
              Grid
            </button>
          </div>
        </div>
      </div>

      {/* Table View */}
      {viewMode === 'table' ? (
        <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left px-5 py-4 text-xs font-medium text-zinc-400 uppercase"><SortHeader label="Material" field="name" /></th>
                  <th className="text-left px-5 py-4 text-xs font-medium text-zinc-400 uppercase"><SortHeader label="Category" field="category" /></th>
                  <th className="text-right px-5 py-4 text-xs font-medium text-zinc-400 uppercase"><SortHeader label="Stock" field="current_stock" /></th>
                  <th className="text-right px-5 py-4 text-xs font-medium text-zinc-400 uppercase">Min Stock</th>
                  <th className="text-right px-5 py-4 text-xs font-medium text-zinc-400 uppercase"><SortHeader label="Price" field="purchase_price" /></th>
                  <th className="text-right px-5 py-4 text-xs font-medium text-zinc-400 uppercase">Value</th>
                  <th className="text-left px-5 py-4 text-xs font-medium text-zinc-400 uppercase"><SortHeader label="Location" field="location" /></th>
                  <th className="text-center px-5 py-4 text-xs font-medium text-zinc-400 uppercase">Status</th>
                  <th className="text-right px-5 py-4 text-xs font-medium text-zinc-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((m) => {
                  const badge = getStockBadge(m);
                  const value = m.current_stock * (m.purchase_price || 0);
                  return (
                    <tr key={m.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-5 py-4">
                        <div>
                          <p className="font-medium text-white">{m.name || 'Unnamed'}</p>
                          <p className="text-xs text-zinc-500 font-mono">{m.code || '-'}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2.5 py-1 rounded-full text-xs bg-white/5 border border-white/10 text-zinc-300">
                          {m.category || 'N/A'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className={m.current_stock <= m.min_stock ? 'text-red-400 font-medium' : 'text-white'}>
                          {m.current_stock}
                        </span>
                        <span className="text-zinc-500 text-xs ml-1">{m.unit || ''}</span>
                      </td>
                      <td className="px-5 py-4 text-right text-zinc-400">{m.min_stock}</td>
                      <td className="px-5 py-4 text-right text-zinc-300">&#8377;{(m.purchase_price || 0).toLocaleString()}</td>
                      <td className="px-5 py-4 text-right text-zinc-300">&#8377;{value.toLocaleString()}</td>
                      <td className="px-5 py-4 text-zinc-400 text-sm">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-zinc-500" />
                          {m.location || '-'}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setSelectedMaterial(m)} className="p-2 hover:bg-blue-500/10 rounded-lg text-blue-400" title="View Details">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setShowAdjustment(m); setAdjustQty(m.current_stock); }} className="p-2 hover:bg-orange-500/10 rounded-lg text-orange-400" title="Adjust Stock">
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 bg-white/5 border-t border-white/5 flex items-center justify-between text-xs text-zinc-400">
            <span>Showing {filtered.length} of {materials.length} items</span>
            <span>Total value: &#8377;{filtered.reduce((s, m) => s + m.current_stock * (m.purchase_price || 0), 0).toLocaleString()}</span>
          </div>
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((m) => {
            const badge = getStockBadge(m);
            const value = m.current_stock * (m.purchase_price || 0);
            const stockPercent = m.min_stock > 0 ? Math.min((m.current_stock / m.min_stock) * 100, 100) : 100;
            return (
              <motion.div key={m.id} whileHover={{ scale: 1.01 }}
                className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl rounded-2xl p-5 border border-white/10 hover:border-white/20 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-white text-sm">{m.name || 'Unnamed'}</h3>
                    <p className="text-xs text-zinc-500 font-mono">{m.code || '-'}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                    {badge.label}
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Stock</span>
                    <span className={m.current_stock <= m.min_stock ? 'text-red-400 font-medium' : 'text-white font-medium'}>
                      {m.current_stock} {m.unit || ''}
                    </span>
                  </div>
                  {/* Stock bar */}
                  <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${
                      stockPercent <= 25 ? 'bg-red-500' : stockPercent <= 50 ? 'bg-yellow-500' : 'bg-green-500'
                    }`} style={{ width: `${stockPercent}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>Min: {m.min_stock}</span>
                    <span>&#8377;{value.toLocaleString()}</span>
                  </div>
                  {m.location && (
                    <div className="flex items-center gap-1 text-xs text-zinc-500">
                      <MapPin className="w-3 h-3" /> {m.location}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-4 pt-3 border-t border-white/5">
                  <button onClick={() => setSelectedMaterial(m)} className="flex-1 py-2 bg-white/5 hover:bg-blue-500/10 rounded-lg text-xs text-zinc-300 hover:text-blue-400 transition-all">
                    View
                  </button>
                  <button onClick={() => { setShowAdjustment(m); setAdjustQty(m.current_stock); }} className="flex-1 py-2 bg-white/5 hover:bg-orange-500/10 rounded-lg text-xs text-zinc-300 hover:text-orange-400 transition-all">
                    Adjust
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <Package className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400">No materials found</p>
          <p className="text-xs text-zinc-500 mt-1">Try adjusting your search or filters</p>
        </div>
      )}

      {/* Material Detail Modal */}
      <AnimatePresence>
        {selectedMaterial && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedMaterial(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">{selectedMaterial.name}</h2>
                  <p className="text-sm text-zinc-500 font-mono">{selectedMaterial.code}</p>
                </div>
                <button onClick={() => setSelectedMaterial(null)} className="p-2 hover:bg-white/5 rounded-xl text-zinc-400 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Category', value: selectedMaterial.category || 'N/A' },
                    { label: 'Unit', value: selectedMaterial.unit || 'N/A' },
                    { label: 'Current Stock', value: `${selectedMaterial.current_stock} ${selectedMaterial.unit || ''}` },
                    { label: 'Min Stock', value: String(selectedMaterial.min_stock) },
                    { label: 'Purchase Price', value: `₹${(selectedMaterial.purchase_price || 0).toLocaleString()}` },
                    { label: 'Stock Value', value: `₹${(selectedMaterial.current_stock * (selectedMaterial.purchase_price || 0)).toLocaleString()}` },
                    { label: 'Location', value: selectedMaterial.location || 'N/A' },
                    { label: 'Supplier', value: selectedMaterial.supplier || 'N/A' },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-white/5 rounded-xl p-3">
                      <p className="text-xs text-zinc-500 mb-1">{label}</p>
                      <p className="text-sm font-medium">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => { setShowAdjustment(selectedMaterial); setAdjustQty(selectedMaterial.current_stock); setSelectedMaterial(null); }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 rounded-xl text-sm text-orange-400 transition-all">
                    <Edit2 className="w-4 h-4" /> Adjust Stock
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stock Adjustment Modal */}
      <AnimatePresence>
        {showAdjustment && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-4"
            onClick={() => setShowAdjustment(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-lg font-bold">Stock Adjustment</h2>
                <button onClick={() => setShowAdjustment(null)} className="p-2 hover:bg-white/5 rounded-xl text-zinc-400 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="font-medium">{showAdjustment.name}</p>
                  <p className="text-sm text-zinc-400">Current: {showAdjustment.current_stock} {showAdjustment.unit || ''}</p>
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Adjustment Type</label>
                  <select value={adjustType} onChange={e => setAdjustType(e.target.value as typeof adjustType)}
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-blue-500">
                    <option value="physical_count">Physical Count</option>
                    <option value="damage">Damage</option>
                    <option value="correction">Correction</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Adjusted Quantity</label>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setAdjustQty(q => Math.max(0, q - 1))} className="p-2.5 bg-white/5 hover:bg-red-500/10 rounded-xl border border-white/10 transition-all">
                      <Minus className="w-4 h-4" />
                    </button>
                    <input type="number" value={adjustQty} onChange={e => setAdjustQty(Number(e.target.value))}
                      className="flex-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-center focus:outline-none focus:border-blue-500" />
                    <button onClick={() => setAdjustQty(q => q + 1)} className="p-2.5 bg-white/5 hover:bg-green-500/10 rounded-xl border border-white/10 transition-all">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {adjustQty !== showAdjustment.current_stock && (
                    <p className={`text-xs mt-2 ${adjustQty > showAdjustment.current_stock ? 'text-green-400' : 'text-red-400'}`}>
                      {adjustQty > showAdjustment.current_stock ? '+' : ''}{adjustQty - showAdjustment.current_stock} {showAdjustment.unit || ''}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Reason *</label>
                  <textarea value={adjustReason} onChange={e => setAdjustReason(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-blue-500 resize-none h-20"
                    placeholder="Reason for adjustment..." />
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setShowAdjustment(null)} className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-sm transition-all">
                    Cancel
                  </button>
                  <button onClick={handleAdjustment} disabled={adjusting || !adjustReason || adjustQty === showAdjustment.current_stock}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-medium transition-all disabled:opacity-50">
                    {adjusting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {adjusting ? 'Saving...' : 'Save Adjustment'}
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

