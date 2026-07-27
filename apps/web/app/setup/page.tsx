"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { GlassPanel } from "@/components/glass-panel";

interface FormState {
  shopifyStoreDomain: string;
  shopifyAdminAccessToken: string;
  domainName: string;
  openaiApiKey: string;
  anthropicApiKey: string;
  googleAiApiKey: string;
  ollamaBaseUrl: string;
  qdrantUrl: string;
  qdrantApiKey: string;
}

const EMPTY_FORM: FormState = {
  shopifyStoreDomain: "",
  shopifyAdminAccessToken: "",
  domainName: "",
  openaiApiKey: "",
  anthropicApiKey: "",
  googleAiApiKey: "",
  ollamaBaseUrl: "",
  qdrantUrl: "",
  qdrantApiKey: "",
};

function Field({
  label,
  hint,
  value,
  onChange,
  placeholder,
  secret,
  connected,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  secret?: boolean;
  connected?: boolean;
}) {
  return (
    <label className="block">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-white/70">{label}</span>
        {connected && <span className="text-[10px] uppercase tracking-widest text-neon-green">Connected</span>}
      </div>
      <input
        type={secret ? "password" : "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-neon-cyan/20 bg-void-900/80 px-3 py-2 text-sm text-white placeholder:text-white/25 focus:border-neon-cyan/60 focus:outline-none"
      />
      {hint && <p className="mt-1 text-[11px] text-white/30">{hint}</p>}
    </label>
  );
}

export default function SetupPage() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [status, setStatus] = useState<Record<string, boolean>>({});
  const [showOptional, setShowOptional] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ connected: boolean; summary: string } | null>(null);

  useEffect(() => {
    fetch("/api/setup")
      .then((res) => res.json())
      .then((data: { status: Record<string, boolean> }) => setStatus(data.status))
      .catch(() => undefined);
  }, []);

  function update<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setResult(null);
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as {
        status: Record<string, boolean>;
        shopifyTest: { connected: boolean; summary: string } | null;
      };
      setStatus(data.status);
      if (data.shopifyTest) setResult(data.shopifyTest);
      setForm(EMPTY_FORM);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Setup Wizard"
        subtitle="Connect Shopify and this app is fully live. Everything else — agents, memory, the Neural Brain — configures itself automatically."
      />

      <form onSubmit={submit} className="space-y-6">
        <GlassPanel className="space-y-4">
          <h3 className="text-sm font-semibold text-white">Required</h3>
          <Field
            label="Shopify Store Domain"
            hint="e.g. your-store.myshopify.com"
            placeholder="your-store.myshopify.com"
            value={form.shopifyStoreDomain}
            onChange={(v) => update("shopifyStoreDomain", v)}
            connected={status.shopifyStoreDomain}
          />
          <Field
            label="Shopify Admin Access Token"
            hint="Admin API access token from a custom app in your Shopify Admin"
            placeholder="shpat_••••••••••••••••"
            value={form.shopifyAdminAccessToken}
            onChange={(v) => update("shopifyAdminAccessToken", v)}
            secret
            connected={status.shopifyAdminAccessToken}
          />
          <Field
            label="Domain Name"
            hint="Where this app is publicly reachable — used for Shopify webhook callbacks"
            placeholder="commander.yourbrand.com"
            value={form.domainName}
            onChange={(v) => update("domainName", v)}
            connected={status.domainName}
          />
        </GlassPanel>

        <GlassPanel>
          <button
            type="button"
            onClick={() => setShowOptional((v) => !v)}
            className="flex w-full items-center justify-between text-sm font-semibold text-white"
          >
            Optional — AI providers &amp; memory
            <span className="text-white/40">{showOptional ? "−" : "+"}</span>
          </button>
          <p className="mt-1 text-[11px] text-white/30">
            The AI Model Manager already tries a local Ollama instance first at no cost — these are only needed for
            cloud fallback or a hosted Qdrant memory store.
          </p>
          {showOptional && (
            <div className="mt-4 space-y-4">
              <Field label="OpenAI API Key" value={form.openaiApiKey} onChange={(v) => update("openaiApiKey", v)} secret connected={status.openaiApiKey} />
              <Field
                label="Anthropic API Key"
                value={form.anthropicApiKey}
                onChange={(v) => update("anthropicApiKey", v)}
                secret
                connected={status.anthropicApiKey}
              />
              <Field
                label="Google AI API Key"
                value={form.googleAiApiKey}
                onChange={(v) => update("googleAiApiKey", v)}
                secret
                connected={status.googleAiApiKey}
              />
              <Field
                label="Ollama Base URL"
                placeholder="http://localhost:11434"
                value={form.ollamaBaseUrl}
                onChange={(v) => update("ollamaBaseUrl", v)}
                connected={status.ollamaBaseUrl}
              />
              <Field
                label="Qdrant URL"
                placeholder="http://localhost:6333"
                value={form.qdrantUrl}
                onChange={(v) => update("qdrantUrl", v)}
                connected={status.qdrantUrl}
              />
              <Field label="Qdrant API Key" value={form.qdrantApiKey} onChange={(v) => update("qdrantApiKey", v)} secret connected={status.qdrantApiKey} />
            </div>
          )}
        </GlassPanel>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-md border border-neon-cyan/40 bg-neon-cyan/10 px-4 py-2.5 text-sm font-medium text-neon-cyan transition hover:bg-neon-cyan/20 disabled:opacity-50"
        >
          {saving ? "Saving & testing connection…" : "Save & Connect"}
        </button>

        {result && (
          <GlassPanel className={result.connected ? "border-neon-green/40" : "border-neon-amber/40"}>
            <p className={`text-sm ${result.connected ? "text-neon-green" : "text-neon-amber"}`}>
              {result.connected ? "✓ Connected to Shopify" : "Could not connect yet"}
            </p>
            <p className="mt-1 text-xs text-white/50">{result.summary}</p>
          </GlassPanel>
        )}
      </form>
    </div>
  );
}
