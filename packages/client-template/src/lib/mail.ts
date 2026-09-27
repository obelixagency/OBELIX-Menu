/**
 * Optional email delivery for Rate Form submissions.
 * Configure either:
 *   RESEND_API_KEY (+ optional EMAIL_FROM)
 *   or SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM
 * Without config: submissions still persist to dashboard; email is skipped (logged).
 */
export type MailResult = {
  sent: boolean;
  skipped: boolean;
  error?: string;
};

export async function sendRateFormEmail(opts: {
  to: string;
  clientName: string;
  payload: Record<string, unknown>;
}): Promise<MailResult> {
  const to = opts.to.trim();
  if (!to) {
    return { sent: false, skipped: true, error: "no notification email" };
  }

  const subject = `[OBELIX Menu] Rate Form — ${opts.clientName}`;
  const lines = Object.entries(opts.payload)
    .map(([k, v]) => `${k}: ${v === undefined || v === null || v === "" ? "—" : String(v)}`)
    .join("\n");
  const text = `New Rate Form submission for ${opts.clientName}\n\n${lines}\n`;
  const html = `<h2>New Rate Form — ${escapeHtml(opts.clientName)}</h2><pre style="font-family:sans-serif;white-space:pre-wrap">${escapeHtml(lines)}</pre>`;

  const from =
    process.env.EMAIL_FROM ||
    process.env.RESEND_FROM ||
    "OBELIX Menu <onboarding@resend.dev>";

  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from, to: [to], subject, html, text }),
      });
      if (!res.ok) {
        const body = await res.text();
        console.error("[mail] Resend failed", res.status, body);
        return { sent: false, skipped: false, error: `Resend ${res.status}` };
      }
      return { sent: true, skipped: false };
    } catch (err) {
      console.error("[mail] Resend error", err);
      return {
        sent: false,
        skipped: false,
        error: err instanceof Error ? err.message : "resend error",
      };
    }
  }

  const host = process.env.SMTP_HOST;
  if (host) {
    try {
      // Dynamic import so the package is optional at runtime if unused
      const nodemailer = await import("nodemailer");
      const port = Number(process.env.SMTP_PORT || 587);
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth:
          process.env.SMTP_USER && process.env.SMTP_PASS
            ? {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
              }
            : undefined,
      });
      await transporter.sendMail({ from, to, subject, text, html });
      return { sent: true, skipped: false };
    } catch (err) {
      console.error("[mail] SMTP error", err);
      return {
        sent: false,
        skipped: false,
        error: err instanceof Error ? err.message : "smtp error",
      };
    }
  }

  console.info(
    "[mail] skipped — set RESEND_API_KEY or SMTP_HOST to email Rate Form results. Submission saved.",
    { to, clientName: opts.clientName }
  );
  return { sent: false, skipped: true };
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
