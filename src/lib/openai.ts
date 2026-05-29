// OpenAI client — feature extraction + evidence-first report generation.
//
// DEVELOPMENT STORY (real, see git history):
//   v1 was a single call that took only the metrics and asked for advice. The
//   output was generic — it could have been written without ever seeing these
//   campaigns. The fix, below, is a two-call evidence-first pipeline:
//
//   1. Feature extraction reads each email's CONTENT and classifies it
//      (subject style, story present, CTA count, tone, offer…).
//   2. Report generation compares winners vs losers, requires every signal to
//      cite specific campaign evidence, and only THEN connects to a marketing
//      principle — never as proof. The growth-lead persona supplies the voice.

import type {
  Campaign,
  CampaignFeatures,
  Goal,
  ReportData,
} from "./types";
import { OpenAIError } from "./errors";
import { htmlToText } from "./kit";
import { ANALYST_PERSONA, FEATURE_VOCAB, PRINCIPLES } from "./knowledge";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export interface OpenAIConfig {
  apiKey: string;
  model: string;
}

interface ChatOpts {
  temperature?: number;
  json?: boolean;
}

async function chat(
  cfg: OpenAIConfig,
  messages: Array<{ role: string; content: string }>,
  opts: ChatOpts = {},
): Promise<string> {
  let res: Response;
  try {
    res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: cfg.model,
        messages,
        temperature: opts.temperature ?? 0.5,
        ...(opts.json ? { response_format: { type: "json_object" } } : {}),
      }),
    });
  } catch {
    throw new OpenAIError("Couldn't reach OpenAI.");
  }
  if (!res.ok) {
    throw new OpenAIError(`OpenAI returned ${res.status}.`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? "";
}

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    // Best-effort: pull the first {...} block.
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]) as T;
      } catch {
        /* fall through */
      }
    }
    return fallback;
  }
}

// ── Call 1: per-campaign feature extraction ──────────────────────────────────

const EXTRACT_SYSTEM = `You classify a marketing email's CONTENT into structured features. Read the actual email body, not just the subject. Return ONLY JSON matching the requested shape. Use the provided controlled vocabulary where given; pick the single best fit. Count CTAs and links from the content. Estimate word_count from the body.`;

function extractPrompt(c: Campaign, goal: Goal): string {
  const body = c.text.slice(0, 6000); // keep token cost bounded
  return `Goal the sender cares about: more ${goal}.

SUBJECT: ${c.subject}

EMAIL BODY:
${body || "(no text content available)"}

Vocabulary:
- subject_style: ${FEATURE_VOCAB.subjectStyle.join(", ")}
- email_style: ${FEATURE_VOCAB.emailStyle.join(", ")}
- tone: ${FEATURE_VOCAB.tone.join(", ")}
- offer_type: ${FEATURE_VOCAB.offerType.join(", ")}

Return JSON with exactly these keys:
{"campaign_id":"${c.id}","subject":"${c.subject.replace(/"/g, "'")}","summary":"one sentence","topic":"","primary_cta":"","cta_count":0,"link_count":0,"word_count":0,"subject_style":"","email_style":"","tone":"","offer_type":"","story_present":true,"notes":""}`;
}

export async function extractFeatures(
  cfg: OpenAIConfig,
  c: Campaign,
  goal: Goal,
): Promise<CampaignFeatures> {
  const raw = await chat(
    cfg,
    [
      { role: "system", content: EXTRACT_SYSTEM },
      { role: "user", content: extractPrompt(c, goal) },
    ],
    { json: true, temperature: 0.2 },
  );
  const fallback: CampaignFeatures = {
    campaign_id: String(c.id),
    subject: c.subject,
    summary: "",
    topic: "",
    primary_cta: "",
    cta_count: 0,
    link_count: 0,
    word_count: c.text ? c.text.split(/\s+/).length : 0,
    subject_style: "",
    email_style: "",
    tone: "",
    offer_type: "",
    story_present: false,
    notes: "",
  };
  return parseJson<CampaignFeatures>(raw, fallback);
}

/** Extract features for all campaigns with bounded concurrency. */
export async function extractFeaturesForAll(
  cfg: OpenAIConfig,
  campaigns: Campaign[],
  goal: Goal,
  concurrency = 4,
): Promise<CampaignFeatures[]> {
  const out: CampaignFeatures[] = new Array(campaigns.length);
  let i = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, campaigns.length) },
    async () => {
      while (i < campaigns.length) {
        const idx = i++;
        out[idx] = await extractFeatures(cfg, campaigns[idx], goal);
      }
    },
  );
  await Promise.all(workers);
  return out;
}

// ── Call 2: evidence-first report ────────────────────────────────────────────

