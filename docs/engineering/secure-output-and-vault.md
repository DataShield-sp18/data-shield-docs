# Secure output layer

Everything that happens after an operator transforms a value: what gets
held in memory, what gets encrypted, what gets written to the audit trail,
and exactly what would be needed to undo it later.

## The output shape

```python
@dataclass
class DeIdOutput:
    data: InternalDoc
    token_map: dict[str, str]
    audit_log: list[AuditEntry]
    session_id: str
    policy_applied: list[str]
    format: FileFormat
    reversible: bool   # true if encrypt/tokenize/pseudonym was used anywhere
    token_map_encrypted: bytes | None = None
```

## The session key vault

- A 32-byte AES-256 key and a 16-byte salt are generated per session
  (`os.urandom`), the moment a session starts.
- Both live **in memory only**, for the life of the session, and are
  discarded the moment the session is destroyed.
- The key can be **exported** — base64url-encoded to a 43-character string —
  so a user can hold onto it past the session's normal lifetime. Importing
  it back re-pads the base64 and asserts the decoded length is exactly 32
  bytes before it's trusted.

**The security property this creates, stated plainly:** the exported key,
plus the de-identified file, plus the token map, is everything needed to
fully re-identify the data. Whoever holds all three can recover the
originals — which is exactly why exporting a key is a deliberate, logged,
role-gated action, not something that happens implicitly.

## The token map

- Held in memory as part of `DeIdOutput.token_map`, and encrypted with the
  session key (AES-GCM) into `token_map_encrypted` for download.
- Downloadable either as an AES-GCM encrypted binary
  (`nonce ‖ ciphertext`, not an encrypted JSON file) or as plain JSON, for
  cases where the encrypted form can't be used.
- **Keyed by cell position** (`field_path`), not by the token or fake value
  itself. This is a deliberate design fixing a real defect: two different
  original values can legitimately produce the same pseudonym or token at
  scale (a hash-slice collision), so keying by the fake value would make
  re-identification ambiguous for one of them. Keying by position means
  every cell reverses from its own recorded path, unambiguously, regardless
  of what collided. Legacy value-keyed token maps are still supported via a
  fallback path in the re-identification engine.
- Required for reversing `tokenize`/`pseudonym` — and only for whole-cell
  values; sub-cell or free-text partial token reversal isn't supported.

## The audit log entry

```python
@dataclass
class AuditEntry:
    field_path: str
    entity_type: str
    operator_applied: str
    original_hash: str    # SHA-256 of the original — verification only, never the value
    policy: str
    confidence: float
    span_start: int = 0
    span_end: int = 0
```

Exportable as CSV or JSON, and required for re-identification — it's what
tells the re-identification engine which operator was applied to which
field, since that determines whether recovery is even possible. The hash
exists purely so someone can *verify* a recovered value matches what was
originally there, without the audit log itself ever being a second copy of
the sensitive data.

## The disk cache — a swappable storage-backend seam

De-identified outputs and de-id results disk-cache so a download survives a
process restart (`DS_SESSION_CACHE_DIR`, see
[Environment variables](../operations/environment-variables)). The disk
copy is never the plaintext token map — only the AES-256-GCM encrypted blob
(`token_map_encrypted`), per the same rule as [Security](../architecture/security).

That cache is written through a `StorageBackend` protocol
(`app/engines/output/storage_backend.py`) instead of calling
`pickle`/`Path.open()` inline — the same "swap the implementation, not the
caller" shape as the [executor seam](../features/distributed-execution).
`LocalDiskBackend` backs onto a local filesystem path — in the shipped
`docker-compose.yml`, a named Docker volume rather than the container's
local tempdir, so the cache survives container recreation, not just an
in-place restart — and remains the default. `S3Backend` implements the same
protocol against an S3 (or S3-compatible) bucket, with no change required in
`SessionStore`'s callers either way.

Which implementation `SessionStore` gets is decided by
`app/engines/output/storage_backend_config.py::build_storage_backend`, an
env-driven factory mirroring the executor seam's own config module
(`app/engines/executor_config.py`): `DS_STORAGE_BACKEND` (`local` default,
or `s3`), and when `s3` is selected, `DS_S3_BUCKET` (required),
`DS_S3_PREFIX`, `DS_S3_REGION`, `DS_S3_ENDPOINT_URL` (all optional). See
[Environment variables](../operations/environment-variables) for the full
table. Fail-closed, same rationale as the executor seam's unknown-name
handling: `s3` selected without `DS_S3_BUCKET` set, or an unrecognized
`DS_STORAGE_BACKEND` value, raises at construction rather than silently
falling back to local disk — a misconfigured deployment should error loudly,
not quietly write output to the wrong place. `S3Backend` resolves AWS
credentials entirely through `boto3`'s own standard chain (env vars, IAM
role, `~/.aws/credentials`) — no custom credential handling in this
codebase — and lazily constructs its client on first use, so importing or
constructing the backend never itself requires network access or
credentials. It only ever sees the same de-identified output bytes and
`token_map`-stripped `DeIdOutput` the local backend does — this is not a
cloud-egress exception for raw PII, since nothing raw ever reaches this
seam.

## Why this shape, and not something simpler

Three things are true at once by construction, not by convention:

1. **The vault key never touches disk unencrypted**, and by default never
   touches disk at all — see [Security](../architecture/security) and
   [Data scoping](../architecture/data-scoping) for the one opt-in
   exception (an org master key that can wrap a session key for storage).
2. **The audit log can prove a transformation happened without becoming a
   second copy of the sensitive data** — a hash, not the value.
3. **Re-identification requires re-supplying material, not a stored
   one-click undo** — the de-identified file, the audit log, the token map,
   and either a live session or an exported key, all four, every time. See
   [Re-identification](../features/reidentification) for that flow in
   full.
