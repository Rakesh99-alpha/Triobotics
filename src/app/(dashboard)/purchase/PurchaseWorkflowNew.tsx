'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, ClipboardList, Send, Package, CheckCircle, Clock, XCircle,
  Search, Eye, ChevronRight, Plus, AlertTriangle, Loader2, X,
  ShoppingCart, MessageSquare, DollarSign, Truck, RefreshCw
} from 'lucide-react';
import {
  subscribeToPRs,
  subscribeToEnquiries,
  subscribeToPOs,
  subscribeToSuppliers,
  createEnquiry,
  addQuoteToEnquiry,
  selectQuote,
  createPOFromEnquiry,
  assignPR,
} from '@/lib/services/procurementService';
import { PurchaseRequest, Enquiry, PurchaseOrder, PRIORITY_COLORS, MD_APPROVAL_THRESHOLD } from '@/types/purchase';

// ==========================================
// STATUS BADGE COMPONENT
// ==========================================
const StatusBadge = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    draft: 'bg-zinc-500/20 text-zinc-400',
    pending_enquiry: 'bg-yellow-500/20 text-yellow-400',
    enquiry_in_progress: 'bg-blue-500/20 text-blue-400',
    quotes_received: 'bg-purple-500/20 text-purple-400',
    supplier_selected: 'bg-cyan-500/20 text-cyan-400',
    po_created: 'bg-green-500/20 text-green-400',
    pending_md_approval: 'bg-orange-500/20 text-orange-400',
    approved: 'bg-emerald-500/20 text-emerald-400',
    rejected: 'bg-red-500/20 text-red-400',
    completed: 'bg-green-500/20 text-green-400',
    cancelled: 'bg-zinc-600/20 text-zinc-500',
  };

  const labels: Record<string, string> = {
    draft: 'Draft',
    pending_enquiry: 'Pending Enquiry',
    enquiry_in_progress: 'Enquiry In Progress',
    quotes_received: 'Quotes Received',
    supplier_selected: 'Supplier Selected',
    po_created: 'PO Created',
    pending_md_approval: 'Awaiting MD Approval',
    approved: 'Approved',
    rejected: 'Rejected',
    completed: 'Completed',
    cancelled: 'Cancelled',
    sent_to_suppliers: 'Sent to Suppliers',
    under_review: 'Under Review',
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-zinc-500/20 text-zinc-400'}`}>
      {labels[status] || status}
    </span>
  );
};

// ==========================================
// PRIORITY BADGE
// ==========================================
const PriorityBadge = ({ priority }: { priority: string }) => {
  const colors: Record<string, string> = {
    low: 'bg-zinc-500',
    medium: 'bg-blue-500',
    high: 'bg-orange-500',
    urgent: 'bg-red-500',
  };

  return (
    <span className={`w-2 h-2 rounded-full ${colors[priority] || 'bg-zinc-500'}`} title={priority} />
  );
};

