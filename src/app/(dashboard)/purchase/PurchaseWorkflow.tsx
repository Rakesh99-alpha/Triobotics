'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  ClipboardList,
  Truck,
  Warehouse,
  CreditCard,
  Shield,
  ChevronRight,
  Plus,
  Search,
  Download,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  Send,
  RefreshCw,
  Printer,
  X
} from 'lucide-react';
import { db } from '@/lib/firebase/client';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  query,
  orderBy
} from 'firebase/firestore';

// ==========================================
// TYPES & INTERFACES
// ==========================================

type DocumentStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';

interface BaseDocument {
  id: string;
  docNumber?: string;
  status?: DocumentStatus;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  remarks?: string;
  department?: string;
  vendorName?: string;
  totalAmount?: number;
  [key: string]: unknown; // Allow additional properties
}

interface DocumentType {
  id: string;
  name: string;
  code: string;
  primary?: boolean;
}

interface Material {
  id: string;
  code?: string;
  name: string;
  unit?: string;
  purchase_price?: number;
  [key: string]: unknown;
}

interface Supplier {
  id: string;
  name: string;
  gst?: string;
  contact?: string;
  address?: string;
  [key: string]: unknown;
}

interface FormItem {
  materialId: string;
  materialCode: string;
  materialName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

interface FormData {
  items: FormItem[];
  priority: string;
  department: string;
  vendorId: string;
  remarks: string;
  [key: string]: unknown;
}

// ==========================================
// DOCUMENT PHASES CONFIGURATION
// ==========================================

const PURCHASE_PHASES = [
  {
    id: 'pre-purchase',
    name: 'Pre-Purchase',
    icon: ClipboardList,
    color: 'blue',
    documents: [
      { id: 'production-plan', name: 'Production Plan', code: 'PP' },
      { id: 'bom', name: 'Bill of Materials (BOM)', code: 'BOM' },
      { id: 'mrp', name: 'Material Requirement Planning', code: 'MRP' },
      { id: 'stock-status', name: 'Stock Status Report', code: 'SSR' },
      { id: 'purchase-requisition', name: 'Purchase Requisition (PR)', code: 'PR', primary: true },
      { id: 'budget-note', name: 'Budget Availability Note', code: 'BAN' },
      { id: 'tech-spec', name: 'Technical Specification', code: 'TS' },
      { id: 'approval-note', name: 'Approval / Sanction Note', code: 'SN' },
    ]
  },
  {
    id: 'purchase',
    name: 'Purchase',
    icon: FileText,
    color: 'purple',
    documents: [
      { id: 'vendor-list', name: 'Approved Vendor List (AVL)', code: 'AVL' },
      { id: 'rfq', name: 'Request for Quotation (RFQ)', code: 'RFQ', primary: true },
      { id: 'vendor-quote', name: 'Vendor Quotation', code: 'VQ' },
      { id: 'negotiation', name: 'Negotiation Note', code: 'NN' },
      { id: 'comparative', name: 'Comparative Statement (CS)', code: 'CS', primary: true },
      { id: 'committee-rec', name: 'Purchase Committee Recommendation', code: 'PCR' },
      { id: 'purchase-order', name: 'Purchase Order (PO)', code: 'PO', primary: true },
      { id: 'po-amendment', name: 'PO Amendment / Revision', code: 'POA' },
      { id: 'order-ack', name: 'Order Acknowledgement', code: 'OA' },
    ]
  },
  {
    id: 'logistics',
    name: 'Logistics & Inward',
    icon: Truck,
    color: 'orange',
    documents: [
      { id: 'asi', name: 'Advance Shipment Intimation', code: 'ASI' },
      { id: 'eway-bill', name: 'Transport LR / E-Way Bill', code: 'EWB' },
      { id: 'delivery-challan', name: 'Delivery Challan (DC)', code: 'DC' },
      { id: 'gate-entry', name: 'Gate Entry / Inward Register', code: 'GE' },
      { id: 'weighment', name: 'Weighment Slip', code: 'WS' },
      { id: 'qi-call', name: 'Quality Inspection Call', code: 'QIC' },
      { id: 'qir', name: 'Quality Inspection Report', code: 'QIR' },
      { id: 'mrn', name: 'Material Rejection Note', code: 'MRN' },
      { id: 'grn', name: 'Goods Received Note (GRN)', code: 'GRN', primary: true },
    ]
  },
  {
    id: 'store',
    name: 'Store & Production',
    icon: Warehouse,
    color: 'green',
    documents: [
      { id: 'stock-ledger', name: 'Stock Ledger Entry', code: 'SLE' },
      { id: 'bin-card', name: 'Bin Card / Rack Location', code: 'BC' },
      { id: 'batch-record', name: 'Batch / Heat Number Record', code: 'BHR' },
      { id: 'material-req', name: 'Material Issue Requisition', code: 'MIR' },
      { id: 'material-issue', name: 'Material Issue Slip (MIS)', code: 'MIS', primary: true },
      { id: 'scrap-return', name: 'Scrap / Return Note', code: 'SRN' },
    ]
  },
  {
    id: 'accounts',
    name: 'Accounts & Payment',
    icon: CreditCard,
    color: 'cyan',
    documents: [
      { id: 'vendor-invoice', name: 'Vendor Invoice', code: 'VI', primary: true },
      { id: 'three-way-match', name: '3-Way Matching Statement', code: '3WM' },
      { id: 'debit-note', name: 'Debit Note', code: 'DN' },
      { id: 'credit-note', name: 'Credit Note', code: 'CN' },
      { id: 'tax-verification', name: 'Tax Invoice Verification', code: 'TIV' },
      { id: 'payment-advice', name: 'Payment Advice', code: 'PA' },
      { id: 'payment-voucher', name: 'Payment Voucher', code: 'PV', primary: true },
      { id: 'bank-advice', name: 'Bank Advice / UTR', code: 'BA' },
    ]
  },
  {
    id: 'audit',
    name: 'Control & Audit',
    icon: Shield,
    color: 'red',
    documents: [
      { id: 'purchase-register', name: 'Purchase Register', code: 'PREG' },
      { id: 'vendor-performance', name: 'Vendor Performance Report', code: 'VPR' },
      { id: 'cost-analysis', name: 'Purchase Cost Analysis', code: 'PCA' },
      { id: 'internal-audit', name: 'Internal Audit Note', code: 'IAN' },
      { id: 'statutory-audit', name: 'Statutory Audit File', code: 'SAF' },
    ]
  }
];

// Firebase Collections
const COLLECTIONS_MAP = {
  'purchase-requisition': 'purchase_requisitions',
  'rfq': 'purchase_rfqs',
  'vendor-quote': 'purchase_quotations',
  'comparative': 'purchase_comparative_statements',
  'purchase-order': 'purchase_orders',
  'grn': 'purchase_grns',
  'vendor-invoice': 'purchase_invoices',
  'material-issue': 'material_issues',
  'payment-voucher': 'payment_vouchers',
};

// Status colors
const STATUS_CONFIG: Record<DocumentStatus, { color: string; bg: string; icon: React.ElementType }> = {
  draft: { color: 'text-zinc-400', bg: 'bg-zinc-500/20', icon: FileText },
  pending: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', icon: Clock },
  approved: { color: 'text-green-400', bg: 'bg-green-500/20', icon: CheckCircle },
  rejected: { color: 'text-red-400', bg: 'bg-red-500/20', icon: XCircle },
  completed: { color: 'text-blue-400', bg: 'bg-blue-500/20', icon: CheckCircle },
  cancelled: { color: 'text-zinc-500', bg: 'bg-zinc-600/20', icon: XCircle },
};

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function PurchaseWorkflow() {
  // State
  const [activePhase, setActivePhase] = useState('pre-purchase');
  const [activeDocument, setActiveDocument] = useState('purchase-requisition');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'all'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<BaseDocument | null>(null);
  const [loading, setLoading] = useState(true);

  // Data state
  const [documents, setDocuments] = useState<BaseDocument[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    thisMonth: 0,
    totalValue: 0
  });

