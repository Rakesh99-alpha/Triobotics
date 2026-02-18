/**
 * Enhanced Store Services
 * Firebase operations for advanced inventory features
 */

import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  runTransaction
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type {
  BatchInfo,
  StockTransfer,
  QualityInspection,
  VendorReturn,
  StockAlert,
  StockAdjustment,
  StockMovement,
  ReorderSuggestion,
  ExpiryTracking,
  StorageLocation
} from '@/types/store-enhanced';

// Collection names
export const STORE_COLLECTIONS = {
  BATCHES: 'inventory_batches',
  LOCATIONS: 'inventory_locations',
  TRANSFERS: 'stock_transfers',
  QC_INSPECTIONS: 'qc_inspections',
  VENDOR_RETURNS: 'vendor_returns',
  ALERTS: 'stock_alerts',
  ADJUSTMENTS: 'stock_adjustments',
  MOVEMENTS: 'stock_movements',
  REORDER_SUGGESTIONS: 'reorder_suggestions',
  EXPIRY_TRACKING: 'expiry_tracking'
};

// ==========================================
// BATCH TRACKING
// ==========================================

export const createBatch = async (batch: Omit<BatchInfo, 'id' | 'createdAt' | 'updatedAt'>) => {
  const now = new Date().toISOString();
  const docRef = await addDoc(collection(db, STORE_COLLECTIONS.BATCHES), {
    ...batch,
    createdAt: now,
    updatedAt: now
  });
  return docRef.id;
};

export const updateBatch = async (batchId: string, updates: Partial<BatchInfo>) => {
  await updateDoc(doc(db, STORE_COLLECTIONS.BATCHES, batchId), {
    ...updates,
    updatedAt: new Date().toISOString()
  });
};

export const subscribeToBatches = (materialId: string, callback: (batches: BatchInfo[]) => void) => {
  const q = query(
    collection(db, STORE_COLLECTIONS.BATCHES),
    where('materialId', '==', materialId)
  );
  return onSnapshot(q, (snapshot) => {
    const batches = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as BatchInfo[];
    // Sort in JavaScript to avoid composite index
    batches.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    callback(batches);
  });
};

// ==========================================
// STORAGE LOCATIONS
// ==========================================

export const createLocation = async (location: Omit<StorageLocation, 'id'>) => {
  const docRef = await addDoc(collection(db, STORE_COLLECTIONS.LOCATIONS), location);
  return docRef.id;
};

export const subscribeToLocations = (callback: (locations: StorageLocation[]) => void) => {
  const q = query(collection(db, STORE_COLLECTIONS.LOCATIONS), where('isActive', '==', true));
  return onSnapshot(q, (snapshot) => {
    const locations = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as StorageLocation[];
    callback(locations);
  });
};

// ==========================================
// STOCK TRANSFERS
// ==========================================

export const createStockTransfer = async (transfer: Omit<StockTransfer, 'id' | 'requestedAt'>) => {
  const docRef = await addDoc(collection(db, STORE_COLLECTIONS.TRANSFERS), {
    ...transfer,
    requestedAt: new Date().toISOString(),
    status: 'pending'
  });
  return docRef.id;
};

export const approveStockTransfer = async (transferId: string, approvedBy: string) => {
  await updateDoc(doc(db, STORE_COLLECTIONS.TRANSFERS, transferId), {
    status: 'approved',
    approvedBy,
    approvedAt: new Date().toISOString()
  });
};

export const completeStockTransfer = async (transferId: string, transferredBy: string) => {
  await runTransaction(db, async (transaction) => {
    const transferRef = doc(db, STORE_COLLECTIONS.TRANSFERS, transferId);
    transaction.update(transferRef, {
      status: 'completed',
      transferredBy,
      completedAt: new Date().toISOString()
    });
    
    // Record stock movement
    const movementData: Omit<StockMovement, 'date'> = {
      materialId: '', // Will be filled from transfer data
      materialName: '',
      type: 'transfer',
      quantity: 0,
      unit: '',
      reference: transferId
    };
    
    await addDoc(collection(db, STORE_COLLECTIONS.MOVEMENTS), {
      ...movementData,
      date: new Date().toISOString()
    });
  });
};

export const subscribeToTransfers = (
  status: StockTransfer['status'] | 'all',
  callback: (transfers: StockTransfer[]) => void
) => {
  const q = status === 'all' 
    ? query(collection(db, STORE_COLLECTIONS.TRANSFERS), orderBy('requestedAt', 'desc'))
    : query(
        collection(db, STORE_COLLECTIONS.TRANSFERS),
        where('status', '==', status)
      );
  
  return onSnapshot(q, (snapshot) => {
    const transfers = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as StockTransfer[];
    // Sort in JavaScript when filtering by status to avoid composite index
    if (status !== 'all') {
      transfers.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
    }
    callback(transfers);
  });
};

