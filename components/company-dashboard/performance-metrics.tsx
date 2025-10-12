"use client";

import { Card } from "@/components/ui/card";
import { Target, Clock, Gauge, PhoneOff, TrendingUp } from "lucide-react";

interface PerformanceMetricsProps {
  fcrRate: number; // First Call Resolution percentage
  aht: number; // Average Handle Time in minutes
  ces: number; // Customer Effort Score (1-5)
  abandonmentRate: number; // Percentage
  peakTimes: Array<{ hour: number; count: number }>;
}

export function PerformanceMetrics({ fcrRate, aht, ces, abandonmentRate, peakTimes }: PerformanceMetricsProps) {
  const metrics = [
    {
      title: "First Call Resolution",
      value: `${fcrRate.toFixed(1)}%`,
      icon: Target,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-950/30",
      description: "Calls resolved on first contact",
      benchmark: "Target: >75%",
      status: fcrRate >= 75 ? "excellent" : fcrRate >= 60 ? "good" : "needs-improvement",
    },
    {
      title: "Average Handle Time",
      value: `${aht.toFixed(1)}m`,
      icon: Clock,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
      description: "Mean duration per call",
      benchmark: "Target: <15m",
      status: aht <= 15 ? "excellent" : aht <= 20 ? "good" : "needs-improvement",
    },
    {
      title: "Customer Effort Score",
      value: ces.toFixed(1),
      icon: Gauge,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950/30",
      description: "Perceived difficulty (1-5 scale)",
      benchmark: "Target: <2.5",
      status: ces <= 2.5 ? "excellent" : ces <= 3.5 ? "good" : "needs-improvement",
    },
    {
      title: "Abandonment Rate",
      value: `${abandonmentRate.toFixed(1)}%`,
      icon: PhoneOff,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-950/30",
      description: "Calls abandoned in queue",
      benchmark: "Target: <5%",
      status: abandonmentRate <= 5 ? "excellent" : abandonmentRate <= 8 ? "good" : "needs-improvement",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "excellent":
        return "bg-green-500";
      case "good":
        return "bg-blue-500";
      case "needs-improvement":
        return "bg-amber-500";
      default:
        return "bg-gray-500";
    }
  };

  const formatHour = (hour: number): string => {
    const suffix = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${displayHour}${suffix}`;
  };

  return (
    <Card className="p-6 animate-fade-in-up" style={{ animationDelay: "0.6s" }}>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-1">Performance Metrics</h3>
        <p className="text-sm text-muted-foreground">Key performance indicators and benchmarks</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <div
              key={metric.title}
              className="p-4 rounded-lg border border-border bg-card hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`${metric.bgColor} p-2 rounded-lg`}>
                  <Icon className={`h-5 w-5 ${metric.color}`} />
                </div>
                <div className={`w-2 h-2 rounded-full ${getStatusColor(metric.status)}`} />
              </div>
              <div className="text-2xl font-bold text-foreground mb-1">{metric.value}</div>
              <div className="text-xs font-medium text-muted-foreground mb-2">{metric.title}</div>
              <div className="text-xs text-muted-foreground">{metric.benchmark}</div>
            </div>
          );
        })}
      </div>

      {/* Peak Call Times */}
      <div className="mt-6 p-4 rounded-lg bg-accent/30 border border-border">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h4 className="text-sm font-semibold text-foreground">Peak Call Times</h4>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {peakTimes.map((time, index) => (
            <div key={time.hour} className="text-center p-3 rounded-lg bg-card border border-border">
              <div className="text-lg font-bold text-primary mb-1">{formatHour(time.hour)}</div>
              <div className="text-xs text-muted-foreground">{time.count} calls</div>
              {index === 0 && (
                <div className="mt-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                    Peak
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}