"use client";

import { OnboardingFlow } from "@/components/onboarding-flow";
import { useQuery, useMutation, Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

function OnboardingSkeleton() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-6">
        <div className="space-y-2 text-center">
          <Skeleton className="h-10 w-64 mx-auto" />
          <Skeleton className="h-5 w-96 mx-auto" />
        </div>
        <div className="bg-card rounded-2xl border shadow-sm p-6 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}

function RedirectToSignIn() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/auth/sign-in?next=/onboarding");
  }, [router]);
  return <OnboardingSkeleton />;
}

function RedirectToDashboard() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);
  return <OnboardingSkeleton />;
}

function OnboardingContent() {
  const router = useRouter();
  const onboardingStatus = useQuery(api.orchestration.checkOnboardingStatus, {});
  const settings = useQuery(api.orchestration.getSettings, {});
  const ensureSettings = useMutation(api.orchestration.ensureSettings);
  const completeOnboarding = useMutation(api.orchestration.completeOnboarding);
  const ensureRetryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ensureRetryDelayRef = useRef(1000);
  const ensureInFlightRef = useRef(false);

  useEffect(() => {
    const DEFAULT_RETRY_DELAY_MS = 1000;
    const MAX_RETRY_DELAY_MS = 10000;

    if (settings === null) {
      let cancelled = false;

      const cleanupTimer = () => {
        if (ensureRetryTimeoutRef.current) {
          clearTimeout(ensureRetryTimeoutRef.current);
          ensureRetryTimeoutRef.current = null;
        }
      };

      const scheduleRetry = () => {
        cleanupTimer();
        const delay = ensureRetryDelayRef.current;
        ensureRetryTimeoutRef.current = setTimeout(() => {
          ensureRetryTimeoutRef.current = null;
          if (!cancelled) {
            ensureRetryDelayRef.current = Math.min(
              ensureRetryDelayRef.current * 2,
              MAX_RETRY_DELAY_MS,
            );
            attemptEnsure();
          }
        }, delay);
      };

      const attemptEnsure = async () => {
        if (cancelled || ensureInFlightRef.current) {
          return;
        }

        ensureInFlightRef.current = true;

        try {
          await ensureSettings({});
          ensureRetryDelayRef.current = DEFAULT_RETRY_DELAY_MS;
        } catch (error) {
          if (!cancelled) {
            scheduleRetry();
          }
        } finally {
          ensureInFlightRef.current = false;
        }
      };

      attemptEnsure();

      return () => {
        cancelled = true;
        cleanupTimer();
        ensureInFlightRef.current = false;
      };
    }

    ensureRetryDelayRef.current = DEFAULT_RETRY_DELAY_MS;
    if (ensureRetryTimeoutRef.current) {
      clearTimeout(ensureRetryTimeoutRef.current);
      ensureRetryTimeoutRef.current = null;
    }
    ensureInFlightRef.current = false;
  }, [settings, ensureSettings]);

  // If already completed, redirect to dashboard
  useEffect(() => {
    if (onboardingStatus?.completed === true) {
      router.replace("/dashboard");
    }
  }, [onboardingStatus, router]);

  if (!onboardingStatus || settings === undefined) {
    return <OnboardingSkeleton />;
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md space-y-4 text-center">
          <h2 className="text-xl font-semibold">Preparing your workspace…</h2>
          <p className="text-sm text-muted-foreground">
            Were creating your account settings. This usually takes a second.
          </p>
          <div className="flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">
            Well keep trying automatically. This rarely takes more than a few seconds.
          </p>
        </div>
      </div>
    );
  }

  if (onboardingStatus.completed) {
    return <RedirectToDashboard />;
  }

  const handleComplete = async (data: any) => {
    await completeOnboarding({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      address: data.address,
      birthdate: data.birthdate,
      timezone: data.timezone,
      selectedVoice: data.selectedVoice,
      testModeEnabled: data.testModeEnabled,
      testModeNumber: data.testModeNumber,
    });
  };

  return (
    <OnboardingFlow
      initialData={settings as any}
      onComplete={handleComplete}
    />
  );
}

export default function OnboardingPage() {
  return (
    <>
      <AuthLoading>
        <OnboardingSkeleton />
      </AuthLoading>
      <Unauthenticated>
        <RedirectToSignIn />
      </Unauthenticated>
      <Authenticated>
        <OnboardingContent />
      </Authenticated>
    </>
  );
}
