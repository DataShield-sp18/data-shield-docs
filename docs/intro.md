---
slug: /
sidebar_position: 1
---

# Data Shield — stakeholder briefing

This site is a stakeholder-facing view into **Data Shield**, a local-first PII/PHI
de-identification pipeline. It's for people who want the current status, the
architecture at a readable level, the compliance story, and a record of what's
been decided and why — without cloning a repository.

## Current status

Data Shield is a **proof of concept**. It is not yet in front of external customers.
The engineering lead has reviewed a live demo and asked for the product to be
designed for scalability going forward — that direction is recorded in
[Architecture → Deployment](./architecture/deployment).

## How this site is organized

- **[Product](./product/scope)** — what the product does and deliberately does not do.
- **[Architecture](./architecture/overview)** — how data moves through the system,
  today's deployment shape, the auth/organization model, and the security posture.
- **[Features](./features/deidentification-workflow)** — how each feature actually
  works, one flowchart per feature.
- **[Compliance](./compliance/regulations)** — which regulatory frameworks are
  implemented today, and what each one actually does to the data.

A decision log (a record of what's been decided and why) is planned but not
built yet — it's being held until the engineering lead has weighed in on
format.

## What this site is not

- Not a product requirements document. Target customer, market sizing, and
  timeline/cost are intentionally not written yet — the project is too early
  for those numbers to mean anything, and this site would rather say nothing
  than assert something invented.
- Not the engineering knowledge base. Implementation detail, file-level
  references, and day-to-day engineering plans live in the
  [Data Shield wiki](https://github.com/DataShield-sp18/data-shield/tree/main/.wiki)
  in the main repository — that's where engineers and coding agents work from.
  This site links out to it rather than duplicating it.
- Not indexed for search, and not access-controlled. It's reachable by anyone
  with the link. That's a deliberate, known tradeoff for this early stage —
  see the note in [Architecture → Security](./architecture/security).
