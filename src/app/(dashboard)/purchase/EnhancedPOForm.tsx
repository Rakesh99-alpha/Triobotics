'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart,
  FileText,
  Building2,
  MapPin,
  Truck,
  CreditCard,
  Calendar,
  Package,
  Plus,
  Trash2,
  X,
  Printer,
  Save,
  Send,
  AlertTriangle,
  CheckCircle,
  IndianRupee,
  User,
  Phone,
  Mail,
  Hash,
  RefreshCw,
} from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import POPrintTemplate, { 
  POPrintData, 
  TRIOVISION_COMPANY, 
  DEFAULT_SHIPPING, 
  DEFAULT_TERMS 
} from './POPrintTemplate';

// ==========================================
// ENHANCED PO CREATION FORM
// ==========================================
// Matches Odoo-style RFQ/PO with Triovision branding

interface Material {
  id: string;
  code: string;
  name: string;
  unit: string;
  purchase_price: number;
  current_stock: number;
}

interface Supplier {
  id: string;
  name: string;
  contact?: string;
  email?: string;
  phone?: string;
  address?: string;
  gst?: string;
}

interface POItem {
  materialId: string;
  materialCode: string;
  materialName: string;
  description: string;
  analyticDistribution?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxPercent: number;
  taxAmount: number;
  amount: number;
}

interface POFormData {
  // Vendor
  vendorId: string;
  vendorName: string;
  vendorAddress: string;
  vendorGstin: string;
  vendorContact: string;
  vendorEmail: string;
  vendorReference: string;
  
  // Order Details
  gstTreatment: 'registered' | 'unregistered' | 'overseas';
  currency: string;
  blanketOrder: boolean;
  
  // Dates
  orderDeadline: string;
  expectedArrival: string;
  
  // Delivery
  deliverTo: string;
  shippingAddress: string;
  logisticDetails: string;
  
  // Payment
  paymentTerms: string;
  
  // Items
  items: POItem[];
  
  // Totals
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  
  // Status
  status: 'draft' | 'rfq' | 'rfq_sent' | 'purchase_order';
  
  // Notes
  notes: string;
}

interface EnhancedPOFormProps {
  materials: Material[];
  suppliers: Supplier[];
  onSubmit: (data: POFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  initialData?: Partial<POFormData>;
  mdApprovalThreshold?: number;
}

const GST_TREATMENTS = [
  { value: 'registered', label: 'Registered Business - Regular' },
  { value: 'unregistered', label: 'Unregistered Business' },
  { value: 'overseas', label: 'Overseas' },
];

const PAYMENT_TERMS = [
  { value: 'immediate', label: 'Immediate Payment' },
  { value: '7_days', label: '7 Days' },
  { value: '15_days', label: '15 Days' },
  { value: '30_days', label: '30 Days PDC' },
  { value: '45_days', label: '45 Days' },
  { value: '60_days', label: '60 Days' },
  { value: 'advance', label: 'Advance Payment' },
];

const LOGISTIC_OPTIONS = [
  { value: 'by_transport', label: 'BY Transport' },
  { value: 'supplier_transport', label: 'Supplier Transport' },
  { value: 'self_pickup', label: 'Self Pickup' },
  { value: 'courier', label: 'Courier' },
];

const ANALYTIC_DISTRIBUTIONS = [
  { value: 'tool_development', label: 'Tool Development', color: 'bg-teal-500' },
  { value: 'production', label: 'Production', color: 'bg-blue-500' },
  { value: 'maintenance', label: 'Maintenance', color: 'bg-orange-500' },
  { value: 'r_and_d', label: 'R&D', color: 'bg-purple-500' },
  { value: 'general', label: 'General', color: 'bg-gray-500' },
];

// Generate PO number in format: PO/YYYY/MM/NNNNN
const generatePONumber = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(10000 + Math.random() * 90000);
  return `PO/${year}/${month}/${random}`;
};

