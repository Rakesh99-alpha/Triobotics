// ==========================================
// DELIVERY CHALLAN SERVICE
// ==========================================
// Firestore operations for DC management

import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  onSnapshot,
  getDocs,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

export interface DCItem {
  slNo: number;
  itemCode: string;
  description: string;
  hsnCode: string;
  quantity: number;
  unit: string;
  remarks?: string;
}

export interface DeliveryChallan {
  id?: string;
  dcNumber: string;
  dcDate: string;
  poNumber?: string;
  poDate?: string;
  
  // Consignor (From)
  consignorName: string;
  consignorAddress: string;
  consignorGSTIN: string;
  consignorStateCode: string;
  consignorPhone: string;
  
  // Consignee (To)
  consigneeName: string;
  consigneeAddress: string;
  consigneeGSTIN: string;
  consigneeStateCode: string;
  consigneePhone: string;
  
  // Transport Details
  transportMode: 'Road' | 'Rail' | 'Air' | 'Courier' | 'Hand Delivery';
  vehicleNumber?: string;
  driverName?: string;
  driverPhone?: string;
  lrNumber?: string;
  lrDate?: string;
  eWayBillNo?: string;
  eWayBillDate?: string;
  
  // Items
  items: DCItem[];
  
  // Reason
  reason: 'Supply' | 'Job Work' | 'Sales Return' | 'Approval' | 'Exhibition' | 'Personal Use' | 'Others';
  reasonRemarks?: string;
  
  // Additional
  preparedBy: string;
  checkedBy?: string;
  approvedBy?: string;
  remarks?: string;
  
  // Metadata
  createdAt?: Timestamp;
  createdBy?: string;
  updatedAt?: Timestamp;
  status?: 'draft' | 'dispatched' | 'delivered' | 'cancelled';
}

const DC_COLLECTION = 'delivery_challans';

// ==========================================
// CREATE DC
// ==========================================
export async function createDC(dcData: DeliveryChallan): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, DC_COLLECTION), {
      ...dcData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      status: dcData.status || 'draft',
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating DC:', error);
    throw error;
  }
}

// ==========================================
// UPDATE DC
// ==========================================
export async function updateDC(dcId: string, updates: Partial<DeliveryChallan>): Promise<void> {
  try {
    const dcRef = doc(db, DC_COLLECTION, dcId);
    await updateDoc(dcRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating DC:', error);
    throw error;
  }
}

// ==========================================
// DELETE DC
// ==========================================
export async function deleteDC(dcId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, DC_COLLECTION, dcId));
  } catch (error) {
    console.error('Error deleting DC:', error);
    throw error;
  }
}

// ==========================================
// SUBSCRIBE TO DCS (Real-time)
// ==========================================
export function subscribeToDCs(callback: (dcs: DeliveryChallan[]) => void): () => void {
  const q = query(collection(db, DC_COLLECTION), orderBy('createdAt', 'desc'));
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const dcs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as DeliveryChallan[];
    callback(dcs);
  }, (error) => {
    console.error('Error subscribing to DCs:', error);
  });
  
  return unsubscribe;
}

// ==========================================
// GET ALL DCS
// ==========================================
export async function getAllDCs(): Promise<DeliveryChallan[]> {
  try {
    const q = query(collection(db, DC_COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as DeliveryChallan[];
  } catch (error) {
    console.error('Error fetching DCs:', error);
    throw error;
  }
}

// ==========================================
// GENERATE DC NUMBER
// ==========================================
export function generateDCNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `DC-${year}${month}${day}-${random}`;
}
