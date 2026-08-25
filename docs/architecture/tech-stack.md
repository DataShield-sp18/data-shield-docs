# Tech stack

| Layer | Technology | Notes |
| --- | --- | --- |
| Detection engine | Presidio Analyzer | Python; no remote/LLM recognizers |
| Secondary detection pass | transformers + torch, model `obi/deid_roberta_i2b2` | Local HF NER pipeline, runs alongside Presidio as a second pass — see [No-LLM guarantee](#no-llm-guarantee) |
| Medical-code family classifier | scikit-learn + xgboost + joblib | Local XGBoost on structural features; predicts a code's *system*. Advisory router only — never a membership gate. See [XGBoost model](../ml/xgboost-model) |
| Anonymization | Presidio Anonymizer | Operator application |
| NLP model | spaCy `en_core_web_lg` | Local only, no internet at runtime |
| Structured data | pandas (bespoke `DataFrameDoc` handling) | Not a wrapped Presidio engine — this project's own column-aware detection path |
| Distributed execution | `Executor` protocol: `SequentialExecutor` (default) + `SparkExecutor` (pyspark) | See [Distributed execution](../engineering/distributed-execution) |
| Pseudonym generation | Faker | Seeded for determinism |
| File parsing | pandas, openpyxl, pdfplumber, lxml, pyarrow, defusedxml | All local |
| API server | FastAPI + uvicorn | Localhost-only binding |
| Cryptography | `cryptography` (AES-256-GCM) | Encrypt operator, session vault, token map, connection secrets |
| UI | Next.js + React + Tailwind (shadcn/Radix, TypeScript) | `frontend/` |
| Token map storage | AES-GCM encrypted binary (`nonce ‖ ciphertext`) or plain JSON export | AES-GCM at rest |
| Org/user/session-log DB | PostgreSQL + SQLAlchemy 2.0 | Metadata only — never token maps or plaintext PII |
| Auth | JWT (PyJWT) in an httpOnly cookie + passlib/bcrypt | Permission-based RBAC (`org_admin`/`operator`/`auditor`, plus admin-configurable custom roles) |
| DB connector | SQLAlchemy 2.0 `create_engine` (any dialect) + `cryptography` AES-256-GCM | Per-org allowlist-gated source/sink |

## No-LLM guarantee

All detection runs locally — no LLM, no remote inference, at any stage:

- **spaCy** (`en_core_web_lg`) — installed via pip, no internet access at runtime.
- **Regex pattern recognizers** — fully offline, 26 of them (see [Detection pipeline](../engineering/detection-pipeline)).
- **Faker** — a local library, used only for pseudonym generation.
- **transformers + torch, `obi/deid_roberta_i2b2`** — a fine-tuned RoBERTa NER
  model, not an LLM. Inference runs on-device, CPU only. One caveat worth
  being precise about: the ~500MB model weights are lazy-downloaded from the
  HuggingFace Hub on first use, then cached as a singleton for the rest of
  the process's life. That's an undisclosed-until-runtime dependency on HF
  Hub *availability at first startup*, distinct from the fully bundled/pip-
  installed items above — but no inference call itself ever leaves the
  process once the weights are local.
- **XGBoost medical-code-family classifier** — trained and runs entirely
  offline against local CSV snapshots; see [XGBoost model](../ml/xgboost-model).

Explicitly excluded from the recognizer registry, by name, so they can never
accidentally get re-enabled: `LangExtractRecognizer`, `AzureAiLanguageRecognizer`,
`AhdsRemoteRecognizer` — all three are cloud-backed.

## What's Presidio, what's built from scratch

| Component | Presidio? |
| --- | --- |
| `PatternRecognizer` base class | Yes |
| Predefined recognizers (40+) | Yes |
| `SpacyNlpEngine` | Yes |
| `AnalyzerEngine` | Yes |
| `AnonymizerEngine` | Yes |
| `DataFrameDoc` handling (structured data) | **New** — bespoke pandas code, not Presidio's own structured-data extension |
| Compliance policy engine | **New** |
| File format detection/parsing | **New** |
| Session key vault | **New** |
| Deterministic token map | **New** |
| Audit logger | **New** |
| Pseudonym operator | **New** |
| Generalize operator | **New** |
| Re-identification engine | **New** |
| RoBERTa secondary detection pass | **New** — wraps `transformers` directly, not a Presidio component |
| Distributed execution (`Executor` protocol) | **New** |
| FastAPI application layer | **New** |
| Frontend (Next.js) | **New** |

Presidio supplies the analyzer/anonymizer *framework* and a first layer of
predefined recognizers; almost everything that makes this a governed,
multi-tenant, auditable, reversible platform — as opposed to a Presidio demo
script — is built on top of it.
