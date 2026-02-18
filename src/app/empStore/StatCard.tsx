import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'success' | 'warning' | 'critical';
  onClick?: () => void;
}

const variantStyles = {
  default: 'glass glass-hover',
  success: 'glass glass-hover border-success/30 glow-success',
  warning: 'glass glass-hover border-warning/30 glow-warning',
  critical: 'glass glass-hover border-critical/30 glow-critical',
};

const iconVariantStyles = {
  default: 'bg-primary/20 text-primary',
  success: 'bg-success/20 text-success',
  warning: 'bg-warning/20 text-warning',
  critical: 'bg-critical/20 text-critical',
};

export function StatCard({ title, value, icon: Icon, trend, variant = 'default', onClick }: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl p-6 transition-all duration-300 animate-fade-in cursor-pointer',
        'hover:scale-[1.02] hover:shadow-lg',
        variantStyles[variant]
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {trend && (
            <div className={cn(
              'flex items-center gap-1 text-sm font-medium',
              trend.isPositive ? 'text-success' : 'text-critical'
            )}>
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}% from yesterday</span>
            </div>
          )}
        </div>
        <div className={cn(
          'p-3 rounded-lg',
          iconVariantStyles[variant]
        )}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
