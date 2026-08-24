# Feature: custom compliance policies

The five built-in policies (HIPAA, GDPR, CCPA, PCI-DSS, SOC 2) cover common
regulatory regimes, but an organization can also define its own.

```mermaid
flowchart TD
    A["operator or org_admin<br/>defines a custom policy:<br/>name + per-entity-type rules"] --> B["Set a default rule<br/>for any entity type not listed"]
    B --> C{"Default operator is<br/>'keep'?"}
    C -- yes --> R["Rejected — 422<br/>a policy may never let<br/>unknown entities pass through untouched"]
    C -- no --> D["Validated & saved,<br/>scoped to this organization"]
    D --> E["Appears in the policy list<br/>alongside the 5 built-in policies"]
    E --> F["Selected for a job at<br/>analyze/de-identify time"]
```

## What a custom policy actually is

Structurally identical to a built-in policy: a map from detected entity type
to an operator (mask, tokenize, encrypt, hash, pseudonymize, generalize,
suppress, redact, keep), plus one mandatory **default rule** for any entity
type the policy doesn't explicitly mention.

## The one rule that can't be turned off

A policy's default operator can be anything **except `keep`**. This is
enforced at creation time, not just documented — the fail-closed guarantee
(never silently pass sensitive data through untouched) applies to
custom policies exactly as it does to the built-in ones; an org can choose
how strict to be, but not opt out of failing closed on the unknown case.

## Scope and ownership

A custom policy belongs to the organization that created it and follows the
same **org vs. private** visibility model as a database connection: visible
to every member by default, or restricted to its creator plus anyone
explicitly granted access. `org_admin` can always see and manage every
policy in the organization. Only `org_admin` or `operator` can create or
edit one; only `org_admin` can change its sharing.

## Using it

Once saved, a custom policy shows up in the same policy list as the five
built-in ones — there's no separate "custom policy" step in the workflow
that runs a job. Whoever configures a session's compliance policy just picks
from whichever policies (built-in + this org's custom ones) they can see.
