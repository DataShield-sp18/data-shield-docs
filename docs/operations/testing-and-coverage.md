# Testing and coverage

## How the suite is organized

| Layer | Location | File count | What it covers |
| --- | --- | --- | --- |
| Unit | `backend/tests/unit/` | 52 files | Isolated logic — no HTTP, no disk I/O, no live database. Detection recognizers, operators, policy resolution, the token map, the vault, the XGBoost feature pipeline, and more, each in isolation. |
| Integration | `backend/tests/integration/` | 29 files | A real FastAPI app via `TestClient`, hitting the real detection and operator stack end to end — auth flow, session activity, DB connector API, audit-entry pagination, policy sharing, WebSocket cluster status, and more. |

**No mocking of the detection engine or operators, anywhere in the suite.**
This is a deliberate project rule, not an oversight — a prior incident saw
mocked tests pass while the same code diverged from production behavior in
a way the mocks masked entirely. Every test in this suite runs the real
pipeline.

## Configuration

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = "-q --cov=app --cov-report=term-missing"
markers = ["slow: marks tests as slow (spark/cluster)"]
```

Coverage runs automatically on every `pytest` invocation — there's no
separate opt-in flag, and `--cov-report=term-missing` means a plain local
run already reports exactly which lines went uncovered, not just a
percentage.

## Running it

```bash
cd backend
source .venv/bin/activate
pytest                        # full suite, unit + integration, with coverage
pytest tests/unit/            # unit only
pytest tests/integration/     # integration only
pytest -k "test_name"         # a single test by name
pytest -m "not slow"          # skip Spark/cluster-marked tests
```

Two environment quirks worth knowing before running this locally:

- **`OMP_NUM_THREADS=1` should be set before the process starts.** XGBoost
  and torch each bundle their own OpenMP runtime; running both in the same
  process without this can segfault on macOS. See
  [Medical-code detection](../engineering/medical-code-detection) for the
  full story.
- **A fresh checkout's virtualenv needs `defusedxml`, `xgboost`, `scikit-learn`,
  and `joblib` installed** (all declared in `requirements.txt`/`pyproject.toml`) —
  a venv built before these were added will fail to collect the parser and
  ML-related test modules with an `ImportError` rather than a test failure.

## Coverage report

Real numbers from an actual `pytest --cov=app --cov-report=html` run
against `backend/app/`:

**89% overall** — 6,909 statements, 744 missed, 27 excluded. **60 of 130
modules sit at 100%.**

### Where coverage is thinnest, and why that's not alarming on its own

| Module | Statements | Missing | Coverage |
| --- | --- | --- | --- |
| `core/background.py` | 40 | 23 | 42% |
| `api/v1/upload.py` | 106 | 59 | 44% |
| `repositories/policy_repository.py` | 41 | 23 | 44% |
| `repositories/base.py` | 24 | 11 | 54% |
| `api/v1/roles.py` | 67 | 28 | 58% |
| `services/notification_service.py` | 60 | 21 | 65% |
| `api/v1/deidentify.py` | 181 | 52 | 71% |
| `services/pipeline_service.py` | 218 | 52 | 76% |
| `engines/executor_config.py` | 39 | 9 | 77% |
| `repositories/session_repository.py` | 13 | 3 | 77% |

A few of these are worth naming plainly rather than treating as uniform
"gaps":

- `repositories/policy_repository.py` and `repositories/base.py` being
  low tracks with [Policy resolution](../engineering/policy-and-operators):
  the wiki itself notes this repository layer has largely-unused duplicate
  write paths superseded by the DB-backed, per-request registry — low
  coverage here reflects code that's a known candidate for removal, not
  untested production logic.
- `core/background.py` and `services/notification_service.py` cover
  best-effort, fire-and-forget paths (background job bookkeeping, email
  notifications) by design — see [Notifications](../features/notifications)
  for why a failure in that path is caught and logged rather than tested
  as a hard failure mode.
- `api/v1/upload.py`, `api/v1/deidentify.py`, and `engines/executor_config.py`
  carry a meaningful share of Spark-specific and large-file branches that
  only execute against a real or local Spark session — the parts covered
  by unit tests without a cluster are the majority of each file's logic,
  not the exotic edges.

None of this is a substitute for closing these gaps — it's context for
reading the number honestly instead of treating every uncovered line as
equally risky.

### Full breakdown by module

<details>
<summary><code>app/api/</code> and <code>app/api/v1/</code></summary>

| Module | Statements | Missing | Coverage |
| --- | --- | --- | --- |
| `api/custom_policy_store.py` | 45 | 4 | 91% |
| `api/deps.py` | 24 | 0 | 100% |
| `api/sharing.py` | 30 | 0 | 100% |
| `api/store.py` | 227 | 6 | 97% |
| `api/v1/analyze.py` | 163 | 31 | 81% |
| `api/v1/auth.py` | 44 | 2 | 95% |
| `api/v1/cluster.py` | 21 | 1 | 95% |
| `api/v1/connections.py` | 225 | 50 | 78% |
| `api/v1/dashboard.py` | 17 | 1 | 94% |
| `api/v1/deidentify.py` | 181 | 52 | 71% |
| `api/v1/entities.py` | 54 | 1 | 98% |
| `api/v1/members.py` | 46 | 6 | 87% |
| `api/v1/notifications.py` | 42 | 1 | 98% |
| `api/v1/policies.py` | 79 | 5 | 94% |
| `api/v1/reidentify.py` | 106 | 11 | 90% |
| `api/v1/roles.py` | 67 | 28 | 58% |
| `api/v1/router.py` | 36 | 0 | 100% |
| `api/v1/sessions.py` | 131 | 17 | 87% |
| `api/v1/settings.py` | 49 | 5 | 90% |
| `api/v1/upload.py` | 106 | 59 | 44% |
| `api/v1/wizard.py` | 81 | 5 | 94% |

</details>

<details>
<summary><code>app/</code> top-level, <code>auth/</code>, <code>core/</code>, <code>db/</code></summary>

| Module | Statements | Missing | Coverage |
| --- | --- | --- | --- |
| `config.py` | 17 | 0 | 100% |
| `main.py` | 82 | 6 | 93% |
| `types.py` | 89 | 0 | 100% |
| `auth/deps.py` | 48 | 6 | 88% |
| `auth/permission_catalog.py` | 4 | 0 | 100% |
| `auth/security.py` | 2 | 0 | 100% |
| `core/background.py` | 40 | 23 | 42% |
| `core/exceptions.py` | 18 | 1 | 94% |
| `core/security.py` | 43 | 0 | 100% |
| `db/migrations.py` | 99 | 21 | 79% |
| `db/models.py` | 271 | 0 | 100% |
| `db/seed.py` | 46 | 3 | 93% |

</details>

<details>
<summary><code>engines/detection/</code></summary>

| Module | Statements | Missing | Coverage |
| --- | --- | --- | --- |
| `code_family_classifier.py` | 44 | 6 | 86% |
| `code_family_features.py` | 42 | 0 | 100% |
| `code_lookups.py` | 31 | 5 | 84% |
| `code_recognizers.py` | 90 | 5 | 94% |
| `code_validators.py` | 33 | 0 | 100% |
| `conflict_resolver.py` | 53 | 0 | 100% |
| `context_enhancer.py` | 29 | 0 | 100% |
| `engine.py` | 489 | 88 | 82% |
| `field_heuristic.py` | 43 | 2 | 95% |
| `recognizers.py` | 166 | 3 | 98% |
| `roberta_recognizer.py` | 86 | 16 | 81% |

</details>

<details>
<summary><code>engines/ingestion/</code>, <code>engines/connectors/</code>, <code>engines/cluster/</code></summary>

| Module | Statements | Missing | Coverage |
| --- | --- | --- | --- |
| `ingestion/detector.py` | 70 | 8 | 89% |
| `ingestion/flatten.py` | 47 | 4 | 91% |
| `ingestion/parsers.py` | 214 | 12 | 94% |
| `ingestion/preview.py` | 37 | 4 | 89% |
| `ingestion/reconstruct.py` | 97 | 1 | 99% |
| `ingestion/registry.py` | 30 | 3 | 90% |
| `ingestion/spill.py` | 70 | 7 | 90% |
| `connectors/allowlist.py` | 32 | 0 | 100% |
| `connectors/crypto.py` | 17 | 1 | 94% |
| `connectors/engine_factory.py` | 28 | 3 | 89% |
| `connectors/mongo.py` | 76 | 10 | 87% |
| `connectors/sink.py` | 11 | 0 | 100% |
| `connectors/source.py` | 57 | 2 | 96% |
| `cluster/spark_status.py` | 56 | 4 | 93% |

</details>

<details>
<summary><code>engines/operators/</code>, <code>engines/output/</code>, <code>engines/policy/</code>, <code>engines/reid/</code></summary>

| Module | Statements | Missing | Coverage |
| --- | --- | --- | --- |
| `operators/base.py` | 41 | 2 | 95% |
| `operators/encrypt.py` | 34 | 3 | 91% |
| `operators/engine.py` | 152 | 11 | 93% |
| `operators/generalize.py` | 75 | 0 | 100% |
| `operators/hash_op.py` | 21 | 4 | 81% |
| `operators/keep.py` | 8 | 0 | 100% |
| `operators/mask.py` | 51 | 9 | 82% |
| `operators/pseudonym.py` | 39 | 0 | 100% |
| `operators/redact.py` | 9 | 0 | 100% |
| `operators/suppress.py` | 8 | 0 | 100% |
| `operators/tokenize.py` | 36 | 6 | 83% |
| `output/audit.py` | 24 | 0 | 100% |
| `output/key_wrap.py` | 16 | 0 | 100% |
| `output/serializer.py` | 119 | 4 | 97% |
| `output/token_map.py` | 33 | 3 | 91% |
| `output/vault.py` | 51 | 0 | 100% |
| `output/zip_bundle.py` | 25 | 2 | 92% |
| `policy/policies.py` | 15 | 1 | 93% |
| `policy/policy.py` | 24 | 0 | 100% |
| `policy/registry.py` | 24 | 1 | 96% |
| `policy/resolver.py` | 44 | 3 | 93% |
| `reid/engine.py` | 104 | 0 | 100% |

</details>

<details>
<summary><code>executors/</code>, <code>repositories/</code>, <code>schemas/</code>, <code>services/</code></summary>

| Module | Statements | Missing | Coverage |
| --- | --- | --- | --- |
| `executors/base.py` | 8 | 0 | 100% |
| `executors/sequential.py` | 9 | 0 | 100% |
| `executors/spark_executor.py` | 106 | 19 | 82% |
| `repositories/base.py` | 24 | 11 | 54% |
| `repositories/policy_repository.py` | 41 | 23 | 44% |
| `repositories/session_repository.py` | 13 | 3 | 77% |
| `repositories/user_repository.py` | 17 | 2 | 88% |
| `schemas/connection.py` | 89 | 1 | 99% |
| `schemas/deid.py` | 130 | 1 | 99% |
| `schemas/policy.py` | 61 | 1 | 98% |
| *(all other `schemas/*` files)* | — | 0 | 100% |
| `services/auth_service.py` | 62 | 4 | 94% |
| `services/dashboard_service.py` | 48 | 6 | 88% |
| `services/notification_service.py` | 60 | 21 | 65% |
| `services/pipeline_service.py` | 218 | 52 | 76% |
| `services/policy_service.py` | 41 | 2 | 95% |
| `services/role_service.py` | 24 | 0 | 100% |
| `services/session_activity_service.py` | 13 | 0 | 100% |
| `services/wizard_service.py` | 102 | 11 | 89% |

</details>

Every module not listed above sits at 100% — including `engines/detection/code_family_features.py`
(the same feature-extraction module the [XGBoost model](../ml/xgboost-model)
trains and serves from), `db/models.py` (all 271 statements — the entire
schema), and the full `engines/reid/engine.py` re-identification path.
