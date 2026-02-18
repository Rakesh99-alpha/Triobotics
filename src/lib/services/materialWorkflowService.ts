// ==========================================
// MATERIAL WORKFLOW SERVICE
// ==========================================
// Workflow: Supervisor → Store (Check Stock) → Issue Material
// Based on BOM for department-wise material allocation
// Created: 2026-01-30

import { db } from '@/lib/firebase/client';
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  Timestamp
} from 'firebase/firestore';

// ==========================================
// COLLECTION NAMES
// ==========================================
const COLLECTIONS = {
  MATERIAL_REQUISITIONS: 'material_requisitions',     // Supervisor requests
  MATERIAL_ISSUES: 'material_issues',                  // Store issues to supervisor
  MATERIALS: 'inventory_materials',
  ISSUE_RECORDS: 'inventory_issue_records',
  BOM_ALLOCATIONS: 'bom_allocations',                  // BOM-based material allocation
  WORKFLOW_LOGS: 'material_workflow_logs',
  NOTIFICATIONS: 'notifications',
};

// ==========================================
// STATUS TYPES
// ==========================================
export type RequisitionStatus = 
  | 'pending'           // Waiting for store review
  | 'stock_checking'    // Store is checking stock
  | 'stock_available'   // Stock confirmed available
  | 'stock_partial'     // Partial stock available
  | 'stock_unavailable' // No stock - needs purchase
  | 'ready_to_issue'    // Approved and ready
  | 'issued'            // Material issued
  | 'rejected'          // Rejected by store
  | 'cancelled';        // Cancelled by supervisor

export type IssueStatus = 
  | 'pending_pickup'    // Material ready for pickup
  | 'issued'            // Given to supervisor
  | 'returned_partial'  // Some material returned
  | 'completed';        // All material used/accounted

// ==========================================
// INTERFACES
// ==========================================

export interface MaterialRequisition {
  id: string;
  requisitionNumber: string;
  
  // Requester Info
  requestedBy: string;          // User ID
  requestedByName: string;
  department: string;           // Department ID (stockbuilding, machining, etc.)
  departmentName: string;
  
  // Project/Job Info (optional - for BOM tracking)
  projectId?: string;
  projectName?: string;
  jobId?: string;
  bomId?: string;
  
  // Items
  items: RequisitionItem[];
  
  // Request Details
  urgency: 'low' | 'medium' | 'high' | 'critical';
  requiredDate: string;
  reason: string;
  notes?: string;
  
  // Workflow Status
  status: RequisitionStatus;
  
  // Store Review
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  stockCheckResult?: StockCheckResult;
  
  // Issue Info (once approved)
  issuedBy?: string;
  issuedByName?: string;
  issuedAt?: string;
  issueRecordId?: string;
  
  // Rejection
  rejectedReason?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface RequisitionItem {
  materialId: string;
  materialCode: string;
  materialName: string;
  requestedQty: number;
  unit: string;
  currentStock: number;
  minStock: number;
  
  // Stock check result per item
  availableQty?: number;
  isAvailable?: boolean;
  shortfallQty?: number;
  
  // Issue tracking
  issuedQty?: number;
  returnedQty?: number;
  
  // BOM reference
  bomItemId?: string;
  bomRequiredQty?: number;
}

export interface StockCheckResult {
  checkedAt: string;
  checkedBy: string;
  checkedByName: string;
  
  totalItems: number;
  availableItems: number;
  partialItems: number;
  unavailableItems: number;
  
  overallStatus: 'available' | 'partial' | 'unavailable';
  notes?: string;
}

export interface MaterialIssue {
  id: string;
  issueNumber: string;
  requisitionId: string;
  requisitionNumber: string;
  
  // Parties
  issuedTo: string;             // Supervisor user ID
  issuedToName: string;
  issuedToDepartment: string;
  issuedBy: string;             // Store user ID
  issuedByName: string;
  
  // Items
  items: IssueItem[];
  
  // Status
  status: IssueStatus;
  
