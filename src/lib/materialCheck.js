import { processMaterials } from "./processMaterials";

// processSteps: array of strings (step names from customer/production spec)
// inventory: object { materialName: { qty: number, price?: number } }
export function analyzeProcessMaterials(processSteps, inventory) {
  const missing = [];
  const found = [];
  processSteps.forEach(step => {
    const mats = processMaterials[step] || [];
    mats.forEach(mat => {
      if (inventory[mat]) {
        found.push({ name: mat, qty: inventory[mat].qty, price: inventory[mat].price || null });
      } else {
        missing.push({ name: mat });
      }
    });
  });
  return { found, missing };
}
