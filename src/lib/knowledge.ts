// Curated marketing knowledge that grounds the analysis.
//
// This is a distillation — synthesized in our own words — of three sources kept
// locally (and gitignored): an email-newsletter craft skill, a growth-lead
// advisor persona, and the MIT-licensed StoryBrand (SB7) messaging framework.
//
// It is injected into the OpenAI calls so recommendations connect to established
// principles AFTER the campaign evidence — never as proof, only as "this is
// consistent with…". The order matters: data first, principles second.

/** Benchmarks for sanity-checking rates (percent). Email-newsletter craft. */
export const BENCHMARKS = {
  openRateGood: 25, // 25–40%+ is healthy
  openRateStrong: 40,
  clickRateGood: 2, // 2–5%+ is healthy
  clickRateStrong: 5,
  unsubRateConcern: 0.5, // keep under 0.5%
};

/** Controlled vocabulary for the feature-extraction call, from the craft skill. */
export const FEATURE_VOCAB = {
  subjectStyle: [
    "curiosity gap",
    "direct benefit",
    "personal",
    "urgent",
    "question",
    "announcement",
    "counter-intuitive take",
    "number/listicle",
  ],
  emailStyle: [
    "personal story",
    "educational",
    "promotional",
    "curated links",
    "announcement",
    "case study",
    "personal letter",
    "single-topic deep dive",
  ],
  tone: [
    "personal",
    "authoritative",
    "urgent",
    "conversational",
    "inspirational",
  ],
  offerType: [
    "free resource",
    "paid product",
    "consultation",
    "content only",
    "event",
    "none",
  ],
};

/**
 * The analyst persona. Distilled from the growth-lead advisor: direct,
 * data-minded, prioritization-obsessed, revenue-aware, allergic to fluff.
 */
export const ANALYST_PERSONA = `You write like a senior growth advisor with 15+ years of real results — not a content marketer.

Operating style:
- Be direct. Lead with your take; don't bury it in caveats.
- Be specific. "Improve your subject lines" is useless. "Your top 4 emails opened with a personal story; your bottom 4 opened with an announcement" is actionable.
- Be prioritization-obsessed. Most senders do too many things. Point to the ONE pattern that matters most right now.
- Be data-minded. Every claim ties back to the campaign numbers in front of you. Gut feelings generate hypotheses; the data decides.
- Revenue and engagement are the point. Vanity metrics are fine to note, dangerous to optimize for.
- Done beats perfect. Frame recommendations as experiments to run this month, not theories.`;

/**
 * Curated principles the report may reference — only AFTER citing campaign
 * evidence, and never as proof. Each entry is name + one-line essence.
 */
export const PRINCIPLES = `Curated marketing principles you may connect findings to (use "this is consistent with…" / "this resembles…", never "this proves…"):

StoryBrand / SB7 (Donald Miller) — the customer is the hero, the brand is the guide:
- A Character: name ONE clear desire per email; multiple competing desires dilute the message.
- Has a Problem: address the internal/emotional problem, not just the external one. People buy solutions to how the problem makes them feel.
- Meets a Guide: combine empathy ("we understand…") with authority (proof, results). Emails that talk about the reader beat emails that talk about the sender.
- Gives a Plan: a clear, simple next step reduces the fear of acting.
- Calls to Action: one obvious direct CTA. A transitional CTA (free resource) captures the not-yet-ready. Asking explicitly beats hoping.
- Avoids Failure / Ends in Success: name the stakes and paint the win.

Email & direct-response craft:
- One clear CTA per email — competing asks dilute clicks.
- Curiosity-gap and personal subject lines open loops; generic "newsletter #42" subjects don't.
- Specificity beats generality — concrete numbers, names, and stories outperform abstractions.
- Story-first openings build relationship before the transaction.
- Consistency and audience trust compound; over-promotion and audience mismatch drive unsubscribes.
- Epiphany Bridge (Russell Brunson): a personal story that reframes a belief moves people more than features.

Benchmarks for context (not targets): healthy open rate 25–40%+, click rate 2–5%+, unsubscribe rate under 0.5%. Open rates are imperfect due to privacy changes — weight clicks and unsubscribes more heavily.`;
