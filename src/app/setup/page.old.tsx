'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Database, 
  Plus, 
  CheckCircle, 
  RefreshCw,
  Package,
  Building2,
  AlertTriangle
} from 'lucide-react';
import { db } from '@/lib/firebase/client';
import { 
  collection, 
  writeBatch,
  doc
} from 'firebase/firestore';
import { COLLECTIONS } from '@/types/purchase';

// Sample Inventory Items
const SAMPLE_INVENTORY = [
  { itemID: 'INV001', name: 'Gelcoat White', code: 'GC-WHT-001', category: 'Raw Material', currentStock: 500, minLevel: 200, unit: 'Kg', location: 'Rack A1' },
  { itemID: 'INV002', name: 'Gelcoat Black', code: 'GC-BLK-002', category: 'Raw Material', currentStock: 150, minLevel: 100, unit: 'Kg', location: 'Rack A2' },
  { itemID: 'INV003', name: 'Fiberglass Mat', code: 'FG-MAT-003', category: 'Raw Material', currentStock: 80, minLevel: 150, unit: 'Rolls', location: 'Rack B1' },
  { itemID: 'INV004', name: 'Resin Polyester', code: 'RS-POL-004', category: 'Raw Material', currentStock: 300, minLevel: 250, unit: 'Liters', location: 'Rack B2' },
  { itemID: 'INV005', name: 'Hardener MEKP', code: 'HD-MKP-005', category: 'Raw Material', currentStock: 50, minLevel: 30, unit: 'Liters', location: 'Rack C1' },
  { itemID: 'INV006', name: 'Release Wax', code: 'RW-WAX-006', category: 'Consumable', currentStock: 25, minLevel: 20, unit: 'Kg', location: 'Rack C2' },
  { itemID: 'INV007', name: 'Acetone', code: 'AC-SOL-007', category: 'Consumable', currentStock: 100, minLevel: 50, unit: 'Liters', location: 'Rack D1' },
  { itemID: 'INV008', name: 'Brushes Set', code: 'BR-SET-008', category: 'Tool', currentStock: 10, minLevel: 5, unit: 'Sets', location: 'Rack D2' },
  { itemID: 'INV009', name: 'Safety Gloves', code: 'SG-GLV-009', category: 'Safety Equipment', currentStock: 100, minLevel: 50, unit: 'Pairs', location: 'Rack E1' },
  { itemID: 'INV010', name: 'Safety Mask N95', code: 'SM-N95-010', category: 'Safety Equipment', currentStock: 200, minLevel: 100, unit: 'Pieces', location: 'Rack E2' },
];

// Sample Vendors
const SAMPLE_VENDORS = [
  { id: 'VND001', name: 'Supreme Chemicals Pvt Ltd', contact: 'Rajesh Kumar', phone: '+91 9876543210', email: 'sales@supremechem.com', gstin: '27AABCS1234F1ZX', address: 'Plot 45, MIDC Industrial Area', city: 'Pune' },
  { id: 'VND002', name: 'Fiberglass India Corp', contact: 'Amit Sharma', phone: '+91 9765432109', email: 'info@fiberglass.co.in', gstin: '27AABCF5678G2YZ', address: 'Unit 12, Industrial Estate', city: 'Mumbai' },
  { id: 'VND003', name: 'SafeGuard Equipments', contact: 'Priya Patel', phone: '+91 9654321098', email: 'orders@safeguard.in', gstin: '27AABCS9012H3AB', address: 'Shop 8, Main Market', city: 'Nashik' },
  { id: 'VND004', name: 'Industrial Tools Mart', contact: 'Vikram Singh', phone: '+91 9543210987', email: 'sales@toolsmart.com', gstin: '27AABCI3456I4CD', address: 'Building 3, Tool Complex', city: 'Aurangabad' },
  { id: 'VND005', name: 'Composite Materials Ltd', contact: 'Suresh Reddy', phone: '+91 9432109876', email: 'contact@compositemat.in', gstin: '27AABCC7890J5EF', address: 'Sector 15, Chemical Zone', city: 'Hyderabad' },
];

