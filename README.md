# AI Commander OS

**One AI Team. Complete Ecommerce Automation.**

AI Commander OS is a futuristic AI operating system that runs an ecommerce business
like a company of employees. A central **AI Commander** plans and dispatches work to
specialized agents — Research, Content, Design, Video, Shopify, Marketplace, Social,
Analytics, Finance, Support and Memory — and coordinates them from a mission-control
dashboard built around a living **3D neural network**: a glowing Commander Core at
the center, with each agent rendered as its own cluster of hundreds of interconnected
nodes (Research Cluster, SEO Cluster, Shopify Cluster, Memory Cluster, ...) radiating
outward, connected by a dense mesh of glowing pathways. Real business events — a new
order, a completed publish, an error — travel through the network as bright pulses in
real time, so the interface visibly reacts to what the business is actually doing
instead of just displaying numbers.

Every agent runs against real external APIs when credentials are configured, and
falls back to clearly-labeled representative data when they aren't — so `npm run dev`
is fully demonstrable with zero setup, and goes fully live the moment you run the
Setup Wizard.

## Architecture

```
packages/core        Agent framework: BaseAgent, AgentRegistry, EventBus, Commander,
                      pluggable Planner, pluggable memory (in-memory / Qdrant),
                      AI Model Manager (packages/core/src/models).
packages/agents       The 11 specialized agents, each implementing BaseAgent.
apps/web              Next.js 14 (App Router) dashboard, API routes, SSE event stream.
```

**Commander → Registry → Agents.** The Commander never talks to an agent directly;
it dispatches through the `AgentRegistry`, so agents can be added, replaced, or
hot-swapped without touching the orchestrator or the dashboard. A natural-language
command becomes a `MissionPlan` (a sequence of agent tasks), which the Commander
executes step by step, streaming progress onto an `EventBus` — delivered to the
browser over Server-Sent Events (`/api/events`) — that drives live notifications and
the neural network's per-cluster pulses. Noteworthy output (research, generated copy,
analytics/finance reports) is automatically written into the Memory Agent as it's
produced.

**AI Model Manager** (`packages/core/src/models`) centralizes every LLM call behind
one `ModelManager`. Providers are tried in order — a local **Ollama** instance first
(free, private; auto-picks whichever of llama3.2/qwen2.5/deepseek-r1/mistral/gemma2/phi3
is actually installed), then OpenAI, Anthropic and Google as **optional** cloud
fallback, only used if their API key is set and no local model answered. Availability
is probed and cached so a cold/offline Ollama doesn't add latency to every request.
The Research and Content agents use it for real generation and fall back to
deterministic templates when no model is available anywhere.

**Memory is pluggable and persistent.** `InMemoryVectorStore` is the zero-dependency
default; `QdrantVectorStore` (same `VectorStore` interface) is used automatically the
moment `QDRANT_URL` is reachable, embedding text via a local Ollama embedding model
when available or a dependency-free hash embedding otherwise — either way semantic
search keeps working with zero paid dependencies.

**Every agent degrades gracefully.** Each agent checks its own credentials (Shopify
Admin API, marketplace keys, social tokens, local image-gen/background-removal
services, AI providers) and returns `mocked: true` with representative data when
they're absent, or makes the real call when present. The dashboard surfaces this via
the `mocked` flag and inline banners — nothing pretends to be live when it isn't.

## The Neural Network UI

Mission Control's centerpiece is a React Three Fiber scene
(`apps/web/components/neural-network/`) — a living network, not a literal brain
model. A small glowing **Commander Core** sits at the center; every task begins and
ends there. Around it, each of the 11 agents gets its own **cluster** of ~70
instanced nodes scattered in a sphere, all tied together by a single static mesh of
glowing edges (core→cluster spokes plus intra-cluster links) built once into one
draw call for performance. Node clusters and connections are colored per agent from
a shared neural palette (`lib/cortex.ts`). While an agent is `running`, its cluster
nodes pulse and a particle continuously travels its spoke; any live event (a new
order, a completed publish, an error) additionally fires a one-shot bright pulse
that travels core→cluster in real time, independent of the resting animation — so
the network visibly reacts to what's actually happening, not just to agent status.
Three layered `Sparkles` fields (blue/purple/pink) plus exponential fog give the
deep-space atmosphere, and `@react-three/postprocessing`'s `Bloom` produces the glow
(automatically disabled on detected software/low-end WebGL renderers, where it
silently blanks the canvas instead of erroring — see `usePostProcessingSupported` in
`network-scene.tsx`). Hovering a cluster reveals its live status and last summary;
drag to orbit, auto-rotate keeps it moving even when idle.

