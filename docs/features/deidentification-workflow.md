# Feature: de-identification workflow

This is what happens to one job, end to end, in today's system — a single
API process handling the whole pipeline in-process.

```mermaid
sequenceDiagram
    participant U as User
    participant API as API (FastAPI)
    participant D as Detection
    participant O as Operators
    participant Out as Output/Audit

    U->>API: POST /upload
    API-->>U: session_id
    U->>API: POST /analyze (session_id)
    API->>D: run detection
    D-->>API: DetectedEntity[]
    API-->>U: detected entities
    U->>API: POST /deidentify (session_id + operator overrides)
    API->>O: apply operator per entity
    O->>Out: write audit log entry (hash of original, not the value)
    Out-->>API: de-identified doc + token map
    API-->>U: session ready
    U->>API: GET /download/{session_id}
    API-->>U: de-identified file
```

Re-identification is a separate, deliberately re-upload-based action — see
[Re-identification](./reidentification).

## The session is a state machine, not just a status string

Behind that sequence, each session progresses through a fixed set of
states, tracked server-side — the client can't skip a step by calling
routes out of order:

```mermaid
stateDiagram-v2
    [*] --> draft
    draft --> sourced
    sourced --> policy_set
    policy_set --> tagged
    tagged --> analyzing
    analyzing --> analyzed
    analyzing --> failed
    analyzed --> operators_set
    operators_set --> deidentifying
    deidentifying --> completed
    deidentifying --> failed
    draft --> expired
    sourced --> expired
    completed --> [*]
    failed --> [*]
    expired --> [*]
```

`completed` is absorbing — once a session reaches it, there's no further
transition. `sourced` covers either an uploaded file or a database
connection reference (see [Connections](./connections)) — the rest of the
pipeline doesn't care which one fed it.

## Two things worth noting about this flow

- **The raw upload never touches disk unencrypted.** It lives in the API
  process's memory for the duration of the session. See
  [Security](../architecture/security) for the full data-at-rest posture.
- **The audit log never stores the original value.** Each entry stores a
  hash of the original, so the audit trail can prove *that* something was
  transformed without itself becoming a second copy of the sensitive data.
