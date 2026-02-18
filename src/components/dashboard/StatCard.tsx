import * as React from "react";
import { Card, CardContent, CardTitle, CardDescription } from "@/components/ui/card";

type StatCardProps = {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative";
  icon?: React.ComponentType<any>;
  delay?: number;
  variant?: "default" | "success" | "warning" | "critical";
  trend?: { value: number; isPositive: boolean };
};

export function StatCard({ title, value, change, changeType = "positive", icon: Icon, delay = 0, variant = "default", trend }: StatCardProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case "success":
        return "border-green-200 bg-green-50";
      case "warning":
        return "border-yellow-200 bg-yellow-50";
      case "critical":
        return "border-red-200 bg-red-50";
      default:
        return "";
    }
  };

  return (
    <Card className={`p-4 ${getVariantStyles()}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <CardTitle className="text-sm">{title}</CardTitle>
          <div className="mt-2 text-2xl font-bold">{String(value)}</div>
          {trend && (
            <CardDescription>
              <span className={trend.isPositive ? "text-green-500" : "text-red-400"}>
                {trend.isPositive ? "+" : ""}{trend.value}%
              </span>
            </CardDescription>
          )}
          {change && !trend && (
            <CardDescription>
              <span className={changeType === "positive" ? "text-green-500" : "text-red-400"}>{change}</span>
            </CardDescription>
          )}
        </div>
        {Icon && (
          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
            <Icon className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
      </div>
    </Card>
  );
}

export default StatCard;
