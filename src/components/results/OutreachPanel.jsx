import React, { useState } from "react";

export default function OutreachPanel({ text }) {
  const [copied, setCopied] = useState(false);
  if (!text) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  };

  return (
    <section className="result-card result-outreach-card">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="result-kicker">Outreach draft</div>
          <h3 className="result-section-title mt-1">Email to sponsor</h3>
          <p className="muted mt-2">Copy, replace the recipient name, and send.</p>
        </div>

        <div className="flex flex-wrap gap-2 sm:justify-end">
          <button onClick={copy} className="btn-secondary !rounded-2xl !px-5 !py-3">
            {copied ? "Copied ✅" : "Copy"}
          </button>
          <button onClick={() => window.print()} className="btn-secondary !rounded-2xl !px-5 !py-3">
            Print / Export
          </button>
        </div>
      </div>

      <pre className="result-email-surface">{text}</pre>
    </section>
  );
}
