/**
 * MD Live Store Dashboard
 * Real-time overview: consumption, inward, stock states, wastage, production cost
 * READ-ONLY for MD — data entered by Store Employee via empStore
 */

'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Package,
  AlertTriangle,
  DollarSign,
  Clock,
  Zap,
  ShieldAlert,
  Archive,
  BarChart3,
  ArrowDownToLine,
  ArrowUpFromLine,
  Gauge,
  Ban,
  PackageCheck,
  Layers,
  Activity
} from 'lucide-react';

// ==========================================
// TYPES
// ==========================================

interface MaterialData {
  id: string;
  name?: string;
  code?: string;
  category?: string;
  current_stock?: number;
  min_stock?: number;
  purchase_price?: number;
  unit?: string;
  supplier?: string;
  location?: string;
  bin_location?: string;
  stock_state?: 'available' | 'reserved' | 'quality_hold' | 'rejected' | 'scrap';
  lastUpdated?: string;
  updated_at?: string;
  [key: string]: unknown;
}

interface IssueRecord {
  id: string;
  material_id?: string;
  material_name?: string;
  quantity?: number;
  issued_at?: string;
  team?: string;
  project?: string;
  operator?: string;
  job_card?: string;
  batch_number?: string;
  [key: string]: unknown;
}

interface PurchaseEntry {
  id: string;
  material_id?: string;
  material_name?: string;
  quantity?: number;
  unit_price?: number;
  date?: string;
  supplier?: string;
  grn_number?: string;
  batch_number?: string;
  [key: string]: unknown;
}

interface MDLiveDashboardProps {
  materials: MaterialData[];
  issues: IssueRecord[];
  purchases?: PurchaseEntry[];
}

// ==========================================
// HELPER: Format Currency
// ==========================================

