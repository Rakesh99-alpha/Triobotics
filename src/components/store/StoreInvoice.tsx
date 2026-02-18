/**
 * Store Invoice Creation Component
 * 
 * Creates invoices linked to GRN / PO for store operations.
 * Generates printable tax invoice with GST breakdown.
 */

'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  X,
  Plus,
  Trash2,
  Save,
  Printer,
  CheckCircle2,
  Calculator,
  Building2,
  Hash,
  IndianRupee,
  AlertTriangle,
  Download,
} from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

// ==========================================
// TYPES
// ==========================================

interface InvoiceItem {
  materialName: string;
  materialCode: string;
  hsnCode: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxPercent: number;
  amount: number;
  taxAmount: number;
  totalAmount: number;
}

export interface InvoiceSuccessData {
  invoiceNumber: string;
  vendorName: string;
  totalAmount: number;
  itemCount: number;
}

interface StoreInvoiceProps {
  userName: string;
  onClose: () => void;
  onSuccess?: (data: InvoiceSuccessData) => void;
  prefillPO?: {
    poNumber: string;
    grnNumber?: string;
    vendorName: string;
    vendorGST?: string;
    vendorAddress?: string;
    items: { materialName: string; materialCode: string; quantity: number; unit: string; unitPrice: number }[];
  };
}

// ==========================================
// COMPONENT
// ==========================================

