# Agent Instructions — System Design Content

> This repo is the owner's **learning guide and last-day interview notes**. Every system design problem
> must be generated or improved as a **step-by-step design journey**: each step shows the *trade-off we
> took*, *why we integrate the new thing*, *how the design changed*, *what improved*, and *what new problem
> appeared next* — until the production-ready design. The text must be scannable in under 5 minutes, like
> exam revision notes, not a textbook.

---

## 1. The canonical system design steps

Every problem page — and every interview answer — must follow this skeleton **in this exact order**:

1. **Functional Requirements (FR)** — what the system MUST do. Convert the vague prompt into explicit,
   numbered behaviours ("post a tweet", "see followers' recent posts").
2. **Non-Functional Requirements (NFR)** — how well it must do it, **always with numbers**: scale
   (QPS, users), latency (p95/p99), availability, consistency, durability, cost.
3. **Entities** — the core data objects and their fields (User, Tweet, Trip, Order…). Capture the
   important properties now; remaining entity properties **may be added later together with the
   design**, as the evolution chain reveals new data needs.
4. **APIs** — the endpoints / RPCs that exercise the FRs. One line each: `method + path + purpose`
   (e.g. `POST /v1/tweets — publish a tweet`, `GET /v1/timeline?userId= — fetch recent posts`).
5. **Design with Functional Requirements — again and again.** Build the simplest design that supports
   every FR, then re-check EACH FR against the design; every gap becomes a design step. Repeat until
   the design satisfies all FRs end-to-end.
6. **Design with Non-Functional Requirements — again and again.** Re-check EACH numbered NFR
   (latency, QPS, availability, storage) against the current design; every unmet NFR becomes the next
   design step (cache, queue, replication, sharding…). Repeat until all NFRs are met.

**This loop is exactly what the Design Evolution Chain in §2 narrates.** Step 5 produces the
functional steps (v0 → …), step 6 produces the scale/hardening steps. A good chain alternates:
first make the design correct for the FRs, then make it fast/available/scalable for the NFRs — and it
is only "done" when the final design passes BOTH the FR checklist and the NFR checklist.

---

## 2. The one non-negotiable format: the Design Evolution Chain

Every problem page tells a **story from naive → production**. Break it into small steps `v0 → v1 → … → vN`.
Each step adds **exactly one new component, technology, or idea**. Each step MUST answer all 5 questions:

| # | Question | What to write |
|---|----------|---------------|
| 1 | **Trade-off** | The decision point. What we chose, **plus at least one real alternative** and why we rejected it. |
| 2 | **Why integrate a new thing** | The concrete trigger — the current design's failure, bottleneck, or unmet requirement that forces this step. |
| 3 | **How the design changed** | *Before → after* in concrete terms. What component was added/removed/replaced and what its job is. |
| 4 | **What improved** | Measurable gains with numbers: latency, QPS, storage, availability, cost, consistency guarantees. |
| 5 | **New problem created** | The new trade-off / failure mode this step introduces — the hook that makes the *next* step necessary. |

**Hard rules for the chain:**

- Start from the simplest thing that barely works (v0), end with a production-grade design that meets all
  non-functional requirements.
- **Every step MUST end with "new problem"** — a step that does not create a new problem is a red flag;
  it means the chain has stopped being a real engineering narrative.
- **No leaps.** One component per step. If a step needs two new technologies, split it.
- **Every step is a requirement iteration.** Tag each step "FR #n" or "NFR #n" to show which requirement it
  satisfies — this is the §1 steps 5–6 loop made visible.
- The final step's "new problem" may be *"accepted residual trade-offs we consciously live with"* — that is
  allowed and should be stated explicitly.
- Steps should map to the **order you would actually present them in an interview** so the narrative is
  re-usable aloud.

---

## 3. Required sections on every problem page

Order is deliberate — it mirrors §1 and matches how revision notes and interviews flow:

