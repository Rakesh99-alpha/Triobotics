// ==========================================
// MANUFACTURING TYPES - eBOM, mBOM, MRP, Production Orders
// Triovision Composite Technologies Pvt Ltd
// ==========================================

// ==========================================
// 1. ENGINEERING BILL OF MATERIALS (eBOM)
// Created by Design/Engineering team
// ==========================================

export type BOMStatus = 'draft' | 'pending_review' | 'approved' | 'released' | 'obsolete';
export type BOMType = 'engineering' | 'manufacturing' | 'service' | 'phantom';

export interface eBOMItem {
  id: string;
  itemNumber: number;           // Line number in BOM
  materialId: string;
  materialCode: string;
  materialName: string;
  category: 'Raw Material' | 'Component' | 'Sub-Assembly' | 'Bought-Out' | 'Consumable';
  
  // Quantities
  requiredQty: number;          // Base required quantity
  unit: string;
  wastagePercent: number;       // Wastage/scrap factor (e.g., 5%)
  grossQty: number;             // requiredQty * (1 + wastagePercent/100)
  
  // Stock & Shortage
  currentStock: number;
  allocatedStock: number;       // Already reserved for other projects
  availableStock: number;       // currentStock - allocatedStock
  shortfall: number;            // grossQty - availableStock (if positive)
  
  // Cost Estimation
  estimatedUnitCost: number;
  estimatedTotalCost: number;   // grossQty * estimatedUnitCost
  
  // Specifications
  specifications?: string;
  drawingNumber?: string;
  revision?: string;
  
  // Hierarchy (for multi-level BOM)
  parentItemId?: string;        // For sub-assemblies
  level: number;                // 0 = top level, 1 = sub-level, etc.
  
  // Procurement hints
  preferredSupplierId?: string;
  preferredSupplierName?: string;
  leadTimeDays: number;
  
  // Flags
  isCritical: boolean;          // Critical path item
  isOptional: boolean;          // Optional/alternate item
  alternateItemId?: string;     // Alternate material if available
}

export interface EngineeringBOM {
  id: string;
  bomNumber: string;            // e.g., eBOM-2601-001
  revision: string;             // e.g., Rev A, Rev B
  
  // Project/Product Link
  projectId: string;
  projectCode: string;
  projectName: string;
  productName: string;
  productCode?: string;
  
  // Customer Info
  customerId?: string;
  customerName?: string;
  customerPO?: string;
  
  // Design Details
  designedBy: string;
  designedByName: string;
  designDate: string;
  
  // Quantities
  productQty: number;           // Number of products to manufacture
  unitOfMeasure: string;        // SQM, Nos, Sets, etc.
  
  // Items
  items: eBOMItem[];
  totalItems: number;
  totalLevels: number;          // BOM depth
  
  // Cost Summary
  totalMaterialCost: number;
  totalWastageCost: number;
  contingencyPercent: number;   // Additional buffer (e.g., 5%)
  contingencyAmount: number;
  grandTotalCost: number;
  
  // Stock Analysis Summary
  itemsInStock: number;         // Items with full availability
  itemsPartialStock: number;    // Items with partial availability
  itemsOutOfStock: number;      // Items with zero stock
  criticalItems: number;        // Items marked as critical
  totalShortfallValue: number;  // Total value of shortfall items
  
  // Workflow
  status: BOMStatus;
  checkedBy?: string;
  checkedByName?: string;
  checkedAt?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  releasedBy?: string;
  releasedAt?: string;
  
  // mBOM Conversion
  mBOMId?: string;              // Linked manufacturing BOM
  mBOMNumber?: string;
  convertedToMBOM: boolean;
  
  // Audit
  createdAt: string;
  updatedAt: string;
  history: BOMHistoryEntry[];
  
  // Notes
  designNotes?: string;
  manufacturingNotes?: string;
}

export interface BOMHistoryEntry {
  action: string;
  by: string;
  byName: string;
  at: string;
  details?: string;
  previousRevision?: string;
  newRevision?: string;
}

// ==========================================
// 2. MANUFACTURING BILL OF MATERIALS (mBOM)
// Created from eBOM with manufacturing additions
// ==========================================

