'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReactToPrint } from 'react-to-print';
import { 
  Truck, Plus, Edit, Trash2, Eye, Printer, X, Save, 
  MapPin, Package, Search
} from 'lucide-react';

// DC Service
import {
  DeliveryChallan,
  DCItem,
  createDC,
  updateDC,
  deleteDC,
  subscribeToDCs,
  generateDCNumber
} from '@/lib/services/dcService';

// DC Template
import DeliveryChallanTemplate, { DeliveryChallanData } from '../DeliveryChallanTemplate';
import { COMPANY_INFO } from '../DocumentTemplates';

// ==========================================
// DC MANAGEMENT PAGE
// ==========================================
export default function DCManagementPage() {
  const [dcs, setDCs] = useState<DeliveryChallan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDC, setEditingDC] = useState<DeliveryChallan | null>(null);
  const [viewingDC, setViewingDC] = useState<DeliveryChallan | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const printRef = useRef<HTMLDivElement>(null);

  // Get current user
  const [currentUser, setCurrentUser] = useState({ id: '', name: '' });

  useEffect(() => {
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      try {
        const user = JSON.parse(stored);
        const userData = { id: user.id || '', name: user.name || 'User' };
        setCurrentUser(userData);
      } catch (e) {
        console.error('Error parsing user:', e);
      }
    }
  }, []);

  // Subscribe to DCs
  useEffect(() => {
    const unsubscribe = subscribeToDCs((data) => {
      setDCs(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Form state
  const [formData, setFormData] = useState<DeliveryChallan>({
    dcNumber: generateDCNumber(),
    dcDate: new Date().toISOString().split('T')[0],
    poNumber: '',
    poDate: '',
    consignorName: COMPANY_INFO.name,
    consignorAddress: COMPANY_INFO.units.unit1.address,
    consignorGSTIN: COMPANY_INFO.gstin,
    consignorStateCode: '37',
    consignorPhone: COMPANY_INFO.units.unit1.phone,
    consigneeName: '',
    consigneeAddress: '',
    consigneeGSTIN: '',
    consigneeStateCode: '',
    consigneePhone: '',
    transportMode: 'Road',
    vehicleNumber: '',
    driverName: '',
    driverPhone: '',
    lrNumber: '',
    lrDate: '',
    eWayBillNo: '',
    eWayBillDate: '',
    items: [],
    reason: 'Supply',
    reasonRemarks: '',
    preparedBy: '',
    checkedBy: '',
    approvedBy: '',
    remarks: '',
    status: 'draft'
  });

  const [newItem, setNewItem] = useState<DCItem>({
    slNo: 1,
    itemCode: '',
    description: '',
    hsnCode: '',
    quantity: 0,
    unit: 'Pcs',
    remarks: ''
  });

  // Handle create/update
  const handleSave = async () => {
    try {
      if (!formData.dcNumber || !formData.consigneeName || formData.items.length === 0) {
        alert('Please fill DC Number, Consignee Name, and add at least one item');
        return;
      }

      const dcData = {
        ...formData,
        preparedBy: formData.preparedBy || currentUser.name,
        createdBy: currentUser.id
      };

      if (editingDC && editingDC.id) {
        await updateDC(editingDC.id, dcData);
        alert('DC updated successfully!');
      } else {
        await createDC(dcData);
        alert('DC created successfully!');
      }

      handleCloseModal();
    } catch (error) {
      console.error('Error saving DC:', error);
      alert('Failed to save DC');
    }
  };

  // Handle delete
  const handleDelete = async (dcId: string) => {
    if (confirm('Are you sure you want to delete this DC?')) {
      try {
        await deleteDC(dcId);
        alert('DC deleted successfully!');
      } catch (error) {
        console.error('Error deleting DC:', error);
        alert('Failed to delete DC');
      }
    }
  };

  // Handle edit
  const handleEdit = (dc: DeliveryChallan) => {
    setEditingDC(dc);
    setFormData(dc);
    setShowModal(true);
  };

  // Handle close modal
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingDC(null);
    setFormData({
      dcNumber: generateDCNumber(),
      dcDate: new Date().toISOString().split('T')[0],
      poNumber: '',
      poDate: '',
      consignorName: COMPANY_INFO.name,
      consignorAddress: COMPANY_INFO.units.unit1.address,
      consignorGSTIN: COMPANY_INFO.gstin,
      consignorStateCode: '37',
      consignorPhone: COMPANY_INFO.units.unit1.phone,
      consigneeName: '',
      consigneeAddress: '',
      consigneeGSTIN: '',
      consigneeStateCode: '',
      consigneePhone: '',
      transportMode: 'Road',
      vehicleNumber: '',
      driverName: '',
      driverPhone: '',
      lrNumber: '',
      lrDate: '',
      eWayBillNo: '',
      eWayBillDate: '',
      items: [],
      reason: 'Supply',
      reasonRemarks: '',
      preparedBy: '',
      checkedBy: '',
      approvedBy: '',
      remarks: '',
      status: 'draft'
    });
  };

  // Add item to items list
  const handleAddItem = () => {
    if (!newItem.itemCode || !newItem.description || newItem.quantity <= 0) {
      alert('Please fill item code, description, and quantity');
      return;
    }
    setFormData({
      ...formData,
      items: [...formData.items, { ...newItem, slNo: formData.items.length + 1 }]
    });
    setNewItem({
      slNo: formData.items.length + 2,
      itemCode: '',
      description: '',
      hsnCode: '',
      quantity: 0,
      unit: 'Pcs',
      remarks: ''
    });
  };

  // Remove item
  const handleRemoveItem = (index: number) => {
    const updatedItems = formData.items.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      items: updatedItems.map((item, i) => ({ ...item, slNo: i + 1 }))
    });
  };

  // Filter DCs
  const filteredDCs = dcs.filter(dc => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      dc.dcNumber.toLowerCase().includes(search) ||
      dc.consigneeName.toLowerCase().includes(search) ||
      (dc.poNumber && dc.poNumber.toLowerCase().includes(search))
    );
  });

  // Print handler
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `DC_${viewingDC?.dcNumber}`,
  });

  // Convert DC to template format
  const convertToTemplateData = (dc: DeliveryChallan): DeliveryChallanData => ({
    dcNumber: dc.dcNumber,
    dcDate: dc.dcDate,
    poNumber: dc.poNumber,
    poDate: dc.poDate,
    consignor: {
      name: dc.consignorName,
      address: dc.consignorAddress,
      gstin: dc.consignorGSTIN,
      stateCode: dc.consignorStateCode,
      phone: dc.consignorPhone
    },
    consignee: {
      name: dc.consigneeName,
      address: dc.consigneeAddress,
      gstin: dc.consigneeGSTIN,
      stateCode: dc.consigneeStateCode,
      phone: dc.consigneePhone
    },
    transport: {
      mode: dc.transportMode,
      vehicleNumber: dc.vehicleNumber,
      driverName: dc.driverName,
      driverPhone: dc.driverPhone,
      lrNumber: dc.lrNumber,
      lrDate: dc.lrDate,
      eWayBillNo: dc.eWayBillNo,
      eWayBillDate: dc.eWayBillDate
    },
    items: dc.items,
    reason: dc.reason,
    reasonRemarks: dc.reasonRemarks,
    preparedBy: dc.preparedBy,
    checkedBy: dc.checkedBy,
    approvedBy: dc.approvedBy,
    remarks: dc.remarks
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <Truck className="w-12 h-12 text-green-500 animate-bounce mx-auto mb-4" />
          <p className="text-zinc-400">Loading DCs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-green-600 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Truck className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Delivery Challan Management</h1>
              <p className="text-zinc-400">Create, manage, and print delivery challans</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-medium shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Create New DC
          </motion.button>
        </div>
      </div>

      {/* Search & Stats */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <p className="text-2xl font-bold text-white">{dcs.length}</p>
            <p className="text-sm text-zinc-400">Total DCs</p>
          </div>
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <p className="text-2xl font-bold text-orange-400">{dcs.filter(d => d.status === 'draft').length}</p>
            <p className="text-sm text-zinc-400">Draft</p>
          </div>
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <p className="text-2xl font-bold text-blue-400">{dcs.filter(d => d.status === 'dispatched').length}</p>
            <p className="text-sm text-zinc-400">Dispatched</p>
          </div>
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <p className="text-2xl font-bold text-green-400">{dcs.filter(d => d.status === 'delivered').length}</p>
            <p className="text-sm text-zinc-400">Delivered</p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by DC Number, Consignee Name, or PO Number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500/50"
          />
        </div>
      </div>

      {/* DCs List */}
      <div className="max-w-7xl mx-auto">
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-zinc-800/50 text-left text-sm text-zinc-400">
                <th className="px-4 py-3">DC Number</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Consignee</th>
                <th className="px-4 py-3">PO Number</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDCs.map((dc, index) => (
                <motion.tr
                  key={dc.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-t border-zinc-800 hover:bg-zinc-800/30"
                >
                  <td className="px-4 py-3 font-mono text-sm text-green-400">{dc.dcNumber}</td>
                  <td className="px-4 py-3 text-sm">{dc.dcDate}</td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">{dc.consigneeName}</p>
                      <p className="text-xs text-zinc-500">{dc.consigneePhone}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono">{dc.poNumber || '-'}</td>
                  <td className="px-4 py-3 text-sm">{dc.items.length} items</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      dc.status === 'delivered' ? 'bg-green-500/20 text-green-400' :
                      dc.status === 'dispatched' ? 'bg-blue-500/20 text-blue-400' :
                      dc.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                      'bg-orange-500/20 text-orange-400'
                    }`}>
                      {dc.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setViewingDC(dc)}
                        className="p-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg text-blue-400"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(dc)}
                        className="p-2 bg-yellow-500/20 hover:bg-yellow-500/30 rounded-lg text-yellow-400"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => dc.id && handleDelete(dc.id)}
                        className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          {filteredDCs.length === 0 && (
            <div className="p-12 text-center">
              <Truck className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500">No delivery challans found</p>
              <button
                onClick={() => setShowModal(true)}
                className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white text-sm"
              >
                Create Your First DC
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
            onClick={handleCloseModal}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 max-w-4xl w-full my-8 max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <Truck className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{editingDC ? 'Edit' : 'Create New'} Delivery Challan</h2>
                    <p className="text-sm text-zinc-400">Fill in the details below</p>
                  </div>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="p-2 hover:bg-zinc-800 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Content */}
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">DC Number *</label>
                    <input
                      type="text"
                      value={formData.dcNumber}
                      onChange={(e) => setFormData({ ...formData, dcNumber: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-green-500"
                      placeholder="DC-2026-001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">DC Date *</label>
                    <input
                      type="date"
                      value={formData.dcDate}
                      onChange={(e) => setFormData({ ...formData, dcDate: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">PO Number</label>
                    <input
                      type="text"
                      value={formData.poNumber}
                      onChange={(e) => setFormData({ ...formData, poNumber: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-green-500"
                      placeholder="PO-2026-001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">PO Date</label>
                    <input
                      type="date"
                      value={formData.poDate}
                      onChange={(e) => setFormData({ ...formData, poDate: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>

                {/* Consignee Details */}
                <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-800/30">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-400" />
                    Consignee Details (To) *
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-2">Consignee Name *</label>
                      <input
                        type="text"
                        value={formData.consigneeName}
                        onChange={(e) => setFormData({ ...formData, consigneeName: e.target.value })}
                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-green-500"
                        placeholder="ABC Manufacturing Ltd"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-2">Address *</label>
                      <textarea
                        value={formData.consigneeAddress}
                        onChange={(e) => setFormData({ ...formData, consigneeAddress: e.target.value })}
                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-green-500"
                        rows={2}
                        placeholder="Plot 23, Industrial Area, City - 600001"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">GSTIN *</label>
                      <input
                        type="text"
                        value={formData.consigneeGSTIN}
                        onChange={(e) => setFormData({ ...formData, consigneeGSTIN: e.target.value })}
                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-green-500"
                        placeholder="33AABCA1234N1Z5"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">State Code *</label>
                      <input
                        type="text"
                        value={formData.consigneeStateCode}
                        onChange={(e) => setFormData({ ...formData, consigneeStateCode: e.target.value })}
                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-green-500"
                        placeholder="33"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-2">Phone *</label>
                      <input
                        type="text"
                        value={formData.consigneePhone}
                        onChange={(e) => setFormData({ ...formData, consigneePhone: e.target.value })}
                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-green-500"
                        placeholder="+91 9876543210"
                      />
                    </div>
                  </div>
                </div>

                {/* Transport Details */}
                <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-800/30">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Truck className="w-5 h-5 text-green-400" />
                    Transport Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Transport Mode</label>
                      <select
                        value={formData.transportMode}
                        onChange={(e) => setFormData({ ...formData, transportMode: e.target.value as DeliveryChallan['transportMode'] })}
                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-green-500"
                      >
                        <option value="Road">Road</option>
                        <option value="Rail">Rail</option>
                        <option value="Air">Air</option>
                        <option value="Courier">Courier</option>
                        <option value="Hand Delivery">Hand Delivery</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Vehicle Number</label>
                      <input
                        type="text"
                        value={formData.vehicleNumber}
                        onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-green-500"
                        placeholder="AP39TG4567"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Driver Name</label>
                      <input
                        type="text"
                        value={formData.driverName}
                        onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-green-500"
                        placeholder="Ramesh Kumar"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Driver Phone</label>
                      <input
                        type="text"
                        value={formData.driverPhone}
                        onChange={(e) => setFormData({ ...formData, driverPhone: e.target.value })}
                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-green-500"
                        placeholder="+91 9876543210"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">LR Number</label>
                      <input
                        type="text"
                        value={formData.lrNumber}
                        onChange={(e) => setFormData({ ...formData, lrNumber: e.target.value })}
                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-green-500"
                        placeholder="LR-2026-456"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">E-Way Bill No</label>
                      <input
                        type="text"
                        value={formData.eWayBillNo}
                        onChange={(e) => setFormData({ ...formData, eWayBillNo: e.target.value })}
                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-green-500"
                        placeholder="EWB123456789012"
                      />
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-800/30">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Package className="w-5 h-5 text-purple-400" />
                    Items * (Add at least one item)
                  </h3>
                  
                  {/* Items List */}
                  {formData.items.length > 0 && (
                    <div className="mb-4 space-y-2">
                      {formData.items.map((item, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-zinc-900 rounded-lg">
                          <span className="text-sm font-mono w-8">{item.slNo}.</span>
                          <span className="text-sm font-medium flex-1">{item.itemCode} - {item.description}</span>
                          <span className="text-sm text-zinc-400">{item.quantity} {item.unit}</span>
                          <button
                            onClick={() => handleRemoveItem(index)}
                            className="p-1 hover:bg-red-500/20 rounded text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Item Form */}
                  <div className="grid grid-cols-6 gap-2">
                    <input
                      type="text"
                      value={newItem.itemCode}
                      onChange={(e) => setNewItem({ ...newItem, itemCode: e.target.value })}
                      className="col-span-1 px-2 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
                      placeholder="Item Code"
                    />
                    <input
                      type="text"
                      value={newItem.description}
                      onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                      className="col-span-2 px-2 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
                      placeholder="Description"
                    />
                    <input
                      type="text"
                      value={newItem.hsnCode}
                      onChange={(e) => setNewItem({ ...newItem, hsnCode: e.target.value })}
                      className="col-span-1 px-2 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
                      placeholder="HSN"
                    />
                    <input
                      type="number"
                      value={newItem.quantity || ''}
                      onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
                      className="col-span-1 px-2 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
                      placeholder="Qty"
                    />
                    <select
                      value={newItem.unit}
                      onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                      className="col-span-1 px-2 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
                    >
                      <option value="Pcs">Pcs</option>
                      <option value="Kg">Kg</option>
                      <option value="Ltr">Ltr</option>
                      <option value="Mtr">Mtr</option>
                      <option value="Box">Box</option>
                    </select>
                  </div>
                  <button
                    onClick={handleAddItem}
                    className="mt-2 w-full px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium"
                  >
                    + Add Item
                  </button>
                </div>

                {/* Additional Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Reason for Transport</label>
                    <select
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value as DeliveryChallan['reason'] })}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-green-500"
                    >
                      <option value="Supply">Supply</option>
                      <option value="Job Work">Job Work</option>
                      <option value="Sales Return">Sales Return</option>
                      <option value="Approval">Approval</option>
                      <option value="Exhibition">Exhibition</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as DeliveryChallan['status'] })}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-green-500"
                    >
                      <option value="draft">Draft</option>
                      <option value="dispatched">Dispatched</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Remarks</label>
                    <textarea
                      value={formData.remarks}
                      onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-green-500"
                      rows={2}
                      placeholder="Any special instructions..."
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-zinc-800">
                <button
                  onClick={handleCloseModal}
                  className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg font-medium"
                >
                  <Save className="w-4 h-4" />
                  {editingDC ? 'Update' : 'Create'} DC
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View/Print Modal */}
      <AnimatePresence>
        {viewingDC && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setViewingDC(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-zinc-900 text-white p-4 flex items-center justify-between border-b border-zinc-800 z-10">
                <h3 className="text-lg font-semibold">Preview & Print DC</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePrint()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg"
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </button>
                  <button
                    onClick={() => setViewingDC(null)}
                    className="p-2 hover:bg-zinc-800 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div ref={printRef}>
                <DeliveryChallanTemplate
                  data={convertToTemplateData(viewingDC)}
                  copyType="ORIGINAL"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
