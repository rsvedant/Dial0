"use client";

import { OnboardingFlow } from "@/components/onboarding-flow";
import { useQuery, useMutation, Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";

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
  const completeOnboarding = useMutation(api.orchestration.completeOnboarding);

  // If already completed, redirect to dashboard
  useEffect(() => {
    if (onboardingStatus?.completed === true) {
      router.replace("/dashboard");
    }
  }, [onboardingStatus, router]);

  if (!onboardingStatus || !settings) {
    return <OnboardingSkeleton />;
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
