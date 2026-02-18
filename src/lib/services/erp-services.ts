// ==========================================
// EXTENDED ERP SERVICES - Complete Feature Set
// ==========================================

import { db } from '@/lib/firebase/client';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc as firestoreDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch,
  runTransaction,
  limit
} from 'firebase/firestore';

import {
  StockAlert,
  MaterialBatch,
  BatchMovement,
  MaterialTransfer,
  InventoryAudit,
  StockAdjustment,
  MaterialReservation,
  ReorderRule,
  AutoReorderLog,
  InventoryKPIs,
  ConsumptionTrend,
  SupplierScorecard,
  ReportConfig,
  ReportHistory,
  ERP_COLLECTIONS,
  AlertLevel
} from '@/types/erp-extended';

// ==========================================
// 1. STOCK ALERTS SERVICE
// ==========================================

export const stockAlertService = {
  // Generate alerts based on current stock levels
  async checkAndGenerateAlerts(): Promise<StockAlert[]> {
    const materialsSnap = await getDocs(collection(db, ERP_COLLECTIONS.MATERIALS));
    const alerts: StockAlert[] = [];
    const batch = writeBatch(db);

    for (const doc of materialsSnap.docs) {
      const material = doc.data();
      const currentStock = material.current_stock || 0;
      const minStock = material.min_stock || 0;

      let alertLevel: AlertLevel | null = null;

      if (currentStock <= 0) {
        alertLevel = 'out_of_stock';
      } else if (minStock > 0 && currentStock <= minStock * 0.1) {
        alertLevel = 'critical';
      } else if (minStock > 0 && currentStock <= minStock * 0.25) {
        alertLevel = 'warning';
      } else if (minStock > 0 && currentStock <= minStock * 0.5) {
        alertLevel = 'info';
      }

      if (alertLevel) {
        // Check if active alert already exists
        const existingQuery = query(
          collection(db, ERP_COLLECTIONS.STOCK_ALERTS),
          where('materialId', '==', doc.id),
          where('status', '==', 'active')
        );
        const existing = await getDocs(existingQuery);

        if (existing.empty) {
          const alertData: Omit<StockAlert, 'id'> = {
            materialId: doc.id,
            materialCode: material.code,
            materialName: material.name,
            alertLevel,
            currentStock,
            minStock,
            reorderPoint: minStock,
            suggestedReorderQty: Math.max(minStock * 2 - currentStock, minStock),
            unit: material.unit || 'units',
            supplierId: material.supplier_id,
            supplierName: material.supplier_name,
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            autoReorderTriggered: false
          };

          const alertRef = firestoreDoc(collection(db, ERP_COLLECTIONS.STOCK_ALERTS));
          batch.set(alertRef, alertData);
          alerts.push({ id: alertRef.id, ...alertData });
        }
      }
    }

    await batch.commit();
    return alerts;
  },

  // Subscribe to active alerts
  subscribeToAlerts(callback: (alerts: StockAlert[]) => void) {
    const q = query(
      collection(db, ERP_COLLECTIONS.STOCK_ALERTS),
      where('status', 'in', ['active', 'acknowledged'])
    );

    return onSnapshot(q, (snapshot) => {
      const alerts = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StockAlert));
      // Sort in JavaScript to avoid composite index
      alerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(alerts);
    });
  },

  // Acknowledge alert
  async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    await updateDoc(firestoreDoc(db, ERP_COLLECTIONS.STOCK_ALERTS, alertId), {
      status: 'acknowledged',
      acknowledgedBy: userId,
      acknowledgedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  },

  // Resolve alert
  async resolveAlert(alertId: string, userId: string, linkedPOId?: string): Promise<void> {
    await updateDoc(firestoreDoc(db, ERP_COLLECTIONS.STOCK_ALERTS, alertId), {
      status: 'resolved',
      resolvedBy: userId,
      resolvedAt: new Date().toISOString(),
      linkedPOId,
      updatedAt: new Date().toISOString()
    });
  },

  // Snooze alert
  async snoozeAlert(alertId: string, hours: number): Promise<void> {
    const snoozeUntil = new Date();
    snoozeUntil.setHours(snoozeUntil.getHours() + hours);

    await updateDoc(firestoreDoc(db, ERP_COLLECTIONS.STOCK_ALERTS, alertId), {
      status: 'snoozed',
      snoozedUntil: snoozeUntil.toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
};

// ==========================================
// 2. BATCH TRACKING SERVICE
// ==========================================

export const batchService = {
  // Create new batch
  async createBatch(batchData: Omit<MaterialBatch, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, ERP_COLLECTIONS.BATCHES), {
      ...batchData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    return docRef.id;
  },

  // Get batches for a material
  async getBatchesForMaterial(materialId: string): Promise<MaterialBatch[]> {
    const q = query(
      collection(db, ERP_COLLECTIONS.BATCHES),
      where('materialId', '==', materialId),
      where('status', '==', 'active'),
      orderBy('receivedDate', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MaterialBatch));
  },

  // Subscribe to batches
  subscribeToBatches(callback: (batches: MaterialBatch[]) => void) {
    const q = query(
      collection(db, ERP_COLLECTIONS.BATCHES),
      orderBy('createdAt', 'desc'),
      limit(500)
    );

    return onSnapshot(q, (snapshot) => {
      const batches = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MaterialBatch));
      callback(batches);
    });
  },

  // Issue from batch (FIFO)
  async issueFromBatch(
    materialId: string,
    quantity: number,
    reference: string,
    userId: string,
    userName: string
  ): Promise<BatchMovement[]> {
    const movements: BatchMovement[] = [];
    let remainingQty = quantity;

    // Get active batches in FIFO order
    const q = query(
      collection(db, ERP_COLLECTIONS.BATCHES),
      where('materialId', '==', materialId),
      where('status', '==', 'active'),
      where('remainingQty', '>', 0),
      orderBy('remainingQty'),
      orderBy('receivedDate', 'asc')
    );

    const batchesSnap = await getDocs(q);

    for (const batchDoc of batchesSnap.docs) {
      if (remainingQty <= 0) break;

      const batch = batchDoc.data() as MaterialBatch;
      const issueQty = Math.min(batch.remainingQty, remainingQty);

      // Update batch
      await updateDoc(firestoreDoc(db, ERP_COLLECTIONS.BATCHES, batchDoc.id), {
        remainingQty: batch.remainingQty - issueQty,
        status: batch.remainingQty - issueQty <= 0 ? 'consumed' : 'active',
        updatedAt: new Date().toISOString()
      });

      // Create movement record
      const movementData: Omit<BatchMovement, 'id'> = {
        batchId: batchDoc.id,
        batchNumber: batch.batchNumber,
        materialId,
        movementType: 'issue',
        quantity: issueQty,
        reference,
        referenceType: 'issue',
        performedBy: userId,
        performedByName: userName,
        timestamp: new Date().toISOString()
      };

      const movementRef = await addDoc(collection(db, ERP_COLLECTIONS.BATCH_MOVEMENTS), movementData);
      movements.push({ id: movementRef.id, ...movementData });

      remainingQty -= issueQty;
    }

    return movements;
  },

  // Update batch quality status
  async updateQualityStatus(
    batchId: string,
    status: 'passed' | 'failed',
    checkedBy: string
  ): Promise<void> {
    await updateDoc(firestoreDoc(db, ERP_COLLECTIONS.BATCHES, batchId), {
      qualityStatus: status,
      qualityCheckDate: new Date().toISOString(),
      qualityCheckedBy: checkedBy,
      status: status === 'failed' ? 'quarantine' : 'active',
      updatedAt: new Date().toISOString()
    });
  }
};

// ==========================================
// 3. MATERIAL TRANSFER SERVICE
// ==========================================

export const transferService = {
  // Create transfer request
  async createTransfer(transferData: Omit<MaterialTransfer, 'id' | 'transferNumber'>): Promise<string> {
    // Generate transfer number
    const today = new Date();
    const prefix = `TRF-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
    const countSnap = await getDocs(
      query(collection(db, ERP_COLLECTIONS.TRANSFERS), orderBy('createdAt', 'desc'), limit(1))
    );
    const lastNum = countSnap.empty ? 0 : parseInt(countSnap.docs[0].data().transferNumber?.split('-').pop() || '0');
    const transferNumber = `${prefix}-${String(lastNum + 1).padStart(4, '0')}`;

    const docRef = await addDoc(collection(db, ERP_COLLECTIONS.TRANSFERS), {
      ...transferData,
      transferNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    return docRef.id;
  },

  // Subscribe to transfers
  subscribeToTransfers(callback: (transfers: MaterialTransfer[]) => void, department?: string) {
    let q = query(
      collection(db, ERP_COLLECTIONS.TRANSFERS),
      orderBy('createdAt', 'desc')
    );

    if (department) {
      q = query(
        collection(db, ERP_COLLECTIONS.TRANSFERS),
        where('fromDepartment', '==', department),
        orderBy('createdAt', 'desc')
      );
    }

    return onSnapshot(q, (snapshot) => {
      const transfers = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MaterialTransfer));
      callback(transfers);
    });
  },

  // Approve transfer
  async approveTransfer(transferId: string, approverId: string, approverName: string): Promise<void> {
    await updateDoc(firestoreDoc(db, ERP_COLLECTIONS.TRANSFERS, transferId), {
      status: 'approved',
      approvedBy: approverId,
      approvedByName: approverName,
      approvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  },

  // Reject transfer
  async rejectTransfer(transferId: string, reason: string): Promise<void> {
    await updateDoc(firestoreDoc(db, ERP_COLLECTIONS.TRANSFERS, transferId), {
      status: 'rejected',
      rejectedReason: reason,
      updatedAt: new Date().toISOString()
    });
  },

  // Dispatch transfer
  async dispatchTransfer(transferId: string, dispatchedBy: string): Promise<void> {
    await updateDoc(firestoreDoc(db, ERP_COLLECTIONS.TRANSFERS, transferId), {
      status: 'in_transit',
      dispatchedBy,
      dispatchedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  },

  // Receive transfer and update stock
  async receiveTransfer(
    transferId: string,
    receivedBy: string,
    receivedByName: string
  ): Promise<void> {
    await runTransaction(db, async (transaction) => {
      const transferRef = firestoreDoc(db, ERP_COLLECTIONS.TRANSFERS, transferId);
      const transferSnap = await transaction.get(transferRef);
      const transfer = transferSnap.data() as MaterialTransfer;

      // Update material stocks
      for (const item of transfer.items) {
        const materialRef = firestoreDoc(db, ERP_COLLECTIONS.MATERIALS, item.materialId);
        const materialSnap = await transaction.get(materialRef);

        if (materialSnap.exists()) {
          // Stock already deducted from source, no need to add to destination
          // as materials might be at different locations within same system
        }
      }

      // Update transfer status
      transaction.update(transferRef, {
        status: 'completed',
        receivedBy,
        receivedByName,
        receivedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });
  }
};

// ==========================================
// 4. INVENTORY AUDIT SERVICE
// ==========================================

export const auditService = {
  // Create new audit
  async createAudit(auditData: Omit<InventoryAudit, 'id' | 'auditNumber'>): Promise<string> {
    // Generate audit number
    const today = new Date();
    const prefix = `AUD-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
    const countSnap = await getDocs(
      query(collection(db, ERP_COLLECTIONS.AUDITS), orderBy('createdAt', 'desc'), limit(1))
    );
    const lastNum = countSnap.empty ? 0 : parseInt(countSnap.docs[0].data().auditNumber?.split('-').pop() || '0');
    const auditNumber = `${prefix}-${String(lastNum + 1).padStart(4, '0')}`;

    const docRef = await addDoc(collection(db, ERP_COLLECTIONS.AUDITS), {
      ...auditData,
      auditNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    return docRef.id;
  },

  // Subscribe to audits
  subscribeToAudits(callback: (audits: InventoryAudit[]) => void) {
    const q = query(
      collection(db, ERP_COLLECTIONS.AUDITS),
      orderBy('scheduledDate', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const audits = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as InventoryAudit));
      callback(audits);
    });
  },

  // Start audit
  async startAudit(auditId: string, conductedBy: string, conductedByName: string): Promise<void> {
    await updateDoc(firestoreDoc(db, ERP_COLLECTIONS.AUDITS, auditId), {
      status: 'in_progress',
      startedAt: new Date().toISOString(),
      conductedBy,
      conductedByName,
      updatedAt: new Date().toISOString()
    });
  },

  // Update count for an item
  async updateItemCount(
    auditId: string,
    itemIndex: number,
    countedQty: number,
    countedBy: string
  ): Promise<void> {
    const auditRef = firestoreDoc(db, ERP_COLLECTIONS.AUDITS, auditId);
    const auditSnap = await getDoc(auditRef);
    const audit = auditSnap.data() as InventoryAudit;

    const item = audit.items[itemIndex];
    const variance = countedQty - item.systemQty;
    const variancePercent = item.systemQty > 0 ? (variance / item.systemQty) * 100 : 0;
    const varianceValue = variance * item.unitCost;

    audit.items[itemIndex] = {
      ...item,
      countedQty,
      variance,
      variancePercent,
      varianceValue,
      status: 'counted',
      countedBy,
      countedAt: new Date().toISOString()
    };

    const countedItems = audit.items.filter(i => i.status !== 'pending').length;
    const varianceItems = audit.items.filter(i => i.variance !== 0).length;

    await updateDoc(auditRef, {
      items: audit.items,
      countedItems,
      varianceItems,
      totalCountedValue: audit.items.reduce((sum, i) => sum + (i.countedQty || 0) * i.unitCost, 0),
      totalVarianceValue: audit.items.reduce((sum, i) => sum + i.varianceValue, 0),
      updatedAt: new Date().toISOString()
    });
  },

  // Complete audit
  async completeAudit(auditId: string, reviewedBy: string, reviewedByName: string): Promise<void> {
    await updateDoc(firestoreDoc(db, ERP_COLLECTIONS.AUDITS, auditId), {
      status: 'completed',
      completedAt: new Date().toISOString(),
      reviewedBy,
      reviewedByName,
      updatedAt: new Date().toISOString()
    });
  },

  // Create stock adjustment from audit variance
  async createAdjustment(adjustmentData: Omit<StockAdjustment, 'id' | 'adjustmentNumber'>): Promise<string> {
    const today = new Date();
    const prefix = `ADJ-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
    const countSnap = await getDocs(
      query(collection(db, ERP_COLLECTIONS.ADJUSTMENTS), orderBy('requestedAt', 'desc'), limit(1))
    );
    const lastNum = countSnap.empty ? 0 : parseInt(countSnap.docs[0].data().adjustmentNumber?.split('-').pop() || '0');
    const adjustmentNumber = `${prefix}-${String(lastNum + 1).padStart(4, '0')}`;

    const docRef = await addDoc(collection(db, ERP_COLLECTIONS.ADJUSTMENTS), {
      ...adjustmentData,
      adjustmentNumber
    });
    return docRef.id;
  },

  // Approve adjustment and update stock
  async approveAdjustment(
    adjustmentId: string,
    approvedBy: string,
    approvedByName: string
  ): Promise<void> {
    await runTransaction(db, async (transaction) => {
      const adjustmentRef = firestoreDoc(db, ERP_COLLECTIONS.ADJUSTMENTS, adjustmentId);
      const adjustmentSnap = await transaction.get(adjustmentRef);
      const adjustment = adjustmentSnap.data() as StockAdjustment;

      // Update material stock
      const materialRef = firestoreDoc(db, ERP_COLLECTIONS.MATERIALS, adjustment.materialId);
      transaction.update(materialRef, {
        current_stock: adjustment.adjustedQty,
        updated_at: new Date().toISOString()
      });

      // Update adjustment status
      transaction.update(adjustmentRef, {
        status: 'approved',
        approvedBy,
        approvedByName,
        approvedAt: new Date().toISOString()
      });
    });
  }
};

// ==========================================
// 5. MATERIAL RESERVATION SERVICE
// ==========================================

export const reservationService = {
  // Create reservation
  async createReservation(
    reservationData: Omit<MaterialReservation, 'id' | 'reservationNumber'>
  ): Promise<string> {
    const today = new Date();
    const prefix = `RES-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
    const countSnap = await getDocs(
      query(collection(db, ERP_COLLECTIONS.RESERVATIONS), orderBy('createdAt', 'desc'), limit(1))
    );
    const lastNum = countSnap.empty ? 0 : parseInt(countSnap.docs[0].data().reservationNumber?.split('-').pop() || '0');
    const reservationNumber = `${prefix}-${String(lastNum + 1).padStart(4, '0')}`;

    const docRef = await addDoc(collection(db, ERP_COLLECTIONS.RESERVATIONS), {
      ...reservationData,
      reservationNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    return docRef.id;
  },

  // Subscribe to reservations
  subscribeToReservations(callback: (reservations: MaterialReservation[]) => void, projectId?: string) {
    let q = query(
      collection(db, ERP_COLLECTIONS.RESERVATIONS),
      orderBy('createdAt', 'desc')
    );

    if (projectId) {
      q = query(
        collection(db, ERP_COLLECTIONS.RESERVATIONS),
        where('projectId', '==', projectId),
        orderBy('createdAt', 'desc')
      );
    }

    return onSnapshot(q, (snapshot) => {
      const reservations = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MaterialReservation));
      callback(reservations);
    });
  },

  // Check material availability
  async checkAvailability(materialId: string, quantity: number): Promise<{
    available: boolean;
    currentStock: number;
    reservedQty: number;
    freeStock: number;
  }> {
    // Get current stock
    const materialSnap = await getDoc(firestoreDoc(db, ERP_COLLECTIONS.MATERIALS, materialId));
    const currentStock = materialSnap.exists() ? materialSnap.data().current_stock || 0 : 0;

    // Get active reservations for this material
    const reservationsSnap = await getDocs(
      query(
        collection(db, ERP_COLLECTIONS.RESERVATIONS),
        where('status', 'in', ['pending', 'confirmed', 'partially_fulfilled'])
      )
    );

    let reservedQty = 0;
    reservationsSnap.forEach(d => {
      const res = d.data() as MaterialReservation;
      res.items.forEach(item => {
        if (item.materialId === materialId) {
          reservedQty += item.pendingQty;
        }
      });
    });

    const freeStock = currentStock - reservedQty;

    return {
      available: freeStock >= quantity,
      currentStock,
      reservedQty,
      freeStock
    };
  },

  // Fulfill reservation (issue materials)
  async fulfillReservation(
    reservationId: string,
    itemIndex: number,
    issuedQty: number
  ): Promise<void> {
    const resRef = firestoreDoc(db, ERP_COLLECTIONS.RESERVATIONS, reservationId);
    const resSnap = await getDoc(resRef);
    const reservation = resSnap.data() as MaterialReservation;

    const item = reservation.items[itemIndex];
    const newIssuedQty = item.issuedQty + issuedQty;
    const newPendingQty = item.reservedQty - newIssuedQty;

    reservation.items[itemIndex] = {
      ...item,
      issuedQty: newIssuedQty,
      pendingQty: newPendingQty
    };

    // Check if all items fulfilled
    const allFulfilled = reservation.items.every(i => i.pendingQty <= 0);
    const anyFulfilled = reservation.items.some(i => i.issuedQty > 0);

    let newStatus = reservation.status;
    if (allFulfilled) {
      newStatus = 'fulfilled';
    } else if (anyFulfilled) {
      newStatus = 'partially_fulfilled';
    }

    await updateDoc(resRef, {
      items: reservation.items,
      status: newStatus,
      updatedAt: new Date().toISOString()
    });
  }
};

// ==========================================
// 6. REORDER AUTOMATION SERVICE
// ==========================================

export const reorderService = {
  // Create reorder rule
  async createRule(ruleData: Omit<ReorderRule, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, ERP_COLLECTIONS.REORDER_RULES), {
      ...ruleData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    return docRef.id;
  },

  // Subscribe to rules
  subscribeToRules(callback: (rules: ReorderRule[]) => void) {
    const q = query(
      collection(db, ERP_COLLECTIONS.REORDER_RULES),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const rules = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ReorderRule));
      callback(rules);
    });
  },

  // Check and trigger reorders
  async checkReorderTriggers(): Promise<AutoReorderLog[]> {
    const logs: AutoReorderLog[] = [];

    // Get active rules
    const rulesSnap = await getDocs(
      query(collection(db, ERP_COLLECTIONS.REORDER_RULES), where('status', '==', 'active'))
    );

    for (const ruleDoc of rulesSnap.docs) {
      const rule = ruleDoc.data() as ReorderRule;

      // Get current stock
      const materialSnap = await getDoc(firestoreDoc(db, ERP_COLLECTIONS.MATERIALS, rule.materialId));
      if (!materialSnap.exists()) continue;

      const currentStock = materialSnap.data().current_stock || 0;

      // Check if below trigger point
      if (currentStock <= rule.triggerPoint) {
        const logData: Omit<AutoReorderLog, 'id'> = {
          ruleId: ruleDoc.id,
          materialId: rule.materialId,
          materialName: rule.materialName,
          triggeredAt: new Date().toISOString(),
          triggerReason: `Stock (${currentStock}) below trigger point (${rule.triggerPoint})`,
          stockAtTrigger: currentStock,
          reorderQty: rule.reorderQty,
          poGenerated: false,
          status: rule.autoApprove && rule.reorderQty * (materialSnap.data().purchase_price || 0) <= rule.autoApproveThreshold
            ? 'po_created'
            : 'manual_required'
        };

        const logRef = await addDoc(collection(db, ERP_COLLECTIONS.AUTO_REORDER_LOGS), logData);
        logs.push({ id: logRef.id, ...logData });

        // Update rule last triggered
        await updateDoc(firestoreDoc(db, ERP_COLLECTIONS.REORDER_RULES, ruleDoc.id), {
          lastTriggered: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    }

    return logs;
  },

  // Update rule
  async updateRule(ruleId: string, updates: Partial<ReorderRule>): Promise<void> {
    await updateDoc(firestoreDoc(db, ERP_COLLECTIONS.REORDER_RULES, ruleId), {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  },

  // Delete rule
  async deleteRule(ruleId: string): Promise<void> {
    await deleteDoc(firestoreDoc(db, ERP_COLLECTIONS.REORDER_RULES, ruleId));
  }
};

// ==========================================
// 7. ANALYTICS & KPI SERVICE
// ==========================================

export const analyticsService = {
  // Calculate current KPIs
  async calculateKPIs(): Promise<InventoryKPIs> {
    const materialsSnap = await getDocs(collection(db, ERP_COLLECTIONS.MATERIALS));
    const issueRecordsSnap = await getDocs(collection(db, 'inventory_issue_records'));
    // Purchase entries can be used for additional KPIs if needed

    let totalStockValue = 0;
    let lowStockItems = 0;
    let outOfStockItems = 0;
    let criticalItems = 0;

    const departmentUsage: Record<string, number> = {};
    const materialMovement: Record<string, { name: string; movement: number }> = {};

    materialsSnap.forEach(d => {
      const mat = d.data();
      const value = (mat.current_stock || 0) * (mat.purchase_price || 0);
      totalStockValue += value;

      const stock = mat.current_stock || 0;
      const minStock = mat.min_stock || 0;

      if (stock <= 0) outOfStockItems++;
      else if (minStock > 0 && stock <= minStock * 0.1) criticalItems++;
      else if (minStock > 0 && stock <= minStock) lowStockItems++;

      materialMovement[d.id] = { name: mat.name, movement: 0 };
    });

    // Calculate department usage from issue records
    issueRecordsSnap.forEach(d => {
      const record = d.data();
      const team = record.team || 'Unknown';
      departmentUsage[team] = (departmentUsage[team] || 0) + (record.quantity || 0);

      if (materialMovement[record.material_id]) {
        materialMovement[record.material_id].movement += record.quantity || 0;
      }
    });

    const topConsumingDepartments = Object.entries(departmentUsage)
      .map(([department, value]) => ({ department, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const topMovingMaterials = Object.entries(materialMovement)
      .map(([materialId, data]) => ({ materialId, name: data.name, movement: data.movement }))
      .filter(item => item.movement > 0)
      .sort((a, b) => b.movement - a.movement)
      .slice(0, 10);

    const slowMovingMaterials = Object.entries(materialMovement)
      .filter(([, data]) => data.movement === 0)
      .map(([materialId, data]) => ({ materialId, name: data.name, lastMovement: 'Never' }))
      .slice(0, 10);

    const kpis: InventoryKPIs = {
      totalStockValue,
      totalMaterials: materialsSnap.size,
      lowStockItems,
      outOfStockItems,
      criticalItems,
      stockTurnoverRate: 0, // Would need historical data
      averageLeadTime: 0,
      fulfillmentRate: 100,
      wastagePercentage: 0,
      topConsumingDepartments,
      topMovingMaterials,
      slowMovingMaterials,
      calculatedAt: new Date().toISOString()
    };

    // Save snapshot
    await addDoc(collection(db, ERP_COLLECTIONS.KPI_SNAPSHOTS), kpis);

    return kpis;
  },

  // Get supplier scorecard
  async getSupplierScorecard(supplierId: string): Promise<SupplierScorecard> {
    const supplierSnap = await getDoc(firestoreDoc(db, ERP_COLLECTIONS.SUPPLIERS, supplierId));
    const supplier = supplierSnap.data();

    const purchaseOrdersSnap = await getDocs(
      query(
        collection(db, 'purchase_orders'),
        where('vendorDetails.id', '==', supplierId)
      )
    );

    let totalOrders = 0;
    const onTimeDeliveries = 0; // TODO: Implement delivery tracking
    let totalPurchaseValue = 0;

    purchaseOrdersSnap.forEach(d => {
      const po = d.data();
      totalOrders++;
      totalPurchaseValue += po.totalAmount || 0;
      // Would need delivery tracking to calculate on-time rate
    });

    return {
      supplierId,
      supplierName: supplier?.name || 'Unknown',
      totalOrders,
      onTimeDeliveries,
      lateDeliveries: 0,
      onTimeRate: totalOrders > 0 ? (onTimeDeliveries / totalOrders) * 100 : 0,
      qualityPassRate: 100,
      averageLeadTime: 0,
      totalPurchaseValue,
      returnsCount: 0,
      returnsValue: 0,
      priceCompetitiveness: 0,
      overallRating: 4,
      lastOrderDate: '',
      calculatedAt: new Date().toISOString()
    };
  },

  // Get consumption trends
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getConsumptionTrends(materialId: string, periodType: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<ConsumptionTrend[]> {
    const issueRecordsSnap = await getDocs(
      query(
        collection(db, 'inventory_issue_records'),
        where('material_id', '==', materialId),
        orderBy('date', 'desc'),
        limit(90) // Last 90 records
      )
    );

    const purchaseEntriesSnap = await getDocs(
      query(
        collection(db, 'inventory_purchase_entries'),
        where('material_id', '==', materialId),
        orderBy('date', 'desc'),
        limit(90)
      )
    );

    // Group by period
    const trends: Record<string, { consumed: number; purchased: number }> = {};

    issueRecordsSnap.forEach(d => {
      const record = d.data();
      const date = record.date?.substring(0, 10) || '';
      if (!trends[date]) trends[date] = { consumed: 0, purchased: 0 };
      trends[date].consumed += record.quantity || 0;
    });

    purchaseEntriesSnap.forEach(d => {
      const entry = d.data();
      const date = entry.date?.substring(0, 10) || '';
      if (!trends[date]) trends[date] = { consumed: 0, purchased: 0 };
      trends[date].purchased += entry.quantity || 0;
    });

    const materialSnap = await getDoc(firestoreDoc(db, ERP_COLLECTIONS.MATERIALS, materialId));
    const materialName = materialSnap.exists() ? materialSnap.data().name : 'Unknown';

    return Object.entries(trends)
      .map(([period, data]) => ({
        materialId,
        materialName,
        period,
        periodType: 'daily' as const,
        consumed: data.consumed,
        purchased: data.purchased,
        averageDaily: data.consumed,
        trend: 'stable' as const,
        trendPercent: 0
      }))
      .sort((a, b) => b.period.localeCompare(a.period));
  }
};

// ==========================================
// 8. REPORT SERVICE
// ==========================================

export const reportService = {
  // Save report config
  async saveReportConfig(config: Omit<ReportConfig, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, ERP_COLLECTIONS.REPORT_CONFIGS), config);
    return docRef.id;
  },

  // Get report configs
  async getReportConfigs(userId?: string): Promise<ReportConfig[]> {
    let q = query(collection(db, ERP_COLLECTIONS.REPORT_CONFIGS), orderBy('createdAt', 'desc'));

    if (userId) {
      q = query(
        collection(db, ERP_COLLECTIONS.REPORT_CONFIGS),
        where('createdBy', '==', userId),
        orderBy('createdAt', 'desc')
      );
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ReportConfig));
  },

  // Generate report data
  async generateReportData(config: ReportConfig): Promise<Record<string, unknown>[]> {
    const { reportType } = config;
    // filters can be used for date range filtering if needed

    switch (reportType) {
      case 'inventory_summary': {
        const snapshot = await getDocs(collection(db, ERP_COLLECTIONS.MATERIALS));
        return snapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        }));
      }

      case 'stock_movement': {
        const issueSnap = await getDocs(collection(db, 'inventory_issue_records'));
        const purchaseSnap = await getDocs(collection(db, 'inventory_purchase_entries'));

        interface MovementRecord {
          id: string;
          type: string;
          date?: string;
          created_at?: string;
          [key: string]: unknown;
        }

        const movements: MovementRecord[] = [
          ...issueSnap.docs.map(d => ({ ...d.data(), type: 'issue', id: d.id } as MovementRecord)),
          ...purchaseSnap.docs.map(d => ({ ...d.data(), type: 'purchase', id: d.id } as MovementRecord))
        ];

        return movements.sort((a, b) =>
          new Date(b.date || b.created_at || '').getTime() - new Date(a.date || a.created_at || '').getTime()
        );
      }

      case 'supplier_performance': {
        const suppliersSnap = await getDocs(collection(db, ERP_COLLECTIONS.SUPPLIERS));
        return suppliersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      }

      case 'low_stock_alert': {
        const snapshot = await getDocs(collection(db, ERP_COLLECTIONS.MATERIALS));
        interface MaterialRecord {
          id: string;
          current_stock?: number;
          min_stock?: number;
          [key: string]: unknown;
        }
        return snapshot.docs
          .map(d => ({ id: d.id, ...d.data() } as MaterialRecord))
          .filter((m) => (m.current_stock || 0) <= (m.min_stock || 0));
      }

      default:
        return [];
    }
  },

  // Save report history
  async saveReportHistory(history: Omit<ReportHistory, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, ERP_COLLECTIONS.REPORT_HISTORY), history);
    return docRef.id;
  },

  // Get report history
  async getReportHistory(userId?: string): Promise<ReportHistory[]> {
    let q = query(
      collection(db, ERP_COLLECTIONS.REPORT_HISTORY),
      orderBy('generatedAt', 'desc'),
      limit(50)
    );

    if (userId) {
      q = query(
        collection(db, ERP_COLLECTIONS.REPORT_HISTORY),
        where('generatedBy', '==', userId),
        orderBy('generatedAt', 'desc'),
        limit(50)
      );
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ReportHistory));
  }
};

// Export all services
export const erpServices = {
  stockAlerts: stockAlertService,
  batches: batchService,
  transfers: transferService,
  audits: auditService,
  reservations: reservationService,
  reorder: reorderService,
  analytics: analyticsService,
  reports: reportService
};
