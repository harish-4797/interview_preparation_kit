# Trao AI Interview Prep Kit

A production-ready full-stack web application and automated evaluation pipeline that turns any job description text and company website into a personalized, verified interview preparation kit.

Built according to the Trao Full-Stack Engineering Assessment Brief (**FS-AI-INTERVIEW-01**).

---

## 1. Project Overview & Tech Stack

The application accepts:
1. **Job Description Text** (pasted directly)
2. **Company Website URL** (starting domain for autonomous crawling)
3. **Number of Preparation Days** (timebox before the interview)

It executes an autonomous 11-step sequential research and generation pipeline to deliver:
- **Company Brief & Engineering Insights**: Synthesized from crawled web pages and public interview discussions.
- **Role Breakdown**: Responsibilities and prioritized requirements marked strictly as `must` or `nice`, categorized as `technical`, `behavioural`, or `domain`.
- **Categorized Question Bank**: High-signal interview questions with complete answer outlines and difficulty ratings (1, 2, 3), explicitly mapped to requirement IDs.
- **Interactive Flashcards**: Key recall concepts linked to requirement IDs.
- **Day-by-Day Study Schedule**: Deterministic arithmetic topic allocation across exactly the requested number of days, front-loading harder and must-have requirements.
- **Deterministic Coverage Matrix**: 100% code-driven set-difference validation guaranteeing no must-have requirements remain uncovered.
- **State-Preserving Builder**: Allows users to edit, reorder, add, delete, and regenerate individual sections (e.g. one question category) without destroying manual edits or pinned items.
- **Interactive Practice Mode**: Distraction-free flashcard practice with confidence-weighted spaced repetition.
- **Mock Interview Simulator (Creative Feature)**: Interactive answer simulator providing instant AI rubric evaluations, scoring, and actionable tips.

### Tech Stack Justification
| Layer | Chosen Technology | Justification |
| :--- | :--- | :--- |
| **Frontend** | **Next.js 16 + Tailwind CSS** | Preferred stack in assessment. Provides fast SSR, responsive mobile & desktop UI, component-level state boundaries, and smooth micro-animations. |
| **Backend** | **Node.js + Express + TypeScript** | Preferred stack in assessment. Clean separation of concerns between API routing, persistence, crawler engine, and generation pipeline. |
| **Database** | **MongoDB (Mongoose)** | Preferred stack in assessment. Schema accommodates nested structured kits, modification timestamps, and practice session tracking. Includes an in-memory/file fallback so the server runs out-of-the-box in zero-setup environments. |
| **LLM Provider** | **Google Gemini & Groq (with Offline Mock Fallback)** | Both providers offer genuine free tiers with high throughput (`gemini-1.5-flash`, `gemini-2.0-flash`, `llama-3.3-70b-versatile`). Automatic exponential backoff handles 429 rate limits gracefully. A built-in offline mock engine ensures all automated tests and CLI batch runs pass without external API keys. |
| **Scraping** | **Axios + Cheerio + robots-parser** | Lightweight, high-performance HTML extraction. Respects robots.txt, sanitizes prompt injections, enforces 2MB size caps, and applies semantic link ranking. |

---

## 2. High-Level Architecture

The system enforces a strict boundary between persistence, transport, and domain logic:

