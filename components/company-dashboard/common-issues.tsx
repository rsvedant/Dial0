"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, TrendingUp } from "lucide-react";

interface IssueCategory {
  category: string;
  count: number;
  avgDuration: number; // in seconds
  resolutionRate: number; // percentage
}

interface CommonIssuesProps {
  issues: IssueCategory[];
}

export function CommonIssues({ issues }: CommonIssuesProps) {
  // Sort by frequency and take top 8
  const topIssues = issues.slice(0, 8);

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  };

  return (
    <Card className="p-6 animate-fade-in-up" style={{ animationDelay: "0.7s" }}>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-1">Most Common Issues</h3>
        <p className="text-sm text-muted-foreground">Top issue categories by call volume</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-sm font-medium text-muted-foreground pb-3 pr-4">Category</th>
              <th className="text-right text-sm font-medium text-muted-foreground pb-3 px-4">Calls</th>
              <th className="text-right text-sm font-medium text-muted-foreground pb-3 px-4">Avg Duration</th>
              <th className="text-right text-sm font-medium text-muted-foreground pb-3 pl-4">Resolution</th>
            </tr>
          </thead>
          <tbody>
            {topIssues.map((issue, index) => (
              <tr
                key={issue.category}
                className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors"
              >
                <td className="py-4 pr-4">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-1 h-8 rounded-full"
                      style={{
                        backgroundColor: `hsl(var(--chart-${(index % 5) + 1}))`,
                      }}
                    />
                    <span className="text-sm font-medium text-foreground">{issue.category}</span>
                  </div>
                </td>
                <td className="py-4 px-4 text-right">
                  <span className="text-sm font-semibold text-foreground">{issue.count}</span>
                </td>
                <td className="py-4 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm text-foreground">{formatDuration(issue.avgDuration)}</span>
                  </div>
                </td>
                <td className="py-4 pl-4 text-right">
                  <Badge
                    variant={issue.resolutionRate >= 70 ? "default" : "secondary"}
                    className={
                      issue.resolutionRate >= 70
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                    }
                  >
                    {issue.resolutionRate}%
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}