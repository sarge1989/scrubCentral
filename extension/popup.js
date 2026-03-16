const modeSimpleBtn = document.getElementById("modeSimple");
const modeLlmBtn = document.getElementById("modeLlm");
const readingLevelGroup = document.getElementById("readingLevelGroup");
const readingLevelSelect = document.getElementById("readingLevel");
const customInstructionInput = document.getElementById("customInstruction");
const transformBtn = document.getElementById("transformBtn");
const btnText = document.getElementById("btnText");
const errorContainer = document.getElementById("errorContainer");
const errorMessage = document.getElementById("errorMessage");
const urlInfo = document.getElementById("urlInfo");
const formView = document.getElementById("formView");
const successView = document.getElementById("successView");
const successSub = document.getElementById("successSub");
const viewDiffBtn = document.getElementById("viewDiffBtn");
const openOriginalBtn = document.getElementById("openOriginalBtn");
const undoBtn = document.getElementById("undoBtn");

let mode = "simple";
let currentUrl = "";
let currentTabId = null;
let highlightsOn = false;

// Show current tab URL
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0];
  if (tab?.url) {
    currentUrl = tab.url;
    currentTabId = tab.id;
    urlInfo.textContent = tab.url;
    if (!tab.url.includes("cpf.gov.sg")) {
      urlInfo.classList.add("not-cpf");
      urlInfo.textContent =
        "Not a CPF page — extension may not work as expected";
    }
  } else {
    urlInfo.textContent = "Unable to read tab URL";
  }
});

// Mode toggle
modeSimpleBtn.addEventListener("click", () => {
  mode = "simple";
  modeSimpleBtn.classList.add("active");
  modeLlmBtn.classList.remove("active");
  readingLevelGroup.classList.remove("disabled");
});

modeLlmBtn.addEventListener("click", () => {
  mode = "llm";
  modeLlmBtn.classList.add("active");
  modeSimpleBtn.classList.remove("active");
  readingLevelGroup.classList.add("disabled");
});

function showError(msg) {
  errorMessage.textContent = msg;
  errorContainer.style.display = "block";
}

function clearError() {
  errorContainer.style.display = "none";
}

function setLoading(loading) {
  transformBtn.disabled = loading;
  if (loading) {
    btnText.innerHTML = `
      <svg class="spinner" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2.5"
          stroke-dasharray="31.4 31.4" stroke-linecap="round"/>
      </svg>
      Transforming…`;
  } else {
    btnText.textContent = "Transform this page";
  }
}

function showSuccess(nodeCount) {
  formView.style.display = "none";
  successView.classList.add("visible");
  successSub.textContent = `${nodeCount} text block${nodeCount === 1 ? "" : "s"} rewritten`;
}

/** Content script: extract text nodes from the live DOM. */
function extractTextNodesFromDOM() {
  const SKIP = new Set([
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
  // Angular/React framework artifacts that appear as text nodes
  const FRAMEWORK_JUNK = new Set(["false", "true", "null", "undefined", "NaN"]);
  const nodes = [];
  let nextId = 0;
  function walk(el) {
    if (SKIP.has(el.tagName)) return;
    for (const child of el.childNodes) {
      if (child.nodeType === 3) {
        const text = child.textContent.trim();
        if (text.length > 0 && !FRAMEWORK_JUNK.has(text))
          nodes.push({ id: nextId++, text });
      } else if (child.nodeType === 1) walk(child);
    }
  }
  walk(document.documentElement);
  return nodes;
}

/** Content script: replace text nodes in the live DOM. Wraps changed nodes in spans for highlighting. Saves originals for undo. */
function applyTransformedNodes(nodeMap) {
  const SKIP = new Set([
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
  const FRAMEWORK_JUNK = new Set(["false", "true", "null", "undefined", "NaN"]);
  const originals = {};
  let nextId = 0;
  function walk(el) {
    if (SKIP.has(el.tagName)) return;
    const children = Array.from(el.childNodes);
    for (const child of children) {
      if (child.nodeType === 3) {
        const text = child.textContent.trim();
        if (text.length > 0 && !FRAMEWORK_JUNK.has(text)) {
          const id = nextId++;
          if (nodeMap[id] !== undefined) {
            const raw = child.textContent;
            originals[id] = raw;
            const leading = (raw.match(/^\s*/) || [""])[0];
            const trailing = (raw.match(/\s*$/) || [""])[0];
            const span = document.createElement("span");
            span.className = "scrubcentral-changed";
            span.dataset.scrubcentralOriginal = raw;
            span.textContent = leading + nodeMap[id] + trailing;
            child.parentNode.replaceChild(span, child);
          }
        }
      } else if (child.nodeType === 1) walk(child);
    }
  }
  walk(document.documentElement);
  window.__scrubcentralOriginals = originals;
}

/** Content script: toggle word-level diff highlights on changed nodes. */
function toggleHighlights(on) {
  const STYLE_ID = "scrubcentral-highlight-style";
  let style = document.getElementById(STYLE_ID);

  // Word-level diff using LCS — inline so it's available in the content script context
  function wordDiff(oldText, newText) {
    const oldWords = oldText.split(/(\s+)/);
    const newWords = newText.split(/(\s+)/);
    const m = oldWords.length,
      n = newWords.length;
    const dp = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] =
          oldWords[i - 1] === newWords[j - 1]
            ? dp[i - 1][j - 1] + 1
            : Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
    const ops = [];
    let i = m,
      j = n;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
        ops.push({ type: "eq", text: oldWords[i - 1] });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        ops.push({ type: "ins", text: newWords[j - 1] });
        j--;
      } else {
        ops.push({ type: "del", text: oldWords[i - 1] });
        i--;
      }
    }
    ops.reverse();
    const esc = (s) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return ops
      .map((op) => {
        if (op.type === "eq") return esc(op.text);
        if (op.type === "ins")
          return `<span class="scrubcentral-hi">${esc(op.text)}</span>`;
        return `<span class="scrubcentral-del">${esc(op.text)}</span>`;
      })
      .join("");
  }

  if (on) {
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent =
        ".scrubcentral-hi { background-color: #fef9c3 !important; border-radius: 2px; padding: 0 1px; }" +
        ".scrubcentral-del { background-color: #fee2e2 !important; text-decoration: line-through; border-radius: 2px; padding: 0 1px; font-size: 0.85em; opacity: 0.7; }";
      document.head.appendChild(style);
    }
    for (const span of document.querySelectorAll("span.scrubcentral-changed")) {
      if (span.dataset.scrubcentralDiffed) continue;
      const original = (span.dataset.scrubcentralOriginal || "").trim();
      const transformed = span.textContent.trim();
      if (original === transformed) continue;
      const leading = (span.textContent.match(/^\s*/) || [""])[0];
      const trailing = (span.textContent.match(/\s*$/) || [""])[0];
      span.dataset.scrubcentralPlain = span.textContent;
      span.innerHTML = leading + wordDiff(original, transformed) + trailing;
      span.dataset.scrubcentralDiffed = "1";
    }
  } else {
    if (style) style.remove();
    for (const span of document.querySelectorAll(
      "span.scrubcentral-changed[data-scrubcentral-diffed]",
    )) {
      span.textContent = span.dataset.scrubcentralPlain;
      delete span.dataset.scrubcentralDiffed;
      delete span.dataset.scrubcentralPlain;
    }
  }
}

