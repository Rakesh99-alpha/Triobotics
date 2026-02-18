'use client';

// ==========================================
// DYNAMIC INTEGRATED PURCHASE MANAGEMENT
// ==========================================
// Connected to: Store ↔ Supervisor ↔ Purchase ↔ MD
// Real-time Firebase sync across all modules

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useReactToPrint } from 'react-to-print';

// Enhanced PO Form Component
import EnhancedPOForm from './EnhancedPOForm';

// Print Templates
import PurchaseOrderTemplate, { PurchaseOrderData, DEFAULT_PO_TERMS } from './documents/PurchaseOrderTemplate';
import { COMPANY_INFO } from './documents/DocumentTemplates';

import {
  FileText,
  ShoppingCart,
  Receipt,
  CheckCircle2,
  LogOut,
  Clock,
  AlertTriangle,
  Search,
  Plus,
  Eye,
  Send,
  RefreshCw,
  ChevronRight,
  IndianRupee,
  Bell,
  X,
  Check,
  ArrowRight,
  PackageCheck,
  ClipboardList,
  TrendingUp,
  AlertCircle,
  Boxes,
  Printer,
  ArrowUpRight,
  Link2,
  Sparkles
} from 'lucide-react';

// Services
import {
  MD_APPROVAL_THRESHOLD,
  formatCurrency,
  // Types
  MaterialRequest,
  PurchaseRequisition,
  PurchaseOrder,
  GoodsReceipt,
  PurchaseInvoice,
  Notification,
  DashboardStats,
  PRItem,
  POItem,
  GRNItem,
  // Subscriptions
  subscribeToMaterialRequests,
  subscribeToPRs,
  subscribeToPOs,
  subscribeToGRNs,
  subscribeToInvoices,
  subscribeToMaterials,
  subscribeToSuppliers,
  subscribeToNotifications,
  subscribeToDashboardStats,
  subscribeToLowStockMaterials,
  subscribeToPendingMDApprovals,
  // Actions
  approveMaterialRequest,
  rejectMaterialRequest,
  convertRequestToPR,
  createManualPR,
  createPO,
  createGRN,
  createInvoice,
  markPOAsOrdered,
  updateMaterialStock,
  updateInvoiceStatus,
  markNotificationRead,
} from '@/lib/services/integratedProcurementService';

// ==========================================
// ANIMATION VARIANTS
// ==========================================
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

// ==========================================
// TYPE DEFINITIONS
// ==========================================
type TabType = 'overview' | 'requests' | 'requisitions' | 'orders' | 'receipts' | 'invoices';

interface Material {
  id: string;
  code: string;
  name: string;
  category: string;
  current_stock: number;
  min_stock: number;
  unit: string;
  purchase_price: number;
  supplier_name?: string;
  supplier_id?: string;
}

interface Supplier {
  id: string;
  name: string;
  contact: string;
  email?: string;
  phone?: string;
  gst?: string;
  address?: string;
}

// ==========================================
// MAIN COMPONENT
// ==========================================

interface PurchaseDynamicProps {
  defaultTab?: string;
}

