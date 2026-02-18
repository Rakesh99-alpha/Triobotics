'use client';

import { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner'; 
import { Package, User, FileText, Send, AlertCircle } from 'lucide-react';

export const IssueMaterialFormDB = () => {
  // --- STATE ---
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    materialId: '',
    quantity: '',
    issuedTo: '', 
    department: '',
    notes: ''
  });

  // --- 1. LOAD INVENTORY ---
  useEffect(() => {
    // Added error handling to the snapshot listener
    const q = query(collection(db, 'inventory'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMaterials(list);
    }, (error) => {
      console.error("Error fetching inventory:", error);
    });
    return () => unsubscribe();
  }, []);

  // --- 2. HANDLE SUBMIT ---
  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.materialId || !formData.quantity || !formData.issuedTo) {
        toast.error("Please fill all required fields");
        setLoading(false);
        return;
      }

      const selectedMaterial = materials.find(m => m.id === formData.materialId);
      if (!selectedMaterial) {
        toast.error("Invalid Material Selected");
        setLoading(false);
        return;
      }

      const issueQty = Number(formData.quantity);
      const currentStock = Number(selectedMaterial.stock);

      if (issueQty > currentStock) {
        toast.error(`Insufficient Stock! Available: ${currentStock}`);
        setLoading(false);
        return;
      }

      // Record Transaction
      await addDoc(collection(db, 'inventory_transactions'), {
        type: 'out',
        materialId: selectedMaterial.id,
        materialName: selectedMaterial.name,
        quantity: issueQty,
        takenBy: formData.issuedTo,
        department: formData.department,
        notes: formData.notes,
        date: new Date().toISOString().split('T')[0],
        createdAt: Timestamp.now()
      });

      // Update Stock
      await updateDoc(doc(db, 'inventory', selectedMaterial.id), {
        stock: currentStock - issueQty,
        lastUpdated: Timestamp.now()
      });

      toast.success("Material Issued Successfully");
      
      setFormData({
        materialId: '',
        quantity: '',
        issuedTo: '',
        department: '',
        notes: ''
      });

    } catch (error) {
      console.error("Error issuing material:", error);
      toast.error("Failed to issue material");
    } finally {
      setLoading(false);
    }
  };

  // --- RENDER ---
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
        <div className="p-2 bg-red-50 rounded-lg text-red-600">
          <Send className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-bold text-lg text-gray-800">Issue Material</h2>
          <p className="text-xs text-gray-500">Record stock consumption/outward</p>
        </div>
      </div>

      <form onSubmit={handleIssue} className="space-y-4">
        
        {/* Material Selection - FIXED KEY ERROR */}
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Select Material</label>
          <div className="relative">
            <Package className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <select 
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all appearance-none"
              value={formData.materialId}
              onChange={(e) => setFormData({...formData, materialId: e.target.value})}
            >
              <option value="">-- Choose Item --</option>
              {materials.map((item, index) => (
                // FIX: Used index as fallback key to prevent "same key" error
                <option key={item.id || index} value={item.id}>
                  {item.name} (Stock: {item.stock} {item.unit})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quantity & Issued To */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Quantity</label>
            <input 
              type="number"
              placeholder="0"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              value={formData.quantity}
              onChange={(e) => setFormData({...formData, quantity: e.target.value})}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Issued To</label>
            <div className="relative">
              <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input 
                type="text"
                placeholder="Employee Name"
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                value={formData.issuedTo}
                onChange={(e) => setFormData({...formData, issuedTo: e.target.value})}
              />
            </div>
          </div>
        </div>

        {/* Department & Notes */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Department</label>
            <select 
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20"
              value={formData.department}
              onChange={(e) => setFormData({...formData, department: e.target.value})}
            >
              <option value="">-- Select --</option>
              <option value="Production">Production</option>
              <option value="Assembly">Assembly</option>
              <option value="Quality">Quality</option>
              <option value="Maintenance">Maintenance</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Notes</label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input 
                type="text"
                placeholder="Reason..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button 
          type="submit"
          disabled={loading}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
        >
          {loading ? (
            "Processing..."
          ) : (
            <>
              <AlertCircle className="w-4 h-4" /> Confirm Issue
            </>
          )}
        </button>

      </form>
    </div>
  );
};