/** Content script: undo transformation. Unwraps spans back to original text nodes. */
function restoreOriginalNodes() {
  const style = document.getElementById("scrubcentral-highlight-style");
  if (style) style.remove();
  for (const span of document.querySelectorAll("span.scrubcentral-changed")) {
    const textNode = document.createTextNode(
      span.dataset.scrubcentralOriginal || span.textContent,
    );
    span.parentNode.replaceChild(textNode, span);
  }
  delete window.__scrubcentralOriginals;
}

// Transform
transformBtn.addEventListener("click", async () => {
  clearError();

  if (!currentUrl || !currentTabId) {
    showError("No URL detected for this tab.");
    return;
  }

  setLoading(true);

  try {
    // 1. Extract text nodes from the live DOM
    let textNodes;
    try {
      const extractResult = await chrome.scripting.executeScript({
        target: { tabId: currentTabId },
        func: extractTextNodesFromDOM,
      });
      textNodes = extractResult?.[0]?.result;
    } catch (scriptErr) {
      showError(
        "Cannot access this page. Try refreshing or navigate to a CPF page.",
      );
      setLoading(false);
      return;
    }

    if (!textNodes || textNodes.length === 0) {
      showError("No text content found on the page.");
      setLoading(false);
      return;
    }

    // 2. Send text nodes to API for transformation
    const payload = { textNodes, url: currentUrl, mode };
    if (mode === "simple") payload.readingLevel = readingLevelSelect.value;
    const customInstr = customInstructionInput.value.trim();
    if (customInstr) payload.customInstruction = customInstr;

    const res = await fetch(`${API_BASE_URL}/api/transform-nodes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      showError(data.error || `Request failed (${res.status})`);
      setLoading(false);
      return;
    }

    // 3. Apply transforms to the live DOM
    const nodeMap = {};
    for (const node of data.nodes) {
      nodeMap[node.id] = node.text;
    }

    await chrome.scripting.executeScript({
      target: { tabId: currentTabId },
      func: applyTransformedNodes,
      args: [nodeMap],
    });

    showSuccess(data.nodes.length);
  } catch (err) {
    showError(err.message || "Network error — is the dev server running?");
  } finally {
    setLoading(false);
  }
});

// Toggle highlights on changed text
viewDiffBtn.addEventListener("click", async () => {
  highlightsOn = !highlightsOn;
  viewDiffBtn.querySelector(".btn-label").textContent = highlightsOn
    ? "Hide changes"
    : "Show changes";
  try {
    await chrome.scripting.executeScript({
      target: { tabId: currentTabId },
      func: toggleHighlights,
      args: [highlightsOn],
    });
  } catch {}
});

// Open original page in a new tab
openOriginalBtn.addEventListener("click", () => {
  if (currentUrl) chrome.tabs.create({ url: currentUrl });
});

// Undo
undoBtn.addEventListener("click", async () => {
  try {
    await chrome.scripting.executeScript({
      target: { tabId: currentTabId },
      func: restoreOriginalNodes,
    });
  } catch {
    // Tab might have been closed/navigated
  }
  successView.classList.remove("visible");
  formView.style.display = "flex";
  highlightsOn = false;
  viewDiffBtn.querySelector(".btn-label").textContent = "Show changes";
});
