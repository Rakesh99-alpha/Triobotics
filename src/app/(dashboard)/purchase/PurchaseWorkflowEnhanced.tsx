'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, ClipboardList, Truck, Warehouse, CreditCard, Shield,
  ChevronRight, Plus, Search, Download, Eye, Trash2,
  CheckCircle, Clock, XCircle, Send, RefreshCw, Printer, X,
  Calendar, Filter, Link2, History,
  BarChart3, TrendingUp, Bell,
  ExternalLink, ArrowUpRight, ArrowDownRight, Package,
  IndianRupee, Star, MessageSquare, Share2,
  Layers, Workflow, Calculator, Factory
} from 'lucide-react';
import { db } from '@/lib/firebase/client';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc,
  query, orderBy, writeBatch
} from 'firebase/firestore';
import { toast } from '@/lib/toast';
import { manufacturingService } from '@/lib/services/manufacturing-service';
import type { EngineeringBOM, ManufacturingBOM, MRPRun, ProductionOrder, eBOMItem } from '@/types/manufacturing';

// ==========================================
// TYPES & INTERFACES
// ==========================================

type DocumentStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled' | 'partial';

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
  vendorId?: string;
  totalAmount?: number;
  linkedDocs?: { type: string; id: string; number: string }[];
  attachments?: { name: string; url: string; type: string; uploadedAt: string }[];
  history?: { action: string; by: string; at: string; details?: string }[];
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  expectedDate?: string;
  approvedBy?: string;
  approvedAt?: string;
  [key: string]: unknown;
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
  category?: string;
  [key: string]: unknown;
}

interface Supplier {
  id: string;
  name: string;
  gst?: string;
  contact?: string;
  address?: string;
  email?: string;
  rating?: number;
  [key: string]: unknown;
}

interface FormItem {
  materialId: string;
  materialCode: string;
  materialName: string;
  quantity: number;
  receivedQty?: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  gstPercent?: number;
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
    gradient: 'from-blue-500 to-blue-600',
    documents: [
      { id: 'production-plan', name: 'Production Plan', code: 'PP' },
      { id: 'ebom', name: 'Engineering BOM (eBOM)', code: 'eBOM', primary: true },
      { id: 'mbom', name: 'Manufacturing BOM (mBOM)', code: 'mBOM', primary: true },
      { id: 'mrp', name: 'Material Requirement Planning', code: 'MRP', primary: true },
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
    gradient: 'from-purple-500 to-purple-600',
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
    gradient: 'from-orange-500 to-orange-600',
    documents: [
      { id: 'asi', name: 'Advance Shipment Intimation', code: 'ASI' },
      { id: 'eway-bill', name: 'Transport LR / E-Way Bill', code: 'EWB' },
      { id: 'delivery-challan', name: 'Delivery Challan (DC)', code: 'DC' },
      { id: 'gate-entry', name: 'Gate Entry / Inward Register', code: 'GE', primary: true },
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
    gradient: 'from-green-500 to-green-600',
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
    gradient: 'from-cyan-500 to-cyan-600',
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
    gradient: 'from-red-500 to-red-600',
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
const COLLECTIONS_MAP: Record<string, string> = {
  'purchase-requisition': 'purchase_requisitions',
  'rfq': 'purchase_rfqs',
  'vendor-quote': 'purchase_quotations',
  'comparative': 'purchase_comparative_statements',
  'purchase-order': 'purchase_orders',
  'grn': 'purchase_grns',
  'gate-entry': 'purchase_gate_entries',
  'vendor-invoice': 'purchase_invoices',
  'material-issue': 'material_issues',
  'payment-voucher': 'payment_vouchers',
  'delivery-challan': 'purchase_challans',
  'debit-note': 'purchase_debit_notes',
  'credit-note': 'purchase_credit_notes',
  'ebom': 'engineering_boms',
  'mbom': 'manufacturing_boms',
  'mrp': 'mrp_runs',
  'production-order': 'production_orders',
};

// Status colors
const STATUS_CONFIG: Record<DocumentStatus, { color: string; bg: string; icon: React.ElementType; label: string }> = {
  draft: { color: 'text-zinc-400', bg: 'bg-zinc-500/20', icon: FileText, label: 'Draft' },
  pending: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', icon: Clock, label: 'Pending' },
  approved: { color: 'text-green-400', bg: 'bg-green-500/20', icon: CheckCircle, label: 'Approved' },
  rejected: { color: 'text-red-400', bg: 'bg-red-500/20', icon: XCircle, label: 'Rejected' },
  completed: { color: 'text-blue-400', bg: 'bg-blue-500/20', icon: CheckCircle, label: 'Completed' },
  cancelled: { color: 'text-zinc-500', bg: 'bg-zinc-600/20', icon: XCircle, label: 'Cancelled' },
  partial: { color: 'text-orange-400', bg: 'bg-orange-500/20', icon: Clock, label: 'Partial' },
};

const PRIORITY_CONFIG = {
  low: { color: 'text-zinc-400', bg: 'bg-zinc-500/20', dot: 'bg-zinc-500' },
  medium: { color: 'text-blue-400', bg: 'bg-blue-500/20', dot: 'bg-blue-500' },
  high: { color: 'text-orange-400', bg: 'bg-orange-500/20', dot: 'bg-orange-500' },
  urgent: { color: 'text-red-400', bg: 'bg-red-500/20', dot: 'bg-red-500 animate-pulse' },
};

// ==========================================
// HELPER COMPONENTS
// ==========================================

// Priority Badge
const PriorityBadge = ({ priority }: { priority: string }) => {
  const config = PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.medium;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs ${config.bg} ${config.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  );
};

// Stat Card
const StatCard = ({ title, value, icon: Icon, color, trend, subtitle }: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  trend?: { value: number; positive: boolean };
  subtitle?: string;
}) => {
  const colors: Record<string, { bg: string; text: string; iconBg: string }> = {
    blue: { bg: 'from-blue-500/10 to-blue-600/5', text: 'text-blue-400', iconBg: 'bg-blue-500/20' },
    green: { bg: 'from-green-500/10 to-green-600/5', text: 'text-green-400', iconBg: 'bg-green-500/20' },
    orange: { bg: 'from-orange-500/10 to-orange-600/5', text: 'text-orange-400', iconBg: 'bg-orange-500/20' },
    purple: { bg: 'from-purple-500/10 to-purple-600/5', text: 'text-purple-400', iconBg: 'bg-purple-500/20' },
    cyan: { bg: 'from-cyan-500/10 to-cyan-600/5', text: 'text-cyan-400', iconBg: 'bg-cyan-500/20' },
    red: { bg: 'from-red-500/10 to-red-600/5', text: 'text-red-400', iconBg: 'bg-red-500/20' },
    yellow: { bg: 'from-yellow-500/10 to-yellow-600/5', text: 'text-yellow-400', iconBg: 'bg-yellow-500/20' },
  };
  const c = colors[color] || colors.blue;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br ${c.bg} border border-white/5 rounded-2xl p-4 relative overflow-hidden`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-zinc-500 text-sm">{title}</p>
          <p className={`text-2xl font-bold mt-1 ${c.text}`}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {subtitle && <p className="text-zinc-500 text-xs mt-1">{subtitle}</p>}
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-xs ${trend.positive ? 'text-green-400' : 'text-red-400'}`}>
              {trend.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {trend.value}% vs last month
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${c.iconBg}`}>
          <Icon className={`w-5 h-5 ${c.text}`} />
        </div>
      </div>
    </motion.div>
  );
};

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function PurchaseWorkflowEnhanced() {
  // State
  const [activePhase, setActivePhase] = useState('pre-purchase');
  const [activeDocument, setActiveDocument] = useState('purchase-requisition');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<{ from: string; to: string }>({ from: '', to: '' });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<BaseDocument | null>(null);
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'timeline'>('table');

  // Data state
  const [documents, setDocuments] = useState<BaseDocument[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [eBOMs, setEBOMs] = useState<EngineeringBOM[]>([]);
  const [mBOMs, setMBOMs] = useState<ManufacturingBOM[]>([]);
  const [mrpRuns, setMRPRuns] = useState<MRPRun[]>([]);
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>([]);
  
  // Expose manufacturing state for future use
  void eBOMs; void mBOMs; void mrpRuns; void productionOrders;
  
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    thisMonth: 0,
    totalValue: 0,
    avgProcessingTime: 0,
  });

  // Get current phase and document info
  const currentPhase = PURCHASE_PHASES.find(p => p.id === activePhase);
  const currentDocument = currentPhase?.documents.find(d => d.id === activeDocument);

  // Get current user
  const getCurrentUser = useCallback(() => {
    if (typeof window === 'undefined') return { name: 'System', role: 'admin' };
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return { name: 'System', role: 'admin' };
      }
    }
    return { name: 'System', role: 'admin' };
  }, []);

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

    // Subscribe to manufacturing data
    const unsubEBOMs = manufacturingService.eBOM.subscribe(setEBOMs);
    const unsubMBOMs = manufacturingService.mBOM.subscribe(setMBOMs);
    const unsubMRP = manufacturingService.mrp.subscribe(setMRPRuns);
    const unsubProdOrders = manufacturingService.productionOrder.subscribe(setProductionOrders);

    return () => {
      unsubMaterials();
      unsubSuppliers();
      unsubEBOMs();
      unsubMBOMs();
      unsubMRP();
      unsubProdOrders();
    };
  }, []);

  // Fetch documents based on active document type
  useEffect(() => {
    const collectionName = COLLECTIONS_MAP[activeDocument];
    if (!collectionName) {
      setTimeout(() => {
        setDocuments([]);
        setLoading(false);
      }, 0);
      return;
    }

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
          totalValue: docs.reduce((sum, d) => sum + (d.totalAmount || 0), 0),
          avgProcessingTime: 2.5, // Placeholder - would calculate from actual data
        });
        
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching documents:', error);
        toast.error('Failed to load documents');
        setLoading(false);
      }
    );

    return () => unsubDocs();
  }, [activeDocument]);

  // Filter documents
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const matchesSearch = 
        doc.docNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.vendorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.createdBy?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
      
      const matchesDate = (!dateFilter.from || new Date(doc.createdAt || '') >= new Date(dateFilter.from)) &&
                         (!dateFilter.to || new Date(doc.createdAt || '') <= new Date(dateFilter.to));
      
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [documents, searchTerm, statusFilter, dateFilter]);

  // Generate document number
  const generateDocNumber = useCallback((code: string) => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${code}-${year}${month}-${random}`;
  }, []);

