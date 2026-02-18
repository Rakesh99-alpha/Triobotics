import * as React from "react";
import { Card } from "@/components/ui/card";

const events = [
  { id: 1, text: "Order #1003 shipped" },
  { id: 2, text: "New user signup: jane.doe@example.com" },
  { id: 3, text: "Inventory low: Item #342" },
];

export function ActivityFeed() {
  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">Activity</h3>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {events.map((e) => (
          <li key={e.id} className="flex justify-between">
            <span>{e.text}</span>
            <span className="text-xs text-zinc-400">now</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default ActivityFeed;
