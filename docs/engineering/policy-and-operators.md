# Policy resolution and operators

How a detected entity turns into an actual transformation of the data.

## The policy data shape

```python
@dataclass
class CompliancePolicy:
    name: str
    description: str
    entity_rules: dict[str, OperatorConfig]   # entity_type -> operator + params
    required_entities: list[str]
    optional_entities: list[str]
    default_rule: OperatorConfig | None        # applied to anything not in entity_rules
    # plus DB-backed ownership/sharing metadata for custom policies
```

`default_rule` is mandatory in practice, not just in principle — the
constructor that builds a policy raises an error if it's omitted, because a
policy without one would fail open on any entity type it doesn't explicitly
list. See [Fail-closed design](./detection-pipeline#fail-closed-by-construction).

A policy can also carry **column tags** — a saved `column_name → entity_type`
mapping, letting a user who already knows a file's schema pre-tag a column
so future uploads with a matching column name skip detection on it
entirely and go straight to the assigned operator.

## Where the registry actually comes from

Production does **not** use one process-wide policy registry. A fresh
registry is built **per request**, from:

- every built-in system policy (HIPAA Safe Harbor, GDPR, CCPA, PCI-DSS,
  SOC 2) — seeded once at startup, global, visible to every organization,
  never editable, and
- that organization's own custom policies, filtered by the requesting
  user's visibility (org-wide, private, or explicitly shared).

This replaced an earlier single-process registry plus an on-disk JSON
store, which mixed every organization's custom policies together — a
multi-tenant isolation violation — and went stale across multiple API
worker processes. That older singleton still exists, but only for DB-free
unit tests.

## Multi-policy conflict resolution

A job can select more than one compliance policy at once. When two selected
policies disagree on the operator for the same entity type, **the stricter
operator wins**, ranked:

```
keep < generalize < pseudonym < mask < hash < tokenize < encrypt < redact < suppress
```

Example: if GDPR assigns `hash` to `EMAIL_ADDRESS` and HIPAA assigns
`suppress` to the same entity type, and both policies are selected,
`suppress` wins — the more protective transformation always takes
precedence, never the more convenient one.

## Operator reference

Every operator implements the same interface —
`apply(value: str, params: dict, ctx: OperatorContext) -> str` — with no
network calls of any kind. Each carries a strength rank (0–8) used for the
conflict resolution above, and for resolving full-field conflicts (e.g.
`suppress`, rank 8, outranks `redact`, rank 7, on the same field).

| Operator | What it does | Reversible | Example |
| --- | --- | --- | --- |
| **mask** | Replace characters with `*` | No | `555-1234` → `555-****` |
| **tokenize** | Deterministic opaque token | Yes (token map) | `john@doe.com` → `TKN_a3f9b2` |
| **generalize** | Broader category value | No | `1985-03-21` → `1985` |
| **suppress** | Delete the field/value entirely | No | `john@doe.com` → `""` |
| **pseudonym** | Realistic fake value, consistent within a session | Yes (token map) | `John Smith` → `Carlos Reed` |
| **hash** | HMAC-keyed SHA-256/SHA-512 | No | `foo@bar.com` → `3f4a…` |
| **encrypt** | AES-256-GCM | Yes (session key) | `John` → `ENC:3f4a…` |
| **keep** | No change | N/A | identity |
| **redact** | Replace with an `[ENTITY_TYPE]` label | No | `John` → `[PERSON]` |

### Generalize strategies

| Strategy | Input | Output |
| --- | --- | --- |
| date_to_year | `1985-03-21` | `1985` |
| zip_three_digits | `90210` | `902XX` |
| age_to_range | `87` | `80-89` |
| age_to_range (>89) | `92` | `90+` |
| ip_first_two_octets | `192.168.1.100` | `192.168.x.x` |
| location_to_state | `123 Main St, Austin, TX` | `[STATE]` |
| location_to_country | `Paris, France` | `[COUNTRY]` |

### Pseudonym determinism

Pseudonyms aren't random per occurrence — the same original value always
produces the same pseudonym within a session, which preserves referential
integrity across a dataset (every row for "John Smith" gets the same fake
name, not a different one each time):

```python
seed = int.from_bytes(
    hmac.new(ctx.salt, value.encode("utf-8"), hashlib.sha256).digest()[:4], "big"
)
fake = Faker(locale=locale)
fake.seed_instance(seed)
result = fake.name()
```

### Only three operators are reversible

Only `encrypt`, `tokenize`, and `pseudonym` (the latter two via the token
map) can ever be undone — see
[Re-identification](../features/reidentification) for what that process
actually requires. Every other operator destroys the original value by
design, with nothing to leak even if the token map or session key were
somehow compromised.

## Progress reporting

The de-identification engine reports progress once per distinct field path,
after every operator assigned to that field has finished mutating it — a
`TextDoc` with one field reports a single tick; a wide CSV with many
detected columns reports one tick per cell path. This drives the live
progress bar the same way detection's own progress callback does — see
[De-identification workflow](../features/deidentification-workflow).
