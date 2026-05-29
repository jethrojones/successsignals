// Email the finished report via Resend. Best-effort: a delivery failure must
// never break the on-screen analysis, so callers ignore a false return.

const RESEND_URL = "https://api.resend.com/emails";

// Verified sender for optimizationdoc.com. Adjust if the domain's from-address differs.
const FROM = "Success Signal Analysis <signals@optimizationdoc.com>";

interface SendArgs {
  apiKey: string;
  to: string;
  accountName: string;
  markdown: string;
  html: string;
}

export async function emailReport(args: SendArgs): Promise<boolean> {
  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${args.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [args.to],
        subject: `Your Success Signal Analysis (${args.accountName})`,
        html: args.html,
        text: args.markdown,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
