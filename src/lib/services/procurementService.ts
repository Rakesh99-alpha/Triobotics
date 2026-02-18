// ==========================================
// PROCUREMENT WORKFLOW SERVICE
// ==========================================
// Handles: BOM → Stock Check → Auto PR → Enquiry → PO → MD Approval

import { db } from '@/lib/firebase/client';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import {
  BillOfMaterials,
  PurchaseRequest,
  Enquiry,
  PurchaseOrder,
  COLLECTIONS,
  MD_APPROVAL_THRESHOLD,
  PRItem,
  BOMItem,
} from '@/types/purchase';

// ==========================================
// HELPER: Generate Document Numbers
// ==========================================
export const generateDocNumber = (prefix: string): string => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}-${year}${month}-${random}`;
};

// ==========================================
// 1. BILL OF MATERIALS (BOM) OPERATIONS
// ==========================================

export const createBOM = async (bomData: Omit<BillOfMaterials, 'id' | 'bomNumber' | 'createdAt' | 'status' | 'stockCheckResult'>): Promise<string> => {
  const bomNumber = generateDocNumber('BOM');
  const docRef = await addDoc(collection(db, COLLECTIONS.BILL_OF_MATERIALS), {
    ...bomData,
    bomNumber,
    createdAt: new Date().toISOString(),
    status: 'draft',
  });
  return docRef.id;
};

export const submitBOMForStockCheck = async (bomId: string): Promise<{ shortItems: PRItem[], allAvailable: boolean }> => {
  const bomRef = doc(db, COLLECTIONS.BILL_OF_MATERIALS, bomId);
  const bomSnap = await getDoc(bomRef);
  
  if (!bomSnap.exists()) throw new Error('BOM not found');
  
  const bom = bomSnap.data() as BillOfMaterials;
  
  // Check stock for each item
  const shortItems: PRItem[] = [];
  let itemsAvailable = 0;
  let itemsShort = 0;
  
  for (const item of bom.items) {
    // Get current stock from materials collection
    const materialsQuery = query(
      collection(db, COLLECTIONS.MATERIALS),
      where('code', '==', item.materialCode)
    );
    const materialSnap = await getDocs(materialsQuery);
    
    let currentStock = 0;
    let lastSupplier = '';
    let lastSupplierId = '';
    let lastPrice = 0;
    
    if (!materialSnap.empty) {
      const material = materialSnap.docs[0].data();
      currentStock = material.currentStock || 0;
      lastSupplier = material.lastSupplier || '';
      lastSupplierId = material.lastSupplierId || '';
      lastPrice = material.lastUnitPrice || material.averageUnitPrice || 0;
    }
    
    const shortfall = Math.max(0, item.requiredQty - currentStock);
    
    if (shortfall > 0) {
      itemsShort++;
      shortItems.push({
        materialId: item.materialId,
        materialCode: item.materialCode,
        materialName: item.materialName,
        requiredQty: item.requiredQty,
        currentStock,
        shortfall,
        unit: item.unit,
        estimatedUnitPrice: lastPrice,
        estimatedTotal: shortfall * lastPrice,
        suggestedSupplier: lastSupplier,
        suggestedSupplierId: lastSupplierId,
      });
    } else {
      itemsAvailable++;
    }
  }
  
  // Update BOM status
  await updateDoc(bomRef, {
    status: 'stock_checked',
    stockCheckResult: {
      checkedAt: new Date().toISOString(),
      itemsAvailable,
      itemsShort,
    },
  });
  
  return {
    shortItems,
    allAvailable: shortItems.length === 0,
  };
};

export const subscribeToBOMs = (callback: (boms: BillOfMaterials[]) => void) => {
  const q = query(
    collection(db, COLLECTIONS.BILL_OF_MATERIALS),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const boms = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as BillOfMaterials[];
    callback(boms);
  });
};

// ==========================================
// 2. PURCHASE REQUEST (PR) OPERATIONS
// ==========================================

export const createPRFromBOM = async (
  bomId: string,
  bomNumber: string,
  projectId: string,
  projectName: string,
  requestedBy: string,
  requestedByName: string,
  requiredDate: string,
  shortItems: PRItem[],
  priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'
): Promise<string> => {
  const prNumber = generateDocNumber('PR');
  const totalEstimated = shortItems.reduce((sum, item) => sum + item.estimatedTotal, 0);
  
  const docRef = await addDoc(collection(db, COLLECTIONS.PURCHASE_REQUESTS), {
    prNumber,
    bomId,
    bomNumber,
    projectId,
    projectName,
    requestedBy,
    requestedByName,
    createdAt: new Date().toISOString(),
    requiredDate,
    items: shortItems,
    totalEstimatedAmount: totalEstimated,
    status: 'pending_enquiry',
    priority,
    linkedEnquiries: [],
    linkedPOs: [],
  });
  
  // Update BOM with PR reference
  await updateDoc(doc(db, COLLECTIONS.BILL_OF_MATERIALS, bomId), {
    status: 'pr_generated',
    'stockCheckResult.prGenerated': docRef.id,
  });
  
  return docRef.id;
};

export const subscribeToPRs = (callback: (prs: PurchaseRequest[]) => void) => {
  const q = query(
    collection(db, COLLECTIONS.PURCHASE_REQUESTS),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const prs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as PurchaseRequest[];
    callback(prs);
  });
};

export const assignPR = async (prId: string, assignedTo: string, assignedToName: string) => {
  await updateDoc(doc(db, COLLECTIONS.PURCHASE_REQUESTS, prId), {
    assignedTo,
    assignedToName,
    status: 'enquiry_in_progress',
  });
};

// ==========================================
// 3. ENQUIRY OPERATIONS
// ==========================================

export const createEnquiry = async (
  prId: string,
  prNumber: string,
  createdBy: string,
  createdByName: string,
  items: { materialId: string; materialCode: string; materialName: string; requiredQty: number; unit: string }[],
  supplierIds: string[]
): Promise<string> => {
  const enquiryNumber = generateDocNumber('ENQ');
  
  const docRef = await addDoc(collection(db, COLLECTIONS.ENQUIRIES), {
    enquiryNumber,
    prId,
    prNumber,
    createdBy,
    createdByName,
    createdAt: new Date().toISOString(),
    items,
    suppliersContacted: supplierIds,
    quotes: [],
    status: 'sent_to_suppliers',
  });
  
  // Link enquiry to PR
  const prRef = doc(db, COLLECTIONS.PURCHASE_REQUESTS, prId);
  const prSnap = await getDoc(prRef);
  if (prSnap.exists()) {
    const pr = prSnap.data() as PurchaseRequest;
    await updateDoc(prRef, {
      linkedEnquiries: [...(pr.linkedEnquiries || []), docRef.id],
      status: 'enquiry_in_progress',
    });
  }
  
  return docRef.id;
};

export const addQuoteToEnquiry = async (
  enquiryId: string,
  quote: {
    supplierId: string;
    supplierName: string;
    supplierContact: string;
    supplierEmail: string;
    validUntil: string;
    items: { materialId: string; unitPrice: number; totalPrice: number; deliveryDays: number; remarks?: string }[];
    totalAmount: number;
    paymentTerms: string;
    deliveryTerms: string;
  }
) => {
  const enquiryRef = doc(db, COLLECTIONS.ENQUIRIES, enquiryId);
  const enquirySnap = await getDoc(enquiryRef);
  
  if (!enquirySnap.exists()) throw new Error('Enquiry not found');
  
  const enquiry = enquirySnap.data() as Enquiry;
  const newQuote = {
    ...quote,
    quotedAt: new Date().toISOString(),
    isSelected: false,
  };
  
  await updateDoc(enquiryRef, {
    quotes: [...enquiry.quotes, newQuote],
    status: 'quotes_received',
  });
};

export const selectQuote = async (enquiryId: string, quoteIndex: number) => {
  const enquiryRef = doc(db, COLLECTIONS.ENQUIRIES, enquiryId);
  const enquirySnap = await getDoc(enquiryRef);
  
  if (!enquirySnap.exists()) throw new Error('Enquiry not found');
  
  const enquiry = enquirySnap.data() as Enquiry;
  const updatedQuotes = enquiry.quotes.map((q, i) => ({
    ...q,
    isSelected: i === quoteIndex,
  }));
  
  await updateDoc(enquiryRef, {
    quotes: updatedQuotes,
    selectedQuoteIndex: quoteIndex,
    status: 'supplier_selected',
  });
};

export const subscribeToEnquiries = (callback: (enquiries: Enquiry[]) => void) => {
  const q = query(
    collection(db, COLLECTIONS.ENQUIRIES),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const enquiries = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Enquiry[];
    callback(enquiries);
  });
};

// ==========================================
// 4. PURCHASE ORDER (PO) OPERATIONS
// ==========================================

export const createPOFromEnquiry = async (
  enquiryId: string,
  createdBy: string,
  createdByName: string,
  expectedDelivery: string,
  notes?: string
): Promise<string> => {
  const enquiryRef = doc(db, COLLECTIONS.ENQUIRIES, enquiryId);
  const enquirySnap = await getDoc(enquiryRef);
  
  if (!enquirySnap.exists()) throw new Error('Enquiry not found');
  
  const enquiry = enquirySnap.data() as Enquiry;
  
  if (enquiry.selectedQuoteIndex === undefined) {
    throw new Error('No supplier selected');
  }
  
  const selectedQuote = enquiry.quotes[enquiry.selectedQuoteIndex];
  
  // Get supplier details
  const supplierRef = doc(db, COLLECTIONS.SUPPLIERS, selectedQuote.supplierId);
  const supplierSnap = await getDoc(supplierRef);
  const supplierData = supplierSnap.exists() ? supplierSnap.data() : {};
  
  const poNumber = generateDocNumber('PO');
  
  // Build PO items
  const poItems = selectedQuote.items.map((quoteItem, index) => {
    const enquiryItem = enquiry.items[index];
    return {
      itemID: quoteItem.materialId,
      itemName: enquiryItem?.materialName || '',
      itemCode: enquiryItem?.materialCode || '',
      quantity: enquiryItem?.requiredQty || 0,
      unit: enquiryItem?.unit || '',
      unitPrice: quoteItem.unitPrice,
      totalPrice: quoteItem.totalPrice,
      gstPercent: 18,
      gstAmount: quoteItem.totalPrice * 0.18,
    };
  });
  
  const subtotal = selectedQuote.totalAmount;
  const gstAmount = subtotal * 0.18;
  const totalAmount = subtotal + gstAmount;
  const requiresMDApproval = true; // All POs require MD approval
  
  const vendorDetails = {
    id: selectedQuote.supplierId,
    name: selectedQuote.supplierName,
    contact: selectedQuote.supplierContact,
    phone: supplierData.phone || '',
    email: selectedQuote.supplierEmail,
    gstin: supplierData.gstin || '',
    address: supplierData.address || '',
    city: supplierData.city || '',
  };
  
  const docRef = await addDoc(collection(db, COLLECTIONS.PURCHASE_ORDERS), {
    poNumber,
    prId: enquiry.prId,
    prNumber: enquiry.prNumber,
    enquiryId,
    enquiryNumber: enquiry.enquiryNumber,
    vendorDetails,
    items: poItems,
    subtotal,
    gstAmount,
    totalAmount,
    status: requiresMDApproval ? 'pending_md_approval' : 'approved',
    requiresMDApproval,
    approvalSteps: requiresMDApproval ? [
      { step: 1, approverRole: 'MD', status: 'pending' }
    ] : [],
    currentApprovalStep: requiresMDApproval ? 1 : 0,
    createdBy,
    createdByName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    expectedDelivery,
    paymentTerms: selectedQuote.paymentTerms,
    deliveryTerms: selectedQuote.deliveryTerms,
    notes,
  });
  
  // Update enquiry
  await updateDoc(enquiryRef, {
    status: 'po_created',
  });
  
  // Update PR
  if (enquiry.prId) {
    const prRef = doc(db, COLLECTIONS.PURCHASE_REQUESTS, enquiry.prId);
    const prSnap = await getDoc(prRef);
    if (prSnap.exists()) {
      const pr = prSnap.data() as PurchaseRequest;
      await updateDoc(prRef, {
        linkedPOs: [...(pr.linkedPOs || []), docRef.id],
        status: 'po_created',
      });
    }
  }
  
  return docRef.id;
};

export const subscribeToPOs = (callback: (pos: PurchaseOrder[]) => void) => {
  const q = query(
    collection(db, COLLECTIONS.PURCHASE_ORDERS),
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

export const subscribeToPendingApprovals = (callback: (pos: PurchaseOrder[]) => void) => {
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

// ==========================================
// 5. MD APPROVAL OPERATIONS
// ==========================================

export const approvePO = async (
  poId: string,
  approvedBy: string,
  approverName: string,
  comments?: string
) => {
  const poRef = doc(db, COLLECTIONS.PURCHASE_ORDERS, poId);
  
  await updateDoc(poRef, {
    status: 'approved',
    approvedBy,
    approvedAt: new Date().toISOString(),
    'approvalSteps.0.status': 'approved',
    'approvalSteps.0.approverId': approvedBy,
    'approvalSteps.0.approverName': approverName,
    'approvalSteps.0.comments': comments || '',
    'approvalSteps.0.timestamp': new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  
  // Add audit log
  await addDoc(collection(db, COLLECTIONS.AUDIT_LOG), {
    documentType: 'po',
    documentId: poId,
    action: 'MD_APPROVED',
    performedBy: approvedBy,
    performedByName: approverName,
    timestamp: new Date().toISOString(),
    newValue: 'approved',
    previousValue: 'pending_md_approval',
  });
};

export const rejectPO = async (
  poId: string,
  rejectedBy: string,
  rejectorName: string,
  reason: string
) => {
  const poRef = doc(db, COLLECTIONS.PURCHASE_ORDERS, poId);
  
  await updateDoc(poRef, {
    status: 'rejected',
    rejectedReason: reason,
    'approvalSteps.0.status': 'rejected',
    'approvalSteps.0.approverId': rejectedBy,
    'approvalSteps.0.approverName': rejectorName,
    'approvalSteps.0.comments': reason,
    'approvalSteps.0.timestamp': new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  
  // Add audit log
  await addDoc(collection(db, COLLECTIONS.AUDIT_LOG), {
    documentType: 'po',
    documentId: poId,
    action: 'MD_REJECTED',
    performedBy: rejectedBy,
    performedByName: rejectorName,
    timestamp: new Date().toISOString(),
    newValue: 'rejected',
    previousValue: 'pending_md_approval',
  });
};

// ==========================================
// 6. SUPPLIERS
// ==========================================

export const subscribeToSuppliers = (callback: (suppliers: any[]) => void) => {
  const q = query(collection(db, COLLECTIONS.SUPPLIERS));
  
  return onSnapshot(q, (snapshot) => {
    const suppliers = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(suppliers);
  });
};

// ==========================================
// 7. MATERIALS
// ==========================================

export const subscribeToMaterials = (callback: (materials: any[]) => void) => {
  const q = query(collection(db, COLLECTIONS.MATERIALS));
  
  return onSnapshot(q, (snapshot) => {
    const materials = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(materials);
  });
};

export const getMaterials = async () => {
  const snapshot = await getDocs(collection(db, COLLECTIONS.MATERIALS));
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
};
