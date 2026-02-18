// ==========================================
// MANUFACTURING SERVICE
// eBOM, mBOM, MRP, Production Orders, Variance Tracking
// Triovision Composite Technologies Pvt Ltd
// ==========================================

import { db } from '@/lib/firebase/client';
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  limit,
} from 'firebase/firestore';

import {
  EngineeringBOM,
  ManufacturingBOM,
  MRPRun,
  MRPItem,
  ProductionOrder,
  MaterialVariance,
  OverBOMRequest,
  eBOMItem,
  mBOMItem,
  RoutingOperation,
  ProductionOrderMaterial,
  ProductionOrderOperation,
  BOMStatus,
  EscalationLevel,
  MANUFACTURING_COLLECTIONS,
  VARIANCE_THRESHOLDS,
  ESCALATION_TIMEOUT_HOURS,
} from '@/types/manufacturing';

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

const generateDocNumber = (prefix: string): string => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}-${year}${month}-${random}`;
};

const getCurrentUser = (): { id: string; name: string; role: string } => {
  if (typeof window === 'undefined') return { id: 'system', name: 'System', role: 'admin' };
  const stored = localStorage.getItem('currentUser');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return { id: 'system', name: 'System', role: 'admin' };
    }
  }
  return { id: 'system', name: 'System', role: 'admin' };
};

// ==========================================
// 1. ENGINEERING BOM (eBOM) SERVICE
// ==========================================

export const eBOMService = {
  /**
   * Create a new Engineering BOM
   */
  async create(data: Partial<EngineeringBOM>): Promise<string> {
    const user = getCurrentUser();
    const bomNumber = generateDocNumber('eBOM');
    
    const eBOM: Omit<EngineeringBOM, 'id'> = {
      bomNumber,
      revision: 'A',
      projectId: data.projectId || '',
      projectCode: data.projectCode || '',
      projectName: data.projectName || '',
      productName: data.productName || '',
      productCode: data.productCode,
      customerId: data.customerId,
      customerName: data.customerName,
      customerPO: data.customerPO,
      designedBy: user.id,
      designedByName: user.name,
      designDate: new Date().toISOString(),
      productQty: data.productQty || 1,
      unitOfMeasure: data.unitOfMeasure || 'Nos',
      items: data.items || [],
      totalItems: data.items?.length || 0,
      totalLevels: 1,
      totalMaterialCost: 0,
      totalWastageCost: 0,
      contingencyPercent: data.contingencyPercent || 5,
      contingencyAmount: 0,
      grandTotalCost: 0,
      itemsInStock: 0,
      itemsPartialStock: 0,
      itemsOutOfStock: 0,
      criticalItems: 0,
      totalShortfallValue: 0,
      status: 'draft',
      convertedToMBOM: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      history: [{
        action: 'Created',
        by: user.id,
        byName: user.name,
        at: new Date().toISOString(),
      }],
      designNotes: data.designNotes,
      manufacturingNotes: data.manufacturingNotes,
    };

    // Calculate costs and stock status
    const calculated = this.calculateBOMSummary(eBOM);
    Object.assign(eBOM, calculated);

    const docRef = await addDoc(collection(db, MANUFACTURING_COLLECTIONS.EBOM), eBOM);
    return docRef.id;
  },

  /**
   * Calculate BOM summary (costs, stock status)
   */
  calculateBOMSummary(bom: Omit<EngineeringBOM, 'id'>): Partial<EngineeringBOM> {
    let totalMaterialCost = 0;
    let totalWastageCost = 0;
    let itemsInStock = 0;
    let itemsPartialStock = 0;
    let itemsOutOfStock = 0;
    let criticalItems = 0;
    let totalShortfallValue = 0;

    bom.items.forEach(item => {
      const grossQty = item.requiredQty * (1 + (item.wastagePercent || 0) / 100);
      const baseCost = item.requiredQty * item.estimatedUnitCost;
      const wastageCost = (grossQty - item.requiredQty) * item.estimatedUnitCost;
      
      totalMaterialCost += baseCost;
      totalWastageCost += wastageCost;

      if (item.availableStock >= grossQty) {
        itemsInStock++;
      } else if (item.availableStock > 0) {
        itemsPartialStock++;
        totalShortfallValue += item.shortfall * item.estimatedUnitCost;
      } else {
        itemsOutOfStock++;
        totalShortfallValue += grossQty * item.estimatedUnitCost;
      }

      if (item.isCritical) criticalItems++;
    });

    const subtotal = totalMaterialCost + totalWastageCost;
    const contingencyAmount = subtotal * (bom.contingencyPercent / 100);
    const grandTotalCost = subtotal + contingencyAmount;

    return {
      totalMaterialCost,
      totalWastageCost,
      contingencyAmount,
      grandTotalCost,
      itemsInStock,
      itemsPartialStock,
      itemsOutOfStock,
      criticalItems,
      totalShortfallValue,
      totalItems: bom.items.length,
    };
  },

  /**
   * Add item to eBOM
   */
  async addItem(bomId: string, item: Partial<eBOMItem>): Promise<void> {
    const user = getCurrentUser();
    const bomRef = doc(db, MANUFACTURING_COLLECTIONS.EBOM, bomId);
    const bomSnap = await getDoc(bomRef);
    
    if (!bomSnap.exists()) throw new Error('eBOM not found');
    
    const bom = { id: bomSnap.id, ...bomSnap.data() } as EngineeringBOM;
    
    // Calculate gross qty and shortfall
    const grossQty = (item.requiredQty || 0) * (1 + (item.wastagePercent || 0) / 100);
    const availableStock = (item.currentStock || 0) - (item.allocatedStock || 0);
    const shortfall = Math.max(0, grossQty - availableStock);
    
    const newItem: eBOMItem = {
      id: `item-${Date.now()}`,
      itemNumber: bom.items.length + 1,
      materialId: item.materialId || '',
      materialCode: item.materialCode || '',
      materialName: item.materialName || '',
      category: item.category || 'Raw Material',
      requiredQty: item.requiredQty || 0,
      unit: item.unit || 'Nos',
      wastagePercent: item.wastagePercent || 0,
      grossQty,
      currentStock: item.currentStock || 0,
      allocatedStock: item.allocatedStock || 0,
      availableStock,
      shortfall,
      estimatedUnitCost: item.estimatedUnitCost || 0,
      estimatedTotalCost: grossQty * (item.estimatedUnitCost || 0),
      specifications: item.specifications,
      drawingNumber: item.drawingNumber,
      revision: item.revision,
      level: item.level || 0,
      preferredSupplierId: item.preferredSupplierId,
      preferredSupplierName: item.preferredSupplierName,
      leadTimeDays: item.leadTimeDays || 7,
      isCritical: item.isCritical || false,
      isOptional: item.isOptional || false,
      alternateItemId: item.alternateItemId,
    };

    const updatedItems = [...bom.items, newItem];
    const calculated = this.calculateBOMSummary({ ...bom, items: updatedItems });

    await updateDoc(bomRef, {
      items: updatedItems,
      ...calculated,
      updatedAt: new Date().toISOString(),
      history: [...bom.history, {
        action: `Added item: ${newItem.materialName}`,
        by: user.id,
        byName: user.name,
        at: new Date().toISOString(),
      }],
    });
  },

  /**
   * Update eBOM status
   */
  async updateStatus(bomId: string, status: BOMStatus): Promise<void> {
    const user = getCurrentUser();
    const bomRef = doc(db, MANUFACTURING_COLLECTIONS.EBOM, bomId);
    const bomSnap = await getDoc(bomRef);
    
    if (!bomSnap.exists()) throw new Error('eBOM not found');
    
    const bom = bomSnap.data() as EngineeringBOM;
    const updates: Partial<EngineeringBOM> = {
      status,
      updatedAt: new Date().toISOString(),
    };

    if (status === 'approved') {
      updates.approvedBy = user.id;
      updates.approvedByName = user.name;
      updates.approvedAt = new Date().toISOString();
    } else if (status === 'released') {
      updates.releasedBy = user.id;
      updates.releasedAt = new Date().toISOString();
    }

    await updateDoc(bomRef, {
      ...updates,
      history: [...(bom.history || []), {
        action: `Status changed to ${status}`,
        by: user.id,
        byName: user.name,
        at: new Date().toISOString(),
      }],
    });
  },

  /**
   * Subscribe to eBOM list
   */
  subscribe(callback: (boms: EngineeringBOM[]) => void): () => void {
    const q = query(
      collection(db, MANUFACTURING_COLLECTIONS.EBOM),
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const boms = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as EngineeringBOM));
      callback(boms);
    });
  },

  /**
   * Get eBOM by ID
   */
  async getById(bomId: string): Promise<EngineeringBOM | null> {
    const bomRef = doc(db, MANUFACTURING_COLLECTIONS.EBOM, bomId);
    const bomSnap = await getDoc(bomRef);
    
    if (!bomSnap.exists()) return null;
    return { id: bomSnap.id, ...bomSnap.data() } as EngineeringBOM;
  },

  /**
   * Convert eBOM to mBOM
   */
  async convertToMBOM(bomId: string): Promise<string> {
    const eBOM = await this.getById(bomId);
    if (!eBOM) throw new Error('eBOM not found');
    if (eBOM.status !== 'approved' && eBOM.status !== 'released') {
      throw new Error('eBOM must be approved or released before converting to mBOM');
    }

    // Create mBOM from eBOM
    const mBOMId = await mBOMService.createFromEBOM(eBOM);
    
    // Update eBOM with mBOM reference
    await updateDoc(doc(db, MANUFACTURING_COLLECTIONS.EBOM, bomId), {
      mBOMId,
      convertedToMBOM: true,
      updatedAt: new Date().toISOString(),
    });

    return mBOMId;
  },
};

// ==========================================
// 2. MANUFACTURING BOM (mBOM) SERVICE
// ==========================================

export const mBOMService = {
  /**
   * Create mBOM from eBOM
   */
  async createFromEBOM(eBOM: EngineeringBOM): Promise<string> {
    const mBOMNumber = generateDocNumber('mBOM');

    // Convert eBOM items to mBOM items
    const mBOMItems: mBOMItem[] = eBOM.items.map(item => ({
      ...item,
      consumptionType: 'issue' as const,
      issuePoint: 'start' as const,
      requiresBatchTracking: false,
      requiresInspection: false,
      issuedQty: 0,
      returnedQty: 0,
      actualConsumedQty: 0,
      varianceQty: 0,
      variancePercent: 0,
    }));

    // Create default routing
    const defaultRouting: RoutingOperation[] = [
      {
        id: 'op-10',
        operationNumber: 10,
        operationName: 'Material Preparation',
        operationCode: 'PREP',
        workCenterId: 'wc-store',
        workCenterName: 'Store',
        departmentId: 'store',
        departmentName: 'Store',
        setupTime: 30,
        runTimePerUnit: 15,
        moveTime: 10,
        queueTime: 0,
        totalTimePerUnit: 25,
        machinesRequired: 0,
        operatorsRequired: 1,
        skillLevel: 'semi_skilled',
        laborRatePerHour: 150,
        overheadRatePerHour: 50,
        estimatedLaborCost: 0,
        estimatedOverheadCost: 0,
        inspectionRequired: true,
        predecessorOperations: [],
        canRunParallel: false,
        status: 'pending',
        completedQty: 0,
      },
      {
        id: 'op-20',
        operationNumber: 20,
        operationName: 'Pattern Making',
        operationCode: 'PATT',
        workCenterId: 'wc-pattern',
        workCenterName: 'Pattern Shop',
        departmentId: 'pattern-finishing',
        departmentName: 'Pattern Finishing',
        setupTime: 60,
        runTimePerUnit: 120,
        moveTime: 15,
        queueTime: 30,
        totalTimePerUnit: 165,
        machinesRequired: 1,
        operatorsRequired: 2,
        skillLevel: 'skilled',
        laborRatePerHour: 250,
        overheadRatePerHour: 100,
        estimatedLaborCost: 0,
        estimatedOverheadCost: 0,
        inspectionRequired: true,
        predecessorOperations: [10],
        canRunParallel: false,
        status: 'pending',
        completedQty: 0,
      },
      {
        id: 'op-30',
        operationNumber: 30,
        operationName: 'Lamination',
        operationCode: 'LAM',
        workCenterId: 'wc-lamination',
        workCenterName: 'Lamination Bay',
        departmentId: 'lamination',
        departmentName: 'Lamination',
        setupTime: 45,
        runTimePerUnit: 180,
        moveTime: 20,
        queueTime: 60,
        totalTimePerUnit: 260,
        machinesRequired: 0,
        operatorsRequired: 3,
        skillLevel: 'skilled',
        laborRatePerHour: 200,
        overheadRatePerHour: 150,
        estimatedLaborCost: 0,
        estimatedOverheadCost: 0,
        inspectionRequired: true,
        predecessorOperations: [20],
        canRunParallel: false,
        status: 'pending',
        completedQty: 0,
      },
      {
        id: 'op-40',
        operationNumber: 40,
        operationName: 'Finishing',
        operationCode: 'FIN',
        workCenterId: 'wc-finishing',
        workCenterName: 'Finishing Area',
        departmentId: 'mold-finishing',
        departmentName: 'Mold Finishing',
        setupTime: 30,
        runTimePerUnit: 90,
        moveTime: 10,
        queueTime: 30,
        totalTimePerUnit: 130,
        machinesRequired: 2,
        operatorsRequired: 2,
        skillLevel: 'skilled',
        laborRatePerHour: 200,
        overheadRatePerHour: 80,
        estimatedLaborCost: 0,
        estimatedOverheadCost: 0,
        inspectionRequired: true,
        predecessorOperations: [30],
        canRunParallel: false,
        status: 'pending',
        completedQty: 0,
      },
      {
        id: 'op-50',
        operationNumber: 50,
        operationName: 'Quality Check',
        operationCode: 'QC',
        workCenterId: 'wc-quality',
        workCenterName: 'Quality Lab',
        departmentId: 'quality',
        departmentName: 'Quality',
        setupTime: 15,
        runTimePerUnit: 45,
        moveTime: 10,
        queueTime: 15,
        totalTimePerUnit: 70,
        machinesRequired: 1,
        operatorsRequired: 1,
        skillLevel: 'highly_skilled',
        laborRatePerHour: 300,
        overheadRatePerHour: 100,
        estimatedLaborCost: 0,
        estimatedOverheadCost: 0,
        inspectionRequired: true,
        predecessorOperations: [40],
        canRunParallel: false,
        status: 'pending',
        completedQty: 0,
      },
    ];

    // Calculate costs
    const totalSetupTime = defaultRouting.reduce((sum, op) => sum + op.setupTime, 0);
    const totalRunTime = defaultRouting.reduce((sum, op) => sum + op.runTimePerUnit, 0) * eBOM.productQty;
    const totalLaborHours = (totalSetupTime + totalRunTime) / 60;
    const avgLaborRate = defaultRouting.reduce((sum, op) => sum + op.laborRatePerHour, 0) / defaultRouting.length;
    const avgOverheadRate = defaultRouting.reduce((sum, op) => sum + op.overheadRatePerHour, 0) / defaultRouting.length;
    const totalLaborCost = totalLaborHours * avgLaborRate;
    const totalOverheadCost = totalLaborHours * avgOverheadRate;

    // Default consumables
    const consumables: mBOMItem[] = [
      {
        id: 'cons-1',
        itemNumber: 100,
        materialId: 'cons-gloves',
        materialCode: 'CONS-001',
        materialName: 'Nitrile Gloves',
        category: 'Consumable',
        requiredQty: 10,
        unit: 'Pairs',
        wastagePercent: 0,
        grossQty: 10,
        currentStock: 100,
        allocatedStock: 0,
        availableStock: 100,
        shortfall: 0,
        estimatedUnitCost: 15,
        estimatedTotalCost: 150,
        level: 0,
        leadTimeDays: 3,
        isCritical: false,
        isOptional: false,
        consumptionType: 'floor_stock',
        issuePoint: 'start',
        requiresBatchTracking: false,
        requiresInspection: false,
        issuedQty: 0,
        returnedQty: 0,
        actualConsumedQty: 0,
        varianceQty: 0,
        variancePercent: 0,
      },
      {
        id: 'cons-2',
        itemNumber: 101,
        materialId: 'cons-release',
        materialCode: 'CONS-002',
        materialName: 'Release Agent',
        category: 'Consumable',
        requiredQty: 2,
        unit: 'Liters',
        wastagePercent: 10,
        grossQty: 2.2,
        currentStock: 20,
        allocatedStock: 0,
        availableStock: 20,
        shortfall: 0,
        estimatedUnitCost: 500,
        estimatedTotalCost: 1100,
        level: 0,
        leadTimeDays: 5,
        isCritical: true,
        isOptional: false,
        consumptionType: 'issue',
        issuePoint: 'operation',
        operationId: 'op-30',
        operationName: 'Lamination',
        requiresBatchTracking: true,
        requiresInspection: false,
        issuedQty: 0,
        returnedQty: 0,
        actualConsumedQty: 0,
        varianceQty: 0,
        variancePercent: 0,
      },
    ];

    const consumablesCost = consumables.reduce((sum, c) => sum + c.estimatedTotalCost, 0);

    const mBOM: Omit<ManufacturingBOM, 'id'> = {
      mBOMNumber,
      revision: 'A',
      eBOMId: eBOM.id,
      eBOMNumber: eBOM.bomNumber,
      eBOMRevision: eBOM.revision,
      projectId: eBOM.projectId,
      projectCode: eBOM.projectCode,
      projectName: eBOM.projectName,
      productName: eBOM.productName,
      productQty: eBOM.productQty,
      items: mBOMItems,
      routing: defaultRouting,
      totalOperations: defaultRouting.length,
      totalSetupTime,
      totalRunTime,
      totalLaborHours,
      totalLaborCost,
      totalOverheadCost,
      consumables,
      consumablesCost,
      materialCost: eBOM.grandTotalCost,
      laborCost: totalLaborCost,
      overheadCost: totalOverheadCost,
      consumablesCost2: consumablesCost,
      subcontractingCost: 0,
      totalManufacturingCost: eBOM.grandTotalCost + totalLaborCost + totalOverheadCost + consumablesCost,
      status: 'draft',
      createdBy: getCurrentUser().id,
      createdByName: getCurrentUser().name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      productionOrderIds: [],
    };

    const docRef = await addDoc(collection(db, MANUFACTURING_COLLECTIONS.MBOM), mBOM);
    return docRef.id;
  },

  /**
   * Get mBOM by ID
   */
  async getById(mBOMId: string): Promise<ManufacturingBOM | null> {
    const bomRef = doc(db, MANUFACTURING_COLLECTIONS.MBOM, mBOMId);
    const bomSnap = await getDoc(bomRef);
    
    if (!bomSnap.exists()) return null;
    return { id: bomSnap.id, ...bomSnap.data() } as ManufacturingBOM;
  },

  /**
   * Subscribe to mBOM list
   */
  subscribe(callback: (boms: ManufacturingBOM[]) => void): () => void {
    const q = query(
      collection(db, MANUFACTURING_COLLECTIONS.MBOM),
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const boms = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ManufacturingBOM));
      callback(boms);
    });
  },

  /**
   * Update mBOM status
   */
  async updateStatus(mBOMId: string, status: BOMStatus): Promise<void> {
    const user = getCurrentUser();
    const bomRef = doc(db, MANUFACTURING_COLLECTIONS.MBOM, mBOMId);
    
    const updates: Record<string, unknown> = {
      status,
      updatedAt: new Date().toISOString(),
    };

    if (status === 'approved') {
      updates.approvedBy = user.id;
      updates.approvedAt = new Date().toISOString();
    }

    await updateDoc(bomRef, updates);
  },
};

// ==========================================
// 3. MRP SERVICE
// ==========================================

export const mrpService = {
  /**
   * Run MRP for a project/mBOM
   */
  async runMRP(mBOMId: string, options?: {
    planningHorizonDays?: number;
    autoGeneratePR?: boolean;
  }): Promise<string> {
    const user = getCurrentUser();
    const mrpNumber = generateDocNumber('MRP');
    
    const mBOM = await mBOMService.getById(mBOMId);
    if (!mBOM) throw new Error('mBOM not found');

    const planningHorizonDays = options?.planningHorizonDays || 30;
    const planningStartDate = new Date().toISOString();
    const planningEndDate = new Date(Date.now() + planningHorizonDays * 24 * 60 * 60 * 1000).toISOString();

    // Get current stock levels from inventory
    const materialsSnapshot = await getDocs(collection(db, 'inventory_materials'));
    const inventoryMap = new Map<string, { currentStock: number; minStock: number }>();
    materialsSnapshot.docs.forEach(d => {
      const data = d.data();
      inventoryMap.set(d.id, {
        currentStock: data.currentStock || 0,
        minStock: data.minStock || 0,
      });
    });

    // Get pending POs (scheduled receipts)
    const posSnapshot = await getDocs(
      query(
        collection(db, 'purchase_orders'),
        where('status', 'in', ['approved', 'ordered', 'partially_received'])
      )
    );
    const scheduledReceipts = new Map<string, number>();
    posSnapshot.docs.forEach(d => {
      const po = d.data();
      if (Array.isArray(po.items)) {
        po.items.forEach((item: { materialId: string; quantity: number; receivedQty?: number }) => {
          const pending = (item.quantity || 0) - (item.receivedQty || 0);
          const current = scheduledReceipts.get(item.materialId) || 0;
          scheduledReceipts.set(item.materialId, current + pending);
        });
      }
    });

    // Calculate MRP items
    const mrpItems: MRPItem[] = [];
    let itemsFullyAvailable = 0;
    let itemsPartiallyAvailable = 0;
    let itemsToOrder = 0;
    let totalGrossRequirement = 0;
    let totalNetRequirement = 0;
    let totalOrderValue = 0;
    let criticalPathItems = 0;
    let bottleneckItems = 0;

    // Process mBOM items
    const allItems = [...mBOM.items, ...mBOM.consumables];
    
    for (const item of allItems) {
      const inventory = inventoryMap.get(item.materialId);
      const currentStock = inventory?.currentStock || item.currentStock || 0;
      const scheduled = scheduledReceipts.get(item.materialId) || 0;
      const projectedOnHand = currentStock - (item.allocatedStock || 0);
      const netRequirement = Math.max(0, item.grossQty - projectedOnHand - scheduled);
      
      // Calculate lot size (MOQ)
      const lotSize = 1; // Could be fetched from material master
      const plannedOrderQty = netRequirement > 0 
        ? Math.ceil(netRequirement / lotSize) * lotSize 
        : 0;

      // Calculate dates
      const leadTimeDays = item.leadTimeDays || 7;
      const productionStartDate = planningStartDate; // Simplified
      const receiptDueDate = new Date(Date.now() + (leadTimeDays * 24 * 60 * 60 * 1000)).toISOString();
      const orderDueDate = new Date(Date.now() + Math.max(0, (leadTimeDays - 2) * 24 * 60 * 60 * 1000)).toISOString();

      const mrpItem: MRPItem = {
        id: `mrp-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        materialId: item.materialId,
        materialCode: item.materialCode,
        materialName: item.materialName,
        unit: item.unit,
        grossRequirement: item.grossQty,
        scheduledReceipts: scheduled,
        projectedOnHand,
        netRequirement,
        lotSize,
        safetyStock: inventory?.minStock || 0,
        plannedOrderQty,
        leadTimeDays,
        orderDueDate,
        receiptDueDate,
        productionStartDate,
        allocationStatus: 'pending',
        allocatedQty: 0,
        requiresPR: plannedOrderQty > 0,
        preferredSupplierId: item.preferredSupplierId,
        preferredSupplierName: item.preferredSupplierName,
        lastPurchasePrice: item.estimatedUnitCost,
        isCriticalPath: item.isCritical,
        isBottleneck: netRequirement > projectedOnHand * 2, // Simple heuristic
        hasAlternate: !!item.alternateItemId,
        alternateItemId: item.alternateItemId,
      };

      mrpItems.push(mrpItem);
      totalGrossRequirement += item.grossQty * item.estimatedUnitCost;
      
      if (netRequirement <= 0) {
        itemsFullyAvailable++;
      } else if (projectedOnHand > 0) {
        itemsPartiallyAvailable++;
        totalNetRequirement += netRequirement * item.estimatedUnitCost;
        totalOrderValue += plannedOrderQty * item.estimatedUnitCost;
      } else {
        itemsToOrder++;
        totalNetRequirement += netRequirement * item.estimatedUnitCost;
        totalOrderValue += plannedOrderQty * item.estimatedUnitCost;
      }

      if (mrpItem.isCriticalPath) criticalPathItems++;
      if (mrpItem.isBottleneck) bottleneckItems++;
    }

    // Create MRP Run document
    const mrpRun: Omit<MRPRun, 'id'> = {
      mrpNumber,
      projectId: mBOM.projectId,
      runScope: 'single_project',
      planningHorizonDays,
      planningStartDate,
      planningEndDate,
      mBOMIds: [mBOMId],
      totalMBOMs: 1,
      items: mrpItems,
      totalItems: mrpItems.length,
      itemsFullyAvailable,
      itemsPartiallyAvailable,
      itemsToOrder,
      totalGrossRequirement,
      totalNetRequirement,
      totalOrderValue,
      criticalPathItems,
      bottleneckItems,
      autoGeneratePR: options?.autoGeneratePR || false,
      generatedPRIds: [],
      generatedPRCount: 0,
      status: 'completed',
      runStartedAt: new Date().toISOString(),
      runCompletedAt: new Date().toISOString(),
      runDuration: 1,
      errors: [],
      warnings: [],
      runBy: user.id,
      runByName: user.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(db, MANUFACTURING_COLLECTIONS.MRP_RUNS), mrpRun);
    return docRef.id;
  },

  /**
   * Get MRP Run by ID
   */
  async getById(mrpId: string): Promise<MRPRun | null> {
    const mrpRef = doc(db, MANUFACTURING_COLLECTIONS.MRP_RUNS, mrpId);
    const mrpSnap = await getDoc(mrpRef);
    
    if (!mrpSnap.exists()) return null;
    return { id: mrpSnap.id, ...mrpSnap.data() } as MRPRun;
  },

  /**
   * Subscribe to MRP runs
   */
  subscribe(callback: (runs: MRPRun[]) => void): () => void {
    const q = query(
      collection(db, MANUFACTURING_COLLECTIONS.MRP_RUNS),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    
    return onSnapshot(q, (snapshot) => {
      const runs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MRPRun));
      callback(runs);
    });
  },

  /**
   * Generate Purchase Requisitions from MRP
   */
  async generatePR(mrpId: string): Promise<string[]> {
    const mrp = await this.getById(mrpId);
    if (!mrp) throw new Error('MRP Run not found');

    const itemsToOrder = mrp.items.filter(item => item.requiresPR && item.plannedOrderQty > 0);
    if (itemsToOrder.length === 0) return [];

    const user = getCurrentUser();
    const prNumber = generateDocNumber('PR');

    // Group by supplier if possible
    const prItems = itemsToOrder.map(item => ({
      materialId: item.materialId,
      materialCode: item.materialCode,
      materialName: item.materialName,
      requiredQty: item.plannedOrderQty,
      currentStock: item.projectedOnHand,
      shortfall: item.netRequirement,
      unit: item.unit,
      estimatedUnitPrice: item.lastPurchasePrice || 0,
      estimatedTotal: item.plannedOrderQty * (item.lastPurchasePrice || 0),
      suggestedSupplierId: item.preferredSupplierId,
      suggestedSupplierName: item.preferredSupplierName,
    }));

    const totalAmount = prItems.reduce((sum, item) => sum + item.estimatedTotal, 0);

    // Create PR document
    const pr = {
      prNumber,
      sourceType: 'mrp',
      sourceId: mrpId,
      sourceNumber: mrp.mrpNumber,
      createdBy: user.id,
      createdByName: user.name,
      projectId: mrp.projectId,
      items: prItems,
      totalEstimatedAmount: totalAmount,
      priority: 'high',
      requiredDate: mrp.planningEndDate,
      status: 'submitted',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const prRef = await addDoc(collection(db, 'purchase_requisitions'), pr);

    // Update MRP with PR reference
    await updateDoc(doc(db, MANUFACTURING_COLLECTIONS.MRP_RUNS, mrpId), {
      generatedPRIds: [prRef.id],
      generatedPRCount: 1,
      updatedAt: new Date().toISOString(),
    });

    // Update items with PR reference
    const updatedItems = mrp.items.map(item => {
      if (item.requiresPR && item.plannedOrderQty > 0) {
        return { ...item, prId: prRef.id, prNumber };
      }
      return item;
    });

    await updateDoc(doc(db, MANUFACTURING_COLLECTIONS.MRP_RUNS, mrpId), {
      items: updatedItems,
    });

    return [prRef.id];
  },
};