export interface mBOMItem extends eBOMItem {
  // Additional Manufacturing Details
  operationId?: string;         // Which operation uses this material
  operationName?: string;
  workCenterId?: string;        // Where it's consumed
  workCenterName?: string;
  
  // Consumption Type
  consumptionType: 'issue' | 'backflush' | 'floor_stock';
  issuePoint: 'start' | 'operation' | 'end';
  
  // Batch/Lot Tracking
  requiresBatchTracking: boolean;
  shelfLifeDays?: number;
  
  // Quality Requirements
  requiresInspection: boolean;
  inspectionType?: 'incoming' | 'in_process' | 'final';
  
  // Actual Consumption (filled during production)
  issuedQty: number;
  returnedQty: number;
  actualConsumedQty: number;
  varianceQty: number;          // actualConsumed - grossQty
  variancePercent: number;
}

export interface RoutingOperation {
  id: string;
  operationNumber: number;      // Sequence: 10, 20, 30...
  operationName: string;
  operationCode: string;
  
  // Work Center
  workCenterId: string;
  workCenterName: string;
  departmentId: string;
  departmentName: string;
  
  // Time Standards (in minutes)
  setupTime: number;
  runTimePerUnit: number;
  moveTime: number;             // Time to next operation
  queueTime: number;            // Wait time before operation
  totalTimePerUnit: number;
  
  // Capacity
  machinesRequired: number;
  operatorsRequired: number;
  skillLevel: 'unskilled' | 'semi_skilled' | 'skilled' | 'highly_skilled';
  
  // Costs
  laborRatePerHour: number;
  overheadRatePerHour: number;
  estimatedLaborCost: number;
  estimatedOverheadCost: number;
  
  // Quality
  inspectionRequired: boolean;
  inspectionPoints?: string[];
  qualityChecklistId?: string;
  
  // Dependencies
  predecessorOperations: number[];  // Operation numbers that must complete first
  canRunParallel: boolean;
  
  // Instructions
  workInstructions?: string;
  safetyInstructions?: string;
  toolingRequired?: string[];
  
  // Completion Tracking
  status: 'pending' | 'in_progress' | 'completed' | 'on_hold';
  completedQty: number;
  completedAt?: string;
  completedBy?: string;
}

export interface ManufacturingBOM {
  id: string;
  mBOMNumber: string;           // e.g., mBOM-2601-001
  revision: string;
  
  // Source eBOM
  eBOMId: string;
  eBOMNumber: string;
  eBOMRevision: string;
  
  // Project/Product
  projectId: string;
  projectCode: string;
  projectName: string;
  productName: string;
  productQty: number;
  
  // Materials (enhanced from eBOM)
  items: mBOMItem[];
  
  // Routing (Manufacturing Process)
  routing: RoutingOperation[];
  totalOperations: number;
  totalSetupTime: number;
  totalRunTime: number;
  
  // Labor & Overhead
  totalLaborHours: number;
  totalLaborCost: number;
  totalOverheadCost: number;
  
  // Additional Consumables (not in eBOM)
  consumables: mBOMItem[];      // Gloves, tape, release agents, etc.
  consumablesCost: number;
  
  // Total Cost Summary
  materialCost: number;         // From eBOM items
  laborCost: number;
  overheadCost: number;
  consumablesCost2: number;
  subcontractingCost: number;
  totalManufacturingCost: number;
  
  // Status
  status: BOMStatus;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  
  // Production Order Link
  productionOrderIds: string[];
}

// ==========================================
// 3. MATERIAL REQUIREMENT PLANNING (MRP)
// ==========================================

export type MRPStatus = 'draft' | 'running' | 'completed' | 'error' | 'cancelled';
export type AllocationStatus = 'pending' | 'soft_allocated' | 'hard_allocated' | 'issued' | 'returned';

export interface MRPItem {
  id: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  unit: string;
  
  // Requirements
  grossRequirement: number;     // From mBOM (including wastage)
  scheduledReceipts: number;    // On-order qty (from pending POs)
  projectedOnHand: number;      // Current stock - allocations
  netRequirement: number;       // grossRequirement - projectedOnHand - scheduledReceipts
  
