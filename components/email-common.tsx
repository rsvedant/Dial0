import * as React from "react";

export interface EmailMeta {
  ip?: string;
  city?: string;
  region?: string;
  country?: string;
  userAgent?: string;
  timestamp?: string;
}

export interface EmailAction {
  label: string;
  url: string;
  helpText?: string;
  fallbackText?: string;
}

export interface EmailFrameProps {
  preheader: string;
  eyebrow?: string;
  title: string;
  summary: string;
  action?: EmailAction;
  body: React.ReactNode;
  metadata?: EmailMeta;
  footerNote?: string;
  logoUrl?: string;
}

const fontFamily = "'Inter', 'Helvetica Neue', Arial, sans-serif";
const brand = {
  background: "#f5f6ff",
  cardBorder: "#d8dbff",
  cardShadow: "0 18px 40px rgba(26, 22, 66, 0.12)",
  heroBg: "linear-gradient(135deg, #1f1b3d, #4334ff)",
  heroBgColor: "#292358",
  textPrimary: "#1f1c3d",
  textBody: "#3f4266",
  textMuted: "#61658a",
  divider: "#eceeff",
  badgeBg: "rgba(255, 255, 255, 0.14)",
  badgeText: "#f4f4ff",
  buttonBg: "#4334ff",
  buttonText: "#ffffff",
  buttonShadow: "0 8px 18px rgba(67, 52, 255, 0.28)",
  metadataBg: "#f0f2ff",
  metadataBorder: "#d0d4fb",
  footerBg: "#f8f9ff",
  link: "#4334ff",
};

const rootStyle: React.CSSProperties = {
  margin: 0,
  padding: "32px 0",
  width: "100%",
  backgroundColor: brand.background,
  fontFamily,
  color: brand.textBody,
};

const preheaderStyle: React.CSSProperties = {
  display: "none",
  fontSize: "1px",
  color: brand.background,
  lineHeight: "1px",
  maxHeight: "0px",
  maxWidth: "0px",
  opacity: 0,
  overflow: "hidden",
};

const outerTableStyle: React.CSSProperties = {
  width: "100%",
  borderSpacing: 0,
  borderCollapse: "collapse",
};

const cardTableStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "620px",
  borderSpacing: 0,
  borderCollapse: "separate",
  backgroundColor: "#ffffff",
  borderRadius: "20px",
  overflow: "hidden",
  border: `1px solid ${brand.cardBorder}`,
  boxShadow: brand.cardShadow,
};

const heroCellStyle: React.CSSProperties = {
  padding: "0",
};

const heroInnerStyle: React.CSSProperties = {
  backgroundColor: brand.heroBgColor,
  backgroundImage: brand.heroBg,
  color: "#ffffff",
  padding: "36px 40px 32px",
};

const logoStyle: React.CSSProperties = {
  display: "block",
  maxWidth: "140px",
  marginBottom: "28px",
};

const eyebrowStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "6px 12px",
  borderRadius: "999px",
  backgroundColor: brand.badgeBg,
  color: brand.badgeText,
  fontSize: "12px",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  marginBottom: "14px",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "28px",
  lineHeight: "36px",
  fontWeight: 600,
  color: "#ffffff",
};

const summaryStyle: React.CSSProperties = {
  margin: "16px 0 0",
  fontSize: "16px",
  lineHeight: "24px",
  color: "rgba(255, 255, 255, 0.82)",
};

const bodyCellStyle: React.CSSProperties = {
  padding: "32px 40px 4px",
};

export const paragraphStyle: React.CSSProperties = {
  margin: "0 0 18px",
  fontSize: "15px",
  lineHeight: "24px",
  color: brand.textBody,
};

export const mutedParagraphStyle: React.CSSProperties = {
  ...paragraphStyle,
  color: brand.textMuted,
};

const buttonContainerStyle: React.CSSProperties = {
  marginTop: "24px",
  marginBottom: "24px",
};

const buttonLinkStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "14px 28px",
  borderRadius: "999px",
  backgroundColor: brand.buttonBg,
  color: brand.buttonText,
  fontWeight: 600,
  fontSize: "15px",
  textDecoration: "none",
  boxShadow: brand.buttonShadow,
};

const fallbackLinkStyle: React.CSSProperties = {
  ...mutedParagraphStyle,
  margin: "0",
  wordBreak: "break-all",
};

const metadataWrapperStyle: React.CSSProperties = {
  backgroundColor: brand.metadataBg,
  border: `1px solid ${brand.metadataBorder}`,
  borderRadius: "14px",
  padding: "18px 20px",
  margin: "24px 0 8px",
};

