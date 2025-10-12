// AI insight generation utilities for company dashboard analytics

export interface CallData {
  id: string;
  title: string;
  duration?: number;
  transcript?: string;
  status: "open" | "in-progress" | "resolved";
  createdAt: string;
}

/**
 * Analyze sentiment from transcript text
 * Returns a score from -1 (negative) to 1 (positive)
 */
export function analyzeSentiment(transcript: string): number {
  if (!transcript || transcript.trim().length === 0) return 0;

  const text = transcript.toLowerCase();
  
  // Positive indicators
  const positiveWords = [
    "thank", "great", "excellent", "helpful", "appreciate", "resolved", 
    "perfect", "wonderful", "happy", "satisfied", "good", "yes", "sure"
  ];
  
  // Negative indicators
  const negativeWords = [
    "frustrated", "angry", "disappointed", "terrible", "awful", "horrible",
    "useless", "waste", "problem", "issue", "wrong", "failed", "cancel", "refund"
  ];
  
  let positiveCount = 0;
  let negativeCount = 0;
  
  positiveWords.forEach(word => {
    const regex = new RegExp(`\\b${word}`, "gi");
    const matches = text.match(regex);
    positiveCount += matches ? matches.length : 0;
  });
  
  negativeWords.forEach(word => {
    const regex = new RegExp(`\\b${word}`, "gi");
    const matches = text.match(regex);
    negativeCount += matches ? matches.length : 0;
  });
  
  const totalWords = text.split(/\s+/).length;
  const sentimentRatio = (positiveCount - negativeCount) / Math.max(totalWords, 1);
  
  // Normalize to -1 to 1 range
  return Math.max(-1, Math.min(1, sentimentRatio * 10));
}

/**
 * Extract issue category from title and transcript
 */
export function extractIssueCategory(title: string, transcript?: string): string {
  const text = `${title} ${transcript || ""}`.toLowerCase();
  
  const categories = {
    "Billing & Payments": ["bill", "payment", "charge", "invoice", "balance", "credit", "debit", "refund"],
    "Claims Processing": ["claim", "reimbursement", "coverage", "denied", "appeal", "eob"],
    "Prescription & Pharmacy": ["prescription", "medication", "pharmacy", "drug", "rx", "refill"],
    "Provider Network": ["provider", "doctor", "network", "in-network", "out-of-network", "physician"],
    "ID Cards & Documents": ["id card", "member card", "document", "proof of coverage", "insurance card"],
    "Plan Information": ["plan", "benefits", "deductible", "copay", "premium", "enrollment"],
    "Authorization & Referrals": ["authorization", "pre-auth", "referral", "approval", "prior auth"],
    "Account Management": ["account", "login", "password", "profile", "update information"],
  };
  
  for (const [category, keywords] of Object.entries(categories)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        return category;
      }
    }
  }
  
  return "General Inquiry";
}

/**
 * Calculate customer effort score based on call duration and transcript complexity
 * Returns a score from 1 (easy) to 5 (difficult)
 */
export function calculateEffortScore(duration?: number, transcriptLength?: number): number {
  if (!duration && !transcriptLength) return 3; // Default medium
  
  // Longer calls and longer transcripts indicate higher effort
  const durationScore = duration ? Math.min(5, Math.max(1, duration / 600)) : 3; // 10 min = score 1, 50+ min = score 5
  const lengthScore = transcriptLength ? Math.min(5, Math.max(1, transcriptLength / 2000)) : 3; // 2000 chars = score 1
  
  return Math.round((durationScore + lengthScore) / 2 * 10) / 10;
}

/**
 * Generate actionable recommendations based on call patterns
 */
