"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, Check, User, Phone, MapPin, Calendar, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { VoiceSelector } from "@/components/voice-selector";
import { InlineVoiceCreator } from "@/components/inline-voice-creator";
import { useRouter } from "next/navigation";

const INPUT_FOCUS_CLASS = "placeholder:text-neutral-500 focus-visible:ring-transparent focus-visible:border-foreground/40 focus:outline-none";

interface OnboardingFlowProps {
  initialData?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    address?: string;
    birthdate?: string;
    selectedVoice?: string;
    voiceId?: string;
    testModeEnabled?: boolean;
    testModeNumber?: string;
  };
  onComplete: (data: any) => Promise<void>;
}

const steps = [
  {
    id: "welcome",
    title: "Welcome to Dial0! 👋",
    subtitle: "Your AI agent needs some info to represent you",
    icon: User,
  },
  {
    id: "personal",
    title: "Tell us about yourself",
    subtitle: "Your agent will use this to introduce itself",
    icon: User,
  },
  {
    id: "contact",
    title: "How can we reach you?",
    subtitle: "Your agent will share these for verification",
    icon: Phone,
  },
  {
    id: "location",
    title: "Where are you located?",
    subtitle: "Your agent can provide this when asked",
    icon: MapPin,
  },
  {
    id: "voice",
    title: "Choose your voice assistant",
    subtitle: "Pick the voice that will speak on your behalf",
    icon: Mic,
  },
  {
    id: "complete",
    title: "You're all set! 🎉",
    subtitle: "Your AI agent is ready to help you",
    icon: Check,
  },
];

