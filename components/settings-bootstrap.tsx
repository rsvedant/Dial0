"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";

/**
 * SettingsBootstrap
 * Ensures a settings document exists for the current authenticated user.
 * Auto-detects and saves timezone on first run.
 * Surfaces minimal debug info (only in dev) via a small corner badge.
 */
export function SettingsBootstrap() {
  const [didRun, setDidRun] = useState(false);
  const getOrCreate = useMutation(api.orchestration.getOrCreateSettings);
  const saveSettings = useMutation(api.orchestration.saveSettings);
  const settings = useQuery(api.orchestration.getSettings, {} as any);
  const debugAll = useQuery(api.orchestration.debugAllMySettings, {} as any);
  const debugShape = useQuery(api.orchestration.debugAuthUserShape, {} as any);
  const pendingRef = useRef(false);

  useEffect(() => {
    if (pendingRef.current) return;
    // Wait until we have some auth shape returned
    if (!debugShape) return;
    if (didRun) return;
    pendingRef.current = true;
    (async () => {
      try {
        const result = await getOrCreate();
        
        // Auto-detect and save timezone if not already set
        if (result?.settings && !result.settings.timezone) {
          try {
            const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            if (detectedTimezone) {
              await saveSettings({ timezone: detectedTimezone });
              console.log('[SettingsBootstrap] Auto-detected and saved timezone:', detectedTimezone);
            }
          } catch (e) {
            console.warn('[SettingsBootstrap] Failed to auto-detect timezone', e);
          }
        }
      } catch (e) {
        console.warn('[SettingsBootstrap] getOrCreate error', e);
      } finally {
        setDidRun(true);
        pendingRef.current = false;
      }
    })();
  }, [debugShape, getOrCreate, saveSettings, didRun]);

  if (process.env.NODE_ENV !== 'development') return null;
  return (
    <div style={{position:'fixed', bottom:4, right:4, zIndex:60, fontSize:11, fontFamily:'monospace', background:'rgba(0,0,0,0.6)', color:'#0f0', padding:'4px 6px', borderRadius:4}}>
      <div>settingsRows: {debugAll?.count ?? '...'}</div>
      <div>authUser: {debugShape?.hasAuthUser ? 'yes' : 'no'}</div>
      <div>ran: {didRun ? 'y' : 'n'}</div>
    </div>
  );
}
