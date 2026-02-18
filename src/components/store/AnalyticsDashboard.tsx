/**
 * Store Analytics Dashboard Components
 * Charts, KPIs, and Insights for Inventory Analytics
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Package,
  AlertTriangle,
  DollarSign,
  Activity,
  BarChart3,
  PieChart as PieChartIcon,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import type { InventoryAnalytics, CategoryStats, MaterialUsage, MonthlyTrend } from '@/types/store-enhanced';

// ==========================================
// KPI CARD
// ==========================================

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
}

export function KPICard({ title, value, change, changeLabel, icon, color, trend }: KPICardProps) {
  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend === 'up') return <ArrowUp className="w-3 h-3" />;
    if (trend === 'down') return <ArrowDown className="w-3 h-3" />;
    return <Minus className="w-3 h-3" />;
  };

  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-400';
    if (trend === 'down') return 'text-red-400';
    return 'text-zinc-400';
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl rounded-2xl p-5 border border-white/10 hover:border-white/20 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${color}`}>
          {icon}
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium ${getTrendColor()}`}>
            {getTrendIcon()}
            <span>{Math.abs(change)}%</span>
          </div>
        )}
      </div>
      <div>
        <p className="text-sm text-zinc-400 mb-1">{title}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
        {changeLabel && (
          <p className="text-xs text-zinc-500 mt-1">{changeLabel}</p>
        )}
      </div>
    </motion.div>
  );
}

// ==========================================
// CATEGORY BREAKDOWN CHART
// ==========================================

interface CategoryBreakdownProps {
  data: CategoryStats[];
}

export function CategoryBreakdown({ data }: CategoryBreakdownProps) {
  const colors = [
    'from-blue-500 to-blue-600',
    'from-green-500 to-green-600',
    'from-purple-500 to-purple-600',
    'from-orange-500 to-orange-600',
    'from-pink-500 to-pink-600',
    'from-cyan-500 to-cyan-600',
  ];

  const total = data.reduce((sum, cat) => sum + cat.totalValue, 0);

  return (
    <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl rounded-2xl p-6 border border-white/10">
      <div className="flex items-center gap-2 mb-6">
        <PieChartIcon className="w-5 h-5 text-blue-400" />
        <h3 className="text-lg font-semibold text-white">Category Breakdown</h3>
      </div>
      
      {/* Horizontal Bar Chart */}
      <div className="space-y-4">
        {data.slice(0, 6).map((category, index) => {
          const percentage = (category.totalValue / total) * 100;
          return (
            <div key={category.category}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-white">{category.category}</span>
                <div className="text-right">
                  <span className="text-sm font-bold text-white">
                    ₹{(category.totalValue / 1000).toFixed(1)}K
                  </span>
                  <span className="text-xs text-zinc-400 ml-2">
                    ({percentage.toFixed(1)}%)
                  </span>
                </div>
              </div>
              <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: index * 0.1 }}
                  className={`h-full bg-gradient-to-r ${colors[index % colors.length]} rounded-full`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Grid */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/10">
        <div className="text-center">
          <p className="text-xs text-zinc-400 mb-1">Categories</p>
          <p className="text-lg font-bold text-white">{data.length}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-zinc-400 mb-1">Total Items</p>
          <p className="text-lg font-bold text-white">
            {data.reduce((sum, cat) => sum + cat.itemCount, 0)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-zinc-400 mb-1">Total Value</p>
          <p className="text-lg font-bold text-green-400">
            ₹{(total / 100000).toFixed(2)}L
          </p>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// TOP ISSUED MATERIALS
// ==========================================

interface TopIssuedMaterialsProps {
  data: MaterialUsage[];
}

export function TopIssuedMaterials({ data }: TopIssuedMaterialsProps) {
  return (
    <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl rounded-2xl p-6 border border-white/10">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="w-5 h-5 text-green-400" />
        <h3 className="text-lg font-semibold text-white">Top Issued Materials</h3>
      </div>

      <div className="space-y-3">
        {data.slice(0, 8).map((material, index) => (
          <motion.div
            key={material.materialId}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/20 text-blue-400 text-sm font-bold">
                {index + 1}
              </div>
              <div>
                <p className="font-medium text-white text-sm">{material.materialName}</p>
                <p className="text-xs text-zinc-400">
                  {material.frequency} issues · {material.totalIssued} {material.unit}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold text-white">
                ₹{(material.value / 1000).toFixed(1)}K
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// MONTHLY TREND CHART
// ==========================================

interface MonthlyTrendChartProps {
  data: MonthlyTrend[];
}

export function MonthlyTrendChart({ data }: MonthlyTrendChartProps) {
  const maxValue = Math.max(
    ...data.map(d => Math.max(d.purchases, d.issues)),
    1
  );

  return (
    <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl rounded-2xl p-6 border border-white/10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">Monthly Trends</h3>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-gradient-to-br from-green-500 to-green-600" />
            <span className="text-zinc-400">Purchases</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-gradient-to-br from-orange-500 to-orange-600" />
            <span className="text-zinc-400">Issues</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="space-y-4">
        {data.map((month, index) => (
          <div key={month.month}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-zinc-400 w-16">{month.month}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-green-400 w-12 text-right">
                  {month.purchases}
                </span>
                <span className="text-xs text-orange-400 w-12 text-right">
                  {month.issues}
                </span>
              </div>
            </div>
            <div className="flex gap-1.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(month.purchases / maxValue) * 100}%` }}
                transition={{ duration: 0.8, delay: index * 0.05 }}
                className="h-6 bg-gradient-to-r from-green-500 to-green-600 rounded-lg"
              />
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(month.issues / maxValue) * 100}%` }}
                transition={{ duration: 0.8, delay: index * 0.05 }}
                className="h-6 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// QUICK STATS GRID
// ==========================================

interface QuickStatsProps {
  analytics: Partial<InventoryAnalytics>;
}

export function QuickStats({ analytics }: QuickStatsProps) {
  const stats = [
    {
      title: 'Total Inventory Value',
      value: `₹${((analytics.totalValue || 0) / 100000).toFixed(2)}L`,
      icon: <DollarSign className="w-5 h-5" />,
      color: 'from-green-500 to-emerald-600',
      trend: 'up' as const,
      change: 12.5
    },
    {
      title: 'Total Items',
      value: analytics.totalItems || 0,
      icon: <Package className="w-5 h-5" />,
      color: 'from-blue-500 to-blue-600',
      trend: 'neutral' as const
    },
    {
      title: 'Low Stock Items',
      value: analytics.lowStockItems || 0,
      icon: <AlertTriangle className="w-5 h-5" />,
      color: 'from-orange-500 to-orange-600',
      trend: 'down' as const,
      change: 3.2
    },
    {
      title: 'Out of Stock',
      value: analytics.outOfStock || 0,
      icon: <TrendingDown className="w-5 h-5" />,
      color: 'from-red-500 to-red-600',
      trend: 'up' as const,
      change: 1.5
    },
    {
      title: 'Avg Turnover Rate',
      value: `${(analytics.avgTurnoverRate || 0).toFixed(1)}x`,
      icon: <Activity className="w-5 h-5" />,
      color: 'from-purple-500 to-purple-600',
      trend: 'up' as const,
      change: 8.3
    },
    {
      title: 'Dead Stock',
      value: analytics.deadStock || 0,
      icon: <Package className="w-5 h-5" />,
      color: 'from-zinc-500 to-zinc-600',
      trend: 'neutral' as const
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <KPICard {...stat} />
        </motion.div>
      ))}
    </div>
  );
}

// ==========================================
// STOCK HEALTH INDICATOR
// ==========================================

interface StockHealthProps {
  totalItems: number;
  lowStock: number;
  outOfStock: number;
  expiringSoon: number;
}

export function StockHealth({ totalItems, lowStock, outOfStock, expiringSoon }: StockHealthProps) {
  const healthyItems = totalItems - lowStock - outOfStock;
  const healthPercentage = (healthyItems / totalItems) * 100;

  const getHealthStatus = () => {
    if (healthPercentage >= 80) return { label: 'Excellent', color: 'text-green-400', bg: 'from-green-500 to-green-600' };
    if (healthPercentage >= 60) return { label: 'Good', color: 'text-blue-400', bg: 'from-blue-500 to-blue-600' };
    if (healthPercentage >= 40) return { label: 'Fair', color: 'text-orange-400', bg: 'from-orange-500 to-orange-600' };
    return { label: 'Critical', color: 'text-red-400', bg: 'from-red-500 to-red-600' };
  };

  const status = getHealthStatus();

  return (
    <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl rounded-2xl p-6 border border-white/10">
      <div className="flex items-center gap-2 mb-6">
        <Activity className="w-5 h-5 text-green-400" />
        <h3 className="text-lg font-semibold text-white">Inventory Health</h3>
      </div>

      <div className="text-center mb-6">
        <p className={`text-5xl font-bold ${status.color} mb-2`}>
          {healthPercentage.toFixed(0)}%
        </p>
        <p className="text-sm text-zinc-400">{status.label} Health Status</p>
      </div>

      {/* Health Bar */}
      <div className="h-4 bg-white/5 rounded-full overflow-hidden mb-6">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${healthPercentage}%` }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          className={`h-full bg-gradient-to-r ${status.bg}`}
        />
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-3 rounded-xl bg-green-500/10 border border-green-500/20">
          <p className="text-2xl font-bold text-green-400">{healthyItems}</p>
          <p className="text-xs text-zinc-400 mt-1">Healthy</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
          <p className="text-2xl font-bold text-orange-400">{lowStock}</p>
          <p className="text-xs text-zinc-400 mt-1">Low Stock</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <p className="text-2xl font-bold text-red-400">{outOfStock}</p>
          <p className="text-xs text-zinc-400 mt-1">Out of Stock</p>
        </div>
      </div>

      {expiringSoon > 0 && (
        <div className="mt-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-300">Expiring Soon</span>
            <span className="text-lg font-bold text-yellow-400">{expiringSoon}</span>
          </div>
        </div>
      )}
    </div>
  );
}