```
trao-ai-interview-prep-kit/
├── src/
│   ├── core/                          # Shared core domain logic (used by both API and CLI)
│   │   ├── types/                     # Appendix A & B TypeScript interfaces
│   │   ├── validator/                 # Strict Zod schema validators
│   │   ├── crawler/                   # Autonomous crawler, link ranking, SSRF protection
│   │   ├── research/                  # Company brief & interview discussion research
│   │   ├── extraction/                # Deterministic & LLM-assisted JD requirement extraction
│   │   ├── generation/                # Category-isolated question & flashcard generators
│   │   ├── coverage/                  # Deterministic code-only coverage analyzer (NO LLM)
│   │   ├── scheduler/                 # Deterministic arithmetic day scheduler (NO LLM)
│   │   ├── state/                     # Generated / Edited / Pinned state manager
│   │   ├── practice/                  # Confidence-weighted flashcard review engine
│   │   └── llm/                       # Multi-provider LLM adapter with retry & rate limiting
│   ├── server/                        # Node.js + Express backend
│   │   ├── middleware/                # JWT authentication & session handling
│   │   ├── models/                    # MongoDB Mongoose schemas with in-memory fallback
│   │   ├── controllers/               # Auth, Kit CRUD, Section Regeneration, Practice
│   │   └── app.ts / index.ts          # Express server entry point
│   ├── cli/                           # Mandatory Batch CLI
│   │   └── evaluate.ts                # Implements `npm run evaluate`
│   └── tests/                         # Automated unit & integration test suites
├── client/                            # Next.js frontend
│   └── src/
│       ├── app/                       # App router pages (dashboard, new kit, kit builder, auth)
│       └── components/                # Modular UI cards, modals, tabs, and practice views
└── package.json                       # Root workspace scripts
```

---

## 3. Autonomous Web Crawler & Link Ranking

Rather than querying a hard-coded list of paths (e.g. `/careers`), the crawler actively discovers and ranks links starting from the provided company website URL:

1. **Safety & SSRF Protection**: External URLs are validated before fetching. Private and loopback IP ranges are rejected in production mode, while local addresses (e.g. `http://localhost:8099/acme/`) are explicitly permitted during development and evaluation runs.
2. **Robots.txt Adherence**: Fetches `/robots.txt` and uses `robots-parser` to honor crawl delays and disallow directives.
3. **Semantic Link Ranking Heuristic**:
   - High-yield keywords (`+10 pts`): `interview`, `how-we-hire`, `careers`, `jobs`, `hiring`, `handbook`, `engineering`, `culture`, `about-us`.
   - Contextual keywords (`+4 pts`): `team`, `mission`, `tech-stack`, `working-at`.
   - Excluded endpoints (`-100 pts`): `login`, `signup`, `cart`, `checkout`, `privacy`, `terms`, `downloads`, `.pdf`, `.zip`.
4. **HTML Sanitization**: Cheerio removes `<script>`, `<style>`, `<nav>`, `<footer>`, and `<iframe>` elements, extracting clean semantic markdown text.
5. **Rate Limiting & Polite Backoff**: Requests are throttled with courteous delays, request timeouts (8s), and size limits (2MB). Unreachable pages or 404s are recorded in `notes` rather than aborting the pipeline.

---

## 4. Sequential Research & Generation Pipeline

The generation pipeline executes 11 deliberate, sequential steps:

1. **Step 1 — Input Ingestion**: Sanitizes JD text, company website URL, and preparation days.
2. **Step 2 — Requirement Extraction**: Analyzes the JD to extract requirements with stable IDs (`r1`, `r2`...), categorized by `kind` (`technical`, `behavioural`, `domain`) and `priority` (`must`, `nice`). *Zero hallucination policy*: If given a thin 2-line description, it outputs only what is present and flags the kit as thin.
3. **Step 3 — Company Site Crawling**: Crawls the starting domain, ranks internal links, and retrieves relevant company/about/hiring pages.
4. **Step 4 — Public Interview Discussion Analysis**: Searches for hiring process disclosures and public discussion signals. Reports honestly if no public discussions exist.
5. **Step 5 — Company Brief Compilation**: Synthesizes verified executive summary and "what they do", noting verified web sources in `sources`.
6. **Step 6 — Role Breakdown Finalization**: Generates title, seniority, and responsibilities.
7. **Step 7 — Category-Isolated Question Generation**: Genuinely separate prompt calls for `technical`, `behavioural`, `system-design`, and `company-fit` questions. Every question references the requirement IDs it assesses.
8. **Step 8 — Flashcard Generation**: Generates high-impact conceptual flashcards linked to requirement IDs.
9. **Step 9 — Deterministic Coverage Checking (CODE ONLY)**: Compares extracted requirements against question requirement IDs via set-difference logic in TypeScript. No LLM opinion is involved.
10. **Step 10 — The Second Pass (Gap-Closing Loop)**: If any requirements (especially must-haves) lack coverage, dedicated questions are generated for the gaps, merged into the kit, and re-analyzed (up to 3 passes).
11. **Step 11 — Deterministic Arithmetic Schedule Allocation (CODE ONLY)**: Distributes questions across exactly the requested number of days using application logic.

