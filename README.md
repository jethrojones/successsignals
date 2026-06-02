# Success Signal Analysis

**Find the signal hiding in your past campaigns.**

A small web app for [Kit](https://kit.com) creators. Paste your Kit API key, tell it
what you're optimizing for, and it reviews your recent broadcasts, compares your
winners and losers, and turns past performance into evidence-backed marketing
experiments.

Built with Astro + Cloudflare Workers. Lives at
[successsignals.optimizationdoc.com](https://successsignals.optimizationdoc.com).

**Project artifacts**

- **How to use it:** [docs/tutorial.md](docs/tutorial.md) — a 7-step, screenshot-based walkthrough.
- **Ideation conversation (ChatGPT):** [scoping → spec](https://gist.github.com/jethrojones/8fa8b81f48d96923bd903e6252711000) — the planning chat that narrowed scope, chose the hybrid knowledge approach, and produced the build spec.
- **Planning doc / build spec:** [overview](https://gist.github.com/jethrojones/7428a8dff16522db715e062875a20ffe) — the original spec the app was built from.
- **Prompt 1 — feature extraction:** [gist](https://gist.github.com/jethrojones/b6c0d6bbbb68da55eab0b782e1297cbf) — classifies each broadcast's content into structured features.
- **Prompt 2 — evidence-first report:** [gist](https://gist.github.com/jethrojones/562a687edfd48b80f92ded23a536ea9e) — compares winners vs. losers and writes the report.
- **How it was built:** [build transcript](https://gist.github.com/jethrojones/282f8417fbdf45c359c6ebcf8b867223) — the Claude Code session that designed, built, QA'd, and deployed it (secrets redacted).

---

## How it works

1. Visitor enters their **Kit API key** and answers a few questions about their goal.
2. The server pulls recent broadcasts (`GET /v4/broadcasts`), each broadcast's
   content (`GET /v4/broadcasts/{id}`), and stats (`GET /v4/broadcasts/{id}/stats`).
3. Campaigns are scored against the visitor's stated goal; winners and losers split out.
4. Two OpenAI calls: (1) per-campaign feature extraction, (2) the Success Signal report.
5. The report renders on screen; the visitor can copy or download it, and we email a copy.

## On the visitor's Kit key

The visitor's key is **used once, server-side, and never stored** — no database, no
logging. It's sent to Kit to read campaign data for that single analysis, then discarded.
The app holds one *persistent* Kit credential of its own, `OP_DOC_KIT_API_KEY`, which
belongs to Optimization Doc and is used only to capture the visitor's email as a lead.

## Why API key instead of OAuth

This is a stateless, single-shot analysis tool: no login, no database, nothing stored.
OAuth exists to hold long-lived tokens and act on a user's behalf over time — the opposite
of this design. Kit requires OAuth only for *publicly listed App Store apps*; for a
self-contained tool like this, an API key is the simpler and more honest fit.

## Local development

```bash
cp .dev.vars.example .dev.vars   # fill in OPEN_AI_API_KEY, RESEND_API_KEY, OP_DOC_KIT_API_KEY
npm install
npm run dev
```

## Deploy

```bash
npm run deploy          # astro build && wrangler deploy
# one-time: set production secrets
wrangler secret put OPEN_AI_API_KEY
wrangler secret put RESEND_API_KEY
wrangler secret put OP_DOC_KIT_API_KEY
```

## Environment variables

| Name | Secret | Purpose |
|------|--------|---------|
| `OPEN_AI_API_KEY` | yes | Feature extraction + report generation |
| `RESEND_API_KEY` | yes | Emails the report to the visitor |
| `OP_DOC_KIT_API_KEY` | yes | Lead capture into Optimization Doc's Kit account |
| `KIT_API_BASE_URL` | no | Defaults to `https://api.kit.com/v4` |
| `DEFAULT_MODEL` | no | OpenAI model, defaults to `gpt-4o` |

## Design

Uses the Optimization Doc design system — warm cream paper, navy ink, volt-yellow
highlight, a single electric-blue action per screen, stamped (not blurred) shadows.
