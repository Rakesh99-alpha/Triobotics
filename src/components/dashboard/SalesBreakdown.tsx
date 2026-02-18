import * as React from "react";
import { Card } from "@/components/ui/card";

export function SalesBreakdown() {
  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">Sales Breakdown</h3>
      <div className="text-sm text-muted-foreground">
        <div className="flex justify-between"><span>Online</span><span>62%</span></div>
        <div className="flex justify-between"><span>Retail</span><span>28%</span></div>
        <div className="flex justify-between"><span>Wholesale</span><span>10%</span></div>
      </div>
    </Card>
  );
}

export default SalesBreakdown;
