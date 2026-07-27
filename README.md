# AI Commander OS

**One AI Team. Complete Ecommerce Automation.**

AI Commander OS is a futuristic AI operating system that runs an ecommerce business
like a company of employees. A central **AI Commander** plans and dispatches work to
specialized agents — Research, Content, Design, Video, Shopify, Marketplace, Social,
Analytics, Finance, Support and Memory — and coordinates them from a mission-control
dashboard built around a living **3D neural brain**: agents render as glowing cortex
regions connected to a breathing core, with signal pulses traveling the neural
pathways whenever work is in flight.

This repo is the **Phase 1 foundation**: a working agent framework, all eleven
agents wired end to end, and a full dashboard UI. Every agent runs against real
external APIs when credentials are configured, and falls back to clearly-labeled
representative data when they aren't — so `npm run dev` is fully demonstrable with
zero setup.

## Architecture

```
packages/core        Agent framework: BaseAgent contract, AgentRegistry, EventBus,
                      MemoryStore (vector store abstraction), Planner, Commander.
packages/agents       The 11 specialized agents, each implementing BaseAgent.
apps/web              Next.js 14 (App Router) dashboard + API routes.
```

**Commander → Registry → Agents.** The Commander never talks to an agent directly;
it dispatches through the `AgentRegistry`, so agents can be added, replaced, or
hot-swapped without touching the orchestrator or the dashboard. A natural-language
command becomes a `MissionPlan` (a sequence of agent tasks), which the Commander
executes step by step, streaming progress onto an `EventBus` that drives the
dashboard's live notifications and the neural brain's activation state.

**Planner is pluggable.** `HeuristicPlanner` (keyword-based) is the zero-dependency
default and fully covers the "launch a product end-to-end" workflow from the brief.
Once `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` is set, implement an `LLMPlanner`
against the same `Planner` interface (`packages/core/src/planner.ts`) and swap it
in — nothing else in the system changes.

**Memory is pluggable.** `InMemoryVectorStore` (naive cosine-similarity search) is
the zero-dependency default behind the `VectorStore` interface
(`packages/core/src/memory-store.ts`). Swap in a Qdrant or Chroma-backed
implementation for production without touching the Memory Agent or callers.

**Every agent degrades gracefully.** Each agent checks for its own credentials
(Shopify Admin API, marketplace keys, social tokens, analytics providers) and
returns `mocked: true` with representative data when they're absent, or makes the
real API call when they're present. The dashboard surfaces this via the `mocked`
flag and inline banners — nothing pretends to be live when it isn't.

## The Neural Brain UI

Mission Control's centerpiece is a React Three Fiber scene
(`apps/web/components/neural-brain/`): a breathing icosahedron core (the
Commander) surrounded by cortex nodes — one per agent, positioned on a Fibonacci
sphere — connected by neural pathway lines. When an agent is `running` its
pathway animates a traveling pulse and the node lit-pulses; `completed` /
`error` / `idle` map to green / red / dim-cyan per the brand palette. A
`Sparkles` particle field gives the "floating digital dust" atmosphere and
`@react-three/postprocessing`'s `Bloom` produces the neon glow. Hovering a node
reveals its live status and last summary via an in-scene HTML tooltip; drag to
orbit.

The rest of the dashboard (Agents, Tasks, Products, Orders, Analytics,
Marketing, Media Library, Reports, Notifications, Memory, Automation,
Marketplace, Logs, Terminal, API Keys, Settings) uses the same dark
glassmorphism/cyberpunk language — translucent panels, neon accents, a subtle
grid background — without the 3D canvas, since a live data table is more usable
as a table than as a brain region.

## Getting started

```bash
npm install
cp .env.example .env.local   # apps/web reads apps/web/.env.local
npm run dev                  # http://localhost:3000
```

Nothing in `.env.example` is required to run the dashboard — every integration
is optional and agents fall back to mock data. Fill in what you have:

- `SHOPIFY_STORE_DOMAIN` / `SHOPIFY_ADMIN_ACCESS_TOKEN` → live Shopify Agent
- `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` → real copy generation (once an
  `LLMPlanner`/LLM-backed Content Agent call is wired in)
- Marketplace / social / analytics keys → per-channel live status on the
  Marketplace and API Keys pages

### Useful scripts

```bash
npm run dev         # apps/web dev server
npm run build        # production build
npm run typecheck    # typecheck all workspaces
npm run lint          # apps/web ESLint
```

### Sending a mission

From the terminal, the Mission Control command console, or directly:

```bash
curl -X POST http://localhost:3000/api/commander/command \
  -H "Content-Type: application/json" \
  -d '{"command": "Launch a new product end-to-end"}'
```

This dispatches Research → Content → Design → Video → Shopify → Marketplace →
Social → Analytics in sequence and returns a full `MissionReport`.

## Coding standards

TypeScript everywhere, strict mode on. Agents are modular and stateless between
tasks; new agents implement `BaseAgent` and register in
`packages/agents/src/index.ts` — no core changes required. No hardcoded
secrets: every integration reads from `process.env`, documented in
`.env.example`. Dark mode and responsive layout throughout.

## Roadmap

**Phase 1 — this repo.** Core agent framework, all 11 agents, Shopify Admin API
integration, full mission-control dashboard with the neural brain visualization.

**Phase 2.** Live marketplace publishing (Amazon SP-API, Flipkart, Meesho,
Etsy), real UGC/video rendering, social auto-posting (Meta/Pinterest/YouTube
Graph APIs), LLM-backed Content/Research agents.

**Phase 3.** Customer Support Agent wired to a real inbox, Finance Agent wired
to accounting data, persistent Postgres/Supabase storage + Redis task queue,
Qdrant/Chroma-backed Memory Agent.

**Phase 4.** Voice-controlled Commander, autonomous optimization loops,
predictive analytics, multi-store/multi-company management.
