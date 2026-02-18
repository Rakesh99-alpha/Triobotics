// ==========================================
// PURCHASE MATERIALS SEED DATA
// 165 Items for Composite Manufacturing
// ==========================================

export interface SeedMaterial {
  slNo: number;
  name: string;
  unit: string;
  category: string;
  minStock: number;
}

export const PURCHASE_MATERIALS: SeedMaterial[] = [
  // RESINS & BASE MATERIALS (1-11)
  { slNo: 1, name: "Norpol NGA 101S Base", unit: "Kgs", category: "Raw Material", minStock: 50 },
  { slNo: 2, name: "Norpol NGA 10387", unit: "Kgs", category: "Raw Material", minStock: 50 },
  { slNo: 3, name: "Polylite 5980", unit: "Kgs", category: "Raw Material", minStock: 50 },
  { slNo: 4, name: "Polylite 721641", unit: "Kgs", category: "Raw Material", minStock: 50 },
  { slNo: 5, name: "Polylite 5720", unit: "Kgs", category: "Raw Material", minStock: 50 },
  { slNo: 6, name: "Resin R764-NAP-16", unit: "Kgs", category: "Raw Material", minStock: 50 },
  { slNo: 7, name: "Dion Impact 9100-700 (Skin Coat)", unit: "Kgs", category: "Raw Material", minStock: 30 },
  { slNo: 8, name: "Norpol® 20800 S E (Gel Coat)", unit: "Kgs", category: "Raw Material", minStock: 30 },
  { slNo: 9, name: "Norpol GM 60014 SE", unit: "Kgs", category: "Raw Material", minStock: 30 },
  { slNo: 10, name: "Gelcoat 8373-I-0000", unit: "Kgs", category: "Raw Material", minStock: 30 },
  { slNo: 11, name: "Translucent Resin 2105", unit: "Kgs", category: "Raw Material", minStock: 20 },

  // GLASS FIBER MATS (12-29)
  { slNo: 12, name: "Ultmat 1800", unit: "Kgs", category: "Raw Material", minStock: 100 },
  { slNo: 13, name: "Ultmat 900", unit: "Kgs", category: "Raw Material", minStock: 100 },
  { slNo: 14, name: "Ultmat 600", unit: "Kgs", category: "Raw Material", minStock: 100 },
  { slNo: 15, name: "Uniconform Mat 600 Type-A", unit: "Kgs", category: "Raw Material", minStock: 50 },
  { slNo: 16, name: "Uniconform Mat 1800 Type-A", unit: "Kgs", category: "Raw Material", minStock: 50 },
  { slNo: 17, name: "OC CSM 450", unit: "Kgs", category: "Raw Material", minStock: 100 },
  { slNo: 18, name: "OC CSM 225", unit: "Kgs", category: "Raw Material", minStock: 100 },
  { slNo: 19, name: "OC CSM 300", unit: "Kgs", category: "Raw Material", minStock: 100 },
  { slNo: 20, name: "Jushi CSM 450", unit: "Kgs", category: "Raw Material", minStock: 100 },
  { slNo: 21, name: "Jushi CSM 225", unit: "Kgs", category: "Raw Material", minStock: 100 },
  { slNo: 22, name: "OC WR 600", unit: "Kgs", category: "Raw Material", minStock: 50 },
  { slNo: 23, name: "OC WR 300", unit: "Kgs", category: "Raw Material", minStock: 50 },
  { slNo: 24, name: "Flow Mat 1080", unit: "Kgs", category: "Raw Material", minStock: 30 },
  { slNo: 25, name: "Flow Mat 780X 1.27Meter", unit: "Kgs", category: "Raw Material", minStock: 30 },
  { slNo: 26, name: "ATH RPF14 Grade", unit: "Kgs", category: "Raw Material", minStock: 100 },
  { slNo: 27, name: "ATH MHB10", unit: "Kgs", category: "Raw Material", minStock: 100 },
  { slNo: 28, name: "ATH HLV 213", unit: "Kgs", category: "Raw Material", minStock: 100 },
  { slNo: 29, name: "Surface mat", unit: "Kgs", category: "Raw Material", minStock: 50 },

  // CHEMICALS & SOLVENTS (30-33, 85-89)
  { slNo: 30, name: "Acetone", unit: "Liter", category: "Consumable", minStock: 100 },
  { slNo: 31, name: "Catalyst", unit: "Liter", category: "Consumable", minStock: 50 },
  { slNo: 32, name: "Sliplease 1608", unit: "Liter", category: "Consumable", minStock: 20 },
  { slNo: 33, name: "Sliplease Mould Cleaner-2B", unit: "Liter", category: "Consumable", minStock: 20 },

  // MDF & PLYWOOD (34-38)
  { slNo: 34, name: "MDF 17mm", unit: "Sheets", category: "Raw Material", minStock: 50 },
  { slNo: 35, name: "MDF 17mm (for templates)", unit: "Sheets", category: "Raw Material", minStock: 30 },
  { slNo: 36, name: "MDF 6MM", unit: "Sheets", category: "Raw Material", minStock: 50 },
  { slNo: 37, name: "Plywood (18MM)", unit: "Sheets", category: "Raw Material", minStock: 30 },
  { slNo: 38, name: "MDF 4MM", unit: "Sheets", category: "Raw Material", minStock: 50 },

  // EPOXY & COATINGS (39-46)
  { slNo: 39, name: "Epoxy resin", unit: "Kgs", category: "Raw Material", minStock: 30 },
  { slNo: 40, name: "Epoxy Hardner", unit: "Kgs", category: "Raw Material", minStock: 30 },
  { slNo: 41, name: "Glass Bubbles", unit: "Kgs", category: "Raw Material", minStock: 20 },
  { slNo: 42, name: "Primer (Aypol)", unit: "Kgs", category: "Consumable", minStock: 20 },
  { slNo: 43, name: "Top Coat (Aypol)", unit: "Kgs", category: "Consumable", minStock: 20 },
  { slNo: 44, name: "Tooling Red Gelcoat 20800", unit: "Kgs", category: "Raw Material", minStock: 20 },
  { slNo: 45, name: "Dion Impact 9100-700 (Skin Coat) - Tooling", unit: "Kgs", category: "Raw Material", minStock: 20 },
  { slNo: 46, name: "Resin 1301", unit: "Kgs", category: "Raw Material", minStock: 30 },

  // STEEL MATERIALS (47-51)
  { slNo: 47, name: "Steel Square Tube (100x50) 2.5MM", unit: "Length", category: "Raw Material", minStock: 20 },
  { slNo: 48, name: "Steel Square Tube (1.5x2.5) 2.5MM", unit: "Length", category: "Raw Material", minStock: 20 },
  { slNo: 49, name: "Steel Square Tube (1.5x1.5) 2.5MM", unit: "Length", category: "Raw Material", minStock: 20 },
  { slNo: 50, name: "Steel Square Tube (1x1) 2.5MM", unit: "Length", category: "Raw Material", minStock: 20 },
  { slNo: 51, name: "Steel Flat Plate (6mm thick; 100mm width)", unit: "Length", category: "Raw Material", minStock: 10 },

  // SANDING PAPERS - DISC (52-60)
  { slNo: 52, name: "Sanding Paper Paper 40", unit: "Nos", category: "Consumable", minStock: 100 },
  { slNo: 53, name: "Sanding Paper Disc 80", unit: "Nos", category: "Consumable", minStock: 100 },
  { slNo: 54, name: "Sanding Paper Disc 120", unit: "Nos", category: "Consumable", minStock: 100 },
  { slNo: 55, name: "Sanding Paper Disc 220", unit: "Nos", category: "Consumable", minStock: 100 },
  { slNo: 56, name: "Sanding Paper Disc 320", unit: "Nos", category: "Consumable", minStock: 100 },
  { slNo: 57, name: "Sanding Paper Disc 400", unit: "Nos", category: "Consumable", minStock: 100 },
  { slNo: 58, name: "Sanding Paper Disc 500", unit: "Nos", category: "Consumable", minStock: 100 },
  { slNo: 59, name: "Sanding Paper Disc 600", unit: "Nos", category: "Consumable", minStock: 100 },
  { slNo: 60, name: "Sanding Paper Disc 800", unit: "Nos", category: "Consumable", minStock: 100 },

  // SANDING PAPERS - FLAT (61-66)
  { slNo: 61, name: "Sanding Paper Flat 800", unit: "Nos", category: "Consumable", minStock: 100 },
  { slNo: 62, name: "Sanding Paper Flat 1000", unit: "Nos", category: "Consumable", minStock: 100 },
  { slNo: 63, name: "Sanding Paper Flat 1500", unit: "Nos", category: "Consumable", minStock: 100 },
  { slNo: 64, name: "Sanding Paper Flat 2000", unit: "Nos", category: "Consumable", minStock: 100 },
  { slNo: 65, name: "Sanding Paper Flat 2500", unit: "Nos", category: "Consumable", minStock: 100 },
  { slNo: 66, name: "Sanding Paper Flat 3000", unit: "Nos", category: "Consumable", minStock: 100 },

  // POLISHING COMPOUNDS (67-71)
  { slNo: 67, name: "Polishing Compound 5", unit: "Nos", category: "Consumable", minStock: 20 },
  { slNo: 68, name: "Polishing Compound 10", unit: "Nos", category: "Consumable", minStock: 20 },
  { slNo: 69, name: "Polishing Compound 35", unit: "Nos", category: "Consumable", minStock: 20 },
  { slNo: 70, name: "Polishing Compound 45", unit: "Nos", category: "Consumable", minStock: 20 },
  { slNo: 71, name: "Fast cut Plus Extreme", unit: "Nos", category: "Consumable", minStock: 10 },

  // ADHESIVES & SEALANTS (72-76)
  { slNo: 72, name: "3M Marine Sealant", unit: "Nos", category: "Consumable", minStock: 20 },
  { slNo: 73, name: "Plasticina", unit: "Box", category: "Consumable", minStock: 10 },
  { slNo: 74, name: "Anaband 450 Ml", unit: "Kgs", category: "Consumable", minStock: 10 },
  { slNo: 75, name: "Mansion Wax", unit: "Kgs", category: "Consumable", minStock: 10 },
  { slNo: 76, name: "Bilux Putty", unit: "Kgs", category: "Consumable", minStock: 20 },

  // PAINTS & THINNERS (77-79)
  { slNo: 77, name: "Red Oxide", unit: "Liter", category: "Consumable", minStock: 20 },
  { slNo: 78, name: "Black Paint", unit: "Liter", category: "Consumable", minStock: 20 },
  { slNo: 79, name: "Thinner", unit: "Liter", category: "Consumable", minStock: 50 },

  // TOOLS & BLADES (80-84)
  { slNo: 80, name: "36 Disk", unit: "Kgs", category: "Tool", minStock: 20 },
  { slNo: 81, name: "Anchor Bolts M10X100", unit: "Kgs", category: "Consumable", minStock: 10 },
  { slNo: 82, name: "Putty Blade 3\"", unit: "Kgs", category: "Tool", minStock: 10 },
  { slNo: 83, name: "Putty Blade 6\"", unit: "Kgs", category: "Tool", minStock: 10 },
  { slNo: 84, name: "Woodcutting Wheels 5\"", unit: "Kgs", category: "Tool", minStock: 20 },

  // CHEMICALS (85-89)
  { slNo: 85, name: "Styrene", unit: "Liter", category: "Consumable", minStock: 50 },
  { slNo: 86, name: "MEKP Catalyst", unit: "Liter", category: "Consumable", minStock: 30 },
  { slNo: 87, name: "Acetone (Process)", unit: "Liter", category: "Consumable", minStock: 100 },
  { slNo: 88, name: "Sliplease 1608 (Process)", unit: "Liter", category: "Consumable", minStock: 20 },
  { slNo: 89, name: "Sliplease Mould Cleaner-2B (Process)", unit: "Liter", category: "Consumable", minStock: 20 },

  // TAPES (90-95)
  { slNo: 90, name: "Masking Tape 1 Inch", unit: "Nos", category: "Consumable", minStock: 50 },
  { slNo: 91, name: "Masking Tape 2 Inch", unit: "Nos", category: "Consumable", minStock: 50 },
  { slNo: 92, name: "White Tape 2 Inch", unit: "Nos", category: "Consumable", minStock: 50 },
  { slNo: 93, name: "Brown Tape 2 Inch", unit: "Nos", category: "Consumable", minStock: 50 },
  { slNo: 94, name: "Butter Paper Roll", unit: "Roll", category: "Consumable", minStock: 20 },
  { slNo: 95, name: "Fine Line Tape", unit: "Nos", category: "Consumable", minStock: 30 },

  // PACKAGING (96-98)
  { slNo: 96, name: "Bubble Sheet", unit: "Roll", category: "Consumable", minStock: 10 },
  { slNo: 97, name: "3M Foam Roll", unit: "Roll", category: "Consumable", minStock: 10 },
  { slNo: 98, name: "Stretch Film", unit: "Kgs", category: "Consumable", minStock: 20 },

  // CLEANING & SAFETY (99-106)
  { slNo: 99, name: "Lint Free Cloth", unit: "Nos", category: "Consumable", minStock: 100 },
  { slNo: 100, name: "Cotton Waste White", unit: "Kgs", category: "Consumable", minStock: 50 },
  { slNo: 101, name: "Cotton Waste Color", unit: "Kgs", category: "Consumable", minStock: 50 },
  { slNo: 102, name: "Surgical Gloves", unit: "Box", category: "Safety Equipment", minStock: 20 },
  { slNo: 103, name: "Cotton Gloves", unit: "Pair", category: "Safety Equipment", minStock: 50 },
  { slNo: 104, name: "Mask", unit: "Nos", category: "Safety Equipment", minStock: 100 },
  { slNo: 105, name: "Head Cap", unit: "Nos", category: "Safety Equipment", minStock: 100 },
  { slNo: 106, name: "Paper Cup", unit: "Nos", category: "Consumable", minStock: 200 },

  // CUTTING & GRINDING (107-115)
  { slNo: 107, name: "Cutting Wheel 4 Inch (1.2MM Thickness)", unit: "Nos", category: "Tool", minStock: 50 },
  { slNo: 108, name: "Cutting Wheel 4 Inch (2MM Thickness)", unit: "Nos", category: "Tool", minStock: 50 },
  { slNo: 109, name: "Cutting Wheel 14 Inch", unit: "Nos", category: "Tool", minStock: 20 },
  { slNo: 110, name: "Cotton Rollers 6 Inch", unit: "Nos", category: "Tool", minStock: 30 },
  { slNo: 111, name: "Brush 2 Inch", unit: "Nos", category: "Tool", minStock: 50 },
  { slNo: 112, name: "Buffing Pad 3 Inch", unit: "Nos", category: "Tool", minStock: 30 },
  { slNo: 113, name: "Buffing Pad 7 Inch", unit: "Nos", category: "Tool", minStock: 30 },
  { slNo: 114, name: "Grinding Wheel 4 Inch", unit: "Nos", category: "Tool", minStock: 50 },
  { slNo: 115, name: "Disposable Cover All", unit: "Nos", category: "Safety Equipment", minStock: 50 },

  // DRILL BITS (116-125)
  { slNo: 116, name: "Drill Bit 3 MM", unit: "Nos", category: "Tool", minStock: 20 },
  { slNo: 117, name: "Drill Bit 4 MM", unit: "Nos", category: "Tool", minStock: 20 },
  { slNo: 118, name: "Drill Bit 8 MM", unit: "Nos", category: "Tool", minStock: 20 },
  { slNo: 119, name: "Drill Bits 12mm", unit: "Kgs", category: "Tool", minStock: 10 },
  { slNo: 120, name: "Star Drill Bits", unit: "Kgs", category: "Tool", minStock: 10 },
  { slNo: 121, name: "3mm Drill Bit", unit: "Kgs", category: "Tool", minStock: 10 },
  { slNo: 122, name: "Drill Bits 10mm", unit: "Kgs", category: "Tool", minStock: 10 },
  { slNo: 123, name: "8mm Drill Bits", unit: "Kgs", category: "Tool", minStock: 10 },
  { slNo: 124, name: "4mm Drill Bits", unit: "Kgs", category: "Tool", minStock: 10 },
  { slNo: 125, name: "9.5 MM Drill Bits", unit: "Kgs", category: "Tool", minStock: 10 },

  // BLADES & WHEELS (126-127)
  { slNo: 126, name: "Dorco Blade", unit: "Nos", category: "Tool", minStock: 50 },
  { slNo: 127, name: "Wood Cutting Wheel 4 Inch", unit: "Nos", category: "Tool", minStock: 30 },

  // FASTENERS (128-133)
  { slNo: 128, name: "MS Nylock Nut 8 MM", unit: "Nos", category: "Consumable", minStock: 100 },
  { slNo: 129, name: "MS Hex Bolt 8X70MM", unit: "Nos", category: "Consumable", minStock: 100 },
  { slNo: 130, name: "MS Plain Washer 8MM", unit: "Nos", category: "Consumable", minStock: 100 },
  { slNo: 131, name: "MS Nylock Nut 10 MM", unit: "Nos", category: "Consumable", minStock: 100 },
  { slNo: 132, name: "MS Hex Bolt 10X70MM", unit: "Nos", category: "Consumable", minStock: 100 },
  { slNo: 133, name: "MS Plain Washer 10MM", unit: "Nos", category: "Consumable", minStock: 100 },

  // MAINTENANCE & WELDING (134-137)
  { slNo: 134, name: "WD 40 Spray", unit: "Nos", category: "Consumable", minStock: 20 },
  { slNo: 135, name: "Welding Rod 6013X3.15MM", unit: "Packet", category: "Consumable", minStock: 20 },
  { slNo: 136, name: "Feviquick", unit: "Nos", category: "Consumable", minStock: 30 },
  { slNo: 137, name: "Silicon Sealant", unit: "Nos", category: "Consumable", minStock: 20 },

  // PNEUMATICS (138-143)
  { slNo: 138, name: "PU Clear Tube", unit: "Meter", category: "Consumable", minStock: 50 },
  { slNo: 139, name: "Pneumatic Connector 10X12MM", unit: "Nos", category: "Consumable", minStock: 20 },
  { slNo: 140, name: "Pneumatic TEE Connector 10X10MM", unit: "Nos", category: "Consumable", minStock: 20 },
  { slNo: 141, name: "Pneumatic Connector 12X12MM", unit: "Nos", category: "Consumable", minStock: 20 },
  { slNo: 142, name: "Pneumatic Male Connector 12X1/4", unit: "Nos", category: "Consumable", minStock: 20 },
  { slNo: 143, name: "Pneumatic Male Connector 10X3/8", unit: "Nos", category: "Consumable", minStock: 20 },

  // LOCATORS & CMM (144-149)
  { slNo: 144, name: "Aluminium Male Locators", unit: "Nos", category: "Tool", minStock: 20 },
  { slNo: 145, name: "Aluminium Female Locators", unit: "Nos", category: "Tool", minStock: 20 },
  { slNo: 146, name: "CMM Bushes 7MM Male", unit: "Nos", category: "Tool", minStock: 20 },
  { slNo: 147, name: "CMM Bushes 7MM Female", unit: "Nos", category: "Tool", minStock: 20 },
  { slNo: 148, name: "6319-Universal Injection Adapter - 10 mm", unit: "Nos", category: "Tool", minStock: 10 },
  { slNo: 149, name: "6316-Universal Insert With Clip", unit: "Nos", category: "Tool", minStock: 10 },

  // SEALS (150-156)
  { slNo: 150, name: "Wing Seal Dummy", unit: "Meter", category: "Consumable", minStock: 50 },
  { slNo: 151, name: "Dynamic Seal Dummy", unit: "Meter", category: "Consumable", minStock: 50 },
  { slNo: 152, name: "Resin Channel", unit: "Meter", category: "Consumable", minStock: 50 },
  { slNo: 153, name: "Wing Seal", unit: "Meter", category: "Consumable", minStock: 50 },
  { slNo: 154, name: "Dynamic Seal", unit: "Meter", category: "Consumable", minStock: 50 },
  { slNo: 155, name: "Round Cord Seal 10mm", unit: "Meter", category: "Consumable", minStock: 50 },
  { slNo: 156, name: "Cord Dummy Seal 10mm", unit: "Meter", category: "Consumable", minStock: 50 },

  // HARDWARE (157-165)
  { slNo: 157, name: "Toggle Clamps", unit: "Nos", category: "Tool", minStock: 20 },
  { slNo: 158, name: "Caster Wheels (Swivel) 8x2 (150kg)", unit: "Nos", category: "Tool", minStock: 10 },
  { slNo: 159, name: "Caster Wheels (Swivel with lock) 8x2 (150kg)", unit: "Nos", category: "Tool", minStock: 10 },
  { slNo: 160, name: "Caster Wheels (Swivel) 6x2 (500kg)", unit: "Nos", category: "Tool", minStock: 10 },
  { slNo: 161, name: "Caster Wheels (Swivel with lock) 6x2 (500kg)", unit: "Nos", category: "Tool", minStock: 10 },
  { slNo: 162, name: "Caster Wheels (Swivel) 6x2 (200kg)", unit: "Nos", category: "Tool", minStock: 10 },
  { slNo: 163, name: "Caster Wheels (Swivel with lock) 6x2 (200kg)", unit: "Nos", category: "Tool", minStock: 10 },
  { slNo: 164, name: "Caster Wheels (Swivel) 4x2 (150kg)", unit: "Nos", category: "Tool", minStock: 10 },
  { slNo: 165, name: "Caster Wheels (Swivel lock) 4x2 (150kg)", unit: "Nos", category: "Tool", minStock: 10 },
];

// Generate material code from serial number
export function generateMaterialCode(slNo: number): string {
  return `MAT-${slNo.toString().padStart(4, '0')}`;
}

// Get material by category
export function getMaterialsByCategory(category: string): SeedMaterial[] {
  return PURCHASE_MATERIALS.filter(m => m.category === category);
}

// Get all categories
export function getAllCategories(): string[] {
  return [...new Set(PURCHASE_MATERIALS.map(m => m.category))];
}