const metadataTitleStyle: React.CSSProperties = {
  margin: "0 0 12px",
  fontSize: "13px",
  fontWeight: 600,
  color: brand.textPrimary,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const metadataRowStyle: React.CSSProperties = {
  margin: "0 0 6px",
  fontSize: "12px",
  lineHeight: "18px",
  color: brand.textMuted,
};

const footerCellStyle: React.CSSProperties = {
  padding: "24px 40px 28px",
  backgroundColor: brand.footerBg,
  borderTop: `1px solid ${brand.divider}`,
};

const footerLineStyle: React.CSSProperties = {
  margin: "0 0 6px",
  fontSize: "12px",
  lineHeight: "18px",
  color: brand.textMuted,
};

const linkStyle: React.CSSProperties = {
  color: brand.link,
  textDecoration: "none",
};

function resolveLogoUrl(logoUrl?: string) {
  if (logoUrl) return logoUrl;
  const base = (process.env.SITE_URL || "").replace(/\/$/, "");
  return base ? `${base}/DialZero.svg` : "https://dummyimage.com/160x48/4334ff/ffffff&text=Dial0";
}

function formatLocation(meta: EmailMeta) {
  const parts = [meta.city, meta.region].filter(Boolean);
  const location = parts.join(", ");
  if (meta.country) {
    return location ? `${location} - ${meta.country}` : meta.country;
  }
  return location || undefined;
}

function formatTimestamp(timestamp?: string) {
  if (!timestamp) return undefined;
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) {
    return undefined;
  }
  return date.toUTCString();
}

export const EmailFrame: React.FC<EmailFrameProps> = ({
  preheader,
  eyebrow,
  title,
  summary,
  action,
  body,
  metadata,
  footerNote,
  logoUrl,
}) => {
  const resolvedLogo = resolveLogoUrl(logoUrl);
  const location = metadata ? formatLocation(metadata) : undefined;
  const formattedTimestamp = metadata ? formatTimestamp(metadata.timestamp) : undefined;
  const year = new Date().getFullYear();

  return (
    <div style={rootStyle}>
      <span style={preheaderStyle}>{preheader}</span>
      <table role="presentation" cellPadding={0} cellSpacing={0} style={outerTableStyle}>
        <tbody>
          <tr>
            <td align="center" style={{ padding: "0 16px" }}>
              <table role="presentation" cellPadding={0} cellSpacing={0} style={cardTableStyle}>
                <tbody>
                  <tr>
                    <td style={heroCellStyle}>
                      <div style={heroInnerStyle}>
                        <img src={resolvedLogo} alt="Dial0" style={logoStyle} />
                        {eyebrow ? <div style={eyebrowStyle}>{eyebrow}</div> : null}
                        <h1 style={titleStyle}>{title}</h1>
                        <p style={summaryStyle}>{summary}</p>
                        {action ? (
                          <div style={buttonContainerStyle}>
                            <table role="presentation" cellPadding={0} cellSpacing={0}>
                              <tbody>
                                <tr>
                                  <td>
                                    <a href={action.url} style={buttonLinkStyle} target="_blank" rel="noreferrer">
                                      {action.label}
                                    </a>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                            <div style={{ marginTop: "12px" }}>
                              <p style={fallbackLinkStyle}>
                                {action.helpText || "Having trouble?"} <a href={action.url} style={linkStyle}>{action.fallbackText || action.url}</a>
                              </p>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style={bodyCellStyle}>
                      {body}
                    </td>
                  </tr>
                  {metadata ? (
                    <tr>
                      <td style={bodyCellStyle}>
                        <div style={metadataWrapperStyle}>
                          <p style={metadataTitleStyle}>Request details</p>
                          {metadata.ip ? <p style={metadataRowStyle}>IP address: <strong style={{ color: brand.textPrimary }}>{metadata.ip}</strong></p> : null}
                          {location ? <p style={metadataRowStyle}>Location: <strong style={{ color: brand.textPrimary }}>{location}</strong></p> : null}
                          {metadata.userAgent ? <p style={metadataRowStyle}>Device: <span style={{ color: brand.textPrimary }}>{metadata.userAgent}</span></p> : null}
                          {formattedTimestamp ? <p style={metadataRowStyle}>Time: <strong style={{ color: brand.textPrimary }}>{formattedTimestamp}</strong></p> : null}
                          <p style={{ ...metadataRowStyle, marginTop: "12px" }}>We include this information to help you confirm the request was expected.</p>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                  {footerNote ? (
                    <tr>
                      <td style={bodyCellStyle}>
                        <p style={mutedParagraphStyle}>{footerNote}</p>
                      </td>
                    </tr>
                  ) : null}
                  <tr>
                    <td style={footerCellStyle}>
                      <p style={footerLineStyle}>Dial0 - Automated advocacy for complex customer problems.</p>
                      <p style={footerLineStyle}>This email was sent from a notification-only address. If you did not expect it, you can safely ignore it.</p>
                      <p style={footerLineStyle}>Copyright {year} Dial0. All rights reserved.</p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default EmailFrame;
