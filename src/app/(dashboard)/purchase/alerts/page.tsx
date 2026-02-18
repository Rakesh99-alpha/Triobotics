'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, AlertCircle, XCircle, Bell, Check,
  Clock, RefreshCw, Search, Download, Settings,
  ChevronDown, ChevronRight, Package, ShoppingCart,
  Eye, EyeOff, Volume2, VolumeX, Mail, MailX
} from 'lucide-react';
import { db } from '@/lib/firebase/client';
import { collection, getDocs } from 'firebase/firestore';
import { stockAlertService } from '@/lib/services/erp-services';
import type { StockAlert, AlertLevel, AlertStatus } from '@/types/erp-extended';

// ==========================================
// ALERT LEVEL CONFIG
// ==========================================
const ALERT_CONFIG = {
  out_of_stock: {
    icon: XCircle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    label: 'Out of Stock',
    priority: 1
  },
  critical: {
    icon: AlertCircle,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    label: 'Critical',
    priority: 2
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    label: 'Warning',
    priority: 3
  },
  info: {
    icon: Bell,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    label: 'Info',
    priority: 4
  }
};

// ==========================================
// ALERT CARD COMPONENT
// ==========================================
interface AlertCardProps {
  alert: StockAlert;
  onAcknowledge: (id: string) => void;
  onSnooze: (id: string, hours: number) => void;
  onCreatePO: (alert: StockAlert) => void;
  expanded: boolean;
  onToggleExpand: () => void;
}

function AlertCard({ alert, onAcknowledge, onSnooze, onCreatePO, expanded, onToggleExpand }: AlertCardProps) {
  const config = ALERT_CONFIG[alert.alertLevel];
  const Icon = config.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className={`${config.bgColor} border ${config.borderColor} rounded-xl overflow-hidden transition-all`}
    >
      {/* Main Content */}
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={`p-2.5 rounded-lg ${config.bgColor}`}>
            <Icon className={`w-5 h-5 ${config.color}`} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="text-white font-medium">{alert.materialName}</h4>
                <p className="text-zinc-400 text-sm">{alert.materialCode}</p>
              </div>
              <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${config.bgColor} ${config.color}`}>
                {config.label}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div>
                <p className="text-zinc-500 text-xs">Current Stock</p>
                <p className={`font-semibold ${alert.currentStock <= 0 ? 'text-red-400' : 'text-white'}`}>
                  {alert.currentStock} {alert.unit}
                </p>
              </div>
              <div>
                <p className="text-zinc-500 text-xs">Min Stock</p>
                <p className="text-white font-semibold">{alert.minStock} {alert.unit}</p>
              </div>
              <div>
                <p className="text-zinc-500 text-xs">Reorder Qty</p>
                <p className="text-emerald-400 font-semibold">{alert.suggestedReorderQty} {alert.unit}</p>
              </div>
              <div>
                <p className="text-zinc-500 text-xs">Supplier</p>
                <p className="text-white font-semibold truncate">{alert.supplierName || 'Not set'}</p>
              </div>
            </div>
          </div>

          {/* Expand Button */}
          <button
            onClick={onToggleExpand}
            className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors"
          >
            {expanded ? (
              <ChevronDown className="w-5 h-5 text-zinc-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-zinc-400" />
            )}
          </button>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-zinc-700/50">
          {alert.status === 'active' && (
            <>
              <button
                onClick={() => onAcknowledge(alert.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-700/50 hover:bg-zinc-700 
                  text-zinc-300 rounded-lg text-sm transition-colors"
              >
                <Check className="w-4 h-4" />
                Acknowledge
              </button>
              <button
                onClick={() => onSnooze(alert.id, 4)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-700/50 hover:bg-zinc-700 
                  text-zinc-300 rounded-lg text-sm transition-colors"
              >
                <Clock className="w-4 h-4" />
                Snooze 4h
                
              </button>
            </>
          )}
          <button
            onClick={() => onCreatePO(alert)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 
              text-white rounded-lg text-sm transition-colors ml-auto"
          >
            <ShoppingCart className="w-4 h-4" />
            Create PO
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-zinc-700/50 bg-zinc-800/30 p-4"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-zinc-500">Alert Created</p>
                <p className="text-zinc-300">{new Date(alert.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-zinc-500">Status</p>
                <p className="text-zinc-300 capitalize">{alert.status.replace('_', ' ')}</p>
              </div>
              {alert.acknowledgedBy && (
                <div>
                  <p className="text-zinc-500">Acknowledged By</p>
                  <p className="text-zinc-300">{alert.acknowledgedBy}</p>
                </div>
              )}
              {alert.snoozedUntil && (
                <div>
                  <p className="text-zinc-500">Snoozed Until</p>
                  <p className="text-zinc-300">{new Date(alert.snoozedUntil).toLocaleString()}</p>
                </div>
              )}
              {alert.linkedPOId && (
                <div>
                  <p className="text-zinc-500">Linked PO</p>
                  <p className="text-blue-400">{alert.linkedPOId}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ==========================================
// ALERT SUMMARY CARDS
// ==========================================
interface SummaryCardProps {
  level: AlertLevel;
  count: number;
  onClick: () => void;
  active: boolean;
}

function SummaryCard({ level, count, onClick, active }: SummaryCardProps) {
  const config = ALERT_CONFIG[level];
  const Icon = config.icon;

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`p-4 rounded-xl border transition-all ${active
        ? `${config.bgColor} ${config.borderColor}`
        : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
        }`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${config.bgColor}`}>
          <Icon className={`w-5 h-5 ${config.color}`} />
        </div>
        <div className="text-left">
          <p className="text-2xl font-bold text-white">{count}</p>
          <p className="text-zinc-400 text-sm">{config.label}</p>
        </div>
      </div>
    </motion.button>
  );
}

