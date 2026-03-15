import { Hono } from "hono";
import { cors } from "hono/cors";
import { createRequestHandler } from "react-router";
import { extractTextNodes, transformText, reassembleHtml, takeScreenshot } from "./lib/transform";

const app = new Hono<{ Bindings: Env }>();

// CORS for extension requests
app.use("/api/*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "OPTIONS"],
  allowHeaders: ["Content-Type"],
}));

/** Generate a short hash-based result ID from the cache key. */
function resultId(cacheKey: string): string {
  let hash = 0;
  for (let i = 0; i < cacheKey.length; i++) {
    hash = ((hash << 5) - hash + cacheKey.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

app.post("/api/transform", async (c) => {
  const body = await c.req.json<{
    url: string;
    html?: string;
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

  const source = body.html ? "extension" : "url-fetch";
  console.log("[api] source:", source);

  // Check KV cache — skip when extension provides fresh rendered HTML
  const cacheKey = `transform:${url.toString()}:${body.mode}:${body.readingLevel || ""}:${body.customInstruction || ""}`;
  const rid = resultId(cacheKey);

  if (!body.html) {
    const cached = await c.env.SCRUBCENTRAL_KV.get(cacheKey, "json") as {
      originalHtml: string;
      transformedHtml: string;
    } | null;
    if (cached) {
      console.log("[api] cache hit for:", cacheKey);
      c.executionCtx.waitUntil(
        c.env.SCRUBCENTRAL_KV.put(`result:${rid}`, JSON.stringify(cached), { expirationTtl: 604800 })
      );
      return c.json({ ...cached, resultId: rid });
    }
  }
  console.log("[api] %s, processing:", body.html ? "extension HTML provided (skipping cache)" : "cache miss", url.toString());

  // Get HTML — either from extension payload or by fetching
  let originalHtml: string;
  if (body.html) {
    originalHtml = body.html;
    console.log("[api] original HTML length:", originalHtml.length);
  } else {
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
  }

  // Extract text nodes
  const { textNodes, skeleton } = extractTextNodes(originalHtml);
  console.log("[api] text nodes extracted:", textNodes.length);

  if (textNodes.length === 0) {
    return c.json({ error: "No text content found on the page" }, 422);
  }

  // Transform via LLM — skip screenshot when extension provides rendered HTML
  try {
    let screenshotDataUrl: string | undefined;
    if (!body.html) {
      console.log("[api] taking screenshot...");
      screenshotDataUrl = await takeScreenshot(url.toString(), c.env.SCREENSHOTONE_ACCESS_KEY);
    } else {
      console.log("[api] skipping screenshot (extension provided rendered HTML)");
    }

    console.log("[api] calling GPT...");
    const transformedNodes = await transformText(
      textNodes,
      body.mode,
      c.env.OPENAI_API_KEY,
      screenshotDataUrl,
      body.readingLevel,
      body.customInstruction
    );

    const transformedHtml = reassembleHtml(skeleton, transformedNodes);
    console.log("[api] done, transformed HTML length:", transformedHtml.length);

    // Log sample transformed node
    if (textNodes.length > 0) {
      const sampleId = textNodes[0].id;
      console.log("[api] sample transformed node — before: %s | after: %s",
        textNodes[0].text.substring(0, 80),
        (transformedNodes.get(sampleId) || "").substring(0, 80)
      );
    }

    // Inject <base> tag so relative URLs (CSS, fonts, images) resolve against the original domain
    const baseTag = `<base href="${url.origin}/">`;
    const injectBase = (html: string) =>
      html.includes("<base ") ? html : html.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`);

    const result = {
      originalHtml: injectBase(originalHtml),
      transformedHtml: injectBase(transformedHtml),
    };

    // Cache by both cache key and result ID
    c.executionCtx.waitUntil(Promise.all([
      c.env.SCRUBCENTRAL_KV.put(cacheKey, JSON.stringify(result), { expirationTtl: 604800 }),
      c.env.SCRUBCENTRAL_KV.put(`result:${rid}`, JSON.stringify(result), { expirationTtl: 604800 }),
    ]));

    return c.json({ ...result, resultId: rid });
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

// Extension in-situ endpoint: accepts pre-extracted text nodes, returns transformed nodes only.
// Avoids HTML serialization round-trip entirely.
app.post("/api/transform-nodes", async (c) => {
  const body = await c.req.json<{
    url: string;
    textNodes: Array<{ id: number; text: string }>;
    mode: "simple" | "llm";
    readingLevel?: "primary" | "secondary" | "adult";
    customInstruction?: string;
  }>();

  if (!body.url || !body.mode || !body.textNodes?.length) {
    return c.json({ error: "url, mode, and textNodes are required" }, 400);
  }

  console.log("[api] transform-nodes: %d text nodes from extension", body.textNodes.length);

  try {
    const transformedNodes = await transformText(
      body.textNodes,
      body.mode,
      c.env.OPENAI_API_KEY,
      undefined,
      body.readingLevel,
      body.customInstruction
    );

    // Convert Map to array for JSON response
    const nodes: Array<{ id: number; text: string }> = [];
    for (const [id, text] of transformedNodes) {
      nodes.push({ id, text });
    }

    if (body.textNodes.length > 0) {
      const sampleId = body.textNodes[0].id;
      console.log("[api] sample node — before: %s | after: %s",
        body.textNodes[0].text.substring(0, 80),
        (transformedNodes.get(sampleId) || "").substring(0, 80)
      );
    }

    return c.json({ nodes });
  } catch (err) {
    console.error("Transform-nodes error:", err);
    return c.json(
      { error: `LLM transformation failed: ${err instanceof Error ? err.message : "Unknown error"}` },
      500
    );
  }
});

// Store pre-computed results (no processing, just KV write). Used by extension after in-situ transform.
app.post("/api/store-result", async (c) => {
  const body = await c.req.json<{
    originalHtml: string;
    transformedHtml: string;
  }>();

  if (!body.originalHtml || !body.transformedHtml) {
    return c.json({ error: "originalHtml and transformedHtml are required" }, 400);
  }

  const rid = resultId(`store:${Date.now()}:${body.originalHtml.length}`);
  await c.env.SCRUBCENTRAL_KV.put(`result:${rid}`, JSON.stringify({
    originalHtml: body.originalHtml,
    transformedHtml: body.transformedHtml,
  }), { expirationTtl: 604800 });

  return c.json({ resultId: rid });
});

app.get("/api/result/:id", async (c) => {
  const id = c.req.param("id");
  const data = await c.env.SCRUBCENTRAL_KV.get(`result:${id}`, "json") as {
    originalHtml: string;
    transformedHtml: string;
  } | null;

  if (!data) {
    return c.json({ error: "Result not found or expired" }, 404);
  }

  return c.json(data);
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
