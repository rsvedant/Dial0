import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { TwoFactorOtpEmail } from "@/components/two-factor-otp-email";
import { lookupGeo } from "@/lib/geo";

interface ClientContextPayload {
  ip?: string;
  ipChain?: string;
  userAgent?: string;
  city?: string;
  region?: string;
  country?: string;
}

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const providedSecret = req.headers.get("x-internal-email-key");
    const expectedSecret = process.env.INTERNAL_EMAIL_PROXY_SECRET;
    if (!expectedSecret) {
      console.warn("[send-2fa-otp] INTERNAL_EMAIL_PROXY_SECRET not set");
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }
    if (!providedSecret || providedSecret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user, otp, clientContext } = (await req.json()) as {
      user?: { email?: string; name?: string };
      otp?: string;
      clientContext?: ClientContextPayload;
    };
    if (!user?.email || !otp) {
      return NextResponse.json({ error: "Missing email or otp" }, { status: 400 });
    }

    const headerForwarded = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || undefined;
    const ip = clientContext?.ip || clientContext?.ipChain?.split(",")[0]?.trim() || headerForwarded?.split(",")[0]?.trim();
    const userAgent = clientContext?.userAgent || req.headers.get("user-agent") || undefined;
    const geoFromClient =
      clientContext && (clientContext.city || clientContext.region || clientContext.country)
        ? {
            city: clientContext.city,
            region: clientContext.region,
            country: clientContext.country,
          }
        : undefined;
    const geo = geoFromClient || (await lookupGeo(ip));
    const timestamp = new Date().toISOString();
    const base = (process.env.SITE_URL || "").replace(/\/$/, "");
    const logoUrl = base ? `${base}/DialZero.svg` : undefined;
    const metadata = {
      ip,
      userAgent,
      timestamp,
      city: geo?.city,
      region: geo?.region,
      country: geo?.country,
    };

    await resend.emails.send({
      from: process.env.RESEND_FROM!,
      to: user.email,
      subject: "Your Dial0 verification code",
      react: TwoFactorOtpEmail({
        username: user.name || user.email.split("@")[0],
        otp,
        metadata,
        logoUrl,
      }),
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[send-2fa-otp] error", e);
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}