---

## 5. State Preservation Model (Generated, Edited, Pinned)

To fulfill Section 6 ("Regenerating one section must not discard edits made elsewhere"), every item (question, flashcard, brief) maintains an internal metadata record:

```typescript
export interface ItemMetadata {
  origin: 'generated' | 'manual';
  status: 'unmodified' | 'edited' | 'pinned';
  last_modified?: string;
}
```

### Regeneration Rules:
- **Pinning**: A user can click the Pin icon on any question, flashcard, or brief to lock it.
- **Manual Edits**: Any inline text modification sets `status: 'edited'`.
- **Manual Additions**: Questions added by the user receive `origin: 'manual', status: 'edited'`.
- **Category Regeneration**: When a user regenerates a single category (e.g. `technical`):
  1. All items with `status: 'pinned'`, `status: 'edited'`, or `origin: 'manual'` are **retained untouched**.
  2. Only unmodified generated items in that category are replaced.
  3. All other categories (`behavioural`, `system-design`, `company-fit`) and sections (`company_brief`, `flashcards`, `schedule`) remain 100% intact.
- **Clean Export**: When exporting or running the batch CLI, internal `_meta` attributes are cleanly stripped so the output conforms strictly to Appendix A.

---

## 6. Deterministic Schedule Allocation Algorithm

The study schedule is produced by arithmetic logic in `src/core/scheduler/scheduler.ts`:

1. **Guaranteed Day Count**: Output `schedule.days.length` equals `schedule.days_available` for any input $N \in [1, 60]$.
2. **Cognitive Load & Difficulty Front-Loading**: Questions are ranked by priority (`must` > `nice`) and difficulty (`3` > `2` > `1`). High-difficulty architecture and core technical questions land in earlier days (Days 1–2), while behavioral polish and company fit land closer to interview day.
3. **Must-Have Coverage Guarantee**: The algorithm verifies that every must-have requirement has its covering questions scheduled.
4. **Integer Durations**: Daily durations are strictly integer minutes (e.g. 45 to 120 minutes) based on difficulty coefficients ($d_3 = 30\text{m}, d_2 = 20\text{m}, d_1 = 15\text{m}$ plus review margin). No floating-point values or approximate strings.
5. **Edge Cases**:
   - **1-Day Schedule**: Condenses essential questions into an intensive single-day curriculum.
   - **60-Day Schedule**: Distributes topics smoothly, interleaving spaced repetition and mock review sessions.

---

## 7. Practice Mode (Spaced Repetition & Confidence Ordering)

Section 7 is implemented in `src/core/practice/practiceEngine.ts`:
- Flashcards are practiced one at a time with click/Spacebar to reveal the answer.
- Candidates record confidence:
  - **1: Again / Low Confidence** (Priority weight: 300)
  - **2: Hard / Medium Confidence** (Priority weight: 150)
  - **3: Good / Mastered** (Priority weight: 50)
- **Next Session Ordering**: Unreviewed cards are prioritized first to guarantee initial coverage. Cards with lowest confidence ratings bubble to the top of subsequent sessions, followed by cards reviewed longest ago.

---

## 8. Creative Feature: AI Mock Interview Simulator

Located directly inside the Kit Builder:
- Candidates can click **"Simulate"** on any interview question in the kit.
- A distraction-free answering terminal opens where the candidate types or pastes their response.
- The evaluation engine assesses the response against the question's specific `answer_outline`, difficulty level, and target requirement.
- It returns an instant **Score (1–10)**, a hiring **Verdict** (*Strong Hire*, *Hire*, *Borderline*, *Needs Improvement*), detailed constructive rubric feedback, and 3 actionable improvement tips.