// ==========================================
// 4. PRODUCTION ORDER SERVICE
// ==========================================

export const productionOrderService = {
  /**
   * Create Production Order from mBOM
   */
  async createFromMBOM(mBOMId: string, options?: {
    orderQty?: number;
    plannedStartDate?: string;
    dueDate?: string;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
  }): Promise<string> {
    const user = getCurrentUser();
    const mBOM = await mBOMService.getById(mBOMId);
    if (!mBOM) throw new Error('mBOM not found');

    const orderNumber = generateDocNumber('PROD');
    const orderQty = options?.orderQty || mBOM.productQty;
    
    // Scale materials based on order qty
    const qtyRatio = orderQty / mBOM.productQty;
    const materials: ProductionOrderMaterial[] = mBOM.items.map(item => ({
      ...item,
      requiredQty: item.requiredQty * qtyRatio,
      grossQty: item.grossQty * qtyRatio,
      estimatedTotalCost: item.estimatedTotalCost * qtyRatio,
      requisitionedQty: 0,
      issuedQty: 0,
      returnedQty: 0,
      actualConsumedQty: 0,
      plannedQty: item.grossQty * qtyRatio,
      varianceQty: 0,
      variancePercent: 0,
      varianceValue: 0,
      varianceLevel: 'none' as const,
      issueRecords: [],
    }));

    // Create operations from routing
    const operations: ProductionOrderOperation[] = mBOM.routing.map(op => {
      const scaledSetupTime = op.setupTime;
      const scaledRunTime = op.runTimePerUnit * orderQty;
      const scheduledStartDate = options?.plannedStartDate || new Date().toISOString();
      
      return {
        ...op,
        scheduledStartDate,
        scheduledEndDate: new Date(Date.now() + (scaledSetupTime + scaledRunTime) * 60 * 1000).toISOString(),
        plannedQty: orderQty,
        completedQty: 0,
        rejectedQty: 0,
        progressPercent: 0,
        inspectionDone: false,
      };
    });

    const plannedMaterialCost = materials.reduce((sum, m) => sum + m.estimatedTotalCost, 0);
    const plannedLaborCost = mBOM.totalLaborCost * qtyRatio;
    const plannedOverheadCost = mBOM.totalOverheadCost * qtyRatio;
    const plannedTotalCost = plannedMaterialCost + plannedLaborCost + plannedOverheadCost;

    const productionOrder: Omit<ProductionOrder, 'id'> = {
      orderNumber,
      mBOMId,
      mBOMNumber: mBOM.mBOMNumber,
      projectId: mBOM.projectId,
      projectCode: mBOM.projectCode,
      projectName: mBOM.projectName,
      productName: mBOM.productName,
      orderQty,
      completedQty: 0,
      rejectedQty: 0,
      pendingQty: orderQty,
      unit: 'Nos',
      plannedStartDate: options?.plannedStartDate || new Date().toISOString(),
      plannedEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      dueDate: options?.dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      priority: options?.priority || 'normal',
      sequenceNumber: 1,
      materials,
      materialsCost: plannedMaterialCost,
      operations,
      currentOperationNumber: 10,
      operationsCompleted: 0,
      totalOperations: operations.length,
      plannedMaterialCost,
      plannedLaborCost,
      plannedOverheadCost,
      plannedTotalCost,
      actualMaterialCost: 0,
      actualLaborCost: 0,
      actualOverheadCost: 0,
      actualTotalCost: 0,
      costVariance: 0,
      costVariancePercent: 0,
      progressPercent: 0,
      status: 'planned',
      createdBy: user.id,
      createdByName: user.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      history: [{
        action: 'Created',
        by: user.id,
        byName: user.name,
        at: new Date().toISOString(),
      }],
    };

    const docRef = await addDoc(collection(db, MANUFACTURING_COLLECTIONS.PRODUCTION_ORDERS), productionOrder);

    // Update mBOM with production order reference
    await updateDoc(doc(db, MANUFACTURING_COLLECTIONS.MBOM, mBOMId), {
      productionOrderIds: [...mBOM.productionOrderIds, docRef.id],
      updatedAt: new Date().toISOString(),
    });

    return docRef.id;
  },

  /**
   * Release Production Order
   */
  async release(orderId: string): Promise<void> {
    const user = getCurrentUser();
    const orderRef = doc(db, MANUFACTURING_COLLECTIONS.PRODUCTION_ORDERS, orderId);
    const orderSnap = await getDoc(orderRef);
    
    if (!orderSnap.exists()) throw new Error('Production Order not found');
    
    const order = orderSnap.data() as ProductionOrder;

    await updateDoc(orderRef, {
      status: 'released',
      releasedBy: user.id,
      releasedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      history: [...order.history, {
        action: 'Released for production',
        by: user.id,
        byName: user.name,
        at: new Date().toISOString(),
      }],
    });
  },

  /**
   * Issue material to Production Order
   */
  async issueMaterial(
    orderId: string,
    materialId: string,
    quantity: number,
    options?: {
      batchId?: string;
      batchNumber?: string;
      operationId?: string;
      notes?: string;
    }
  ): Promise<void> {
    const user = getCurrentUser();
    const orderRef = doc(db, MANUFACTURING_COLLECTIONS.PRODUCTION_ORDERS, orderId);
    const orderSnap = await getDoc(orderRef);
    
    if (!orderSnap.exists()) throw new Error('Production Order not found');
    
    const order = { id: orderSnap.id, ...orderSnap.data() } as ProductionOrder;

    // Find and update the material
    const updatedMaterials = order.materials.map(mat => {
      if (mat.materialId === materialId) {
        const newIssuedQty = mat.issuedQty + quantity;
        const actualConsumed = newIssuedQty - mat.returnedQty;
        const varianceQty = actualConsumed - mat.plannedQty;
        const variancePercent = mat.plannedQty > 0 ? (varianceQty / mat.plannedQty) * 100 : 0;
        const varianceValue = varianceQty * mat.estimatedUnitCost;
        
        // Determine variance level
        let varianceLevel: 'none' | 'supervisor' | 'pm' | 'md' = 'none';
        if (variancePercent >= VARIANCE_THRESHOLDS.MD) {
          varianceLevel = 'md';
        } else if (variancePercent >= VARIANCE_THRESHOLDS.PM) {
          varianceLevel = 'pm';
        } else if (variancePercent >= VARIANCE_THRESHOLDS.SUPERVISOR) {
          varianceLevel = 'supervisor';
        }

        const issueRecord = {
          id: `issue-${Date.now()}`,
          issuedQty: quantity,
          issuedAt: new Date().toISOString(),
          issuedBy: user.id,
          issuedByName: user.name,
          batchId: options?.batchId,
          batchNumber: options?.batchNumber,
          operationId: options?.operationId,
          notes: options?.notes,
        };

        return {
          ...mat,
          issuedQty: newIssuedQty,
          actualConsumedQty: actualConsumed,
          varianceQty,
          variancePercent,
          varianceValue,
          varianceLevel,
          issueRecords: [...mat.issueRecords, issueRecord],
        };
      }
      return mat;
    });

    // Calculate actual material cost
    const actualMaterialCost = updatedMaterials.reduce(
      (sum, mat) => sum + (mat.actualConsumedQty * mat.estimatedUnitCost),
      0
    );

    await updateDoc(orderRef, {
      materials: updatedMaterials,
      actualMaterialCost,
      actualTotalCost: actualMaterialCost + order.actualLaborCost + order.actualOverheadCost,
      costVariance: actualMaterialCost - order.plannedMaterialCost,
      updatedAt: new Date().toISOString(),
      history: [...order.history, {
        action: `Issued ${quantity} ${updatedMaterials.find(m => m.materialId === materialId)?.unit || ''} of ${updatedMaterials.find(m => m.materialId === materialId)?.materialName || 'material'}`,
        by: user.id,
        byName: user.name,
        at: new Date().toISOString(),
      }],
    });
  },

  /**
   * Complete operation
   */
  async completeOperation(
    orderId: string,
    operationNumber: number,
    completedQty: number,
    rejectedQty?: number
  ): Promise<void> {
    const user = getCurrentUser();
    const orderRef = doc(db, MANUFACTURING_COLLECTIONS.PRODUCTION_ORDERS, orderId);
    const orderSnap = await getDoc(orderRef);
    
    if (!orderSnap.exists()) throw new Error('Production Order not found');
    
    const order = { id: orderSnap.id, ...orderSnap.data() } as ProductionOrder;

    const updatedOperations = order.operations.map(op => {
      if (op.operationNumber === operationNumber) {
        return {
          ...op,
          completedQty: op.completedQty + completedQty,
          rejectedQty: (op.rejectedQty || 0) + (rejectedQty || 0),
          progressPercent: Math.min(100, ((op.completedQty + completedQty) / op.plannedQty) * 100),
          status: (op.completedQty + completedQty >= op.plannedQty) ? 'completed' : 'in_progress',
          completedAt: (op.completedQty + completedQty >= op.plannedQty) ? new Date().toISOString() : undefined,
          completedBy: (op.completedQty + completedQty >= op.plannedQty) ? user.id : undefined,
          actualEndDate: (op.completedQty + completedQty >= op.plannedQty) ? new Date().toISOString() : undefined,
        } as ProductionOrderOperation;
      }
      return op;
    });

    const operationsCompleted = updatedOperations.filter(op => op.status === 'completed').length;
    const overallProgress = (operationsCompleted / updatedOperations.length) * 100;
    
    // Find next operation
    const currentOp = updatedOperations.find(op => op.operationNumber === operationNumber);
    const nextOp = updatedOperations.find(op => 
      op.operationNumber > operationNumber && op.status !== 'completed'
    );

    const updates: Partial<ProductionOrder> = {
      operations: updatedOperations,
      operationsCompleted,
      progressPercent: overallProgress,
      currentOperationNumber: nextOp?.operationNumber || operationNumber,
      updatedAt: new Date().toISOString(),
    };

    // Update total completed if final operation
    if (!nextOp && currentOp?.status === 'completed') {
      updates.completedQty = (order.completedQty || 0) + completedQty;
      updates.pendingQty = order.orderQty - (updates.completedQty || 0);
      updates.rejectedQty = (order.rejectedQty || 0) + (rejectedQty || 0);
      
      if (updates.completedQty >= order.orderQty) {
        updates.status = 'completed';
        updates.completedBy = user.id;
        updates.completedAt = new Date().toISOString();
      }
    }

    await updateDoc(orderRef, {
      ...updates,
      history: [...order.history, {
        action: `Completed operation ${operationNumber}: ${completedQty} units`,
        by: user.id,
        byName: user.name,
        at: new Date().toISOString(),
        operationNumber,
      }],
    });
  },

  /**
   * Subscribe to Production Orders
   */
  subscribe(callback: (orders: ProductionOrder[]) => void): () => void {
    const q = query(
      collection(db, MANUFACTURING_COLLECTIONS.PRODUCTION_ORDERS),
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ProductionOrder));
      callback(orders);
    });
  },

  /**
   * Get Production Order by ID
   */
  async getById(orderId: string): Promise<ProductionOrder | null> {
    const orderRef = doc(db, MANUFACTURING_COLLECTIONS.PRODUCTION_ORDERS, orderId);
    const orderSnap = await getDoc(orderRef);
    
    if (!orderSnap.exists()) return null;
    return { id: orderSnap.id, ...orderSnap.data() } as ProductionOrder;
  },
};

