'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ShoppingCart, FileText, ClipboardList, Send, CheckCircle, Clock,
  Search, Eye, ChevronRight, ArrowLeft, Home,
  DollarSign, Truck, Upload, Image as ImageIcon, Download,
  FileSpreadsheet, BarChart3, Calendar, TrendingUp,
  AlertCircle, ArrowUpRight, Printer, Receipt,
  Boxes, ClipboardCheck, ExternalLink, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { db } from '@/lib/firebase/client';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  limit
} from 'firebase/firestore';
import { toast } from '@/lib/toast';
import { COLLECTIONS, PurchaseOrder } from '@/types/purchase';

// ==========================================
// QUICK ACTION CARD COMPONENT
// ==========================================
function QuickActionCard({ 
  title, 
  description, 
  icon: Icon, 
  color, 
  href, 
  onClick,
  badge 
}: { 
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  href?: string;
  onClick?: () => void;
  badge?: number;
}) {
  const router = useRouter();
  
  const colorClasses: Record<string, { bg: string; text: string; border: string; glow: string }> = {
    blue: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', glow: 'hover:shadow-blue-500/20' },
    green: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30', glow: 'hover:shadow-green-500/20' },
    orange: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30', glow: 'hover:shadow-orange-500/20' },
    purple: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30', glow: 'hover:shadow-purple-500/20' },
    cyan: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30', glow: 'hover:shadow-cyan-500/20' },
    red: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', glow: 'hover:shadow-red-500/20' },
    yellow: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30', glow: 'hover:shadow-yellow-500/20' },
    pink: { bg: 'bg-pink-500/20', text: 'text-pink-400', border: 'border-pink-500/30', glow: 'hover:shadow-pink-500/20' },
    indigo: { bg: 'bg-indigo-500/20', text: 'text-indigo-400', border: 'border-indigo-500/30', glow: 'hover:shadow-indigo-500/20' },
    emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30', glow: 'hover:shadow-emerald-500/20' },
  };

  const colors = colorClasses[color] || colorClasses.blue;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (href) {
      router.push(href);
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className={`relative cursor-pointer rounded-xl p-5 border ${colors.border} bg-zinc-900/50 hover:bg-zinc-900/80 transition-all duration-300 hover:shadow-lg ${colors.glow} group`}
    >
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-xl ${colors.bg}`}>
          <Icon className={`w-6 h-6 ${colors.text}`} />
        </div>
        {badge !== undefined && badge > 0 && (
          <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
            {badge}
          </span>
        )}
        <ArrowUpRight className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
      </div>
      <h3 className="mt-4 font-semibold text-white">{title}</h3>
      <p className="mt-1 text-sm text-zinc-400">{description}</p>
    </motion.div>
  );
}

// ==========================================
// STAT CARD COMPONENT
// ==========================================
function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  trend,
  suffix 
}: { 
  title: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  trend?: { value: number; isPositive: boolean };
  suffix?: string;
}) {
  const colorClasses: Record<string, { bg: string; text: string }> = {
    blue: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
    green: { bg: 'bg-green-500/20', text: 'text-green-400' },
    orange: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
    purple: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
    cyan: { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
    red: { bg: 'bg-red-500/20', text: 'text-red-400' },
    yellow: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  };

  const colors = colorClasses[color] || colorClasses.blue;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-zinc-400 text-sm">{title}</p>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-2xl font-bold text-white">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {suffix && <span className="text-sm text-zinc-500">{suffix}</span>}
          </div>
          {trend && (
            <div className={`flex items-center gap-1 mt-1 text-xs ${trend.isPositive ? 'text-green-400' : 'text-red-400'}`}>
              <TrendingUp className={`w-3 h-3 ${!trend.isPositive && 'rotate-180'}`} />
              {trend.value}% vs last month
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${colors.bg}`}>
          <Icon className={`w-6 h-6 ${colors.text}`} />
        </div>
      </div>
    </motion.div>
  );
}

