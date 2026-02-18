/**
 * Create Purchase Order from Store
 * 
 * Store Manager creates PO → sent to Purchase/MD for approval → 
 * after approval → ordered → store receives against PO → invoice
 * 
 * Full lifecycle: Create PO → MD Approval → Mark Ordered → Receive (GRN) → Invoice
 */

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, X, Plus, Trash2, Send, Search,
  Building2, Package, AlertTriangle, CheckCircle2,
  IndianRupee, Hash, Calendar, Truck, Eye, Printer,
  ChevronDown, Clock
} from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

// ==========================================
// TYPES
// ==========================================
interface StockItem {
  id: string;
  sno: number;
  code: string;
  materialName: string;
  category: string;
  supplierName: string;
  rate: number;
  uom: string;
  openingStock: number;
  inword: number;
  minStock?: number;
  projects: Record<string, number>;
  rdUsage: number;
  internalUsage: number;
  newFactoryUsage: number;
  storageArea: string;
}

interface Supplier {
  id: string;
  name: string;
  contact: string;
  email: string;
  gst: string;
  address: string;
  city: string;
  phone: string;
}

interface POLineItem {
  id: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxPercent: number;
  taxAmount: number;
  totalPrice: number;
  specifications: string;
}

export interface CreatePOSuccessData {
  poId: string;
  poNumber: string;
  vendorName: string;
  totalAmount: number;
  itemCount: number;
  status: string;
}

interface Props {
  userName: string;
  stockItems: StockItem[];
  suppliers: Supplier[];
  onClose: () => void;
  onSuccess: (data: CreatePOSuccessData) => void;
}

// ==========================================
// HELPERS
// ==========================================
const generatePONumber = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const seq = String(Math.floor(Math.random() * 99999) + 1).padStart(5, '0');
  return `PO/${y}/${m}/${seq}`;
};

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);

