'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  ShoppingCart, Clock, CheckCircle, XCircle, AlertTriangle, Eye,
  IndianRupee, Loader2, X, TrendingUp,
  ClipboardList, MessageSquare, ThumbsUp, ThumbsDown, Plus
} from 'lucide-react';
import {
  subscribeToPOs,
  subscribeToPRs,
  subscribeToEnquiries,
  approvePO,
  rejectPO,
} from '@/lib/services/procurementService';
import { PurchaseOrder, PurchaseRequest, Enquiry } from '@/types/purchase';
import {
  AreaChart, Area, PieChart as RechartsPie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

// ==========================================
// STATUS BADGE
// ==========================================
const StatusBadge = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    draft: 'bg-zinc-500/20 text-zinc-400',
    pending_md_approval: 'bg-orange-500/20 text-orange-400',
    approved: 'bg-emerald-500/20 text-emerald-400',
    rejected: 'bg-red-500/20 text-red-400',
    completed: 'bg-green-500/20 text-green-400',
    ordered: 'bg-blue-500/20 text-blue-400',
  };

  const labels: Record<string, string> = {
    draft: 'Draft',
    pending_md_approval: 'Awaiting Your Approval',
    approved: 'Approved',
    rejected: 'Rejected',
    completed: 'Completed',
    ordered: 'Ordered',
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-zinc-500/20 text-zinc-400'}`}>
      {labels[status] || status}
    </span>
  );
};

