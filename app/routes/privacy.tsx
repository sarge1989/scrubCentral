import { Link } from "react-router";
import type { Route } from "./+types/privacy";

export function meta({}: Route.MetaArgs) {
  return [{ title: "ScrubCentral — Privacy Policy" }];
}

export default function Privacy() {
  return (
    <div className="min-h-screen bg-cpf-bg">
      <header className="bg-cpf-teal text-white">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="6" fill="white" fillOpacity="0.15" />
              <path d="M7 14h14M14 7v14" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <span className="text-lg font-bold tracking-tight">ScrubCentral</span>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="bg-cpf-white rounded-xl border border-cpf-border p-8 shadow-sm space-y-6 text-cpf-text text-[15px] leading-relaxed">
          <h1 className="text-2xl font-black text-cpf-text">Privacy Policy</h1>
          <p className="text-cpf-text-muted text-sm">Last updated: 15 March 2026</p>

          <section className="space-y-2">
            <h2 className="text-lg font-bold">What ScrubCentral does</h2>
            <p>
              ScrubCentral is a browser extension and web application that transforms web page
              content into simplified English or LLM-optimized text. It is designed primarily for
              use with CPF Board (cpf.gov.sg) pages.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold">Data we collect</h2>
            <p>
              When you use ScrubCentral to transform a page, the following data is sent to our
              server:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>The text content of the web page you are viewing</li>
              <li>The URL of the page</li>
              <li>Your selected transform settings (mode, reading level, custom instruction)</li>
            </ul>
            <p>
              We do <strong>not</strong> collect any personal information, browsing history,
              cookies, credentials, or any data from pages you do not explicitly choose to
              transform.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold">How we use your data</h2>
            <p>
              Page content is sent to our server solely to perform the text transformation using
              a large language model (OpenAI GPT). The content is not used for any other purpose.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold">Data storage</h2>
            <p>
              Transformed results are cached for up to 7 days to improve performance for repeated
              requests. Cached data is stored in Cloudflare KV and is automatically deleted after
              expiry. No data is stored permanently.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold">Third-party services</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>OpenAI</strong> — page text is sent to OpenAI's API for transformation.
                OpenAI's privacy policy applies to data processed by their API.
              </li>
              <li>
                <strong>Cloudflare</strong> — our server infrastructure runs on Cloudflare Workers.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold">Your choices</h2>
            <p>
              The extension only activates when you explicitly click the extension icon and press
              "Transform this page". No data is collected passively. You can uninstall the
              extension at any time to stop all data processing.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold">Contact</h2>
            <p>
              For questions about this privacy policy, please open an issue on our{" "}
              <a
                href="https://github.com/sarge1989/scrubCentral"
                className="text-cpf-teal font-bold hover:underline"
              >
                GitHub repository
              </a>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
