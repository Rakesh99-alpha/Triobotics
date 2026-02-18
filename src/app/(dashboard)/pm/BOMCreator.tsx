'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Plus, Trash2, Search, Package, AlertTriangle,
  CheckCircle, Loader2, FileText, Send, ClipboardList
} from 'lucide-react';
import {
  createBOM,
  submitBOMForStockCheck,
  createPRFromBOM,
  subscribeToMaterials,
} from '@/lib/services/procurementService';
import { BOMItem, PRItem } from '@/types/purchase';

interface BOMCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
}

interface Material {
  id: string;
  code: string;
  name: string;
  category: string;
  currentStock: number;
  minLevel: number;
  unit: string;
  lastUnitPrice?: number;
}

export default function BOMCreator({ isOpen, onClose, projectId, projectName }: BOMCreatorProps) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [requiredDate, setRequiredDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'create' | 'checking' | 'result'>('create');
  const [stockCheckResult, setStockCheckResult] = useState<{ shortItems: PRItem[], allAvailable: boolean } | null>(null);
  const [createdBomId, setCreatedBomId] = useState<string | null>(null);

  // Get current user
  const getCurrentUser = () => {
    if (typeof window === 'undefined') return { id: '', name: '', role: '' };
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return { id: '', name: '', role: '' };
      }
    }
    return { id: '', name: '', role: '' };
  };

  // Subscribe to materials
  useEffect(() => {
    const unsubscribe = subscribeToMaterials((mats) => {
      setMaterials(mats);
    });
    return () => unsubscribe();
  }, []);

  // Filter materials
  const filteredMaterials = materials.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Add material to BOM
  const addToBOM = (material: Material) => {
    if (bomItems.find(item => item.materialId === material.id)) {
      alert('Material already added');
      return;
    }

    const newItem: BOMItem = {
      materialId: material.id,
      materialCode: material.code,
      materialName: material.name,
      requiredQty: 1,
      unit: material.unit,
      currentStock: material.currentStock,
      shortfall: Math.max(0, 1 - material.currentStock),
      estimatedCost: material.lastUnitPrice || 0,
    };

    setBomItems([...bomItems, newItem]);
    setSearchTerm('');
  };

  // Update item quantity
  const updateItemQty = (index: number, qty: number) => {
    const updated = [...bomItems];
    updated[index].requiredQty = qty;
    updated[index].shortfall = Math.max(0, qty - updated[index].currentStock);
    updated[index].estimatedCost = qty * (materials.find(m => m.id === updated[index].materialId)?.lastUnitPrice || 0);
    setBomItems(updated);
  };

  // Remove item
  const removeItem = (index: number) => {
    setBomItems(bomItems.filter((_, i) => i !== index));
  };

  // Total estimated cost
  const totalCost = bomItems.reduce((sum, item) => sum + item.estimatedCost, 0);

  // Submit BOM
  const handleSubmitBOM = async () => {
    if (bomItems.length === 0) {
      alert('Add at least one material');
      return;
    }
    if (!requiredDate) {
      alert('Select required date');
      return;
    }

    setLoading(true);
    setStep('checking');

    try {
      const user = getCurrentUser();

      // Create BOM
      const bomId = await createBOM({
        projectId,
        projectName,
        createdBy: user.id || 'unknown',
        createdByName: user.name || 'Unknown User',
        requiredDate,
        items: bomItems,
        totalEstimatedCost: totalCost,
        notes,
      });

      setCreatedBomId(bomId);

      // Check stock
      const result = await submitBOMForStockCheck(bomId);
      setStockCheckResult(result);
      setStep('result');

    } catch (error) {
      console.error('Error creating BOM:', error);
      alert('Failed to create BOM');
      setStep('create');
    } finally {
      setLoading(false);
    }
  };

  // Generate PR from short items
  const handleGeneratePR = async () => {
    if (!stockCheckResult || stockCheckResult.allAvailable) return;
    if (!createdBomId) return;

    setLoading(true);

    try {
      const user = getCurrentUser();

      await createPRFromBOM(
        createdBomId,
        `BOM-${createdBomId.slice(0, 6)}`,
        projectId,
        projectName,
        user.id || 'unknown',
        user.name || 'Unknown User',
        requiredDate,
        stockCheckResult.shortItems,
        'medium'
      );

      alert('Purchase Request created successfully! Purchase team has been notified.');
      onClose();
      resetForm();

    } catch (error) {
      console.error('Error creating PR:', error);
      alert('Failed to create Purchase Request');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setBomItems([]);
    setRequiredDate('');
    setNotes('');
    setStep('create');
    setStockCheckResult(null);
    setCreatedBomId(null);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Create Bill of Materials</h2>
                <p className="text-sm text-zinc-400">Project: {projectName}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {/* Step: Create BOM */}
            {step === 'create' && (
              <div className="space-y-6">
                {/* Required Date */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Required By Date *</label>
                  <input
                    type="date"
                    value={requiredDate}
                    onChange={e => setRequiredDate(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Material Search */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Add Materials</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Search materials by name or code..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-zinc-800 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  {/* Search Results */}
                  {searchTerm && (
                    <div className="mt-2 bg-zinc-800 border border-white/10 rounded-xl max-h-48 overflow-y-auto">
                      {filteredMaterials.length === 0 ? (
                        <div className="p-4 text-center text-zinc-500">No materials found</div>
                      ) : (
                        filteredMaterials.slice(0, 10).map(material => (
                          <button
                            key={material.id}
                            onClick={() => addToBOM(material)}
                            className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                          >
                            <div className="flex items-center gap-3">
                              <Package className="w-4 h-4 text-purple-400" />
                              <div className="text-left">
                                <p className="text-sm font-medium text-white">{material.name}</p>
                                <p className="text-xs text-zinc-500">{material.code} • Stock: {material.currentStock} {material.unit}</p>
                              </div>
                            </div>
                            <Plus className="w-4 h-4 text-green-400" />
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* BOM Items Table */}
                {bomItems.length > 0 && (
                  <div className="bg-zinc-800/50 border border-white/10 rounded-xl overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-zinc-800/80">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase">Material</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-400 uppercase">Stock</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-400 uppercase">Required</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-400 uppercase">Shortfall</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-400 uppercase">Est. Cost</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-400 uppercase"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {bomItems.map((item, index) => (
                          <tr key={item.materialId} className="border-t border-white/5">
                            <td className="px-4 py-3">
                              <p className="text-sm font-medium text-white">{item.materialName}</p>
                              <p className="text-xs text-zinc-500">{item.materialCode}</p>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`text-sm ${item.currentStock < 10 ? 'text-red-400' : 'text-zinc-300'}`}>
                                {item.currentStock} {item.unit}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <input
                                type="number"
                                min="1"
                                value={item.requiredQty}
                                onChange={e => updateItemQty(index, parseInt(e.target.value) || 1)}
                                className="w-20 px-2 py-1 bg-zinc-700 border border-white/10 rounded-lg text-white text-center text-sm"
                              />
                            </td>
                            <td className="px-4 py-3 text-center">
                              {item.shortfall > 0 ? (
                                <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full">
                                  -{item.shortfall}
                                </span>
                              ) : (
                                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                                  OK
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-zinc-300">
                              ₹{item.estimatedCost.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => removeItem(index)}
                                className="p-1 hover:bg-red-500/20 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4 text-red-400" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-white/10 bg-zinc-800/80">
                          <td colSpan={4} className="px-4 py-3 text-right text-sm font-semibold text-zinc-300">
                            Total Estimated Cost:
                          </td>
                          <td className="px-4 py-3 text-right text-lg font-bold text-purple-400">
                            ₹{totalCost.toLocaleString()}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Notes (Optional)</label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Any special requirements or notes..."
                    className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none h-20"
                  />
                </div>
              </div>
            )}

            {/* Step: Checking Stock */}
            {step === 'checking' && (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-12 h-12 text-purple-400 animate-spin mb-4" />
                <p className="text-lg text-white font-medium">Checking Stock Availability...</p>
                <p className="text-sm text-zinc-400 mt-2">Please wait while we verify inventory levels</p>
              </div>
            )}

            {/* Step: Result */}
            {step === 'result' && stockCheckResult && (
              <div className="space-y-6">
                {/* Result Summary */}
                {stockCheckResult.allAvailable ? (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 text-center">
                    <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-green-400 mb-2">All Materials Available!</h3>
                    <p className="text-zinc-300">Stock levels are sufficient for this project. No purchase required.</p>
                  </div>
                ) : (
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <AlertTriangle className="w-8 h-8 text-orange-400" />
                      <div>
                        <h3 className="text-lg font-bold text-orange-400">Stock Shortage Detected</h3>
                        <p className="text-sm text-zinc-300">{stockCheckResult.shortItems.length} items need to be purchased</p>
                      </div>
                    </div>

                    {/* Short Items Table */}
                    <div className="bg-zinc-800/50 rounded-xl overflow-hidden mt-4">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-zinc-800/80">
                            <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase">Material</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-400 uppercase">Required</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-400 uppercase">In Stock</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-400 uppercase">To Order</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-400 uppercase">Est. Cost</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stockCheckResult.shortItems.map((item) => (
                            <tr key={item.materialId} className="border-t border-white/5">
                              <td className="px-4 py-3">
                                <p className="text-sm font-medium text-white">{item.materialName}</p>
                                <p className="text-xs text-zinc-500">{item.materialCode}</p>
                              </td>
                              <td className="px-4 py-3 text-center text-sm text-zinc-300">
                                {item.requiredQty} {item.unit}
                              </td>
                              <td className="px-4 py-3 text-center text-sm text-red-400">
                                {item.currentStock}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="px-3 py-1 bg-orange-500/20 text-orange-400 text-sm font-semibold rounded-full">
                                  {item.shortfall}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right text-sm text-zinc-300">
                                ₹{item.estimatedTotal.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-white/10 bg-zinc-800/80">
                            <td colSpan={4} className="px-4 py-3 text-right text-sm font-semibold text-zinc-300">
                              Total Purchase Estimate:
                            </td>
                            <td className="px-4 py-3 text-right text-lg font-bold text-orange-400">
                              ₹{stockCheckResult.shortItems.reduce((sum, item) => sum + item.estimatedTotal, 0).toLocaleString()}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-white/10 bg-zinc-900/50">
            <button
              onClick={() => {
                if (step === 'result') {
                  resetForm();
                } else {
                  onClose();
                }
              }}
              className="px-6 py-2.5 text-zinc-400 hover:text-white transition-colors"
            >
              {step === 'result' ? 'Create Another' : 'Cancel'}
            </button>

            <div className="flex items-center gap-3">
              {step === 'create' && (
                <button
                  onClick={handleSubmitBOM}
                  disabled={loading || bomItems.length === 0}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FileText className="w-4 h-4" />
                  Submit BOM & Check Stock
                </button>
              )}

              {step === 'result' && !stockCheckResult?.allAvailable && (
                <button
                  onClick={handleGeneratePR}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Generate Purchase Request
                </button>
              )}

              {step === 'result' && stockCheckResult?.allAvailable && (
                <button
                  onClick={onClose}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
                >
                  <CheckCircle className="w-4 h-4" />
                  Done
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
