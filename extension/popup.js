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
const undoBtn = document.getElementById("undoBtn");

let mode = "simple";
let currentUrl = "";
let currentTabId = null;
let lastResultId = null;

// Show current tab URL
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0];
  if (tab?.url) {
    currentUrl = tab.url;
    currentTabId = tab.id;
    urlInfo.textContent = tab.url;
    if (!tab.url.includes("cpf.gov.sg")) {
      urlInfo.classList.add("not-cpf");
      urlInfo.textContent = "Not a CPF page — extension may not work as expected";
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
    "NAV", "HEADER", "FOOTER", "SCRIPT", "STYLE", "NOSCRIPT", "SVG",
    "IMG", "VIDEO", "AUDIO", "IFRAME", "FORM", "INPUT", "SELECT",
    "TEXTAREA", "BUTTON", "CANVAS",
  ]);
  const nodes = [];
  let nextId = 0;
  function walk(el) {
    if (SKIP.has(el.tagName)) return;
    for (const child of el.childNodes) {
      if (child.nodeType === 3) {
        const text = child.textContent.trim();
        if (text.length > 0) nodes.push({ id: nextId++, text });
      } else if (child.nodeType === 1) walk(child);
    }
  }
  walk(document.documentElement);
  return nodes;
}

/** Content script: replace text nodes in the live DOM. Saves originals for undo. */
function applyTransformedNodes(nodeMap) {
  const SKIP = new Set([
    "NAV", "HEADER", "FOOTER", "SCRIPT", "STYLE", "NOSCRIPT", "SVG",
    "IMG", "VIDEO", "AUDIO", "IFRAME", "FORM", "INPUT", "SELECT",
    "TEXTAREA", "BUTTON", "CANVAS",
  ]);
  const originals = {};
  let nextId = 0;
  function walk(el) {
    if (SKIP.has(el.tagName)) return;
    for (const child of el.childNodes) {
      if (child.nodeType === 3) {
        const text = child.textContent.trim();
        if (text.length > 0) {
          const id = nextId++;
          if (nodeMap[id] !== undefined) {
            originals[id] = child.textContent;
            const raw = child.textContent;
            const leading = (raw.match(/^\s*/) || [""])[0];
            const trailing = (raw.match(/\s*$/) || [""])[0];
            child.textContent = leading + nodeMap[id] + trailing;
          }
        }
      } else if (child.nodeType === 1) walk(child);
    }
  }
  walk(document.documentElement);
  window.__scrubcentralOriginals = originals;
}

/** Content script: undo transformation. */
function restoreOriginalNodes() {
  const originals = window.__scrubcentralOriginals;
  if (!originals) return;
  const SKIP = new Set([
    "NAV", "HEADER", "FOOTER", "SCRIPT", "STYLE", "NOSCRIPT", "SVG",
    "IMG", "VIDEO", "AUDIO", "IFRAME", "FORM", "INPUT", "SELECT",
    "TEXTAREA", "BUTTON", "CANVAS",
  ]);
  let nextId = 0;
  function walk(el) {
    if (SKIP.has(el.tagName)) return;
    for (const child of el.childNodes) {
      if (child.nodeType === 3) {
        const text = child.textContent.trim();
        if (text.length > 0) {
          const id = nextId++;
          if (originals[id] !== undefined) child.textContent = originals[id];
        }
      } else if (child.nodeType === 1) walk(child);
    }
  }
  walk(document.documentElement);
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
    // 1. Grab original HTML + extract text nodes in parallel
    const [htmlResult, extractResult] = await Promise.all([
      chrome.scripting.executeScript({
        target: { tabId: currentTabId },
        func: () => document.documentElement.outerHTML,
      }),
      chrome.scripting.executeScript({
        target: { tabId: currentTabId },
        func: extractTextNodesFromDOM,
      }),
    ]);

    const originalHtml = htmlResult[0].result;
    const textNodes = extractResult[0].result;

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

    // 4. Grab the now-transformed HTML and store both versions for the diff view
    const [transformedResult] = await chrome.scripting.executeScript({
      target: { tabId: currentTabId },
      func: () => document.documentElement.outerHTML,
    });

    // Store in background (just a KV write, very fast)
    fetch(`${API_BASE_URL}/api/store-result`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        originalHtml: originalHtml,
        transformedHtml: transformedResult[0].result,
      }),
    }).then(r => r.json()).then(d => {
      if (d.resultId) lastResultId = d.resultId;
    }).catch(() => {});

    showSuccess(data.nodes.length);
  } catch (err) {
    showError(err.message || "Network error — is the dev server running?");
  } finally {
    setLoading(false);
  }
});

// View changes in new tab
viewDiffBtn.addEventListener("click", () => {
  if (!lastResultId) return;
  const params = new URLSearchParams({ id: lastResultId, url: currentUrl, mode });
  if (mode === "simple") params.set("readingLevel", readingLevelSelect.value);
  chrome.tabs.create({ url: `${API_BASE_URL}/result?${params.toString()}` });
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
  lastResultId = null;
});
