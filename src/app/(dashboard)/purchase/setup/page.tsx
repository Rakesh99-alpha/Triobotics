'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Upload, CheckCircle, AlertTriangle, Loader2, 
  Package, Database, RefreshCw, Trash2
} from 'lucide-react';
import { db } from '@/lib/firebase/client';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';
import { PURCHASE_MATERIALS, generateMaterialCode } from '../seedMaterials';

const FB_MATERIALS = 'inventory_materials';

export default function SeedMaterialsPage() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'seeding' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [existingCount, setExistingCount] = useState(0);

  // Check existing materials
  const checkExisting = async () => {
    try {
      const snapshot = await getDocs(collection(db, FB_MATERIALS));
      setExistingCount(snapshot.size);
      return snapshot.size;
    } catch (error) {
      console.error('Error checking materials:', error);
      return 0;
    }
  };

  // Seed all materials to Firebase
  const seedMaterials = async () => {
    setIsSeeding(true);
    setStatus('seeding');
    setProgress(0);
    setMessage('Starting material import...');

    try {
      const total = PURCHASE_MATERIALS.length;
      let added = 0;
      let skipped = 0;

      for (let i = 0; i < total; i++) {
        const material = PURCHASE_MATERIALS[i];
        const code = generateMaterialCode(material.slNo);

        // Check if material already exists
        const existingQuery = query(
          collection(db, FB_MATERIALS),
          where('code', '==', code)
        );
        const existing = await getDocs(existingQuery);

        if (existing.empty) {
          // Add new material
          await addDoc(collection(db, FB_MATERIALS), {
            code: code,
            name: material.name,
            unit: material.unit,
            category: material.category,
            current_stock: 0,
            min_stock: material.minStock,
            purchase_price: 0,
            supplier_id: '',
            supplier_name: '',
            last_updated: new Date().toISOString(),
            created_at: new Date().toISOString(),
          });
          added++;
        } else {
          skipped++;
        }

        setProgress(Math.round(((i + 1) / total) * 100));
        setMessage(`Processing: ${material.name} (${i + 1}/${total})`);
      }

      setStatus('success');
      setMessage(`Successfully imported ${added} materials. ${skipped} already existed.`);
      await checkExisting();
    } catch (error) {
      console.error('Error seeding materials:', error);
      setStatus('error');
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSeeding(false);
    }
  };

  // Clear all materials (use with caution)
  const clearAllMaterials = async () => {
    if (!confirm('Are you sure you want to delete ALL materials? This cannot be undone!')) {
      return;
    }

    setIsSeeding(true);
    setStatus('seeding');
    setMessage('Deleting all materials...');

    try {
      const snapshot = await getDocs(collection(db, FB_MATERIALS));
      const total = snapshot.size;
      let deleted = 0;

      for (const docSnapshot of snapshot.docs) {
        await deleteDoc(doc(db, FB_MATERIALS, docSnapshot.id));
        deleted++;
        setProgress(Math.round((deleted / total) * 100));
        setMessage(`Deleting: ${deleted}/${total}`);
      }

      setStatus('success');
      setMessage(`Deleted ${deleted} materials.`);
      setExistingCount(0);
    } catch (error) {
      console.error('Error clearing materials:', error);
      setStatus('error');
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSeeding(false);
    }
  };

  React.useEffect(() => {
    checkExisting();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Purchase Materials Setup</h1>
          <p className="text-zinc-400">Import all 165 materials for composite manufacturing</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{PURCHASE_MATERIALS.length}</p>
                <p className="text-sm text-zinc-500">Total Materials</p>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                <Database className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{existingCount}</p>
                <p className="text-sm text-zinc-500">In Database</p>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <Upload className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{Math.max(0, PURCHASE_MATERIALS.length - existingCount)}</p>
                <p className="text-sm text-zinc-500">To Import</p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress */}
        {isSeeding && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
              <span className="text-white font-medium">Processing...</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-3 mb-2">
              <motion.div
                className="bg-gradient-to-r from-blue-500 to-cyan-500 h-3 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-sm text-zinc-400">{message}</p>
          </div>
        )}

        {/* Status Message */}
        {status === 'success' && !isSeeding && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6 mb-8">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-emerald-400" />
              <span className="text-emerald-400 font-medium">{message}</span>
            </div>
          </div>
        )}

        {status === 'error' && !isSeeding && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 mb-8">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-400" />
              <span className="text-red-400 font-medium">{message}</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 mb-8">
          <motion.button
            onClick={seedMaterials}
            disabled={isSeeding}
            className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: isSeeding ? 1 : 1.02 }}
            whileTap={{ scale: isSeeding ? 1 : 0.98 }}
          >
            {isSeeding ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Upload className="w-5 h-5" />
            )}
            Import All Materials
          </motion.button>

          <motion.button
            onClick={checkExisting}
            disabled={isSeeding}
            className="px-6 py-4 bg-zinc-800 border border-zinc-700 text-white font-medium rounded-xl hover:bg-zinc-700 transition-all disabled:opacity-50"
            whileHover={{ scale: isSeeding ? 1 : 1.02 }}
            whileTap={{ scale: isSeeding ? 1 : 0.98 }}
          >
            <RefreshCw className="w-5 h-5" />
          </motion.button>

          <motion.button
            onClick={clearAllMaterials}
            disabled={isSeeding}
            className="px-6 py-4 bg-red-500/20 border border-red-500/30 text-red-400 font-medium rounded-xl hover:bg-red-500/30 transition-all disabled:opacity-50"
            whileHover={{ scale: isSeeding ? 1 : 1.02 }}
            whileTap={{ scale: isSeeding ? 1 : 0.98 }}
          >
            <Trash2 className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Materials Preview */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-zinc-800">
            <h2 className="text-lg font-semibold text-white">Materials List Preview</h2>
            <p className="text-sm text-zinc-500">165 items across 4 categories</p>
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full">
              <thead className="bg-zinc-800/50 sticky top-0">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase">SL.No</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase">Code</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase">Item Description</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase">UOM</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase">Category</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-zinc-500 uppercase">Min Stock</th>
                </tr>
              </thead>
              <tbody>
                {PURCHASE_MATERIALS.map((material) => (
                  <tr key={material.slNo} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="py-3 px-4 text-zinc-400 text-sm">{material.slNo}</td>
                    <td className="py-3 px-4 font-mono text-cyan-400 text-sm">{generateMaterialCode(material.slNo)}</td>
                    <td className="py-3 px-4 text-white text-sm">{material.name}</td>
                    <td className="py-3 px-4 text-zinc-400 text-sm">{material.unit}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        material.category === 'Raw Material' ? 'bg-blue-500/20 text-blue-400' :
                        material.category === 'Consumable' ? 'bg-amber-500/20 text-amber-400' :
                        material.category === 'Tool' ? 'bg-purple-500/20 text-purple-400' :
                        'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {material.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-zinc-400 text-sm">{material.minStock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