  // Ordering
  lotSize: number;              // Min order qty (MOQ)
  safetyStock: number;          // Buffer stock
  plannedOrderQty: number;      // Rounded to lot size
  
  // Timing
  leadTimeDays: number;
  orderDueDate: string;         // When order should be placed
  receiptDueDate: string;       // When material should arrive
  productionStartDate: string;  // When production needs it
  
  // Status
  allocationStatus: AllocationStatus;
  allocatedQty: number;
  allocatedAt?: string;
  
  // Procurement
  requiresPR: boolean;          // Needs Purchase Requisition
  prId?: string;
  prNumber?: string;
  poId?: string;
  poNumber?: string;
  
  // Supplier
  preferredSupplierId?: string;
  preferredSupplierName?: string;
  lastPurchasePrice?: number;
  
  // Flags
  isCriticalPath: boolean;
  isBottleneck: boolean;
  hasAlternate: boolean;
  alternateItemId?: string;
}

export interface MRPRun {
  id: string;
  mrpNumber: string;            // e.g., MRP-2601-001
  
  // Scope
  projectId?: string;           // Single project or...
  projectIds?: string[];        // Multiple projects
  runScope: 'single_project' | 'multi_project' | 'plant_wide';
  
  // Planning Parameters
  planningHorizonDays: number;  // e.g., 30, 60, 90 days
  planningStartDate: string;
  planningEndDate: string;
  
  // mBOM References
  mBOMIds: string[];
  totalMBOMs: number;
  
  // Results
  items: MRPItem[];
  totalItems: number;
  
  // Summary
  itemsFullyAvailable: number;
  itemsPartiallyAvailable: number;
  itemsToOrder: number;
  
  totalGrossRequirement: number;
  totalNetRequirement: number;
  totalOrderValue: number;
  
  criticalPathItems: number;
  bottleneckItems: number;
  
  // PR Generation
  autoGeneratePR: boolean;
  generatedPRIds: string[];
  generatedPRCount: number;
  
  // Execution
  status: MRPStatus;
  runStartedAt?: string;
  runCompletedAt?: string;
  runDuration?: number;         // in seconds
  
  // Errors/Warnings
  errors: MRPError[];
  warnings: MRPWarning[];
  
  // Audit
  runBy: string;
  runByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface MRPError {
  itemId: string;
  materialCode: string;
  errorType: 'no_supplier' | 'no_lead_time' | 'no_price' | 'invalid_lot_size' | 'circular_bom';
  message: string;
}

export interface MRPWarning {
  itemId: string;
  materialCode: string;
  warningType: 'long_lead_time' | 'low_safety_stock' | 'high_cost' | 'single_source' | 'expiring_soon';
  message: string;
}

// ==========================================
// 4. PRODUCTION ORDER
// ==========================================

export type ProductionOrderStatus = 
  | 'draft'
  | 'planned'
  | 'released'
  | 'in_progress'
  | 'on_hold'
  | 'completed'
  | 'closed'
  | 'cancelled';

export interface ProductionOrderMaterial extends mBOMItem {
  // Actual Tracking
  requisitionedQty: number;
  issuedQty: number;
  returnedQty: number;
  actualConsumedQty: number;
  
  // Variance
  plannedQty: number;
  varianceQty: number;
  variancePercent: number;
  varianceValue: number;
  
  // Variance Escalation
  varianceLevel: 'none' | 'supervisor' | 'pm' | 'md';
  escalatedAt?: string;
  escalatedTo?: string;
  escalationReason?: string;
  escalationApproved?: boolean;
  escalationApprovedBy?: string;
  escalationApprovedAt?: string;
  
  // Issue Records
  issueRecords: MaterialIssueRecord[];
}

export interface MaterialIssueRecord {
  id: string;
  issuedQty: number;
  issuedAt: string;
  issuedBy: string;
  issuedByName: string;
  batchId?: string;
  batchNumber?: string;
  operationId?: string;
  workCenterId?: string;
  notes?: string;
}

export interface ProductionOrderOperation extends RoutingOperation {
  // Scheduling
  scheduledStartDate: string;
  scheduledEndDate: string;
  actualStartDate?: string;
  actualEndDate?: string;
  
