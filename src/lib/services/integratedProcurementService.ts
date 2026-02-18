// ==========================================
// INTEGRATED PROCUREMENT SERVICE
// ==========================================
// Connects: Store ↔ Supervisor ↔ Purchase ↔ MD
// Real-time sync across all modules

import { db } from '@/lib/firebase/client';
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  limit,
  writeBatch
} from 'firebase/firestore';

// ==========================================
// COLLECTION NAMES (Centralized)
// ==========================================
export const COLLECTIONS = {
  // Core Inventory (aligned with useInventoryData.ts)
  MATERIALS: 'inventory_materials',
  SUPPLIERS: 'inventory_suppliers',  // Fixed: was 'suppliers', now matches useInventoryData
  
  // Issue & Purchase Records (aligned with useInventoryData.ts)
  ISSUE_RECORDS: 'inventory_issue_records',    // Fixed: was 'issue_records'
  PURCHASE_ENTRIES: 'inventory_purchase_entries', // Fixed: was 'purchase_entries'
  
  // Procurement Workflow
  MATERIAL_REQUESTS: 'material_requests',      // From Supervisor/Store
  PURCHASE_REQUISITIONS: 'purchase_requisitions',
  PURCHASE_ORDERS: 'purchase_orders',
  GOODS_RECEIPTS: 'goods_receipts',
  PURCHASE_INVOICES: 'purchase_invoices',
  
  // Enquiry & Quotes
  ENQUIRIES: 'enquiries',
  VENDOR_QUOTES: 'vendor_quotes',
  
  // Audit & Logs
  AUDIT_LOG: 'procurement_audit_log',
  NOTIFICATIONS: 'notifications',
} as const;

// ==========================================
// DOCUMENT STATUS TYPES
// ==========================================
export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'converted_to_pr' | 'cancelled';
export type PRStatus = 'draft' | 'submitted' | 'enquiry_sent' | 'quotes_received' | 'po_created' | 'completed' | 'cancelled';
export type POStatus = 'draft' | 'pending_approval' | 'pending_md_approval' | 'approved' | 'rejected' | 'ordered' | 'partially_received' | 'received' | 'completed' | 'cancelled';
export type GRNStatus = 'pending' | 'quality_check' | 'verified' | 'stock_updated' | 'completed' | 'rejected';
export type InvoiceStatus = 'pending' | 'verified' | 'payment_pending' | 'paid' | 'disputed';

// ==========================================
// INTERFACES
// ==========================================

// Material Request (from Supervisor/Store)
export interface MaterialRequest {
  id: string;
  requestNumber: string;
  requestedBy: string;
  requestedByName: string;
  requestedByRole: 'supervisor' | 'store' | 'production';
  department: string;
  projectId?: string;
  projectName?: string;
  
  items: MaterialRequestItem[];
  
  urgency: 'low' | 'medium' | 'high' | 'critical';
  requiredDate: string;
  reason: string;
  
  status: RequestStatus;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectedReason?: string;
  
  linkedPRId?: string;
  linkedPRNumber?: string;
  
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface MaterialRequestItem {
  materialId: string;
  materialCode: string;
  materialName: string;
  currentStock: number;
  requestedQty: number;
  unit: string;
  estimatedPrice?: number;
  reason?: string;
}

// Purchase Requisition
export interface PurchaseRequisition {
  id: string;
  prNumber: string;
  sourceType: 'material_request' | 'stock_alert' | 'manual';
  sourceId?: string;
  sourceNumber?: string;
  
  createdBy: string;
  createdByName: string;
  department?: string;
  projectId?: string;
  projectName?: string;
  
  items: PRItem[];
  totalEstimatedAmount: number;
  
  priority: 'low' | 'medium' | 'high' | 'urgent';
  requiredDate: string;
  
  status: PRStatus;
  assignedTo?: string;
  assignedToName?: string;
  
  linkedEnquiries: string[];
  linkedPOs: string[];
  
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface PRItem {
  materialId: string;
  materialCode: string;
  materialName: string;
  currentStock: number;
  requiredQty: number;
  unit: string;
  estimatedUnitPrice: number;
  estimatedTotal: number;
  suggestedSupplierId?: string;
  suggestedSupplierName?: string;
  specifications?: string;
}

// Purchase Order
export interface PurchaseOrder {
  id: string;
  poNumber: string;
  
