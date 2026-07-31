type MailTransporter = {
  sendMail(input: {
    from: string | undefined;
    to: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<unknown>;
};

let cachedTransporter: MailTransporter | null = null;

function isEmailConfigured(): boolean {
  return Boolean(
    process.env.EMAIL_SERVER_HOST &&
      process.env.EMAIL_SERVER_PORT &&
      process.env.EMAIL_SERVER_USER &&
      process.env.EMAIL_SERVER_PASSWORD &&
      process.env.EMAIL_FROM
  );
}

async function getTransporter(): Promise<MailTransporter> {
  if (cachedTransporter) return cachedTransporter;
  const nodemailer = await import("nodemailer");
  cachedTransporter = nodemailer.default.createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port: Number(process.env.EMAIL_SERVER_PORT),
    secure: Number(process.env.EMAIL_SERVER_PORT) === 465,
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD,
    },
  });
  return cachedTransporter;
}

/**
 * Sends an OTP code to `to`. If EMAIL_SERVER_* env vars aren't configured
 * yet, falls back to logging the code to Vercel's runtime logs instead of
 * throwing, so the rest of the flow is still testable before SMTP is wired.
 */
export async function sendOtpEmail(to: string, code: string, purpose: string): Promise<void> {
  if (!isEmailConfigured()) {
    console.warn(
      `[email not configured] Would send OTP ${code} to ${to} for purpose "${purpose}". ` +
        "Set EMAIL_SERVER_HOST/PORT/USER/PASSWORD and EMAIL_FROM to actually send this."
    );
    return;
  }

  const subject =
    purpose === "email_change"
      ? "Confirm your new Ragebait email"
      : purpose === "signup"
        ? "Verify your Ragebait account"
        : "Your Ragebait verification code";

  const transporter = await getTransporter();
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    text: `Your verification code is ${code}. It expires in 10 minutes. If you didn't request this, you can ignore this email.`,
    html: `
      <div style="font-family:sans-serif;max-width:420px;margin:0 auto;padding:24px;background:#0a0a0a;color:#f2f2f2;border-radius:16px;">
        <h2 style="margin:0 0 8px;">Ragebait</h2>
        <p style="color:#999;margin:0 0 24px;">${subject}</p>
        <div style="font-size:32px;font-weight:bold;letter-spacing:6px;text-align:center;
                    background:#161616;border-radius:12px;padding:16px;color:#fff;">
          ${code}
        </div>
        <p style="color:#777;font-size:13px;margin-top:24px;">
          This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}