  // Get current phase and document info
  const currentPhase = PURCHASE_PHASES.find(p => p.id === activePhase);
  const currentDocument = currentPhase?.documents.find(d => d.id === activeDocument);

  // ==========================================
  // DATA FETCHING
  // ==========================================

  useEffect(() => {
    // Fetch materials
    const unsubMaterials = onSnapshot(
      collection(db, 'inventory_materials'),
      (snapshot) => {
        const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Material));
        setMaterials(items);
      }
    );

    // Fetch suppliers
    const unsubSuppliers = onSnapshot(
      collection(db, 'inventory_suppliers'),
      (snapshot) => {
        const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Supplier));
        setSuppliers(items);
      }
    );

    return () => {
      unsubMaterials();
      unsubSuppliers();
    };
  }, []);

  // Fetch documents based on active document type
  useEffect(() => {
    const collectionName = COLLECTIONS_MAP[activeDocument as keyof typeof COLLECTIONS_MAP];
    if (!collectionName) {
      // Use setTimeout to avoid synchronous setState during render
      setTimeout(() => {
        setDocuments([]);
        setLoading(false);
      }, 0);
      return;
    }

    // Start loading in a microtask to avoid the linter warning
    Promise.resolve().then(() => setLoading(true));
    
    const unsubDocs = onSnapshot(
      query(collection(db, collectionName), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as BaseDocument));
        setDocuments(docs);
        
        // Calculate stats
        const now = new Date();
        const thisMonth = docs.filter(d => {
          if (!d.createdAt) return false;
          const created = new Date(d.createdAt);
          return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
        });
        
        setStats({
          total: docs.length,
          pending: docs.filter(d => d.status === 'pending').length,
          approved: docs.filter(d => d.status === 'approved' || d.status === 'completed').length,
          thisMonth: thisMonth.length,
          totalValue: docs.reduce((sum, d) => sum + (d.totalAmount || 0), 0)
        });
        
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching documents:', error);
        setLoading(false);
      }
    );

    return () => unsubDocs();
  }, [activeDocument]);

  // Filter documents
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = 
      doc.docNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.vendorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.department?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Generate document number - using useCallback to avoid impure function in render
  const generateDocNumber = React.useCallback((code: string) => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${code}-${year}${month}-${random}`;
  }, []);

  // Create new document
  const handleCreateDocument = async (data: Record<string, unknown>) => {
    const collectionName = COLLECTIONS_MAP[activeDocument as keyof typeof COLLECTIONS_MAP];
    if (!collectionName) return;

    try {
      const docData = {
        ...data,
        docNumber: generateDocNumber(currentDocument?.code || 'DOC'),
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: JSON.parse(localStorage.getItem('currentUser') || '{}').name || 'System'
      };

      await addDoc(collection(db, collectionName), docData);
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating document:', error);
    }
  };

  // Update document status
  const handleUpdateStatus = async (docId: string, newStatus: DocumentStatus) => {
    const collectionName = COLLECTIONS_MAP[activeDocument as keyof typeof COLLECTIONS_MAP];
    if (!collectionName) return;

    try {
      await updateDoc(doc(db, collectionName, docId), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating document:', error);
    }
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Purchase Management</h1>
        <p className="text-zinc-400">Complete purchase workflow from requisition to payment</p>
      </div>

      {/* Phase Navigation */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {PURCHASE_PHASES.map((phase, index) => {
            const Icon = phase.icon;
            const isActive = activePhase === phase.id;
            
            return (
              <React.Fragment key={phase.id}>
                <button
                  onClick={() => {
                    setActivePhase(phase.id);
                    const primaryDoc = phase.documents.find(d => d.primary) || phase.documents[0];
                    setActiveDocument(primaryDoc.id);
                  }}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-all ${
                    isActive
                      ? `bg-${phase.color}-500/20 text-${phase.color}-400 border border-${phase.color}-500/30`
                      : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50 border border-transparent'
                  }`}
                  style={{
                    backgroundColor: isActive ? `var(--${phase.color}-bg, rgba(59, 130, 246, 0.2))` : undefined,
                    borderColor: isActive ? `var(--${phase.color}-border, rgba(59, 130, 246, 0.3))` : undefined,
                  }}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium whitespace-nowrap">{phase.name}</span>
                </button>
                {index < PURCHASE_PHASES.length - 1 && (
                  <div className="flex items-center text-zinc-600">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-12 gap-6">
        {/* Document Types Sidebar */}
        <div className="col-span-3">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              {currentPhase?.name} Documents
            </h3>
            <div className="space-y-1">
              {currentPhase?.documents.map(docType => {
                const isActive = activeDocument === docType.id;
                return (
                  <button
                    key={docType.id}
                    onClick={() => setActiveDocument(docType.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all text-left ${
                      isActive
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                    }`}
                  >
                    <span className="text-sm">{docType.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      isActive ? 'bg-blue-500/30 text-blue-300' : 'bg-zinc-700 text-zinc-500'
                    }`}>
                      {docType.code}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="mt-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              Quick Stats
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 text-sm">Total</span>
                <span className="text-white font-semibold">{stats.total}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 text-sm">Pending</span>
                <span className="text-yellow-400 font-semibold">{stats.pending}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 text-sm">Approved</span>
                <span className="text-green-400 font-semibold">{stats.approved}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 text-sm">This Month</span>
                <span className="text-blue-400 font-semibold">{stats.thisMonth}</span>
              </div>
              {stats.totalValue > 0 && (
                <div className="flex justify-between items-center pt-2 border-t border-zinc-800">
                  <span className="text-zinc-500 text-sm">Total Value</span>
                  <span className="text-emerald-400 font-semibold">₹{stats.totalValue.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Document List */}
        <div className="col-span-9">
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={`Search ${currentDocument?.name}...`}
                  className="pl-10 pr-4 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none w-64"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as DocumentStatus | 'all')}
                className="px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button className="p-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors">
                <Download className="w-5 h-5" />
              </button>
              <button className="p-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors">
                <RefreshCw className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                <Plus className="w-5 h-5" />
                New {currentDocument?.code}
              </button>
            </div>
          </div>

          {/* Document Table */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="text-center py-20">
                <FileText className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-zinc-400 mb-2">No {currentDocument?.name} Found</h3>
                <p className="text-zinc-500 text-sm mb-4">Create your first {currentDocument?.code} to get started</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Create {currentDocument?.code}
                </button>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left py-4 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Doc No.</th>
                    <th className="text-left py-4 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Date</th>
                    <th className="text-left py-4 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Details</th>
                    <th className="text-left py-4 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Amount</th>
                    <th className="text-left py-4 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                    <th className="text-right py-4 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocuments.map((doc, index) => {
                    const statusConfig = STATUS_CONFIG[doc.status as DocumentStatus] || STATUS_CONFIG.draft;
                    const StatusIcon = statusConfig.icon;
                    
                    return (
                      <motion.tr
                        key={doc.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-zinc-500" />
                            <span className="font-mono text-sm text-white">{doc.docNumber}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-zinc-400 text-sm">
                            {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            }) : '-'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div>
                            <p className="text-white text-sm">{String(doc.vendorName || doc.department || '-')}</p>
                            <p className="text-zinc-500 text-xs">{Array.isArray(doc['items']) ? (doc['items'] as unknown[]).length : 0} items</p>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-emerald-400 font-medium">
                            {doc.totalAmount ? `₹${doc.totalAmount.toLocaleString()}` : '-'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {doc.status ? doc.status.charAt(0).toUpperCase() + doc.status.slice(1) : 'Unknown'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setSelectedRecord(doc);
                                setShowViewModal(true);
                              }}
                              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {doc.status === 'draft' && (
                              <>
                                <button
                                  onClick={() => handleUpdateStatus(doc.id, 'pending')}
                                  className="p-2 text-zinc-400 hover:text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                                  title="Submit for Approval"
                                >
                                  <Send className="w-4 h-4" />
                                </button>
                                <button
                                  className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"
                                  title="Edit"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {doc.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleUpdateStatus(doc.id, 'approved')}
                                  className="p-2 text-zinc-400 hover:text-green-400 hover:bg-green-500/20 rounded-lg transition-colors"
                                  title="Approve"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleUpdateStatus(doc.id, 'rejected')}
                                  className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                                  title="Reject"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            <button
                              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"
                              title="Print"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateDocumentModal
            documentType={currentDocument}
            materials={materials}
            suppliers={suppliers}
            onClose={() => setShowCreateModal(false)}
            onCreate={handleCreateDocument}
          />
        )}
      </AnimatePresence>

      {/* View Modal */}
      <AnimatePresence>
        {showViewModal && selectedRecord && (
          <ViewDocumentModal
            document={selectedRecord}
            documentType={currentDocument}
            onClose={() => {
              setShowViewModal(false);
              setSelectedRecord(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ==========================================
// CREATE DOCUMENT MODAL
// ==========================================

interface CreateDocumentModalProps {
  documentType: DocumentType | undefined;
  materials: Material[];
  suppliers: Supplier[];
  onClose: () => void;
  onCreate: (data: Record<string, unknown>) => void;
}

function CreateDocumentModal({ documentType, materials, suppliers, onClose, onCreate }: CreateDocumentModalProps) {
  const [formData, setFormData] = useState<FormData>({
    items: [],
    priority: 'medium',
    department: '',
    vendorId: '',
    remarks: ''
  });
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');

  const addItem = () => {
    if (!selectedMaterial || !quantity) return;
    
    const material = materials.find(m => m.id === selectedMaterial);
    if (!material) return;

    const newItem: FormItem = {
      materialId: material.id,
      materialCode: material.code || '',
      materialName: material.name,
      quantity: parseFloat(quantity),
      unit: material.unit || 'Pcs',
      unitPrice: parseFloat(unitPrice) || material.purchase_price || 0,
      totalPrice: parseFloat(quantity) * (parseFloat(unitPrice) || material.purchase_price || 0)
    };

    setFormData({
      ...formData,
      items: [...formData.items, newItem]
    });
    setSelectedMaterial('');
    setQuantity('');
    setUnitPrice('');
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_: FormItem, i: number) => i !== index)
    });
  };

  const totalAmount = formData.items.reduce((sum: number, item: FormItem) => sum + (item.totalPrice || 0), 0);

  const handleSubmit = () => {
    const vendor = suppliers.find(s => s.id === formData.vendorId);
    onCreate({
      ...formData,
      vendorName: vendor?.name || '',
      vendorAddress: vendor?.address || '',
      vendorGST: vendor?.gst || '',
      totalAmount,
      subtotal: totalAmount,
      gstAmount: totalAmount * 0.18
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div>
            <h2 className="text-xl font-bold text-white">Create {documentType?.name}</h2>
            <p className="text-sm text-zinc-400">Fill in the details below</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)]">
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Department / Vendor Selection */}
            {documentType?.id === 'purchase-requisition' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Department *</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Select Department</option>
                    <option value="Production">Production</option>
                    <option value="Tooling">Tooling</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Quality">Quality</option>
                    <option value="R&D">R&D</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Vendor *</label>
                  <select
                    value={formData.vendorId}
                    onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Select Vendor</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Expected Delivery</label>
                  <input
                    type="date"
                    value={typeof formData['expectedDelivery'] === 'string' ? formData['expectedDelivery'] : ''}
                    onChange={(e) => setFormData({ ...formData, expectedDelivery: e.target.value })}
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </>
            )}
          </div>

          {/* Add Items */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-zinc-300 mb-3">Add Items</h3>
            <div className="flex gap-3">
              <select
                value={selectedMaterial}
                onChange={(e) => {
                  setSelectedMaterial(e.target.value);
                  const mat = materials.find(m => m.id === e.target.value);
                  if (mat) setUnitPrice(mat.purchase_price?.toString() || '');
                }}
                className="flex-1 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="">Select Material</option>
                {materials.map(m => (
                  <option key={m.id} value={m.id}>{m.code} - {m.name}</option>
                ))}
              </select>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Qty"
                className="w-24 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
              />
              <input
                type="number"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                placeholder="Price"
                className="w-28 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
              />
              <button
                onClick={addItem}
                disabled={!selectedMaterial || !quantity}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg font-medium transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Items Table */}
          {formData.items.length > 0 && (
            <div className="bg-zinc-800/50 rounded-xl overflow-hidden mb-6">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-700">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase">Material</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-zinc-500 uppercase">Qty</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-zinc-500 uppercase">Unit Price</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-zinc-500 uppercase">Total</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item: FormItem, index: number) => (
                    <tr key={index} className="border-b border-zinc-700/50">
                      <td className="py-3 px-4">
                        <span className="text-white text-sm">{item.materialName}</span>
                        <span className="text-zinc-500 text-xs ml-2">({item.materialCode})</span>
                      </td>
                      <td className="py-3 px-4 text-right text-zinc-300">{item.quantity} {item.unit}</td>
                      <td className="py-3 px-4 text-right text-zinc-300">₹{item.unitPrice.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-emerald-400 font-medium">₹{item.totalPrice.toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => removeItem(index)}
                          className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-zinc-900/50">
                    <td colSpan={3} className="py-3 px-4 text-right text-zinc-400 font-medium">Total Amount:</td>
                    <td className="py-3 px-4 text-right text-emerald-400 font-bold text-lg">₹{totalAmount.toLocaleString()}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Remarks */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Remarks / Notes</label>
            <textarea
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none resize-none"
              placeholder="Add any additional notes..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800 bg-zinc-900/50">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={formData.items.length === 0}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg font-medium transition-colors"
          >
            Create {documentType?.code}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ==========================================
// VIEW DOCUMENT MODAL
// ==========================================

interface ViewDocumentModalProps {
  document: BaseDocument;
  documentType: DocumentType | undefined;
  onClose: () => void;
}

function ViewDocumentModal({ document: doc, documentType, onClose }: ViewDocumentModalProps) {
  const statusConfig = STATUS_CONFIG[doc.status as DocumentStatus] || STATUS_CONFIG.draft;
  const StatusIcon = statusConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{doc.docNumber}</h2>
              <p className="text-sm text-zinc-400">{documentType?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${statusConfig.bg} ${statusConfig.color}`}>
              <StatusIcon className="w-4 h-4" />
              {doc.status ? doc.status.charAt(0).toUpperCase() + doc.status.slice(1) : 'Unknown'}
            </span>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)]">
          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-zinc-800/50 rounded-xl p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Created</p>
              <p className="text-white">
                {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : '-'}
              </p>
            </div>
            <div className="bg-zinc-800/50 rounded-xl p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Created By</p>
              <p className="text-white">{doc.createdBy || '-'}</p>
            </div>
            {doc.vendorName && (
              <div className="bg-zinc-800/50 rounded-xl p-4">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Vendor</p>
                <p className="text-white">{doc.vendorName}</p>
              </div>
            )}
            {doc.department && (
              <div className="bg-zinc-800/50 rounded-xl p-4">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Department</p>
                <p className="text-white">{doc.department}</p>
              </div>
            )}
            {doc.totalAmount && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                <p className="text-xs text-emerald-400 uppercase tracking-wider mb-1">Total Amount</p>
                <p className="text-emerald-400 text-xl font-bold">₹{doc.totalAmount.toLocaleString()}</p>
              </div>
            )}
          </div>

          {/* Items */}
          {Array.isArray(doc['items']) && (doc['items'] as FormItem[]).length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-zinc-300 mb-3">Items ({(doc['items'] as FormItem[]).length})</h3>
              <div className="bg-zinc-800/50 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-700">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase">Material</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-zinc-500 uppercase">Qty</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-zinc-500 uppercase">Price</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-zinc-500 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(doc['items'] as FormItem[]).map((item: FormItem, index: number) => (
                      <tr key={index} className="border-b border-zinc-700/50">
                        <td className="py-3 px-4">
                          <span className="text-white text-sm">{item.materialName}</span>
                          {item.materialCode && (
                            <span className="text-zinc-500 text-xs ml-2">({item.materialCode})</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right text-zinc-300">{item.quantity} {item.unit}</td>
                        <td className="py-3 px-4 text-right text-zinc-300">₹{(item.unitPrice || 0).toLocaleString()}</td>
                        <td className="py-3 px-4 text-right text-emerald-400 font-medium">₹{(item.totalPrice || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Remarks */}
          {doc.remarks && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-300 mb-2">Remarks</h3>
              <p className="text-zinc-400 bg-zinc-800/50 rounded-xl p-4">{doc.remarks}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button className="flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
