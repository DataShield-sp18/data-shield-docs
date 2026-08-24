# Compliance coverage

Data Shield ships five built-in compliance policies. Each one is a concrete
mapping from detected entity type to a transformation — not a generic
checklist. What's below reflects what's actually implemented in code today.

Every policy also has a **default rule** for any entity type it doesn't
explicitly list, so nothing falls through unhandled — policies are required
to declare one, precisely so that an unknown entity type fails toward
safety (redact/pseudonym/mask) rather than being passed through untouched.

## HIPAA Safe Harbor

*45 CFR 164.514(b)(2).* Removes or generalizes the 18 HIPAA identifier
categories. This is the most granular of the five policies — names are
pseudonymized, direct identifiers (SSNs, phone numbers, emails, device and
vehicle IDs) are suppressed, medical record and account numbers are
tokenized (recoverable), locations are generalized to state level, and
clinical codes (ICD-10, HCPCS, NDC, RxNorm) are explicitly kept, since
they're the clinical signal the de-identified data is often still meant to
carry. Unknown entity types redact by default.

## GDPR

*Regulation 2016/679.* Pseudonymizes personal data by default rather than
destroying it outright — names are pseudonymized, emails are hashed, phone
numbers and IP addresses are masked/generalized, and location is generalized
to country level. Unknown entity types pseudonymize by default, in keeping
with GDPR's general preference for pseudonymization over deletion where
data still needs to remain usable.

## CCPA / CPRA

California Consumer Privacy Act. Masks contact identifiers (email, phone)
and suppresses financial/sensitive identifiers (credit card, SSN) outright.
Location generalizes to city level. Unknown entity types redact by default.

## PCI DSS

Payment Card Industry Data Security Standard. The narrowest-scoped policy —
built around payment data: card numbers are masked, CVVs are suppressed
outright (never recoverable), bank account numbers are masked, and routing
numbers are tokenized. Names and street-level location are also
suppressed/masked. Unknown entity types redact by default.

## SOC 2

Trust Services Criteria. Hashes emails, pseudonymizes names, generalizes IP
addresses. Unknown entity types **mask** by default — the only one of the
five policies whose default isn't redact/pseudonymize, reflecting SOC 2's
broader, less identifier-specific scope.

---

Which policy applies to a given job is chosen at request time — Data Shield
doesn't assume a single regulatory regime for every dataset it processes.
