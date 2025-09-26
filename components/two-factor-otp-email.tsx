import * as React from "react";
import {
  EmailFrame,
  EmailMeta,
  paragraphStyle,
  mutedParagraphStyle,
} from "@/components/email-common";

export interface TwoFactorOtpEmailProps {
  username?: string;
  otp: string;
  metadata?: EmailMeta;
  logoUrl?: string;
}

const otpContainerStyle: React.CSSProperties = {
  margin: "28px 0",
  padding: "20px",
  textAlign: "center",
  backgroundColor: "#f0f2ff",
  borderRadius: "12px",
  border: "1px solid #d0d4fb",
};

const otpTextStyle: React.CSSProperties = {
  display: "inline-block",
  fontSize: "32px",
  letterSpacing: "8px",
  fontWeight: 600,
  fontFamily: "'Roboto Mono', 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
  color: "#1f1c3d",
};

export const TwoFactorOtpEmail: React.FC<TwoFactorOtpEmailProps> = ({
  username,
  otp,
  metadata,
  logoUrl,
}) => {
  const name = username?.trim() || "there";
  const body = (
    <>
      <p style={paragraphStyle}>Hi {name},</p>
      <p style={paragraphStyle}>
        Use the code below to finish signing in to Dial0. Enter it on the device that requested verification to confirm it is you.
      </p>
      <div style={otpContainerStyle}>
        <span style={otpTextStyle}>{otp}</span>
      </div>
      <p style={paragraphStyle}>
        For your security, this code expires in 3 minutes and can only be used once.
      </p>
      <p style={mutedParagraphStyle}>
        If you did not start this sign in, we recommend resetting your password to keep your account safe.
      </p>
    </>
  );

  return (
    <EmailFrame
      preheader="Your Dial0 two factor authentication code."
      eyebrow="Account security"
      title="Your 2FA code"
      summary="Enter this six digit code to confirm it is you."
      body={body}
      metadata={metadata}
      footerNote="Need help? Send us an email at support@dial0.dev and our team will take a look."
      logoUrl={logoUrl}
    />
  );
};

export default TwoFactorOtpEmail;