1. **Problem** — one-liner the interviewer actually says.
2. **Functional Requirements** — numbered bullets of what the system must do.
3. **Non-Functional Requirements** — numbered targets **with numbers**: QPS, users, latency (p95),
   availability, consistency, storage.
4. **Entities** — the core data objects with their key properties. Entity properties **may be refined
   later together with the design**, as later steps reveal new data needs.
5. **APIs** — the endpoints/RPCs that exercise the FRs: `method + path + one-line purpose` per line.
6. **Design Evolution** — the step-by-step chain from §2, one card per step (this is the *core* of the page).
7. **Step Summary** — a compact table: `Step | We added | Satisfies | Improved | New problem`. Used as
   last-day quick recall.
8. **Final Design** — the vN architecture recap in ~5 bullets (each major component + one line on its job),
   plus how data flows through it.
9. **Numbers** — back-of-envelope: write/read QPS, storage/day, rough server count from the capacity estimate.
10. **Cheat Sheet / Interview talking points** — 60-second spoken summary: "Start with X, then the problem
    becomes Y, so we add Z…" meant to be said out loud in the interview.

---

## 4. Writing style rules (learning-guide + last-day notes tone)

- **Bullets over paragraphs.** Each bullet is one idea. Use `ul.points` for facts, `ol.steps` for ordered
  flows.
- **Quantify everything.** Never write "fast" — write "p95 < 200 ms". Never write "huge" — write "~1M QPS".
- **Every trade-off names its alternative(s)** and one clause on why they lost. Example:
  *"Chose **min-heap** over full sort — sort is O(n log n) and re-computes on every update; heap stays O(n log k)."*
- **Define any term inline in one clause** so a non-expert can re-read it during the interview. Example:
  *"geohash — a grid of cells that converts lat/lng to a sortable string, so nearby points share prefixes."*
- **Use short, memorable labels:** "Step 2 — Read cache (Redis)" not "Stage 2: The caching layer".
- **Repeat the chain like a story.** Each step's "Why" should refer back to the previous step's "New problem".
- **Tag every step with the requirement it serves** — "Step 3 (NFR — read latency)" — so the reader sees the
  §1 FR/NFR iteration loop happening in real time.
- **Never cut the trade-off story for brevity.** If something must shrink, shrink the Final Design / primer
  sections instead — the evolution chain is sacred.

---

## 5. Repo implementation conventions (this Angular app)

Every problem lives under `src/app/pages/system-design/<slug>/` as a lazy-loaded Angular component.

| Piece | Where / How |
|-------|-------------|
| Component folder | `src/app/pages/system-design/<slug>/` with `<slug>.ts`, `<slug>.html`, `<slug>.scss` (kebab-case slug). |
| Component class | Angular `@Component({ selector: 'app-<slug>', imports: [RouterLink, Card, Tag], templateUrl, styleUrl, changeDetection: Eager })`, empty class body. |
| Header | Copy `top-k` / `uber` header pattern: `article.content-wrapper` → `a.back-link` → `header.page-header` (icon, `h1`, tagline, `p-tag` difficulty). |
| Cards | Content body is a `div.card-stack` of `p-card` blocks. One card per design step (unless a different section demands it). |
| Step card markup | Use exactly this shape (the five questions from §2, each step tagged with the FR/NFR it satisfies): |

```html
<p-card header="Step 2 — Add read cache (Redis)">
  <ng-template #content>
    <p><strong>Triggers NFR #2 — read latency:</strong> DB queries at 20k rps push p95 > 1 s.</p>
    <ul class="points">
      <li><strong>Trade-off:</strong> cache-aside vs write-through — picked cache-aside; write-through
          adds write latency we can't afford.</li>
      <li><strong>Why add:</strong> read-heavy 9:1 ratio; the DB is the bottleneck.</li>
      <li><strong>Design change:</strong> before → app hits DB directly; after → app hits Redis first,
          falls back to DB on miss, populates cache (TTL 60 s).</li>
      <li><strong>Improved:</strong> hit ratio ~95%, p95 read drops to &lt; 10 ms, DB load to 5%.</li>
      <li><strong>New problem:</strong> cold-start misses after expiry, and stale data for 60 s on writes.</li>
    </ul>
  </ng-template>
</p-card>
```

