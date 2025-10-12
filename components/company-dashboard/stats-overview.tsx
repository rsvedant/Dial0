"use client";

import { Card } from "@/components/ui/card";
import { Phone, Clock, CheckCircle2, TrendingUp, TrendingDown, Smile } from "lucide-react";
import { useEffect, useState } from "react";

interface StatsOverviewProps {
  totalCalls: number;
  avgDuration: number; // in seconds
  resolutionRate: number; // percentage
  satisfaction: number; // percentage
}

function AnimatedNumber({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const startValue = 0;
    const endValue = value;

    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      
      // Easing function for smooth animation
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (endValue - startValue) * easeOut;
      
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return <>{Math.round(displayValue)}</>;
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes === 0) return `${remainingSeconds}s`;
  return `${minutes}m ${remainingSeconds}s`;
}

export function StatsOverview({ totalCalls, avgDuration, resolutionRate, satisfaction }: StatsOverviewProps) {
  const stats = [
    {
      title: "Total Calls",
      value: totalCalls,
      icon: Phone,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
      trend: "+12%",
      trendUp: true,
      suffix: "",
    },
    {
      title: "Avg Duration",
      value: Math.round(avgDuration / 60), // Convert to minutes
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-950/30",
      trend: "-8%",
      trendUp: false,
      suffix: "m",
    },
    {
      title: "Resolution Rate",
      value: resolutionRate,
      icon: CheckCircle2,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-950/30",
      trend: "+5%",
      trendUp: true,
      suffix: "%",
    },
    {
      title: "Satisfaction",
      value: satisfaction,
      icon: Smile,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950/30",
      trend: "+3%",
      trendUp: true,
      suffix: "%",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        const TrendIcon = stat.trendUp ? TrendingUp : TrendingDown;

        return (
          <Card
            key={stat.title}
            className="p-6 animate-fade-in-up hover:shadow-lg transition-shadow duration-300"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-2">{stat.title}</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-bold text-foreground">
                    <AnimatedNumber value={stat.value} />
                    <span className="text-2xl">{stat.suffix}</span>
                  </h3>
                </div>
                <div className="flex items-center gap-1 mt-2">
                  <TrendIcon
                    className={`h-4 w-4 ${
                      stat.trendUp ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    }`}
                  />
                  <span
                    className={`text-xs font-medium ${
                      stat.trendUp ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {stat.trend}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">vs last month</span>
                </div>
              </div>
              <div className={`${stat.bgColor} p-3 rounded-xl`}>
                <Icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}