export default function StoreInvoice({ userName, onClose, onSuccess, prefillPO }: StoreInvoiceProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Header Fields
  const [invoiceNumber] = useState(`INV-${Date.now().toString(36).toUpperCase()}`);
  const [vendorInvoiceNumber, setVendorInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [poNumber, setPONumber] = useState(prefillPO?.poNumber || '');
  const [grnNumber, setGRNNumber] = useState(prefillPO?.grnNumber || '');

  // Vendor
  const [vendorName, setVendorName] = useState(prefillPO?.vendorName || '');
  const [vendorGST, setVendorGST] = useState(prefillPO?.vendorGST || '');
  const [vendorAddress, setVendorAddress] = useState(prefillPO?.vendorAddress || '');

  // Items
  const [items, setItems] = useState<InvoiceItem[]>(
    prefillPO?.items?.map(i => ({
      materialName: i.materialName,
      materialCode: i.materialCode,
      hsnCode: '',
      quantity: i.quantity,
      unit: i.unit,
      unitPrice: i.unitPrice,
      taxPercent: 18,
      amount: i.quantity * i.unitPrice,
      taxAmount: i.quantity * i.unitPrice * 0.18,
      totalAmount: i.quantity * i.unitPrice * 1.18,
    })) || []
  );

  // Payment
  const [paymentTerms, setPaymentTerms] = useState('Net 30 Days');
  const [remarks, setRemarks] = useState('');

  // ==========================================
  // CALCULATIONS
  // ==========================================

  const recalcItem = (item: InvoiceItem): InvoiceItem => {
    const amount = item.quantity * item.unitPrice;
    const taxAmount = amount * (item.taxPercent / 100);
    return { ...item, amount, taxAmount, totalAmount: amount + taxAmount };
  };

  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  const totalCGST = items.reduce((s, i) => s + i.taxAmount / 2, 0);
  const totalSGST = totalCGST;
  const totalTax = items.reduce((s, i) => s + i.taxAmount, 0);
  const grandTotal = subtotal + totalTax;

  const addItem = () => {
    setItems([...items, recalcItem({
      materialName: '', materialCode: '', hsnCode: '', quantity: 1,
      unit: 'Pcs', unitPrice: 0, taxPercent: 18,
      amount: 0, taxAmount: 0, totalAmount: 0,
    })]);
  };

  const updateItem = (idx: number, updates: Partial<InvoiceItem>) => {
    setItems(items.map((item, i) => i === idx ? recalcItem({ ...item, ...updates }) : item));
  };

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  // ==========================================
  // SAVE
  // ==========================================

  const handleSave = async () => {
    if (!vendorName || !vendorInvoiceNumber || items.length === 0) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'store_invoices'), {
        invoiceNumber,
        vendorInvoiceNumber,
        invoiceDate,
        dueDate,
        poNumber,
        grnNumber,
        vendorName,
        vendorGST,
        vendorAddress,
        items: items.map(i => ({
          materialName: i.materialName,
          materialCode: i.materialCode,
          hsnCode: i.hsnCode,
          quantity: i.quantity,
          unit: i.unit,
          unitPrice: i.unitPrice,
          taxPercent: i.taxPercent,
          amount: i.amount,
          taxAmount: i.taxAmount,
          totalAmount: i.totalAmount,
        })),
        subtotal,
        cgst: totalCGST,
        sgst: totalSGST,
        totalTax,
        grandTotal,
        paymentTerms,
        remarks,
        status: 'pending',
        createdBy: userName,
        createdAt: new Date().toISOString(),
      });

      setSaved(true);
      onSuccess?.({
        invoiceNumber,
        vendorName,
        totalAmount: grandTotal,
        itemCount: items.length,
      });
    } catch (err) {
      console.error('Invoice save error:', err);
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // PRINT
  // ==========================================

  const handlePrint = () => {
    if (!printRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Invoice ${invoiceNumber}</title>
      <style>
        body { font-family: 'Segoe UI', sans-serif; padding: 32px; color: #111; font-size: 13px; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
        th { background: #f8f8f8; font-weight: 600; }
        .text-right { text-align: right; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 2px solid #333; padding-bottom: 16px; }
        .company { font-size: 22px; font-weight: 700; color: #1a1a2e; }
        .label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
        .value { font-weight: 600; }
        .totals { margin-top: 12px; }
        .totals td { border: none; padding: 4px 12px; }
        .grand-total { font-size: 16px; font-weight: 700; border-top: 2px solid #333 !important; }
        @media print { body { padding: 16px; } }
      </style></head><body>
      ${printRef.current.innerHTML}
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const formatCurrency = (v: number) => `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-indigo-900/30 to-purple-900/30">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-indigo-500/20 border border-indigo-500/30">
              <FileText className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Store Invoice</h2>
              <p className="text-sm text-zinc-400">{invoiceNumber} · Create tax invoice against PO/GRN</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!saved && (
              <>
                <button onClick={() => setShowPreview(!showPreview)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-white flex items-center gap-2">
                  <Printer className="w-4 h-4" /> {showPreview ? 'Edit' : 'Preview'}
                </button>
                <button onClick={handleSave} disabled={saving || !vendorName || !vendorInvoiceNumber || items.length === 0}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-sm text-white font-medium flex items-center gap-2">
                  <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Invoice'}
                </button>
              </>
            )}
            {saved && (
              <button onClick={handlePrint}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-sm text-white font-medium flex items-center gap-2">
                <Download className="w-4 h-4" /> Print / Download
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl"><X className="w-5 h-5 text-zinc-400" /></button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {saved ? (
              <motion.div key="saved" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                </div>
                <h3 className="text-2xl font-bold text-white">Invoice Created!</h3>
                <p className="text-zinc-400">{invoiceNumber} · {formatCurrency(grandTotal)}</p>
                <p className="text-zinc-500 text-sm">Vendor: {vendorName} · {items.length} item(s)</p>
              </motion.div>
            ) : showPreview ? (
              /* ═══ PRINT PREVIEW ═══ */
              <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div ref={printRef} className="bg-white text-black rounded-xl p-8 max-w-4xl mx-auto">
                  {/* Print Header */}
                  <div className="flex justify-between items-start mb-6 border-b-2 border-gray-800 pb-4">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900">TRIOVISION INTERNATIONAL</h1>
                      <p className="text-sm text-gray-600">R&D Store · Composite ERP</p>
                      <p className="text-xs text-gray-500 mt-1">GSTIN: 36AADCT1234F1ZT</p>
                    </div>
                    <div className="text-right">
                      <h2 className="text-lg font-bold text-gray-900">TAX INVOICE</h2>
                      <p className="text-sm text-gray-600">Invoice No: <span className="font-semibold">{invoiceNumber}</span></p>
                      <p className="text-sm text-gray-600">Date: {new Date(invoiceDate).toLocaleDateString('en-IN')}</p>
                      {poNumber && <p className="text-xs text-gray-500">PO: {poNumber}</p>}
                      {grnNumber && <p className="text-xs text-gray-500">GRN: {grnNumber}</p>}
                    </div>
                  </div>

                  {/* Vendor Details */}
                  <div className="mb-4 bg-gray-50 p-4 rounded">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Bill From</p>
                    <p className="font-semibold text-gray-900">{vendorName}</p>
                    {vendorGST && <p className="text-sm text-gray-600">GSTIN: {vendorGST}</p>}
                    {vendorAddress && <p className="text-sm text-gray-600">{vendorAddress}</p>}
                    {vendorInvoiceNumber && <p className="text-sm text-gray-600">Vendor Invoice: {vendorInvoiceNumber}</p>}
                  </div>

                  {/* Items Table */}
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Description</th>
                        <th>HSN</th>
                        <th className="text-right">Qty</th>
                        <th>Unit</th>
                        <th className="text-right">Rate</th>
                        <th className="text-right">Amount</th>
                        <th className="text-right">GST %</th>
                        <th className="text-right">GST Amt</th>
                        <th className="text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td>{item.materialName}<br /><span style={{ fontSize: '10px', color: '#888' }}>{item.materialCode}</span></td>
                          <td>{item.hsnCode || '-'}</td>
                          <td className="text-right">{item.quantity}</td>
                          <td>{item.unit}</td>
                          <td className="text-right">{formatCurrency(item.unitPrice)}</td>
                          <td className="text-right">{formatCurrency(item.amount)}</td>
                          <td className="text-right">{item.taxPercent}%</td>
                          <td className="text-right">{formatCurrency(item.taxAmount)}</td>
                          <td className="text-right">{formatCurrency(item.totalAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Totals */}
                  <div className="flex justify-end mt-4">
                    <table className="w-80" style={{ borderCollapse: 'collapse' }}>
                      <tbody className="totals">
                        <tr><td className="label">Subtotal</td><td className="text-right value">{formatCurrency(subtotal)}</td></tr>
                        <tr><td className="label">CGST</td><td className="text-right value">{formatCurrency(totalCGST)}</td></tr>
                        <tr><td className="label">SGST</td><td className="text-right value">{formatCurrency(totalSGST)}</td></tr>
                        <tr className="grand-total" style={{ borderTop: '2px solid #333' }}>
                          <td style={{ fontWeight: 700, fontSize: '15px', paddingTop: '8px' }}>Grand Total</td>
                          <td className="text-right" style={{ fontWeight: 700, fontSize: '15px', paddingTop: '8px' }}>{formatCurrency(grandTotal)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Footer */}
                  <div className="mt-8 pt-4 border-t border-gray-300 flex justify-between text-xs text-gray-500">
                    <div>
                      <p>Payment: {paymentTerms}</p>
                      {remarks && <p>Remarks: {remarks}</p>}
                    </div>
                    <div className="text-right">
                      <p>Created by: {userName}</p>
                      <p>Generated: {new Date().toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              /* ═══ EDIT FORM ═══ */
              <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

                {/* Vendor & Reference */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                      <Building2 className="w-4 h-4" /> Vendor Details
                    </h3>
                    <div>
                      <label className="text-xs text-zinc-500 mb-1 block">Vendor Name *</label>
                      <input value={vendorName} onChange={e => setVendorName(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-zinc-600 outline-none focus:border-indigo-500/50"
                        placeholder="Supplier / Vendor name" />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 mb-1 block">Vendor GSTIN</label>
                      <input value={vendorGST} onChange={e => setVendorGST(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-zinc-600 outline-none focus:border-indigo-500/50"
                        placeholder="22AAAAA0000A1Z5" />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 mb-1 block">Vendor Address</label>
                      <input value={vendorAddress} onChange={e => setVendorAddress(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-zinc-600 outline-none focus:border-indigo-500/50"
                        placeholder="Full address" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                      <Hash className="w-4 h-4" /> Reference & Dates
                    </h3>
                    <div>
                      <label className="text-xs text-zinc-500 mb-1 block">Vendor Invoice No. *</label>
                      <input value={vendorInvoiceNumber} onChange={e => setVendorInvoiceNumber(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-zinc-600 outline-none focus:border-indigo-500/50"
                        placeholder="Vendor's invoice number" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-zinc-500 mb-1 block">Invoice Date</label>
                        <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500/50"
                          style={{ colorScheme: 'dark' }} />
                      </div>
                      <div>
                        <label className="text-xs text-zinc-500 mb-1 block">Due Date</label>
                        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500/50"
                          style={{ colorScheme: 'dark' }} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-zinc-500 mb-1 block">PO Number</label>
                        <input value={poNumber} onChange={e => setPONumber(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-zinc-600 outline-none focus:border-indigo-500/50"
                          placeholder="PO-XXXX" />
                      </div>
                      <div>
                        <label className="text-xs text-zinc-500 mb-1 block">GRN Number</label>
                        <input value={grnNumber} onChange={e => setGRNNumber(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-zinc-600 outline-none focus:border-indigo-500/50"
                          placeholder="GRN-XXXX" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 mb-1 block">Payment Terms</label>
                      <select value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500/50">
                        <option value="Net 30 Days">Net 30 Days</option>
                        <option value="Net 15 Days">Net 15 Days</option>
                        <option value="Net 60 Days">Net 60 Days</option>
                        <option value="Advance">Advance Payment</option>
                        <option value="COD">Cash on Delivery</option>
                        <option value="LC">Letter of Credit</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                      <Calculator className="w-4 h-4" /> Invoice Items
                    </h3>
                    <button onClick={addItem} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 rounded-lg text-indigo-400 text-xs font-medium">
                      <Plus className="w-3 h-3" /> Add Item
                    </button>
                  </div>

                  {items.length === 0 ? (
                    <div className="bg-zinc-800/30 border border-dashed border-zinc-700 rounded-xl p-8 text-center">
                      <AlertTriangle className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                      <p className="text-zinc-500 text-sm">No items added. Click &quot;Add Item&quot; to begin.</p>
                    </div>
                  ) : (
                    <div className="bg-zinc-800/30 border border-zinc-700 rounded-xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-zinc-800/80 border-b border-zinc-700">
                              <th className="text-left px-3 py-2 text-zinc-400 text-xs">#</th>
                              <th className="text-left px-3 py-2 text-zinc-400 text-xs min-w-[200px]">Material</th>
                              <th className="text-left px-3 py-2 text-zinc-400 text-xs">HSN</th>
                              <th className="text-right px-3 py-2 text-zinc-400 text-xs">Qty</th>
                              <th className="text-left px-3 py-2 text-zinc-400 text-xs">Unit</th>
                              <th className="text-right px-3 py-2 text-zinc-400 text-xs">Rate</th>
                              <th className="text-right px-3 py-2 text-zinc-400 text-xs">Amount</th>
                              <th className="text-right px-3 py-2 text-zinc-400 text-xs">GST%</th>
                              <th className="text-right px-3 py-2 text-zinc-400 text-xs">Tax</th>
                              <th className="text-right px-3 py-2 text-zinc-400 text-xs">Total</th>
                              <th className="px-2 py-2"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800/50">
                            {items.map((item, idx) => (
                              <tr key={idx} className="hover:bg-zinc-800/20">
                                <td className="px-3 py-2 text-zinc-500 text-xs">{idx + 1}</td>
                                <td className="px-3 py-2">
                                  <input value={item.materialName} onChange={e => updateItem(idx, { materialName: e.target.value })}
                                    className="w-full bg-transparent border-b border-zinc-700 text-white text-sm py-1 outline-none focus:border-indigo-500"
                                    placeholder="Material name" />
                                  <input value={item.materialCode} onChange={e => updateItem(idx, { materialCode: e.target.value })}
                                    className="w-full bg-transparent text-zinc-500 text-xs py-0.5 outline-none" placeholder="Code" />
                                </td>
                                <td className="px-3 py-2">
                                  <input value={item.hsnCode} onChange={e => updateItem(idx, { hsnCode: e.target.value })}
                                    className="w-16 bg-transparent border-b border-zinc-700 text-white text-xs py-1 outline-none focus:border-indigo-500" placeholder="HSN" />
                                </td>
                                <td className="px-3 py-2">
                                  <input type="number" min={0} value={item.quantity} onChange={e => updateItem(idx, { quantity: Number(e.target.value) })}
                                    className="w-16 bg-transparent border-b border-zinc-700 text-white text-sm py-1 text-right outline-none focus:border-indigo-500" />
                                </td>
                                <td className="px-3 py-2">
                                  <input value={item.unit} onChange={e => updateItem(idx, { unit: e.target.value })}
                                    className="w-12 bg-transparent border-b border-zinc-700 text-white text-xs py-1 outline-none focus:border-indigo-500" />
                                </td>
                                <td className="px-3 py-2">
                                  <input type="number" min={0} step={0.01} value={item.unitPrice} onChange={e => updateItem(idx, { unitPrice: Number(e.target.value) })}
                                    className="w-20 bg-transparent border-b border-zinc-700 text-white text-sm py-1 text-right outline-none focus:border-indigo-500" />
                                </td>
                                <td className="px-3 py-2 text-right text-zinc-300 text-xs font-mono">{formatCurrency(item.amount)}</td>
                                <td className="px-3 py-2">
                                  <select value={item.taxPercent} onChange={e => updateItem(idx, { taxPercent: Number(e.target.value) })}
                                    className="w-14 bg-transparent text-white text-xs outline-none">
                                    <option value={0}>0%</option>
                                    <option value={5}>5%</option>
                                    <option value={12}>12%</option>
                                    <option value={18}>18%</option>
                                    <option value={28}>28%</option>
                                  </select>
                                </td>
                                <td className="px-3 py-2 text-right text-yellow-400/80 text-xs font-mono">{formatCurrency(item.taxAmount)}</td>
                                <td className="px-3 py-2 text-right text-emerald-400 text-xs font-mono font-semibold">{formatCurrency(item.totalAmount)}</td>
                                <td className="px-2 py-2">
                                  <button onClick={() => removeItem(idx)} className="p-1 hover:bg-red-500/10 rounded text-zinc-600 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Summary */}
                      <div className="border-t border-zinc-700 bg-zinc-800/50 p-4">
                        <div className="flex justify-end">
                          <div className="w-72 space-y-2">
                            <div className="flex justify-between text-sm"><span className="text-zinc-400">Subtotal</span><span className="text-white font-mono">{formatCurrency(subtotal)}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-zinc-400">CGST</span><span className="text-yellow-400/80 font-mono">{formatCurrency(totalCGST)}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-zinc-400">SGST</span><span className="text-yellow-400/80 font-mono">{formatCurrency(totalSGST)}</span></div>
                            <div className="flex justify-between text-sm pt-2 border-t border-zinc-700">
                              <span className="text-white font-semibold flex items-center gap-1"><IndianRupee className="w-4 h-4" /> Grand Total</span>
                              <span className="text-emerald-400 font-bold text-lg font-mono">{formatCurrency(grandTotal)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Remarks */}
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Remarks</label>
                  <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={2}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-zinc-600 outline-none focus:border-indigo-500/50 resize-none"
                    placeholder="Any additional remarks..." />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
