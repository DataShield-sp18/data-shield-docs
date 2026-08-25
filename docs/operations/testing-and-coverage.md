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

*Pending — a real `pytest --cov` run against the current test suite will be
added here once available, rather than an estimated or invented number.*
