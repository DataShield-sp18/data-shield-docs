---
slug: /
sidebar_position: 1
---

# Data Shield

Local-first PII/PHI de-identification platform

## The problem

Organizations that hold personal or health data constantly need to move it
somewhere it can be safely used — analytics, a support ticket, a data
science notebook, a vendor's system, a lower environment — without carrying
the original PII/PHI along with it. Today that problem gets solved badly, in
one of three ways:

1. **A one-off script.** Someone writes a regex pass over a CSV export.
   It's fast to build and impossible to govern: no audit trail, no
   consistent rule set across runs, no record of who ran it or what policy
   they applied, and it silently breaks the moment the data doesn't look
   exactly like it did when the script was written.
2. **A cloud/LLM-based de-identification service.** This solves the
   governance problem but reintroduces the exact risk the whole exercise was
   meant to avoid — the raw PII/PHI now has to leave the organization's own
   infrastructure to be processed, sent to a third party (and often a model
   provider) as a precondition of protecting it.
3. **Manual review.** Someone reads the file and redacts by hand. It doesn't
   scale past a handful of small files, and human review of PHI has its own
   privacy problems.

None of these three give a compliance-minded organization what it actually
needs: a repeatable, auditable, on-premises process that multiple people can
use safely, on files _and_ databases, at real data volumes, without shipping
sensitive data anywhere.

## The solution

**Data Shield finds and transforms PII/PHI in files, database tables, and
structured exports — then runs that as a governed, auditable, multi-user
workflow instead of a one-off script, entirely on infrastructure you
control.**

Concretely:

- **Detection runs entirely on-device.** A local NLP pipeline (Presidio +
  spaCy + a fine-tuned RoBERTa model, plus purpose-built pattern
  recognizers and medical-code validators — see
  [Detection Pipeline](./engineering/detection-pipeline)) finds PII/PHI
  without a single call to a cloud API or an LLM. Nothing about a file's
  content, a detected entity, or a token map is ever sent to a third party.
- **The user picks a compliance policy** — HIPAA Safe Harbor, GDPR, CCPA,
  PCI-DSS, SOC 2, or a custom one their organization defines — and Data
  Shield maps every detected entity to a concrete transformation under that
  policy: mask, tokenize, encrypt, hash, pseudonymize, generalize, suppress,
  redact, or (for confirmed non-PII) keep.
- **The result is governed, not just transformed.** Every run produces a
  full audit log, is scoped to an organization with role-based access
  control, and — for the operators that support it — can be reversed later
  by someone holding the right key material. Everyone else only ever sees
  the de-identified version.
- **It scales past a laptop.** The same pipeline that handles a small CSV
  upload can run distributed across a Spark cluster for large files or
  database-scale jobs, through a swappable execution seam that makes
  distribution a configuration choice, not a rewrite.
- **The one rule nothing is allowed to violate: never leak on uncertainty.**
  Every compliance policy has a mandatory fallback rule, every ambiguous
  field name is treated as a possible identifier rather than ignored, and
  every conflict between detectors resolves toward the more specific, more
  protective answer. See [Fail-closed design](./engineering/detection-pipeline#fail-closed-by-construction).

## Current status

Data Shield is a working system with a real detection pipeline, a full
multi-tenant application (auth, roles, organizations, sharing), a working
Spark execution path, and five implemented compliance policies — see
[Architecture](./architecture/overview) for how it's built and
[Features](./features/deidentification-workflow) for how each part behaves.

## How this Documentation is organized

- **[Product](./product/scope)** — what the product does and deliberately does not do.
- **[Architecture](./architecture/overview)** — how data moves through the system,
  the tech stack, today's deployment shape, the auth/organization model, and the
  security posture.
- **[Engineering](./engineering/detection-pipeline)** — the deep internals: the
  detection pipeline, medical-code handling, ingestion, the policy/operator
  engine, the secure output layer, and how distributed execution actually works.
- **[Features](./features/deidentification-workflow)** — how each user-facing
  feature actually behaves, one flowchart per feature.
- **[Cloud](./cloud/aws-architecture)** — what a self-hosted AWS deployment would look like,
  under discussion and not yet committed.
- **[Machine learning](./ml/xgboost-model)** — the XGBoost medical-code-family
  classifier: what it does, why it's advisory-only, and real output from its
  own training run.
- **[Operations](./operations/environment-variables)** — every environment
  variable the system reads, and the test suite / coverage picture.
- **[Compliance](./compliance/regulations)** — which regulatory frameworks are
  implemented today, and what each one actually does to the data.

A decision log (a record of what's been decided and why) is planned but not
built yet — it's being held until the engineering lead has weighed in on
format.

This Documentation links to the [Data Shield wiki](https://github.com/DataShield-sp18/data-shield/tree/main/.wiki)
in the main repository rather than duplicating it wholesale — that wiki is
still where engineers and coding agents work day to day, with file:line-level
detail this site intentionally doesn't carry.

Not indexed for search, and not access-controlled — reachable by anyone with
the link. A deliberate, known tradeoff for this stage; see
[Architecture → Security](./architecture/security).
