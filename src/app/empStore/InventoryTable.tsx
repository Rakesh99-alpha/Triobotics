'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Edit, Trash2, AlertTriangle, CheckCircle, Package } from 'lucide-react';

// --- HELPER: Crash-Proof Date Formatter ---
const safeDate = (val: any) => {
  try {
    if (!val) return '-';
    // Handle Firestore Timestamp or Date object
    const date = val.toDate ? val.toDate() : new Date(val);
    if (isNaN(date.getTime())) return '-';

    // Manual format to avoid hydration mismatch
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('default', { month: 'short' });
    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    return `${day} ${month}, ${time}`;
  } catch (error) {
    return '-';
  }
};

export function InventoryTableDB({ 
  materials = [], 
  suppliers = [], 
  onEdit, 
  onDelete 
}: { 
  materials?: any[]; 
  suppliers?: any[]; 
  onEdit?: (material: any) => void; 
  onDelete?: (id: string) => void; 
}) {
  // Use passed materials instead of fetching
  const [isClient, setIsClient] = useState(false); // Hydration Fix

  useEffect(() => {
    setIsClient(true); // Signal that we are on the client
  }, []);

  // Delete Action
  const handleDelete = async (id: string) => {
    if (onDelete && confirm('Delete this item permanently?')) {
      await onDelete(id);
    }
  };

  // Prevent Server-Side Rendering of Dates (Fixes "Application Error")
  if (!isClient) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-medium uppercase text-xs">
          <tr>
            <th className="px-6 py-4">Item Name</th>
            <th className="px-6 py-4">Code</th>
            <th className="px-6 py-4 text-center">Stock</th>
            <th className="px-6 py-4 text-center">Status</th>
            <th className="px-6 py-4">Last Updated</th>
            <th className="px-6 py-4 text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {materials.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                <div className="flex flex-col items-center gap-2">
                  <Package className="w-8 h-8 opacity-20" />
                  <p>No inventory items found.</p>
                </div>
              </td>
            </tr>
          ) : (
            materials.map((material) => {
              const stock = Number(material.current_stock) || 0;
              const minStock = Number(material.min_stock) || 0;
              const isLow = stock <= minStock;
              const isOut = stock === 0;
              
              return (
                <tr key={material.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-gray-900">{material.name || 'Unnamed Item'}</td>
                  <td className="px-6 py-4 text-gray-500">{material.code || 'N/A'}</td>
                  
                  {/* Stock Column */}
                  <td className="px-6 py-4 text-center font-mono font-medium">
                    {stock} <span className="text-xs text-gray-400">{material.unit}</span>
                  </td>
                  
                  {/* Status Column */}
                  <td className="px-6 py-4 flex justify-center">
                    {isOut ? (
                      <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-bold flex items-center gap-1 w-fit">
                        <AlertTriangle className="w-3 h-3"/> Out
                      </span>
                    ) : isLow ? (
                      <span className="bg-yellow-100 text-yellow-600 px-2 py-1 rounded text-xs font-bold flex items-center gap-1 w-fit">
                        <AlertTriangle className="w-3 h-3"/> Low
                      </span>
                    ) : (
                      <span className="bg-green-100 text-green-600 px-2 py-1 rounded text-xs font-bold flex items-center gap-1 w-fit">
                        <CheckCircle className="w-3 h-3"/> OK
                      </span>
                    )}
                  </td>
                  
                  {/* Date Column (Protected) */}
                  <td className="px-6 py-4 text-xs text-gray-500">
                    {safeDate(material.updated_at || material.created_at)}
                  </td>
                  
                  {/* Actions */}
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {onEdit && (
                        <button onClick={() => onEdit(material)} className="p-2 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-lg">
                          <Edit className="w-4 h-4"/>
                        </button>
                      )}
                      {onDelete && (
                        <button onClick={() => handleDelete(material.id)} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg">
                          <Trash2 className="w-4 h-4"/>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}