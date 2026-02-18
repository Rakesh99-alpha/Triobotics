// ==========================================
// COMPLETE PROCUREMENT WORKFLOW TYPES
// ==========================================

// ==========================================
// 1. BILL OF MATERIALS (BOM) - Created by PM
// ==========================================
export interface BOMItem {
  materialId: string;
  materialCode: string;
  materialName: string;
  requiredQty: number;
  unit: string;
  currentStock: number;
  shortfall: number; // requiredQty - currentStock (if positive)
  estimatedCost: number;
  remarks?: string;
}

export interface BillOfMaterials {
  id: string;
  bomNumber: string;
  projectId: string;
  projectName: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  requiredDate: string;
  items: BOMItem[];
  totalEstimatedCost: number;
  status: 'draft' | 'submitted' | 'stock_checked' | 'pr_generated' | 'completed';
  stockCheckResult?: {
    checkedAt: string;
    itemsAvailable: number;
    itemsShort: number;
    prGenerated?: string; // PR ID if generated
  };
  notes?: string;
}

// ==========================================
// 2. PURCHASE REQUEST (PR) - Auto-generated from BOM
// ==========================================
export interface PRItem {
  materialId: string;
  materialCode: string;
  materialName: string;
  requiredQty: number;
  currentStock: number;
  shortfall: number;
  unit: string;
  estimatedUnitPrice: number;
  estimatedTotal: number;
  suggestedSupplier?: string;
  suggestedSupplierId?: string;
}

export type PRStatus = 
  | 'draft'
  | 'pending_enquiry'    // Waiting for purchase team to get quotes
  | 'enquiry_in_progress'
  | 'quotes_received'
  | 'po_created'
  | 'completed'
  | 'cancelled';

export interface PurchaseRequest {
  id: string;
  prNumber: string;
  bomId: string;
  bomNumber: string;
  projectId: string;
  projectName: string;
  requestedBy: string;
  requestedByName: string;
  createdAt: string;
  requiredDate: string;
  items: PRItem[];
  totalEstimatedAmount: number;
  status: PRStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  assignedToName?: string;
  notes?: string;
  linkedEnquiries: string[]; // Enquiry IDs
  linkedPOs: string[]; // PO IDs
}

// ==========================================
// 3. ENQUIRY - Created by Purchase Team
// ==========================================
export interface EnquiryItem {
  materialId: string;
  materialCode: string;
  materialName: string;
  requiredQty: number;
  unit: string;
}

export interface SupplierQuote {
  supplierId: string;
  supplierName: string;
  supplierContact: string;
  supplierEmail: string;
  quotedAt: string;
  validUntil: string;
  items: {
    materialId: string;
    unitPrice: number;
    totalPrice: number;
    deliveryDays: number;
    remarks?: string;
  }[];
  totalAmount: number;
  paymentTerms: string;
  deliveryTerms: string;
  isSelected: boolean;
  attachments?: string[];
}

export type EnquiryStatus = 
  | 'draft'
  | 'sent_to_suppliers'
  | 'quotes_received'
  | 'under_review'
  | 'supplier_selected'
  | 'po_created'
  | 'cancelled';

export interface Enquiry {
  id: string;
  enquiryNumber: string;
  prId: string;
  prNumber: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  items: EnquiryItem[];
  suppliersContacted: string[]; // Supplier IDs
  quotes: SupplierQuote[];
  selectedQuoteIndex?: number;
  status: EnquiryStatus;
  notes?: string;
}

// ==========================================
// 4. INVENTORY ITEM (Enhanced)
// ==========================================
export interface InventoryItem {
  id: string;
  itemID: string;
  name: string;
  code: string;
  category: 'Raw Material' | 'Consumable' | 'Tool' | 'Safety Equipment';
  currentStock: number;
  minLevel: number;
  unit: string;
  location: string;
  lastUpdated: string;
  lastSupplier?: string;
  lastUnitPrice?: number;
  averageUnitPrice?: number;
}

// ==========================================
// 5. VENDOR/SUPPLIER (Enhanced)
// ==========================================
export interface VendorDetails {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  gstin: string;
  address: string;
  city: string;
  state?: string;
  pincode?: string;
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    ifsc: string;
  };
  rating?: number; // 1-5
  totalOrders?: number;
  materialsSupplied?: string[]; // Material IDs
}

