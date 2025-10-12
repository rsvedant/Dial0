"use client";

import { Card } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Smile, Meh, Frown } from "lucide-react";

interface SentimentAnalysisProps {
  positive: number;
  neutral: number;
  negative: number;
}

export function SentimentAnalysis({ positive, neutral, negative }: SentimentAnalysisProps) {
  const total = positive + neutral + negative;

  const data = [
    { name: "Positive", value: positive, color: "#22c55e", icon: Smile },
    { name: "Neutral", value: neutral, color: "#f59e0b", icon: Meh },
    { name: "Negative", value: negative, color: "#ef4444", icon: Frown },
  ];

  const COLORS = ["#22c55e", "#f59e0b", "#ef4444"];

  return (
    <Card className="p-6 animate-fade-in-up" style={{ animationDelay: "0.5s" }}>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-1">Customer Sentiment</h3>
        <p className="text-sm text-muted-foreground">Distribution of call sentiment analysis</p>
      </div>
      <div className="flex flex-col lg:flex-row items-center gap-6">
        <div className="h-[240px] w-full lg:w-1/2">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  color: "hsl(var(--foreground))",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-4 w-full">
          {data.map((item, index) => {
            const Icon = item.icon;
            const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : "0.0";

            return (
              <div
                key={item.name}
                className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
              >
                <div className="p-2 rounded-lg" style={{ backgroundColor: `${item.color}20` }}>
                  <Icon className="h-5 w-5" style={{ color: item.color }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-foreground">{item.name}</span>
                    <span className="text-sm font-bold text-foreground">{percentage}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
                <span className="text-xl font-bold text-muted-foreground">{item.value}</span>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}