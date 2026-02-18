// ==========================================
// EXTENDED ERP TYPES - Complete Feature Set
// ==========================================

// Firebase Timestamp import removed - using ISO strings instead

// ==========================================
// 1. STOCK ALERTS & NOTIFICATIONS
// ==========================================
export type AlertLevel = 'info' | 'warning' | 'critical' | 'out_of_stock';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'snoozed';

export interface StockAlert {
  id: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  alertLevel: AlertLevel;
  currentStock: number;
  minStock: number;
  reorderPoint: number;
  suggestedReorderQty: number;
  unit: string;
  supplierId?: string;
  supplierName?: string;
  status: AlertStatus;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  snoozedUntil?: string;
  createdAt: string;
  updatedAt: string;
  autoReorderTriggered: boolean;
  linkedPOId?: string;
}

export interface NotificationPreferences {
  userId: string;
  email: string;
  enableEmailAlerts: boolean;
  enableInAppAlerts: boolean;
  alertLevels: AlertLevel[];
  digestFrequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
  categories: string[];
}

// ==========================================
// 2. BATCH TRACKING
// ==========================================
export type BatchStatus = 'active' | 'quarantine' | 'expired' | 'consumed' | 'returned';

export interface MaterialBatch {
  id: string;
  batchNumber: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  supplierId: string;
  supplierName: string;
  purchaseOrderId: string;
  grnId?: string;
  quantity: number;
  remainingQty: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  manufacturingDate?: string;
  expiryDate?: string;
  receivedDate: string;
  location: string;
  qualityStatus: 'pending' | 'passed' | 'failed';
  qualityCheckDate?: string;
  qualityCheckedBy?: string;
  certificateNumber?: string;
  status: BatchStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BatchMovement {
  id: string;
  batchId: string;
  batchNumber: string;
  materialId: string;
  movementType: 'inward' | 'issue' | 'transfer' | 'return' | 'adjustment' | 'scrap';
  quantity: number;
  fromLocation?: string;
  toLocation?: string;
  reference: string;
  referenceType: 'po' | 'grn' | 'issue' | 'transfer' | 'audit' | 'manual';
  performedBy: string;
  performedByName: string;
  timestamp: string;
  notes?: string;
}

// ==========================================
// 3. MATERIAL TRANSFER SYSTEM
// ==========================================
export type TransferStatus = 
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'in_transit'
  | 'received'
  | 'completed'
  | 'cancelled';

export interface TransferItem {
  materialId: string;
  materialCode: string;
  materialName: string;
  batchId?: string;
  batchNumber?: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  notes?: string;
}

export interface MaterialTransfer {
  id: string;
  transferNumber: string;
  fromDepartment: string;
  toDepartment: string;
  fromLocation: string;
  toLocation: string;
  requestedBy: string;
  requestedByName: string;
  requestedAt: string;
  requiredDate?: string;
  items: TransferItem[];
  totalItems: number;
  totalValue: number;
  status: TransferStatus;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  reason: string;
  approvalRequired: boolean;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectedReason?: string;
  dispatchedBy?: string;
  dispatchedAt?: string;
  receivedBy?: string;
  receivedByName?: string;
  receivedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 4. INVENTORY AUDIT & CYCLE COUNT
// ==========================================
export type AuditType = 'full' | 'cycle' | 'spot' | 'annual';
export type AuditStatus = 'scheduled' | 'in_progress' | 'pending_review' | 'completed' | 'cancelled';
export type VarianceStatus = 'pending' | 'approved' | 'rejected' | 'write_off';

export interface AuditItem {
  materialId: string;
  materialCode: string;
  materialName: string;
  location: string;
  systemQty: number;
  countedQty: number | null;
  variance: number;
  variancePercent: number;
  varianceValue: number;
  unitCost: number;
  unit: string;
  status: 'pending' | 'counted' | 'verified' | 'adjusted';
  countedBy?: string;
  countedAt?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  notes?: string;
}

export interface InventoryAudit {
  id: string;
  auditNumber: string;
  auditType: AuditType;
  title: string;
  description?: string;
  scheduledDate: string;
  startedAt?: string;
  completedAt?: string;
  status: AuditStatus;
  assignedTo: string[];
  assignedToNames: string[];
  conductedBy?: string;
  conductedByName?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  items: AuditItem[];
  totalItems: number;
  countedItems: number;
  varianceItems: number;
  totalSystemValue: number;
  totalCountedValue: number;
  totalVarianceValue: number;
  adjustmentApprovedBy?: string;
  adjustmentApprovedAt?: string;
  notes?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockAdjustment {
  id: string;
  adjustmentNumber: string;
  auditId?: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  batchId?: string;
  adjustmentType: 'increase' | 'decrease' | 'write_off';
  previousQty: number;
  adjustedQty: number;
  difference: number;
  reason: string;
  reasonCategory: 'damage' | 'theft' | 'counting_error' | 'expiry' | 'quality_issue' | 'other';
  status: VarianceStatus;
  requestedBy: string;
  requestedByName: string;
  requestedAt: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectedReason?: string;
  notes?: string;
}

// ==========================================
// 5. MATERIAL RESERVATION
// ==========================================
export type ReservationStatus = 'pending' | 'confirmed' | 'partially_fulfilled' | 'fulfilled' | 'cancelled' | 'expired';

export interface ReservationItem {
  materialId: string;
  materialCode: string;
  materialName: string;
  reservedQty: number;
  issuedQty: number;
  pendingQty: number;
  unit: string;
  availableStock: number;
}

export interface MaterialReservation {
  id: string;
  reservationNumber: string;
  projectId: string;
  projectName: string;
  workOrderId?: string;
  workOrderNumber?: string;
  requestedBy: string;
  requestedByName: string;
  requestedAt: string;
  requiredDate: string;
  expiryDate: string;
  items: ReservationItem[];
  totalItems: number;
  status: ReservationStatus;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 6. ANALYTICS & KPIs
// ==========================================
export interface InventoryKPIs {
  totalStockValue: number;
  totalMaterials: number;
  lowStockItems: number;
  outOfStockItems: number;
  criticalItems: number;
  stockTurnoverRate: number;
  averageLeadTime: number;
  fulfillmentRate: number;
  wastagePercentage: number;
  topConsumingDepartments: { department: string; value: number }[];
  topMovingMaterials: { materialId: string; name: string; movement: number }[];
  slowMovingMaterials: { materialId: string; name: string; lastMovement: string }[];
  calculatedAt: string;
}

export interface ConsumptionTrend {
  materialId: string;
  materialName: string;
  period: string;
  periodType: 'daily' | 'weekly' | 'monthly';
  consumed: number;
  purchased: number;
  averageDaily: number;
  projectedRunout?: string;
  trend: 'increasing' | 'stable' | 'decreasing';
  trendPercent: number;
}

export interface SupplierScorecard {
  supplierId: string;
  supplierName: string;
  totalOrders: number;
  onTimeDeliveries: number;
  lateDeliveries: number;
  onTimeRate: number;
  qualityPassRate: number;
  averageLeadTime: number;
  totalPurchaseValue: number;
  returnsCount: number;
  returnsValue: number;
  priceCompetitiveness: number;
  overallRating: number;
  lastOrderDate: string;
  calculatedAt: string;
}

export interface CostAnalysis {
  materialId: string;
  materialName: string;
  currentPrice: number;
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
  priceHistory: { date: string; price: number; supplierId: string }[];
  priceTrend: 'increasing' | 'stable' | 'decreasing';
  trendPercent: number;
}

// ==========================================
// 7. REORDER AUTOMATION
// ==========================================
export type ReorderRuleStatus = 'active' | 'paused' | 'disabled';

export interface ReorderRule {
  id: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  triggerPoint: number;
  reorderQty: number;
  maxStock: number;
  preferredSupplierId?: string;
  preferredSupplierName?: string;
  leadTimeDays: number;
  autoApprove: boolean;
  autoApproveThreshold: number;
  status: ReorderRuleStatus;
  lastTriggered?: string;
  lastPOId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AutoReorderLog {
  id: string;
  ruleId: string;
  materialId: string;
  materialName: string;
  triggeredAt: string;
  triggerReason: string;
  stockAtTrigger: number;
  reorderQty: number;
  poGenerated: boolean;
  poId?: string;
  poNumber?: string;
  status: 'triggered' | 'po_created' | 'manual_required' | 'failed';
  failureReason?: string;
  processedBy?: string;
  processedAt?: string;
}

// ==========================================
// 8. REPORT EXPORT
// ==========================================
export type ReportFormat = 'excel' | 'pdf' | 'csv';
export type ReportType = 
  | 'inventory_summary'
  | 'stock_movement'
  | 'consumption_report'
  | 'purchase_history'
  | 'supplier_performance'
  | 'audit_report'
  | 'low_stock_alert'
  | 'material_valuation'
  | 'department_usage';

export interface ReportConfig {
  id: string;
  reportType: ReportType;
  title: string;
  description: string;
  filters: {
    dateFrom?: string;
    dateTo?: string;
    categories?: string[];
    suppliers?: string[];
    departments?: string[];
    materials?: string[];
  };
  columns: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  groupBy?: string;
  includeCharts: boolean;
  format: ReportFormat;
  scheduleEnabled: boolean;
  scheduleFrequency?: 'daily' | 'weekly' | 'monthly';
  scheduleTime?: string;
  emailRecipients?: string[];
  createdBy: string;
  createdAt: string;
}

export interface ReportHistory {
  id: string;
  reportConfigId: string;
  reportType: ReportType;
  title: string;
  generatedBy: string;
  generatedByName: string;
  generatedAt: string;
  format: ReportFormat;
  fileUrl?: string;
  fileSize?: number;
  rowCount: number;
  status: 'generating' | 'completed' | 'failed';
  errorMessage?: string;
}

// ==========================================
// FIREBASE COLLECTION NAMES
// ==========================================
export const ERP_COLLECTIONS = {
  // Existing
  MATERIALS: 'inventory_materials',
  SUPPLIERS: 'inventory_suppliers',
  PURCHASE_ENTRIES: 'inventory_purchase_entries',
  ISSUE_RECORDS: 'inventory_issue_records',
  
  // New collections
  STOCK_ALERTS: 'stock_alerts',
  BATCHES: 'material_batches',
  BATCH_MOVEMENTS: 'batch_movements',
  TRANSFERS: 'material_transfers',
  AUDITS: 'inventory_audits',
  ADJUSTMENTS: 'stock_adjustments',
  RESERVATIONS: 'material_reservations',
  REORDER_RULES: 'reorder_rules',
  AUTO_REORDER_LOGS: 'auto_reorder_logs',
  KPI_SNAPSHOTS: 'inventory_kpi_snapshots',
  CONSUMPTION_TRENDS: 'consumption_trends',
  SUPPLIER_SCORECARDS: 'supplier_scorecards',
  REPORT_CONFIGS: 'report_configs',
  REPORT_HISTORY: 'report_history',
} as const;

// ==========================================
// HELPER CONSTANTS
// ==========================================
export const DEPARTMENTS = [
  'Stock Building',
  'Machining',
  'Pattern Finishing',
  'Lamination',
  'Mold Finishing',
  'Welding',
  'Assembly',
  'CMM',
  'Trimline',
  'Quality',
  'Maintenance',
  'R&D',
  'Production',
  'Tooling'
] as const;

export const LOCATIONS = [
  'Main Store',
  'Production Floor',
  'Assembly Area',
  'Quality Lab',
  'R&D Lab',
  'Tooling Store',
  'Maintenance Store',
  'New Factory',
  'Quarantine Zone'
] as const;

export const ALERT_LEVEL_CONFIG = {
  info: { color: 'bg-blue-500', icon: 'Info', threshold: 0.5 },
  warning: { color: 'bg-yellow-500', icon: 'AlertTriangle', threshold: 0.25 },
  critical: { color: 'bg-orange-500', icon: 'AlertOctagon', threshold: 0.1 },
  out_of_stock: { color: 'bg-red-500', icon: 'XCircle', threshold: 0 }
} as const;

export const VARIANCE_THRESHOLDS = {
  acceptable: 2, // 2% variance is acceptable
  review: 5, // 5% needs review
  critical: 10 // 10%+ is critical
} as const;
