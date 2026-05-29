// Kit V4 API client for the VISITOR's account.
//
// The visitor's API key is passed in per-call and never persisted. All requests
// run server-side. API keys are limited to 120 requests / 60s, so we cap the
// concurrency of the per-broadcast stats fan-out.

import type { Account, KitBroadcast, KitBroadcastStats } from "./types";
import { KitApiError } from "./errors";

const DEFAULT_BASE = "https://api.kit.com/v4";

export class KitClient {
  private apiKey: string;
  private base: string;

  constructor(apiKey: string, baseUrl: string = DEFAULT_BASE) {
    this.apiKey = apiKey.trim();
    this.base = baseUrl.replace(/\/$/, "");
  }

  private async get<T>(path: string): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${this.base}${path}`, {
        headers: {
          "X-Kit-Api-Key": this.apiKey,
          Accept: "application/json",
        },
      });
    } catch {
      throw new KitApiError("network", "Couldn't reach Kit.");
    }

    if (res.status === 401) {
      throw new KitApiError("auth", "Kit didn't recognize that API key.");
    }
    if (res.status === 429) {
      throw new KitApiError("rate_limit", "Kit is rate-limiting the request.");
    }
    if (!res.ok) {
      throw new KitApiError(
        "unknown",
        `Kit returned ${res.status} for ${path}.`,
      );
    }
    return (await res.json()) as T;
  }

  /** Verify the key works and return basic account info. */
  async getAccount(): Promise<Account> {
    const data = await this.get<{ account: Account }>("/account");
    return data.account;
  }

  /**
   * Fetch the most recent SENT broadcasts, newest first.
   * The list endpoint usually includes full content; we fall back to a
   * per-broadcast fetch only when content is missing.
   */
  async getRecentSentBroadcasts(limit: number): Promise<KitBroadcast[]> {
    // Over-fetch so drafts don't eat into the requested count.
    const perPage = Math.min(1000, Math.max(limit * 3, 50));
    const data = await this.get<{ broadcasts: KitBroadcast[] }>(
      `/broadcasts?per_page=${perPage}`,
    );

    const sent = (data.broadcasts ?? [])
      .filter((b) => b.status === "completed" && b.send_at)
      .sort((a, b) => (b.send_at! > a.send_at! ? 1 : -1))
      .slice(0, limit);

    // Backfill any missing content.
    await Promise.all(
      sent.map(async (b) => {
        if (!b.content) {
          try {
            const one = await this.get<{ broadcast: KitBroadcast }>(
              `/broadcasts/${b.id}`,
            );
            b.content = one.broadcast?.content ?? "";
          } catch {
            b.content = "";
          }
        }
      }),
    );

    return sent;
  }

  async getStats(broadcastId: number): Promise<KitBroadcastStats> {
    const data = await this.get<{ broadcast: { stats: KitBroadcastStats } }>(
      `/broadcasts/${broadcastId}/stats`,
    );
    return data.broadcast.stats;
  }

  /** Fetch stats for many broadcasts with bounded concurrency (rate limits). */
  async getStatsForAll(
    ids: number[],
    concurrency = 5,
  ): Promise<Map<number, KitBroadcastStats>> {
    const out = new Map<number, KitBroadcastStats>();
    const queue = [...ids];
    const workers = Array.from({ length: Math.min(concurrency, ids.length) }, async () => {
      while (queue.length) {
        const id = queue.shift()!;
        try {
          out.set(id, await this.getStats(id));
        } catch {
          // Skip stats we can't retrieve; the campaign is dropped downstream.
        }
      }
    });
    await Promise.all(workers);
    return out;
  }
}

/** Strip HTML to plain text for word counts and AI analysis. */
export function htmlToText(html: string): string {
  return (html || "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<\/(p|div|br|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}
