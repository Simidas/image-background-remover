// open-next.config.ts for Cloudflare Pages
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  // No incremental cache needed for simple MVP
});
