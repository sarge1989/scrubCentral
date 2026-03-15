import { Hono } from "hono";
import { createRequestHandler } from "react-router";
import { extractTextNodes, transformText, reassembleHtml, takeScreenshot } from "./lib/transform";

const app = new Hono<{ Bindings: Env }>();

app.post("/api/transform", async (c) => {
  const body = await c.req.json<{
    url: string;
    mode: "simple" | "llm";
    readingLevel?: "primary" | "secondary" | "adult";
    customInstruction?: string;
  }>();

  // Validate input
  if (!body.url || !body.mode) {
    return c.json({ error: "url and mode are required" }, 400);
  }
  if (body.mode !== "simple" && body.mode !== "llm") {
    return c.json({ error: "mode must be 'simple' or 'llm'" }, 400);
  }

  let url: URL;
  try {
    url = new URL(body.url);
  } catch {
    return c.json({ error: "Invalid URL format" }, 400);
  }

  // Check KV cache
  const cacheKey = `transform:${url.toString()}:${body.mode}:${body.readingLevel || ""}:${body.customInstruction || ""}`;
  const cached = await c.env.SCRUBCENTRAL_KV.get(cacheKey, "json") as {
    originalHtml: string;
    transformedHtml: string;
  } | null;
  if (cached) {
    console.log("[api] cache hit for:", cacheKey);
    return c.json(cached);
  }
  console.log("[api] cache miss, processing:", url.toString());

  // Fetch the target URL
  let originalHtml: string;
  try {
    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      return c.json(
        { error: `Failed to fetch URL: ${response.status} ${response.statusText}` },
        502
      );
    }

    originalHtml = await response.text();
    console.log("[api] fetched page, length:", originalHtml.length);
  } catch (err) {
    return c.json(
      { error: `Failed to fetch URL: ${err instanceof Error ? err.message : "Unknown error"}` },
      502
    );
  }

  // Extract text nodes
  const { textNodes, skeleton } = extractTextNodes(originalHtml);

  if (textNodes.length === 0) {
    return c.json({ error: "No text content found on the page" }, 422);
  }

  // Transform via LLM (with full-page screenshot for visual context)
  try {
    console.log("[api] extracted %d text nodes, taking screenshot...", textNodes.length);
    const screenshotCdnUrl = await takeScreenshot(url.toString(), c.env.SCREENSHOTONE_ACCESS_KEY);

    console.log("[api] calling GPT...");
    const transformedNodes = await transformText(
      textNodes,
      body.mode,
      c.env.OPENAI_API_KEY,
      screenshotCdnUrl,
      body.readingLevel,
      body.customInstruction
    );

    const transformedHtml = reassembleHtml(skeleton, transformedNodes);
    console.log("[api] done, transformed HTML length:", transformedHtml.length);

    // Inject <base> tag so relative URLs (CSS, fonts, images) resolve against the original domain
    const baseTag = `<base href="${url.origin}/">`;
    const injectBase = (html: string) =>
      html.includes("<base ") ? html : html.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`);

    const result = {
      originalHtml: injectBase(originalHtml),
      transformedHtml: injectBase(transformedHtml),
    };
    c.executionCtx.waitUntil(
      c.env.SCRUBCENTRAL_KV.put(cacheKey, JSON.stringify(result), { expirationTtl: 604800 })
    );
    return c.json(result);
  } catch (err) {
    console.error("Transform error:", err);
    return c.json(
      {
        error: `LLM transformation failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      },
      500
    );
  }
});

app.get("*", (c) => {
  const requestHandler = createRequestHandler(
    () => import("virtual:react-router/server-build"),
    import.meta.env.MODE
  );

  return requestHandler(c.req.raw, {
    cloudflare: { env: c.env, ctx: c.executionCtx },
  });
});

export default app;
