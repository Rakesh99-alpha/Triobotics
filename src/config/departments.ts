import { 
  Box, Cog, Hammer, Layers, Wrench, Shield, Users, 
  Activity, Scissors, CheckCircle, Sparkles 
} from 'lucide-react';

// --- 1. DEPARTMENT DEFINITIONS ---
export const DEPARTMENTS = [
  { id: 'stockbuilding', label: 'Stock Building', icon: Box, color: 'blue' },
  { id: 'machining', label: 'Machining', icon: Cog, color: 'yellow' },
  { id: 'patternfinishing', label: 'Pattern Finishing', icon: Hammer, color: 'purple' },
  { id: 'lamination', label: 'Lamination', icon: Layers, color: 'pink' },
  { id: 'mouldfinishing', label: 'Mold Finishing', icon: Wrench, color: 'green' },
  { id: 'welding', label: 'Welding', icon: Shield, color: 'red' },
  { id: 'assembly', label: 'Assembly', icon: Users, color: 'indigo' },
  { id: 'cmm', label: 'CMM', icon: Activity, color: 'teal' },
  { id: 'trimline', label: 'Trimline', icon: Scissors, color: 'orange' },
  { id: 'quality', label: 'Quality Dept', icon: CheckCircle, color: 'cyan' },
  { id: 'maintenance', label: 'Maintenance', icon: Sparkles, color: 'lime' },
];

export type DepartmentType = typeof DEPARTMENTS[number]['id'];

// --- 2. OPERATIONS (The specific tasks inside each dept) ---
export const DEPARTMENT_OPERATIONS: Record<string, string[]> = {
  stockbuilding: ['Base Making', 'Stock Cutting', 'Stock Bonding', 'Curing'],
  machining: ['CNC Roughing', 'Manual Finishing', 'Drilling', 'Profile Cutting'],
  patternfinishing: ['Sanding', 'Putty Application', 'Polishing', 'Sealing'],
  lamination: ['Gelcoat Application', 'Fiber Layup', 'Infusion Process', 'Demolding', 'Waxing'],
  mouldfinishing: ['Mold Polishing', 'Release Agent App', 'Repair'],
  welding: ['Frame Welding', 'Structural Bonding', 'Spot Welding'],
  assembly: ['Hardware Install', 'Bonding', 'Final Fitment', 'Sub-assembly'],
  cmm: ['Dimensional Check', 'Surface Scan', 'Report Generation'],
  trimline: ['Edge Trimming', 'Cutouts', 'Final Detailing'],
  quality: ['Visual Inspection', 'Document Review', 'Final QC Signoff'],
  maintenance: ['Routine Check', 'Emergency Repair', 'Tool Calibration']
};

// --- 3. SUPERVISORS (The Team Leads) ---
export const DEPARTMENT_SUPERVISORS = [
  { id: 'sup1', name: 'Rajesh Kumar', role: 'Stock Lead', departmentId: 'stockbuilding' },
  { id: 'sup2', name: 'Amit Singh', role: 'Machining Lead', departmentId: 'machining' },
  { id: 'sup3', name: 'Sarah Jenkins', role: 'Lamination Lead', departmentId: 'lamination' },
  { id: 'sup4', name: 'Mike Ross', role: 'Assembly Lead', departmentId: 'assembly' },
  { id: 'sup5', name: 'David Chen', role: 'Quality Lead', departmentId: 'quality' },
  { id: 'sup6', name: 'Priya Sharma', role: 'Pattern Lead', departmentId: 'patternfinishing' },
];

// --- 4. HELPER FUNCTIONS ---

export const getOperationsForDepartment = (deptId: string) => {
  return DEPARTMENT_OPERATIONS[deptId] || [];
};

export const getSupervisorsForDepartment = (deptId: string) => {
  return DEPARTMENT_SUPERVISORS.filter(s => s.departmentId === deptId);
};

export const getDepartmentColors = (deptId: string) => {
  const dept = DEPARTMENTS.find(d => d.id === deptId);
  const color = dept ? dept.color : 'gray';
  
  // Return Tailwind classes based on color name
  const colorMap: Record<string, any> = {
    blue: { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/30' },
    yellow: { bg: 'bg-yellow-500/20', text: 'text-yellow-300', border: 'border-yellow-500/30' },
    purple: { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/30' },
    green: { bg: 'bg-green-500/20', text: 'text-green-300', border: 'border-green-500/30' },
    red: { bg: 'bg-red-500/20', text: 'text-red-300', border: 'border-red-500/30' },
    // ... Add others or use a default
    default: { bg: 'bg-zinc-800', text: 'text-zinc-300', border: 'border-zinc-700' }
  };

  return colorMap[color] || colorMap.default;
};

export const detectRequiredDepartments = (projectDescription: string = '') => {
  // Simple logic to suggest departments based on project name
  // In a real app, this would be smarter
  const required = ['stockbuilding', 'machining']; // Every mold needs these
  
  const lowerDesc = projectDescription.toLowerCase();
  if (lowerDesc.includes('mold') || lowerDesc.includes('mould')) {
    required.push('patternfinishing', 'mouldfinishing');
  }
  if (lowerDesc.includes('part') || lowerDesc.includes('production')) {
    required.push('lamination', 'trimline', 'assembly');
  }
  
  // Always need QC
  required.push('quality');
  
  return required;
};