// ==========================================
// INVOICE PREVIEW MODAL
// ==========================================
function InvoicePreviewModal({ 
  isOpen, 
  onClose, 
  po 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  po: PurchaseOrder | null;
}) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Purchase Order - ${po?.poNumber}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
              .header { display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
              .company { font-size: 24px; font-weight: bold; color: #1a1a1a; }
              .po-number { font-size: 18px; color: #666; }
              .section { margin-bottom: 20px; }
              .section-title { font-size: 14px; font-weight: bold; color: #666; margin-bottom: 8px; text-transform: uppercase; }
              .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
              .info-box { background: #f5f5f5; padding: 15px; border-radius: 8px; }
              .info-label { font-size: 12px; color: #666; }
              .info-value { font-size: 14px; font-weight: 500; margin-top: 4px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th { background: #333; color: white; padding: 12px; text-align: left; }
              td { padding: 12px; border-bottom: 1px solid #ddd; }
              .total-row { font-weight: bold; background: #f5f5f5; }
              .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 12px; }
              .stamp-area { display: flex; justify-content: space-between; margin-top: 60px; }
              .stamp-box { width: 200px; text-align: center; }
              .stamp-line { border-top: 1px solid #333; margin-top: 60px; padding-top: 8px; }
              @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
            </style>
          </head>
          <body>
            <div class="header">
              <div>
                <div class="company">TRIOVISION</div>
                <div style="color: #666; margin-top: 4px;">Manufacturing Excellence</div>
              </div>
              <div style="text-align: right;">
                <div class="po-number">Purchase Order</div>
                <div style="font-size: 24px; font-weight: bold; color: #2563eb;">${po?.poNumber}</div>
                <div style="color: #666; margin-top: 4px;">Date: ${new Date(po?.createdAt || '').toLocaleDateString()}</div>
              </div>
            </div>

            <div class="info-grid">
              <div class="info-box">
                <div class="section-title">Vendor Details</div>
                <div class="info-value">${po?.vendorDetails?.name || 'N/A'}</div>
                <div class="info-label" style="margin-top: 8px;">GST: N/A</div>
                <div class="info-label">Contact: ${po?.vendorDetails?.contact || 'N/A'}</div>
              </div>
              <div class="info-box">
                <div class="section-title">Order Details</div>
                <div class="info-label">Expected Delivery</div>
                <div class="info-value">${po?.expectedDelivery ? new Date(po.expectedDelivery).toLocaleDateString() : 'TBD'}</div>
                <div class="info-label" style="margin-top: 8px;">Status</div>
                <div class="info-value">${po?.status?.replace(/_/g, ' ').toUpperCase()}</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Item Description</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>Rate</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                ${po?.items?.map((item, i) => `
                  <tr>
                    <td>${i + 1}</td>
                    <td>${item.itemName}</td>
                    <td>${item.quantity}</td>
                    <td>${item.unit}</td>
                    <td>₹${item.unitPrice?.toLocaleString()}</td>
                    <td>₹${(item.quantity * item.unitPrice)?.toLocaleString()}</td>
                  </tr>
                `).join('')}
                <tr class="total-row">
                  <td colspan="5" style="text-align: right;">Subtotal</td>
                  <td>₹${po?.subtotal?.toLocaleString()}</td>
                </tr>
                <tr class="total-row">
                  <td colspan="5" style="text-align: right;">GST (18%)</td>
                  <td>₹${po?.gstAmount?.toLocaleString()}</td>
                </tr>
                <tr class="total-row" style="background: #2563eb; color: white;">
                  <td colspan="5" style="text-align: right;">Grand Total</td>
                  <td>₹${po?.totalAmount?.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>

            <div class="stamp-area">
              <div class="stamp-box">
                <div class="stamp-line">Prepared By</div>
              </div>
              <div class="stamp-box">
                <div class="stamp-line">Approved By</div>
              </div>
              <div class="stamp-box">
                <div class="stamp-line">Vendor Signature</div>
              </div>
            </div>

            <div class="footer">
              <p>This is a computer-generated document. No signature required.</p>
              <p>Triovision Manufacturing | Generated on ${new Date().toLocaleString()}</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleDownloadPDF = () => {
    handlePrint(); // For now, use print as PDF
    toast.success('PDF download initiated via print dialog');
  };

  if (!po) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-3">
              <Receipt className="w-5 h-5 text-blue-400" />
              Purchase Order Preview - {po.poNumber}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div ref={printRef} className="bg-white text-black p-6 rounded-lg">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-4">
            <div>
              <h1 className="text-2xl font-bold">TRIOVISION</h1>
              <p className="text-gray-600 text-sm">Manufacturing Excellence</p>
            </div>
            <div className="text-right">
              <p className="text-gray-600">Purchase Order</p>
              <p className="text-2xl font-bold text-blue-600">{po.poNumber}</p>
              <p className="text-gray-600 text-sm">Date: {new Date(po.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-100 p-4 rounded-lg">
              <p className="text-xs text-gray-500 uppercase font-bold mb-2">Vendor Details</p>
              <p className="font-semibold">{po.vendorDetails?.name || 'N/A'}</p>
              <p className="text-sm text-gray-600">GST: N/A</p>
              <p className="text-sm text-gray-600">Contact: {po.vendorDetails?.contact || 'N/A'}</p>
            </div>
            <div className="bg-gray-100 p-4 rounded-lg">
              <p className="text-xs text-gray-500 uppercase font-bold mb-2">Order Details</p>
              <p className="text-sm"><span className="text-gray-600">Expected Delivery:</span> {po.expectedDelivery ? new Date(po.expectedDelivery).toLocaleDateString() : 'TBD'}</p>
              <p className="text-sm"><span className="text-gray-600">Status:</span> {po.status?.replace(/_/g, ' ').toUpperCase()}</p>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="p-3 text-left">#</th>
                <th className="p-3 text-left">Item</th>
                <th className="p-3 text-center">Qty</th>
                <th className="p-3 text-center">Unit</th>
                <th className="p-3 text-right">Rate</th>
                <th className="p-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {po.items?.map((item, i) => (
                <tr key={i} className="border-b border-gray-200">
                  <td className="p-3">{i + 1}</td>
                  <td className="p-3">{item.itemName}</td>
                  <td className="p-3 text-center">{item.quantity}</td>
                  <td className="p-3 text-center">{item.unit}</td>
                  <td className="p-3 text-right">₹{item.unitPrice?.toLocaleString()}</td>
                  <td className="p-3 text-right">₹{(item.quantity * item.unitPrice)?.toLocaleString()}</td>
                </tr>
              ))}
              <tr className="bg-gray-100 font-semibold">
                <td colSpan={5} className="p-3 text-right">Subtotal</td>
                <td className="p-3 text-right">₹{po.subtotal?.toLocaleString()}</td>
              </tr>
              <tr className="bg-gray-100 font-semibold">
                <td colSpan={5} className="p-3 text-right">GST (18%)</td>
                <td className="p-3 text-right">₹{po.gstAmount?.toLocaleString()}</td>
              </tr>
              <tr className="bg-blue-600 text-white font-bold">
                <td colSpan={5} className="p-3 text-right">Grand Total</td>
                <td className="p-3 text-right">₹{po.totalAmount?.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose} className="border-zinc-700">
            Close
          </Button>
          <Button onClick={handleDownloadPDF} className="bg-red-600 hover:bg-red-700">
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
          <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ==========================================
// IMAGE UPLOAD MODAL
// ==========================================
function ImageUploadModal({ 
  isOpen, 
  onClose, 
  onUpload,
  title = 'Upload Document'
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onUpload: (file: File, type: string) => void;
  title?: string;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [docType, setDocType] = useState('invoice');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => setPreview(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        setPreview(null);
      }
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      onUpload(selectedFile, docType);
      setSelectedFile(null);
      setPreview(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-3">
              <Upload className="w-5 h-5 text-green-400" />
              {title}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Document Type */}
          <div>
            <label className="text-sm text-zinc-400 mb-2 block">Document Type</label>
            <div className="flex gap-2">
              {['invoice', 'challan', 'quotation', 'other'].map((type) => (
                <button
                  key={type}
                  onClick={() => setDocType(type)}
                  className={`px-3 py-2 rounded-lg text-sm capitalize transition-colors ${
                    docType === type
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Upload Area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-zinc-700 rounded-xl p-8 text-center cursor-pointer hover:border-zinc-600 transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            {preview ? (
              <div className="max-h-48 mx-auto rounded-lg overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded-lg" />
              </div>
            ) : selectedFile ? (
              <div className="flex flex-col items-center gap-2">
                <FileText className="w-12 h-12 text-zinc-400" />
                <p className="text-sm text-white">{selectedFile.name}</p>
                <p className="text-xs text-zinc-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-zinc-500" />
                </div>
                <p className="text-sm text-zinc-400">Click to upload or drag and drop</p>
                <p className="text-xs text-zinc-500">PNG, JPG, PDF up to 10MB</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose} className="border-zinc-700">
            Cancel
          </Button>
          <Button 
            onClick={handleUpload}
            disabled={!selectedFile}
            className="bg-green-600 hover:bg-green-700"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ==========================================
// MAIN PURCHASE HUB COMPONENT
// ==========================================
export default function PurchaseHub() {
  const router = useRouter();
  const [pos, setPOs] = useState<PurchaseOrder[]>([]);
  const [, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Subscribe to POs
  useEffect(() => {
    const q = query(
      collection(db, COLLECTIONS.PURCHASE_ORDERS),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PurchaseOrder[];
      setPOs(orders);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Stats
  const stats = {
    totalPOs: pos.length,
    pendingApproval: pos.filter(po => po.status === 'pending_md_approval').length,
    approved: pos.filter(po => po.status === 'approved').length,
    totalValue: pos.reduce((sum, po) => sum + (po.totalAmount || 0), 0),
    thisMonth: pos.filter(po => {
      const date = new Date(po.createdAt);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length
  };

  // Handle image upload
  const handleImageUpload = async (file: File, type: string) => {
    toast.success(`${type} document uploaded successfully!`);
    // In production, upload to Firebase Storage
  };

  // Quick actions configuration
  const quickActions = [
    { title: 'Purchase Requests', description: 'View and manage PRs', icon: ClipboardList, color: 'yellow', href: '/purchase' },
    { title: 'Create Enquiry', description: 'Send to suppliers', icon: Send, color: 'blue', href: '/purchase' },
    { title: 'Stock Alerts', description: 'Low stock warnings', icon: AlertCircle, color: 'red', href: '/purchase/alerts', badge: stats.pendingApproval > 0 ? stats.pendingApproval : undefined },
    { title: 'Material Transfers', description: 'Inter-department', icon: Truck, color: 'purple', href: '/purchase/transfers' },
    { title: 'Inventory Audit', description: 'Cycle counts', icon: ClipboardCheck, color: 'orange', href: '/purchase/audit' },
    { title: 'Reorder Rules', description: 'Auto-reorder setup', icon: Zap, color: 'cyan', href: '/purchase/reorder' },
    { title: 'Export Reports', description: 'Excel & PDF exports', icon: FileSpreadsheet, color: 'green', href: '/purchase/reports' },
    { title: 'Analytics', description: 'KPIs & insights', icon: BarChart3, color: 'indigo', href: '/rnd/analytics' },
  ];

  return (
    <div className="min-h-screen bg-[#020202] text-white">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />
      <div className="fixed top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative p-6 lg:p-8">
        {/* Back Navigation */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-3 py-2 bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700 rounded-lg text-sm text-zinc-300 hover:text-white transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button
            onClick={() => router.push('/rnd')}
            className="flex items-center gap-2 px-3 py-2 bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700 rounded-lg text-sm text-zinc-300 hover:text-white transition-all"
          >
            <Home className="w-4 h-4" />
            Dashboard
          </button>
          <div className="flex-1" />
          <Button
            onClick={() => setShowUploadModal(true)}
            variant="outline"
            className="border-zinc-700 hover:bg-zinc-800"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Document
          </Button>
        </div>

        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent flex items-center gap-3">
            <ShoppingCart className="w-8 h-8 text-cyan-400" />
            Purchase Hub
          </h1>
          <p className="text-zinc-400 mt-2">Complete purchase management with advanced features</p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <StatCard title="Total POs" value={stats.totalPOs} icon={ShoppingCart} color="blue" />
          <StatCard title="Pending Approval" value={stats.pendingApproval} icon={Clock} color="orange" />
          <StatCard title="Approved" value={stats.approved} icon={CheckCircle} color="green" />
          <StatCard title="This Month" value={stats.thisMonth} icon={Calendar} color="purple" />
          <StatCard title="Total Value" value={`₹${(stats.totalValue / 100000).toFixed(1)}L`} icon={DollarSign} color="cyan" />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-zinc-900/50 border border-zinc-800 p-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-cyan-600">
              <BarChart3 className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="orders" className="data-[state=active]:bg-cyan-600">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Orders ({pos.length})
            </TabsTrigger>
            <TabsTrigger value="modules" className="data-[state=active]:bg-cyan-600">
              <Boxes className="w-4 h-4 mr-2" />
              Modules
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Quick Actions Grid */}
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {quickActions.map((action) => (
                    <QuickActionCard key={action.title} {...action} />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent POs and Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Purchase Orders */}
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-blue-400" />
                    Recent Purchase Orders
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setActiveTab('orders')}
                    className="text-zinc-400 hover:text-white"
                  >
                    View All
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {pos.slice(0, 5).map((po) => (
                    <div
                      key={po.id}
                      onClick={() => {
                        setSelectedPO(po);
                        setShowInvoiceModal(true);
                      }}
                      className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          po.status === 'approved' ? 'bg-green-500/20' :
                          po.status === 'pending_md_approval' ? 'bg-orange-500/20' :
                          'bg-zinc-700'
                        }`}>
                          <ShoppingCart className={`w-4 h-4 ${
                            po.status === 'approved' ? 'text-green-400' :
                            po.status === 'pending_md_approval' ? 'text-orange-400' :
                            'text-zinc-400'
                          }`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{po.poNumber}</p>
                          <p className="text-xs text-zinc-400">{po.vendorDetails?.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-cyan-400">₹{po.totalAmount?.toLocaleString()}</p>
                        <p className="text-xs text-zinc-500">{new Date(po.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                  {pos.length === 0 && (
                    <div className="text-center py-8 text-zinc-500">
                      No purchase orders yet
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Module Access */}
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Boxes className="w-5 h-5 text-purple-400" />
                    Purchase Modules
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { name: 'Stock Alerts', href: '/purchase/alerts', icon: AlertCircle, color: 'red', desc: 'Monitor low stock items' },
                    { name: 'Material Transfers', href: '/purchase/transfers', icon: Truck, color: 'purple', desc: 'Inter-department transfers' },
                    { name: 'Inventory Audit', href: '/purchase/audit', icon: ClipboardCheck, color: 'orange', desc: 'Cycle counts & reconciliation' },
                    { name: 'Reorder Automation', href: '/purchase/reorder', icon: Zap, color: 'cyan', desc: 'Auto-reorder rules' },
                    { name: 'Export Reports', href: '/purchase/reports', icon: FileSpreadsheet, color: 'green', desc: 'Generate Excel/PDF reports' },
                    { name: 'Analytics Dashboard', href: '/rnd/analytics', icon: BarChart3, color: 'indigo', desc: 'KPIs and insights' },
                  ].map((module) => (
                    <motion.div
                      key={module.name}
                      whileHover={{ x: 4 }}
                      onClick={() => router.push(module.href)}
                      className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-${module.color}-500/20`}>
                          <module.icon className={`w-4 h-4 text-${module.color}-400`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{module.name}</p>
                          <p className="text-xs text-zinc-500">{module.desc}</p>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <Input
                placeholder="Search by PO number or vendor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-11 bg-zinc-900/50 border-zinc-800"
              />
            </div>

            {/* Orders List */}
            <div className="space-y-3">
              {pos
                .filter(po => 
                  po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  po.vendorDetails?.name?.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((po) => (
                  <motion.div
                    key={po.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-white">{po.poNumber}</h3>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            po.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                            po.status === 'pending_md_approval' ? 'bg-orange-500/20 text-orange-400' :
                            po.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                            'bg-zinc-500/20 text-zinc-400'
                          }`}>
                            {po.status?.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-400">Vendor: {po.vendorDetails?.name}</p>
                      </div>
                      <p className="text-lg font-bold text-cyan-400">₹{po.totalAmount?.toLocaleString()}</p>
                    </div>

                    <div className="grid grid-cols-4 gap-4 mb-4 text-sm">
                      <div>
                        <p className="text-zinc-500">Items</p>
                        <p className="text-white">{po.items?.length || 0}</p>
                      </div>
                      <div>
                        <p className="text-zinc-500">Subtotal</p>
                        <p className="text-white">₹{po.subtotal?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-zinc-500">GST</p>
                        <p className="text-white">₹{po.gstAmount?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-zinc-500">Created</p>
                        <p className="text-white">{new Date(po.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedPO(po);
                          setShowInvoiceModal(true);
                        }}
                        className="border-zinc-700"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedPO(po);
                          setShowInvoiceModal(true);
                        }}
                        className="border-zinc-700"
                      >
                        <Printer className="w-4 h-4 mr-2" />
                        Print
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setShowUploadModal(true)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Attach
                      </Button>
                    </div>
                  </motion.div>
                ))}
            </div>
          </TabsContent>

          {/* Modules Tab */}
          <TabsContent value="modules" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {quickActions.map((action) => (
                <QuickActionCard key={action.title} {...action} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <InvoicePreviewModal
        isOpen={showInvoiceModal}
        onClose={() => {
          setShowInvoiceModal(false);
          setSelectedPO(null);
        }}
        po={selectedPO}
      />

      <ImageUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleImageUpload}
        title="Upload Invoice/Document"
      />
    </div>
  );
}
