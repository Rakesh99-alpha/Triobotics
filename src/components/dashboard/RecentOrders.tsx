import * as React from "react";
import { Card } from "@/components/ui/card";

const mock = [
  { id: "#1001", customer: "Acme Corp", total: "$1,240" },
  { id: "#1002", customer: "Beta Ltd.", total: "$540" },
  { id: "#1003", customer: "Gamma Inc.", total: "$2,100" },
];

export function RecentOrders() {
  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">Recent Orders</h3>
      <ul className="space-y-3">
        {mock.map((o) => (
          <li key={o.id} className="flex justify-between text-sm text-muted-foreground">
            <span className="font-medium">{o.id}</span>
            <span>{o.customer}</span>
            <span className="font-semibold">{o.total}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default RecentOrders;
