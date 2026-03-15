# ScrubCentral

A page transform engine that rewrites web content for simplified reading or LLM consumption. Built primarily for CPF Board (cpf.gov.sg) pages, which are JS-rendered SPAs that can't be fetched server-side.

**Live site:** https://scrubcentral.tanbingwen.com

## How it works

1. Text nodes are extracted from the page's DOM
2. An LLM (GPT) rewrites each text block according to the selected mode
3. Transformed text is applied back while preserving the original page layout, styles, and fonts

Two ways to use it:

- **Chrome Extension** (recommended for CPF pages) — transforms the page in-situ directly in your browser
- **Web UI** — paste a URL and get a side-by-side comparison with diff view

## Chrome Extension

The extension solves the core problem: CPF pages are JS-rendered SPAs, so server-side `fetch` only gets a loading shell. The extension grabs the fully-rendered DOM from the browser after JavaScript has executed.

### Features

- **In-situ transformation** — text is rewritten directly on the page you're viewing
- **Two modes:** Simple English (with reading level selection) or LLM-Optimized
- **Custom instructions** — e.g., "focus on retirement benefits"
- **Undo** — restore the original text with one click
- **View changes** — open a side-by-side diff in a new tab

### Install locally

1. Clone this repo
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (toggle top-right)
4. Click **Load unpacked** and select the `extension/` folder
5. Pin ScrubCentral from the puzzle-piece icon in the toolbar

### Usage

1. Navigate to any CPF page (e.g., https://www.cpf.gov.sg/member/retirement-income/milestones/reaching-age-55)
2. Click the ScrubCentral extension icon
3. Select transform mode and reading level
4. Click **Transform this page**
5. The page text is rewritten in place — use **Undo** to restore or **View changes** to see a diff

## Web UI

Visit https://scrubcentral.tanbingwen.com, paste a URL, and click Transform. Works best for pages that aren't JS-rendered SPAs (the server fetches the HTML directly).

## Architecture

```
extension/          Chrome extension (Manifest V3)
├── popup.html/js   Extension popup UI and logic
├── config.js       API base URL
└── manifest.json   Permissions and metadata

app/                React Router frontend
├── routes/
│   ├── home.tsx    Landing page with URL input form
│   ├── result.tsx  Side-by-side comparison + diff view
│   └── privacy.tsx Privacy policy
└── routes.ts       Route config

workers/            Hono API on Cloudflare Workers
├── app.ts          API endpoints
└── lib/
    └── transform.ts Text extraction, GPT transformation, screenshot
```

### API Endpoints

| Endpoint | Description |
|---|---|
| `POST /api/transform` | Full pipeline: accepts URL or pre-rendered HTML, extracts text, transforms via GPT, returns original + transformed HTML |
| `POST /api/transform-nodes` | Lightweight: accepts pre-extracted text nodes, returns transformed text (used by extension for in-situ mode) |
| `POST /api/store-result` | Stores pre-computed results in KV for later retrieval |
| `GET /api/result/:id` | Retrieves cached results by ID |

### Extension flow (in-situ)

```
User clicks extension → extract text nodes from live DOM
→ POST /api/transform-nodes → GPT transforms text
→ mutate text nodes in the live DOM (no HTML serialization)
```

### Web UI flow

```
User pastes URL → POST /api/transform → server fetches HTML
→ extract text nodes → screenshot → GPT transforms text
→ reassemble HTML → display in iframe with diff
```

## Development

```bash
npm install
npm run dev          # Start dev server at localhost:5173
```

Load the extension in Chrome (see install instructions above). The extension's `config.js` must point to `http://localhost:5173` for local development.

### Environment variables

Create a `.dev.vars` file:

```
OPENAI_API_KEY=sk-...
SCREENSHOTONE_ACCESS_KEY=...
```

## Deployment

```bash
npm run deploy
```

Requires a Cloudflare account with:
- Workers (serverless compute)
- KV namespace (`SCRUBCENTRAL_KV`) for caching results (7-day TTL)
- Secrets: `OPENAI_API_KEY`, `SCREENSHOTONE_ACCESS_KEY`

## Privacy

See [Privacy Policy](https://scrubcentral.tanbingwen.com/privacy). The extension only accesses page content when you explicitly click Transform. No data is collected passively.
