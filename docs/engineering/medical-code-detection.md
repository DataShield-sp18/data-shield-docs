# Medical-code detection

Healthcare data carries standardized codes — diagnosis, procedure, drug,
provider identifiers — that need very different handling than generic PII:
they're often *not* sensitive on their own (a diagnosis code is clinical
signal, not an identifier) and they need to be recognized precisely, because
mislabeling them either destroys clinical utility (redacting a code that
should stay) or leaks PHI (missing a provider name attached to one).

## Categories covered

| Category | System | Data Shield treatment |
| --- | --- | --- |
| Diagnosis codes | ICD-10-CM | Public clinical code — excluded from redaction |
| Procedure codes | ICD-10-PCS, HCPCS Level II | Public clinical code — excluded from redaction |
| Modifiers | HCPCS/CPT modifiers (25, 59, LT, RT, TC, 26) | Preserved — needed for billing integrity |
| Drug codes | FDA NDC, RxNorm/RxCUI | Public drug code — excluded from redaction |
| Referring/rendering providers | CMS NPPES registry (NPI + name) | **Identifiable PHI** — flagged `PERSON` / `US_NPI` |

The asymmetry matters: a diagnosis code is public clinical vocabulary and
stays in the output; a provider's name and NPI attached to that same record
are PHI and get de-identified like any other detected entity.

## Two independent layers, doing different jobs

### 1. The exact-match + structural/checksum tier — authoritative

Local CSV snapshots (`backend/app/data/medical_codes/`) provide exact-match
lookup for each code family. Because those snapshots are point-in-time and
can never be fully exhaustive (source APIs cap results; some registries ship
empty), a second, structural tier catches well-formed codes the lookup
misses — always at a lower score than an exact hit, so it can never
outrank one:

| Entity | Validator | Fallback score | Rule |
| --- | --- | --- | --- |
| `PROVIDER_NPI` | `is_valid_npi` | 0.75 | Luhn mod-10 checksum over `80840` + the first 9 digits — a real checksum, not just shape |
| `ICD10_CODE` | `is_valid_icd10` | 0.60 | CM shape or PCS shape (7 chars, no `I`/`O`) |
| `HCPCS_CODE` | `is_valid_hcpcs` | 0.60 | Letter + 4 digits |
| `NDC_CODE` | `is_valid_ndc` | 0.55 | Hyphenated 3-segment or bare 10–11 digits |
| `RXNORM_CODE` | — (lookup-only) | — | A bare RXCUI is any integer — a validator here would flood false positives |
| `MODIFIER_CODE` | — (lookup-only) | — | Two characters carry no distinctive structure to validate |

An exact lookup hit (score 0.95) always outranks a structural hit, and
structural hits stay capped below 0.9 so they never short-circuit the
RoBERTa pass.

**Why not just train a model to recognize codes directly?** Code detection
is exact set-membership over closed, published dictionaries — 100%
precision by construction, if the lookup is complete. A learned classifier
adds false-negative risk (a missed code is a compliance violation) and
destroys auditability, for no upside over a deterministic check. This is
also the reasoning behind rejecting the same idea when it was proposed as a
scaling shortcut — see the next section for what *is* built with ML here,
and why it's structurally incapable of causing that failure mode.

### 2. The XGBoost family classifier — advisory only, never a gate

A small XGBoost model predicts which code *family* a code-shaped string
belongs to, from structural features alone — see
[XGBoost model](../ml/xgboost-model) for the full model detail and real
training output. It answers *"if this is a code, which system?"*, never
*"is this actually a code?"* — it has no negative class, so it cannot
replace the membership check at any confidence level.

Where it's wired in: `DetectionEngine._advisory_family_entities`, called
right after the normal Presidio pass, only for tokens that:

1. Look code-shaped (2–12 characters, at least one digit) — this filter
   runs *before* the model is called, since without it every plain English
   word would get a confident-looking (and meaningless) family label.
2. Aren't already claimed by a lookup/validator hit.

A hit emits a `MEDICAL_CODE_CANDIDATE` entity capped at 0.3 confidence —
always below the 0.5 auto-apply threshold, so it can never drive an
operator decision on its own, by construction, regardless of policy
configuration.

**Scoped deliberately narrow:** this only runs on the text/JSON/XML/PDF
path (`_analyze_single`), not the DataFrame column path. The DataFrame path
has its own per-column majority-vote score boost, which could push an
advisory-only signal above the cap it's designed to respect — wiring it in
there needs its own design pass and hasn't been done.

### A known, accepted limitation

A purely numeric 7-character ICD-10-PCS code and a 7-digit RxNorm RXCUI have
the identical shape — no letter to tell them apart structurally. The model
leans RxNorm on these (far more numeric examples in training), affecting
about 0.33% of PCS codes (264 of 79,115) in the training data; the other
99.67% carry a letter and classify correctly. Because the classifier is
advisory-only, this misroute can never cause a leak — the exact-match set
and validators remain authoritative regardless of what the model guesses.

## A real cross-library conflict, and how it's handled

XGBoost bundles its own OpenMP runtime; the app already loads `torch` for
the RoBERTa recognizer. Two OpenMP runtimes co-existing in one process
reliably crashes on macOS (`SIGSEGV`, "libomp already initialized") once
both libraries actually run inference in the same process — not just a
theoretical risk, reproduced as an actual crash during development. Setting
`KMP_DUPLICATE_LIB_OK=TRUE` alone does not fix it. The real fix is
`OMP_NUM_THREADS=1`, set before either library can load, in every place a
process might load both: the API app's entry point, the test suite's entry
point, and both backend Docker images (Spark task subprocesses inherit only
the container's OS environment, not anything set inside the Python process).
Forcing both libraries to a single thread means neither ever spins up a
thread pool to collide over.
