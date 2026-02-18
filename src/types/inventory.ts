export type StockStatus = 'ok' | 'low' | 'critical' | 'out';

export function getStockStatus(currentStock: number | string, minStock: number | string): StockStatus {
  const cur = Number(currentStock || 0);
  const min = Number(minStock || 0);
  if (cur <= 0) return 'out';
  if (min > 0 && cur <= Math.max(1, Math.floor(min * 0.25))) return 'critical';
  if (min > 0 && cur <= min) return 'low';
  return 'ok';
}

export interface StockAlert {
  id: string;
  level: 'warning' | 'critical' | 'out_of_stock' | string;
  materialName: string;
  currentStock: number | string;
  minStock: number | string;
  timestamp: Date;
}

export interface Material {
  id: string;
  code?: string;
  name: string;
  unit?: string;
  currentStock?: number;
  minStock?: number;
}

export interface IssueRecord {
  id: string;
  materialId: string;
  materialName?: string;
  quantity: number;
  team: string;
  project: string;
  enteredBy?: string;
  date: Date | string;
}

export const categories = ['Raw Material', 'Consumable', 'Tool', 'Safety Equipment'];
export const teams = ['Tooling', 'Production', 'Assembly', 'Quality', 'Maintenance', 'R&D'];
export const projects = ['Project Alpha', 'Project Beta', 'Project Gamma', 'Maintenance', 'General'];

// ═══════════════════════════════════════════════════════════════
// DAILY STOCK TRACKING INTERFACES
// ═══════════════════════════════════════════════════════════════

export interface DailyMaterialStock {
  materialId: string;
  materialCode: string;
  materialName: string;
  category: string;
  supplierName: string;
  uom: string;
  rate: number;
  openingStock: number;
  inward: number;           // Purchases received
  projectIssues: number;    // Total issued to projects
  rdUsage: number;
  internalUsage: number;
  newFactoryUsage: number;
  closingStock: number;
  minStock: number;
  stockValue: number;       // closingStock * rate
}

export interface DailyStockRecord {
  id: string;
  date: string;             // ISO date string (YYYY-MM-DD)
  materials: DailyMaterialStock[];
  summary: {
    totalMaterials: number;
    totalStockValue: number;
    lowStockCount: number;
    outOfStockCount: number;
    totalInward: number;
    totalIssued: number;
  };
  savedBy: string;
  savedAt: string;          // ISO timestamp
  status: 'draft' | 'saved' | 'locked';
  notes?: string;
}

export interface StockMovement {
  id: string;
  date: string;
  materialId: string;
  materialName: string;
  type: 'inward' | 'issue' | 'adjustment';
  quantity: number;
  reference: string;        // PO number, project name, etc.
  enteredBy: string;
  timestamp: string;
}
