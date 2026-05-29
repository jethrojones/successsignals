// POST /api/analyze — the orchestrator.
//
// Streams Server-Sent Events so the UI can show the six loading stages, then a
// final "done" event carrying the full AnalysisResult. The visitor's Kit key is
// used here and never persisted or logged. Email + lead capture are best-effort.

import type { APIRoute } from "astro";
import type { AnalysisResult, AnalyzeInput, Goal } from "../../lib/types";
import { KitClient } from "../../lib/kit";
import { buildCampaigns, splitPerformers, scoreMethod } from "../../lib/scoring";
import {
  extractFeaturesForAll,
  generateReport,
  type OpenAIConfig,
} from "../../lib/openai";
import { reportToMarkdown } from "../../lib/report-markdown";
import { renderReportHtml } from "../../lib/report-html";
import { emailReport } from "../../lib/resend";
import { captureLead } from "../../lib/kit-opdoc";
import { KitApiError, OpenAIError, toFriendlyError } from "../../lib/errors";

export const prerender = false;

interface Env {
  OPEN_AI_API_KEY?: string;
  RESEND_API_KEY?: string;
  OP_DOC_KIT_API_KEY?: string;
  KIT_API_BASE_URL?: string;
  DEFAULT_MODEL?: string;
}

function readEnv(locals: any): Env {
  // Cloudflare runtime env (prod + dev via platformProxy), with sensible fallbacks.
  return {
    ...(locals?.runtime?.env ?? {}),
    ...(import.meta.env ?? {}),
  } as Env;
}

const VALID_GOALS: Goal[] = [
  "opens",
  "clicks",
  "sales",
  "replies",
  "unsubscribes",
  "other",
];

function parseInput(body: any): AnalyzeInput | null {
  if (!body || typeof body !== "object") return null;
  const kitApiKey = String(body.kitApiKey ?? "").trim();
  const email = String(body.email ?? "").trim();
  const goal = VALID_GOALS.includes(body.goal) ? (body.goal as Goal) : "other";
  if (!kitApiKey || !email) return null;
  const limit = Math.min(50, Math.max(1, Math.floor(Number(body.limit)) || 20));
  return {
    kitApiKey,
    email,
    goal,
    goalOther: body.goalOther ? String(body.goalOther) : undefined,
    businessModel: String(body.businessModel ?? "Creator/newsletter"),
    context: {
      accomplishing: body.context?.accomplishing,
      surprised: body.context?.surprised,
      working: body.context?.working,
    },
    limit,
  };
}

export const POST: APIRoute = async ({ request, locals }) => {
  const env = readEnv(locals);
  const input = parseInput(await request.json().catch(() => null));

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (event: string, data: unknown) =>
        controller.enqueue(
          enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      const stage = (n: number, label: string) => send("stage", { n, label });
      const fail = (err: unknown) => {
        send("error", toFriendlyError(err));
        controller.close();
      };

      try {
        if (!input) {
          return fail(
            new KitApiError("unknown", "Missing API key or email."),
          );
        }
        if (!env.OPEN_AI_API_KEY) {
          return fail(new OpenAIError("Server is missing its OpenAI key."));
        }

        const baseUrl = env.KIT_API_BASE_URL || "https://api.kit.com/v4";
        const kit = new KitClient(input.kitApiKey, baseUrl);
        const ai: OpenAIConfig = {
          apiKey: env.OPEN_AI_API_KEY,
          model: env.DEFAULT_MODEL || "gpt-4o",
        };

        // 1. Connecting to Kit (validates the key)
        stage(1, "Connecting to Kit");
        const account = await kit.getAccount();

        // 2. Retrieving broadcasts
        stage(2, "Retrieving broadcasts");
        const broadcasts = await kit.getRecentSentBroadcasts(input.limit);
        if (broadcasts.length === 0) {
          return fail(new KitApiError("no_broadcasts", "No sent broadcasts."));
        }

        // 3. Retrieving broadcast details (content already backfilled in step 2)
        stage(3, "Retrieving broadcast details");

        // 4. Retrieving broadcast stats
        stage(4, "Retrieving broadcast stats");
        const statsById = await kit.getStatsForAll(broadcasts.map((b) => b.id));

        const campaigns = buildCampaigns(broadcasts, statsById, input.goal);
        if (campaigns.length === 0) {
          return fail(new KitApiError("no_broadcasts", "No campaigns with stats."));
        }
        const lowConfidence = campaigns.length < 5;

        // 5. Comparing winners and losers (+ feature extraction)
        stage(5, "Comparing winners and losers");
        const { top, bottom } = splitPerformers(campaigns);
        const features = await extractFeaturesForAll(ai, campaigns, input.goal);

        // 6. Generating Success Signal Analysis
        stage(6, "Generating Success Signal Analysis");
        const revenueAvailable = campaigns.some((c) => c.revenue != null);
        const report = await generateReport(ai, {
          goal: input.goal,
          goalOther: input.goalOther,
          scoreMethod: scoreMethod(input.goal),
          businessModel: input.businessModel,
          context: input.context,
          campaigns,
          features,
          top,
          bottom,
          revenueAvailable,
        });
        if (lowConfidence) {
          report.data_limitations.unshift(
            "Fewer than 5 broadcasts were analyzed, so confidence is low — treat these as early hypotheses, not conclusions.",
          );
        }

        const result: AnalysisResult = {
          account: { name: account.name },
          goal: input.goal,
          scoreMethod: scoreMethod(input.goal),
          campaigns,
          features,
          top,
          bottom,
          report,
          lowConfidence,
          revenueAvailable,
        };

        // Deliver the report first; side-effects after, never blocking the result.
        send("done", result);

        // Side-effects are isolated in their own try so a failure here can never
        // re-enter fail() and emit an error event AFTER the terminal "done".
        try {
          const markdown = reportToMarkdown(result);
          await Promise.allSettled([
            env.OP_DOC_KIT_API_KEY
              ? captureLead({
                  apiKey: env.OP_DOC_KIT_API_KEY,
                  baseUrl: baseUrl,
                  email: input.email,
                })
              : Promise.resolve(false),
            env.RESEND_API_KEY
              ? emailReport({
                  apiKey: env.RESEND_API_KEY,
                  to: input.email,
                  accountName: account.name,
                  markdown,
                  html: renderReportHtml(result),
                })
              : Promise.resolve(false),
          ]);
        } catch {
          // Report already delivered; swallow post-delivery side-effect errors.
        }

        controller.close();
      } catch (err) {
        fail(err);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
};
