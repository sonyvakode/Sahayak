# SahayakSHG — Voice-First AI Assistant for Indian Women's Self-Help Groups

SahayakSHG is a mobile-first, voice-first, multi-agent full-stack web application that helps Indian women's Self-Help Groups (SHGs) record regional-language bulk orders, calculate fair selling prices deterministically, distribute work transparently, inspect quality, track delivery risks, and approve equitable member payouts with personal audio earnings playback.

---

## Architecture Overview

### 1. Frontend (`src/`)
- **React 19 + TypeScript + Tailwind CSS v4 + React Router**
- **Welcome & Persistent Navigation Layout (`WorkflowScreenLayout`)**:
  - Default Home / Welcome Page (`/`) introducing SahayakSHG, four core capabilities, and workflow
  - 5 Independent Full-Screen Workflow Pages: `/voice-intake`, `/work-allocation`, `/order-progress`, `/payout-summary`, `/member-audio`
  - Support & Account Pages: `/help`, `/settings`, `/login`
  - Full Leader & Member Portal Routes (`/leader/dashboard`, `/leader/orders`, `/leader/pricing`, `/leader/quality`, `/leader/consolidation`, `/leader/members`, `/member/dashboard`, `/member/work`, `/member/progress`, `/member/earnings`)
- **Low-Literacy & Low-Connectivity Support**:
  - Multilingual UI & voice support (`English`, `తెలుగు Telugu`, `हिन्दी Hindi`, `ಕನ್ನಡ Kannada`)
  - Large >=44px touch targets, simple labeled icons, minimal typing
  - Offline production update queue (`localStorage`) with automatic sync and visible status (`Saved Locally`, `Pending Sync`, `Synchronized`)

### 2. Backend & Database (`server.ts`, `server/`)
- **Express REST API + SQLite (`better-sqlite3`)** with clean relational schema structured for future PostgreSQL migration (`groups`, `users`, `members`, `products`, `orders`, `pricing_records`, `work_allocations`, `tasks`, `production_updates`, `quality_inspections`, `payouts`, `audio_summaries`, `activity_ledger`).
- **Signed Session Auth & Strict Privacy RBAC (`server/middleware/auth.ts`)**:
  - Leader-only endpoints protected by `requireLeader`.
  - Member earnings and audio endpoints strictly scoped to `req.user.memberId`; cross-member earnings requests return `403 Forbidden`.
- **Append-Only Activity Ledger**: Every order creation, pricing approval, work allocation, quality inspection, offline sync, consent change, and group payout approval is recorded immutably.

### 3. Multi-Agent AI & Speech Architecture (`server/agents/`, `server/services/`)
- **Strict Separation of AI & Deterministic Math**:
  - `server/services/deterministicMath.ts` handles **all** financial totals, cost breakdowns, unit prices, piece rates, fair allocation scoring, completion percentages, and payout math (`acceptedPieces × ratePerPiece`).
  - **5 Modular Agents** (designed for future Lyzr orchestration via `server/agents/orchestrator.ts`):
    1. **Intake Agent (`intakeAgent.ts`)**: Uses `gemini-4-hydrogen` structured JSON extraction (with deterministic fallback parser) to convert regional voice transcripts into product, quantity, and deadline.
    2. **Pricing Agent (`pricingAgent.ts`)**: Computes deterministic prices and generates plain-language cost fairness explanations.
    3. **Allocation Agent (`allocationAgent.ts`)**: Scores members by capacity, skills, past workload, and availability, and generates transparent explanations for human review.
    4. **Tracking & Quality Agent (`trackingQualityAgent.ts`)**: Flags behind-schedule members and proposes leader-approved redistributions.
    5. **Payout Agent (`payoutAgent.ts`)**: Calculates payouts deterministically and prepares regional audio summaries.
- **Modular Speech Interfaces (`server/services/speechInterface.ts`)**:
  - `SpeechToTextProvider` (`gemini-3.5-transcribe` + Bhashini ULCA / Whisper adapter hooks + Demo Transcription fallback).
  - `TextToSpeechProvider` (`gemini-3.8-flash-lite-tts` WAV output + Browser Speech Synthesis & readable script fallback).

---

