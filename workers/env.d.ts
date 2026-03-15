// Extend Env with secrets not in wrangler.jsonc vars
declare interface Env {
  OPENAI_API_KEY: string;
  SCREENSHOTONE_ACCESS_KEY: string;
  SCRUBCENTRAL_KV: KVNamespace;
}
