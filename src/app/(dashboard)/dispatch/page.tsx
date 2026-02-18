'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, Package, Clock, CheckCircle, FileText, Printer, Eye, Sparkles, RefreshCw, Plus, X, Save, Search } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import DeliveryChallanTemplate, { DeliveryChallanData } from '../purchase/documents/DeliveryChallanTemplate';
import { COMPANY_INFO } from '../purchase/documents/DocumentTemplates';
import { db } from '@/lib/firebase/client';
import { collection, onSnapshot, addDoc, updateDoc, doc, query, orderBy } from 'firebase/firestore';

interface DispatchRecord {
  id: string;
  dcNumber: string;
  consigneeName: string;
  itemCount: number;
  status: 'ready' | 'in_transit' | 'delivered';
  createdAt: string;
  dispatchDate?: string;
  deliveredDate?: string;
  dcData?: DeliveryChallanData;
}

export default function DispatchPage() {
  const [showPreview, setShowPreview] = useState(false);
  const [dcData, setDCData] = useState<DeliveryChallanData | null>(null);
  const [dispatches, setDispatches] = useState<DispatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  // ════════ FIREBASE LISTENER ════════
  useEffect(() => {
    const q = query(collection(db, 'dispatches'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const items: DispatchRecord[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as DispatchRecord));
      setDispatches(items);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  const stats = useMemo(() => ({
    ready: dispatches.filter(d => d.status === 'ready').length,
    inTransit: dispatches.filter(d => d.status === 'in_transit').length,
    delivered: dispatches.filter(d => d.status === 'delivered').length,
    total: dispatches.length
  }), [dispatches]);

  const filteredDispatches = useMemo(() => {
    if (!search) return dispatches;
    const s = search.toLowerCase();
    return dispatches.filter(d => d.dcNumber.toLowerCase().includes(s) || d.consigneeName.toLowerCase().includes(s));
  }, [dispatches, search]);

  // Handle Print
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `DC_${dcData?.dcNumber || 'Preview'}`,
  });

  const handleViewDC = (record: DispatchRecord) => {
    if (record.dcData) {
      setDCData(record.dcData);
      setShowPreview(true);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: DispatchRecord['status']) => {
    try {
      const updates: Record<string, string> = { status: newStatus };
      if (newStatus === 'in_transit') updates.dispatchDate = new Date().toISOString();
      if (newStatus === 'delivered') updates.deliveredDate = new Date().toISOString();
      await updateDoc(doc(db, 'dispatches', id), updates);
    } catch (err) {
      console.error('Error updating dispatch:', err);
    }
  };

  // Load sample DC for preview
  const handleLoadSample = () => {
    const sampleDC: DeliveryChallanData = {
      dcNumber: 'DC-2026-TEST-001',
      dcDate: '2026-02-07',
      poNumber: 'PO-2026-001',
      poDate: '2026-02-05',
      consignor: { name: COMPANY_INFO.name, address: COMPANY_INFO.units.unit1.address, gstin: COMPANY_INFO.gstin, stateCode: '37', phone: COMPANY_INFO.units.unit1.phone },
      consignee: { name: 'ABC Manufacturing Ltd', address: 'Plot 23, SIPCOT Industrial Park, Chennai - 600058', gstin: '33AABCA1234N1Z5', stateCode: '33', phone: '+91 9876543210' },
      transport: { mode: 'Road', vehicleNumber: 'TN22AB1234', driverName: 'Ramesh Kumar', driverPhone: '+91 9876543210', lrNumber: 'LR-2026-456', lrDate: '2026-02-07', eWayBillNo: 'EWB123456789012', eWayBillDate: '2026-02-07' },
      items: [
        { slNo: 1, itemCode: 'FRP-BODY-01', description: 'FRP Body Panel - Type A', hsnCode: '39269099', quantity: 25, unit: 'Pcs', remarks: 'Handle with care' },
        { slNo: 2, itemCode: 'FRP-HOOD-02', description: 'FRP Hood Cover - Standard', hsnCode: '39269099', quantity: 10, unit: 'Pcs', remarks: '' },
      ],
      reason: 'Supply',
      reasonRemarks: 'Against Purchase Order',
      preparedBy: 'Store Manager',
      checkedBy: 'Quality Inspector',
      approvedBy: 'Dispatch Head',
      remarks: 'Urgent delivery.'
    };
    setDCData(sampleDC);
    setShowPreview(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-500/20 rounded-2xl">
              <Truck className="w-8 h-8 text-orange-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Dispatch & Delivery Challan</h1>
              <p className="text-zinc-500">Quick DC Creation & Print</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLoadSample}
            className="p-6 rounded-2xl border-2 bg-white/5 border-white/10 hover:border-blue-500/50 hover:bg-blue-500/10 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <Sparkles className="w-6 h-6 text-blue-400" />
              </div>
              <div className="text-left flex-1">
                <h3 className="font-bold text-lg text-white">Preview Sample DC</h3>
                <p className="text-sm text-zinc-500">View sample Delivery Challan format</p>
              </div>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: dcData ? 1.02 : 1, y: dcData ? -2 : 0 }}
            whileTap={{ scale: dcData ? 0.98 : 1 }}
            onClick={() => dcData && handlePrint()}
            disabled={!dcData}
            className={`p-6 rounded-2xl border-2 transition-all ${!dcData ? 'bg-white/5 border-white/10 opacity-50 cursor-not-allowed' : 'bg-gradient-to-br from-emerald-500/20 to-green-500/20 border-green-500/50 hover:border-green-400/70'}`}
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-500/30 rounded-xl">
                <Printer className="w-6 h-6 text-green-400" />
              </div>
              <div className="text-left flex-1">
                <h3 className="font-bold text-lg text-white">Print DC</h3>
                <p className="text-sm text-zinc-500">Print or save as PDF</p>
              </div>
            </div>
          </motion.button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-xl">
                <Package className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.ready}</p>
                <p className="text-xs text-zinc-500">Ready to Ship</p>
              </div>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/20 rounded-xl">
                <Clock className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.inTransit}</p>
                <p className="text-xs text-zinc-500">In Transit</p>
              </div>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-xl">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.delivered}</p>
                <p className="text-xs text-zinc-500">Delivered</p>
              </div>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/20 rounded-xl">
                <Truck className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
                <p className="text-xs text-zinc-500">Total Shipments</p>
              </div>
            </div>
          </div>
        </div>

        {/* Dispatch Records Table */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden mb-8">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2"><FileText className="w-5 h-5" /> Dispatch Records</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search DC..."
                className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500/50 w-56" />
            </div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12"><RefreshCw className="w-5 h-5 text-orange-400 animate-spin mr-2" /><span className="text-zinc-400">Loading...</span></div>
          ) : filteredDispatches.length === 0 ? (
            <div className="text-center py-12">
              <Truck className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
              <p className="text-zinc-500 text-sm">No dispatch records yet</p>
              <p className="text-zinc-600 text-xs mt-1">Dispatches from FG Store will appear here</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase">DC Number</th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Consignee</th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Items</th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDispatches.map(d => (
                  <tr key={d.id} className="border-b border-white/5 hover:bg-white/5 transition-all">
                    <td className="px-4 py-3 text-sm text-white font-mono">{d.dcNumber}</td>
                    <td className="px-4 py-3 text-sm text-zinc-400">{d.consigneeName}</td>
                    <td className="px-4 py-3 text-sm text-zinc-400">{d.itemCount} items</td>
                    <td className="px-4 py-3 text-sm text-zinc-400">{d.createdAt?.split('T')[0] || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${
                        d.status === 'ready' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                        d.status === 'in_transit' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                        'bg-green-500/20 text-green-400 border-green-500/30'
                      }`}>{d.status === 'in_transit' ? 'In Transit' : d.status === 'ready' ? 'Ready' : 'Delivered'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {d.dcData && <button onClick={() => handleViewDC(d)} className="p-1.5 hover:bg-white/10 rounded-lg" title="View DC"><Eye className="w-4 h-4 text-zinc-400" /></button>}
                        {d.status === 'ready' && <button onClick={() => handleUpdateStatus(d.id, 'in_transit')} className="p-1.5 hover:bg-yellow-500/20 rounded-lg" title="Mark In Transit"><Truck className="w-4 h-4 text-yellow-400" /></button>}
                        {d.status === 'in_transit' && <button onClick={() => handleUpdateStatus(d.id, 'delivered')} className="p-1.5 hover:bg-green-500/20 rounded-lg" title="Mark Delivered"><CheckCircle className="w-4 h-4 text-green-400" /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-blue-500/20 rounded-lg shrink-0">
              <FileText className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">📋 How to Use:</h3>
              <ol className="space-y-2 text-sm text-zinc-400">
                <li><span className="text-blue-400 font-medium">1.</span> Click <span className="text-white font-medium">"Load Sample Data (Test)"</span> to load test DC data</li>
                <li><span className="text-blue-400 font-medium">2.</span> Click <span className="text-white font-medium">"Show Preview"</span> to see the DC format</li>
                <li><span className="text-blue-400 font-medium">3.</span> Click <span className="text-white font-medium">"Print DC"</span> to print or save as PDF</li>
                <li className="text-zinc-500 text-xs mt-3">💡 For real DCs, go to <span className="text-emerald-400">/purchase/documents/dc</span> to create with your actual data</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Hidden Print Content */}
        <div className="hidden">
          {dcData && (
            <div ref={printRef}>
              <DeliveryChallanTemplate data={dcData} copyType="ORIGINAL" />
            </div>
          )}
        </div>
      </motion.div>

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreview && dcData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setShowPreview(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              {/* Preview Header */}
              <div className="sticky top-0 bg-zinc-900 text-white p-4 flex items-center justify-between border-b border-zinc-800 z-10">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  DC Preview
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePrint()}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg transition-colors"
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </button>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
              {/* DC Content */}
              <DeliveryChallanTemplate data={dcData} copyType="ORIGINAL" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