export function OnboardingFlow({ initialData, onComplete }: OnboardingFlowProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = React.useState(0);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [direction, setDirection] = React.useState(1);
  
  const browserTimezone = React.useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);

  const [formData, setFormData] = React.useState({
    firstName: initialData?.firstName ?? "",
    lastName: initialData?.lastName ?? "",
    email: initialData?.email ?? "",
    phone: initialData?.phone ?? "",
    address: initialData?.address ?? "",
    birthdate: initialData?.birthdate ?? "",
    selectedVoice: initialData?.selectedVoice ?? "",
    testModeEnabled: initialData?.testModeEnabled ?? true,
    testModeNumber: initialData?.testModeNumber ?? "",
  });

  const [userVoiceId, setUserVoiceId] = React.useState<string | undefined>(initialData?.voiceId);
  const [userVoiceName, setUserVoiceName] = React.useState<string | undefined>(
    initialData?.voiceId
      ? initialData?.firstName
        ? `${initialData.firstName}'s Voice`
        : "Your Voice"
      : undefined,
  );

  const [phoneError, setPhoneError] = React.useState<string | null>(null);
  const [testPhoneError, setTestPhoneError] = React.useState<string | null>(null);

  // E.164 phone number validation regex (same as in orchestration.ts)
  const E164_REGEX = /^\+[1-9]\d{1,14}$/;

  const validatePhone = (phone: string): boolean => {
    const trimmed = phone.trim();
    if (trimmed.length === 0) return false;
    return E164_REGEX.test(trimmed);
  };

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    
    // Validate phone fields on change
    if (field === "phone") {
      const trimmed = value.trim();
      if (trimmed.length > 0 && !E164_REGEX.test(trimmed)) {
        setPhoneError("Phone must be in E.164 format (e.g., +15551234567)");
      } else {
        setPhoneError(null);
      }
    }
    
    if (field === "testModeNumber") {
      const trimmed = value.trim();
      if (trimmed.length > 0 && !E164_REGEX.test(trimmed)) {
        setTestPhoneError("Phone must be in E.164 format (e.g., +15551234567)");
      } else {
        setTestPhoneError(null);
      }
    }
  };

  const canProgress = React.useMemo(() => {
    switch (steps[currentStep].id) {
      case "welcome":
        return true;
      case "personal":
        return formData.firstName.trim() !== "" && formData.lastName.trim() !== "";
      case "contact":
        // Validate email and phone format
        const hasEmail = formData.email.trim() !== "";
        const hasPhone = formData.phone.trim() !== "";
        const phoneValid = hasPhone && validatePhone(formData.phone);
        return hasEmail && phoneValid && !phoneError;
      case "location":
        return formData.address.trim() !== "" && formData.birthdate.trim() !== "";
      case "voice":
        // Validate test mode number if test mode is enabled
        if (formData.testModeEnabled) {
          const hasTestNumber = formData.testModeNumber.trim() !== "";
          const testNumberValid = hasTestNumber && validatePhone(formData.testModeNumber);
          return formData.selectedVoice.trim() !== "" && testNumberValid && !testPhoneError;
        }
        return formData.selectedVoice.trim() !== "";
      case "complete":
        return true;
      default:
        return false;
    }
  }, [currentStep, formData, phoneError, testPhoneError]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setDirection(1);
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    // Final validation before submission
    if (!validatePhone(formData.phone)) {
      setPhoneError("Phone must be in E.164 format (e.g., +15551234567)");
      setCurrentStep(2); // Go back to contact step
      return;
    }
    
    if (formData.testModeEnabled && !validatePhone(formData.testModeNumber)) {
      setTestPhoneError("Phone must be in E.164 format (e.g., +15551234567)");
      setCurrentStep(4); // Go back to voice step
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onComplete({
        ...formData,
        timezone: browserTimezone,
      });
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Onboarding completion error:", error);
      // Show error to user
      alert(error?.message || "Failed to complete onboarding. Please try again.");
      setIsSubmitting(false);
    }
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  const renderStepContent = () => {
    const step = steps[currentStep];

    switch (step.id) {
      case "welcome":
        return (
          <div className="flex flex-col items-center justify-center text-center py-12 px-6">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse" />
              <div className="relative bg-gradient-to-br from-primary to-primary/60 rounded-full p-8">
                <User className="h-16 w-16 text-primary-foreground" />
              </div>
            </div>
            <div className="space-y-4">
              <p className="text-lg text-muted-foreground max-w-md">
                Dial0 uses AI agents to call companies and resolve issues on your behalf. 
                Let's gather some information so your agent can represent you accurately.
              </p>
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 max-w-md mx-auto">
                <p className="text-sm text-foreground font-medium mb-2">How it works:</p>
                <ul className="text-xs text-muted-foreground space-y-1 text-left">
                  <li>• Your AI agent will use your information to identify you</li>
                  <li>• It can share your details to verify your identity</li>
                  <li>• It speaks on your behalf with full authority</li>
                  <li>• You stay in control and get real-time updates</li>
                </ul>
              </div>
            </div>
          </div>
        );

      case "personal":
        return (
          <div className="space-y-6 py-8">
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Why we need this:</strong> Your AI agent will introduce itself using your name 
                when calling companies on your behalf.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-base">First Name</Label>
              <Input
                id="firstName"
                placeholder="Jane"
                autoComplete="given-name"
                value={formData.firstName}
                onChange={(e) => updateField("firstName", e.target.value)}
                className={cn("text-lg h-12", INPUT_FOCUS_CLASS)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-base">Last Name</Label>
              <Input
                id="lastName"
                placeholder="Doe"
                autoComplete="family-name"
                value={formData.lastName}
                onChange={(e) => updateField("lastName", e.target.value)}
                className={cn("text-lg h-12", INPUT_FOCUS_CLASS)}
              />
            </div>
            {formData.firstName && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-muted-foreground"
              >
                Nice to meet you, {formData.firstName}! 👋
              </motion.p>
            )}
          </div>
        );

      case "contact":
        return (
          <div className="space-y-6 py-8">
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Why we need this:</strong> Your AI agent will provide these details to verify 
                your identity with customer service representatives.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-base">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="jane.doe@example.com"
                autoComplete="email"
                value={formData.email}
                onChange={(e) => updateField("email", e.target.value)}
                className={cn("text-lg h-12", INPUT_FOCUS_CLASS)}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                The agent can share this when companies ask for your email
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-base">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+15551234567"
                autoComplete="tel"
                value={formData.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                className={cn("text-lg h-12", INPUT_FOCUS_CLASS, phoneError && "border-red-500 focus-visible:ring-red-500")}
              />
              {phoneError ? (
                <p className="text-xs text-red-500 font-medium">
                  {phoneError}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Must be in E.164 format: +[country code][number] (e.g., +15551234567)
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                The agent can provide this for account verification and callbacks
              </p>
            </div>
          </div>
        );

      case "location":
        return (
          <div className="space-y-6 py-8">
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Why we need this:</strong> Your AI agent uses this information to verify your 
                identity and provide accurate details when representatives ask.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address" className="text-base">Address</Label>
              <Input
                id="address"
                placeholder="123 Main St, City, State, ZIP"
                autoComplete="street-address"
                value={formData.address}
                onChange={(e) => updateField("address", e.target.value)}
                className={cn("text-lg h-12", INPUT_FOCUS_CLASS)}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                The agent can share this for billing address verification
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="birthdate" className="text-base">Date of Birth</Label>
              <Input
                id="birthdate"
                type="date"
                autoComplete="bday"
                value={formData.birthdate}
                onChange={(e) => updateField("birthdate", e.target.value)}
                className={cn("text-lg h-12", INPUT_FOCUS_CLASS)}
              />
              <p className="text-xs text-muted-foreground">
                The agent can provide this when companies require DOB for verification
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone" className="text-base">Timezone</Label>
              <Input
                id="timezone"
                value={browserTimezone}
                readOnly
                disabled
                className="text-lg h-12 bg-muted/50 text-muted-foreground cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">
                Automatically detected from your browser
              </p>
            </div>
          </div>
        );

      case "voice":
        return (
          <div className="space-y-6 py-8">
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Why we need this:</strong> This is the voice your AI agent will use when calling 
                companies on your behalf. Choose one that represents you well.
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              You can create a custom voice later that sounds exactly like you, making calls 
              even more personalized.
            </p>
            <VoiceSelector
              value={formData.selectedVoice}
              onChange={(voice) => updateField("selectedVoice", voice)}
              userVoiceId={userVoiceId}
              userVoiceName={userVoiceName ?? (formData.firstName ? `${formData.firstName}'s Voice` : "Your Voice")}
            />

            <InlineVoiceCreator
              userName={[formData.firstName, formData.lastName].filter(Boolean).join(" ")}
              onCreated={({ voiceId, voiceName }) => {
                updateField("selectedVoice", voiceId);
                setUserVoiceId(voiceId);
                setUserVoiceName(voiceName ?? (formData.firstName ? `${formData.firstName}'s Voice` : "Your Voice"));
              }}
              className="mt-6"
            />
            
            {/* Test Mode Section */}
            <div className="pt-6 border-t space-y-4">
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-3">
                <p className="text-xs text-amber-900 dark:text-amber-100">
                  <strong>Test Mode is enabled by default.</strong> The AI agent will call your test number 
                  instead of real company numbers. Disable this when you're ready to make real calls.
                </p>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="testMode" className="text-base">Test Mode</Label>
                  <p className="text-xs text-muted-foreground">
                    Call your own number for testing
                  </p>
                </div>
                <Switch
                  id="testMode"
                  checked={formData.testModeEnabled}
                  onCheckedChange={(checked) => updateField("testModeEnabled", checked)}
                />
              </div>
              {formData.testModeEnabled && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <Label htmlFor="testNumber" className="text-sm">Test Phone Number</Label>
                  <Input
                    id="testNumber"
                    type="tel"
                    placeholder="+15551234567"
                    value={formData.testModeNumber}
                    onChange={(e) => updateField("testModeNumber", e.target.value)}
                    className={cn("h-12", INPUT_FOCUS_CLASS, testPhoneError && "border-red-500 focus-visible:ring-red-500")}
                  />
                  {testPhoneError ? (
                    <p className="text-xs text-red-500 font-medium">
                      {testPhoneError}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Must be in E.164 format: +[country code][number] (e.g., +15551234567)
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    This number will be called instead of the AI-determined number
                  </p>
                </motion.div>
              )}
            </div>
          </div>
        );

      case "complete":
        return (
          <div className="flex flex-col items-center justify-center text-center py-12 px-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="relative mb-8"
            >
              <div className="absolute inset-0 bg-green-500/20 rounded-full blur-3xl" />
              <div className="relative bg-gradient-to-br from-green-500 to-green-600 rounded-full p-8">
                <Check className="h-16 w-16 text-white" />
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-4"
            >
              <p className="text-lg text-muted-foreground max-w-md">
                You're all set, {formData.firstName}! You can now create your first issue 
                and let Dial0 handle the rest.
              </p>
              <div className="bg-muted rounded-lg p-4 text-left space-y-2 max-w-md">
                <p className="text-sm font-medium">What happens next?</p>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Describe your issue in the chat</li>
                  <li>Our AI will gather all necessary details</li>
                  <li>We'll call the company on your behalf</li>
                  <li>You'll get real-time updates on progress</li>
                </ul>
              </div>
            </motion.div>
          </div>
        );

      default:
        return null;
    }
  };

  const step = steps[currentStep];
  const Icon = step.icon;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background border-b">
        <div className="h-1 bg-muted">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: "0%" }}
            animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 rounded-full p-2">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">
              Step {currentStep + 1} of {steps.length}
            </span>
          </div>
          {currentStep > 0 && currentStep < steps.length - 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="text-muted-foreground"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6 pt-24 pb-32">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
              className="space-y-6"
            >
              {/* Step header */}
              <div className="space-y-2 text-center">
                <h1 className="text-3xl font-bold tracking-tight">{step.title}</h1>
                <p className="text-muted-foreground">{step.subtitle}</p>
              </div>

              {/* Step content */}
              <div className="bg-card rounded-2xl border shadow-sm p-6">
                {renderStepContent()}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-6 safe-area-bottom">
        <div className="max-w-lg mx-auto">
          {currentStep < steps.length - 1 ? (
            <Button
              onClick={handleNext}
              disabled={!canProgress}
              size="lg"
              className="w-full h-14 text-lg"
            >
              Continue
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              disabled={isSubmitting}
              size="lg"
              className="w-full h-14 text-lg bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              {isSubmitting ? "Setting up..." : "Get Started"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
