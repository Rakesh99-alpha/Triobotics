'use client';

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc, 
  onSnapshot, 
  query, 
  orderBy,
  getDocs,
  getDoc,
  where
} from 'firebase/firestore';

export interface DBMaterial {
  id: string;
  code: string;
  name: string;
  unit: string;
  supplier_id: string | null;
  current_stock: number;
  min_stock?: number;
  purchase_price?: number;
  reorder_level?: number;
  created_at?: string;
  updated_at?: string;
}

export interface DBSupplier {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  contact_person?: string;
  gst?: string;
  relationship_start?: string;
  total_purchase_value?: number;
  materials_supplied?: any[];
  last_purchase_date?: string;
  created_at?: string;
}

export interface DBPurchaseEntry {
  id: string;
  material_id: string;
  supplier_id: string;
  quantity: number;
  unit_price: number;
  invoice_number: string | null;
  notes?: string;
  entered_by: string;
  date: string;
  created_at?: string;
}

export interface DBIssueRecord {
  id: string;
  material_id: string;
  quantity: number;
  team: string;
  project: string;
  entered_by: string;
  date: string;
  status?: 'issued' | 'in_progress' | 'completed' | 'returned';
  created_at?: string;
}

interface UseInventoryDataReturn {
  materials: DBMaterial[];
  suppliers: DBSupplier[];
  purchaseEntries: DBPurchaseEntry[];
  issueRecords: DBIssueRecord[];
  loading: boolean;
  addMaterial: (material: Omit<DBMaterial, 'id'>) => Promise<DBMaterial | void>;
  updateMaterial: (id: string, data: Partial<DBMaterial>) => Promise<void>;
  deleteMaterial: (id: string) => Promise<void>;
  addSupplier: (supplier: Omit<DBSupplier, 'id'>) => Promise<string>;
  addPurchaseEntry: (entry: Omit<DBPurchaseEntry, 'id' | 'created_at'>) => Promise<string>;
  addIssueRecord: (record: Omit<DBIssueRecord, 'id' | 'created_at'>) => Promise<string>;
}

const MATERIALS_COLLECTION = 'inventory_materials';
const SUPPLIERS_COLLECTION = 'inventory_suppliers';
const PURCHASE_ENTRIES_COLLECTION = 'inventory_purchase_entries';
const ISSUE_RECORDS_COLLECTION = 'inventory_issue_records';

export function useInventoryData(): UseInventoryDataReturn {
  const [materials, setMaterials] = useState<DBMaterial[]>([]);
  const [suppliers, setSuppliers] = useState<DBSupplier[]>([]);
  const [purchaseEntries, setPurchaseEntries] = useState<DBPurchaseEntry[]>([]);
  const [issueRecords, setIssueRecords] = useState<DBIssueRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Subscribe to real-time updates for materials
  useEffect(() => {
    const q = query(collection(db, MATERIALS_COLLECTION), orderBy('created_at', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DBMaterial[];
      setMaterials(data);
    }, (error) => {
      console.error("Error loading materials:", error);
      setMaterials([]);
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to real-time updates for suppliers
  useEffect(() => {
    const q = query(collection(db, SUPPLIERS_COLLECTION), orderBy('created_at', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DBSupplier[];
      setSuppliers(data);
    }, (error) => {
      console.error("Error loading suppliers:", error);
      setSuppliers([]);
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to real-time updates for purchase entries
  useEffect(() => {
    const q = query(collection(db, PURCHASE_ENTRIES_COLLECTION), orderBy('created_at', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DBPurchaseEntry[];
      setPurchaseEntries(data);
    }, (error) => {
      console.error("Error loading purchase entries:", error);
      setPurchaseEntries([]);
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to real-time updates for issue records
  useEffect(() => {
    const q = query(collection(db, ISSUE_RECORDS_COLLECTION), orderBy('created_at', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DBIssueRecord[];
      setIssueRecords(data);
      setLoading(false);
    }, (error) => {
      console.error("Error loading issue records:", error);
      setIssueRecords([]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const addMaterial = useCallback(async (material: Omit<DBMaterial, 'id'>) => {
    const docRef = await addDoc(collection(db, MATERIALS_COLLECTION), {
      ...material,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    return { id: docRef.id, ...material };
  }, []);

  const updateMaterial = useCallback(async (id: string, data: Partial<DBMaterial>) => {
    await updateDoc(doc(db, MATERIALS_COLLECTION, id), {
      ...data,
      updated_at: new Date().toISOString()
    });
  }, []);

  const deleteMaterial = useCallback(async (id: string) => {
    await deleteDoc(doc(db, MATERIALS_COLLECTION, id));
  }, []);

  const addSupplier = useCallback(async (supplier: Omit<DBSupplier, 'id'>) => {
    const docRef = await addDoc(collection(db, SUPPLIERS_COLLECTION), {
      ...supplier,
      created_at: new Date().toISOString()
    });
    return docRef.id;
  }, []);

  const addPurchaseEntry = useCallback(async (entry: Omit<DBPurchaseEntry, 'id' | 'created_at'>) => {
    // First, get the current material to update stock
    const materialRef = doc(db, MATERIALS_COLLECTION, entry.material_id);
    const materialSnap = await getDoc(materialRef);
    
    if (materialSnap.exists()) {
      const materialData = materialSnap.data() as DBMaterial;
      const newStock = materialData.current_stock + entry.quantity;
      
      // Update stock
      await updateDoc(materialRef, {
        current_stock: newStock,
        purchase_price: entry.unit_price, // Update last purchase price
        updated_at: new Date().toISOString()
      });
    } else {
      throw new Error('Material not found');
    }

    // Add the purchase entry
    const docRef = await addDoc(collection(db, PURCHASE_ENTRIES_COLLECTION), {
      ...entry,
      created_at: new Date().toISOString()
    });
    return docRef.id;
  }, []);

  const addIssueRecord = useCallback(async (record: Omit<DBIssueRecord, 'id' | 'created_at'>) => {
    // First, get the current material to check and update stock
    const materialRef = doc(db, MATERIALS_COLLECTION, record.material_id);
    const materialSnap = await getDoc(materialRef);
    
    if (materialSnap.exists()) {
      const materialData = materialSnap.data() as DBMaterial;
      const newStock = materialData.current_stock - record.quantity;
      
      if (newStock < 0) {
        throw new Error(`Insufficient stock. Available: ${materialData.current_stock} ${materialData.unit}`);
      }
      
      // Update stock
      await updateDoc(materialRef, {
        current_stock: newStock,
        updated_at: new Date().toISOString()
      });
    } else {
      throw new Error('Material not found');
    }

    // Add the issue record
    const docRef = await addDoc(collection(db, ISSUE_RECORDS_COLLECTION), {
      ...record,
      created_at: new Date().toISOString()
    });
    return docRef.id;
  }, []);

  return {
    materials,
    suppliers,
    purchaseEntries,
    issueRecords,
    loading,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    addSupplier,
    addPurchaseEntry,
    addIssueRecord
  };
}
