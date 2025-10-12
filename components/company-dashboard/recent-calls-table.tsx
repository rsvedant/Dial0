"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronUp,
  Calendar,
  Clock,
  Smile,
  Meh,
  Frown,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Call {
  id: string;
  title: string;
  status: "open" | "in-progress" | "resolved";
  createdAt: string;
  duration?: number;
  sentimentScore?: number;
  category?: string;
  transcript?: string;
}

interface RecentCallsTableProps {
  calls: Call[];
  total: number;
  hasMore: boolean;
  onLoadMore: () => void;
}

export function RecentCallsTable({ calls, total, hasMore, onLoadMore }: RecentCallsTableProps) {
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const toggleExpand = (callId: string) => {
    setExpandedCallId(expandedCallId === callId ? null : callId);
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return "N/A";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getSentimentIcon = (score?: number) => {
    if (score === undefined) return <Meh className="h-4 w-4" />;
    if (score > 0.2) return <Smile className="h-4 w-4 text-green-600 dark:text-green-400" />;
    if (score < -0.2) return <Frown className="h-4 w-4 text-red-600 dark:text-red-400" />;
    return <Meh className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
  };

  const getSentimentLabel = (score?: number): string => {
    if (score === undefined) return "Unknown";
    if (score > 0.2) return "Positive";
    if (score < -0.2) return "Negative";
    return "Neutral";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "resolved":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800">
            Resolved
          </Badge>
        );
      case "in-progress":
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800">
            In Progress
          </Badge>
        );
      case "open":
        return (
          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800">
            Open
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const paginatedCalls = calls.slice(0, currentPage * pageSize);

  return (
    <Card className="p-6 animate-fade-in-up" style={{ animationDelay: "0.9s" }}>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-1">Recent Calls</h3>
        <p className="text-sm text-muted-foreground">
          Detailed call history with transcripts and sentiment analysis ({total} total calls)
        </p>
      </div>
      <div className="overflow-x-auto">
        <div className="space-y-2">
          {paginatedCalls.map((call, index) => {
            const isExpanded = expandedCallId === call.id;

            return (
              <div
                key={call.id}
                className={cn(
                  "border border-border rounded-lg transition-all duration-200",
                  isExpanded ? "bg-accent/30" : "bg-card hover:bg-accent/20"
                )}
              >
                {/* Main Row */}
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => toggleExpand(call.id)}
                >
                  <div className="flex items-center gap-4">
                    {/* Expand Button */}
                    <button className="flex-shrink-0 p-1 hover:bg-accent rounded transition-colors">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>

                    {/* Date & Time */}
                    <div className="flex-shrink-0 w-32">
                      <div className="flex items-center gap-1 text-sm font-medium text-foreground">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {formatDate(call.createdAt)}
                      </div>
                      <div className="text-xs text-muted-foreground ml-4">{formatTime(call.createdAt)}</div>
                    </div>

                    {/* Issue Title */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate mb-1">{call.title}</p>
                      {call.category && (
                        <span className="text-xs text-muted-foreground">{call.category}</span>
                      )}
                    </div>

                    {/* Duration */}
                    <div className="flex-shrink-0 w-20 text-right">
                      <div className="flex items-center justify-end gap-1 text-sm text-foreground">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {formatDuration(call.duration)}
                      </div>
                    </div>

                    {/* Sentiment */}
                    <div className="flex-shrink-0 w-24">
                      <div className="flex items-center gap-2">
                        {getSentimentIcon(call.sentimentScore)}
                        <span className="text-xs text-muted-foreground">{getSentimentLabel(call.sentimentScore)}</span>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="flex-shrink-0 w-28">{getStatusBadge(call.status)}</div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-border">
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-sm font-semibold text-foreground mb-2">Call Transcript Preview</h4>
                        <div className="p-3 rounded-lg bg-muted/50 text-sm text-foreground/90 leading-relaxed max-h-32 overflow-y-auto">
                          {call.transcript || "No transcript available for this call."}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Call ID: {call.id}</span>
                          {call.sentimentScore !== undefined && (
                            <span>Sentiment Score: {call.sentimentScore.toFixed(2)}</span>
                          )}
                        </div>
                        <Button variant="outline" size="sm" className="gap-2">
                          <ExternalLink className="h-3 w-3" />
                          View Full Details
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Pagination */}
      {(hasMore || paginatedCalls.length < calls.length) && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {paginatedCalls.length} of {total} calls
          </p>
          <div className="flex gap-2">
            {currentPage > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
            )}
            {paginatedCalls.length < calls.length && (
              <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => p + 1)} className="gap-2">
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
            {hasMore && paginatedCalls.length >= calls.length && (
              <Button variant="outline" size="sm" onClick={onLoadMore} className="gap-2">
                Load More
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}