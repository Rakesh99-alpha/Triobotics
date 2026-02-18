'use client';

import { AlertTriangle, XCircle, Bell, Info, CheckCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';

// --- HELPER: Safely Parse Dates ---
const getRelativeTime = (dateInput: any) => {
  if (!dateInput) return 'Just now';

  try {
    // 1. Handle Firestore Timestamp (has .toDate() method)
    const date = dateInput.toDate ? dateInput.toDate() : new Date(dateInput);

    // 2. Check if it's a valid date
    if (isNaN(date.getTime())) return 'Just now';

    // 3. Format
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    return 'Just now';
  }
};

// --- COMPONENT (Changed to Named Export) ---
export function AlertPanel({ alerts = [] }: { alerts?: any[] }) {
  return (
    <div className="bg-gradient-to-r from-red-900/20 to-orange-900/20 border border-red-500/30 rounded-xl overflow-hidden shadow-lg">
      
      {/* Header */}
      <div className="p-4 border-b border-red-500/20 flex justify-between items-center bg-gradient-to-r from-red-950/40 to-orange-950/40">
        <h3 className="font-bold text-white flex items-center gap-2">
          <Bell className="w-5 h-5 text-red-400 animate-pulse" /> 
          Critical Notifications
        </h3>
        <span className="text-xs text-red-300 bg-red-900/50 px-3 py-1 rounded-full border border-red-500/30">
          {alerts.length} Active Alerts
        </span>
      </div>

      {/* List */}
      <ScrollArea className="h-[200px]">
        <div className="p-4 space-y-3">
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-zinc-400 text-sm">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
              All systems normal - no alerts
            </div>
          ) : (
            alerts.map((alert, index) => (
              <div 
                key={alert.id || index} 
                className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${
                  alert.level === 'critical' ? 'bg-red-950/30 border-red-500/30 hover:bg-red-950/50' :
                  alert.level === 'warning' ? 'bg-amber-950/30 border-amber-500/30 hover:bg-amber-950/50' :
                  alert.level === 'out_of_stock' ? 'bg-red-950/30 border-red-500/30 hover:bg-red-950/50' :
                  alert.level === 'high_consumption' ? 'bg-orange-950/30 border-orange-500/30 hover:bg-orange-950/50' :
                  'bg-zinc-950/30 border-zinc-500/30 hover:bg-zinc-950/50'
                }`}
              >
                {/* Icon based on level */}
                <div className="flex items-start gap-3">
                  <div className={`mt-1 p-2 rounded-full h-fit flex-shrink-0 ${
                    alert.level === 'critical' ? 'bg-red-500/20 text-red-400' :
                    alert.level === 'warning' ? 'bg-amber-500/20 text-amber-400' :
                    alert.level === 'out_of_stock' ? 'bg-red-500/20 text-red-400' :
                    alert.level === 'high_consumption' ? 'bg-orange-500/20 text-orange-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {alert.level === 'critical' || alert.level === 'out_of_stock' ? <XCircle className="w-4 h-4" /> :
                     alert.level === 'warning' ? <AlertTriangle className="w-4 h-4" /> :
                     alert.level === 'high_consumption' ? <AlertTriangle className="w-4 h-4" /> :
                     <Info className="w-4 h-4" />}
                  </div>

                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white leading-snug">
                      {alert.materialName || alert.message || "Stock Alert"}
                    </p>
                    <p className="text-xs text-zinc-300 mt-1">
                      {alert.level === 'high_consumption' ? (
                        <>Consumed: <span className="font-medium">{alert.consumedToday}</span> | 
                        Stock: <span className="font-medium">{alert.currentStock}</span> | 
                        {getRelativeTime(alert.timestamp)}</>
                      ) : (
                        <>Current: <span className="font-medium">{alert.currentStock}</span> | 
                        Min: <span className="font-medium">{alert.minStock}</span> | 
                        {getRelativeTime(alert.timestamp)}</>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}