// ==========================================
// MAIN PURCHASE WORKFLOW COMPONENT
// ==========================================
export default function PurchaseWorkflowNew() {
  const [activeTab, setActiveTab] = useState<'pr' | 'enquiry' | 'po'>('pr');
  const [prs, setPRs] = useState<PurchaseRequest[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [pos, setPOs] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [selectedPR, setSelectedPR] = useState<PurchaseRequest | null>(null);
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showCreatePOModal, setShowCreatePOModal] = useState(false);

  // Get current user
  const getCurrentUser = () => {
    if (typeof window === 'undefined') return { id: '', name: '', role: '' };
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return { id: '', name: '', role: '' };
      }
    }
    return { id: '', name: '', role: '' };
  };

  // Subscribe to data
  useEffect(() => {
    setLoading(true);

    const unsubPRs = subscribeToPRs((data) => {
      setPRs(data);
      setLoading(false);
    });

    const unsubEnquiries = subscribeToEnquiries((data) => {
      setEnquiries(data);
    });

    const unsubPOs = subscribeToPOs((data) => {
      setPOs(data);
    });

    const unsubSuppliers = subscribeToSuppliers((data) => {
      setSuppliers(data);
    });

    return () => {
      unsubPRs();
      unsubEnquiries();
      unsubPOs();
      unsubSuppliers();
    };
  }, []);

  // Stats
  const stats = {
    pendingPRs: prs.filter(pr => pr.status === 'pending_enquiry').length,
    activeEnquiries: enquiries.filter(e => e.status === 'sent_to_suppliers' || e.status === 'quotes_received').length,
    pendingApprovals: pos.filter(po => po.status === 'pending_md_approval').length,
    approvedPOs: pos.filter(po => po.status === 'approved').length,
  };

  // Create Enquiry from PR
  const handleCreateEnquiry = async (pr: PurchaseRequest, selectedSupplierIds: string[]) => {
    if (selectedSupplierIds.length === 0) {
      alert('Select at least one supplier');
      return;
    }

    const user = getCurrentUser();

    try {
      await createEnquiry(
        pr.id,
        pr.prNumber,
        user.id,
        user.name,
        pr.items.map(item => ({
          materialId: item.materialId,
          materialCode: item.materialCode,
          materialName: item.materialName,
          requiredQty: item.shortfall,
          unit: item.unit,
        })),
        selectedSupplierIds
      );
      alert('Enquiry created and sent to suppliers!');
      setSelectedPR(null);
    } catch (error) {
      console.error('Error creating enquiry:', error);
      alert('Failed to create enquiry');
    }
  };

  // Tabs
  const tabs = [
    { id: 'pr', label: 'Purchase Requests', icon: ClipboardList, count: stats.pendingPRs },
    { id: 'enquiry', label: 'Enquiries', icon: MessageSquare, count: stats.activeEnquiries },
    { id: 'po', label: 'Purchase Orders', icon: ShoppingCart, count: stats.pendingApprovals },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Background */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />
      <div className="fixed top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Purchase Workflow</h1>
          <p className="text-zinc-400">Manage purchase requests, enquiries, and orders</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.pendingPRs}</p>
                <p className="text-xs text-zinc-400">Pending PRs</p>
              </div>
            </div>
          </div>
          <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.activeEnquiries}</p>
                <p className="text-xs text-zinc-400">Active Enquiries</p>
              </div>
            </div>
          </div>
          <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.pendingApprovals}</p>
                <p className="text-xs text-zinc-400">Awaiting MD</p>
              </div>
            </div>
          </div>
          <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.approvedPOs}</p>
                <p className="text-xs text-zinc-400">Approved POs</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white'
                  : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id ? 'bg-white/20' : 'bg-cyan-500/20 text-cyan-400'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by document number, project, or supplier..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-zinc-900/50 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
        )}

        {/* Purchase Requests Tab */}
        {!loading && activeTab === 'pr' && (
          <div className="space-y-4">
            {prs.length === 0 ? (
              <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-12 text-center">
                <ClipboardList className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-zinc-400 mb-2">No Purchase Requests</h3>
                <p className="text-zinc-500">PRs will appear here when PM creates a BOM with stock shortage</p>
              </div>
            ) : (
              prs.filter(pr => 
                pr.prNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                pr.projectName.toLowerCase().includes(searchTerm.toLowerCase())
              ).map(pr => (
                <motion.div
                  key={pr.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-zinc-900/50 border border-white/10 rounded-xl p-5 hover:border-cyan-500/30 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <PriorityBadge priority={pr.priority} />
                      <div>
                        <h3 className="font-semibold text-white">{pr.prNumber}</h3>
                        <p className="text-sm text-zinc-400">Project: {pr.projectName}</p>
                      </div>
                    </div>
                    <StatusBadge status={pr.status} />
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4 text-sm">
                    <div>
                      <p className="text-zinc-500">Items</p>
                      <p className="text-white font-medium">{pr.items.length}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Est. Amount</p>
                      <p className="text-white font-medium">₹{pr.totalEstimatedAmount?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Required By</p>
                      <p className="text-white font-medium">{pr.requiredDate ? new Date(pr.requiredDate).toLocaleDateString() : '-'}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Created</p>
                      <p className="text-white font-medium">{new Date(pr.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Items Preview */}
                  <div className="bg-zinc-800/50 rounded-lg p-3 mb-4">
                    <p className="text-xs text-zinc-500 mb-2">Materials Required:</p>
                    <div className="flex flex-wrap gap-2">
                      {pr.items.slice(0, 5).map((item, i) => (
                        <span key={i} className="px-2 py-1 bg-zinc-700/50 text-zinc-300 text-xs rounded">
                          {item.materialName} ({item.shortfall} {item.unit})
                        </span>
                      ))}
                      {pr.items.length > 5 && (
                        <span className="px-2 py-1 bg-zinc-700/50 text-zinc-400 text-xs rounded">
                          +{pr.items.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setSelectedPR(pr)}
                      className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors text-sm"
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </button>
                    {pr.status === 'pending_enquiry' && (
                      <button
                        onClick={() => setSelectedPR(pr)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:opacity-90 transition-opacity text-sm"
                      >
                        <Send className="w-4 h-4" />
                        Create Enquiry
                      </button>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* Enquiries Tab */}
        {!loading && activeTab === 'enquiry' && (
          <div className="space-y-4">
            {enquiries.length === 0 ? (
              <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-12 text-center">
                <MessageSquare className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-zinc-400 mb-2">No Enquiries</h3>
                <p className="text-zinc-500">Create enquiries from pending purchase requests</p>
              </div>
            ) : (
              enquiries.filter(e => 
                e.enquiryNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                e.prNumber.toLowerCase().includes(searchTerm.toLowerCase())
              ).map(enquiry => (
                <motion.div
                  key={enquiry.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-zinc-900/50 border border-white/10 rounded-xl p-5 hover:border-purple-500/30 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-white">{enquiry.enquiryNumber}</h3>
                      <p className="text-sm text-zinc-400">From PR: {enquiry.prNumber}</p>
                    </div>
                    <StatusBadge status={enquiry.status} />
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4 text-sm">
                    <div>
                      <p className="text-zinc-500">Items</p>
                      <p className="text-white font-medium">{enquiry.items.length}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Suppliers Contacted</p>
                      <p className="text-white font-medium">{enquiry.suppliersContacted?.length || 0}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Quotes Received</p>
                      <p className="text-white font-medium">{enquiry.quotes?.length || 0}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Created</p>
                      <p className="text-white font-medium">{new Date(enquiry.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Quotes Preview */}
                  {enquiry.quotes && enquiry.quotes.length > 0 && (
                    <div className="bg-zinc-800/50 rounded-lg p-3 mb-4">
                      <p className="text-xs text-zinc-500 mb-2">Received Quotes:</p>
                      <div className="space-y-2">
                        {enquiry.quotes.map((quote, i) => (
                          <div key={i} className={`flex items-center justify-between p-2 rounded ${quote.isSelected ? 'bg-green-500/20 border border-green-500/30' : 'bg-zinc-700/30'}`}>
                            <div className="flex items-center gap-2">
                              {quote.isSelected && <CheckCircle className="w-4 h-4 text-green-400" />}
                              <span className="text-sm text-white">{quote.supplierName}</span>
                            </div>
                            <span className="text-sm font-medium text-cyan-400">₹{quote.totalAmount?.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setSelectedEnquiry(enquiry)}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors text-sm"
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </button>
                    {enquiry.status === 'quotes_received' && (
                      <button
                        onClick={() => {
                          setSelectedEnquiry(enquiry);
                          setShowQuoteModal(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors text-sm"
                      >
                        <Plus className="w-4 h-4" />
                        Add Quote
                      </button>
                    )}
                    {enquiry.status === 'supplier_selected' && (
                      <button
                        onClick={() => {
                          setSelectedEnquiry(enquiry);
                          setShowCreatePOModal(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:opacity-90 transition-opacity text-sm"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        Create PO
                      </button>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* Purchase Orders Tab */}
        {!loading && activeTab === 'po' && (
          <div className="space-y-4">
            {pos.length === 0 ? (
              <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-12 text-center">
                <ShoppingCart className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-zinc-400 mb-2">No Purchase Orders</h3>
                <p className="text-zinc-500">Create POs from enquiries with selected suppliers</p>
              </div>
            ) : (
              pos.filter(po => 
                po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                po.vendorDetails?.name?.toLowerCase().includes(searchTerm.toLowerCase())
              ).map(po => (
                <motion.div
                  key={po.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-zinc-900/50 border rounded-xl p-5 transition-all ${
                    po.status === 'pending_md_approval' 
                      ? 'border-orange-500/30 bg-orange-500/5' 
                      : 'border-white/10 hover:border-green-500/30'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white">{po.poNumber}</h3>
                        {po.requiresMDApproval && po.status === 'pending_md_approval' && (
                          <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded-full">
                            ⏳ MD Approval Required
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-zinc-400">Vendor: {po.vendorDetails?.name}</p>
                    </div>
                    <StatusBadge status={po.status} />
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-4 text-sm">
                    <div>
                      <p className="text-zinc-500">Items</p>
                      <p className="text-white font-medium">{po.items?.length || 0}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Subtotal</p>
                      <p className="text-white font-medium">₹{po.subtotal?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">GST (18%)</p>
                      <p className="text-white font-medium">₹{po.gstAmount?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Total</p>
                      <p className="text-lg font-bold text-cyan-400">₹{po.totalAmount?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Expected Delivery</p>
                      <p className="text-white font-medium">{po.expectedDelivery ? new Date(po.expectedDelivery).toLocaleDateString() : '-'}</p>
                    </div>
                  </div>

                  {/* Approval Status */}
                  {po.status === 'approved' && po.approvedBy && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mb-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-sm text-green-400">Approved by MD on {po.approvedAt ? new Date(po.approvedAt).toLocaleString() : ''}</span>
                      </div>
                    </div>
                  )}

                  {po.status === 'rejected' && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-red-400" />
                        <span className="text-sm text-red-400">Rejected: {po.rejectedReason}</span>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setSelectedPO(po)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors text-sm"
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>

      {/* PR Detail Modal with Supplier Selection */}
      <AnimatePresence>
        {selectedPR && (
          <PRDetailModal
            pr={selectedPR}
            suppliers={suppliers}
            onClose={() => setSelectedPR(null)}
            onCreateEnquiry={handleCreateEnquiry}
          />
        )}
      </AnimatePresence>

      {/* Enquiry Detail Modal */}
      <AnimatePresence>
        {selectedEnquiry && !showQuoteModal && !showCreatePOModal && (
          <EnquiryDetailModal
            enquiry={selectedEnquiry}
            onClose={() => setSelectedEnquiry(null)}
            onSelectQuote={async (index) => {
              await selectQuote(selectedEnquiry.id, index);
              setSelectedEnquiry(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Create PO Modal */}
      <AnimatePresence>
        {showCreatePOModal && selectedEnquiry && (
          <CreatePOModal
            enquiry={selectedEnquiry}
            onClose={() => {
              setShowCreatePOModal(false);
              setSelectedEnquiry(null);
            }}
            onCreatePO={async (expectedDelivery, notes) => {
              const user = getCurrentUser();
              await createPOFromEnquiry(selectedEnquiry.id, user.id, user.name, expectedDelivery, notes);
              alert('Purchase Order created!');
              setShowCreatePOModal(false);
              setSelectedEnquiry(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* PO Detail Modal */}
      <AnimatePresence>
        {selectedPO && (
          <PODetailModal
            po={selectedPO}
            onClose={() => setSelectedPO(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ==========================================
// PR DETAIL MODAL
// ==========================================
function PRDetailModal({ 
  pr, 
  suppliers, 
  onClose, 
  onCreateEnquiry 
}: { 
  pr: PurchaseRequest; 
  suppliers: any[]; 
  onClose: () => void;
  onCreateEnquiry: (pr: PurchaseRequest, supplierIds: string[]) => void;
}) {
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);

  const toggleSupplier = (id: string) => {
    setSelectedSuppliers(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-xl font-bold text-white">{pr.prNumber}</h2>
            <p className="text-sm text-zinc-400">Purchase Request Details</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Info Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-zinc-800/50 rounded-lg p-3">
              <p className="text-xs text-zinc-500">Project</p>
              <p className="text-sm font-medium text-white">{pr.projectName}</p>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-3">
              <p className="text-xs text-zinc-500">Requested By</p>
              <p className="text-sm font-medium text-white">{pr.requestedByName}</p>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-3">
              <p className="text-xs text-zinc-500">Required Date</p>
              <p className="text-sm font-medium text-white">{new Date(pr.requiredDate).toLocaleDateString()}</p>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-3">
              <p className="text-xs text-zinc-500">Est. Amount</p>
              <p className="text-sm font-medium text-cyan-400">₹{pr.totalEstimatedAmount?.toLocaleString()}</p>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-zinc-300 mb-3">Materials Required</h3>
            <div className="bg-zinc-800/50 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-zinc-800/80">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase">Material</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-400 uppercase">Required</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-400 uppercase">In Stock</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-400 uppercase">Shortfall</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-400 uppercase">Est. Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {pr.items.map((item, i) => (
                    <tr key={i} className="border-t border-white/5">
                      <td className="px-4 py-3">
                        <p className="text-sm text-white">{item.materialName}</p>
                        <p className="text-xs text-zinc-500">{item.materialCode}</p>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-zinc-300">{item.requiredQty} {item.unit}</td>
                      <td className="px-4 py-3 text-center text-sm text-zinc-300">{item.currentStock}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full">
                          {item.shortfall}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-zinc-300">₹{item.estimatedTotal?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Supplier Selection (only if pending) */}
          {pr.status === 'pending_enquiry' && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-300 mb-3">Select Suppliers for Enquiry</h3>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {suppliers.map(supplier => (
                  <button
                    key={supplier.id}
                    onClick={() => toggleSupplier(supplier.id)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      selectedSuppliers.includes(supplier.id)
                        ? 'bg-cyan-500/20 border-cyan-500/50'
                        : 'bg-zinc-800/50 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-white">{supplier.name}</p>
                      {selectedSuppliers.includes(supplier.id) && (
                        <CheckCircle className="w-4 h-4 text-cyan-400" />
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">{supplier.contact || supplier.phone}</p>
                  </button>
                ))}
              </div>
              {suppliers.length === 0 && (
                <p className="text-sm text-zinc-500 text-center py-4">No suppliers found. Add suppliers first.</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
          <button onClick={onClose} className="px-4 py-2 text-zinc-400 hover:text-white">
            Cancel
          </button>
          {pr.status === 'pending_enquiry' && (
            <button
              onClick={() => onCreateEnquiry(pr, selectedSuppliers)}
              disabled={selectedSuppliers.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              Send Enquiry to {selectedSuppliers.length} Supplier{selectedSuppliers.length !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ==========================================
// ENQUIRY DETAIL MODAL
// ==========================================
function EnquiryDetailModal({ 
  enquiry, 
  onClose,
  onSelectQuote
}: { 
  enquiry: Enquiry; 
  onClose: () => void;
  onSelectQuote: (index: number) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-xl font-bold text-white">{enquiry.enquiryNumber}</h2>
            <p className="text-sm text-zinc-400">Enquiry Details • PR: {enquiry.prNumber}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-150px)]">
          {/* Quotes Comparison */}
          {enquiry.quotes && enquiry.quotes.length > 0 ? (
            <div>
              <h3 className="text-sm font-semibold text-zinc-300 mb-3">Compare Quotes</h3>
              <div className="space-y-3">
                {enquiry.quotes.map((quote, index) => (
                  <div key={index} className={`bg-zinc-800/50 rounded-xl p-4 border ${quote.isSelected ? 'border-green-500/50' : 'border-white/10'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {quote.isSelected && <CheckCircle className="w-5 h-5 text-green-400" />}
                        <div>
                          <p className="font-semibold text-white">{quote.supplierName}</p>
                          <p className="text-xs text-zinc-500">{quote.supplierEmail}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-cyan-400">₹{quote.totalAmount?.toLocaleString()}</p>
                        <p className="text-xs text-zinc-500">Valid until {new Date(quote.validUntil).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-zinc-500">Payment Terms</p>
                        <p className="text-white">{quote.paymentTerms}</p>
                      </div>
                      <div>
                        <p className="text-zinc-500">Delivery Terms</p>
                        <p className="text-white">{quote.deliveryTerms}</p>
                      </div>
                    </div>
                    {!quote.isSelected && enquiry.status === 'quotes_received' && (
                      <button
                        onClick={() => onSelectQuote(index)}
                        className="mt-3 w-full py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors text-sm font-medium"
                      >
                        Select This Supplier
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-10">
              <MessageSquare className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-400">Waiting for supplier quotes...</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ==========================================
// CREATE PO MODAL
// ==========================================
function CreatePOModal({ 
  enquiry, 
  onClose,
  onCreatePO
}: { 
  enquiry: Enquiry; 
  onClose: () => void;
  onCreatePO: (expectedDelivery: string, notes: string) => void;
}) {
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedQuote = enquiry.quotes?.[enquiry.selectedQuoteIndex || 0];
  const totalWithGST = (selectedQuote?.totalAmount || 0) * 1.18;
  const requiresMD = totalWithGST >= MD_APPROVAL_THRESHOLD;

  const handleSubmit = async () => {
    if (!expectedDelivery) {
      alert('Select expected delivery date');
      return;
    }
    setLoading(true);
    try {
      await onCreatePO(expectedDelivery, notes);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-lg"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-xl font-bold text-white">Create Purchase Order</h2>
            <p className="text-sm text-zinc-400">From {enquiry.enquiryNumber}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Supplier Info */}
          <div className="bg-zinc-800/50 rounded-lg p-4">
            <p className="text-xs text-zinc-500 mb-1">Selected Supplier</p>
            <p className="text-lg font-semibold text-white">{selectedQuote?.supplierName}</p>
          </div>

          {/* Amount Summary */}
          <div className="bg-zinc-800/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Subtotal</span>
              <span className="text-white">₹{selectedQuote?.totalAmount?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">GST (18%)</span>
              <span className="text-white">₹{((selectedQuote?.totalAmount || 0) * 0.18).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t border-white/10 pt-2">
              <span className="text-white">Total</span>
              <span className="text-cyan-400">₹{totalWithGST.toLocaleString()}</span>
            </div>
          </div>

          {/* MD Approval Warning */}
          {requiresMD && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-orange-400">MD Approval Required</p>
                <p className="text-xs text-zinc-400">Amount exceeds ₹{MD_APPROVAL_THRESHOLD.toLocaleString()}</p>
              </div>
            </div>
          )}

          {/* Expected Delivery */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Expected Delivery *</label>
            <input
              type="date"
              value={expectedDelivery}
              onChange={e => setExpectedDelivery(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any special instructions..."
              className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-xl text-white placeholder-zinc-500 resize-none h-20 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
          <button onClick={onClose} className="px-4 py-2 text-zinc-400 hover:text-white">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !expectedDelivery}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
            Create PO
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ==========================================
// PO DETAIL MODAL
// ==========================================
function PODetailModal({ po, onClose }: { po: PurchaseOrder; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-xl font-bold text-white">{po.poNumber}</h2>
            <p className="text-sm text-zinc-400">Purchase Order Details</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={po.status} />
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-150px)]">
          {/* Vendor Info */}
          <div className="bg-zinc-800/50 rounded-xl p-4 mb-6">
            <h3 className="text-sm font-semibold text-zinc-300 mb-3">Vendor Details</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-zinc-500">Name</p>
                <p className="text-white font-medium">{po.vendorDetails?.name}</p>
              </div>
              <div>
                <p className="text-zinc-500">Contact</p>
                <p className="text-white">{po.vendorDetails?.contact}</p>
              </div>
              <div>
                <p className="text-zinc-500">Email</p>
                <p className="text-white">{po.vendorDetails?.email}</p>
              </div>
              <div>
                <p className="text-zinc-500">GSTIN</p>
                <p className="text-white">{po.vendorDetails?.gstin || '-'}</p>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-zinc-300 mb-3">Order Items</h3>
            <div className="bg-zinc-800/50 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-zinc-800/80">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase">Item</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-400 uppercase">Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-400 uppercase">Unit Price</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-400 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {po.items?.map((item, i) => (
                    <tr key={i} className="border-t border-white/5">
                      <td className="px-4 py-3">
                        <p className="text-sm text-white">{item.itemName}</p>
                        <p className="text-xs text-zinc-500">{item.itemCode}</p>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-zinc-300">{item.quantity} {item.unit}</td>
                      <td className="px-4 py-3 text-right text-sm text-zinc-300">₹{item.unitPrice?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-sm text-white font-medium">₹{item.totalPrice?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-white/10 bg-zinc-800/80">
                    <td colSpan={3} className="px-4 py-2 text-right text-sm text-zinc-400">Subtotal</td>
                    <td className="px-4 py-2 text-right text-sm text-white">₹{po.subtotal?.toLocaleString()}</td>
                  </tr>
                  <tr className="bg-zinc-800/80">
                    <td colSpan={3} className="px-4 py-2 text-right text-sm text-zinc-400">GST (18%)</td>
                    <td className="px-4 py-2 text-right text-sm text-white">₹{po.gstAmount?.toLocaleString()}</td>
                  </tr>
                  <tr className="bg-zinc-800/80">
                    <td colSpan={3} className="px-4 py-3 text-right text-lg font-bold text-white">Total</td>
                    <td className="px-4 py-3 text-right text-xl font-bold text-cyan-400">₹{po.totalAmount?.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Terms */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-800/50 rounded-lg p-4">
              <p className="text-xs text-zinc-500 mb-1">Payment Terms</p>
              <p className="text-sm text-white">{po.paymentTerms || '-'}</p>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-4">
              <p className="text-xs text-zinc-500 mb-1">Delivery Terms</p>
              <p className="text-sm text-white">{po.deliveryTerms || '-'}</p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
