import { useState } from "react";
import { useNavigate } from "react-router";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "ScrubCentral — Page Transform Engine" },
    {
      name: "description",
      content: "Transform complex web pages for simplified reading or LLM consumption",
    },
  ];
}

type Mode = "simple" | "llm";
type ReadingLevel = "primary" | "secondary" | "adult";

export default function Home() {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<Mode>("simple");
  const [readingLevel, setReadingLevel] = useState<ReadingLevel>("secondary");
  const [customInstruction, setCustomInstruction] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/transform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          mode,
          readingLevel: mode === "simple" ? readingLevel : undefined,
          customInstruction: customInstruction.trim() || undefined,
        }),
      });

      const data: { error?: string; originalHtml?: string; transformedHtml?: string } =
        await res.json();

      if (!res.ok) {
        setError(data.error || `Request failed (${res.status})`);
        return;
      }

      sessionStorage.setItem("scrub:originalHtml", data.originalHtml || "");
      sessionStorage.setItem("scrub:transformedHtml", data.transformedHtml || "");

      const params = new URLSearchParams({ url, mode });
      if (mode === "simple") params.set("readingLevel", readingLevel);
      navigate(`/result?${params.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Decorative background curve — mirroring CPF's soft green shapes */}
      <div
        className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full opacity-40 pointer-events-none"
        style={{ background: "radial-gradient(circle, var(--color-cpf-mint) 0%, transparent 70%)" }}
      />
      <div
        className="absolute -bottom-60 -left-60 w-[500px] h-[500px] rounded-full opacity-30 pointer-events-none"
        style={{ background: "radial-gradient(circle, var(--color-cpf-mint-dark) 0%, transparent 70%)" }}
      />

      {/* Top bar */}
      <header className="bg-cpf-teal text-white">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="shrink-0">
            <rect width="28" height="28" rx="6" fill="white" fillOpacity="0.15" />
            <path d="M7 14h14M14 7v14" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <span className="text-lg font-bold tracking-tight">ScrubCentral</span>
          <span className="text-white/50 text-sm ml-1">Page Transform Engine</span>
        </div>
      </header>

      {/* Hero section */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-16 pb-8">
        <div className="animate-fade-in-up">
          <h1 className="text-4xl font-black text-cpf-text leading-tight mb-3">
            Simplify any webpage
          </h1>
          <p className="text-lg text-cpf-text-secondary max-w-xl leading-relaxed">
            Paste a URL to transform its content for easier reading or LLM consumption.
            The engine fetches, extracts, and rewrites the text while preserving the page layout.
          </p>
        </div>
      </section>

      {/* Form card */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pb-20">
        <form
          onSubmit={handleSubmit}
          className="animate-fade-in-up bg-cpf-white rounded-xl shadow-sm border border-cpf-border p-8 space-y-6"
          style={{ animationDelay: "100ms" }}
        >
          {/* URL Input */}
          <div className="space-y-2">
            <label htmlFor="url" className="text-sm font-bold text-cpf-text">
              Target URL
            </label>
            <input
              id="url"
              type="url"
              required
              placeholder="https://www.cpf.gov.sg/member/cpf-overview"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full border border-cpf-border rounded-lg px-4 py-3 text-cpf-text placeholder:text-cpf-text-muted focus:outline-none focus:border-cpf-border-focus focus:ring-2 focus:ring-cpf-teal/15 transition-all"
            />
          </div>

          {/* Mode + Reading Level row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Mode Toggle */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-cpf-text">
                Transform Mode
              </label>
              <div className="grid grid-cols-2 gap-0 border border-cpf-border rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setMode("simple")}
                  className={`py-3 px-4 text-sm font-bold transition-all border-r border-cpf-border ${
                    mode === "simple"
                      ? "bg-cpf-teal text-white"
                      : "bg-cpf-white text-cpf-text-secondary hover:bg-cpf-mint/50"
                  }`}
                >
                  Simple English
                </button>
                <button
                  type="button"
                  onClick={() => setMode("llm")}
                  className={`py-3 px-4 text-sm font-bold transition-all ${
                    mode === "llm"
                      ? "bg-cpf-teal text-white"
                      : "bg-cpf-white text-cpf-text-secondary hover:bg-cpf-mint/50"
                  }`}
                >
                  LLM-Optimized
                </button>
              </div>
            </div>

            {/* Reading Level */}
            <div className={`space-y-2 transition-opacity ${mode === "simple" ? "opacity-100" : "opacity-30 pointer-events-none"}`}>
              <label htmlFor="readingLevel" className="text-sm font-bold text-cpf-text">
                Reading Level
              </label>
              <select
                id="readingLevel"
                value={readingLevel}
                onChange={(e) => setReadingLevel(e.target.value as ReadingLevel)}
                disabled={mode !== "simple"}
                className="w-full border border-cpf-border rounded-lg px-4 py-3 text-sm text-cpf-text focus:outline-none focus:border-cpf-border-focus focus:ring-2 focus:ring-cpf-teal/15 transition-all appearance-none cursor-pointer bg-cpf-white"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23718096' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 14px center",
                }}
              >
                <option value="primary">Primary (Age 7–12)</option>
                <option value="secondary">Secondary (Age 13–16)</option>
                <option value="adult">Adult (General)</option>
              </select>
            </div>
          </div>

          {/* Custom Instruction */}
          <div className="space-y-2">
            <label htmlFor="customInstruction" className="text-sm font-bold text-cpf-text">
              Custom Instruction
              <span className="font-normal text-cpf-text-muted ml-1">(optional)</span>
            </label>
            <textarea
              id="customInstruction"
              rows={2}
              placeholder={`e.g. "focus on retirement benefits" or "explain like I'm 18"`}
              value={customInstruction}
              onChange={(e) => setCustomInstruction(e.target.value)}
              className="w-full border border-cpf-border rounded-lg px-4 py-3 text-sm text-cpf-text placeholder:text-cpf-text-muted focus:outline-none focus:border-cpf-border-focus focus:ring-2 focus:ring-cpf-teal/15 transition-all resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-cpf-danger-bg border border-cpf-danger/20 rounded-lg px-4 py-3 text-sm text-cpf-danger">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className={`inline-flex items-center gap-2.5 px-8 py-3 rounded-full text-sm font-bold text-white transition-all ${
              loading
                ? "bg-cpf-teal/60 cursor-wait"
                : "bg-cpf-teal hover:bg-cpf-teal-dark active:scale-[0.98] shadow-sm hover:shadow-md"
            }`}
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeDasharray="31.4 31.4" strokeLinecap="round" />
                </svg>
                Transforming…
              </>
            ) : (
              <>
                Transform page
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </>
            )}
          </button>
        </form>
      </section>
    </div>
  );
}
