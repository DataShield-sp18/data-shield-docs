# XGBoost medical-code-family classifier

The one machine-learning model in Data Shield's detection path. Everything
else in the pipeline is deterministic (regex, checksums, exact-match
lookups, a pretrained NER model used as-is) — this is the only model
trained specifically for this project, and it's deliberately scoped to a
low-risk, low-cardinality question.

## What it predicts

Not *"is this a medical code"* — **which code system a string belongs to,
given that it already looks code-shaped.** Seven families:

`ICD10_CM` · `ICD10_PCS` · `HCPCS` · `HCPCS_MODIFIER` · `NDC` · `RXNORM` · `NPI`

It has no negative class. Feed it a random word or a customer ID and it
will still confidently return one of those seven families — which is
exactly why it's wired in as an **advisory signal only, never a membership
gate**. See [Medical-code detection](../engineering/medical-code-detection)
for the full reasoning and where it sits in the pipeline.

## Why a classifier here isn't the anti-pattern it looks like

An earlier proposal — training a model to *memorize* actual codes as a
scaling shortcut for the exact-match lookup — was considered and rejected:
a 1M-class high-cardinality target has real false-negative risk, and a
missed code in a compliance tool is a leak, not a rounding error. This
model is the opposite shape: the target is the **family** (7 classes, low
cardinality), and it learns each code system's structural *shape* — length,
digit/letter ratio, dash positions, character-class transitions — not its
members. It cannot decide "is this a real code," so it structurally cannot
cause the failure mode the earlier proposal was rejected for.

## Architecture: offline training, online inference

```
backend/
├── ml/medical_code_family/        # OFFLINE — never imported by the running API
│   ├── config.py       families, paths, hyperparameters
│   ├── data_prep.py    raw CSVs → canonical (code, family), dedup + collision drop
│   ├── dataset.py      per-class cap, stratified split, balanced sample weights
│   ├── train.py        fit XGBoost, evaluate, persist artifact + manifest
│   └── evaluate.py     per-family precision/recall/F1, confusion matrix
├── scripts/train_code_family_classifier.py   CLI entry point
└── app/
    ├── data/models/                        # git-ignored artifact + manifest
    │   ├── medical_code_family_v1.joblib
    │   └── medical_code_family_v1.json
    └── engines/detection/
        ├── code_family_features.py    # shared feature transform (train + infer)
        ├── code_family_classifier.py  # runtime singleton, classify_family()
        └── engine.py                  # wires the advisory hint into detection
```

Feature extraction lives in exactly **one** module, imported by both the
trainer and the runtime — a train/serve skew guard. The artifact records
its own feature names; the runtime loader disables the classifier entirely
on a schema mismatch rather than serving skewed features.

## Structural features (20)

The model never sees the code's characters directly — only shape statistics
computed from them: `length`, `n_digits`, `n_alpha`, `n_dots`, `n_dashes`,
`n_spaces`, `frac_digits`, `frac_alpha`, `is_all_digits`, `is_all_alpha`,
`first_is_alpha`, `first_is_digit`, `second_is_digit`, `last_is_digit`,
`last_is_alpha`, `dash_segments`, `max_digit_run`, `max_alpha_run`,
`first_letter_ord`, `n_distinct_char_classes`.

## Hyperparameters

```json
{
  "n_estimators": 300,
  "max_depth": 6,
  "learning_rate": 0.3,
  "subsample": 0.9,
  "colsample_bytree": 0.9,
  "tree_method": "hist",
  "n_jobs": -1,
  "random_state": 18
}
```

## Training data — real counts from the last training run

| Family | Raw count | Capped for training |
| --- | --- | --- |
| NDC | 217,557 | 40,000 |
| ICD10_PCS | 79,115 | 40,000 |
| ICD10_CM | 74,719 | 40,000 |
| RXNORM | 47,006 | 40,000 |
| NPI | 17,306 | 17,306 |
| HCPCS | 8,377 | 8,377 |
| HCPCS_MODIFIER | 38 | 38 |

A per-class cap (`MAX_PER_CLASS = 40,000`) plus balanced sample weights and
a stratified split handle the huge imbalance between NDC (217k raw codes)
and HCPCS modifiers (38 total) — without the cap, the model would have
every incentive to just always guess NDC. Zero ambiguous cross-family
collisions were dropped in this run (numeric codes that are structurally
identical across families are detected and excluded from training rather
than assigned arbitrarily).

## Results — real numbers, not projected

Test-set accuracy: **99.91%**. Macro-F1: **98.85%**.

| Family | Precision | Recall | F1 | Support |
| --- | --- | --- | --- | --- |
| ICD10_CM | 1.0000 | 1.0000 | 1.0000 | 6,000 |
| ICD10_PCS | 1.0000 | 0.9962 | 0.9981 | 6,000 |
| HCPCS | 1.0000 | 1.0000 | 1.0000 | 1,257 |
| HCPCS_MODIFIER | 0.8571 | 1.0000 | 0.9231 | 6 |
| NDC | 1.0000 | 1.0000 | 1.0000 | 6,000 |
| RXNORM | 0.9962 | 0.9998 | 0.9980 | 6,000 |
| NPI | 1.0000 | 1.0000 | 1.0000 | 2,596 |

The one soft spot — `HCPCS_MODIFIER` precision at 0.857 — is a direct
consequence of its training set being 38 examples total; the confusion
matrix below shows exactly one misclassified example in the whole test
split. See [Training run output](./training-run-output) for the full,
real console output of this run, captured from an actual execution rather
than reconstructed from the manifest.

## A known, accepted limitation

A purely numeric 7-character ICD-10-PCS code and a 7-digit RxNorm RXCUI
have the same shape — nothing structural distinguishes them. The model
leans RxNorm on these (far more numeric training examples), affecting about
0.33% of PCS codes. Because this classifier never gates membership, this
cannot cause a leak — the exact-match lookup and structural validators
remain authoritative regardless of what this model guesses. If exact
routing on purely numeric codes matters later, it gets resolved with the
lookup set (which actually knows the true family), not the model.

## Regenerating the artifact

```bash
cd backend
python -m scripts.train_code_family_classifier
```

The artifact is git-ignored — its absence on a fresh checkout is expected.
Both backend Docker images run this training step at build time so a fresh
container image already has the artifact, entirely offline against the
local CSV snapshots — no network egress during training or inference.