// ==========================================
// NOTIFICATION SETTINGS MODAL
// ==========================================
interface NotificationSettingsProps {
  open: boolean;
  onClose: () => void;
}

function NotificationSettings({ open, onClose }: NotificationSettingsProps) {
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [inAppEnabled, setInAppEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [alertLevels, setAlertLevels] = useState<AlertLevel[]>(['out_of_stock', 'critical', 'warning']);

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-400" />
          Notification Settings
        </h3>

        <div className="space-y-4">
          {/* Email Notifications */}
          <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              {emailEnabled ? (
                <Mail className="w-5 h-5 text-blue-400" />
              ) : (
                <MailX className="w-5 h-5 text-zinc-500" />
              )}
              <div>
                <p className="text-white font-medium">Email Alerts</p>
                <p className="text-zinc-500 text-xs">Receive alerts via email</p>
              </div>
            </div>
            <button
              onClick={() => setEmailEnabled(!emailEnabled)}
              className={`w-12 h-6 rounded-full transition-colors ${emailEnabled ? 'bg-blue-600' : 'bg-zinc-700'
                }`}
            >
              <motion.div
                animate={{ x: emailEnabled ? 24 : 2 }}
                className="w-5 h-5 bg-white rounded-full"
              />
            </button>
          </div>

          {/* In-App Notifications */}
          <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              {inAppEnabled ? (
                <Eye className="w-5 h-5 text-emerald-400" />
              ) : (
                <EyeOff className="w-5 h-5 text-zinc-500" />
              )}
              <div>
                <p className="text-white font-medium">In-App Alerts</p>
                <p className="text-zinc-500 text-xs">Show alerts in dashboard</p>
              </div>
            </div>
            <button
              onClick={() => setInAppEnabled(!inAppEnabled)}
              className={`w-12 h-6 rounded-full transition-colors ${inAppEnabled ? 'bg-emerald-600' : 'bg-zinc-700'
                }`}
            >
              <motion.div
                animate={{ x: inAppEnabled ? 24 : 2 }}
                className="w-5 h-5 bg-white rounded-full"
              />
            </button>
          </div>

          {/* Sound Notifications */}
          <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              {soundEnabled ? (
                <Volume2 className="w-5 h-5 text-purple-400" />
              ) : (
                <VolumeX className="w-5 h-5 text-zinc-500" />
              )}
              <div>
                <p className="text-white font-medium">Sound Alerts</p>
                <p className="text-zinc-500 text-xs">Play sound for critical alerts</p>
              </div>
            </div>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`w-12 h-6 rounded-full transition-colors ${soundEnabled ? 'bg-purple-600' : 'bg-zinc-700'
                }`}
            >
              <motion.div
                animate={{ x: soundEnabled ? 24 : 2 }}
                className="w-5 h-5 bg-white rounded-full"
              />
            </button>
          </div>

          {/* Alert Levels */}
          <div className="p-3 bg-zinc-800/50 rounded-lg">
            <p className="text-white font-medium mb-3">Alert Levels to Notify</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(ALERT_CONFIG).map(([level, config]) => {
                const isSelected = alertLevels.includes(level as AlertLevel);
                return (
                  <button
                    key={level}
                    onClick={() => {
                      if (isSelected) {
                        setAlertLevels(alertLevels.filter(l => l !== level));
                      } else {
                        setAlertLevels([...alertLevels, level as AlertLevel]);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${isSelected
                      ? `${config.bgColor} ${config.color} ${config.borderColor} border`
                      : 'bg-zinc-700/50 text-zinc-400 border border-transparent'
                      }`}
                  >
                    {config.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Save Settings
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ==========================================
// MAIN STOCK ALERTS PAGE
// ==========================================
export default function StockAlertsPage() {
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState<AlertLevel | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<AlertStatus | 'all'>('all');
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set());
  const [showSettings, setShowSettings] = useState(false);

  // Load alerts from Firebase
  useEffect(() => {
    // Generate alerts based on current stock levels
    const loadAlerts = async () => {
      try {
        // First generate any new alerts
        await stockAlertService.checkAndGenerateAlerts();
      } catch (error) {
        console.error('Error generating alerts:', error);
      }
    };

    loadAlerts();

    // Subscribe to alerts
    const unsubscribe = stockAlertService.subscribeToAlerts((alertsData) => {
      setAlerts(alertsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Also load materials to check for low stock without alerts
  useEffect(() => {
    const loadMaterialsAsAlerts = async () => {
      try {
        const materialsSnap = await getDocs(collection(db, 'inventory_materials'));
        const materialAlerts: StockAlert[] = [];

        materialsSnap.forEach(doc => {
          const mat = doc.data();
          const currentStock = mat.current_stock || 0;
          const minStock = mat.min_stock || 0;

          let alertLevel: AlertLevel | null = null;
          if (currentStock <= 0) {
            alertLevel = 'out_of_stock';
          } else if (minStock > 0 && currentStock <= minStock * 0.1) {
            alertLevel = 'critical';
          } else if (minStock > 0 && currentStock <= minStock * 0.25) {
            alertLevel = 'warning';
          } else if (minStock > 0 && currentStock <= minStock) {
            alertLevel = 'info';
          }

          if (alertLevel) {
            materialAlerts.push({
              id: `mat-${doc.id}`,
              materialId: doc.id,
              materialCode: mat.code || '',
              materialName: mat.name || 'Unknown',
              alertLevel,
              currentStock,
              minStock,
              reorderPoint: minStock,
              suggestedReorderQty: Math.max(minStock * 2 - currentStock, minStock),
              unit: mat.unit || 'units',
              supplierId: mat.supplier_id,
              supplierName: mat.supplier_name || 'Not set',
              status: 'active',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              autoReorderTriggered: false
            });
          }
        });

        // Merge with existing alerts, prioritizing Firebase alerts
        setAlerts(prev => {
          const existingIds = new Set(prev.map(a => a.materialId));
          const newAlerts = materialAlerts.filter(a => !existingIds.has(a.materialId));
          return [...prev, ...newAlerts].sort((a, b) =>
            ALERT_CONFIG[a.alertLevel].priority - ALERT_CONFIG[b.alertLevel].priority
          );
        });
        setLoading(false);
      } catch (error) {
        console.error('Error loading materials:', error);
        setLoading(false);
      }
    };

    loadMaterialsAsAlerts();
  }, []);

  // Filter and sort alerts
  const filteredAlerts = useMemo(() => {
    return alerts
      .filter(alert => {
        const matchesSearch = searchTerm === '' ||
          alert.materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          alert.materialCode.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesLevel = filterLevel === 'all' || alert.alertLevel === filterLevel;
        const matchesStatus = filterStatus === 'all' || alert.status === filterStatus;
        return matchesSearch && matchesLevel && matchesStatus;
      })
      .sort((a, b) => ALERT_CONFIG[a.alertLevel].priority - ALERT_CONFIG[b.alertLevel].priority);
  }, [alerts, searchTerm, filterLevel, filterStatus]);

  // Calculate summary counts
  const alertCounts = useMemo(() => ({
    out_of_stock: alerts.filter(a => a.alertLevel === 'out_of_stock').length,
    critical: alerts.filter(a => a.alertLevel === 'critical').length,
    warning: alerts.filter(a => a.alertLevel === 'warning').length,
    info: alerts.filter(a => a.alertLevel === 'info').length,
    total: alerts.length
  }), [alerts]);

  const handleAcknowledge = async (alertId: string) => {
    try {
      await stockAlertService.acknowledgeAlert(alertId, 'current-user');
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const handleSnooze = async (alertId: string, hours: number) => {
    try {
      await stockAlertService.snoozeAlert(alertId, hours);
    } catch (error) {
      console.error('Error snoozing alert:', error);
    }
  };

  const handleCreatePO = (alert: StockAlert) => {
    // Navigate to PO creation with pre-filled data
    console.log('Creating PO for:', alert);
    // Would redirect to PO creation page with alert data
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await stockAlertService.checkAndGenerateAlerts();
    } catch (error) {
      console.error('Error refreshing alerts:', error);
    }
    setRefreshing(false);
  };

  const toggleExpand = (alertId: string) => {
    setExpandedAlerts(prev => {
      const next = new Set(prev);
      if (next.has(alertId)) {
        next.delete(alertId);
      } else {
        next.add(alertId);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-zinc-400">Loading stock alerts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <AlertTriangle className="w-7 h-7 text-orange-400" />
              Stock Alerts
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              {alertCounts.total} active alerts requiring attention
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 
                text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 
                text-white rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard
            level="out_of_stock"
            count={alertCounts.out_of_stock}
            onClick={() => setFilterLevel(filterLevel === 'out_of_stock' ? 'all' : 'out_of_stock')}
            active={filterLevel === 'out_of_stock'}
          />
          <SummaryCard
            level="critical"
            count={alertCounts.critical}
            onClick={() => setFilterLevel(filterLevel === 'critical' ? 'all' : 'critical')}
            active={filterLevel === 'critical'}
          />
          <SummaryCard
            level="warning"
            count={alertCounts.warning}
            onClick={() => setFilterLevel(filterLevel === 'warning' ? 'all' : 'warning')}
            active={filterLevel === 'warning'}
          />
          <SummaryCard
            level="info"
            count={alertCounts.info}
            onClick={() => setFilterLevel(filterLevel === 'info' ? 'all' : 'info')}
            active={filterLevel === 'info'}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search materials..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-800/50 border border-zinc-700 rounded-lg
                text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as AlertStatus | 'all')}
            className="px-4 py-2.5 bg-zinc-800/50 border border-zinc-700 rounded-lg
              text-white focus:outline-none focus:border-blue-500 transition-colors"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="snoozed">Snoozed</option>
            <option value="resolved">Resolved</option>
          </select>

          {/* Clear Filters */}
          {(filterLevel !== 'all' || filterStatus !== 'all' || searchTerm) && (
            <button
              onClick={() => {
                setFilterLevel('all');
                setFilterStatus('all');
                setSearchTerm('');
              }}
              className="px-4 py-2.5 text-zinc-400 hover:text-white transition-colors"
            >
              Clear Filters
            </button>
          )}

          {/* Bulk Actions */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 
                text-white rounded-lg transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              Create PO for All
            </button>
            <button
              className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 
                text-white rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Alerts List */}
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredAlerts.length > 0 ? (
              filteredAlerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onAcknowledge={handleAcknowledge}
                  onSnooze={handleSnooze}
                  onCreatePO={handleCreatePO}
                  expanded={expandedAlerts.has(alert.id)}
                  onToggleExpand={() => toggleExpand(alert.id)}
                />
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <Package className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-zinc-400 mb-2">No Alerts Found</h3>
                <p className="text-zinc-500">
                  {searchTerm || filterLevel !== 'all' || filterStatus !== 'all'
                    ? 'Try adjusting your filters'
                    : 'All materials are well stocked!'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-zinc-500 pt-4">
          Alerts are automatically generated when stock falls below minimum levels
        </div>
      </div>

      {/* Settings Modal */}
      <NotificationSettings open={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
