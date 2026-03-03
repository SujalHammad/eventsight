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
    <div
      className="
        rounded-3xl border border-white/10
        bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950
        shadow-[0_30px_90px_rgba(0,0,0,.45)]
        p-5 sm:p-7
        text-white
      "
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="text-xs font-black uppercase tracking-wide text-white/60">
            Outreach draft
          </div>
          <div className="mt-1 text-2xl font-black text-white">
            Email to sponsor
          </div>
          <div className="mt-1 text-sm text-white/70">
            Copy, replace the recipient name, and send.
          </div>
        </div>

        <div className="flex flex-wrap gap-2 sm:justify-end">
          <button
            onClick={copy}
            className="
              w-auto px-4 py-2 rounded-2xl
              bg-white text-slate-900 font-black
              hover:bg-slate-100
            "
          >
            {copied ? "Copied ✅" : "Copy"}
          </button>

          <button
            onClick={() => window.print()}
            className="
              w-auto px-4 py-2 rounded-2xl
              border border-white/15 bg-white/10
              text-white font-black hover:bg-white/15
            "
          >
            Print / Export
          </button>
        </div>
      </div>

      <pre
        className="
          mt-5 whitespace-pre-wrap text-sm leading-relaxed
          text-white/90
          bg-black/35 border border-white/10
          rounded-2xl p-4
          overflow-x-auto
        "
      >
        {text}
      </pre>
    </div>
  );
}