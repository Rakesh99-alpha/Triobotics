/**
 * Quality Control & Stock Alert Components
 * QC inspections, vendor returns, and alert management
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  FileCheck,
  TrendingDown,
  Bell,
  CheckCheck,
  CalendarClock,
  Info
} from 'lucide-react';
import type {
  QualityInspection,
  QualityStatus,
  VendorReturn,
  StockAlert,
  ExpiryTracking
} from '@/types/store-enhanced';

// ==========================================
// QUALITY STATUS BADGE
// ==========================================

export function QualityStatusBadge({ status }: { status: QualityStatus }) {
  const badges = {
    pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Pending', icon: Clock },
    passed: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Passed', icon: CheckCircle2 },
    failed: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Failed', icon: XCircle },
    under_review: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Under Review', icon: FileCheck },
    conditional: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'Conditional', icon: AlertTriangle }
  };

  const badge = badges[status];
  const Icon = badge.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
      <Icon className="w-3 h-3" />
      {badge.label}
    </span>
  );
}

// ==========================================
// QC INSPECTION CARD
// ==========================================

interface QCInspectionCardProps {
  inspection: QualityInspection;
  onClick?: () => void;
}

export function QCInspectionCard({ inspection, onClick }: QCInspectionCardProps) {
  const passRate = inspection.tests.length > 0
    ? (inspection.tests.filter(t => t.result === 'pass').length / inspection.tests.length) * 100
    : 0;

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      onClick={onClick}
      className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl rounded-2xl p-5 border border-white/10 hover:border-white/20 transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileCheck className="w-4 h-4 text-blue-400" />
            <h3 className="font-semibold text-white">{inspection.inspectionNumber}</h3>
          </div>
          <p className="text-sm text-zinc-400">{inspection.materialName}</p>
          {inspection.batchNumber && (
            <p className="text-xs text-zinc-500">Batch: {inspection.batchNumber}</p>
          )}
        </div>
        <QualityStatusBadge status={inspection.status} />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-2 rounded-lg bg-green-500/10 border border-green-500/20">
          <p className="text-lg font-bold text-green-400">{inspection.acceptedQty}</p>
          <p className="text-xs text-zinc-400">Accepted</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-lg font-bold text-red-400">{inspection.rejectedQty}</p>
          <p className="text-xs text-zinc-400">Rejected</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
          <p className="text-lg font-bold text-orange-400">{inspection.reworkQty}</p>
          <p className="text-xs text-zinc-400">Rework</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-400">Test Pass Rate</span>
          <span className="font-semibold text-white">{passRate.toFixed(0)}%</span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${passRate}%` }}
            className="h-full bg-gradient-to-r from-green-500 to-green-600"
          />
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
        <span className="text-zinc-400">Inspector: {inspection.inspector}</span>
        <span className="text-zinc-500">
          {new Date(inspection.inspectionDate).toLocaleDateString()}
        </span>
      </div>
    </motion.div>
  );
}

// ==========================================
// VENDOR RETURN CARD
// ==========================================

interface VendorReturnCardProps {
  vendorReturn: VendorReturn;
  onClick?: () => void;
}

export function VendorReturnCard({ vendorReturn, onClick }: VendorReturnCardProps) {
  const statusColors = {
    initiated: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
    approved: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
    shipped: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
    completed: { bg: 'bg-green-500/20', text: 'text-green-400' }
  };

  const status = statusColors[vendorReturn.status];

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      onClick={onClick}
      className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl rounded-2xl p-5 border border-white/10 hover:border-white/20 transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-red-400" />
            <h3 className="font-semibold text-white">{vendorReturn.returnNumber}</h3>
          </div>
          <p className="text-sm text-zinc-400">{vendorReturn.vendorName}</p>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
          {vendorReturn.status.replace('_', ' ')}
        </span>
      </div>

      <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3 mb-4">
        <p className="text-sm font-medium text-red-400 mb-1">
          {vendorReturn.reason.replace('_', ' ').toUpperCase()}
        </p>
        <p className="text-xs text-zinc-400">{vendorReturn.description}</p>
      </div>

      <div className="space-y-2 mb-4">
        <p className="text-xs text-zinc-500">Items:</p>
        {vendorReturn.items.slice(0, 2).map((item, idx) => (
          <div key={idx} className="flex items-center justify-between text-sm">
            <span className="text-zinc-300">{item.materialName}</span>
            <span className="text-zinc-400">{item.returnQty} {item.unit}</span>
          </div>
        ))}
        {vendorReturn.items.length > 2 && (
          <p className="text-xs text-zinc-500">+{vendorReturn.items.length - 2} more</p>
        )}
      </div>

      {vendorReturn.refundAmount && (
        <div className="pt-4 border-t border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">Refund Amount</span>
            <span className="text-lg font-bold text-red-400">
              ₹{vendorReturn.refundAmount.toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ==========================================
// STOCK ALERT CARD
// ==========================================

interface StockAlertCardProps {
  alert: StockAlert;
  onAcknowledge?: () => void;
  onResolve?: () => void;
}

export function StockAlertCard({ alert, onAcknowledge, onResolve }: StockAlertCardProps) {
  const severityConfig = {
    critical: { bg: 'from-red-500 to-red-600', icon: AlertTriangle, color: 'text-red-400' },
    high: { bg: 'from-orange-500 to-orange-600', icon: AlertTriangle, color: 'text-orange-400' },
    medium: { bg: 'from-yellow-500 to-yellow-600', icon: Bell, color: 'text-yellow-400' },
    low: { bg: 'from-blue-500 to-blue-600', icon: Info, color: 'text-blue-400' }
  };

  const config = severityConfig[alert.severity];
  const Icon = config.icon;

  const alertTypeLabels = {
    low_stock: 'Low Stock Alert',
    out_of_stock: 'Out of Stock',
    expiry_near: 'Expiring Soon',
    expired: 'Expired',
    reorder: 'Reorder Required',
    overstock: 'Overstock'
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl rounded-2xl p-5 border border-white/10"
    >
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl bg-gradient-to-br ${config.bg}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h4 className="font-semibold text-white mb-1">
                {alertTypeLabels[alert.alertType]}
              </h4>
              <p className="text-sm text-zinc-400">{alert.materialName}</p>
            </div>
            <span className={`text-xs font-medium px-2 py-1 rounded-full bg-white/10 ${config.color}`}>
              {alert.severity.toUpperCase()}
            </span>
          </div>

          <p className="text-sm text-zinc-300 mb-3">{alert.message}</p>

          {alert.actionRequired && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 mb-3">
              <p className="text-xs text-zinc-400 mb-1">Action Required:</p>
              <p className="text-sm text-white">{alert.actionRequired}</p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">
              {new Date(alert.triggeredAt).toLocaleString()}
            </span>
            
            {!alert.resolved && (
              <div className="flex gap-2">
                {!alert.acknowledgedBy && onAcknowledge && (
                  <button
                    onClick={onAcknowledge}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                  >
                    <CheckCheck className="w-3 h-3" />
                    Acknowledge
                  </button>
                )}
                {onResolve && (
                  <button
                    onClick={onResolve}
                    className="px-3 py-1.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 rounded-lg text-xs font-medium transition-all flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    Resolve
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ==========================================
// EXPIRY TRACKING LIST
// ==========================================

interface ExpiryTrackingListProps {
  items: ExpiryTracking[];
}

export function ExpiryTrackingList({ items }: ExpiryTrackingListProps) {
  const expiredItems = items.filter(i => i.status === 'expired');
  const expiringSoon = items.filter(i => i.status === 'expiring_soon');

  return (
    <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl rounded-2xl p-6 border border-white/10">
      <div className="flex items-center gap-2 mb-6">
        <CalendarClock className="w-5 h-5 text-yellow-400" />
        <h3 className="text-lg font-semibold text-white">Expiry Tracking</h3>
        <span className="ml-auto text-sm text-zinc-400">
          {items.length} items tracked
        </span>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-red-400">{expiredItems.length}</p>
          <p className="text-xs text-zinc-400 mt-1">Expired</p>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-yellow-400">{expiringSoon.length}</p>
          <p className="text-xs text-zinc-400 mt-1">Expiring Soon</p>
        </div>
      </div>

      {/* Items List */}
      <div className="space-y-3">
        {items.slice(0, 10).map((item) => (
          <div
            key={item.id}
            className={`p-3 rounded-xl border ${
              item.status === 'expired'
                ? 'bg-red-500/5 border-red-500/20'
                : 'bg-yellow-500/5 border-yellow-500/20'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <p className="font-medium text-white text-sm">{item.materialName}</p>
                <p className="text-xs text-zinc-400">Batch: {item.batchNumber}</p>
              </div>
              <span
                className={`text-xs font-bold ${
                  item.status === 'expired' ? 'text-red-400' : 'text-yellow-400'
                }`}
              >
                {item.daysToExpiry < 0
                  ? `${Math.abs(item.daysToExpiry)} days ago`
                  : `${item.daysToExpiry} days`}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Qty: {item.quantity}</span>
              <span className="text-zinc-500">Loc: {item.location}</span>
              <span className="text-zinc-500">
                Exp: {new Date(item.expiryDate).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// ALERT SUMMARY WIDGET
// ==========================================

interface AlertSummaryProps {
  alerts: StockAlert[];
}

export function AlertSummary({ alerts }: AlertSummaryProps) {
  const unresolved = alerts.filter(a => !a.resolved);
  const critical = unresolved.filter(a => a.severity === 'critical').length;
  const high = unresolved.filter(a => a.severity === 'high').length;
  const medium = unresolved.filter(a => a.severity === 'medium').length;

  return (
    <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl rounded-2xl p-5 border border-white/10">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="w-5 h-5 text-red-400" />
        <h3 className="text-lg font-semibold text-white">Active Alerts</h3>
        <span className="ml-auto px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 text-sm font-bold">
          {unresolved.length}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between p-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <span className="text-sm text-zinc-300">Critical</span>
          <span className="text-xl font-bold text-red-400">{critical}</span>
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
          <span className="text-sm text-zinc-300">High</span>
          <span className="text-xl font-bold text-orange-400">{high}</span>
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
          <span className="text-sm text-zinc-300">Medium</span>
          <span className="text-xl font-bold text-yellow-400">{medium}</span>
        </div>
      </div>
    </div>
  );
}
