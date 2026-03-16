import { parse, type HTMLElement } from "node-html-parser";
import OpenAI from "openai";

export interface TextNode {
  id: number;
  text: string;
}

const SKIP_TAGS = new Set([
  "NAV",
  "HEADER",
  "FOOTER",
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "SVG",
  "IMG",
  "VIDEO",
  "AUDIO",
  "IFRAME",
  "FORM",
  "INPUT",
  "SELECT",
  "TEXTAREA",
  "BUTTON",
  "CANVAS",
]);

const CONTENT_TAGS = new Set([
  "MAIN",
  "ARTICLE",
  "SECTION",
  "DIV",
  "P",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "LI",
  "TD",
  "TH",
  "BLOCKQUOTE",
  "FIGCAPTION",
  "SPAN",
  "A",
  "STRONG",
  "EM",
  "B",
  "I",
  "U",
  "SMALL",
  "DT",
  "DD",
  "LABEL",
  "SUMMARY",
]);

const PLACEHOLDER_PREFIX = "___SCRUB_NODE_";
const PLACEHOLDER_SUFFIX = "___";

function makePlaceholder(id: number): string {
  return `${PLACEHOLDER_PREFIX}${id}${PLACEHOLDER_SUFFIX}`;
}

/**
 * Walk the DOM tree and extract text nodes, replacing them with placeholders.
 * Returns the list of text nodes and the modified HTML skeleton.
 */
export function extractTextNodes(html: string): {
  textNodes: TextNode[];
  skeleton: string;
} {
  const root = parse(html);
  const textNodes: TextNode[] = [];
  let nextId = 0;

  function walk(node: HTMLElement) {
    if (SKIP_TAGS.has(node.tagName)) return;

    for (const child of node.childNodes) {
      if (child.nodeType === 3) {
        // Text node
        const rawText: string = child.text;
        const text = rawText.trim();
        if (text.length > 0) {
          const id = nextId++;
          textNodes.push({ id, text });
          // Preserve leading/trailing whitespace around the placeholder
          const leading = rawText.match(/^\s*/)?.[0] || "";
          const trailing = rawText.match(/\s*$/)?.[0] || "";
          (child as any).rawText = leading + makePlaceholder(id) + trailing;
        }
      } else if (child.nodeType === 1) {
        // Element node
        walk(child as HTMLElement);
      }
    }
  }

  walk(root);
  return { textNodes, skeleton: root.toString() };
}

/**
 * Reassemble the HTML by replacing placeholders with transformed text.
 */
export function reassembleHtml(
  skeleton: string,
  transformedNodes: Map<number, string>
): string {
  let result = skeleton;
  for (const [id, text] of transformedNodes) {
    result = result.replace(makePlaceholder(id), text);
  }
  return result;
}

type Mode = "simple" | "llm";
type ReadingLevel = "primary" | "secondary" | "adult";

const CONTEXT_PREAMBLE = `The content is from a Singapore Government website. The audience is Singapore residents and citizens. Assume familiarity with Singapore-specific context: Singpass, NRIC, HDB, CPF, MediShield Life, WorkFare, Pioneer/Merdeka Generation, GovTech services, etc. Do not explain these terms unless the reading level demands it.`;

function buildSystemPrompt(
  mode: Mode,
  readingLevel?: ReadingLevel,
  customInstruction?: string
): string {
  let prompt: string;

  if (mode === "simple") {
    const levelDesc: Record<ReadingLevel, string> = {
      primary:
        "a primary school student (age 7-12). Use very simple words and short sentences. Explain technical government terms but keep Singapore-specific references (Singpass, HDB, CPF, etc.) as-is.",
      secondary:
        "a secondary school student (age 13-16). Use straightforward language. Briefly explain technical government terms.",
      adult:
        "a general adult audience. Use clear, plain English. Avoid jargon where possible.",
    };
    const level = readingLevel || "adult";
    prompt = `You are a text simplification engine. ${CONTEXT_PREAMBLE}

Rewrite the provided text for ${levelDesc[level]}

Rules:
- Preserve the original meaning completely
- Keep it concise — do not add information that wasn't in the original
- Maintain the same tone (informational, instructional, etc.)
- Keep proper nouns, names, acronyms, and Singapore-specific terms unchanged
- Do not add any commentary or explanation about what you changed`;
  } else {
    prompt = `You are a text optimization engine that rewrites content for consumption by large language models (LLMs). ${CONTEXT_PREAMBLE}

Rules:
- Make references explicit (replace pronouns with their referents where ambiguous)
- Use unambiguous, precise language
- Add structural markers (e.g., "Step 1:", "Condition:", "Exception:")
- Make implicit context explicit — expand agency-specific abbreviations on first use
- Remove filler words and redundant phrases
- Keep all factual content intact
- Do not add information that wasn't in the original
- Do not add any commentary or explanation about what you changed`;
  }

  if (customInstruction) {
    prompt += `\n\nAdditional instruction from the user: ${customInstruction}`;
  }

  return prompt;
}

