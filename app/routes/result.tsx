import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router";
import type { Route } from "./+types/result";

export function meta({}: Route.MetaArgs) {
  return [{ title: "ScrubCentral — Results" }];
}

type Tab = "original" | "transformed" | "diff";

function computeDiff(
  original: string,
  transformed: string
): Array<{ type: "same" | "add" | "remove"; text: string }> {
  const extractText = (html: string): string[] => {
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim()
      .split(/(?<=[.!?])\s+/)
      .filter((s) => s.trim().length > 0);
  };

  const origLines = extractText(original);
  const transLines = extractText(transformed);
  const result: Array<{ type: "same" | "add" | "remove"; text: string }> = [];

  const m = origLines.length;
  const n = transLines.length;

  if (m > 500 || n > 500) {
    for (const line of origLines) result.push({ type: "remove", text: line });
    for (const line of transLines) result.push({ type: "add", text: line });
    return result;
  }

  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (origLines[i - 1] === transLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const diffItems: Array<{ type: "same" | "add" | "remove"; text: string }> = [];
  let i = m,
    j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && origLines[i - 1] === transLines[j - 1]) {
      diffItems.unshift({ type: "same", text: origLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      diffItems.unshift({ type: "add", text: transLines[j - 1] });
      j--;
    } else {
      diffItems.unshift({ type: "remove", text: origLines[i - 1] });
      i--;
    }
  }

  return diffItems;
}

export default function Result() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>("transformed");
  const [originalHtml, setOriginalHtml] = useState<string | null>(null);
  const [transformedHtml, setTransformedHtml] = useState<string | null>(null);

  const url = searchParams.get("url") || "";
  const mode = searchParams.get("mode") || "simple";
  const readingLevel = searchParams.get("readingLevel");

  useEffect(() => {
    setOriginalHtml(sessionStorage.getItem("scrub:originalHtml"));
    setTransformedHtml(sessionStorage.getItem("scrub:transformedHtml"));
  }, []);

  const diffResult = useMemo(() => {
    if (!originalHtml || !transformedHtml) return [];
    return computeDiff(originalHtml, transformedHtml);
  }, [originalHtml, transformedHtml]);

  if (!originalHtml || !transformedHtml) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-cpf-bg">
        <div className="bg-cpf-white rounded-xl border border-cpf-border p-10 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 mx-auto rounded-full bg-cpf-mint flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 9v4M12 17h.01M12 3a9 9 0 100 18 9 9 0 000-18z" stroke="var(--color-cpf-teal)" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-cpf-text-secondary">
            No transform data found. Your session may have expired.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-cpf-teal hover:text-cpf-teal-dark transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M13 8H3M7 4L3 8l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    {
      key: "original",
      label: "Original",
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5 6h6M5 8h6M5 10h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      key: "transformed",
      label: "Transformed",
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M2 4l4 4-4 4M8 12h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      key: "diff",
      label: "Diff",
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M5 3v10M11 3v10M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
    },
  ];

  const modeLabel =
    mode === "llm" ? "LLM-Optimized" : `Simple English — ${readingLevel || "adult"}`;

  return (
    <div className="min-h-screen flex flex-col bg-cpf-bg">
      {/* Top bar */}
      <header className="bg-cpf-teal text-white sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <Link
            to="/"
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity shrink-0"
          >
            <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="6" fill="white" fillOpacity="0.15" />
              <path d="M7 14h14M14 7v14" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <span className="text-sm font-bold tracking-tight">ScrubCentral</span>
          </Link>

          <div className="flex items-center gap-3 min-w-0">
            <span className="text-white/60 text-xs truncate hidden sm:block max-w-sm font-mono">
              {url}
            </span>
            <span className="text-xs font-bold bg-white/15 px-2.5 py-1 rounded-full shrink-0 whitespace-nowrap">
              {modeLabel}
            </span>
          </div>

          <Link
            to="/"
            className="flex items-center gap-1.5 text-xs font-bold text-white/80 hover:text-white transition-colors shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M13 8H3M7 4L3 8l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            New transform
          </Link>
        </div>
      </header>

      {/* Tab bar */}
      <div className="bg-cpf-white border-b border-cpf-border">
        <div className="max-w-7xl mx-auto px-6 flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-bold transition-all border-b-[3px] ${
                tab === t.key
                  ? "border-cpf-teal text-cpf-teal"
                  : "border-transparent text-cpf-text-muted hover:text-cpf-text-secondary"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-6">
        {tab === "original" && (
          <div className="animate-fade-in rounded-xl border border-cpf-border overflow-hidden bg-white shadow-sm">
            <iframe
              srcDoc={originalHtml}
              title="Original page"
              sandbox="allow-same-origin"
              className="w-full min-h-[80vh] border-0"
            />
          </div>
        )}

        {tab === "transformed" && (
          <div className="animate-fade-in rounded-xl border border-cpf-border overflow-hidden bg-white shadow-sm">
            <iframe
              srcDoc={transformedHtml}
              title="Transformed page"
              sandbox="allow-same-origin"
              className="w-full min-h-[80vh] border-0"
            />
          </div>
        )}

        {tab === "diff" && (
          <div className="animate-fade-in rounded-xl border border-cpf-border bg-cpf-white p-8 min-h-[80vh] overflow-auto shadow-sm">
            <div className="flex items-center gap-5 mb-6 pb-4 border-b border-cpf-border">
              <span className="flex items-center gap-2 text-sm text-cpf-text-secondary">
                <span className="inline-block w-3 h-3 rounded-sm bg-cpf-danger/10 border border-cpf-danger/30" />
                Removed
              </span>
              <span className="flex items-center gap-2 text-sm text-cpf-text-secondary">
                <span className="inline-block w-3 h-3 rounded-sm bg-cpf-success/10 border border-cpf-success/30" />
                Added
              </span>
            </div>
            <div className="space-y-0.5 text-[15px] leading-relaxed">
              {diffResult.map((item, i) => (
                <span
                  key={i}
                  className={
                    item.type === "add"
                      ? "diff-add"
                      : item.type === "remove"
                        ? "diff-remove"
                        : "text-cpf-text"
                  }
                >
                  {item.text}{" "}
                </span>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
