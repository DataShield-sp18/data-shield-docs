# Build prompt — Data Shield stakeholder documentation site

Hand this whole file to a Claude Code session with cwd = this repo
(`data-shield-docs`, sibling to `data-shield` at `../data-shield`) and let it execute.

## 0. What this is, and what it is not

This repo is a **new, separate, stakeholder-facing documentation site** for Data Shield
(a local-first PII/PHI de-identification product). It is NOT a replacement for either of
the existing doc systems in `../data-shield`:

- `../data-shield/.wiki/` — the Obsidian vault, engineer/agent knowledge base. Stays as-is,
  stays the source of truth for engineering. This new site **links to it, never copies
  wholesale** — if a fact changes there, this site should point at it, not duplicate a
  paragraph that will rot.
- `../data-shield/user_docs/` — the end-user manual (Docusaurus, for people using the
  running app). Different audience, different purpose. Leave untouched.

This new site's audience is **leadership / stakeholders who will not clone a repo** —
product status, architecture at a readable altitude, the compliance story, and a decision
paper trail. No product-strategy PRD content yet (explicitly deferred — too early for a
POC-stage project; do not write one, do not invent target-customer/market/timeline content).

## 1. Tech stack — decided, do not re-litigate

- **Docusaurus** (not MkDocs/Material, not Zensical). Reasoning already settled: the
  MkDocs/Material ecosystem has a live maintenance-mode risk (Material for MkDocs entered
  maintenance mode Nov 2025, MkDocs core unmaintained since Aug 2024, a future MkDocs 2.0
  will break the theme with no migration path); Zensical, its designated successor, is
  still alpha with no confirmed search/versioning parity. Docusaurus is mature, has
  built-in versioning, and the team already operates it (`user_docs/`).
- Add `@docusaurus/theme-mermaid` and enable it in `docusaurus.config.js`
  (`markdown: { mermaid: true }`, theme in `themes: ['@docusaurus/theme-mermaid']`) —
  Docusaurus does not render Mermaid natively without this plugin.
- **Visually distinct from `user_docs/`.** Do not reuse its color scheme, logo treatment,
  or navbar layout. Check `../data-shield/user_docs/` (its Docusaurus config / CSS) first,
  then deliberately choose a different primary color, font pairing, and homepage layout so
  nobody confuses "the user manual" with "the stakeholder site" from a screenshot alone.
- **Hosting: GitHub Pages**, via `docusaurus deploy` or a GitHub Actions workflow
  (`actions/deploy-pages`). **No auth layer.** Add a `static/robots.txt` with
  `Disallow: /` on all user-agents — this is a deliberate, already-made decision
  (unlisted-URL protection only, not real access control; the team accepted that
  tradeoff for this POC stage after being told explicitly what it does and does not
  protect against).
- Repo is public. Do not add anything here that wouldn't be fine as a public URL someone
  stumbles onto — if a page needs real confidentiality, flag it instead of writing it.

## 2. Source of truth — where to pull content from

Everything below must be **sourced from the actual repo/wiki content**, not invented.
Primary sources, all relative to `../data-shield/`:

- `CLAUDE.md` (root) — architecture summary, security constraints, commands, layer list.
- `.wiki/README.md` — navigation index, points to every other wiki page.
- `.wiki/Engineering/Server-Authoritative-Session-State.md` — session/job state model,
  the wrapped-session-key decision (§12, "signed off" 2026-08-11), the TB-scale DB-connector
  decision (§10, "Answered: DB connector only for large/TB-scale data").
- `.wiki/Engineering/Row-Block-Chunking-Plan.md` and
  `.wiki/Engineering/Server-Authoritative-Session-State.md` §10.3 — the
  reversible-mode-disabled-above-spill-threshold decision.
- `backend/app/engines/policy/policies.py` — the five compliance policies actually
  implemented: `HIPAA_SAFE_HARBOR` (45 CFR 164.514(b)(2)), `GDPR`, `CCPA`, `PCI_DSS`,
  `SOC_2`. Read each policy's docstring/comment block for what it actually maps
  (entity → operator) — summarize accurately, don't guess at coverage.
- `.wiki/Engineering/Dependency-Graph.md` — for the architecture/deployment page's
  component map.