  // Progress
  plannedQty: number;
  completedQty: number;
  rejectedQty: number;
  progressPercent: number;
  
  // Assignment
  assignedTo?: string;
  assignedToName?: string;
  supervisor?: string;
  supervisorName?: string;
  
  // Time Tracking
  actualSetupTime?: number;
  actualRunTime?: number;
  actualTotalTime?: number;
  
  // Variance
  timeVariance?: number;        // actual - planned
  costVariance?: number;
  
  // Quality
  inspectionDone: boolean;
  inspectionResult?: 'pass' | 'fail' | 'conditional';
  defectsFound?: number;
  reworkRequired?: boolean;
}

export interface ProductionOrder {
  id: string;
  orderNumber: string;          // e.g., PO-2601-001 (Production Order, not Purchase Order!)
  
  // Source
  mBOMId: string;
  mBOMNumber: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  
  // Product
  productName: string;
  productCode?: string;
  orderQty: number;
  completedQty: number;
  rejectedQty: number;
  pendingQty: number;
  unit: string;
  
  // Customer
  customerId?: string;
  customerName?: string;
  customerPO?: string;
  
  // Schedule
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate?: string;
  actualEndDate?: string;
  dueDate: string;
  
  // Priority
  priority: 'low' | 'normal' | 'high' | 'urgent';
  sequenceNumber: number;       // For scheduling
  
  // Materials
  materials: ProductionOrderMaterial[];
  materialsCost: number;
  
  // Operations/Routing
  operations: ProductionOrderOperation[];
  currentOperationNumber: number;
  operationsCompleted: number;
  totalOperations: number;
  
  // Costs
  plannedMaterialCost: number;
  plannedLaborCost: number;
  plannedOverheadCost: number;
  plannedTotalCost: number;
  
  actualMaterialCost: number;
  actualLaborCost: number;
  actualOverheadCost: number;
  actualTotalCost: number;
  
  costVariance: number;
  costVariancePercent: number;
  
  // Progress
  progressPercent: number;
  status: ProductionOrderStatus;
  
  // Assignment
  productionManager?: string;
  productionManagerName?: string;
  
  // Audit
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  releasedBy?: string;
  releasedAt?: string;
  completedBy?: string;
  completedAt?: string;
  closedBy?: string;
  closedAt?: string;
  
  // History
  history: ProductionOrderHistoryEntry[];
  
  // Notes
  productionNotes?: string;
  qualityNotes?: string;
}

export interface ProductionOrderHistoryEntry {
  action: string;
  by: string;
  byName: string;
  at: string;
  details?: string;
  operationNumber?: number;
  previousStatus?: string;
  newStatus?: string;
}

// ==========================================
// 5. VARIANCE TRACKING & ESCALATION
// ==========================================

export type VarianceType = 'material' | 'time' | 'cost';
export type EscalationLevel = 'supervisor' | 'pm' | 'md';
export type VarianceDecision = 'approved' | 'rejected' | 'pending' | 'auto_approved' | 'timeout_escalated';

export interface MaterialVariance {
  id: string;
  varianceNumber: string;       // e.g., VAR-2601-001
  
  // Source
  productionOrderId: string;
  productionOrderNumber: string;
  operationId?: string;
  operationNumber?: number;
  projectId: string;
  projectCode: string;
  
  // Material
  materialId: string;
  materialCode: string;
  materialName: string;
  unit: string;
  
  // Quantities
  bomQty: number;               // Planned from mBOM
  issuedQty: number;            // Total issued
  returnedQty: number;          // Returned unused
  actualConsumedQty: number;    // issuedQty - returnedQty
  varianceQty: number;          // actualConsumed - bomQty
  variancePercent: number;      // (varianceQty / bomQty) * 100
  
  // Value
  unitCost: number;
  varianceValue: number;        // varianceQty * unitCost
  