// ==========================================
// COMPONENT
// ==========================================
export default function CreatePOFromStore({ userName, stockItems, suppliers, onClose, onSuccess }: Props) {
  // Steps: 1=Vendor, 2=Items, 3=Terms, 4=Review
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Vendor
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [vendorSearch, setVendorSearch] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [vendorContact, setVendorContact] = useState('');
  const [vendorEmail, setVendorEmail] = useState('');
  const [vendorPhone, setVendorPhone] = useState('');
  const [vendorGST, setVendorGST] = useState('');
  const [vendorAddress, setVendorAddress] = useState('');

  // Items
  const [items, setItems] = useState<POLineItem[]>([]);
  const [materialSearch, setMaterialSearch] = useState('');
  const [showMaterialPicker, setShowMaterialPicker] = useState(false);

  // Terms
  const [paymentTerms, setPaymentTerms] = useState('Net 30 Days');
  const [deliveryTerms, setDeliveryTerms] = useState('Ex-Works');
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [notes, setNotes] = useState('');
  const [gstTreatment, setGstTreatment] = useState<'inclusive' | 'exclusive'>('exclusive');

  // Calculated
  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const totalTax = items.reduce((s, i) => s + i.taxAmount, 0);
  const grandTotal = subtotal + totalTax;

  // Low stock materials (suggested for reorder)
  const lowStockItems = stockItems.filter(m => {
    const closing = m.openingStock + m.inword - m.rdUsage - m.internalUsage - m.newFactoryUsage -
      Object.values(m.projects).reduce((s, v) => s + v, 0);
    return closing <= (m.minStock || 0);
  });

  // Filter suppliers by search
  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
    s.gst.toLowerCase().includes(vendorSearch.toLowerCase())
  );

  // Filter materials
  const filteredMaterials = stockItems.filter(m =>
    m.materialName.toLowerCase().includes(materialSearch.toLowerCase()) ||
    m.code.toLowerCase().includes(materialSearch.toLowerCase())
  );

  // Select vendor
  const selectVendor = (supplier: Supplier) => {
    setSelectedSupplierId(supplier.id);
    setVendorName(supplier.name);
    setVendorContact(supplier.contact);
    setVendorEmail(supplier.email);
    setVendorPhone(supplier.phone);
    setVendorGST(supplier.gst);
    setVendorAddress(`${supplier.address}, ${supplier.city}`);
    setVendorSearch('');
  };

  // Add item
  const addItem = (material?: StockItem) => {
    const newItem: POLineItem = {
      id: Date.now().toString(),
      materialId: material?.id || '',
      materialCode: material?.code || '',
      materialName: material?.materialName || '',
      quantity: 1,
      unit: material?.uom || 'Nos',
      unitPrice: material?.rate || 0,
      taxPercent: 18,
      taxAmount: 0,
      totalPrice: 0,
      specifications: '',
    };
    // Calculate tax
    newItem.taxAmount = (newItem.unitPrice * newItem.quantity * newItem.taxPercent) / 100;
    newItem.totalPrice = newItem.unitPrice * newItem.quantity + newItem.taxAmount;
    setItems(prev => [...prev, newItem]);
    setShowMaterialPicker(false);
    setMaterialSearch('');
  };

  // Update item
  const updateItem = (id: string, field: keyof POLineItem, value: string | number) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      // Recalculate
      const base = updated.unitPrice * updated.quantity;
      updated.taxAmount = (base * updated.taxPercent) / 100;
      updated.totalPrice = base + updated.taxAmount;
      return updated;
    }));
  };

  // Remove item
  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  // Validate current step
  const canProceed = () => {
    if (step === 1) return vendorName.trim() !== '';
    if (step === 2) return items.length > 0 && items.every(i => i.materialName && i.quantity > 0 && i.unitPrice > 0);
    if (step === 3) return paymentTerms.trim() !== '' && deliveryTerms.trim() !== '';
    return true;
  };

  // Submit PO
  const handleSubmit = async () => {
    if (saving) return;
    setSaving(true);

    try {
      const poNumber = generatePONumber();
      const poData = {
        poNumber,
        vendorId: selectedSupplierId || `manual_${Date.now()}`,
        vendorName,
        vendorContact,
        vendorEmail,
        vendorPhone,
        vendorGST,
        vendorAddress,
        items: items.map(i => ({
          materialId: i.materialId,
          materialCode: i.materialCode,
          materialName: i.materialName,
          quantity: i.quantity,
          unit: i.unit,
          unitPrice: i.unitPrice,
          totalPrice: i.unitPrice * i.quantity,
          taxPercent: i.taxPercent,
          taxAmount: i.taxAmount,
          receivedQty: 0,
          pendingQty: i.quantity,
          specifications: i.specifications,
        })),
        subtotal,
        taxPercent: 18,
        taxAmount: totalTax,
        otherCharges: 0,
        totalAmount: grandTotal,
        status: 'pending_md_approval',
        requiresMDApproval: true,
        mdApprovalThreshold: 0,
        approvalSteps: [{ step: 1, approverRole: 'MD', status: 'pending' }],
        paymentTerms,
        deliveryTerms,
        expectedDelivery: expectedDelivery || null,
        gstTreatment,
        notes: notes || null,
        createdBy: userName,
        createdByName: userName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        receivedItems: [],
        totalReceivedQty: 0,
        source: 'Store', // Mark that this PO came from store
      };

      const docRef = await addDoc(collection(db, 'purchase_orders'), poData);

      // Create notification for MD
      try {
        await addDoc(collection(db, 'notifications'), {
          type: 'po_approval',
          title: 'PO Pending MD Approval',
          message: `PO ${poNumber} from Store for ${formatCurrency(grandTotal)} requires MD approval`,
          documentType: 'purchase_order',
          documentId: docRef.id,
          documentNumber: poNumber,
          forRole: ['md', 'admin'],
          priority: 'high',
          read: false,
          createdAt: new Date().toISOString(),
          createdBy: userName,
        });
      } catch { /* Notification is nice-to-have */ }

      onSuccess({
        poId: docRef.id,
        poNumber,
        vendorName,
        totalAmount: grandTotal,
        itemCount: items.length,
        status: 'pending_md_approval',
      });
    } catch (err) {
      console.error('Failed to create PO:', err);
      alert('Failed to create Purchase Order. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Print PO preview
  const printPO = () => {
    const poNumber = generatePONumber();
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>PO Preview - ${poNumber}</title>
    <style>
      @page { size: A4; margin: 15mm; }
      body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; margin: 0; padding: 20px; }
      .header { display: flex; justify-content: space-between; border-bottom: 3px solid #1e40af; padding-bottom: 12px; margin-bottom: 20px; }
      .company { font-size: 22px; font-weight: 700; color: #1e40af; }
      .po-title { font-size: 18px; font-weight: 600; color: #374151; margin-top: 4px; }
      .po-num { font-size: 14px; color: #6b7280; }
      .section { margin-bottom: 16px; }
      .section-title { font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin-bottom: 6px; }
      .vendor-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th { background: #1e40af; color: white; padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; }
      td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; }
      tr:nth-child(even) { background: #f9fafb; }
      .totals { text-align: right; margin-top: 12px; }
      .totals td { font-weight: 600; }
      .total-row { font-size: 16px; color: #1e40af; }
      .terms { font-size: 12px; color: #6b7280; margin-top: 20px; }
      .footer { margin-top: 40px; display: flex; justify-content: space-between; }
      .sig-line { border-top: 1px solid #d1d5db; width: 200px; padding-top: 4px; font-size: 12px; color: #6b7280; }
    </style></head><body>
    <div class="header">
      <div>
        <div class="company">TRIOVISION INTERNATIONAL</div>
        <div class="po-title">Purchase Order</div>
        <div class="po-num">${poNumber}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:13px;color:#6b7280;">Date: ${new Date().toLocaleDateString('en-IN')}</div>
        ${expectedDelivery ? `<div style="font-size:13px;color:#6b7280;">Expected: ${new Date(expectedDelivery).toLocaleDateString('en-IN')}</div>` : ''}
        <div style="font-size:13px;color:#6b7280;">Status: Pending MD Approval</div>
      </div>
    </div>
    <div class="section">
      <div class="section-title">Vendor Details</div>
      <div class="vendor-box">
        <strong>${vendorName}</strong><br/>
        ${vendorAddress || ''}${vendorGST ? `<br/>GSTIN: ${vendorGST}` : ''}
        ${vendorPhone ? `<br/>Phone: ${vendorPhone}` : ''}${vendorEmail ? ` | Email: ${vendorEmail}` : ''}
      </div>
    </div>
    <div class="section">
      <div class="section-title">Order Items</div>
      <table>
        <thead><tr><th>#</th><th>Material</th><th>Code</th><th>Qty</th><th>Unit</th><th>Rate</th><th>Tax %</th><th>Tax Amt</th><th>Total</th></tr></thead>
        <tbody>
          ${items.map((item, i) => `<tr>
            <td>${i + 1}</td><td>${item.materialName}</td><td>${item.materialCode}</td>
            <td>${item.quantity}</td><td>${item.unit}</td>
            <td>₹${item.unitPrice.toFixed(2)}</td><td>${item.taxPercent}%</td>
            <td>₹${item.taxAmount.toFixed(2)}</td><td>₹${(item.unitPrice * item.quantity + item.taxAmount).toFixed(2)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      <table class="totals" style="width:300px;margin-left:auto;">
        <tr><td>Subtotal</td><td>₹${subtotal.toFixed(2)}</td></tr>
        <tr><td>GST</td><td>₹${totalTax.toFixed(2)}</td></tr>
        <tr class="total-row"><td>Grand Total</td><td>₹${grandTotal.toFixed(2)}</td></tr>
      </table>
    </div>
    <div class="terms">
      <strong>Payment Terms:</strong> ${paymentTerms}<br/>
      <strong>Delivery Terms:</strong> ${deliveryTerms}
      ${notes ? `<br/><strong>Notes:</strong> ${notes}` : ''}
    </div>
    <div class="footer">
      <div class="sig-line">Prepared By: ${userName}</div>
      <div class="sig-line">Approved By: _______________</div>
    </div>
    </body></html>`);
    w.document.close();
    w.print();
  };

  // ==========================================
  // STEP LABELS
  // ==========================================
  const STEPS = [
    { num: 1, label: 'Select Vendor', icon: Building2 },
    { num: 2, label: 'Add Items', icon: Package },
    { num: 3, label: 'Terms & Notes', icon: FileText },
    { num: 4, label: 'Review & Submit', icon: Send },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-gradient-to-r from-blue-900/20 to-indigo-900/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Create Purchase Order</h2>
              <p className="text-xs text-zinc-400">Store → MD Approval → Order → Receive → Invoice</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {step === 4 && (
              <button onClick={printPO} className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-lg text-zinc-300 text-sm flex items-center gap-2">
                <Printer className="w-4 h-4" /> Preview
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-1 px-6 py-3 bg-zinc-900/50 border-b border-zinc-800">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            const isActive = step === s.num;
            const isDone = step > s.num;
            return (
              <React.Fragment key={s.num}>
                {idx > 0 && <div className={`flex-1 h-0.5 mx-1 rounded ${isDone ? 'bg-blue-500' : 'bg-zinc-700'}`} />}
                <button onClick={() => isDone && setStep(s.num)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                    ${isActive ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' :
                      isDone ? 'bg-emerald-600/10 text-emerald-400 cursor-pointer hover:bg-emerald-600/20' :
                        'text-zinc-500 cursor-default'}`}>
                  {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <AnimatePresence mode="wait">

            {/* ═══ STEP 1: VENDOR ═══ */}
            {step === 1 && (
              <motion.div key="vendor" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="flex items-center gap-2 text-white font-medium">
                  <Building2 className="w-5 h-5 text-blue-400" />
                  <span>Select or Enter Vendor Details</span>
                </div>

                {/* Supplier search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input type="text" placeholder="Search supplier by name or GST..." value={vendorSearch}
                    onChange={e => setVendorSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-sm text-white placeholder:text-zinc-500 outline-none focus:border-blue-500/50" />
                </div>

                {/* Supplier cards */}
                {vendorSearch && filteredSuppliers.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {filteredSuppliers.slice(0, 8).map(sup => (
                      <button key={sup.id} onClick={() => selectVendor(sup)}
                        className={`text-left p-3 rounded-xl border transition-all ${selectedSupplierId === sup.id ? 'bg-blue-600/10 border-blue-500/40' : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'}`}>
                        <div className="text-white text-sm font-medium">{sup.name}</div>
                        <div className="text-zinc-500 text-xs mt-0.5">{sup.gst || 'No GST'} · {sup.city}</div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Manual vendor form */}
                <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-xl p-4 space-y-3">
                  <div className="text-xs text-zinc-500 font-medium uppercase">Vendor Information {selectedSupplierId && '(Auto-filled)'}</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block">Company Name *</label>
                      <input type="text" value={vendorName} onChange={e => setVendorName(e.target.value)}
                        className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-blue-500/50"
                        placeholder="Vendor company name" />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block">GSTIN</label>
                      <input type="text" value={vendorGST} onChange={e => setVendorGST(e.target.value)}
                        className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-blue-500/50"
                        placeholder="22AAAAA0000A1Z5" />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block">Contact Person</label>
                      <input type="text" value={vendorContact} onChange={e => setVendorContact(e.target.value)}
                        className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-blue-500/50"
                        placeholder="Contact name" />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block">Phone</label>
                      <input type="text" value={vendorPhone} onChange={e => setVendorPhone(e.target.value)}
                        className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-blue-500/50"
                        placeholder="+91 98765 43210" />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block">Email</label>
                      <input type="text" value={vendorEmail} onChange={e => setVendorEmail(e.target.value)}
                        className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-blue-500/50"
                        placeholder="vendor@company.com" />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block">Address</label>
                      <input type="text" value={vendorAddress} onChange={e => setVendorAddress(e.target.value)}
                        className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-blue-500/50"
                        placeholder="Full address with city" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ═══ STEP 2: ITEMS ═══ */}
            {step === 2 && (
              <motion.div key="items" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white font-medium">
                    <Package className="w-5 h-5 text-emerald-400" />
                    <span>Add Materials to Order</span>
                    <span className="text-xs text-zinc-500">({items.length} items)</span>
                  </div>
                  <button onClick={() => setShowMaterialPicker(true)}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Add Material
                  </button>
                </div>

                {/* Low stock suggestions */}
                {lowStockItems.length > 0 && items.length === 0 && (
                  <div className="bg-amber-900/10 border border-amber-500/20 rounded-xl p-3">
                    <div className="flex items-center gap-2 text-amber-400 text-sm font-medium mb-2">
                      <AlertTriangle className="w-4 h-4" /> Low Stock Items — Quick Add
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {lowStockItems.slice(0, 10).map(m => (
                        <button key={m.id} onClick={() => addItem(m)}
                          className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg text-amber-300 text-xs">
                          {m.materialName}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Material picker */}
                <AnimatePresence>
                  {showMaterialPicker && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="bg-zinc-800/50 border border-zinc-700 rounded-xl overflow-hidden">
                      <div className="p-3 border-b border-zinc-700">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                          <input type="text" placeholder="Search materials..." value={materialSearch}
                            onChange={e => setMaterialSearch(e.target.value)} autoFocus
                            className="w-full pl-10 pr-4 py-2.5 bg-zinc-900/50 border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-500 outline-none focus:border-blue-500/50" />
                        </div>
                      </div>
                      <div className="max-h-48 overflow-y-auto divide-y divide-zinc-800/50">
                        {filteredMaterials.slice(0, 20).map(m => (
                          <button key={m.id} onClick={() => addItem(m)}
                            className="w-full text-left px-4 py-2.5 hover:bg-zinc-700/50 flex items-center justify-between">
                            <div>
                              <span className="text-white text-sm">{m.materialName}</span>
                              <span className="text-zinc-500 text-xs ml-2">{m.code}</span>
                            </div>
                            <div className="text-xs text-zinc-500">{m.uom} · ₹{m.rate}</div>
                          </button>
                        ))}
                        {filteredMaterials.length === 0 && (
                          <div className="p-4 text-center text-zinc-500 text-sm">No materials found</div>
                        )}
                      </div>
                      <div className="p-2 border-t border-zinc-700 flex gap-2">
                        <button onClick={() => addItem()} className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-zinc-300 text-xs">
                          + Add Custom Item
                        </button>
                        <button onClick={() => { setShowMaterialPicker(false); setMaterialSearch(''); }}
                          className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 text-xs ml-auto">
                          Close
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Items table */}
                {items.length > 0 ? (
                  <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-zinc-800/80 border-b border-zinc-700">
                            <th className="text-left px-3 py-2.5 text-zinc-400 text-xs font-medium">#</th>
                            <th className="text-left px-3 py-2.5 text-zinc-400 text-xs font-medium">Material</th>
                            <th className="text-center px-3 py-2.5 text-zinc-400 text-xs font-medium">Qty</th>
                            <th className="text-center px-3 py-2.5 text-zinc-400 text-xs font-medium">Unit</th>
                            <th className="text-right px-3 py-2.5 text-zinc-400 text-xs font-medium">Rate (₹)</th>
                            <th className="text-center px-3 py-2.5 text-zinc-400 text-xs font-medium">Tax %</th>
                            <th className="text-right px-3 py-2.5 text-zinc-400 text-xs font-medium">Tax ₹</th>
                            <th className="text-right px-3 py-2.5 text-zinc-400 text-xs font-medium">Total</th>
                            <th className="text-center px-3 py-2.5 text-zinc-400 text-xs font-medium w-10"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                          {items.map((item, idx) => (
                            <tr key={item.id} className="hover:bg-zinc-800/20">
                              <td className="px-3 py-2 text-zinc-500 text-xs">{idx + 1}</td>
                              <td className="px-3 py-2">
                                <input type="text" value={item.materialName}
                                  onChange={e => updateItem(item.id, 'materialName', e.target.value)}
                                  className="bg-transparent border-b border-transparent hover:border-zinc-600 focus:border-blue-500 outline-none text-white text-sm w-full min-w-[180px]"
                                  placeholder="Material name" />
                                <input type="text" value={item.materialCode}
                                  onChange={e => updateItem(item.id, 'materialCode', e.target.value)}
                                  className="bg-transparent border-none outline-none text-zinc-500 text-xs w-full"
                                  placeholder="Code" />
                              </td>
                              <td className="px-3 py-2">
                                <input type="number" value={item.quantity} min={1}
                                  onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))}
                                  className="bg-zinc-800/50 border border-zinc-700 rounded px-2 py-1 text-white text-sm w-16 text-center outline-none focus:border-blue-500/50" />
                              </td>
                              <td className="px-3 py-2">
                                <input type="text" value={item.unit}
                                  onChange={e => updateItem(item.id, 'unit', e.target.value)}
                                  className="bg-zinc-800/50 border border-zinc-700 rounded px-2 py-1 text-white text-sm w-14 text-center outline-none focus:border-blue-500/50" />
                              </td>
                              <td className="px-3 py-2">
                                <input type="number" value={item.unitPrice} min={0} step={0.01}
                                  onChange={e => updateItem(item.id, 'unitPrice', Number(e.target.value))}
                                  className="bg-zinc-800/50 border border-zinc-700 rounded px-2 py-1 text-white text-sm w-24 text-right outline-none focus:border-blue-500/50" />
                              </td>
                              <td className="px-3 py-2">
                                <select value={item.taxPercent}
                                  onChange={e => updateItem(item.id, 'taxPercent', Number(e.target.value))}
                                  className="bg-zinc-800/50 border border-zinc-700 rounded px-1.5 py-1 text-white text-sm outline-none w-16 text-center">
                                  <option value={0}>0%</option>
                                  <option value={5}>5%</option>
                                  <option value={12}>12%</option>
                                  <option value={18}>18%</option>
                                  <option value={28}>28%</option>
                                </select>
                              </td>
                              <td className="px-3 py-2 text-right text-zinc-400 text-sm">₹{item.taxAmount.toFixed(2)}</td>
                              <td className="px-3 py-2 text-right text-white font-medium text-sm">
                                ₹{(item.unitPrice * item.quantity + item.taxAmount).toFixed(2)}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <button onClick={() => removeItem(item.id)} className="p-1 hover:bg-red-500/20 rounded text-red-400">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {/* Totals bar */}
                    <div className="border-t border-zinc-700 bg-zinc-800/50 px-4 py-3 flex items-center justify-between">
                      <button onClick={() => setShowMaterialPicker(true)} className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1">
                        <Plus className="w-3.5 h-3.5" /> Add more
                      </button>
                      <div className="text-right space-y-1">
                        <div className="text-xs text-zinc-400">Subtotal: <span className="text-white">₹{subtotal.toFixed(2)}</span></div>
                        <div className="text-xs text-zinc-400">GST: <span className="text-white">₹{totalTax.toFixed(2)}</span></div>
                        <div className="text-sm font-bold text-blue-400">Total: {formatCurrency(grandTotal)}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-zinc-800/30 border border-zinc-700/50 border-dashed rounded-xl p-12 text-center">
                    <Package className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                    <p className="text-zinc-400 text-sm">No items added yet. Click &ldquo;Add Material&rdquo; or select from low stock suggestions.</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* ═══ STEP 3: TERMS ═══ */}
            {step === 3 && (
              <motion.div key="terms" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="flex items-center gap-2 text-white font-medium">
                  <FileText className="w-5 h-5 text-purple-400" />
                  <span>Payment & Delivery Terms</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-zinc-400 mb-1.5 block">Payment Terms *</label>
                    <select value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)}
                      className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500/50">
                      <option value="Advance Payment">Advance Payment</option>
                      <option value="Net 15 Days">Net 15 Days</option>
                      <option value="Net 30 Days">Net 30 Days</option>
                      <option value="Net 45 Days">Net 45 Days</option>
                      <option value="Net 60 Days">Net 60 Days</option>
                      <option value="COD">Cash on Delivery</option>
                      <option value="50% Advance, 50% on Delivery">50% Advance, 50% on Delivery</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 mb-1.5 block">Delivery Terms *</label>
                    <select value={deliveryTerms} onChange={e => setDeliveryTerms(e.target.value)}
                      className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500/50">
                      <option value="Ex-Works">Ex-Works</option>
                      <option value="FOB">FOB (Free on Board)</option>
                      <option value="CIF">CIF (Cost Insurance Freight)</option>
                      <option value="Door Delivery">Door Delivery</option>
                      <option value="FOR Destination">FOR Destination</option>
                      <option value="Freight Inclusive">Freight Inclusive</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 mb-1.5 block">Expected Delivery Date</label>
                    <input type="date" value={expectedDelivery} onChange={e => setExpectedDelivery(e.target.value)}
                      className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500/50" />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 mb-1.5 block">GST Treatment</label>
                    <select value={gstTreatment} onChange={e => setGstTreatment(e.target.value as 'inclusive' | 'exclusive')}
                      className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500/50">
                      <option value="exclusive">GST Exclusive</option>
                      <option value="inclusive">GST Inclusive</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-400 mb-1.5 block">Notes / Special Instructions</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-blue-500/50 resize-none"
                    placeholder="Any special instructions, delivery preferences, quality requirements..." />
                </div>
              </motion.div>
            )}

            {/* ═══ STEP 4: REVIEW ═══ */}
            {step === 4 && (
              <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="flex items-center gap-2 text-white font-medium">
                  <Eye className="w-5 h-5 text-indigo-400" />
                  <span>Review Purchase Order</span>
                </div>

                {/* PO Summary */}
                <div className="bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border border-blue-500/20 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-zinc-400">PURCHASE ORDER</div>
                      <div className="text-white font-semibold text-lg">{vendorName}</div>
                      <div className="text-zinc-400 text-sm">{vendorAddress}</div>
                      {vendorGST && <div className="text-zinc-500 text-xs mt-1">GSTIN: {vendorGST}</div>}
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-400">{formatCurrency(grandTotal)}</div>
                      <div className="text-xs text-zinc-400 mt-1">{items.length} item{items.length > 1 ? 's' : ''} · {paymentTerms}</div>
                      {expectedDelivery && (
                        <div className="text-xs text-zinc-500 flex items-center gap-1 justify-end mt-1">
                          <Calendar className="w-3 h-3" /> {new Date(expectedDelivery).toLocaleDateString('en-IN')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Items list */}
                <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-zinc-800/50 border-b border-zinc-700 text-xs text-zinc-400 font-medium">ORDER ITEMS</div>
                  <div className="divide-y divide-zinc-800/50">
                    {items.map((item, idx) => (
                      <div key={item.id} className="px-4 py-3 flex items-center justify-between">
                        <div>
                          <span className="text-zinc-500 text-xs mr-2">{idx + 1}.</span>
                          <span className="text-white text-sm">{item.materialName}</span>
                          <span className="text-zinc-500 text-xs ml-2">{item.materialCode}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-white text-sm">{item.quantity} {item.unit} × ₹{item.unitPrice}</span>
                          <span className="text-zinc-500 text-xs ml-2">+ {item.taxPercent}% GST</span>
                          <span className="text-blue-400 font-medium text-sm ml-3">₹{(item.unitPrice * item.quantity + item.taxAmount).toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-zinc-700 bg-zinc-800/50 px-4 py-3 text-right space-y-1">
                    <div className="text-xs text-zinc-400">Subtotal: ₹{subtotal.toFixed(2)}</div>
                    <div className="text-xs text-zinc-400">GST: ₹{totalTax.toFixed(2)}</div>
                    <div className="text-sm font-bold text-white">Grand Total: {formatCurrency(grandTotal)}</div>
                  </div>
                </div>

                {/* Terms summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Payment', value: paymentTerms, icon: IndianRupee },
                    { label: 'Delivery', value: deliveryTerms, icon: Truck },
                    { label: 'GST', value: gstTreatment === 'exclusive' ? 'Exclusive' : 'Inclusive', icon: Hash },
                    { label: 'Status', value: 'Pending MD Approval', icon: Clock },
                  ].map(t => (
                    <div key={t.label} className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-zinc-500 text-xs mb-1"><t.icon className="w-3 h-3" />{t.label}</div>
                      <div className="text-white text-sm font-medium">{t.value}</div>
                    </div>
                  ))}
                </div>

                {notes && (
                  <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-xl p-3">
                    <div className="text-xs text-zinc-500 mb-1">Notes</div>
                    <div className="text-zinc-300 text-sm">{notes}</div>
                  </div>
                )}

                {/* Approval notice */}
                <div className="bg-amber-900/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-amber-400 text-sm font-medium">MD Approval Required</div>
                    <div className="text-zinc-400 text-xs mt-1">
                      This PO will be sent to MD for approval. Once approved, the Purchase team will mark it as Ordered.
                      After the vendor delivers, you can receive materials against this PO from the &ldquo;Receive vs PO&rdquo; tab.
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 bg-zinc-900/80">
          <div className="text-xs text-zinc-500">
            Step {step} of 4 · {step < 4 ? `Next: ${STEPS[step]?.label}` : 'Ready to submit'}
          </div>
          <div className="flex items-center gap-3">
            {step > 1 && (
              <button onClick={() => setStep(step - 1)}
                className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-zinc-300 text-sm">
                Back
              </button>
            )}
            {step < 4 ? (
              <button onClick={() => canProceed() && setStep(step + 1)} disabled={!canProceed()}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2
                  ${canProceed() ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}`}>
                Next <ChevronDown className="w-4 h-4 -rotate-90" />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={saving}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl text-white text-sm font-medium flex items-center gap-2">
                <Send className="w-4 h-4" /> {saving ? 'Creating PO...' : 'Submit for Approval'}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
