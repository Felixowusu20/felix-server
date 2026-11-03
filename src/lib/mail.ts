import { readFileSync } from "fs";
import { join } from "path";
import nodemailer from "nodemailer";
import type { Site } from "./types";

function getTransporter() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || "465");

  if (!user || !pass) {
    throw new Error("SMTP_USER and SMTP_PASS are required for email alerts");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

function recipients() {
  const to = process.env.ALERT_EMAIL || process.env.SMTP_USER;
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  return { to, from };
}

function iconAttachment() {
  try {
    return {
      filename: "icon-192.png",
      content: readFileSync(join(process.cwd(), "public", "icon-192.png")),
      cid: "monitor-icon",
    };
  } catch {
    return null;
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function emailShell(opts: { title: string; preheader: string; body: string }) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:Manrope,Segoe UI,Arial,sans-serif;color:#111827;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(opts.preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f5f7;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:22px 24px;background:linear-gradient(135deg,#0f766e,#115e59);color:#fff;">
              <table role="presentation" width="100%"><tr>
                <td width="48" valign="middle">
                  <img src="cid:monitor-icon" width="40" height="40" alt="Monitor" style="display:block;border-radius:10px;border:1px solid rgba(255,255,255,0.25);" />
                </td>
                <td valign="middle" style="padding-left:12px;">
                  <div style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;opacity:0.8;">Felix Server</div>
                  <div style="font-size:20px;font-weight:700;margin-top:4px;">${escapeHtml(opts.title)}</div>
                </td>
              </tr></table>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 24px;">
              ${opts.body}
            </td>
          </tr>
          <tr>
            <td style="padding:14px 24px 20px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;">
              Sent automatically by Felix Server
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendHtmlMail(opts: {
  subject: string;
  text: string;
  html: string;
}) {
  const { to, from } = recipients();
  if (!to || !from) {
    console.warn("Skipping email: ALERT_EMAIL/SMTP_USER not configured");
    return;
  }
  const icon = iconAttachment();
  const transporter = getTransporter();
  await transporter.sendMail({
    from,
    to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
    attachments: icon ? [icon] : [],
  });
}

export async function sendStatusAlert(opts: {
  siteName: string;
  siteUrl: string;
  status: "UP" | "DOWN";
  statusCode: number | null;
  latencyMs: number | null;
  error: string | null;
}) {
  const down = opts.status === "DOWN";
  const subject = down
    ? `Felix Server · ${opts.siteName} is down`
    : `Felix Server · ${opts.siteName} is back online`;

  const text = [
    `Site: ${opts.siteName}`,
    `URL: ${opts.siteUrl}`,
    `Status: ${opts.status}`,
    `HTTP: ${opts.statusCode ?? "n/a"}`,
    `Latency: ${opts.latencyMs != null ? `${opts.latencyMs} ms` : "n/a"}`,
    opts.error ? `Error: ${opts.error}` : null,
    `Checked at: ${new Date().toISOString()}`,
  ]
    .filter(Boolean)
    .join("\n");

  const html = emailShell({
    title: down ? "Site is DOWN" : "Site recovered",
    preheader: `${opts.siteName} is ${opts.status}`,
    body: `
      <div style="display:inline-block;padding:6px 10px;border-radius:999px;background:${down ? "#fef2f2" : "#ecfdf5"};color:${down ? "#b91c1c" : "#047857"};font-size:12px;font-weight:700;letter-spacing:0.04em;">
        ${opts.status}
      </div>
      <h2 style="margin:14px 0 6px;font-size:22px;">${escapeHtml(opts.siteName)}</h2>
      <p style="margin:0 0 16px;color:#6b7280;font-size:13px;word-break:break-all;">${escapeHtml(opts.siteUrl)}</p>
      <table role="presentation" width="100%" style="border-collapse:collapse;font-size:14px;">
        <tr>
          <td style="padding:10px 0;border-top:1px solid #e5e7eb;color:#6b7280;">HTTP</td>
          <td style="padding:10px 0;border-top:1px solid #e5e7eb;text-align:right;font-family:ui-monospace,monospace;">${opts.statusCode ?? "n/a"}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-top:1px solid #e5e7eb;color:#6b7280;">Latency</td>
          <td style="padding:10px 0;border-top:1px solid #e5e7eb;text-align:right;font-family:ui-monospace,monospace;">${opts.latencyMs != null ? `${opts.latencyMs} ms` : "n/a"}</td>
        </tr>
        ${
          opts.error
            ? `<tr>
          <td style="padding:10px 0;border-top:1px solid #e5e7eb;color:#6b7280;">Detail</td>
          <td style="padding:10px 0;border-top:1px solid #e5e7eb;text-align:right;color:#b91c1c;">${escapeHtml(opts.error)}</td>
        </tr>`
            : ""
        }
      </table>
    `,
  });

  await sendHtmlMail({ subject, text, html });
}

export async function sendStatusDigest(sites: Site[]) {
  const up = sites.filter((s) => s.lastStatus === "UP").length;
  const down = sites.filter((s) => s.lastStatus === "DOWN").length;
  const unknown = sites.length - up - down;

  const subject =
    down > 0
      ? `Felix Server · ${down} project${down === 1 ? "" : "s"} need attention`
      : `Felix Server · All projects healthy (${up} online)`;

  const text = [
    `Felix Server — status digest`,
    `Time: ${new Date().toISOString()}`,
    `Summary: ${up} up · ${down} down · ${unknown} unknown · ${sites.length} total`,
    "",
    ...sites.map((s) => {
      const latency = s.lastLatency != null ? `${s.lastLatency} ms` : "n/a";
      return `- [${s.lastStatus}] ${s.name} · HTTP ${s.lastCode ?? "n/a"} · ${latency}\n  ${s.url}`;
    }),
  ].join("\n");

  const rows = sites
    .map((s) => {
      const tone =
        s.lastStatus === "UP"
          ? { bg: "#ecfdf5", fg: "#047857", label: "UP" }
          : s.lastStatus === "DOWN"
            ? { bg: "#fef2f2", fg: "#b91c1c", label: "DOWN" }
            : { bg: "#fffbeb", fg: "#a16207", label: "…" };
      return `
        <tr>
          <td style="padding:12px 10px;border-top:1px solid #e5e7eb;">
            <div style="font-weight:600;">${escapeHtml(s.name)}</div>
            <div style="font-size:12px;color:#6b7280;word-break:break-all;margin-top:2px;">${escapeHtml(s.url)}</div>
          </td>
          <td style="padding:12px 10px;border-top:1px solid #e5e7eb;text-align:center;">
            <span style="display:inline-block;padding:4px 8px;border-radius:999px;background:${tone.bg};color:${tone.fg};font-size:11px;font-weight:700;">${tone.label}</span>
          </td>
          <td style="padding:12px 10px;border-top:1px solid #e5e7eb;text-align:right;font-family:ui-monospace,monospace;font-size:12px;">
            ${s.lastCode ?? "—"}<br/>
            <span style="color:#6b7280;">${s.lastLatency != null ? `${s.lastLatency} ms` : "—"}</span>
          </td>
        </tr>`;
    })
    .join("");

  const html = emailShell({
    title: "Project status digest",
    preheader: `${up} up, ${down} down across ${sites.length} projects`,
    body: `
      <table role="presentation" width="100%" style="margin-bottom:18px;">
        <tr>
          <td style="padding:12px;border-radius:12px;background:#ecfdf5;text-align:center;">
            <div style="font-size:11px;color:#047857;text-transform:uppercase;letter-spacing:0.06em;">Up</div>
            <div style="font-size:24px;font-weight:700;color:#047857;">${up}</div>
          </td>
          <td width="8"></td>
          <td style="padding:12px;border-radius:12px;background:#fef2f2;text-align:center;">
            <div style="font-size:11px;color:#b91c1c;text-transform:uppercase;letter-spacing:0.06em;">Down</div>
            <div style="font-size:24px;font-weight:700;color:#b91c1c;">${down}</div>
          </td>
          <td width="8"></td>
          <td style="padding:12px;border-radius:12px;background:#f3f4f6;text-align:center;">
            <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;">Total</div>
            <div style="font-size:24px;font-weight:700;">${sites.length}</div>
          </td>
        </tr>
      </table>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
        <tr style="background:#f9fafb;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">
          <td style="padding:10px;">Project</td>
          <td style="padding:10px;text-align:center;">Status</td>
          <td style="padding:10px;text-align:right;">HTTP / Latency</td>
        </tr>
        ${rows || `<tr><td colspan="3" style="padding:16px;color:#6b7280;">No projects configured.</td></tr>`}
      </table>
      <p style="margin:16px 0 0;font-size:12px;color:#6b7280;">
        Generated ${escapeHtml(new Date().toLocaleString())}
      </p>
    `,
  });

  await sendHtmlMail({ subject, text, html });
}

export async function sendPasswordResetEmail(opts: {
  resetUrl: string;
}) {
  const text = `Reset your Felix Server password:\n\n${opts.resetUrl}\n\nThis link expires in 30 minutes. If you did not request this, ignore this email.`;
  const html = emailShell({
    title: "Reset your password",
    preheader: "Use this secure link to reset your dashboard password",
    body: `
      <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#374151;">
        We received a request to reset your admin password. Click the button below to choose a new one.
      </p>
      <a href="${escapeHtml(opts.resetUrl)}" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-size:14px;font-weight:600;">
        Reset password
      </a>
      <p style="margin:16px 0 0;font-size:12px;color:#6b7280;word-break:break-all;">
        Or open this link:<br/>${escapeHtml(opts.resetUrl)}
      </p>
      <p style="margin:14px 0 0;font-size:12px;color:#6b7280;">
        This link expires in 30 minutes.
      </p>
    `,
  });

  await sendHtmlMail({
    subject: "Felix Server · Password reset request",
    text,
    html,
  });
}

export function statusEmailIntervalMinutes() {
  const raw = Number(process.env.STATUS_EMAIL_INTERVAL_MINUTES || "1");
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  return raw;
}

export function appBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  return "http://localhost:3000";
}
