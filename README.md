# Felix Server

DIY uptime dashboard for your deployed sites. Add URLs, get live status + latency on a password-protected board, and email alerts when something goes down or recovers.

## Stack

- Next.js on **Vercel Pro** (cron every minute)
- **Neon** Postgres
- **Gmail SMTP** via Nodemailer
- Shared password auth

## Setup

### 1. Create a Neon database

1. Create a free project at [neon.tech](https://neon.tech)
2. Copy the connection string into `DATABASE_URL`
3. Run the SQL in [`sql/schema.sql`](sql/schema.sql) in the Neon SQL Editor

### 2. Gmail App Password

1. Enable 2FA on your Google account
2. Create an [App Password](https://myaccount.google.com/apppasswords)
3. Set `SMTP_USER`, `SMTP_PASS`, and `ALERT_EMAIL`

### 3. Local env

```bash
cp .env.example .env.local
# fill in all values
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign in with `DASHBOARD_PASSWORD`, add sites under **Manage sites**.

### 4. Deploy to Vercel

1. Push this repo and import it in Vercel
2. Add the same env vars in Project Settings → Environment Variables
3. Deploy — `vercel.json` registers a cron job for `/api/cron/check` every minute
4. Set `CRON_SECRET` — Vercel sends `Authorization: Bearer <CRON_SECRET>` on cron invocations

## How it works

| Piece | Behavior |
|---|---|
| Cron | Every minute, hits each site URL, stores status + latency |
| Dashboard | Polls `/api/sites` every 15s |
| Alerts | Email only when status **changes** (UP↔DOWN) |
| Retries | 2 retries before marking DOWN (reduces cold-start false alarms) |
| Manual | “Check now” on each card |

## Notes

- Treats HTTP &lt; 500 as UP (server responded); network errors / timeouts / 5xx as DOWN
- Prefer a public `/health` URL when a site is behind auth
- Gmail daily send limits are fine for transition-only alerts on ~10 sites