// ==========================================
// 5. VARIANCE SERVICE
// ==========================================

export const varianceService = {
  /**
   * Create variance record when threshold exceeded
   */
  async createVariance(
    productionOrderId: string,
    materialId: string,
    varianceData: {
      bomQty: number;
      issuedQty: number;
      returnedQty: number;
      unitCost: number;
      reason?: string;
      reasonCategory?: string;
    }
  ): Promise<string> {
    const varianceNumber = generateDocNumber('VAR');
    
    const order = await productionOrderService.getById(productionOrderId);
    if (!order) throw new Error('Production Order not found');

    const material = order.materials.find(m => m.materialId === materialId);
    if (!material) throw new Error('Material not found in order');

    const actualConsumedQty = varianceData.issuedQty - varianceData.returnedQty;
    const varianceQty = actualConsumedQty - varianceData.bomQty;
    const variancePercent = varianceData.bomQty > 0 ? (varianceQty / varianceData.bomQty) * 100 : 0;
    const varianceValue = varianceQty * varianceData.unitCost;

    // Determine escalation level
    let currentLevel: EscalationLevel = 'supervisor';
    if (Math.abs(variancePercent) >= VARIANCE_THRESHOLDS.MD) {
      currentLevel = 'md';
    } else if (Math.abs(variancePercent) >= VARIANCE_THRESHOLDS.PM) {
      currentLevel = 'pm';
    }

    const variance: Omit<MaterialVariance, 'id'> = {
      varianceNumber,
      productionOrderId,
      productionOrderNumber: order.orderNumber,
      projectId: order.projectId,
      projectCode: order.projectCode,
      materialId,
      materialCode: material.materialCode,
      materialName: material.materialName,
      unit: material.unit,
      bomQty: varianceData.bomQty,
      issuedQty: varianceData.issuedQty,
      returnedQty: varianceData.returnedQty,
      actualConsumedQty,
      varianceQty,
      variancePercent,
      unitCost: varianceData.unitCost,
      varianceValue,
      threshold5Percent: varianceData.bomQty * 0.05,
      threshold10Percent: varianceData.bomQty * 0.10,
      threshold15Percent: varianceData.bomQty * 0.15,
      currentLevel,
      escalationHistory: [{
        level: currentLevel,
        escalatedAt: new Date().toISOString(),
        escalatedTo: '', // Would be filled based on role assignments
        escalatedToName: '',
        timeoutHours: ESCALATION_TIMEOUT_HOURS[currentLevel.toUpperCase() as keyof typeof ESCALATION_TIMEOUT_HOURS],
        deadline: new Date(
          Date.now() + ESCALATION_TIMEOUT_HOURS[currentLevel.toUpperCase() as keyof typeof ESCALATION_TIMEOUT_HOURS] * 60 * 60 * 1000
        ).toISOString(),
      }],
      status: 'pending',
      reason: varianceData.reason,
      reasonCategory: varianceData.reasonCategory as MaterialVariance['reasonCategory'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(db, MANUFACTURING_COLLECTIONS.MATERIAL_VARIANCES), variance);
    return docRef.id;
  },

  /**
   * Approve/Reject variance
   */
  async resolveVariance(
    varianceId: string,
    decision: 'approved' | 'rejected',
    notes?: string
  ): Promise<void> {
    const user = getCurrentUser();
    const varianceRef = doc(db, MANUFACTURING_COLLECTIONS.MATERIAL_VARIANCES, varianceId);
    const varianceSnap = await getDoc(varianceRef);
    
    if (!varianceSnap.exists()) throw new Error('Variance not found');

    const variance = varianceSnap.data() as MaterialVariance;

    const updates: Partial<MaterialVariance> = {
      status: decision,
      updatedAt: new Date().toISOString(),
      resolvedAt: new Date().toISOString(),
    };

    if (decision === 'approved') {
      updates.approvedBy = user.id;
      updates.approvedByName = user.name;
      updates.approvedAt = new Date().toISOString();
    } else {
      updates.rejectedBy = user.id;
      updates.rejectedReason = notes;
    }

    // Update escalation history
    const updatedHistory = variance.escalationHistory.map((entry, index) => {
      if (index === variance.escalationHistory.length - 1) {
        return {
          ...entry,
          action: decision,
          actionAt: new Date().toISOString(),
          actionBy: user.id,
          actionNotes: notes,
        };
      }
      return entry;
    });

    await updateDoc(varianceRef, {
      ...updates,
      escalationHistory: updatedHistory,
    });
  },

  /**
   * Subscribe to variances
   */
  subscribe(callback: (variances: MaterialVariance[]) => void): () => void {
    const q = query(
      collection(db, MANUFACTURING_COLLECTIONS.MATERIAL_VARIANCES),
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const variances = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MaterialVariance));
      callback(variances);
    });
  },

  /**
   * Get pending variances for approval
   */
  async getPendingForLevel(level: EscalationLevel): Promise<MaterialVariance[]> {
    const q = query(
      collection(db, MANUFACTURING_COLLECTIONS.MATERIAL_VARIANCES),
      where('status', '==', 'pending'),
      where('currentLevel', '==', level)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MaterialVariance));
  },
};