  // Thresholds
  threshold5Percent: number;    // Supervisor level
  threshold10Percent: number;   // PM level
  threshold15Percent: number;   // MD level
  
  // Escalation
  currentLevel: EscalationLevel;
  escalationHistory: EscalationEntry[];
  
  // Decision
  status: VarianceDecision;
  reason?: string;              // Reason for variance
  reasonCategory?: 'process_issue' | 'quality_issue' | 'measurement_error' | 'damage' | 'design_change' | 'other';
  
  // Approval
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedReason?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export interface EscalationEntry {
  level: EscalationLevel;
  escalatedAt: string;
  escalatedTo: string;
  escalatedToName: string;
  timeoutHours: number;         // Time before auto-escalation
  deadline: string;             // When it will auto-escalate
  action?: VarianceDecision;
  actionAt?: string;
  actionBy?: string;
  actionNotes?: string;
}

// ==========================================
// 6. OVER-BOM CONSUMPTION REQUEST
// ==========================================

export interface OverBOMRequest {
  id: string;
  requestNumber: string;        // e.g., OBR-2601-001
  
  // Source
  productionOrderId: string;
  productionOrderNumber: string;
  operationId?: string;
  workCenterId?: string;
  
  // Material
  materialId: string;
  materialCode: string;
  materialName: string;
  unit: string;
  
  // Quantities
  bomQty: number;
  alreadyIssuedQty: number;
  additionalRequestedQty: number;
  totalAfterApproval: number;   // alreadyIssued + additionalRequested
  overBOMPercent: number;       // How much over BOM
  
  // Value
  unitCost: number;
  additionalCost: number;
  
  // Reason
  reason: string;
  reasonCategory: 'rework' | 'damage' | 'testing' | 'design_change' | 'process_optimization' | 'other';
  justification: string;
  
  // Requester
  requestedBy: string;
  requestedByName: string;
  requestedByRole: string;
  requestedAt: string;
  
  // Approval Chain
  approvalLevel: EscalationLevel;
  approvalChain: ApprovalStep[];
  
  // Status
  status: 'pending' | 'approved' | 'rejected' | 'partial_approved' | 'expired';
  
  // Timeout & Auto-escalation
  timeoutHours: number;
  deadline: string;
  autoEscalate: boolean;
  
  // Resolution
  approvedQty?: number;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedReason?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalStep {
  level: EscalationLevel;
  approver?: string;
  approverName?: string;
  status: 'pending' | 'approved' | 'rejected' | 'skipped' | 'timeout';
  actionAt?: string;
  notes?: string;
}

// ==========================================
// 7. PROJECT COSTING & PROFITABILITY
// ==========================================

export interface ProjectCostSummary {
  id: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  customerId?: string;
  customerName?: string;
  
  // Budgeted (from Quotation/mBOM)
  budgetedMaterialCost: number;
  budgetedLaborCost: number;
  budgetedOverheadCost: number;
  budgetedSubcontractCost: number;
  budgetedOtherCost: number;
  totalBudgetedCost: number;
  
  // Actual
  actualMaterialCost: number;
  actualLaborCost: number;
  actualOverheadCost: number;
  actualSubcontractCost: number;
  actualOtherCost: number;
  totalActualCost: number;
  
  // Variance
  materialCostVariance: number;
  laborCostVariance: number;
  overheadCostVariance: number;
  totalCostVariance: number;
  costVariancePercent: number;
  
  // Revenue
  quotedPrice: number;
  invoicedAmount: number;
  receivedAmount: number;
  pendingAmount: number;
  
  // Profitability
  grossProfit: number;          // quotedPrice - totalActualCost
  grossMarginPercent: number;   // (grossProfit / quotedPrice) * 100
  netProfit: number;            // After overhead allocation
  netMarginPercent: number;
  
  // Efficiency
  materialEfficiency: number;   // (budgeted / actual) * 100
  laborEfficiency: number;
  overallEfficiency: number;
  
  // Timeline
  plannedDuration: number;      // days
  actualDuration: number;
  timeVariance: number;
  onTimeDelivery: boolean;
  
