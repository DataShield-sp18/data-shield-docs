# Scope

## What Data Shield does

Data Shield takes a file (text, spreadsheet/table, or structured document), finds
personally identifiable and protected health information in it, and produces a
de-identified copy — entirely on the machine running it. There is no cloud service
in the loop and no third-party LLM call: detection runs on a local NLP model
(Presidio + spaCy) and every transformation happens in-process.

The pipeline, at a glance:

```
File Upload → Ingestion → Detection → Operator Assignment → De-identification → Output
                                                                      ↕
                                                              Re-identification (reversible ops only)
```

- **Ingestion** — parses whatever format came in (plain text, CSV/spreadsheet-style
  data, or a document tree) into one internal representation.
- **Detection** — finds PII/PHI spans and scores each one.
- **Policy** — a chosen compliance policy (HIPAA, GDPR, CCPA, PCI-DSS, or SOC 2)
  decides which transformation applies to each kind of entity.
- **De-identification** — applies that transformation: mask, tokenize, encrypt,
  hash, pseudonymize, generalize, suppress, redact, or leave as-is.
- **Output** — writes the result back in the original format, plus an audit log.
- **Re-identification** — for the subset of transformations that are reversible
  (tokenize, encrypt), the original value can be recovered by someone holding the
  right key material. Irreversible transformations (hash, mask, suppress, redact,
  generalize) cannot be undone by design.

## What it handles today

- **10 file formats**: CSV, TSV, Excel (`.xlsx`), JSON, JSONL, XML, plain
  text, SQL dump, Parquet, and text-only PDF. See
  [Ingestion and formats](../engineering/ingestion-and-formats).
- **Database sources and sinks**, not just files — an organization can read
  directly from its own database (allowlist-gated, credentials encrypted
  at rest) and write de-identified output straight back to a sink table.
  See [Connections](../features/connections).
- **5 built-in compliance policies** (HIPAA Safe Harbor, GDPR, CCPA,
  PCI-DSS, SOC 2) plus organization-defined custom policies with the same
  fail-closed guarantees. See [Compliance](../compliance/regulations) and
  [Custom policies](../features/custom-policies).
- **9 de-identification operators**: mask, tokenize, generalize, suppress,
  pseudonym, hash, encrypt, keep, redact. See
  [Policy and operators](../engineering/policy-and-operators).
- **Detection beyond generic NER**: 26 regex pattern recognizers, a
  ~130-entry field-name heuristic table, medical-code structural/checksum
  validators, an XGBoost advisory layer for code-family disambiguation, and
  a RoBERTa secondary pass over free text. See
  [Detection pipeline](../engineering/detection-pipeline).
- **Multi-tenant from the ground up**: organizations, invites, three fixed
  roles, and org/private/shared visibility for sessions, connections, and
  policies. See [Auth & organizations](../architecture/auth-and-organizations).
- **Distributed execution**: the same pipeline runs sequentially in-process
  or across a Spark cluster, chosen per organization. See
  [Distributed execution](../engineering/distributed-execution).

## What it deliberately does not do

- **No cloud egress.** Detection and every transformation happen locally. Nothing
  about a document's content is sent to an external API as part of processing.
- **No PRD-level commitments yet.** This is a POC. Target customer, market
  positioning, pricing, and delivery timeline are not written down anywhere yet —
  writing them now would mean inventing numbers for a project that hasn't been
  scoped that far. That work starts once there's a mandate to build toward it.
- **No LAN/public exposure by default.** The service binds to localhost only,
  outside of an explicit, opt-in developer-testing exception. See
  [Architecture → Security](../architecture/security) for the exact boundary.
