'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Package, Plus, X, Download, Trash2, Search,
  Building2, BarChart3, AlertTriangle, DollarSign,
  History, CheckCircle2, RefreshCw, Bell,
  Calendar, Save, Lock, ChevronLeft, ChevronRight,
  Truck, ShoppingCart, RotateCcw, CalendarClock,
  ClipboardList, ArrowDownToLine, MapPin, Wifi, WifiOff,
  Activity, TrendingUp, Eye, ChevronDown, ChevronUp,
  FileText, Receipt, Send, Clock, Inbox, User, Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import { db } from '@/lib/firebase';
import {
  doc, writeBatch, collection, addDoc, getDocs,
  query, orderBy, onSnapshot, where, updateDoc
} from 'firebase/firestore';
import type { DailyStockRecord } from '@/types/inventory';
import { COLLECTIONS, formatCurrency } from '@/lib/services/integratedProcurementService';
import type { PurchaseOrder } from '@/lib/services/integratedProcurementService';

// SOP Modules
import GRNInwardForm from '@/components/store/GRNInwardForm';
import type { GRNSuccessItem } from '@/components/store/GRNInwardForm';
import MaterialIssueForm from '@/components/store/MaterialIssueForm';
import type { IssueSuccessData } from '@/components/store/MaterialIssueForm';
import { MaterialReturnForm, ExpiryControlPanel } from '@/components/store/ReturnAndExpiry';
import type { ReturnSuccessData } from '@/components/store/ReturnAndExpiry';
import StoreInvoice from '@/components/store/StoreInvoice';
import type { InvoiceSuccessData } from '@/components/store/StoreInvoice';
import ReceiveAgainstPO from '@/components/store/ReceiveAgainstPO';
import type { ReceiveAgainstPOSuccessData } from '@/components/store/ReceiveAgainstPO';
import CreatePOFromStore from '@/components/store/CreatePOFromStore';
import type { CreatePOSuccessData } from '@/components/store/CreatePOFromStore';

// ==========================================
// FIRESTORE COLLECTIONS
// ==========================================
const FB_MATERIALS = 'inventory_materials';
const FB_SUPPLIERS = 'inventory_suppliers';
const FB_DAILY_STOCK = 'daily_stock_records';

// ==========================================
// TYPES
// ==========================================
type Category = 'Chemical' | 'Raw Material' | 'Solvent' | 'Additive' | 'Consumable' | 'Tool' | 'Lab Equipment' | 'Release Agent' | 'Wax';

interface StockItem {
  id: string;
  sno: number;
  code: string;
  materialName: string;
  name?: string;
  category: Category;
  supplierName: string;
  supplier?: string;
  rate: number;
  purchasePrice?: number;
  uom: string;
  openingStock: number;
  inword: number;
  currentStock?: number;
  minStock?: number;
  maxStock?: number;
  projects: Record<string, number>;
  rdUsage: number;
  internalUsage: number;
  newFactoryUsage: number;
  createdAt: string;
  binLocation: string;
  storageArea: string;
  shelfLife?: number;
  batchRequired?: boolean;
  expiryRequired?: boolean;
  storageCondition?: string;
  lastModified?: string;
}

interface Supplier {
  id: string;
  name: string;
  contact: string;
  email: string;
  gst: string;
  address: string;
  city: string;
  phone: string;
}

interface AuditLog {
  id: string;
  timestamp: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'ISSUE' | 'PURCHASE' | 'GRN' | 'RETURN';
  entityType: 'Material' | 'Supplier' | 'Stock' | 'GRN' | 'Issue' | 'Return';
  entityName: string;
  details: string;
  user: string;
}

interface Project {
  id: string;
  name: string;
}

interface SyncStatus {
  state: 'connected' | 'syncing' | 'error' | 'offline';
  lastSync: string | null;
  itemsSynced: number;
  message: string;
}

interface LiveActivity {
  id: string;
  time: string;
  action: string;
  detail: string;
  type: 'grn' | 'issue' | 'return' | 'update' | 'sync';
}

// ==========================================
// AUTO-CATEGORIZE HELPER
// ==========================================
function autoCategory(name: string, storage: string): Category {
  const n = name.toLowerCase();
  if (n.includes('wax') || n.includes('finawax') || n.includes('surfix')) return 'Wax';
  if (n.includes('release') || n.includes('mold seal') || n.includes('mould') || n.includes('chem trend')) return 'Release Agent';
  if (n.includes('acetone') || n.includes('toluene') || n.includes('xylene') || n.includes('methanol') || n.includes('iso propyl') || n.includes('ipa ') || n.includes('exxsol') || n.includes('isopar')) return 'Solvent';
  if (n.includes('sander') || n.includes('scissor') || n.includes('tester') || n.includes('microscope') || n.includes('laser') || n.includes('led light') || n.includes('l key') || n.includes('spectro') || n.includes('taparia')) return 'Tool';
  if (n.includes('beaker') || n.includes('mugs') || n.includes('viscometer') || n.includes('glassrod') || n.includes('spindle') || n.includes('stand part') || n.includes('religlas')) return 'Lab Equipment';
  if (n.includes('sanding') || n.includes('circles') || n.includes('buffing') || n.includes('filter cloth') || n.includes('burner') || n.includes('rolls') || n.includes('pad') || (storage.includes('H/R6') && !n.includes('wax')) || (storage.includes('H/R3') && !n.includes('cloth'))) return 'Consumable';
  if (n.includes('byk') || n.includes('patadd') || n.includes('solplus') || n.includes('wd ') || n.includes('uv stab') || n.includes('colour inhib') || n.includes('rheobyk') || n.includes('silicon fluid') || n.includes('silicon oil') || n.includes('siloxane') || n.includes('silane') || n.includes('cobalt') || n.includes('dbdtl') || n.includes('amino s')) return 'Additive';
  if (n.includes('resin') || n.includes('mma') || n.includes('spmma') || n.includes('polyol') || n.includes('glycol') || n.includes('anhydr') || n.includes('phthal') || n.includes('silica') || n.includes('alumina') || n.includes('aluminium') || n.includes('polyphosphate') || n.includes('poly phosphate') || n.includes('carbonate') || n.includes('granul') || n.includes('sample') || n.includes('composite mat') || n.includes('3d printing') || n.includes('dowsil')) return 'Raw Material';
  if (n.includes('acid') || n.includes('hydroxide') || n.includes('chloride') || n.includes('sulphate') || n.includes('phosphate') || n.includes('water') || n.includes('bromine') || n.includes('formaldehyde') || n.includes('hydroquinone') || n.includes('phenol') || n.includes('bleach') || n.includes('potassium') || n.includes('sodium') || n.includes('calcium') || n.includes('polysorbate') || n.includes('hardner') || n.includes('catalyst') || n.includes('univax') || n.includes('koh') || n.includes('thq') || n.includes('tpp') || n.includes('ams') || n.includes('iso') || n.includes('ar 2000')) return 'Chemical';
  return 'Raw Material';
}

// ==========================================
// REAL MATERIAL DATA — R&D STORE INVENTORY
// [S.No, Name, UOM, Qty, StorageArea]
// ==========================================
const RAW_DATA: [number, string, string, number, string][] = [
  [1, '10 in Circles', 'Nos', 3, 'R&D/H/R3'],
  [2, '3D Printing Filament', 'Nos', 1, 'R&D/R1/C1'],
  [3, '3M Buffing Pad', 'Nos', 1, 'R&D/H/R5'],
  [4, '3M Buffing Pad Attachment', 'Nos', 1, 'R&D/H/R5'],
  [5, '3M Sanding Papers', 'Nos', 0, 'R&D/H/R5'],
  [6, '4 in Circles', 'Nos', 56, 'R&D/H/R3'],
  [7, '8 in Circles', 'Nos', 14, 'R&D/H/R3'],
  [8, 'ACEBOND Hardner', 'g', 200, 'R&D/R1/R1-T3'],
  [9, 'Acepoxy Resin', 'g', 650, 'R&D/R1/R1-T3'],
  [10, 'Acetone 58.08', 'ml', 150, 'R&D/R1/R1'],
  [11, 'Acetone Low Grade -3', 'ml', 500, 'R&D/R1/R1-T1'],
  [12, 'Acetone MP Chemicals', 'L', 1, 'R&D/R1/R2-T7'],
  [13, 'Acetone Resol', 'L', 1, 'R&D/R1/R1-T1'],
  [14, 'Acetone Resol-2', 'L', 1, 'R&D/R1/R1-T1'],
  [15, 'Adipic', 'g', 0, 'R&D/R1/R2-T6'],
  [16, 'Adipic Acid (Extra Pure Hexanedioc Acid)', 'g', 250, 'R&D/R1/R1-T1'],
  [17, 'AK BYK555', 'g', 0, 'R&D/R1/R2-T6'],
  [18, 'Aluminium Powder Sample JSR', 'Kg', 1, 'R&D/H/R5'],
  [19, 'Aluminium Powder Sample Unknown', 'Nos', 0, 'R&D/H/R5'],
  [20, 'Amonium Dihydrogen Orthophosphate', 'g', 500, 'R&D/R1/R2-T5'],
  [21, 'AMS', 'ml', 200, 'R&D/R1/R1'],
  [22, 'Ar 2000', 'g', 250, 'R&D/R1/R1-T4'],
  [23, 'Automized Aluminium Powder GMK', 'Nos', 0, 'R&D/H/R5'],
  [24, 'Bleaching Powder (CaCl2O2)', 'g', 100, 'R&D/R1/R1-T3'],
  [25, 'Bromine Water', 'ml', 400, 'R&D/R1/R1-T4'],
  [26, 'Buffing Compound 5,12,35', 'Nos', 1, 'R&D/H/R6'],
  [27, 'Buffing Pads', 'Nos', 0, 'R&D/H/R6'],
  [28, 'Burner Gas', 'Nos', 1, 'R&D/H/R6'],
  [29, 'BYK-333', 'ml', 120, 'R&D/R1/R2-T5'],
  [30, 'BYK 072', 'ml', 60, 'R&D/R1/R1-T1'],
  [31, 'BYK A 500', 'ml', 120, 'R&D/R1/R1-T2'],
  [32, 'BYK A 5015 4.7%', 'ml', 30, 'R&D/R1/R2-T5'],
  [33, 'BYK-A-515', 'ml', 120, 'R&D/R1/R1-T2'],
  [34, 'BYK B 5015 5.8%', 'ml', 30, 'R&D/R1/R2-T5'],
  [35, 'BYK W966', 'ml', 40, 'R&D/R1/R1-T1'],
  [36, 'BYKL W908', 'ml', 60, 'R&D/R1/R2-T5'],
  [37, 'BYK-W 940 (IMCD)', 'ml', 60, 'R&D/R1/R2-T7'],
  [38, 'BYK-W 966 (IMCD)', 'ml', 60, 'R&D/R1/R2-T7'],
  [39, 'Calcium Chloride', 'g', 150, 'R&D/R1/R1-T3'],
  [40, 'Calcium Sulphate (Anhydrous)', 'g', 350, 'R&D/R1/R1-T3'],
  [41, 'Chem Trend Mold Sealer KN00089561', 'ml', 200, 'R&D/R1/R6-T8'],
  [42, 'Chem Trend Mold Sealer KN00092789', 'L', 2, 'R&D/R1/R6-T8'],
  [43, 'Chem Trend Mold Sealer KN00093670', 'L', 2, 'R&D/R1/R6-T8'],
  [44, 'Chem Trend Mold Sealer KN00096102', 'L', 4, 'R&D/R1/R6-T8'],
  [45, 'Chem Trend Release Agent KN00096792', 'L', 8, 'R&D/R1/R6-T8'],
  [48, 'Cobalt Octoate 6%(P)', 'Nos', 1, 'R&D/R1/R1-T1'],
  [49, 'Cobalt Octoate ACLR 10CC', 'Nos', 1, 'R&D/R1/R1-T1'],
  [50, 'Cobalt Octoate ACLR 6', 'Nos', 1, 'R&D/R1/R1-T1'],
  [51, 'Cobalt Octoate ACLR CC', 'Nos', 1, 'R&D/R1/R1-T1'],
  [52, 'Colour Inhibitor', 'Nos', 0, 'R&D/R1/R2-T5'],
  [53, 'DBDTL', 'g', 100, 'R&D/R1/R2-T6'],
  [54, 'Deionised Water', 'L', 4, 'R&D/R1/R1'],
  [55, 'Deionised Water (Nice)', 'ml', 400, 'R&D/R1/R1-T3'],
  [56, 'Digital Microscope', 'Nos', 1, 'R&D/R1/C1'],
  [57, 'Dioctyl Phthalate', 'L', 2, 'R&D/R1/R1'],
  [58, 'Distilled Water', 'L', 25, 'R&D/R1/R3'],
  [59, 'Dowsil-650', 'L', 3, 'R&D/R1/R2'],
  [60, 'Exxsol D 30', 'Kg', 1, 'R&D/R1'],
  [61, 'Filter Cloth 180', 'M', 5, 'R&D/H/R3'],
  [62, 'Filter Cloth 600', 'M', 5, 'R&D/H/R3'],
  [63, 'Fine Wax 3', 'g', 0, 'R&D/H/R6'],
  [64, 'Formaldehyde Solution LR 37-41% w/v H.CHO', 'ml', 400, 'R&D/R1/R1-T2'],
  [65, 'Fumed Silica M5 Grade', 'Nos', 2, 'R&D/R1/R2-T5'],
  [66, 'Grade: KRC6003C (FAST)', 'ml', 100, 'R&D/R1/R1-T3'],
  [67, 'Grade: KRC6003C (Normal)', 'ml', 100, 'R&D/R1/R1-T3'],
  [68, 'Hindalco Alumina Hydrate HLV 206', 'Kg', 2, 'R&D/R1/R1'],
  [69, 'Hindalco Alumina Hydrate HLV 213', 'Kg', 2.7, 'R&D/R1/R1'],
  [70, 'Huntsman Samples Ly-Hy', 'Nos', 3, 'R&D/R1/R4'],
  [71, 'Hydroquinone 96%', 'g', 100, 'R&D/R1/R1-T2'],
  [72, 'IPA MP Chemicals', 'L', 1, 'R&D/R1/R2-T7'],
  [73, 'ISO', 'ml', 400, 'R&D/R1/R2-T5'],
  [74, 'Iso Phthalic Acid', 'g', 750, 'R&D/R1/R1-T2'],
  [75, 'ISO Process Catalyst Stage 1', 'g', 0, 'R&D/R1/R2-T6'],
  [76, 'ISO Process Catalyst Stage 2', 'g', 0, 'R&D/R1/R2-T6'],
  [77, 'Iso Propyl Alcohol', 'ml', 500, 'R&D/R1/R2'],
  [78, 'Isopar H', 'Kg', 1, 'R&D/R1'],
  [79, 'Kmax Sanding Papers', 'Nos', 0, 'R&D/H/R6'],
  [80, 'Koch Chemie Heavy Cut Pad', 'Nos', 1, 'R&D/H/R5'],
  [81, 'Koch Chemie Micro Cut Pad', 'Nos', 1, 'R&D/H/R5'],
  [82, 'KOH Solution', 'ml', 0, 'R&D/R1/R2-T6'],
  [83, 'Kovax Orbital Sander', 'Nos', 1, 'R&D/H/R6'],
  [84, 'Kovax Sanding Papers', 'Nos', 0, 'R&D/H/R6'],
  [85, 'Laser Distance Meter', 'Nos', 1, 'R&D/R1/C1'],
  [86, 'Laser Pointer', 'Nos', 1, 'R&D/R1/C1'],
  [87, 'LED Light', 'Nos', 1, 'R&D/R1/C1'],
  [88, 'Maleic Anhydrate (Synthesis)', 'g', 200, 'R&D/R1/R1-T4'],
  [89, 'MAN Maleic Anhydrate', 'g', 0, 'R&D/R1/R2-T6'],
  [90, 'Mat Cutting Scissor', 'Nos', 1, 'R&D/R1/C1'],
  [91, 'Methanol', 'ml', 300, 'R&D/R1/R1-T4'],
  [92, 'Mirka Sanding Blocks', 'Nos', 4, 'R&D/H/R6'],
  [93, 'Mirka Sanding Papers', 'Nos', 0, 'R&D/H/R6'],
  [94, 'MMA', 'L', 4, 'R&D/R1/R1'],
  [95, 'Morvel Wax Polish', 'Kg', 1, 'R&D/R1/R2'],
  [96, 'Neopentyl Glycol', 'g', 600, 'R&D/R1/R1-T3'],
  [97, 'Neophleon Sanding Papers', 'Nos', 0, 'R&D/H/R6'],
  [98, 'Neopoleon Sanding Papers 80-600 Grit', 'Nos', 5, 'R&D/H/R6'],
  [99, 'Patadd AF72', 'ml', 50, 'R&D/R1/R1-T4'],
  [100, 'Patadd AF75', 'ml', 100, 'R&D/R1/R1-T4'],
  [101, 'Patadd AF76', 'ml', 50, 'R&D/R1/R1-T4'],
  [102, 'Patadd AF86', 'ml', 50, 'R&D/R1/R1-T4'],
  [103, 'Patadd FW1065', 'ml', 50, 'R&D/R1/R1-T4'],
  [104, 'Patadd Rheol 253', 'ml', 200, 'R&D/R1/R1-T4'],
  [105, 'PD Composite Mat Sample', 'Nos', 0, 'R&D/H/R5'],
  [106, 'PF Resin K0004109', 'g', 250, 'R&D/R1/R1-T4'],
  [107, 'PG Propylene Glycol', 'g', 0, 'R&D/R1/R2-T6'],
  [108, 'Phenolphthalein Solution', 'ml', 40, 'R&D/R1/R1-T1'],
  [109, 'Plastic Mugs', 'Nos', 11, 'R&D/R2/C2'],
  [110, 'Polarshine 35 Sample', 'g', 0, 'R&D/H/R6'],
  [111, 'Polyol', 'Kg', 1, 'R&D/R1/R2-T5'],
  [112, 'Polysorbate 80', 'g', 400, 'R&D/R1/R1-T2'],
  [113, 'Potassium Bicarbonate', 'g', 500, 'R&D/R1/R2-T5'],
  [114, 'Potassium Chloride KCl', 'g', 500, 'R&D/R1/R1-T1'],
  [115, 'Potassium Hydrogen Phthalate', 'g', 450, 'R&D/R1/R1-T3'],
  [116, 'Potassium Hydroxide Pellets', 'g', 500, 'R&D/R1/R1-T1'],
  [117, 'Potassium Hydroxide 40% W/V Solution', 'ml', 500, 'R&D/R1/R1-T4'],
  [118, 'Potassium Hydroxide Solution', 'ml', 280, 'R&D/R1/R1-T4'],
  [119, 'Propylene Glycol (Propene-1,2-Diol)', 'ml', 2600, 'R&D/R1/R1-T2'],
  [120, 'Phthalic Anhydrate (Jythoi Chemicals)', 'g', 450, 'R&D/R1/R1-T2'],
  [121, 'Phthalic Anhydrate (SISCO)', 'g', 1050, 'R&D/R1/R1-T2'],
  [122, 'Phthalic Anhydrate Avra', 'g', 400, 'R&D/R1/R1-T2'],
  [123, 'Reichhold 961 XK 192', 'Kg', 7, 'R&D/R1/R3'],
  [124, 'Releaser T1', 'ml', 90, 'R&D/R1/R2-T7'],
  [125, 'ReliGlas Beaker 1000ml', 'Nos', 1, 'R&D/R2/C2'],
  [126, 'ReliGlas Beaker 250ml', 'Nos', 2, 'R&D/R2/C2'],
  [127, 'ReliGlas Beaker 500ml', 'Nos', 2, 'R&D/R2/C2'],
  [128, 'RHEOBYK-R 605', 'ml', 60, 'R&D/R1/R2-T7'],
  [129, 'RIEPE Release Agent', 'L', 30, 'R&D/R1/R4'],
  [130, 'Sample Granules', 'g', 150, 'R&D/R1/R2'],
  [131, 'Sample Resin MMA', 'Kg', 25, 'R&D/R1/R3'],
  [132, 'Sanding Rolls', 'Nos', 0, 'R&D/H/R6'],
  [133, 'Silicon Fluid', 'g', 200, 'R&D/R1/R2-T7'],
  [134, 'Silicon Oil', 'ml', 150, 'R&D/R1/R1-T3'],
  [135, 'Sodium Hydroxide Pellets', 'g', 500, 'R&D/R1/R1-T1'],
  [136, 'Solplus D570', 'g', 200, 'R&D/R1/R1-T4'],
  [137, 'SP200 Component A', 'ml', 35, 'R&D/R1/R1-T1'],
  [138, 'SP200 Component B', 'ml', 35, 'R&D/R1/R1-T4'],
  [139, 'Spectro2GO D/8', 'Nos', 1, 'R&D/R1/C1'],
  [140, 'SPMMA 108', 'Kg', 1, 'R&D/R1/R1'],
  [141, 'SPMMA 888', 'Kg', 1, 'R&D/R1/R1'],
  [142, 'Surface Roughness Tester', 'Nos', 1, 'R&D/R1/C1'],
  [144, 'Taparia L Keys', 'Nos', 1, 'R&D/R1/C1'],
  [145, 'Tetra n-Butyl Titanate (TNBT)', 'g', 200, 'R&D/R1/R2-T5'],
  [146, 'THQ', 'g', 0, 'R&D/R1/R2-T6'],
  [147, 'Toluene (Sulphur/Thiophene Free)', 'ml', 500, 'R&D/R1/R1-T3'],
  [148, 'Toluene MP Chemicals', 'L', 1, 'R&D/R1/R2-T7'],
  [149, 'TPP', 'ml', 0, 'R&D/R1/R2-T6'],
  [150, 'TR Mould Release', 'g', 397, 'R&D/H/R5'],
  [151, 'Univax Brown Grade', 'Tin', 1, 'R&D/R1/R1-T1'],
  [152, 'Univax Sepical Grade', 'Tin', 1, 'R&D/R1/R1-T1'],
  [153, 'Unknown Sanding Papers', 'Nos', 0, 'R&D/H/R6'],
  [154, 'UV Stabilizer', 'g', 100, 'R&D/R1/R1-T4'],
  [155, 'Viscometer Glassrods', 'Nos', 10, 'R&D/R1/C1'],
  [156, 'Viscometer Spindle Box', 'Nos', 1, 'R&D/R1/C1'],
  [157, 'Viscometer Stand Parts', 'Nos', 0, 'R&D/R2/C2'],
  [158, 'WD 1600', 'ml', 200, 'R&D/R1/R1-T4'],
  [159, 'WD 5111 Additive', 'g', 200, 'R&D/R1/R1-T4'],
  [160, 'Xylene', 'ml', 500, 'R&D/R1/R1-T3'],
  [161, 'Xylene MP Chemicals', 'L', 1, 'R&D/R1/R2-T7'],
  [162, 'Exxsol D 40', 'Kg', 1, 'R&D/R1'],
  [163, 'Amino Siloxane Lk ASF R32', 'g', 200, 'R&D/R1'],
  [164, 'Amino Siloxane Lk ASF R20', 'g', 250, 'R&D/R1'],
  [165, 'Calcium Carbonate', 'g', 100, 'R&D/R1'],
  [166, 'Vinyl Tri Methoxy Silane', 'ml', 200, 'R&D/R1'],
  [167, 'Ammonium Poly Phosphate', 'g', 0, 'R&D/R1'],
  [168, 'Ammonium Poly Phosphate (Liquid)', 'g', 0, 'R&D/R1'],
  [169, 'PE Wax', 'g', 100, 'R&D/R1'],
  [170, '\u03B3-Amino Propyl Tri Ethoxy Silane', 'ml', 200, 'R&D/R1'],
  [171, 'MQ Resin LK Q5', 'g', 100, 'R&D/R1'],
  [180, 'Surfix WAX', 'g', 500, 'R&D/R1'],
  [181, 'Polyethylene Wax M-200', 'g', 521, 'R&D/R1'],
  [182, 'Polyethylene Wax M-300', 'g', 580, 'R&D/R1'],
  [183, 'Polyethylene Wax MC-617', 'g', 688, 'R&D/R1'],
  [184, 'Ammonium Polyphosphate (WIG)', 'g', 0, 'R&D/R1'],
  [185, 'Ammonium Polyphosphate (WSG)', 'g', 0, 'R&D/R1'],
  [186, 'Tarus HMC Microcrystalline Wax', 'g', 250, 'R&D/R1'],
  [187, 'Hard WAX Gujarat Bob Chem', 'Kg', 1, 'R&D/R1'],
  [188, 'Finawax E Beads', 'g', 500, 'R&D/R1'],
  [189, 'Finawax C Powder', 'g', 500, 'R&D/R1'],
];