  // ==========================================
  // DOCUMENT OPERATIONS
  // ==========================================

  // Create new document
  const handleCreateDocument = async (data: Record<string, unknown>) => {
    const collectionName = COLLECTIONS_MAP[activeDocument];
    if (!collectionName) return;

    const user = getCurrentUser();

    try {
      // Handle manufacturing document types
      if (data.type === 'ebom') {
        await manufacturingService.eBOM.create({
          projectId: data.projectId as string,
          projectName: data.projectName as string,
          status: 'draft',
          items: (data.items as eBOMItem[]) || [],
          totalMaterialCost: 0,
          totalWastageCost: 0,
          contingencyPercent: data.overheadPercent as number || 10,
          contingencyAmount: 0,
          grandTotalCost: 0,
          designedBy: user.id || 'system',
          designedByName: user.name || 'System',
          designDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        toast.success('eBOM created successfully!');
        setShowCreateModal(false);
        return;
      }

      if (data.type === 'mbom') {
        await manufacturingService.eBOM.convertToMBOM(data.sourceEBOMId as string);
        toast.success('mBOM created from eBOM successfully!');
        setShowCreateModal(false);
        return;
      }

      if (data.type === 'mrp') {
        await manufacturingService.mrp.runMRP(
          data.sourceMBOMId as string,
          {
            planningHorizonDays: 30,
            autoGeneratePR: true
          }
        );
        toast.success('MRP calculation completed!');
        setShowCreateModal(false);
        return;
      }

      if (data.type === 'production-order') {
        await manufacturingService.productionOrder.createFromMBOM(
          data.sourceMBOMId as string,
          {
            orderQty: data.quantity as number,
            plannedStartDate: data.scheduledStart as string
          }
        );
        toast.success('Production Order created successfully!');
        setShowCreateModal(false);
        return;
      }

      // Standard document creation
      const docData = {
        ...data,
        docNumber: generateDocNumber(currentDocument?.code || 'DOC'),
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user.name || 'System',
        history: [{
          action: 'Created',
          by: user.name || 'System',
          at: new Date().toISOString(),
        }]
      };

      await addDoc(collection(db, collectionName), docData);
      toast.success(`${currentDocument?.name} created successfully!`);
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating document:', error);
      toast.error('Failed to create document');
    }
  };

  // Update document status
  const handleUpdateStatus = async (docId: string, newStatus: DocumentStatus) => {
    const collectionName = COLLECTIONS_MAP[activeDocument];
    if (!collectionName) return;

    const user = getCurrentUser();

    try {
      const docRef = doc(db, collectionName, docId);
      const updates: Record<string, unknown> = {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      };

      if (newStatus === 'approved') {
        updates.approvedBy = user.name;
        updates.approvedAt = new Date().toISOString();
      }

      await updateDoc(docRef, updates);
      toast.success(`Status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating document:', error);
      toast.error('Failed to update status');
    }
  };

  // Delete document
  const handleDeleteDocument = async (docId: string) => {
    const collectionName = COLLECTIONS_MAP[activeDocument];
    if (!collectionName) return;

    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await deleteDoc(doc(db, collectionName, docId));
      toast.success('Document deleted successfully');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  // Bulk actions
  const handleBulkAction = async (action: 'approve' | 'reject' | 'delete' | 'export') => {
    if (selectedRecords.length === 0) {
      toast.error('No records selected');
      return;
    }

    const collectionName = COLLECTIONS_MAP[activeDocument];
    if (!collectionName && action !== 'export') return;

    try {
      if (action === 'export') {
        // Export to CSV
        const selectedDocs = documents.filter(d => selectedRecords.includes(d.id));
        const csv = convertToCSV(selectedDocs);
        downloadCSV(csv, `${currentDocument?.code}_export.csv`);
        toast.success(`Exported ${selectedRecords.length} records`);
      } else if (action === 'delete') {
        if (!confirm(`Delete ${selectedRecords.length} records?`)) return;
        const batch = writeBatch(db);
        selectedRecords.forEach(id => {
          batch.delete(doc(db, collectionName, id));
        });
        await batch.commit();
        toast.success(`Deleted ${selectedRecords.length} records`);
      } else {
        const newStatus = action === 'approve' ? 'approved' : 'rejected';
        const batch = writeBatch(db);
        selectedRecords.forEach(id => {
          batch.update(doc(db, collectionName, id), { 
            status: newStatus,
            updatedAt: new Date().toISOString()
          });
        });
        await batch.commit();
        toast.success(`${action === 'approve' ? 'Approved' : 'Rejected'} ${selectedRecords.length} records`);
      }
      setSelectedRecords([]);
    } catch (error) {
      console.error('Error performing bulk action:', error);
      toast.error('Failed to perform action');
    }
  };

  // Export helpers
  const convertToCSV = (data: BaseDocument[]) => {
    const headers = ['Doc Number', 'Date', 'Vendor/Department', 'Amount', 'Status', 'Created By'];
    const rows = data.map(d => [
      d.docNumber || '',
      d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '',
      d.vendorName || d.department || '',
      d.totalAmount?.toString() || '',
      d.status || '',
      d.createdBy || ''
    ]);
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Print document
  const handlePrint = (doc: BaseDocument) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(generatePrintHTML(doc));
      printWindow.document.close();
      printWindow.print();
    }
  };

  const generatePrintHTML = (doc: BaseDocument) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${doc.docNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
          .company { font-size: 28px; font-weight: bold; }
          .doc-info { text-align: right; }
          .doc-number { font-size: 24px; color: #2563eb; font-weight: bold; }
          .section { margin-bottom: 25px; }
          .section-title { font-size: 14px; color: #666; text-transform: uppercase; margin-bottom: 10px; font-weight: bold; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          .info-box { background: #f5f5f5; padding: 15px; border-radius: 8px; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #333; color: white; padding: 12px; text-align: left; }
          td { padding: 12px; border-bottom: 1px solid #ddd; }
          .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 20px; }
          .footer { margin-top: 50px; text-align: center; color: #666; font-size: 12px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="company">TRIOVISION</div>
            <div style="color: #666;">Manufacturing Excellence</div>
          </div>
          <div class="doc-info">
            <div style="color: #666;">${currentDocument?.name}</div>
            <div class="doc-number">${doc.docNumber}</div>
            <div style="color: #666; margin-top: 5px;">Date: ${doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : '-'}</div>
          </div>
        </div>
        
        <div class="info-grid">
          ${doc.vendorName ? `
            <div class="info-box">
              <div class="section-title">Vendor Details</div>
              <div style="font-weight: bold;">${doc.vendorName}</div>
            </div>
          ` : ''}
          ${doc.department ? `
            <div class="info-box">
              <div class="section-title">Department</div>
              <div style="font-weight: bold;">${doc.department}</div>
            </div>
          ` : ''}
          <div class="info-box">
            <div class="section-title">Status</div>
            <div style="font-weight: bold;">${doc.status?.toUpperCase()}</div>
          </div>
          <div class="info-box">
            <div class="section-title">Created By</div>
            <div style="font-weight: bold;">${doc.createdBy || '-'}</div>
          </div>
        </div>

        ${Array.isArray(doc.items) && doc.items.length > 0 ? `
          <div class="section" style="margin-top: 30px;">
            <div class="section-title">Items</div>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${(doc.items as FormItem[]).map((item, i) => `
                  <tr>
                    <td>${i + 1}</td>
                    <td>${item.materialName}</td>
                    <td>${item.quantity} ${item.unit}</td>
                    <td>₹${item.unitPrice?.toLocaleString()}</td>
                    <td>₹${item.totalPrice?.toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div class="total">Total Amount: ₹${doc.totalAmount?.toLocaleString()}</div>
        ` : ''}

        ${doc.remarks ? `
          <div class="section" style="margin-top: 30px;">
            <div class="section-title">Remarks</div>
            <p>${doc.remarks}</p>
          </div>
        ` : ''}

        <div class="footer">
          <p>Generated on ${new Date().toLocaleString()} | Triovision ERP System</p>
        </div>
      </body>
      </html>
    `;
  };

  // ==========================================
  // MANUFACTURING HANDLERS (eBOM, mBOM, MRP)
  // ==========================================

  // Get current user for manufacturing operations
  const currentUserInfo = getCurrentUser();

  // Create new eBOM from project
  const handleCreateEBOM = async (projectId: string, projectName: string) => {
    try {
      const ebomId = await manufacturingService.eBOM.create({
        projectId,
        projectName,
        status: 'draft' as const,
        items: [],
        totalMaterialCost: 0,
        totalWastageCost: 0,
        contingencyPercent: 10,
        contingencyAmount: 0,
        grandTotalCost: 0,
        designedBy: currentUserInfo.id || 'system',
        designedByName: currentUserInfo.name || 'System',
        designDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      toast.success('eBOM created successfully');
      return ebomId;
    } catch (error) {
      console.error('Error creating eBOM:', error);
      toast.error('Failed to create eBOM');
    }
  };

  // Add item to eBOM
  const handleAddEBOMItem = async (ebomId: string, item: Partial<eBOMItem>) => {
    try {
      await manufacturingService.eBOM.addItem(ebomId, item as eBOMItem);
      toast.success('Item added to eBOM');
    } catch (error) {
      console.error('Error adding eBOM item:', error);
      toast.error('Failed to add item');
    }
  };

  // Convert eBOM to mBOM
  const handleConvertToMBOM = async (ebomId: string) => {
    try {
      const mbomId = await manufacturingService.eBOM.convertToMBOM(ebomId);
      toast.success('Successfully converted eBOM to mBOM');
      return mbomId;
    } catch (error) {
      console.error('Error converting to mBOM:', error);
      toast.error('Failed to convert to mBOM');
    }
  };

  // Run MRP calculation
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleRunMRP = async (mbomId: string, _requiredDate: string) => {
    try {
      const mrpRunId = await manufacturingService.mrp.runMRP(mbomId, {
        planningHorizonDays: 30,
        autoGeneratePR: true
      });
      toast.success('MRP calculation completed');
      return mrpRunId;
    } catch (error) {
      console.error('Error running MRP:', error);
      toast.error('Failed to run MRP');
    }
  };

  // Generate PR from MRP
  const handleGeneratePRFromMRP = async (mrpRunId: string) => {
    try {
      const prId = await manufacturingService.mrp.generatePR(mrpRunId);
      toast.success('Purchase Requisition generated from MRP');
      return prId;
    } catch (error) {
      console.error('Error generating PR from MRP:', error);
      toast.error('Failed to generate PR');
    }
  };

  // Create Production Order from mBOM
  const handleCreateProductionOrder = async (mbomId: string, quantity: number, scheduledStart: string) => {
    try {
      const poId = await manufacturingService.productionOrder.createFromMBOM(
        mbomId, 
        {
          orderQty: quantity,
          plannedStartDate: scheduledStart
        }
      );
      toast.success('Production Order created');
      return poId;
    } catch (error) {
      console.error('Error creating Production Order:', error);
      toast.error('Failed to create Production Order');
    }
  };

  // Release Production Order
  const handleReleaseProductionOrder = async (productionOrderId: string) => {
    try {
      await manufacturingService.productionOrder.release(productionOrderId);
      toast.success('Production Order released');
    } catch (error) {
      console.error('Error releasing Production Order:', error);
      toast.error('Failed to release Production Order');
    }
  };

  // Issue material to Production Order
  const handleIssueMaterial = async (
    productionOrderId: string, 
    materialId: string, 
    issuedQty: number
  ) => {
    try {
      await manufacturingService.productionOrder.issueMaterial(
        productionOrderId,
        materialId,
        issuedQty,
        currentUserInfo.name || 'System'
      );
      toast.success('Material issued successfully');
    } catch (error) {
      console.error('Error issuing material:', error);
      toast.error('Failed to issue material');
    }
  };

  // Handle Over-BOM request
  const handleOverBOMRequest = async (
    productionOrderId: string,
    materialId: string,
    _plannedQty: number,
    requestedQty: number,
    reason: string
  ) => {
    try {
      const requestId = await manufacturingService.overBOM.createRequest({
        productionOrderId,
        materialId,
        additionalQty: requestedQty,
        reason,
        reasonCategory: 'wastage',
        justification: reason
      });
      toast.success('Over-BOM request submitted for approval');
      return requestId;
    } catch (error) {
      console.error('Error creating Over-BOM request:', error);
      toast.error('Failed to submit Over-BOM request');
    }
  };

  // Approve/Reject variance
  const handleVarianceDecision = async (
    varianceId: string, 
    decision: 'approved' | 'rejected',
    comments: string
  ) => {
    try {
      await manufacturingService.variance.resolveVariance(
        varianceId,
        decision,
        comments
      );
      toast.success(`Variance ${decision}`);
    } catch (error) {
      console.error('Error resolving variance:', error);
      toast.error('Failed to resolve variance');
    }
  };

  // Get manufacturing document display info - exports for use in rendering
  void handleCreateEBOM;
  void handleAddEBOMItem;
  void handleConvertToMBOM;
  void handleRunMRP;
  void handleGeneratePRFromMRP;
  void handleCreateProductionOrder;
  void handleReleaseProductionOrder;
  void handleIssueMaterial;
  void handleOverBOMRequest;
  void handleVarianceDecision;

  const getManufacturingDocIcon = (type: string) => {
    switch (type) {
      case 'ebom': return <Layers className="w-4 h-4" />;
      case 'mbom': return <Workflow className="w-4 h-4" />;
      case 'mrp': return <Calculator className="w-4 h-4" />;
      case 'production-order': return <Factory className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };
  void getManufacturingDocIcon;

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="min-h-screen bg-[#020202] text-white">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />
      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="relative p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Purchase Management</h1>
            <p className="text-zinc-400">Complete procurement workflow from requisition to payment</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800/50 border border-zinc-700 rounded-xl text-zinc-300 hover:bg-zinc-800 transition-colors">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Notifications</span>
              {stats.pending > 0 && (
                <span className="w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">{stats.pending}</span>
              )}
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800/50 border border-zinc-700 rounded-xl text-zinc-300 hover:bg-zinc-800 transition-colors">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Analytics</span>
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <StatCard title="Total Documents" value={stats.total} icon={FileText} color="blue" />
          <StatCard title="Pending Approval" value={stats.pending} icon={Clock} color="yellow" />
          <StatCard title="Approved" value={stats.approved} icon={CheckCircle} color="green" />
          <StatCard title="This Month" value={stats.thisMonth} icon={Calendar} color="purple" />
          <StatCard 
            title="Total Value" 
            value={`₹${(stats.totalValue / 100000).toFixed(1)}L`} 
            icon={IndianRupee} 
            color="cyan"
            subtitle="All documents"
          />
          <StatCard 
            title="Avg. Processing" 
            value={`${stats.avgProcessingTime}d`} 
            icon={TrendingUp} 
            color="orange"
            subtitle="Approval time"
          />
        </div>

        {/* Phase Navigation */}
        <div className="mb-6 overflow-x-auto pb-2">
          <div className="flex gap-2 min-w-max">
            {PURCHASE_PHASES.map((phase, index) => {
              const Icon = phase.icon;
              const isActive = activePhase === phase.id;
              
              return (
                <React.Fragment key={phase.id}>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setActivePhase(phase.id);
                      const primaryDoc = phase.documents.find(d => d.primary) || phase.documents[0];
                      setActiveDocument(primaryDoc.id);
                      setSelectedRecords([]);
                    }}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-all ${
                      isActive
                        ? `bg-gradient-to-r ${phase.gradient} text-white shadow-lg`
                        : 'bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800/50 border border-zinc-800'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium whitespace-nowrap">{phase.name}</span>
                  </motion.button>
                  {index < PURCHASE_PHASES.length - 1 && (
                    <div className="flex items-center text-zinc-700">
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
          <div className="col-span-12 lg:col-span-3">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 sticky top-6">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {currentPhase?.name} Documents
              </h3>
              <div className="space-y-1">
                {currentPhase?.documents.map(docType => {
                  const isActive = activeDocument === docType.id;
                  const hasCollection = COLLECTIONS_MAP[docType.id];
                  return (
                    <button
                      key={docType.id}
                      onClick={() => {
                        setActiveDocument(docType.id);
                        setSelectedRecords([]);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-left group ${
                        isActive
                          ? `bg-gradient-to-r ${currentPhase?.gradient} text-white`
                          : hasCollection
                            ? 'text-zinc-300 hover:bg-zinc-800/50'
                            : 'text-zinc-500 hover:bg-zinc-800/30'
                      }`}
                    >
                      <span className="text-sm">{docType.name}</span>
                      <div className="flex items-center gap-2">
                        {docType.primary && (
                          <Star className={`w-3 h-3 ${isActive ? 'text-yellow-300' : 'text-yellow-500/50'}`} />
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-lg ${
                          isActive 
                            ? 'bg-white/20 text-white' 
                            : 'bg-zinc-800 text-zinc-500 group-hover:bg-zinc-700'
                        }`}>
                          {docType.code}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Quick Stats */}
              <div className="mt-6 pt-4 border-t border-zinc-800">
                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                  Document Stats
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-500">Total</span>
                    <span className="text-white font-semibold">{stats.total}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-500">Pending</span>
                    <span className="text-yellow-400 font-semibold">{stats.pending}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-500">Approved</span>
                    <span className="text-green-400 font-semibold">{stats.approved}</span>
                  </div>
                  {stats.totalValue > 0 && (
                    <div className="flex justify-between items-center text-sm pt-2 border-t border-zinc-800">
                      <span className="text-zinc-500">Value</span>
                      <span className="text-emerald-400 font-semibold">₹{stats.totalValue.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mt-6 pt-4 border-t border-zinc-800">
                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                  Quick Actions
                </h3>
                <div className="space-y-2">
                  <button 
                    onClick={() => setShowCreateModal(true)}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 bg-gradient-to-r ${currentPhase?.gradient} text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity`}
                  >
                    <Plus className="w-4 h-4" />
                    New {currentDocument?.code}
                  </button>
                  <button 
                    onClick={() => handleBulkAction('export')}
                    className="w-full flex items-center gap-2 px-3 py-2.5 bg-zinc-800 text-zinc-300 rounded-xl text-sm hover:bg-zinc-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Export All
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Document List */}
          <div className="col-span-12 lg:col-span-9">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                {/* Search */}
                <div className="relative flex-1 sm:flex-none">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={`Search ${currentDocument?.name}...`}
                    className="w-full sm:w-64 pl-10 pr-4 py-2.5 bg-zinc-900/50 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as DocumentStatus | 'all')}
                  className="px-3 py-2.5 bg-zinc-900/50 border border-zinc-800 rounded-xl text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="completed">Completed</option>
                </select>

                {/* Filter Toggle */}
                <button
                  onClick={() => setShowFilterPanel(!showFilterPanel)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-colors ${
                    showFilterPanel 
                      ? 'bg-blue-500/20 border-blue-500/30 text-blue-400' 
                      : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  <span className="hidden sm:inline">Filters</span>
                </button>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {/* View Mode Toggle */}
                <div className="flex items-center bg-zinc-900/50 border border-zinc-800 rounded-xl p-1">
                  {(['table', 'cards'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        viewMode === mode
                          ? 'bg-zinc-700 text-white'
                          : 'text-zinc-500 hover:text-white'
                      }`}
                    >
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Refresh */}
                <button className="p-2.5 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
                  <RefreshCw className="w-4 h-4" />
                </button>

                {/* Create Button */}
                <button
                  onClick={() => setShowCreateModal(true)}
                  className={`flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r ${currentPhase?.gradient} text-white rounded-xl font-medium transition-all hover:opacity-90 hover:shadow-lg`}
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">New {currentDocument?.code}</span>
                </button>
              </div>
            </div>

            {/* Advanced Filters Panel */}
            <AnimatePresence>
              {showFilterPanel && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 overflow-hidden"
                >
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="text-xs text-zinc-500 mb-1 block">From Date</label>
                        <input
                          type="date"
                          value={dateFilter.from}
                          onChange={(e) => setDateFilter(prev => ({ ...prev, from: e.target.value }))}
                          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-zinc-500 mb-1 block">To Date</label>
                        <input
                          type="date"
                          value={dateFilter.to}
                          onChange={(e) => setDateFilter(prev => ({ ...prev, to: e.target.value }))}
                          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
                        />
                      </div>
                      <div className="col-span-2 flex items-end gap-2">
                        <button
                          onClick={() => setDateFilter({ from: '', to: '' })}
                          className="px-4 py-2 bg-zinc-800 text-zinc-400 rounded-lg text-sm hover:bg-zinc-700"
                        >
                          Clear Filters
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bulk Actions Bar */}
            <AnimatePresence>
              {selectedRecords.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-4 bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 flex items-center justify-between"
                >
                  <span className="text-blue-400 text-sm font-medium">
                    {selectedRecords.length} item{selectedRecords.length > 1 ? 's' : ''} selected
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleBulkAction('approve')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-sm hover:bg-green-500/30 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve All
                    </button>
                    <button
                      onClick={() => handleBulkAction('reject')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject All
                    </button>
                    <button
                      onClick={() => handleBulkAction('export')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-700 text-zinc-300 rounded-lg text-sm hover:bg-zinc-600 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Export
                    </button>
                    <button
                      onClick={() => handleBulkAction('delete')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                    <button
                      onClick={() => setSelectedRecords([])}
                      className="p-1.5 text-zinc-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Document Table/Cards */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full" />
                    <p className="text-zinc-500 text-sm">Loading documents...</p>
                  </div>
                </div>
              ) : !COLLECTIONS_MAP[activeDocument] ? (
                <div className="text-center py-20">
                  <Package className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-zinc-400 mb-2">Coming Soon</h3>
                  <p className="text-zinc-500 text-sm mb-4">
                    {currentDocument?.name} module is under development
                  </p>
                </div>
              ) : filteredDocuments.length === 0 ? (
                <div className="text-center py-20">
                  <FileText className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-zinc-400 mb-2">No {currentDocument?.name} Found</h3>
                  <p className="text-zinc-500 text-sm mb-4">Create your first {currentDocument?.code} to get started</p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className={`inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r ${currentPhase?.gradient} text-white rounded-xl font-medium transition-all hover:opacity-90`}
                  >
                    <Plus className="w-5 h-5" />
                    Create {currentDocument?.code}
                  </button>
                </div>
              ) : viewMode === 'table' ? (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-900/50">
                      <th className="py-4 px-4 text-left">
                        <input
                          type="checkbox"
                          checked={selectedRecords.length === filteredDocuments.length && filteredDocuments.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRecords(filteredDocuments.map(d => d.id));
                            } else {
                              setSelectedRecords([]);
                            }
                          }}
                          className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-blue-500 focus:ring-blue-500/50"
                        />
                      </th>
                      <th className="text-left py-4 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Doc No.</th>
                      <th className="text-left py-4 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Date</th>
                      <th className="text-left py-4 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Details</th>
                      <th className="text-left py-4 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Amount</th>
                      <th className="text-left py-4 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Priority</th>
                      <th className="text-left py-4 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                      <th className="text-right py-4 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocuments.map((doc, index) => {
                      const statusConfig = STATUS_CONFIG[doc.status as DocumentStatus] || STATUS_CONFIG.draft;
                      const StatusIcon = statusConfig.icon;
                      const isSelected = selectedRecords.includes(doc.id);
                      
                      return (
                        <motion.tr
                          key={doc.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className={`border-b border-zinc-800/50 transition-colors ${
                            isSelected ? 'bg-blue-500/10' : 'hover:bg-zinc-800/30'
                          }`}
                        >
                          <td className="py-4 px-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedRecords([...selectedRecords, doc.id]);
                                } else {
                                  setSelectedRecords(selectedRecords.filter(id => id !== doc.id));
                                }
                              }}
                              className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-blue-500 focus:ring-blue-500/50"
                            />
                          </td>
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
                              <p className="text-zinc-500 text-xs">{Array.isArray(doc.items) ? doc.items.length : 0} items • By {doc.createdBy || '-'}</p>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-emerald-400 font-medium">
                              {doc.totalAmount ? `₹${doc.totalAmount.toLocaleString()}` : '-'}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            {doc.priority ? (
                              <PriorityBadge priority={doc.priority} />
                            ) : (
                              <span className="text-zinc-500 text-sm">-</span>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                              <StatusIcon className="w-3 h-3" />
                              {statusConfig.label}
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
                              <button
                                onClick={() => handlePrint(doc)}
                                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"
                                title="Print"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                              {doc.status === 'draft' && (
                                <button
                                  onClick={() => handleUpdateStatus(doc.id, 'pending')}
                                  className="p-2 text-zinc-400 hover:text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                                  title="Submit for Approval"
                                >
                                  <Send className="w-4 h-4" />
                                </button>
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
                                onClick={() => handleDeleteDocument(doc.id)}
                                className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                /* Card View */
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredDocuments.map((doc, index) => {
                    const statusConfig = STATUS_CONFIG[doc.status as DocumentStatus] || STATUS_CONFIG.draft;
                    const StatusIcon = statusConfig.icon;
                    const isSelected = selectedRecords.includes(doc.id);
                    
                    return (
                      <motion.div
                        key={doc.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`bg-zinc-800/50 border rounded-xl p-4 hover:border-zinc-600 transition-all cursor-pointer ${
                          isSelected ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-700'
                        }`}
                        onClick={() => {
                          setSelectedRecord(doc);
                          setShowViewModal(true);
                        }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                e.stopPropagation();
                                if (e.target.checked) {
                                  setSelectedRecords([...selectedRecords, doc.id]);
                                } else {
                                  setSelectedRecords(selectedRecords.filter(id => id !== doc.id));
                                }
                              }}
                              className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-blue-500"
                            />
                            <span className="font-mono text-sm text-white font-medium">{doc.docNumber}</span>
                          </div>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusConfig.label}
                          </span>
                        </div>
                        
                        <div className="space-y-2">
                          <p className="text-white text-sm font-medium">{doc.vendorName || doc.department || '-'}</p>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-zinc-500">
                              {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : '-'}
                            </span>
                            <span className="text-emerald-400 font-semibold">
                              {doc.totalAmount ? `₹${doc.totalAmount.toLocaleString()}` : '-'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-500 text-xs">{Array.isArray(doc.items) ? doc.items.length : 0} items</span>
                            {doc.priority && <PriorityBadge priority={doc.priority} />}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-zinc-700">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrint(doc);
                            }}
                            className="flex-1 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"
                          >
                            <Printer className="w-4 h-4 mx-auto" />
                          </button>
                          {doc.status === 'pending' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateStatus(doc.id, 'approved');
                              }}
                              className="flex-1 py-2 text-sm text-green-400 hover:bg-green-500/20 rounded-lg transition-colors"
                            >
                              <CheckCircle className="w-4 h-4 mx-auto" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDocument(doc.id);
                            }}
                            className="flex-1 py-2 text-sm text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4 mx-auto" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pagination */}
            {filteredDocuments.length > 0 && (
              <div className="flex items-center justify-between mt-4 text-sm text-zinc-500">
                <span>Showing {filteredDocuments.length} of {documents.length} documents</span>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1.5 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors disabled:opacity-50" disabled>
                    Previous
                  </button>
                  <button className="px-3 py-1.5 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors disabled:opacity-50" disabled>
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateDocumentModal
            documentType={currentDocument}
            phaseGradient={currentPhase?.gradient || 'from-blue-500 to-blue-600'}
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
            phaseGradient={currentPhase?.gradient || 'from-blue-500 to-blue-600'}
            onClose={() => {
              setShowViewModal(false);
              setSelectedRecord(null);
            }}
            onStatusUpdate={handleUpdateStatus}
            onPrint={handlePrint}
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
  phaseGradient: string;
  materials: Material[];
  suppliers: Supplier[];
  onClose: () => void;
  onCreate: (data: Record<string, unknown>) => void;
}

function CreateDocumentModal({ documentType, phaseGradient, materials, suppliers, onClose, onCreate }: CreateDocumentModalProps) {
  const [formData, setFormData] = useState<{
    items: FormItem[];
    priority: string;
    department: string;
    vendorId: string;
    remarks: string;
    expectedDate: string;
    invoiceNumber?: string;
    invoiceDate?: string;
    poReference?: string;
    challanNumber?: string;
    vehicleNumber?: string;
    driverName?: string;
    gateEntryTime?: string;
  }>({
    items: [],
    priority: 'medium',
    department: '',
    vendorId: '',
    remarks: '',
    expectedDate: '',
  });
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [gstPercent, setGstPercent] = useState('18');

  const addItem = () => {
    if (!selectedMaterial || !quantity) return;
    
    const material = materials.find(m => m.id === selectedMaterial);
    if (!material) return;

    const qty = parseFloat(quantity);
    const price = parseFloat(unitPrice) || material.purchase_price || 0;
    const gst = parseFloat(gstPercent) || 0;
    const baseTotal = qty * price;
    const totalWithGst = baseTotal + (baseTotal * gst / 100);

    const newItem: FormItem = {
      materialId: material.id,
      materialCode: material.code || '',
      materialName: material.name,
      quantity: qty,
      unit: material.unit || 'Pcs',
      unitPrice: price,
      totalPrice: totalWithGst,
      gstPercent: gst,
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
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const totalAmount = formData.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  const subtotal = formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const gstAmount = totalAmount - subtotal;

  const handleSubmit = () => {
    if (formData.items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    const vendor = suppliers.find(s => s.id === formData.vendorId);
    onCreate({
      ...formData,
      vendorName: vendor?.name || '',
      vendorAddress: vendor?.address || '',
      vendorGST: vendor?.gst || '',
      vendorEmail: vendor?.email || '',
      totalAmount,
      subtotal,
      gstAmount
    });
  };

  // Determine form type based on document
  const isInvoice = documentType?.id === 'vendor-invoice';
  const isGRN = documentType?.id === 'grn';
  const isGateEntry = documentType?.id === 'gate-entry';
  const isPR = documentType?.id === 'purchase-requisition';
  const isEBOM = documentType?.id === 'ebom';
  const isMBOM = documentType?.id === 'mbom';
  const isMRP = documentType?.id === 'mrp';
  const isProductionOrder = documentType?.id === 'production-order';
  const isManufacturing = isEBOM || isMBOM || isMRP || isProductionOrder;

  // Manufacturing specific state
  const [manufacturingData, setManufacturingData] = useState({
    projectId: '',
    projectName: '',
    version: '1.0',
    productionQty: 1,
    requiredDate: '',
    scheduledStart: '',
    sourceMBOMId: '',
    sourceEBOMId: '',
    wastagePercent: 2,
    overheadPercent: 10
  });

  // Manufacturing submit handler
  const handleManufacturingSubmit = async () => {
    if (isEBOM) {
      if (!manufacturingData.projectId || !manufacturingData.projectName) {
        toast.error('Please provide project details');
        return;
      }
      // eBOM will be created via the main component's handler
      onCreate({
        type: 'ebom',
        projectId: manufacturingData.projectId,
        projectName: manufacturingData.projectName,
        version: manufacturingData.version,
        wastagePercent: manufacturingData.wastagePercent,
        overheadPercent: manufacturingData.overheadPercent,
        items: formData.items.map(item => ({
          ...item,
          wastagePercent: manufacturingData.wastagePercent,
          grossQty: item.quantity * (1 + manufacturingData.wastagePercent / 100)
        }))
      });
    } else if (isMBOM) {
      if (!manufacturingData.sourceEBOMId) {
        toast.error('Please select an eBOM to convert');
        return;
      }
      onCreate({
        type: 'mbom',
        sourceEBOMId: manufacturingData.sourceEBOMId
      });
    } else if (isMRP) {
      if (!manufacturingData.sourceMBOMId || !manufacturingData.requiredDate) {
        toast.error('Please select mBOM and required date');
        return;
      }
      onCreate({
        type: 'mrp',
        sourceMBOMId: manufacturingData.sourceMBOMId,
        requiredDate: manufacturingData.requiredDate
      });
    } else if (isProductionOrder) {
      if (!manufacturingData.sourceMBOMId || !manufacturingData.scheduledStart) {
        toast.error('Please select mBOM and scheduled start date');
        return;
      }
      onCreate({
        type: 'production-order',
        sourceMBOMId: manufacturingData.sourceMBOMId,
        quantity: manufacturingData.productionQty,
        scheduledStart: manufacturingData.scheduledStart
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
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
        <div className={`flex items-center justify-between px-6 py-4 bg-gradient-to-r ${phaseGradient}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Create {documentType?.name}</h2>
              <p className="text-sm text-white/70">Fill in the details below</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Basic Info Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Vendor/Department Selection */}
            {isPR ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Department *</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Select Department</option>
                    <option value="Production">Production</option>
                    <option value="Tooling">Tooling</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Quality">Quality</option>
                    <option value="R&D">R&D</option>
                    <option value="Assembly">Assembly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:border-blue-500 focus:outline-none"
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
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Select Vendor</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} {s.gst ? `(${s.gst})` : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    {isInvoice ? 'Invoice Date' : 'Expected Date'}
                  </label>
                  <input
                    type="date"
                    value={formData.expectedDate}
                    onChange={(e) => setFormData({ ...formData, expectedDate: e.target.value })}
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </>
            )}

            {/* Invoice specific fields */}
            {isInvoice && (
              <>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Invoice Number *</label>
                  <input
                    type="text"
                    value={formData.invoiceNumber || ''}
                    onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                    placeholder="Enter invoice number"
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">PO Reference</label>
                  <input
                    type="text"
                    value={formData.poReference || ''}
                    onChange={(e) => setFormData({ ...formData, poReference: e.target.value })}
                    placeholder="Enter PO number"
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </>
            )}

            {/* GRN specific fields */}
            {isGRN && (
              <>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">PO Reference *</label>
                  <input
                    type="text"
                    value={formData.poReference || ''}
                    onChange={(e) => setFormData({ ...formData, poReference: e.target.value })}
                    placeholder="Enter PO number"
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Challan Number</label>
                  <input
                    type="text"
                    value={formData.challanNumber || ''}
                    onChange={(e) => setFormData({ ...formData, challanNumber: e.target.value })}
                    placeholder="Enter challan number"
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </>
            )}

            {/* Gate Entry specific fields */}
            {isGateEntry && (
              <>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Vehicle Number</label>
                  <input
                    type="text"
                    value={formData.vehicleNumber || ''}
                    onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                    placeholder="e.g., MH12AB1234"
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Driver Name</label>
                  <input
                    type="text"
                    value={formData.driverName || ''}
                    onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                    placeholder="Enter driver name"
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Entry Time</label>
                  <input
                    type="datetime-local"
                    value={formData.gateEntryTime || ''}
                    onChange={(e) => setFormData({ ...formData, gateEntryTime: e.target.value })}
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </>
            )}

            {/* eBOM specific fields */}
            {isEBOM && (
              <>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Project ID *</label>
                  <input
                    type="text"
                    value={manufacturingData.projectId}
                    onChange={(e) => setManufacturingData({ ...manufacturingData, projectId: e.target.value })}
                    placeholder="Enter project ID"
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Project Name *</label>
                  <input
                    type="text"
                    value={manufacturingData.projectName}
                    onChange={(e) => setManufacturingData({ ...manufacturingData, projectName: e.target.value })}
                    placeholder="Enter project name"
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Version</label>
                  <input
                    type="text"
                    value={manufacturingData.version}
                    onChange={(e) => setManufacturingData({ ...manufacturingData, version: e.target.value })}
                    placeholder="e.g., 1.0"
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Default Wastage %</label>
                  <input
                    type="number"
                    value={manufacturingData.wastagePercent}
                    onChange={(e) => setManufacturingData({ ...manufacturingData, wastagePercent: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Overhead %</label>
                  <input
                    type="number"
                    value={manufacturingData.overheadPercent}
                    onChange={(e) => setManufacturingData({ ...manufacturingData, overheadPercent: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </>
            )}

            {/* mBOM specific fields - select eBOM to convert */}
            {isMBOM && (
              <>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Select eBOM to Convert *</label>
                  <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-xl">
                    <p className="text-zinc-400 text-sm mb-3">
                      Converting an eBOM to mBOM adds manufacturing-specific details like routing, consumables, and issue points.
                    </p>
                    <input
                      type="text"
                      value={manufacturingData.sourceEBOMId}
                      onChange={(e) => setManufacturingData({ ...manufacturingData, sourceEBOMId: e.target.value })}
                      placeholder="Enter eBOM ID or select from list"
                      className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </>
            )}

            {/* MRP specific fields */}
            {isMRP && (
              <>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Select mBOM *</label>
                  <input
                    type="text"
                    value={manufacturingData.sourceMBOMId}
                    onChange={(e) => setManufacturingData({ ...manufacturingData, sourceMBOMId: e.target.value })}
                    placeholder="Enter mBOM ID"
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Required By Date *</label>
                  <input
                    type="date"
                    value={manufacturingData.requiredDate}
                    onChange={(e) => setManufacturingData({ ...manufacturingData, requiredDate: e.target.value })}
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="col-span-2 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                  <h4 className="font-medium text-blue-400 mb-2">MRP Calculation Info</h4>
                  <p className="text-zinc-400 text-sm">
                    MRP will calculate net requirements based on current inventory and pending purchase orders.
                    It will automatically identify materials needing procurement.
                  </p>
                </div>
              </>
            )}

            {/* Production Order specific fields */}
            {isProductionOrder && (
              <>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Select mBOM *</label>
                  <input
                    type="text"
                    value={manufacturingData.sourceMBOMId}
                    onChange={(e) => setManufacturingData({ ...manufacturingData, sourceMBOMId: e.target.value })}
                    placeholder="Enter mBOM ID"
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Production Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    value={manufacturingData.productionQty}
                    onChange={(e) => setManufacturingData({ ...manufacturingData, productionQty: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Scheduled Start *</label>
                  <input
                    type="datetime-local"
                    value={manufacturingData.scheduledStart}
                    onChange={(e) => setManufacturingData({ ...manufacturingData, scheduledStart: e.target.value })}
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="col-span-2 p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                  <h4 className="font-medium text-purple-400 mb-2">Production Order</h4>
                  <p className="text-zinc-400 text-sm">
                    A Production Order tracks material issues against planned quantities.
                    Variance tracking will flag any over-consumption requiring approval.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Add Items - Only for non-manufacturing or eBOM */}
          {(!isManufacturing || isEBOM) && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
              <Package className="w-4 h-4" />
              {isEBOM ? 'Add BOM Items' : 'Add Items'}
            </h3>
            <div className="flex flex-wrap gap-3">
              <select
                value={selectedMaterial}
                onChange={(e) => {
                  setSelectedMaterial(e.target.value);
                  const mat = materials.find(m => m.id === e.target.value);
                  if (mat) setUnitPrice(mat.purchase_price?.toString() || '');
                }}
                className="flex-1 min-w-[200px] px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:border-blue-500 focus:outline-none"
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
                className="w-24 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:border-blue-500 focus:outline-none"
              />
              <input
                type="number"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                placeholder="Price"
                className="w-28 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:border-blue-500 focus:outline-none"
              />
              <select
                value={gstPercent}
                onChange={(e) => setGstPercent(e.target.value)}
                className="w-24 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="0">0% GST</option>
                <option value="5">5% GST</option>
                <option value="12">12% GST</option>
                <option value="18">18% GST</option>
                <option value="28">28% GST</option>
              </select>
              <button
                onClick={addItem}
                disabled={!selectedMaterial || !quantity}
                className={`px-4 py-2.5 bg-gradient-to-r ${phaseGradient} disabled:bg-zinc-700 disabled:from-zinc-700 disabled:to-zinc-700 text-white rounded-xl font-medium transition-all hover:opacity-90`}
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
          )}

          {/* Items Table - Only for non-manufacturing or eBOM */}
          {(!isManufacturing || isEBOM) && formData.items.length > 0 && (
            <div className="bg-zinc-800/50 rounded-xl overflow-hidden mb-6">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-700">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase">Material</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-zinc-500 uppercase">Qty</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-zinc-500 uppercase">Price</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-zinc-500 uppercase">GST</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-zinc-500 uppercase">Total</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item, index) => (
                    <tr key={index} className="border-b border-zinc-700/50">
                      <td className="py-3 px-4">
                        <span className="text-white text-sm">{item.materialName}</span>
                        <span className="text-zinc-500 text-xs ml-2">({item.materialCode})</span>
                      </td>
                      <td className="py-3 px-4 text-right text-zinc-300">{item.quantity} {item.unit}</td>
                      <td className="py-3 px-4 text-right text-zinc-300">₹{item.unitPrice.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-zinc-400">{item.gstPercent}%</td>
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
                    <td colSpan={4} className="py-3 px-4 text-right text-zinc-400">Subtotal:</td>
                    <td className="py-3 px-4 text-right text-zinc-300 font-medium">₹{subtotal.toLocaleString()}</td>
                    <td></td>
                  </tr>
                  <tr className="bg-zinc-900/50">
                    <td colSpan={4} className="py-3 px-4 text-right text-zinc-400">GST:</td>
                    <td className="py-3 px-4 text-right text-zinc-300 font-medium">₹{gstAmount.toLocaleString()}</td>
                    <td></td>
                  </tr>
                  <tr className="bg-zinc-900/50">
                    <td colSpan={4} className="py-3 px-4 text-right text-zinc-300 font-semibold">Grand Total:</td>
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
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none resize-none"
              placeholder="Add any additional notes..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 bg-zinc-900/50">
          <div className="text-sm text-zinc-500">
            {formData.items.length} item{formData.items.length !== 1 ? 's' : ''} added
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={isManufacturing ? handleManufacturingSubmit : handleSubmit}
              disabled={isManufacturing ? false : formData.items.length === 0}
              className={`px-5 py-2.5 bg-gradient-to-r ${phaseGradient} disabled:bg-zinc-700 disabled:from-zinc-700 disabled:to-zinc-700 text-white rounded-xl font-medium transition-all hover:opacity-90`}
            >
              Create {documentType?.code}
            </button>
          </div>
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
  phaseGradient: string;
  onClose: () => void;
  onStatusUpdate: (id: string, status: DocumentStatus) => void;
  onPrint: (doc: BaseDocument) => void;
}

function ViewDocumentModal({ document: doc, documentType, phaseGradient, onClose, onStatusUpdate, onPrint }: ViewDocumentModalProps) {
  const statusConfig = STATUS_CONFIG[doc.status as DocumentStatus] || STATUS_CONFIG.draft;
  const StatusIcon = statusConfig.icon;
  const [activeTab, setActiveTab] = useState<'details' | 'history' | 'linked'>('details');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
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
        <div className={`flex items-center justify-between px-6 py-4 bg-gradient-to-r ${phaseGradient}`}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{doc.docNumber}</h2>
              <p className="text-sm text-white/70">{documentType?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${statusConfig.bg} ${statusConfig.color}`}>
              <StatusIcon className="w-4 h-4" />
              {statusConfig.label}
            </span>
            <button
              onClick={onClose}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-6 pt-4 border-b border-zinc-800">
          {[
            { id: 'details' as const, label: 'Details', icon: FileText },
            { id: 'history' as const, label: 'History', icon: History },
            { id: 'linked' as const, label: 'Linked Docs', icon: Link2 },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'text-white border-white'
                  : 'text-zinc-500 border-transparent hover:text-zinc-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-220px)]">
          {activeTab === 'details' && (
            <>
              {/* Details Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
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
                {doc.priority && (
                  <div className="bg-zinc-800/50 rounded-xl p-4">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Priority</p>
                    <PriorityBadge priority={doc.priority} />
                  </div>
                )}
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
                {doc.totalAmount !== undefined && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                    <p className="text-xs text-emerald-400 uppercase tracking-wider mb-1">Total Amount</p>
                    <p className="text-emerald-400 text-xl font-bold">₹{doc.totalAmount.toLocaleString()}</p>
                  </div>
                )}
                {doc.approvedBy && (
                  <div className="bg-zinc-800/50 rounded-xl p-4">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Approved By</p>
                    <p className="text-white">{doc.approvedBy}</p>
                    <p className="text-zinc-500 text-xs">
                      {doc.approvedAt ? new Date(doc.approvedAt).toLocaleDateString() : ''}
                    </p>
                  </div>
                )}
              </div>

              {/* Items */}
              {Array.isArray(doc.items) && doc.items.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Items ({doc.items.length})
                  </h3>
                  <div className="bg-zinc-800/50 rounded-xl overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-zinc-700">
                          <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase">#</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase">Material</th>
                          <th className="text-right py-3 px-4 text-xs font-semibold text-zinc-500 uppercase">Qty</th>
                          <th className="text-right py-3 px-4 text-xs font-semibold text-zinc-500 uppercase">Price</th>
                          <th className="text-right py-3 px-4 text-xs font-semibold text-zinc-500 uppercase">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(doc.items as FormItem[]).map((item, index) => (
                          <tr key={index} className="border-b border-zinc-700/50">
                            <td className="py-3 px-4 text-zinc-500">{index + 1}</td>
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
                  <h3 className="text-sm font-semibold text-zinc-300 mb-2 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Remarks
                  </h3>
                  <p className="text-zinc-400 bg-zinc-800/50 rounded-xl p-4">{doc.remarks}</p>
                </div>
              )}
            </>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              {doc.history && doc.history.length > 0 ? (
                doc.history.map((entry, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center flex-shrink-0">
                      <History className="w-4 h-4 text-zinc-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{entry.action}</p>
                      <p className="text-zinc-500 text-sm">By {entry.by}</p>
                      <p className="text-zinc-600 text-xs mt-1">
                        {new Date(entry.at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-zinc-500">
                  <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No history available</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'linked' && (
            <div className="space-y-4">
              {doc.linkedDocs && doc.linkedDocs.length > 0 ? (
                doc.linkedDocs.map((linked, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Link2 className="w-5 h-5 text-zinc-500" />
                      <div>
                        <p className="text-white font-medium">{linked.number}</p>
                        <p className="text-zinc-500 text-sm">{linked.type}</p>
                      </div>
                    </div>
                    <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors">
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-zinc-500">
                  <Link2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No linked documents</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => onPrint(doc)}
              className="flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button className="flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors">
              <Download className="w-4 h-4" />
              Download PDF
            </button>
            <button className="flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors">
              <Share2 className="w-4 h-4" />
              Share
            </button>
          </div>
          <div className="flex items-center gap-2">
            {doc.status === 'draft' && (
              <button
                onClick={() => onStatusUpdate(doc.id, 'pending')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
              >
                <Send className="w-4 h-4" />
                Submit
              </button>
            )}
            {doc.status === 'pending' && (
              <>
                <button
                  onClick={() => onStatusUpdate(doc.id, 'rejected')}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
                <button
                  onClick={() => onStatusUpdate(doc.id, 'approved')}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
