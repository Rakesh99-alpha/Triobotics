"use client";
import { mockSuppliers } from "@/data/mockSuppliers";

export default function SupplierHistory() {
  return (
    <div className="space-y-3">
      {mockSuppliers.map(s => (
        <div key={s.id} className="p-4 bg-muted rounded">
          <h3 className="font-semibold">{s.name}</h3>
          <p>Total Materials: {s.materials.length}</p>
          <p>Total Value: ₹{s.totalValue}</p>
        </div>
      ))}
    </div>
  );
}