/**
 * Take a screenshot via ScreenshotOne, fetch the image, and return as a base64 data URL.
 */
export async function takeScreenshot(
  targetUrl: string,
  accessKey: string
): Promise<string> {
  const params = new URLSearchParams({
    access_key: accessKey,
    url: targetUrl,
    full_page: "true",
    viewport_width: "1280",
    format: "jpeg",
    image_quality: "80",
    block_ads: "true",
    block_cookie_banners: "true",
    delay: "2",
  });

  const apiUrl = `https://api.screenshotone.com/take?${params.toString()}`;
  console.log("[screenshot] requesting:", apiUrl.replace(accessKey, "***"));

  const res = await fetch(apiUrl);
  if (!res.ok) {
    const body = await res.text();
    console.error("[screenshot] failed:", res.status, body);
    throw new Error(`Screenshot failed: ${res.status} ${res.statusText}`);
  }

  const buffer = await res.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  console.log("[screenshot] fetched, size: %d bytes, base64 length: %d", buffer.byteLength, base64.length);

  return `data:image/jpeg;base64,${base64}`;
}

/**
 * Send all text nodes to GPT in a single call.
 * Optionally includes a screenshot for visual context (skipped for extension requests).
 * Returns a map of node ID → transformed text.
 */
export async function transformText(
  textNodes: TextNode[],
  mode: Mode,
  apiKey: string,
  screenshotDataUrl?: string,
  readingLevel?: ReadingLevel,
  customInstruction?: string
): Promise<Map<number, string>> {
  if (textNodes.length === 0) return new Map();

  const client = new OpenAI({ apiKey });
  const systemPrompt = buildSystemPrompt(mode, readingLevel, customInstruction);

  console.log("[transform] sending %d text nodes to GPT%s", textNodes.length, screenshotDataUrl ? " with screenshot" : " (text-only)");

  const userMessage = textNodes
    .map((n) => `[${n.id}] ${n.text}`)
    .join("\n");

  const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];
  if (screenshotDataUrl) {
    userContent.push({
      type: "image_url",
      image_url: { url: screenshotDataUrl },
    });
    userContent.push({
      type: "text",
      text: `The image above is a full-page screenshot of the source webpage. Use it to understand the page's visual structure and context.\n\nBelow are numbered text blocks extracted from this page, in reading order. Rewrite each one. Return every block with its original ID.\n\n${userMessage}`,
    });
  } else {
    userContent.push({
      type: "text",
      text: `Below are numbered text blocks extracted from a webpage, in reading order. Rewrite each one. Return every block with its original ID.\n\n${userMessage}`,
    });
  }

  const response = await client.chat.completions.create({
    model: "gpt-5.4",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    temperature: 0.3,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "transformed_nodes",
        strict: true,
        schema: {
          type: "object",
          properties: {
            nodes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "number" },
                  text: { type: "string" },
                },
                required: ["id", "text"],
                additionalProperties: false,
              },
            },
          },
          required: ["nodes"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content || "{}";
  const finishReason = response.choices[0]?.finish_reason;
  console.log("[transform] GPT finish_reason:", finishReason);
  console.log("[transform] response length:", content.length);

  const parsed: { nodes?: Array<{ id: number; text: string }> } = JSON.parse(content);
  const results = new Map<number, string>();

  if (parsed.nodes) {
    console.log("[transform] received %d nodes back", parsed.nodes.length);
    for (const node of parsed.nodes) {
      results.set(node.id, node.text);
    }
  }

  // Fill in any nodes the LLM didn't return (keep original)
  let fallbackCount = 0;
  for (const node of textNodes) {
    if (!results.has(node.id)) {
      results.set(node.id, node.text);
      fallbackCount++;
    }
  }
  if (fallbackCount > 0) {
    console.log("[transform] %d nodes fell back to original text", fallbackCount);
  }

  return results;
}
