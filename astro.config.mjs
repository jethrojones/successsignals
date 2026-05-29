import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";

// SSR on Cloudflare Workers. API routes (Kit / OpenAI / Resend) run server-side
// so the only secret the browser ever sends is the visitor's own Kit key.
export default defineConfig({
  site: "https://successsignals.optimizationdoc.com",
  output: "server",
  adapter: cloudflare({
    platformProxy: { enabled: true },
  }),
  devToolbar: { enabled: false },
});
