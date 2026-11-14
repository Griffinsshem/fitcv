# FitCV

**A CV and cover letter that fit the job, every time.**

Paste a job description and FitCV tailors your CV to it, writes a matching cover letter, scores your fit, and shows the keyword gaps. Everything is generated from your own profile; a safety check in code removes anything the AI invents.

| Layer    | Tech                                                                    | Hosted on |
| -------- | ----------------------------------------------------------------------- | --------- |
| Web      | Next.js 16 (App Router), React 19, Tailwind v4, TanStack Query          | Vercel    |
| API      | Node 22, Express 5, TypeScript, Zod, Drizzle ORM, pino                  | Render    |
| Database | PostgreSQL                                                              | Neon      |
| AI       | Anthropic Claude **or** Google Gemini (switch with one env var)         | —         |
| Auth     | Sign in with Google (ID token → server-side session)                    | —         |
| Export   | `@react-pdf/renderer` (PDF) and `docx` (Word), generated in the browser | —         |

## Features

- **Master profile** from a form or an uploaded PDF/DOCX CV, which the AI turns into a draft for you to review.
- **Tailoring**: the CV is reworded and reordered for each job, and the matching cover letter is written in the same run.
- **Match score + keyword gap report**: the AI extracts the keywords; plain code decides whether you have them, so the score can be checked and reproduced.
- **Skill suggestions**: missing skills come with a concrete way to gain them. They are never added to your CV unless you confirm you have them.
- **Application tracker**: Saved → Applied → Interviewing → Offer, plus notes.
- **3 ATS-safe templates** (Classic, Modern, Compact) exported as PDF or Word.

## Architecture

```
Browser ──► Vercel (Next.js) ──/api/* rewrite──► Render (Express API) ──► Neon Postgres
                                                        └──► Anthropic / Gemini
```

- **Same-origin API proxy.** The browser only talks to the web domain, and Vercel forwards `/api/*` to Render. The session cookie is therefore first-party (`__Host-`, `httpOnly`, `Secure`, `SameSite=Lax`), so it keeps working in Safari and other browsers that block third-party cookies, and the API needs no CORS.
- **Async AI jobs.** Slow AI calls run as persisted jobs (`ai_jobs`) that the client polls, so requests never hit proxy timeouts or Render cold starts. A partial unique index guarantees at most one active job per application. Jobs left orphaned by a crash are marked failed so the user can retry.
- **Shared contract.** `packages/shared` holds the Zod schemas and types used by both apps. The API validates every input and every AI output with them.

```
apps/
  api/      Express API (routes, auth, AI providers, job runner, migrations in drizzle/)
  web/      Next.js app
packages/
  shared/   Zod schemas, types, deterministic keyword matcher
```

## Security

- Google ID tokens are verified server-side (signature, audience, issuer, expiry and `email_verified`). No Google secret or access token is ever stored.
- Sessions are opaque 256-bit tokens. Only their SHA-256 hash is stored, so they can be revoked instantly (logout, sign out other devices, delete account).
- CSRF: `SameSite=Lax`, a required custom header, and an Origin allowlist.
- Every database query is scoped to the signed-in user (IDOR guard), ids are validated as UUIDs, and update payloads are `.strict()` (no mass assignment).
- Uploads are capped at 4 MB, kept in memory only, and identified by magic bytes rather than file name. The extracted CV text is never written to disk.
- Prompt-injection posture: untrusted text is fenced and the model is told to treat it as data. Its output is schema-validated, and `enforceIntegrity()` strips any employer, title, date, degree or skill that isn't in your profile.
- Rate limits: global, sign-in and AI-burst limits, plus a daily AI quota per user. The quota is also the hook for paid passes later.
- Security headers: Helmet on the API, and a strict CSP, HSTS and `frame-ancestors 'none'` on the web app.
- Logs are structured and redact cookies and tokens. Errors return a request id, never a stack trace.
- Data minimisation: imported-CV drafts are purged after 7 days, expired sessions are deleted, and deleting your account cascades to all your data.

## Local development

Prerequisites: Node 22 and a Postgres database (a free Neon project works).

```bash
npm install
cp apps/api/.env.example apps/api/.env      # fill in DATABASE_URL, GOOGLE_CLIENT_ID, AI key
cp apps/web/.env.example apps/web/.env.local
npm run db:migrate:dev -w @fitcv/api
npm run dev:api     # http://localhost:4000
npm run dev:web     # http://localhost:3000
```

Useful scripts: `npm run lint`, `npm run typecheck`, `npm test`, and `npm run db:generate -w @fitcv/api` (creates a migration after you change `src/db/schema.ts`).

## Deployment

### API on Render (`render.yaml`)

- Build: `npm ci --include=dev && npm run build -w @fitcv/api && npm run db:migrate -w @fitcv/api`
- Start: `npm start -w @fitcv/api`
- Health check: `/health`
- Environment variables: `DATABASE_URL` (Neon **pooled**), `DATABASE_URL_DIRECT` (Neon direct, used for migrations), `WEB_ORIGIN` (the Vercel URL), `GOOGLE_CLIENT_ID`, `AI_PROVIDER`, plus `ANTHROPIC_API_KEY` or `GEMINI_API_KEY`.

### Web on Vercel

- Root directory: `apps/web`
- Environment variables: `API_URL` (the Render URL) and `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.

### Google sign-in

In Google Cloud Console, add the Vercel URL to the OAuth client's **Authorized JavaScript origins**.

## Roadmap

- Paid hourly and daily passes via M-Pesa (Daraja) or IntaSend: add an `entitlements` table and replace the fixed daily quota in `jobs/quota.ts`.
- Move AI jobs to a durable queue (pg-boss) and a separate worker when traffic grows.
- Use a shared rate-limit store (Redis) when running more than one API instance.
- Interview-prep questions generated from each job description.
