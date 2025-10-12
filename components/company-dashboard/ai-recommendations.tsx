"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Lightbulb, TrendingUp, Users, Clock } from "lucide-react";

interface AIRecommendationsProps {
  recommendations: string[];
}

const iconMap = [Lightbulb, TrendingUp, Users, Clock, Sparkles];

export function AIRecommendations({ recommendations }: AIRecommendationsProps) {
  return (
    <Card className="p-6 animate-fade-in-up" style={{ animationDelay: "0.8s" }}>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-lg font-semibold text-foreground">AI-Powered Insights</h3>
          <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
            <Sparkles className="h-3 w-3 mr-1" />
            AI
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">Actionable recommendations to improve service quality</p>
      </div>
      <div className="space-y-4">
        {recommendations.map((recommendation, index) => {
          const Icon = iconMap[index % iconMap.length];

          return (
            <div
              key={index}
              className="flex gap-4 p-4 rounded-lg border border-border bg-accent/20 hover:bg-accent/40 transition-colors animate-fade-in-up"
              style={{ animationDelay: `${0.9 + index * 0.1}s` }}
            >
              <div className="flex-shrink-0 mt-1">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <Icon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm text-foreground leading-relaxed">{recommendation}</p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}