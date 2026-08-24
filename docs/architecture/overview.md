# Architecture overview

Data Shield is a pipeline wrapped in a multi-tenant application shell. The
pipeline (ingestion → detection → policy → de-identification → output) is
the part that transforms data; everything around it exists to control
**who** can trigger that transformation, **on what**, and **under which
compliance rule**.

```mermaid
flowchart TB
    FE["Frontend"]

    subgraph API["API — FastAPI"]
        AUTH["Auth / RBAC<br/>(cookie session, 3 roles)"]
        ROUTERS["Routers: upload · analyze · deidentify ·\nreidentify · connections · policies · members"]
    end

    subgraph ENGINES["Pipeline engines"]
        ING["Ingestion"]
        DET["Detection"]
        POL["Policy"]
        OPS["De-identification\noperators"]
        OUT["Output +\nAudit log"]
        REID["Re-identification"]
    end

    subgraph EXEC["Executor seam"]
        SEQ["Sequential\n(default)"]
        SPARK["Spark\n(opt-in)"]
    end

    VAULT[("Session key vault\nin-memory only")]
    PG[("Postgres\norg / user / session metadata")]
    NOTIFY["Notification service\nemail + in-app feed"]

    FE --> AUTH --> ROUTERS
    ROUTERS --> ING --> DET --> POL --> OPS --> OUT
    OUT -. reversible ops only .-> REID
    DET -. dispatched via .-> EXEC
    OPS -. dispatched via .-> EXEC
    OUT --- VAULT
    REID --- VAULT
    ROUTERS --- PG
    OUT --> NOTIFY
```

- **Auth / RBAC** resolves every request to one user in exactly one
  organization, and gates each route to the roles allowed to call it. See
  [Auth & Organizations](./auth-and-organizations).
- **Ingestion → Detection → Policy → Operators → Output** is the
  transformation itself — see [De-identification workflow](../features/deidentification-workflow)
  for the request-level sequence and [Compliance](../compliance/regulations)
  for what each policy actually does.
- **Re-identification** reverses the subset of operators that are
  reversible by construction, using material re-supplied by the caller —
  see [Re-identification](../features/reidentification).
- **The executor seam** is what decides whether detection/de-identification
  work runs in-process or on a Spark cluster, per organization — see
  [Distributed execution](../features/distributed-execution).
- **The session key vault** is in-memory only; it is what makes
  re-identification possible while a session is live, and what makes it
  permanently impossible once destroyed. See [Security](./security) and
  [Data scoping](./data-scoping) for how key material is scoped.
- **Postgres** holds organization, user, and session *metadata* — never raw
  PII, never a token map, never output bytes. See [Data scoping](./data-scoping)
  for exactly which tables are org-scoped versus global.
- **Notifications** fire when a job finishes — see
  [Notifications](../features/notifications).

For today's physical deployment shape (and the proposed scale-out
direction), see [Deployment](./deployment).
