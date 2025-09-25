import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { EmailTemplate } from "@daveyplate/better-auth-ui/server";
import { ResetPasswordEmail } from "@/components/reset-password-email";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const providedSecret = req.headers.get("x-internal-email-key");
    const expectedSecret = process.env.INTERNAL_EMAIL_PROXY_SECRET;
    if (!expectedSecret) {
      console.warn("[send-reset-password] INTERNAL_EMAIL_PROXY_SECRET not set");
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }
    if (!providedSecret || providedSecret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { user, url } = await req.json();
    if (!user?.email || !url) {
      return NextResponse.json({ error: "Missing email or url" }, { status: 400 });
    }

    await resend.emails.send({
      from: "Dial0 <onboarding@resend.dev>",
      to: user.email,
      subject: "Reset your password",
      react: EmailTemplate({
        action: "Reset Password",
        content: ResetPasswordEmail({ username: user.name || user.email.split("@")[0] }),
        heading: "Password Reset",
        siteName: "Dial0 | ",
        baseUrl: process.env.SITE_URL,
        url,
      })
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[send-reset-password] error", e);
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}