  // Tracking
  pickedUpAt?: string;
  returnedAt?: string;
  
  // Project/BOM reference
  projectId?: string;
  projectName?: string;
  bomId?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface IssueItem {
  materialId: string;
  materialCode: string;
  materialName: string;
  issuedQty: number;
  unit: string;
  unitPrice: number;
  totalValue: number;
  
  // Return tracking
  returnedQty: number;
  usedQty: number;
  
  // BOM reference
  bomItemId?: string;
}

export interface BOMAllocation {
  id: string;
  projectId: string;
  projectName: string;
  bomId: string;
  
  // Department allocations
  departmentAllocations: DepartmentAllocation[];
  
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentAllocation {
  departmentId: string;
  departmentName: string;
  materials: {
    materialId: string;
    materialName: string;
    allocatedQty: number;
    issuedQty: number;
    remainingQty: number;
    unit: string;
  }[];
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

const generateNumber = (prefix: string): string => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}-${year}${month}${day}-${random}`;
};

// ==========================================
// 1. SUPERVISOR: CREATE MATERIAL REQUISITION
// ==========================================

export const createMaterialRequisition = async (
  data: Omit<MaterialRequisition, 'id' | 'requisitionNumber' | 'status' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  const requisitionNumber = generateNumber('MRQ');
  
  // Enrich items with current stock info
  const enrichedItems = await Promise.all(
    data.items.map(async (item) => {
      const materialRef = doc(db, COLLECTIONS.MATERIALS, item.materialId);
      const materialSnap = await getDoc(materialRef);
      const materialData = materialSnap.data();
      
      return {
        ...item,
        currentStock: materialData?.current_stock || 0,
        minStock: materialData?.min_stock || 0,
      };
    })
  );
  
  const docRef = await addDoc(collection(db, COLLECTIONS.MATERIAL_REQUISITIONS), {
    ...data,
    items: enrichedItems,
    requisitionNumber,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  
  // Notify Store
  await addDoc(collection(db, COLLECTIONS.NOTIFICATIONS), {
    type: 'material_requisition',
    title: 'New Material Request',
    message: `${data.requestedByName} from ${data.departmentName} has requested materials`,
    documentType: 'material_requisition',
    documentId: docRef.id,
    documentNumber: requisitionNumber,
    forRole: ['store', 'store_manager', 'data_entry'],
    priority: data.urgency === 'critical' ? 'high' : data.urgency === 'high' ? 'medium' : 'low',
    isRead: false,
    createdAt: new Date().toISOString(),
  });
  
  // Log workflow
  await addDoc(collection(db, COLLECTIONS.WORKFLOW_LOGS), {
    requisitionId: docRef.id,
    requisitionNumber,
    action: 'CREATED',
    performedBy: data.requestedBy,
    performedByName: data.requestedByName,
    details: `Material requisition created by ${data.requestedByName} from ${data.departmentName}`,
    timestamp: new Date().toISOString(),
  });
  
  return docRef.id;
};

// ==========================================
// 2. STORE: CHECK STOCK AVAILABILITY
// ==========================================

export const checkStockAvailability = async (
  requisitionId: string,
  checkedBy: string,
  checkedByName: string,
  notes?: string
): Promise<StockCheckResult> => {
  const reqRef = doc(db, COLLECTIONS.MATERIAL_REQUISITIONS, requisitionId);
  const reqSnap = await getDoc(reqRef);
  
  if (!reqSnap.exists()) throw new Error('Requisition not found');
  
  const requisition = { id: reqSnap.id, ...reqSnap.data() } as MaterialRequisition;
  
  // Check each item's stock
  const updatedItems = await Promise.all(
    requisition.items.map(async (item) => {
      const materialRef = doc(db, COLLECTIONS.MATERIALS, item.materialId);
      const materialSnap = await getDoc(materialRef);
      const materialData = materialSnap.data();
      
      const currentStock = materialData?.current_stock || 0;
      const isAvailable = currentStock >= item.requestedQty;
      const shortfallQty = isAvailable ? 0 : item.requestedQty - currentStock;
      
      return {
        ...item,
        currentStock,
        availableQty: Math.min(currentStock, item.requestedQty),
        isAvailable,
        shortfallQty,
      };
    })
  );
  
  // Calculate overall status
  const availableItems = updatedItems.filter(i => i.isAvailable).length;
  const partialItems = updatedItems.filter(i => !i.isAvailable && i.availableQty! > 0).length;
  const unavailableItems = updatedItems.filter(i => i.availableQty === 0).length;
  
  let overallStatus: 'available' | 'partial' | 'unavailable';
  let newStatus: RequisitionStatus;
  
  if (availableItems === updatedItems.length) {
    overallStatus = 'available';
    newStatus = 'stock_available';
  } else if (unavailableItems === updatedItems.length) {
    overallStatus = 'unavailable';
    newStatus = 'stock_unavailable';
  } else {
    overallStatus = 'partial';
    newStatus = 'stock_partial';
  }
  
  const stockCheckResult: StockCheckResult = {
    checkedAt: new Date().toISOString(),
    checkedBy,
    checkedByName,
    totalItems: updatedItems.length,
    availableItems,
    partialItems,
    unavailableItems,
    overallStatus,
    notes,
  };
  
  // Update requisition
  await updateDoc(reqRef, {
    items: updatedItems,
    status: newStatus,
    stockCheckResult,
    reviewedBy: checkedBy,
    reviewedByName: checkedByName,
    reviewedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  
  // Notify supervisor
  await addDoc(collection(db, COLLECTIONS.NOTIFICATIONS), {
    type: 'stock_check_complete',
    title: 'Stock Check Complete',
    message: `Stock check for ${requisition.requisitionNumber}: ${overallStatus.toUpperCase()}`,
    documentType: 'material_requisition',
    documentId: requisitionId,
    documentNumber: requisition.requisitionNumber,
    forRole: ['supervisor'],
    forUserId: requisition.requestedBy,
    priority: overallStatus === 'unavailable' ? 'high' : 'medium',
    isRead: false,
    createdAt: new Date().toISOString(),
  });
  
  // Log workflow
  await addDoc(collection(db, COLLECTIONS.WORKFLOW_LOGS), {
    requisitionId,
    requisitionNumber: requisition.requisitionNumber,
    action: 'STOCK_CHECKED',
    performedBy: checkedBy,
    performedByName: checkedByName,
    details: `Stock check: ${availableItems}/${updatedItems.length} items available`,
    timestamp: new Date().toISOString(),
  });
  
  return stockCheckResult;
};

// ==========================================
// 3. STORE: APPROVE AND PREPARE FOR ISSUE
// ==========================================

export const approveForIssue = async (
  requisitionId: string,
  approvedBy: string,
  approvedByName: string,
  notes?: string
): Promise<void> => {
  const reqRef = doc(db, COLLECTIONS.MATERIAL_REQUISITIONS, requisitionId);
  const reqSnap = await getDoc(reqRef);
  
  if (!reqSnap.exists()) throw new Error('Requisition not found');
  
  const requisition = { id: reqSnap.id, ...reqSnap.data() } as MaterialRequisition;
  
  if (requisition.status !== 'stock_available' && requisition.status !== 'stock_partial') {
    throw new Error('Cannot approve: Stock check not complete or no stock available');
  }
  
  await updateDoc(reqRef, {
    status: 'ready_to_issue',
    updatedAt: new Date().toISOString(),
  });
  
  // Notify supervisor
  await addDoc(collection(db, COLLECTIONS.NOTIFICATIONS), {
    type: 'material_ready',
    title: 'Material Ready for Pickup',
    message: `Materials for ${requisition.requisitionNumber} are ready for collection from store`,
    documentType: 'material_requisition',
    documentId: requisitionId,
    documentNumber: requisition.requisitionNumber,
    forRole: ['supervisor'],
    forUserId: requisition.requestedBy,
    priority: 'high',
    isRead: false,
    createdAt: new Date().toISOString(),
  });
  
  // Log workflow
  await addDoc(collection(db, COLLECTIONS.WORKFLOW_LOGS), {
    requisitionId,
    requisitionNumber: requisition.requisitionNumber,
    action: 'APPROVED_FOR_ISSUE',
    performedBy: approvedBy,
    performedByName: approvedByName,
    details: notes || 'Material approved and ready for issue',
    timestamp: new Date().toISOString(),
  });
};

// ==========================================
// 4. STORE: ISSUE MATERIAL TO SUPERVISOR
// ==========================================

export const issueMaterial = async (
  requisitionId: string,
  issuedBy: string,
  issuedByName: string,
  itemsToIssue: { materialId: string; issuedQty: number; unitPrice: number }[],
  notes?: string
): Promise<string> => {
  const reqRef = doc(db, COLLECTIONS.MATERIAL_REQUISITIONS, requisitionId);
  const reqSnap = await getDoc(reqRef);
  
  if (!reqSnap.exists()) throw new Error('Requisition not found');
  
  const requisition = { id: reqSnap.id, ...reqSnap.data() } as MaterialRequisition;
  
  if (requisition.status !== 'ready_to_issue') {
    throw new Error('Cannot issue: Material not approved for issue');
  }
  
  const batch = writeBatch(db);
  const issueNumber = generateNumber('ISS');
  
  // Create issue items with calculations
  const issueItems: IssueItem[] = itemsToIssue.map((item) => {
    const reqItem = requisition.items.find(i => i.materialId === item.materialId);
    return {
      materialId: item.materialId,
      materialCode: reqItem?.materialCode || '',
      materialName: reqItem?.materialName || '',
      issuedQty: item.issuedQty,
      unit: reqItem?.unit || '',
      unitPrice: item.unitPrice,
      totalValue: item.issuedQty * item.unitPrice,
      returnedQty: 0,
      usedQty: 0,
      bomItemId: reqItem?.bomItemId,
    };
  });
  
  // Create Material Issue record
  const issueRef = doc(collection(db, COLLECTIONS.MATERIAL_ISSUES));
  batch.set(issueRef, {
    issueNumber,
    requisitionId,
    requisitionNumber: requisition.requisitionNumber,
    issuedTo: requisition.requestedBy,
    issuedToName: requisition.requestedByName,
    issuedToDepartment: requisition.department,
    issuedBy,
    issuedByName,
    items: issueItems,
    status: 'issued',
    projectId: requisition.projectId,
    projectName: requisition.projectName,
    bomId: requisition.bomId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    notes,
  });
  
  // Update inventory (decrease stock)
  for (const item of itemsToIssue) {
    const materialRef = doc(db, COLLECTIONS.MATERIALS, item.materialId);
    const materialSnap = await getDoc(materialRef);
    if (materialSnap.exists()) {
      const currentStock = materialSnap.data().current_stock || 0;
      batch.update(materialRef, {
        current_stock: Math.max(0, currentStock - item.issuedQty),
        updated_at: new Date().toISOString(),
      });
    }
  }
  
  // Create issue record for tracking
  const issueRecordRef = doc(collection(db, COLLECTIONS.ISSUE_RECORDS));
  batch.set(issueRecordRef, {
    material_id: itemsToIssue[0]?.materialId,
    quantity: itemsToIssue.reduce((sum, i) => sum + i.issuedQty, 0),
    team: requisition.departmentName,
    project: requisition.projectName || 'General',
    entered_by: issuedByName,
    date: new Date().toISOString().split('T')[0],
    status: 'issued',
    requisition_id: requisitionId,
    requisition_number: requisition.requisitionNumber,
    created_at: new Date().toISOString(),
  });
  
  // Update requisition with issue details
  const updatedItems = requisition.items.map(item => {
    const issued = itemsToIssue.find(i => i.materialId === item.materialId);
    return {
      ...item,
      issuedQty: issued?.issuedQty || 0,
    };
  });
  
  batch.update(reqRef, {
    status: 'issued',
    items: updatedItems,
    issuedBy,
    issuedByName,
    issuedAt: new Date().toISOString(),
    issueRecordId: issueRef.id,
    updatedAt: new Date().toISOString(),
  });
  
  await batch.commit();
  
  // Notify supervisor
  await addDoc(collection(db, COLLECTIONS.NOTIFICATIONS), {
    type: 'material_issued',
    title: 'Material Issued',
    message: `Materials for ${requisition.requisitionNumber} have been issued. Issue #: ${issueNumber}`,
    documentType: 'material_issue',
    documentId: issueRef.id,
    documentNumber: issueNumber,
    forRole: ['supervisor'],
    forUserId: requisition.requestedBy,
    priority: 'medium',
    isRead: false,
    createdAt: new Date().toISOString(),
  });
  