// ==========================================
// MAIN MD PURCHASE OVERVIEW
// ==========================================
export default function MDPurchaseOverviewNew() {
  const router = useRouter();
  const [pos, setPOs] = useState<PurchaseOrder[]>([]);
  const [prs, setPRs] = useState<PurchaseRequest[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'approvals' | 'all'>('overview');
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  // Get current user
  const getCurrentUser = () => {
    if (typeof window === 'undefined') return { id: '', name: '', role: '' };
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      try { return JSON.parse(stored); } catch { return { id: '', name: '', role: '' }; }
    }
    return { id: '', name: '', role: '' };
  };

  // Subscribe to data
  useEffect(() => {
    const unsubPOs = subscribeToPOs((data) => {
      setPOs(data);
      setLoading(false);
    });
    const unsubPRs = subscribeToPRs((data) => setPRs(data));
    const unsubEnquiries = subscribeToEnquiries((data) => setEnquiries(data));

    return () => {
      unsubPOs();
      unsubPRs();
      unsubEnquiries();
    };
  }, []);

  // Stats
  const pendingApprovals = pos.filter(po => po.status === 'pending_md_approval');
  const approvedPOs = pos.filter(po => po.status === 'approved');
  const rejectedPOs = pos.filter(po => po.status === 'rejected');
  const totalPOValue = pos.reduce((sum, po) => sum + (po.totalAmount || 0), 0);
  const pendingPRs = prs.filter(pr => pr.status === 'pending_enquiry');

  // Chart data
  const statusChartData = [
    { name: 'Pending', value: pendingApprovals.length, color: '#f59e0b' },
    { name: 'Approved', value: approvedPOs.length, color: '#10b981' },
    { name: 'Rejected', value: rejectedPOs.length, color: '#ef4444' },
  ];

  // Monthly trend (mock for now)
  const monthlyData = [
    { month: 'Jan', value: 125000 },
    { month: 'Feb', value: 180000 },
    { month: 'Mar', value: 145000 },
    { month: 'Apr', value: 220000 },
    { month: 'May', value: 175000 },
    { month: 'Jun', value: totalPOValue },
  ];

  // Handle approval
  const handleApprove = async (po: PurchaseOrder, comments: string) => {
    const user = getCurrentUser();
    try {
      await approvePO(po.id, user.id, user.name, comments);
      setShowApprovalModal(false);
      setSelectedPO(null);
    } catch (error) {
      console.error('Error approving PO:', error);
      alert('Failed to approve PO');
    }
  };

  // Handle rejection
  const handleReject = async (po: PurchaseOrder, reason: string) => {
    if (!reason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    const user = getCurrentUser();
    try {
      await rejectPO(po.id, user.id, user.name, reason);
      setShowApprovalModal(false);
      setSelectedPO(null);
    } catch (error) {
      console.error('Error rejecting PO:', error);
      alert('Failed to reject PO');
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'approvals', label: 'Pending Approvals', icon: Clock, count: pendingApprovals.length },
    { id: 'all', label: 'All Orders', icon: ShoppingCart },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Background */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />
      <div className="fixed top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Purchase Management</h1>
            <p className="text-zinc-400">R&D Dashboard - Review and approve purchase orders</p>
          </div>
          
          {/* Create PO Button */}
          <button
            onClick={() => router.push('/purchase?create=true')}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-5 h-5" />
            Create New PO
          </button>
        </div>

        {/* Alert for Pending Approvals */}
        {pendingApprovals.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 mb-6 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="font-semibold text-orange-400">{pendingApprovals.length} Purchase Order{pendingApprovals.length !== 1 ? 's' : ''} Awaiting Your Approval</p>
                <p className="text-sm text-zinc-400">Total value: ₹{pendingApprovals.reduce((s, po) => s + (po.totalAmount || 0), 0).toLocaleString()}</p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('approvals')}
              className="px-4 py-2 bg-orange-500/20 text-orange-400 rounded-lg hover:bg-orange-500/30 transition-colors text-sm font-medium"
            >
              Review Now →
            </button>
          </motion.div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{pendingPRs.length}</p>
                <p className="text-xs text-zinc-400">Pending PRs</p>
              </div>
            </div>
          </div>
          <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{pendingApprovals.length}</p>
                <p className="text-xs text-zinc-400">Awaiting Approval</p>
              </div>
            </div>
          </div>
          <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{approvedPOs.length}</p>
                <p className="text-xs text-zinc-400">Approved</p>
              </div>
            </div>
          </div>
          <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{rejectedPOs.length}</p>
                <p className="text-xs text-zinc-400">Rejected</p>
              </div>
            </div>
          </div>
          <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                <IndianRupee className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-white">₹{(totalPOValue / 100000).toFixed(1)}L</p>
                <p className="text-xs text-zinc-400">Total Value</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'overview' | 'approvals' | 'all')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-emerald-500 to-cyan-600 text-white'
                  : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id ? 'bg-white/20' : 'bg-orange-500/20 text-orange-400'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          </div>
        )}

        {/* Overview Tab */}
        {!loading && activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* PO Status Chart */}
            <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">PO Status Distribution</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                      labelStyle={{ color: '#fff' }}
                    />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Monthly Trend */}
            <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Monthly Purchase Value</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="month" stroke="#888" />
                    <YAxis stroke="#888" tickFormatter={(v) => `₹${(v/1000)}k`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                      formatter={(value) => [`₹${Number(value || 0).toLocaleString()}`, 'Value']}
                    />
                    <Area type="monotone" dataKey="value" stroke="#10b981" fillOpacity={1} fill="url(#colorValue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Workflow Summary */}
            <div className="lg:col-span-2 bg-zinc-900/50 border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Procurement Workflow Status</h3>
              <div className="flex items-center justify-between">
                {/* PR */}
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mb-2">
                    <ClipboardList className="w-8 h-8 text-yellow-400" />
                  </div>
                  <p className="text-2xl font-bold text-white">{prs.length}</p>
                  <p className="text-xs text-zinc-400">Purchase Requests</p>
                </div>
                <div className="flex-1 h-1 bg-zinc-700 mx-4 relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 to-blue-500 rounded" style={{ width: '60%' }} />
                </div>
                {/* Enquiry */}
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-2">
                    <MessageSquare className="w-8 h-8 text-blue-400" />
                  </div>
                  <p className="text-2xl font-bold text-white">{enquiries.length}</p>
                  <p className="text-xs text-zinc-400">Enquiries</p>
                </div>
                <div className="flex-1 h-1 bg-zinc-700 mx-4 relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded" style={{ width: '40%' }} />
                </div>
                {/* PO */}
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mb-2">
                    <ShoppingCart className="w-8 h-8 text-purple-400" />
                  </div>
                  <p className="text-2xl font-bold text-white">{pos.length}</p>
                  <p className="text-xs text-zinc-400">Purchase Orders</p>
                </div>
                <div className="flex-1 h-1 bg-zinc-700 mx-4 relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-green-500 rounded" style={{ width: `${pos.length > 0 ? (approvedPOs.length / pos.length) * 100 : 0}%` }} />
                </div>
                {/* Approved */}
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-2">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                  <p className="text-2xl font-bold text-white">{approvedPOs.length}</p>
                  <p className="text-xs text-zinc-400">Approved</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pending Approvals Tab */}
        {!loading && activeTab === 'approvals' && (
          <div className="space-y-4">
            {pendingApprovals.length === 0 ? (
              <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-12 text-center">
                <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">All Caught Up!</h3>
                <p className="text-zinc-400">No purchase orders pending your approval</p>
              </div>
            ) : (
              pendingApprovals.map(po => (
                <motion.div
                  key={po.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-zinc-900/50 border border-orange-500/30 rounded-xl p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-white">{po.poNumber}</h3>
                        <StatusBadge status={po.status} />
                      </div>
                      <p className="text-sm text-zinc-400 mt-1">Vendor: {po.vendorDetails?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-cyan-400">₹{po.totalAmount?.toLocaleString()}</p>
                      <p className="text-xs text-zinc-500">incl. GST</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4 text-sm">
                    <div>
                      <p className="text-zinc-500">Items</p>
                      <p className="text-white font-medium">{po.items?.length || 0}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Created By</p>
                      <p className="text-white font-medium">{po.createdByName}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Expected Delivery</p>
                      <p className="text-white font-medium">{po.expectedDelivery ? new Date(po.expectedDelivery).toLocaleDateString() : '-'}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Created</p>
                      <p className="text-white font-medium">{new Date(po.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Quick Items Preview */}
                  <div className="bg-zinc-800/50 rounded-lg p-3 mb-4">
                    <p className="text-xs text-zinc-500 mb-2">Order Items:</p>
                    <div className="flex flex-wrap gap-2">
                      {po.items?.slice(0, 4).map((item, i) => (
                        <span key={i} className="px-2 py-1 bg-zinc-700/50 text-zinc-300 text-xs rounded">
                          {item.itemName} × {item.quantity}
                        </span>
                      ))}
                      {(po.items?.length || 0) > 4 && (
                        <span className="px-2 py-1 bg-zinc-700/50 text-zinc-400 text-xs rounded">
                          +{(po.items?.length || 0) - 4} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={() => {
                        setSelectedPO(po);
                        setShowApprovalModal(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors text-sm"
                    >
                      <Eye className="w-4 h-4" />
                      Review Details
                    </button>
                    <button
                      onClick={() => handleReject(po, 'Rejected without detailed review')}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm"
                    >
                      <ThumbsDown className="w-4 h-4" />
                      Reject
                    </button>
                    <button
                      onClick={() => handleApprove(po, 'Approved')}
                      className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
                    >
                      <ThumbsUp className="w-4 h-4" />
                      Approve
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* All Orders Tab */}
        {!loading && activeTab === 'all' && (
          <div className="space-y-4">
            {pos.length === 0 ? (
              <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-12 text-center">
                <ShoppingCart className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-zinc-400 mb-2">No Purchase Orders</h3>
                <p className="text-zinc-500">POs will appear here when created by the purchase team</p>
              </div>
            ) : (
              pos.map(po => (
                <motion.div
                  key={po.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-zinc-900/50 border rounded-xl p-5 ${
                    po.status === 'pending_md_approval' ? 'border-orange-500/30' :
                    po.status === 'approved' ? 'border-green-500/20' :
                    po.status === 'rejected' ? 'border-red-500/20' : 'border-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-white">{po.poNumber}</h3>
                        <StatusBadge status={po.status} />
                      </div>
                      <p className="text-sm text-zinc-400 mt-1">Vendor: {po.vendorDetails?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-cyan-400">₹{po.totalAmount?.toLocaleString()}</p>
                      <p className="text-xs text-zinc-500">{new Date(po.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {po.status === 'approved' && (
                    <div className="mt-3 bg-green-500/10 border border-green-500/20 rounded-lg p-2 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-xs text-green-400">Approved on {po.approvedAt ? new Date(po.approvedAt).toLocaleString() : ''}</span>
                    </div>
                  )}

                  {po.status === 'rejected' && (
                    <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-lg p-2 flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-400" />
                      <span className="text-xs text-red-400">Rejected: {po.rejectedReason}</span>
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Approval Modal */}
      <AnimatePresence>
        {showApprovalModal && selectedPO && (
          <ApprovalModal
            po={selectedPO}
            onClose={() => {
              setShowApprovalModal(false);
              setSelectedPO(null);
            }}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ==========================================
// APPROVAL MODAL
// ==========================================
function ApprovalModal({
  po,
  onClose,
  onApprove,
  onReject
}: {
  po: PurchaseOrder;
  onClose: () => void;
  onApprove: (po: PurchaseOrder, comments: string) => void;
  onReject: (po: PurchaseOrder, reason: string) => void;
}) {
  const [comments, setComments] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [loading, setLoading] = useState(false);

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
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-gradient-to-r from-orange-500/10 to-transparent">
          <div>
            <h2 className="text-xl font-bold text-white">{po.poNumber}</h2>
            <p className="text-sm text-zinc-400">Review Purchase Order</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-250px)]">
          {/* Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-zinc-800/50 rounded-lg p-4">
              <p className="text-xs text-zinc-500">Vendor</p>
              <p className="text-sm font-medium text-white">{po.vendorDetails?.name}</p>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-4">
              <p className="text-xs text-zinc-500">Created By</p>
              <p className="text-sm font-medium text-white">{po.createdByName}</p>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-4">
              <p className="text-xs text-zinc-500">Expected Delivery</p>
              <p className="text-sm font-medium text-white">{po.expectedDelivery ? new Date(po.expectedDelivery).toLocaleDateString() : '-'}</p>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-4">
              <p className="text-xs text-zinc-500">Total Amount</p>
              <p className="text-lg font-bold text-cyan-400">₹{po.totalAmount?.toLocaleString()}</p>
            </div>
          </div>

          {/* Items Table */}
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
                    <td colSpan={3} className="px-4 py-3 text-right text-lg font-bold text-white">Grand Total</td>
                    <td className="px-4 py-3 text-right text-xl font-bold text-cyan-400">₹{po.totalAmount?.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Vendor Details */}
          <div className="bg-zinc-800/50 rounded-xl p-4 mb-6">
            <h3 className="text-sm font-semibold text-zinc-300 mb-3">Vendor Details</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-zinc-500">Contact</p>
                <p className="text-white">{po.vendorDetails?.contact}</p>
              </div>
              <div>
                <p className="text-zinc-500">Email</p>
                <p className="text-white">{po.vendorDetails?.email}</p>
              </div>
              <div>
                <p className="text-zinc-500">Phone</p>
                <p className="text-white">{po.vendorDetails?.phone}</p>
              </div>
              <div>
                <p className="text-zinc-500">GSTIN</p>
                <p className="text-white">{po.vendorDetails?.gstin || '-'}</p>
              </div>
            </div>
          </div>

          {/* Reject Form */}
          {showRejectForm && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
              <h3 className="text-sm font-semibold text-red-400 mb-3">Rejection Reason</h3>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Please provide a reason for rejection..."
                className="w-full px-4 py-3 bg-zinc-800 border border-red-500/30 rounded-xl text-white placeholder-zinc-500 resize-none h-24 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          )}

          {/* Approval Comments */}
          {!showRejectForm && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-300 mb-3">Approval Comments (Optional)</h3>
              <textarea
                value={comments}
                onChange={e => setComments(e.target.value)}
                placeholder="Add any comments for the purchase team..."
                className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-xl text-white placeholder-zinc-500 resize-none h-20 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-white/10 bg-zinc-900/50">
          <button onClick={onClose} className="px-4 py-2 text-zinc-400 hover:text-white">
            Cancel
          </button>

          <div className="flex items-center gap-3">
            {!showRejectForm ? (
              <>
                <button
                  onClick={() => setShowRejectForm(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-colors font-medium"
                >
                  <ThumbsDown className="w-4 h-4" />
                  Reject
                </button>
                <button
                  onClick={() => {
                    setLoading(true);
                    onApprove(po, comments);
                  }}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />}
                  Approve PO
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowRejectForm(false)}
                  className="px-4 py-2 text-zinc-400 hover:text-white"
                >
                  Back
                </button>
                <button
                  onClick={() => {
                    if (!rejectReason.trim()) {
                      alert('Please provide a reason');
                      return;
                    }
                    setLoading(true);
                    onReject(po, rejectReason);
                  }}
                  disabled={loading || !rejectReason.trim()}
                  className="flex items-center gap-2 px-6 py-2.5 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  Confirm Rejection
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
