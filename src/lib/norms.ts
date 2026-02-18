// EXTRACTED FROM YOUR 'NORMS.XLSX' SHEET 2
export const STATION_NORMS: Record<string, any> = {
  // Stock Building
  "STEEL BASE MAKING": { simple: 40, medium: 60, complex: 90, avg: 63.33 },
  "STOCK CUTTING": { simple: 45, medium: 60, complex: 90, avg: 65.00 },
  "STOCK BONDING": { simple: 60, medium: 90, complex: 120, avg: 90.00 },
  "CURING": { simple: 120, medium: 120, complex: 120, avg: 120.00 },
  
  // Assembly & Resin
  "ASSEMBLY": { simple: 20, medium: 30, complex: 60, avg: 36.67 },
  "SURFACE SANDING (80)": { simple: 60, medium: 60, complex: 30, avg: 50.00 },
  "GRINDING & PUTTY": { simple: 30, medium: 30, complex: 40, avg: 33.33 },
  "APPLYING RESIN COAT": { simple: 20, medium: 30, complex: 40, avg: 30.00 },
  
  // Putty
  "PUTTY FILLING": { simple: 20, medium: 30, complex: 40, avg: 30.00 },
  "PUTTY SANDING": { simple: 20, medium: 30, complex: 90, avg: 46.67 },
  "QUALITY INSPECTION": { simple: 15, medium: 20, complex: 30, avg: 21.67 },
  
  // Default Fallback
  "DEFAULT": { simple: 60, medium: 60, complex: 60, avg: 60.00 }
};

export function calculateTarget(station: string, manpower: number, hours: number) {
  const norm = STATION_NORMS[station] || STATION_NORMS["DEFAULT"];
  const totalMinutes = manpower * hours * 60;
  // Formula from Sheet 3: Total Mins / Avg Norm
  return (totalMinutes / norm.avg).toFixed(2);
}