  // Log workflow
  await addDoc(collection(db, COLLECTIONS.WORKFLOW_LOGS), {
    requisitionId,
    requisitionNumber: requisition.requisitionNumber,
    issueId: issueRef.id,
    issueNumber,
    action: 'MATERIAL_ISSUED',
    performedBy: issuedBy,
    performedByName: issuedByName,
    details: `${issueItems.length} items issued to ${requisition.requestedByName}`,
    timestamp: new Date().toISOString(),
  });
  
  return issueRef.id;
};

// ==========================================
// 5. STORE: REJECT REQUISITION
// ==========================================

export const rejectRequisition = async (
  requisitionId: string,
  rejectedBy: string,
  rejectedByName: string,
  reason: string
): Promise<void> => {
  const reqRef = doc(db, COLLECTIONS.MATERIAL_REQUISITIONS, requisitionId);
  const reqSnap = await getDoc(reqRef);
  
  if (!reqSnap.exists()) throw new Error('Requisition not found');
  
  const requisition = { id: reqSnap.id, ...reqSnap.data() } as MaterialRequisition;
  
  await updateDoc(reqRef, {
    status: 'rejected',
    rejectedReason: reason,
    reviewedBy: rejectedBy,
    reviewedByName: rejectedByName,
    reviewedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  
  // Notify supervisor
  await addDoc(collection(db, COLLECTIONS.NOTIFICATIONS), {
    type: 'requisition_rejected',
    title: 'Material Request Rejected',
    message: `${requisition.requisitionNumber} was rejected: ${reason}`,
    documentType: 'material_requisition',
    documentId: requisitionId,
    documentNumber: requisition.requisitionNumber,
    forRole: ['supervisor'],
    forUserId: requisition.requestedBy,
    priority: 'high',
    isRead: false,
    createdAt: new Date().toISOString(),
  });
  
  // Log workflow
  await addDoc(collection(db, COLLECTIONS.WORKFLOW_LOGS), {
    requisitionId,
    requisitionNumber: requisition.requisitionNumber,
    action: 'REJECTED',
    performedBy: rejectedBy,
    performedByName: rejectedByName,
    details: `Rejected: ${reason}`,
    timestamp: new Date().toISOString(),
  });
};

// ==========================================
// 6. SEND TO PURCHASE (When stock unavailable)
// ==========================================

export const sendToPurchase = async (
  requisitionId: string,
  sentBy: string,
  sentByName: string,
  notes?: string
): Promise<void> => {
  const reqRef = doc(db, COLLECTIONS.MATERIAL_REQUISITIONS, requisitionId);
  const reqSnap = await getDoc(reqRef);
  
  if (!reqSnap.exists()) throw new Error('Requisition not found');
  
  const requisition = { id: reqSnap.id, ...reqSnap.data() } as MaterialRequisition;
  
  // Create material request for Purchase team
  const mrNumber = generateNumber('MR');
  const mrRef = await addDoc(collection(db, 'material_requests'), {
    requestNumber: mrNumber,
    sourceRequisitionId: requisitionId,
    sourceRequisitionNumber: requisition.requisitionNumber,
    requestedBy: sentBy,
    requestedByName: sentByName,
    requestedByRole: 'store',
    department: requisition.department,
    projectId: requisition.projectId,
    projectName: requisition.projectName,
    items: requisition.items.filter(i => !i.isAvailable || i.shortfallQty! > 0).map(item => ({
      materialId: item.materialId,
      materialCode: item.materialCode,
      materialName: item.materialName,
      currentStock: item.currentStock,
      requestedQty: item.shortfallQty || item.requestedQty,
      unit: item.unit,
      reason: `Shortfall for requisition ${requisition.requisitionNumber}`,
    })),
    urgency: requisition.urgency,
    requiredDate: requisition.requiredDate,
    reason: `Stock shortfall for ${requisition.requisitionNumber}. Original request by ${requisition.requestedByName}.`,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    notes,
  });
  
  // Notify Purchase team
  await addDoc(collection(db, COLLECTIONS.NOTIFICATIONS), {
    type: 'purchase_request',
    title: 'Material Purchase Required',
    message: `Stock shortage for ${requisition.requisitionNumber}. Purchase request created.`,
    documentType: 'material_request',
    documentId: mrRef.id,
    documentNumber: mrNumber,
    forRole: ['purchase', 'purchase_manager', 'admin'],
    priority: requisition.urgency === 'critical' ? 'high' : 'medium',
    isRead: false,
    createdAt: new Date().toISOString(),
  });
  
  // Log workflow
  await addDoc(collection(db, COLLECTIONS.WORKFLOW_LOGS), {
    requisitionId,
    requisitionNumber: requisition.requisitionNumber,
    materialRequestId: mrRef.id,
    materialRequestNumber: mrNumber,
    action: 'SENT_TO_PURCHASE',
    performedBy: sentBy,
    performedByName: sentByName,
    details: `Sent to purchase due to stock shortage`,
    timestamp: new Date().toISOString(),
  });
};

// ==========================================
// 7. SUBSCRIPTIONS (Real-time listeners)
// ==========================================

export const subscribeToRequisitions = (
  callback: (requisitions: MaterialRequisition[]) => void,
  filters?: { 
    status?: RequisitionStatus; 
    department?: string;
    requestedBy?: string;
  }
) => {
  let q = query(
    collection(db, COLLECTIONS.MATERIAL_REQUISITIONS),
    orderBy('createdAt', 'desc')
  );
  
  if (filters?.status) {
    q = query(
      collection(db, COLLECTIONS.MATERIAL_REQUISITIONS),
      where('status', '==', filters.status),
      orderBy('createdAt', 'desc')
    );
  }
  
  if (filters?.department) {
    q = query(
      collection(db, COLLECTIONS.MATERIAL_REQUISITIONS),
      where('department', '==', filters.department),
      orderBy('createdAt', 'desc')
    );
  }
  
  return onSnapshot(q, (snapshot) => {
    const requisitions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as MaterialRequisition[];
    callback(requisitions);
  });
};

export const subscribeToMaterialIssues = (
  callback: (issues: MaterialIssue[]) => void,
  filters?: {
    issuedTo?: string;
    department?: string;
  }
) => {
  let q = query(
    collection(db, COLLECTIONS.MATERIAL_ISSUES),
    orderBy('createdAt', 'desc')
  );
  
  if (filters?.issuedTo) {
    q = query(
      collection(db, COLLECTIONS.MATERIAL_ISSUES),
      where('issuedTo', '==', filters.issuedTo),
      orderBy('createdAt', 'desc')
    );
  }
  
  return onSnapshot(q, (snapshot) => {
    const issues = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as MaterialIssue[];
    callback(issues);
  });
};

// ==========================================
// 8. BOM-BASED MATERIAL ALLOCATION
// ==========================================

export const createBOMAllocation = async (
  projectId: string,
  projectName: string,
  bomItems: { materialId: string; materialName: string; requiredQty: number; unit: string }[],
  departmentAllocations: { departmentId: string; departmentName: string; percentage: number }[]
): Promise<string> => {
  // Calculate department-wise allocation
  const allocations: DepartmentAllocation[] = departmentAllocations.map(dept => ({
    departmentId: dept.departmentId,
    departmentName: dept.departmentName,
    materials: bomItems.map(item => ({
      materialId: item.materialId,
      materialName: item.materialName,
      allocatedQty: Math.ceil(item.requiredQty * (dept.percentage / 100)),
      issuedQty: 0,
      remainingQty: Math.ceil(item.requiredQty * (dept.percentage / 100)),
      unit: item.unit,
    })),
  }));
  
  const docRef = await addDoc(collection(db, COLLECTIONS.BOM_ALLOCATIONS), {
    projectId,
    projectName,
    bomId: generateNumber('BOM'),
    departmentAllocations: allocations,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  
  return docRef.id;
};

export const getBOMAllocationForDepartment = async (
  projectId: string,
  departmentId: string
): Promise<DepartmentAllocation | null> => {
  const q = query(
    collection(db, COLLECTIONS.BOM_ALLOCATIONS),
    where('projectId', '==', projectId)
  );
  
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  
  const allocation = snapshot.docs[0].data() as BOMAllocation;
  return allocation.departmentAllocations.find(d => d.departmentId === departmentId) || null;
};

// ==========================================
// 9. WORKFLOW STATUS HELPERS
// ==========================================

export const getWorkflowStatusLabel = (status: RequisitionStatus): string => {
  const labels: Record<RequisitionStatus, string> = {
    'pending': 'Pending Review',
    'stock_checking': 'Checking Stock',
    'stock_available': 'Stock Available',
    'stock_partial': 'Partial Stock',
    'stock_unavailable': 'No Stock',
    'ready_to_issue': 'Ready for Pickup',
    'issued': 'Issued',
    'rejected': 'Rejected',
    'cancelled': 'Cancelled',
  };
  return labels[status] || status;
};

export const getWorkflowStatusColor = (status: RequisitionStatus): string => {
  const colors: Record<RequisitionStatus, string> = {
    'pending': 'bg-yellow-500/20 text-yellow-400',
    'stock_checking': 'bg-blue-500/20 text-blue-400',
    'stock_available': 'bg-green-500/20 text-green-400',
    'stock_partial': 'bg-orange-500/20 text-orange-400',
    'stock_unavailable': 'bg-red-500/20 text-red-400',
    'ready_to_issue': 'bg-cyan-500/20 text-cyan-400',
    'issued': 'bg-emerald-500/20 text-emerald-400',
    'rejected': 'bg-red-500/20 text-red-400',
    'cancelled': 'bg-zinc-500/20 text-zinc-400',
  };
  return colors[status] || 'bg-zinc-500/20 text-zinc-400';
};

// ==========================================
// WORKFLOW SUMMARY
// ==========================================
/*
CLEAR MATERIAL WORKFLOW:

1. SUPERVISOR creates Material Requisition
   → Status: 'pending'
   → Notification sent to Store

2. STORE receives request and checks stock
   → checkStockAvailability()
   → Status: 'stock_available' | 'stock_partial' | 'stock_unavailable'

3a. If STOCK AVAILABLE:
    → Store approves for issue: approveForIssue()
    → Status: 'ready_to_issue'
    → Supervisor notified to collect

3b. If STOCK UNAVAILABLE:
    → Store sends to Purchase: sendToPurchase()
    → Creates Material Request for Purchase team
    → Purchase team creates PO

4. STORE issues material to Supervisor
   → issueMaterial()
   → Status: 'issued'
   → Inventory updated (stock decreased)
   → Issue record created

5. BOM-BASED ALLOCATION (Optional)
   → Materials allocated by department based on BOM
   → Each department gets their share
   → Tracked against project BOM

*/
