# Environment variables

Every environment variable the running system actually reads, grouped by
what it controls. Sourced directly from the code that reads each one, not
from a separate ops document that could drift.

## Core / required

| Variable | Purpose | Default |
| --- | --- | --- |
| `DATABASE_URL` | Postgres connection string for org/user/session metadata | — (required) |
| `DS_CONNECTION_KEY` | 32-byte base64 master key encrypting DB connection secrets at rest | **No insecure default** — a missing or malformed key fails closed on every connection operation |
| `AUTH_SECRET_KEY` | JWT signing key for session cookies | `dev-only-insecure-secret-change-me`, with a logged warning — **must** be set outside local dev |

## CORS / WebSocket origin

| Variable | Purpose | Default |
| --- | --- | --- |
| `DS_ALLOWED_ORIGINS` | Comma-separated extra browser origins allowed through CORS and the progress-WebSocket origin check | Empty — `localhost:3000`/`localhost:5173` are always allowed and can never be removed |

## Networking / LAN access (dev stack only)

| Variable | Purpose | Default |
| --- | --- | --- |
| `DS_BIND_HOST` | Binds published dev-stack ports to every interface instead of loopback only | `127.0.0.1` (loopback-only) |
| `DS_API_HOST` | The host the browser should call for the API — must be reachable from wherever the browser runs | `localhost` |

Both are opt-in exceptions to the localhost-only rule, meant only for
reaching the dev stack from another machine on the same LAN. Left unset,
behavior is unchanged from loopback-only. See
[Security](../architecture/security).

## Job-completion email notifications

| Variable | Purpose | Default |
| --- | --- | --- |
| `DS_SMTP_HOST` | SMTP server host | Unset — sending becomes a silent no-op, the app works fine without it |
| `DS_SMTP_PORT` | SMTP port | `587` |
| `DS_SMTP_USER` | SMTP auth username | — |
| `DS_SMTP_PASSWORD` | SMTP auth password | — |
| `DS_SMTP_FROM` | From address on outgoing notification emails | `no-reply@data-shield.local` |
| `DS_SMTP_USE_TLS` | Whether to use TLS for the SMTP connection | `true` |

See [Notifications](../features/notifications).

## Session cache (disk-backed, encrypted output only)

| Variable | Purpose | Default |
| --- | --- | --- |
| `DS_SESSION_CACHE_DIR` | Where de-identified output disk-caches to survive a process restart — never the plaintext token map, only an AES-256-GCM encrypted blob | OS temp directory |

The shipped `docker-compose.yml` sets `DS_SESSION_CACHE_DIR` explicitly to
`/var/data-shield/session-cache`, backed by a named Docker volume
(`session-cache-data`) rather than leaving it on the default OS tempdir. The
practical difference: the default falls back to the *container's* local
tempdir, which is wiped on container recreation (not just process restart) —
the named volume survives that. See
[Deployment](../architecture/deployment) and
[Secure output layer](../engineering/secure-output-and-vault) for the
storage-backend seam behind this cache.

## Large-file spill (encrypted-at-rest shards)

| Variable | Purpose | Default |
| --- | --- | --- |
| `DS_SPILL_THRESHOLD_MB` | Size above which a large frame spills to disk as encrypted shards instead of staying in driver memory | `200` |
| `DS_SPILL_SHARD_ROWS` | Rows per encrypted shard | `50000` |
| `DS_SPILL_DIR` | Where encrypted shards are written | — (cluster deployments set this explicitly, e.g. `/var/data-shield/spill`) |

## Distributed detection / de-identification tuning

| Variable | Purpose | Default |
| --- | --- | --- |
| `DS_DETECT_CHUNK_VALUES` | Target number of values per distributed detection work chunk | `500` |
| `DS_FREETEXT_AVG_LEN` | Average length threshold used when deciding how free-text cells get scanned for multi-position PII | `80` |
| `DS_DEID_BATCH_FIELDS` | Fields per de-identification batch slice | `5000` |

See [Distributed execution](../engineering/distributed-execution) for why
chunk sizing matters — this is the exact knob behind the fixed-size
chunking strategy described there.

## Executor selection (Spark vs. sequential)

| Variable | Purpose | Default |
| --- | --- | --- |
| `DATA_SHIELD_EXECUTOR` | Process-wide default executor (`sequential` or `spark`) when no organization context is available | `sequential` |
| `DATA_SHIELD_SPARK_MASTER` | Spark master URL (`spark://...`, `k8s://...`); unset means a local, in-process cluster | Unset → `local[max_cores]` |
| `DATA_SHIELD_SPARK_MAX_CORES` | Platform-wide core cap — deliberately **not** organization-configurable | `4` |
| `DATA_SHIELD_SPARK_DRIVER_HOST` | Driver host advertised to Spark, for cluster mode | — |
| `DATA_SHIELD_SPARK_DEBUG` | Extra Spark debug logging | — |
| `DATA_SHIELD_SPARK_MASTER_UI_PORT` | Spark master UI port | — |

An unrecognized executor name raises rather than silently falling back —
see [Distributed execution](../engineering/distributed-execution).

## Cluster deployment (`docker-compose.cluster.yml`, Spark's own env vars)

These aren't Data Shield's own variables — they're the underlying Bitnami
Spark image's environment, set in the cluster compose file:

| Variable | Purpose |
| --- | --- |
| `SPARK_MODE` | `master` or `worker` |
| `SPARK_MASTER_URL` | Worker's connection string to the master |
| `SPARK_WORKER_CORES` | Per-worker-container core cap (mirrors `DATA_SHIELD_SPARK_MAX_CORES`) |
| `SPARK_WORKER_MEMORY` | Per-worker-container memory cap |
| `SPARK_RPC_AUTHENTICATION_ENABLED` / `SPARK_RPC_AUTHENTICATION_SECRET` | Mandatory cluster auth |
| `SPARK_RPC_ENCRYPTION_ENABLED` | Encrypts driver↔executor RPC traffic |
| `SPARK_LOCAL_STORAGE_ENCRYPTION_ENABLED` | Encrypts local shuffle/spill storage on cluster nodes |
| `SPARK_DRIVER_HOST` / `SPARK_DRIVER_BIND_ADDRESS` | Driver network identity when the API container is the driver |

## Frontend

| Variable | Purpose | Default |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Base URL the frontend calls for the API | `http://localhost:8000/api/v1` in the default dev/prod compose setup |

## Postgres (compose-level, not application code)

| Variable | Purpose |
| --- | --- |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Database credentials/name, set identically on both the `db` service and the `DATABASE_URL` connection string that points at it |

## A deliberate asymmetry worth understanding

`AUTH_SECRET_KEY` has an insecure *default* (with a loud warning) so local
development works out of the box. `DS_CONNECTION_KEY` has **no default at
all** — a missing or malformed key fails every connection operation
closed. The difference is intentional: a weak default JWT secret in local
dev is a contained risk; a weak or accidentally-absent key protecting
stored database credentials is not something this system is willing to
paper over with a fallback, ever.
