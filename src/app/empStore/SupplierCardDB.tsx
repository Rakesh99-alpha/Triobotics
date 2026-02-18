import { Building2, Phone, Mail, Calendar, TrendingUp, Package } from 'lucide-react';
import { DBSupplier } from '@/hooks/useInventoryData';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { differenceInYears, differenceInMonths } from 'date-fns';

interface SupplierCardDBProps {
  supplier: DBSupplier;
}

export function SupplierCardDB({ supplier }: SupplierCardDBProps) {
  const relationshipDuration = () => {
    const startDate = new Date(supplier.relationship_start || new Date());
    const years = differenceInYears(new Date(), startDate);
    const months = differenceInMonths(new Date(), startDate) % 12;
    
    if (years > 0) {
      return `${years} year${years > 1 ? 's' : ''}${months > 0 ? ` ${months}mo` : ''}`;
    }
    return `${months} months`;
  };

  const formatCurrency = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    return `₹${value.toLocaleString()}`;
  };

  return (
    <div className="glass glass-hover rounded-xl p-6 animate-slide-up">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/20 p-3 rounded-lg">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{supplier.name}</h3>
            <p className="text-sm text-muted-foreground">{supplier.contact_person}</p>
          </div>
        </div>
        <Badge variant="outline" className="bg-success/10 text-success border-success/30">
          Active
        </Badge>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Phone className="h-4 w-4" />
          <span>{supplier.phone}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Mail className="h-4 w-4" />
          <span>{supplier.email}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Partner since: {relationshipDuration()}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-accent/50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <TrendingUp className="h-3 w-3" />
            <span>Total Value</span>
          </div>
          <p className="font-semibold text-lg text-success">
            {formatCurrency(supplier.total_purchase_value || 0)}
          </p>
        </div>
        <div className="bg-accent/50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <Package className="h-3 w-3" />
            <span>Materials</span>
          </div>
          <p className="font-semibold text-lg">{supplier.materials_supplied?.length || 0}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {supplier.materials_supplied?.slice(0, 3).map((material, idx) => (
          <Badge key={idx} variant="outline" className="text-xs">
            {material}
          </Badge>
        ))}
        {supplier.materials_supplied && supplier.materials_supplied.length > 3 && (
          <Badge variant="outline" className="text-xs">
            +{supplier.materials_supplied.length - 3} more
          </Badge>
        )}
      </div>

      {supplier.gst && (
        <div className="text-xs font-mono text-muted-foreground bg-accent/30 px-2 py-1 rounded mb-4">
          GST: {supplier.gst}
        </div>
      )}
    </div>
  );
}
