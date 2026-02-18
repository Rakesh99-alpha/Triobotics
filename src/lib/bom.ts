export interface BOMItem {
  name: string;
  qty: number;
  units: string;
  available?: boolean;
  inStock?: number;
}

export interface SpecSheet {
  id: string;
  projectName: string;
  customerName?: string;
  deliverables: string;
  patternMaterial?: string;
  process: string;
  [key: string]: any;
}

export interface Inventory {
  [key: string]: {
    name: string;
    available: number;
    unit: string;
    minStock: number;
  };
}

/**
 * Generate Bill of Materials based on spec sheet
 */
export function generateBOM(spec: SpecSheet, inventory: Inventory): BOMItem[] {
  const bom: BOMItem[] = [];

  // Base materials for all projects
  const baseMaterials = [
    { name: "Polyester Resin", qty: 60, units: "kg" },
    { name: "E-Glass Fiber (CSM)", qty: 50, units: "kg" },
    { name: "Gelcoat", qty: 10, units: "kg" },
  ];

  // Add pattern material if specified
  if (spec.patternMaterial) {
    baseMaterials.push({
      name: spec.patternMaterial,
      qty: 1,
      units: "block",
    });
  }

  // Adjust based on deliverables
  if (spec.deliverables === "Master Pattern") {
    baseMaterials.push({ name: "Tooling Board", qty: 2, units: "sheets" });
  } else if (spec.deliverables === "Production Parts") {
    baseMaterials.push({ name: "Release Agent", qty: 5, units: "liters" });
  }

  // Map to BOM with inventory check
  baseMaterials.forEach((item) => {
    const invItem = inventory[item.name];
    bom.push({
      name: item.name,
      qty: item.qty,
      units: item.units,
      available: invItem ? invItem.available >= item.qty : false,
      inStock: invItem?.available || 0,
    });
  });

  return bom;
}

/**
 * Identify out-of-stock items
 */
export function getOutOfStockItems(bom: BOMItem[]): string[] {
  return bom.filter((item) => !item.available).map((item) => item.name);
}

/**
 * Calculate total cost (if you add pricing)
 */
export function calculateBOMCost(
  bom: BOMItem[],
  pricing: Record<string, number>
): number {
  return bom.reduce((total, item) => {
    const price = pricing[item.name] || 0;
    return total + price * item.qty;
  }, 0);
}