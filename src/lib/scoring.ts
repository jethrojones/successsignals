// Success scoring. The visitor defines success; we score every campaign on that
// single dimension so winners and losers are ranked by what THEY care about.

import type { Campaign, Goal, KitBroadcast, KitBroadcastStats } from "./types";
import { htmlToText } from "./kit";

/**
 * Compute a 0–100 success score for a campaign given the goal.
 * Higher is always better, including for unsubscribes (we invert).
 */
export function scoreCampaign(
  stats: KitBroadcastStats,
  goal: Goal,
  revenue?: number,
): number {
  switch (goal) {
    case "opens":
      return round(stats.open_rate);
    case "clicks":
      return round(stats.click_rate);
    case "replies":
      // Kit doesn't expose replies; clicks are the best engagement proxy.
      return round(stats.click_rate);
    case "unsubscribes":
      // Lower unsub rate = better. Invert onto 0–100.
      return round(Math.max(0, 100 - stats.unsubscribe_rate * 100));
    case "sales":
      if (revenue != null && stats.recipients > 0) {
        // Revenue per recipient, scaled. Falls back to clicks if no revenue.
        return round((revenue / stats.recipients) * 100);
      }
      return round(stats.click_rate);
    case "other":
    default:
      // Balanced engagement blend when the goal is unspecified.
      return round(stats.open_rate * 0.4 + stats.click_rate * 0.6);
  }
}

/** Human-readable description of how the score is computed, for the report. */
export function scoreMethod(goal: Goal): string {
  switch (goal) {
    case "opens":
      return "open rate";
    case "clicks":
      return "click rate";
    case "replies":
      return "click rate (proxy for engagement — Kit doesn't expose replies)";
    case "unsubscribes":
      return "inverse unsubscribe rate (lower unsubscribes score higher)";
    case "sales":
      return "revenue per recipient when available, otherwise click rate as a proxy";
    default:
      return "a blend of open rate and click rate";
  }
}

/** Join broadcasts with stats and score them. Drops anything missing stats. */
export function buildCampaigns(
  broadcasts: KitBroadcast[],
  statsById: Map<number, KitBroadcastStats>,
  goal: Goal,
): Campaign[] {
  const campaigns: Campaign[] = [];
  for (const b of broadcasts) {
    const stats = statsById.get(b.id);
    if (!stats || stats.recipients <= 0) continue;
    const text = htmlToText(b.content ?? "");
    campaigns.push({
      id: b.id,
      subject: b.subject ?? "(no subject)",
      sendAt: b.send_at,
      text,
      contentHtml: b.content ?? "",
      stats,
      score: scoreCampaign(stats, goal),
    });
  }
  // Best first.
  return campaigns.sort((a, b) => b.score - a.score);
}

/** Split into winners and losers. n adapts to how many campaigns we have. */
export function splitPerformers(campaigns: Campaign[]): {
  top: Campaign[];
  bottom: Campaign[];
} {
  const n = campaigns.length >= 10 ? 5 : Math.max(1, Math.floor(campaigns.length / 2));
  return {
    top: campaigns.slice(0, n),
    bottom: campaigns.slice(-n).reverse(),
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
