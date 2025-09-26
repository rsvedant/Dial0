import * as React from "react";
import {
  EmailFrame,
  EmailMeta,
  paragraphStyle,
  mutedParagraphStyle,
} from "@/components/email-common";

export interface VerificationEmailProps {
  username?: string;
  actionUrl: string;
  metadata?: EmailMeta;
  logoUrl?: string;
}

export const VerificationEmail: React.FC<VerificationEmailProps> = ({
  username,
  actionUrl,
  metadata,
  logoUrl,
}) => {
  const name = username?.trim() || "there";
  const body = (
    <>
      <p style={paragraphStyle}>Hi {name},</p>
      <p style={paragraphStyle}>
        Thanks for choosing Dial0. Confirm your email to activate your workspace and unlock automated advocacy for your support cases.
      </p>
      <p style={paragraphStyle}>
        Once verified, you can invite teammates, track escalations, and stay notified as we push each case to resolution.
      </p>
      <p style={mutedParagraphStyle}>
        If you did not expect this email, you can safely ignore it and your account will remain inactive.
      </p>
    </>
  );

  return (
    <EmailFrame
      preheader="Confirm your email to activate Dial0."
      eyebrow="Action required"
      title="Verify your email"
      summary="Secure your Dial0 workspace and start automating complex follow ups."
      action={{
        label: "Confirm email",
        url: actionUrl,
        helpText: "Button not working? Copy this link:",
        fallbackText: actionUrl,
      }}
      body={body}
      metadata={metadata}
      footerNote="This confirmation link expires in 24 hours."
      logoUrl={logoUrl}
    />
  );
};

export default VerificationEmail;
