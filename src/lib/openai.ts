// OpenAI client — report generation.
//
// v1 (naive first pass): a single call that hands the model the campaign metrics
// and asks for marketing advice. This is intentionally simple — it's the starting
// point. As the demo story documents, this version produced generic, could-apply-
// to-anyone advice, which motivated the evidence-first redesign that follows.

import type { Campaign, Goal } from "./types";
import { OpenAIError } from "./errors";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

interface OpenAIConfig {
  apiKey: string;
  model: string;
}

async function chat(
  cfg: OpenAIConfig,
  messages: Array<{ role: string; content: string }>,
): Promise<string> {
  let res: Response;
  try {
    res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: cfg.model, messages, temperature: 0.6 }),
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

/** v1: metrics in, advice out. One call, no campaign content, no evidence. */
export async function generateReport(
  cfg: OpenAIConfig,
  campaigns: Campaign[],
  goal: Goal,
): Promise<string> {
  const table = campaigns
    .map(
      (c) =>
        `- "${c.subject}" — opens ${c.stats.open_rate}%, clicks ${c.stats.click_rate}%, unsubs ${c.stats.unsubscribes}`,
    )
    .join("\n");

  return chat(cfg, [
    {
      role: "system",
      content: "You are an email marketing expert. Give helpful advice.",
    },
    {
      role: "user",
      content: `My goal is more ${goal}. Here are my recent campaigns:\n${table}\n\nWhat should I do to improve?`,
    },
  ]);
}
