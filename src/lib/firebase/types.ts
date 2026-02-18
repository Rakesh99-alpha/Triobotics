// src/lib/types.ts
export interface Material {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: 'KG' | 'NOS' | 'METER' | 'LITER' | 'PCS';
  openingStock: number;
  currentStock: number;
  minStock: number;
  supplierId: string | null;
  purchasePrice: number;
  lastUpdated: Date;
}

// ... (Paste the rest of your interface code here) ...

export const getStockStatus = (current: number, min: number) => {
  if (current === 0) return 'out';
  if (current < min * 0.2) return 'critical';
  if (current < min) return 'low';
  return 'ok';
};