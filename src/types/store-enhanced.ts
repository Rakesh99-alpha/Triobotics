/**
 * Enhanced Store Management Types
 * Composite ERP - Advanced Inventory Features
 */

// ==========================================
// BATCH & LOCATION TRACKING
// ==========================================

export interface BatchInfo {
  id: string;
  batchNumber: string;
  materialId: string;
  quantity: number;
  manufactureDate?: string;
  expiryDate?: string;
  supplier: string;
  location: string;
  qualityStatus: QualityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface StorageLocation {
  id: string;
  code: string;
  name: string;
  type: 'warehouse' | 'rack' | 'bin' | 'zone';
  capacity: number;
  currentUtilization: number;
  temperature?: 'ambient' | 'cold' | 'frozen';
  isActive: boolean;
}

export interface StockTransfer {
  id: string;
  transferNumber: string;
  materialId: string;
  materialName: string;
  quantity: number;
  unit: string;
  fromLocation: string;
  toLocation: string;
  fromDepartment: string;
  toDepartment: string;
  requestedBy: string;
  approvedBy?: string;
  transferredBy?: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  reason: string;
  requestedAt: string;
  completedAt?: string;
}

// ==========================================
// QUALITY CONTROL
// ==========================================

export type QualityStatus = 'pending' | 'passed' | 'failed' | 'under_review' | 'conditional';

export interface QualityInspection {
  id: string;
  inspectionNumber: string;
  materialId: string;
  materialName: string;
  batchNumber?: string;
  grnId?: string;
  quantity: number;
  unit: string;
  inspectionType: 'incoming' | 'in_process' | 'final' | 'periodic';
  status: QualityStatus;
  inspector: string;
  inspectionDate: string;
  tests: QualityTest[];
  remarks?: string;
  attachments?: string[];
  acceptedQty: number;
  rejectedQty: number;
  reworkQty: number;
}

export interface QualityTest {
  parameter: string;
  expectedValue: string;
  actualValue: string;
  tolerance?: string;
  result: 'pass' | 'fail';
  remarks?: string;
}

export interface VendorReturn {
  id: string;
  returnNumber: string;
  grnId: string;
  vendorId: string;
  vendorName: string;
  items: VendorReturnItem[];
  reason: 'quality_issue' | 'wrong_item' | 'damaged' | 'excess_quantity' | 'other';
  description: string;
  status: 'initiated' | 'approved' | 'shipped' | 'completed';
  initiatedBy: string;
  initiatedAt: string;
  completedAt?: string;
  creditNoteNumber?: string;
  refundAmount?: number;
}

export interface VendorReturnItem {
  materialId: string;
  materialName: string;
  returnQty: number;
  unit: string;
  unitPrice: number;
  totalValue: number;
  batchNumber?: string;
  defectType?: string;
}

// ==========================================
// STOCK ALERTS & NOTIFICATIONS
// ==========================================

export interface StockAlert {
  id: string;
  alertType: 'low_stock' | 'out_of_stock' | 'expiry_near' | 'expired' | 'reorder' | 'overstock';
  severity: 'critical' | 'high' | 'medium' | 'low';
  materialId: string;
  materialName: string;
  currentStock: number;
  minStock?: number;
  maxStock?: number;
  expiryDate?: string;
  triggeredAt: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolved: boolean;
  resolvedAt?: string;
  message: string;
  actionRequired?: string;
}

export interface ReorderSuggestion {
  materialId: string;
  materialName: string;
  currentStock: number;
  minStock: number;
  avgConsumption: number;
  leadTime: number; // days
  suggestedQty: number;
  suggestedDate: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  estimatedCost: number;
  preferredSupplier?: string;
}

export interface ExpiryTracking {
  id: string;
  materialId: string;
  materialName: string;
  batchNumber: string;
  quantity: number;
  expiryDate: string;
  daysToExpiry: number;
  status: 'fresh' | 'expiring_soon' | 'expired';
  location: string;
  alertSent: boolean;
}

// ==========================================
// BARCODE & QR INTEGRATION
// ==========================================

export interface BarcodeData {
  type: 'material' | 'batch' | 'location' | 'grn';
  id: string;
  code: string;
  name: string;
  additionalInfo?: Record<string, unknown>;
}

export interface LabelPrintJob {
  id: string;
  labelType: 'material' | 'batch' | 'location' | 'bin' | 'rack';
  items: LabelItem[];
  template: 'standard' | 'compact' | 'detailed';
  createdBy: string;
  createdAt: string;
  printed: boolean;
  printedAt?: string;
}

export interface LabelItem {
  itemId: string;
  itemName: string;
  code: string;
  qrData: string;
  quantity?: number;
  location?: string;
  expiryDate?: string;
}

// ==========================================
// ANALYTICS & REPORTS
// ==========================================

export interface StockMovement {
  date: string;
  materialId: string;
  materialName: string;
  type: 'purchase' | 'issue' | 'transfer' | 'adjustment' | 'return';
  quantity: number;
  unit: string;
  reference?: string;
  department?: string;
  value?: number;
}

export interface InventoryAnalytics {
  totalValue: number;
  totalItems: number;
  lowStockItems: number;
  expiringSoon: number;
  outOfStock: number;
  avgTurnoverRate: number;
  deadStock: number;
  categoryBreakdown: CategoryStats[];
  topIssuedItems: MaterialUsage[];
  topSuppliers: SupplierStats[];
  monthlyTrends: MonthlyTrend[];
  departmentConsumption: DepartmentConsumption[];
}

export interface CategoryStats {
  category: string;
  itemCount: number;
  totalValue: number;
  percentage: number;
}

export interface MaterialUsage {
  materialId: string;
  materialName: string;
  totalIssued: number;
  unit: string;
  frequency: number;
  value: number;
}

export interface SupplierStats {
  supplierId: string;
  supplierName: string;
  totalOrders: number;
  totalValue: number;
  onTimeDelivery: number; // percentage
  qualityRating: number; // 0-5
}

export interface MonthlyTrend {
  month: string;
  purchases: number;
  issues: number;
  value: number;
  stockValue: number;
}

export interface DepartmentConsumption {
  department: string;
  totalValue: number;
  itemCount: number;
  topMaterials: { name: string; value: number }[];
}

// ==========================================
// STOCK ADJUSTMENT
// ==========================================

export interface StockAdjustment {
  id: string;
  adjustmentNumber: string;
  materialId: string;
  materialName: string;
  type: 'physical_count' | 'damage' | 'theft' | 'correction' | 'write_off';
  currentStock: number;
  adjustedStock: number;
  difference: number;
  reason: string;
  approvedBy?: string;
  adjustedBy: string;
  adjustedAt: string;
  batchNumber?: string;
  location?: string;
  cost: number;
}

// ==========================================
// DASHBOARD WIDGETS
// ==========================================

export interface DashboardWidget {
  id: string;
  type: 'stat' | 'chart' | 'table' | 'alert' | 'list';
  title: string;
  size: 'small' | 'medium' | 'large' | 'full';
  position: number;
  visible: boolean;
  config?: Record<string, unknown>;
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  action: string;
  color: string;
  count?: number;
}

// ==========================================
// FILTERS & SETTINGS
// ==========================================

export interface StoreFilters {
  searchTerm: string;
  category: string;
  supplier: string;
  location: string;
  status: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock' | 'expiring';
  dateRange?: { from: string; to: string };
  sortBy: 'name' | 'stock' | 'value' | 'updated';
  sortOrder: 'asc' | 'desc';
}

export interface StoreSettings {
  lowStockThreshold: number; // percentage of min stock
  expiryAlertDays: number; // days before expiry to alert
  autoReorder: boolean;
  defaultView: 'grid' | 'table' | 'compact';
  enableBarcodeScanning: boolean;
  requireQCForIncoming: boolean;
  allowNegativeStock: boolean;
  showValueInLists: boolean;
}

// ==========================================
// REPORT TYPES
// ==========================================

export type ReportType = 
  | 'stock_summary'
  | 'stock_movement'
  | 'consumption_by_dept'
  | 'supplier_performance'
  | 'slow_moving'
  | 'fast_moving'
  | 'expiry_report'
  | 'adjustment_report'
  | 'abc_analysis'
  | 'stock_valuation';

export interface ReportConfig {
  type: ReportType;
  dateRange: { from: string; to: string };
  filters?: Partial<StoreFilters>;
  format: 'pdf' | 'excel' | 'csv';
}