// ==========================================
// 6. OVER-BOM REQUEST SERVICE
// ==========================================

export const overBOMService = {
  /**
   * Create Over-BOM consumption request
   */
  async createRequest(data: {
    productionOrderId: string;
    materialId: string;
    additionalQty: number;
    reason: string;
    reasonCategory: string;
    justification: string;
  }): Promise<string> {
    const user = getCurrentUser();
    const requestNumber = generateDocNumber('OBR');
    
    const order = await productionOrderService.getById(data.productionOrderId);
    if (!order) throw new Error('Production Order not found');

    const material = order.materials.find(m => m.materialId === data.materialId);
    if (!material) throw new Error('Material not found');

    const totalAfterApproval = material.issuedQty + data.additionalQty;
    const overBOMPercent = ((totalAfterApproval - material.plannedQty) / material.plannedQty) * 100;

    // Determine approval level
    let approvalLevel: EscalationLevel = 'supervisor';
    if (overBOMPercent >= VARIANCE_THRESHOLDS.MD) {
      approvalLevel = 'md';
    } else if (overBOMPercent >= VARIANCE_THRESHOLDS.PM) {
      approvalLevel = 'pm';
    }

    const request: Omit<OverBOMRequest, 'id'> = {
      requestNumber,
      productionOrderId: data.productionOrderId,
      productionOrderNumber: order.orderNumber,
      materialId: data.materialId,
      materialCode: material.materialCode,
      materialName: material.materialName,
      unit: material.unit,
      bomQty: material.plannedQty,
      alreadyIssuedQty: material.issuedQty,
      additionalRequestedQty: data.additionalQty,
      totalAfterApproval,
      overBOMPercent,
      unitCost: material.estimatedUnitCost,
      additionalCost: data.additionalQty * material.estimatedUnitCost,
      reason: data.reason,
      reasonCategory: data.reasonCategory as OverBOMRequest['reasonCategory'],
      justification: data.justification,
      requestedBy: user.id,
      requestedByName: user.name,
      requestedByRole: user.role,
      requestedAt: new Date().toISOString(),
      approvalLevel,
      approvalChain: [{
        level: approvalLevel,
        status: 'pending',
      }],
      status: 'pending',
      timeoutHours: ESCALATION_TIMEOUT_HOURS[approvalLevel.toUpperCase() as keyof typeof ESCALATION_TIMEOUT_HOURS],
      deadline: new Date(
        Date.now() + ESCALATION_TIMEOUT_HOURS[approvalLevel.toUpperCase() as keyof typeof ESCALATION_TIMEOUT_HOURS] * 60 * 60 * 1000
      ).toISOString(),
      autoEscalate: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(db, MANUFACTURING_COLLECTIONS.OVER_BOM_REQUESTS), request);
    return docRef.id;
  },

  /**
   * Approve Over-BOM request
   */
  async approve(requestId: string, approvedQty?: number, notes?: string): Promise<void> {
    const user = getCurrentUser();
    const requestRef = doc(db, MANUFACTURING_COLLECTIONS.OVER_BOM_REQUESTS, requestId);
    const requestSnap = await getDoc(requestRef);
    
    if (!requestSnap.exists()) throw new Error('Request not found');
    
    const request = requestSnap.data() as OverBOMRequest;

    await updateDoc(requestRef, {
      status: 'approved',
      approvedQty: approvedQty || request.additionalRequestedQty,
      approvedBy: user.id,
      approvedByName: user.name,
      approvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      approvalChain: request.approvalChain.map(step => ({
        ...step,
        status: 'approved',
        approver: user.id,
        approverName: user.name,
        actionAt: new Date().toISOString(),
        notes,
      })),
    });
  },

  /**
   * Reject Over-BOM request
   */
  async reject(requestId: string, reason: string): Promise<void> {
    const user = getCurrentUser();
    const requestRef = doc(db, MANUFACTURING_COLLECTIONS.OVER_BOM_REQUESTS, requestId);
    const requestSnap = await getDoc(requestRef);
    
    if (!requestSnap.exists()) throw new Error('Request not found');
    
    const request = requestSnap.data() as OverBOMRequest;

    await updateDoc(requestRef, {
      status: 'rejected',
      rejectedBy: user.id,
      rejectedReason: reason,
      updatedAt: new Date().toISOString(),
      approvalChain: request.approvalChain.map(step => ({
        ...step,
        status: 'rejected',
        approver: user.id,
        approverName: user.name,
        actionAt: new Date().toISOString(),
        notes: reason,
      })),
    });
  },

  /**
   * Subscribe to Over-BOM requests
   */
  subscribe(callback: (requests: OverBOMRequest[]) => void): () => void {
    const q = query(
      collection(db, MANUFACTURING_COLLECTIONS.OVER_BOM_REQUESTS),
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as OverBOMRequest));
      callback(requests);
    });
  },
};

// ==========================================
// EXPORT ALL SERVICES
// ==========================================

export const manufacturingService = {
  eBOM: eBOMService,
  mBOM: mBOMService,
  mrp: mrpService,
  productionOrder: productionOrderService,
  variance: varianceService,
  overBOM: overBOMService,
};

export default manufacturingService;
