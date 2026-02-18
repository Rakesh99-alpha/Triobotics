import { Building2, Phone, Mail, Calendar, TrendingUp, Package, MapPin } from 'lucide-react';
import { DBSupplier } from '@/hooks/useInventoryData';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format, differenceInYears, differenceInMonths } from 'date-fns';

interface SupplierDetailsPopoverProps {
  supplier: DBSupplier;
  children: React.ReactNode;
}

export function SupplierDetailsPopover({ supplier, children }: SupplierDetailsPopoverProps) {
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
    <Popover>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="glass border-border/50 w-80 p-0" align="start">
        <div className="p-4 border-b border-border/30">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 p-2.5 rounded-lg">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold">{supplier.name}</h4>
              <p className="text-sm text-muted-foreground">{supplier.contact_person}</p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <span className="text-muted-foreground">{supplier.address}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{supplier.phone}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{supplier.email}</span>
          </div>
          {supplier.gst && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-xs font-mono bg-accent/50 px-2 py-1 rounded">
                GST: {supplier.gst}
              </span>
            </div>
          )}
        </div>

        <div className="px-4 pb-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-accent/50 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
                <TrendingUp className="h-3 w-3" />
                <span>Total Value</span>
              </div>
              <p className="font-semibold text-success">
                {formatCurrency(supplier.total_purchase_value || 0)}
              </p>
            </div>
            <div className="bg-accent/50 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
                <Calendar className="h-3 w-3" />
                <span>Partner Since</span>
              </div>
              <p className="font-semibold text-sm">{relationshipDuration()}</p>
            </div>
          </div>
        </div>

        {supplier.materials_supplied && supplier.materials_supplied.length > 0 && (
          <div className="px-4 pb-4">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-2">
              <Package className="h-3 w-3" />
              <span>Materials Supplied</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {supplier.materials_supplied.slice(0, 4).map((material, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {material}
                </Badge>
              ))}
              {supplier.materials_supplied.length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{supplier.materials_supplied.length - 4} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {supplier.last_purchase_date && (
          <div className="px-4 pb-4 pt-2 border-t border-border/30">
            <p className="text-xs text-muted-foreground">
              Last Purchase: {format(new Date(supplier.last_purchase_date), 'dd MMM yyyy')}
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