// Build typed stock items from raw data
const INITIAL_MATERIALS: StockItem[] = RAW_DATA.map(([sno, name, uom, qty, storage]) => ({
  id: String(sno),
  sno,
  code: `MAT-${String(sno).padStart(3, '0')}`,
  materialName: name,
  category: autoCategory(name, storage),
  supplierName: '',
  rate: 0,
  uom: uom || 'Nos',
  openingStock: qty,
  inword: 0,
  projects: {},
  rdUsage: 0,
  internalUsage: 0,
  newFactoryUsage: 0,
  createdAt: new Date().toISOString(),
  binLocation: storage,
  storageArea: storage,
  lastModified: new Date().toISOString(),
}));

const SAMPLE_PROJECTS: Project[] = [
  { id: 'proj1', name: 'Project A' },
  { id: 'proj2', name: 'Project B' },
  { id: 'proj3', name: 'Project C' },
  { id: 'proj4', name: 'Project D' },
];

const SAMPLE_SUPPLIERS: Supplier[] = [
  { id: 'sup1', name: 'Sivaa Enterprises', contact: 'Rajesh Kumar', email: 'sivaa@email.com', gst: '33AABCS1234A1Z5', address: 'Industrial Area', city: 'Chennai', phone: '9876543210' },
  { id: 'sup2', name: 'M/S SS Enterprises', contact: 'Suresh Singh', email: 'ssenterprise@email.com', gst: '33AABCM5678B2Y6', address: 'MIDC Pune', city: 'Pune', phone: '9876543211' },
  { id: 'sup3', name: 'Huntsman Chemicals', contact: 'Amit Patel', email: 'huntsman@email.com', gst: '33AABCH3456D4W8', address: 'Chemical Zone', city: 'Mumbai', phone: '9876543213' },
  { id: 'sup4', name: 'BYK Additives (IMCD)', contact: 'Priya Sharma', email: 'imcd@email.com', gst: '33AABCB9012C3X7', address: 'Tech Park', city: 'Bangalore', phone: '9876543212' },
  { id: 'sup5', name: 'Chem Trend India', contact: 'Deepak Verma', email: 'chemtrend@email.com', gst: '33AABCC7890E5V9', address: 'Industrial Hub', city: 'Ahmedabad', phone: '9876543214' },
  { id: 'sup6', name: 'Mirka Abrasives', contact: 'Karthik Raja', email: 'mirka@email.com', gst: '33AABCM1234F6U0', address: 'Peenya Industrial Area', city: 'Bangalore', phone: '9876543215' },
  { id: 'sup7', name: 'MP Chemicals', contact: 'Arun Kumar', email: 'mpchemicals@email.com', gst: '33AABCM5678G7T1', address: 'SIPCOT', city: 'Chennai', phone: '9876543216' },
];

// ==========================================
// ALL STORAGE AREAS (derived)
// ==========================================
function getStorageAreas(items: StockItem[]): string[] {
  const areas = new Set<string>();
  items.forEach(i => { if (i.storageArea) areas.add(i.storageArea); });
  return Array.from(areas).sort();
}

// ==========================================
// TOAST COMPONENT
// ==========================================
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'warning'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);
  const colors = {
    success: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
    error: 'bg-red-500/20 border-red-500/40 text-red-300',
    warning: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
  };
  return (
    <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
      className={`fixed bottom-6 right-6 z-[9999] px-5 py-3 rounded-xl border ${colors[type]} backdrop-blur-lg shadow-2xl flex items-center gap-3`}>
      {type === 'success' && <CheckCircle2 className="w-5 h-5" />}
      {type === 'error' && <AlertTriangle className="w-5 h-5" />}
      {type === 'warning' && <Bell className="w-5 h-5" />}
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-70"><X className="w-4 h-4" /></button>
    </motion.div>
  );
}

// ==========================================
// TAB DEFINITIONS
// ==========================================
type TabKey = 'daily-stock' | 'grn-inward' | 'receive-po' | 'issue-material' | 'material-return' |
  'invoice' | 'create-po' | 'incoming-orders' | 'material-requests' | 'materials' | 'suppliers' | 'storage-map' | 'expiry' | 'analytics' | 'audit';

