import * as React from "react";
import {
  EmailFrame,
  EmailMeta,
  paragraphStyle,
  mutedParagraphStyle,
} from "@/components/email-common";

export interface MagicLinkEmailProps {
  username?: string;
  actionUrl: string;
  metadata?: EmailMeta;
  logoUrl?: string;
}

export const MagicLinkEmail: React.FC<MagicLinkEmailProps> = ({
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
        We received your request for a one time sign in link. Use the secure button above to resume your Dial0 session without entering a password.
      </p>
      <p style={paragraphStyle}>
        The link can only be used once and will expire in a few minutes to keep your account protected.
      </p>
      <p style={mutedParagraphStyle}>
        If you did not try to sign in, ignore this message or change your password from the security settings page.
      </p>
    </>
  );

  return (
    <EmailFrame
      preheader="Your one time Dial0 sign in link is ready."
      eyebrow="Sign in"
      title="Your secure sign in link"
      summary="Tap the button to continue where you left off."
      action={{
        label: "Sign in to Dial0",
        url: actionUrl,
        helpText: "Trouble opening the link? Copy this URL:",
        fallbackText: actionUrl,
      }}
      body={body}
      metadata={metadata}
      footerNote="This magic link expires in 5 minutes or after it is used once."
      logoUrl={logoUrl}
    />
  );
};

export default MagicLinkEmail;
