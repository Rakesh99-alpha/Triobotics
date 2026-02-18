import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function QuickActions() {
  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
      <div className="flex flex-col gap-2">
        <Button variant="default" size="sm">Create Order</Button>
        <Button variant="outline" size="sm">New Customer</Button>
        <Button variant="ghost" size="sm">Export</Button>
      </div>
    </Card>
  );
}

export default QuickActions;