  // Status
  status: 'in_progress' | 'completed' | 'closed';
  completedAt?: string;
  closedAt?: string;
  closedBy?: string;
  
  // Lessons Learned
  lessonsLearned?: string;
  improvementSuggestions?: string[];
  
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 8. KPIs & METRICS
// ==========================================

export interface ManufacturingKPIs {
  // Material KPIs
  materialYield: number;        // (Output / Input) * 100
  scrapRate: number;            // (Scrap / Total Consumed) * 100
  bomAccuracy: number;          // (Actual within 5% of BOM) * 100
  inventoryTurnover: number;    // COGS / Average Inventory
  
  // Production KPIs
  productionEfficiency: number; // (Standard Time / Actual Time) * 100
  machineUtilization: number;   // (Running Time / Available Time) * 100
  firstPassYield: number;       // (Good Output / Total Output) * 100
  onTimeDelivery: number;       // (On-time / Total) * 100
  
  // Procurement KPIs
  supplierOnTimeDelivery: number; // DIFOT - Delivery In Full On Time
  poAccuracy: number;           // POs without errors
  prToPoConversionTime: number; // Avg days from PR to PO
  costSavings: number;          // Negotiated savings
  
  // Quality KPIs
  incomingQualityRate: number;  // (Passed / Total Inspected) * 100
  defectRate: number;           // Defects per unit
  customerComplaintRate: number;
  reworkRate: number;
  
  // Inventory KPIs
  stockAccuracy: number;        // (Accurate counts / Total counts) * 100
  stockoutRate: number;         // (Stockout events / Total SKUs) * 100
  excessStock: number;          // Value of excess inventory
  deadStock: number;            // Value of no-movement stock
  
  // Calculated Period
  periodStart: string;
  periodEnd: string;
  calculatedAt: string;
}

// ==========================================
// FIREBASE COLLECTIONS
// ==========================================

export const MANUFACTURING_COLLECTIONS = {
  EBOM: 'engineering_boms',
  MBOM: 'manufacturing_boms',
  MRP_RUNS: 'mrp_runs',
  PRODUCTION_ORDERS: 'production_orders',
  MATERIAL_VARIANCES: 'material_variances',
  OVER_BOM_REQUESTS: 'over_bom_requests',
  PROJECT_COSTS: 'project_cost_summaries',
  MANUFACTURING_KPIS: 'manufacturing_kpis',
  ROUTING_TEMPLATES: 'routing_templates',
  WORK_CENTERS: 'work_centers',
} as const;

// ==========================================
// CONSTANTS
// ==========================================

export const VARIANCE_THRESHOLDS = {
  SUPERVISOR: 5,    // 5% variance - Supervisor approval
  PM: 10,           // 10% variance - PM approval
  MD: 15,           // 15% variance - MD approval
} as const;

export const ESCALATION_TIMEOUT_HOURS = {
  SUPERVISOR: 4,    // 4 hours before escalating to PM
  PM: 4,            // 4 hours before escalating to MD
  MD: 8,            // 8 hours before auto-approval/rejection
} as const;

export const CONSUMPTION_TYPES = [
  { id: 'issue', name: 'Direct Issue', description: 'Material issued before operation' },
  { id: 'backflush', name: 'Backflush', description: 'Auto-deduct on operation completion' },
  { id: 'floor_stock', name: 'Floor Stock', description: 'Always available, periodic reconciliation' },
] as const;

export const REASON_CATEGORIES = [
  { id: 'process_issue', name: 'Process Issue', description: 'Manufacturing process problem' },
  { id: 'quality_issue', name: 'Quality Issue', description: 'Material or product quality problem' },
  { id: 'measurement_error', name: 'Measurement Error', description: 'Incorrect measurement/weighing' },
  { id: 'damage', name: 'Damage', description: 'Material damaged during handling' },
  { id: 'design_change', name: 'Design Change', description: 'Engineering change during production' },
  { id: 'rework', name: 'Rework', description: 'Additional material for rework' },
  { id: 'testing', name: 'Testing', description: 'Material used for testing/sampling' },
  { id: 'other', name: 'Other', description: 'Other reason' },
] as const;
