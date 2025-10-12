import { query } from "./_generated/server";
import { v } from "convex/values";
import { MOCK_UNITED_HEALTHCARE_CALLS } from "./mockCompanyData";

/**
 * Get comprehensive call statistics for a company
 */
export const getCompanyCallStats = query({
  args: { companyName: v.string() },
  handler: async (ctx, { companyName }) => {
    // For now, use mock data since companyName field doesn't exist yet in schema
    // When user adds companyName field, this can query real data
    const mockCalls = MOCK_UNITED_HEALTHCARE_CALLS;

    const totalCalls = mockCalls.length;
    const resolvedCalls = mockCalls.filter((c) => c.status === "resolved").length;
    const inProgressCalls = mockCalls.filter((c) => c.status === "in-progress").length;
    const openCalls = mockCalls.filter((c) => c.status === "open").length;

    const callsWithDuration = mockCalls.filter((c) => c.duration);
    const avgDuration =
      callsWithDuration.length > 0
        ? callsWithDuration.reduce((sum, c) => sum + (c.duration || 0), 0) / callsWithDuration.length
        : 0;

    const resolutionRate = totalCalls > 0 ? (resolvedCalls / totalCalls) * 100 : 0;

    const callsWithSentiment = mockCalls.filter((c) => c.sentimentScore !== undefined);
    const avgSentiment =
      callsWithSentiment.length > 0
        ? callsWithSentiment.reduce((sum, c) => sum + (c.sentimentScore || 0), 0) / callsWithSentiment.length
        : 0;

    // Convert average sentiment to satisfaction percentage (0-100)
    const satisfaction = ((avgSentiment + 1) / 2) * 100;

    return {
      totalCalls,
      resolvedCalls,
      inProgressCalls,
      openCalls,
      avgDuration: Math.round(avgDuration), // in seconds
      resolutionRate: Math.round(resolutionRate * 10) / 10,
      satisfaction: Math.round(satisfaction * 10) / 10,
      avgSentiment: Math.round(avgSentiment * 100) / 100,
    };
  },
});

/**
 * Get call volume timeline for charts
 */
