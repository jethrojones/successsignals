// User-facing error handling.
//
// Messages follow the error-writing rubric: say what happened and why, no blame,
// no jargon, always a reassurance + a way out. Never "Something went wrong."

export type KitErrorKind =
  | "auth"
  | "rate_limit"
  | "network"
  | "no_broadcasts"
  | "too_few"
  | "unknown";

export class KitApiError extends Error {
  kind: KitErrorKind;
  constructor(kind: KitErrorKind, message: string) {
    super(message);
    this.kind = kind;
    this.name = "KitApiError";
  }
}

export class OpenAIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenAIError";
  }
}

export interface FriendlyError {
  /** Short title shown in the UI. */
  title: string;
  /** One or two sentences: what + why + a way out. */
  detail: string;
}

/** Map any thrown error to a calm, actionable message for the visitor. */
export function toFriendlyError(err: unknown): FriendlyError {
  if (err instanceof KitApiError) {
    switch (err.kind) {
      case "auth":
        return {
          title: "That Kit API key didn't work",
          detail:
            "Kit didn't recognize the key. Double-check you copied the full V4 key from Kit → Settings → Developer, then paste it again. Nothing was saved on our end.",
        };
      case "rate_limit":
        return {
          title: "Kit is asking us to slow down",
          detail:
            "Your account hit Kit's request limit for the moment. Wait about a minute and run the analysis again — no data was lost.",
        };
      case "network":
        return {
          title: "We couldn't reach Kit",
          detail:
            "The connection to Kit didn't go through. This is usually momentary — try again in a few seconds.",
        };
      case "no_broadcasts":
        return {
          title: "No sent broadcasts found",
          detail:
            "This Kit account doesn't have any sent broadcasts yet, so there's nothing to analyze. Once you've sent a few campaigns, come back and we'll find the patterns.",
        };
      case "too_few":
        return {
          title: "Not many broadcasts to work with",
          detail:
            "We found fewer than five sent broadcasts. We'll still generate an analysis, but treat it as a starting hypothesis — the patterns get much stronger with more campaigns.",
        };
      default:
        return {
          title: "Kit had trouble with that request",
          detail:
            "Kit returned an unexpected response. Give it another try in a moment; if it keeps happening, your Kit plan may not expose the broadcast endpoints.",
        };
    }
  }

  if (err instanceof OpenAIError) {
    return {
      title: "The analysis step hit a snag",
      detail:
        "We pulled your campaigns fine, but generating the written report failed. This is almost always temporary — try running the analysis again.",
    };
  }

  return {
    title: "That didn't go through",
    detail:
      "Something interrupted the analysis before it finished. Your Kit key wasn't stored. Please try again — if it persists, send fewer broadcasts to start.",
  };
}