export default function SetupDataPage() {
  const [status, setStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [completed, setCompleted] = useState<string[]>([]);

  const addSampleInventory = async () => {
    setIsLoading(true);
    setStatus('Adding inventory items...');
    
    try {
      const batch = writeBatch(db);
      
      SAMPLE_INVENTORY.forEach((item) => {
        const docRef = doc(collection(db, COLLECTIONS.INVENTORY));
        batch.set(docRef, {
          ...item,
          lastUpdated: new Date().toISOString()
        });
      });
      
      await batch.commit();
      setCompleted(prev => [...prev, 'inventory']);
      setStatus('✅ Added ' + SAMPLE_INVENTORY.length + ' inventory items');
    } catch (error) {
      console.error('Error adding inventory:', error);
      setStatus('❌ Failed to add inventory');
    } finally {
      setIsLoading(false);
    }
  };

  const addSampleVendors = async () => {
    setIsLoading(true);
    setStatus('Adding vendors...');
    
    try {
      const batch = writeBatch(db);
      
      SAMPLE_VENDORS.forEach((vendor) => {
        const docRef = doc(collection(db, COLLECTIONS.VENDORS));
        batch.set(docRef, vendor);
      });
      
      await batch.commit();
      setCompleted(prev => [...prev, 'vendors']);
      setStatus('✅ Added ' + SAMPLE_VENDORS.length + ' vendors');
    } catch (error) {
      console.error('Error adding vendors:', error);
      setStatus('❌ Failed to add vendors');
    } finally {
      setIsLoading(false);
    }
  };

  const addAllSampleData = async () => {
    await addSampleInventory();
    await addSampleVendors();
    setStatus('✅ All sample data added successfully!');
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Database className="w-8 h-8 text-cyan-400" />
          Setup Sample Data
        </h1>
        <p className="text-zinc-400 mt-1">Initialize database with sample inventory and vendors for testing</p>
      </div>

      {/* Warning */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-8">
        <div className="flex items-center gap-2 text-yellow-400 mb-2">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-medium">Development Use Only</span>
        </div>
        <p className="text-sm text-zinc-400">
          This will add sample data to Firebase. Only use this for testing purposes.
        </p>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={addSampleInventory}
          disabled={isLoading || completed.includes('inventory')}
          className={`p-6 rounded-xl border transition-colors ${
            completed.includes('inventory')
              ? 'bg-green-500/10 border-green-500/30'
              : 'bg-zinc-900/50 border-zinc-800 hover:border-blue-500/50'
          } disabled:opacity-50`}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-lg ${completed.includes('inventory') ? 'bg-green-500/20' : 'bg-blue-500/20'}`}>
              {completed.includes('inventory') ? (
                <CheckCircle className="w-6 h-6 text-green-400" />
              ) : (
                <Package className="w-6 h-6 text-blue-400" />
              )}
            </div>
            <span className="font-semibold">Inventory Items</span>
          </div>
          <p className="text-sm text-zinc-400 text-left">
            Add {SAMPLE_INVENTORY.length} sample items (Gelcoat, Resin, Fiberglass, etc.)
          </p>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={addSampleVendors}
          disabled={isLoading || completed.includes('vendors')}
          className={`p-6 rounded-xl border transition-colors ${
            completed.includes('vendors')
              ? 'bg-green-500/10 border-green-500/30'
              : 'bg-zinc-900/50 border-zinc-800 hover:border-blue-500/50'
          } disabled:opacity-50`}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-lg ${completed.includes('vendors') ? 'bg-green-500/20' : 'bg-purple-500/20'}`}>
              {completed.includes('vendors') ? (
                <CheckCircle className="w-6 h-6 text-green-400" />
              ) : (
                <Building2 className="w-6 h-6 text-purple-400" />
              )}
            </div>
            <span className="font-semibold">Vendors</span>
          </div>
          <p className="text-sm text-zinc-400 text-left">
            Add {SAMPLE_VENDORS.length} sample vendors with GST details
          </p>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={addAllSampleData}
          disabled={isLoading || (completed.includes('inventory') && completed.includes('vendors'))}
          className="p-6 rounded-xl border bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-500/30 hover:border-cyan-500/50 transition-colors disabled:opacity-50"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <Plus className="w-6 h-6 text-cyan-400" />
            </div>
            <span className="font-semibold">Add All Data</span>
          </div>
          <p className="text-sm text-zinc-400 text-left">
            Add both inventory items and vendors at once
          </p>
        </motion.button>
      </div>

      {/* Status */}
      {status && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4"
        >
          <div className="flex items-center gap-2">
            {isLoading && <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />}
            <span>{status}</span>
          </div>
        </motion.div>
      )}

      {/* Sample Data Preview */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Inventory Preview */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl">
          <div className="p-4 border-b border-zinc-800">
            <h3 className="font-semibold flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-400" />
              Sample Inventory ({SAMPLE_INVENTORY.length} items)
            </h3>
          </div>
          <div className="p-4 max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="text-zinc-500 text-xs">
                <tr>
                  <th className="text-left pb-2">Name</th>
                  <th className="text-right pb-2">Stock</th>
                  <th className="text-right pb-2">Min</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {SAMPLE_INVENTORY.map((item) => (
                  <tr key={item.code}>
                    <td className="py-2">{item.name}</td>
                    <td className="py-2 text-right">{item.currentStock} {item.unit}</td>
                    <td className={`py-2 text-right ${item.currentStock <= item.minLevel ? 'text-red-400' : 'text-zinc-400'}`}>
                      {item.minLevel}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Vendors Preview */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl">
          <div className="p-4 border-b border-zinc-800">
            <h3 className="font-semibold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-purple-400" />
              Sample Vendors ({SAMPLE_VENDORS.length} vendors)
            </h3>
          </div>
          <div className="p-4 max-h-64 overflow-y-auto">
            <div className="space-y-3">
              {SAMPLE_VENDORS.map((vendor) => (
                <div key={vendor.id} className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="font-medium">{vendor.name}</p>
                  <p className="text-xs text-zinc-400">{vendor.city} • {vendor.phone}</p>
                  <p className="text-xs text-zinc-500">GSTIN: {vendor.gstin}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Workflow Info */}
      <div className="mt-8 p-6 bg-zinc-900/50 border border-zinc-800 rounded-xl">
        <h3 className="font-semibold mb-4">📋 Purchase Order Workflow</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="font-medium text-blue-400 mb-1">1. Purchase Team</p>
            <p className="text-zinc-400">Creates PO on /purchase page</p>
          </div>
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="font-medium text-yellow-400 mb-1">2. MD Approval</p>
            <p className="text-zinc-400">If &gt;₹50K, needs MD approval at /md/approvals</p>
          </div>
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <p className="font-medium text-green-400 mb-1">3. Store Receives</p>
            <p className="text-zinc-400">Store manager sees in /store &amp; creates GRN</p>
          </div>
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <p className="font-medium text-emerald-400 mb-1">4. Stock Updated</p>
            <p className="text-zinc-400">Inventory automatically increases</p>
          </div>
        </div>
      </div>
    </div>
  );
}
