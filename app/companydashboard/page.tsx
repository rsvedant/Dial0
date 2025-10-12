"use client"

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { StatsOverview } from "@/components/company-dashboard/stats-overview";
import { CallVolumeChart } from "@/components/company-dashboard/call-volume-chart";
import { SentimentAnalysis } from "@/components/company-dashboard/sentiment-analysis";
import { CommonIssues } from "@/components/company-dashboard/common-issues";
import { AIRecommendations } from "@/components/company-dashboard/ai-recommendations";
import { PerformanceMetrics } from "@/components/company-dashboard/performance-metrics";
import { RecentCallsTable } from "@/components/company-dashboard/recent-calls-table";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Calendar, RefreshCw } from "lucide-react";
import { useState, useMemo } from "react";
import { generateRecommendations } from "@/lib/companyInsights";

export default function CompanyDashboardPage() {
  const [dateRange, setDateRange] = useState(30);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const companyName = "United Healthcare";

  // Fetch all data from Convex
  const stats = useQuery(api.companyDashboard.getCompanyCallStats, { companyName });
  const timeline = useQuery(api.companyDashboard.getCompanyCallTimeline, { companyName, days: dateRange });
  const callDetails = useQuery(api.companyDashboard.getCompanyCallDetails, { companyName, limit: 50, offset: 0 });
  const issueBreakdown = useQuery(api.companyDashboard.getCompanyIssueBreakdown, { companyName });
  const sentimentData = useQuery(api.companyDashboard.getCompanySentimentDistribution, { companyName });
  const performanceData = useQuery(api.companyDashboard.getCompanyPerformanceMetrics, { companyName });

  // Generate AI recommendations based on call data
  const recommendations = useMemo(() => {
    if (!callDetails?.calls) return [];
    return generateRecommendations(
      callDetails.calls.map((call) => ({
        id: call.id,
        title: call.title,
        status: call.status,
        createdAt: call.createdAt,
        duration: call.duration,
        transcript: call.transcript,
      }))
    );
  }, [callDetails]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate refresh delay
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  const handleExportCSV = () => {
    if (!callDetails?.calls) return;

    const headers = ["Date", "Title", "Category", "Duration", "Status", "Sentiment"];
    const rows = callDetails.calls.map((call) => [
      new Date(call.createdAt).toLocaleDateString(),
      call.title,
      call.category || "N/A",
      call.duration ? `${Math.floor(call.duration / 60)}m` : "N/A",
      call.status,
      call.sentimentScore !== undefined
        ? call.sentimentScore > 0.2
          ? "Positive"
          : call.sentimentScore < -0.2
          ? "Negative"
          : "Neutral"
        : "N/A",
    ]);

    const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `united-healthcare-calls-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const isLoading = !stats || !timeline || !callDetails || !issueBreakdown || !sentimentData || !performanceData;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-[1600px] mx-auto space-y-6">
          <Skeleton className="h-24 w-full" />
          <div className="grid grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-6">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-40 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              {/* United Healthcare Logo Placeholder */}
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 text-white font-bold text-xl">
                UH
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">United Healthcare</h1>
                <p className="text-sm text-muted-foreground">Powered by Dial0 Analytics</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Date Range Selector */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(Number(e.target.value))}
                  className="text-sm font-medium bg-transparent border-none outline-none cursor-pointer text-foreground"
                >
                  <option value={7}>Last 7 days</option>
                  <option value={14}>Last 14 days</option>
                  <option value={30}>Last 30 days</option>
                  <option value={90}>Last 90 days</option>
                </select>
              </div>
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="gap-2">
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button variant="default" size="sm" onClick={handleExportCSV} className="gap-2">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-6 py-8 space-y-8">
        {/* Stats Overview */}
        <StatsOverview
          totalCalls={stats.totalCalls}
          avgDuration={stats.avgDuration}
          resolutionRate={stats.resolutionRate}
          satisfaction={stats.satisfaction}
        />

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CallVolumeChart data={timeline} />
          <SentimentAnalysis positive={sentimentData.positive} neutral={sentimentData.neutral} negative={sentimentData.negative} />
        </div>

        {/* Performance Metrics */}
        <PerformanceMetrics
          fcrRate={performanceData.fcrRate}
          aht={performanceData.aht}
          ces={performanceData.ces}
          abandonmentRate={performanceData.abandonmentRate}
          peakTimes={performanceData.peakTimes}
        />

        {/* Common Issues */}
        <CommonIssues issues={issueBreakdown} />

        {/* AI Recommendations */}
        <AIRecommendations recommendations={recommendations} />

        {/* Recent Calls Table */}
        <RecentCallsTable
          calls={callDetails.calls}
          total={callDetails.total}
          hasMore={callDetails.hasMore}
          onLoadMore={() => {
            // Future: implement pagination
          }}
        />

        {/* Footer */}
        <div className="py-6 text-center text-sm text-muted-foreground border-t border-border">
          <p>
            Data updated in real-time • Last refresh: {new Date().toLocaleTimeString()} • Powered by{" "}
            <span className="font-semibold text-foreground">Dial0</span>
          </p>
        </div>
      </div>
    </div>
  );
}