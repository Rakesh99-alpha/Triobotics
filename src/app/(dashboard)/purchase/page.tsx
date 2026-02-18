'use client';

import React, { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import MDPurchaseOverviewNew from './MDPurchaseNew';
import PurchaseDynamic from './PurchaseDynamic';

// ==========================================
// MAIN PAGE WRAPPER - Routes based on role
// ==========================================
// Purchase Management - Clean workflow without Store links
// Last updated: 2026-01-30

// Helper to get user role synchronously
function getUserRoleFromStorage(): string {
  if (typeof window === 'undefined') return 'purchase';
  const storedUser = localStorage.getItem('currentUser');
  if (storedUser) {
    try {
      const user = JSON.parse(storedUser);
      return user.role?.toLowerCase()?.trim() || 'purchase';
    } catch {
      return 'purchase';
    }
  }
  return 'purchase';
}


export default function PurchasePageWrapper() {
  const userRole = useMemo(() => getUserRoleFromStorage(), []);
  const searchParams = useSearchParams();
  const createMode = searchParams.get('create') === 'true';

  // MD sees the MD Purchase Overview, but if create=true, show PurchaseDynamic for PO creation
  if (userRole === 'md') {
    if (createMode) {
      // MD can create PO - show PurchaseDynamic with create mode
      return <PurchaseDynamic defaultTab="create" />;
    }
    return <MDPurchaseOverviewNew />;
  }

  // Purchase roles - Dynamic workflow with full integration
  const purchaseRoles = ['purchase', 'purchase_manager', 'purchase_team', 'store', 'admin'];
  if (purchaseRoles.includes(userRole)) {
    return <PurchaseDynamic defaultTab={createMode ? 'create' : undefined} />;
  }

  // All other roles see unauthorized message
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
        <p className="text-zinc-400 text-lg font-semibold">Unauthorized</p>
        <p className="text-zinc-500 text-sm">You do not have access to the Purchase Management page.</p>
      </div>
    </div>
  );
}

export { Loader2 };
