import * as React from "react";
import { Card } from "@/components/ui/card";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground py-8">
      <div className="max-w-7xl mx-auto px-6">
        <Card className="p-6 bg-transparent border-0 shadow-none">
          <div className="flex flex-col gap-6">{children}</div>
        </Card>
      </div>
    </div>
  );
}

export default DashboardLayout;
