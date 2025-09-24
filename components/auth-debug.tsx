"use client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function AuthDebug({ collapse = true }: { collapse?: boolean }) {
  const data = useQuery(api.auth.debugAuth, {});
  if (data === undefined) {
    return <div className="text-xs text-muted-foreground">Auth debug: loading...</div>;
  }
  const payload = JSON.stringify(data, null, 2);
  return (
    <div className="fixed bottom-2 right-2 z-50 max-w-sm">
      <details open={!collapse} className="rounded border bg-background shadow">
        <summary className="cursor-pointer px-2 py-1 text-xs font-medium">Auth Debug</summary>
        <pre className="m-0 overflow-auto p-2 text-[10px] leading-tight whitespace-pre-wrap break-all">
{payload}
        </pre>
      </details>
    </div>
  );
}
