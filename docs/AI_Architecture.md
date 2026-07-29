# AI Architecture

## SHRANIX Krushi ERP — Enterprise AI Platform

---

## Overview

The AI Platform provides multi-provider AI capabilities across all ERP modules through a provider-agnostic architecture. The system supports OpenAI, Google Gemini, Anthropic Claude, and local LLMs (Ollama) — with automatic fallback, circuit breaker protection, and audit logging.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     AI Module                           │
│  ┌──────────────────────────────────────────────────┐  │
│  │                  AiController                    │  │
│  │  22 REST endpoints (copilot, query, insights,    │  │
│  │  forecasts, document, automation, admin)          │  │
│  └──────────┬───────────────────────────────────────┘  │
│             │                                          │
│  ┌──────────▼───────────────────────────────────────┐  │
│  │                 AiService                        │  │
│  │  Orchestration: Injection Check → Data Mask →   │  │
│  │  Circuit Breaker → Provider Call → Audit Log    │  │
│  └──┬──────────┬──────────┬──────────┬──────────────┘  │
│     │          │          │          │                  │
│  ┌──▼──┐  ┌───▼───┐  ┌──▼────┐  ┌──▼───────────┐   │
│  │PGS  │  │ DMS   │  │ CBS   │  │ AiAudit      │   │
│  │     │  │       │  │       │  │              │   │
│  │Inj. │  │ Mask  │  │Circ.  │  │ Audit +      │   │
│  │Det. │  │11 pat.│  │Brk.   │  │ Security     │   │
│  └─────┘  └───────┘  └──┬────┘  └──────────────┘   │
│                         │                            │
│              ┌──────────▼──────────┐                 │
│              │  Provider Layer     │                 │
│              │  ┌────┬────┬──────┐ │                 │
│              │  │OpenAI│Gemini│   │ │                 │
│              │  │Claude│Ollama│   │ │                 │
│              │  └────┴────┴──────┘ │                 │
│              └─────────────────────┘                 │
│                         │                            │
│              ┌──────────▼──────────┐                 │
│              │  Fallback Provider  │                 │
│              │  (if configured)    │                 │
│              └─────────────────────┘                 │
└─────────────────────────────────────────────────────────┘
```

---

## Provider Abstraction

All providers implement the `AiProvider` interface:

```typescript
interface AiProvider {
  name: string;
  model: string;
  complete(request: AiCompletionRequest): Promise<AiCompletionResponse>;
  healthCheck(): Promise<{ available: boolean; latencyMs: number }>;
}
```

### Supported Providers

| Provider | Package | Default Model | Features |
|---|---|---|---|
| OpenAI | openai | gpt-4o-mini | Best general purpose, function calling |
| Gemini | @google/generative-ai | gemini-2.0-flash | Fast, cost-effective |
| Claude | @anthropic-ai/sdk | claude-3-haiku | Strong at analysis, safe defaults |
| Ollama | fetch (local HTTP) | llama3.2 | Local/offline, no API key needed |

### Provider Selection

Configured via `AI_PROVIDER` environment variable. Dynamic switching available through:
```
POST /api/ai/provider/switch { "provider": "gemini" }
```

---

## Security Layers

### 1. Prompt Injection Protection (PromptGuardService)

- 20 injection patterns detected (system override, jailbreak, DAN mode, code injection, script tags)
- 10,000 character input limit
- Control character removal and whitespace normalization
- Security violation audit logging on detection

### 2. Data Masking (DataMaskService)

- 11 sensitive data patterns masked before sending to AI providers
- Role-aware masking (admin role bypasses for debugging)
- Patterns: email, phone, PAN, GSTIN, bank accounts, card numbers, API keys, passwords, tokens, JWT secrets, IFSC codes

### 3. Circuit Breaker (CircuitBreakerService)

- 30-second timeout via AbortController
- 2 retries with exponential backoff (1s, 2s, 4s max)
- Automatic fallback to configured secondary provider
- 5 consecutive failures → open circuit (30s cooldown) → half-open → closed on recovery

### 4. Audit Logging (AiAuditService)

- Every AI interaction logged: provider, model, tokens, latency, success/failure
- Security violations logged as critical severity
- Integration with existing AuditService

---

## Service Layer Integration

All AI service endpoints use `AiService.complete()` which orchestrates:

1. **Rate Limit Check** — Configurable requests per minute
2. **Prompt Injection Detection** — Rejection with security audit
3. **Data Masking** — Sensitive data redaction
4. **Circuit Breaker** — Timeout, retry, fallback protection
5. **Provider Call** — Primary or fallback provider
6. **Token Tracking** — Usage statistics per provider/model
7. **Audit Logging** — Success/failure always logged

---

## Permissions

| Permission | Scope |
|---|---|
| `ai.chat` | Chat with AI Copilot, view conversations |
| `ai.query` | Natural language ERP queries |
| `ai.insights` | View AI-generated business insights |
| `ai.predict` | View forecasts and predictions |
| `ai.documents` | AI document analysis |
| `ai.automation` | AI automation suggestions |
| `ai.admin` | Provider switching, usage stats, template management |

All permissions auto-seeded to Administrator role on module initialization.

---

## MCP Readiness

The `McpToolsService` provides abstractions for future Model Context Protocol (MCP) servers:

- 9 ERP tools with typed parameters
- Tool definitions compatible with MCP manifest format
- Ready for external AI agent integration

---

## Endpoints

| Method | Path | Permission | Description |
|---|---|---|---|
| POST | /api/ai/copilot/chat | ai.chat | Chat with AI Copilot |
| POST | /api/ai/copilot/explain-report | ai.chat | Explain a report |
| POST | /api/ai/copilot/explain-kpi | ai.chat | Explain a KPI |
| POST | /api/ai/query | ai.query | Natural language query |
| GET | /api/ai/insights | ai.insights | Get business insights |
| GET | /api/ai/insights/:category | ai.insights | Category-specific insights |
| GET | /api/ai/forecast/sales | ai.predict | Sales forecast |
| GET | /api/ai/forecast/purchases | ai.predict | Purchase forecast |
| GET | /api/ai/forecast/revenue | ai.predict | Revenue forecast |
| GET | /api/ai/forecast/cashflow | ai.predict | Cash flow forecast |
| GET | /api/ai/forecast/inventory | ai.predict | Inventory forecast |
| POST | /api/ai/document/analyze | ai.documents | Document analysis |
| POST | /api/ai/document/suggest-tags | ai.documents | Document tag suggestions |
| POST | /api/ai/automation/suggestions | ai.automation | Automation suggestions |
| POST | /api/ai/automation/approval-routing | ai.automation | Approval routing suggestions |
| GET | /api/ai/health | (public) | Provider health check |
| GET | /api/ai/usage | ai.admin | Usage statistics |
| GET | /api/ai/usage/by-provider | ai.admin | Per-provider stats |
| GET | /api/ai/conversations | ai.chat | User conversation list |
| GET | /api/ai/conversations/:id | ai.chat | Conversation history |
| DELETE | /api/ai/conversations/:id | ai.chat | Delete conversation |
| POST | /api/ai/provider/switch | ai.admin | Switch AI provider |
| GET | /api/ai/templates | ai.admin | List prompt templates |
