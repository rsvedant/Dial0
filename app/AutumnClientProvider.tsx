"use client";
import { AutumnProvider } from "autumn-js/react";
import { api } from "convex/_generated/api";
import { useConvex } from "convex/react";

export function AutumnClientProvider({ children }: { children: React.ReactNode }) {
  const convex = useConvex();

  return (
    <AutumnProvider convex={convex} convexApi={(api as any).autumn}>
      {children}
    </AutumnProvider>
  );
}