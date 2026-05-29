// Lead capture into Optimization Doc's OWN Kit account.
//
// When a visitor runs an analysis, their email is upserted as a subscriber here
// (POST /v4/subscribers) so it lands in the optimizationdoc Kit list — separate
// from the visitor's own key, which only ever reads their account and is discarded.
// Best-effort: never let a capture failure break the analysis.

interface CaptureArgs {
  apiKey: string;
  baseUrl: string;
  email: string;
  /** Optional custom fields, only sent if they already exist in the account. */
  fields?: Record<string, string>;
}

export async function captureLead(args: CaptureArgs): Promise<boolean> {
  const base = args.baseUrl.replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/subscribers`, {
      method: "POST",
      headers: {
        "X-Kit-Api-Key": args.apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        email_address: args.email,
        state: "active",
        ...(args.fields ? { fields: args.fields } : {}),
      }),
    });
    // 200 (updated), 201 (created), 202 (created, fields async) all count.
    return res.status === 200 || res.status === 201 || res.status === 202;
  } catch {
    return false;
  }
}