export default function PurchaseDynamic({ defaultTab }: PurchaseDynamicProps) {
  // ==========================================
  // STATE
  // ==========================================
  
  // Router for navigation
  const router = useRouter();
  
  // Data states
  const [materialRequests, setMaterialRequests] = useState<MaterialRequest[]>([]);
  const [purchaseRequisitions, setPurchaseRequisitions] = useState<PurchaseRequisition[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceipt[]>([]);
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [lowStockItems, setLowStockItems] = useState<Material[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PurchaseOrder[]>([]);
  
  // UI states
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Modal states
  const [showCreatePRModal, setShowCreatePRModal] = useState(false);
  const [showCreatePOModal, setShowCreatePOModal] = useState(defaultTab === 'create');
  const [showDirectPOModal, setShowDirectPOModal] = useState(false);
  const [showCreateGRNModal, setShowCreateGRNModal] = useState(false);
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedRequestForReject, setSelectedRequestForReject] = useState<MaterialRequest | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MaterialRequest | PurchaseRequisition | PurchaseOrder | GoodsReceipt | PurchaseInvoice | null>(null);
  const [selectedItemType, setSelectedItemType] = useState<string>('');
  
  // Print states
  const printRef = useRef<HTMLDivElement>(null);
  const [printCopyType, setPrintCopyType] = useState<'ORIGINAL' | 'DUPLICATE' | 'VENDOR COPY' | 'OFFICE COPY'>('ORIGINAL');
  const [printingPO, setPrintingPO] = useState<PurchaseOrder | null>(null);
  
  // Form states
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Current user (from localStorage)
  const [currentUser, setCurrentUser] = useState({ id: '', name: '', role: '' });
  
  // ==========================================
  // EFFECTS - Data Loading
  // ==========================================
  
  useEffect(() => {
    // Get current user
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setCurrentUser({
          id: user.uid || user.id || '',
          name: user.name || user.displayName || 'Unknown',
          role: user.role || 'purchase',
        });
      } catch {
        setCurrentUser({ id: 'system', name: 'System User', role: 'purchase' });
      }
    }
    
    // Subscribe to all data streams
    const unsubscribers: (() => void)[] = [];
    
    // Set a timeout to stop loading even if data is slow
    const loadingTimeout = setTimeout(() => {
      console.log('[Purchase] Loading timeout - forcing ready state');
      setLoading(false);
    }, 5000);
    
    // Material Requests (from Supervisor/Store)
    unsubscribers.push(
      subscribeToMaterialRequests((data) => {
        console.log('[Purchase] Material Requests loaded:', data.length);
        setMaterialRequests(data);
        clearTimeout(loadingTimeout);
        setLoading(false);
      })
    );
    
    // Purchase Requisitions
    unsubscribers.push(
      subscribeToPRs((data) => {
        console.log('[Purchase] PRs loaded:', data.length);
        setPurchaseRequisitions(data);
      })
    );
    
    // Purchase Orders
    unsubscribers.push(
      subscribeToPOs((data) => {
        console.log('[Purchase] POs loaded:', data.length);
        setPurchaseOrders(data);
      })
    );
    
    // Goods Receipts
    unsubscribers.push(
      subscribeToGRNs((data) => {
        console.log('[Purchase] GRNs loaded:', data.length);
        setGoodsReceipts(data);
      })
    );
    
    // Invoices
    unsubscribers.push(
      subscribeToInvoices((data) => {
        console.log('[Purchase] Invoices loaded:', data.length);
        setInvoices(data);
      })
    );
    
    // Materials
    unsubscribers.push(
      subscribeToMaterials((data) => {
        console.log('[Purchase] Materials loaded:', data.length);
        setMaterials(data as unknown as Material[]);
      })
    );
    
    // Suppliers
    unsubscribers.push(
      subscribeToSuppliers((data) => {
        console.log('[Purchase] Suppliers loaded:', data.length, data);
        setSuppliers(data as unknown as Supplier[]);
      })
    );
    
    // Notifications
    unsubscribers.push(
      subscribeToNotifications((data) => {
        setNotifications(data);
      }, currentUser.role)
    );
    
    // Dashboard Stats
    unsubscribers.push(
      subscribeToDashboardStats((data) => {
        setDashboardStats(data);
      })
    );
    
    // Low Stock Items
    unsubscribers.push(
      subscribeToLowStockMaterials((data) => {
        setLowStockItems(data as unknown as Material[]);
      })
    );
    
    // Pending MD Approvals
    unsubscribers.push(
      subscribeToPendingMDApprovals((data) => {
        setPendingApprovals(data);
      })
    );
    
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [currentUser.role]);
  
  // ==========================================
  // COMPUTED VALUES
  // ==========================================
  
  const unreadNotifications = useMemo(() => 
    notifications.filter(n => !n.isRead).length,
    [notifications]
  );
  
  const tabs = useMemo(() => [
    { 
      id: 'overview' as TabType, 
      label: 'Overview', 
      icon: TrendingUp,
      count: null 
    },
    { 
      id: 'requests' as TabType, 
      label: 'Material Requests', 
      icon: ClipboardList,
      count: materialRequests.filter(r => r.status === 'pending').length 
    },
    { 
      id: 'requisitions' as TabType, 
      label: 'Purchase Requisitions', 
      icon: FileText,
      count: purchaseRequisitions.filter(p => p.status === 'submitted').length 
    },
    { 
      id: 'orders' as TabType, 
      label: 'Purchase Orders', 
      icon: ShoppingCart,
      count: purchaseOrders.filter(p => p.status === 'pending_md_approval').length 
    },
    { 
      id: 'receipts' as TabType, 
      label: 'Goods Receipt', 
      icon: PackageCheck,
      count: goodsReceipts.filter(g => g.status === 'pending').length 
    },
    { 
      id: 'invoices' as TabType, 
      label: 'Invoices', 
      icon: Receipt,
      count: invoices.filter(i => i.status === 'pending').length 
    },
  ], [materialRequests, purchaseRequisitions, purchaseOrders, goodsReceipts, invoices]);
  
  // ==========================================
  // HANDLERS
  // ==========================================
  
  const handleApproveRequest = async (request: MaterialRequest) => {
    try {
      setIsSubmitting(true);
      await approveMaterialRequest(request.id, currentUser.id, currentUser.name);
      alert('Request approved successfully!');
    } catch (error) {
      console.error('Error approving request:', error);
      alert('Failed to approve request');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleRejectRequest = async () => {
    if (!selectedRequestForReject || !rejectReason.trim()) return;
    try {
      setIsSubmitting(true);
      await rejectMaterialRequest(selectedRequestForReject.id, currentUser.id, rejectReason);
      alert('Request rejected successfully!');
      setShowRejectModal(false);
      setRejectReason('');
      setSelectedRequestForReject(null);
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Failed to reject request');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const openRejectModal = (request: MaterialRequest) => {
    setSelectedRequestForReject(request);
    setRejectReason('');
    setShowRejectModal(true);
  };
  
  const handleConvertToPR = async (request: MaterialRequest) => {
    try {
      setIsSubmitting(true);
      await convertRequestToPR(request, currentUser.id, currentUser.name);
      alert(`Material Request converted to PR successfully!`);
    } catch (error) {
      console.error('Error converting to PR:', error);
      alert('Failed to convert to PR');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleCreateManualPR = async (data: {
    items: { materialId: string; materialName: string; requestedQty: number; estimatedPrice: number; unit: string }[];
    priority: 'low' | 'medium' | 'high' | 'critical';
    requiredDate: string;
    notes?: string;
    projectName?: string;
    department: string;
  }) => {
    try {
      setIsSubmitting(true);
      
      // Convert priority: 'critical' maps to 'urgent'
      const mappedPriority: 'low' | 'medium' | 'high' | 'urgent' = 
        data.priority === 'critical' ? 'urgent' : data.priority;
      
      // Convert items to proper PRItem format
      const prItems: PRItem[] = data.items.map(item => {
        const material = materials.find(m => m.id === item.materialId);
        return {
          materialId: item.materialId,
          materialCode: material?.code || '',
          materialName: item.materialName,
          requiredQty: item.requestedQty,
          currentStock: material?.current_stock || 0,
          shortfall: Math.max(0, item.requestedQty - (material?.current_stock || 0)),
          unit: item.unit,
          estimatedUnitPrice: item.estimatedPrice,
          estimatedTotal: item.estimatedPrice * item.requestedQty,
        };
      });
      
      await createManualPR({
        sourceType: 'manual',
        sourceId: '',
        sourceNumber: '',
        items: prItems,
        totalEstimatedAmount: prItems.reduce((sum, item) => sum + item.estimatedTotal, 0),
        status: 'submitted',
        priority: mappedPriority,
        requiredDate: data.requiredDate,
        notes: data.notes || '',
        projectName: data.projectName || '',
        projectId: '',
        department: data.department,
        createdBy: currentUser.id,
        createdByName: currentUser.name,
      });
      alert('PR created successfully!');
      setShowCreatePRModal(false);
    } catch (error) {
      console.error('Error creating PR:', error);
      alert('Failed to create PR');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleCreatePO = async (pr: PurchaseRequisition, supplierData: {
    supplierId: string;
    supplierName: string;
    terms: string;
    deliveryDate: string;
    paymentTerms: string;
  }) => {
    try {
      setIsSubmitting(true);
      
      // Get supplier details from suppliers array
      const supplier = suppliers.find(s => s.id === supplierData.supplierId);
      
      const subtotal = pr.items.reduce((sum, item) => sum + item.estimatedTotal, 0);
      const taxPercent = 18;
      const taxAmount = subtotal * (taxPercent / 100);
      const totalAmount = subtotal + taxAmount;
      
      const poItems: POItem[] = pr.items.map(item => ({
        materialId: item.materialId,
        materialCode: item.materialCode,
        materialName: item.materialName,
        quantity: item.requiredQty,
        unit: item.unit,
        unitPrice: item.estimatedUnitPrice,
        totalPrice: item.estimatedTotal,
        taxPercent: 18,
        taxAmount: item.estimatedTotal * 0.18,
        receivedQty: 0,
        pendingQty: item.requiredQty,
      }));
      
      await createPO({
        prId: pr.id,
        prNumber: pr.prNumber,
        vendorId: supplierData.supplierId,
        vendorName: supplierData.supplierName,
        vendorContact: supplier?.contact || '',
        vendorEmail: supplier?.email || '',
        vendorAddress: supplier?.address || '',
        items: poItems,
        subtotal,
        taxPercent,
        taxAmount,
        otherCharges: 0,
        totalAmount,
        status: 'pending_md_approval', // All POs require MD approval
        approvalSteps: [],
        paymentTerms: supplierData.paymentTerms,
        deliveryTerms: supplierData.terms,
        expectedDelivery: supplierData.deliveryDate,
        createdBy: currentUser.id,
        createdByName: currentUser.name,
        requiresMDApproval: true, // All POs require MD approval
        mdApprovalThreshold: 0, // No threshold - all POs need approval
      });
      
      // All POs require MD approval
      {
        // Show confirmation with option to notify MD
        const notifyMD = window.confirm(
          `✅ PO created successfully!\n\n` +
          `Amount: ${formatCurrency(totalAmount)}\n` +
          `Status: Pending MD Approval\n\n` +
          `Would you like to notify MD via WhatsApp?`
        );
        
        if (notifyMD) {
          const message = `🔔 *PO Approval Required*\n\n` +
            `PO Amount: ${formatCurrency(totalAmount)}\n` +
            `Vendor: ${supplierData.supplierName}\n` +
            `Items: ${pr.items.length} items\n` +
            `Created By: ${currentUser.name}\n\n` +
            `Please review and approve at:\n` +
            `https://trio-1268.vercel.app/rnd`;
          window.open(`https://wa.me/917981085020?text=${encodeURIComponent(message)}`, '_blank');
        }
      }
      setShowCreatePOModal(false);
    } catch (error) {
      console.error('Error creating PO:', error);
      alert('Failed to create PO');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Direct PO Creation (without PR)
  const handleCreateDirectPO = async (data: {
    supplierId: string;
    supplierName: string;
    items: { materialId: string; quantity: number; unitPrice: number }[];
    paymentTerms: string;
    deliveryTerms: string;
    expectedDelivery: string;
    notes?: string;
  }) => {
    try {
      setIsSubmitting(true);
      
      const supplier = suppliers.find(s => s.id === data.supplierId);
      
      const poItems: POItem[] = data.items.map(item => {
        const material = materials.find(m => m.id === item.materialId);
        const totalPrice = item.quantity * item.unitPrice;
        return {
          materialId: item.materialId,
          materialCode: material?.code || '',
          materialName: material?.name || '',
          quantity: item.quantity,
          unit: material?.unit || 'Pcs',
          unitPrice: item.unitPrice,
          totalPrice,
          taxPercent: 18,
          taxAmount: totalPrice * 0.18,
          receivedQty: 0,
          pendingQty: item.quantity,
        };
      });
      
      const subtotal = poItems.reduce((sum, item) => sum + item.totalPrice, 0);
      const taxPercent = 18;
      const taxAmount = subtotal * (taxPercent / 100);
      const totalAmount = subtotal + taxAmount;
      
      await createPO({
        vendorId: data.supplierId,
        vendorName: data.supplierName,
        vendorContact: supplier?.contact || '',
        vendorEmail: supplier?.email || '',
        vendorAddress: supplier?.address || '',
        items: poItems,
        subtotal,
        taxPercent,
        taxAmount,
        otherCharges: 0,
        totalAmount,
        status: 'pending_md_approval', // All POs require MD approval
        approvalSteps: [],
        paymentTerms: data.paymentTerms,
        deliveryTerms: data.deliveryTerms,
        expectedDelivery: data.expectedDelivery,
        createdBy: currentUser.id,
        createdByName: currentUser.name,
        requiresMDApproval: true, // All POs require MD approval
        mdApprovalThreshold: 0, // No threshold - all POs need approval
        notes: data.notes,
      });
      
      // All POs require MD approval
      {
        const notifyMD = window.confirm(
          `✅ PO created successfully!\n\n` +
          `Amount: ${formatCurrency(totalAmount)}\n` +
          `Status: Pending MD Approval\n\n` +
          `Would you like to notify MD via WhatsApp?`
        );
        
        if (notifyMD) {
          const message = `🔔 *New PO Requires Approval*\n\n` +
            `Amount: ${formatCurrency(totalAmount)}\n` +
            `Vendor: ${data.supplierName}\n` +
            `Items: ${data.items.length} items\n` +
            `Created By: ${currentUser.name}\n\n` +
            `Please review at:\nhttps://trio-1268.vercel.app/rnd`;
          window.open(`https://wa.me/917981085020?text=${encodeURIComponent(message)}`, '_blank');
        }
      }
      setShowDirectPOModal(false);
    } catch (error) {
      console.error('Error creating direct PO:', error);
      alert('Failed to create PO');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleCreateGRN = async (po: PurchaseOrder, receivedItems: {
    materialId: string;
    receivedQty: number;
    remarks?: string;
  }[]) => {
    try {
      setIsSubmitting(true);
      
      const grnItems: GRNItem[] = receivedItems.map(item => {
        const poItem = po.items.find(i => i.materialId === item.materialId);
        return {
          materialId: item.materialId,
          materialCode: poItem?.materialCode || '',
          materialName: poItem?.materialName || '',
          orderedQty: poItem?.quantity || 0,
          receivedQty: item.receivedQty,
          acceptedQty: item.receivedQty, // Default: accept all received
          rejectedQty: 0,
          unit: poItem?.unit || '',
          unitPrice: poItem?.unitPrice || 0,
          totalValue: item.receivedQty * (poItem?.unitPrice || 0),
          qualityStatus: 'pending' as const,
          remarks: item.remarks || '',
        };
      });
      
      const totalReceivedValue = grnItems.reduce((sum, item) => sum + item.totalValue, 0);
      
      await createGRN({
        poId: po.id,
        poNumber: po.poNumber,
        vendorId: po.vendorId,
        vendorName: po.vendorName,
        items: grnItems,
        totalReceivedValue,
        status: 'pending',
        receivedBy: currentUser.id,
        receivedByName: currentUser.name,
        receivedAt: new Date().toISOString(),
      });
      
      alert('GRN created successfully! Proceed to quality check.');
      setShowCreateGRNModal(false);
    } catch (error) {
      console.error('Error creating GRN:', error);
      alert('Failed to create GRN');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleCreateInvoice = async (grn: GoodsReceipt, invoiceData: {
    invoiceNumber: string;
    invoiceDate: string;
    invoiceAmount: number;
    taxAmount: number;
    dueDate: string;
  }) => {
    try {
      setIsSubmitting(true);
      
      const invoiceItems = grn.items.map(item => ({
        materialId: item.materialId,
        materialName: item.materialName,
        quantity: item.acceptedQty,
        unit: item.unit,
        unitPrice: item.unitPrice,
        totalPrice: item.totalValue,
        taxPercent: 18,
        taxAmount: item.totalValue * 0.18,
      }));
      
      // Split tax evenly for GST (assuming inter-state for simplicity)
      const cgst = invoiceData.taxAmount / 2;
      const sgst = invoiceData.taxAmount / 2;
      
      await createInvoice({
        vendorInvoiceNumber: invoiceData.invoiceNumber,
        poId: grn.poId,
        poNumber: grn.poNumber,
        grnId: grn.id,
        grnNumber: grn.grnNumber,
        vendorId: grn.vendorId,
        vendorName: grn.vendorName,
        invoiceDate: invoiceData.invoiceDate,
        dueDate: invoiceData.dueDate,
        items: invoiceItems,
        subtotal: invoiceData.invoiceAmount,
        cgst,
        sgst,
        igst: 0,
        totalTax: invoiceData.taxAmount,
        totalAmount: invoiceData.invoiceAmount + invoiceData.taxAmount,
        status: 'pending',
        verifiedBy: currentUser.id,
        verifiedAt: new Date().toISOString(),
      });
      alert('Invoice created successfully!');
      setShowCreateInvoiceModal(false);
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Failed to create invoice');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleViewDetails = (item: unknown, type: string) => {
    setSelectedItem(item as MaterialRequest | PurchaseRequisition | PurchaseOrder | GoodsReceipt | PurchaseInvoice);
    setSelectedItemType(type);
    setShowViewModal(true);
  };
  
  // ==========================================
  // RENDER - Overview Tab
  // ==========================================
  
  const renderOverview = () => (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Requests */}
        <motion.div
          variants={fadeInUp}
          whileHover={{ scale: 1.02, y: -2 }}
          className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-2xl p-5"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-orange-400/70 text-sm font-medium">Material Requests</p>
              <p className="text-3xl font-bold text-white mt-1">
                {dashboardStats?.materialRequests.pending || 0}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                {dashboardStats?.materialRequests.total || 0} total
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-orange-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs">
            <span className="text-orange-400">From Supervisor & Store</span>
            <ArrowUpRight className="w-3 h-3 text-orange-400" />
          </div>
        </motion.div>
        
        {/* Active PRs */}
        <motion.div
          variants={fadeInUp}
          whileHover={{ scale: 1.02, y: -2 }}
          className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-2xl p-5"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-blue-400/70 text-sm font-medium">Purchase Requisitions</p>
              <p className="text-3xl font-bold text-white mt-1">
                {dashboardStats?.purchaseRequisitions.submitted || 0}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                {dashboardStats?.purchaseRequisitions.inProgress || 0} in progress
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </motion.div>
        
        {/* PO Value */}
        <motion.div
          variants={fadeInUp}
          whileHover={{ scale: 1.02, y: -2 }}
          className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-2xl p-5"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-green-400/70 text-sm font-medium">PO Value (This Month)</p>
              <p className="text-2xl font-bold text-white mt-1">
                {formatCurrency(dashboardStats?.purchaseOrders.totalValue || 0)}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                {dashboardStats?.purchaseOrders.total || 0} orders
              </p>
            </div>
            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
              <IndianRupee className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </motion.div>
        
        {/* Pending Approvals */}
        <motion.div
          variants={fadeInUp}
          whileHover={{ scale: 1.02, y: -2 }}
          className="bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/20 rounded-2xl p-5"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-red-400/70 text-sm font-medium">Pending MD Approval</p>
              <p className="text-3xl font-bold text-white mt-1">
                {dashboardStats?.purchaseOrders.pendingApproval || 0}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                All POs require approval
              </p>
            </div>
            <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Material Requests */}
        <motion.div
          variants={fadeInUp}
          className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden"
        >
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Pending Material Requests</h3>
                <p className="text-xs text-zinc-500">From Supervisor & Store pages</p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab('requests')}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              View All <ChevronRight className="w-4 h-4" />
            </motion.button>
          </div>
          
          <div className="divide-y divide-zinc-800">
            {materialRequests.filter(r => r.status === 'pending').slice(0, 5).map((request) => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 hover:bg-zinc-800/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm text-blue-400">{request.requestNumber}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        request.urgency === 'critical' ? 'bg-red-500/20 text-red-400' :
                        request.urgency === 'high' ? 'bg-orange-500/20 text-orange-400' :
                        request.urgency === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-zinc-500/20 text-zinc-400'
                      }`}>
                        {request.urgency.toUpperCase()}
                      </span>
                      <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full text-xs">
                        {request.requestedByRole}
                      </span>
                    </div>
                    <p className="text-white font-medium mt-1">{request.requestedByName}</p>
                    <p className="text-zinc-500 text-sm">{request.department} • {request.items.length} items</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleViewDetails(request, 'request')}
                      className="w-8 h-8 bg-zinc-800 hover:bg-zinc-700 rounded-lg flex items-center justify-center"
                    >
                      <Eye className="w-4 h-4 text-zinc-400" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleConvertToPR(request)}
                      disabled={isSubmitting}
                      className="w-8 h-8 bg-green-500/20 hover:bg-green-500/30 rounded-lg flex items-center justify-center"
                    >
                      <ArrowRight className="w-4 h-4 text-green-400" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
            
            {materialRequests.filter(r => r.status === 'pending').length === 0 && (
              <div className="p-8 text-center">
                <ClipboardList className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-500">No pending material requests</p>
                <p className="text-zinc-600 text-sm mt-1">Requests from Supervisor & Store will appear here</p>
              </div>
            )}
          </div>
        </motion.div>
        
        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Low Stock Alert */}
          <motion.div
            variants={fadeInUp}
            className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden"
          >
            <div className="p-4 border-b border-zinc-800 flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Low Stock Alert</h3>
                <p className="text-xs text-zinc-500">{lowStockItems.length} items need reorder</p>
              </div>
            </div>
            
            <div className="max-h-64 overflow-y-auto">
              {lowStockItems.slice(0, 5).map((item) => (
                <div key={item.id} className="p-3 border-b border-zinc-800/50 last:border-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-zinc-500">{item.code}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-red-400 text-sm font-medium">{item.current_stock} {item.unit}</p>
                      <p className="text-xs text-zinc-500">Min: {item.min_stock}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
          
          {/* Pending MD Approvals */}
          <motion.div
            variants={fadeInUp}
            className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden"
          >
            <div className="p-4 border-b border-zinc-800 flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Awaiting MD Approval</h3>
                <p className="text-xs text-zinc-500">{pendingApprovals.length} POs pending</p>
              </div>
            </div>
            
            <div className="max-h-64 overflow-y-auto">
              {pendingApprovals.slice(0, 5).map((po) => (
                <div key={po.id} className="p-3 border-b border-zinc-800/50 last:border-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-400 font-mono text-sm">{po.poNumber}</p>
                      <p className="text-xs text-zinc-500">{po.vendorName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-medium">{formatCurrency(po.totalAmount)}</p>
                      <p className="text-xs text-yellow-400">Pending</p>
                    </div>
                  </div>
                </div>
              ))}
              
              {pendingApprovals.length === 0 && (
                <div className="p-6 text-center">
                  <CheckCircle2 className="w-8 h-8 text-green-500/50 mx-auto mb-2" />
                  <p className="text-zinc-500 text-sm">No pending approvals</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* Recent Activity */}
      <motion.div
        variants={fadeInUp}
        className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden"
      >
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="font-semibold text-white">Recent Purchase Orders</h3>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-zinc-500 bg-zinc-900/50">
                <th className="p-3 font-medium">PO Number</th>
                <th className="p-3 font-medium">Vendor</th>
                <th className="p-3 font-medium">Items</th>
                <th className="p-3 font-medium">Amount</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Date</th>
                <th className="p-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {purchaseOrders.slice(0, 10).map((po) => (
                <tr key={po.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="p-3">
                    <span className="font-mono text-blue-400">{po.poNumber}</span>
                  </td>
                  <td className="p-3">
                    <p className="text-white">{po.vendorName}</p>
                  </td>
                  <td className="p-3 text-zinc-400">{po.items.length} items</td>
                  <td className="p-3 text-white font-medium">{formatCurrency(po.totalAmount)}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      po.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                      po.status === 'pending_md_approval' ? 'bg-yellow-500/20 text-yellow-400' :
                      po.status === 'received' ? 'bg-blue-500/20 text-blue-400' :
                      po.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                      'bg-zinc-500/20 text-zinc-400'
                    }`}>
                      {po.status.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="p-3 text-zinc-400 text-sm">
                    {new Date(po.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-right">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleViewDetails(po, 'order')}
                      className="w-8 h-8 bg-zinc-800 hover:bg-zinc-700 rounded-lg inline-flex items-center justify-center"
                    >
                      <Eye className="w-4 h-4 text-zinc-400" />
                    </motion.button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
  
  // ==========================================
  // RENDER - Material Requests Tab
  // ==========================================
  
  const renderRequests = () => {
    const filteredRequests = materialRequests.filter(r => {
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          r.requestNumber.toLowerCase().includes(search) ||
          r.requestedByName.toLowerCase().includes(search) ||
          r.department.toLowerCase().includes(search)
        );
      }
      return true;
    });
    
    return (
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="space-y-4"
      >
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search requests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="converted_to_pr">Converted to PR</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        
        {/* Requests List */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-zinc-500 bg-zinc-900/50">
                  <th className="p-4 font-medium">Request #</th>
                  <th className="p-4 font-medium">Requested By</th>
                  <th className="p-4 font-medium">Department</th>
                  <th className="p-4 font-medium">Items</th>
                  <th className="p-4 font-medium">Urgency</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Date</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredRequests.map((request) => (
                  <motion.tr
                    key={request.id}
                    variants={fadeInUp}
                    className="hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="p-4">
                      <span className="font-mono text-blue-400">{request.requestNumber}</span>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="text-white">{request.requestedByName}</p>
                        <p className="text-xs text-zinc-500">{request.requestedByRole}</p>
                      </div>
                    </td>
                    <td className="p-4 text-zinc-300">{request.department}</td>
                    <td className="p-4 text-zinc-400">{request.items.length} items</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        request.urgency === 'critical' ? 'bg-red-500/20 text-red-400' :
                        request.urgency === 'high' ? 'bg-orange-500/20 text-orange-400' :
                        request.urgency === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-zinc-500/20 text-zinc-400'
                      }`}>
                        {request.urgency.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        request.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        request.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                        request.status === 'converted_to_pr' ? 'bg-blue-500/20 text-blue-400' :
                        request.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                        'bg-zinc-500/20 text-zinc-400'
                      }`}>
                        {request.status.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-zinc-400 text-sm">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleViewDetails(request, 'request')}
                          className="w-8 h-8 bg-zinc-800 hover:bg-zinc-700 rounded-lg flex items-center justify-center"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4 text-zinc-400" />
                        </motion.button>
                        
                        {request.status === 'pending' && (
                          <>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleApproveRequest(request)}
                              disabled={isSubmitting}
                              className="w-8 h-8 bg-green-500/20 hover:bg-green-500/30 rounded-lg flex items-center justify-center"
                              title="Approve"
                            >
                              <Check className="w-4 h-4 text-green-400" />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => openRejectModal(request)}
                              disabled={isSubmitting}
                              className="w-8 h-8 bg-red-500/20 hover:bg-red-500/30 rounded-lg flex items-center justify-center"
                              title="Reject"
                            >
                              <X className="w-4 h-4 text-red-400" />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleConvertToPR(request)}
                              disabled={isSubmitting}
                              className="w-8 h-8 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg flex items-center justify-center"
                              title="Convert to PR"
                            >
                              <ArrowRight className="w-4 h-4 text-blue-400" />
                            </motion.button>
                          </>
                        )}
                        
                        {request.status === 'converted_to_pr' && request.linkedPRNumber && (
                          <span className="text-xs text-blue-400 font-mono">
                            → {request.linkedPRNumber}
                          </span>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredRequests.length === 0 && (
            <div className="p-12 text-center">
              <ClipboardList className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500">No material requests found</p>
            </div>
          )}
        </div>
      </motion.div>
    );
  };
  
  // ==========================================
  // RENDER - Purchase Requisitions Tab
  // ==========================================
  
  const renderRequisitions = () => {
    const filteredPRs = purchaseRequisitions.filter(pr => {
      if (filterStatus !== 'all' && pr.status !== filterStatus) return false;
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          pr.prNumber.toLowerCase().includes(search) ||
          pr.createdByName.toLowerCase().includes(search) ||
          (pr.department && pr.department.toLowerCase().includes(search))
        );
      }
      return true;
    });
    
    return (
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="space-y-4"
      >
        {/* Actions & Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search PRs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="all">All Status</option>
              <option value="submitted">Submitted</option>
              <option value="enquiry_sent">Enquiry Sent</option>
              <option value="quotes_received">Quotes Received</option>
              <option value="po_created">PO Created</option>
            </select>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowCreatePRModal(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl flex items-center gap-2 font-medium shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" />
            Create PR
          </motion.button>
        </div>
        
        {/* PRs Table */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-zinc-500 bg-zinc-900/50">
                  <th className="p-4 font-medium">PR Number</th>
                  <th className="p-4 font-medium">Source</th>
                  <th className="p-4 font-medium">Department</th>
                  <th className="p-4 font-medium">Items</th>
                  <th className="p-4 font-medium">Est. Amount</th>
                  <th className="p-4 font-medium">Priority</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Required By</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredPRs.map((pr) => (
                  <motion.tr
                    key={pr.id}
                    variants={fadeInUp}
                    className="hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="p-4">
                      <span className="font-mono text-blue-400">{pr.prNumber}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {pr.sourceType === 'material_request' && (
                          <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">
                            MR
                          </span>
                        )}
                        {pr.sourceType === 'stock_alert' && (
                          <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs">
                            Low Stock
                          </span>
                        )}
                        {pr.sourceType === 'manual' && (
                          <span className="px-2 py-0.5 bg-zinc-500/20 text-zinc-400 rounded text-xs">
                            Manual
                          </span>
                        )}
                        {pr.sourceNumber && (
                          <span className="text-xs text-zinc-500">{pr.sourceNumber}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-zinc-300">{pr.department || '-'}</td>
                    <td className="p-4 text-zinc-400">{pr.items.length} items</td>
                    <td className="p-4 text-white font-medium">
                      {formatCurrency(pr.totalEstimatedAmount)}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        pr.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                        pr.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                        pr.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-zinc-500/20 text-zinc-400'
                      }`}>
                        {pr.priority.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        pr.status === 'submitted' ? 'bg-blue-500/20 text-blue-400' :
                        pr.status === 'enquiry_sent' ? 'bg-purple-500/20 text-purple-400' :
                        pr.status === 'quotes_received' ? 'bg-yellow-500/20 text-yellow-400' :
                        pr.status === 'po_created' ? 'bg-green-500/20 text-green-400' :
                        'bg-zinc-500/20 text-zinc-400'
                      }`}>
                        {pr.status.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-zinc-400 text-sm">
                      {new Date(pr.requiredDate).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleViewDetails(pr, 'requisition')}
                          className="w-8 h-8 bg-zinc-800 hover:bg-zinc-700 rounded-lg flex items-center justify-center"
                        >
                          <Eye className="w-4 h-4 text-zinc-400" />
                        </motion.button>
                        
                        {pr.status === 'submitted' && (
                          <>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              className="w-8 h-8 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg flex items-center justify-center"
                              title="Send Enquiry"
                            >
                              <Send className="w-4 h-4 text-blue-400" />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => {
                                setSelectedItem(pr);
                                setSelectedItemType('requisition');
                                setShowCreatePOModal(true);
                              }}
                              className="w-8 h-8 bg-green-500/20 hover:bg-green-500/30 rounded-lg flex items-center justify-center"
                              title="Direct Create PO"
                            >
                              <ShoppingCart className="w-4 h-4 text-green-400" />
                            </motion.button>
                          </>
                        )}
                        
                        {pr.status === 'quotes_received' && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => {
                              setSelectedItem(pr);
                              setSelectedItemType('requisition');
                              setShowCreatePOModal(true);
                            }}
                            className="w-8 h-8 bg-green-500/20 hover:bg-green-500/30 rounded-lg flex items-center justify-center"
                            title="Create PO"
                          >
                            <ShoppingCart className="w-4 h-4 text-green-400" />
                          </motion.button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredPRs.length === 0 && (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500">No purchase requisitions found</p>
            </div>
          )}
        </div>
      </motion.div>
    );
  };
  
  // ==========================================
  // RENDER - Purchase Orders Tab
  // ==========================================
  
  const renderOrders = () => {
    const filteredPOs = purchaseOrders.filter(po => {
      if (filterStatus !== 'all' && po.status !== filterStatus) return false;
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          po.poNumber.toLowerCase().includes(search) ||
          po.vendorName.toLowerCase().includes(search)
        );
      }
      return true;
    });
    
    return (
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="space-y-4"
      >
        {/* Actions & Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search POs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="pending_md_approval">Pending MD Approval</option>
              <option value="approved">Approved</option>
              <option value="ordered">Ordered</option>
              <option value="partially_received">Partially Received</option>
              <option value="received">Received</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowDirectPOModal(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl flex items-center gap-2 font-medium shadow-lg shadow-cyan-500/20"
            >
              <Plus className="w-4 h-4" />
              Direct PO
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowCreatePOModal(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white rounded-xl flex items-center gap-2 font-medium shadow-lg shadow-green-500/20"
            >
              <Plus className="w-4 h-4" />
              PO from PR
            </motion.button>
          </div>
        </div>
        
        {/* POs Table */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-zinc-500 bg-zinc-900/50">
                  <th className="p-4 font-medium">PO Number</th>
                  <th className="p-4 font-medium">Vendor</th>
                  <th className="p-4 font-medium">PR Ref</th>
                  <th className="p-4 font-medium">Items</th>
                  <th className="p-4 font-medium">Amount</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Expected</th>
                  <th className="p-4 font-medium">Received</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredPOs.map((po) => (
                  <motion.tr
                    key={po.id}
                    variants={fadeInUp}
                    className="hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="p-4">
                      <span className="font-mono text-blue-400">{po.poNumber}</span>
                      {po.requiresMDApproval && (
                        <span className="ml-2 px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs">
                          MD
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <p className="text-white">{po.vendorName}</p>
                      <p className="text-xs text-zinc-500">{po.vendorContact}</p>
                    </td>
                    <td className="p-4">
                      {po.prNumber ? (
                        <span className="text-purple-400 text-sm font-mono">{po.prNumber}</span>
                      ) : (
                        <span className="text-zinc-500">-</span>
                      )}
                    </td>
                    <td className="p-4 text-zinc-400">{po.items.length} items</td>
                    <td className="p-4">
                      <p className="text-white font-medium">{formatCurrency(po.totalAmount)}</p>
                      <p className="text-xs text-zinc-500">Tax: {formatCurrency(po.taxAmount)}</p>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        po.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                        po.status === 'pending_md_approval' ? 'bg-yellow-500/20 text-yellow-400' :
                        po.status === 'ordered' ? 'bg-blue-500/20 text-blue-400' :
                        po.status === 'partially_received' ? 'bg-purple-500/20 text-purple-400' :
                        po.status === 'received' ? 'bg-emerald-500/20 text-emerald-400' :
                        po.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                        'bg-zinc-500/20 text-zinc-400'
                      }`}>
                        {po.status.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-zinc-400 text-sm">
                      {po.expectedDelivery ? new Date(po.expectedDelivery).toLocaleDateString() : '-'}
                    </td>
                    <td className="p-4">
                      {po.items.some(i => i.receivedQty > 0) ? (
                        <div className="text-xs">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-green-500 rounded-full"
                                style={{ 
                                  width: `${Math.min(100, (po.totalReceivedQty / po.items.reduce((s, i) => s + i.quantity, 0)) * 100)}%` 
                                }}
                              />
                            </div>
                            <span className="text-zinc-400">
                              {Math.round((po.totalReceivedQty / po.items.reduce((s, i) => s + i.quantity, 0)) * 100)}%
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-zinc-500">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleViewDetails(po, 'order')}
                          className="w-8 h-8 bg-zinc-800 hover:bg-zinc-700 rounded-lg flex items-center justify-center"
                        >
                          <Eye className="w-4 h-4 text-zinc-400" />
                        </motion.button>
                        
                        {po.status === 'approved' && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => markPOAsOrdered(po.id, currentUser.id)}
                            className="w-8 h-8 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg flex items-center justify-center"
                            title="Mark as Ordered"
                          >
                            <Send className="w-4 h-4 text-blue-400" />
                          </motion.button>
                        )}
                        
                        {po.status === 'pending_md_approval' && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => {
                              const message = `🔔 *PO Approval Reminder*\n\n` +
                                `PO: ${po.poNumber}\n` +
                                `Amount: ${formatCurrency(po.totalAmount)}\n` +
                                `Vendor: ${po.vendorName}\n` +
                                `Items: ${po.items.length} items\n\n` +
                                `Please review at:\nhttps://trio-1268.vercel.app/rnd`;
                              window.open(`https://wa.me/917981085020?text=${encodeURIComponent(message)}`, '_blank');
                            }}
                            className="w-8 h-8 bg-yellow-500/20 hover:bg-yellow-500/30 rounded-lg flex items-center justify-center animate-pulse"
                            title="Notify MD for Approval"
                          >
                            <Bell className="w-4 h-4 text-yellow-400" />
                          </motion.button>
                        )}
                        
                        {(po.status === 'ordered' || po.status === 'partially_received') && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => {
                              setSelectedItem(po);
                              setSelectedItemType('order');
                              setShowCreateGRNModal(true);
                            }}
                            className="w-8 h-8 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg flex items-center justify-center"
                            title="Receive Goods (GRN)"
                          >
                            <PackageCheck className="w-4 h-4 text-purple-400" />
                          </motion.button>
                        )}
                        
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => {
                            setPrintingPO(po);
                            // Wait for state to update and template to render
                            setTimeout(() => {
                              handlePrint();
                            }, 300);
                          }}
                          className="w-8 h-8 bg-zinc-800 hover:bg-zinc-700 rounded-lg flex items-center justify-center"
                          title="Print PO"
                        >
                          <Printer className="w-4 h-4 text-zinc-400" />
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredPOs.length === 0 && (
            <div className="p-12 text-center">
              <ShoppingCart className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500">No purchase orders found</p>
            </div>
          )}
        </div>
      </motion.div>
    );
  };
  
  // ==========================================
  // RENDER - Goods Receipts Tab
  // ==========================================
  
  const renderReceipts = () => {
    const filteredGRNs = goodsReceipts.filter(grn => {
      if (filterStatus !== 'all' && grn.status !== filterStatus) return false;
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          grn.grnNumber.toLowerCase().includes(search) ||
          grn.poNumber.toLowerCase().includes(search) ||
          grn.vendorName.toLowerCase().includes(search)
        );
      }
      return true;
    });
    
    return (
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="space-y-4"
      >
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search GRNs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="quality_check">Quality Check</option>
            <option value="verified">Verified</option>
            <option value="stock_updated">Stock Updated</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        
        {/* GRNs Table */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-zinc-500 bg-zinc-900/50">
                  <th className="p-4 font-medium">GRN Number</th>
                  <th className="p-4 font-medium">PO Reference</th>
                  <th className="p-4 font-medium">Vendor</th>
                  <th className="p-4 font-medium">Items</th>
                  <th className="p-4 font-medium">Value</th>
                  <th className="p-4 font-medium">Received By</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Date</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredGRNs.map((grn) => (
                  <motion.tr
                    key={grn.id}
                    variants={fadeInUp}
                    className="hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="p-4">
                      <span className="font-mono text-green-400">{grn.grnNumber}</span>
                    </td>
                    <td className="p-4">
                      <span className="font-mono text-blue-400">{grn.poNumber}</span>
                    </td>
                    <td className="p-4 text-white">{grn.vendorName}</td>
                    <td className="p-4 text-zinc-400">{grn.items.length} items</td>
                    <td className="p-4 text-white font-medium">
                      {formatCurrency(grn.totalReceivedValue)}
                    </td>
                    <td className="p-4">
                      <p className="text-zinc-300">{grn.receivedByName}</p>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        grn.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                        grn.status === 'verified' ? 'bg-blue-500/20 text-blue-400' :
                        grn.status === 'quality_check' ? 'bg-yellow-500/20 text-yellow-400' :
                        grn.status === 'stock_updated' ? 'bg-emerald-500/20 text-emerald-400' :
                        'bg-zinc-500/20 text-zinc-400'
                      }`}>
                        {grn.status.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-zinc-400 text-sm">
                      {new Date(grn.receivedAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleViewDetails(grn, 'receipt')}
                          className="w-8 h-8 bg-zinc-800 hover:bg-zinc-700 rounded-lg flex items-center justify-center"
                        >
                          <Eye className="w-4 h-4 text-zinc-400" />
                        </motion.button>
                        
                        {grn.status === 'verified' && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => updateMaterialStock(grn)}
                            className="w-8 h-8 bg-green-500/20 hover:bg-green-500/30 rounded-lg flex items-center justify-center"
                            title="Update Stock"
                          >
                            <Boxes className="w-4 h-4 text-green-400" />
                          </motion.button>
                        )}
                        
                        {(grn.status === 'verified' || grn.status === 'stock_updated' || grn.status === 'completed') && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => {
                              setSelectedItem(grn);
                              setSelectedItemType('receipt');
                              setShowCreateInvoiceModal(true);
                            }}
                            className="w-8 h-8 bg-cyan-500/20 hover:bg-cyan-500/30 rounded-lg flex items-center justify-center"
                            title="Create Invoice"
                          >
                            <Receipt className="w-4 h-4 text-cyan-400" />
                          </motion.button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredGRNs.length === 0 && (
            <div className="p-12 text-center">
              <PackageCheck className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500">No goods receipts found</p>
              <p className="text-zinc-600 text-sm mt-1">GRNs are created from Store when goods arrive</p>
            </div>
          )}
        </div>
      </motion.div>
    );
  };
  
  // ==========================================
  // RENDER - Invoices Tab
  // ==========================================
  
  const renderInvoices = () => {
    const filteredInvoices = invoices.filter(inv => {
      if (filterStatus !== 'all' && inv.status !== filterStatus) return false;
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          inv.invoiceNumber.toLowerCase().includes(search) ||
          inv.vendorInvoiceNumber.toLowerCase().includes(search) ||
          inv.vendorName.toLowerCase().includes(search)
        );
      }
      return true;
    });
    
    return (
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="space-y-4"
      >
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="payment_pending">Payment Pending</option>
            <option value="paid">Paid</option>
            <option value="disputed">Disputed</option>
          </select>
        </div>
        
        {/* Invoices Table */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-zinc-500 bg-zinc-900/50">
                  <th className="p-4 font-medium">Invoice #</th>
                  <th className="p-4 font-medium">Vendor Invoice</th>
                  <th className="p-4 font-medium">Vendor</th>
                  <th className="p-4 font-medium">PO / GRN</th>
                  <th className="p-4 font-medium">Amount</th>
                  <th className="p-4 font-medium">Tax</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Due Date</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredInvoices.map((inv) => (
                  <motion.tr
                    key={inv.id}
                    variants={fadeInUp}
                    className="hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="p-4">
                      <span className="font-mono text-purple-400">{inv.invoiceNumber}</span>
                    </td>
                    <td className="p-4 text-zinc-300">{inv.vendorInvoiceNumber}</td>
                    <td className="p-4">
                      <p className="text-white">{inv.vendorName}</p>
                      {inv.vendorGST && (
                        <p className="text-xs text-zinc-500">GST: {inv.vendorGST}</p>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="text-xs space-y-1">
                        <span className="text-blue-400 font-mono">{inv.poNumber}</span>
                        <span className="mx-1 text-zinc-600">/</span>
                        <span className="text-green-400 font-mono">{inv.grnNumber}</span>
                      </div>
                    </td>
                    <td className="p-4 text-white font-medium">
                      {formatCurrency(inv.totalAmount)}
                    </td>
                    <td className="p-4 text-zinc-400">
                      {formatCurrency(inv.totalTax)}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        inv.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                        inv.status === 'verified' ? 'bg-blue-500/20 text-blue-400' :
                        inv.status === 'payment_pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        inv.status === 'disputed' ? 'bg-red-500/20 text-red-400' :
                        'bg-zinc-500/20 text-zinc-400'
                      }`}>
                        {inv.status.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-zinc-400 text-sm">
                      {new Date(inv.dueDate).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleViewDetails(inv, 'invoice')}
                          className="w-8 h-8 bg-zinc-800 hover:bg-zinc-700 rounded-lg flex items-center justify-center"
                        >
                          <Eye className="w-4 h-4 text-zinc-400" />
                        </motion.button>
                        
                        {inv.status === 'verified' && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => updateInvoiceStatus(inv.id, 'paid', { paymentDate: new Date().toISOString() })}
                            className="w-8 h-8 bg-green-500/20 hover:bg-green-500/30 rounded-lg flex items-center justify-center"
                            title="Mark as Paid"
                          >
                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                          </motion.button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredInvoices.length === 0 && (
            <div className="p-12 text-center">
              <Receipt className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500">No invoices found</p>
            </div>
          )}
        </div>
      </motion.div>
    );
  };
  
  // ==========================================
  // RENDER - View Details Modal
  // ==========================================
  
  const renderViewModal = () => {
    if (!selectedItem) return null;
    
    return (
      <AnimatePresence>
        {showViewModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowViewModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {selectedItemType === 'request' && 'Material Request Details'}
                    {selectedItemType === 'requisition' && 'Purchase Requisition Details'}
                    {selectedItemType === 'order' && 'Purchase Order Details'}
                    {selectedItemType === 'receipt' && 'Goods Receipt Details'}
                    {selectedItemType === 'invoice' && 'Invoice Details'}
                  </h2>
                  <p className="text-zinc-500 text-sm mt-1">
                    {selectedItemType === 'request' && (selectedItem as MaterialRequest).requestNumber}
                    {selectedItemType === 'requisition' && (selectedItem as PurchaseRequisition).prNumber}
                    {selectedItemType === 'order' && (selectedItem as PurchaseOrder).poNumber}
                    {selectedItemType === 'receipt' && (selectedItem as GoodsReceipt).grnNumber}
                    {selectedItemType === 'invoice' && (selectedItem as PurchaseInvoice).invoiceNumber}
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowViewModal(false)}
                  className="w-10 h-10 bg-zinc-800 hover:bg-zinc-700 rounded-xl flex items-center justify-center"
                >
                  <X className="w-5 h-5 text-zinc-400" />
                </motion.button>
              </div>
              
              {/* Modal Body */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                {/* Material Request Details */}
                {selectedItemType === 'request' && (() => {
                  const request = selectedItem as MaterialRequest;
                  return (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-zinc-500 text-xs">Requested By</p>
                          <p className="text-white font-medium">{request.requestedByName}</p>
                          <p className="text-zinc-500 text-xs">{request.requestedByRole}</p>
                        </div>
                        <div>
                          <p className="text-zinc-500 text-xs">Department</p>
                          <p className="text-white font-medium">{request.department}</p>
                        </div>
                        <div>
                          <p className="text-zinc-500 text-xs">Urgency</p>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            request.urgency === 'critical' ? 'bg-red-500/20 text-red-400' :
                            request.urgency === 'high' ? 'bg-orange-500/20 text-orange-400' :
                            request.urgency === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-zinc-500/20 text-zinc-400'
                          }`}>
                            {request.urgency.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-zinc-500 text-xs">Status</p>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            request.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                            request.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                            request.status === 'converted_to_pr' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {request.status.replace(/_/g, ' ').toUpperCase()}
                          </span>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-zinc-500 text-xs mb-1">Reason</p>
                        <p className="text-zinc-300">{request.reason}</p>
                      </div>
                      
                      <div>
                        <p className="text-zinc-500 text-xs mb-3">Requested Items ({request.items.length})</p>
                        <div className="bg-zinc-800/50 rounded-xl overflow-hidden">
                          <table className="w-full">
                            <thead>
                              <tr className="text-left text-xs text-zinc-500 border-b border-zinc-700">
                                <th className="p-3">Material</th>
                                <th className="p-3">Code</th>
                                <th className="p-3">Current Stock</th>
                                <th className="p-3">Requested</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-700">
                              {request.items.map((item, idx) => (
                                <tr key={idx}>
                                  <td className="p-3 text-white">{item.materialName}</td>
                                  <td className="p-3 text-zinc-400 font-mono text-sm">{item.materialCode}</td>
                                  <td className="p-3 text-zinc-400">{item.currentStock} {item.unit}</td>
                                  <td className="p-3 text-blue-400 font-medium">{item.requestedQty} {item.unit}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      
                      {request.linkedPRNumber && (
                        <div className="flex items-center gap-2 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                          <Link2 className="w-5 h-5 text-blue-400" />
                          <span className="text-zinc-300">Linked to PR:</span>
                          <span className="text-blue-400 font-mono font-medium">{request.linkedPRNumber}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}
                
                {/* Purchase Order Details */}
                {selectedItemType === 'order' && (() => {
                  const po = selectedItem as PurchaseOrder;
                  return (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-zinc-500 text-xs">Vendor</p>
                          <p className="text-white font-medium">{po.vendorName}</p>
                          <p className="text-zinc-500 text-xs">{po.vendorContact}</p>
                        </div>
                        <div>
                          <p className="text-zinc-500 text-xs">Total Amount</p>
                          <p className="text-white font-bold text-lg">{formatCurrency(po.totalAmount)}</p>
                        </div>
                        <div>
                          <p className="text-zinc-500 text-xs">Status</p>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            po.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                            po.status === 'pending_md_approval' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-zinc-500/20 text-zinc-400'
                          }`}>
                            {po.status.replace(/_/g, ' ').toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-zinc-500 text-xs">Created</p>
                          <p className="text-white">{new Date(po.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-zinc-500 text-xs mb-3">Order Items ({po.items.length})</p>
                        <div className="bg-zinc-800/50 rounded-xl overflow-hidden">
                          <table className="w-full">
                            <thead>
                              <tr className="text-left text-xs text-zinc-500 border-b border-zinc-700">
                                <th className="p-3">Material</th>
                                <th className="p-3">Qty</th>
                                <th className="p-3">Unit Price</th>
                                <th className="p-3">Total</th>
                                <th className="p-3">Received</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-700">
                              {po.items.map((item, idx) => (
                                <tr key={idx}>
                                  <td className="p-3 text-white">{item.materialName}</td>
                                  <td className="p-3 text-zinc-400">{item.quantity} {item.unit}</td>
                                  <td className="p-3 text-zinc-400">{formatCurrency(item.unitPrice)}</td>
                                  <td className="p-3 text-white font-medium">{formatCurrency(item.totalPrice)}</td>
                                  <td className="p-3">
                                    <span className={item.receivedQty >= item.quantity ? 'text-green-400' : 'text-yellow-400'}>
                                      {item.receivedQty || 0} / {item.quantity}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="border-t border-zinc-700">
                              <tr>
                                <td colSpan={3} className="p-3 text-right text-zinc-400">Subtotal:</td>
                                <td className="p-3 text-white">{formatCurrency(po.subtotal)}</td>
                                <td></td>
                              </tr>
                              <tr>
                                <td colSpan={3} className="p-3 text-right text-zinc-400">Tax ({po.taxPercent}%):</td>
                                <td className="p-3 text-white">{formatCurrency(po.taxAmount)}</td>
                                <td></td>
                              </tr>
                              <tr>
                                <td colSpan={3} className="p-3 text-right text-zinc-400 font-medium">Total:</td>
                                <td className="p-3 text-white font-bold text-lg">{formatCurrency(po.totalAmount)}</td>
                                <td></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                      
                      {po.prNumber && (
                        <div className="flex items-center gap-2 p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                          <Link2 className="w-5 h-5 text-purple-400" />
                          <span className="text-zinc-300">From PR:</span>
                          <span className="text-purple-400 font-mono font-medium">{po.prNumber}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}
                
                {/* Goods Receipt (GRN) Details */}
                {selectedItemType === 'receipt' && (() => {
                  const grn = selectedItem as GoodsReceipt;
                  return (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-zinc-500 text-xs">Vendor</p>
                          <p className="text-white font-medium">{grn.vendorName}</p>
                        </div>
                        <div>
                          <p className="text-zinc-500 text-xs">PO Reference</p>
                          <p className="text-blue-400 font-mono font-medium">{grn.poNumber}</p>
                        </div>
                        <div>
                          <p className="text-zinc-500 text-xs">Status</p>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            grn.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                            grn.status === 'verified' ? 'bg-blue-500/20 text-blue-400' :
                            grn.status === 'quality_check' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-zinc-500/20 text-zinc-400'
                          }`}>
                            {grn.status.replace(/_/g, ' ').toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-zinc-500 text-xs">Received Date</p>
                          <p className="text-white">{new Date(grn.receivedAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-zinc-500 text-xs">Received By</p>
                          <p className="text-white">{grn.receivedByName}</p>
                        </div>
                        <div>
                          <p className="text-zinc-500 text-xs">Total Value</p>
                          <p className="text-white font-bold text-lg">{formatCurrency(grn.totalReceivedValue)}</p>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-zinc-500 text-xs mb-3">Received Items ({grn.items.length})</p>
                        <div className="bg-zinc-800/50 rounded-xl overflow-hidden">
                          <table className="w-full">
                            <thead>
                              <tr className="text-left text-xs text-zinc-500 border-b border-zinc-700">
                                <th className="p-3">Material</th>
                                <th className="p-3">Ordered</th>
                                <th className="p-3">Received</th>
                                <th className="p-3">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-700">
                              {grn.items.map((item, idx) => (
                                <tr key={idx}>
                                  <td className="p-3 text-white">{item.materialName}</td>
                                  <td className="p-3 text-zinc-400">{item.orderedQty} {item.unit}</td>
                                  <td className="p-3">
                                    <span className={item.receivedQty >= item.orderedQty ? 'text-green-400' : 'text-yellow-400'}>
                                      {item.receivedQty} {item.unit}
                                    </span>
                                  </td>
                                  <td className="p-3">
                                    <span className={`px-2 py-0.5 rounded text-xs ${
                                      item.qualityStatus === 'passed' ? 'bg-green-500/20 text-green-400' :
                                      item.qualityStatus === 'failed' ? 'bg-red-500/20 text-red-400' :
                                      'bg-yellow-500/20 text-yellow-400'
                                    }`}>
                                      {(item.qualityStatus || 'pending').toUpperCase()}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      
                      {grn.remarks && (
                        <div className="p-4 bg-zinc-800/50 rounded-xl">
                          <p className="text-zinc-500 text-xs mb-1">Remarks</p>
                          <p className="text-zinc-300">{grn.remarks}</p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
              
              {/* Modal Footer */}
              <div className="p-6 border-t border-zinc-800 flex items-center justify-between gap-3">
                {/* Copy Type Selector (for PO) */}
                {selectedItemType === 'order' && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400">Copy:</span>
                    <select
                      value={printCopyType}
                      onChange={(e) => setPrintCopyType(e.target.value as 'ORIGINAL' | 'DUPLICATE' | 'VENDOR COPY' | 'OFFICE COPY')}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white"
                    >
                      <option value="ORIGINAL">Original</option>
                      <option value="DUPLICATE">Duplicate</option>
                      <option value="VENDOR COPY">Vendor Copy</option>
                      <option value="OFFICE COPY">Office Copy</option>
                    </select>
                  </div>
                )}
                {selectedItemType !== 'order' && <div />}
                
                <div className="flex items-center gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowViewModal(false)}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl"
                  >
                    Close
                  </motion.button>
                  {selectedItemType === 'order' && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handlePrint()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl flex items-center gap-2"
                    >
                      <Printer className="w-4 h-4" />
                      Print
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };
  
  // ==========================================
  // PRINT FUNCTIONALITY
  // ==========================================
  
  // Convert PurchaseOrder to PurchaseOrderData for printing
  const convertPOToPrintData = (po: PurchaseOrder): PurchaseOrderData => {
    const vendor = suppliers.find(s => s.id === po.vendorId) || {
      name: po.vendorName,
      contact: po.vendorContact || '',
      email: '',
      phone: '',
      gst: '',
      address: ''
    };
    
    return {
      poNumber: po.poNumber,
      poDate: new Date(po.createdAt).toISOString().split('T')[0],
      prNumber: po.prNumber,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      expectedDelivery: po.expectedDelivery || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      deliveryLocation: 'Unit-I, Kopparthy',
      
      vendor: {
        name: vendor.name || po.vendorName,
        address: vendor.address || '',
        gstin: vendor.gst || '',
        stateCode: '37',
        contactPerson: vendor.contact || po.vendorContact || '',
        phone: vendor.phone || '',
        email: vendor.email || ''
      },
      
      buyer: {
        name: COMPANY_INFO.name,
        unit: 'Unit - I',
        address: COMPANY_INFO.units.unit1.address,
        gstin: COMPANY_INFO.gstin,
        stateCode: '37',
        phone: COMPANY_INFO.units.unit1.phone,
        email: COMPANY_INFO.email
      },
      
      shipTo: {
        name: COMPANY_INFO.name,
        address: COMPANY_INFO.units.unit1.address,
        phone: COMPANY_INFO.units.unit1.phone,
        contactPerson: 'Store Manager'
      },
      
      items: po.items.map((item, idx) => {
        const taxableValue = item.totalPrice;
        const gstRate = po.taxPercent || 18;
        const gstAmount = taxableValue * (gstRate / 100);
        return {
          slNo: idx + 1,
          itemCode: item.materialCode || `MAT-${idx + 1}`,
          description: item.materialName,
          hsnCode: '39269099',
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          discount: 0,
          taxableValue: taxableValue,
          gstRate: gstRate,
          gstAmount: gstAmount,
          totalAmount: taxableValue + gstAmount
        };
      }),
      
      subtotal: po.subtotal,
      totalDiscount: 0,
      taxableAmount: po.subtotal,
      cgst: po.taxAmount / 2,
      sgst: po.taxAmount / 2,
      igst: 0,
      roundOff: 0,
      grandTotal: po.totalAmount,
      
      paymentTerms: '30 Days from Invoice Date',
      deliveryTerms: 'Ex-Works',
      warranty: 'As per standard terms',
      termsAndConditions: DEFAULT_PO_TERMS,
      
      preparedBy: currentUser.name,
      approvedBy: po.status === 'approved' || po.status === 'ordered' ? 'Managing Director' : undefined,
      approvedDate: po.orderedAt ? new Date(po.orderedAt).toISOString().split('T')[0] : undefined,
      mdApprovalRequired: po.requiresMDApproval,
      mdApproved: po.status === 'approved' || po.status === 'ordered' || po.status === 'received',
      status: po.status === 'approved' ? 'Approved' : 
              po.status === 'pending_md_approval' ? 'Pending Approval' :
              po.status === 'ordered' ? 'Sent to Vendor' :
              po.status === 'received' ? 'Completed' :
              po.status === 'cancelled' ? 'Cancelled' : 'Draft'
    };
  };
  
  // Get current PO for printing (from modal or direct action)
  const getCurrentPrintPO = (): PurchaseOrder | null => {
    if (printingPO) return printingPO;
    if (selectedItemType === 'order' && selectedItem) return selectedItem as PurchaseOrder;
    return null;
  };
  
  // Print handler
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: getCurrentPrintPO() 
      ? `PO_${getCurrentPrintPO()?.poNumber}` 
      : 'Document',
    onAfterPrint: () => {
      setPrintingPO(null);
    },
    pageStyle: `
      @page { size: A4; margin: 10mm; }
      @media print {
        html, body { 
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
    `
  });
  
  // ==========================================
  // MAIN RENDER
  // ==========================================
  
  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    router.push('/login');
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-10 h-10 text-blue-500 animate-spin" />
          <p className="text-zinc-400">Loading procurement data...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header with User Info */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <ShoppingCart className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Purchase Management
            </h1>
            <p className="text-zinc-500 text-sm">
              Complete procurement workflow • PR → PO → GRN → Invoice
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Documents Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/purchase/documents')}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl font-medium shadow-lg shadow-green-500/20 transition-all"
            title="View & Generate Documents (PO, DC, Invoice, GRN)"
          >
            <FileText className="w-4 h-4" />
            <span className="hidden lg:inline">Documents</span>
          </motion.button>
          
          {/* User Info */}
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-zinc-900/50 border border-zinc-800 rounded-xl">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              {currentUser.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div>
              <p className="text-sm text-white font-medium">{currentUser.name}</p>
              <p className="text-xs text-zinc-500 capitalize">{currentUser.role}</p>
            </div>
          </div>
          
          {/* Logout */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLogout}
            className="p-2.5 bg-zinc-800 hover:bg-red-500/20 rounded-xl text-zinc-400 hover:text-red-400 transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </motion.button>
        </div>
      </motion.div>
      
      {/* Quick Stats Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-5 gap-3"
      >
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-white">{materialRequests.filter(r => r.status === 'pending').length}</p>
            <p className="text-xs text-zinc-500">Pending Requests</p>
          </div>
        </div>
        
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-white">{purchaseRequisitions.filter(p => p.status === 'submitted').length}</p>
            <p className="text-xs text-zinc-500">Active PRs</p>
          </div>
        </div>
        
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-white">{purchaseOrders.length}</p>
            <p className="text-xs text-zinc-500">Total POs</p>
          </div>
        </div>
        
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
            <Clock className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-white">{purchaseOrders.filter(p => p.status === 'pending_md_approval').length}</p>
            <p className="text-xs text-zinc-500">Awaiting Approval</p>
          </div>
        </div>
        
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
            <IndianRupee className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-white">{formatCurrency(purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0))}</p>
            <p className="text-xs text-zinc-500">Total PO Value</p>
          </div>
        </div>
      </motion.div>
      
      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex flex-wrap items-center justify-between gap-4 bg-zinc-900/30 border border-zinc-800 rounded-xl p-4"
      >
        <div className="flex flex-wrap items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowDirectPOModal(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl flex items-center gap-2 font-medium shadow-lg shadow-cyan-500/20"
          >
            <Plus className="w-4 h-4" />
            New PO
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowCreatePRModal(true)}
            className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl flex items-center gap-2 font-medium border border-zinc-700"
          >
            <FileText className="w-4 h-4" />
            New PR
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/purchase/documents/dc')}
            className="px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl flex items-center gap-2 font-medium shadow-lg shadow-green-500/20"
          >
            <PackageCheck className="w-4 h-4" />
            Dispatch (DC)
          </motion.button>
        </div>
        
        {/* Notifications */}
        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-12 h-12 bg-zinc-800 hover:bg-zinc-700 rounded-xl flex items-center justify-center relative"
          >
            <Bell className="w-5 h-5 text-zinc-400" />
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </motion.button>
          
          {/* Notifications Dropdown */}
          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 top-14 w-80 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl z-50 overflow-hidden"
              >
                <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                  <h3 className="font-semibold text-white">Notifications</h3>
                  <span className="text-xs text-zinc-500">{unreadNotifications} unread</span>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.slice(0, 10).map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 border-b border-zinc-800 hover:bg-zinc-800/50 cursor-pointer ${
                        !notification.isRead ? 'bg-blue-500/5' : ''
                      }`}
                      onClick={() => markNotificationRead(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 mt-2 rounded-full ${
                          !notification.isRead ? 'bg-blue-500' : 'bg-zinc-600'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium">{notification.title}</p>
                          <p className="text-zinc-500 text-xs mt-1 truncate">{notification.message}</p>
                          <p className="text-zinc-600 text-xs mt-1">
                            {new Date(notification.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
      
      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap gap-2 bg-zinc-900/50 p-2 rounded-2xl border border-zinc-800"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <motion.button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSearchTerm('');
                setFilterStatus('all');
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== null && tab.count > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  isActive ? 'bg-white/20' : 'bg-zinc-700'
                }`}>
                  {tab.count}
                </span>
              )}
            </motion.button>
          );
        })}
      </motion.div>
      
      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'requests' && renderRequests()}
        {activeTab === 'requisitions' && renderRequisitions()}
        {activeTab === 'orders' && renderOrders()}
        {activeTab === 'receipts' && renderReceipts()}
        {activeTab === 'invoices' && renderInvoices()}
      </motion.div>
      
      {/* Modals */}
      {renderViewModal()}
      
      {/* Global Hidden Print Template - always render when there's a PO to print */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -1, width: '210mm' }}>
        {printingPO && (
          <PurchaseOrderTemplate
            ref={printRef}
            data={convertPOToPrintData(printingPO)}
            copyType={printCopyType}
          />
        )}
        {!printingPO && selectedItemType === 'order' && selectedItem && (
          <PurchaseOrderTemplate
            ref={printRef}
            data={convertPOToPrintData(selectedItem as PurchaseOrder)}
            copyType={printCopyType}
          />
        )}
      </div>
      
      {/* Reject Request Modal */}
      <AnimatePresence>
        {showRejectModal && selectedRequestForReject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowRejectModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-800 bg-red-500/10">
                <h3 className="text-xl font-bold text-white">Reject Request</h3>
                <p className="text-sm text-zinc-400 mt-1">
                  Request #{selectedRequestForReject.requestNumber}
                </p>
              </div>
              <div className="p-6">
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Rejection Reason *
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Provide a reason for rejection..."
                  rows={4}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none resize-none"
                />
              </div>
              <div className="p-6 border-t border-zinc-800 flex gap-3">
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectRequest}
                  disabled={!rejectReason.trim() || isSubmitting}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white rounded-xl font-medium transition-colors disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Rejecting...' : 'Reject Request'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Create Manual PR Modal */}
      <AnimatePresence>
        {showCreatePRModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreatePRModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-zinc-800 bg-blue-500/10 sticky top-0">
                <h3 className="text-xl font-bold text-white">Create Manual PR</h3>
                <p className="text-sm text-zinc-400 mt-1">
                  Create a new Purchase Requisition manually
                </p>
              </div>
              <CreatePRForm
                materials={materials}
                onSubmit={handleCreateManualPR}
                onCancel={() => setShowCreatePRModal(false)}
                isSubmitting={isSubmitting}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Create PO Modal */}
      <AnimatePresence>
        {showCreatePOModal && selectedItem && selectedItemType === 'requisition' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreatePOModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-zinc-800 bg-green-500/10 sticky top-0">
                <h3 className="text-xl font-bold text-white">Create Purchase Order</h3>
                <p className="text-sm text-zinc-400 mt-1">
                  From PR: {(selectedItem as PurchaseRequisition).prNumber}
                </p>
              </div>
              <CreatePOForm
                pr={selectedItem as PurchaseRequisition}
                suppliers={suppliers}
                onSubmit={(supplierData) => handleCreatePO(selectedItem as PurchaseRequisition, supplierData)}
                onCancel={() => setShowCreatePOModal(false)}
                isSubmitting={isSubmitting}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Direct PO Modal - Enhanced Odoo-style Form */}
      <AnimatePresence>
        {showDirectPOModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowDirectPOModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-5xl bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden"
            >
              <EnhancedPOForm
                materials={materials}
                suppliers={suppliers}
                onSubmit={async (formData) => {
                  await handleCreateDirectPO({
                    supplierId: formData.vendorId,
                    supplierName: formData.vendorName,
                    items: formData.items.filter(i => i.materialId).map(i => ({
                      materialId: i.materialId,
                      quantity: i.quantity,
                      unitPrice: i.unitPrice,
                    })),
                    paymentTerms: formData.paymentTerms,
                    deliveryTerms: formData.logisticDetails,
                    expectedDelivery: formData.expectedArrival,
                    notes: formData.notes,
                  });
                }}
                onCancel={() => setShowDirectPOModal(false)}
                isSubmitting={isSubmitting}
                mdApprovalThreshold={MD_APPROVAL_THRESHOLD}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Create GRN Modal */}
      <AnimatePresence>
        {showCreateGRNModal && selectedItem && selectedItemType === 'order' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreateGRNModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-zinc-800 bg-purple-500/10 sticky top-0">
                <h3 className="text-xl font-bold text-white">Receive Goods (GRN)</h3>
                <p className="text-sm text-zinc-400 mt-1">
                  From PO: {(selectedItem as PurchaseOrder).poNumber}
                </p>
              </div>
              <CreateGRNForm
                po={selectedItem as PurchaseOrder}
                onSubmit={(receivedItems) => handleCreateGRN(selectedItem as PurchaseOrder, receivedItems)}
                onCancel={() => setShowCreateGRNModal(false)}
                isSubmitting={isSubmitting}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Create Invoice Modal */}
      <AnimatePresence>
        {showCreateInvoiceModal && selectedItem && selectedItemType === 'receipt' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreateInvoiceModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-zinc-800 bg-cyan-500/10 sticky top-0">
                <h3 className="text-xl font-bold text-white">Create Invoice</h3>
                <p className="text-sm text-zinc-400 mt-1">
                  From GRN: {(selectedItem as GoodsReceipt).grnNumber}
                </p>
              </div>
              <CreateInvoiceForm
                grn={selectedItem as GoodsReceipt}
                onSubmit={(invoiceData) => handleCreateInvoice(selectedItem as GoodsReceipt, invoiceData)}
                onCancel={() => setShowCreateInvoiceModal(false)}
                isSubmitting={isSubmitting}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ==========================================
// FORM COMPONENTS
// ==========================================

// Create PR Form Component
function CreatePRForm({ 
  materials, 
  onSubmit, 
  onCancel, 
  isSubmitting 
}: { 
  materials: Material[];
  onSubmit: (data: { items: { materialId: string; materialName: string; requestedQty: number; estimatedPrice: number; unit: string }[]; priority: 'low' | 'medium' | 'high' | 'critical'; requiredDate: string; notes?: string; projectName?: string; department: string }) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  const [items, setItems] = useState([{ materialId: '', requestedQty: 1 }]);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [requiredDate, setRequiredDate] = useState('');
  const [notes, setNotes] = useState('');
  const [projectName, setProjectName] = useState('');
  const [department, setDepartment] = useState('');
  
  const addItem = () => setItems([...items, { materialId: '', requestedQty: 1 }]);
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));
  
  const handleSubmit = () => {
    const formattedItems = items
      .filter(item => item.materialId)
      .map(item => {
        const material = materials.find(m => m.id === item.materialId);
        return {
          materialId: item.materialId,
          materialName: material?.name || '',
          requestedQty: item.requestedQty,
          estimatedPrice: material?.purchase_price || 0,
          unit: material?.unit || 'Pcs',
        };
      });
    
    if (formattedItems.length === 0) {
      alert('Please add at least one item');
      return;
    }
    
    onSubmit({ items: formattedItems, priority, requiredDate, notes, projectName, department });
  };
  
  return (
    <div className="p-6 space-y-6">
      {/* Items */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-3">Items *</label>
        {items.map((item, index) => (
          <div key={index} className="flex gap-3 mb-3">
            <select
              value={item.materialId}
              onChange={(e) => {
                const newItems = [...items];
                newItems[index].materialId = e.target.value;
                setItems(newItems);
              }}
              className="flex-1 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white outline-none"
            >
              <option value="">Select Material</option>
              {materials.map(m => (
                <option key={m.id} value={m.id}>{m.name} ({m.code})</option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              value={item.requestedQty}
              onChange={(e) => {
                const newItems = [...items];
                newItems[index].requestedQty = parseInt(e.target.value) || 1;
                setItems(newItems);
              }}
              className="w-24 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white outline-none"
              placeholder="Qty"
            />
            {items.length > 1 && (
              <button
                onClick={() => removeItem(index)}
                className="px-3 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        ))}
        <button
          onClick={addItem}
          className="w-full py-3 border-2 border-dashed border-zinc-700 hover:border-blue-500 text-zinc-400 hover:text-blue-400 rounded-xl flex items-center justify-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>
      
      {/* Priority & Date */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high' | 'critical')}
            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white outline-none"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Required Date</label>
          <input
            type="date"
            value={requiredDate}
            onChange={(e) => setRequiredDate(e.target.value)}
            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white outline-none"
          />
        </div>
      </div>
      
      {/* Project & Department */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Project</label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Project name"
            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Department *</label>
          <input
            type="text"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="Department"
            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 outline-none"
          />
        </div>
      </div>
      
      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional notes..."
          rows={3}
          className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 outline-none resize-none"
        />
      </div>
      
      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-zinc-800">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-xl font-medium transition-colors disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Creating...' : 'Create PR'}
        </button>
      </div>
    </div>
  );
}

// Create PO Form Component
function CreatePOForm({ 
  pr, 
  suppliers, 
  onSubmit, 
  onCancel, 
  isSubmitting 
}: { 
  pr: PurchaseRequisition;
  suppliers: Supplier[];
  onSubmit: (data: { supplierId: string; supplierName: string; terms: string; deliveryDate: string; paymentTerms: string }) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  const [supplierId, setSupplierId] = useState('');
  const [terms, setTerms] = useState('Standard terms apply');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  
  const selectedSupplier = suppliers.find(s => s.id === supplierId);
  const totalAmount = pr.items.reduce((sum, item) => sum + item.estimatedTotal, 0);
  
  const handleSubmit = () => {
    if (!supplierId) {
      alert('Please select a supplier');
      return;
    }
    onSubmit({ 
      supplierId, 
      supplierName: selectedSupplier?.name || '', 
      terms, 
      deliveryDate, 
      paymentTerms 
    });
  };
  
  return (
    <div className="p-6 space-y-6">
      {/* PR Items Summary */}
      <div className="bg-zinc-800/50 rounded-xl p-4">
        <h4 className="text-sm font-medium text-zinc-400 mb-3">Items from PR</h4>
        <div className="space-y-2">
          {pr.items.map((item, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span className="text-white">{item.materialName}</span>
              <span className="text-zinc-400">{item.requiredQty} {item.unit} × {formatCurrency(item.estimatedUnitPrice)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-zinc-700 flex justify-between">
          <span className="font-medium text-white">Total Amount</span>
          <span className="font-bold text-green-400">{formatCurrency(totalAmount)}</span>
        </div>
        <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <p className="text-xs text-amber-400">⚠️ All POs require MD approval before processing</p>
        </div>
      </div>
      
      {/* Supplier Selection */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">Select Supplier *</label>
        {suppliers.length === 0 ? (
          <div className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-yellow-400 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Loading suppliers...
          </div>
        ) : (
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white outline-none focus:border-blue-500"
          >
            <option value="">Choose a supplier ({suppliers.length} available)</option>
            {suppliers.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
        {selectedSupplier && (
          <div className="mt-2 text-sm text-zinc-500">
            Contact: {selectedSupplier.contact} • {selectedSupplier.email || 'No email'}
          </div>
        )}
      </div>
      
      {/* Delivery & Payment */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Expected Delivery</label>
          <input
            type="date"
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Payment Terms</label>
          <select
            value={paymentTerms}
            onChange={(e) => setPaymentTerms(e.target.value)}
            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white outline-none"
          >
            <option value="Advance">Advance</option>
            <option value="Net 7">Net 7 Days</option>
            <option value="Net 15">Net 15 Days</option>
            <option value="Net 30">Net 30 Days</option>
            <option value="Net 45">Net 45 Days</option>
            <option value="Net 60">Net 60 Days</option>
          </select>
        </div>
      </div>
      
      {/* Terms */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">Terms & Conditions</label>
        <textarea
          value={terms}
          onChange={(e) => setTerms(e.target.value)}
          rows={3}
          className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 outline-none resize-none"
        />
      </div>
      
      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-zinc-800">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !supplierId}
          className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white rounded-xl font-medium transition-colors disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Creating...' : 'Create PO'}
        </button>
      </div>
    </div>
  );
}

// Create GRN Form Component
function CreateGRNForm({ 
  po, 
  onSubmit, 
  onCancel, 
  isSubmitting 
}: { 
  po: PurchaseOrder;
  onSubmit: (receivedItems: { materialId: string; receivedQty: number; remarks?: string }[]) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  const [receivedItems, setReceivedItems] = useState(
    po.items.map(item => ({
      materialId: item.materialId,
      receivedQty: item.pendingQty || item.quantity,
      remarks: '',
    }))
  );
  
  const handleSubmit = () => {
    const validItems = receivedItems.filter(item => item.receivedQty > 0);
    if (validItems.length === 0) {
      alert('Please enter at least one item with received quantity');
      return;
    }
    onSubmit(validItems);
  };
  
  return (
    <div className="p-6 space-y-6">
      {/* PO Info */}
      <div className="bg-zinc-800/50 rounded-xl p-4">
        <div className="flex justify-between text-sm">
          <span className="text-zinc-400">Supplier</span>
          <span className="text-white">{po.vendorName}</span>
        </div>
        <div className="flex justify-between text-sm mt-2">
          <span className="text-zinc-400">Total Amount</span>
          <span className="text-green-400">{formatCurrency(po.totalAmount)}</span>
        </div>
      </div>
      
      {/* Items to Receive */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-3">Items to Receive</label>
        <div className="space-y-4">
          {po.items.map((item, index) => (
            <div key={index} className="bg-zinc-800/50 rounded-xl p-4">
              <div className="flex justify-between mb-3">
                <span className="text-white font-medium">{item.materialName}</span>
                <span className="text-xs text-zinc-500">
                  Ordered: {item.quantity} {item.unit} | Pending: {item.pendingQty || item.quantity}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-500">Received Qty</label>
                  <input
                    type="number"
                    min={0}
                    max={item.pendingQty || item.quantity}
                    value={receivedItems[index]?.receivedQty || 0}
                    onChange={(e) => {
                      const newItems = [...receivedItems];
                      newItems[index].receivedQty = parseInt(e.target.value) || 0;
                      setReceivedItems(newItems);
                    }}
                    className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white outline-none mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500">Remarks</label>
                  <input
                    type="text"
                    value={receivedItems[index]?.remarks || ''}
                    onChange={(e) => {
                      const newItems = [...receivedItems];
                      newItems[index].remarks = e.target.value;
                      setReceivedItems(newItems);
                    }}
                    placeholder="Optional"
                    className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder:text-zinc-500 outline-none mt-1"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-zinc-800">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white rounded-xl font-medium transition-colors disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Processing...' : 'Create GRN & Update Stock'}
        </button>
      </div>
    </div>
  );
}

// Create Invoice Form Component
function CreateInvoiceForm({ 
  grn, 
  onSubmit, 
  onCancel, 
  isSubmitting 
}: { 
  grn: GoodsReceipt;
  onSubmit: (data: { invoiceNumber: string; invoiceDate: string; invoiceAmount: number; taxAmount: number; dueDate: string }) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceAmount, setInvoiceAmount] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [dueDate, setDueDate] = useState('');
  
  const handleSubmit = () => {
    if (!invoiceNumber.trim()) {
      alert('Please enter invoice number');
      return;
    }
    onSubmit({ invoiceNumber, invoiceDate, invoiceAmount, taxAmount, dueDate });
  };
  
  return (
    <div className="p-6 space-y-6">
      {/* GRN Info */}
      <div className="bg-zinc-800/50 rounded-xl p-4">
        <div className="flex justify-between text-sm">
          <span className="text-zinc-400">Supplier</span>
          <span className="text-white">{grn.vendorName}</span>
        </div>
        <div className="flex justify-between text-sm mt-2">
          <span className="text-zinc-400">PO Number</span>
          <span className="text-white">{grn.poNumber}</span>
        </div>
        <div className="flex justify-between text-sm mt-2">
          <span className="text-zinc-400">Items Received</span>
          <span className="text-white">{grn.items.length} items</span>
        </div>
      </div>
      
      {/* Invoice Details */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Invoice Number *</label>
          <input
            type="text"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            placeholder="INV-XXXX"
            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Invoice Date</label>
          <input
            type="date"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white outline-none"
          />
        </div>
      </div>
      
      {/* Amounts */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Invoice Amount</label>
          <input
            type="number"
            min={0}
            value={invoiceAmount}
            onChange={(e) => setInvoiceAmount(parseFloat(e.target.value) || 0)}
            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Tax Amount</label>
          <input
            type="number"
            min={0}
            value={taxAmount}
            onChange={(e) => setTaxAmount(parseFloat(e.target.value) || 0)}
            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Total</label>
          <div className="px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-green-400 font-bold">
            {formatCurrency(invoiceAmount + taxAmount)}
          </div>
        </div>
      </div>
      
      {/* Due Date */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">Due Date</label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white outline-none"
        />
      </div>
      
      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-zinc-800">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !invoiceNumber.trim()}
          className="flex-1 px-4 py-3 bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-600/50 text-white rounded-xl font-medium transition-colors disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Creating...' : 'Create Invoice'}
        </button>
      </div>
    </div>
  );
}
// Direct PO Form Component (without PR)
function DirectPOForm({ 
  materials,
  suppliers,
  onSubmit, 
  onCancel, 
  isSubmitting 
}: { 
  materials: Material[];
  suppliers: Supplier[];
  onSubmit: (data: {
    supplierId: string;
    supplierName: string;
    items: { materialId: string; quantity: number; unitPrice: number }[];
    paymentTerms: string;
    deliveryTerms: string;
    expectedDelivery: string;
    notes?: string;
  }) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  const [supplierId, setSupplierId] = useState('');
  const [items, setItems] = useState([{ materialId: '', quantity: 1, unitPrice: 0 }]);
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [deliveryTerms, setDeliveryTerms] = useState('FOB Destination');
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [notes, setNotes] = useState('');
  
  const selectedSupplier = suppliers.find(s => s.id === supplierId);
  
  const addItem = () => setItems([...items, { materialId: '', quantity: 1, unitPrice: 0 }]);
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));
  
  const updateItem = (index: number, field: string, value: string | number) => {
    const newItems = [...items];
    if (field === 'materialId') {
      const material = materials.find(m => m.id === value);
      newItems[index] = {
        ...newItems[index],
        materialId: value as string,
        unitPrice: material?.purchase_price || 0
      };
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    setItems(newItems);
  };
  
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const taxAmount = subtotal * 0.18;
  const totalAmount = subtotal + taxAmount;
  
  const handleSubmit = () => {
    if (!supplierId) {
      alert('Please select a supplier');
      return;
    }
    const validItems = items.filter(item => item.materialId && item.quantity > 0);
    if (validItems.length === 0) {
      alert('Please add at least one item');
      return;
    }
    if (!expectedDelivery) {
      alert('Please select expected delivery date');
      return;
    }
    
    onSubmit({
      supplierId,
      supplierName: selectedSupplier?.name || '',
      items: validItems,
      paymentTerms,
      deliveryTerms,
      expectedDelivery,
      notes,
    });
  };
  
  return (
    <div className="p-6 space-y-6">
      {/* Supplier Selection */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">Supplier *</label>
        {suppliers.length === 0 ? (
          <div className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-yellow-400 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Loading suppliers...
          </div>
        ) : (
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white outline-none focus:border-blue-500"
          >
            <option value="">Select Supplier ({suppliers.length} available)</option>
            {suppliers.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
        {selectedSupplier && (
          <p className="text-xs text-zinc-500 mt-1">
            Contact: {selectedSupplier.contact} | Email: {selectedSupplier.email || 'N/A'}
          </p>
        )}
      </div>
      
      {/* Items */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-3">Items *</label>
        {items.map((item, index) => (
          <div key={index} className="flex gap-3 mb-3 items-end">
            <div className="flex-1">
              <select
                value={item.materialId}
                onChange={(e) => updateItem(index, 'materialId', e.target.value)}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white outline-none"
              >
                <option value="">Select Material</option>
                {materials.map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.code})</option>
                ))}
              </select>
            </div>
            <div className="w-24">
              <input
                type="number"
                min={1}
                value={item.quantity}
                onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                className="w-full px-3 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white outline-none"
                placeholder="Qty"
              />
            </div>
            <div className="w-32">
              <input
                type="number"
                min={0}
                step={0.01}
                value={item.unitPrice}
                onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white outline-none"
                placeholder="Price"
              />
            </div>
            <div className="w-28 text-right">
              <div className="px-3 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-green-400 font-medium">
                {formatCurrency(item.quantity * item.unitPrice)}
              </div>
            </div>
            {items.length > 1 && (
              <button
                onClick={() => removeItem(index)}
                className="px-3 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        ))}
        <button
          onClick={addItem}
          className="w-full py-3 border-2 border-dashed border-zinc-700 hover:border-blue-500 text-zinc-400 hover:text-blue-400 rounded-xl flex items-center justify-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>
      
      {/* Totals */}
      <div className="bg-zinc-800/50 rounded-xl p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-zinc-400">Subtotal</span>
          <span className="text-white">{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-400">GST (18%)</span>
          <span className="text-white">{formatCurrency(taxAmount)}</span>
        </div>
        <div className="flex justify-between text-lg font-bold border-t border-zinc-700 pt-2 mt-2">
          <span className="text-white">Total</span>
          <span className="text-green-400">{formatCurrency(totalAmount)}</span>
        </div>
        {totalAmount >= 50000 && (
          <p className="text-xs text-yellow-400 mt-2">
            ⚠️ Amount exceeds ₹50,000 - MD approval required
          </p>
        )}
      </div>
      
      {/* Terms & Delivery */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Payment Terms</label>
          <select
            value={paymentTerms}
            onChange={(e) => setPaymentTerms(e.target.value)}
            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white outline-none"
          >
            <option value="Net 30">Net 30</option>
            <option value="Net 60">Net 60</option>
            <option value="Net 90">Net 90</option>
            <option value="Advance">100% Advance</option>
            <option value="50% Advance">50% Advance</option>
            <option value="COD">Cash on Delivery</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Delivery Terms</label>
          <select
            value={deliveryTerms}
            onChange={(e) => setDeliveryTerms(e.target.value)}
            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white outline-none"
          >
            <option value="FOB Destination">FOB Destination</option>
            <option value="FOB Origin">FOB Origin</option>
            <option value="Ex-Works">Ex-Works</option>
            <option value="Delivered">Delivered</option>
          </select>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">Expected Delivery *</label>
        <input
          type="date"
          value={expectedDelivery}
          onChange={(e) => setExpectedDelivery(e.target.value)}
          className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white outline-none"
        />
      </div>
      
      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional notes for this PO..."
          rows={2}
          className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 outline-none resize-none"
        />
      </div>
      
      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-zinc-800">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex-1 px-4 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white rounded-xl font-medium transition-colors disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Creating PO...' : 'Create Purchase Order'}
        </button>
      </div>
    </div>
  );
}