function fmtCurrency(val: number) {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
  return `₹${val.toFixed(0)}`;
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function MDLiveDashboard({ materials, issues, purchases = [] }: MDLiveDashboardProps) {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // ========== COMPUTED METRICS ==========

  const metrics = useMemo(() => {
    // Stock Value
    const totalStockValue = materials.reduce((s, m) => s + ((m.current_stock || 0) * (m.purchase_price || 0)), 0);

    // Today's Issues (consumption)
    const todayIssues = issues.filter(i => i.issued_at?.startsWith(todayStr));
    const todayConsumptionQty = todayIssues.reduce((s, i) => s + (i.quantity || 0), 0);
    const todayConsumptionValue = todayIssues.reduce((s, i) => {
      const mat = materials.find(m => m.id === i.material_id);
      return s + ((i.quantity || 0) * (mat?.purchase_price || 0));
    }, 0);

    // Today's Inward (purchases/GRN)
    const todayPurchases = purchases.filter(p => p.date?.startsWith(todayStr));
    const todayInwardQty = todayPurchases.reduce((s, p) => s + (p.quantity || 0), 0);
    const todayInwardValue = todayPurchases.reduce((s, p) => s + ((p.quantity || 0) * (p.unit_price || 0)), 0);

    // Stock States
    const available = materials.filter(m => !m.stock_state || m.stock_state === 'available').length;
    const reserved = materials.filter(m => m.stock_state === 'reserved').length;
    const qualityHold = materials.filter(m => m.stock_state === 'quality_hold').length;
    const rejected = materials.filter(m => m.stock_state === 'rejected').length;
    const scrap = materials.filter(m => m.stock_state === 'scrap').length;

    // Stock Health
    const lowStock = materials.filter(m => (m.current_stock || 0) > 0 && (m.current_stock || 0) <= (m.min_stock || 0)).length;
    const outOfStock = materials.filter(m => (m.current_stock || 0) === 0).length;
    const healthyStock = materials.filter(m => (m.current_stock || 0) > (m.min_stock || 0)).length;

    // Dead Stock (no issue in 90 days)
    const today = new Date();
    const ninetyDaysAgo = new Date(today.getTime() - 90 * 86400000);
    const deadStock = materials.filter(m => {
      const lastIssue = issues.filter(i => i.material_id === m.id).sort((a, b) =>
        new Date(b.issued_at || 0).getTime() - new Date(a.issued_at || 0).getTime()
      )[0];
      return !lastIssue || new Date(lastIssue.issued_at || 0) < ninetyDaysAgo;
    });
    const deadStockValue = deadStock.reduce((s, m) => s + ((m.current_stock || 0) * (m.purchase_price || 0)), 0);

    // Slow Moving (issue < 5 in last 30 days)
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 86400000);
    const slowMoving = materials.filter(m => {
      const recentIssues = issues.filter(i => i.material_id === m.id && new Date(i.issued_at || 0) >= thirtyDaysAgo);
      const totalQty = recentIssues.reduce((s, i) => s + (i.quantity || 0), 0);
      return totalQty > 0 && totalQty <= 5;
    });

    // Fast Moving (issue > 20 in last 30 days)
    const fastMoving = materials.filter(m => {
      const recentIssues = issues.filter(i => i.material_id === m.id && new Date(i.issued_at || 0) >= thirtyDaysAgo);
      const totalQty = recentIssues.reduce((s, i) => s + (i.quantity || 0), 0);
      return totalQty > 20;
    });

    // Wastage (last 30 days) — compare BOM vs actual if available; fallback to issues > expected
    // For now: sum of returned qty as proxy
    const pendingPurchase = materials.filter(m => (m.current_stock || 0) < (m.min_stock || 0)).length;

    // Production cost = total consumption value last 30 days
    const last30Issues = issues.filter(i => new Date(i.issued_at || 0) >= thirtyDaysAgo);
    const productionCost = last30Issues.reduce((s, i) => {
      const mat = materials.find(m => m.id === i.material_id);
      return s + ((i.quantity || 0) * (mat?.purchase_price || 0));
    }, 0);

    // Category breakdown
    const catMap = new Map<string, { count: number; value: number }>();
    materials.forEach(m => {
      const cat = m.category || 'Uncategorized';
      const cur = catMap.get(cat) || { count: 0, value: 0 };
      cur.count++;
      cur.value += (m.current_stock || 0) * (m.purchase_price || 0);
      catMap.set(cat, cur);
    });

    // Top consumed (by value, last 30 days)
    const matConsumption = new Map<string, { name: string; qty: number; value: number; unit: string }>();
    last30Issues.forEach(i => {
      const mat = materials.find(m => m.id === i.material_id);
      const key = i.material_id || '';
      const cur = matConsumption.get(key) || { name: mat?.name || i.material_name || '', qty: 0, value: 0, unit: mat?.unit || '' };
      cur.qty += (i.quantity || 0);
      cur.value += (i.quantity || 0) * (mat?.purchase_price || 0);
      matConsumption.set(key, cur);
    });
    const topConsumed = Array.from(matConsumption.entries())
      .sort((a, b) => b[1].value - a[1].value)
      .slice(0, 8)
      .map(([id, d]) => ({ id, ...d }));

    return {
      totalStockValue,
      totalItems: materials.length,
      todayConsumptionQty, todayConsumptionValue,
      todayInwardQty, todayInwardValue,
      available, reserved, qualityHold, rejected, scrap,
      lowStock, outOfStock, healthyStock,
      deadStockCount: deadStock.length, deadStockValue,
      slowMovingCount: slowMoving.length,
      fastMovingCount: fastMoving.length,
      pendingPurchase,
      productionCost,
      categoryBreakdown: Array.from(catMap.entries()).map(([cat, d]) => ({ cat, ...d })),
      topConsumed
    };
  }, [materials, issues, purchases, todayStr]);

  // ========== RENDER ==========

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">

      {/* ===== ROW 1: KEY KPIs ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <KPICard icon={DollarSign} label="Total Stock Value" value={fmtCurrency(metrics.totalStockValue)} color="blue" />
        <KPICard icon={ArrowUpFromLine} label="Today's Consumption" value={`${metrics.todayConsumptionQty} items`} sub={fmtCurrency(metrics.todayConsumptionValue)} color="orange" />
        <KPICard icon={ArrowDownToLine} label="Today's Inward" value={`${metrics.todayInwardQty} items`} sub={fmtCurrency(metrics.todayInwardValue)} color="green" />
        <KPICard icon={Gauge} label="Production Cost" value={fmtCurrency(metrics.productionCost)} sub="Last 30 days" color="violet" />
        <KPICard icon={Archive} label="Dead Stock" value={`${metrics.deadStockCount} items`} sub={fmtCurrency(metrics.deadStockValue)} color="red" />
        <KPICard icon={ShieldAlert} label="Pending Purchase" value={`${metrics.pendingPurchase}`} sub="Below min stock" color="yellow" />
      </div>

      {/* ===== ROW 2: STOCK STATES & HEALTH ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock States */}
        <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl rounded-2xl p-6 border border-white/10">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2"><Layers className="w-4 h-4 text-blue-400" /> Stock States</h3>
          <div className="grid grid-cols-5 gap-3">
            <StateChip label="Available" count={metrics.available} color="emerald" />
            <StateChip label="Reserved" count={metrics.reserved} color="blue" />
            <StateChip label="QC Hold" count={metrics.qualityHold} color="yellow" />
            <StateChip label="Rejected" count={metrics.rejected} color="red" />
            <StateChip label="Scrap" count={metrics.scrap} color="zinc" />
          </div>
          {/* Visual bar */}
          <div className="mt-4 flex h-3 rounded-full overflow-hidden bg-zinc-800">
            {metrics.totalItems > 0 && (
              <>
                <div className="bg-emerald-500 transition-all" style={{ width: `${(metrics.available / metrics.totalItems) * 100}%` }} />
                <div className="bg-blue-500 transition-all" style={{ width: `${(metrics.reserved / metrics.totalItems) * 100}%` }} />
                <div className="bg-yellow-500 transition-all" style={{ width: `${(metrics.qualityHold / metrics.totalItems) * 100}%` }} />
                <div className="bg-red-500 transition-all" style={{ width: `${(metrics.rejected / metrics.totalItems) * 100}%` }} />
                <div className="bg-zinc-600 transition-all" style={{ width: `${(metrics.scrap / metrics.totalItems) * 100}%` }} />
              </>
            )}
          </div>
        </div>

        {/* Stock Health Donut */}
        <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl rounded-2xl p-6 border border-white/10">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-green-400" /> Stock Health</h3>
          <div className="grid grid-cols-3 gap-4">
            <HealthStat label="Healthy" count={metrics.healthyStock} total={metrics.totalItems} color="emerald" icon={PackageCheck} />
            <HealthStat label="Low Stock" count={metrics.lowStock} total={metrics.totalItems} color="yellow" icon={AlertTriangle} />
            <HealthStat label="Out of Stock" count={metrics.outOfStock} total={metrics.totalItems} color="red" icon={Ban} />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <MovementBadge label="Fast Moving" count={metrics.fastMovingCount} icon={Zap} color="emerald" />
            <MovementBadge label="Slow Moving" count={metrics.slowMovingCount} icon={Clock} color="yellow" />
            <MovementBadge label="Dead Stock" count={metrics.deadStockCount} icon={Archive} color="red" />
          </div>
        </div>
      </div>

      {/* ===== ROW 3: TOP CONSUMED & CATEGORY BREAKDOWN ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Consumed Materials */}
        <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl rounded-2xl p-6 border border-white/10">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-orange-400" /> Top Consumed (30 Days)</h3>
          <div className="space-y-2">
            {metrics.topConsumed.length > 0 ? metrics.topConsumed.map((item, idx) => {
              const maxVal = metrics.topConsumed[0]?.value || 1;
              return (
                <div key={item.id} className="flex items-center gap-3">
                  <span className="text-xs text-zinc-500 w-5 text-right">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-zinc-300 truncate">{item.name}</span>
                      <span className="text-xs text-zinc-400 ml-2 shrink-0">{item.qty} {item.unit} · {fmtCurrency(item.value)}</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${(item.value / maxVal) * 100}%` }} transition={{ delay: idx * 0.05 }}
                        className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full" />
                    </div>
                  </div>
                </div>
              );
            }) : <p className="text-xs text-zinc-500 text-center py-4">No consumption data yet</p>}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl rounded-2xl p-6 border border-white/10">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-blue-400" /> Category Breakdown</h3>
          <div className="space-y-3">
            {metrics.categoryBreakdown.map(c => {
              const pct = metrics.totalStockValue > 0 ? (c.value / metrics.totalStockValue) * 100 : 0;
              const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-orange-500', 'bg-violet-500', 'bg-pink-500', 'bg-cyan-500'];
              const colorClass = colors[metrics.categoryBreakdown.indexOf(c) % colors.length];
              return (
                <div key={c.cat}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-zinc-300">{c.cat}</span>
                    <span className="text-zinc-500">{c.count} items · {fmtCurrency(c.value)} · {pct.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                      className={`h-full rounded-full ${colorClass}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ===== ROW 4: VARIANCE & SOP COMPLIANCE ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Variance Limits */}
        <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl rounded-2xl p-6 border border-white/10">
          <h3 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-yellow-400" /> Variance Limits (SOP)</h3>
          <div className="space-y-2">
            <VarianceRow label="Raw Materials" limit="± 1%" />
            <VarianceRow label="Consumables" limit="± 3%" />
            <VarianceRow label="Tools" limit="0%" />
          </div>
        </div>

        {/* Verification Schedule */}
        <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl rounded-2xl p-6 border border-white/10">
          <h3 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2"><Clock className="w-4 h-4 text-blue-400" /> Verification Schedule</h3>
          <div className="space-y-2 text-xs">
            <ScheduleRow label="Random Check" freq="Daily" />
            <ScheduleRow label="Fast Moving Items" freq="Weekly" />
            <ScheduleRow label="Full Audit" freq="Monthly" />
            <ScheduleRow label="5S Deep Clean" freq="Monthly" />
          </div>
        </div>

        {/* Material Flow Summary */}
        <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl rounded-2xl p-6 border border-white/10">
          <h3 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2"><Package className="w-4 h-4 text-green-400" /> Material Flow</h3>
          <div className="space-y-3 text-xs">
            <FlowStep step="1" label="GRN Inward" desc="Receive & inspect" />
            <FlowStep step="2" label="QC Verification" desc="Quality check" />
            <FlowStep step="3" label="Store & Label" desc="Bin location assigned" />
            <FlowStep step="4" label="Issue (FIFO)" desc="Against indent" />
            <FlowStep step="5" label="Production" desc="Consume & return" />
            <FlowStep step="6" label="FG Entry" desc="Finished goods" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ==========================================
// SUB-COMPONENTS
// ==========================================

function KPICard({ icon: Icon, label, value, sub, color }: { icon: React.ElementType; label: string; value: string; sub?: string; color: string }) {
  const bgMap: Record<string, string> = {
    blue: 'from-blue-500/10 to-blue-600/5 border-blue-500/15',
    green: 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/15',
    orange: 'from-orange-500/10 to-orange-600/5 border-orange-500/15',
    red: 'from-red-500/10 to-red-600/5 border-red-500/15',
    yellow: 'from-yellow-500/10 to-yellow-600/5 border-yellow-500/15',
    violet: 'from-violet-500/10 to-violet-600/5 border-violet-500/15',
  };
  const iconMap: Record<string, string> = { blue: 'text-blue-400', green: 'text-emerald-400', orange: 'text-orange-400', red: 'text-red-400', yellow: 'text-yellow-400', violet: 'text-violet-400' };

  return (
    <motion.div whileHover={{ scale: 1.02 }} className={`bg-gradient-to-br ${bgMap[color]} backdrop-blur-xl rounded-2xl p-4 border`}>
      <Icon className={`w-5 h-5 ${iconMap[color]} mb-2`} />
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-[11px] text-zinc-400 mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-zinc-500 mt-0.5">{sub}</p>}
    </motion.div>
  );
}

function StateChip({ label, count, color }: { label: string; count: number; color: string }) {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    blue: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    yellow: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
    red: 'bg-red-500/15 text-red-400 border-red-500/20',
    zinc: 'bg-zinc-700/40 text-zinc-400 border-zinc-600/30',
  };
  return (
    <div className={`rounded-xl p-3 text-center border ${colorMap[color]}`}>
      <p className="text-lg font-bold">{count}</p>
      <p className="text-[10px] mt-0.5">{label}</p>
    </div>
  );
}

function HealthStat({ label, count, total, color, icon: Icon }: { label: string; count: number; total: number; color: string; icon: React.ElementType }) {
  const pct = total > 0 ? ((count / total) * 100).toFixed(0) : '0';
  const colorMap: Record<string, string> = { emerald: 'text-emerald-400', yellow: 'text-yellow-400', red: 'text-red-400' };
  return (
    <div className="text-center">
      <Icon className={`w-5 h-5 ${colorMap[color]} mx-auto mb-1`} />
      <p className="text-lg font-bold text-white">{count}</p>
      <p className="text-[10px] text-zinc-500">{label} ({pct}%)</p>
    </div>
  );
}

function MovementBadge({ label, count, icon: Icon, color }: { label: string; count: number; icon: React.ElementType; color: string }) {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15',
    yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/15',
    red: 'bg-red-500/10 text-red-400 border-red-500/15',
  };
  return (
    <div className={`rounded-lg p-2 border ${colorMap[color]}`}>
      <Icon className="w-4 h-4 mx-auto mb-0.5" />
      <p className="text-sm font-bold">{count}</p>
      <p className="text-[10px]">{label}</p>
    </div>
  );
}

function VarianceRow({ label, limit }: { label: string; limit: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-b-0">
      <span className="text-xs text-zinc-300">{label}</span>
      <span className="text-xs font-mono font-medium text-yellow-400">{limit}</span>
    </div>
  );
}

function ScheduleRow({ label, freq }: { label: string; freq: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-b-0">
      <span className="text-zinc-300">{label}</span>
      <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 text-[10px] font-medium">{freq}</span>
    </div>
  );
}

function FlowStep({ step, label, desc }: { step: string; label: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-5 h-5 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-[9px] font-bold text-blue-400">{step}</span>
      </div>
      <div>
        <p className="text-zinc-200 font-medium">{label}</p>
        <p className="text-zinc-500 text-[10px]">{desc}</p>
      </div>
    </div>
  );
}