- **BYOC-deferred / we-host-compute decision**: this discussion happened on the
  `feat/scaleable-archiecture` branch of `data-shield`, not on `main`/`dev`. Before
  writing this as a decision record, run
  `git -C ../data-shield log feat/scaleable-archiecture --oneline -5` and
  `git -C ../data-shield show feat/scaleable-archiecture:.wiki/Engineering/Scalable-Deployment-Architecture-Discussion.md`
  to confirm it still exists and read its actual current content there — do not source
  this one from memory of a prior chat transcript, verify against that branch directly.

**Hard rule: if a claim can't be traced to one of the above, don't assert it.** Where the
real answer is "not yet decided" or "not yet measured," say that plainly rather than
smoothing it over — this is a compliance product; false confidence in its own docs is the
one failure mode worth being paranoid about.

## 3. Site structure to build

```
docs/
├── intro.md                     — what Data Shield is, current status (POC), how to
│                                   navigate this site, link back to .wiki/ for engineers
├── product/
│   ├── scope.md                 — what it does / deliberately doesn't do (no PRD numbers)
│   └── stakeholders.md          — LEAVE AS TODO SCAFFOLD, see §4 below
├── architecture/
│   ├── overview.md              — the 5-layer pipeline (ingestion → detection → policy →
│   │                               operators → output, + reid), as a Mermaid diagram
│   ├── data-flow.md             — the de-identification request lifecycle: upload →
│   │                               analyze → deidentify → (reidentify) → download,
│   │                               as a Mermaid sequence or flow diagram
│   ├── deployment.md            — today's topology (single-process, localhost-only /
│   │                               Docker loopback-bound) + the proposed scale-out
│   │                               direction (small-box API + queue + large-box Spark
│   │                               cluster) — label the scale-out part clearly as
│   │                               "proposed / under discussion," not shipped
│   └── security.md              — the security posture: localhost-only binding,
│                                   raw-uploads-never-touch-disk-unencrypted, AES-256-GCM
│                                   for encrypt/vault, audit log hashes not plaintext,
│                                   no cloud egress, CORS allowlist. Frame as selling
│                                   points, written for a non-engineer reader.
├── decisions/
│   ├── index.md                 — decision log table: ID, date, decision, driver,
│   │                               approver, status, link to the DR page
│   ├── DR-0001-tb-scale-db-connector-only.md
│   ├── DR-0002-reversible-mode-disabled-above-spill-threshold.md
│   ├── DR-0003-org-master-key-wraps-session-keys.md
│   └── DR-0004-we-host-compute-byoc-deferred.md   — only write this one after
│                                                      verifying it per §2 above
└── compliance/
    └── regulations.md           — HIPAA / GDPR / CCPA / PCI-DSS / SOC 2, what's actually
                                    implemented per policies.py, not a generic checklist
```

Each DR page follows this header block (matches the format already agreed with the team):

```
**Doc ID:** DR-000X
**Status:** Approved
**Driver:** <from source — e.g. "Rohit" for the three 2026-08-11 decisions>
**Approver:** —  (leave as em-dash / TODO if not recorded anywhere — do not invent a name)
**Date:** <actual date from the source, e.g. 2026-08-11>
**Related:** <link to the specific .wiki/ page + section this came from>
```

Then: Context (what problem forced the decision) → Decision (one sentence, unambiguous) →
Consequences (what this rules out or commits to). Keep each DR under ~200 words — it's a
record, not an essay.

## 4. The one deliberate gap — do not fill it in

`product/stakeholders.md` — the actual names of stakeholders and who approves decisions
have **not been provided**. Write the page with the right shape (a table: Name | Role |
Approves) but leave every row as `TODO` rather than inventing plausible-sounding people.
Same for the `Approver` field on any DR where no approver is recorded in the source —
leave it `—`, don't backfill it with a guess.

## 5. Style

- Plain Markdown, no MDX-specific tricks unless Docusaurus requires them for Mermaid.
- Write for someone who will not open the codebase: no file:line references in this
  site (that's what `.wiki/` is for) — describe behavior, link to `.wiki/` pages by URL
  when a reader might want the engineering depth.
- No invented metrics, timelines, or costs anywhere on this site.
- No emojis.
- Once built, run `npm run build` locally to confirm it compiles before considering this
  done, and note in the final summary anything left as TODO/unresolved (stakeholder names,
  the DR-0004 branch-verification step, approver fields).