export const getCompanyCallTimeline = query({
  args: {
    companyName: v.string(),
    days: v.optional(v.number()),
  },
  handler: async (ctx, { companyName, days = 30 }) => {
    const mockCalls = MOCK_UNITED_HEALTHCARE_CALLS;

    // Group calls by date
    const callsByDate: Record<string, number> = {};

    // Initialize all dates in range
    const now = new Date();
    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      callsByDate[dateStr] = 0;
    }

    // Count calls per date
    mockCalls.forEach((call) => {
      const dateStr = call.createdAt.split("T")[0];
      if (callsByDate.hasOwnProperty(dateStr)) {
        callsByDate[dateStr]++;
      }
    });

    // Convert to array and sort
    const timeline = Object.entries(callsByDate)
      .map(([date, count]) => ({
        date,
        calls: count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return timeline;
  },
});

/**
 * Get detailed call records for table display
 */
export const getCompanyCallDetails = query({
  args: {
    companyName: v.string(),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, { companyName, limit = 20, offset = 0 }) => {
    const mockCalls = MOCK_UNITED_HEALTHCARE_CALLS;

    const paginatedCalls = mockCalls.slice(offset, offset + limit);

    return {
      calls: paginatedCalls.map((call) => ({
        id: `mock-${Math.random().toString(36).substr(2, 9)}`,
        title: call.title,
        status: call.status,
        createdAt: call.createdAt,
        duration: call.duration,
        sentimentScore: call.sentimentScore,
        category: call.category,
        transcript: call.transcript,
      })),
      total: mockCalls.length,
      hasMore: offset + limit < mockCalls.length,
    };
  },
});

/**
 * Get issue breakdown by category
 */
export const getCompanyIssueBreakdown = query({
  args: { companyName: v.string() },
  handler: async (ctx, { companyName }) => {
    const mockCalls = MOCK_UNITED_HEALTHCARE_CALLS;

    // Count by category
    const categoryCounts: Record<string, { count: number; avgDuration: number; resolutionRate: number }> = {};

    mockCalls.forEach((call) => {
      const category = call.category || "General Inquiry";

      if (!categoryCounts[category]) {
        categoryCounts[category] = {
          count: 0,
          avgDuration: 0,
          resolutionRate: 0,
        };
      }

      categoryCounts[category].count++;
      categoryCounts[category].avgDuration += call.duration || 0;

      if (call.status === "resolved") {
        categoryCounts[category].resolutionRate++;
      }
    });

    // Calculate averages and sort by frequency
    const breakdown = Object.entries(categoryCounts)
      .map(([category, data]) => ({
        category,
        count: data.count,
        avgDuration: data.count > 0 ? Math.round(data.avgDuration / data.count) : 0,
        resolutionRate: data.count > 0 ? Math.round((data.resolutionRate / data.count) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return breakdown;
  },
});

/**
 * Get sentiment distribution
 */
export const getCompanySentimentDistribution = query({
  args: { companyName: v.string() },
  handler: async (ctx, { companyName }) => {
    const mockCalls = MOCK_UNITED_HEALTHCARE_CALLS;

    let positive = 0;
    let neutral = 0;
    let negative = 0;

    mockCalls.forEach((call) => {
      const score = call.sentimentScore || 0;
      if (score > 0.2) positive++;
      else if (score < -0.2) negative++;
      else neutral++;
    });

    return {
      positive,
      neutral,
      negative,
      total: mockCalls.length,
    };
  },
});

/**
 * Get performance metrics for detailed analysis
 */
export const getCompanyPerformanceMetrics = query({
  args: { companyName: v.string() },
  handler: async (ctx, { companyName }) => {
    const mockCalls = MOCK_UNITED_HEALTHCARE_CALLS;

    // First Call Resolution (FCR) - percentage of resolved calls
    const totalCalls = mockCalls.length;
    const resolvedCalls = mockCalls.filter((c) => c.status === "resolved").length;
    const fcrRate = totalCalls > 0 ? (resolvedCalls / totalCalls) * 100 : 0;

    // Average Handle Time (AHT) in minutes
    const callsWithDuration = mockCalls.filter((c) => c.duration);
    const aht =
      callsWithDuration.length > 0
        ? callsWithDuration.reduce((sum, c) => sum + (c.duration || 0), 0) / callsWithDuration.length / 60
        : 0;

    // Customer Effort Score (CES) - simplified calculation
    const avgEffort =
      callsWithDuration.length > 0
        ? callsWithDuration.reduce((sum, c) => {
            const duration = c.duration || 0;
            const transcriptLength = c.transcript?.length || 0;
            const effortScore = Math.min(5, Math.max(1, (duration / 600 + transcriptLength / 2000) / 2));
            return sum + effortScore;
          }, 0) / callsWithDuration.length
        : 3;

    // Call Abandonment Rate (simulated)
    const abandonmentRate = Math.random() * 5 + 2; // 2-7% simulated

    // Peak call times
    const callsByHour: Record<number, number> = {};
    for (let i = 0; i < 24; i++) {
      callsByHour[i] = 0;
    }

    mockCalls.forEach((call) => {
      const hour = new Date(call.createdAt).getHours();
      callsByHour[hour]++;
    });

    const peakTimes = Object.entries(callsByHour)
      .map(([hour, count]) => ({
        hour: parseInt(hour),
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      fcrRate: Math.round(fcrRate * 10) / 10,
      aht: Math.round(aht * 10) / 10,
      ces: Math.round(avgEffort * 10) / 10,
      abandonmentRate: Math.round(abandonmentRate * 10) / 10,
      peakTimes,
      callsByHour,
    };
  },
});