// ==========================================
// 6. PURCHASE ORDER (Enhanced)
// ==========================================
export interface POItem {
  itemID: string;
  itemName: string;
  itemCode: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  gstPercent?: number;
  gstAmount?: number;
}

export type POStatus = 
  | 'draft' 
  | 'pending_md_approval' 
  | 'approved' 
  | 'rejected' 
  | 'ordered'
  | 'partially_received'
  | 'received' 
  | 'cancelled';

export interface ApprovalStep {
  step: number;
  approverRole: string;
  approverId?: string;
  approverName?: string;
  status: 'pending' | 'approved' | 'rejected';
  comments?: string;
  timestamp?: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  prId?: string;
  prNumber?: string;
  enquiryId?: string;
  enquiryNumber?: string;
  vendorDetails: VendorDetails;
  items: POItem[];
  subtotal: number;
  gstAmount: number;
  totalAmount: number;
  status: POStatus;
  requiresMDApproval: boolean;
  approvalSteps: ApprovalStep[];
  currentApprovalStep: number;
  mdApprovalLink?: string;
  mdApprovalSignature?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedReason?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  expectedDelivery?: string;
  paymentTerms: string;
  deliveryTerms: string;
  notes?: string;
  attachments?: string[];
}

// ==========================================
// 7. GOODS RECEIPT NOTE (GRN)
// ==========================================
export interface GRNItem {
  itemID: string;
  itemName: string;
  orderedQty: number;
  receivedQty: number;
  unit: string;
  unitPrice: number;
  totalValue: number;
  qualityStatus: 'pending' | 'passed' | 'failed' | 'partial';
  remarks?: string;
}

export interface GoodsReceipt {
  id: string;
  grnNumber: string;
  poID: string;
  poNumber: string;
  vendorId: string;
  vendorName: string;
  items: GRNItem[];
  totalReceivedValue: number;
  receivedBy: string;
  receivedByName: string;
  receivedAt: string;
  status: 'pending' | 'quality_check' | 'verified' | 'completed' | 'rejected';
  invoiceNumber?: string;
  invoiceDate?: string;
  invoiceAmount?: number;
  vehicleNumber?: string;
  deliveryChallanNo?: string;
  remarks?: string;
}

// ==========================================
// 8. STORE INCOMING ORDER VIEW
// ==========================================
export interface IncomingOrder {
  id: string;
  poNumber: string;
  vendorName: string;
  items: POItem[];
  totalAmount: number;
  status: POStatus;
  expectedDelivery?: string;
  createdAt: string;
  canReceive: boolean;
}

// ==========================================
// 9. AUDIT TRAIL
// ==========================================
export interface AuditEntry {
  id: string;
  documentType: 'bom' | 'pr' | 'enquiry' | 'po' | 'grn';
  documentId: string;
  documentNumber: string;
  action: string;
  previousValue?: string;
  newValue?: string;
  performedBy: string;
  performedByName: string;
  timestamp: string;
  ipAddress?: string;
}

// ==========================================
// CONSTANTS
// ==========================================
export const MD_APPROVAL_THRESHOLD = 50000; // ₹50,000

export const COLLECTIONS = {
  INVENTORY: 'inventory',
  MATERIALS: 'inventory_materials',
  PURCHASE_ORDERS: 'purchase_orders',
  PURCHASE_REQUESTS: 'purchase_requests',
  BILL_OF_MATERIALS: 'bill_of_materials',
  ENQUIRIES: 'enquiries',
  GOODS_RECEIPTS: 'goods_receipts',
  VENDORS: 'vendors',
  SUPPLIERS: 'inventory_suppliers',
  AUDIT_LOG: 'audit_log',
} as const;

// Priority colors for UI
export const PRIORITY_COLORS = {
  low: 'bg-zinc-500',
  medium: 'bg-blue-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500',
} as const;

// Status colors for UI
export const STATUS_COLORS = {
  draft: 'bg-zinc-500',
  pending: 'bg-yellow-500',
  approved: 'bg-green-500',
  rejected: 'bg-red-500',
  completed: 'bg-emerald-500',
  cancelled: 'bg-zinc-600',
} as const;
