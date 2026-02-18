/**
 * Receive Against PO — Store SOP Component
 *
 * Allows store employee to:
 * 1. Select an approved/ordered PO
 * 2. View PO line items with ordered vs already-received
 * 3. Enter received quantities per item
 * 4. Auto-generate GRN against the PO
 * 5. Update PO status (partially_received / received)
 * 6. Auto-update store inventory
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  X,
  CheckCircle2,
  AlertTriangle,
  Search,
  ArrowRight,
  ArrowLeft,
  Save,
  RefreshCw,
  Truck,
  ClipboardCheck,
  Scale,
  FileText,
  Tag,
  Eye,
  ChevronDown,
} from 'lucide-react';
import {
  collection, addDoc, doc, updateDoc, increment,
  query, where, orderBy, onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

// ==========================================
// TYPES
// ==========================================

interface POItem {
  materialId: string;
  materialCode: string;
  materialName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  receivedQty: number;
  pendingQty: number;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorName: string;
  vendorId?: string;
  vendorContact?: string;
  vendorGST?: string;
  vendorAddress?: string;
  items: POItem[];
  totalAmount: number;
  status: string;
  expectedDelivery?: string;
  createdAt: string;
  paymentTerms?: string;
  deliveryTerms?: string;
  notes?: string;
}

interface ReceiveItem {
  materialId: string;
  materialName: string;
  materialCode: string;
  orderedQty: number;
  previouslyReceived: number;
  pendingQty: number;
  nowReceiving: number;
  unit: string;
  unitPrice: number;
  qualityStatus: 'pending' | 'passed' | 'failed' | 'partial';
  batchNumber: string;
  binLocation: string;
  remarks: string;
}

export interface ReceiveAgainstPOSuccessData {
  poNumber: string;
  grnNumber: string;
  receivedItems: { materialName: string; receivedQty: number; unit: string; unitPrice: number; binLocation: string }[];
  totalReceivedValue: number;
  poFullyReceived: boolean;
}

interface ReceiveAgainstPOProps {
  userName: string;
  onClose: () => void;
  onSuccess?: (data: ReceiveAgainstPOSuccessData) => void;
}

// ==========================================
// STEPS
// ==========================================

const STEPS = [
  { id: 1, label: 'Select PO', icon: FileText, desc: 'Choose purchase order to receive' },
  { id: 2, label: 'Check Items', icon: ClipboardCheck, desc: 'Verify quantities & inspect' },
  { id: 3, label: 'QC & Label', icon: Scale, desc: 'Quality check & assign locations' },
  { id: 4, label: 'Review & Save', icon: Tag, desc: 'Create GRN & update stock' },
];

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function ReceiveAgainstPO({ userName, onClose, onSuccess }: ReceiveAgainstPOProps) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // POs
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loadingPOs, setLoadingPOs] = useState(true);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [poSearch, setPOSearch] = useState('');

  // Receive items
  const [receiveItems, setReceiveItems] = useState<ReceiveItem[]>([]);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [challanNumber, setChallanNumber] = useState('');
  const [remarks, setRemarks] = useState('');

  const grnNumber = `GRN-${Date.now().toString(36).toUpperCase()}`;

  // ==========================================
  // LOAD PURCHASE ORDERS
  // ==========================================
  useEffect(() => {
    let unsub: (() => void) | undefined;
    setLoadingPOs(true);
    try {
      const q = query(
        collection(db, 'purchase_orders'),
        where('status', 'in', ['ordered', 'partially_received', 'approved']),
        orderBy('createdAt', 'desc')
      );
      unsub = onSnapshot(q, (snap) => {
        const pos = snap.docs.map(d => ({ id: d.id, ...d.data() } as PurchaseOrder));
        setPurchaseOrders(pos);
        setLoadingPOs(false);
      }, (err) => {
        console.warn('PO listener error:', err);
        setLoadingPOs(false);
      });
    } catch {
      setLoadingPOs(false);
    }
    return () => { if (unsub) unsub(); };
  }, []);

  // ==========================================
  // SELECT PO → BUILD RECEIVE ITEMS
  // ==========================================
  const selectPO = useCallback((po: PurchaseOrder) => {
    setSelectedPO(po);
    const rItems: ReceiveItem[] = (po.items || []).map(item => ({
      materialId: item.materialId,
      materialName: item.materialName,
      materialCode: item.materialCode,
      orderedQty: item.quantity,
      previouslyReceived: item.receivedQty || 0,
      pendingQty: (item.quantity - (item.receivedQty || 0)),
      nowReceiving: Math.max(0, item.quantity - (item.receivedQty || 0)),
      unit: item.unit,
      unitPrice: item.unitPrice,
      qualityStatus: 'passed' as const,
      batchNumber: '',
      binLocation: '',
      remarks: '',
    }));
    setReceiveItems(rItems);
    setStep(2);
  }, []);

  // ==========================================
  // UPDATE RECEIVE ITEMS
  // ==========================================
  const updateReceiveItem = (idx: number, updates: Partial<ReceiveItem>) => {
    setReceiveItems(prev => prev.map((item, i) => i === idx ? { ...item, ...updates } : item));
  };

  // ==========================================
  // CALCULATIONS
  // ==========================================
  const acceptedItems = receiveItems.filter(i => i.qualityStatus !== 'failed' && i.nowReceiving > 0);
  const totalReceiveValue = acceptedItems.reduce((s, i) => s + i.nowReceiving * i.unitPrice, 0);
  const totalReceivingQty = acceptedItems.reduce((s, i) => s + i.nowReceiving, 0);

  const canProceed = () => {
    if (step === 1) return !!selectedPO;
    if (step === 2) return receiveItems.some(i => i.nowReceiving > 0);
    if (step === 3) return true;
    return true;
  };

  // ==========================================
  // SAVE — CREATE GRN + UPDATE PO + UPDATE STOCK
  // ==========================================
  const handleSave = async () => {
    if (!selectedPO) return;
    setSaving(true);
    try {
      // 1. Create GRN document
      const grnData = {
        grnNumber,
        poId: selectedPO.id,
        poNumber: selectedPO.poNumber,
        vendorName: selectedPO.vendorName,
        vendorId: selectedPO.vendorId || '',
        vehicleNumber,
        invoiceNumber,
        invoiceDate,
        challanNumber,
        items: receiveItems.map(i => ({
          materialId: i.materialId,
          materialName: i.materialName,
          materialCode: i.materialCode,
          orderedQty: i.orderedQty,
          previouslyReceived: i.previouslyReceived,
          receivedQty: i.nowReceiving,
          acceptedQty: i.qualityStatus !== 'failed' ? i.nowReceiving : 0,
          rejectedQty: i.qualityStatus === 'failed' ? i.nowReceiving : 0,
          unit: i.unit,
          unitPrice: i.unitPrice,
          totalValue: i.nowReceiving * i.unitPrice,
          qualityStatus: i.qualityStatus,
          batchNumber: i.batchNumber,
          binLocation: i.binLocation,
          remarks: i.remarks,
        })),
        totalItems: receiveItems.length,
        totalReceivedValue: totalReceiveValue,
        receivedBy: userName,
        status: 'completed',
        remarks,
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'goods_receipts'), grnData);

      // 2. Update stock for accepted items
      for (const item of acceptedItems) {
        // Increment material stock
        const matRef = doc(db, 'inventory_materials', item.materialId);
        await updateDoc(matRef, {
          current_stock: increment(item.nowReceiving),
          bin_location: item.binLocation || undefined,
          updated_at: new Date().toISOString(),
        });

        // Purchase entry record
        await addDoc(collection(db, 'inventory_purchase_entries'), {
          material_id: item.materialId,
          material_name: item.materialName,
          material_code: item.materialCode,
          quantity: item.nowReceiving,
          unit: item.unit,
          unit_price: item.unitPrice,
          total_value: item.nowReceiving * item.unitPrice,
          supplier: selectedPO.vendorName,
          grn_number: grnNumber,
          po_number: selectedPO.poNumber,
          batch_number: item.batchNumber,
          quality_status: item.qualityStatus,
          bin_location: item.binLocation,
          entered_by: userName,
          date: new Date().toISOString(),
        });

        // Stock movement
        await addDoc(collection(db, 'stock_movements'), {
          date: new Date().toISOString(),
          materialId: item.materialId,
          materialName: item.materialName,
          type: 'purchase',
          quantity: item.nowReceiving,
          unit: item.unit,
          reference: `${grnNumber} (PO: ${selectedPO.poNumber})`,
          value: item.nowReceiving * item.unitPrice,
        });

        // Batch entry
        if (item.batchNumber) {
          await addDoc(collection(db, 'inventory_batches'), {
            batchNumber: item.batchNumber,
            materialId: item.materialId,
            quantity: item.nowReceiving,
            supplier: selectedPO.vendorName,
            location: item.binLocation,
            qualityStatus: item.qualityStatus === 'passed' ? 'passed' : 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }

      // 3. Update PO — mark received quantities and status
      const poRef = doc(db, 'purchase_orders', selectedPO.id);
      const updatedItems = (selectedPO.items || []).map(poItem => {
        const received = receiveItems.find(r => r.materialId === poItem.materialId);
        const newReceivedQty = (poItem.receivedQty || 0) + (received?.nowReceiving || 0);
        return {
          ...poItem,
          receivedQty: newReceivedQty,
          pendingQty: Math.max(0, poItem.quantity - newReceivedQty),
        };
      });

      const allFullyReceived = updatedItems.every(i => i.receivedQty >= i.quantity);
      const newPOStatus = allFullyReceived ? 'received' : 'partially_received';

      await updateDoc(poRef, {
        items: updatedItems,
        status: newPOStatus,
        lastReceivedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      setSaved(true);

      // 4. Notify parent
      onSuccess?.({
        poNumber: selectedPO.poNumber,
        grnNumber,
        receivedItems: acceptedItems.map(i => ({
          materialName: i.materialName,
          receivedQty: i.nowReceiving,
          unit: i.unit,
          unitPrice: i.unitPrice,
          binLocation: i.binLocation,
        })),
        totalReceivedValue: totalReceiveValue,
        poFullyReceived: allFullyReceived,
      });
    } catch (err) {
      console.error('Receive against PO error:', err);
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (v: number) => `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const filteredPOs = purchaseOrders.filter(po =>
    !poSearch ||
    po.poNumber?.toLowerCase().includes(poSearch.toLowerCase()) ||
    po.vendorName?.toLowerCase().includes(poSearch.toLowerCase())
  );

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        onClick={e => e.stopPropagation()}
        className="bg-zinc-900 border border-white/10 rounded-3xl w-full max-w-5xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col">

        {/* Header */}
        <div className="p-6 border-b border-white/10 bg-gradient-to-r from-cyan-900/30 to-teal-900/30">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-cyan-500/20 border border-cyan-500/30">
                <Package className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Receive Against PO</h2>
                <p className="text-sm text-zinc-400">Select PO → Verify → QC → GRN</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl"><X className="w-5 h-5 text-zinc-400" /></button>
          </div>

          {/* Step Indicator */}
          {!saved && (
            <div className="flex items-center gap-2">
              {STEPS.map((s, idx) => (
                <React.Fragment key={s.id}>
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    step === s.id ? 'bg-cyan-500/20 border border-cyan-500/30 text-cyan-400' :
                    step > s.id ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' :
                    'bg-zinc-800/50 border border-zinc-700 text-zinc-500'
                  }`}>
                    {step > s.id ? <CheckCircle2 className="w-3.5 h-3.5" /> : <s.icon className="w-3.5 h-3.5" />}
                    <span className="hidden md:inline">{s.label}</span>
                  </div>
                  {idx < STEPS.length - 1 && <ArrowRight className="w-3 h-3 text-zinc-600" />}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {saved ? (
              /* ═══ SUCCESS ═══ */
              <motion.div key="saved" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                </div>
                <h3 className="text-2xl font-bold text-white">GRN Created Against PO!</h3>
                <p className="text-zinc-400">{grnNumber} · PO: {selectedPO?.poNumber}</p>
                <div className="flex items-center gap-4 mt-2">
                  <span className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm">
                    {acceptedItems.length} item(s) received
                  </span>
                  <span className="px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-cyan-400 text-sm">
                    {formatCurrency(totalReceiveValue)}
                  </span>
                </div>
              </motion.div>

            ) : step === 1 ? (
              /* ═══ STEP 1: SELECT PO ═══ */
              <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input value={poSearch} onChange={e => setPOSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-zinc-600 outline-none focus:border-cyan-500/50"
                    placeholder="Search by PO number or vendor..." />
                </div>

                {loadingPOs ? (
                  <div className="flex items-center justify-center py-16 gap-3 text-zinc-400">
                    <RefreshCw className="w-5 h-5 animate-spin" /> Loading purchase orders...
                  </div>
                ) : filteredPOs.length === 0 ? (
                  <div className="text-center py-16">
                    <Truck className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                    <p className="text-zinc-400">No pending purchase orders found</p>
                    <p className="text-zinc-600 text-sm mt-1">POs with status &quot;ordered&quot;, &quot;partially_received&quot;, or &quot;approved&quot; will appear here</p>
                  </div>
                ) : (
                  <div className="grid gap-3 max-h-[55vh] overflow-y-auto pr-1">
                    {filteredPOs.map(po => {
                      const totalOrdered = (po.items || []).reduce((s, i) => s + i.quantity, 0);
                      const totalReceived = (po.items || []).reduce((s, i) => s + (i.receivedQty || 0), 0);
                      const pct = totalOrdered > 0 ? (totalReceived / totalOrdered * 100) : 0;
                      return (
                        <motion.button key={po.id} whileHover={{ scale: 1.005 }} onClick={() => selectPO(po)}
                          className="w-full text-left bg-zinc-800/50 border border-zinc-700 hover:border-cyan-500/40 rounded-xl p-4 transition-all group">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 group-hover:bg-cyan-500/20 transition-colors">
                                <FileText className="w-5 h-5 text-cyan-400" />
                              </div>
                              <div>
                                <span className="text-white font-semibold">{po.poNumber || po.id}</span>
                                <span className="mx-2 text-zinc-600">·</span>
                                <span className="text-zinc-400">{po.vendorName || 'Unknown vendor'}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                                po.status === 'ordered' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20' :
                                po.status === 'partially_received' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20' :
                                'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                              }`}>
                                {po.status?.replace(/_/g, ' ').toUpperCase()}
                              </span>
                              <ChevronDown className="w-4 h-4 text-zinc-600 -rotate-90 group-hover:text-cyan-400 transition-colors" />
                            </div>
                          </div>
                          <div className="mt-3 flex items-center gap-6 text-xs text-zinc-500">
                            <span>{(po.items || []).length} line items</span>
                            <span>{formatCurrency(po.totalAmount || 0)}</span>
                            {po.expectedDelivery && <span>Expected: {new Date(po.expectedDelivery).toLocaleDateString('en-IN')}</span>}
                            <span>Received: {pct.toFixed(0)}%</span>
                          </div>
                          {pct > 0 && (
                            <div className="mt-2 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
                            </div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </motion.div>

            ) : step === 2 ? (
              /* ═══ STEP 2: CHECK ITEMS ═══ */
              <motion.div key="step2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                className="space-y-4">
                <div className="bg-gradient-to-r from-cyan-900/20 to-teal-900/20 border border-cyan-500/20 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-semibold">{selectedPO?.poNumber}</h3>
                      <p className="text-zinc-400 text-sm">{selectedPO?.vendorName}</p>
                    </div>
                    <button onClick={() => { setStep(1); setSelectedPO(null); }}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-white">
                      Change PO
                    </button>
                  </div>
                </div>

                {/* Delivery Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Vehicle Number</label>
                    <input value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-cyan-500/50"
                      placeholder="TS 09 XX 1234" />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Invoice Number</label>
                    <input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-cyan-500/50"
                      placeholder="INV-XXX" />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Invoice Date</label>
                    <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-cyan-500/50"
                      style={{ colorScheme: 'dark' }} />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">DC / Challan No.</label>
                    <input value={challanNumber} onChange={e => setChallanNumber(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-cyan-500/50"
                      placeholder="DC-XXX" />
                  </div>
                </div>

                {/* Items Table */}
                <div className="bg-zinc-800/30 border border-zinc-700 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-zinc-800/80 border-b border-zinc-700">
                          <th className="text-left px-3 py-2 text-zinc-400 text-xs">#</th>
                          <th className="text-left px-3 py-2 text-zinc-400 text-xs min-w-[180px]">Material</th>
                          <th className="text-right px-3 py-2 text-zinc-400 text-xs">Ordered</th>
                          <th className="text-right px-3 py-2 text-zinc-400 text-xs">Prev Received</th>
                          <th className="text-right px-3 py-2 text-zinc-400 text-xs">Pending</th>
                          <th className="text-right px-3 py-2 text-zinc-400 text-xs min-w-[100px]">Now Receiving</th>
                          <th className="text-left px-3 py-2 text-zinc-400 text-xs">Unit</th>
                          <th className="text-right px-3 py-2 text-zinc-400 text-xs">Rate</th>
                          <th className="text-right px-3 py-2 text-zinc-400 text-xs">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/50">
                        {receiveItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-zinc-800/20">
                            <td className="px-3 py-2.5 text-zinc-500 text-xs">{idx + 1}</td>
                            <td className="px-3 py-2.5">
                              <div className="text-white text-sm">{item.materialName}</div>
                              <div className="text-zinc-600 text-xs font-mono">{item.materialCode}</div>
                            </td>
                            <td className="px-3 py-2.5 text-right text-zinc-400">{item.orderedQty}</td>
                            <td className="px-3 py-2.5 text-right">
                              <span className={`${item.previouslyReceived > 0 ? 'text-amber-400' : 'text-zinc-600'}`}>{item.previouslyReceived}</span>
                            </td>
                            <td className="px-3 py-2.5 text-right font-semibold text-cyan-400">{item.pendingQty}</td>
                            <td className="px-3 py-2.5">
                              <input type="number" min={0} max={item.pendingQty}
                                value={item.nowReceiving}
                                onChange={e => updateReceiveItem(idx, { nowReceiving: Math.min(Number(e.target.value), item.pendingQty) })}
                                className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-1.5 text-white text-sm text-right outline-none focus:border-cyan-500" />
                            </td>
                            <td className="px-3 py-2.5 text-zinc-400 text-xs">{item.unit}</td>
                            <td className="px-3 py-2.5 text-right text-zinc-400 text-xs">{formatCurrency(item.unitPrice)}</td>
                            <td className="px-3 py-2.5 text-right text-emerald-400 text-xs font-mono">{formatCurrency(item.nowReceiving * item.unitPrice)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="border-t border-zinc-700 bg-zinc-800/50 px-4 py-3 flex justify-between items-center">
                    <span className="text-zinc-400 text-sm">{totalReceivingQty} unit(s) receiving</span>
                    <span className="text-emerald-400 font-semibold">{formatCurrency(totalReceiveValue)}</span>
                  </div>
                </div>
              </motion.div>

            ) : step === 3 ? (
              /* ═══ STEP 3: QC & LABEL ═══ */
              <motion.div key="step3" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                className="space-y-4">
                <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-500/20 rounded-xl p-4">
                  <h3 className="text-white font-semibold flex items-center gap-2"><Eye className="w-4 h-4 text-purple-400" /> Quality Check & Bin Assignment</h3>
                  <p className="text-zinc-400 text-sm mt-1">Set QC status and assign storage location for each item</p>
                </div>

                <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                  {receiveItems.filter(i => i.nowReceiving > 0).map((item, idx) => (
                    <div key={idx} className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-white font-medium">{item.materialName}</span>
                          <span className="ml-2 text-zinc-500 text-xs font-mono">{item.materialCode}</span>
                        </div>
                        <span className="text-cyan-400 font-semibold text-sm">{item.nowReceiving} {item.unit}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs text-zinc-500 mb-1 block">QC Status</label>
                          <select value={item.qualityStatus} onChange={e => updateReceiveItem(receiveItems.indexOf(item), { qualityStatus: e.target.value as ReceiveItem['qualityStatus'] })}
                            className={`w-full rounded-lg px-3 py-2 text-sm font-medium outline-none ${
                              item.qualityStatus === 'passed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                              item.qualityStatus === 'failed' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                              'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                            <option value="passed">✓ Passed</option>
                            <option value="pending">⏳ Pending</option>
                            <option value="partial">⚠ Partial</option>
                            <option value="failed">✗ Failed</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-zinc-500 mb-1 block">Batch Number</label>
                          <input value={item.batchNumber} onChange={e => updateReceiveItem(receiveItems.indexOf(item), { batchNumber: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-500/50"
                            placeholder="Batch #" />
                        </div>
                        <div>
                          <label className="text-xs text-zinc-500 mb-1 block">Bin Location</label>
                          <input value={item.binLocation} onChange={e => updateReceiveItem(receiveItems.indexOf(item), { binLocation: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-500/50"
                            placeholder="R&D/R1/R1-T1" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

            ) : (
              /* ═══ STEP 4: REVIEW & SAVE ═══ */
              <motion.div key="step4" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                className="space-y-4">
                <div className="bg-gradient-to-r from-emerald-900/20 to-teal-900/20 border border-emerald-500/20 rounded-xl p-4">
                  <h3 className="text-white font-semibold">Review & Confirm</h3>
                  <p className="text-zinc-400 text-sm mt-1">This will create GRN, update PO status, and add stock to inventory</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 text-center">
                    <p className="text-xs text-zinc-500 mb-1">PO Number</p>
                    <p className="text-white font-semibold">{selectedPO?.poNumber}</p>
                  </div>
                  <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 text-center">
                    <p className="text-xs text-zinc-500 mb-1">GRN Number</p>
                    <p className="text-cyan-400 font-semibold">{grnNumber}</p>
                  </div>
                  <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 text-center">
                    <p className="text-xs text-zinc-500 mb-1">Items Receiving</p>
                    <p className="text-emerald-400 font-semibold">{acceptedItems.length}</p>
                  </div>
                  <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 text-center">
                    <p className="text-xs text-zinc-500 mb-1">Total Value</p>
                    <p className="text-yellow-400 font-semibold">{formatCurrency(totalReceiveValue)}</p>
                  </div>
                </div>

                {/* Items Summary */}
                <div className="bg-zinc-800/30 border border-zinc-700 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-zinc-800/80 border-b border-zinc-700">
                      <th className="text-left px-3 py-2 text-zinc-400 text-xs">Material</th>
                      <th className="text-right px-3 py-2 text-zinc-400 text-xs">Qty</th>
                      <th className="text-left px-3 py-2 text-zinc-400 text-xs">QC</th>
                      <th className="text-left px-3 py-2 text-zinc-400 text-xs">Bin</th>
                      <th className="text-right px-3 py-2 text-zinc-400 text-xs">Value</th>
                    </tr></thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {receiveItems.filter(i => i.nowReceiving > 0).map((item, idx) => (
                        <tr key={idx} className={item.qualityStatus === 'failed' ? 'bg-red-500/5' : ''}>
                          <td className="px-3 py-2 text-white text-sm">{item.materialName}</td>
                          <td className="px-3 py-2 text-right text-cyan-400">{item.nowReceiving} {item.unit}</td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              item.qualityStatus === 'passed' ? 'bg-emerald-500/20 text-emerald-400' :
                              item.qualityStatus === 'failed' ? 'bg-red-500/20 text-red-400' :
                              'bg-amber-500/20 text-amber-400'
                            }`}>{item.qualityStatus}</span>
                          </td>
                          <td className="px-3 py-2 text-zinc-400 text-xs font-mono">{item.binLocation || '-'}</td>
                          <td className="px-3 py-2 text-right text-emerald-400 font-mono text-xs">{formatCurrency(item.nowReceiving * item.unitPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Remarks */}
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Remarks</label>
                  <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={2}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 resize-none"
                    placeholder="Any remarks or issues..." />
                </div>

                {acceptedItems.some(i => i.qualityStatus === 'failed') && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-2 text-sm text-red-400">
                    <AlertTriangle className="w-4 h-4" />
                    Some items failed QC and will NOT be added to stock
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {!saved && (
          <div className="p-4 border-t border-white/10 flex items-center justify-between bg-zinc-900/80">
            <button onClick={() => step > 1 ? setStep(step - 1) : onClose()}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-white">
              <ArrowLeft className="w-4 h-4" /> {step === 1 ? 'Cancel' : 'Back'}
            </button>

            {step < 4 ? (
              <button onClick={() => setStep(step + 1)} disabled={!canProceed()}
                className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-sm text-white font-medium">
                Next <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handleSave} disabled={saving || acceptedItems.length === 0}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-sm text-white font-medium">
                {saving ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Create GRN & Update Stock</>}
              </button>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
