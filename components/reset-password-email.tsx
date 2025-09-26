import * as React from "react";
import {
  EmailFrame,
  EmailMeta,
  paragraphStyle,
  mutedParagraphStyle,
} from "@/components/email-common";

export interface ResetPasswordEmailProps {
  username?: string;
  actionUrl: string;
  metadata?: EmailMeta;
  logoUrl?: string;
}

export const ResetPasswordEmail: React.FC<ResetPasswordEmailProps> = ({
  username,
  actionUrl,
  metadata,
  logoUrl,
}) => {
  const name = username?.trim() || "there";
  const body = (
    <>
      <p style={paragraphStyle}>Hello {name},</p>
      <p style={paragraphStyle}>
        We received a request to reset the password on your Dial0 account. Use the secure button above to choose a new password.
      </p>
      <p style={paragraphStyle}>
        For security, the link works for a short time only. After you update your password we will sign out any active sessions.
      </p>
      <p style={mutedParagraphStyle}>
        If you did not request this change, you can ignore this email and your password will stay the same.
      </p>
    </>
  );

  return (
    <EmailFrame
      preheader="Reset your Dial0 password."
      eyebrow="Security"
      title="Reset your password"
      summary="Follow the secure link to protect your account."
      action={{
        label: "Choose a new password",
        url: actionUrl,
        helpText: "Need a direct link? Use:",
        fallbackText: actionUrl,
      }}
      body={body}
      metadata={metadata}
      footerNote="This password reset link expires in 60 minutes."
      logoUrl={logoUrl}
    />
  );
};

export default ResetPasswordEmail;