// ==========================================
// QUALITY CONTROL
// ==========================================

export const createQCInspection = async (inspection: Omit<QualityInspection, 'id' | 'inspectionDate'>) => {
  const docRef = await addDoc(collection(db, STORE_COLLECTIONS.QC_INSPECTIONS), {
    ...inspection,
    inspectionDate: new Date().toISOString()
  });
  return docRef.id;
};

export const updateQCInspection = async (inspectionId: string, updates: Partial<QualityInspection>) => {
  await updateDoc(doc(db, STORE_COLLECTIONS.QC_INSPECTIONS, inspectionId), updates);
};

export const subscribeToQCInspections = (callback: (inspections: QualityInspection[]) => void) => {
  const q = query(
    collection(db, STORE_COLLECTIONS.QC_INSPECTIONS),
    orderBy('inspectionDate', 'desc')
  );
  return onSnapshot(q, (snapshot) => {
    const inspections = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as QualityInspection[];
    callback(inspections);
  });
};

// ==========================================
// VENDOR RETURNS
// ==========================================

export const createVendorReturn = async (vendorReturn: Omit<VendorReturn, 'id' | 'initiatedAt'>) => {
  const docRef = await addDoc(collection(db, STORE_COLLECTIONS.VENDOR_RETURNS), {
    ...vendorReturn,
    initiatedAt: new Date().toISOString(),
    status: 'initiated'
  });
  return docRef.id;
};

export const updateVendorReturn = async (returnId: string, updates: Partial<VendorReturn>) => {
  await updateDoc(doc(db, STORE_COLLECTIONS.VENDOR_RETURNS, returnId), updates);
};

export const subscribeToVendorReturns = (callback: (returns: VendorReturn[]) => void) => {
  const q = query(
    collection(db, STORE_COLLECTIONS.VENDOR_RETURNS),
    orderBy('initiatedAt', 'desc')
  );
  return onSnapshot(q, (snapshot) => {
    const returns = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as VendorReturn[];
    callback(returns);
  });
};

// ==========================================
// STOCK ALERTS
// ==========================================

export const createStockAlert = async (alert: Omit<StockAlert, 'id' | 'triggeredAt' | 'resolved'>) => {
  const docRef = await addDoc(collection(db, STORE_COLLECTIONS.ALERTS), {
    ...alert,
    triggeredAt: new Date().toISOString(),
    resolved: false
  });
  return docRef.id;
};

export const acknowledgeAlert = async (alertId: string, userId: string) => {
  await updateDoc(doc(db, STORE_COLLECTIONS.ALERTS, alertId), {
    acknowledgedBy: userId,
    acknowledgedAt: new Date().toISOString()
  });
};

export const resolveAlert = async (alertId: string) => {
  await updateDoc(doc(db, STORE_COLLECTIONS.ALERTS, alertId), {
    resolved: true,
    resolvedAt: new Date().toISOString()
  });
};

