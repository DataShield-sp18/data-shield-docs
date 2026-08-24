# Security posture

For a de-identification product, the security constraints aren't a
checklist bolted on afterward — they're the actual product. Here's what's
implemented today, in plain terms.

## No cloud egress

Detection runs on a local NLP model (Presidio + spaCy). No document content
or detected entity ever leaves the machine as part of processing — there is
no call to an external API, and no third-party LLM in the loop.

## Localhost-only by default

The API binds to `localhost` only. In Docker, the host-side port mapping
enforces the same restriction. There's a single, explicit, opt-in exception
for local multi-machine development testing (a `DS_BIND_HOST` environment
variable that must be deliberately set) — production behavior is unaffected,
and it doesn't apply to the database.

## Raw uploads never touch disk unencrypted

An uploaded file lives in the API process's memory only, for the life of the
session — never written to disk in the clear. De-identified *outputs* (which
have already had sensitive content removed) may be disk-cached to survive a
process restart, but that cache never contains the plaintext token map —
only an AES-256-GCM encrypted blob.

There is one narrow, deliberate exception for very large files processed on
the Spark cluster: oversized data may be spilled to disk as AES-256-GCM
encrypted shards, under a key that lives only in memory for the duration of
the job and is deleted afterward. Plaintext PII on disk remains forbidden
everywhere else, with no other exceptions.

## Encryption and the audit trail

- **AES-256-GCM** is the encryption used wherever the "encrypt" operator or
  key-backed vault storage applies.
- **The audit log stores a hash of the original value, never the value
  itself.** It can prove that a transformation happened without becoming a
  second copy of the sensitive data.

## Network boundaries

Cross-origin access is controlled by an explicit allowlist (`localhost:3000`,
`localhost:5173` by default, extendable via configuration — never removable
below that default). The same allowlist gates both ordinary HTTP requests and
the WebSocket connections used for live progress updates.

## This site's own access model

This documentation site itself is hosted on GitHub Pages with a
`robots.txt` that disallows indexing — it is **not** behind a login or
password. That means it's protected from casual search-engine discovery,
but not from anyone who has the URL. That's a deliberate, informed tradeoff
for this early POC stage, not an oversight — revisit it if/when this site
starts carrying more sensitive content than it does today.