  prId?: string;
  prNumber?: string;
  enquiryId?: string;
  enquiryNumber?: string;
  
  vendorId: string;
  vendorName: string;
  vendorContact: string;
  vendorEmail?: string;
  vendorPhone?: string;
  vendorGST?: string;
  vendorAddress?: string;
  
  items: POItem[];
  
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  otherCharges: number;
  totalAmount: number;
  
  status: POStatus;
  
  requiresMDApproval: boolean;
  mdApprovalThreshold: number;
  approvalSteps: ApprovalStep[];
  
  paymentTerms: string;
  deliveryTerms: string;
  expectedDelivery?: string;
  
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  
  orderedAt?: string;
  orderedBy?: string;
  
  notes?: string;
  attachments?: string[];
  
  // Tracking for Store
  receivedItems: ReceivedItemTracker[];
  totalReceivedQty: number;
  lastReceivedAt?: string;
}

export interface POItem {
  materialId: string;
  materialCode: string;
  materialName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  taxPercent?: number;
  taxAmount?: number;
  receivedQty: number;
  pendingQty: number;
  specifications?: string;
}

export interface ApprovalStep {
  step: number;
  approverRole: string;
  approverId?: string;
  approverName?: string;
  status: 'pending' | 'approved' | 'rejected';
  comments?: string;
  timestamp?: string;
}

export interface ReceivedItemTracker {
  materialId: string;
  receivedQty: number;
  lastReceivedAt: string;
  grnId: string;
}

// Goods Receipt Note (GRN)
export interface GoodsReceipt {
  id: string;
  grnNumber: string;
  
  poId: string;
  poNumber: string;
  
  vendorId: string;
  vendorName: string;
  
  items: GRNItem[];
  totalReceivedValue: number;
  
  receivedBy: string;
  receivedByName: string;
  receivedAt: string;
  
  status: GRNStatus;
  qualityCheckBy?: string;
  qualityCheckAt?: string;
  
  invoiceNumber?: string;
  invoiceDate?: string;
  invoiceAmount?: number;
  
  vehicleNumber?: string;
  deliveryChallanNumber?: string;
  
  stockUpdatedAt?: string;
  
  remarks?: string;
  attachments?: string[];
}

export interface GRNItem {
  materialId: string;
  materialCode: string;
  materialName: string;
  orderedQty: number;
  receivedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  unit: string;
  unitPrice: number;
  totalValue: number;
  qualityStatus: 'pending' | 'passed' | 'failed' | 'partial';
  remarks?: string;
}

// Invoice
export interface PurchaseInvoice {
  id: string;
  invoiceNumber: string;
  vendorInvoiceNumber: string;
  
  poId: string;
  poNumber: string;
  grnId: string;
  grnNumber: string;
  
  vendorId: string;
  vendorName: string;
  vendorGST?: string;
  
  invoiceDate: string;
  dueDate: string;
  
  items: InvoiceItem[];
  
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  totalAmount: number;
  
  status: InvoiceStatus;
  
  paymentDate?: string;
  paymentReference?: string;
  
  verifiedBy?: string;
  verifiedAt?: string;
  
  createdAt: string;
  updatedAt: string;
  
  remarks?: string;
  attachments?: string[];
}

export interface InvoiceItem {
  materialId: string;
  materialName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  hsnCode?: string;
  taxPercent: number;
  taxAmount: number;
}

// Notification
export interface Notification {
  id: string;
  type: 'material_request' | 'pr_created' | 'po_approval' | 'po_approved' | 'po_rejected' | 'grn_received' | 'stock_low' | 'invoice_pending';
  title: string;
  message: string;
  
  documentType?: string;
  documentId?: string;
  documentNumber?: string;
  
  forRole: string[];
  forUserId?: string;
  
  isRead: boolean;
  createdAt: string;
  