const TABS: { key: TabKey; label: string; icon: React.ElementType; color: string }[] = [
  { key: 'daily-stock', label: 'Daily Stock', icon: ClipboardList, color: 'blue' },
  { key: 'grn-inward', label: 'GRN Inward', icon: ArrowDownToLine, color: 'emerald' },
  { key: 'receive-po', label: 'Receive vs PO', icon: FileText, color: 'cyan' },
  { key: 'issue-material', label: 'Issue Material', icon: ShoppingCart, color: 'orange' },
  { key: 'material-return', label: 'Return', icon: RotateCcw, color: 'purple' },
  { key: 'invoice', label: 'Invoice', icon: Receipt, color: 'indigo' },
  { key: 'create-po', label: 'Create PO', icon: Send, color: 'rose' },
  { key: 'incoming-orders', label: 'Incoming POs', icon: Truck, color: 'teal' },
  { key: 'material-requests', label: 'Material Requests', icon: Inbox, color: 'amber' },
  { key: 'materials', label: 'Item Master', icon: Package, color: 'sky' },
  { key: 'suppliers', label: 'Suppliers', icon: Building2, color: 'lime' },
  { key: 'storage-map', label: 'Storage Map', icon: MapPin, color: 'pink' },
  { key: 'expiry', label: 'Expiry Control', icon: CalendarClock, color: 'red' },
  { key: 'analytics', label: 'Analytics', icon: BarChart3, color: 'violet' },
  { key: 'audit', label: 'Audit Trail', icon: History, color: 'zinc' },
];

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function EmpStorePage() {
  const [activeTab, setActiveTab] = useState<TabKey>('daily-stock');
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState('Store Manager');

  // Daily Stock
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dailyStockHistory, setDailyStockHistory] = useState<DailyStockRecord[]>([]);
  const [isSavingDaily, setIsSavingDaily] = useState(false);
  const [dailyStockNotes, setDailyStockNotes] = useState('');
  const [todayRecord, setTodayRecord] = useState<DailyStockRecord | null>(null);

  // Incoming Orders
  const [incomingOrders, setIncomingOrders] = useState<PurchaseOrder[]>([]);

  // Material Requests from employees
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [materialRequests, setMaterialRequests] = useState<any[]>([]);

  // Modals
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [showGRN, setShowGRN] = useState(false);
  const [showIssue, setShowIssue] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [showReceivePO, setShowReceivePO] = useState(false);
  const [showCreatePO, setShowCreatePO] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [storageFilter, setStorageFilter] = useState('all');
  const [dailySearchTerm, setDailySearchTerm] = useState('');

  // Audit & Toast
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  // Real-time sync
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ state: 'connected', lastSync: null, itemsSynced: 0, message: 'Ready' });
  const [liveActivities, setLiveActivities] = useState<LiveActivity[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayOpsCount, setTodayOpsCount] = useState({ grn: 0, issue: 0, return: 0, updates: 0 });
  const [expandedStorageArea, setExpandedStorageArea] = useState<string | null>(null);

  // New Material Form
  const [newMaterial, setNewMaterial] = useState({
    code: '', materialName: '', category: 'Chemical' as Category,
    supplierName: '', rate: 0, uom: 'g', openingStock: 0,
    minStock: 0, maxStock: 0, binLocation: '', shelfLife: 0,
    batchRequired: false, expiryRequired: false, storageCondition: ''
  });

  // New Supplier Form
  const [newSupplier, setNewSupplier] = useState({
    name: '', contact: '', email: '', gst: '', address: '', city: '', phone: ''
  });

  // ==========================================
  // HELPERS
  // ==========================================
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ message, type });
  }, []);

  const addLiveActivity = useCallback((action: string, detail: string, type: LiveActivity['type']) => {
    setLiveActivities(prev => [{
      id: Date.now().toString(), time: new Date().toLocaleTimeString('en-IN'), action, detail, type
    }, ...prev].slice(0, 20));
  }, []);

  const logAudit = useCallback((action: AuditLog['action'], entityType: AuditLog['entityType'], entityName: string, details: string) => {
    const log: AuditLog = { id: Date.now().toString(), timestamp: new Date().toISOString(), action, entityType, entityName, details, user: userName };
    setAuditLogs(prev => [log, ...prev].slice(0, 500));
    try { localStorage.setItem('store_audit_logs', JSON.stringify([log, ...auditLogs].slice(0, 500))); } catch { /* */ }
  }, [userName, auditLogs]);

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // ==========================================
  // STOCK CALCULATIONS
  // ==========================================
  const calculateClosingStock = useCallback((item: StockItem): number => {
    let total = (item.openingStock || 0) + (item.inword || 0);
    if (item.projects) Object.values(item.projects).forEach(val => total -= (val || 0));
    total -= (item.rdUsage || 0) + (item.internalUsage || 0) + (item.newFactoryUsage || 0);
    return Math.max(0, total);
  }, []);

  const getTotalProjectIssues = useCallback((item: StockItem): number => {
    if (!item.projects) return 0;
    return Object.values(item.projects).reduce((sum, val) => sum + (val || 0), 0);
  }, []);

  // ==========================================
  // LOAD DATA
  // ==========================================
  useEffect(() => {
    try {
      const stored = localStorage.getItem('currentUser');
      if (stored) { const u = JSON.parse(stored); setUserName(u.name || u.displayName || 'Store Manager'); }
    } catch { /* */ }

    try {
      const saved = localStorage.getItem('store_stock_items_v2');
      if (saved) { setStockItems(JSON.parse(saved)); }
      else { setStockItems(INITIAL_MATERIALS); localStorage.setItem('store_stock_items_v2', JSON.stringify(INITIAL_MATERIALS)); }
    } catch { setStockItems(INITIAL_MATERIALS); }

    try {
      const savedSup = localStorage.getItem('store_suppliers');
      if (savedSup) { setSuppliers(JSON.parse(savedSup)); }
      else { setSuppliers(SAMPLE_SUPPLIERS); localStorage.setItem('store_suppliers', JSON.stringify(SAMPLE_SUPPLIERS)); }
    } catch { setSuppliers(SAMPLE_SUPPLIERS); }

    try {
      const savedLogs = localStorage.getItem('store_audit_logs');
      if (savedLogs) setAuditLogs(JSON.parse(savedLogs));
    } catch { /* */ }

    try {
      const savedOps = localStorage.getItem('store_today_ops');
      if (savedOps) setTodayOpsCount(JSON.parse(savedOps));
    } catch { /* */ }

    setIsLoading(false);
    setSyncStatus(prev => ({ ...prev, state: 'connected', message: 'Data loaded' }));
  }, []);

  // Persist
  useEffect(() => {
    if (!isLoading && stockItems.length > 0) localStorage.setItem('store_stock_items_v2', JSON.stringify(stockItems));
  }, [stockItems, isLoading]);
  useEffect(() => {
    if (!isLoading && suppliers.length > 0) localStorage.setItem('store_suppliers', JSON.stringify(suppliers));
  }, [suppliers, isLoading]);

  // ==========================================
  // FIREBASE SYNC
  // ==========================================
  useEffect(() => {
    let unsub: (() => void) | undefined;
    try {
      const q = query(collection(db, COLLECTIONS.PURCHASE_ORDERS), where('status', 'in', ['pending_md_approval', 'approved', 'rejected', 'ordered', 'partially_received']));
      unsub = onSnapshot(q, (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as PurchaseOrder));
        data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setIncomingOrders(data);
      }, (err) => { console.warn('PO listener:', err.message); });
    } catch (err) { console.warn('PO setup failed:', err); }
    return () => { if (unsub) unsub(); };
  }, []);

  // Material Requests listener
  useEffect(() => {
    let unsub: (() => void) | undefined;
    try {
      const q = query(collection(db, 'material_requests'), where('status', 'in', ['sent_to_store', 'draft', 'processing', 'fulfilled', 'rejected']));
      unsub = onSnapshot(q, (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        data.sort((a: { createdAt?: string }, b: { createdAt?: string }) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
        setMaterialRequests(data);
      }, (err) => { console.warn('Material requests listener:', err.message); });
    } catch (err) { console.warn('Material requests setup failed:', err); }
    return () => { if (unsub) unsub(); };
  }, []);

  // Real-time stock movement listener — auto-patches stockItems when GRN/Issue/Return
  // happens from any tab or user
  useEffect(() => {
    let unsub: (() => void) | undefined;
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const q = query(
        collection(db, 'stock_movements'),
        where('date', '>=', todayStart.toISOString()),
        orderBy('date', 'desc')
      );
      unsub = onSnapshot(q, (snap) => {
        const movements = snap.docs.map(d => d.data());
        // Update sync status
        setSyncStatus(prev => ({ ...prev, lastSync: new Date().toISOString(), connected: true, pendingChanges: 0 }));
        // Count today's operations from movements
        const grnCount = movements.filter(m => m.type === 'purchase').length;
        const issueCount = movements.filter(m => m.type === 'issue').length;
        const returnCount = movements.filter(m => m.type === 'return').length;
        if (grnCount > 0 || issueCount > 0 || returnCount > 0) {
          setTodayOpsCount(prev => {
            const n = { ...prev, grn: Math.max(prev.grn, grnCount), issue: Math.max(prev.issue, issueCount), return: Math.max(prev.return, returnCount) };
            localStorage.setItem('store_today_ops', JSON.stringify(n));
            return n;
          });
        }
      }, (err) => {
        console.warn('Stock movements listener:', err.message);
        setSyncStatus(prev => ({ ...prev, connected: false }));
      });
    } catch (err) { console.warn('Stock movements setup failed:', err); }
    return () => { if (unsub) unsub(); };
  }, []);

  const loadDailyStockHistory = useCallback(async () => {
    try {
      const q = query(collection(db, FB_DAILY_STOCK), orderBy('date', 'desc'));
      const snap = await getDocs(q);
      const records = snap.docs.map(d => ({ id: d.id, ...d.data() } as DailyStockRecord));
      setDailyStockHistory(records);
      const today = new Date().toISOString().split('T')[0];
      const todayRec = records.find(r => r.date === today);
      if (todayRec) setTodayRecord(todayRec);
    } catch (err) { console.warn('Daily stock history:', err); }
  }, []);

  useEffect(() => { loadDailyStockHistory(); }, [loadDailyStockHistory]);

  const syncToFirebase = useCallback(async () => {
    setSyncStatus({ state: 'syncing', lastSync: null, itemsSynced: 0, message: 'Syncing...' });
    try {
      const batch = writeBatch(db);
      let count = 0;
      for (const item of stockItems) {
        const docRef = doc(db, FB_MATERIALS, item.id);
        batch.set(docRef, {
          code: item.code, name: item.materialName, category: item.category,
          supplier: item.supplierName, unit: item.uom, current_stock: calculateClosingStock(item),
          min_stock: item.minStock || 0, max_stock: item.maxStock || 0, purchase_price: item.rate,
          opening_stock: item.openingStock, inward: item.inword, bin_location: item.binLocation || '',
          storage_area: item.storageArea || '', batch_required: item.batchRequired || false,
          expiry_required: item.expiryRequired || false, shelf_life: item.shelfLife || 0,
          sno: item.sno, updated_at: new Date().toISOString(),
        }, { merge: true });
        count++;
      }
      for (const sup of suppliers) {
        const docRef = doc(db, FB_SUPPLIERS, sup.id);
        batch.set(docRef, { ...sup, updated_at: new Date().toISOString() }, { merge: true });
      }
      await batch.commit();
      const now = new Date().toLocaleTimeString('en-IN');
      setSyncStatus({ state: 'connected', lastSync: now, itemsSynced: count, message: `Synced ${count} items` });
      addLiveActivity('Sync Complete', `${count} materials + ${suppliers.length} suppliers synced to Firebase`, 'sync');
    } catch (err) {
      console.error('Sync failed:', err);
      setSyncStatus({ state: 'error', lastSync: null, itemsSynced: 0, message: 'Sync failed' });
    }
  }, [stockItems, suppliers, calculateClosingStock, addLiveActivity]);

  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (stockItems.length > 0 && suppliers.length > 0 && !isLoading) {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(() => { syncToFirebase(); }, 5000);
    }
    return () => { if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current); };
  }, [stockItems, suppliers, isLoading, syncToFirebase]);

  // ==========================================
  // DAILY STOCK OPS
  // ==========================================
  const generateDailyStockRecord = useCallback(() => {
    const materials = stockItems.map(s => ({
      materialId: s.id, materialCode: s.code, materialName: s.materialName,
      category: s.category, supplierName: s.supplierName, uom: s.uom, rate: s.rate,
      openingStock: s.openingStock || 0, inward: s.inword || 0,
      projectIssues: getTotalProjectIssues(s), rdUsage: s.rdUsage || 0,
      internalUsage: s.internalUsage || 0, newFactoryUsage: s.newFactoryUsage || 0,
      closingStock: calculateClosingStock(s), minStock: s.minStock || 0,
      stockValue: calculateClosingStock(s) * s.rate,
    }));
    return {
      date: selectedDate, materials,
      summary: {
        totalMaterials: materials.length,
        totalStockValue: materials.reduce((sum, m) => sum + m.stockValue, 0),
        lowStockCount: materials.filter(m => m.closingStock <= m.minStock && m.closingStock > 0).length,
        outOfStockCount: materials.filter(m => m.closingStock <= 0).length,
        totalInward: materials.reduce((sum, m) => sum + m.inward, 0),
        totalIssued: materials.reduce((sum, m) => sum + m.projectIssues + m.rdUsage + m.internalUsage + m.newFactoryUsage, 0),
      },
      savedBy: userName, savedAt: new Date().toISOString(), status: 'saved' as const, notes: dailyStockNotes,
    };
  }, [stockItems, selectedDate, calculateClosingStock, getTotalProjectIssues, dailyStockNotes, userName]);

  const saveDailyStock = useCallback(async () => {
    setIsSavingDaily(true);
    try {
      const record = generateDailyStockRecord();
      const existing = dailyStockHistory.find(r => r.date === selectedDate);
      if (existing && existing.status === 'locked') { showToast('Record is locked', 'error'); return; }
      if (existing) { await updateDoc(doc(db, FB_DAILY_STOCK, existing.id), record); }
      else { await addDoc(collection(db, FB_DAILY_STOCK), record); }
      await syncToFirebase();
      showToast(`Daily stock for ${selectedDate} saved!`, 'success');
      logAudit('CREATE', 'Stock', selectedDate, `Saved daily stock for ${selectedDate}`);
      addLiveActivity('Daily Stock Saved', `${record.materials.length} items recorded`, 'update');
      await loadDailyStockHistory();
    } catch (error) {
      console.error('Save error:', error);
      showToast('Failed to save daily stock', 'error');
    } finally { setIsSavingDaily(false); }
  }, [generateDailyStockRecord, selectedDate, dailyStockHistory, syncToFirebase, loadDailyStockHistory, logAudit, showToast, addLiveActivity]);

  const navigateDate = useCallback((dir: 'prev' | 'next') => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + (dir === 'prev' ? -1 : 1));
    setSelectedDate(d.toISOString().split('T')[0]);
  }, [selectedDate]);

  // ==========================================
  // CRUD
  // ==========================================
  const addMaterial = useCallback(() => {
    if (!newMaterial.code || !newMaterial.materialName) { showToast('Code and name required', 'error'); return; }
    if (stockItems.some(s => s.code === newMaterial.code)) { showToast('Code exists', 'error'); return; }
    const item: StockItem = {
      id: `mat-${Date.now()}`, sno: stockItems.length + 1, ...newMaterial,
      inword: 0, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0,
      createdAt: new Date().toISOString(), storageArea: newMaterial.binLocation,
      lastModified: new Date().toISOString(),
    };
    setStockItems(prev => [...prev, item]);
    showToast(`"${newMaterial.materialName}" added`, 'success');
    logAudit('CREATE', 'Material', newMaterial.materialName, `Added ${newMaterial.code}`);
    addLiveActivity('Material Added', newMaterial.materialName, 'update');
    setTodayOpsCount(prev => { const n = { ...prev, updates: prev.updates + 1 }; localStorage.setItem('store_today_ops', JSON.stringify(n)); return n; });
    setShowAddMaterial(false);
    setNewMaterial({ code: '', materialName: '', category: 'Chemical', supplierName: '', rate: 0, uom: 'g', openingStock: 0, minStock: 0, maxStock: 0, binLocation: '', shelfLife: 0, batchRequired: false, expiryRequired: false, storageCondition: '' });
  }, [newMaterial, stockItems, showToast, logAudit, addLiveActivity]);

  const deleteMaterial = useCallback((id: string) => {
    const item = stockItems.find(s => s.id === id);
    if (!item || !confirm(`Delete "${item.materialName}"?`)) return;
    setStockItems(prev => prev.filter(s => s.id !== id));
    showToast(`"${item.materialName}" deleted`, 'warning');
    logAudit('DELETE', 'Material', item.materialName, `Deleted ${item.code}`);
    addLiveActivity('Material Deleted', item.materialName, 'update');
  }, [stockItems, showToast, logAudit, addLiveActivity]);

  const updateStockField = useCallback((id: string, field: string, value: number) => {
    setStockItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      if (field.startsWith('projects.')) {
        const pName = field.replace('projects.', '');
        return { ...item, projects: { ...item.projects, [pName]: Math.max(0, value) }, lastModified: new Date().toISOString() };
      }
      return { ...item, [field]: Math.max(0, value), lastModified: new Date().toISOString() };
    }));
  }, []);

  const addSupplier = useCallback(() => {
    if (!newSupplier.name) { showToast('Name required', 'error'); return; }
    const sup: Supplier = { id: `sup-${Date.now()}`, ...newSupplier };
    setSuppliers(prev => [...prev, sup]);
    showToast(`"${newSupplier.name}" added`, 'success');
    logAudit('CREATE', 'Supplier', newSupplier.name, 'Added supplier');
    setShowAddSupplier(false);
    setNewSupplier({ name: '', contact: '', email: '', gst: '', address: '', city: '', phone: '' });
  }, [newSupplier, showToast, logAudit]);

  // ==========================================
  // EXPORT
  // ==========================================
  const exportToExcel = useCallback((type: 'materials' | 'suppliers' | 'stock' | 'audit') => {
    let data: Record<string, unknown>[] = [];
    let filename = '';
    if (type === 'materials' || type === 'stock') {
      data = stockItems.map(s => ({
        'S.No': s.sno, 'Code': s.code, 'Name': s.materialName, 'Category': s.category,
        'UOM': s.uom, 'Storage Area': s.storageArea, 'Opening': s.openingStock,
        'Inward': s.inword, 'Closing': calculateClosingStock(s),
        ...(type === 'stock' ? {
          ...Object.fromEntries(SAMPLE_PROJECTS.map(p => [p.name, s.projects[p.name] || 0])),
          'R&D': s.rdUsage, 'Internal': s.internalUsage,
        } : { 'Supplier': s.supplierName, 'Rate': s.rate, 'Min': s.minStock, 'Max': s.maxStock }),
      }));
      filename = type === 'stock' ? `Daily_Stock_${selectedDate}.xlsx` : `Item_Master_${selectedDate}.xlsx`;
    } else if (type === 'suppliers') {
      data = suppliers.map(s => ({ Name: s.name, Contact: s.contact, Email: s.email, GST: s.gst, City: s.city, Phone: s.phone }));
      filename = `Suppliers_${selectedDate}.xlsx`;
    } else {
      data = auditLogs.map(l => ({ Time: new Date(l.timestamp).toLocaleString(), Action: l.action, Entity: l.entityType, Name: l.entityName, Details: l.details, User: l.user }));
      filename = `Audit_${selectedDate}.xlsx`;
    }
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, type);
    XLSX.writeFile(wb, filename);
    showToast(`Exported ${type}`, 'success');
  }, [stockItems, suppliers, auditLogs, calculateClosingStock, selectedDate, showToast]);

  // ==========================================
  // COMPUTED
  // ==========================================
  const stats = useMemo(() => {
    const totalValue = stockItems.reduce((s, i) => s + calculateClosingStock(i) * i.rate, 0);
    const lowStock = stockItems.filter(s => { const c = calculateClosingStock(s); return c > 0 && c <= (s.minStock || 0); }).length;
    const outOfStock = stockItems.filter(s => calculateClosingStock(s) <= 0).length;
    const withStock = stockItems.filter(s => calculateClosingStock(s) > 0).length;
    return { totalItems: stockItems.length, totalValue, lowStock, outOfStock, withStock };
  }, [stockItems, calculateClosingStock]);

  const storageAreas = useMemo(() => getStorageAreas(stockItems), [stockItems]);

  const filteredMaterials = useMemo(() => {
    return stockItems.filter(s => {
      const matchSearch = !searchTerm || s.materialName.toLowerCase().includes(searchTerm.toLowerCase()) || s.code.toLowerCase().includes(searchTerm.toLowerCase()) || (s.storageArea || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = categoryFilter === 'all' || s.category === categoryFilter;
      const matchStorage = storageFilter === 'all' || s.storageArea === storageFilter;
      return matchSearch && matchCat && matchStorage;
    });
  }, [stockItems, searchTerm, categoryFilter, storageFilter]);

  const dailyFilteredItems = useMemo(() => {
    if (!dailySearchTerm) return stockItems;
    return stockItems.filter(s => s.materialName.toLowerCase().includes(dailySearchTerm.toLowerCase()) || s.code.toLowerCase().includes(dailySearchTerm.toLowerCase()));
  }, [stockItems, dailySearchTerm]);

  const sopMaterialData = useMemo(() => {
    return stockItems.map(s => ({
      id: s.id, name: s.materialName, code: s.code, unit: s.uom,
      category: s.category, current_stock: calculateClosingStock(s),
      min_stock: s.minStock || 0, purchase_price: s.rate,
      supplier: s.supplierName, bin_location: s.binLocation || '',
    }));
  }, [stockItems, calculateClosingStock]);

  const storageAreaStats = useMemo(() => {
    const areaMap: Record<string, { count: number; withStock: number; outOfStock: number; items: StockItem[] }> = {};
    stockItems.forEach(item => {
      const area = item.storageArea || 'Unassigned';
      if (!areaMap[area]) areaMap[area] = { count: 0, withStock: 0, outOfStock: 0, items: [] };
      areaMap[area].count++;
      areaMap[area].items.push(item);
      if (calculateClosingStock(item) > 0) areaMap[area].withStock++;
      else areaMap[area].outOfStock++;
    });
    return areaMap;
  }, [stockItems, calculateClosingStock]);

  const categoryColors: Record<string, string> = {
    'Chemical': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'Raw Material': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    'Solvent': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    'Additive': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    'Consumable': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    'Tool': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    'Lab Equipment': 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    'Release Agent': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    'Wax': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  };

  // ==========================================
  // RENDER
  // ==========================================
  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-10 h-10 text-blue-500 animate-spin" />
          <p className="text-zinc-400">Loading Store Management...</p>
          <div className="w-48 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <motion.div className="h-full bg-blue-500 rounded-full" animate={{ width: ['0%', '100%'] }} transition={{ duration: 1.5, repeat: Infinity }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none z-0" />

      <div className="relative z-10 max-w-[1900px] mx-auto p-4 lg:p-6">

        {/* ============ REAL-TIME STATUS BAR ============ */}
        <div className="flex items-center justify-between bg-zinc-900/80 border border-zinc-800 rounded-xl px-4 py-2 mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {syncStatus.state === 'connected' && <><div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" /><Wifi className="w-4 h-4 text-emerald-400" /></>}
              {syncStatus.state === 'syncing' && <><div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" /><RefreshCw className="w-4 h-4 text-blue-400 animate-spin" /></>}
              {syncStatus.state === 'error' && <><div className="w-2.5 h-2.5 rounded-full bg-red-500" /><WifiOff className="w-4 h-4 text-red-400" /></>}
              {syncStatus.state === 'offline' && <><div className="w-2.5 h-2.5 rounded-full bg-zinc-500" /><WifiOff className="w-4 h-4 text-zinc-400" /></>}
              <span className="text-xs text-zinc-400">{syncStatus.message}</span>
            </div>
            {syncStatus.lastSync && (
              <span className="text-xs text-zinc-600">Last sync: {syncStatus.lastSync}</span>
            )}
            <div className="h-4 w-px bg-zinc-700" />
            <span className="text-xs text-zinc-500">{stockItems.length} materials loaded</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-xs">
              <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400">{todayOpsCount.grn} GRN</span>
              <span className="px-2 py-1 rounded bg-orange-500/10 text-orange-400">{todayOpsCount.issue} Issues</span>
              <span className="px-2 py-1 rounded bg-purple-500/10 text-purple-400">{todayOpsCount.return} Returns</span>
            </div>
            <div className="h-4 w-px bg-zinc-700" />
            <span className="text-xs font-mono text-zinc-400">{currentTime.toLocaleTimeString('en-IN')}</span>
          </div>
        </div>

        {/* ============ HEADER ============ */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
              R&D Store Management System
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              {userName} • {currentTime.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} • {storageAreas.length} Storage Locations
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => syncToFirebase()} className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-xl text-blue-400 text-sm flex items-center gap-2 transition-colors">
              <RefreshCw className={`w-4 h-4 ${syncStatus.state === 'syncing' ? 'animate-spin' : ''}`} /> Sync to Firebase
            </button>
            <button onClick={() => exportToExcel('stock')} className="px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm flex items-center gap-2 transition-colors">
              <Download className="w-4 h-4" /> Export
            </button>
          </div>
        </div>

        {/* ============ STATS CARDS WITH PROGRESS ============ */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
          {[
            { label: 'Total Items', value: stats.totalItems, sub: `${stats.withStock} in stock`, icon: Package, color: 'blue', pct: 100 },
            { label: 'Stock Value', value: `₹${stats.totalValue > 0 ? (stats.totalValue / 100000).toFixed(1) + 'L' : '0'}`, sub: 'Total inventory', icon: DollarSign, color: 'emerald', pct: 80 },
            { label: 'Items In Stock', value: stats.withStock, sub: `${((stats.withStock / stats.totalItems) * 100).toFixed(0)}% available`, icon: TrendingUp, color: 'cyan', pct: (stats.withStock / stats.totalItems) * 100 },
            { label: 'Low Stock', value: stats.lowStock, sub: 'Below minimum', icon: AlertTriangle, color: 'amber', pct: (stats.lowStock / stats.totalItems) * 100 },
            { label: 'Out of Stock', value: stats.outOfStock, sub: 'Zero qty', icon: AlertTriangle, color: 'red', pct: (stats.outOfStock / stats.totalItems) * 100 },
          ].map(stat => (
            <div key={stat.label} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className={`p-2 rounded-lg bg-${stat.color}-500/20`}>
                  <stat.icon className={`w-4 h-4 text-${stat.color}-400`} />
                </div>
                <span className="text-xs text-zinc-500">{stat.sub}</span>
              </div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-zinc-500 mt-1">{stat.label}</p>
              <div className="mt-2 h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div className={`h-full bg-${stat.color}-500 rounded-full transition-all duration-500`} style={{ width: `${Math.min(100, stat.pct)}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* ============ LIVE ACTIVITY TICKER ============ */}
        {liveActivities.length > 0 && (
          <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl px-4 py-2 mb-4 flex items-center gap-3 overflow-hidden">
            <Activity className="w-4 h-4 text-blue-400 shrink-0" />
            <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide">
              {liveActivities.slice(0, 5).map(a => (
                <span key={a.id} className="text-xs text-zinc-400 whitespace-nowrap flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${a.type === 'grn' ? 'bg-emerald-500' : a.type === 'issue' ? 'bg-orange-500' : a.type === 'sync' ? 'bg-blue-500' : 'bg-zinc-500'}`} />
                  <span className="text-zinc-500">{a.time}</span>
                  <span className="text-zinc-300">{a.action}</span>
                  <span className="text-zinc-600">— {a.detail}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ============ TAB NAVIGATION ============ */}
        <div className="flex overflow-x-auto gap-1 mb-5 pb-2 scrollbar-hide">
          {TABS.map(tab => (
            <button key={tab.key}
              onClick={() => {
                if (tab.key === 'grn-inward') { setShowGRN(true); return; }
                if (tab.key === 'receive-po') { setShowReceivePO(true); return; }
                if (tab.key === 'issue-material') { setShowIssue(true); return; }
                if (tab.key === 'material-return') { setShowReturn(true); return; }
                if (tab.key === 'invoice') { setShowInvoice(true); return; }
                if (tab.key === 'create-po') { setShowCreatePO(true); return; }
                setActiveTab(tab.key);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.key
                  ? `bg-${tab.color}-500/20 text-${tab.color}-400 border border-${tab.color}-500/40`
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 border border-transparent'
              }`}>
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.key === 'materials' && <span className="ml-1 text-xs text-zinc-600">({stockItems.length})</span>}
            </button>
          ))}
        </div>

        {/* ============ TAB CONTENT ============ */}
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>

            {/* ═══ DAILY STOCK ═══ */}
            {activeTab === 'daily-stock' && (
              <div className="space-y-4">
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <button onClick={() => navigateDate('prev')} className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700"><ChevronLeft className="w-4 h-4" /></button>
                      <div className="flex items-center gap-2 px-4 py-2 bg-zinc-800/50 rounded-xl border border-zinc-700">
                        <Calendar className="w-4 h-4 text-blue-400" />
                        <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="bg-transparent text-white text-sm outline-none" />
                      </div>
                      <button onClick={() => navigateDate('next')} className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700"><ChevronRight className="w-4 h-4" /></button>
                      <button onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])} className="px-3 py-2 rounded-lg bg-blue-600/20 text-blue-400 text-sm border border-blue-500/30">Today</button>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                        <input type="text" placeholder="Search materials..." value={dailySearchTerm} onChange={e => setDailySearchTerm(e.target.value)}
                          className="pl-9 pr-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-500 w-48 outline-none focus:border-blue-500/50" />
                      </div>
                      <input type="text" placeholder="Daily notes..." value={dailyStockNotes} onChange={e => setDailyStockNotes(e.target.value)}
                        className="px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-500 w-44 outline-none focus:border-blue-500/50" />
                      <button onClick={saveDailyStock} disabled={isSavingDaily}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl text-white text-sm font-medium flex items-center gap-2">
                        {isSavingDaily ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save ({dailyFilteredItems.length})
                      </button>
                    </div>
                  </div>
                  {todayRecord && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Last saved: {new Date(todayRecord.savedAt).toLocaleString()} by {todayRecord.savedBy}
                    </div>
                  )}
                </div>

                {/* Daily Stock Table */}
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
                  <div className="px-4 py-2 bg-zinc-800/30 border-b border-zinc-800 text-xs text-zinc-500">
                    Showing {dailyFilteredItems.length} of {stockItems.length} materials
                  </div>
                  <div className="overflow-x-auto max-h-[65vh] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-zinc-800/90 border-b border-zinc-700">
                          <th className="text-left px-3 py-3 text-zinc-400 font-medium text-xs">S.No</th>
                          <th className="text-left px-3 py-3 text-zinc-400 font-medium text-xs">Material</th>
                          <th className="text-left px-3 py-3 text-zinc-400 font-medium text-xs">UOM</th>
                          <th className="text-left px-3 py-3 text-zinc-400 font-medium text-xs">Storage</th>
                          <th className="text-right px-3 py-3 text-zinc-400 font-medium text-xs">Opening</th>
                          <th className="text-right px-3 py-3 text-zinc-400 font-medium text-xs">Inward</th>
                          {SAMPLE_PROJECTS.map(p => (
                            <th key={p.id} className="text-right px-3 py-3 text-zinc-400 font-medium text-xs">{p.name}</th>
                          ))}
                          <th className="text-right px-3 py-3 text-zinc-400 font-medium text-xs">R&D</th>
                          <th className="text-right px-3 py-3 text-zinc-400 font-medium text-xs">Internal</th>
                          <th className="text-right px-3 py-3 text-zinc-400 font-medium text-xs">New Fac.</th>
                          <th className="text-right px-3 py-3 text-zinc-400 font-medium text-xs">Closing</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/50">
                        {dailyFilteredItems.map(item => {
                          const closing = calculateClosingStock(item);
                          const isLow = closing > 0 && closing <= (item.minStock || 0);
                          const isOut = closing <= 0;
                          return (
                            <tr key={item.id} className={`hover:bg-zinc-800/30 transition-colors ${isOut ? 'bg-red-900/10' : isLow ? 'bg-amber-900/10' : ''}`}>
                              <td className="px-3 py-2 text-zinc-500 text-xs">{item.sno}</td>
                              <td className="px-3 py-2">
                                <div className="text-white text-sm max-w-[200px] truncate" title={item.materialName}>{item.materialName}</div>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${categoryColors[item.category] || 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>{item.category}</span>
                              </td>
                              <td className="px-3 py-2 text-zinc-400 text-xs">{item.uom}</td>
                              <td className="px-3 py-2 font-mono text-xs text-cyan-400/70" title={item.storageArea}>{item.storageArea || '-'}</td>
                              <td className="text-right px-2 py-2">
                                <input type="number" value={item.openingStock} onChange={e => updateStockField(item.id, 'openingStock', Number(e.target.value))}
                                  className="w-16 bg-zinc-800/50 border border-zinc-700 rounded px-2 py-1 text-right text-xs text-white outline-none focus:border-blue-500/50" />
                              </td>
                              <td className="text-right px-2 py-2">
                                <input type="number" value={item.inword} onChange={e => updateStockField(item.id, 'inword', Number(e.target.value))}
                                  className="w-14 bg-emerald-900/20 border border-emerald-700/30 rounded px-2 py-1 text-right text-xs text-emerald-300 outline-none focus:border-emerald-500/50" />
                              </td>
                              {SAMPLE_PROJECTS.map(p => (
                                <td key={p.id} className="text-right px-2 py-2">
                                  <input type="number" value={item.projects[p.name] || 0} onChange={e => updateStockField(item.id, `projects.${p.name}`, Number(e.target.value))}
                                    className="w-12 bg-zinc-800/50 border border-zinc-700 rounded px-1 py-1 text-right text-xs text-orange-300 outline-none focus:border-orange-500/50" />
                                </td>
                              ))}
                              <td className="text-right px-2 py-2">
                                <input type="number" value={item.rdUsage} onChange={e => updateStockField(item.id, 'rdUsage', Number(e.target.value))}
                                  className="w-12 bg-zinc-800/50 border border-zinc-700 rounded px-1 py-1 text-right text-xs text-purple-300 outline-none" />
                              </td>
                              <td className="text-right px-2 py-2">
                                <input type="number" value={item.internalUsage} onChange={e => updateStockField(item.id, 'internalUsage', Number(e.target.value))}
                                  className="w-12 bg-zinc-800/50 border border-zinc-700 rounded px-1 py-1 text-right text-xs text-zinc-300 outline-none" />
                              </td>
                              <td className="text-right px-2 py-2">
                                <input type="number" value={item.newFactoryUsage} onChange={e => updateStockField(item.id, 'newFactoryUsage', Number(e.target.value))}
                                  className="w-12 bg-zinc-800/50 border border-zinc-700 rounded px-1 py-1 text-right text-xs text-zinc-300 outline-none" />
                              </td>
                              <td className="text-right px-3 py-2">
                                <span className={`font-semibold text-sm ${isOut ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-emerald-400'}`}>{closing}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-zinc-800/70 border-t border-zinc-700 sticky bottom-0">
                          <td colSpan={5} className="px-3 py-3 text-zinc-300 font-semibold text-sm">TOTAL ({dailyFilteredItems.length} items)</td>
                          <td className="text-right px-3 py-3 text-emerald-400 font-semibold text-sm">{dailyFilteredItems.reduce((s, i) => s + (i.inword || 0), 0)}</td>
                          <td colSpan={SAMPLE_PROJECTS.length + 3} />
                          <td className="text-right px-3 py-3 text-blue-400 font-semibold text-sm">{dailyFilteredItems.reduce((s, i) => s + calculateClosingStock(i), 0)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* History */}
                {dailyStockHistory.length > 0 && (
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2"><History className="w-4 h-4 text-blue-400" /> Saved Records</h3>
                    <div className="flex flex-wrap gap-2">
                      {dailyStockHistory.slice(0, 14).map(record => (
                        <button key={record.id} onClick={() => setSelectedDate(record.date)}
                          className={`px-3 py-2 rounded-lg text-xs transition-colors ${selectedDate === record.date ? 'bg-blue-500/20 border border-blue-500/40 text-blue-400' : 'bg-zinc-800/50 border border-zinc-700/50 text-zinc-400 hover:border-zinc-600'}`}>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3 h-3" />
                            {new Date(record.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                            {record.status === 'locked' && <Lock className="w-3 h-3 text-amber-400" />}
                          </div>
                          <div className="mt-1 text-zinc-500">{record.summary?.totalMaterials ?? 0} items</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══ INCOMING ORDERS ═══ */}
            {activeTab === 'incoming-orders' && (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-blue-900/20 to-cyan-900/20 border border-blue-500/20 rounded-xl p-5">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2"><Truck className="w-5 h-5 text-blue-400" /> Purchase Order Tracker</h2>
                  <p className="text-zinc-400 text-sm mt-1">Full PO lifecycle — Create → MD Approval → Order → Receive → Invoice</p>
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <span className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm">{incomingOrders.filter(o => o.status === 'pending_md_approval').length} Pending Approval</span>
                    <span className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm">{incomingOrders.filter(o => o.status === 'approved').length} Approved</span>
                    <span className="px-3 py-1.5 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 text-sm">{incomingOrders.filter(o => o.status === 'ordered').length} Ordered</span>
                    <span className="px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-sm">{incomingOrders.filter(o => o.status === 'partially_received').length} Partial</span>
                    {incomingOrders.filter(o => o.status === 'rejected').length > 0 && (
                      <span className="px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm">{incomingOrders.filter(o => o.status === 'rejected').length} Rejected</span>
                    )}
                  </div>
                </div>

                {/* PO Lifecycle Steps */}
                <div className="flex items-center gap-1 px-2 py-3 bg-zinc-800/30 rounded-xl border border-zinc-800 overflow-x-auto">
                  {['Create PO', 'MD Approval', 'Approved', 'Ordered', 'Receive (GRN)', 'Invoice'].map((label, i) => (
                    <React.Fragment key={label}>
                      {i > 0 && <div className="w-6 h-0.5 bg-zinc-700 flex-shrink-0" />}
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800/50 border border-zinc-700/50 flex-shrink-0">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          i === 0 ? 'bg-rose-500/20 text-rose-400' : i === 1 ? 'bg-amber-500/20 text-amber-400' : i === 2 ? 'bg-emerald-500/20 text-emerald-400' :
                          i === 3 ? 'bg-blue-500/20 text-blue-400' : i === 4 ? 'bg-cyan-500/20 text-cyan-400' : 'bg-indigo-500/20 text-indigo-400'
                        }`}>{i + 1}</div>
                        <span className="text-zinc-400 text-xs whitespace-nowrap">{label}</span>
                      </div>
                    </React.Fragment>
                  ))}
                </div>

                {incomingOrders.length === 0 ? (
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-12 text-center">
                    <Truck className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                    <p className="text-zinc-400">No purchase orders yet</p>
                    <button onClick={() => setShowCreatePO(true)} className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm">Create First PO</button>
                  </div>
                ) : (
                  <div className="grid gap-3">{incomingOrders.map(order => {
                    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
                      pending_md_approval: { bg: 'bg-amber-500/20 border-amber-500/30', text: 'text-amber-400', label: 'PENDING MD APPROVAL' },
                      approved: { bg: 'bg-emerald-500/20 border-emerald-500/30', text: 'text-emerald-400', label: 'MD APPROVED' },
                      rejected: { bg: 'bg-red-500/20 border-red-500/30', text: 'text-red-400', label: 'REJECTED' },
                      ordered: { bg: 'bg-blue-500/20 border-blue-500/30', text: 'text-blue-400', label: 'ORDERED' },
                      partially_received: { bg: 'bg-cyan-500/20 border-cyan-500/30', text: 'text-cyan-400', label: 'PARTIALLY RECEIVED' },
                      received: { bg: 'bg-emerald-500/20 border-emerald-500/30', text: 'text-emerald-400', label: 'FULLY RECEIVED' },
                    };
                    const sc = statusConfig[order.status] || statusConfig.ordered;
                    const totalReceived = (order.items || []).reduce((s, i) => s + (i.receivedQty || 0), 0);
                    const totalOrdered = (order.items || []).reduce((s, i) => s + i.quantity, 0);
                    const receivePercent = totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0;

                    return (
                      <div key={order.id} className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-colors">
                        {/* Header */}
                        <div className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold">PO</div>
                              <div>
                                <span className="text-white font-semibold">{order.poNumber || order.id}</span>
                                <span className="ml-2 text-zinc-400 text-sm">{order.vendorName || 'Unknown Vendor'}</span>
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {(order as any).source === 'Store' && <span className="ml-2 px-1.5 py-0.5 bg-rose-500/10 border border-rose-500/20 rounded text-rose-400 text-[10px]">FROM STORE</span>}
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {(order as any).source?.startsWith('Employee') && <span className="ml-2 px-1.5 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded text-purple-400 text-[10px] flex items-center gap-0.5"><User className="w-2.5 h-2.5" /> {(order as any).createdByName || 'Employee'}</span>}
                              </div>
                            </div>
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${sc.bg} ${sc.text}`}>{sc.label}</span>
                          </div>

                          {/* Items summary */}
                          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                            <span className="text-zinc-500">{(order.items || []).length} items</span>
                            <span className="text-white font-medium">{formatCurrency(order.totalAmount || 0)}</span>
                            {order.expectedDelivery && <span className="text-zinc-500 flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(order.expectedDelivery).toLocaleDateString('en-IN')}</span>}
                            <span className="text-zinc-500">{new Date(order.createdAt).toLocaleDateString('en-IN')}</span>
                            {order.paymentTerms && <span className="text-zinc-600 text-xs">{order.paymentTerms}</span>}
                          </div>

                          {/* Receive progress bar */}
                          {(order.status === 'ordered' || order.status === 'partially_received') && (
                            <div className="mt-3">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-zinc-500">Received: {totalReceived} / {totalOrdered} units</span>
                                <span className="text-cyan-400 font-medium">{receivePercent}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all" style={{ width: `${receivePercent}%` }} />
                              </div>
                            </div>
                          )}

                          {/* Item details (collapsed) */}
                          <div className="mt-3 space-y-1">
                            {(order.items || []).slice(0, 3).map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs px-2 py-1.5 bg-zinc-800/30 rounded-lg">
                                <span className="text-zinc-300">{item.materialName}</span>
                                <div className="flex items-center gap-3">
                                  <span className="text-zinc-500">{item.quantity} {item.unit}</span>
                                  {(item.receivedQty || 0) > 0 && <span className="text-cyan-400">recv: {item.receivedQty}</span>}
                                  <span className="text-zinc-400">₹{(item.unitPrice * item.quantity).toFixed(0)}</span>
                                </div>
                              </div>
                            ))}
                            {(order.items || []).length > 3 && <div className="text-xs text-zinc-600 text-center">+{(order.items || []).length - 3} more items</div>}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="border-t border-zinc-800 px-4 py-2.5 flex items-center gap-2 bg-zinc-800/20">
                          {order.status === 'approved' && (
                            <button onClick={async () => {
                              try {
                                await updateDoc(doc(db, COLLECTIONS.PURCHASE_ORDERS, order.id), {
                                  status: 'ordered', orderedAt: new Date().toISOString(), orderedBy: userName, updatedAt: new Date().toISOString()
                                });
                                showToast(`${order.poNumber} marked as Ordered`, 'success');
                                logAudit('PURCHASE', 'Stock', 'Mark Ordered', `${order.poNumber} sent to vendor`);
                              } catch { showToast('Failed to update', 'error'); }
                            }} className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg text-blue-400 text-xs flex items-center gap-1.5">
                              <Send className="w-3 h-3" /> Mark as Ordered
                            </button>
                          )}
                          {(order.status === 'ordered' || order.status === 'partially_received') && (
                            <button onClick={() => setShowReceivePO(true)}
                              className="px-3 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 rounded-lg text-cyan-400 text-xs flex items-center gap-1.5">
                              <ArrowDownToLine className="w-3 h-3" /> Receive Items
                            </button>
                          )}
                          {order.status === 'pending_md_approval' && (
                            <span className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400/70 text-xs flex items-center gap-1.5">
                              <Clock className="w-3 h-3" /> Awaiting MD approval...
                            </span>
                          )}
                          {order.status === 'rejected' && (
                            <span className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400/70 text-xs flex items-center gap-1.5">
                              <AlertTriangle className="w-3 h-3" /> Rejected — contact Purchase team
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}</div>
                )}
              </div>
            )}

            {/* ═══ MATERIAL REQUESTS FROM EMPLOYEES ═══ */}
            {activeTab === 'material-requests' && (
              <div className="space-y-4">
                {/* Header with workflow steps */}
                <div className="bg-gradient-to-r from-amber-900/20 to-orange-900/20 border border-amber-500/20 rounded-xl p-5">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2"><Inbox className="w-5 h-5 text-amber-400" /> Material Requests — Store Fulfillment</h2>
                  <p className="text-zinc-400 text-sm mt-1">Employees request materials → Store approves → Stock auto-deducted → Manager notified</p>
                  
                  {/* Workflow steps */}
                  <div className="flex items-center gap-1 mt-3 text-[10px]">
                    <span className="px-2.5 py-1 bg-amber-500/20 border border-amber-500/30 rounded text-amber-400 font-medium">① Employee Submits</span>
                    <span className="text-zinc-600">→</span>
                    <span className="px-2.5 py-1 bg-blue-500/20 border border-blue-500/30 rounded text-blue-400 font-medium">② Store Reviews</span>
                    <span className="text-zinc-600">→</span>
                    <span className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded text-emerald-400 font-medium">③ Approve & Issue</span>
                    <span className="text-zinc-600">→</span>
                    <span className="px-2.5 py-1 bg-green-500/20 border border-green-500/30 rounded text-green-400 font-medium">④ Stock Deducted ✓</span>
                    <span className="text-zinc-600">→</span>
                    <span className="px-2.5 py-1 bg-purple-500/20 border border-purple-500/30 rounded text-purple-400 font-medium">⑤ Manager Notified</span>
                  </div>

                  {/* Status counters */}
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <span className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm font-medium">
                      {materialRequests.filter((r: { status: string }) => r.status === 'sent_to_store' || r.status === 'draft').length} Pending Action
                    </span>
                    <span className="px-3 py-1.5 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 text-sm">
                      {materialRequests.filter((r: { status: string }) => r.status === 'processing').length} Processing
                    </span>
                    <span className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm">
                      {materialRequests.filter((r: { status: string }) => r.status === 'fulfilled').length} Fulfilled
                    </span>
                    <span className="px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
                      {materialRequests.filter((r: { status: string }) => r.status === 'rejected').length} Rejected
                    </span>
                    <span className="px-3 py-1.5 rounded-lg bg-zinc-500/20 border border-zinc-500/30 text-zinc-400 text-sm">
                      {materialRequests.length} Total
                    </span>
                  </div>
                </div>

                {materialRequests.length === 0 ? (
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-12 text-center">
                    <Inbox className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                    <p className="text-zinc-400">No material requests yet</p>
                    <p className="text-zinc-600 text-sm mt-1">Employees can submit material requests from their dashboard</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {materialRequests.map((req: {
                      id: string; requestNumber?: string; requestedBy?: string; department?: string;
                      date?: string; materialRequiredTime?: string; status: string; totalItems?: number;
                      createdAt?: string; instructions?: string; fulfilledBy?: string;
                      items?: { sno: number; materialName: string; quantity: number; uom: string; patternMould?: string; projectName?: string; takenBy?: string; remarks?: string }[];
                    }) => {
                      const statusConfig: Record<string, { bg: string; text: string; label: string; borderColor: string }> = {
                        sent_to_store: { bg: 'bg-amber-500/20 border-amber-500/30', text: 'text-amber-400', label: 'AWAITING STORE', borderColor: 'border-l-amber-500' },
                        draft: { bg: 'bg-orange-500/20 border-orange-500/30', text: 'text-orange-400', label: 'DRAFT — NEEDS APPROVAL', borderColor: 'border-l-orange-500' },
                        processing: { bg: 'bg-blue-500/20 border-blue-500/30', text: 'text-blue-400', label: 'PROCESSING', borderColor: 'border-l-blue-500' },
                        fulfilled: { bg: 'bg-emerald-500/20 border-emerald-500/30', text: 'text-emerald-400', label: 'FULFILLED ✓', borderColor: 'border-l-emerald-500' },
                        rejected: { bg: 'bg-red-500/20 border-red-500/30', text: 'text-red-400', label: 'REJECTED', borderColor: 'border-l-red-500' },
                      };
                      const sc = statusConfig[req.status] || statusConfig.sent_to_store;

                      // Helper function for stock deduction + fulfillment
                      const handleFulfill = async () => {
                        try {
                          // 1. Update status
                          await updateDoc(doc(db, 'material_requests', req.id), {
                            status: 'fulfilled',
                            updatedAt: new Date().toISOString(),
                            fulfilledBy: userName,
                            fulfilledAt: new Date().toISOString()
                          });

                          // 2. AUTO STOCK DEDUCTION
                          setStockItems(prev => {
                            const updated = [...prev];
                            for (const item of (req.items || [])) {
                              const idx = updated.findIndex(s =>
                                s.materialName.toLowerCase() === item.materialName.toLowerCase()
                              );
                              if (idx >= 0) {
                                const stockItem = { ...updated[idx], lastModified: new Date().toISOString() };
                                const proj = (item.projectName || '').toLowerCase();
                                if (proj.includes('r&d') || proj.includes('rnd')) {
                                  stockItem.rdUsage = (stockItem.rdUsage || 0) + item.quantity;
                                } else if (proj.includes('maintenance') || proj.includes('internal')) {
                                  stockItem.internalUsage = (stockItem.internalUsage || 0) + item.quantity;
                                } else if (proj.includes('new factory')) {
                                  stockItem.newFactoryUsage = (stockItem.newFactoryUsage || 0) + item.quantity;
                                } else {
                                  const projectKey = item.projectName || req.department || 'General';
                                  stockItem.projects = { ...stockItem.projects, [projectKey]: (stockItem.projects[projectKey] || 0) + item.quantity };
                                }
                                updated[idx] = stockItem;
                              }
                            }
                            return updated;
                          });

                          // 3. Log stock movements
                          for (const item of (req.items || [])) {
                            try {
                              await addDoc(collection(db, 'stock_movements'), {
                                type: 'issue',
                                materialName: item.materialName,
                                quantity: item.quantity,
                                unit: item.uom,
                                department: req.department || 'General',
                                project: item.projectName || 'General',
                                issuedTo: item.takenBy || req.requestedBy,
                                referenceNo: req.requestNumber,
                                referenceType: 'material_request',
                                date: new Date().toISOString(),
                                performedBy: userName,
                              });
                            } catch { /* non-critical */ }
                          }

                          // 4. Notify managers (Mani & Praveen)
                          try {
                            await addDoc(collection(db, 'notifications'), {
                              type: 'material_request_fulfilled',
                              title: 'Material Request Fulfilled',
                              message: `MRF ${req.requestNumber} — ${(req.items || []).length} items issued to ${req.requestedBy} (${req.department})`,
                              documentType: 'material_request',
                              documentId: req.id,
                              forRole: ['md', 'admin', 'manager'],
                              forUser: ['Mani Kumar', 'Praveen'],
                              priority: 'medium',
                              read: false,
                              createdAt: new Date().toISOString(),
                              createdBy: userName,
                            });
                          } catch { /* non-critical */ }

                          // 5. Notify requesting employee
                          try {
                            await addDoc(collection(db, 'notifications'), {
                              type: 'material_request_fulfilled',
                              title: 'Your Material Request is Ready',
                              message: `MRF ${req.requestNumber} fulfilled by Store. Please collect materials.`,
                              documentType: 'material_request',
                              documentId: req.id,
                              forUser: [req.requestedBy],
                              forRole: ['employee'],
                              priority: 'high',
                              read: false,
                              createdAt: new Date().toISOString(),
                              createdBy: userName,
                            });
                          } catch { /* non-critical */ }

                          showToast(`✅ ${req.requestNumber} fulfilled! Stock auto-deducted for ${(req.items || []).length} item(s)`, 'success');
                          logAudit('ISSUE', 'Store', 'Material Request Fulfilled', `${req.requestNumber} — ${(req.items || []).length} items given to ${req.requestedBy}, stock auto-deducted`);
                          addLiveActivity('MRF Fulfilled', `${req.requestNumber} — ${(req.items || []).length} items to ${req.requestedBy}`, 'issue');
                        } catch { showToast('Failed to fulfill request', 'error'); }
                      };

                      // Print handler
                      const handlePrint = () => {
                        const printWindow = window.open('', '_blank', 'width=1100,height=800');
                        if (!printWindow) { alert('Please allow popups'); return; }
                        const statusLabel = req.status === 'fulfilled' ? 'FULFILLED' : req.status === 'processing' ? 'PROCESSING' : req.status === 'rejected' ? 'REJECTED' : 'PENDING';
                        const statusColor = req.status === 'fulfilled' ? '#16a34a' : req.status === 'processing' ? '#2563eb' : req.status === 'rejected' ? '#dc2626' : '#d97706';
                        printWindow.document.write(`<!DOCTYPE html><html><head><title>MRF - ${req.requestNumber || ''}</title>
                        <style>
                          @page { size: A4 landscape; margin: 10mm; }
                          * { margin: 0; padding: 0; box-sizing: border-box; }
                          body { font-family: Arial, sans-serif; font-size: 11px; color: #000; }
                          .form-container { width: 100%; border: 2px solid #333; }
                          .header { display: flex; border-bottom: 2px solid #333; }
                          .header-logo { width: 180px; padding: 8px 12px; border-right: 1px solid #333; display: flex; align-items: center; }
                          .header-logo img { max-width: 150px; }
                          .header-title { flex: 1; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: bold; padding: 8px; }
                          .header-info { width: 220px; border-left: 1px solid #333; }
                          .header-info-row { display: flex; border-bottom: 1px solid #ccc; padding: 3px 6px; font-size: 10px; }
                          .header-info-row:last-child { border-bottom: none; }
                          .sub-header { display: flex; border-bottom: 2px solid #333; background: #f5f5f5; }
                          .sub-header-cell { padding: 5px 8px; border-right: 1px solid #333; font-size: 10px; }
                          .sub-header-cell:last-child { border-right: none; }
                          table { width: 100%; border-collapse: collapse; }
                          th { background: #e8e8e8; font-size: 10px; font-weight: bold; padding: 6px 4px; border: 1px solid #333; text-align: center; }
                          td { padding: 5px 4px; border: 1px solid #999; text-align: center; font-size: 10px; }
                          td.left { text-align: left; padding-left: 6px; }
                          .empty td { height: 24px; }
                          .footer { display: flex; border-top: 2px solid #333; min-height: 60px; }
                          .footer-cell { flex: 1; padding: 8px; text-align: center; border-right: 1px solid #333; display: flex; flex-direction: column; justify-content: flex-end; }
                          .footer-cell:last-child { border-right: none; }
                          .footer-label { font-weight: bold; font-size: 10px; border-top: 1px solid #333; padding-top: 4px; margin-top: 30px; }
                          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
                        </style></head><body>
                        <div class="form-container">
                          <div class="header">
                            <div class="header-logo"><img src="/Tlogo.png" alt="TrioVision" style="max-width:160px;max-height:50px;object-fit:contain" /></div>
                            <div class="header-title">STORE MATERIAL REQUEST FORM</div>
                            <div class="header-info">
                              <div class="header-info-row"><span style="font-weight:bold;width:60px">Doc No:</span><span style="flex:1;text-align:right">TRIO-F/STE/MRF-01</span></div>
                              <div class="header-info-row"><span style="font-weight:bold;width:60px">Rev:</span><span style="flex:1;text-align:right">2</span></div>
                              <div class="header-info-row"><span style="font-weight:bold;width:60px">MRF No:</span><span style="flex:1;text-align:right">${req.requestNumber || ''}</span></div>
                              <div class="header-info-row"><span style="font-weight:bold;width:60px">Status:</span><span style="flex:1;text-align:right;color:${statusColor};font-weight:bold">${statusLabel}</span></div>
                            </div>
                          </div>
                          <div class="sub-header">
                            <div class="sub-header-cell" style="width:25%"><b>DATE:</b> ${req.date ? new Date(req.date).toLocaleDateString('en-IN') : ''}</div>
                            <div class="sub-header-cell" style="width:20%"><b>REQUESTOR:</b> ${req.requestedBy || ''}</div>
                            <div class="sub-header-cell" style="width:25%"><b>DEPARTMENT:</b> ${req.department || ''}</div>
                            <div class="sub-header-cell" style="width:30%"><b>REQUIRED TIME:</b> ${req.materialRequiredTime || ''}</div>
                          </div>
                          <table><thead><tr>
                            <th style="width:40px">S.NO</th><th>MATERIAL NAME</th><th style="width:70px">QTY</th><th style="width:50px">UOM</th>
                            <th style="width:100px">PATTERN/MOULD</th><th>PROJECT</th><th style="width:90px">TAKEN BY</th><th style="width:90px">REMARKS</th>
                          </tr></thead><tbody>
                          ${(req.items || []).map((item: { sno?: number; materialName: string; quantity: number; uom: string; patternMould?: string; projectName?: string; takenBy?: string; remarks?: string }, idx: number) => {
                            return '<tr><td>' + (item.sno || idx + 1) + '</td><td class="left">' + item.materialName + '</td><td>' + item.quantity + '</td><td>' + item.uom + '</td><td>' + (item.patternMould || '') + '</td><td>' + (item.projectName || '') + '</td><td>' + (item.takenBy || '') + '</td><td>' + (item.remarks || '') + '</td></tr>';
                          }).join('')}
                          ${Array.from({ length: Math.max(0, 12 - (req.items || []).length) }).map(() => '<tr class="empty"><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>').join('')}
                          </tbody></table>
                          ${req.instructions ? '<div style="border-top:2px solid #333;padding:6px 8px;min-height:40px"><b style="font-size:10px">Instructions:</b> <span style="font-size:10px">' + req.instructions + '</span></div>' : ''}
                          <div class="footer">
                            <div class="footer-cell"><div style="font-size:9px;color:#666">${req.requestedBy || ''}</div><div class="footer-label">SIGNATURE OF REQUESTOR</div></div>
                            <div class="footer-cell"><div style="font-size:9px;color:#666">${req.status === 'fulfilled' ? (req.fulfilledBy || userName) : ''}</div><div class="footer-label">STORE APPROVAL</div></div>
                            <div class="footer-cell"><div class="footer-label">HOD / MANAGER</div></div>
                            <div class="footer-cell" style="border-right:none"><div class="footer-label">PLANT MANAGER</div></div>
                          </div>
                          <div style="text-align:right;padding:4px 8px;font-size:9px;color:#999">
                            Ref: ${req.requestNumber || ''} · Status: ${statusLabel} · Printed: ${new Date().toLocaleString('en-IN')}
                          </div>
                        </div>
                        <script>window.onload=function(){setTimeout(function(){window.print()},300)}</script>
                        </body></html>`);
                        printWindow.document.close();
                      };

                      return (
                        <div key={req.id} className={`bg-zinc-900/50 border border-zinc-800 border-l-4 ${sc.borderColor} rounded-xl overflow-hidden hover:border-zinc-700 transition-colors`}>
                          <div className="p-4">
                            {/* Header row */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg ${req.status === 'fulfilled' ? 'bg-emerald-600/15 border-emerald-500/30' : req.status === 'rejected' ? 'bg-red-600/15 border-red-500/30' : 'bg-amber-600/15 border-amber-500/30'} border flex items-center justify-center text-xs font-bold ${req.status === 'fulfilled' ? 'text-emerald-400' : req.status === 'rejected' ? 'text-red-400' : 'text-amber-400'}`}>MRF</div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-white font-bold text-sm">{req.requestNumber || req.id.slice(0, 8)}</span>
                                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${sc.bg} ${sc.text}`}>{sc.label}</span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-400">
                                    <span className="flex items-center gap-1"><User className="w-3 h-3" /> {req.requestedBy || 'Unknown'}</span>
                                    {req.department && <span className="px-1.5 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded text-purple-400 text-[10px]">{req.department}</span>}
                                    {req.date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(req.date).toLocaleDateString('en-IN')}</span>}
                                    {req.materialRequiredTime && <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-orange-400" /> Need by: {req.materialRequiredTime}</span>}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Items table-like display */}
                            <div className="mt-3 bg-zinc-800/40 rounded-lg overflow-hidden border border-zinc-700/30">
                              <div className="grid grid-cols-[30px_1fr_80px_60px_100px_90px] gap-0 bg-zinc-800/60 text-[10px] font-semibold text-zinc-400 uppercase">
                                <div className="px-2 py-1.5 text-center border-r border-zinc-700/30">#</div>
                                <div className="px-2 py-1.5 border-r border-zinc-700/30">Material</div>
                                <div className="px-2 py-1.5 text-center border-r border-zinc-700/30">Qty</div>
                                <div className="px-2 py-1.5 text-center border-r border-zinc-700/30">UOM</div>
                                <div className="px-2 py-1.5 text-center border-r border-zinc-700/30">Project</div>
                                <div className="px-2 py-1.5 text-center">Taken By</div>
                              </div>
                              {(req.items || []).map((item, idx) => {
                                // Check if this item exists in store stock
                                const matchedStock = stockItems.find(s => s.materialName.toLowerCase() === item.materialName.toLowerCase());
                                const closingStock = matchedStock ? calculateClosingStock(matchedStock) : 0;
                                const hasStock = matchedStock && closingStock >= item.quantity;
                                return (
                                  <div key={idx} className="grid grid-cols-[30px_1fr_80px_60px_100px_90px] gap-0 border-t border-zinc-700/20 hover:bg-zinc-800/20">
                                    <div className="px-2 py-2 text-center text-zinc-500 text-xs border-r border-zinc-700/20">{item.sno || idx + 1}</div>
                                    <div className="px-2 py-2 text-white text-xs border-r border-zinc-700/20 flex items-center gap-2">
                                      {item.materialName}
                                      {matchedStock ? (
                                        <span className={`px-1 py-0.5 rounded text-[9px] font-medium ${hasStock ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                                          Stock: {closingStock.toFixed(1)}
                                        </span>
                                      ) : (
                                        <span className="px-1 py-0.5 rounded text-[9px] bg-yellow-500/15 text-yellow-400">Not in store</span>
                                      )}
                                    </div>
                                    <div className="px-2 py-2 text-center text-white text-xs font-medium border-r border-zinc-700/20">{item.quantity}</div>
                                    <div className="px-2 py-2 text-center text-zinc-400 text-xs border-r border-zinc-700/20">{item.uom}</div>
                                    <div className="px-2 py-2 text-center text-zinc-400 text-xs border-r border-zinc-700/20">{item.projectName || '—'}</div>
                                    <div className="px-2 py-2 text-center text-zinc-500 text-xs">{item.takenBy || '—'}</div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Instructions and meta */}
                            {req.instructions && (
                              <div className="mt-2 text-xs text-zinc-500 bg-zinc-800/20 rounded-lg px-3 py-2 flex items-start gap-2">
                                <FileText className="w-3 h-3 mt-0.5 flex-shrink-0" /> {req.instructions}
                              </div>
                            )}
                            <div className="mt-2 flex items-center gap-3 text-[10px] text-zinc-600">
                              <span>{(req.items || []).length} item(s)</span>
                              {req.createdAt && <span>Submitted: {new Date(req.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</span>}
                            </div>
                          </div>

                          {/* Action bar — visible for ALL statuses */}
                          <div className="border-t border-zinc-800 px-4 py-3 flex items-center gap-2 bg-zinc-800/30">
                            {/* DRAFT or SENT: Show Accept + Direct Approve + Reject */}
                            {(req.status === 'draft' || req.status === 'sent_to_store') && (
                              <>
                                <button onClick={async () => {
                                  try {
                                    await updateDoc(doc(db, 'material_requests', req.id), { status: 'processing', updatedAt: new Date().toISOString(), processedBy: userName });
                                    showToast(`${req.requestNumber} accepted — now Processing`, 'success');
                                  } catch { showToast('Failed to update', 'error'); }
                                }} className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg text-blue-400 text-xs font-medium flex items-center gap-1.5 transition-colors">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Accept & Process
                                </button>
                                <button onClick={async () => {
                                  if (!confirm(`Approve & issue all items in ${req.requestNumber}? Stock will be auto-deducted.`)) return;
                                  await handleFulfill();
                                }} className="px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs font-medium flex items-center gap-1.5 transition-colors">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Approve & Issue Material
                                </button>
                                <button onClick={async () => {
                                  if (!confirm(`Reject request ${req.requestNumber}?`)) return;
                                  try {
                                    await updateDoc(doc(db, 'material_requests', req.id), { status: 'rejected', updatedAt: new Date().toISOString(), rejectedBy: userName });
                                    showToast(`${req.requestNumber} rejected`, 'warning');
                                  } catch { showToast('Failed to update', 'error'); }
                                }} className="px-3 py-2 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 rounded-lg text-red-400 text-xs flex items-center gap-1.5 transition-colors">
                                  <X className="w-3.5 h-3.5" /> Reject
                                </button>
                                <button onClick={handlePrint} className="px-3 py-2 bg-zinc-700/30 hover:bg-zinc-700/50 border border-zinc-600/30 rounded-lg text-zinc-300 text-xs flex items-center gap-1.5 ml-auto transition-colors">
                                  <Printer className="w-3.5 h-3.5" /> Print
                                </button>
                              </>
                            )}

                            {/* PROCESSING: Show Fulfill + Print */}
                            {req.status === 'processing' && (
                              <>
                                <button onClick={async () => {
                                  if (!confirm(`Fulfill ${req.requestNumber}? Stock will be auto-deducted for all items.`)) return;
                                  await handleFulfill();
                                }} className="px-4 py-2 bg-gradient-to-r from-emerald-600/30 to-green-600/30 hover:from-emerald-600/40 hover:to-green-600/40 border border-emerald-500/40 rounded-lg text-emerald-400 text-xs font-medium flex items-center gap-1.5 shadow-sm shadow-emerald-500/10 transition-colors">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Fulfill & Deduct Stock
                                </button>
                                <button onClick={async () => {
                                  if (!confirm(`Reject request ${req.requestNumber}?`)) return;
                                  try {
                                    await updateDoc(doc(db, 'material_requests', req.id), { status: 'rejected', updatedAt: new Date().toISOString(), rejectedBy: userName });
                                    showToast(`${req.requestNumber} rejected`, 'warning');
                                  } catch { showToast('Failed to update', 'error'); }
                                }} className="px-3 py-2 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 rounded-lg text-red-400 text-xs flex items-center gap-1.5 transition-colors">
                                  <X className="w-3.5 h-3.5" /> Reject
                                </button>
                                <button onClick={handlePrint} className="px-3 py-2 bg-zinc-700/30 hover:bg-zinc-700/50 border border-zinc-600/30 rounded-lg text-zinc-300 text-xs flex items-center gap-1.5 ml-auto transition-colors">
                                  <Printer className="w-3.5 h-3.5" /> Print
                                </button>
                              </>
                            )}

                            {/* FULFILLED: Show completion info + Print */}
                            {req.status === 'fulfilled' && (
                              <>
                                <span className="px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400/80 text-xs flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Completed — Stock Deducted — Manager Notified
                                </span>
                                <button onClick={handlePrint} className="px-3 py-2 bg-zinc-700/30 hover:bg-zinc-700/50 border border-zinc-600/30 rounded-lg text-zinc-300 text-xs flex items-center gap-1.5 ml-auto transition-colors">
                                  <Printer className="w-3.5 h-3.5" /> Print Soft Copy
                                </button>
                              </>
                            )}

                            {/* REJECTED: Show info + Print */}
                            {req.status === 'rejected' && (
                              <>
                                <span className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400/70 text-xs flex items-center gap-1.5">
                                  <AlertTriangle className="w-3.5 h-3.5" /> Rejected
                                </span>
                                <button onClick={handlePrint} className="px-3 py-2 bg-zinc-700/30 hover:bg-zinc-700/50 border border-zinc-600/30 rounded-lg text-zinc-300 text-xs flex items-center gap-1.5 ml-auto transition-colors">
                                  <Printer className="w-3.5 h-3.5" /> Print
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ═══ ITEM MASTER ═══ */}
            {activeTab === 'materials' && (
              <div className="space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input type="text" placeholder="Search by name, code, or storage area..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-zinc-900/50 border border-zinc-800 rounded-xl text-sm text-white placeholder:text-zinc-500 outline-none focus:border-blue-500/50" />
                  </div>
                  <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="px-3 py-2.5 bg-zinc-900/50 border border-zinc-800 rounded-xl text-sm text-white outline-none">
                    <option value="all">All Categories</option>
                    {Object.keys(categoryColors).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select value={storageFilter} onChange={e => setStorageFilter(e.target.value)} className="px-3 py-2.5 bg-zinc-900/50 border border-zinc-800 rounded-xl text-sm text-white outline-none">
                    <option value="all">All Storage Areas</option>
                    {storageAreas.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                  <div className="flex items-center gap-2">
                    <button onClick={() => exportToExcel('materials')} className="px-3 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm flex items-center gap-2">
                      <Download className="w-4 h-4" /> Export
                    </button>
                    <button onClick={() => setShowAddMaterial(true)} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-white text-sm font-medium flex items-center gap-2">
                      <Plus className="w-4 h-4" /> Add Item
                    </button>
                  </div>
                </div>
                <div className="text-xs text-zinc-500 px-1">Showing {filteredMaterials.length} of {stockItems.length} items</div>

                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto max-h-[65vh] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-zinc-800/90 border-b border-zinc-700">
                          <th className="text-left px-3 py-3 text-zinc-400 font-medium text-xs">S.No</th>
                          <th className="text-left px-3 py-3 text-zinc-400 font-medium text-xs">Material Name</th>
                          <th className="text-left px-3 py-3 text-zinc-400 font-medium text-xs">Category</th>
                          <th className="text-left px-3 py-3 text-zinc-400 font-medium text-xs">UOM</th>
                          <th className="text-left px-3 py-3 text-zinc-400 font-medium text-xs">Storage Area</th>
                          <th className="text-right px-3 py-3 text-zinc-400 font-medium text-xs">Stock</th>
                          <th className="text-center px-3 py-3 text-zinc-400 font-medium text-xs">Status</th>
                          <th className="text-center px-3 py-3 text-zinc-400 font-medium text-xs">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/50">
                        {filteredMaterials.map(item => {
                          const closing = calculateClosingStock(item);
                          const isOut = closing <= 0;
                          const isLow = closing > 0 && closing <= (item.minStock || 0);
                          return (
                            <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors">
                              <td className="px-3 py-2.5 text-zinc-500 text-xs">{item.sno}</td>
                              <td className="px-3 py-2.5">
                                <div className="text-white text-sm max-w-[280px]" title={item.materialName}>{item.materialName}</div>
                                <div className="text-zinc-600 text-xs font-mono">{item.code}</div>
                              </td>
                              <td className="px-3 py-2.5">
                                <span className={`px-2 py-0.5 rounded text-xs border ${categoryColors[item.category] || 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>{item.category}</span>
                              </td>
                              <td className="px-3 py-2.5 text-zinc-400 text-xs">{item.uom}</td>
                              <td className="px-3 py-2.5 font-mono text-xs text-cyan-400/80">{item.storageArea || '-'}</td>
                              <td className="text-right px-3 py-2.5 font-semibold text-white">{closing}</td>
                              <td className="text-center px-3 py-2.5">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isOut ? 'bg-red-500/20 text-red-400' : isLow ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                  {isOut ? 'OUT' : isLow ? 'LOW' : 'OK'}
                                </span>
                              </td>
                              <td className="text-center px-3 py-2.5 flex items-center justify-center gap-1">
                                <button onClick={() => setEditingItem(item)} className="p-1.5 rounded-lg hover:bg-blue-500/20 text-zinc-500 hover:text-blue-400 transition-colors">
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => deleteMaterial(item.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-colors">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {filteredMaterials.length === 0 && <div className="p-8 text-center text-zinc-500">No items match your filters</div>}
                </div>
              </div>
            )}

            {/* ═══ SUPPLIERS ═══ */}
            {activeTab === 'suppliers' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2"><Building2 className="w-5 h-5 text-teal-400" /> Supplier Master</h2>
                  <div className="flex items-center gap-2">
                    <button onClick={() => exportToExcel('suppliers')} className="px-3 py-2 bg-emerald-600/20 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm flex items-center gap-2"><Download className="w-4 h-4" /> Export</button>
                    <button onClick={() => setShowAddSupplier(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-white text-sm font-medium flex items-center gap-2"><Plus className="w-4 h-4" /> Add Supplier</button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {suppliers.map(sup => (
                    <div key={sup.id} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors">
                      <div className="flex items-start justify-between">
                        <div><h3 className="font-semibold text-white">{sup.name}</h3><p className="text-zinc-400 text-sm mt-1">{sup.contact}</p></div>
                        <div className="p-2 rounded-lg bg-teal-500/10"><Building2 className="w-4 h-4 text-teal-400" /></div>
                      </div>
                      <div className="mt-3 space-y-1 text-xs text-zinc-500">
                        <p>📧 {sup.email}</p><p>📞 {sup.phone}</p><p>📍 {sup.city}</p>
                        <p className="font-mono text-zinc-600">GST: {sup.gst}</p>
                      </div>
                      <div className="mt-3 pt-3 border-t border-zinc-800 text-xs text-zinc-400">
                        {stockItems.filter(s => s.supplierName === sup.name).length} items supplied
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ═══ STORAGE MAP ═══ */}
            {activeTab === 'storage-map' && (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-pink-900/20 to-purple-900/20 border border-pink-500/20 rounded-xl p-5">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2"><MapPin className="w-5 h-5 text-pink-400" /> Storage Area Map</h2>
                  <p className="text-zinc-400 text-sm mt-1">{storageAreas.length} storage locations • {stockItems.length} total materials</p>
                </div>

                {/* Area Summary */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {Object.entries(storageAreaStats).sort((a, b) => b[1].count - a[1].count).slice(0, 4).map(([area, data]) => (
                    <div key={area} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                      <p className="font-mono text-sm text-cyan-400">{area}</p>
                      <p className="text-2xl font-bold text-white mt-1">{data.count}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-emerald-400">{data.withStock} in stock</span>
                        {data.outOfStock > 0 && <span className="text-xs text-red-400">{data.outOfStock} out</span>}
                      </div>
                      <div className="mt-2 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(data.withStock / data.count) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Expandable Area List */}
                <div className="space-y-2">
                  {Object.entries(storageAreaStats).sort((a, b) => a[0].localeCompare(b[0])).map(([area, data]) => (
                    <div key={area} className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
                      <button onClick={() => setExpandedStorageArea(expandedStorageArea === area ? null : area)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <MapPin className="w-4 h-4 text-cyan-400" />
                          <span className="font-mono text-sm text-white">{area}</span>
                          <span className="text-xs text-zinc-500">{data.count} items</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-emerald-400">{data.withStock} OK</span>
                          {data.outOfStock > 0 && <span className="text-xs text-red-400">{data.outOfStock} OUT</span>}
                          {expandedStorageArea === area ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                        </div>
                      </button>
                      <AnimatePresence>
                        {expandedStorageArea === area && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="border-t border-zinc-800 px-4 py-2">
                              <table className="w-full text-xs">
                                <thead><tr className="text-zinc-500">
                                  <th className="text-left py-1.5">S.No</th><th className="text-left py-1.5">Material</th><th className="text-left py-1.5">UOM</th>
                                  <th className="text-left py-1.5">Category</th><th className="text-right py-1.5">Qty</th><th className="text-center py-1.5">Status</th>
                                </tr></thead>
                                <tbody className="divide-y divide-zinc-800/30">
                                  {data.items.map(item => {
                                    const c = calculateClosingStock(item);
                                    return (
                                      <tr key={item.id} className="hover:bg-zinc-800/20">
                                        <td className="py-1.5 text-zinc-500">{item.sno}</td>
                                        <td className="py-1.5 text-white">{item.materialName}</td>
                                        <td className="py-1.5 text-zinc-400">{item.uom}</td>
                                        <td className="py-1.5"><span className={`px-1.5 py-0.5 rounded text-[10px] border ${categoryColors[item.category] || 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>{item.category}</span></td>
                                        <td className="py-1.5 text-right font-semibold text-white">{c}</td>
                                        <td className="py-1.5 text-center">
                                          <span className={`w-2 h-2 rounded-full inline-block ${c > 0 ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ═══ EXPIRY ═══ */}
            {activeTab === 'expiry' && (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-red-900/20 to-orange-900/20 border border-red-500/20 rounded-xl p-5">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2"><CalendarClock className="w-5 h-5 text-red-400" /> Expiry Control Panel</h2>
                  <p className="text-zinc-400 text-sm mt-1">Batch expiry monitoring • Block expired material • SOP compliance</p>
                </div>
                <ExpiryControlPanel materials={sopMaterialData} />
              </div>
            )}

            {/* ═══ ANALYTICS ═══ */}
            {activeTab === 'analytics' && (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-violet-900/20 to-purple-900/20 border border-violet-500/20 rounded-xl p-5">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2"><BarChart3 className="w-5 h-5 text-violet-400" /> Store Analytics</h2>
                  <p className="text-zinc-400 text-sm mt-1">{stockItems.length} materials across {storageAreas.length} storage locations</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* By Category */}
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-zinc-300 mb-4">Items by Category</h3>
                    <div className="space-y-3">
                      {Object.keys(categoryColors).map(cat => {
                        const items = stockItems.filter(s => s.category === cat);
                        const pct = stockItems.length > 0 ? (items.length / stockItems.length * 100) : 0;
                        return (
                          <div key={cat} className="flex items-center gap-3">
                            <div className="w-28 text-xs text-zinc-400 truncate">{cat}</div>
                            <div className="flex-1 bg-zinc-800 rounded-full h-2 overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <div className="w-10 text-right text-xs text-zinc-400">{items.length}</div>
                            <div className="w-10 text-right text-xs text-zinc-500">{pct.toFixed(0)}%</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* By Storage Area */}
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-zinc-300 mb-4">Items by Storage Area</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {Object.entries(storageAreaStats).sort((a, b) => b[1].count - a[1].count).map(([area, data]) => (
                        <div key={area} className="flex items-center gap-3">
                          <div className="w-28 text-xs text-cyan-400/70 font-mono truncate" title={area}>{area}</div>
                          <div className="flex-1 bg-zinc-800 rounded-full h-2 overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full" style={{ width: `${(data.count / stockItems.length * 100)}%` }} />
                          </div>
                          <div className="w-8 text-right text-xs text-zinc-400">{data.count}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Stock Health */}
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-zinc-300 mb-4">Stock Health</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'In Stock', value: stats.withStock, total: stats.totalItems, color: 'emerald' },
                        { label: 'Low Stock', value: stats.lowStock, total: stats.totalItems, color: 'amber' },
                        { label: 'Out of Stock', value: stats.outOfStock, total: stats.totalItems, color: 'red' },
                        { label: 'Zero Qty Items', value: stockItems.filter(s => s.openingStock === 0 && s.inword === 0).length, total: stats.totalItems, color: 'zinc' },
                      ].map(h => (
                        <div key={h.label} className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                          <p className={`text-2xl font-bold text-${h.color}-400`}>{h.value}</p>
                          <p className="text-xs text-zinc-400 mt-1">{h.label}</p>
                          <div className="mt-2 h-1 bg-zinc-800 rounded-full">
                            <div className={`h-full bg-${h.color}-500 rounded-full`} style={{ width: `${(h.value / h.total) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* UOM Distribution */}
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-zinc-300 mb-4">UOM Distribution</h3>
                    <div className="space-y-2">
                      {Array.from(new Set(stockItems.map(s => s.uom))).sort().map(uom => {
                        const count = stockItems.filter(s => s.uom === uom).length;
                        return (
                          <div key={uom} className="flex items-center gap-3">
                            <div className="w-12 text-xs text-zinc-400">{uom || '—'}</div>
                            <div className="flex-1 bg-zinc-800 rounded-full h-2 overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" style={{ width: `${(count / stockItems.length * 100)}%` }} />
                            </div>
                            <div className="w-8 text-right text-xs text-zinc-400">{count}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ AUDIT TRAIL ═══ */}
            {activeTab === 'audit' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2"><History className="w-5 h-5 text-zinc-400" /> Audit Trail</h2>
                  <button onClick={() => exportToExcel('audit')} className="px-3 py-2 bg-emerald-600/20 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm flex items-center gap-2"><Download className="w-4 h-4" /> Export</button>
                </div>
                {auditLogs.length === 0 ? (
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-12 text-center">
                    <History className="w-12 h-12 text-zinc-600 mx-auto mb-3" /><p className="text-zinc-400">No audit records yet</p>
                  </div>
                ) : (
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
                    <table className="w-full text-sm"><thead><tr className="bg-zinc-800/70 border-b border-zinc-700">
                      <th className="text-left px-3 py-3 text-zinc-400 font-medium text-xs">Time</th>
                      <th className="text-left px-3 py-3 text-zinc-400 font-medium text-xs">Action</th>
                      <th className="text-left px-3 py-3 text-zinc-400 font-medium text-xs">Entity</th>
                      <th className="text-left px-3 py-3 text-zinc-400 font-medium text-xs">Details</th>
                      <th className="text-left px-3 py-3 text-zinc-400 font-medium text-xs">User</th>
                    </tr></thead><tbody className="divide-y divide-zinc-800/50">
                      {auditLogs.slice(0, 50).map(log => (
                        <tr key={log.id} className="hover:bg-zinc-800/30">
                          <td className="px-3 py-2.5 text-zinc-500 text-xs whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                          <td className="px-3 py-2.5"><span className={`px-2 py-0.5 rounded text-xs font-medium ${log.action === 'CREATE' ? 'bg-emerald-500/20 text-emerald-400' : log.action === 'DELETE' ? 'bg-red-500/20 text-red-400' : log.action === 'GRN' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-blue-500/20 text-blue-400'}`}>{log.action}</span></td>
                          <td className="px-3 py-2.5 text-white">{log.entityName}</td>
                          <td className="px-3 py-2.5 text-zinc-400 text-xs max-w-xs truncate">{log.details}</td>
                          <td className="px-3 py-2.5 text-zinc-500 text-xs">{log.user}</td>
                        </tr>
                      ))}
                    </tbody></table>
                  </div>
                )}
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* ============ MODALS ============ */}

      {/* GRN */}
      {showGRN && (
        <GRNInwardForm materials={sopMaterialData} userName={userName} onClose={() => setShowGRN(false)}
          onSuccess={(acceptedItems: GRNSuccessItem[]) => {
            // AUTO-UPDATE: Add received quantities to store stock
            setStockItems(prev => {
              const updated = [...prev];
              for (const grn of acceptedItems) {
                const idx = updated.findIndex(s =>
                  s.materialName.toLowerCase() === grn.materialName.toLowerCase() ||
                  (grn.code && s.code.toLowerCase() === grn.code.toLowerCase())
                );
                if (idx >= 0) {
                  // Existing material — increase inward
                  updated[idx] = { ...updated[idx], inword: (updated[idx].inword || 0) + grn.receivedQty, binLocation: grn.binLocation || updated[idx].binLocation, lastModified: new Date().toISOString() };
                } else {
                  // New material — add to store
                  updated.push({
                    id: `grn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    sno: updated.length + 1,
                    code: grn.code || `NEW-${Date.now().toString(36).toUpperCase()}`,
                    materialName: grn.materialName,
                    category: autoCategory(grn.materialName, grn.binLocation || ''),
                    supplierName: '', rate: grn.unitPrice || 0,
                    uom: grn.unit || 'Pcs', openingStock: 0, inword: grn.receivedQty,
                    projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0,
                    createdAt: new Date().toISOString(), binLocation: grn.binLocation || '',
                    storageArea: grn.binLocation?.split('/').slice(0, 2).join('/') || 'Unassigned',
                  });
                }
              }
              return updated;
            });
            showToast(`GRN saved — ${acceptedItems.length} material(s) auto-updated in store`, 'success');
            logAudit('GRN', 'GRN', 'Goods Receipt', `GRN completed via SOP — ${acceptedItems.length} items received`);
            addLiveActivity('GRN Completed', `${acceptedItems.length} material(s) received & stock updated`, 'grn');
            setTodayOpsCount(prev => { const n = { ...prev, grn: prev.grn + 1 }; localStorage.setItem('store_today_ops', JSON.stringify(n)); return n; });
            setShowGRN(false);
          }} />
      )}

      {/* Issue */}
      {showIssue && (
        <MaterialIssueForm materials={sopMaterialData} userName={userName} onClose={() => setShowIssue(false)}
          onSuccess={(data: IssueSuccessData) => {
            // AUTO-UPDATE: Deduct issued quantity from store stock
            setStockItems(prev => {
              const updated = [...prev];
              const idx = updated.findIndex(s =>
                s.materialName.toLowerCase() === data.materialName.toLowerCase() ||
                (data.materialCode && s.code.toLowerCase() === data.materialCode.toLowerCase())
              );
              if (idx >= 0) {
                const item = { ...updated[idx], lastModified: new Date().toISOString() };
                // Assign to correct usage bucket based on project/department
                const proj = (data.project || '').toLowerCase();
                if (proj.includes('r&d') || proj.includes('rnd')) {
                  item.rdUsage = (item.rdUsage || 0) + data.quantity;
                } else if (proj.includes('maintenance') || proj.includes('internal')) {
                  item.internalUsage = (item.internalUsage || 0) + data.quantity;
                } else if (proj.includes('new factory')) {
                  item.newFactoryUsage = (item.newFactoryUsage || 0) + data.quantity;
                } else {
                  // Add to project-specific usage
                  const projectKey = data.project || data.department || 'General';
                  item.projects = { ...item.projects, [projectKey]: (item.projects[projectKey] || 0) + data.quantity };
                }
                updated[idx] = item;
              }
              return updated;
            });
            showToast(`Material issued — ${data.materialName} (${data.quantity} ${data.unit}) auto-deducted`, 'success');
            logAudit('ISSUE', 'Issue', 'Material Issue', `Issue via FIFO/FEFO — ${data.materialName} x${data.quantity}`);
            addLiveActivity('Material Issued', `${data.materialName} x${data.quantity} → ${data.department}`, 'issue');
            setTodayOpsCount(prev => { const n = { ...prev, issue: prev.issue + 1 }; localStorage.setItem('store_today_ops', JSON.stringify(n)); return n; });
            setShowIssue(false);
          }} />
      )}

      {/* Return */}
      {showReturn && (
        <MaterialReturnForm materials={sopMaterialData} userName={userName} onClose={() => setShowReturn(false)}
          onSuccess={(data: ReturnSuccessData) => {
            // AUTO-UPDATE: Add returned quantity back to store stock (only if good condition)
            if (data.condition === 'good') {
              setStockItems(prev => {
                const updated = [...prev];
                const idx = updated.findIndex(s =>
                  s.materialName.toLowerCase() === data.materialName.toLowerCase() ||
                  (data.materialCode && s.code.toLowerCase() === data.materialCode.toLowerCase())
                );
                if (idx >= 0) {
                  updated[idx] = { ...updated[idx], inword: (updated[idx].inword || 0) + data.quantity, lastModified: new Date().toISOString() };
                }
                return updated;
              });
            }
            const condLabel = data.condition === 'good' ? 'stock updated' : `condition: ${data.condition} — no stock change`;
            showToast(`Return processed — ${data.materialName} (${data.quantity} ${data.unit}) — ${condLabel}`, 'success');
            logAudit('RETURN', 'Return', 'Material Return', `Return via SOP — ${data.materialName} x${data.quantity} [${data.condition}]`);
            addLiveActivity('Material Returned', `${data.materialName} x${data.quantity} [${data.condition}]`, 'return');
            setTodayOpsCount(prev => { const n = { ...prev, return: prev.return + 1 }; localStorage.setItem('store_today_ops', JSON.stringify(n)); return n; });
            setShowReturn(false);
          }} />
      )}

      {/* Invoice */}
      {showInvoice && (
        <StoreInvoice userName={userName} onClose={() => setShowInvoice(false)}
          onSuccess={(data: InvoiceSuccessData) => {
            showToast(`Invoice ${data.invoiceNumber} created — ${data.vendorName} · ${formatCurrency(data.totalAmount)}`, 'success');
            logAudit('GRN', 'Stock', 'Store Invoice', `Invoice ${data.invoiceNumber} — ${data.itemCount} items — ${formatCurrency(data.totalAmount)}`);
            addLiveActivity('Invoice Created', `${data.invoiceNumber} · ${data.vendorName}`, 'grn');
            setShowInvoice(false);
          }} />
      )}

      {/* Create PO */}
      {showCreatePO && (
        <CreatePOFromStore userName={userName} stockItems={stockItems} suppliers={suppliers}
          onClose={() => setShowCreatePO(false)}
          onSuccess={(data: CreatePOSuccessData) => {
            showToast(`PO ${data.poNumber} created for ${data.vendorName} — ${formatCurrency(data.totalAmount)} — Sent for MD Approval`, 'success');
            logAudit('PURCHASE', 'Stock', 'Purchase Order', `PO ${data.poNumber} — ${data.itemCount} items — ${formatCurrency(data.totalAmount)}`);
            addLiveActivity('PO Created', `${data.poNumber} · ${data.vendorName} · ${formatCurrency(data.totalAmount)}`, 'grn');
            setShowCreatePO(false);
          }} />
      )}

      {/* Receive Against PO */}
      {showReceivePO && (
        <ReceiveAgainstPO userName={userName} onClose={() => setShowReceivePO(false)}
          onSuccess={(data: ReceiveAgainstPOSuccessData) => {
            // AUTO-UPDATE: Add received quantities to store stock
            setStockItems(prev => {
              const updated = [...prev];
              for (const item of data.receivedItems) {
                const idx = updated.findIndex(s =>
                  s.materialName.toLowerCase() === item.materialName.toLowerCase()
                );
                if (idx >= 0) {
                  updated[idx] = { ...updated[idx], inword: (updated[idx].inword || 0) + item.receivedQty, binLocation: item.binLocation || updated[idx].binLocation, lastModified: new Date().toISOString() };
                } else {
                  updated.push({
                    id: `po-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    sno: updated.length + 1,
                    code: `NEW-${Date.now().toString(36).toUpperCase()}`,
                    materialName: item.materialName,
                    category: autoCategory(item.materialName, item.binLocation || ''),
                    supplierName: '', rate: item.unitPrice || 0,
                    uom: item.unit || 'Pcs', openingStock: 0, inword: item.receivedQty,
                    projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0,
                    createdAt: new Date().toISOString(), binLocation: item.binLocation || '',
                    storageArea: item.binLocation?.split('/').slice(0, 2).join('/') || 'Unassigned',
                  });
                }
              }
              return updated;
            });
            const statusLabel = data.poFullyReceived ? 'FULLY received' : 'partially received';
            showToast(`GRN ${data.grnNumber} against PO ${data.poNumber} — ${data.receivedItems.length} item(s) ${statusLabel}`, 'success');
            logAudit('GRN', 'GRN', 'Receive Against PO', `PO ${data.poNumber} → GRN ${data.grnNumber} — ${statusLabel}`);
            addLiveActivity('PO Received', `PO ${data.poNumber} — ${data.receivedItems.length} items ${statusLabel}`, 'grn');
            setTodayOpsCount(prev => { const n = { ...prev, grn: prev.grn + 1 }; localStorage.setItem('store_today_ops', JSON.stringify(n)); return n; });
            setShowReceivePO(false);
          }} />
      )}

      {/* View Item Detail */}
      <AnimatePresence>
        {editingItem && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setEditingItem(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()} className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-lg">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2"><Eye className="w-5 h-5 text-blue-400" /> Item Details</h2>
                <button onClick={() => setEditingItem(null)} className="p-2 rounded-lg hover:bg-zinc-800"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-zinc-800/50 rounded-lg p-3"><p className="text-xs text-zinc-500">S.No</p><p className="text-white font-semibold">{editingItem.sno}</p></div>
                  <div className="bg-zinc-800/50 rounded-lg p-3"><p className="text-xs text-zinc-500">Code</p><p className="text-white font-mono">{editingItem.code}</p></div>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-3"><p className="text-xs text-zinc-500">Material Name</p><p className="text-white font-semibold">{editingItem.materialName}</p></div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-zinc-800/50 rounded-lg p-3"><p className="text-xs text-zinc-500">Category</p><p className={`text-sm ${categoryColors[editingItem.category]?.split(' ')[1] || 'text-white'}`}>{editingItem.category}</p></div>
                  <div className="bg-zinc-800/50 rounded-lg p-3"><p className="text-xs text-zinc-500">UOM</p><p className="text-white">{editingItem.uom}</p></div>
                  <div className="bg-zinc-800/50 rounded-lg p-3"><p className="text-xs text-zinc-500">Stock</p><p className={`font-bold ${calculateClosingStock(editingItem) > 0 ? 'text-emerald-400' : 'text-red-400'}`}>{calculateClosingStock(editingItem)}</p></div>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-3"><p className="text-xs text-zinc-500">Storage Area</p><p className="text-cyan-400 font-mono">{editingItem.storageArea || 'Unassigned'}</p></div>
                {editingItem.supplierName && <div className="bg-zinc-800/50 rounded-lg p-3"><p className="text-xs text-zinc-500">Supplier</p><p className="text-white">{editingItem.supplierName}</p></div>}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-zinc-800/50 rounded-lg p-3"><p className="text-xs text-zinc-500">Opening Stock</p><p className="text-white">{editingItem.openingStock}</p></div>
                  <div className="bg-zinc-800/50 rounded-lg p-3"><p className="text-xs text-zinc-500">Inward</p><p className="text-emerald-400">{editingItem.inword}</p></div>
                </div>
              </div>
              <div className="flex justify-end mt-6 pt-4 border-t border-zinc-800">
                <button onClick={() => setEditingItem(null)} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 text-sm">Close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Material Modal */}
      <AnimatePresence>
        {showAddMaterial && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowAddMaterial(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()} className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2"><Package className="w-5 h-5 text-blue-400" /> Add New Item</h2>
                <button onClick={() => setShowAddMaterial(false)} className="p-2 rounded-lg hover:bg-zinc-800"><X className="w-5 h-5" /></button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs text-zinc-400 mb-1 block">Item Code *</label>
                  <input type="text" value={newMaterial.code} onChange={e => setNewMaterial(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="MAT-XXX"
                    className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-sm text-white outline-none focus:border-blue-500/50" /></div>
                <div><label className="text-xs text-zinc-400 mb-1 block">Name *</label>
                  <input type="text" value={newMaterial.materialName} onChange={e => setNewMaterial(p => ({ ...p, materialName: e.target.value }))} placeholder="Material name"
                    className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-sm text-white outline-none focus:border-blue-500/50" /></div>
                <div><label className="text-xs text-zinc-400 mb-1 block">Category</label>
                  <select value={newMaterial.category} onChange={e => setNewMaterial(p => ({ ...p, category: e.target.value as Category }))}
                    className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-sm text-white outline-none">
                    {Object.keys(categoryColors).map(c => <option key={c} value={c}>{c}</option>)}
                  </select></div>
                <div><label className="text-xs text-zinc-400 mb-1 block">UOM</label>
                  <select value={newMaterial.uom} onChange={e => setNewMaterial(p => ({ ...p, uom: e.target.value }))}
                    className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-sm text-white outline-none">
                    {['g', 'ml', 'L', 'Kg', 'Nos', 'M', 'Tin', 'Boxes', 'Sets'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select></div>
                <div><label className="text-xs text-zinc-400 mb-1 block">Supplier</label>
                  <select value={newMaterial.supplierName} onChange={e => setNewMaterial(p => ({ ...p, supplierName: e.target.value }))}
                    className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-sm text-white outline-none">
                    <option value="">Select</option>{suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select></div>
                <div><label className="text-xs text-zinc-400 mb-1 block">Rate (₹)</label>
                  <input type="number" value={newMaterial.rate} onChange={e => setNewMaterial(p => ({ ...p, rate: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-sm text-white outline-none" /></div>
                <div><label className="text-xs text-zinc-400 mb-1 block">Opening Stock</label>
                  <input type="number" value={newMaterial.openingStock} onChange={e => setNewMaterial(p => ({ ...p, openingStock: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-sm text-white outline-none" /></div>
                <div><label className="text-xs text-zinc-400 mb-1 block">Storage Area (e.g. R&D/R1/R1-T1)</label>
                  <input type="text" value={newMaterial.binLocation} onChange={e => setNewMaterial(p => ({ ...p, binLocation: e.target.value }))} placeholder="R&D/R1/R1-T1"
                    className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-sm text-white outline-none font-mono" /></div>
                <div><label className="text-xs text-zinc-400 mb-1 block">Min Stock</label>
                  <input type="number" value={newMaterial.minStock} onChange={e => setNewMaterial(p => ({ ...p, minStock: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-sm text-white outline-none" /></div>
                <div><label className="text-xs text-zinc-400 mb-1 block">Max Stock</label>
                  <input type="number" value={newMaterial.maxStock} onChange={e => setNewMaterial(p => ({ ...p, maxStock: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-sm text-white outline-none" /></div>
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-zinc-800">
                <button onClick={() => setShowAddMaterial(false)} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 text-sm">Cancel</button>
                <button onClick={addMaterial} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-white text-sm font-medium flex items-center gap-2"><Save className="w-4 h-4" /> Save Item</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Supplier Modal */}
      <AnimatePresence>
        {showAddSupplier && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowAddSupplier(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()} className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-lg">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2"><Building2 className="w-5 h-5 text-teal-400" /> Add Supplier</h2>
                <button onClick={() => setShowAddSupplier(false)} className="p-2 rounded-lg hover:bg-zinc-800"><X className="w-5 h-5" /></button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[{ key: 'name', label: 'Name *', ph: 'Company' }, { key: 'contact', label: 'Contact', ph: 'Person' },
                  { key: 'email', label: 'Email', ph: 'email@co.com' }, { key: 'phone', label: 'Phone', ph: '98765xxxxx' },
                  { key: 'gst', label: 'GST', ph: 'GSTIN' }, { key: 'city', label: 'City', ph: 'City' }].map(f => (
                  <div key={f.key}><label className="text-xs text-zinc-400 mb-1 block">{f.label}</label>
                    <input type="text" value={(newSupplier as Record<string, string>)[f.key]} onChange={e => setNewSupplier(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.ph}
                      className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-sm text-white outline-none focus:border-blue-500/50" /></div>
                ))}
                <div className="col-span-2"><label className="text-xs text-zinc-400 mb-1 block">Address</label>
                  <input type="text" value={newSupplier.address} onChange={e => setNewSupplier(p => ({ ...p, address: e.target.value }))} placeholder="Full address"
                    className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-sm text-white outline-none" /></div>
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-zinc-800">
                <button onClick={() => setShowAddSupplier(false)} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 text-sm">Cancel</button>
                <button onClick={addSupplier} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-white text-sm font-medium flex items-center gap-2"><Save className="w-4 h-4" /> Save</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>{toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}</AnimatePresence>
    </div>
  );
}