The rest of the dashboard (Agents, Tasks, Products, Orders, Analytics, Marketing,
Media Library, Reports, Notifications, Memory, Automation, Marketplace, Logs,
Terminal, API Keys, Setup Wizard, Settings) uses the same dark glass-panel language
— translucent panels, neon accents, a subtle grid background — without the 3D
canvas, since a live data table is more usable as a table than as a network cluster.

## Getting started

The fastest path is the in-app **Setup Wizard** (`/setup`): enter your Shopify store
domain, admin access token, and public domain name, and everything else — the
Commander, agents, memory, the AI Model Manager — configures itself automatically.
Values are written to a gitignored `.data/runtime-config.json` and applied
immediately, no restart required.

```bash
npm install
npm run dev                  # http://localhost:3000, zero config needed to explore
```

Or configure via environment instead of the wizard:

```bash
cp .env.example apps/web/.env.local   # fill in what you have
npm run dev
```

Nothing in `.env.example` is required — every integration is optional and agents
fall back to mock data. Highlights:

- `SHOPIFY_STORE_DOMAIN` / `SHOPIFY_ADMIN_ACCESS_TOKEN` / `DOMAIN_NAME` → live
  Shopify Agent (products, orders, customers, collections, inventory, create/
  update/publish, live revenue analytics) and inbound webhooks at
  `/api/webhooks/shopify` (register them with the `shopify.register_webhooks` task)
- `OLLAMA_BASE_URL` → local, free AI generation for Research and Content agents
  (no key needed — just run Ollama); `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` /
  `GOOGLE_AI_API_KEY` are optional cloud fallback
- `QDRANT_URL` → persistent memory instead of the in-memory default
- `IMAGE_GEN_API_URL` (Automatic1111/ComfyUI-compatible) / `BACKGROUND_REMOVAL_API_URL`
  → real image generation and background removal in the Design Agent

### Useful scripts

```bash
npm run dev         # apps/web dev server
npm run build        # production build
npm run typecheck    # typecheck all workspaces
npm run lint          # apps/web ESLint
```

### Sending a mission

From the terminal, the Mission Control command console, the topbar's global
"Ask AI Commander anything" bar, or directly:

```bash
curl -X POST http://localhost:3000/api/commander/command \
  -H "Content-Type: application/json" \
  -d '{"command": "Launch a new product end-to-end"}'
```

This dispatches Research → Content → Design → Video → Shopify → Marketplace →
Social → Analytics in sequence and returns a full `MissionReport`. Progress streams
live over SSE to every open dashboard tab.

## Coding standards

TypeScript everywhere, strict mode on. Agents are modular and stateless between
tasks; new agents implement `BaseAgent` and register in
`packages/agents/src/index.ts` — no core changes required. No hardcoded
secrets: every integration reads from `process.env` (directly, or via the Setup
Wizard's runtime config layered on top of it), documented in `.env.example`. Dark
mode and responsive layout throughout.

## Roadmap

**Phase 1 — this repo.** Core agent framework, all 11 agents, live Shopify Admin
API integration with webhooks, AI Model Manager (local-first), persistent Qdrant
memory, Setup Wizard, real system health, and the full neural-network dashboard.

**Phase 2.** Live marketplace publishing (Amazon SP-API, Flipkart, Meesho, Etsy),
real UGC/video rendering, social auto-posting (Meta/Pinterest/YouTube Graph APIs),
object storage for generated media (Cloudflare R2/S3) instead of inline base64.

**Phase 3.** Customer Support Agent wired to a real inbox, Finance Agent wired to
accounting data, persistent Postgres/Supabase storage + Redis task queue,
role-based auth (Clerk/Supabase Auth/BetterAuth).

**Phase 4.** Voice-controlled Commander, autonomous optimization loops, predictive
analytics, multi-store/multi-company management, GPU particle systems and custom
GLSL shaders for denser, more cinematic network motion.