---

## 9. Setup & Installation

### Prerequisites
- Node.js 18+ or 20+ (tested on Node v24)
- npm 9+

### Quick Start (Local)
```bash
# 1. Clone the repository and install dependencies
git clone <repo-url>
cd <repo-dir>
npm install

# 2. Configure environment variables
cp .env.example .env

# 3. Build server and client
npm run build

# 4. Start backend and frontend concurrently
npm run dev
```
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000`
- API Health Check: `http://localhost:5000/api/health`

---

## 10. Mandatory Batch Command (Section 9 & Appendix B)

The repository provides the exact batch command specified in Section 9:

```bash
npm run evaluate -- --input <cases.json> --output <kits.json>
```

### Example Usage
```bash
npm run evaluate -- --input data/sample-cases.json --output data/output-kits.json
```

### Input Format (`cases.json`)
```json
[
  {
    "id": "case-01",
    "jd": "Senior Full-Stack Engineer with TypeScript and React experience...",
    "company_url": "http://localhost:8099/acme/",
    "days": 5
  }
]
```

### Output Format (`kits.json` matching Appendix B)
```json
{
  "version": "1.0",
  "generated_at": "2026-09-10T05:07:06.890Z",
  "kits": [
    {
      "id": "case-01",
      "status": "ok",
      "kit": {
        "source": { "company": "Acme", "company_url": "http://localhost:8099/acme/", ... },
        "company_brief": { "summary": "...", "what_they_do": "...", "sources": [...] },
        "role": { "title": "...", "seniority": "...", "responsibilities": [...], "requirements": [...] },
        "questions": [...],
        "flashcards": [...],
        "schedule": { "days_available": 5, "days": [...] },
        "coverage": { "uncovered_requirement_ids": [], "passes": 2 }
      },
      "error": null
    },
    {
      "id": "case-04",
      "status": "failed",
      "kit": null,
      "error": {
        "code": "COMPANY_UNREACHABLE",
        "message": "Company site unreachable after retries."
      }
    }
  ]
}
```

The batch CLI executes the exact same core pipeline in-process, supports local addresses (`localhost`), follows relative links, handles failures gracefully per case without terminating the run, and requires zero external database setup.

---

## 11. Automated Testing

Run the comprehensive test suite covering all critical deterministic behavior:

```bash
npm test
```

### Test Suites Included:
1. `src/tests/scheduler.test.ts`: Verifies exact day distribution for $N=1, 5, 60$, integer minutes, must-have coverage, and front-loaded difficulty.
2. `src/tests/coverage.test.ts`: Tests deterministic code coverage checking and second-pass gap-closing loops.
3. `src/tests/validator.test.ts`: Validates exact Appendix A kit and Appendix B batch schemas.
4. `src/tests/state.test.ts`: Tests state preservation (ensuring pinned and edited items survive category regeneration).
5. `src/tests/crawler.test.ts`: Tests semantic link ranking, SSRF validation, and graceful 404/unreachable skipping.
6. `src/tests/api.test.ts`: Tests authentication, kit creation, retrieval, and practice review endpoints.

---

## 12. Design Decisions, Trade-Offs & Known Limitations

- **Decoupled Core Pipeline**: The core engine in `src/core/` has zero dependency on Express or MongoDB, allowing both the HTTP server and the `npm run evaluate` CLI to run identical retrieval and validation code.
- **In-Memory Persistence Fallback**: If MongoDB is not reachable locally, the server seamlessly falls back to in-memory persistence so evaluation never fails due to environment dependencies.
- **Deterministic vs LLM Responsibilities**: Topic scheduling and coverage validation are strictly arithmetic code. LLMs are never asked "is this covered?" or "distribute these days" to eliminate hallucinations and schema drift.
- **Known Limitations**: Extremely dynamic SPA websites using heavy client-side JavaScript (e.g. canvas-based sites) may yield less text than server-rendered HTML. In these cases, the pipeline falls back honestly to the provided job description and logs the unreachable hiring page.
