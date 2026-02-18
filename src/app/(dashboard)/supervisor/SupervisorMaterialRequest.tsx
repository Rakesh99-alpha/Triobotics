'use client';

// ==========================================
// SUPERVISOR MATERIAL REQUEST COMPONENT
// ==========================================
// Allows supervisors to request materials from Purchase Team
// Links to: Purchase Page Material Requests tab

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  Plus,
  Send,
  Search,
  X,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Boxes,
  Loader2,
  Trash2
} from 'lucide-react';
import { db } from '@/lib/firebase/client';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';
import {
  createMaterialRequest,
  COLLECTIONS,
  MaterialRequest,
  MaterialRequestItem
} from '@/lib/services/integratedProcurementService';

// ==========================================
// ANIMATION VARIANTS
// ==========================================
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

// ==========================================
// INTERFACES
// ==========================================
interface Material {
  id: string;
  code: string;
  name: string;
  category: string;
  current_stock: number;
  min_stock: number;
  unit: string;
  purchase_price: number;
  supplier_name?: string;
}

interface RequestItemInput {
  material: Material | null;
  requestedQty: number;
  reason: string;
}

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function SupervisorMaterialRequest() {
  // State
  const [materials, setMaterials] = useState<Material[]>([]);
  const [myRequests, setMyRequests] = useState<MaterialRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [searchTerm, setSearchTerm] = useState('');
  
  // Current user info
  const [currentUser, setCurrentUser] = useState({ id: '', name: '', department: '' });
  
  // Form state
  const [requestItems, setRequestItems] = useState<RequestItemInput[]>([
    { material: null, requestedQty: 0, reason: '' }
  ]);
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [requiredDate, setRequiredDate] = useState('');
  const [overallReason, setOverallReason] = useState('');
  const [projectName, setProjectName] = useState('');
  
  // ==========================================
  // EFFECTS
  // ==========================================
  
  useEffect(() => {
    // Get current user from localStorage
    const storedUser = localStorage.getItem('currentUser');
    const userName = localStorage.getItem('currentUserName');
    
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setCurrentUser({
          id: user.uid || user.id || 'supervisor-1',
          name: user.name || user.displayName || userName || 'Supervisor',
          department: user.department || 'Production',
        });
      } catch {
        setCurrentUser({
          id: 'supervisor-1',
          name: userName || 'Supervisor',
          department: 'Production',
        });
      }
    } else {
      setCurrentUser({
        id: 'supervisor-1',
        name: userName || 'Supervisor',
        department: 'Production',
      });
    }
    
    // Load materials
    const unsubMaterials = onSnapshot(
      collection(db, 'inventory_materials'),
      (snapshot) => {
        const items: Material[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Material[];
        items.sort((a, b) => a.name?.localeCompare(b.name || '') || 0);
        setMaterials(items);
        setLoading(false);
      },
      (error) => {
        console.error('Error loading materials:', error);
        setLoading(false);
      }
    );
    
    // Load my requests
    const unsubRequests = onSnapshot(
      query(
        collection(db, COLLECTIONS.MATERIAL_REQUESTS),
        where('requestedByRole', '==', 'supervisor'),
        orderBy('createdAt', 'desc')
      ),
      (snapshot) => {
        const requests: MaterialRequest[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as MaterialRequest[];
        setMyRequests(requests);
      },
      (error) => {
        console.error('Error loading requests:', error);
      }
    );
    
    // Set default required date to 3 days from now
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 3);
    setRequiredDate(defaultDate.toISOString().split('T')[0]);
    
    return () => {
      unsubMaterials();
      unsubRequests();
    };
  }, []);
  
  // ==========================================
  // HANDLERS
  // ==========================================
  
  const addItemRow = () => {
    setRequestItems([...requestItems, { material: null, requestedQty: 0, reason: '' }]);
  };
  
  const removeItemRow = (index: number) => {
    if (requestItems.length > 1) {
      setRequestItems(requestItems.filter((_, i) => i !== index));
    }
  };
  
  const updateItemRow = (index: number, field: keyof RequestItemInput, value: unknown) => {
    const updated = [...requestItems];
    if (field === 'material') {
      updated[index].material = value as Material;
    } else if (field === 'requestedQty') {
      updated[index].requestedQty = value as number;
    } else if (field === 'reason') {
      updated[index].reason = value as string;
    }
    setRequestItems(updated);
  };
  
  const handleSubmitRequest = async () => {
    // Validate
    const validItems = requestItems.filter(item => item.material && item.requestedQty > 0);
    if (validItems.length === 0) {
      alert('Please add at least one material with quantity');
      return;
    }
    
    if (!overallReason.trim()) {
      alert('Please provide a reason for this request');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const items: MaterialRequestItem[] = validItems.map(item => ({
        materialId: item.material!.id,
        materialCode: item.material!.code,
        materialName: item.material!.name,
        currentStock: item.material!.current_stock || 0,
        requestedQty: item.requestedQty,
        unit: item.material!.unit || 'Pcs',
        estimatedPrice: item.material!.purchase_price || 0,
        reason: item.reason,
      }));
      
      await createMaterialRequest({
        requestedBy: currentUser.id,
        requestedByName: currentUser.name,
        requestedByRole: 'supervisor',
        department: currentUser.department,
        projectId: '',
        projectName: projectName || undefined,
        items,
        urgency,
        requiredDate,
        reason: overallReason,
      });
      
      alert('Material request submitted successfully! Purchase team will process it.');
      
      // Reset form
      setShowRequestModal(false);
      setRequestItems([{ material: null, requestedQty: 0, reason: '' }]);
      setOverallReason('');
      setProjectName('');
      setUrgency('medium');
      
    } catch (error) {
      console.error('Error submitting request:', error);
      alert('Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // ==========================================
  // RENDER
  // ==========================================
  
  const filteredMaterials = searchTerm
    ? materials.filter(m => 
        m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.code?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : materials;
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400';
      case 'approved': return 'bg-green-500/20 text-green-400';
      case 'converted_to_pr': return 'bg-blue-500/20 text-blue-400';
      case 'rejected': return 'bg-red-500/20 text-red-400';
      default: return 'bg-zinc-500/20 text-zinc-400';
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'approved': return <CheckCircle2 className="w-4 h-4" />;
      case 'converted_to_pr': return <Send className="w-4 h-4" />;
      case 'rejected': return <X className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Material Requests</h2>
            <p className="text-zinc-500 text-sm">Request materials from Purchase Team</p>
          </div>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowRequestModal(true)}
          className="px-4 py-2.5 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white rounded-xl flex items-center gap-2 font-medium shadow-lg shadow-orange-500/20"
        >
          <Plus className="w-4 h-4" />
          New Request
        </motion.button>
      </div>
      
      {/* My Requests */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden"
      >
        <div className="p-4 border-b border-zinc-800">
          <h3 className="font-semibold text-white">My Recent Requests</h3>
        </div>
        
        <div className="divide-y divide-zinc-800">
          {myRequests.length === 0 ? (
            <div className="p-8 text-center">
              <Boxes className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500">No material requests yet</p>
              <p className="text-zinc-600 text-sm mt-1">Click &quot;New Request&quot; to request materials</p>
            </div>
          ) : (
            myRequests.slice(0, 5).map((request) => (
              <motion.div
                key={request.id}
                variants={fadeInUp}
                className="p-4 hover:bg-zinc-800/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm text-blue-400">{request.requestNumber}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(request.status)}`}>
                        {getStatusIcon(request.status)}
                        {request.status.replace(/_/g, ' ').toUpperCase()}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        request.urgency === 'critical' ? 'bg-red-500/20 text-red-400' :
                        request.urgency === 'high' ? 'bg-orange-500/20 text-orange-400' :
                        request.urgency === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-zinc-500/20 text-zinc-400'
                      }`}>
                        {request.urgency.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-zinc-300 mt-1">{request.reason}</p>
                    <p className="text-zinc-500 text-sm mt-1">
                      {request.items.length} items • Required by {new Date(request.requiredDate).toLocaleDateString()}
                    </p>
                    {request.linkedPRNumber && (
                      <p className="text-blue-400 text-sm mt-1 flex items-center gap-1">
                        <ChevronRight className="w-3 h-3" />
                        Converted to PR: {request.linkedPRNumber}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-sm text-zinc-500">
                    {new Date(request.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
      
      {/* Low Stock Materials */}
      <motion.div
        variants={fadeInUp}
        className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden"
      >
        <div className="p-4 border-b border-zinc-800 flex items-center gap-3">
          <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Low Stock Materials</h3>
            <p className="text-xs text-zinc-500">Consider requesting these items</p>
          </div>
        </div>
        
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {materials.filter(m => m.current_stock <= m.min_stock).slice(0, 6).map((material) => (
            <div
              key={material.id}
              className="p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50 hover:border-orange-500/30 transition-colors cursor-pointer"
              onClick={() => {
                setRequestItems([{ material, requestedQty: material.min_stock * 2, reason: 'Low stock replenishment' }]);
                setShowRequestModal(true);
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-medium">{material.name}</p>
                  <p className="text-zinc-500 text-xs">{material.code}</p>
                </div>
                <div className="text-right">
                  <p className="text-red-400 font-bold">{material.current_stock}</p>
                  <p className="text-zinc-500 text-xs">Min: {material.min_stock}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
      
      {/* Request Modal */}
      <AnimatePresence>
        {showRequestModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowRequestModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
                    <Package className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">New Material Request</h2>
                    <p className="text-zinc-500 text-sm">Request will be sent to Purchase Team</p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowRequestModal(false)}
                  className="w-10 h-10 bg-zinc-800 hover:bg-zinc-700 rounded-xl flex items-center justify-center"
                >
                  <X className="w-5 h-5 text-zinc-400" />
                </motion.button>
              </div>
              
              {/* Modal Body */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)] space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-zinc-400 uppercase font-bold mb-2">
                      Project Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="e.g., Project Alpha"
                      className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 uppercase font-bold mb-2">
                      Urgency Level
                    </label>
                    <select
                      value={urgency}
                      onChange={(e) => setUrgency(e.target.value as typeof urgency)}
                      className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs text-zinc-400 uppercase font-bold mb-2">
                    Required By Date
                  </label>
                  <input
                    type="date"
                    value={requiredDate}
                    onChange={(e) => setRequiredDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  />
                </div>
                
                {/* Materials */}
                <div>
                  <label className="block text-xs text-zinc-400 uppercase font-bold mb-2">
                    Materials Required
                  </label>
                  
                  <div className="space-y-3">
                    {requestItems.map((item, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
                        <div className="flex-1 space-y-3">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                            <select
                              value={item.material?.id || ''}
                              onChange={(e) => {
                                const material = materials.find(m => m.id === e.target.value);
                                updateItemRow(index, 'material', material || null);
                              }}
                              className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                            >
                              <option value="">Select Material...</option>
                              {filteredMaterials.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.code} - {m.name} (Stock: {m.current_stock} {m.unit})
                                </option>
                              ))}
                            </select>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-zinc-500 mb-1">Quantity</label>
                              <input
                                type="number"
                                min="1"
                                value={item.requestedQty || ''}
                                onChange={(e) => updateItemRow(index, 'requestedQty', parseFloat(e.target.value) || 0)}
                                placeholder="0"
                                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-zinc-500 mb-1">Unit</label>
                              <input
                                type="text"
                                value={item.material?.unit || 'Pcs'}
                                disabled
                                className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-700/50 rounded-lg text-zinc-400"
                              />
                            </div>
                          </div>
                          
                          {item.material && (
                            <div className="flex items-center gap-4 text-xs text-zinc-500">
                              <span>Current Stock: <span className={item.material.current_stock <= item.material.min_stock ? 'text-red-400' : 'text-green-400'}>{item.material.current_stock}</span></span>
                              <span>Min Stock: {item.material.min_stock}</span>
                            </div>
                          )}
                        </div>
                        
                        {requestItems.length > 1 && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => removeItemRow(index)}
                            className="w-8 h-8 bg-red-500/20 hover:bg-red-500/30 rounded-lg flex items-center justify-center"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </motion.button>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={addItemRow}
                    className="mt-3 w-full py-2.5 border-2 border-dashed border-zinc-700 hover:border-orange-500/50 rounded-xl text-zinc-400 hover:text-orange-400 flex items-center justify-center gap-2 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Another Material
                  </motion.button>
                </div>
                
                {/* Reason */}
                <div>
                  <label className="block text-xs text-zinc-400 uppercase font-bold mb-2">
                    Reason for Request *
                  </label>
                  <textarea
                    value={overallReason}
                    onChange={(e) => setOverallReason(e.target.value)}
                    placeholder="Explain why these materials are needed..."
                    rows={3}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none"
                  />
                </div>
              </div>
              
              {/* Modal Footer */}
              <div className="p-6 border-t border-zinc-800 flex items-center justify-end gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowRequestModal(false)}
                  className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSubmitRequest}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white rounded-xl font-medium flex items-center gap-2 shadow-lg shadow-orange-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Submit Request
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