const REPORT_SYSTEM = `You are an evidence-first marketing analyst.

${ANALYST_PERSONA}

Your job: help a creator discover the REPEATABLE behaviors behind their best-performing Kit broadcasts, then tell them what to repeat, stop, and test.

Non-negotiable rules:
- Every signal MUST cite specific evidence from the campaigns provided (e.g. "4 of the top 5 used a personal-story opening; only 1 of the bottom 5 did"). No evidence, no signal.
- Reason in this order: (1) the sender's stated goal, (2) the performance data, (3) the content features, (4) the sender's context, (5) curated principles.
- Connect to a marketing principle ONLY after the evidence, and never as proof. Use "this is consistent with…" or "this resembles…".
- Open rates are imperfect (privacy changes). Correlation is not causation. Frame every recommendation as an experiment.
- Be concrete and specific. No advice that could apply to any email list.

${PRINCIPLES}

Return ONLY JSON in the exact shape requested.`;

function summarizeForReport(
  campaigns: Campaign[],
  features: CampaignFeatures[],
): string {
  const byId = new Map(features.map((f) => [String(f.campaign_id), f]));
  return campaigns
    .map((c) => {
      const f = byId.get(String(c.id));
      return `#${c.id} "${c.subject}" | score ${c.score} | opens ${c.stats.open_rate}% | clicks ${c.stats.click_rate}% | unsubs ${c.stats.unsubscribes} (${c.stats.unsubscribe_rate}%) | recipients ${c.stats.recipients}${
        c.revenue != null ? ` | revenue ${c.revenue}` : ""
      }\n   features: style=${f?.email_style}, subject=${f?.subject_style}, tone=${f?.tone}, story=${f?.story_present}, CTAs=${f?.cta_count}, links=${f?.link_count}, offer=${f?.offer_type}, words=${f?.word_count}`;
    })
    .join("\n");
}

export interface ReportInput {
  goal: Goal;
  goalOther?: string;
  scoreMethod: string;
  businessModel: string;
  context: { accomplishing?: string; surprised?: string; working?: string };
  campaigns: Campaign[];
  features: CampaignFeatures[];
  top: Campaign[];
  bottom: Campaign[];
  revenueAvailable: boolean;
}

export async function generateReport(
  cfg: OpenAIConfig,
  input: ReportInput,
): Promise<ReportData> {
  const topIds = input.top.map((c) => `#${c.id}`).join(", ");
  const bottomIds = input.bottom.map((c) => `#${c.id}`).join(", ");

  const user = `SENDER GOAL: more ${input.goal}${
    input.goalOther ? ` — "${input.goalOther}"` : ""
  } (scored by ${input.scoreMethod})
BUSINESS MODEL: ${input.businessModel}
WHAT THEY'RE TRYING TO ACCOMPLISH: ${input.context.accomplishing || "(not provided)"}
A CAMPAIGN THAT SURPRISED THEM: ${input.context.surprised || "(not provided)"}
WHAT THEY THINK IS WORKING: ${input.context.working || "(not provided)"}
REVENUE DATA AVAILABLE: ${input.revenueAvailable ? "yes" : "no — do not claim revenue findings"}

TOP PERFORMERS: ${topIds}
BOTTOM PERFORMERS: ${bottomIds}

ALL CAMPAIGNS (ranked best to worst by the goal):
${summarizeForReport(input.campaigns, input.features)}

Produce the analysis as JSON with exactly these keys:
{
  "executive_summary": ["3-5 punchy bullets, the strongest findings first"],
  "success_goal": "restate what they're optimizing for, in one sentence",
  "signals": [
    {
      "name": "short signal name, e.g. 'Story-first emails drive more clicks'",
      "evidence": ["specific, quantified evidence from the campaigns above"],
      "why_it_matters": "plain language",
      "related_principle": "name the principle + 'this is consistent with…' framing",
      "recommended_experiment": "one concrete test",
      "confidence": "High | Medium | Low",
      "confidence_reason": "why that confidence given the sample size and effect"
    }
  ],
  "what_to_repeat": ["evidence-backed actions to keep doing"],
  "what_to_stop": ["evidence-backed actions to reduce or stop"],
  "experiments": [
    {"experiment": "", "why": "", "how_to_measure": "", "success_looks_like": ""}
  ],
  "data_limitations": ["be transparent about what this analysis can and can't tell them"]
}

Provide 3-5 signals and exactly 3 experiments.`;

  const raw = await chat(
    cfg,
    [
      { role: "system", content: REPORT_SYSTEM },
      { role: "user", content: user },
    ],
    { json: true, temperature: 0.55 },
  );

  const fallback: ReportData = {
    executive_summary: [],
    success_goal: `More ${input.goal}`,
    signals: [],
    what_to_repeat: [],
    what_to_stop: [],
    experiments: [],
    data_limitations: [
      "The analysis couldn't be fully generated. Please try running it again.",
    ],
  };
  return parseJson<ReportData>(raw, fallback);
}

// Re-export for the analyze route's convenience.
export { htmlToText };