## Local Setup Instructions

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   Copy `.env.example` to `.env` and set your keys if available:
   ```bash
   cp .env.example .env
   ```
   - `GEMINI_API_KEY`: Optional for demo mode; required on the server for live Gemini extraction, explanations, transcription, and TTS.
   - `BHASHINI_API_KEY` / `LYZR_API_KEY`: Optional adapters for external Indian speech and Lyzr orchestration. When unset, clearly labeled **Demo Mode** fallbacks remain fully functional.

3. **Run the development server**:
   ```bash
   npm run dev
   ```
   The app and API run together on `http://localhost:3000`.

4. **Build & run in production**:
   ```bash
   npm run build
   NODE_ENV=production npm start
   ```

---

## Testing Guide (End-to-End Hackathon Demo)

### Pre-Seeded Demo Scenario (`ORD-2026-0012`)
- **Order**: `ORD-2026-0012` — `500 Cotton Bags`, `20-day deadline`
- **Members & Initial Allocation**: Anjali Devi (`125`), Lakshmi N. (`125`), Meena Kumari (`125`), Rani Bai (`125`)
- **Production**: `100 + 95 + 90 + 95 = 380 completed` (`120 pending`, `76%` completion)
- **Quality**: `360 accepted`, `20 rework`
- **Payout (`₹25/piece`)**:
  - Anjali Devi: `95 × ₹25 = ₹2,375`
  - Lakshmi N.: `90 × ₹25 = ₹2,250`
  - Meena Kumari: `85 × ₹25 = ₹2,125`
  - Rani Bai: `90 × ₹25 = ₹2,250`
  - **Total Accepted**: `360` · **Total Group Payout**: `₹9,000`

### Suggested Verification Steps
1. **Welcome & Home (`/`)**: Start at `/`, verify the hero, 4 capability cards, and workflow chain, and click **Get Started** or **Explore Demo**.
2. **Voice Intake (`/voice-intake`)**: Test Telugu/Hindi/Kannada/English samples or mic recording, extract order details, edit fields, and click **Confirm Order**.
3. **Work Allocation (`/work-allocation`)**: Review the `500 Cotton Bags` equal split (`125` each), test **Edit Allocation** and **Reset Allocation**, and click **Approve Allocation**.
4. **Order Progress & Quality (`/order-progress`)**: Inspect `380 completed`, `120 pending` (`76%`), `360 accepted`, and `20 needs rework`, and test updating completed or quality counts.
5. **Payout Summary (`/payout-summary`)**: Click **Review Payout** to verify `₹9,000` (`2,375 + 2,250 + 2,125 + 2,250`) and test **Approve Group Payout**.
6. **Member Audio Playback (`/member-audio`)**: Verify Meena Kumari's private earnings (`85` accepted × `₹25` = `₹2,125`), test **Play**, **Pause**, **Replay**, progress bar, and regional languages (`te`, `hi`, `kn`, `en`).
7. **Offline Queue & Help (`/settings`, `/help`)**: Toggle **Simulate Offline Mode** in `/settings` and verify queued sync behavior and audit ledger entries.

---

## Deployment Instructions
- **Vercel Deployment (Included `vercel.json` + `api/index.ts`)**:
  - `vercel.json` builds the Vite SPA into `dist/`, routes all `/api/*` requests to the Express serverless handler `api/index.ts`, and rewrites all React Router client routes (`/`, `/voice-intake`, `/work-allocation`, `/order-progress`, `/payout-summary`, `/member-audio`, `/help`, `/settings`, `/login`, `/leader/*`, `/member/*`) to `index.html`.
  - Set `GEMINI_API_KEY` and a strong `SESSION_SECRET` in Vercel Environment Variables. In serverless mode, SQLite automatically initializes in `/tmp/sahayakshg.db` (ephemeral demo persistence) unless `SQLITE_DB_PATH` or an external database is configured.
- **Node / Cloud Run Deployment (`server.ts`)**:
  - Ensure `NODE_ENV=production`, `GEMINI_API_KEY`, and a strong `SESSION_SECRET` are set in your host environment.
  - Run `npm run build` to bundle the React client into `dist/`.
  - Start the server with `npm start` (`node server.ts` on Node 22+ or `tsx server.ts`).
  - Mount a persistent volume for `SQLITE_DB_PATH` or connect PostgreSQL via `DATABASE_URL` when scaling beyond the prototype.