export function generateRecommendations(calls: CallData[]): string[] {
  const recommendations: string[] = [];
  
  if (calls.length === 0) {
    return ["Insufficient data to generate recommendations."];
  }
  
  // Analyze call durations
  const durationsWithValue = calls.filter(c => c.duration).map(c => c.duration!);
  const avgDuration = durationsWithValue.length > 0 
    ? durationsWithValue.reduce((a, b) => a + b, 0) / durationsWithValue.length 
    : 0;
  
  if (avgDuration > 1200) { // 20 minutes
    recommendations.push(
      "Average call time is high (>20 minutes). Consider implementing self-service options for common issues to reduce agent workload."
    );
  }
  
  // Analyze issue categories
  const categories = calls.map(c => extractIssueCategory(c.title, c.transcript));
  const categoryCounts = categories.reduce((acc, cat) => {
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const topCategory = Object.entries(categoryCounts)
    .sort(([, a], [, b]) => b - a)[0];
  
  if (topCategory && topCategory[1] > calls.length * 0.3) {
    recommendations.push(
      `${topCategory[0]} accounts for ${Math.round(topCategory[1] / calls.length * 100)}% of calls. Create dedicated IVR menu option and FAQ resources for this category.`
    );
  }
  
  // Analyze resolution rates
  const resolvedCount = calls.filter(c => c.status === "resolved").length;
  const resolutionRate = resolvedCount / calls.length;
  
  if (resolutionRate < 0.7) {
    recommendations.push(
      `First Call Resolution rate is ${Math.round(resolutionRate * 100)}%. Implement better agent training and knowledge base tools to improve resolution rates.`
    );
  }
  
  // Analyze sentiment
  const sentiments = calls
    .filter(c => c.transcript)
    .map(c => analyzeSentiment(c.transcript!));
  const avgSentiment = sentiments.length > 0 
    ? sentiments.reduce((a, b) => a + b, 0) / sentiments.length 
    : 0;
  
  if (avgSentiment < -0.2) {
    recommendations.push(
      "Customer sentiment is trending negative. Review recent call recordings and implement empathy training for customer service representatives."
    );
  } else if (avgSentiment > 0.3) {
    recommendations.push(
      "Customer satisfaction is high! Document successful agent techniques and share best practices across the team."
    );
  }
  
  // Analyze timing patterns
  const callsByHour = calls.reduce((acc, call) => {
    const hour = new Date(call.createdAt).getHours();
    acc[hour] = (acc[hour] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);
  
  const peakHour = Object.entries(callsByHour)
    .sort(([, a], [, b]) => b - a)[0];
  
  if (peakHour && peakHour[1] > calls.length * 0.15) {
    recommendations.push(
      `Peak call volume occurs at ${peakHour[0]}:00. Consider adjusting staffing levels to ensure adequate coverage during high-demand periods.`
    );
  }
  
  // Always include a positive recommendation
  if (recommendations.length === 0) {
    recommendations.push(
      "Operations are running smoothly. Continue monitoring key metrics and maintain current service standards."
    );
  }
  
  return recommendations.slice(0, 5); // Return top 5 recommendations
}

/**
 * Get sentiment label from score
 */
export function getSentimentLabel(score: number): "Positive" | "Neutral" | "Negative" {
  if (score > 0.2) return "Positive";
  if (score < -0.2) return "Negative";
  return "Neutral";
}

/**
 * Calculate First Call Resolution rate
 */
export function calculateFCR(calls: CallData[]): number {
  if (calls.length === 0) return 0;
  const resolvedOnFirstCall = calls.filter(c => c.status === "resolved").length;
  return (resolvedOnFirstCall / calls.length) * 100;
}

/**
 * Calculate Average Handle Time in minutes
 */
export function calculateAHT(calls: CallData[]): number {
  const durationsWithValue = calls.filter(c => c.duration).map(c => c.duration!);
  if (durationsWithValue.length === 0) return 0;
  const avgSeconds = durationsWithValue.reduce((a, b) => a + b, 0) / durationsWithValue.length;
  return Math.round(avgSeconds / 60 * 10) / 10; // Convert to minutes with 1 decimal
}