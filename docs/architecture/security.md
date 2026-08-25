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

### A second, narrower exception: the wrapped session key

A session's vault key is, by default, never persisted anywhere — see
[Secure output layer](../engineering/secure-output-and-vault). An
organization can opt in to a second relaxation of that rule: setting an
org-wide master key (org_admin, via Settings) lets a session's key be
persisted — but **only ever wrapped** (AES-256-GCM, under that org master
key), never in the clear. The *unwrapped* key is still never written to
disk under any circumstance, and the org master key itself is never
returned in any API response body. This exists so a session's key could
one day be recovered in a second process (for a resumable, cross-process
job) — a consumer that doesn't exist yet, but the groundwork is opt-in and
already shipped. See [Data scoping](./data-scoping) for how this key
material is scoped between organizations.

## Encryption and the audit trail

- **AES-256-GCM** is the encryption used wherever the "encrypt" operator, the
  session key vault, the token map, or database connection secrets apply.
- **The audit log stores a hash of the original value, never the value
  itself.** It can prove that a transformation happened without becoming a
  second copy of the sensitive data.

## Network boundaries

Cross-origin access is controlled by an explicit allowlist (`localhost:3000`,
`localhost:5173` by default, extendable via configuration — never removable
below that default). The same allowlist gates both ordinary HTTP requests
and the WebSocket connections used for live progress updates and cluster
status — and for WebSockets specifically, the check is re-implemented
rather than inherited, because the CORS middleware that normally enforces
this never runs for a WebSocket handshake at all.

## Database connections: an explicit SSRF defense

An organization's own database connections are gated by a per-org host
allowlist, re-checked on *every* use (not just at creation), against a
resolved IP rather than a re-resolvable hostname — closing a DNS-rebinding
path where an allowlisted hostname could later be repointed at loopback or
a cloud metadata endpoint. An empty allowlist means no connection can be
created at all. See [Connections](../features/connections) for the full
mechanics.

## Fail-closed is a security property, not just a correctness one

Everything in [the detection pipeline](../engineering/detection-pipeline#fail-closed-by-construction)
that refuses to let an uncertain value pass through untransformed exists
for the same reason as the encryption and network boundaries above: a
compliance tool that leaks on its unhappy path is worse than a tool that's
merely incomplete, because it gives false assurance instead of an obvious
gap.

## This site's own access model

This documentation site itself is hosted on GitHub Pages with a
`robots.txt` that disallows indexing — it is **not** behind a login or
password. That means it's protected from casual search-engine discovery,
but not from anyone who has the URL. That's a deliberate, informed tradeoff
for this early POC stage, not an oversight — revisit it if/when this site
starts carrying more sensitive content than it does today.