export const subscribeToAlerts = (
  includedResolved: boolean,
  callback: (alerts: StockAlert[]) => void
) => {
  const q = includedResolved
    ? query(collection(db, STORE_COLLECTIONS.ALERTS))
    : query(
        collection(db, STORE_COLLECTIONS.ALERTS),
        where('resolved', '==', false)
      );
  
  return onSnapshot(q, (snapshot) => {
    const alerts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as StockAlert[];
    // Sort in JavaScript to avoid composite index
    alerts.sort((a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime());
    callback(alerts);
  });
};

// ==========================================
// STOCK ADJUSTMENTS
// ==========================================

export const createStockAdjustment = async (adjustment: Omit<StockAdjustment, 'id' | 'adjustedAt'>) => {
  return await runTransaction(db, async (transaction) => {
    // Create adjustment record
    const adjustmentRef = doc(collection(db, STORE_COLLECTIONS.ADJUSTMENTS));
    transaction.set(adjustmentRef, {
      ...adjustment,
      adjustedAt: new Date().toISOString()
    });
    
    // Update material stock
    const materialRef = doc(db, 'inventory_materials', adjustment.materialId);
    transaction.update(materialRef, {
      current_stock: adjustment.adjustedStock,
      updated_at: new Date().toISOString()
    });
    
    // Record stock movement
    const movementRef = doc(collection(db, STORE_COLLECTIONS.MOVEMENTS));
    transaction.set(movementRef, {
      date: new Date().toISOString(),
      materialId: adjustment.materialId,
      materialName: adjustment.materialName,
      type: 'adjustment',
      quantity: adjustment.difference,
      unit: '',
      reference: adjustmentRef.id,
      value: adjustment.cost
    });
    
    return adjustmentRef.id;
  });
};

export const subscribeToAdjustments = (callback: (adjustments: StockAdjustment[]) => void) => {
  const q = query(
    collection(db, STORE_COLLECTIONS.ADJUSTMENTS),
    orderBy('adjustedAt', 'desc')
  );
  return onSnapshot(q, (snapshot) => {
    const adjustments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as StockAdjustment[];
    callback(adjustments);
  });
};

// ==========================================
// REORDER SUGGESTIONS
// ==========================================

export const generateReorderSuggestions = async (materials: { id: string; name: string; current_stock: number; min_stock: number; purchase_price: number }[], issues: { material_id: string; quantity: number; issued_at: string }[]) => {
  // Calculate consumption trends
  const suggestions: ReorderSuggestion[] = [];
  
  for (const material of materials) {
    if (material.current_stock <= material.min_stock * 1.2) {
      // Calculate average consumption (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentIssues = issues.filter(issue => 
        issue.material_id === material.id &&
        new Date(issue.issued_at) >= thirtyDaysAgo
      );
      
      const totalIssued = recentIssues.reduce((sum, issue) => sum + issue.quantity, 0);
      const avgDailyConsumption = totalIssued / 30;
      const leadTime = 7; // Default 7 days
      
      const suggestedQty = Math.ceil(
        (avgDailyConsumption * leadTime) + material.min_stock - material.current_stock
      );
      
      if (suggestedQty > 0) {
        suggestions.push({
          materialId: material.id,
          materialName: material.name,
          currentStock: material.current_stock,
          minStock: material.min_stock,
          avgConsumption: avgDailyConsumption,
          leadTime,
          suggestedQty,
          suggestedDate: new Date().toISOString(),
          priority: material.current_stock === 0 ? 'urgent' : 
                   material.current_stock < material.min_stock ? 'high' : 'normal',
          estimatedCost: suggestedQty * (material.purchase_price || 0)
        });
      }
    }
  }
  
  // Save suggestions to Firestore
  const batch = suggestions.slice(0, 20); // Limit to 20 suggestions
  for (const suggestion of batch) {
    await addDoc(collection(db, STORE_COLLECTIONS.REORDER_SUGGESTIONS), suggestion);
  }
  
  return suggestions;
};

// ==========================================
// EXPIRY TRACKING
// ==========================================

export const trackExpiringItems = async (batches: BatchInfo[]) => {
  const today = new Date();
  const expiryItems: ExpiryTracking[] = [];
  
  for (const batch of batches) {
    if (batch.expiryDate) {
      const expiryDate = new Date(batch.expiryDate);
      const daysToExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      let status: ExpiryTracking['status'] = 'fresh';
      if (daysToExpiry < 0) status = 'expired';
      else if (daysToExpiry <= 30) status = 'expiring_soon';
      
      if (status !== 'fresh') {
        expiryItems.push({
          id: batch.id,
          materialId: batch.materialId,
          materialName: '', // Will be filled from material data
          batchNumber: batch.batchNumber,
          quantity: batch.quantity,
          expiryDate: batch.expiryDate,
          daysToExpiry,
          status,
          location: batch.location,
          alertSent: false
        });
      }
    }
  }
  
  return expiryItems;
};

// ==========================================
// ANALYTICS HELPERS
// ==========================================

export const calculateInventoryAnalytics = (
  materials: { category?: string; current_stock: number; purchase_price: number; min_stock: number }[]
) => {
  const totalValue = materials.reduce((sum, m) => 
    sum + (m.current_stock * (m.purchase_price || 0)), 0
  );
  
  const lowStockItems = materials.filter(m => m.current_stock <= m.min_stock).length;
  const outOfStock = materials.filter(m => m.current_stock === 0).length;
  
  // Category breakdown
  const categoryMap = new Map<string, { itemCount: number; totalValue: number }>();
  materials.forEach(m => {
    const cat = m.category || 'Uncategorized';
    if (!categoryMap.has(cat)) {
      categoryMap.set(cat, { itemCount: 0, totalValue: 0 });
    }
    const stats = categoryMap.get(cat)!;
    stats.itemCount++;
    stats.totalValue += m.current_stock * (m.purchase_price || 0);
  });
  
  const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, stats]) => ({
    category,
    itemCount: stats.itemCount,
    totalValue: stats.totalValue,
    percentage: (stats.totalValue / totalValue) * 100
  }));
  
  return {
    totalValue,
    totalItems: materials.length,
    lowStockItems,
    outOfStock,
    categoryBreakdown
  };
};