- **Step Summary / Cheat Sheet** can be a single `p-card` with a `<table>` or tight bullet list inside.
- **Registration (mandatory, 3 spots):**
  1. Add a lazy route in `src/app/app.routes.ts` under the `path: 'system-design'` parent:
     `{ path: '<slug>', loadComponent: () => import('./pages/system-design/<slug>/<slug>').then((m) => m.PageClass), title: 'Interview App | <Problem Name>' }`
  2. Add an entry to the `problems` array in `src/app/pages/system-design/system-design.ts`
     (title, route `/system-design/<slug>`, description, difficulty, severity).
  3. Difficulty + severity convention: Easy/`success`, Medium/`warn`, Hard/`danger`.
- Reuse existing SCSS conventions from `top-k.scss` (`content-wrapper`, `back-link`, `page-header`,
  `header-tag`, `page-icon`, `card-stack`, `steps`, `points`, `status-row`); only add custom styles when
  truly needed.
- Before finishing, read `src/app/pages/system-design/top-k/*` and `uber/*` as the living style reference —
  content must feel like the same family of pages.

---

## 6. Agent workflow

### When generating a NEW problem
1. **Extract requirements first** — write down Functional Requirements, Non-Functional Requirements
   (numbered, with quantities), Entities, and APIs exactly as §1 steps 1–4 dictate.
2. **Plan the chain against the requirements** — sketch v0 → vN where every step satisfies one tagged
   FR or NFR (never a random wishlist); reject any step that has no clear "new problem" at the end.
3. Scaffold `src/app/pages/system-design/<slug>/` (`.ts`, `.html`, `.scss`) and write the content per §2–§4.
4. Register the route (app.routes.ts) and add the card (system-design.ts `problems`).
5. Build to verify: `ng build` (and `ng test` if the repo's test setup is active). Fix anything that fails.

### When IMPROVING an existing problem
1. Read the current page and its step chain first.
2. Decide the minimal edit: insert a step, deepen a step's trade-off, fix a number, or adjust the summary.
3. **Keep the chain continuous:** after an edit, re-verify each step's "Why integrate" still matches the
   previous step's "New problem", still satisfies a real tagged FR/NFR, and that "What improved / New
   problem" still feed the next step.
4. Update the Step Summary and Cheat Sheet to match any content change — stale tables are a defect.
5. Build and verify.

### Content source rules
- Prefer canonical, defensible engineering reasoning. If numbers are estimates, mark them
  (`~`, "assume", "roughly") — they are notes for an interview, not audits.
- When in doubt about a trade-off, state the mainstream default and the trade-off; don't invent exotic
  justification in the text.

---

## 7. Definition of done (checklist — all must pass)

- [ ] The page is one continuous evolution chain `v0 → vN`.
- [ ] Every step answers all five questions: **Trade-off · Why integrate · Design change · Improved · New problem**.
- [ ] Every step's "New problem" is the reason the next step exists (last step may list accepted residuals).
- [ ] Each step is tagged with the exact FR or NFR it satisfies (§1 steps 5–6).
- [ ] **Functional Requirements, Non-Functional Requirements, Entities and APIs** sections from §3 are
  present; NFR targets are numbered with quantities.
- [ ] Entity properties may be refined in later steps — allowed, but only together with the design so the
  story stays continuous.
- [ ] Numbers are consistent across the page (no contradictions between cards and summary).
- [ ] Step Summary table + Cheat Sheet exist and match the chain.
- [ ] Component follows §5 conventions; route + `problems` list updated; `ng build` passes.
- [ ] Markdown/HTML is clean, bullets-first, and can be skimmed in under 5 minutes.