export default function EnhancedPOForm({
  materials,
  suppliers,
  onSubmit,
  onCancel,
  isSubmitting,
  initialData,
  mdApprovalThreshold = 50000,
}: EnhancedPOFormProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [poNumber] = useState(generatePONumber());
  
  const [formData, setFormData] = useState<POFormData>({
    vendorId: '',
    vendorName: '',
    vendorAddress: '',
    vendorGstin: '',
    vendorContact: '',
    vendorEmail: '',
    vendorReference: '',
    gstTreatment: 'registered',
    currency: 'INR',
    blanketOrder: false,
    orderDeadline: new Date().toISOString().split('T')[0],
    expectedArrival: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    deliverTo: DEFAULT_SHIPPING.name,
    shippingAddress: DEFAULT_SHIPPING.address,
    logisticDetails: 'by_transport',
    paymentTerms: '30_days',
    items: [createEmptyItem()],
    subtotal: 0,
    taxAmount: 0,
    totalAmount: 0,
    status: 'draft',
    notes: '',
    ...initialData,
  });

  function createEmptyItem(): POItem {
    return {
      materialId: '',
      materialCode: '',
      materialName: '',
      description: '',
      analyticDistribution: '',
      quantity: 1,
      unit: 'Nos',
      unitPrice: 0,
      taxPercent: 18,
      taxAmount: 0,
      amount: 0,
    };
  }

  // Update vendor details when selected
  const handleVendorChange = (vendorId: string) => {
    const vendor = suppliers.find(s => s.id === vendorId);
    if (vendor) {
      setFormData(prev => ({
        ...prev,
        vendorId,
        vendorName: vendor.name,
        vendorAddress: vendor.address || '',
        vendorGstin: vendor.gst || '',
        vendorContact: vendor.contact || '',
        vendorEmail: vendor.email || '',
      }));
    }
  };

  // Update item
  const updateItem = (index: number, field: keyof POItem, value: string | number) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      const item = { ...newItems[index], [field]: value };
      
      // If material changed, update related fields
      if (field === 'materialId') {
        const material = materials.find(m => m.id === value);
        if (material) {
          item.materialCode = material.code;
          item.materialName = material.name;
          item.description = material.name;
          item.unit = material.unit;
          item.unitPrice = material.purchase_price || 0;
        }
      }
      
      // Recalculate amounts
      const quantity = field === 'quantity' ? Number(value) : item.quantity;
      const unitPrice = field === 'unitPrice' ? Number(value) : item.unitPrice;
      const taxPercent = field === 'taxPercent' ? Number(value) : item.taxPercent;
      
      const baseAmount = quantity * unitPrice;
      item.taxAmount = baseAmount * (taxPercent / 100);
      item.amount = baseAmount;
      
      newItems[index] = item;
      
      // Recalculate totals
      const subtotal = newItems.reduce((sum, i) => sum + i.amount, 0);
      const taxAmount = newItems.reduce((sum, i) => sum + i.taxAmount, 0);
      
      return {
        ...prev,
        items: newItems,
        subtotal,
        taxAmount,
        totalAmount: subtotal + taxAmount,
      };
    });
  };

  // Add item
  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, createEmptyItem()],
    }));
  };

  // Remove item
  const removeItem = (index: number) => {
    if (formData.items.length <= 1) return;
    setFormData(prev => {
      const newItems = prev.items.filter((_, i) => i !== index);
      const subtotal = newItems.reduce((sum, i) => sum + i.amount, 0);
      const taxAmount = newItems.reduce((sum, i) => sum + i.taxAmount, 0);
      return {
        ...prev,
        items: newItems,
        subtotal,
        taxAmount,
        totalAmount: subtotal + taxAmount,
      };
    });
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Prepare print data
  const getPrintData = (): POPrintData => ({
    poNumber,
    orderDate: new Date().toISOString(),
    deliveryDate: formData.expectedArrival,
    vendor: {
      name: formData.vendorName,
      address: formData.vendorAddress,
      gstin: formData.vendorGstin,
      contact: formData.vendorContact,
      email: formData.vendorEmail,
    },
    buyer: TRIOVISION_COMPANY,
    shippingAddress: {
      name: formData.deliverTo,
      address: formData.shippingAddress,
      phone: TRIOVISION_COMPANY.phone,
    },
    purchaseRepresentative: 'Purchase',
    logisticDetails: LOGISTIC_OPTIONS.find(l => l.value === formData.logisticDetails)?.label || formData.logisticDetails,
    paymentTerms: PAYMENT_TERMS.find(p => p.value === formData.paymentTerms)?.label || formData.paymentTerms,
    vendorReference: formData.vendorReference,
    items: formData.items.filter(i => i.materialId).map(item => ({
      code: item.materialCode,
      description: item.description || item.materialName,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      taxPercent: item.taxPercent,
      amount: item.amount,
    })),
    subtotal: formData.subtotal,
    sgst: formData.taxAmount / 2,
    cgst: formData.taxAmount / 2,
    igst: 0,
    totalAmount: formData.totalAmount,
    termsAndConditions: DEFAULT_TERMS,
  });

  // Print handler
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `PO-${poNumber}`,
  });

  const requiresMDApproval = formData.totalAmount >= mdApprovalThreshold;

  return (
    <div className="max-h-[90vh] overflow-y-auto">
      {/* Header with Status Steps */}
      <div className="sticky top-0 z-10 bg-zinc-900 border-b border-zinc-800 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <p className="text-sm text-zinc-500">Request for Quotation</p>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-yellow-400">☆</span>
                {poNumber}
              </h2>
            </div>
          </div>
          
          {/* Status Steps */}
          <div className="flex items-center gap-1 text-sm">
            <span className={`px-3 py-1 rounded ${formData.status === 'rfq' ? 'bg-blue-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
              RFQ
            </span>
            <span className="text-zinc-600">›</span>
            <span className={`px-3 py-1 rounded ${formData.status === 'rfq_sent' ? 'bg-blue-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
              RFQ Sent
            </span>
            <span className="text-zinc-600">›</span>
            <span className={`px-3 py-1 rounded ${formData.status === 'purchase_order' ? 'bg-green-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
              Purchase Order
            </span>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPrintPreview(true)}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Print RFQ
          </button>
          <button
            onClick={() => onSubmit(formData)}
            disabled={isSubmitting || !formData.vendorId || formData.items.filter(i => i.materialId).length === 0}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white rounded-lg flex items-center gap-2 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Confirm Order
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Two Column Layout */}
        <div className="grid grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-4">
            {/* Vendor */}
            <div>
              <label className="text-sm text-zinc-400 flex items-center gap-1">
                Vendor <span className="text-red-400">?</span>
              </label>
              {suppliers.length === 0 ? (
                <div className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-yellow-400 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Loading suppliers...
                </div>
              ) : (
                <select
                  value={formData.vendorId}
                  onChange={(e) => handleVendorChange(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-blue-500 outline-none"
                >
                  <option value="">Select vendor...</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.gst ? `– ${s.gst}` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
            
            {/* GST Treatment */}
            <div>
              <label className="text-sm text-zinc-400">GST Treatment</label>
              <select
                value={formData.gstTreatment}
                onChange={(e) => setFormData(prev => ({ ...prev, gstTreatment: e.target.value as any }))}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white outline-none"
              >
                {GST_TREATMENTS.map(g => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </div>
            
            {/* Vendor Reference */}
            <div>
              <label className="text-sm text-zinc-400 flex items-center gap-1">
                Vendor Reference <span className="text-red-400">?</span>
              </label>
              <input
                type="text"
                value={formData.vendorReference}
                onChange={(e) => setFormData(prev => ({ ...prev, vendorReference: e.target.value }))}
                placeholder="Quotation reference..."
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white outline-none"
              />
            </div>
            
            {/* Blanket Order */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="blanketOrder"
                checked={formData.blanketOrder}
                onChange={(e) => setFormData(prev => ({ ...prev, blanketOrder: e.target.checked }))}
                className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-blue-500"
              />
              <label htmlFor="blanketOrder" className="text-sm text-zinc-400">Blanket Order</label>
            </div>
            
            {/* Currency */}
            <div>
              <label className="text-sm text-zinc-400">Currency</label>
              <input
                type="text"
                value={formData.currency}
                readOnly
                className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-zinc-400 outline-none"
              />
            </div>
          </div>
          
          {/* Right Column */}
          <div className="space-y-4">
            {/* Order Deadline */}
            <div>
              <label className="text-sm text-zinc-400 flex items-center gap-1">
                Order Deadline <span className="text-red-400">?</span>
              </label>
              <input
                type="datetime-local"
                value={formData.orderDeadline}
                onChange={(e) => setFormData(prev => ({ ...prev, orderDeadline: e.target.value }))}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white outline-none"
              />
            </div>
            
            {/* Expected Arrival */}
            <div>
              <label className="text-sm text-zinc-400 flex items-center gap-1">
                Expected Arrival <span className="text-red-400">?</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={formData.expectedArrival}
                  onChange={(e) => setFormData(prev => ({ ...prev, expectedArrival: e.target.value }))}
                  className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white outline-none"
                />
                <span className="text-green-400 text-sm whitespace-nowrap">57% On-Time Delivery</span>
              </div>
            </div>
            
            {/* Deliver To */}
            <div>
              <label className="text-sm text-zinc-400 flex items-center gap-1">
                Deliver To <span className="text-red-400">?</span>
              </label>
              <input
                type="text"
                value={formData.deliverTo}
                onChange={(e) => setFormData(prev => ({ ...prev, deliverTo: e.target.value }))}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white outline-none"
              />
            </div>
            
            {/* Logistic Details */}
            <div>
              <label className="text-sm text-zinc-400">Logistic Details</label>
              <select
                value={formData.logisticDetails}
                onChange={(e) => setFormData(prev => ({ ...prev, logisticDetails: e.target.value }))}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white outline-none"
              >
                {LOGISTIC_OPTIONS.map(l => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
            
            {/* Payment Terms */}
            <div>
              <label className="text-sm text-zinc-400">Payment Terms</label>
              <select
                value={formData.paymentTerms}
                onChange={(e) => setFormData(prev => ({ ...prev, paymentTerms: e.target.value }))}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white outline-none"
              >
                {PAYMENT_TERMS.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Products Tab */}
        <div className="border border-zinc-800 rounded-xl overflow-hidden">
          <div className="flex border-b border-zinc-800">
            <button className="px-6 py-3 text-white font-medium bg-zinc-800 border-b-2 border-blue-500">
              Products
            </button>
            <button className="px-6 py-3 text-zinc-500 hover:text-zinc-300">
              Other Information
            </button>
            <button className="px-6 py-3 text-zinc-500 hover:text-zinc-300">
              Alternatives
            </button>
          </div>
          
          {/* Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-800/50">
                <tr className="text-zinc-400 text-left">
                  <th className="px-4 py-3 w-10"></th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 w-36">Analytic Distrib...</th>
                  <th className="px-4 py-3 w-24 text-right">Quantity</th>
                  <th className="px-4 py-3 w-20">UoM</th>
                  <th className="px-4 py-3 w-28 text-right">Unit Price</th>
                  <th className="px-4 py-3 w-24">Taxes</th>
                  <th className="px-4 py-3 w-32 text-right">Tax excl.</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {formData.items.map((item, index) => (
                  <tr key={index} className="border-t border-zinc-800 hover:bg-zinc-800/30">
                    <td className="px-4 py-2">
                      <span className="text-zinc-600 cursor-move">⋮⋮</span>
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={item.materialId}
                        onChange={(e) => updateItem(index, 'materialId', e.target.value)}
                        className="w-full px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-white text-sm outline-none"
                      >
                        <option value="">Select product...</option>
                        {materials.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.code})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        placeholder="Description..."
                        className="w-full px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-white text-sm outline-none"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={item.analyticDistribution || ''}
                        onChange={(e) => updateItem(index, 'analyticDistribution', e.target.value)}
                        className="w-full px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-white text-sm outline-none"
                      >
                        <option value="">None</option>
                        {ANALYTIC_DISTRIBUTIONS.map(a => (
                          <option key={a.value} value={a.value}>{a.label}</option>
                        ))}
                      </select>
                      {item.analyticDistribution && (
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs text-white ${ANALYTIC_DISTRIBUTIONS.find(a => a.value === item.analyticDistribution)?.color || 'bg-gray-500'}`}>
                          {ANALYTIC_DISTRIBUTIONS.find(a => a.value === item.analyticDistribution)?.label}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min={1}
                        step="0.001"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-white text-sm text-right outline-none"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) => updateItem(index, 'unit', e.target.value)}
                        className="w-full px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-white text-sm outline-none"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-white text-sm text-right outline-none"
                        />
                        <button className="text-zinc-500 hover:text-white">↺</button>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <span className="px-2 py-1 bg-zinc-700 rounded text-xs text-zinc-300">
                        IGST {item.taxPercent}%
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-white">
                      ₹ {item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-2">
                      {formData.items.length > 1 && (
                        <button
                          onClick={() => removeItem(index)}
                          className="text-zinc-500 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Add Options */}
          <div className="px-4 py-3 border-t border-zinc-800 flex items-center gap-4 text-sm">
            <button
              onClick={addItem}
              className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Add a product
            </button>
            <button className="text-zinc-500 hover:text-zinc-300">Add a section</button>
            <button className="text-zinc-500 hover:text-zinc-300">Add a note</button>
            <button className="text-zinc-500 hover:text-zinc-300">Catalog</button>
          </div>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-80 bg-zinc-800/50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Untaxed Amount</span>
              <span className="text-white">{formatCurrency(formData.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">IGST 18%</span>
              <span className="text-white">{formatCurrency(formData.taxAmount)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t border-zinc-700 pt-2 mt-2">
              <span className="text-white">Total</span>
              <span className="text-green-400">{formatCurrency(formData.totalAmount)}</span>
            </div>
            
            {requiresMDApproval && (
              <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-amber-400 font-medium">MD Approval Required</p>
                    <p className="text-xs text-amber-400/70">
                      Amount exceeds {formatCurrency(mdApprovalThreshold)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-sm text-zinc-400 mb-1 block">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows={3}
            placeholder="Additional notes for this order..."
            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 outline-none resize-none"
          />
        </div>
      </div>

      {/* Print Preview Modal */}
      <AnimatePresence>
        {showPrintPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            onClick={() => setShowPrintPreview(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-4xl bg-white rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              {/* Print Preview Header */}
              <div className="sticky top-0 bg-zinc-900 p-4 flex items-center justify-between z-10">
                <h3 className="text-lg font-semibold text-white">Print Preview</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePrint()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </button>
                  <button
                    onClick={() => setShowPrintPreview(false)}
                    className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              {/* Print Content */}
              <div ref={printRef}>
                <POPrintTemplate data={getPrintData()} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