  actionUrl?: string;
  priority: 'low' | 'medium' | 'high';
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

export const generateDocNumber = (prefix: string): string => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}-${year}${month}${day}-${random}`;
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
};

// MD Approval threshold (configurable) - ₹50,000
export const MD_APPROVAL_THRESHOLD = 50000;

// ==========================================
// 1. MATERIAL REQUESTS (Supervisor/Store → Purchase)
// ==========================================

export const createMaterialRequest = async (
  data: Omit<MaterialRequest, 'id' | 'requestNumber' | 'createdAt' | 'updatedAt' | 'status'>
): Promise<string> => {
  const requestNumber = generateDocNumber('MR');
  
  const docRef = await addDoc(collection(db, COLLECTIONS.MATERIAL_REQUESTS), {
    ...data,
    requestNumber,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  
  // Create notification for Purchase team
  await createNotification({
    type: 'material_request',
    title: 'New Material Request',
    message: `${data.requestedByName} from ${data.department} has requested materials`,
    documentType: 'material_request',
    documentId: docRef.id,
    documentNumber: requestNumber,
    forRole: ['purchase', 'purchase_manager', 'admin'],
    priority: data.urgency === 'critical' ? 'high' : data.urgency === 'high' ? 'medium' : 'low',
  });
  
  return docRef.id;
};

export const subscribeToMaterialRequests = (
  callback: (requests: MaterialRequest[]) => void,
  filters?: { status?: RequestStatus; department?: string }
) => {
  let q = query(
    collection(db, COLLECTIONS.MATERIAL_REQUESTS),
    orderBy('createdAt', 'desc')
  );
  
  if (filters?.status) {
    q = query(
      collection(db, COLLECTIONS.MATERIAL_REQUESTS),
      where('status', '==', filters.status),
      orderBy('createdAt', 'desc')
    );
  }
  
  return onSnapshot(q, (snapshot) => {
    const requests = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as MaterialRequest[];
    callback(requests);
  });
};

export const approveMaterialRequest = async (
  requestId: string,
  approvedBy: string,
  approvedByName: string
) => {
  await updateDoc(doc(db, COLLECTIONS.MATERIAL_REQUESTS, requestId), {
    status: 'approved',
    approvedBy,
    approvedByName,
    approvedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
};

export const rejectMaterialRequest = async (
  requestId: string,
  rejectedBy: string,
  reason: string
) => {
  await updateDoc(doc(db, COLLECTIONS.MATERIAL_REQUESTS, requestId), {
    status: 'rejected',
    rejectedReason: reason,
    updatedAt: new Date().toISOString(),
  });
};

export const convertRequestToPR = async (
  request: MaterialRequest,
  createdBy: string,
  createdByName: string
): Promise<string> => {
  const prNumber = generateDocNumber('PR');
  
  const prItems: PRItem[] = request.items.map(item => ({
    materialId: item.materialId,
    materialCode: item.materialCode,
    materialName: item.materialName,
    currentStock: item.currentStock,
    requiredQty: item.requestedQty,
    unit: item.unit,
    estimatedUnitPrice: item.estimatedPrice || 0,
    estimatedTotal: (item.estimatedPrice || 0) * item.requestedQty,
  }));
  
  const totalEstimated = prItems.reduce((sum, item) => sum + item.estimatedTotal, 0);
  
  const prRef = await addDoc(collection(db, COLLECTIONS.PURCHASE_REQUISITIONS), {
    prNumber,
    sourceType: 'material_request',
    sourceId: request.id,
    sourceNumber: request.requestNumber,
    createdBy,
    createdByName,
    department: request.department,
    projectId: request.projectId,
    projectName: request.projectName,
    items: prItems,
    totalEstimatedAmount: totalEstimated,
    priority: request.urgency === 'critical' ? 'urgent' : request.urgency,
    requiredDate: request.requiredDate,
    status: 'submitted',
    linkedEnquiries: [],
    linkedPOs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    notes: `Converted from Material Request ${request.requestNumber}`,
  });
  
  // Update original request
  await updateDoc(doc(db, COLLECTIONS.MATERIAL_REQUESTS, request.id), {
    status: 'converted_to_pr',
    linkedPRId: prRef.id,
    linkedPRNumber: prNumber,
    updatedAt: new Date().toISOString(),
  });
  
  return prRef.id;
};

// ==========================================
// 2. PURCHASE REQUISITIONS
// ==========================================

export const subscribeToPRs = (
  callback: (prs: PurchaseRequisition[]) => void,
  filters?: { status?: PRStatus }
) => {
  let q = query(
    collection(db, COLLECTIONS.PURCHASE_REQUISITIONS),
    orderBy('createdAt', 'desc')
  );
  
  if (filters?.status) {
    q = query(
      collection(db, COLLECTIONS.PURCHASE_REQUISITIONS),
      where('status', '==', filters.status),
      orderBy('createdAt', 'desc')
    );
  }
  
  return onSnapshot(q, (snapshot) => {
    const prs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as PurchaseRequisition[];
    callback(prs);
  });
};

export const createManualPR = async (
  data: Omit<PurchaseRequisition, 'id' | 'prNumber' | 'createdAt' | 'updatedAt' | 'linkedEnquiries' | 'linkedPOs'>
): Promise<string> => {
  const prNumber = generateDocNumber('PR');
  
  const docRef = await addDoc(collection(db, COLLECTIONS.PURCHASE_REQUISITIONS), {
    ...data,
    prNumber,
    sourceType: 'manual',
    linkedEnquiries: [],
    linkedPOs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  
  return docRef.id;
};

export const assignPR = async (
  prId: string,
  assignedTo: string,
  assignedToName: string
) => {
  await updateDoc(doc(db, COLLECTIONS.PURCHASE_REQUISITIONS, prId), {
    assignedTo,
    assignedToName,
    updatedAt: new Date().toISOString(),
  });
};

// ==========================================
// 3. PURCHASE ORDERS
// ==========================================

export const subscribeToPOs = (
  callback: (pos: PurchaseOrder[]) => void,
  filters?: { status?: POStatus }
) => {
  let q = query(
    collection(db, COLLECTIONS.PURCHASE_ORDERS),
    orderBy('createdAt', 'desc')
  );
  
  if (filters?.status) {
    q = query(
      collection(db, COLLECTIONS.PURCHASE_ORDERS),
      where('status', '==', filters.status),
      orderBy('createdAt', 'desc')
    );
  }
  
  return onSnapshot(q, (snapshot) => {
    const pos = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as PurchaseOrder[];
    callback(pos);
  });
};

export const subscribeToApprovedPOs = (
  callback: (pos: PurchaseOrder[]) => void
) => {
  const q = query(
    collection(db, COLLECTIONS.PURCHASE_ORDERS),
    where('status', 'in', ['approved', 'ordered', 'partially_received']),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const pos = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as PurchaseOrder[];
    callback(pos);
  });
};

export const subscribeToPendingMDApprovals = (
  callback: (pos: PurchaseOrder[]) => void
) => {
  const q = query(
    collection(db, COLLECTIONS.PURCHASE_ORDERS),
    where('status', '==', 'pending_md_approval'),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const pos = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as PurchaseOrder[];
    callback(pos);
  });
};

export const createPO = async (
  data: Omit<PurchaseOrder, 'id' | 'poNumber' | 'createdAt' | 'updatedAt' | 'receivedItems' | 'totalReceivedQty'>
): Promise<string> => {
  const poNumber = generateDocNumber('PO');
  
  // All POs require MD approval - no threshold
  const requiresMDApproval = true;
  const status: POStatus = 'pending_md_approval';
  
  const poItems = data.items.map(item => ({
    ...item,
    receivedQty: 0,
    pendingQty: item.quantity,
  }));
  
  const docRef = await addDoc(collection(db, COLLECTIONS.PURCHASE_ORDERS), {
    ...data,
    poNumber,
    items: poItems,
    status,
    requiresMDApproval,
    mdApprovalThreshold: 0, // No threshold - all POs require approval
    approvalSteps: [
      { step: 1, approverRole: 'MD', status: 'pending' }
    ],
    receivedItems: [],
    totalReceivedQty: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  
  // Link to PR if exists
  if (data.prId) {
    const prRef = doc(db, COLLECTIONS.PURCHASE_REQUISITIONS, data.prId);
    const prSnap = await getDoc(prRef);
    if (prSnap.exists()) {
      const pr = prSnap.data() as PurchaseRequisition;
      await updateDoc(prRef, {
        linkedPOs: [...pr.linkedPOs, docRef.id],
        status: 'po_created',
        updatedAt: new Date().toISOString(),
      });
    }
  }
  
  // Notifications
  if (requiresMDApproval) {
    await createNotification({
      type: 'po_approval',
      title: 'PO Pending MD Approval',
      message: `PO ${poNumber} for ${formatCurrency(data.totalAmount)} requires MD approval`,
      documentType: 'purchase_order',
      documentId: docRef.id,
      documentNumber: poNumber,
      forRole: ['md', 'admin'],
      priority: 'high',
    });
  }
  
  return docRef.id;
};

export const approvePO = async (
  poId: string,
  approvedBy: string,
  approverName: string,
  comments?: string
) => {
  const poRef = doc(db, COLLECTIONS.PURCHASE_ORDERS, poId);
  const poSnap = await getDoc(poRef);
  
  if (!poSnap.exists()) throw new Error('PO not found');
  
  const po = poSnap.data() as PurchaseOrder;
  
  await updateDoc(poRef, {
    status: 'approved',
    'approvalSteps.0.status': 'approved',
    'approvalSteps.0.approverId': approvedBy,
    'approvalSteps.0.approverName': approverName,
    'approvalSteps.0.comments': comments || '',
    'approvalSteps.0.timestamp': new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  
  // Notify purchase team
  await createNotification({
    type: 'po_approved',
    title: 'PO Approved by MD',
    message: `PO ${po.poNumber} has been approved`,
    documentType: 'purchase_order',
    documentId: poId,
    documentNumber: po.poNumber,
    forRole: ['purchase', 'purchase_manager', 'store'],
    priority: 'medium',
  });
  
  // Audit log
  await addAuditLog('purchase_order', poId, po.poNumber, 'MD_APPROVED', approvedBy, approverName);
};

export const rejectPO = async (
  poId: string,
  rejectedBy: string,
  rejectorName: string,
  reason: string
) => {
  const poRef = doc(db, COLLECTIONS.PURCHASE_ORDERS, poId);
  const poSnap = await getDoc(poRef);
  
  if (!poSnap.exists()) throw new Error('PO not found');
  
  const po = poSnap.data() as PurchaseOrder;
  
  await updateDoc(poRef, {
    status: 'rejected',
    'approvalSteps.0.status': 'rejected',
    'approvalSteps.0.approverId': rejectedBy,
    'approvalSteps.0.approverName': rejectorName,
    'approvalSteps.0.comments': reason,
    'approvalSteps.0.timestamp': new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  
  await createNotification({
    type: 'po_rejected',
    title: 'PO Rejected by MD',
    message: `PO ${po.poNumber} has been rejected: ${reason}`,
    documentType: 'purchase_order',
    documentId: poId,
    documentNumber: po.poNumber,
    forRole: ['purchase', 'purchase_manager'],
    priority: 'high',
  });
  
  await addAuditLog('purchase_order', poId, po.poNumber, 'MD_REJECTED', rejectedBy, rejectorName, reason);
};

export const markPOAsOrdered = async (
  poId: string,
  orderedBy: string
) => {
  await updateDoc(doc(db, COLLECTIONS.PURCHASE_ORDERS, poId), {
    status: 'ordered',
    orderedAt: new Date().toISOString(),
    orderedBy,
    updatedAt: new Date().toISOString(),
  });
};

// ==========================================
// 4. GOODS RECEIPT (GRN) - Store Integration
// ==========================================

export const subscribeToGRNs = (
  callback: (grns: GoodsReceipt[]) => void,
  filters?: { status?: GRNStatus; poId?: string }
) => {
  let q = query(
    collection(db, COLLECTIONS.GOODS_RECEIPTS),
    orderBy('receivedAt', 'desc')
  );
  
  if (filters?.poId) {
    q = query(
      collection(db, COLLECTIONS.GOODS_RECEIPTS),
      where('poId', '==', filters.poId),
      orderBy('receivedAt', 'desc')
    );
  }
  
  return onSnapshot(q, (snapshot) => {
    const grns = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as GoodsReceipt[];
    callback(grns);
  });
};

export const createGRN = async (
  data: Omit<GoodsReceipt, 'id' | 'grnNumber'>
): Promise<string> => {
  const grnNumber = generateDocNumber('GRN');
  
  const docRef = await addDoc(collection(db, COLLECTIONS.GOODS_RECEIPTS), {
    ...data,
    grnNumber,
  });
  
  // Update PO received quantities
  const poRef = doc(db, COLLECTIONS.PURCHASE_ORDERS, data.poId);
  const poSnap = await getDoc(poRef);
  
  if (poSnap.exists()) {
    const po = poSnap.data() as PurchaseOrder;
    
    // Update each item's received qty
    const updatedItems = po.items.map(poItem => {
      const grnItem = data.items.find(gi => gi.materialId === poItem.materialId);
      if (grnItem) {
        const newReceivedQty = (poItem.receivedQty || 0) + grnItem.acceptedQty;
        return {
          ...poItem,
          receivedQty: newReceivedQty,
          pendingQty: poItem.quantity - newReceivedQty,
        };
      }
      return poItem;
    });
    
    // Calculate total received
    const totalReceived = updatedItems.reduce((sum, item) => sum + item.receivedQty, 0);
    const totalOrdered = updatedItems.reduce((sum, item) => sum + item.quantity, 0);
    
    // Determine PO status
    let newStatus: POStatus = po.status;
    if (totalReceived >= totalOrdered) {
      newStatus = 'received';
    } else if (totalReceived > 0) {
      newStatus = 'partially_received';
    }
    
    await updateDoc(poRef, {
      items: updatedItems,
      status: newStatus,
      totalReceivedQty: totalReceived,
      lastReceivedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  
  // Notify purchase team
  await createNotification({
    type: 'grn_received',
    title: 'Goods Received',
    message: `GRN ${grnNumber} created for PO ${data.poNumber}`,
    documentType: 'goods_receipt',
    documentId: docRef.id,
    documentNumber: grnNumber,
    forRole: ['purchase', 'purchase_manager', 'store', 'md'],
    priority: 'medium',
  });
  
  return docRef.id;
};

export const updateGRNStatus = async (
  grnId: string,
  status: GRNStatus,
  updatedBy?: string
) => {
  const updates: Record<string, unknown> = { status };
  
  if (status === 'verified') {
    updates.qualityCheckAt = new Date().toISOString();
    updates.qualityCheckBy = updatedBy;
  }
  
  if (status === 'stock_updated') {
    updates.stockUpdatedAt = new Date().toISOString();
  }
  
  await updateDoc(doc(db, COLLECTIONS.GOODS_RECEIPTS, grnId), updates);
};

export const updateMaterialStock = async (
  grn: GoodsReceipt
) => {
  const batch = writeBatch(db);
  
  for (const item of grn.items) {
    if (item.acceptedQty > 0) {
      // Get current material
      const materialRef = doc(db, COLLECTIONS.MATERIALS, item.materialId);
      const materialSnap = await getDoc(materialRef);
      
      if (materialSnap.exists()) {
        const material = materialSnap.data();
        const newStock = (material.current_stock || 0) + item.acceptedQty;
        
        batch.update(materialRef, {
          current_stock: newStock,
          updated_at: new Date().toISOString(),
          last_received_from: grn.vendorName,
          last_received_qty: item.acceptedQty,
          last_received_date: grn.receivedAt,
        });
      }
    }
  }
  
  await batch.commit();
  
  // Update GRN status
  await updateGRNStatus(grn.id, 'stock_updated');
};

// ==========================================
// 5. INVOICES
// ==========================================

export const subscribeToInvoices = (
  callback: (invoices: PurchaseInvoice[]) => void,
  filters?: { status?: InvoiceStatus }
) => {
  let q = query(
    collection(db, COLLECTIONS.PURCHASE_INVOICES),
    orderBy('createdAt', 'desc')
  );
  
  if (filters?.status) {
    q = query(
      collection(db, COLLECTIONS.PURCHASE_INVOICES),
      where('status', '==', filters.status),
      orderBy('createdAt', 'desc')
    );
  }
  
  return onSnapshot(q, (snapshot) => {
    const invoices = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as PurchaseInvoice[];
    callback(invoices);
  });
};

export const createInvoice = async (
  data: Omit<PurchaseInvoice, 'id' | 'invoiceNumber' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  const invoiceNumber = generateDocNumber('INV');
  
  const docRef = await addDoc(collection(db, COLLECTIONS.PURCHASE_INVOICES), {
    ...data,
    invoiceNumber,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  
  return docRef.id;
};

export const updateInvoiceStatus = async (
  invoiceId: string,
  status: InvoiceStatus,
  updates?: Partial<PurchaseInvoice>
) => {
  await updateDoc(doc(db, COLLECTIONS.PURCHASE_INVOICES, invoiceId), {
    status,
    ...updates,
    updatedAt: new Date().toISOString(),
  });
};

// ==========================================
// 6. MATERIALS & SUPPLIERS
// ==========================================

export const subscribeToMaterials = (callback: (materials: Record<string, unknown>[]) => void) => {
  const q = query(
    collection(db, COLLECTIONS.MATERIALS),
    orderBy('name', 'asc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const materials = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(materials);
  });
};

export const subscribeToLowStockMaterials = (callback: (materials: Record<string, unknown>[]) => void) => {
  return onSnapshot(
    collection(db, COLLECTIONS.MATERIALS),
    (snapshot) => {
      const materials = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((m: Record<string, unknown>) => (m.current_stock as number || 0) <= (m.min_stock as number || 0));
      callback(materials);
    }
  );
};

export const subscribeToSuppliers = (callback: (suppliers: Record<string, unknown>[]) => void) => {
  const q = query(
    collection(db, COLLECTIONS.SUPPLIERS),
    orderBy('name', 'asc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const suppliers = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(suppliers);
  });
};

// ==========================================
// 7. NOTIFICATIONS
// ==========================================

export const createNotification = async (
  data: Omit<Notification, 'id' | 'isRead' | 'createdAt'>
) => {
  await addDoc(collection(db, COLLECTIONS.NOTIFICATIONS), {
    ...data,
    isRead: false,
    createdAt: new Date().toISOString(),
  });
};

export const subscribeToNotifications = (
  callback: (notifications: Notification[]) => void,
  forRole?: string
) => {
  const q = query(
    collection(db, COLLECTIONS.NOTIFICATIONS),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  
  return onSnapshot(q, (snapshot) => {
    let notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Notification[];
    
    if (forRole) {
      notifications = notifications.filter(n => n.forRole.includes(forRole));
    }
    
    callback(notifications);
  });
};

export const markNotificationRead = async (notificationId: string) => {
  await updateDoc(doc(db, COLLECTIONS.NOTIFICATIONS, notificationId), {
    isRead: true,
  });
};

// ==========================================
// 8. AUDIT LOG
// ==========================================

export const addAuditLog = async (
  documentType: string,
  documentId: string,
  documentNumber: string,
  action: string,
  performedBy: string,
  performedByName: string,
  details?: string
) => {
  await addDoc(collection(db, COLLECTIONS.AUDIT_LOG), {
    documentType,
    documentId,
    documentNumber,
    action,
    performedBy,
    performedByName,
    details,
    timestamp: new Date().toISOString(),
  });
};

export const subscribeToAuditLog = (
  callback: (logs: Record<string, unknown>[]) => void,
  documentType?: string
) => {
  let q = query(
    collection(db, COLLECTIONS.AUDIT_LOG),
    orderBy('timestamp', 'desc'),
    limit(100)
  );
  
  if (documentType) {
    q = query(
      collection(db, COLLECTIONS.AUDIT_LOG),
      where('documentType', '==', documentType),
      orderBy('timestamp', 'desc'),
      limit(100)
    );
  }
  
  return onSnapshot(q, (snapshot) => {
    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(logs);
  });
};

// ==========================================
// 9. DASHBOARD STATS
// ==========================================

export interface DashboardStats {
  materialRequests: {
    total: number;
    pending: number;
    approved: number;
  };
  purchaseRequisitions: {
    total: number;
    submitted: number;
    inProgress: number;
  };
  purchaseOrders: {
    total: number;
    pendingApproval: number;
    approved: number;
    received: number;
    totalValue: number;
  };
  inventory: {
    totalItems: number;
    lowStock: number;
    outOfStock: number;
    totalValue: number;
  };
  invoices: {
    pending: number;
    totalPending: number;
  };
}

export const subscribeToDashboardStats = (
  callback: (stats: DashboardStats) => void
) => {
  const unsubscribers: (() => void)[] = [];
  
  const stats: DashboardStats = {
    materialRequests: { total: 0, pending: 0, approved: 0 },
    purchaseRequisitions: { total: 0, submitted: 0, inProgress: 0 },
    purchaseOrders: { total: 0, pendingApproval: 0, approved: 0, received: 0, totalValue: 0 },
    inventory: { totalItems: 0, lowStock: 0, outOfStock: 0, totalValue: 0 },
    invoices: { pending: 0, totalPending: 0 },
  };
  
  // Material Requests
  unsubscribers.push(
    onSnapshot(collection(db, COLLECTIONS.MATERIAL_REQUESTS), (snap) => {
      const requests = snap.docs.map(d => d.data()) as MaterialRequest[];
      stats.materialRequests.total = requests.length;
      stats.materialRequests.pending = requests.filter(r => r.status === 'pending').length;
      stats.materialRequests.approved = requests.filter(r => r.status === 'approved').length;
      callback({ ...stats });
    })
  );
  
  // PRs
  unsubscribers.push(
    onSnapshot(collection(db, COLLECTIONS.PURCHASE_REQUISITIONS), (snap) => {
      const prs = snap.docs.map(d => d.data()) as PurchaseRequisition[];
      stats.purchaseRequisitions.total = prs.length;
      stats.purchaseRequisitions.submitted = prs.filter(p => p.status === 'submitted').length;
      stats.purchaseRequisitions.inProgress = prs.filter(p => ['enquiry_sent', 'quotes_received'].includes(p.status)).length;
      callback({ ...stats });
    })
  );
  
  // POs
  unsubscribers.push(
    onSnapshot(collection(db, COLLECTIONS.PURCHASE_ORDERS), (snap) => {
      const pos = snap.docs.map(d => d.data()) as PurchaseOrder[];
      stats.purchaseOrders.total = pos.length;
      stats.purchaseOrders.pendingApproval = pos.filter(p => p.status === 'pending_md_approval').length;
      stats.purchaseOrders.approved = pos.filter(p => ['approved', 'ordered'].includes(p.status)).length;
      stats.purchaseOrders.received = pos.filter(p => ['received', 'partially_received'].includes(p.status)).length;
      stats.purchaseOrders.totalValue = pos.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
      callback({ ...stats });
    })
  );
  
  // Materials
  unsubscribers.push(
    onSnapshot(collection(db, COLLECTIONS.MATERIALS), (snap) => {
      const materials = snap.docs.map(d => d.data());
      stats.inventory.totalItems = materials.length;
      stats.inventory.lowStock = materials.filter((m: Record<string, unknown>) => 
        (m.current_stock as number || 0) <= (m.min_stock as number || 0) && (m.current_stock as number || 0) > 0
      ).length;
      stats.inventory.outOfStock = materials.filter((m: Record<string, unknown>) => (m.current_stock as number || 0) === 0).length;
      stats.inventory.totalValue = materials.reduce((sum, m: Record<string, unknown>) => 
        sum + ((m.current_stock as number || 0) * (m.purchase_price as number || 0)), 0
      );
      callback({ ...stats });
    })
  );
  
  // Invoices
  unsubscribers.push(
    onSnapshot(collection(db, COLLECTIONS.PURCHASE_INVOICES), (snap) => {
      const invoices = snap.docs.map(d => d.data()) as PurchaseInvoice[];
      const pendingInvoices = invoices.filter(i => i.status === 'payment_pending');
      stats.invoices.pending = pendingInvoices.length;
      stats.invoices.totalPending = pendingInvoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0);
      callback({ ...stats });
    })
  );
  
  return () => unsubscribers.forEach(unsub => unsub());
};
